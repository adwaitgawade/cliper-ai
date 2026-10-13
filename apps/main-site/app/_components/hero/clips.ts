// Placeholder 9:16 clips (Mixkit free license). Swap `src` for real ClipPro outputs.
export type Platform = "instagram" | "tiktok" | "youtube";

export type HeroClip = {
  label: string;
  score: number;
  duration: string;
  src: string;
  // Which app UI the phone shows for this clip, and the post copy it displays
  platform: Platform;
  handle: string;
  caption: string;
  likes: string;
  comments: string;
  reposts: string;
  shares: string;
  tags: string;
};

const mixkit = (id: number) =>
  `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`;

export const HERO_CLIPS: HeroClip[] = [
  {
    label: "Podcast",
    score: 94,
    duration: "0:42",
    src: mixkit(34487),
    platform: "instagram",
    handle: "thedailymic",
    caption: "The hot take nobody saw coming 🎙️",
    likes: "823K",
    comments: "9.5K",
    reposts: "2.7K",
    shares: "15.1K",
    tags: "#podcast #hottake",
  },
  {
    label: "Fashion",
    score: 88,
    duration: "0:28",
    src: mixkit(34404),
    platform: "tiktok",
    handle: "studio.noir",
    caption: "Desert fit check, no filter",
    likes: "412K",
    comments: "3.1K",
    reposts: "1.2K",
    shares: "8.4K",
    tags: "#ootd #fitcheck",
  },
  {
    label: "Travel",
    score: 91,
    duration: "0:35",
    src: mixkit(39767),
    platform: "youtube",
    handle: "weekend.trails",
    caption: "Tiny hiker, big summit energy",
    likes: "268K",
    comments: "2.2K",
    reposts: "940",
    shares: "5.6K",
    tags: "#hiking #familytime",
  },
  {
    label: "Studio",
    score: 86,
    duration: "0:51",
    src: mixkit(34421),
    platform: "instagram",
    handle: "lensandlight",
    caption: "Behind the shot ✨",
    likes: "157K",
    comments: "1.4K",
    reposts: "610",
    shares: "3.9K",
    tags: "#bts #photography",
  },
  {
    label: "Lifestyle",
    score: 90,
    duration: "0:22",
    src: mixkit(43006),
    platform: "tiktok",
    handle: "loudandproud",
    caption: "Wear it. Say it. Mean it.",
    likes: "1.2M",
    comments: "18K",
    reposts: "6.3K",
    shares: "41K",
    tags: "#pride #loveislove",
  },
  {
    label: "Music",
    score: 97,
    duration: "0:30",
    src: mixkit(49999),
    platform: "youtube",
    handle: "neon.sessions",
    caption: "When the drop hits under UV 💜",
    likes: "2.4M",
    comments: "31K",
    reposts: "12K",
    shares: "88K",
    tags: "#uvparty #edm",
  },
  {
    label: "Beauty",
    score: 89,
    duration: "0:26",
    src: mixkit(52280),
    platform: "instagram",
    handle: "glowroutine",
    caption: "Editorial look in 60 seconds",
    likes: "596K",
    comments: "7.8K",
    reposts: "2.1K",
    shares: "19K",
    tags: "#makeup #editorial",
  },
  {
    label: "Cinematic",
    score: 92,
    duration: "0:38",
    src: mixkit(34560),
    platform: "tiktok",
    handle: "citycolour",
    caption: "Under the overpass, after dark",
    likes: "341K",
    comments: "2.9K",
    reposts: "1.5K",
    shares: "7.2K",
    tags: "#cityscape #nightwalk",
  },
];
