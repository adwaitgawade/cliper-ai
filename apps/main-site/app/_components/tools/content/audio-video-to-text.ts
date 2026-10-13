import type { ToolContent } from "./types";

export const audioVideoToText: ToolContent = {
  slug: "audio-video-to-text",
  name: "Audio & Video to Text Converter",
  category: "transcribe",
  status: "live",
  widget: "transcribe-text",
  cardDescription:
    "Turn audio and video files into text with AI transcription that runs privately in your browser.",
  seo: {
    title: "Audio to Text Converter - Free AI Video Transcription",
    description:
      "Free audio to text and video to text converter. AI transcription runs in your browser, so files never leave your device. No sign-up. Try it now.",
    keywords: [
      "audio to text",
      "video to text converter",
      "transcribe audio to text free",
      "mp4 to text",
      "ai transcription online",
      "transcribe video to text",
      "speech to text from file",
      "private transcription no upload",
    ],
  },
  h1: "Free Audio to Text and Video to Text Converter",
  subtitle:
    "Drop in a recording and get a clean, editable transcript in minutes. The AI runs entirely in your browser, so your audio never leaves your device.",
  steps: [
    {
      title: "Add your file",
      body: "Drag in an MP4, MOV, WebM, MKV, MP3, WAV, M4A or OGG file, or click to browse. Nothing is uploaded.",
    },
    {
      title: "Start transcribing",
      body: "Pick a language or leave it on auto-detect. The first run downloads the AI model once, then it is cached.",
    },
    {
      title: "Copy or download the text",
      body: "Toggle timestamps on or off, then copy the transcript to your clipboard or save it as a .txt file.",
    },
  ],
  features: [
    {
      title: "100% private",
      body: "Transcription happens on your own device. Your audio and video are never sent to a server.",
    },
    {
      title: "About 99 languages",
      body: "Powered by OpenAI's open-source Whisper model, with automatic language detection built in.",
    },
    {
      title: "Optional timestamps",
      body: "Add timestamps to find quotes fast, or turn them off for clean text you can paste anywhere.",
    },
    {
      title: "Free with no limits",
      body: "No sign-up, no watermark and no daily caps. Transcribe as many files as you like.",
    },
    {
      title: "Works offline once loaded",
      body: "After the model is cached, you can keep transcribing even without an internet connection.",
    },
  ],
  sections: [
    {
      heading: "What this audio to text converter does",
      paragraphs: [
        "This tool turns spoken words in an audio or video file into plain, editable text. You can transcribe a podcast episode, a recorded Zoom call, a voice memo, a lecture or a YouTube video you made yourself, and get a transcript you can search, quote, edit and repurpose. It accepts the formats people actually have on hand: MP4, MOV, WebM and MKV for video, plus MP3, WAV, M4A and OGG for audio. There is no account to create and no watermark or usage cap, so it works just as well for a one-off interview as it does for a weekly content routine.",
        "Unlike most online transcription services, this video to text converter never uploads your file. That matters when the recording contains client conversations, unreleased content or anything personal. Because the processing happens locally, there is also no queue and no waiting for a server to pick up your job. The practical limit is your device's memory, and files up to roughly 2 GB work well on most modern computers. Phones can run it too, just more slowly.",
      ],
    },
    {
      heading: "How browser-based AI transcription works",
      paragraphs: [
        "Under the hood, the tool runs Whisper, an open-source speech recognition model released by OpenAI, directly inside your browser using WebAssembly and, where available, WebGPU. The first time you use it, your browser downloads the model once (about 80 MB) and caches it. After that, every transcription starts right away and can even work offline. The tool first extracts the audio track from your file, converts it to the format the model expects, then processes it in short chunks and stitches the results into a single transcript.",
        "Speed depends on your hardware. On a recent laptop with Chrome or Edge, WebGPU lets the model use your graphics chip and transcription runs much faster. Without WebGPU, it falls back to the CPU, which still works but takes longer for long recordings. Whisper supports around 99 languages and can detect the spoken language automatically, though choosing the language yourself can help with short clips or recordings that mix languages.",
      ],
    },
    {
      heading: "Tips for a cleaner transcript",
      paragraphs: [
        "Transcript quality depends mostly on the recording. Clear speech close to the microphone, low background noise and one person talking at a time give the best results. If your video has loud music under the dialogue, expect a few more mistakes in those sections. For very long files, consider trimming out dead air or intros first, which shortens processing time. Our free video trimmer can do that in the browser as well, without uploading anything.",
        "Use the timestamps toggle based on what you plan to do next. Timestamps are handy for finding a quote in a two-hour interview, writing show notes or picking moments to clip. Turn them off when you want clean paragraphs for a blog post, newsletter or captions draft. Always skim names, brand terms and numbers before publishing, since those are the words any speech model is most likely to get wrong. And if you would rather skip the manual work of finding the best moments, ClipPro can turn long videos into short clips automatically.",
      ],
    },
  ],
  useCases: [
    {
      title: "Podcasters",
      body: "Turn episodes into show notes, blog posts and quotable lines without paying per minute.",
    },
    {
      title: "Video creators",
      body: "Get a script of your long-form videos to plan short clips, titles and descriptions.",
    },
    {
      title: "Students and researchers",
      body: "Transcribe lectures and interviews privately, with timestamps to jump back to key points.",
    },
    {
      title: "Journalists and teams",
      body: "Convert sensitive interviews and meetings to text without sending recordings to a third party.",
    },
  ],
  faqs: [
    {
      q: "Is this audio to text converter really free?",
      a: "Yes. It is completely free with no sign-up, no watermark and no daily limits. Because the transcription runs on your own device rather than on our servers, there is no per-minute cost for us to pass on to you.",
    },
    {
      q: "Is my audio uploaded anywhere?",
      a: "No. Your file is processed entirely in your browser using WebAssembly and WebGPU. It is never uploaded to any server, which makes the tool a good fit for confidential interviews, meetings and personal recordings. Once the page and model are loaded, it even works offline.",
    },
    {
      q: "What file formats and sizes can I transcribe?",
      a: "You can transcribe MP4, MOV, WebM and MKV video files, plus MP3, WAV, M4A and OGG audio. The practical size limit depends on your device's memory, and we recommend files up to about 2 GB for smooth results.",
    },
    {
      q: "Which languages are supported?",
      a: "The tool uses OpenAI's Whisper model, which supports around 99 languages. It detects the spoken language automatically, or you can pick it yourself, which often helps with short recordings or speakers with strong accents.",
    },
    {
      q: "Why is the first transcription slower?",
      a: "On first use, your browser downloads the AI model once, which is about 80 MB, and caches it. Later transcriptions skip that step. Overall speed depends on your device and is much faster in recent Chrome or Edge on computers that support WebGPU.",
    },
    {
      q: "Can I get timestamps in the transcript?",
      a: "Yes. Use the timestamps toggle to include them in the output, or switch it off for clean text. You can copy the result to your clipboard or download it as a .txt file. If you need subtitle files instead, use our subtitle generator.",
    },
  ],
  related: ["subtitle-generator", "video-to-mp3", "video-trimmer"],
};
