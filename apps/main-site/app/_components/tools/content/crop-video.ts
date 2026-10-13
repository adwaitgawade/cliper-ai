import type { ToolContent } from "./types";

export const cropVideo: ToolContent = {
  slug: "crop-video",
  name: "Crop Video",
  category: "edit",
  status: "live",
  widget: "crop",
  cardDescription:
    "Crop video to any region or aspect ratio, or remove black bars automatically. In your browser, no upload.",
  seo: {
    title: "Crop Video Online Free: Remove Black Bars, Crop to Square",
    description:
      "Crop video online for free. Drag a crop box, use 9:16, 1:1 or 4:5 presets, or remove black bars and export MP4 in your browser. No upload or sign-up.",
    keywords: [
      "crop video",
      "crop video online",
      "remove black bars from video",
      "crop video to square",
      "crop video for Instagram",
      "crop video online free",
      "crop MP4",
      "change video aspect ratio",
    ],
  },
  h1: "Crop Video Online to Any Size or Aspect Ratio",
  subtitle:
    "Cut away the parts of the frame you do not need, remove black bars automatically, and export an MP4 that fits your platform, all without uploading your file.",
  steps: [
    {
      title: "Open your video",
      body: "Choose an MP4, MOV, WebM or MKV file. It appears in the preview in your browser, with nothing uploaded.",
    },
    {
      title: "Set your crop",
      body: "Drag and resize the crop box, pick a preset like 9:16, 1:1, 4:5 or 16:9, or click Remove black bars to detect them automatically.",
    },
    {
      title: "Export as MP4",
      body: "Check the output size in pixels, then export. Your cropped video is encoded on your device and saved as an MP4.",
    },
  ],
  features: [
    {
      title: "Drag-and-resize crop box",
      body: "Position the crop box exactly where you want it over the video preview, so you decide what stays in frame.",
    },
    {
      title: "Aspect ratio presets",
      body: "Lock the box to 9:16, 1:1, 4:5 or 16:9 for social platforms, or choose Free to crop any shape you like.",
    },
    {
      title: "Automatic black bar removal",
      body: "Remove black bars analyzes a few frames to detect letterboxing or pillarboxing and sets the crop for you.",
    },
    {
      title: "Exact output size",
      body: "See the final width and height in pixels as you adjust, so you know what you will get before exporting.",
    },
    {
      title: "100% private and free",
      body: "Cropping runs in your browser with WebCodecs and WebAssembly. No upload, no sign-up, no watermark, no daily limit.",
    },
  ],
  sections: [
    {
      heading: "How to crop a video online without uploading it",
      paragraphs: [
        "Cropping keeps only the region of the frame you choose and throws away everything outside it. That is useful when a recording has a distracting edge, an unwanted person or object at the side, a screen recording with extra desktop around the window you care about, or a shape that does not match where you want to post it. With this tool you drag a box over the preview, resize it until it frames the right area, and export the result as a new MP4.",
        "The whole job runs in your browser using WebCodecs and WebAssembly, so your video is never uploaded to ClipPro or anyone else. Because cropping changes the dimensions of every frame, the video is re-encoded on your device, and export time depends on the length and resolution of the clip and the speed of your hardware. The practical file size limit depends on your device's memory, and we recommend files up to about 2 GB.",
      ],
    },
    {
      heading: "Choosing the right aspect ratio for each platform",
      paragraphs: [
        "Different platforms favor different shapes. TikTok, Instagram Reels, YouTube Shorts and Stories are built around vertical 9:16 video. Instagram feed posts look best at 4:5, which takes up more of the screen than a square, while 1:1 is a safe choice that displays well almost anywhere. Standard YouTube videos, presentations and websites use widescreen 16:9. Pick the matching preset and the crop box locks to that shape, so you only have to slide it to the right spot.",
        "Keep important content away from the edges of the frame. Short-form apps overlay captions, usernames and buttons near the bottom and right side of vertical videos, and feeds may trim a little from the top and bottom in previews. Center faces, text and products with some breathing room. Also keep in mind that cropping removes pixels, so a tight crop from a 1080p video produces a smaller output. The pixel size readout shows exactly what you will get.",
      ],
    },
    {
      heading: "Removing black bars, and when to resize instead",
      paragraphs: [
        "Black bars appear when video made for one shape is placed inside another: letterboxing adds bars above and below, and pillarboxing adds them on the left and right. They often show up in downloaded clips, screen recordings and old footage. Click Remove black bars and the tool analyzes a few frames to find where the real picture starts and ends, then sets the crop box for you. Review it in the preview, adjust if needed, and export a clean video.",
        "Cropping means you pick the exact region to keep. If you just want to turn a horizontal 16:9 video into a 1080×1920 vertical clip without placing a box yourself, the Video Resizer tool does that conversion automatically. And if you are cutting many vertical clips from long podcasts or webinars, ClipPro can find the strongest moments and reframe them into captioned shorts for you.",
      ],
    },
  ],
  useCases: [
    {
      title: "Instagram and TikTok creators",
      body: "Crop footage to 9:16, 4:5 or 1:1 so it fills the screen on Reels, TikTok, Shorts and feed posts.",
    },
    {
      title: "Screen recorders and educators",
      body: "Cut a tutorial down to the app window or slide that matters and drop the cluttered desktop around it.",
    },
    {
      title: "Video editors",
      body: "Remove letterboxing or pillarboxing from downloaded or archived clips before using them in a new edit.",
    },
    {
      title: "Anyone with private footage",
      body: "Reframe family videos or confidential recordings without uploading them anywhere.",
    },
  ],
  faqs: [
    {
      q: "How do I crop a video online?",
      a: "Open your video, drag and resize the crop box over the preview, or pick a preset such as 9:16, 1:1, 4:5 or 16:9. Check the output size, then export. The cropped video is encoded in your browser and saved as an MP4, with nothing uploaded.",
    },
    {
      q: "How do I remove black bars from a video?",
      a: "Click Remove black bars. The tool analyzes a few frames to detect letterboxing above and below the picture or pillarboxing on the sides, then sets the crop box to the real image area. Review the result in the preview, fine-tune it if needed, and export.",
    },
    {
      q: "How do I crop a video to a square for Instagram?",
      a: "Choose the 1:1 preset and the crop box locks to a square. Drag it over the part of the frame you want to keep and export. For Instagram feed posts, the 4:5 preset is also worth trying, since it fills more of the screen on phones.",
    },
    {
      q: "Does cropping reduce video quality?",
      a: "Cropping removes the pixels outside your box, so the output has a smaller resolution than the original, and the video is re-encoded to MP4. The pixel size readout shows the final dimensions before you export, so you can avoid cropping too tightly for your platform.",
    },
    {
      q: "What is the difference between cropping and resizing a video?",
      a: "Cropping lets you choose the exact region of the frame to keep, at any shape. ClipPro's Video Resizer instead converts a horizontal 16:9 video into a 1080×1920 vertical clip automatically. Use cropping for precise control, and resizing for a quick vertical conversion.",
    },
    {
      q: "Is my video uploaded when I crop it?",
      a: "No. Cropping runs entirely in your browser using WebCodecs and WebAssembly, so your file is processed on your own device and never sent to ClipPro or any third party. It works with MP4, MOV, WebM and MKV files, and we recommend files up to about 2 GB.",
    },
  ],
  related: ["video-resizer", "rotate-video", "video-trimmer"],
};
