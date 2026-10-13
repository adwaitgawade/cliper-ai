import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg bg-brand text-white",
        className,
      )}
      aria-hidden
    >
      {/* A 9:16 frame with a play notch */}
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
      >
        <rect x="7" y="3" width="10" height="18" rx="2.5" />
        <path d="M11 10l3 2-3 2z" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-heading font-soft text-[1.35rem] font-semibold tracking-[-0.03em]",
        className,
      )}
    >
      <LogoMark />
      clippro
    </span>
  );
}
