import type { ToolContent } from "./types";

export const addTextToVideo: ToolContent = {
  slug: "add-text-to-video",
  name: "Add Text to Video",
  category: "edit",
  status: "live",
  widget: "text-overlay",
  cardDescription:
    "Put your own text, handle or watermark on a video with custom fonts, colors and placement. No upload.",
  seo: {
    title: "Add Text to Video - Free Text Overlay & Watermark",
    description:
      "Add text to video for free in your browser. Watermark clips with your name or @handle, pick fonts, colors and position. No upload, no sign-up. Try it.",
    keywords: [
      "add text to video",
      "text overlay on video",
      "put text on video",
      "watermark video",
      "add watermark to video free",
      "add caption to video",
      "add name to video",
      "video text editor online",
    ],
  },
  h1: "Add Text to Video Online, Free",
  subtitle:
    "Brand your clips with your name or @handle, protect them with a watermark, or add a quick title. You style the text, and it is burned in right on your device.",
  steps: [
    {
      title: "Add your video",
      body: "Choose an MP4, MOV, WebM or MKV file. It stays on your device the whole time.",
    },
    {
      title: "Type and style your text",
      body: "Enter your text, then set the font, size, colors, outline, opacity and background box. Pick a preset position or drag it into place.",
    },
    {
      title: "Download the MP4",
      body: "Export the video with your text burned into every frame, ready to post or share anywhere.",
    },
  ],
  features: [
    {
      title: "Your text, your style",
      body: "Choose from bold display fonts and classic system fonts, then set size and color.",
    },
    {
      title: "Outline and background box",
      body: "Add a stroke in any color and width, or a background box, so text stays readable on any footage.",
    },
    {
      title: "Precise placement",
      body: "Nine preset positions from top-left to bottom-right, or drag the text anywhere on the preview.",
    },
    {
      title: "Adjustable opacity",
      body: "Make a subtle, semi-transparent watermark or a solid, eye-catching title.",
    },
    {
      title: "Burned into every frame",
      body: "The text becomes part of the picture, so it shows up on every player and platform.",
    },
    {
      title: "No watermark of ours",
      body: "Free, no sign-up, no limits. The only text on your video is the text you add.",
    },
  ],
  sections: [
    {
      heading: "Add text to video without uploading it",
      paragraphs: [
        "Sometimes all a video needs is a few words: your @handle in the corner, a title at the top, a website address at the end, or a label that explains what viewers are looking at. This tool lets you add text to video in your browser. You type the text, style it with your choice of font, size, colors, outline, opacity and an optional background box, and place it with one of nine presets or by dragging it on the preview. The text is then burned into every frame of an MP4.",
        "The whole process runs on your device using WebCodecs and WebAssembly, so the video is never uploaded to a server. That matters when you are watermarking unreleased work or client footage you would rather not hand to a third party. The tool is free, with no sign-up and no daily limits, and it never stamps a watermark of its own on your video. Because the text becomes part of the picture, the video is re-encoded, and files up to about 2 GB work well on most computers.",
      ],
    },
    {
      heading: "How to make text overlays easy to read",
      paragraphs: [
        "Readable text comes down to contrast. White text disappears over bright skies and black text vanishes in dark scenes, so the safest choice for footage that changes is a light color with a dark outline, or the reverse. An outline of a few pixels is usually enough to separate letters from a busy background. If the footage is very cluttered, turn on the background box for a solid panel behind the text that stays legible no matter what is underneath.",
        "Size and font matter too. Videos are often watched on small phone screens, so text that looks large on a monitor can be hard to read on mobile. Bold display fonts work well for short titles and handles, while classic system fonts suit longer lines. Keep the wording short, since viewers may only glance at it for a second or two. Before exporting, check the preview at a few different points in the video to make sure the text is clear throughout. If you need every spoken word on screen rather than a single label, our subtitle generator creates a full SRT or VTT caption file instead.",
      ],
    },
    {
      heading: "Watermarks and safe zones on vertical video",
      paragraphs: [
        "A watermark with your name, @handle or URL helps people find you when your clip is reposted, and makes it harder for others to pass your work off as their own. For a watermark, lower the opacity so it is visible without distracting from the video, and place it in a corner or along an edge. Burned-in text cannot be switched off by the viewer, though anyone determined can still crop or blur it, so treat it as a deterrent and a branding tool.",
        "On vertical video for TikTok, Reels and Shorts, the app interface covers parts of the frame. The username and caption usually sit near the bottom, and action buttons run down the right side, so text placed there can be hidden. Keep important text toward the top or center of the frame, with some margin from the edges. If you are creating vertical clips from long videos, ClipPro can find the strongest moments and turn them into short clips for you.",
      ],
    },
  ],
  useCases: [
    {
      title: "Watermarking your content",
      body: "Add your name or @handle so reposted clips still point back to you.",
    },
    {
      title: "Social media branding",
      body: "Put a consistent handle, logo text or website on every Reel, TikTok and Short.",
    },
    {
      title: "Titles and labels",
      body: "Add a headline, a product name or a quick note that explains what is on screen.",
    },
    {
      title: "Client and review copies",
      body: "Mark drafts with \"Preview\" or \"Confidential\" before sending them for feedback.",
    },
  ],
  faqs: [
    {
      q: "How do I add text to a video for free?",
      a: "Open your video in this tool, type your text, then choose the font, size, colors, outline and position. Click export to download an MP4 with the text burned in. It is completely free, with no sign-up and no watermark added by us.",
    },
    {
      q: "How do I add a watermark to a video?",
      a: "Type your name, @handle or website, lower the opacity so it looks subtle, and place it in a corner using a preset position or by dragging it. An outline helps it stay visible on both light and dark scenes. Then export the MP4.",
    },
    {
      q: "Will this tool add its own watermark?",
      a: "No. The only text that appears on your video is the text you type. There is no ClipPro logo, no branding and no hidden mark added to the exported file.",
    },
    {
      q: "Can I move the text anywhere on the video?",
      a: "Yes. You can pick one of nine preset positions, such as top-left, center or bottom-right, or drag the text to any spot on the preview for exact placement. What you see in the preview is where it appears in the export.",
    },
    {
      q: "Can the text be removed later?",
      a: "The text is burned into every frame, so it becomes part of the picture and cannot be turned off like subtitles. Keep your original file if you might want a version without text. Burned-in text can still be cropped out, so it is a deterrent rather than full protection.",
    },
    {
      q: "Does adding text reduce video quality?",
      a: "Adding text requires re-encoding the video to MP4, which involves some compression. The output is encoded with H.264 and AAC where your browser supports them, and for most clips the difference from the original is hard to notice.",
    },
    {
      q: "Is my video uploaded to a server?",
      a: "No. Everything runs in your browser using WebCodecs and WebAssembly, so your file stays on your device. This works in current Chrome, Edge, Safari and Firefox on desktop, and on mobile too, though more slowly.",
    },
  ],
  related: ["subtitle-generator", "crop-video", "video-resizer"],
};
