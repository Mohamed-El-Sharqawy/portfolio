/**
 * Builds /llms.txt (index, llmstxt.org format) and /llms-full.txt (full text) from the
 * same content collections as the site, so they never drift from the pages.
 */
import { getCollection } from 'astro:content';
import { SITE_URL, profile, siteDescription, stats } from '../data/site';

const url = (path: string) => new URL(path, SITE_URL).href;
const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

async function load() {
  const [projects, experience, skills, education] = await Promise.all([
    getCollection('projects'),
    getCollection('experience'),
    getCollection('skills'),
    getCollection('education'),
  ]);
  return {
    projects: projects.sort(byOrder),
    experience: experience.sort(byOrder),
    skills: skills.sort(byOrder),
    education: education.sort(byOrder),
  };
}

/** "6 · 4" + "Companies · countries" -> "6 companies · 4 countries". */
const stat = (s: { value: string; label: string }) => {
  const v = s.value.split('·').map((x) => x.trim());
  const l = s.label
    .toLowerCase()
    .split('·')
    .map((x) => x.trim());
  return v.map((x, i) => `${x} ${l[i] ?? l[0]}`).join(' · ');
};

const header = () =>
  [
    `# ${profile.name}`,
    '',
    `> ${profile.role}. ${siteDescription}`,
    '',
    `Location: ${profile.location}. ${stats.map(stat).join(' · ')}.`,
    '',
  ].join('\n');

const contact = () =>
  [
    '## Contact',
    '',
    `- [Email](mailto:${profile.email}): ${profile.email}`,
    `- [WhatsApp](${profile.whatsapp}): ${profile.phone} (also on Botim)`,
    `- [LinkedIn](${profile.linkedin})`,
    `- [GitHub](${profile.github})`,
    `- [CV (PDF)](${url(profile.cvUrl)})`,
    '',
  ].join('\n');

export async function llmsTxt(): Promise<string> {
  const { projects, experience } = await load();
  return [
    header(),
    '## Case studies',
    '',
    ...projects.map((p) => `- [${p.data.name}](${url(`/work/${p.id}/`)}): ${p.data.description}`),
    '',
    '## Experience',
    '',
    ...experience.map(
      (e) =>
        `- ${e.data.role}, ${e.data.company} (${e.data.period}, ${e.data.location}): ${e.data.summary}`,
    ),
    '',
    contact(),
    '## Optional',
    '',
    `- [Full text for LLMs](${url('/llms-full.txt')}): every case study, role, skill and credential in one file`,
    `- [Home page](${url('/')})`,
    `- [Sitemap](${url('/sitemap-index.xml')})`,
    '',
  ].join('\n');
}

export async function llmsFullTxt(): Promise<string> {
  const { projects, experience, skills, education } = await load();
  const out = [header(), contact(), '## Experience', ''];
  for (const { data: e } of experience) {
    out.push(`### ${e.role}, ${e.company}`, '', `${e.period} · ${e.location}`, '', e.summary, '');
    out.push(...e.highlights.map((h) => `- ${h}`), '', `Stack: ${e.stack.join(', ')}`, '');
  }
  out.push('## Case studies', '');
  for (const p of projects) {
    const d = p.data;
    out.push(
      `### ${d.name}: ${d.tagline}`,
      '',
      `URL: ${url(`/work/${p.id}/`)}`,
      `Category: ${d.category} · Impact: ${d.impact} · Stack: ${d.stack.join(', ')}`,
      '',
      d.description,
      '',
      // The case study's own headings sit one level below its ### title.
      (p.body ?? '').trim().replace(/^#{1,4} /gm, '#### '),
      '',
    );
  }
  out.push('## Skills', '');
  for (const { data: s } of skills) out.push(`- ${s.group}: ${s.rows.flat().join(', ')}`);
  out.push('', '## Education', '');
  for (const { data: e } of education)
    out.push(`- ${e.credential}, ${e.institution} (${e.period})`);
  out.push('');
  return out.join('\n');
}
