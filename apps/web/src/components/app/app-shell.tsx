"use client";

import { CircleAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { WorkspaceProvider } from "@/lib/workspace";

function PageSkeleton() {
  return (
    <div className="space-y-8 p-4 md:p-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-video" />
        ))}
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="hidden w-(--sidebar-width) shrink-0 p-2 md:block">
      <div className="h-full space-y-2 rounded-2xl bg-stage-gradient p-2 *:bg-white/10">
        <Skeleton className="mb-6 h-12 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

/** The page panel scrolls itself, so Next's window scroll reset doesn't reach it. */
function ScrollReset({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const pathname = usePathname();
  useEffect(() => {
    target.current?.scrollTo({ top: 0 });
  }, [pathname, target]);
  return null;
}

function SessionError({ error, retry }: { error: Error; retry: () => void }) {
  const router = useRouter();
  const unauthorized = error instanceof ApiError && error.status === 401;
  useEffect(() => {
    // The API rejected the session (expired or deleted user): sign in again.
    // Sign out first, or proxy.ts would bounce the still-valid cookie back here.
    if (unauthorized)
      void createClient()
        .auth.signOut()
        .finally(() => router.replace("/sign-in"));
  }, [unauthorized, router]);
  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlert />
        </EmptyMedia>
        <EmptyTitle>Can&apos;t load your account</EmptyTitle>
        <EmptyDescription>
          {error instanceof TypeError
            ? "The ClipPro API is not reachable. Is it running?"
            : error.message}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={retry}>Try again</Button>
      </EmptyContent>
    </Empty>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const panel = useRef<HTMLElement>(null);
  return (
    <WorkspaceProvider
      renderError={(error, retry) => (
        <SessionError error={error} retry={retry} />
      )}
    >
      {/* Lilac frame with floating panels, like the main site's hero shell. */}
      <SidebarProvider className="h-svh bg-frame">
        <Suspense fallback={<SidebarSkeleton />}>
          <AppSidebar />
        </Suspense>
        <SidebarInset
          ref={panel}
          className="m-2 h-[calc(100svh-1rem)] overflow-y-auto rounded-2xl shadow-sm md:ml-0"
        >
          <Suspense>
            <ScrollReset target={panel} />
          </Suspense>
          {/* Each page waits for the workspace behind its own boundary, so navigating keeps the chrome. */}
          <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
