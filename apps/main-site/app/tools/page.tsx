import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "../_components/sections/Faq";
import { FinalCta } from "../_components/sections/FinalCta";
import { Footer } from "../_components/sections/Footer";
import { breadcrumbJsonLd, faqJsonLd, ORG_ID, pageMetadata, WEBSITE_ID } from "../_components/seo";
import { CONTENT_UPDATED, SITE_URL } from "../_components/site";
import { TRUST_POINTS } from "../_components/tools/links";
import { TOOLS_FAQS, TOOLS_PAGE } from "../_components/tools/page-content";
import { CATEGORIES, TOOLS } from "../_components/tools/registry";
import { ToolCard } from "../_components/tools/ToolCard";
import { Check, Shield, Zap } from "../_components/ui/icons";
import { JsonLd } from "../_components/ui/JsonLd";
import { Panel, SectionHeading } from "../_components/ui/primitives";
import { Reveal } from "../_components/ui/Reveal";
import { SiteHeader } from "../_components/ui/SiteHeader";

export const metadata: Metadata = pageMetadata({
  title: TOOLS_PAGE.title,
  description: TOOLS_PAGE.description,
  path: "/tools",
  keywords: TOOLS_PAGE.keywords,
});

const WHY_ICONS = [<Shield key="shield" />, <Zap key="zap" />, <Check key="check" />];

export default function ToolsPage() {
  return (
    <main className="flex flex-1 flex-col gap-2 p-2 min-[721px]:gap-3.5 min-[721px]:p-3.5">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: TOOLS_PAGE.title,
            description: TOOLS_PAGE.description,
            url: `${SITE_URL}/tools`,
            dateModified: CONTENT_UPDATED,
            isPartOf: { "@id": WEBSITE_ID },
            publisher: { "@id": ORG_ID },
            mainEntity: {
              "@type": "ItemList",
              itemListElement: TOOLS.map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${SITE_URL}/tools/${t.slug}`,
                name: t.name,
              })),
            },
          },
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Free tools", path: "/tools" },
          ]),
          faqJsonLd(TOOLS_FAQS),
        ]}
      />

      <section className="relative overflow-hidden rounded-[22px] bg-stage bg-[radial-gradient(70%_80%_at_50%_0%,var(--color-stage-light),var(--color-stage)_60%,var(--color-stage-deep))] px-5 pt-4 pb-20 text-cream sm:rounded-[28px] sm:px-8 md:pb-28">
        <SiteHeader />
        <div className="mx-auto mt-16 max-w-3xl text-center md:mt-24">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-cream/55">
            <Link href="/" className="hover:text-cream">
              Home
            </Link>{" "}
            / <span className="text-cream/85">Free tools</span>
          </nav>
          <h1 className="font-heading font-soft text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-balance sm:text-6xl md:text-7xl">
            {TOOLS_PAGE.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-cream/70 text-pretty">{TOOLS_PAGE.subtitle}</p>
          <ul className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
            {TRUST_POINTS.map((b) => (
              <li key={b} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                <Check size={14} className="text-accent-soft" /> {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {CATEGORIES.map((cat) => {
        const tools = TOOLS.filter((t) => t.category === cat.id);
        if (!tools.length) return null;
        return (
          <Panel key={cat.id} id={cat.id} tone={cat.id === "edit" ? "cream" : "paper"} className="py-16! md:py-20!">
            <Reveal className="mb-8 flex flex-col justify-between gap-2 md:flex-row md:items-end">
              <h2 className="font-heading font-soft text-3xl font-semibold tracking-[-0.03em] md:text-4xl">{cat.title}</h2>
              <p className="max-w-md text-muted">{cat.blurb}</p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((t, i) => (
                <Reveal key={t.slug} delay={(i % 3) * 80}>
                  <ToolCard tool={t} />
                </Reveal>
              ))}
            </div>
          </Panel>
        );
      })}

      <Panel tone="stage">
        <SectionHeading
          dark
          eyebrow="Why browser-based"
          title="Your files stay on your device"
          lead="Most online converters upload your video to a server, process it there and make you wait in a queue. Our tools flip that around."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {TOOLS_PAGE.why.map((f, i) => (
            <Reveal key={f.title} delay={i * 100} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <span className="text-accent-soft">{WHY_ICONS[i]}</span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-cream/65">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </Panel>

      <Faq items={TOOLS_FAQS} lead="Everything you need to know about ClipPro’s free tools." />
      <FinalCta />
      <Footer />
    </main>
  );
}
