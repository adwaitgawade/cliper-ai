import Link from "next/link";
import type { ReactNode } from "react";
import { FinalCta } from "../sections/FinalCta";
import { Footer } from "../sections/Footer";
import { breadcrumbJsonLd, ORG_ID, WEBSITE_ID } from "../seo";
import { formatDate, SITE_URL } from "../site";
import { ArrowRight } from "../ui/icons";
import { JsonLd } from "../ui/JsonLd";
import { Panel } from "../ui/primitives";
import { SiteHeader } from "../ui/SiteHeader";
import type { ContentPage } from "./types";

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const linkClass = "font-medium text-stage-light underline decoration-accent/40 underline-offset-4 hover:decoration-accent";

function SmartLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/** Turns the `[label](href)` links in page copy into real links. */
function rich(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    out.push(text.slice(last, m.index));
    out.push(
      <SmartLink key={m.index} href={m[2]} className={linkClass}>
        {m[1]}
      </SmartLink>,
    );
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

/** About, Privacy and Terms: a stage hero with the H1, then readable long-form sections. */
export function ContentPageView({ page }: { page: ContentPage }) {
  const url = `${SITE_URL}/${page.slug}`;

  return (
    <main className="flex flex-1 flex-col gap-2 p-2 min-[721px]:gap-3.5 min-[721px]:p-3.5">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": page.schemaType,
            name: page.seo.title,
            description: page.seo.description,
            url,
            inLanguage: "en",
            dateModified: page.updated,
            isPartOf: { "@id": WEBSITE_ID },
            publisher: { "@id": ORG_ID },
            ...(page.schemaType === "AboutPage" && { about: { "@id": ORG_ID } }),
          },
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: page.name, path: `/${page.slug}` },
          ]),
        ]}
      />

      <section className="relative overflow-hidden rounded-[22px] bg-stage bg-[radial-gradient(70%_80%_at_50%_0%,var(--color-stage-light),var(--color-stage)_60%,var(--color-stage-deep))] px-5 pt-4 pb-16 text-cream sm:rounded-[28px] sm:px-8 md:pb-24">
        <SiteHeader />
        <div className="mx-auto mt-14 max-w-3xl text-center md:mt-20">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-cream/55">
            <Link href="/" className="hover:text-cream">
              Home
            </Link>{" "}
            / <span className="text-cream/85">{page.name}</span>
          </nav>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-soft">
            <span className="size-1.5 rounded-full bg-accent" />
            {page.eyebrow}
          </p>
          <h1 className="font-heading font-soft text-4xl font-semibold leading-[1.04] tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">
            {page.h1}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-cream/70 text-pretty">{page.subtitle}</p>
          <p className="mt-6 text-sm text-cream/55">
            {page.updatedLabel} <time dateTime={page.updated}>{formatDate(page.updated)}</time>
          </p>
        </div>
      </section>

      {page.cards && (
        <Panel tone="cream" className="py-12! md:py-16!">
          <div className="grid gap-4 md:grid-cols-3">
            {page.cards.map((c) => (
              <SmartLink
                key={c.title}
                href={c.href}
                className="group flex flex-col rounded-3xl bg-paper p-6 transition-shadow hover:shadow-[0_20px_40px_-24px_rgba(26,21,51,0.45)]"
              >
                <h2 className="text-lg font-semibold tracking-tight">{c.title}</h2>
                <p className="mt-2 flex-1 leading-relaxed text-muted">{c.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-stage-light">
                  {c.cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </SmartLink>
            ))}
          </div>
        </Panel>
      )}

      <Panel tone="paper" className="py-14! md:py-20!">
        <div className={page.toc ? "grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16" : ""}>
          {page.toc && (
            <nav aria-label="On this page" className="self-start rounded-3xl bg-cream p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">On this page</p>
              <ol className="space-y-2 text-sm">
                {page.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-ink/75 transition-colors hover:text-ink">
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <article className="mx-auto max-w-3xl space-y-12">
            {page.sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-6">
                <h2 className="font-heading font-soft text-2xl font-semibold tracking-[-0.03em] text-balance md:text-3xl">
                  {s.heading}
                </h2>
                <div className="mt-4 space-y-4 text-[17px] leading-[1.75] text-ink/80">
                  {s.blocks.map((b, i) =>
                    typeof b === "string" ? (
                      <p key={i}>{rich(b)}</p>
                    ) : (
                      <ul key={i} className="list-disc space-y-2 pl-6 marker:text-accent">
                        {b.list.map((item) => (
                          <li key={item}>{rich(item)}</li>
                        ))}
                      </ul>
                    ),
                  )}
                </div>
              </section>
            ))}
          </article>
        </div>
      </Panel>

      {page.schemaType === "AboutPage" && <FinalCta />}
      <Footer />
    </main>
  );
}
