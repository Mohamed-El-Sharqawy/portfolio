import Wordmark from "@/components/ui/Wordmark";
import { profile } from "@/content/profile";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-10">
        <Wordmark />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-400">
          <a
            href={`mailto:${profile.email}`}
            className="transition-colors hover:text-zinc-50"
          >
            {profile.email}
          </a>
          <a
            href={profile.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-zinc-50"
          >
            LinkedIn ↗
          </a>
          <a
            href={profile.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-zinc-50"
          >
            GitHub ↗
          </a>
          <a
            href={profile.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-emerald-400 transition-colors hover:text-emerald-300"
          >
            CV (PDF) ↓
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-6 pb-10 md:px-10">
        <p className="font-mono text-xs text-zinc-600">
          © {new Date().getFullYear()} {profile.name} · All rights reserved
        </p>
      </div>
    </footer>
  );
}
