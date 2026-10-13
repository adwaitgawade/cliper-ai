import { CONTACT_EMAIL } from "../site";
import type { ContentPage } from "./types";

const email = `[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})`;

export const termsPage: ContentPage = {
  slug: "terms",
  name: "Terms of service",
  schemaType: "WebPage",
  seo: {
    title: "Terms of Service",
    description:
      "The terms for using ClipPro and its free video tools: accounts, credits and billing, who owns your content, acceptable use and our responsibilities.",
  },
  eyebrow: "Legal",
  h1: "Terms of service",
  subtitle: "The agreement between you and ClipPro when you use our website, our free tools and the ClipPro app.",
  updated: "2026-10-13",
  updatedLabel: "Effective",
  toc: true,
  sections: [
    {
      id: "agreement",
      heading: "Agreeing to these terms",
      blocks: [
        `These terms are a contract between you and ClipPro, Inc. ("ClipPro", "we", "us"). They cover this website, the [free tools](/tools) and the ClipPro app (together, the "service"). By using the service you agree to these terms and to our [privacy policy](/privacy). If you use ClipPro for a company or other organisation, you confirm you can accept these terms on its behalf, and "you" includes it.`,
      ],
    },
    {
      id: "eligibility",
      heading: "Who can use ClipPro",
      blocks: [
        "You must be at least 13 years old (16 in the European Economic Area and the UK) to use the service, and old enough to form a binding contract where you live, or have a parent or guardian's permission.",
      ],
    },
    {
      id: "accounts",
      heading: "Your account",
      blocks: [
        `Give us accurate information when you sign up and keep your password safe. You are responsible for what happens in your account and workspaces, including actions by people you invite. Tell us straight away at ${email} if you think someone has accessed your account without permission.`,
      ],
    },
    {
      id: "billing",
      heading: "Plans, credits and billing",
      blocks: [
        {
          list: [
            "The Free plan is free. Paid plans are billed monthly or yearly in advance and renew automatically until you cancel.",
            "One credit equals one minute of uploaded video. Unused credits roll over for one month and then expire. Credits have no cash value and can't be transferred.",
            "You can cancel at any time from your settings. You keep access to your paid plan until the end of the period you have paid for.",
            "Payments are non-refundable, except where the law requires a refund or we say otherwise in writing.",
            "Prices exclude taxes unless shown otherwise. If we change prices, we will tell you at least 30 days before the change applies to your next renewal.",
          ],
        },
      ],
    },
    {
      id: "content",
      heading: "Your content",
      blocks: [
        "You own the videos you upload and the clips, captions and other output ClipPro creates from them. To run the service, you give us a limited, worldwide, non-exclusive licence to store, process, copy and display your content only as needed to provide ClipPro to you, including posting it to platforms you connect. This licence ends when you delete the content or your account, except for copies in backups, which are overwritten on a rolling schedule.",
        "You confirm that you have the rights needed to upload, edit and publish your content, including permission from anyone who appears in it, and that it doesn't break any law or anyone else's rights.",
        "We don't use your content to train AI models unless you explicitly opt in.",
      ],
    },
    {
      id: "ai-output",
      heading: "AI-generated output",
      blocks: [
        "ClipPro uses AI to transcribe, select, score and caption clips. AI output can be wrong or incomplete: captions may contain mistakes, and a virality score is an estimate, not a promise of views. Review clips before you publish them. You are responsible for what you post.",
      ],
    },
    {
      id: "free-tools",
      heading: "Free tools and downloaders",
      blocks: [
        "The free tools are provided at no cost and without a sign-up. Most of them process files on your own device, so the results depend on your browser and hardware, and we can't recover files or results for you.",
        "The video and thumbnail downloaders are for content you own, content you have permission to download, or uses that the law allows, such as fair use. Downloading other people's videos may break the terms of the platform they're on or copyright law. You are responsible for how you use downloaded content, and you must follow the terms of YouTube, Instagram, TikTok and any other platform involved. ClipPro does not host or distribute the content you download.",
        "Tools marked \"coming soon\" are not available yet, and we may change, limit or remove any free tool at any time.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "Acceptable use",
      blocks: [
        "You agree not to use the service to:",
        {
          list: [
            "upload, create or share content that is illegal, infringes someone's rights, or is sexually explicit involving minors, hateful, harassing or violent;",
            "impersonate others or create misleading deepfakes of real people;",
            "send spam or break the rules of the platforms you post to;",
            "probe, scan, overload or attack the service, or get around usage limits, credits or security measures;",
            "use our download relay for anything other than the downloaders on this site, or to scrape at scale;",
            "copy, resell or reverse-engineer the service except where the law allows it.",
          ],
        },
      ],
    },
    {
      id: "third-parties",
      heading: "Third-party platforms",
      blocks: [
        "When you connect TikTok, Instagram, YouTube, LinkedIn, X or Facebook, your use of them is governed by their own terms and policies. We aren't responsible for those platforms, and they may change or stop the features ClipPro relies on, such as auto-posting.",
      ],
    },
    {
      id: "our-ip",
      heading: "Our service and feedback",
      blocks: [
        "ClipPro, including its software, design, caption styles, templates and brand, belongs to us and our licensors. These terms give you the right to use the service, not to own it. If you send us feedback or ideas, we may use them without owing you anything.",
      ],
    },
    {
      id: "copyright",
      heading: "Copyright complaints",
      blocks: [
        `If you believe content on ClipPro infringes your copyright, email ${email} with your contact details, the work you own, where the infringing material is and a statement that you believe in good faith the use isn't authorised. We remove infringing content and close the accounts of repeat infringers.`,
      ],
    },
    {
      id: "termination",
      heading: "Suspension and termination",
      blocks: [
        "You can stop using the service and delete your account at any time. We may suspend or close an account that breaks these terms or puts the service or other users at risk; where we reasonably can, we will tell you first and give you a chance to download your clips. Sections that by their nature should survive, such as content rights, disclaimers and limits on liability, continue after termination.",
      ],
    },
    {
      id: "disclaimers",
      heading: "Disclaimers",
      blocks: [
        "We work hard to keep ClipPro reliable, but the service is provided \"as is\" and \"as available\". To the extent the law allows, we disclaim all warranties, including merchantability, fitness for a particular purpose and non-infringement, and we don't promise that the service will be uninterrupted, error-free or that it will grow your audience.",
      ],
    },
    {
      id: "liability",
      heading: "Limitation of liability",
      blocks: [
        "To the extent the law allows, ClipPro is not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, data or goodwill. Our total liability for any claim relating to the service is limited to the greater of the amount you paid us in the 12 months before the claim and US$100. Nothing in these terms limits liability that can't be limited by law, and if you are a consumer, you keep any rights the law of your country gives you.",
      ],
    },
    {
      id: "indemnity",
      heading: "Indemnity",
      blocks: [
        "If someone makes a claim against ClipPro because of your content or your breach of these terms, you agree to cover the reasonable costs and losses that result, to the extent the law allows.",
      ],
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      blocks: [
        "We may update these terms as the service changes. We will update the effective date at the top of this page and, for significant changes, tell signed-in users by email or in the app at least 30 days before they take effect. If you keep using ClipPro after that, the new terms apply; if you don't agree, you can cancel before they take effect.",
      ],
    },
    {
      id: "law",
      heading: "Governing law and disputes",
      blocks: [
        `These terms are governed by the laws of the jurisdiction where ClipPro, Inc. is incorporated, without regard to conflict-of-law rules. Before starting a formal dispute, please email ${email} so we can try to resolve it informally. If you are a consumer, you may also bring a claim in the courts where you live.`,
      ],
    },
    {
      id: "contact",
      heading: "Contact us",
      blocks: [`Questions about these terms: ${email}.`],
    },
  ],
};
