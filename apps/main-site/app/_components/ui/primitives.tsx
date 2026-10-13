import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/** A rounded section panel, matching the hero's framed look. */
export function Panel({
  id,
  tone = "paper",
  className = "",
  children,
}: {
  id?: string;
  tone?: "paper" | "stage" | "cream";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    paper: "bg-paper text-ink",
    cream: "bg-cream text-ink",
    stage:
      "bg-stage text-cream bg-[radial-gradient(90%_70%_at_50%_0%,var(--color-stage-light),var(--color-stage)_55%,var(--color-stage-deep))]",
  };
  return (
    <section
      id={id}
      className={`relative scroll-mt-4 overflow-hidden rounded-[22px] px-5 py-20 sm:rounded-[28px] sm:px-10 md:py-28 ${tones[tone]} ${className}`}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "center",
  dark = false,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "center" | "left";
  dark?: boolean;
}) {
  const center = align === "center";
  return (
    <Reveal className={`mb-14 max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      <p
        className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
          dark ? "bg-white/10 text-accent-soft" : "bg-accent-soft/60 text-stage-light"
        }`}
      >
        <span className="size-1.5 rounded-full bg-accent" />
        {eyebrow}
      </p>
      <h2 className="font-heading font-soft text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-balance sm:text-5xl md:text-6xl">
        {title}
      </h2>
      {lead && (
        <p className={`mt-5 text-lg leading-relaxed text-pretty ${dark ? "text-cream/70" : "text-muted"}`}>{lead}</p>
      )}
    </Reveal>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "light" | "ghost";
  className?: string;
}) {
  const variants = {
    primary: "bg-ink text-cream hover:bg-black",
    light: "bg-cream text-ink hover:bg-white",
    ghost: "border border-current/20 hover:bg-current/5",
  };
  return (
    <a
      href={href}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-semibold transition-colors ${variants[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
