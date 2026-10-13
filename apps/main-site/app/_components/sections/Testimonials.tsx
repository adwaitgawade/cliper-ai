import { Star } from "../ui/icons";
import { Panel, SectionHeading } from "../ui/primitives";
import { Reveal } from "../ui/Reveal";

// Placeholder testimonials (fictional people) — replace with real, approved quotes before launch.
const QUOTES = [
  {
    quote:
      "We went from posting two shorts a week to two a day. Our podcast's YouTube subs tripled in four months and I haven't opened Premiere since.",
    name: "Maya Okafor",
    role: "Host, The Long Game Pod",
    stat: "3.1× subscribers",
  },
  {
    quote: "The virality score is scarily good. The clip it ranked #1 did 2.4M views on TikTok.",
    name: "Diego Ramírez",
    role: "Streamer · 480K followers",
    stat: "2.4M views",
  },
  {
    quote:
      "We manage short-form for 26 clients. ClipPro replaced a four-person editing pod and our turnaround went from 3 days to same-day.",
    name: "Priya Nair",
    role: "Founder, Hollow & Co Studio",
    stat: "Same-day delivery",
  },
  {
    quote: "Speaker tracking actually works with two people on camera. That alone sold me.",
    name: "Tom Hendricks",
    role: "Producer, Meridian Media",
    stat: "",
  },
  {
    quote:
      "Every webinar we run now turns into a month of LinkedIn content. Pipeline from social is up 41% quarter over quarter.",
    name: "Hannah Lee",
    role: "Head of Content, Brightwave",
    stat: "+41% pipeline",
  },
  {
    quote: "Captions in Spanish and Portuguese out of the box opened up a whole new audience for us.",
    name: "Lucas Ferreira",
    role: "Creator · 1.2M followers",
    stat: "",
  },
];

const AVATAR_TINTS = ["#f472b6", "#60a5fa", "#fbbf24", "#34d399", "#a78bfa", "#fb7185"];

export function Testimonials() {
  return (
    <Panel tone="cream">
      <SectionHeading
        eyebrow="Loved by creators"
        title="Post more. Edit less. Grow faster."
        lead={
          <span className="inline-flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex text-[#f5a524]">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={18} />
              ))}
            </span>
            4.9 average from 3,200+ reviews
          </span>
        }
      />
      <div className="gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3">
        {QUOTES.map((q, i) => (
          <Reveal key={q.name} delay={(i % 3) * 100} className="mb-4 break-inside-avoid">
            <figure className="rounded-3xl bg-paper p-6 shadow-[0_1px_0_rgba(18,14,34,0.06)]">
              {q.stat && (
                <span className="mb-4 inline-block rounded-full bg-accent-soft/70 px-3 py-1 text-xs font-semibold text-stage-light">
                  {q.stat}
                </span>
              )}
              <blockquote className="text-[17px] leading-relaxed text-pretty">“{q.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span
                  className="grid size-10 place-items-center rounded-full font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${AVATAR_TINTS[i]}, #8c6cff)` }}
                >
                  {q.name[0]}
                </span>
                <span className="text-sm leading-tight">
                  <span className="block font-semibold">{q.name}</span>
                  <span className="text-muted">{q.role}</span>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Panel>
  );
}
