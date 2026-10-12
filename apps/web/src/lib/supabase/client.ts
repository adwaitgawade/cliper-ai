import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Browser Supabase client (a singleton). The session lives in cookies so proxy.ts can read it. */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabasePublishableKey);
}
