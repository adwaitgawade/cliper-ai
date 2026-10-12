"use client";

import { UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { Member, WorkspaceRole } from "@/lib/api/client";
import { useMemberMutations, useMembers } from "@/lib/api/hooks";
import { formatRelative, titleCase } from "@/lib/format";
import { hasRole, useWorkspace } from "@/lib/workspace";

const ROLES: { value: WorkspaceRole; label: string; body: string }[] = [
  {
    value: "member",
    label: "Member",
    body: "Create and edit videos and clips.",
  },
  { value: "admin", label: "Admin", body: "Also manage members and API keys." },
  {
    value: "owner",
    label: "Owner",
    body: "Full control, including other owners.",
  },
];

function AddMember() {
  const { workspace } = useWorkspace();
  const { add } = useMemberMutations();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("member");
  const roles = ROLES.filter(
    (r) => r.value !== "owner" || workspace.role === "owner",
  );

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        add.mutate(
          { email: email.trim(), role },
          {
            onSuccess: (m) => {
              toast.success(`Added ${m.email}`);
              setEmail("");
            },
          },
        );
      }}
    >
      <Field className="flex-1">
        <FieldLabel htmlFor="member-email">Email</FieldLabel>
        <Input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          required
        />
      </Field>
      <Field className="sm:w-40">
        <FieldLabel>Role</FieldLabel>
        <Select value={role} onValueChange={(r) => setRole(r as WorkspaceRole)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Button type="submit" disabled={add.isPending || !email.trim()}>
        {add.isPending ? <Spinner /> : <UserPlus />} Add
      </Button>
    </form>
  );
}

export default function MembersPage() {
  const { workspace, me } = useWorkspace();
  const members = useMembers();
  const { update, remove } = useMemberMutations();
  const [removing, setRemoving] = useState<Member | null>(null);
  const isAdmin = hasRole(workspace, "admin");
  const isOwner = workspace.role === "owner";

  return (
    <div className="space-y-6">
      {workspace.is_personal ? (
        <Alert>
          <UserPlus />
          <AlertTitle>Personal workspaces are just for you</AlertTitle>
          <AlertDescription>
            To work with others, create a team workspace from the{" "}
            <Link
              href="/settings/workspace"
              className="underline underline-offset-4"
            >
              workspace settings
            </Link>{" "}
            and invite people there.
          </AlertDescription>
        </Alert>
      ) : (
        isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Add a member</CardTitle>
              <CardDescription>
                They need a ClipPro account first. Ask them to sign up, then add
                their email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddMember />
            </CardContent>
          </Card>
        )
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            <ul className="mt-1 space-y-0.5">
              {ROLES.map((r) => (
                <li key={r.value}>
                  <span className="font-medium text-foreground">
                    {r.label}s
                  </span>{" "}
                  · {r.body}
                </li>
              ))}
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="divide-y rounded-lg border">
              {members.data?.map((m) => {
                const self = m.user_id === me.user_id;
                const canRemove =
                  !self && isAdmin && (m.role !== "owner" || isOwner);
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback>
                        {(m.email ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {m.email ?? "Unknown user"}{" "}
                        {self && (
                          <span className="text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined {formatRelative(m.created_at)}
                      </div>
                    </div>
                    {isOwner && !workspace.is_personal ? (
                      <Select
                        value={m.role}
                        onValueChange={(role) =>
                          update.mutate(
                            { userId: m.user_id, role: role as WorkspaceRole },
                            { onSuccess: () => toast.success("Role updated") },
                          )
                        }
                      >
                        <SelectTrigger size="sm" className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {titleCase(m.role)}
                      </span>
                    )}
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRemoving(m)}
                        aria-label={`Remove ${m.email}`}
                      >
                        <X />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove member?"
        description={`${removing?.email ?? "This member"} will lose access to ${workspace.name}. Their videos stay in the workspace.`}
        confirmLabel="Remove"
        pending={remove.isPending}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.user_id, {
            onSuccess: () => {
              toast.success("Member removed");
              setRemoving(null);
            },
          })
        }
      />
    </div>
  );
}
