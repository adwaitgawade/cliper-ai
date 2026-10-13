import { LINKS, SALES_EMAIL } from "../site";

// Plain data (no "use client") so server code — structured data, pricing.md, llms.txt — can read the same plans.
export type Plan = {
  name: string;
  blurb: string;
  monthly: number | null;
  annual: number | null;
  credits: string;
  cta: string;
  href: string;
  featured?: boolean;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    name: "Free",
    blurb: "Try ClipPro on your own videos.",
    monthly: 0,
    annual: 0,
    credits: "60 credits / month",
    cta: "Start free",
    href: LINKS.signUp,
    features: ["AI clipping & virality score", "Animated captions", "720p export with watermark", "Clips kept for 3 days"],
  },
  {
    name: "Starter",
    blurb: "For creators posting a few times a week.",
    monthly: 15,
    annual: 12,
    credits: "150 credits / month",
    cta: "Get Starter",
    href: LINKS.signUp,
    features: ["Everything in Free", "No watermark, 1080p export", "AI reframe & speaker tracking", "1 brand kit", "Clips kept for 30 days"],
  },
  {
    name: "Pro",
    blurb: "For creators and teams posting daily.",
    monthly: 29,
    annual: 23,
    credits: "300 credits / month",
    cta: "Get Pro",
    href: LINKS.signUp,
    featured: true,
    features: [
      "Everything in Starter",
      "AI B-roll, emoji & SFX",
      "Auto-post to 6 platforms",
      "XML export to Premiere & DaVinci",
      "10 brand kits, 2 seats",
      "4K export",
    ],
  },
  {
    name: "Business",
    blurb: "For agencies and content studios.",
    monthly: null,
    annual: null,
    credits: "Custom credits",
    cta: "Talk to sales",
    href: `mailto:${SALES_EMAIL}`,
    features: ["Everything in Pro", "Unlimited workspaces & seats", "REST API & webhooks", "SSO / SAML", "Dedicated success manager"],
  },
];

export const PRICING_NOTE = "1 credit = 1 minute of uploaded video. Unused credits roll over for one month.";
export const PRICING_FOOTNOTE =
  "All plans include unlimited projects, 30+ caption languages and cancel-anytime billing. Students & nonprofits get 50% off.";
