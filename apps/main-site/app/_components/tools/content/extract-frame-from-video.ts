import type { ToolContent } from "./types";

export const extractFrameFromVideo: ToolContent = {
  slug: "extract-frame-from-video",
  name: "Extract Frame from Video",
  category: "edit",
  status: "live",
  widget: "extract-frame",
  cardDescription:
    "Grab any frame from a video as a full-resolution PNG or JPG. Frame-accurate, in your browser, no upload.",
  seo: {
    title: "Extract Frame from Video Free: Save Video Stills as PNG/JPG",
    description:
      "Extract a frame from any video for free. Step frame by frame, capture stills and save PNG or JPG at full resolution. No upload, no sign-up. Try it now.",
    keywords: [
      "extract frame from video",
      "video to image",
      "video to JPG",
      "screenshot from video",
      "video thumbnail maker",
      "save frame from video",
      "video to PNG",
      "get still image from video",
    ],
  },
  h1: "Extract Frame from Video as a Full-Resolution Image",
  subtitle:
    "Find the exact moment you want, frame by frame, and save it as a crisp PNG or JPG at your video's original resolution, without uploading a thing.",
  steps: [
    {
      title: "Open your video",
      body: "Choose an MP4, MOV, WebM or MKV file. It loads into the preview player right in your browser, with nothing uploaded.",
    },
    {
      title: "Find the exact frame",
      body: "Drag the scrub slider to get close, then use the one-frame step buttons to land on the precise moment you want.",
    },
    {
      title: "Capture and download",
      body: "Click Capture frame to add it to your gallery. Grab as many as you like, then download each one as PNG or JPG.",
    },
  ],
  features: [
    {
      title: "Frame-accurate stepping",
      body: "Move forward or back one frame at a time, so you can pick the sharpest still instead of settling for a blurry one.",
    },
    {
      title: "Original full resolution",
      body: "Frames are saved at the video's native resolution, not the size of the preview player. 4K in means 4K out.",
    },
    {
      title: "PNG or JPG",
      body: "Choose lossless PNG for maximum quality and editing, or JPG for smaller files that are quick to share.",
    },
    {
      title: "Capture as many as you want",
      body: "Every capture lands in a gallery, so you can collect several candidates and download only the ones you like.",
    },
    {
      title: "100% private and free",
      body: "Everything runs in your browser. Your video is never uploaded, and there is no sign-up, watermark or daily limit.",
    },
  ],
  sections: [
    {
      heading: "How to extract a frame from a video in your browser",
      paragraphs: [
        "Pausing a video and pressing the screenshot key sounds simple, but it rarely gives you a good image. You capture the player controls, the frame is scaled down to whatever size your window happens to be, and you can never quite land on the moment you wanted. This tool reads the video file itself, so the still you save is the actual decoded frame at the resolution it was recorded in, with no interface, cursor or compression artifacts from a screen capture layered on top.",
        "The whole process happens locally. Your browser opens the file, decodes frames using built-in video support and WebAssembly, and turns your chosen frame into an image on your own device. Nothing is sent to ClipPro or any other server, which makes it safe for unreleased footage, client work or personal videos. Speed depends on your hardware, and the practical file size limit depends on your device's memory, so we recommend videos up to about 2 GB.",
      ],
    },
    {
      heading: "Picking a sharp frame and choosing PNG or JPG",
      paragraphs: [
        "Motion blur is the most common reason a captured frame looks soft. When the camera or subject is moving, many frames are smeared, while the ones right before or after the movement are crisp. Scrub to the general moment, then tap the frame-step buttons a few times in each direction and capture two or three candidates. Comparing them side by side in the gallery makes it obvious which one is sharpest, and for faces, look for open eyes and a natural expression rather than a mid-blink or mid-word frame.",
        "PNG is lossless, so it preserves every pixel of the decoded frame exactly. Choose it when you plan to edit the image further, add text, or need the best possible quality for print or design work. JPG uses compression to produce much smaller files with little visible difference at normal viewing sizes, which makes it a good fit for emailing, uploading to social media or dropping into a slide deck. If you are unsure, save a PNG; you can always convert it to JPG later.",
      ],
    },
    {
      heading: "Turning video stills into thumbnails, posts and docs",
      paragraphs: [
        "A well-chosen frame is often the starting point for a YouTube thumbnail. Look for a moment with a clear facial expression and some empty space where you can add a headline later, then save it as PNG so it holds up when you layer on text and graphics. The same approach works for blog headers, podcast episode art and social posts that tease an upcoming video, since a real frame from the footage sets accurate expectations for viewers.",
        "Video stills are just as handy outside of content creation. Pull screenshots from a screen recording to illustrate a how-to guide, grab a product shot from a demo for a presentation, or capture a frame from a family video to print. And if your long recordings keep producing great moments, ClipPro can find those highlights for you and turn them into captioned vertical clips for TikTok, Reels and Shorts.",
      ],
    },
  ],
  useCases: [
    {
      title: "YouTubers and streamers",
      body: "Capture the perfect expression or action shot from your footage to build a click-worthy thumbnail.",
    },
    {
      title: "Social media managers",
      body: "Turn key moments from a video into still images for carousel posts, stories and teasers.",
    },
    {
      title: "Writers and educators",
      body: "Pull clean screenshots from screen recordings and tutorials to illustrate documentation and slides.",
    },
    {
      title: "Families and hobbyists",
      body: "Save a favorite moment from a home video as a full-resolution photo you can print or share.",
    },
  ],
  faqs: [
    {
      q: "How do I extract a frame from a video?",
      a: "Open your video in the tool, drag the scrub slider to the moment you want and use the one-frame step buttons to fine-tune it. Click Capture frame to add it to the gallery, then download it as PNG or JPG. Everything happens in your browser, so nothing is uploaded.",
    },
    {
      q: "Will the image be the same quality as the video?",
      a: "Yes. Frames are saved at the video's original full resolution, not the size of the preview on your screen. If you choose PNG, the image is lossless, so it matches the decoded frame exactly. JPG adds light compression for a smaller file size.",
    },
    {
      q: "Should I save frames as PNG or JPG?",
      a: "Pick PNG when you want the highest quality or plan to edit the image, such as adding text for a thumbnail. Pick JPG when you want a smaller file that is quick to email or post. Both are saved at the video's full resolution.",
    },
    {
      q: "Can I extract multiple frames from one video?",
      a: "Yes. Every time you click Capture frame, the still is added to a gallery below the player. Capture as many as you like, compare them, and download only the ones you want to keep, each as PNG or JPG.",
    },
    {
      q: "Is my video uploaded to a server?",
      a: "No. The tool runs entirely in your browser using WebCodecs and WebAssembly, so your video is read and processed on your own device. Nothing is sent to ClipPro or any third party, which makes it safe for private or unreleased footage.",
    },
    {
      q: "Which video formats are supported?",
      a: "You can open MP4, MOV, WebM and MKV files in current Chrome, Edge, Safari and Firefox on desktop. Mobile browsers work too, just more slowly. We recommend files up to about 2 GB, since the practical limit depends on your device's memory.",
    },
  ],
  related: ["youtube-thumbnail-downloader", "video-to-gif", "video-trimmer"],
};
