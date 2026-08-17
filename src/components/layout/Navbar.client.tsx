"use client";

import { useState } from "react";
import Link from "next/link";
import Wordmark from "@/components/ui/Wordmark";

const links = [
  { label: "Work", href: "#work" },
  { label: "Experience", href: "#experience" },
  { label: "Agentic AI", href: "#agentic" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <nav className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-6 md:px-10">
        <Link href="/" aria-label="Mohamed Ahmed — home">
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 transition-colors hover:text-zinc-50"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contact"
            className="rounded-full border border-zinc-800 px-4 py-2 font-mono text-xs text-emerald-400 transition-colors hover:border-zinc-600"
          >
            ~/get-in-touch
          </a>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="-mr-2 px-2 font-mono text-2xl leading-none text-zinc-300 md:hidden"
        >
          {open ? "×" : "≡"}
        </button>
      </nav>

      {open && (
        <div className="border-b border-zinc-800 bg-zinc-950 md:hidden">
          <nav className="mx-auto flex max-w-[1200px] flex-col px-6 py-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-zinc-900 py-3 text-sm text-zinc-300 transition-colors last:border-b-0 hover:text-zinc-50"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="py-3 font-mono text-xs text-emerald-400"
            >
              ~/get-in-touch
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
