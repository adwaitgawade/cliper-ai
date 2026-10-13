import type { ToolContent } from "./types";

export const videoVolumeBooster: ToolContent = {
  slug: "video-volume-booster",
  name: "Video Volume Booster",
  category: "edit",
  status: "live",
  widget: "volume",
  cardDescription:
    "Make quiet videos louder with up to +20 dB of boost, or normalize audio to -14 LUFS. No upload needed.",
  seo: {
    title: "Increase Video Volume - Free Video Volume Booster",
    description:
      "Increase video volume for free in your browser. Boost audio up to +20 dB or normalize it to -14 LUFS without touching the picture. No upload. Try it now.",
    keywords: [
      "increase video volume",
      "video volume booster",
      "make video louder",
      "boost audio in video",
      "normalize audio",
      "normalize video audio",
      "increase mp3 volume",
      "video volume booster online free",
    ],
  },
  h1: "Increase Video Volume for Free",
  subtitle:
    "Make quiet recordings clear and loud without distortion. Boost the audio or normalize it to the level social platforms expect, right on your device.",
  steps: [
    {
      title: "Add your file",
      body: "Choose a video (MP4, MOV, WebM or MKV) or an audio file (MP3, WAV, M4A or OGG). It never leaves your device.",
    },
    {
      title: "Boost or normalize",
      body: "Drag the gain slider up to +20 dB, or switch to Normalize to bring the whole track to about -14 LUFS automatically.",
    },
    {
      title: "Download the result",
      body: "Save an MP4 for video input or an MP3 for audio input, with the louder sound ready to share or upload.",
    },
  ],
  features: [
    {
      title: "Up to +20 dB of boost",
      body: "A simple gain slider from 0 to +20 dB for recordings that are far too quiet.",
    },
    {
      title: "Built-in soft limiter",
      body: "Peaks are gently held back as you boost, so loud moments do not clip or crackle.",
    },
    {
      title: "One-click normalization",
      body: "Measures the whole track and sets it to about -14 LUFS with peaks kept under -1 dB.",
    },
    {
      title: "Picture stays untouched",
      body: "The video track is copied as-is, not re-encoded, so processing is fast and quality is identical.",
    },
    {
      title: "Video and audio files",
      body: "Works with MP4, MOV, WebM and MKV video, plus MP3, WAV, M4A and OGG audio.",
    },
    {
      title: "Private and free",
      body: "Runs entirely in your browser. No upload, no sign-up, no watermark and no daily limits.",
    },
  ],
  sections: [
    {
      heading: "A video volume booster that keeps your file on your device",
      paragraphs: [
        "Phone recordings, screen captures and interviews filmed from across the room often come out too quiet. Viewers then have to crank their volume, and many simply scroll past. This tool lets you increase video volume in a few seconds, either with a manual boost or with automatic loudness normalization. Only the audio is processed. The video track is copied over exactly as it was, so there is no re-encoding, no loss of sharpness and very little waiting, even for long files.",
        "Everything happens inside your browser using WebCodecs and WebAssembly, so your file is never uploaded to a server. That keeps private recordings private and skips the slow upload and download steps of most online editors. It is free, with no sign-up, no watermark and no daily limits. Video input is saved as an MP4, while audio-only files such as MP3, WAV, M4A and OGG come back as an MP3. Files up to about 2 GB work well on most computers.",
      ],
    },
    {
      heading: "Boost vs. normalize: which one should you use?",
      paragraphs: [
        "Boost mode raises the volume by a fixed amount you choose, from 0 to +20 dB. Every 6 dB roughly doubles the signal level, so even a small move makes a clear difference. Simply turning audio up usually causes clipping, where the loudest peaks hit the ceiling and turn into harsh distortion. The built-in soft limiter prevents that by gently taming those peaks while the rest of the sound gets louder. Boost is best when you know a clip is quiet and want direct control.",
        "Normalize mode does the measuring for you. It analyzes the loudness of the entire track, then raises or lowers it so the result lands at about -14 LUFS, with peaks kept below -1 dB to leave headroom. This is the better choice when you are preparing several clips that should sound consistent, or when you are unsure how much gain a file needs. It can also turn down audio that is too loud, which a boost cannot do.",
      ],
    },
    {
      heading: "What LUFS means and why platforms normalize audio",
      paragraphs: [
        "LUFS stands for Loudness Units relative to Full Scale. Unlike a simple peak meter, it measures loudness the way people actually perceive it, averaged across the whole track. Two clips can have the same peak level yet sound very different in loudness, which is why streaming services and social apps rely on LUFS. Values are negative, and numbers closer to zero are louder, so -10 LUFS sounds louder than -14 LUFS.",
        "Services like YouTube and Spotify, along with many social platforms, aim for a playback level of around -14 LUFS so viewers do not have to adjust their volume between videos. Audio that is far quieter than that can sound weak next to other posts, while audio mixed much louder may simply be turned down. Normalizing to about -14 LUFS before posting gives you a predictable, competitive level. If you are turning long recordings into short clips, ClipPro can find the best moments and cut them for you.",
      ],
    },
  ],
  useCases: [
    {
      title: "Quiet phone recordings",
      body: "Rescue clips filmed at a distance or in a noisy room where voices came out too soft.",
    },
    {
      title: "Social media creators",
      body: "Bring Reels, TikToks and Shorts to a consistent loudness before you post them.",
    },
    {
      title: "Podcasts and interviews",
      body: "Normalize audio files and video episodes so every guest sounds equally clear.",
    },
    {
      title: "Lectures and screen recordings",
      body: "Make tutorials and recorded meetings easy to hear without maxing out speakers.",
    },
  ],
  faqs: [
    {
      q: "How do I increase the volume of a video?",
      a: "Open your video in this tool, choose Boost and drag the gain slider up to as much as +20 dB, or choose Normalize to set the loudness automatically. Then download the new MP4. Only the audio changes, and the file never leaves your device.",
    },
    {
      q: "Will boosting the volume cause distortion?",
      a: "Boost mode includes a soft limiter that gently holds back the loudest peaks, so they do not clip or crackle as you raise the volume. Very large boosts on noisy recordings will also make background hiss louder, so use only as much gain as you need.",
    },
    {
      q: "What does normalize audio mean?",
      a: "Normalizing measures the overall loudness of the whole track and adjusts it to a target level. This tool targets about -14 LUFS, which many streaming and social platforms aim for, while keeping peaks under -1 dB. It can make quiet audio louder or loud audio quieter.",
    },
    {
      q: "Does this reduce my video quality?",
      a: "No. The video track is copied exactly as it is and is not re-encoded, so the picture stays identical to your original. Only the audio is processed, which is also why the tool finishes quickly even on long videos.",
    },
    {
      q: "Can I make an MP3 or other audio file louder?",
      a: "Yes. You can add MP3, WAV, M4A or OGG files as well as video. Audio-only files are processed the same way, with Boost or Normalize, and are saved as an MP3.",
    },
    {
      q: "Is my file uploaded anywhere?",
      a: "No. Processing runs entirely in your browser using WebCodecs and WebAssembly, so your file stays on your device. The tool is free, needs no sign-up, adds no watermark and has no daily limits. Files up to about 2 GB work well on most computers.",
    },
  ],
  related: ["video-compressor", "video-to-mp3", "video-trimmer"],
};
