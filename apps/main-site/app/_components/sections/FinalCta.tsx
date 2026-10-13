import { HERO_CLIPS } from "../hero/clips";
import { LINKS } from "../site";
import { ArrowRight } from "../ui/icons";
import { ButtonLink } from "../ui/primitives";
import { Reveal } from "../ui/Reveal";

const FAN = [
  { i: 4, rot: -14, x: "-62%", y: "18px" },
  { i: 5, rot: 0, x: "0%", y: "0px" },
  { i: 2, rot: 14, x: "62%", y: "18px" },
];

export function FinalCta() {
  return (
    <section className="relative overflow-hidden rounded-[22px] bg-stage bg-[radial-gradient(60%_70%_at_50%_100%,rgba(140,108,255,0.55),transparent_70%),radial-gradient(120%_90%_at_50%_0%,var(--color-stage-light),var(--color-stage)_55%,var(--color-stage-deep))] px-5 pt-20 text-cream sm:rounded-[28px] sm:px-10 md:pt-28">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading font-soft text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-balance sm:text-6xl md:text-7xl">
          Your next viral clip is hiding in your last video.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-cream/70">
          Upload it now and get your first clips in minutes. 60 free credits every month, no card required.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href={LINKS.signUp} variant="light">
            Start clipping free <ArrowRight size={18} />
          </ButtonLink>
          <ButtonLink href="/#pricing" variant="ghost" className="text-cream">
            Compare plans
          </ButtonLink>
        </div>
      </Reveal>

      {/* Fanned 9:16 clips peeking up from the bottom edge, echoing the hero wheel. */}
      <div className="relative mx-auto mt-16 h-56 max-w-md sm:h-72" aria-hidden>
        {FAN.map((f) => (
          <div
            key={f.i}
            className="absolute left-1/2 top-0 aspect-[9/16] w-36 overflow-hidden rounded-2xl border-[5px] border-cream shadow-2xl sm:w-44"
            style={{ transform: `translateX(calc(-50% + ${f.x})) translateY(${f.y}) rotate(${f.rot}deg)`, zIndex: f.rot === 0 ? 2 : 1 }}
          >
            <video src={`${HERO_CLIPS[f.i].src}#t=2`} muted playsInline preload="metadata" className="h-full w-full bg-[linear-gradient(160deg,#4b3d8f,#1a1533)] object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}
