import type { ToolContent } from "./types";

export const videoToGif: ToolContent = {
  slug: "video-to-gif",
  name: "Video to GIF Converter",
  category: "edit",
  status: "live",
  widget: "gif",
  cardDescription:
    "Turn any section of a video into a looping GIF, with simple frame rate and size controls. No upload.",
  seo: {
    title: "Video to GIF Converter - Free MP4 to GIF Maker",
    description:
      "Convert video to GIF for free in your browser. Pick a section, frame rate and width, then get a looping GIF with its file size shown. No upload. Try it.",
    keywords: [
      "video to gif",
      "video to gif converter",
      "mp4 to gif",
      "make a gif from a video",
      "gif maker",
      "convert video to gif",
      "mov to gif",
      "gif maker no watermark",
    ],
  },
  h1: "Video to GIF Converter",
  subtitle:
    "Turn the best few seconds of any video into a looping GIF for chats, docs and websites. Everything is made on your device, with no upload.",
  steps: [
    {
      title: "Add your video",
      body: "Choose an MP4, MOV, WebM or MKV file. It stays on your device the whole time.",
    },
    {
      title: "Pick the section and size",
      body: "Set the start and end points, then choose 10, 15 or 20 fps and a width of 320, 480 or 640 px.",
    },
    {
      title: "Download the GIF",
      body: "Create the looping GIF, check its file size, and save it to share anywhere.",
    },
  ],
  features: [
    {
      title: "Choose any section",
      body: "Set exact start and end points to capture just the moment you want.",
    },
    {
      title: "Simple quality controls",
      body: "Pick 10, 15 or 20 fps and a width of 320, 480 or 640 px. Height follows the aspect ratio.",
    },
    {
      title: "File size shown",
      body: "See how big the GIF is before you download it, so you can adjust settings if needed.",
    },
    {
      title: "Loops forever",
      body: "Every GIF repeats endlessly, just like the reaction GIFs people expect.",
    },
    {
      title: "Made in your browser",
      body: "The GIF is encoded on your device. Your video is never uploaded anywhere.",
    },
    {
      title: "Free, no watermark",
      body: "No sign-up, no daily limits and no logo stamped on your GIF.",
    },
  ],
  sections: [
    {
      heading: "Convert video to GIF right in your browser",
      paragraphs: [
        "GIFs are still one of the easiest ways to share a short moving moment. They play automatically, loop endlessly and work in chat apps, documents, emails and web pages where a video player might not. This video to GIF converter lets you pick a section of an MP4, MOV, WebM or MKV file, choose a frame rate and width, and get a looping GIF in a few seconds. The tool shows the resulting file size so you know whether it will fit where you want to post it.",
        "The GIF is encoded inside your browser with WebAssembly, so your video is never uploaded to a server. That means no waiting for an upload, no queue and no risk of private footage ending up on someone else's computer. It is free, with no sign-up, no watermark and no daily limits. You can start from long recordings too, since only the section you choose is converted, and source files up to about 2 GB work well on most computers.",
      ],
    },
    {
      heading: "Why GIFs get big, and how to keep them small",
      paragraphs: [
        "The GIF format dates back to the late 1980s and was never designed for video. Each frame can use at most 256 colors, and its compression is far less efficient than modern video codecs. As a result, a few seconds of footage can produce a GIF many times larger than the same clip as an MP4. Smooth gradients and detailed scenes also need more data, because the encoder has to approximate colors the format cannot show directly.",
        "Three settings control most of the file size. Length matters most, so keep GIFs short; they work best under about 15 seconds, and a 2 to 5 second loop is often ideal. Frame rate comes next: 10 fps is fine for reactions and screen captures, while 15 or 20 fps looks smoother for fast motion but adds more frames. Width matters too, since 320 px holds far fewer pixels than 640 px. Many chat apps and sites cap uploads at a few MB, so check the size shown before you download. If a GIF still comes out too large, our animated WebP maker usually produces a much smaller, full-color file from the same clip.",
      ],
    },
    {
      heading: "Choosing the right settings for your GIF",
      paragraphs: [
        "For a reaction GIF or a quick moment to drop into a chat, 320 or 480 px at 10 fps keeps the file small and loads quickly on phones. For product demos, UI walkthroughs and tutorials embedded in documentation, 480 or 640 px at 15 fps keeps on-screen text readable while staying manageable. Reserve 20 fps for short clips with fast motion, such as sports highlights or gaming moments, where choppiness would be noticeable.",
        "If a GIF comes out larger than you need, trim a second or two off the section first, then lower the frame rate, then drop the width. Scenes with less movement and simpler backgrounds also compress better. When the destination supports video, a short MP4 will usually look better at a smaller size than a GIF. If you are cutting many short moments from long videos for social media, ClipPro can find the highlights and create vertical clips automatically.",
      ],
    },
  ],
  useCases: [
    {
      title: "Reactions and memes",
      body: "Clip a funny moment from a video and share it as a reaction GIF in any chat.",
    },
    {
      title: "Product demos and docs",
      body: "Show a feature or workflow in a looping GIF inside READMEs, help articles and emails.",
    },
    {
      title: "Social and community posts",
      body: "Share highlights in forums, Slack, Discord and other places that autoplay GIFs.",
    },
    {
      title: "Website and blog visuals",
      body: "Add short looping animations to pages and posts without embedding a video player.",
    },
  ],
  faqs: [
    {
      q: "How do I convert a video to a GIF?",
      a: "Open your video in this tool, set the start and end of the section you want, choose a frame rate and width, then create the GIF. The file size is shown, and you can download the looping GIF right away. Nothing is uploaded.",
    },
    {
      q: "Can I convert MP4 to GIF for free?",
      a: "Yes. This MP4 to GIF converter is completely free, with no sign-up, no watermark and no daily limits. It also accepts MOV, WebM and MKV files, and works in current Chrome, Edge, Safari and Firefox.",
    },
    {
      q: "How long can my GIF be?",
      a: "There is no strict limit, but GIFs work best under about 15 seconds. Because the format is inefficient, longer GIFs quickly grow to many megabytes, which makes them slow to load and too large for many chat apps and sites.",
    },
    {
      q: "How do I make a GIF smaller?",
      a: "Shorten the section first, since length has the biggest effect. Then lower the frame rate to 10 fps and reduce the width to 480 or 320 px. Scenes with less motion and simpler colors also produce smaller files.",
    },
    {
      q: "Why does my GIF look grainy or banded?",
      a: "GIFs can use only 256 colors per frame, so smooth gradients, skies and skin tones are approximated with patterns or visible steps. This is a limit of the GIF format itself. Footage with bold, flat colors converts with the best results.",
    },
    {
      q: "Does the GIF loop automatically?",
      a: "Yes. Every GIF created with this tool is set to loop forever, so it repeats continuously wherever it is shown, just like the GIFs people are used to seeing in chats and on websites.",
    },
  ],
  related: ["video-trimmer", "extract-frame-from-video", "video-compressor"],
};
