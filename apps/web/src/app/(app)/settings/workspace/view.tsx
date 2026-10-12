"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { CreateWorkspaceDialog } from "@/components/settings/create-workspace-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceList } from "@/lib/api/hooks";
import { formatDate, titleCase } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function WorkspaceSettingsPage() {
  const { workspace, switchWorkspace } = useWorkspace();
  const list = useWorkspaceList();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{workspace.name}</CardTitle>
          <CardDescription>
            {workspace.is_personal
              ? "Your personal workspace. Only you can see its videos and clips."
              : "A team workspace. Everyone in it can see and edit its videos and clips."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Your role</dt>
              <dd className="font-medium">{titleCase(workspace.role)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">
                {formatDate(workspace.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Workspace ID</dt>
              <dd className="font-mono text-xs break-all">{workspace.id}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All workspaces</CardTitle>
          <CardDescription>
            Switch between your personal workspace and the teams you belong to.
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus /> New team workspace
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {list.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="divide-y rounded-lg border">
              {list.data?.map((w) => (
                <li key={w.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-8 items-center justify-center rounded-md border text-sm font-medium">
                    {w.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{w.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {w.is_personal ? "Personal" : "Team"} ·{" "}
                      {titleCase(w.role)}
                    </div>
                  </div>
                  {w.id === workspace.id ? (
                    <Badge variant="secondary">
                      <Check /> Current
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => switchWorkspace(w.id)}
                    >
                      Switch
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <CreateWorkspaceDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
