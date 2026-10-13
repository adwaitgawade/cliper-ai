import Link from "next/link";
import { LinkIcon } from "../../ui/icons";

/** Placeholder for downloaders, which need a server (CORS) and are disabled on this client-only site. */
export function DownloaderWidget({ platform }: { platform: string }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 rounded-2xl border border-ink/10 bg-white p-2 opacity-70 sm:flex-row" aria-disabled>
        <label className="flex flex-1 items-center gap-3 px-3">
          <LinkIcon className="shrink-0 text-muted" />
          <span className="sr-only">{platform} link</span>
          <input disabled placeholder={`Paste ${/^[aeiou]/i.test(platform) ? "an" : "a"} ${platform} link`} className="h-12 w-full cursor-not-allowed bg-transparent text-[15px]" />
        </label>
        <button type="button" disabled className="h-12 cursor-not-allowed rounded-xl bg-ink/40 px-6 text-[15px] font-semibold text-cream">
          Download
        </button>
      </div>
      <div className="rounded-2xl bg-accent-soft/50 p-5 text-center">
        <p className="font-semibold">
          <span className="mr-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">Coming soon</span>
          The {platform} downloader is on its way.
        </p>
        <p className="mt-2 text-sm text-muted">
          Meanwhile, these free tools already work right in your browser:{" "}
          <Link href="/tools/video-trimmer" className="font-semibold text-ink underline underline-offset-4">
            Video Trimmer
          </Link>
          ,{" "}
          <Link href="/tools/video-resizer" className="font-semibold text-ink underline underline-offset-4">
            Video Resizer
          </Link>{" "}
          and{" "}
          <Link href="/tools/video-to-mp3" className="font-semibold text-ink underline underline-offset-4">
            Video to MP3
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
