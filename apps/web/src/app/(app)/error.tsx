"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ApiError } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const router = useRouter();
  const unauthorized = error instanceof ApiError && error.status === 401;
  const notFound = error instanceof ApiError && error.status === 404;

  useEffect(() => {
    // Sign out first, or proxy.ts would bounce the still-valid cookie back here.
    if (unauthorized)
      void createClient()
        .auth.signOut()
        .finally(() => router.replace("/sign-in"));
  }, [unauthorized, router]);

  return (
    <Empty className="min-h-[60svh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlert />
        </EmptyMedia>
        <EmptyTitle>
          {notFound ? "Not found" : "Something went wrong"}
        </EmptyTitle>
        <EmptyDescription>
          {notFound
            ? "It may have been deleted, or it belongs to another workspace."
            : error.message}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to projects</Link>
        </Button>
        {!notFound && <Button onClick={reset}>Try again</Button>}
      </EmptyContent>
    </Empty>
  );
}
