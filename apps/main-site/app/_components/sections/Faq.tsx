import { Plus } from "../ui/icons";
import { Panel, SectionHeading } from "../ui/primitives";
import { Reveal } from "../ui/Reveal";

const FAQS = [
  {
    q: "What exactly does ClipPro do?",
    a: "ClipPro turns long videos into short, vertical clips. It transcribes your video, finds the moments with the strongest hooks, trims them, reframes them to 9:16 around the speaker, adds animated captions and your branding, and can post them to TikTok, Instagram, YouTube and more.",
  },
  {
    q: "How do credits work?",
    a: "One credit equals one minute of uploaded video, no matter how many clips we make from it. A 60-minute podcast uses 60 credits and typically produces 15–25 clips. Unused credits roll over for one month.",
  },
  {
    q: "Which video sources can I use?",
    a: "Upload MP4, MOV, MKV or WebM files up to 10 hours, or paste a link from YouTube, Zoom, Vimeo, Twitch, Riverside, Google Drive, Dropbox or Rumble.",
  },
  {
    q: "Which languages are supported?",
    a: "Transcription and captions work in 30+ languages, including English, Spanish, Portuguese, French, German, Hindi, Japanese and Arabic. You can also translate captions into a different language from the source.",
  },
  {
    q: "Can I edit the clips after the AI makes them?",
    a: "Yes. Adjust start and end points, edit caption text and style, change the crop, swap B-roll or re-score a clip. Pro plans can also export XML to Premiere Pro or DaVinci Resolve.",
  },
  {
    q: "Who owns the clips?",
    a: "You do. Everything you upload and every clip we generate belongs to you, and we never use your videos to train models without your explicit opt-in.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — plans are month-to-month or yearly, and you can cancel from settings in two clicks. You keep access until the end of your billing period.",
  },
  {
    q: "Do you have an API?",
    a: "Business plans include a REST API and webhooks for submitting videos, fetching clips and publishing programmatically.",
  },
];

export function Faq() {
  return (
    <Panel id="faq" tone="cream">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeading
          align="left"
          eyebrow="FAQ"
          title="Questions, answered"
          lead={
            <>
              Can’t find what you need?{" "}
              <a href="mailto:hello@clippro.ai" className="font-semibold text-ink underline underline-offset-4">
                Email us
              </a>{" "}
              — a human replies within a day.
            </>
          }
        />
        <Reveal className="divide-y divide-ink/10 border-y border-ink/10">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-1 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-semibold">
                {f.q}
                <Plus className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="max-w-2xl pb-6 leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </Panel>
  );
}
