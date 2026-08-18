import { cn } from "@/lib/cn";

type ChipProps = {
  label: string;
  icon?: string | null;
  className?: string;
};

export default function Chip({ label, icon, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1 font-mono text-xs text-zinc-400",
        className,
      )}
    >
      {icon ? (
        <img
          src={`https://cdn.simpleicons.org/${icon}/34d399`}
          alt=""
          width={12}
          height={12}
          loading="lazy"
          className="inline-block"
        />
      ) : null}
      {label}
    </span>
  );
}
