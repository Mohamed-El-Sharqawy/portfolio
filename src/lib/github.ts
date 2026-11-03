/**
 * Build-time GitHub snapshot (ported from the old Next.js `src/content/github.ts`
 * and `src/app/api/github/route.ts`).
 *
 * - Uses the GraphQL contributions calendar when `GITHUB_TOKEN` is set (full year).
 * - Falls back to the public events API (last 90 days, push events only).
 * - Never throws: on missing token / network / rate limit it returns `null`
 *   and the page renders the empty state. Never called from the client.
 */
import { profile } from '../data/site';

export type HeatmapDay = { date: string; count: number };

export type GithubSnapshot = {
  username: string;
  span: 'year' | '90d';
  days: HeatmapDay[];
  total: number;
  activeStreak: number;
  longestStreak: number;
  publicRepos: number;
  generatedAt: string;
};

const USERNAME = profile.githubUsername;
const API_ROOT = 'https://api.github.com';
const TIMEOUT_MS = 8000;
const DAY_MS = 86_400_000;
const EVENTS_SPAN_DAYS = 90;
const HEADERS = { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-v2-build' };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const asNumber = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function token(): string | undefined {
  // `import.meta.env` is inlined at build time in Astro 6+; read the real env at runtime of the build.
  const value = process.env.GITHUB_TOKEN?.trim();
  return value ? value : undefined;
}

async function getJson(url: string, init: RequestInit = {}): Promise<unknown> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { ...HEADERS, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const CALENDAR_QUERY = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

async function fetchCalendarDays(): Promise<HeatmapDay[] | null> {
  const auth = token();
  if (!auth) return null;
  const data = await getJson(`${API_ROOT}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: CALENDAR_QUERY, variables: { login: USERNAME } }),
  });
  const weeks = (
    data as {
      data?: {
        user?: {
          contributionsCollection?: { contributionCalendar?: { weeks?: unknown } };
        };
      };
    } | null
  )?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!Array.isArray(weeks)) return null;
  const days: HeatmapDay[] = [];
  for (const week of weeks) {
    if (!isRecord(week) || !Array.isArray(week.contributionDays)) continue;
    for (const day of week.contributionDays) {
      if (!isRecord(day)) continue;
      days.push({
        date: asString(day.date).slice(0, 10),
        count: asNumber(day.contributionCount),
      });
    }
  }
  return days.length >= 300 ? days : null;
}

function daysFromEvents(events: unknown[]): HeatmapDay[] {
  const counts = new Map<string, number>();
  for (const raw of events) {
    if (!isRecord(raw) || raw.type !== 'PushEvent') continue;
    const ts = Date.parse(asString(raw.created_at));
    if (Number.isNaN(ts)) continue;
    const payload = isRecord(raw.payload) ? raw.payload : {};
    const commits = Array.isArray(payload.commits) ? payload.commits : [];
    const size = asNumber(payload.size);
    const count = size > 0 ? size : commits.length > 0 ? commits.length : 1;
    const key = new Date(ts).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + count);
  }
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days: HeatmapDay[] = [];
  for (let i = EVENTS_SPAN_DAYS - 1; i >= 0; i -= 1) {
    const key = new Date(todayUtc - i * DAY_MS).toISOString().slice(0, 10);
    days.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return days;
}

export function computeStreaks(days: HeatmapDay[]): { active: number; longest: number } {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    run = day.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  let index = days.length - 1;
  // Today may simply not have activity yet; don't break the streak for it.
  if (days[index]?.count === 0) index -= 1;
  let active = 0;
  while (index >= 0 && (days[index]?.count ?? 0) > 0) {
    active += 1;
    index -= 1;
  }
  return { active, longest };
}

async function load(): Promise<GithubSnapshot | null> {
  const [calendar, user] = await Promise.all([
    fetchCalendarDays(),
    getJson(`${API_ROOT}/users/${USERNAME}`),
  ]);

  let days = calendar;
  let span: GithubSnapshot['span'] = 'year';
  if (!days) {
    const events = await getJson(`${API_ROOT}/users/${USERNAME}/events/public?per_page=100`);
    if (!Array.isArray(events)) return null;
    days = daysFromEvents(events);
    span = '90d';
  }

  const streaks = computeStreaks(days);
  const userRecord = isRecord(user) ? user : {};
  return {
    username: asString(userRecord.login) || USERNAME,
    span,
    days,
    total: days.reduce((sum, d) => sum + d.count, 0),
    activeStreak: streaks.active,
    longestStreak: streaks.longest,
    publicRepos: asNumber(userRecord.public_repos),
    generatedAt: new Date().toISOString(),
  };
}

let cached: Promise<GithubSnapshot | null> | undefined;

/** Fetched once per build, shared by every page that asks. */
export function getGithubSnapshot(): Promise<GithubSnapshot | null> {
  if (process.env.GITHUB_DISABLE === '1') return Promise.resolve(null);
  cached ??= load().catch(() => null);
  return cached;
}

export type HeatCell = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 } | null;

/** Arrange days into Sunday-first week columns, GitHub style. */
export function toWeeks(days: HeatmapDay[]): HeatCell[][] {
  const max = days.reduce((m, d) => Math.max(m, d.count), 0);
  const level = (count: number): 0 | 1 | 2 | 3 | 4 =>
    count === 0 || max === 0
      ? 0
      : (Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as 1 | 2 | 3 | 4);
  const cells: HeatCell[] = [];
  const first = days[0];
  if (first) {
    const pad = new Date(`${first.date}T00:00:00Z`).getUTCDay();
    for (let i = 0; i < pad; i += 1) cells.push(null);
  }
  for (const d of days) cells.push({ ...d, level: level(d.count) });
  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
