import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = {
  variant?: "primary" | "ghost";
  href?: string;
  target?: string;
  rel?: string;
  type?: "button" | "submit" | "reset";
  className?: string;
  children: ReactNode;
};

const baseStyles =
  "inline-flex items-center justify-center whitespace-nowrap rounded-[10px] px-6 py-3 transition-colors";

const variantStyles = {
  primary:
    "bg-emerald-500 text-[#052e21] hover:bg-emerald-400 active:translate-y-px",
  ghost: "border border-zinc-800 text-zinc-200 hover:border-zinc-600",
} as const;

export default function Button({
  variant = "primary",
  href,
  target,
  rel,
  type = "button",
  className,
  children,
}: ButtonProps) {
  const classes = cn(baseStyles, variantStyles[variant], className);

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes}>
      {children}
    </button>
  );
}
