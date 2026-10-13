// Placeholder 9:16 clips (Mixkit free license). Swap `src` for real ClipPro outputs.
export type HeroClip = {
  label: string;
  score: number;
  duration: string;
  src: string;
};

const mixkit = (id: number) => `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`;

export const HERO_CLIPS: HeroClip[] = [
  { label: "Podcast", score: 94, duration: "0:42", src: mixkit(34487) },
  { label: "Fashion", score: 88, duration: "0:28", src: mixkit(34404) },
  { label: "Travel", score: 91, duration: "0:35", src: mixkit(39767) },
  { label: "Studio", score: 86, duration: "0:51", src: mixkit(34421) },
  { label: "Lifestyle", score: 90, duration: "0:22", src: mixkit(43006) },
  { label: "Music", score: 97, duration: "0:30", src: mixkit(49999) },
  { label: "Beauty", score: 89, duration: "0:26", src: mixkit(52280) },
  { label: "Cinematic", score: 92, duration: "0:38", src: mixkit(34560) },
];
