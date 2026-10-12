import { AppShell } from "@/components/app/app-shell";

// The signed-in app renders on the client (user, workspace and data all come from the
// API with the browser's session), so there is no server shell to validate.
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
