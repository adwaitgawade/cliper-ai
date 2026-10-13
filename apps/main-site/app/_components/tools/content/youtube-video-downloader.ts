import type { ToolContent } from "./types";

export const youtubeVideoDownloader: ToolContent = {
  slug: "youtube-video-downloader",
  name: "YouTube Video Downloader",
  category: "download",
  status: "live",
  widget: "youtube-downloader",
  cardDescription: "Paste a YouTube link and save the video as an MP4 in up to 4K, or just the audio. Free, no sign-up.",
  seo: {
    title: "YouTube Video Downloader: Save Videos as MP4 Free",
    description:
      "Free YouTube video downloader. Paste a link and save the video as an MP4 in 1080p or up to 4K, or just the audio. No sign-up, no app. Download a video now.",
    keywords: [
      "YouTube video downloader",
      "download YouTube videos",
      "YouTube to MP4",
      "YouTube downloader 1080p",
      "YouTube 4K downloader",
      "download YouTube audio",
      "save YouTube video to computer",
      "download my own YouTube videos",
    ],
  },
  h1: "YouTube Video Downloader",
  subtitle:
    "Paste a link to a YouTube video and download it as an MP4 file with sound, in up to 4K. Free, with no sign-up and nothing to install.",
  steps: [
    {
      title: "Copy the video link",
      body: "Copy the address from your browser, or tap Share under the video in the YouTube app and choose Copy link.",
    },
    {
      title: "Paste it and tap Get video",
      body: "Paste the link into the box above and tap Get video. The downloader lists the available qualities in a few seconds.",
    },
    {
      title: "Download the MP4",
      body: "Tap Download MP4 for the best widely compatible version, or pick another quality or audio only.",
    },
  ],
  features: [
    {
      title: "1080p and up to 4K",
      body: "Choose from every quality YouTube offers for the video, from 360p and 720p to 1080p and, when available, 1440p and 4K.",
    },
    {
      title: "One MP4 with sound",
      body: "YouTube stores picture and sound separately. The downloader joins them into one MP4 in your browser, without re-encoding.",
    },
    {
      title: "Audio only",
      body: "Save just the soundtrack as an M4A file for podcasts, lectures and interviews, or convert it to MP3 afterwards.",
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
      body: "Turn your own long videos into Shorts and Reels with ClipPro's free trimmer, resizer and subtitle generator.",
    },
  ],
  sections: [
    {
      heading: "How to download YouTube videos",
      paragraphs: [
        "To download a YouTube video, you only need its link. On a computer, open the video and copy the address from your browser's address bar. In the YouTube app, tap Share under the video and choose Copy link. Paste the link into the box at the top of this page and tap Get video. Our YouTube video downloader reads the video, lists every quality YouTube offers and shows the title, channel and thumbnail, so you can check it is the right video before you download it.",
        "Tap Download MP4 to save the best H.264 version, usually 1080p, which plays on every phone, computer, TV and editing app. If you need a smaller file, pick 720p or 480p. Higher qualities like 1440p and 4K use the newer AV1 or VP9 codecs, which play in browsers and most modern apps but not in some older players. To keep only the sound, choose Audio only. Links with a playlist or a timestamp work too: only the video itself is downloaded.",
      ],
    },
    {
      heading: "How the downloader works",
      paragraphs: [
        "For anything above 360p, YouTube does not keep a single video file. It stores the picture and the sound as separate streams so its player can switch quality on the fly. That is why many downloaders either stop at low quality or send your video through a server to combine the streams. ClipPro downloads both streams and joins them into one MP4 right in your browser, copying the original data without re-encoding. You get exactly the quality YouTube serves, and nothing is converted or stored on our side.",
        "The download speed depends on your connection and on YouTube, and longer videos take longer to assemble. Because the MP4 is built in your browser's memory, very long videos in high quality are best downloaded on a computer, and the largest options are hidden for files over about one gigabyte. If a download fails partway, tap Get video again: YouTube's download links expire after a few hours.",
      ],
    },
    {
      heading: "Download your own videos with YouTube Studio",
      paragraphs: [
        "If the video is yours, YouTube Studio has an official download option. Sign in to YouTube Studio on a computer, open Content from the left menu, hover over the video, click the three-dot Options menu and choose Download. For a full backup of your channel, Google Takeout exports every video you have uploaded in one archive. YouTube Premium also lets you save videos for offline viewing inside the YouTube app, though those copies are not files you can edit or share.",
        "For your own content, the best copy is always the original file you exported, because YouTube re-encodes every upload. Use the original for re-editing whenever you still have it. Our downloader is the quick option when the original is gone, when you need a video on another device, or when a client or collaborator has given you permission to reuse a video and sent you the link.",
      ],
    },
    {
      heading: "Copyright and YouTube's terms",
      paragraphs: [
        "Being able to download a video does not mean you are allowed to reuse it. YouTube's Terms of Service do not allow downloading videos unless YouTube provides a download option or you have permission from the owner. Every video belongs to the person who made it, and reuploading someone else's video can lead to copyright strikes and removed content. Only download videos you made, videos the owner has clearly allowed you to use, or content that is licensed for reuse, such as Creative Commons videos.",
        "When you do have permission, credit the creator in your video and description and link back to their channel. Do not remove watermarks or on-screen credits. Brands and agencies should get permission in writing, especially for ads. The downloader does not work with private, members-only or age-restricted videos, or with live streams that are still in progress. That content is limited for a reason, and it should stay that way.",
      ],
    },
  ],
  useCases: [
    {
      title: "Creators backing up their channel",
      body: "Keep copies of your own uploads when the original files are gone, or before you edit or archive them.",
    },
    {
      title: "Repurposing long videos",
      body: "Download your own podcasts, streams and webinars, then cut them into Shorts, Reels and TikToks.",
    },
    {
      title: "Teachers and presenters",
      body: "Save licensed or your own videos to play offline in classrooms and meetings without buffering.",
    },
    {
      title: "Editors and agencies",
      body: "Collect approved client videos for edits, recaps and reports, in the quality the project needs.",
    },
  ],
  faqs: [
    {
      q: "Is this YouTube video downloader free?",
      a: "Yes. It is completely free, with no sign-up and no watermark added to your videos. You do not need a Google account or an app, just the link to a public YouTube video.",
    },
    {
      q: "Can I download YouTube videos in 1080p or 4K?",
      a: "Yes. The downloader lists every quality YouTube offers for the video, up to 4K when the creator uploaded it. The main Download MP4 button gives you the best H.264 version, usually 1080p, which plays everywhere. 1440p and 4K use AV1 or VP9, which play in browsers and most modern apps.",
    },
    {
      q: "How do I download only the audio from a YouTube video?",
      a: "Paste the link, tap Get video and choose Audio only. The sound saves as an M4A file, which plays in most music players and editing apps. If you need an MP3, run the downloaded video or audio through ClipPro's free video to MP3 converter.",
    },
    {
      q: "Why won't my YouTube video download?",
      a: "The most common reasons are that the video is private, members-only, age-restricted, a live stream in progress or has been removed. YouTube also blocks automated requests from time to time. Check that the link opens in a logged-out browser, then try again in a few minutes.",
    },
    {
      q: "Is it legal to download YouTube videos?",
      a: "YouTube's terms only allow downloading when YouTube offers a download option or the owner gives permission. Downloading your own videos or Creative Commons content is fine. Downloading and reuploading other people's videos without permission can infringe their copyright.",
    },
    {
      q: "Is there a length limit?",
      a: "There is no fixed limit, but the MP4 is assembled in your browser's memory, so options larger than about one gigabyte are hidden. A typical 30-minute video fits in 1080p, and an hour-long one usually fits in 720p. For longer or 4K videos, pick a lower quality or use audio only.",
    },
    {
      q: "Can I download YouTube Shorts too?",
      a: "Yes. Shorts links work here, and there is also a dedicated YouTube Shorts downloader with tips for saving and reposting vertical videos.",
    },
  ],
  related: ["youtube-shorts-downloader", "video-to-mp3", "audio-video-to-text"],
};
