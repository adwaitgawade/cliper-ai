# ClipPro web

Next.js 16 app for ClipPro: sign in, upload or link a video, follow processing live, and review, restyle,
trim and re-render clips. It talks to the FastAPI server in [`apps/server`](../server).

## Setup

```bash
cp .env.example .env.local   # Supabase URL + publishable key, and the API URL
pnpm install                 # from the repo root
pnpm --filter web dev        # http://localhost:3000 (the API's CORS_ORIGINS must include it)
```

In Supabase, add `http://localhost:3000/auth/confirm` (and your production URL) to **Auth > URL
Configuration > Redirect URLs**. Sign-up confirmation and password reset links land there.

## How it fits together

- **Auth**: supabase-js signs in with email and password and keeps the session in cookies.
  `src/proxy.ts` refreshes it and redirects signed-out visitors to `/sign-in`. Every API call sends the
  access token as `Authorization: Bearer …`, and the chosen workspace as `X-Workspace-Id`.
- **API client**: typed from the server's OpenAPI schema with `openapi-fetch`. After changing the API,
  run `pnpm --filter web gen:api` to regenerate `src/lib/api/schema.d.ts`. Data fetching and caching
  use TanStack Query (`src/lib/api/hooks.ts`). Job progress streams over SSE (`src/lib/api/sse.ts`).
- **Uploads**: files up to 100 MB go through `POST /v1/videos/upload`. Larger ones get a presigned URL
  and upload straight to storage, then `POST /v1/videos/{id}/complete`.
- **Signed-in pages** render in the browser only, because data needs the session. `useWorkspace()`
  suspends (with `use(browser())` on the server) behind each page's Suspense boundary, and each page
  opts out of instant-navigation validation (`export const instant = false`).
- **Clip editor**: the Remotion `<Player>` plays the composition from [`packages/video`](../../packages/video)
  with props from `GET /v1/clips/{id}/composition`. The render worker renders that same component with
  the same props, so the preview matches the exported MP4. Caption edits apply instantly. Trim and layout
  edits are previewed through the API (debounced) so cuts snap to words exactly as they will on save.

Remotion requires a company license for teams of more than three people: https://remotion.dev/license
