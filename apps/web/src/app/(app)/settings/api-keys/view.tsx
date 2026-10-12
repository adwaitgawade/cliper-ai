"use client";

import { Check, Copy, KeyRound, Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiKey, ApiKeyCreated } from "@/lib/api/client";
import { useApiKeyMutations, useApiKeys } from "@/lib/api/hooks";
import { env } from "@/lib/env";
import { formatDate, formatRelative } from "@/lib/format";
import { hasRole, useWorkspace } from "@/lib/workspace";

function CreateKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { create } = useApiKeyMutations();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      setCreated(null);
      setName("");
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your new key</DialogTitle>
              <DialogDescription>
                This is the only time it will be shown. Store it in a secret
                manager.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={created.key}
                className="font-mono text-xs"
                onFocus={(e) => e.target.select()}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy key"
                onClick={async () => {
                  await navigator.clipboard.writeText(created.key);
                  setCopied(true);
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {`curl ${env.apiUrl}/v1/videos \\\n  -H "X-API-Key: ${created.prefix}…"`}
            </pre>
            <DialogFooter>
              <Button onClick={() => close(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate(name.trim(), { onSuccess: setCreated });
            }}
          >
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Keys act in this workspace with member permissions: they can
                upload, run jobs and edit clips, but can&apos;t manage members
                or keys.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="key-name">Name</FieldLabel>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="Production integration"
                required
                autoFocus
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => close(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || create.isPending}>
                {create.isPending && <Spinner />} Create key
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ApiKeysPage() {
  const { workspace } = useWorkspace();
  const allowed = hasRole(workspace, "admin");
  const keys = useApiKeys();
  const { revoke } = useApiKeyMutations();
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);

  if (!allowed) {
    return (
      <Alert>
        <TriangleAlert />
        <AlertTitle>Admins only</AlertTitle>
        <AlertDescription>
          Ask an admin or owner of {workspace.name} to manage API keys.
        </AlertDescription>
      </Alert>
    );
  }

  const list = keys.data ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        <CardDescription>
          For scripts and integrations. Send the key in the{" "}
          <code className="text-xs">X-API-Key</code> header.
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> Create key
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {keys.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : list.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <KeyRound />
              </EmptyMedia>
              <EmptyTitle>No API keys</EmptyTitle>
              <EmptyDescription>
                Create a key to drive ClipPro from your own code.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead className="hidden sm:table-cell">Created</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Last used
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((k) => (
                <TableRow
                  key={k.id}
                  className={k.revoked_at ? "opacity-60" : undefined}
                >
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {k.prefix}…
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDate(k.created_at)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {k.last_used_at ? formatRelative(k.last_used_at) : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    {k.revoked_at ? (
                      <Badge variant="outline">Revoked</Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevoking(k)}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CreateKeyDialog open={creating} onOpenChange={setCreating} />
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(o) => !o && setRevoking(null)}
        title="Revoke API key?"
        description={`Requests using "${revoking?.name}" will start failing immediately. This can't be undone.`}
        confirmLabel="Revoke"
        pending={revoke.isPending}
        onConfirm={() =>
          revoking &&
          revoke.mutate(revoking.id, {
            onSuccess: () => {
              toast.success("Key revoked");
              setRevoking(null);
            },
          })
        }
      />
    </Card>
  );
}
