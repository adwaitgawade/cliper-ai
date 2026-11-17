"use client";

import type { CaptionOverrides } from "@repo/video";
import { CircleAlert, CornerDownLeft, Sparkles, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ClipDraft } from "@/lib/api/client";
import { useAiEdit } from "@/lib/api/hooks";

export interface EditorDraft {
  start: number;
  end: number;
  layout: "auto" | "crop" | "wide";
  caption_style: string;
  caption_overrides: CaptionOverrides;
  title: string;
}

const SUGGESTIONS = [
  "Start at the question",
  "Bigger yellow captions with emoji",
  "Add a hook title",
  "Make it under 30 seconds",
];

/**
 * `next` with `prev`'s key order, so unchanged overrides compare equal (the editor
 * diffs drafts by their JSON).
 */
function inOrderOf(
  next: CaptionOverrides,
  prev: CaptionOverrides,
): CaptionOverrides {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(prev)) if (k in next) out[k] = next[k as never];
  for (const [k, v] of Object.entries(next)) if (!(k in out)) out[k] = v;
  return out as CaptionOverrides;
}

/**
 * Plain-language editing. The AI proposes changes to the current draft (including
 * unsaved edits); they load into the editor as unsaved changes to preview, keep or undo.
 */
export function AiEditPanel({
  clipId,
  draft,
  onApply,
}: {
  clipId: string;
  draft: EditorDraft;
  onApply: (next: EditorDraft) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const { send, edit, pending, reset } = useAiEdit(clipId);
  // The draft before the last applied edit, for Undo.
  const [before, setBefore] = useState<EditorDraft | null>(null);
  // The draft the pending request was made against.
  const requested = useRef<EditorDraft | null>(null);
  const applied = useRef<string | null>(null);

  useEffect(() => {
    if (!edit || edit.status !== "succeeded" || !edit.proposal) return;
    if (applied.current === edit.id) return;
    applied.current = edit.id;
    const p = edit.proposal;
    const base = requested.current ?? draft;
    setBefore(base);
    onApply({
      start: p.start,
      end: p.end,
      layout: p.layout,
      caption_style: p.caption_style,
      caption_overrides: inOrderOf(
        (p.caption_overrides ?? {}) as CaptionOverrides,
        base.caption_overrides,
      ),
      title: p.title ?? "",
    });
    setInstruction("");
    // Apply each finished edit once; draft and onApply change on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

  const submit = (text = instruction) => {
    const value = text.trim();
    if (!value || pending) return;
    setBefore(null);
    requested.current = draft;
    send({ instruction: value, base: draft as ClipDraft });
  };

  const failed = edit?.status === "failed";
  const done = edit?.status === "succeeded";
  const appliedNotes = edit?.applied ?? [];
  const ignoredNotes = edit?.ignored ?? [];

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-primary" /> Edit with AI
      </div>
      <div className="relative">
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Describe a change: “start at the question”, “bigger captions with emoji”, “add a hook title”…"
          maxLength={500}
          rows={2}
          disabled={pending}
          className="resize-none bg-background pr-24"
          aria-label="Describe an edit"
        />
        <Button
          size="sm"
          className="absolute right-2 bottom-2"
          onClick={() => submit()}
          disabled={pending || !instruction.trim()}
        >
          {pending ? <Spinner /> : <CornerDownLeft />}
          {pending ? "Working" : "Apply"}
        </Button>
      </div>

      {!pending && !done && !failed && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              className="h-7 rounded-full text-xs"
              onClick={() => submit(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      {failed && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>
            {(edit.error as { message?: string } | null)?.message ??
              "The AI couldn't make that edit."}
          </AlertDescription>
        </Alert>
      )}

      {done && (
        <div className="space-y-2 text-sm">
          {edit.summary && <p>{edit.summary}</p>}
          {appliedNotes.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
              {appliedNotes.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          {ignoredNotes.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground/80 italic">
              {ignoredNotes.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Preview it, then Save or keep editing.
            </span>
            {before && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7"
                onClick={() => {
                  onApply(before);
                  setBefore(null);
                  reset();
                }}
              >
                <Undo2 /> Undo
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
