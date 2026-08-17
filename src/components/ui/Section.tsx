import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionProps = {
  id: string;
  className?: string;
  children: ReactNode;
};

export default function Section({ id, className, children }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "mx-auto max-w-[1200px] scroll-mt-24 px-6 py-24 md:px-10 md:py-32",
        className,
      )}
    >
      {children}
    </section>
  );
}
