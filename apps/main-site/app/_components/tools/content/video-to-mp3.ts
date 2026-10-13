import type { ToolContent } from "./types";

export const videoToMp3: ToolContent = {
  slug: "video-to-mp3",
  name: "Video to MP3 Converter",
  category: "edit",
  status: "live",
  widget: "video-to-mp3",
  cardDescription:
    "Extract the audio from MP4, MOV, WebM or MKV videos and save it as MP3, right in your browser.",
  seo: {
    title: "Video to MP3 Converter - Free, Private, No Upload",
    description:
      "Free video to MP3 converter. Extract audio from MP4, MOV, WebM or MKV at up to 320 kbps, right in your browser. No upload, no sign-up. Convert now.",
    keywords: [
      "video to mp3 converter",
      "mp4 to mp3",
      "extract audio from video",
      "mov to mp3",
      "convert video to audio",
      "webm to mp3",
      "mkv to mp3",
      "320kbps mp3 converter",
    ],
  },
  h1: "Free Video to MP3 Converter",
  subtitle:
    "Pull the audio out of any video and save it as a high-quality MP3 in seconds. Your file is converted on your device and never uploaded.",
  steps: [
    {
      title: "Select a video",
      body: "Drop in an MP4, MOV, WebM or MKV file, or click to browse your device.",
    },
    {
      title: "Pick a bitrate",
      body: "Choose 128, 192 or 320 kbps depending on whether you want a smaller file or the best sound.",
    },
    {
      title: "Download your MP3",
      body: "Convert and save the MP3. It plays on any phone, computer, car stereo or editing app.",
    },
  ],
  features: [
    {
      title: "Three quality levels",
      body: "Export MP3 at 128, 192 or 320 kbps to balance file size and sound quality.",
    },
    {
      title: "Popular video formats",
      body: "Works with MP4, MOV, WebM and MKV files from phones, cameras and screen recorders.",
    },
    {
      title: "Nothing is uploaded",
      body: "Conversion runs locally in your browser, so your videos stay private.",
    },
    {
      title: "Fast, no queue",
      body: "No waiting for a server. Conversion starts the moment you click.",
    },
    {
      title: "Free with no limits",
      body: "No sign-up, no watermark and no daily cap on how many files you convert.",
    },
  ],
  sections: [
    {
      heading: "Extract audio from video without uploading it",
      paragraphs: [
        "Sometimes you only need the sound: a podcast you recorded on video, a talk you want to listen to on a walk, a voiceover you want to reuse in another project, or a clip you want to transcribe. This video to MP3 converter pulls the audio track out of your video and saves it as a standard MP3 file that plays everywhere. It supports MP4, MOV, WebM and MKV, which covers footage from iPhones and Android phones, most cameras, screen recorders and video exported from editing apps.",
        "Most online converters make you upload the whole video first, which is slow for large files and risky for private recordings. This tool works differently. The conversion runs inside your browser using WebAssembly, so your video never leaves your device. There is no upload progress bar, no server queue and no file sitting on someone else's storage afterward. It is free, has no sign-up or watermark, and once the page has loaded it even works offline.",
      ],
    },
    {
      heading: "Choosing the right MP3 bitrate",
      paragraphs: [
        "Bitrate controls how much data is used for each second of audio, which affects both quality and file size. At 128 kbps, an hour of audio is roughly 58 MB. That is perfectly fine for speech such as podcasts, lectures, meetings and voice notes, and it keeps files small enough to share easily. If your video is mostly people talking, 128 kbps is usually all you need.",
        "Choose 192 kbps as a solid all-round setting for mixed content with both voice and music. Pick 320 kbps, the highest MP3 bitrate, when music quality matters or when you plan to edit the audio further and want as much detail as possible. Keep in mind that a higher bitrate cannot add quality that was not in the original video. If the source audio was heavily compressed, exporting at 320 kbps will mostly just give you a bigger file.",
      ],
    },
    {
      heading: "What to do with your MP3 next",
      paragraphs: [
        "Once you have the audio, there is a lot you can do with it. Drop it into a podcast host, add it to a playlist, or import it into an audio editor to clean up noise. If you want a written version, run the MP3 through our free audio to text converter to get a transcript, or use the subtitle generator on the original video to create SRT captions. Both also run privately in your browser, with no uploads.",
        "If your end goal is short-form content, the audio is often where the best moments are hiding: a strong quote, a punchline, a clear explanation. Listening back is a great way to spot them. If you would rather not scrub through hours of footage yourself, ClipPro finds the most engaging moments in long videos and turns them into vertical clips for TikTok, Reels and Shorts automatically.",
      ],
    },
  ],
  useCases: [
    {
      title: "Podcasters",
      body: "Turn video podcast recordings into audio-only episodes for Spotify and Apple Podcasts.",
    },
    {
      title: "Students",
      body: "Save lecture recordings as MP3 to listen on the go or transcribe later.",
    },
    {
      title: "Video editors",
      body: "Grab a clean audio track from a clip to reuse as a voiceover or sound bite.",
    },
    {
      title: "Musicians",
      body: "Extract audio from your own performance videos at 320 kbps for demos and practice.",
    },
  ],
  faqs: [
    {
      q: "Is this video to MP3 converter free?",
      a: "Yes, it is completely free. There is no sign-up, no watermark and no limit on how many videos you convert. Because the conversion happens on your device, there are no server costs that would require a paid plan.",
    },
    {
      q: "Are my videos uploaded to your servers?",
      a: "No. The converter runs entirely in your browser using WebAssembly, so your video is never uploaded anywhere. That keeps personal and confidential recordings private, and it also means there is no waiting for uploads on slow connections.",
    },
    {
      q: "Which bitrate should I choose?",
      a: "Use 128 kbps for speech like podcasts and lectures, 192 kbps for a good balance with music and voice, and 320 kbps when you want the best possible sound. Higher bitrates create larger files and cannot improve audio that was low quality to begin with.",
    },
    {
      q: "What video formats can I convert to MP3?",
      a: "You can convert MP4, MOV, WebM and MKV files. That covers videos from most phones, cameras, screen recorders and editing apps. The output is a standard MP3 that plays on virtually any device or media player.",
    },
    {
      q: "Is there a file size limit?",
      a: "There is no fixed limit. The practical maximum depends on your device's memory, and files up to about 2 GB work well on most computers. Mobile browsers are supported but convert large files more slowly than desktop.",
    },
    {
      q: "Does it work on iPhone and Android?",
      a: "Yes. The converter works in current mobile browsers as well as desktop Chrome, Edge, Safari and Firefox. Conversion on phones is slower, so for long or large videos a laptop or desktop computer will give you the quickest results.",
    },
  ],
  related: ["audio-video-to-text", "video-trimmer", "video-compressor"],
};
