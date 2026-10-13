import type { ToolContent } from "./types";

export const videoResizer: ToolContent = {
  slug: "video-resizer",
  name: "Video Resizer for TikTok, Reels & Shorts",
  category: "edit",
  status: "live",
  widget: "resize-vertical",
  cardDescription:
    "Convert horizontal 16:9 video to vertical 9:16 for TikTok, Reels and Shorts, privately in your browser.",
  seo: {
    title: "Resize Video for TikTok - Free 16:9 to 9:16 Converter",
    description:
      "Resize video for TikTok, Reels and Shorts for free. Convert 16:9 to 9:16 vertical 1080x1920 MP4 in your browser, with no upload or watermark. Try it.",
    keywords: [
      "resize video for tiktok",
      "convert 16:9 to 9:16",
      "horizontal to vertical video",
      "resize video for instagram reels",
      "youtube shorts aspect ratio",
      "1080x1920 video converter",
      "make video vertical",
      "9:16 video resizer",
    ],
  },
  h1: "Resize Video for TikTok, Reels and Shorts",
  subtitle:
    "Turn any horizontal video into a vertical 1080x1920 MP4 that fills the phone screen. Free, watermark-free, and processed entirely on your device.",
  steps: [
    {
      title: "Add a horizontal video",
      body: "Choose an MP4, MOV, WebM or MKV file. It opens in your browser and is never sent to a server.",
    },
    {
      title: "Pick crop or fit",
      body: "Use Crop to fill for a full-screen center crop, or Fit with bars to keep the whole frame.",
    },
    {
      title: "Export the vertical MP4",
      body: "Download a 1080x1920 MP4 ready to post on TikTok, Instagram Reels or YouTube Shorts.",
    },
  ],
  features: [
    {
      title: "True 9:16 output",
      body: "Exports at 1080x1920, the recommended resolution for TikTok, Reels and Shorts.",
    },
    {
      title: "Crop to fill",
      body: "Center-crops your footage so it fills the entire vertical screen with no bars.",
    },
    {
      title: "Fit with bars",
      body: "Keeps the full original frame visible with letterbox bars above and below.",
    },
    {
      title: "Private by design",
      body: "Resizing happens locally in your browser. Your footage is never uploaded.",
    },
    {
      title: "No watermark, no sign-up",
      body: "Free to use as often as you like, with clean exports you can post right away.",
    },
  ],
  sections: [
    {
      heading: "Why vertical 9:16 video matters",
      paragraphs: [
        "TikTok, Instagram Reels and YouTube Shorts are built for phones held upright. They all use a 9:16 aspect ratio, and the recommended resolution is 1080x1920 pixels. When you post a regular 16:9 horizontal video, the platform shrinks it into a thin strip in the middle of the screen, surrounded by empty space. It looks out of place in a feed full of full-screen clips, and viewers tend to scroll past it faster.",
        "This video resizer converts 16:9 to 9:16 in a couple of clicks so your podcast clips, gameplay, webinars and YouTube highlights look native on vertical platforms. It accepts MP4, MOV, WebM and MKV files and exports a 1080x1920 MP4, using H.264 video and AAC audio where your browser supports them, which every major platform accepts. Everything is processed locally in your browser with WebCodecs, so there is no upload wait, no watermark and no account needed.",
      ],
    },
    {
      heading: "Crop to fill vs fit with bars",
      paragraphs: [
        "Crop to fill takes the center of your horizontal frame and scales it up so it fills the entire vertical screen. This gives you the most immersive, native-looking result, and it works best when the important action is in the middle of the shot, like a single person talking to the camera, a centered product or a face-cam podcast angle. The trade-off is that the left and right edges of the original frame are cut off.",
        "Fit with bars keeps your entire original frame visible and places it in the middle of a 9:16 canvas, with bars filling the space above and below. Use it for screen recordings, slides, wide landscape shots or videos with two people sitting far apart, where cropping would cut out something important. The image is smaller on screen, but nothing is lost, and the space above and below can hold a title or captions if you add them later in an editor. If you'd rather choose the exact region yourself, use our video cropper with its 9:16 preset.",
      ],
    },
    {
      heading: "Safe zones for TikTok, Reels and Shorts",
      paragraphs: [
        "Even in a perfect 9:16 video, not every pixel is clear to see. Each platform overlays buttons, captions, usernames and progress bars on top of your content. The bottom of the screen holds the caption and account name, and the right edge holds the like, comment and share buttons. As a rule of thumb, keep faces, text and key action roughly within the middle of the frame, leaving a margin of around 10 to 15 percent at the top and a larger margin at the bottom and right side.",
        "When you use Crop to fill, check that the subject stays centered for the whole video, since a center crop does not follow movement. If the speaker drifts to one side, Fit with bars may be the safer choice. And if you want every clip framed around whoever is speaking, ClipPro handles that for you, finding the best moments in your long videos and reframing them into vertical clips automatically.",
      ],
    },
  ],
  useCases: [
    {
      title: "Podcasters",
      body: "Turn widescreen podcast recordings into vertical clips for social promotion.",
    },
    {
      title: "YouTubers",
      body: "Repurpose highlights from long-form videos as YouTube Shorts and Reels.",
    },
    {
      title: "Gamers and streamers",
      body: "Convert gameplay and stream highlights to 9:16 for TikTok without a heavy editor.",
    },
    {
      title: "Marketers",
      body: "Adapt horizontal ads, demos and webinar clips for vertical social placements.",
    },
  ],
  faqs: [
    {
      q: "Is this video resizer free?",
      a: "Yes. You can resize as many videos as you like for free, with no sign-up, no watermark and no daily limits. The conversion runs on your own device, so there are no server costs that would require a paid plan.",
    },
    {
      q: "What size should a TikTok, Reels or Shorts video be?",
      a: "All three platforms use a 9:16 vertical aspect ratio, and the recommended resolution is 1080x1920 pixels. That is exactly what this tool exports, as an MP4 file that you can upload directly to TikTok, Instagram Reels or YouTube Shorts.",
    },
    {
      q: "Should I choose Crop to fill or Fit with bars?",
      a: "Choose Crop to fill when your subject is centered, such as one person talking to camera, for a full-screen look. Choose Fit with bars when you need the whole frame visible, like screen recordings, slides or wide shots with several people.",
    },
    {
      q: "Is my video uploaded when I resize it?",
      a: "No. The resizer runs entirely in your browser using WebCodecs and WebAssembly. Your video stays on your device the whole time, which keeps unreleased or private footage safe and avoids slow uploads.",
    },
    {
      q: "What is the maximum file size?",
      a: "There is no fixed cap. The practical limit depends on your device's memory, and files up to about 2 GB work well on most computers. Phones are supported, but resizing long videos on mobile takes noticeably longer.",
    },
    {
      q: "Which browsers are supported?",
      a: "The tool works in current versions of Chrome, Edge, Safari and Firefox on desktop. Mobile browsers work too, just more slowly. For the quickest exports on long videos, use a recent desktop browser on a laptop or computer.",
    },
  ],
  related: ["video-compressor", "video-trimmer", "subtitle-generator"],
};
