import type { ToolContent } from "./types";

export const mergeVideos: ToolContent = {
  slug: "merge-videos",
  name: "Merge Videos",
  category: "edit",
  status: "live",
  widget: "merge",
  cardDescription:
    "Combine up to 20 clips into one MP4, reorder them and choose a 9:16, 16:9 or 1:1 frame. No upload needed.",
  seo: {
    title: "Merge Videos Online - Free Video Joiner, No Upload",
    description:
      "Merge videos for free in your browser. Combine up to 20 clips into one MP4, reorder them and pick a 9:16, 16:9 or 1:1 frame. No upload. Try it now.",
    keywords: [
      "merge videos",
      "combine videos",
      "join videos online",
      "video joiner",
      "put videos together",
      "merge mp4 files",
      "combine video clips into one",
      "merge videos online free",
    ],
  },
  h1: "Merge Videos into One for Free",
  subtitle:
    "Combine clips from your phone, camera or screen recorder into a single MP4 in the order you want, without uploading anything.",
  steps: [
    {
      title: "Add your clips",
      body: "Choose up to 20 videos in MP4, MOV, WebM or MKV format. They stay on your device the whole time.",
    },
    {
      title: "Arrange and pick a size",
      body: "Move clips up or down, remove any you do not need, and choose the output frame: match the first clip, 9:16, 16:9 or 1:1.",
    },
    {
      title: "Download one MP4",
      body: "The clips are joined into a single 30 fps MP4 that you can post, share or keep editing.",
    },
  ],
  features: [
    {
      title: "Up to 20 clips at once",
      body: "Join MP4, MOV, WebM and MKV files in a single pass, even when they come from different devices.",
    },
    {
      title: "Easy reordering",
      body: "Move clips up or down and remove any that do not belong before you merge.",
    },
    {
      title: "Four output sizes",
      body: "Match the first clip, or choose Vertical 9:16 (1080×1920), Landscape 16:9 (1920×1080) or Square 1:1 (1080×1080).",
    },
    {
      title: "Never stretched",
      body: "Clips with a different shape are fitted inside the frame with black bars instead of being distorted.",
    },
    {
      title: "Audio stays in sync",
      body: "Clips without sound get matching silence, so the audio never drifts away from the picture.",
    },
    {
      title: "Private and free",
      body: "Runs entirely in your browser. No upload, no sign-up, no watermark and no daily limits.",
    },
  ],
  sections: [
    {
      heading: "How to combine videos without uploading them",
      paragraphs: [
        "Add your clips, put them in the order you want and choose an output size. The tool then decodes each clip, fits it into the frame you picked and encodes everything into one continuous MP4 at 30 frames per second. Because every clip is re-encoded to the same format, you can mix files from different sources, such as a MOV from an iPhone, an MP4 from a screen recorder and a WebM downloaded from the web, and still get one clean, consistent file.",
        "All of this happens inside your browser using WebCodecs and WebAssembly, so your videos are never uploaded to a server. That keeps personal footage private and skips the long upload queue of most online video joiners. The tool is free, with no sign-up, no watermark and no daily limits. It works in current Chrome, Edge, Safari and Firefox on desktop, and on mobile too, just more slowly. A combined input of up to about 2 GB works well on most computers.",
      ],
    },
    {
      heading: "Choosing the right output size",
      paragraphs: [
        "Match first clip is the simplest option: the merged video uses the same dimensions as the first clip in your list. Pick Vertical 9:16 (1080×1920) for TikTok, Reels and Shorts, Landscape 16:9 (1920×1080) for YouTube and presentations, or Square 1:1 (1080×1080) for feed posts. Whichever you choose, every clip is scaled to fit inside that frame without cropping anything important.",
        "When a clip has a different shape than the output, it is never stretched. Instead, it is centered with black bars filling the empty space, above and below or on the sides. To avoid bars entirely, keep all of your clips in the same orientation. If you have a mix, consider resizing or cropping the odd ones out first, so the final video looks like one piece rather than a patchwork.",
      ],
    },
    {
      heading: "Tips for a clean merged video",
      paragraphs: [
        "Trim each clip before you merge. Cutting slow starts, false takes and long pauses with the Video Trimmer keeps the final video tight and also shortens processing, since total length is the biggest factor in how long a merge takes. Then think about order: open with your strongest clip, group related shots together and end on a clear moment, so the result feels planned rather than stitched.",
        "Pay attention to sound, too. Clips recorded on different devices often have very different volume levels, which makes a merged video jump from quiet to loud. Evening them out with a volume tool before joining makes a big difference. Clips with no audio track are filled with silence automatically, so sync is never a problem. If your source is one long recording, ClipPro can find the best moments and turn them into short clips for you.",
      ],
    },
  ],
  useCases: [
    {
      title: "Social media compilations",
      body: "Stitch several short clips into one vertical video for TikTok, Reels or Shorts.",
    },
    {
      title: "Travel and event videos",
      body: "Join clips from a trip, wedding or party into a single file that is easy to share.",
    },
    {
      title: "Split recordings",
      body: "Reconnect screen captures, lectures or gameplay that were saved as several separate files.",
    },
    {
      title: "Presentations and demos",
      body: "Combine an intro, product demo and outro into one landscape video for slides or YouTube.",
    },
  ],
  faqs: [
    {
      q: "How do I merge videos into one?",
      a: "Add up to 20 clips to this tool, arrange them with the move up and down buttons, choose an output size and start the merge. You get a single MP4 to download. Everything runs in your browser, so your videos are never uploaded.",
    },
    {
      q: "Can I combine videos with different sizes or orientations?",
      a: "Yes. Each clip is fitted inside the output frame you choose, with black bars where the shapes differ, and nothing is ever stretched. For a seamless look with no bars, keep all clips in the same orientation as your chosen output.",
    },
    {
      q: "Can I merge MP4, MOV and WebM files together?",
      a: "Yes. You can mix MP4, MOV, WebM and MKV clips in one project. Every clip is re-encoded into a single MP4 at 30 fps, so files from phones, cameras and screen recorders join together smoothly.",
    },
    {
      q: "How many videos can I put together at once?",
      a: "You can merge up to 20 clips in one go. The practical limit depends on your device memory, and a combined input of about 2 GB works well on most computers. Longer total length means longer processing, so trimming clips first helps.",
    },
    {
      q: "What happens to clips that have no sound?",
      a: "Clips without an audio track are filled with silence for their full length. This keeps the audio and video of every following clip perfectly in sync, so speech and music still line up after the merge.",
    },
    {
      q: "Is there a watermark on the merged video?",
      a: "No. The tool is completely free, with no watermark, no sign-up and no daily limits. Your merged MP4 is exactly what you put together, ready to post or share wherever you like.",
    },
    {
      q: "Are my videos uploaded to a server?",
      a: "No. Merging happens entirely in your browser using WebCodecs and WebAssembly, so your clips stay on your device. It works in current Chrome, Edge, Safari and Firefox on desktop, and on mobile browsers too, though more slowly.",
    },
  ],
  related: ["video-trimmer", "video-resizer", "video-volume-booster"],
};
