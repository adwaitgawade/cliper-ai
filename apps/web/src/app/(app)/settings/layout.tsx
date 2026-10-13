"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TopBar } from "@/components/app/page-header";
import { hasRole, useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings", label: "Account", min: "member" as const },
  { href: "/settings/workspace", label: "Workspace", min: "member" as const },
  { href: "/settings/members", label: "Members", min: "member" as const },
  { href: "/settings/api-keys", label: "API keys", min: "admin" as const },
];

function SettingsNav() {
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  return (
    <>
      <div className="space-y-1">
        <h1 className="font-heading font-soft text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Your account, and settings for {workspace.name}.
        </p>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b">
        {TABS.filter((t) => hasRole(workspace, t.min)).map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              pathname === t.href
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = TABS.find((t) => t.href === pathname);
  return (
    <>
      <TopBar
        crumbs={[
          { label: "Settings", href: "/settings" },
          { label: current?.label ?? "" },
        ]}
      />
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
        {/* Only the parts that need the workspace wait for it, so the page segment always renders. */}
        <Suspense fallback={<Skeleton className="h-20 w-full" />}>
          <SettingsNav />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          {children}
        </Suspense>
      </div>
    </>
  );
}
