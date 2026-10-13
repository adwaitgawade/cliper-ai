import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { AuthShowcase } from "@/components/auth/auth-showcase";

// The marketing site (apps/main-site); the link is hidden when it isn't configured.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // A floating card on the lilac frame: violet stage on the left, form on the right.
    <div className="flex min-h-svh items-center justify-center bg-frame p-2 sm:p-6 lg:p-10">
      <div className="grid w-full max-w-6xl gap-2.5 rounded-[1.75rem] bg-background p-2.5 shadow-2xl shadow-black/20 lg:min-h-[44rem] lg:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden flex-col overflow-hidden rounded-[1.25rem] bg-stage-gradient p-8 text-cream lg:flex">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(45% 40% at 70% 32%, rgba(140, 108, 255, 0.5), transparent 70%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-28 flex justify-center gap-5"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="aspect-[9/16] w-32 rounded-2xl border border-white/15 bg-white/5 shadow-xl shadow-black/30 backdrop-blur-sm"
                style={{
                  transform: `translateY(${Math.abs(i - 1) * 32}px) rotate(${(i - 1) * 6}deg)`,
                }}
              >
                <div className="mx-4 mt-[110%] h-2 rounded bg-white/70" />
                <div className="mx-7 mt-1.5 h-2 rounded bg-[#facc15]" />
              </div>
            ))}
          </div>
          <div className="relative flex items-center justify-between">
            <Logo className="text-cream" />
            {SITE_URL && (
              <a
                href={SITE_URL}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm text-cream backdrop-blur-sm transition hover:bg-white/20"
              >
                Back to website <ArrowRight className="size-4" />
              </a>
            )}
          </div>
          <div className="relative mt-auto pb-4">
            <AuthShowcase />
          </div>
        </div>
        <div className="flex flex-col p-6 sm:p-10 lg:px-14">
          <Logo className="lg:hidden" />
          <div className="flex flex-1 items-center py-10 lg:py-0">
            <div className="mx-auto w-full max-w-md">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
