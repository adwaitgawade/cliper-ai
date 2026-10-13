import { Hero } from "./_components/hero/Hero";
import { Faq } from "./_components/sections/Faq";
import { Features } from "./_components/sections/Features";
import { FinalCta } from "./_components/sections/FinalCta";
import { Footer } from "./_components/sections/Footer";
import { HowItWorks } from "./_components/sections/HowItWorks";
import { LinkDrop } from "./_components/sections/LinkDrop";
import { Pricing } from "./_components/sections/Pricing";
import { Testimonials } from "./_components/sections/Testimonials";
import { UseCases } from "./_components/sections/UseCases";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
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
