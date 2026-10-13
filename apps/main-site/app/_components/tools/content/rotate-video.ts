import type { ToolContent } from "./types";

export const rotateVideo: ToolContent = {
  slug: "rotate-video",
  name: "Rotate Video",
  category: "edit",
  status: "live",
  widget: "rotate",
  cardDescription:
    "Rotate video 90 or 180 degrees or flip it horizontally. Fixes sideways clips in your browser, no upload.",
  seo: {
    title: "Rotate Video Online Free: Flip or Turn Video 90 Degrees",
    description:
      "Rotate video online for free. Turn clips 90° or 180°, or mirror them, and save as MP4 right in your browser. No upload, no sign-up, no watermark. Try it.",
    keywords: [
      "rotate video",
      "flip video",
      "rotate video 90 degrees",
      "fix sideways video",
      "mirror video",
      "rotate video online free",
      "rotate MP4",
      "flip video horizontally",
    ],
  },
  h1: "Rotate Video Online and Fix Sideways Clips",
  subtitle:
    "Turn a sideways or upside-down video the right way up in seconds, or mirror a selfie clip, and save it as an MP4 without your file ever leaving your device.",
  steps: [
    {
      title: "Open your video",
      body: "Choose an MP4, MOV, WebM or MKV file. It loads into the preview in your browser, with nothing uploaded.",
    },
    {
      title: "Pick a rotation or flip",
      body: "Rotate 90° clockwise, 90° counter-clockwise or 180°, and turn on horizontal flip if you need a mirror image.",
    },
    {
      title: "Save as MP4",
      body: "Export your video. Pure rotations are usually ready almost instantly, while mirrored videos take a little longer to process.",
    },
  ],
  features: [
    {
      title: "Rotate in any direction",
      body: "Turn your video 90° clockwise, 90° counter-clockwise or a full 180° to fix clips shot sideways or upside down.",
    },
    {
      title: "Flip and mirror",
      body: "Flip a video horizontally to undo the mirrored look of front-camera selfies or to match the direction of other shots.",
    },
    {
      title: "Lossless, near-instant rotation",
      body: "Rotations are applied as orientation metadata instead of re-encoding, so they are usually fast and keep full quality.",
    },
    {
      title: "100% private",
      body: "Everything runs in your browser with WebCodecs and WebAssembly. Your video is never uploaded to any server.",
    },
    {
      title: "Free, no watermark",
      body: "No account, no sign-up, no daily limits and no logo stamped on your video. Rotate as many clips as you like.",
    },
  ],
  sections: [
    {
      heading: "How to rotate a video online without uploading it",
      paragraphs: [
        "Phones decide which way is up using a motion sensor, and it is easy to fool. Start recording while the phone is flat on a table or tilted at an odd angle and you can end up with a video that plays sideways or upside down everywhere you share it. This tool fixes that in a few clicks. Open the file, choose the rotation that puts it the right way up, and save it as an MP4 that plays correctly on phones, computers and social platforms.",
        "All of the work happens inside your browser. The file is read and processed on your own device using WebCodecs and WebAssembly, and nothing is sent to ClipPro or any other server. That keeps personal and client videos private, and it means you do not have to wait for a large file to upload and download again. The practical file size limit depends on your device's memory, so we recommend files up to about 2 GB.",
      ],
    },
    {
      heading: "Why rotating is instant but mirroring takes longer",
      paragraphs: [
        "Most video files include a small piece of orientation metadata that tells players how to display the picture. When you rotate by 90° or 180°, this tool updates that metadata and copies the video and audio as they are, without decoding and re-encoding a single frame. That is why pure rotations are usually ready almost instantly and lose no quality at all. Nearly every modern player and platform, including phones, desktop players and the major social apps, respects this orientation flag.",
        "Mirroring is different. There is no widely supported metadata flag for a horizontal flip, so the tool has to redraw every frame reversed and encode a new video. That takes longer, especially for long or high-resolution clips, and speed depends on your device. If you only need to fix a sideways video, leave flip off for the fastest result. If an old or unusual player still shows your rotated clip the wrong way, try opening it in a different player; the file itself is fine.",
      ],
    },
    {
      heading: "Common fixes: sideways phone clips and mirrored selfies",
      paragraphs: [
        "If a video plays lying on its side, think about which way the top of the picture is pointing. When the top points left, rotate 90° clockwise; when it points right, rotate 90° counter-clockwise. Upside-down clips need 180°. Check the preview after choosing, since it is quicker to try again than to guess. Front-camera recordings and webcam captures often appear mirrored, which makes text on signs or shirts read backward. A horizontal flip puts everything back the way it looked in real life.",
        "Once your video faces the right way, you may want it framed for short-form platforms too. A correctly rotated vertical phone clip is ready for TikTok, Reels and Shorts, while horizontal footage may need reframing to 9:16. If you are regularly pulling short clips out of long recordings, ClipPro can find the best moments and turn them into captioned vertical videos for you, so you spend less time fixing and more time posting. If the clip also needs to become a vertical 9:16 video for TikTok or Reels, run it through our video resizer next.",
      ],
    },
  ],
  useCases: [
    {
      title: "Phone videographers",
      body: "Fix clips that were recorded sideways or upside down because the phone guessed the wrong orientation.",
    },
    {
      title: "Selfie and webcam creators",
      body: "Flip mirrored front-camera footage so text and gestures read the right way for viewers.",
    },
    {
      title: "Social media creators",
      body: "Get footage facing the right way before trimming, cropping or posting to TikTok, Reels or Shorts.",
    },
    {
      title: "Anyone with private footage",
      body: "Rotate family videos or confidential recordings without uploading them anywhere.",
    },
  ],
  faqs: [
    {
      q: "How do I rotate a video 90 degrees?",
      a: "Open your video in the tool and choose 90° clockwise or 90° counter-clockwise, depending on which way the picture is tilted. Check the preview, then save it as MP4. Pure rotations are usually ready almost instantly because the tool updates the video's orientation instead of re-encoding it.",
    },
    {
      q: "Does rotating a video reduce its quality?",
      a: "No. Rotating by 90° or 180° only changes the video's orientation metadata, so the original video and audio are copied without re-encoding and keep their full quality. Mirroring does require re-encoding, which can introduce a very small amount of quality loss.",
    },
    {
      q: "How do I flip or mirror a video?",
      a: "Turn on the horizontal flip option, with or without a rotation, and export. The tool redraws each frame as a mirror image and encodes a new MP4. It takes a little longer than a plain rotation, since every frame has to be processed on your device.",
    },
    {
      q: "Why does my rotated video still play sideways in one app?",
      a: "Rotations are saved as orientation metadata, which most players and platforms respect. A few older or unusual players ignore it. If that happens, open the file in a different app or upload it to your platform of choice, where the orientation is normally applied correctly.",
    },
    {
      q: "Is my video uploaded when I rotate it?",
      a: "No. The tool runs entirely in your browser using WebCodecs and WebAssembly, so your video is read and saved on your own device. Nothing is sent to ClipPro or any third party, which makes it safe for personal or unreleased footage.",
    },
    {
      q: "What formats can I rotate?",
      a: "You can open MP4, MOV, WebM and MKV files, and the result is always saved as MP4. It works in current Chrome, Edge, Safari and Firefox on desktop, and in mobile browsers more slowly. We recommend files up to about 2 GB.",
    },
  ],
  related: ["crop-video", "video-trimmer", "video-resizer"],
};
