import Link from "next/link";
import { LINKS } from "../site";
import { TOOLS } from "../tools/registry";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["Features", "/#features"],
      ["How it works", "/#how"],
      ["Pricing", "/#pricing"],
      ["API", "#"],
      ["Changelog", "#"],
    ],
  },
  {
    title: "Use cases",
    links: [
      ["Podcasters", "#"],
      ["Creators", "#"],
      ["Agencies", "#"],
      ["Marketing teams", "#"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Help center", "#"],
      ["Caption styles", "#"],
      ["Blog", "#"],
      ["FAQ", "/#faq"],
    ],
  },
  {
    title: "Free tools",
    links: [
      ...TOOLS.filter((t) => t.status === "live")
        .slice(0, 5)
        .map((t): [string, string] => [t.name.replace(/ \(.*\)$/, ""), `/tools/${t.slug}`]),
      ["All free tools", "/tools"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "#"],
      ["Careers", "#"],
      ["Affiliates", "#"],
      ["Contact", "mailto:hello@clippro.ai"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="overflow-hidden rounded-[22px] bg-ink px-5 pt-16 text-cream sm:rounded-[28px] sm:px-10">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-3 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
        <div>
          <p className="font-heading font-soft text-2xl font-semibold tracking-tight">clippro</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-cream/60">
            AI that turns your long videos into short clips people actually watch.
          </p>
          <a
            href={LINKS.signUp}
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-cream px-4 text-sm font-semibold text-ink transition-colors hover:bg-white"
          >
            Get started free
          </a>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-cream/45">{col.title}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  {href.startsWith("/") ? (
                    <Link href={href} className="text-cream/75 transition-colors hover:text-cream">
                      {label}
                    </Link>
                  ) : (
                    <a href={href} className="text-cream/75 transition-colors hover:text-cream">
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-4 border-t border-white/10 py-6 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 ClipPro, Inc. All rights reserved.</span>
        <span className="flex gap-5">
          <a href="#" className="hover:text-cream">
            Privacy
          </a>
          <a href="#" className="hover:text-cream">
            Terms
          </a>
          <a href="#" className="hover:text-cream">
            Cookies
          </a>
        </span>
      </div>

      <p
        aria-hidden
        className="pointer-events-none -mb-[0.22em] select-none text-center font-heading font-soft text-[24vw] font-semibold leading-none tracking-[-0.06em] text-white/[0.06]"
      >
        clippro
      </p>
    </footer>
  );
}
