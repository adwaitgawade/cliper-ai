import { CONTACT_EMAIL, SALES_EMAIL } from "../site";
import type { ContentPage } from "./types";

export const aboutPage: ContentPage = {
  slug: "about",
  name: "About",
  schemaType: "AboutPage",
  seo: {
    title: "About ClipPro: AI Video Clipping and Free Browser Tools",
    description:
      "ClipPro turns long videos into short, captioned clips for TikTok, Reels and Shorts, and makes free video tools that run in your browser. Learn why we built it.",
  },
  eyebrow: "About us",
  h1: "We help long videos find their short audience",
  subtitle:
    "ClipPro is an AI video clipping tool. It turns podcasts, webinars and streams into short, captioned, vertical clips, so the best moments of a long recording actually get seen.",
  updated: "2026-10-13",
  updatedLabel: "Last updated",
  cards: [
    {
      title: "ClipPro",
      body: "Upload a long video or paste a link. ClipPro finds the strongest moments, reframes them to 9:16, adds animated captions and helps you post them.",
      href: "/#how",
      cta: "See how it works",
    },
    {
      title: "Free video tools",
      body: "Transcribe, add subtitles, resize, trim, compress and convert video for free. Every tool runs in your browser, so your files are never uploaded.",
      href: "/tools",
      cta: "Browse free tools",
    },
    {
      title: "Talk to us",
      body: `Questions, feedback or partnership ideas: a person on the team reads every email and replies within a day.`,
      href: `mailto:${CONTACT_EMAIL}`,
      cta: CONTACT_EMAIL,
    },
  ],
  sections: [
    {
      id: "why",
      heading: "Why we built ClipPro",
      blocks: [
        "Most of the good material in a long video never gets watched. A one-hour podcast or webinar usually holds a dozen moments that would work as a short clip, but finding them means scrubbing through the whole recording, cutting each one, reframing it for a phone screen and captioning it by hand. That can take an editor most of a day per episode, so most creators post two or three clips and leave the rest behind.",
        "ClipPro does that work for you. It transcribes the video, reads the transcript, the faces on screen and the pacing, and scores every moment for how likely it is to hold attention. Then it trims the best ones, keeps the speaker centred in a vertical frame, adds captions and your branding, and lines the clips up to post on TikTok, Instagram Reels, YouTube Shorts, LinkedIn, X and Facebook. You stay in charge of taste: every clip can be edited before it goes out.",
      ],
    },
    {
      id: "who",
      heading: "Who ClipPro is for",
      blocks: [
        "ClipPro is built for anyone with more video than time to edit it:",
        {
          list: [
            "Podcasters who want every episode to send new listeners back to the full show.",
            "Creators and streamers who need to keep short-form channels fed every day.",
            "Agencies running short-form video for many clients at once.",
            "Marketing teams repurposing webinars, demos and customer calls.",
          ],
        },
      ],
    },
    {
      id: "free-tools",
      heading: "Why our free tools run in your browser",
      blocks: [
        "Alongside ClipPro we publish a set of [free video and audio tools](/tools): a transcriber, a subtitle generator, a video resizer, a trimmer, a compressor, converters to MP3, GIF and WebP, and more. Most online converters upload your file to a server, process it there and make you wait in a queue. Ours do the opposite. They use WebCodecs, WebAssembly and on-device AI models to process your file inside your browser tab, so the video never leaves your computer.",
        "That design is better for you, because private recordings stay private and there is no upload to wait for. It is also why we can keep the tools free with no sign-up, no watermark and no daily limit: your device does the work, so they cost us almost nothing to run.",
      ],
    },
    {
      id: "principles",
      heading: "What we believe",
      blocks: [
        {
          list: [
            "Your videos are yours. You own everything you upload and every clip ClipPro makes, and we never use your videos to train AI models without your explicit opt-in.",
            "Privacy should be the default. If a job can run on your device, it should. Read our [privacy policy](/privacy) for exactly what we collect and why.",
            "AI should save time, not replace judgement. ClipPro suggests and scores clips; you decide what gets posted.",
            "Clear pricing beats surprises. One credit is one minute of uploaded video, and the [pricing](/#pricing) is public.",
          ],
        },
      ],
    },
    {
      id: "contact",
      heading: "Get in touch",
      blocks: [
        `For help with your account or the free tools, email [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}). For team plans, agencies and the API, email [${SALES_EMAIL}](mailto:${SALES_EMAIL}). You can also read our [terms of service](/terms).`,
      ],
    },
  ],
};
