import {
  GITHUB_USERNAME,
  buildSnapshot,
  type CommitFeedItem,
  type GithubSnapshot,
} from "@/content/github";

const USERNAME = GITHUB_USERNAME;

const API_ROOT = `https://api.github.com/users`;
const HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "portfolio-site",
};
const RESPONSE_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=600";
const FETCH_TIMEOUT_MS = 8000;
const ENRICH_TIMEOUT_MS = 5000;
const ENRICH_LIMIT = 8;
const CACHE_TTL_MS = 30 * 60 * 1000;
type SnapshotCache = {
  data: GithubSnapshot;
  expires: number;
};

let cache: SnapshotCache | null = null;

async function fetchGithub(
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return null;
  }
}

async function readJson(response: Response | null): Promise<unknown> {
  if (!response || !response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function enrichFeed(feed: CommitFeedItem[]): Promise<void> {
  const targets = feed
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        item.kind === "push" &&
        !item.message &&
        item.head &&
        item.fullRepo,
    )
    .slice(0, ENRICH_LIMIT);
  await Promise.all(
    targets.map(async ({ item, index }) => {
      const response = await fetchGithub(
        `https://api.github.com/repos/${item.fullRepo}/commits/${item.head}`,
        ENRICH_TIMEOUT_MS,
      );
      if (!response) return;
      const data = (await readJson(response)) as Record<
        string,
        unknown
      > | null;
      if (!data) return;
      const commit = data.commit as Record<string, unknown> | undefined;
      const message =
        typeof commit?.message === "string"
          ? commit.message.split("\n")[0]?.trim() ?? ""
          : "";
      if (message) feed[index] = { ...item, message };
    }),
  );
}

export async function GET() {
  if (cache && cache.expires > Date.now()) {
    return Response.json(cache.data, {
      headers: { "Cache-Control": RESPONSE_CACHE_CONTROL },
    });
  }

  const [eventsResponse, reposResponse, userResponse] = await Promise.all([
    fetchGithub(`${API_ROOT}/${USERNAME}/events/public?per_page=100`),
    fetchGithub(`${API_ROOT}/${USERNAME}/repos?sort=pushed&per_page=30`),
    fetchGithub(`${API_ROOT}/${USERNAME}`),
  ]);

  if (!eventsResponse || !eventsResponse.ok) {
    return Response.json({ error: "github_unavailable" }, { status: 502 });
  }

  const [events, repos, user] = await Promise.all([
    readJson(eventsResponse),
    readJson(reposResponse),
    readJson(userResponse),
  ]);

  const snapshot = buildSnapshot(
    Array.isArray(events) ? events : [],
    Array.isArray(repos) ? repos : [],
    user,
  );

  await enrichFeed(snapshot.feed);

  cache = { data: snapshot, expires: Date.now() + CACHE_TTL_MS };

  return Response.json(snapshot, {
    headers: { "Cache-Control": RESPONSE_CACHE_CONTROL },
  });
}
