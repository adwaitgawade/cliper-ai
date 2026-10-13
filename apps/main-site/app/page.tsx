import type { Metadata } from "next";
import { Hero } from "./_components/hero/Hero";
import { Faq, HOME_FAQS } from "./_components/sections/Faq";
import { Features } from "./_components/sections/Features";
import { FinalCta } from "./_components/sections/FinalCta";
import { Footer } from "./_components/sections/Footer";
import { HowItWorks } from "./_components/sections/HowItWorks";
import { LinkDrop } from "./_components/sections/LinkDrop";
import { Pricing } from "./_components/sections/Pricing";
import { Testimonials } from "./_components/sections/Testimonials";
import { UseCases } from "./_components/sections/UseCases";
import { faqJsonLd, pageMetadata, productJsonLd } from "./_components/seo";
import { SITE_DESCRIPTION, SITE_TITLE } from "./_components/site";
import { JsonLd } from "./_components/ui/JsonLd";

export const metadata: Metadata = pageMetadata({
  title: SITE_TITLE,
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: [
    "AI video clipping",
    "long video to shorts",
    "AI clip generator",
    "podcast clips",
    "repurpose video for TikTok",
    "YouTube Shorts maker",
    "Instagram Reels from long videos",
    "auto captions",
  ],
});

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={[productJsonLd, faqJsonLd(HOME_FAQS)]} />
      <Hero />
      {/* Same frame gutter as the hero shell (8px mobile, 14px desktop). */}
      <div className="flex flex-col gap-2 px-2 pb-2 min-[721px]:gap-3.5 min-[721px]:px-3.5 min-[721px]:pb-3.5">
        <LinkDrop />
        <HowItWorks />
        <Features />
        <UseCases />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
        <Footer />
      </div>
    </main>
  );
}
