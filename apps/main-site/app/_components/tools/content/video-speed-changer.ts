import type { ToolContent } from "./types";

export const videoSpeedChanger: ToolContent = {
  slug: "video-speed-changer",
  name: "Video Speed Changer",
  category: "edit",
  status: "live",
  widget: "speed",
  cardDescription:
    "Speed up or slow down any video from 0.25× to 4× while voices keep their natural pitch. No upload needed.",
  seo: {
    title: "Change Video Speed - Free Video Speed Changer",
    description:
      "Change video speed for free in your browser. Speed up or slow down clips from 0.25x to 4x while voices keep their natural pitch. No upload. Try it now.",
    keywords: [
      "change video speed",
      "video speed changer",
      "speed up video",
      "slow down video",
      "slow motion video maker",
      "make video faster",
      "change video speed online free",
      "2x video speed",
    ],
  },
  h1: "Change Video Speed Online for Free",
  subtitle:
    "Speed up long recordings or slow down your best moments in a few clicks. Voices keep their natural pitch, and your file never leaves your device.",
  steps: [
    {
      title: "Add your video",
      body: "Choose an MP4, MOV, WebM or MKV file. It is processed right in your browser and never uploaded.",
    },
    {
      title: "Pick a speed",
      body: "Select a preset from 0.25× to 4×, then keep the audio with its natural pitch or remove it entirely.",
    },
    {
      title: "Download the MP4",
      body: "Save the re-encoded MP4 at its new speed, ready to post, share or drop into your editor.",
    },
  ],
  features: [
    {
      title: "Eight speed presets",
      body: "Slow down to 0.25×, 0.5× or 0.75×, or speed up to 1.25×, 1.5×, 2×, 3× or 4×.",
    },
    {
      title: "Natural-sounding pitch",
      body: "Audio is time-stretched, so voices do not turn into chipmunks or slowed-down monsters.",
    },
    {
      title: "Optional silent output",
      body: "Remove the audio completely when you plan to add music or a voiceover later.",
    },
    {
      title: "Smooth playback up to 60 fps",
      body: "When speeding up, extra frames are dropped so the output stays at a maximum of 60 fps.",
    },
    {
      title: "Standard MP4 output",
      body: "The result is re-encoded to MP4 (H.264/AAC where your browser supports it) for wide compatibility.",
    },
    {
      title: "Private and free",
      body: "Runs entirely in your browser. No upload, no sign-up, no watermark and no daily limits.",
    },
  ],
  sections: [
    {
      heading: "How this video speed changer works",
      paragraphs: [
        "Pick a speed and the tool rebuilds your video on a new timeline. When you speed up, it skips frames it no longer needs, keeping the output at a maximum of 60 frames per second so the file stays smooth and reasonably sized. When you slow down, each original frame is simply shown on screen for longer. The audio is time-stretched rather than sped up like a tape, so voices keep their natural pitch instead of sounding squeaky or sluggish.",
        "Everything runs inside your browser using WebCodecs and WebAssembly, so your video is never uploaded to a server. That keeps private footage private and skips slow upload and download steps. The result is re-encoded to MP4, using H.264 video and AAC audio where your browser supports them. It is free, with no sign-up, no watermark and no daily limits. Files up to about 2 GB work well on most computers, and mobile browsers work too, just more slowly.",
      ],
    },
    {
      heading: "Which speed should you choose?",
      paragraphs: [
        "For tutorials, lectures and screen recordings, 1.25× or 1.5× trims dead time while keeping speech easy to follow. Many viewers already watch this kind of content faster, so a gentle speed-up often feels more natural than you might expect. For highlight reels and quick social clips, 2× keeps energy high and fits more action into a short post. Cooking videos, room makeovers and long builds work well at 3× or 4×, turning minutes of footage into a quick timelapse.",
        "Slowing down is best for short, dramatic moments: a jump, a splash, a trick shot or a reaction. Try 0.5× for a clear slow-motion effect, or 0.75× for a subtle stretch that still feels real. Be aware that at the extremes, 0.25× and 4×, speech sounds less natural even with pitch preserved. If the audio matters, stay closer to normal speed, or remove the sound and add music instead.",
      ],
    },
    {
      heading: "Getting smooth slow motion: frame rate matters",
      paragraphs: [
        "This tool does not invent new frames with AI interpolation. When you slow a clip down, it shows each existing frame for longer. A normal 30 fps video played at 0.5× effectively becomes 15 frames per second, which can look slightly choppy, and at 0.25× the stutter is easy to see. That is not a flaw in the export. It simply reflects how many real frames were captured in the first place.",
        "For smooth slow motion, start with high-frame-rate footage. Most modern phones can record at 60 fps, and many offer 120 fps or more in their slow-motion modes. A 120 fps clip slowed to 0.25× still plays at around 30 frames per second, which looks fluid. Once your clips are the right speed, ClipPro can help you turn long recordings into short, ready-to-post clips for TikTok, Reels and Shorts.",
      ],
    },
  ],
  useCases: [
    {
      title: "Tutorials and screen recordings",
      body: "Speed up walkthroughs and lectures to 1.25× or 1.5× so viewers get to the point faster.",
    },
    {
      title: "Sports and action clips",
      body: "Slow down a goal, jump or trick shot to show every detail of the key moment.",
    },
    {
      title: "Timelapses",
      body: "Turn long cooking, crafting or cleaning sessions into a quick 3× or 4× timelapse.",
    },
    {
      title: "Social media creators",
      body: "Fit more into a short Reel, TikTok or Short, or add a dramatic slow-motion beat.",
    },
  ],
  faqs: [
    {
      q: "How do I change the speed of a video?",
      a: "Add your video to this tool, choose a speed preset between 0.25× and 4×, decide whether to keep or remove the audio, then download the new MP4. Processing happens in your browser, so the file never leaves your device.",
    },
    {
      q: "Will the audio sound like a chipmunk when I speed up a video?",
      a: "No. The audio is time-stretched so voices keep their natural pitch at every speed. At extreme settings like 4× or 0.25×, speech can still sound less natural, so if clear dialogue matters, choose a speed closer to normal or remove the audio.",
    },
    {
      q: "How do I make a slow motion video?",
      a: "Choose 0.5× or 0.75× for a classic slow-motion effect, or 0.25× for an extreme one. For the smoothest result, start with footage recorded at 60 or 120 fps, because the tool shows existing frames for longer rather than generating new ones.",
    },
    {
      q: "Why does my slowed-down video look choppy?",
      a: "Slowing down stretches the frames you already have. A 30 fps clip at 0.5× plays at an effective 15 frames per second, which can look jerky. There is no AI frame interpolation, so recording at a higher frame rate is the best way to get smooth slow motion.",
    },
    {
      q: "Can I remove the sound while changing the speed?",
      a: "Yes. Choose to remove the audio and the tool exports a silent MP4 at the new speed. This is handy for timelapses or when you plan to add music or a voiceover in another editor.",
    },
    {
      q: "Does changing the speed reduce video quality?",
      a: "The video is re-encoded to MP4, so it goes through one compression pass, but quality stays close to the original for normal viewing. Sped-up videos are capped at 60 fps by dropping extra frames, which keeps playback smooth and file sizes sensible.",
    },
    {
      q: "Is my video uploaded anywhere?",
      a: "No. Everything runs in your browser using WebCodecs and WebAssembly, so your file stays on your device. The tool is free, with no sign-up, no watermark and no daily limits. It works in current Chrome, Edge, Safari and Firefox, and files up to about 2 GB work well.",
    },
  ],
  related: ["video-trimmer", "loop-video", "video-to-gif"],
};
