"use client";

import { FileVideo, Link2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from "@/lib/api/upload";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Source =
  { kind: "file"; file: File } | { kind: "url"; url: string };

export function validateFile(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ACCEPTED_TYPES.includes(ext))
    return `Unsupported file type. Use ${ACCEPTED_TYPES.join(", ")}.`;
  if (file.size > MAX_UPLOAD_BYTES) return "Files can be up to 5 GB.";
  return null;
}

export function SourcePicker({
  value,
  onChange,
  disabled,
}: {
  value: Source | null;
  onChange: (s: Source | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(value?.kind === "url" ? "url" : "file");

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = validateFile(file);
    setError(problem);
    onChange(problem ? null : { kind: "file", file });
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(t) => {
        setTab(t);
        onChange(null);
        setError(null);
      }}
    >
      <TabsList>
        <TabsTrigger value="file" disabled={disabled}>
          <Upload /> Upload
        </TabsTrigger>
        <TabsTrigger value="url" disabled={disabled}>
          <Link2 /> From a link
        </TabsTrigger>
      </TabsList>
      <TabsContent value="file" className="mt-3">
        {value?.kind === "file" ? (
          <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-4">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileVideo className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {value.file.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatBytes(value.file.size)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(null)}
              disabled={disabled}
              aria-label="Remove file"
            >
              <X />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files[0]);
            }}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition",
              "hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              dragging && "border-primary bg-primary/5",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-5" />
            </span>
            <span className="font-medium">
              Drop a video here, or click to browse
            </span>
            <span className="text-sm text-muted-foreground">
              MP4, MOV, MKV or WebM · up to 5 GB and 2 hours
            </span>
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_TYPES.join(",") + ",video/*"}
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </TabsContent>
      <TabsContent value="url" className="mt-3">
        <Field>
          <FieldLabel htmlFor="video-url">Video link</FieldLabel>
          <Input
            id="video-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={value?.kind === "url" ? value.url : ""}
            onChange={(e) =>
              onChange(
                e.target.value ? { kind: "url", url: e.target.value } : null,
              )
            }
            disabled={disabled}
          />
          <FieldDescription>
            We download the video on our servers. Only use links you have rights
            to.
          </FieldDescription>
        </Field>
      </TabsContent>
    </Tabs>
  );
}
