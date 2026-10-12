"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Clip } from "@/lib/api/client";
import { useTranscript } from "@/lib/api/hooks";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const SPEAKER_COLORS = [
  "text-chart-1",
  "text-chart-2",
  "text-chart-3",
  "text-chart-4",
  "text-chart-5",
];

export function TranscriptView({
  jobId,
  clips,
  ready,
}: {
  jobId: string;
  clips: Clip[];
  ready: boolean;
}) {
  const transcript = useTranscript(jobId, ready);
  const [query, setQuery] = useState("");

  const speakers = useMemo(() => {
    const ids = [
      ...new Set(transcript.data?.sentences.map((s) => s.speaker) ?? []),
    ];
    return new Map(
      ids.map((id, i) => [
        id,
        {
          label: `Speaker ${i + 1}`,
          color: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
        },
      ]),
    );
  }, [transcript.data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (transcript.data?.sentences ?? [])
      .filter((s) => !q || s.text.toLowerCase().includes(q))
      .map((s) => ({
        ...s,
        clips: clips.filter((c) => s.end > c.start && s.start < c.end),
      }));
  }, [transcript.data, clips, query]);

  if (!ready) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        The transcript appears once transcription finishes.
      </p>
    );
  }
  if (transcript.isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }
  if (transcript.isError)
    return (
      <p className="text-sm text-destructive">{transcript.error.message}</p>
    );

  const t = transcript.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript"
            className="pl-8"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {t.words.length.toLocaleString()} words · {formatDuration(t.duration)}{" "}
          · language {t.language.toUpperCase()}
        </span>
      </div>
      <ol className="divide-y rounded-xl border">
        {rows.map((s) => {
          const speaker = speakers.get(s.speaker);
          return (
            <li
              key={s.id}
              className={cn(
                "grid grid-cols-[4.5rem_1fr] gap-3 px-4 py-2.5 text-sm",
                s.clips.length && "bg-primary/5",
              )}
            >
              <span className="pt-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                {formatDuration(s.start)}
              </span>
              <div className="space-y-1">
                {speakers.size > 1 && (
                  <div className={cn("text-xs font-medium", speaker?.color)}>
                    {speaker?.label}
                  </div>
                )}
                <p className="leading-relaxed">{s.text}</p>
                {s.clips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {s.clips.map((c) => (
                      <Link
                        key={c.id}
                        href={`/clips/${c.id}`}
                        className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/25"
                      >
                        In clip #{c.rank}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
        {rows.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            No matches.
          </li>
        )}
      </ol>
    </div>
  );
}
