import { SITE_URL, profile, tel } from '../data/site';

export const personId = `${SITE_URL}/#person`;

export const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': personId,
  name: profile.name,
  jobTitle: 'Full-Stack Engineer',
  email: `mailto:${profile.email}`,
  telephone: [tel(profile.phone), tel(profile.phoneEgypt)],
  url: SITE_URL,
  sameAs: [profile.linkedin, profile.github],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Dubai',
    addressCountry: 'AE',
  },
  knowsAbout: [
    'React',
    'Next.js',
    'TypeScript',
    'Tailwind CSS',
    'Node.js',
    'AI agent orchestration',
  ],
  alumniOf: [
    { '@type': 'CollegeOrUniversity', name: 'Open University UK' },
    { '@type': 'CollegeOrUniversity', name: 'Arab Open University' },
  ],
};

/** Serialize JSON-LD safely for a <script> tag. */
export const jsonLd = (data: unknown): string => JSON.stringify(data).replace(/</g, '\\u003c');
