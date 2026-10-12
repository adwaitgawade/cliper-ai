"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCreateWorkspace } from "@/lib/api/hooks";
import { useWorkspace } from "@/lib/workspace";

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const create = useCreateWorkspace();
  const { switchWorkspace } = useWorkspace();
  const [name, setName] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(name.trim(), {
      onSuccess: (ws) => {
        toast.success(`Created ${ws.name}`);
        onOpenChange(false);
        setName("");
        switchWorkspace(ws.id);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New team workspace</DialogTitle>
            <DialogDescription>
              Team workspaces share videos and clips with the members you
              invite. You&apos;ll be its owner.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="ws-name">Name</FieldLabel>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Acme Media"
              required
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending && <Spinner />} Create workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
