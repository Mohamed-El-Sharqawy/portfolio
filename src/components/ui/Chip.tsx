import { cn } from "@/lib/cn";

type ChipProps = {
  label: string;
  className?: string;
};

export default function Chip({ label, className }: ChipProps) {
  return (
    <span
      className={cn(
        "rounded-full border border-zinc-800 px-3 py-1 font-mono text-xs text-zinc-400",
        className,
      )}
    >
      {label}
    </span>
  );
}
