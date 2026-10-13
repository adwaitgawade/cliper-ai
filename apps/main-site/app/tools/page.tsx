import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "../_components/sections/Faq";
import { FinalCta } from "../_components/sections/FinalCta";
import { Footer } from "../_components/sections/Footer";
import { SITE_URL } from "../_components/site";
import { TRUST_POINTS } from "../_components/tools/links";
import { CATEGORIES, TOOLS } from "../_components/tools/registry";
import { ToolCard } from "../_components/tools/ToolCard";
import { Check, Shield, Zap } from "../_components/ui/icons";
import { JsonLd } from "../_components/ui/JsonLd";
import { Panel, SectionHeading } from "../_components/ui/primitives";
import { Reveal } from "../_components/ui/Reveal";
import { SiteHeader } from "../_components/ui/SiteHeader";

const TITLE = "Free Video & Audio Tools: Transcribe, Resize, Trim & More";
const DESCRIPTION =
  "Free online video tools that run in your browser: audio to text, subtitle generator, video resizer, trimmer, compressor and video to MP3. No upload, no sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "free video tools",
    "online video editor tools",
    "audio to text",
    "subtitle generator",
    "resize video for tiktok",
    "video compressor",
    "video to mp3",
    "trim video online",
  ],
  alternates: { canonical: "/tools" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/tools", type: "website", siteName: "ClipPro" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FAQS = [
  {
    q: "Are these video tools really free?",
    a: "Yes. Every tool on this page is free to use with no sign-up, no watermark and no daily limit. They run on your own device, so there are no server costs for us to pass on to you.",
  },
  {
    q: "Do you upload my files?",
    a: "No. The tools process your audio and video directly in your browser using WebCodecs and WebAssembly. Your files never leave your computer, which also makes them a good fit for confidential recordings.",
  },
  {
    q: "Which browsers are supported?",
    a: "Current versions of Chrome, Edge, Safari and Firefox on desktop work best. Phones and tablets are supported too, but processing long or high-resolution videos will be slower there.",
  },
  {
    q: "Is there a file size limit?",
    a: "There's no fixed limit, because the work happens on your device. In practice, files up to about 2 GB work well on most computers; very large files depend on how much memory your device has.",
  },
  {
    q: "How is this different from ClipPro?",
    a: "These free tools each do one job by hand. ClipPro is the full AI workflow: it watches a long video, finds the most engaging moments and turns them into captioned, reframed shorts ready to post.",
  },
];

export default function ToolsPage() {
  return (
    <main className="flex flex-1 flex-col gap-2 p-2 min-[721px]:gap-3.5 min-[721px]:p-3.5">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: TITLE,
            description: DESCRIPTION,
            url: `${SITE_URL}/tools`,
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
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Free tools", item: `${SITE_URL}/tools` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
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
            Free video tools that run in your browser
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-cream/70 text-pretty">
            Transcribe audio to text, generate subtitles, resize videos for TikTok, trim, compress and convert to MP3.
            Everything happens on your device, so it’s fast, private and free.
          </p>
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
          {[
            {
              icon: <Shield />,
              title: "Private by design",
              body: "Audio and video are decoded, edited and encoded inside your browser tab with WebCodecs and WebAssembly. Nothing is uploaded, so nothing can leak.",
            },
            {
              icon: <Zap />,
              title: "No queues, no waiting",
              body: "There’s no upload step and no server queue. Processing starts the moment you drop a file and uses your device’s hardware acceleration where available.",
            },
            {
              icon: <Check />,
              title: "Free without catches",
              body: "No watermark, no account, no daily cap. Because your device does the work, the tools cost us almost nothing to run, so we can keep them free.",
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 100} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <span className="text-accent-soft">{f.icon}</span>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-cream/65">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </Panel>

      <Faq items={FAQS} lead="Everything you need to know about ClipPro’s free tools." />
      <FinalCta />
      <Footer />
    </main>
  );
}
