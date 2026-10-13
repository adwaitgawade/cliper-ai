import type { ToolContent } from "./types";

export const youtubeThumbnailDownloader: ToolContent = {
  slug: "youtube-thumbnail-downloader",
  name: "YouTube Thumbnail Downloader",
  category: "download",
  status: "live",
  widget: "yt-thumbnail",
  cardDescription:
    "Paste a YouTube or Shorts link to view and save its thumbnail in every available size, up to 1280x720.",
  seo: {
    title: "YouTube Thumbnail Downloader: Save HD Thumbnails Free",
    description:
      "Free YouTube thumbnail downloader. Paste any video or Shorts link to view and save the thumbnail in HD 1280x720, SD, HQ and MQ sizes. No sign-up. Try it.",
    keywords: [
      "YouTube thumbnail downloader",
      "download YouTube thumbnail",
      "YouTube thumbnail grabber",
      "YouTube thumbnail HD 1280x720",
      "YouTube Shorts thumbnail download",
      "get thumbnail from YouTube video",
      "save YouTube thumbnail",
      "maxresdefault thumbnail",
    ],
  },
  h1: "YouTube Thumbnail Downloader",
  subtitle:
    "Grab the thumbnail from any YouTube video or Short in seconds. See every available size, from full HD 1280x720 down to 320x180, and save the one you need.",
  steps: [
    {
      title: "Paste the YouTube link",
      body: "Copy the URL of any YouTube video or Short and paste it into the box above.",
    },
    {
      title: "Compare the sizes",
      body: "See the thumbnail in every available resolution: maxres 1280x720, SD 640x480, HQ 480x360 and MQ 320x180.",
    },
    {
      title: "Download the image",
      body: "Click download on the size you want to save it to your device, or open it in a new tab to view it full size.",
    },
  ],
  features: [
    {
      title: "Every available size",
      body: "View maxres (1280x720), SD (640x480), HQ (480x360) and MQ (320x180) side by side.",
    },
    {
      title: "Videos and Shorts",
      body: "Works with regular YouTube video links and YouTube Shorts links alike.",
    },
    {
      title: "Straight from YouTube",
      body: "Images load directly from YouTube's public image servers. Nothing passes through ClipPro's servers.",
    },
    {
      title: "Free and instant",
      body: "No account, no sign-up and no waiting. Paste a link and the thumbnails appear right away.",
    },
  ],
  sections: [
    {
      heading: "How to download a YouTube thumbnail in HD",
      paragraphs: [
        "Every public YouTube video has a set of thumbnail images stored on YouTube's image servers, each at a different resolution. This YouTube thumbnail downloader reads the video ID from the link you paste and loads those images directly from YouTube, so you can compare them and save the one you want. Your browser fetches the images straight from YouTube. Nothing is routed through ClipPro's servers, and there is nothing to install or sign up for.",
        "For the sharpest result, choose the maxres version at 1280x720, which matches the full-HD thumbnail most creators upload. Some videos, especially older ones or uploads without a custom thumbnail, do not have a maxres image. In that case, SD at 640x480 or HQ at 480x360 is the best available option. Note that the smaller sizes use a 4:3 frame, so you may see black bars above and below a widescreen image. MQ at 320x180 is handy for small previews and mockups.",
      ],
    },
    {
      heading: "Downloading YouTube Shorts thumbnails",
      paragraphs: [
        "YouTube Shorts links work the same way as regular video links. Paste a URL that contains /shorts/ and the tool pulls the thumbnails for that Short. Keep in mind that YouTube generates Shorts thumbnails in the same landscape sizes as regular videos, so a vertical Short may appear centered in a horizontal frame. That is normal and reflects what YouTube stores, not a problem with the download.",
        "Shorts thumbnails are useful for building a swipe file of ideas, checking how your own Shorts appear in search and suggested feeds, or planning a cover frame for your next upload. If you are producing Shorts regularly from longer videos like podcasts, streams or webinars, ClipPro can find the strongest moments in your long video and turn them into captioned vertical clips, so you can spend more time on titles and thumbnails and less time scrubbing footage.",
      ],
    },
    {
      heading: "Using YouTube thumbnails responsibly",
      paragraphs: [
        "A thumbnail being publicly visible does not mean it is free to reuse. Thumbnails are creative work, and their copyright belongs to the creators who made them. Good reasons to download one include studying what makes a thumbnail click-worthy, saving a backup of your own thumbnails, referencing a video in a review or presentation, or using an image with the creator's permission. Reposting someone else's thumbnail as your own, or using it in ads, is a different story.",
        "If you do feature another creator's thumbnail, for example in a reaction video, newsletter or blog post, credit the creator and link to the original video. When in doubt, ask. Most creators are happy to say yes when you explain how you plan to use it. And for your own channel, use downloaded thumbnails as inspiration for composition, color and text rather than copying them, since original thumbnails also help your videos stand out. For your own videos, our extract frame tool grabs a sharp still from your footage to design a thumbnail from.",
      ],
    },
  ],
  useCases: [
    {
      title: "YouTube creators",
      body: "Back up your own thumbnails or study top performers in your niche for design ideas.",
    },
    {
      title: "Designers",
      body: "Collect references for layout, typography and color when designing thumbnails for clients.",
    },
    {
      title: "Writers and educators",
      body: "Reference a video in an article, slide deck or lesson, with credit to the creator.",
    },
    {
      title: "Marketers",
      body: "Review how competitors package their videos and plan thumbnails for upcoming campaigns.",
    },
  ],
  faqs: [
    {
      q: "How do I download a YouTube thumbnail?",
      a: "Copy the link of the YouTube video or Short, paste it into the box on this page, and the thumbnail appears in every available size. Click download on the resolution you want and it saves to your device. It is free and you do not need an account.",
    },
    {
      q: "What is the highest quality YouTube thumbnail I can get?",
      a: "The highest quality is maxres at 1280x720, which is the full-HD version. Not every video has one, especially older uploads or videos without a custom thumbnail. When maxres is missing, the next best options are SD at 640x480 and HQ at 480x360.",
    },
    {
      q: "Can I download thumbnails from YouTube Shorts?",
      a: "Yes. Paste a YouTube Shorts link just like a regular video link and the tool shows the available thumbnails. YouTube stores Shorts thumbnails in the same landscape sizes as regular videos, so a vertical image may appear centered with bars on the sides.",
    },
    {
      q: "Is it legal to download YouTube thumbnails?",
      a: "Viewing and saving a public thumbnail for personal reference is generally fine, but thumbnails are copyrighted by their creators. Use them for reference, for your own videos, or with the creator's permission, and give credit when you feature one. Do not repost them as your own work.",
    },
    {
      q: "Do the thumbnails go through ClipPro's servers?",
      a: "No. The thumbnail images load directly from YouTube's public image servers into your browser. Nothing goes through ClipPro's servers, so ClipPro never receives, stores or keeps a copy of the images you view or download.",
    },
    {
      q: "Why does the thumbnail have black bars?",
      a: "The SD, HQ and MQ sizes use a 4:3 frame, while most videos are 16:9 widescreen, so YouTube adds black bars to fill the space. The maxres 1280x720 version is 16:9 and usually has no bars, so pick that one when it is available.",
    },
  ],
  related: ["video-trimmer", "video-resizer", "youtube-shorts-downloader"],
};
