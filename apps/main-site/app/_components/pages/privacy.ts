import { CONTACT_EMAIL } from "../site";
import type { ContentPage } from "./types";

const email = `[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})`;

export const privacyPage: ContentPage = {
  slug: "privacy",
  name: "Privacy policy",
  schemaType: "WebPage",
  seo: {
    title: "Privacy Policy",
    description:
      "How ClipPro handles your data: free tools process files in your browser, no ad trackers, and your videos are never used to train AI without your opt-in.",
  },
  eyebrow: "Legal",
  h1: "Privacy policy",
  subtitle:
    "What ClipPro collects, why, who processes it and the choices you have. Written to be read, not skimmed past.",
  updated: "2026-10-13",
  updatedLabel: "Effective",
  toc: true,
  sections: [
    {
      id: "summary",
      heading: "The short version",
      blocks: [
        {
          list: [
            "Our free tools process your files inside your browser. The videos and audio you open in them are not uploaded to ClipPro.",
            "This website sets no cookies and runs no advertising or analytics trackers.",
            "When you use the ClipPro app, we store your account details and the videos you upload so we can make your clips, and we delete clips on the schedule of your plan.",
            "We never sell your personal information, and we never use your videos to train AI models without your explicit opt-in.",
            `You can ask to see, export or delete your data at any time by emailing ${email}.`,
          ],
        },
      ],
    },
    {
      id: "who-we-are",
      heading: "Who we are",
      blocks: [
        `ClipPro, Inc. ("ClipPro", "we", "us") runs this website, the [free tools](/tools) and the ClipPro app. We are the controller of the personal information described in this policy. You can reach us about privacy at any time at ${email}.`,
      ],
    },
    {
      id: "free-tools",
      heading: "Our free tools",
      blocks: [
        "The free video and audio tools (for example the transcriber, subtitle generator, resizer, trimmer, compressor and converters) decode, edit and encode your files inside your browser tab with WebCodecs, WebAssembly and on-device AI models. The file you choose, its transcript and the output never reach our servers, and we can't see them.",
        "To process files on your device, some tools first download software into your browser. Those requests go straight from your browser to the provider and reveal your IP address to them, as any web request does:",
        {
          list: [
            "Speech recognition models from Hugging Face (huggingface.co), used by the transcription and subtitle tools.",
            "The Python runtime and the open-source yt-dlp library from jsDelivr and the Python Package Index, used by the downloaders.",
            "Thumbnail images from YouTube (i.ytimg.com), used by the YouTube thumbnail downloader.",
          ],
        },
        "The Instagram and YouTube downloaders work out where a video is stored in your browser, but browsers aren't allowed to fetch those files directly, so the requests pass through a relay on our server. The relay forwards the link you entered and the video data between your browser and the platform. It does not save the video or keep a record of what you downloaded, beyond the standard server logs described below.",
      ],
    },
    {
      id: "collect",
      heading: "Information we collect",
      blocks: [
        "When you visit this website, our hosting provider records standard server logs: your IP address, browser type, the page requested, the referring page and the time. We use these only to keep the site secure and working, and they are kept for a limited period.",
        "When you use the ClipPro app, we also collect:",
        {
          list: [
            "Account details: your email address, a securely hashed password, your workspace name and the people you invite to it.",
            "Your content: the videos you upload or link to, and what we create from them, such as transcripts, clips, captions, scores and brand kit files.",
            "Connected accounts: if you connect TikTok, Instagram, YouTube, LinkedIn, X or Facebook to post clips, the access tokens those platforms give us and the posts you schedule.",
            "Usage data: which features you use, credits consumed, errors and device information, used to run and improve the service.",
            "Billing details: your plan and invoices. Card numbers are handled by our payment processor; we never see or store them.",
            "Messages you send us, such as support emails.",
          ],
        },
      ],
    },
    {
      id: "use",
      heading: "How we use your information",
      blocks: [
        {
          list: [
            "To provide ClipPro: transcribing your videos, finding and scoring moments, rendering clips and posting them where you ask.",
            "To run your account, process payments and send service messages such as receipts, security alerts and changes to these policies.",
            "To keep ClipPro secure, prevent abuse and fix problems.",
            "To improve the product using aggregated usage data.",
            "To reply to you when you contact us.",
            "To meet legal obligations.",
          ],
        },
        "Where the law asks for a legal basis, we rely on performing our contract with you, our legitimate interest in running a secure and useful service, your consent (which you can withdraw at any time) and our legal obligations.",
      ],
    },
    {
      id: "ai",
      heading: "How AI processes your videos",
      blocks: [
        "To make clips, ClipPro turns your video's speech into text, either on our own servers or through a speech-to-text provider, and uses AI language models to read the transcript and score moments. These providers process your content only to return results to us, under contracts that don't allow them to use it for their own purposes.",
        "We do not use your videos, transcripts or clips to train AI models, ours or anyone else's, unless you explicitly opt in.",
      ],
    },
    {
      id: "sharing",
      heading: "Who we share information with",
      blocks: [
        "We don't sell or rent your personal information, and we don't share it for advertising. We share it only with:",
        {
          list: [
            "Service providers who run parts of ClipPro for us: hosting, file storage, authentication, speech-to-text, AI model providers, payments and email delivery. They may only use it to provide their service to us.",
            "Social platforms you connect, when you ask us to post a clip there.",
            "Members of your workspace, who can see the content shared in it.",
            "Authorities, when the law requires it or to protect the rights and safety of our users or the public.",
            "A buyer or successor, if ClipPro is involved in a merger or acquisition, in which case this policy continues to protect your information.",
          ],
        },
      ],
    },
    {
      id: "cookies",
      heading: "Cookies and browser storage",
      blocks: [
        "This marketing website and its free tools set no cookies and run no analytics, advertising or tracking scripts.",
        "Your browser may cache the AI models and software the free tools download, so they load faster next time. That cache stays on your device and you can clear it in your browser settings at any time.",
        "The ClipPro app uses strictly necessary cookies and browser storage to keep you signed in and remember your settings. We don't use them to track you across other websites.",
      ],
    },
    {
      id: "retention",
      heading: "How long we keep information",
      blocks: [
        "Clips are kept for as long as your plan allows (for example 3 days on the Free plan and 30 days on Starter) and are then deleted. Source videos and transcripts are kept while you need them to make clips and are deleted with the project.",
        "Account information is kept while your account is open. When you delete your account, we delete your personal information and content within 30 days, except for records we must keep for legal, tax or accounting reasons, and backups, which are overwritten on a rolling schedule.",
      ],
    },
    {
      id: "security",
      heading: "How we protect information",
      blocks: [
        "We encrypt data in transit with TLS, store passwords only as secure hashes, limit staff access to what their job needs and keep content in access-controlled storage. No service can promise perfect security, so if we learn of a breach that affects you, we will tell you and the relevant authorities as the law requires.",
      ],
    },
    {
      id: "rights",
      heading: "Your rights and choices",
      blocks: [
        "Depending on where you live, including under the GDPR, the UK GDPR and California law, you have the right to:",
        {
          list: [
            "access the personal information we hold about you and get a copy in a portable format;",
            "correct information that is wrong;",
            "delete your information;",
            "object to or restrict certain processing;",
            "withdraw consent you have given;",
            "not be treated differently for exercising these rights.",
          ],
        },
        `To use any of these rights, email ${email} from the address on your account. We reply within 30 days. You also have the right to complain to your local data protection authority.`,
      ],
    },
    {
      id: "transfers",
      heading: "International transfers",
      blocks: [
        "ClipPro and its service providers may process information in countries other than yours, including the United States. When we transfer personal information out of the European Economic Area or the UK, we use safeguards recognised by law, such as the European Commission's Standard Contractual Clauses.",
      ],
    },
    {
      id: "children",
      heading: "Children",
      blocks: [
        `ClipPro is not directed to children under 13, or under 16 in the European Economic Area and the UK, and we don't knowingly collect their personal information. If you think a child has given us information, email ${email} and we will delete it.`,
      ],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      blocks: [
        "If we change this policy, we will update the effective date at the top of this page. If the change is significant, we will also tell signed-in users by email or in the app before it takes effect.",
      ],
    },
    {
      id: "contact",
      heading: "Contact us",
      blocks: [
        `Questions about this policy or your data: ${email}. See also our [terms of service](/terms).`,
      ],
    },
  ],
};
