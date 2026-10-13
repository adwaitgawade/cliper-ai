import type { ToolContent } from "./types";

export const loopVideo: ToolContent = {
  slug: "loop-video",
  name: "Loop Video Maker",
  category: "edit",
  status: "live",
  widget: "loop",
  cardDescription:
    "Repeat a clip 2 to 10 times in one file, or make a forward-and-back boomerang. Runs in your browser.",
  seo: {
    title: "Loop Video Maker - Free Repeat & Boomerang Tool",
    description:
      "Loop a video for free in your browser. Repeat a clip 2 to 10 times or make a boomerang that plays forward and back. No upload, no watermark. Try it now.",
    keywords: [
      "loop video",
      "loop video maker",
      "repeat video",
      "boomerang video maker",
      "make a video loop",
      "loop mp4",
      "video looper online",
      "loop video free no watermark",
    ],
  },
  h1: "Loop Video Maker",
  subtitle:
    "Repeat any clip up to 10 times in a single file, or turn it into a forward-and-back boomerang. Everything happens on your device, with no upload.",
  steps: [
    {
      title: "Add your video",
      body: "Choose an MP4, MOV, WebM or MKV file. It stays on your device the whole time.",
    },
    {
      title: "Pick a loop mode",
      body: "Choose Repeat and set 2 to 10 plays, or choose Boomerang to play the clip forward and then backward.",
    },
    {
      title: "Download the MP4",
      body: "Create the looped video and save it as an MP4, ready to upload or play anywhere.",
    },
  ],
  features: [
    {
      title: "Repeat 2 to 10 times",
      body: "Play the same clip back-to-back in one file, as many times as you need, up to 10.",
    },
    {
      title: "Lossless and fast",
      body: "Repeat mode copies the original video data with new timestamps, so nothing is re-encoded and quality stays identical.",
    },
    {
      title: "Boomerang effect",
      body: "Play a short clip forward and then in reverse for that familiar back-and-forth motion.",
    },
    {
      title: "MP4 output",
      body: "Both modes save a standard MP4 that plays on phones, computers, TVs and social apps.",
    },
    {
      title: "Made in your browser",
      body: "Your video is processed on your device and is never uploaded to a server.",
    },
    {
      title: "Free, no watermark",
      body: "No sign-up, no daily limits and no logo stamped on your video.",
    },
  ],
  sections: [
    {
      heading: "Loop a video right in your browser",
      paragraphs: [
        "Sometimes a clip needs to play more than once in the same file. This loop video maker gives you two ways to do it. Repeat mode plays your clip 2 to 10 times back-to-back and saves it as one MP4. Because the original video data is copied with new timestamps instead of being re-encoded, it is lossless and very fast, even for longer clips. Boomerang mode plays a short clip forward and then backward, like the Boomerang effect people know from Instagram, for a playful back-and-forth motion.",
        "Everything runs inside your browser using WebCodecs and WebAssembly, so your video is never uploaded to a server. There is no upload wait, no queue and no account to create. The tool is free, with no watermark and no daily limits. It accepts MP4, MOV, WebM and MKV files and works in current Chrome, Edge, Safari and Firefox on desktop. Phones work too, just more slowly. Files up to about 2 GB work well on most computers, depending on available memory.",
      ],
    },
    {
      heading: "Repeat or Boomerang: which loop mode to use",
      paragraphs: [
        "Choose Repeat when you want the clip to play exactly as recorded, several times in a row. It suits ambient and background videos, waiting screens, music visuals, product turntables and Stories where you want a short moment to last longer. Since nothing is re-encoded, the output keeps the original resolution, quality and sound, and it is ready in moments. The only change is that the file becomes longer, and roughly larger, in proportion to the number of repeats.",
        "Choose Boomerang for short, punchy moments with clear motion, such as a jump, a toss, a splash, a hair flip or a glass being raised. It works with clips up to 10 seconds. Because the clip has to be played in reverse, Boomerang re-encodes the video, and the output is limited to 720p. It also has no sound, since reversed audio tends to sound strange. If you want music, add it afterward in your editor or in the app you post to.",
      ],
    },
    {
      heading: "How to make a seamless video loop",
      paragraphs: [
        "The best loops are hard to spot. With Repeat mode, the cut from the last frame back to the first is where a loop either flows or jumps. Footage with a steady camera, such as a locked-off tripod shot, loops far more smoothly than handheld video. Try to start and end on frames that look nearly the same: the same framing, the same lighting and a subject in a similar position. Continuous motion like waves, traffic, rain, flickering candles or a spinning product hides the seam well.",
        "Trimming first makes a big difference. Use the Video Trimmer to cut your clip to the exact section you want, ideally ending on motion that leads naturally back into the opening frame, then bring it here to loop it. Boomerang loops are seamless by design, because the clip always returns to where it started. For either mode, shorter source clips usually feel more polished and keep the final file smaller.",
      ],
    },
    {
      heading: "When a pre-looped video is worth it",
      paragraphs: [
        "TikTok, Reels and Shorts already replay short videos automatically, so you rarely need to loop a clip before posting it there. A pre-looped file helps when the destination does not loop on its own or when you need a specific length. Examples include ambient visuals for a TV, lobby display or livestream waiting screen, background video for a presentation, visuals that need to fill a full song, and platforms or players that stop after one play.",
        "Repeating a clip can also help when a platform or ad slot expects a minimum duration, or when you want a short moment to hold attention a little longer inside a Story. Boomerangs are great for adding energy to otherwise static moments. And if you are looking for the moments worth looping in the first place, ClipPro can scan long videos, find the highlights and turn them into vertical short clips automatically.",
      ],
    },
  ],
  useCases: [
    {
      title: "Stories and social posts",
      body: "Repeat a short moment so it lasts longer, or add a boomerang for a playful touch.",
    },
    {
      title: "Ambient and background video",
      body: "Build longer looping visuals for TVs, lobby screens, presentations and websites.",
    },
    {
      title: "Stream waiting screens",
      body: "Loop a short animation or scene to play before a livestream or between segments.",
    },
    {
      title: "Music visuals",
      body: "Repeat a visual clip so it runs alongside a full track for lyric or visualizer videos.",
    },
  ],
  faqs: [
    {
      q: "How do I loop a video?",
      a: "Open your video in this tool, choose Repeat mode and set how many times it should play, from 2 to 10. Then create the video and download the MP4. The clip plays back-to-back in one file, and nothing is uploaded.",
    },
    {
      q: "Does looping a video reduce its quality?",
      a: "Not in Repeat mode. The original video data is copied with new timestamps instead of being re-encoded, so the quality, resolution and sound stay exactly the same. Boomerang mode does re-encode the video, and its output is limited to 720p.",
    },
    {
      q: "How do I make a boomerang video?",
      a: "Choose Boomerang mode and add a clip up to 10 seconds long. The tool plays it forward and then backward, and saves the result as an MP4. Short clips with clear motion, like a jump or a toss, give the best boomerang effect.",
    },
    {
      q: "Why does my boomerang video have no sound?",
      a: "Boomerang mode removes the audio because the second half plays in reverse, and reversed sound usually comes across as strange noise. If you want music, add it afterward in a video editor or in the app where you post the clip.",
    },
    {
      q: "Can I loop an MP4 for free?",
      a: "Yes. This loop video maker is completely free, with no sign-up, no watermark and no daily limits. It also accepts MOV, WebM and MKV files, saves MP4, and works in current Chrome, Edge, Safari and Firefox.",
    },
    {
      q: "How do I make a video loop seamlessly?",
      a: "Start and end on frames that look nearly the same, keep the camera steady and cut on continuous motion. Trim the clip precisely first with a video trimmer. Boomerang loops are always seamless because the clip returns to its starting frame.",
    },
    {
      q: "Do I need to loop videos for TikTok or Reels?",
      a: "Usually not, since those apps replay short videos automatically. A pre-looped file is more useful for places that play a video only once, such as ambient screens, presentations, waiting screens or players that do not loop on their own.",
    },
  ],
  related: ["video-trimmer", "video-speed-changer", "video-to-gif"],
};
