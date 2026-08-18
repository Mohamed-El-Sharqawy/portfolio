"use client";

import { useEffect, useState } from "react";
import Reveal from "@/components/ui/Reveal.client";
import type { GithubSnapshot } from "@/content/github";

type Status = "loading" | "ready" | "hidden";

const LEVEL_COLORS = ["#18181b", "#064e3b", "#059669", "#10b981", "#34d399"];

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  CSS: "#563d7c",
};

function levelColor(count: number): string {
  if (count >= 10) return LEVEL_COLORS[4];
  if (count >= 6) return LEVEL_COLORS[3];
  if (count >= 3) return LEVEL_COLORS[2];
  if (count >= 1) return LEVEL_COLORS[1];
  return LEVEL_COLORS[0];
}

function langColor(language: string | null): string {
  return (language && LANG_COLORS[language]) || "#71717a";
}

function relative(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function Skeleton() {
  return (
    <div aria-hidden>
      <div className="h-8 w-64 animate-pulse rounded bg-zinc-800" />
      <div className="mt-6 overflow-x-auto">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
          {Array.from({ length: 90 }, (_, i) => (
            <div
              key={i}
              className="h-[11px] w-[11px] animate-pulse rounded-[3px] bg-zinc-800"
            />
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-[76px] animate-pulse rounded-[10px] bg-zinc-800"
          />
        ))}
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-[124px] animate-pulse rounded-xl bg-zinc-800"
          />
        ))}
      </div>
    </div>
  );
}

export default function GitHubActivity() {
  const [status, setStatus] = useState<Status>("loading");
  const [snapshot, setSnapshot] = useState<GithubSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/github")
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return (await res.json()) as GithubSnapshot;
      })
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("hidden");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "hidden") return null;

  if (status === "loading" || !snapshot) return <Skeleton />;

  const stats = [
    {
      value: snapshot.totalContributions,
      label:
        snapshot.heatmapSpan === "year"
          ? "contributions · 12 months"
          : "contributions · 90 days",
      accent: false,
    },
    { value: snapshot.activeStreakDays, label: "current streak", accent: true },
    { value: snapshot.longestStreakDays, label: "longest streak", accent: false },
    { value: snapshot.publicRepos, label: "public repos", accent: false },
  ];

  return (
    <Reveal>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <h2 className="text-4xl tracking-tighter md:text-5xl">
          Open source, live
        </h2>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900 px-3 py-1.5 font-mono text-xs text-emerald-400">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          active {relative(snapshot.lastActive)}
          <span className="text-zinc-600">
            {` · github.com/${snapshot.username}`}
          </span>
        </span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
          {snapshot.heatmap.map((day) => (
            <div
              key={day.date}
              title={`${day.count} commits · ${day.date}`}
              style={{ backgroundColor: levelColor(day.count) }}
              className="h-[11px] w-[11px] rounded-[3px]"
            />
          ))}
        </div>
        <div className="mt-2.5 flex items-center justify-between font-mono text-[10.5px] text-zinc-600">
          <span>
            {snapshot.heatmapSpan === "year"
              ? "last 12 months"
              : "last 90 days"}
          </span>
          <span className="flex items-center gap-1">
            less
            {LEVEL_COLORS.map((color) => (
              <span
                key={color}
                style={{ backgroundColor: color }}
                className="inline-block h-[9px] w-[9px] rounded-[2px]"
              />
            ))}
            more
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[10px] border border-zinc-800 bg-[#0d0d10] px-4 py-3.5"
          >
            <p
              className={
                stat.accent
                  ? "font-mono text-xl text-emerald-400 sm:text-2xl"
                  : "font-mono text-xl text-zinc-50 sm:text-2xl"
              }
            >
              {stat.value.toLocaleString("en-US")}
            </p>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {snapshot.activeRepos.map((repo) => (
          <a
            key={repo.name}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-zinc-800 bg-[#101013] p-4 transition-colors hover:border-emerald-900"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="transition-colors group-hover:text-emerald-400">
                {repo.name}
              </span>
              <span className="ml-auto text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100">
                ↗
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-zinc-400">
              {repo.description}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-3.5 font-mono text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: langColor(repo.language) }}
                  className="inline-block h-2 w-2 rounded-full"
                />
                {repo.language}
              </span>
              <span>★ {repo.stars}</span>
              <span>pushed {relative(repo.pushedAt)}</span>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-6 divide-y divide-zinc-900">
        {snapshot.feed.slice(0, 8).map((item, i) => (
          <div
            key={`${item.repo}-${i}`}
            className="grid grid-cols-[110px_1fr_auto] items-baseline gap-4 py-3 font-mono text-xs"
          >
            <span className="truncate text-emerald-400">{item.repo}</span>
            <span className="truncate text-zinc-400">
              {item.message || "pushed changes"}
            </span>
            <span className="flex items-center gap-2 whitespace-nowrap text-zinc-600">
              {item.kind === "pr" ? (
                <span className="rounded border border-emerald-900 px-1 py-px text-[10px] leading-4 text-emerald-400">
                  PR
                </span>
              ) : (
                <span>push</span>
              )}
              {relative(item.when)}
            </span>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
