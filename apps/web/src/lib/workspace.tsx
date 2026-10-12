"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { browser } from "react-dom";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { ApiError, api, call, type Me, type Workspace } from "@/lib/api/client";
import {
  readStoredWorkspace,
  subscribeStoredWorkspace,
  writeStoredWorkspace,
} from "@/lib/workspace-store";

interface WorkspaceContextValue {
  me: Me;
  workspace: Workspace;
  workspaces: Workspace[];
  switchWorkspace: (id: string) => void;
}

interface ContextState {
  value: WorkspaceContextValue | null;
  /** Resolves with the first loaded value; useWorkspace() suspends on it until then. */
  ready: Promise<WorkspaceContextValue>;
}

const WorkspaceContext = createContext<ContextState | null>(null);

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/**
 * Resolves the signed-in user and the workspace every API call acts in
 * (sent as X-Workspace-Id). The choice is remembered per browser.
 */
export function WorkspaceProvider({
  children,
  renderError,
}: {
  children: React.ReactNode;
  renderError: (error: Error, retry: () => void) => React.ReactNode;
}) {
  const queryClient = useQueryClient();
  // undefined on the server and during hydration, so the first client render matches.
  const selected = useSyncExternalStore(
    subscribeStoredWorkspace,
    readStoredWorkspace,
    () => undefined,
  );

  const me = useQuery({
    queryKey: ["me", selected],
    enabled: selected !== undefined,
    queryFn: () => call(api.GET("/v1/me")),
    retry: (count, error) =>
      !(error instanceof ApiError && error.status < 500) && count < 2,
    // Keep the current workspace on screen while switching to another one.
    placeholderData: keepPreviousData,
  });
  const [first] = useState(deferred<WorkspaceContextValue>);

  // A remembered workspace the user was removed from: fall back to the personal one.
  useEffect(() => {
    if (me.error instanceof ApiError && me.error.code === "workspace_not_found")
      writeStoredWorkspace(null);
  }, [me.error]);

  const switchWorkspace = useCallback(
    (id: string) => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      writeStoredWorkspace(id);
    },
    [queryClient],
  );

  const value = useMemo<WorkspaceContextValue | null>(() => {
    if (!me.data) return null;
    const workspaces = me.data.workspaces;
    const workspace =
      workspaces.find((w) => w.id === me.data.current_workspace_id) ??
      workspaces[0];
    if (!workspace) return null;
    return { me: me.data, workspace, workspaces, switchWorkspace };
  }, [me.data, switchWorkspace]);

  useEffect(() => {
    if (value) first.resolve(value);
  }, [value, first]);

  const state = useMemo(
    () => ({ value, ready: first.promise }),
    [value, first],
  );

  if (
    me.error &&
    !(me.error instanceof ApiError && me.error.code === "workspace_not_found")
  ) {
    return renderError(me.error, () => me.refetch());
  }
  // Children always render (so routes can be prefetched and validated); anything that
  // needs the workspace suspends until it has loaded.
  return <WorkspaceContext value={state}>{children}</WorkspaceContext>;
}

/**
 * The signed-in user and current workspace. Suspends until they've loaded; on the server
 * it always suspends, because the session isn't available there.
 */
export function useWorkspace(): WorkspaceContextValue {
  // Render only in the browser: on the server this suspends to the page's boundary.
  use(browser("ClipPro data needs the session, which lives in the browser."));
  const ctx = use(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  // Always call use() so a suspended render replays the same calls once ready resolves;
  // after that it returns synchronously.
  const first = use(ctx.ready);
  return ctx.value ?? first;
}

const RANK = { member: 0, admin: 1, owner: 2 } as const;

export function hasRole(
  workspace: Workspace,
  minimum: keyof typeof RANK,
): boolean {
  return RANK[workspace.role] >= RANK[minimum];
}
