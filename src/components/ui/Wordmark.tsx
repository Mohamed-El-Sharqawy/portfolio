import { cn } from "@/lib/cn";

type WordmarkProps = {
  className?: string;
};

export default function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      m<span className="text-emerald-500">.</span>ahmed
    </span>
  );
}
