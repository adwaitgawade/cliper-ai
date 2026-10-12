"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useDeleteVideo } from "@/lib/api/hooks";
import type { Video } from "@/lib/api/client";
import { videoTitle } from "./title";

export function DeleteVideoDialog({
  video,
  open,
  onOpenChange,
  onDeleted,
}: {
  video: Video;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const del = useDeleteVideo();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this video?"
      description={
        <>
          <strong>{videoTitle(video)}</strong>, every job run on it, and all of
          its clips and downloads will be permanently deleted.
        </>
      }
      pending={del.isPending}
      onConfirm={() =>
        del.mutate(video.id, {
          onSuccess: () => {
            toast.success("Video deleted");
            onOpenChange(false);
            onDeleted?.();
          },
        })
      }
    />
  );
}
