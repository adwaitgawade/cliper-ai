import type { ToolContent } from "./types";

export const subtitleGenerator: ToolContent = {
  slug: "subtitle-generator",
  name: "Subtitle Generator (SRT & VTT)",
  category: "transcribe",
  status: "live",
  widget: "transcribe-subtitles",
  cardDescription:
    "Auto-generate SRT and VTT subtitle files from any video or audio, privately in your browser.",
  seo: {
    title: "Subtitle Generator - Free SRT & VTT Captions From Video",
    description:
      "Free AI subtitle generator and SRT generator. Create SRT and VTT files from any video right in your browser. No upload, no sign-up. Get subtitles now.",
    keywords: [
      "subtitle generator",
      "srt generator",
      "auto subtitle generator",
      "vtt subtitle generator",
      "generate subtitles from video",
      "free caption generator",
      "ai subtitles for youtube",
      "srt file maker",
    ],
  },
  h1: "Free AI Subtitle Generator for SRT and VTT Files",
  subtitle:
    "Generate timed subtitles from any video or audio file in a few clicks. Everything runs in your browser, so your footage stays on your device.",
  steps: [
    {
      title: "Choose your video",
      body: "Add an MP4, MOV, WebM or MKV video, or an MP3, WAV, M4A or OGG audio file. It is never uploaded.",
    },
    {
      title: "Generate subtitles",
      body: "Leave the language on auto-detect or pick one. The AI model downloads once on first use and is cached.",
    },
    {
      title: "Download SRT or VTT",
      body: "Save the subtitle file in the format your editor or platform needs and add it to your video.",
    },
  ],
  features: [
    {
      title: "SRT and VTT export",
      body: "Download the two most widely supported subtitle formats, ready for editors, players and platforms.",
    },
    {
      title: "Automatic timing",
      body: "Each caption is time-coded to the speech, so you skip the tedious work of syncing lines by hand.",
    },
    {
      title: "About 99 languages",
      body: "Built on OpenAI's open-source Whisper model with automatic language detection.",
    },
    {
      title: "No upload, full privacy",
      body: "Your video is processed on your device and never sent to a server.",
    },
    {
      title: "Free, no watermark",
      body: "No account, no daily limits and nothing stamped on your files.",
    },
  ],
  sections: [
    {
      heading: "Why add subtitles to your videos",
      paragraphs: [
        "A large share of social video is watched with the sound off, especially on phones in public places. Subtitles keep those viewers following along instead of scrolling past. They also make your content accessible to people who are deaf or hard of hearing, help non-native speakers understand you, and give platforms like YouTube extra text to understand what your video is about. For short-form creators, readable captions are often the difference between a viewer who stays for the hook and one who swipes away in the first second.",
        "Writing and timing captions by hand is slow. This subtitle generator listens to your video, writes out what is said, and splits it into short, time-coded lines automatically. You get a ready-made subtitle file in a few minutes that you can drop into your editor, upload to YouTube alongside your video, or tweak in any text editor before publishing. It is free, needs no account, and works with MP4, MOV, WebM and MKV video as well as common audio files.",
      ],
    },
    {
      heading: "SRT vs VTT: which subtitle format should you use?",
      paragraphs: [
        "SRT (SubRip) is the most widely supported subtitle format. It is a simple text file with a number, a start and end time, and the caption text for each line. Almost every video editor, including Premiere Pro, DaVinci Resolve, Final Cut Pro and CapCut, can import SRT, and YouTube and Facebook accept it for uploaded captions. If you are unsure which format to pick, SRT is the safe default and the one this SRT generator is named for.",
        "VTT (WebVTT) is the standard for subtitles on the web. It looks very similar to SRT but uses a slightly different timestamp format and supports extra features such as positioning and basic styling. HTML5 video players, many course platforms and web-based players expect VTT. Because both formats carry the same timing and text, this tool lets you download either one, so you can use SRT in your editing software and VTT on your website without converting anything yourself.",
      ],
    },
    {
      heading: "How it works and tips for better captions",
      paragraphs: [
        "The generator runs OpenAI's open-source Whisper speech recognition model directly in your browser. On first use it downloads the model once, about 80 MB, and caches it so later runs start immediately. It extracts the audio from your video, transcribes it in chunks, and keeps the timing of each segment so captions line up with the speech. Processing speed depends on your device and is much faster in recent Chrome or Edge on computers that support WebGPU. Your file never leaves your machine at any point.",
        "For the best results, start with clean audio: clear speech, minimal background music and one speaker at a time. Always review names, product terms and numbers before publishing. For vertical videos on TikTok, Reels and Shorts, keep captions short and position them away from the bottom of the frame, where the platform's own buttons and descriptions appear. If you want ClipPro to find your best moments and add animated captions for you, it can turn a long video into ready-to-post clips automatically.",
      ],
    },
  ],
  useCases: [
    {
      title: "YouTubers",
      body: "Upload timed caption files to reach viewers who watch muted or speak other languages.",
    },
    {
      title: "Short-form creators",
      body: "Get timed captions to style in your editor for TikTok, Reels and Shorts.",
    },
    {
      title: "Educators and course creators",
      body: "Add VTT subtitles to lessons for accessibility and easier review.",
    },
    {
      title: "Marketing teams",
      body: "Caption product demos and webinars without sending unreleased footage to a third party.",
    },
  ],
  faqs: [
    {
      q: "Is this subtitle generator free?",
      a: "Yes. You can generate as many SRT and VTT files as you like for free. There is no sign-up, no watermark and no daily limit, because all the processing happens on your own device instead of on paid servers.",
    },
    {
      q: "Is my video uploaded to a server?",
      a: "No. The subtitle generator runs completely in your browser using WebAssembly and WebGPU. Your video never leaves your device, which keeps private or unreleased footage safe. Once the page and AI model have loaded, it can even work offline.",
    },
    {
      q: "What is the difference between SRT and VTT?",
      a: "Both store caption text with start and end times. SRT is the most widely supported format for video editors and platforms like YouTube. VTT is the web standard used by HTML5 video players and supports extra styling. You can download either one here.",
    },
    {
      q: "What languages can it generate subtitles in?",
      a: "It uses OpenAI's Whisper model, which supports around 99 languages and detects the spoken language automatically. You can also choose the language manually, which can help with short clips or videos where speakers switch between languages.",
    },
    {
      q: "What is the maximum file size?",
      a: "The limit depends on your device's memory rather than a fixed cap. Files up to roughly 2 GB work well on most modern computers. Phones are supported too, but processing large files on mobile is noticeably slower.",
    },
    {
      q: "How do I add the subtitles to my video?",
      a: "Import the SRT file into your editor, such as Premiere Pro, DaVinci Resolve or CapCut, to style or burn in captions. On YouTube, upload the SRT or VTT file under Subtitles in YouTube Studio. Web players usually take the VTT file directly.",
    },
  ],
  related: ["audio-video-to-text", "video-resizer", "video-trimmer"],
};
