"use client";

import { useEffect, useState } from "react";

type Step = {
  time: string;
  agent: string;
  message: string;
};

const steps: Step[] = [
  { time: "00:00", agent: "planner", message: "decompose milestone → 12 tasks" },
  {
    time: "00:04",
    agent: "builder-01..03",
    message: "implement UI sections, tests passing",
  },
  {
    time: "01:12",
    agent: "reviewer",
    message: "audit a11y + performance, request changes",
  },
  {
    time: "02:48",
    agent: "builder-02",
    message: "apply fixes, re-run verification",
  },
  {
    time: "03:41",
    agent: "shipper",
    message: "PR merged → main, deploy to edge",
  },
  { time: "04:12", agent: "OK", message: "shipped in 4m 12s" },
];

const AGENT_COLUMN_WIDTH = 15;
const CHAR_MS = 26;
const LINE_START_MS = 260;
const LINE_PAUSE_MS = 460;
const RESTART_MS = 3000;

type Line = {
  time: string;
  agent: string;
  text: string;
};

const staticLines: Line[] = steps.map((step) => ({
  time: step.time,
  agent: step.agent,
  text: step.message,
}));

export default function AgenticPipeline() {
  const [lines, setLines] = useState<Line[]>(staticLines);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let timer: number | undefined;
    const later = (fn: () => void, ms: number) => {
      timer = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };
    const run = () => {
      setLive(true);
      setLines([]);
      let stepIndex = 0;
      const startLine = () => {
        const step = steps[stepIndex];
        let charIndex = 0;
        setLines((prev) => [
          ...prev,
          { time: step.time, agent: step.agent, text: "" },
        ]);
        const tick = () => {
          charIndex += 1;
          const text = step.message.slice(0, charIndex);
          setLines((prev) =>
            prev.map((line, i) =>
              i === prev.length - 1 ? { ...line, text } : line,
            ),
          );
          if (charIndex < step.message.length) {
            later(tick, CHAR_MS);
          } else if (stepIndex < steps.length - 1) {
            stepIndex += 1;
            later(startLine, LINE_PAUSE_MS);
          } else {
            later(run, RESTART_MS);
          }
        };
        later(tick, LINE_START_MS);
      };
      later(startLine, LINE_START_MS);
    };
    later(run, LINE_START_MS);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#101013]">
      <div className="flex items-center gap-4 border-b border-zinc-800 px-4 py-3">
        <span aria-hidden className="font-mono text-sm leading-none text-zinc-600">
          · · ·
        </span>
        <p className="font-mono text-xs">
          <span className="text-zinc-500">orchestrator — </span>
          <span className="text-emerald-400">7 agents online</span>
        </p>
      </div>
      <div aria-hidden className="px-5 py-5 font-mono text-sm leading-6">
        <div className="min-h-[144px] whitespace-pre-wrap">
          {lines.map((line, index) => (
            <p key={index}>
              <span className="text-zinc-600">[{line.time}] </span>
              <span className="text-emerald-400">
                {line.agent.padEnd(AGENT_COLUMN_WIDTH)}
              </span>
              <span className="text-zinc-300">{line.text}</span>
              {live && index === lines.length - 1 ? (
                <span className="animate-pulse text-emerald-400">▍</span>
              ) : null}
            </p>
          ))}
        </div>
      </div>
      <div className="sr-only">
        <p>
          Multi-agent pipeline trace: planner decomposes the milestone into
          twelve tasks. Builder agents implement UI sections with tests
          passing. Reviewer audits accessibility and performance and requests
          changes. Builder-02 applies fixes and re-runs verification. Shipper
          merges the pull request to main and deploys to the edge. Shipped in
          four minutes twelve seconds.
        </p>
      </div>
    </div>
  );
}
