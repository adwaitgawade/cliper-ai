import type { ToolContent } from "./types";

export const youtubeShortsDownloader: ToolContent = {
  slug: "youtube-shorts-downloader",
  name: "YouTube Shorts Downloader",
  category: "download",
  status: "soon",
  widget: "downloader",
  cardDescription:
    "Coming soon: save YouTube Shorts as MP4. Meanwhile, learn how to download your own Shorts from YouTube Studio.",
  seo: {
    title: "YouTube Shorts Downloader (Coming Soon): Shorts to MP4",
    description:
      "Our YouTube Shorts downloader is coming soon. For now, learn how to download your own Shorts as MP4 from YouTube Studio and what you can legally reuse.",
    keywords: [
      "YouTube Shorts downloader",
      "download YouTube Shorts",
      "YouTube Shorts to MP4",
      "download my own YouTube Shorts",
      "YouTube Studio download video",
      "save YouTube Shorts offline",
      "YouTube Shorts resolution",
    ],
  },
  h1: "YouTube Shorts Downloader",
  subtitle:
    "Our YouTube Shorts downloader is coming soon and will save Shorts as MP4 files. Until it launches, here is how to download your own Shorts with YouTube's official tools.",
  steps: [
    {
      title: "Paste the Shorts link",
      body: "Copy the link to a YouTube Short and paste it into the box.",
    },
    {
      title: "Pick a quality",
      body: "Choose the resolution you want from the options available for that Short.",
    },
    {
      title: "Download the MP4",
      body: "Save the Short to your device as an MP4 file, ready to edit or archive.",
    },
  ],
  features: [
    {
      title: "Launching soon",
      body: "The Shorts downloader is in development. This page covers how it will work and what you can do right now.",
    },
    {
      title: "MP4 output",
      body: "Shorts will be saved as MP4, which plays on every device and opens in any video editor.",
    },
    {
      title: "Made for your own content",
      body: "Designed for saving Shorts you made or have permission to reuse, with respect for creators' rights.",
    },
    {
      title: "Free tools available now",
      body: "While you wait, trim, resize and convert videos privately in your browser with ClipPro's live tools.",
    },
  ],
  sections: [
    {
      heading: "How to download your own YouTube Shorts today",
      paragraphs: [
        "Our YouTube Shorts downloader is not available yet, but if the Shorts you want are yours, YouTube already lets you download them. Sign in to YouTube Studio on a computer, open Content from the left menu and switch to the Shorts tab. Hover over the Short you want, click the three-dot Options menu and choose Download. YouTube saves the video as an MP4 file. The download may be a lower resolution than the file you originally uploaded, so keep your originals whenever you can.",
        "If you want a copy of your whole channel, Google Takeout can export all of your uploaded videos, including Shorts, in one archive. It takes longer to prepare, but it is the easiest way to back up a large library. For watching rather than keeping files, YouTube Premium lets you download videos and Shorts for offline viewing inside the YouTube app. Those offline copies stay in the app and are not MP4 files you can edit or repost, but they are handy for flights and commutes.",
      ],
    },
    {
      heading: "Copyright, credit and YouTube's terms",
      paragraphs: [
        "YouTube's Terms of Service do not allow downloading videos unless YouTube provides a download option or you have permission from the owner. That is why the official routes above are limited to your own content or to offline viewing inside the app. Every Short is owned by its creator, and reposting someone else's Short as your own can lead to copyright strikes, removed videos and a damaged reputation with your audience. Only download Shorts you made or have explicit permission to reuse.",
        "When you do have permission, credit the creator clearly in your video and description, and link back to their channel. Do not crop out watermarks, usernames or on-screen credits. If you want to react to or comment on another creator's Short, YouTube's built-in Remix feature lets you build on eligible Shorts with credit handled automatically. It is the platform-approved way to respond to other creators without downloading anything. And never try to save Shorts from private or unlisted videos you were not meant to share.",
      ],
    },
    {
      heading: "YouTube Shorts formats and quality",
      paragraphs: [
        "YouTube Shorts are vertical videos with a 9:16 aspect ratio, typically 1080x1920 pixels, and they download as MP4 files. YouTube re-encodes everything after upload to keep playback smooth on every connection, so any downloaded copy will be slightly softer than your original export. If you plan to re-edit or repost a Short, starting from the original project or camera file always gives the best result, especially if you plan to add captions or graphics.",
        "The same 1080x1920 vertical format is used by TikTok and Instagram Reels, so your own Shorts can usually be cross-posted without reframing. If you have horizontal footage, a video resizer can convert it to 9:16, and a video trimmer helps you stay within the length limit for Shorts. If you are making Shorts from long videos like podcasts or livestreams, ClipPro can find the best moments and turn them into captioned vertical clips for you.",
      ],
    },
  ],
  useCases: [
    {
      title: "Creators backing up their channel",
      body: "Save copies of your own Shorts before editing, re-uploading or archiving them.",
    },
    {
      title: "Cross-posting to Reels and TikTok",
      body: "Reuse your own Shorts on other platforms that share the same 1080x1920 vertical format.",
    },
    {
      title: "Editors and agencies",
      body: "Collect approved client Shorts for recaps, reports and compilations, with permission.",
    },
  ],
  faqs: [
    {
      q: "When will the YouTube Shorts downloader be available?",
      a: "Soon. We are still building it and do not have a launch date to share yet. Meanwhile, you can use ClipPro's free tools that already work, such as the video trimmer, video resizer and video to MP3 converter, all running privately in your browser.",
    },
    {
      q: "How do I download my own YouTube Shorts?",
      a: "Open YouTube Studio on a computer, go to Content, select the Shorts tab, then hover over a Short, click the three-dot Options menu and choose Download. The Short saves as an MP4. To back up your entire channel at once, use Google Takeout instead.",
    },
    {
      q: "Is it legal to download YouTube Shorts?",
      a: "YouTube's terms only allow downloading when YouTube offers a download option or the owner gives permission. Downloading your own Shorts through YouTube Studio is fine. Downloading and reposting other creators' Shorts without permission can infringe their copyright and lead to strikes on your channel.",
    },
    {
      q: "Can I download YouTube Shorts with YouTube Premium?",
      a: "YouTube Premium lets you download videos and Shorts for offline viewing inside the YouTube app. Those downloads are not saved as MP4 files and cannot be edited or shared outside the app. They are meant for watching without a connection, not for reusing the content.",
    },
    {
      q: "What resolution are YouTube Shorts?",
      a: "Most YouTube Shorts are vertical 9:16 videos at 1080x1920 pixels, saved as MP4. YouTube re-encodes uploads, so a downloaded copy is usually a little lower in quality than the original file. For the best result when re-editing, keep and work from your original export.",
    },
    {
      q: "How can I turn a long YouTube video into Shorts?",
      a: "You can cut clips manually with a video trimmer and reframe them to 9:16 with a video resizer. If you want it done for you, ClipPro analyzes your long video, picks the strongest moments and turns them into captioned vertical Shorts ready to post.",
    },
  ],
  related: ["video-trimmer", "video-resizer", "youtube-thumbnail-downloader"],
};
