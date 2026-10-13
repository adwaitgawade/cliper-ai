import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "../../_components/sections/Faq";
import { FinalCta } from "../../_components/sections/FinalCta";
import { Footer } from "../../_components/sections/Footer";
import { SITE_URL } from "../../_components/site";
import { linkifyTools, NextSteps, TRUST_POINTS } from "../../_components/tools/links";
import { getTool, TOOLS } from "../../_components/tools/registry";
import { TOOL_ICONS, ToolCard } from "../../_components/tools/ToolCard";
import { ToolWidget } from "../../_components/tools/widgets/ToolWidget";
import { Check } from "../../_components/ui/icons";
import { JsonLd } from "../../_components/ui/JsonLd";
import { Panel, SectionHeading } from "../../_components/ui/primitives";
import { Reveal } from "../../_components/ui/Reveal";
import { SiteHeader } from "../../_components/ui/SiteHeader";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getTool((await params).slug);
  if (!tool) return {};
  const url = `/tools/${tool.slug}`;
  return {
    title: tool.seo.title,
    description: tool.seo.description,
    keywords: tool.seo.keywords,
    alternates: { canonical: url },
    openGraph: { title: tool.seo.title, description: tool.seo.description, url, type: "website", siteName: "ClipPro" },
    twitter: { card: "summary_large_image", title: tool.seo.title, description: tool.seo.description },
  };
}

// These pages exist to rank in search, so each slug is prerendered as fully inline static HTML.
// Moving the `params` read behind <Suspense> (the "instant navigation" fix) would make Next emit the
// content as a hidden, script-swapped block after a skeleton, which non-JS crawlers can't see.
// A navigation here just waits for the page's small static payload instead.
export const instant = false;

export default async function ToolPage({ params }: Props) {
  const tool = getTool((await params).slug);
  if (!tool) notFound();

  const url = `${SITE_URL}/tools/${tool.slug}`;
  const live = tool.status === "live";
  const related = tool.related.map(getTool).filter((t) => t !== undefined);
  // Each other tool is linked from the article at most once.
  const linkedTools = new Set<string>();

  const structuredData: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Free tools", item: `${SITE_URL}/tools` },
        { "@type": "ListItem", position: 3, name: tool.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: tool.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  // Only describe tools that actually work today as applications / how-tos.
  if (live) {
    structuredData.push(
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: tool.name,
        url,
        description: tool.seo.description,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Any (runs in a web browser)",
        browserRequirements: "Requires JavaScript and a modern browser (Chrome, Edge, Safari or Firefox).",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: "ClipPro", url: SITE_URL },
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: `How to use the ${tool.name}`,
        step: tool.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.body })),
      },
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-2 p-2 min-[721px]:gap-3.5 min-[721px]:p-3.5">
      <JsonLd data={structuredData} />

      {/* Hero: H1 + the tool itself, above the fold. */}
      <section className="relative overflow-hidden rounded-[22px] bg-stage bg-[radial-gradient(70%_70%_at_50%_0%,var(--color-stage-light),var(--color-stage)_60%,var(--color-stage-deep))] px-4 pt-4 pb-16 text-cream sm:rounded-[28px] sm:px-8 md:pb-24">
        <SiteHeader />
        <div className="mx-auto mt-12 max-w-3xl text-center md:mt-16">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-cream/55">
            <Link href="/" className="hover:text-cream">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/tools" className="hover:text-cream">
              Free tools
            </Link>{" "}
            / <span className="text-cream/85">{tool.name}</span>
          </nav>
          <span className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-white/10 text-accent-soft">
            {TOOL_ICONS[tool.widget]}
          </span>
          <h1 className="font-heading font-soft text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
            {tool.h1}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-cream/70 text-pretty">{tool.subtitle}</p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-3xl bg-paper p-4 text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] sm:p-6">
          <ToolWidget tool={tool} />
        </div>

        {live && (
          <ul className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
            {TRUST_POINTS.map((b) => (
              <li key={b} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5">
                <Check size={14} className="text-accent-soft" /> {b}
              </li>
            ))}
          </ul>
        )}
        <NextSteps slug={tool.slug} />
      </section>

      <Panel tone="cream">
        <SectionHeading eyebrow="How it works" title={`How to use the ${tool.name}`} />
        <ol className="grid gap-4 md:grid-cols-3">
          {tool.steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 100} className="flex gap-4 rounded-3xl bg-paper p-6">
              <span className="font-heading font-soft text-5xl leading-none font-semibold text-accent/80">{i + 1}</span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Panel>

      <Panel tone="paper">
        <SectionHeading eyebrow="Features" title={live ? `Why use our ${tool.name}` : `What the ${tool.name} will do`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tool.features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80} className="rounded-3xl border border-ink/10 bg-white p-6">
              <Check className="text-stage-light" />
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{linkifyTools(f.body, tool.slug, linkedTools)}</p>
            </Reveal>
          ))}
        </div>
      </Panel>

      {/* Long-form, people-first content: the bulk of the page's search relevance. */}
      <Panel tone="paper" className="pt-4! md:pt-6!">
        <article className="mx-auto max-w-3xl space-y-14">
          {tool.sections.map((s) => (
            <Reveal key={s.heading} as="section">
              <h2 className="font-heading font-soft text-3xl font-semibold tracking-[-0.03em] text-balance md:text-4xl">{s.heading}</h2>
              <div className="mt-5 space-y-4 text-[17px] leading-[1.75] text-ink/80">
                {s.paragraphs.map((p, i) => (
                  <p key={i}>{linkifyTools(p, tool.slug, linkedTools)}</p>
                ))}
              </div>
            </Reveal>
          ))}
        </article>
      </Panel>

      <Panel tone="stage">
        <SectionHeading dark eyebrow="Use cases" title={`Who uses the ${tool.name}`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tool.useCases.map((u, i) => (
            <Reveal key={u.title} delay={i * 80} className="rounded-3xl border border-white/10 bg-white/4 p-6">
              <h3 className="text-lg font-semibold">{u.title}</h3>
              <p className="mt-2 leading-relaxed text-cream/65">{linkifyTools(u.body, tool.slug, linkedTools, "dark")}</p>
            </Reveal>
          ))}
        </div>
      </Panel>

      <Faq items={tool.faqs.map((f) => ({ q: f.q, a: linkifyTools(f.a, tool.slug, linkedTools) }))} title={`${tool.name} FAQ`} lead="Quick answers to the most common questions." />

      <Panel tone="paper">
        <SectionHeading eyebrow="More free tools" title="You might also need" />
        <div className="grid gap-4 md:grid-cols-3">
          {related.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
        <p className="mt-10 text-center">
          <Link href="/tools" className="font-semibold underline underline-offset-4">
            See all free tools
          </Link>
        </p>
      </Panel>

      <FinalCta />
      <Footer />
    </main>
  );
}
