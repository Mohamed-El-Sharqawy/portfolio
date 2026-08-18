export type CommitFeedItem = {
  repo: string;
  message: string;
  kind: "push" | "pr";
  when: string;
};

export type ActiveRepo = {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string;
  url: string;
};

export type HeatmapDay = {
  date: string;
  count: number;
};

export type GithubSnapshot = {
  username: string;
  lastActive: string;
  heatmap: HeatmapDay[];
  totalContributions90d: number;
  activeStreakDays: number;
  longestStreakDays: number;
  publicRepos: number;
  activeRepos: ActiveRepo[];
  feed: CommitFeedItem[];
  generatedAt: string;
};

export const GITHUB_USERNAME = "Mohamed-El-Sharqawy";

const DAY_MS = 86_400_000;
const HEATMAP_DAYS = 90;
const FEED_LIMIT = 8;
const ACTIVE_REPO_LIMIT = 3;
const PR_ACTIONS = new Set(["opened", "closed", "merged"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function firstLine(value: unknown): string {
  return asString(value).split("\n")[0]?.trim() ?? "";
}

function compareDesc(a: string, b: string): number {
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

function latestEventAt(events: unknown[]): string {
  let latest = "";
  for (const raw of events) {
    if (!isRecord(raw)) continue;
    const createdAt = asString(raw.created_at);
    if (createdAt > latest) latest = createdAt;
  }
  return latest;
}

function shortRepoName(value: unknown): string {
  const name = asString(value);
  const slash = name.lastIndexOf("/");
  return slash >= 0 ? name.slice(slash + 1) : name;
}

function buildFeed(events: unknown[]): CommitFeedItem[] {
  const items: CommitFeedItem[] = [];
  for (const raw of events) {
    if (!isRecord(raw)) continue;
    const payload = isRecord(raw.payload) ? raw.payload : {};
    const repo = isRecord(raw.repo)
      ? shortRepoName(raw.repo.name)
      : "";
    const when = asString(raw.created_at);
    if (raw.type === "PushEvent") {
      const commits = Array.isArray(payload.commits) ? payload.commits : [];
      const first = commits.length > 0 && isRecord(commits[0]) ? commits[0] : null;
      const message = first ? firstLine(first.message) : "";
      const size = asNumber(payload.size);
      const fallback =
        size > 0 ? `${size} commits` : commits.length > 0 ? `${commits.length} commits` : "pushed changes";
      items.push({
        repo,
        message: message || fallback,
        kind: "push",
        when,
      });
    } else if (raw.type === "PullRequestEvent") {
      if (!PR_ACTIONS.has(asString(payload.action))) continue;
      const pr = isRecord(payload.pull_request) ? payload.pull_request : null;
      const title = pr ? asString(pr.title) : "";
      if (!title) continue;
      items.push({ repo, message: title, kind: "pr", when });
    }
  }
  items.sort((a, b) => compareDesc(a.when, b.when));
  return items.slice(0, FEED_LIMIT);
}

function buildHeatmap(events: unknown[]): HeatmapDay[] {
  const counts = new Map<string, number>();
  for (const raw of events) {
    if (!isRecord(raw) || raw.type !== "PushEvent") continue;
    const timestamp = Date.parse(asString(raw.created_at));
    if (Number.isNaN(timestamp)) continue;
    const payload = isRecord(raw.payload) ? raw.payload : {};
    const commits = Array.isArray(payload.commits) ? payload.commits : [];
    const size = asNumber(payload.size);
    const count = size > 0 ? size : commits.length > 0 ? commits.length : 1;
    const key = new Date(timestamp).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + count);
  }
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days: HeatmapDay[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i -= 1) {
    const key = new Date(todayUtc - i * DAY_MS).toISOString().slice(0, 10);
    days.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return days;
}

function computeStreaks(days: HeatmapDay[]): { active: number; longest: number } {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    if (day.count > 0) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  let index = days.length - 1;
  if (days[index]?.count === 0) index -= 1;
  let active = 0;
  while (index >= 0 && (days[index]?.count ?? 0) > 0) {
    active += 1;
    index -= 1;
  }
  return { active, longest };
}

function buildActiveRepos(repos: unknown[]): ActiveRepo[] {
  const items: ActiveRepo[] = [];
  for (const raw of repos) {
    if (!isRecord(raw)) continue;
    if (raw.archived === true || raw.fork === true) continue;
    items.push({
      name: asString(raw.name),
      description: typeof raw.description === "string" ? raw.description : null,
      language: typeof raw.language === "string" ? raw.language : null,
      stars: asNumber(raw.stargazers_count),
      pushedAt: asString(raw.pushed_at),
      url: asString(raw.html_url),
    });
  }
  items.sort((a, b) => compareDesc(a.pushedAt, b.pushedAt));
  return items.slice(0, ACTIVE_REPO_LIMIT);
}

export function buildSnapshot(
  events: unknown[],
  repos: unknown[],
  user: unknown,
): GithubSnapshot {
  const eventList = Array.isArray(events) ? events : [];
  const repoList = Array.isArray(repos) ? repos : [];
  const userRecord = isRecord(user) ? user : {};
  const generatedAt = new Date().toISOString();
  const heatmap = buildHeatmap(eventList);
  const streaks = computeStreaks(heatmap);
  const publicRepos =
    typeof userRecord.public_repos === "number" && userRecord.public_repos >= 0
      ? userRecord.public_repos
      : repoList.length;

  return {
    username: asString(userRecord.login) || GITHUB_USERNAME,
    lastActive: latestEventAt(eventList) || generatedAt,
    heatmap,
    totalContributions90d: heatmap.reduce((total, day) => total + day.count, 0),
    activeStreakDays: streaks.active,
    longestStreakDays: streaks.longest,
    publicRepos,
    activeRepos: buildActiveRepos(repoList),
    feed: buildFeed(eventList),
    generatedAt,
  };
}
