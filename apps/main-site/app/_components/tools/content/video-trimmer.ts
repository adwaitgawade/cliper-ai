import type { ToolContent } from "./types";

export const videoTrimmer: ToolContent = {
  slug: "video-trimmer",
  name: "Video Trimmer",
  category: "edit",
  status: "live",
  widget: "trim",
  cardDescription:
    "Trim video online by picking a start and end point. Runs in your browser, exports MP4, no upload.",
  seo: {
    title: "Trim Video Online Free: Private Video Trimmer, No Upload",
    description:
      "Trim video online for free. Set a start and end point, preview the cut and export MP4 in your browser. No upload, no sign-up and no watermark. Try it.",
    keywords: [
      "trim video online",
      "video trimmer",
      "cut video online free",
      "trim MP4 online",
      "video cutter no watermark",
      "trim video without uploading",
      "shorten video online",
      "trim MOV to MP4",
    ],
  },
  h1: "Trim Video Online with a Free Video Trimmer",
  subtitle:
    "Cut any video down to the part that matters in seconds. Pick a start and end, preview it, and export an MP4 without your file ever leaving your device.",
  steps: [
    {
      title: "Open your video",
      body: "Drop in an MP4, MOV, WebM or MKV file. It loads straight into the preview player in your browser, with nothing uploaded.",
    },
    {
      title: "Set the start and end",
      body: "Drag the sliders or type exact times to mark where your clip begins and ends, then play the selection to check it.",
    },
    {
      title: "Export as MP4",
      body: "Click export and your trimmed clip is processed on your device and saved as an MP4, ready to share or post.",
    },
  ],
  features: [
    {
      title: "100% private",
      body: "Trimming happens in your browser with WebCodecs and WebAssembly. Your video is never uploaded to any server.",
    },
    {
      title: "Free, no watermark",
      body: "No account, no sign-up and no logo stamped on your clip. Trim as many videos as you like.",
    },
    {
      title: "Precise preview",
      body: "Scrub the preview player, fine-tune with time inputs and watch your selection before you export.",
    },
    {
      title: "Common formats in, MP4 out",
      body: "Open MP4, MOV, WebM or MKV files and get a widely compatible MP4 that plays almost everywhere.",
    },
    {
      title: "Works on any modern browser",
      body: "Use current Chrome, Edge, Safari or Firefox on desktop. Mobile browsers work too, just a bit slower.",
    },
  ],
  sections: [
    {
      heading: "How to trim a video online without uploading it",
      paragraphs: [
        "Most online video cutters ask you to upload your file, wait for it to process on someone else's server, and then download it again. That is slow for large files and uncomfortable for anything personal or unreleased. This video trimmer works differently. When you open a file, your browser reads it locally and uses WebCodecs and WebAssembly to cut and export it on your own device. Nothing is sent to ClipPro or anyone else, so you can trim client footage, family videos or drafts with complete privacy.",
        "Because the work happens on your computer, speed depends on your hardware rather than your internet connection. A short clip from a phone recording usually exports quickly, while a long 4K file takes longer. The practical file size limit comes down to your device's memory. We recommend files up to about 2 GB for smooth results. If you are working with something bigger, consider splitting it first or compressing it to a smaller size before trimming.",
      ],
    },
    {
      heading: "Getting a clean cut: tips for trimming MP4, MOV and WebM",
      paragraphs: [
        "Start by playing through your video and noting roughly where the good part begins and ends. Drag the start and end sliders to those spots, then switch to the time inputs to nudge each point by fractions of a second. Play the selection a couple of times. It is easy to clip the first syllable of a sentence or leave in an awkward pause, and a quick preview catches both. Leaving a small breath of space before speech starts usually feels more natural to viewers.",
        "The trimmer accepts MP4, MOV, WebM and MKV files and always exports MP4, which is the safest format for sharing. MP4 plays on iPhone, Android, Windows, Mac and every major social platform, so trimming a MOV from your iPhone or a WebM screen recording also converts it into something you can post anywhere. If your final destination is TikTok, Instagram Reels or YouTube Shorts, you may also want to reframe the clip to a vertical 9:16 layout after trimming.",
      ],
    },
    {
      heading: "From one trimmed clip to a steady stream of short videos",
      paragraphs: [
        "Trimming by hand is perfect when you already know which moment you want: a highlight from a game, a quote from an interview, or the best take from a product demo. It gets harder when you have an hour-long podcast or webinar and need several short clips from it every week. Scrubbing through long recordings to find the moments worth posting is where most of the time goes, and it is the part that is hardest to speed up manually.",
        "That is the problem ClipPro was built to solve. ClipPro watches your long video, finds the strongest moments, and turns them into vertical short clips with captions for TikTok, Reels and Shorts. If you find yourself opening this trimmer over and over for the same long recording, it may be worth letting ClipPro do the searching for you. For quick, one-off cuts, this free video trimmer will always be here.",
      ],
    },
  ],
  useCases: [
    {
      title: "Social media creators",
      body: "Cut a long recording down to the moment you want to post on TikTok, Reels or Shorts.",
    },
    {
      title: "Teachers and trainers",
      body: "Trim lecture or tutorial recordings to the exact section students need to watch.",
    },
    {
      title: "Marketers",
      body: "Pull a tight product demo or testimonial segment out of a longer video for ads and landing pages.",
    },
    {
      title: "Anyone with private footage",
      body: "Shorten family videos or confidential recordings without uploading them anywhere.",
    },
  ],
  faqs: [
    {
      q: "Is this video trimmer really free?",
      a: "Yes. The video trimmer is completely free, with no sign-up, no trial and no watermark added to your exported clip. You can trim as many videos as you want. Because all processing happens in your own browser, there are no server costs that would require us to limit usage.",
    },
    {
      q: "Is my video uploaded when I trim it online?",
      a: "No. Your video never leaves your device. The trimmer runs entirely in your browser using WebCodecs and WebAssembly, so the file is read, cut and exported locally. Nothing is sent to ClipPro's servers or any third party, which makes it safe for private or unreleased footage.",
    },
    {
      q: "What video formats can I trim?",
      a: "You can open MP4, MOV, WebM and MKV files. The trimmed clip is always exported as MP4, which plays on nearly every phone, computer and social platform. That also makes the tool a handy way to turn an iPhone MOV or a WebM screen recording into a shareable MP4.",
    },
    {
      q: "Is there a file size limit?",
      a: "There is no fixed limit, but because the video is processed in your browser, the practical maximum depends on how much memory your device has. We recommend files up to about 2 GB. For larger files, try compressing the video first or closing other heavy tabs and apps.",
    },
    {
      q: "Can I trim a video on my phone?",
      a: "Yes. The trimmer works in mobile browsers, though processing is slower than on a desktop or laptop because phones have less memory and processing power. For long or high-resolution videos, a computer running current Chrome, Edge, Safari or Firefox will give you the fastest results.",
    },
    {
      q: "How do I trim a video for TikTok, Reels or Shorts?",
      a: "Trim the clip to the moment you want, then export it as MP4. Most short-form platforms favor vertical 9:16 video, so if your source is horizontal, run the trimmed clip through a video resizer to reframe it. If you want clips found and captioned automatically, ClipPro can do that for you.",
    },
  ],
  related: ["video-resizer", "video-compressor", "subtitle-generator"],
};
