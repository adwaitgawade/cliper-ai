"use client";

import { useState } from "react";
import { Check } from "../ui/icons";
import { Panel, SectionHeading } from "../ui/primitives";
import { Reveal } from "../ui/Reveal";
import { PLANS, PRICING_FOOTNOTE, PRICING_NOTE } from "./pricing-data";

export function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <Panel id="pricing" tone="paper">
      <SectionHeading
        eyebrow="Pricing"
        title="Start free. Upgrade when it pays for itself."
        lead={PRICING_NOTE}
      />

      <div className="mb-10 flex justify-center">
        <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full bg-cream p-1 text-sm font-semibold">
          {[
            { v: false, label: "Monthly" },
            { v: true, label: "Annually" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={annual === o.v}
              onClick={() => setAnnual(o.v)}
              className={`rounded-full px-5 py-2 transition-colors ${annual === o.v ? "bg-ink text-cream" : "text-muted hover:text-ink"}`}
            >
              {o.label}
              {o.v && <span className={`ml-2 text-xs ${annual ? "text-accent-soft" : "text-stage-light"}`}>−20%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p, i) => {
          const price = annual ? p.annual : p.monthly;
          return (
            <Reveal
              key={p.name}
              delay={i * 80}
              className={`relative flex flex-col rounded-3xl p-6 ${
                p.featured
                  ? "bg-stage bg-[radial-gradient(100%_70%_at_50%_0%,var(--color-stage-light),var(--color-stage))] text-cream shadow-[0_30px_60px_-30px_rgba(26,21,51,0.8)] lg:-my-3 lg:py-9"
                  : "border border-ink/10 bg-white"
              }`}
            >
              {p.featured && (
                <span className="absolute right-5 top-5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className={`mt-1 text-sm ${p.featured ? "text-cream/65" : "text-muted"}`}>{p.blurb}</p>
              <div className="mt-6 flex items-end gap-1.5">
                {price === null ? (
                  <span className="font-heading font-soft text-5xl font-semibold tracking-tight">Custom</span>
                ) : (
                  <>
                    <span className="font-heading font-soft text-5xl font-semibold tracking-tight">${price}</span>
                    <span className={`pb-1.5 text-sm ${p.featured ? "text-cream/60" : "text-muted"}`}>/ month</span>
                  </>
                )}
              </div>
              <p className={`mt-1 h-5 text-xs ${p.featured ? "text-cream/55" : "text-muted"}`}>
                {price ? (annual ? `Billed $${price * 12} yearly` : "Billed monthly") : ""}
              </p>
              <p
                className={`mt-5 rounded-xl px-3 py-2 text-sm font-semibold ${
                  p.featured ? "bg-white/10" : "bg-cream"
                }`}
              >
                {p.credits}
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check size={16} className={`mt-0.5 shrink-0 ${p.featured ? "text-accent-soft" : "text-stage-light"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={p.href}
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                  p.featured ? "bg-cream text-ink hover:bg-white" : "bg-ink text-cream hover:bg-black"
                }`}
              >
                {p.cta}
              </a>
            </Reveal>
          );
        })}
      </div>

      <p className="mt-10 text-center text-sm text-muted">
        {PRICING_FOOTNOTE}
      </p>
    </Panel>
  );
}
