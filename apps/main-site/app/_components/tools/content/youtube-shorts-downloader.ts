import type { ToolContent } from "./types";

export const youtubeShortsDownloader: ToolContent = {
  slug: "youtube-shorts-downloader",
  name: "YouTube Shorts Downloader",
  category: "download",
  status: "live",
  widget: "youtube-downloader",
  cardDescription: "Paste a YouTube Shorts link and save it as an MP4 in up to 4K. Free, no sign-up, no app.",
  seo: {
    title: "YouTube Shorts Downloader: Save Shorts as MP4 Free",
    description:
      "Free YouTube Shorts downloader. Paste a Shorts link and save it as an MP4 with sound, in up to 4K. No sign-up, no app, no watermark. Download a Short now.",
    keywords: [
      "YouTube Shorts downloader",
      "download YouTube Shorts",
      "YouTube Shorts to MP4",
      "save YouTube Shorts",
      "download YouTube Shorts on iPhone",
      "YouTube Shorts downloader without watermark",
      "download my own YouTube Shorts",
    ],
  },
  h1: "YouTube Shorts Downloader",
  subtitle:
    "Paste a link to a YouTube Short and download it as an MP4 file with sound. Free, with no sign-up and nothing to install.",
  steps: [
    {
      title: "Copy the Shorts link",
      body: "In the YouTube app, tap Share on the Short and choose Copy link. On a computer, copy the address from your browser.",
    },
    {
      title: "Paste it and tap Get video",
      body: "Paste the link into the box above and tap Get video. The downloader finds the available qualities in a few seconds.",
    },
    {
      title: "Download the MP4",
      body: "Tap Download MP4 for the best widely compatible version, or pick another quality or audio only.",
    },
  ],
  features: [
    {
      title: "Up to 4K",
      body: "Choose from every quality YouTube offers for the Short, from 360p up to 1080p and, when available, 1440p and 4K.",
    },
    {
      title: "MP4 with sound",
      body: "YouTube stores picture and sound separately. The downloader joins them into one MP4 in your browser, without re-encoding.",
    },
    {
      title: "Audio only",
      body: "Want just the sound? Save the Short's audio as an M4A file, ready for editing apps and music players.",
    },
    {
      title: "No sign-up, no app",
      body: "Nothing to install and no Google account needed. It works in Chrome, Safari, Edge and Firefox on phones and computers.",
    },
    {
      title: "Runs in your browser",
      body: "The video is found and assembled by code running on your device. Our server only passes the data along and never stores it.",
    },
    {
      title: "Ready to repurpose",
      body: "Saved your own Short? Trim it, add captions or cross-post it to Reels and TikTok with ClipPro's other free tools.",
    },
  ],
  sections: [
    {
      heading: "How to download YouTube Shorts",
      paragraphs: [
        "To download a YouTube Short, you only need its link. In the YouTube app, open the Short, tap the Share button and choose Copy link. On a computer, open the Short and copy the address from your browser's address bar. Paste the link into the box at the top of this page and tap Get video. Our YouTube Shorts downloader reads the video, lists every quality YouTube offers and shows the title and channel, so you can check it is the right Short before you save it.",
        "Tap Download MP4 and the file saves to your device. The main button picks the best H.264 version, which plays on every phone, computer and editing app. Higher qualities like 1440p and 4K use the newer AV1 or VP9 codecs, which play in browsers and most modern apps but not in some older players. On an iPhone, Safari saves the video to the Downloads folder in the Files app. Open it, tap Share and choose Save Video to add it to Photos. On Android and computers, it lands in your Downloads folder.",
      ],
    },
    {
      heading: "Download your own Shorts with YouTube Studio",
      paragraphs: [
        "If the Short is yours, YouTube Studio has an official download option. Sign in to YouTube Studio on a computer, open Content from the left menu and switch to the Shorts tab. Hover over the Short, click the three-dot Options menu and choose Download. To back up your whole channel at once, Google Takeout can export every video you have uploaded, including Shorts, in one archive. It takes longer to prepare, but it is the easiest way to save a large library.",
        "For your own content, the best copy is always the original file you exported, because YouTube re-encodes every upload. Use the original for re-editing whenever you still have it. Our downloader is the quick option when the original is gone, when you need a Short on another device, or when a client or collaborator has given you permission to reuse a video and sent you the link.",
      ],
    },
    {
      heading: "Copyright, credit and YouTube's terms",
      paragraphs: [
        "Being able to download a Short does not mean you are allowed to reuse it. YouTube's Terms of Service do not allow downloading videos unless YouTube provides a download option or you have permission from the owner. Every Short belongs to the creator who made it, and reposting someone else's Short as your own can lead to copyright strikes, removed videos and a damaged reputation with your audience. Only download Shorts you made or that the owner has clearly allowed you to use.",
        "When you do have permission, credit the creator in your video and description and link back to their channel. Do not crop out watermarks, usernames or on-screen credits. If you want to react to another creator's Short, YouTube's built-in Remix feature lets you build on eligible Shorts with credit handled automatically. The downloader does not work with private, members-only or age-restricted videos. That content is limited for a reason, and it should stay that way.",
      ],
    },
    {
      heading: "YouTube Shorts formats and quality explained",
      paragraphs: [
        "YouTube Shorts are vertical videos in a 9:16 aspect ratio, typically 1080x1920 pixels. YouTube stores each quality as a separate video stream with its own audio stream, which is why most downloaders either cap quality or need a server to combine them. ClipPro downloads both streams and joins them into one MP4 in your browser without re-encoding, so the picture is exactly what YouTube serves. Very large videos may take a while, since the whole file is assembled in your browser's memory.",
        "Because Shorts, Instagram Reels and TikTok all use the same 1080x1920 vertical format, your own Shorts can usually be cross-posted without reframing. A video trimmer cuts a Short down in seconds, and a video resizer converts horizontal footage to 9:16. And if you are making Shorts from long videos like podcasts or livestreams, ClipPro can find the best moments and turn them into captioned vertical clips automatically.",
      ],
    },
  ],
  useCases: [
    {
      title: "Creators backing up their channel",
      body: "Keep copies of your own Shorts when the original files are gone, or before you edit or archive them.",
    },
    {
      title: "Cross-posting to Reels and TikTok",
      body: "Reuse your own Shorts on other platforms that share the same 1080x1920 vertical format.",
    },
    {
      title: "Social media managers",
      body: "Collect approved client and partner Shorts for reports, campaigns and content libraries.",
    },
    {
      title: "Editors and researchers",
      body: "Save reference Shorts to study hooks, pacing and captions offline, without scrolling the feed.",
    },
  ],
  faqs: [
    {
      q: "Is this YouTube Shorts downloader free?",
      a: "Yes. It is completely free, with no sign-up and no watermark added to your videos. You do not need a Google account or an app, just the link to a public YouTube Short.",
    },
    {
      q: "How do I download YouTube Shorts on iPhone?",
      a: "In the YouTube app, tap Share on the Short and choose Copy link. Open this page in Safari, paste the link and tap Get video, then Download MP4. The video saves to the Downloads folder in the Files app. Open it there, tap Share and choose Save Video to add it to Photos.",
    },
    {
      q: "Can I download YouTube Shorts in 1080p or 4K?",
      a: "Yes. The downloader lists every quality YouTube offers for that Short, up to 4K when the creator uploaded it. The main Download MP4 button gives you the best H.264 version, usually 1080p, which plays everywhere. 1440p and 4K use AV1 or VP9, which play in browsers and most modern apps.",
    },
    {
      q: "Why won't my YouTube Short download?",
      a: "The most common reasons are that the video is private, members-only, age-restricted or has been removed. YouTube also blocks automated requests from time to time. Check that the link opens in a logged-out browser, then try again in a few minutes.",
    },
    {
      q: "Is it legal to download YouTube Shorts?",
      a: "YouTube's terms only allow downloading when YouTube offers a download option or the owner gives permission. Downloading your own Shorts is fine. Downloading and reposting other creators' Shorts without permission can infringe their copyright and lead to strikes on your channel.",
    },
    {
      q: "Can I download just the audio from a Short?",
      a: "Yes. After you tap Get video, choose Audio only to save the Short's sound as an M4A file. If you need an MP3 instead, run the downloaded video through ClipPro's free video to MP3 converter.",
    },
    {
      q: "Can I download regular YouTube videos too?",
      a: "Yes. Paste any YouTube video link into the YouTube video downloader. It works the same way, with the same qualities and audio-only option.",
    },
  ],
  related: ["youtube-video-downloader", "video-trimmer", "subtitle-generator"],
};
