import type { ToolContent } from "./types";

export const videoCompressor: ToolContent = {
  slug: "video-compressor",
  name: "Video Compressor",
  category: "edit",
  status: "live",
  widget: "compress",
  cardDescription:
    "Shrink large video files to MP4 with simple quality presets, without uploading them anywhere.",
  seo: {
    title: "Compress Video - Free Video Compressor, No Upload",
    description:
      "Compress video files for free in your browser. Shrink MP4, MOV, WebM or MKV with simple presets and optional 720p. No upload, no watermark. Try it.",
    keywords: [
      "compress video",
      "video compressor",
      "reduce video file size",
      "compress mp4",
      "compress video for email",
      "compress video for discord",
      "make video smaller",
      "video compressor no watermark",
    ],
  },
  h1: "Compress Video Files for Free",
  subtitle:
    "Make big videos small enough to send, share and upload, while keeping them looking good. Your file is compressed on your device and never uploaded.",
  steps: [
    {
      title: "Add your video",
      body: "Choose an MP4, MOV, WebM or MKV file. It stays on your device the whole time.",
    },
    {
      title: "Choose a preset",
      body: "Pick Smaller file, Balanced or Best quality, and turn on 720p downscaling for extra savings.",
    },
    {
      title: "Download the MP4",
      body: "Compress and save the smaller MP4, ready to email, message or upload anywhere.",
    },
  ],
  features: [
    {
      title: "Three simple presets",
      body: "Smaller file, Balanced or Best quality. No need to understand codecs or bitrates.",
    },
    {
      title: "Optional 720p downscale",
      body: "Reduce resolution to 720p for a big drop in size with little visible difference on phones.",
    },
    {
      title: "Universal MP4 output",
      body: "Exports MP4 using H.264 and AAC where supported, which plays almost everywhere.",
    },
    {
      title: "No upload needed",
      body: "Compression runs locally in your browser, so even huge files skip the upload wait.",
    },
    {
      title: "Free and watermark-free",
      body: "No sign-up, no daily limits and nothing added to your video.",
    },
  ],
  sections: [
    {
      heading: "A video compressor that never uploads your file",
      paragraphs: [
        "Modern phones record in high resolution with high bitrates, so even a few minutes of footage can run to hundreds of megabytes. That is too big for email attachments, many chat apps and quick sharing over a slow connection. This video compressor reduces the file size of MP4, MOV, WebM and MKV videos and exports a compact MP4 that plays on almost any device, without you having to learn anything about codecs or encoder settings.",
        "Most online compressors make you upload the large file first, which is exactly the slow part you were trying to avoid. Here, compression runs inside your browser using WebCodecs and WebAssembly. Your video never leaves your device, so private footage stays private and there is no upload or download queue. It is free, has no sign-up or watermark, and the practical size limit depends on your device's memory, with files up to about 2 GB working well on most computers.",
      ],
    },
    {
      heading: "How video compression works",
      paragraphs: [
        "Video file size comes down mainly to bitrate, which is how much data is used for each second of video, and resolution, which is how many pixels are in each frame. Compression re-encodes your video at a lower bitrate, using the efficient H.264 codec where supported, so that details your eye barely notices are stored more economically. Lowering the resolution, for example from 1080p or 4K down to 720p, cuts the amount of data even further.",
        "Every compression involves a trade-off between file size and quality. Push the bitrate too low and you will start to see blocky areas, smeared detail in fast motion and banding in smooth gradients like skies. The presets in this tool are tuned to avoid the worst of that. Since compression re-encodes the video, it is best to work from your original file rather than a copy that has already been compressed several times.",
      ],
    },
    {
      heading: "Which preset should you choose?",
      paragraphs: [
        "Pick Smaller file when size matters most, such as sending a clip by email, posting to a chat app with an upload cap, or sharing over a weak connection. Combined with the 720p option, it produces the smallest files, and on a phone screen the drop in quality is often hard to spot. It is a good fit for screen recordings, talking-head clips and quick previews.",
        "Balanced is the right default for most videos, giving a meaningful size reduction while keeping footage sharp. Choose Best quality when the video will be watched on large screens or uploaded to a platform that will compress it again, like YouTube, TikTok or Instagram, since starting from a cleaner file gives better results after their processing. If you are compressing long recordings just to cut them into shorter social clips later, ClipPro can find the highlights and create those clips for you automatically.",
      ],
    },
  ],
  useCases: [
    {
      title: "Sharing by email or chat",
      body: "Shrink videos to fit attachment and upload limits in email, Discord, Slack and WhatsApp.",
    },
    {
      title: "Freeing up storage",
      body: "Reduce the size of phone and camera footage you want to keep without deleting it.",
    },
    {
      title: "Creators and editors",
      body: "Send lightweight review copies to clients and collaborators in minutes.",
    },
    {
      title: "Websites and courses",
      body: "Compress lesson and product videos so pages load faster for viewers.",
    },
  ],
  faqs: [
    {
      q: "Is this video compressor free?",
      a: "Yes. It is completely free, with no sign-up, no watermark and no daily limit on how many videos you compress. The work happens on your own device, so there are no server costs that would require a subscription.",
    },
    {
      q: "Is it safe to compress private videos here?",
      a: "Yes. Your video is never uploaded. Compression runs entirely in your browser using WebCodecs and WebAssembly, so the file stays on your device from start to finish. Once the page has loaded, the tool can even work offline.",
    },
    {
      q: "How much smaller will my video get?",
      a: "It depends on the original file. High-bitrate phone footage and 4K recordings usually shrink the most, while videos that are already compressed shrink less. Choosing Smaller file and enabling the 720p downscale gives the biggest reduction.",
    },
    {
      q: "Will compressing reduce video quality?",
      a: "Some quality is always traded for a smaller size, but the presets are designed to keep that trade-off sensible. Best quality keeps footage close to the original, Balanced suits most uses, and Smaller file prioritizes size over fine detail.",
    },
    {
      q: "What formats can I compress, and what do I get back?",
      a: "You can compress MP4, MOV, WebM and MKV files. The output is always an MP4, encoded with H.264 video and AAC audio where your browser supports them, so it plays on nearly any phone, computer or platform.",
    },
    {
      q: "What is the largest file I can compress?",
      a: "There is no fixed limit. The practical maximum depends on your device's memory, and files up to about 2 GB work well on most computers. Mobile browsers are supported but compress large files more slowly.",
    },
  ],
  related: ["video-resizer", "video-trimmer", "video-to-mp3"],
};
