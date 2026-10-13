import Link from "next/link";
import { LINKS } from "../site";

/** Header for inner pages (the home page uses the hero's own nav). Sits on a dark stage panel. */
export function SiteHeader() {
  return (
    <header className="relative z-10 flex items-center justify-between gap-4 py-2">
      <Link href="/" className="font-heading font-soft text-[1.45rem] font-semibold tracking-[-0.03em] text-cream">
        clippro
      </Link>
      <nav
        aria-label="Main"
        className="hidden gap-0.5 rounded-[14px] border border-white/12 bg-white/10 p-1 text-sm font-medium backdrop-blur-md md:flex"
      >
        {[
          ["Features", "/#features"],
          ["Pricing", "/#pricing"],
          ["Free tools", "/tools"],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="rounded-[10px] px-3.5 py-2 text-cream/80 transition-colors hover:bg-white/10 hover:text-cream">
            {label}
          </Link>
        ))}
        <a href={LINKS.signUp} className="rounded-[10px] bg-ink px-3.5 py-2 text-cream hover:bg-black">
          Get started
        </a>
      </nav>
      <a
        href={LINKS.signIn}
        className="rounded-[10px] border border-white/12 bg-white/10 px-3.5 py-2 text-sm font-medium text-cream/85 hover:text-cream"
      >
        Log in
      </a>
    </header>
  );
}
