// NEXT_PUBLIC_* values are inlined into the browser bundle; only public values belong here.
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
    /\/$/,
    "",
  ),
};
