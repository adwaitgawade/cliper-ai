/**
 * Caption line grouping and timing. A line-for-line port of apps/server/app/pipeline/captions.py
 * (clip_words, group_lines, and the ASS event timing), so exported SRT/VTT/ASS files and the
 * rendered video break lines at the same words.
 */
import config from "./caption-config.json";
import type { CaptionWord } from "./schema";

export interface CaptionLine {
  words: CaptionWord[];
  start: number;
  end: number;
  /** When the line disappears: shortly after its last word, or when the next line starts. */
  visibleUntil: number;
}

const PROFANITY = new Set(config.profanity);
const LINE_TAIL_SECONDS = 0.25;
const LAST_LINE_GAP_SECONDS = 0.4;

/** Words inside [start, end], shifted so the clip starts at 0. */
export function clipWords(
  words: CaptionWord[],
  start: number,
  end: number,
): CaptionWord[] {
  const out: CaptionWord[] = [];
  for (const w of words) {
    if (w.end <= start || w.start >= end) continue;
    out.push({
      ...w,
      start: Math.max(0, w.start - start),
      end: Math.min(end, w.end) - start,
    });
  }
  return out;
}

const endsClause = (word: string) =>
  /[.?!,]$/.test(word.replace(/["')]+$/, ""));

export function groupLines(
  words: CaptionWord[],
  {
    maxWords,
    maxChars,
    maxGap = 0.6,
  }: { maxWords: number; maxChars: number; maxGap?: number },
): CaptionLine[] {
  const groups: CaptionWord[][] = [];
  let current: CaptionWord[] = [];
  for (const w of words) {
    const prev = current[current.length - 1];
    if (prev) {
      const textLen =
        current.map((x) => x.word).join(" ").length + 1 + w.word.length;
      if (
        current.length >= maxWords ||
        textLen > maxChars ||
        w.start - prev.end > maxGap ||
        endsClause(prev.word)
      ) {
        groups.push(current);
        current = [];
      }
    }
    current.push(w);
  }
  if (current.length) groups.push(current);

  return groups.map((g, i) => {
    const start = g[0]!.start;
    const end = g[g.length - 1]!.end;
    const next = groups[i + 1];
    const nextStart = next ? next[0]!.start : end + LAST_LINE_GAP_SECONDS;
    return {
      words: g,
      start,
      end,
      visibleUntil: Math.min(end + LINE_TAIL_SECONDS, nextStart),
    };
  });
}

/** Index of the word that is "active" at time t within a line (the ASS highlight segments). */
export function activeWordIndex(line: CaptionLine, t: number): number {
  for (let i = line.words.length - 1; i >= 0; i--) {
    const segStart = i === 0 ? line.start : line.words[i]!.start;
    if (t >= segStart) return i;
  }
  return 0;
}

export function lineAt(
  lines: CaptionLine[],
  t: number,
): CaptionLine | undefined {
  return lines.find((l) => t >= l.start && t < l.visibleUntil);
}

export function maskProfanity(text: string): string {
  return text.replace(/[A-Za-z]+/g, (w) =>
    PROFANITY.has(w.toLowerCase()) ? w[0] + "*".repeat(w.length - 1) : w,
  );
}
