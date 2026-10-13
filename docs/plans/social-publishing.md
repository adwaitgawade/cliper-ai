# Plan: Connect social accounts and publish clips in one click

Status: **draft for review** · Written 2026-10-13 · Owner: Adwait

## 1. Goal

A user connects Instagram, YouTube and TikTok accounts to a workspace once. After that, from the clip editor, they pick one or more accounts and press **Publish**. ClipPro uploads the latest render of the clip to every selected account in the background and shows the status and a link to each live post.

Out of scope for this plan (later phases): scheduling, post analytics, LinkedIn/X/Facebook, and publishing through the public API with API keys.

> Note: `requirements.md` line 11 lists "publishing to social platforms" as out of scope for v1, and its privacy section (around line 224) says we don't send content to third parties. Both need updating when this ships. The marketing site (`apps/main-site`) already promises auto-posting, scheduling and six platforms in the privacy policy, terms and `markdown.ts:124`. That copy should be cut back to what actually ships.

---

## 2. What each platform requires

These are the facts the design depends on, checked against the docs on 2026-10-13. Items marked **(verify)** came from third-party sources or contradictory docs. Check them again during implementation.

### YouTube (Data API v3, `videos.insert`)

| Item | Detail |
|---|---|
| Auth | Google OAuth 2.0, web server flow with `access_type=offline` and `prompt=consent` to get a refresh token. Access tokens last 1 hour. |
| Scopes | `youtube.upload` to upload and `youtube.readonly` to read the channel name and avatar. Both are **sensitive** scopes (not restricted), so Google needs OAuth app verification but **no** CASA security assessment. |
| Upload | `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`. Max 256 GB, `video/*`. |
| Body | `snippet.title` (≤100 chars), `snippet.description`, `snippet.tags`, `snippet.categoryId`; `status.privacyStatus` (public/unlisted/private), `status.selfDeclaredMadeForKids` (the user must declare it, because of COPPA), `status.containsSyntheticMedia`. |
| Shorts | No API flag exists. A vertical video of 3 minutes or less is classified as a Short automatically. Our renders are 1080×1920. |
| Quota | Since 2026-06-01, `videos.insert` has its **own quota bucket**: 1 unit per call, **100 calls per day per Google Cloud project, across all users**. That cap is the main launch blocker; we need a quota extension (see §7). |
| Unverified projects | The current `videos.insert` page says "Videos uploaded from unverified API projects are **not** restricted to private viewing mode". Older guides say the opposite. **(verify)** with a real upload in Phase 1. |
| Testing gotcha | While the OAuth consent screen is in "Testing" status, refresh tokens expire after **7 days** and only listed test users (max 100) can sign in. |

### Instagram (Instagram API with Instagram Login)

We use the **Instagram Login** variant rather than Facebook Login. It doesn't need a Facebook Page, so creators can connect directly.

| Item | Detail |
|---|---|
| Accounts | Instagram **Business or Creator** accounts only. Personal accounts can't be connected; the UI must explain how to switch account type for free. |
| Auth | `https://www.instagram.com/oauth/authorize` → `POST https://api.instagram.com/oauth/access_token` (short-lived) → `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token` (long-lived, **60 days**). Refresh with `GET /refresh_access_token?grant_type=ig_refresh_token` once the token is at least 24 hours old and before it expires. An expired token can't be refreshed; the user must reconnect. |
| Scopes | `instagram_business_basic`, `instagram_business_content_publish`. The old `business_*` values were deprecated on 2025-01-27. |
| Redirect URI | Must exactly match the dashboard entry (watch for an added trailing slash) and must be HTTPS. Strip `#_` from the returned code. The code is single-use and lasts 1 hour. |
| Publish | 1) `POST /<IG_ID>/media` with `media_type=REELS`, `video_url`, `caption`, `share_to_feed`, `thumb_offset`. 2) Poll `GET /<container>?fields=status_code` (IN_PROGRESS, FINISHED, ERROR, EXPIRED) about once a minute. 3) `POST /<IG_ID>/media_publish` with `creation_id`. |
| Media URL | **Meta downloads the video from a public URL.** Our presigned S3 URL works only if `S3_PUBLIC_ENDPOINT_URL` is reachable from the internet. R2 presigned URLs are public, so this works in dev too. Resumable byte upload through `rupload.facebook.com` is documented only for the Facebook Login variant. |
| Limits | 100 API-published posts per account in a rolling 24 hours. The docs also say 50 in one place **(verify)**. Check `GET /<IG_ID>/content_publishing_limit` before publishing. Containers expire after 24 hours. |
| Access | Serving accounts we don't own needs **Advanced Access**, which requires App Review: a screencast per permission, a privacy policy URL, a 1024×1024 icon and at least one successful API call first. Meta usually also requires **Business Verification** of the company **(verify in dashboard)**. |
| Required callbacks | A deauthorize callback URL and a data deletion request URL, set in the app dashboard. |

### TikTok (Content Posting API, Direct Post)

| Item | Detail |
|---|---|
| Auth | TikTok OAuth v2 (`https://www.tiktok.com/v2/auth/authorize/` → `POST https://open.tiktokapis.com/v2/oauth/token/`). Access token lasts about 24 hours and the refresh token about 365 days **(verify)**. Use PKCE. HTTPS redirect URIs. |
| Scopes | `user.info.basic` and `video.publish` (Direct Post). `video.upload` (send to the creator's inbox as a draft) is an optional fallback. |
| Before each post | `POST /v2/post/publish/creator_info/query/` returns the nickname, avatar, `privacy_level_options`, `max_video_post_duration_sec` and whether comments, duets and stitches are disabled. TikTok requires fresh data **every time the post screen renders**. |
| Upload | `POST /v2/post/publish/video/init/` with `post_info` (title/caption, `privacy_level`, `disable_comment/duet/stitch`, `video_cover_timestamp_ms`, `brand_content_toggle`, `brand_organic_toggle`, `is_aigc`) and `source_info`. We use **`FILE_UPLOAD`** (chunks of about 5–64 MB, PUT to the returned `upload_url`) **(verify chunk limits)**. That avoids `PULL_FROM_URL`, which needs a verified domain or URL prefix. |
| Status | Poll `POST /v2/post/publish/status/fetch/` with `publish_id`. |
| Rate limits | About 6 init calls/min, 20 creator_info calls/min and 30 status calls/min per user token **(verify)**. |
| Unaudited apps | **Every post is forced to private (SELF_ONLY)** until the app passes TikTok's audit. Third parties report the audit takes 2–6 weeks. |
| Required UX (audit checklist) | Show the creator's nickname and avatar. Offer a privacy dropdown built from `privacy_level_options` with **no default value**. Interaction toggles start **off** and the user turns them on. Disable toggles the creator has turned off in TikTok. Commercial content disclosure ("Your brand" / "Branded content") must use TikTok's exact wording and hide SELF_ONLY when branded content is on. Show a consent line linking TikTok's Music Usage Confirmation (and the Branded Content Policy when relevant). Show a preview. Reject videos longer than `max_video_post_duration_sec`. |

**Effect on "1 click":** YouTube and Instagram can be truly one click once the user has saved defaults per account. TikTok can't, because its rules require an explicit privacy choice and consent on every post. So **Publish** opens a short sheet. YouTube and Instagram are prefilled and need no input. The TikTok section needs one dropdown choice and one checkbox.

---

## 3. Architecture

```
apps/web (Next.js)                         apps/server (FastAPI)                         Celery (default queue)
──────────────────                         ─────────────────────                         ──────────────────────
Settings › Connections ──POST /v1/social/{p}/connect──▶ build auth URL + signed state (Redis, 10 min)
                       ◀── { authorize_url } ──
browser → platform consent screen → GET /v1/social/oauth/{p}/callback (API domain, no bearer; state ⇒ user+workspace)
                                        exchange code → fetch profile → encrypt tokens → upsert social_connections
                                        302 → {APP_URL}/settings/connections?connected={p}

Clip editor › Publish ──POST /v1/clips/{id}/publish──▶ validate, pin latest render, create social_posts rows ──▶ publish.run(post_id)
                       ◀── 202 [{post}] ──                                                      adapter.publish(): upload → poll (task retry w/ countdown) → done
poll GET /v1/clips/{id}/posts (TanStack Query refetch)                                         token refresh on demand; beat task refreshes IG tokens
```

Decisions (my recommendations; change any you disagree with):

1. **Connections belong to the workspace**, recording `connected_by`. Admins and owners can connect and disconnect accounts; members can publish. This matches the existing tenancy model, so a team shares one brand account.
2. **The server owns all OAuth.** Tokens never reach the browser. The callback lives on the API domain and identifies the user through the Redis-stored `state` (one-time, 10-minute TTL, holding `user_id`, `workspace_id`, `platform`, PKCE verifier and `return_to`).
3. **Tokens are encrypted at rest** with `cryptography` `MultiFernet` (`SOCIAL_TOKEN_KEYS`, comma-separated, so keys can be rotated). No such helper exists yet; add `app/core/crypto.py`.
4. **One adapter per platform** behind a common interface (`app/social/base.py`): `authorize_url`, `exchange_code`, `refresh`, `fetch_profile`, `revoke`, `prepare(post)` (validation), `start_upload`, `poll`, `finalize`. Celery drives a small state machine and doesn't sleep. Polling waits by retrying the task with a countdown.
5. **The worker uploads bytes** for YouTube (resumable) and TikTok (`FILE_UPLOAD`). It downloads the render from S3 to a temp file and streams it out. Instagram gets a presigned public URL valid for 2 hours.
6. Publish tasks run on the **`default` queue** because they're I/O-bound and shouldn't compete with renders on `cpu`.
7. Each platform is behind a **feature flag**: `SOCIAL_PLATFORMS=youtube,instagram,tiktok`. A platform stays hidden in prod until its review or audit passes.

---

## 4. Data model (Alembic migration `YYYYMMDD_<rev>_social_publishing.py`, schema `app`)

**`social_connections`**
| column | type | notes |
|---|---|---|
| id | uuid7 PK | |
| workspace_id | FK workspaces, cascade | index |
| platform | text (`youtube`/`instagram`/`tiktok`) | `SocialPlatform` StrEnum |
| external_account_id | text | channel ID / IG user ID / TikTok open_id |
| username, display_name, avatar_url | text | for chips in the UI |
| scopes | text[] | as granted, which can be fewer than requested |
| access_token_enc, refresh_token_enc | bytea | Fernet |
| access_expires_at, refresh_expires_at | timestamptz | |
| status | text | `active` / `needs_reauth` / `revoked` |
| defaults | JSONB | per-account publish defaults (YT privacy, made-for-kids, category, IG share_to_feed…) |
| meta | JSONB | raw profile bits, account type |
| connected_by | FK users | |
| last_refreshed_at, last_error | | |
| unique | (workspace_id, platform, external_account_id) | reconnecting updates the row in place |

**`social_posts`**
| column | type | notes |
|---|---|---|
| id | uuid7 PK | |
| workspace_id, clip_id, render_id, connection_id, created_by | FKs | `render_id` pins the exact file being posted |
| platform | text | denormalised for filtering |
| status | text | `queued` → `uploading` → `processing` → `published` / `failed` / `cancelled` |
| caption / title / description | text | |
| options | JSONB | platform-specific (privacy, toggles, disclosure, tags…) |
| remote_upload_id | text | IG container ID / TikTok publish_id / YT upload session URI |
| remote_post_id, remote_url | text | the live post |
| attempts, error (JSONB), started_at, published_at | | |
| idempotency_key | text unique per workspace | stops a double-click from posting twice |
| scheduled_at | timestamptz null | added now, used in the scheduling phase |

Retention: `purge-expired-videos` must **skip renders that are referenced by a `queued`, `uploading` or `processing` post**. A deleted clip keeps its post history, and the remote post is not touched.

---

## 5. API (FastAPI, new routers `app/api/routers/social.py` and `publish.py`)

| Method & path | Who | What |
|---|---|---|
| `GET /v1/social/platforms` | member | enabled platforms and whether each is configured |
| `GET /v1/social/connections` | member | list (never includes tokens) |
| `POST /v1/social/{platform}/connect` | admin | → `{ authorize_url }` |
| `GET /v1/social/oauth/{platform}/callback` | public (state-validated) | exchange, store, redirect to app |
| `PATCH /v1/social/connections/{id}` | admin | update `defaults` |
| `DELETE /v1/social/connections/{id}` | admin | revoke at the platform where an endpoint exists, then delete the row |
| `GET /v1/social/connections/{id}/tiktok/creator-info` | member | live creator_info for the TikTok sheet |
| `POST /v1/clips/{clip_id}/publish` | member | body: `[{connection_id, …per-platform fields}]` plus `Idempotency-Key`. Requires a current (not outdated) succeeded render. → 202 with posts |
| `GET /v1/clips/{clip_id}/posts` | member | status list for the editor |
| `POST /v1/posts/{id}/retry`, `POST /v1/posts/{id}/cancel` | member | |
| `POST /v1/social/instagram/deauthorize` | Meta (signed_request) | mark the connection revoked |
| `POST /v1/social/instagram/data-deletion` | Meta (signed_request) | delete the data, return `{url, confirmation_code}` |

All routes use the existing `get_principal` / `require_role(..., jwt_only=True)` / `get_scoped()` dependencies and the Redis rate limit. Afterwards, run `pnpm gen:api` to regenerate `apps/web/src/lib/api/schema.d.ts`.

**Config additions** (`app/core/config.py`, `.env.example`):
`SOCIAL_PLATFORMS`, `SOCIAL_TOKEN_KEYS`, `API_PUBLIC_URL` (to build callback URLs), `APP_URL`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_GRAPH_VERSION`,
`TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`.

**Celery** (`app/workers/publish.py`, routed `publish.*` → `default`):
- `publish.run(post_id)` is the state machine described above. It retries transient errors (429, 5xx) with exponential backoff and caps attempts. Auth errors set the connection to `needs_reauth` and the post to `failed`, with a clear message.
- Beat job `social.refresh-tokens` runs every 6 hours. It refreshes Instagram tokens older than 24 hours that expire within 15 days, and TikTok refresh tokens that are close to expiry. Google tokens are refreshed on demand.
- Optional: send a `post.published` / `post.failed` event through the existing signed outbound webhook (`app/workers/webhooks.py`).

---

## 6. Frontend (apps/web)

1. **Settings › Connections** at `src/app/(app)/settings/connections/`, with a link in the settings layout and sidebar.
   - Show one card per platform: Connect button, then connected accounts (avatar, @handle, status badge). For each account: Reconnect, Disconnect, and a "Defaults" popover.
   - Show plain-language notes: "Instagram needs a Business or Creator account" (with a help link) and "TikTok posts are private until our app is approved" while the TikTok audit is pending.
   - Handle `?connected=` and `?error=` query params from the OAuth redirect and show a toast.
2. **Publish button** in the clip editor (`src/app/(app)/clips/[clipId]/view.tsx`, next to the Downloads dropdown at about line 141).
   - Opens a **Sheet** listing account chips you can select. The last selection is remembered per workspace in localStorage.
   - Shared caption field, prefilled from `clip.title` + `clip.hashtags`. Each platform can override it, with a character counter per platform (TikTok and IG caption limits **(verify)**).
   - YouTube section: title, description, privacy, made-for-kids (required on first use, then saved as a default), "altered or synthetic content" toggle.
   - Instagram section: caption, "Also share to feed".
   - TikTok section: everything in the required UX row of §2, built from live `creator-info`.
   - Preview of the render (existing player) and a **Publish** button.
   - If the render is outdated, the sheet offers "Render & publish". It queues a render and then posts.
3. **Publish history** panel in the editor: per-post status, progress, "View on YouTube/Instagram/TikTok" link, and Retry. Uses a TanStack Query hook in `src/lib/api/hooks.ts` that polls every 5 seconds while any post is in progress.
4. Platform logos must follow each brand's guidelines. Meta's reviewers check the login button.

---

## 7. Phases and timeline

Week numbers count from when you approve this plan (W0). The long waits are the platform reviews, so their prerequisites happen in W0 and the submissions happen as soon as there is something reviewers can click.

| Phase | When | What I build | Done when |
|---|---|---|---|
| **P0 Setup** | W0 | Nothing in code; you create the developer apps (§8) | Keys are in `apps/server/.env`, and the staging HTTPS domain exists |
| **P1 Foundation + YouTube** | W1 | migration, crypto, adapter interface, OAuth framework, connections API and UI, YouTube adapter, publish API, worker, publish sheet (YouTube only), history panel, tests (pytest + moto + mocked httpx) | You connect your channel locally and a Short appears on it |
| **P2 Instagram** | W2 | IG adapter, public media URL handling, deauthorize and data-deletion callbacks, token refresh beat job | A Reel is posted to your test Creator account via the tunnel or staging |
| **P3 TikTok** | W2–W3 | TikTok adapter (PKCE, FILE_UPLOAD chunks), creator-info endpoint, full compliance UX | A private (SELF_ONLY) post appears on your TikTok |
| **P4 Reviews** | W3 → W5–W9 | staging deploy support, screencast scripts, reviewer instructions, privacy/terms/requirements.md copy updates | Each platform is approved; we enable its flag in prod one at a time |
| **P5 Later** | after launch | scheduling (`scheduled_at` + beat dispatcher), batch publish from job page, post analytics, API-key publishing, Facebook/LinkedIn/X | — |

Expect **about 3 weeks of build**. YouTube can launch first. Instagram and TikTok go public **when their reviews pass**, likely 2–6 weeks after submission. The YouTube **quota extension** must be approved before more than ~100 uploads per day in total.

---

## 8. Your steps, and when to do them

You said you want to add credentials to `.env` yourself. I'll ask before I need each one.

### Now (W0, before I start coding). These start the long waits.

**Shared prerequisites**
- [ ] **Decide the domains**, for example `app.clippro.ai` (web), `api.clippro.ai` (OAuth callbacks) and `media.clippro.ai` or a public R2/S3 bucket for render files. All platforms need HTTPS redirect URIs, and Meta needs to download the media.
- [ ] **Stand up a public HTTPS staging environment** (web + API + Celery + a public bucket). Reviewers must be able to log in and use the feature. Until it exists, local dev uses a tunnel: `cloudflared tunnel --url http://localhost:8000`.
- [ ] **Make sure the live privacy policy and terms URLs work** (`https://clippro.ai/privacy`, `/terms`). They already exist. I'll tighten the wording in P4.
- [ ] **Create a support email** (for example support@clippro.ai). Every console asks for one.
- [ ] **Prepare company details** (legal name, address, registration or tax document, a phone number, a website on the same domain). Meta Business Verification and the TikTok organisation need them.
- [ ] **Create test accounts on each platform:** a YouTube channel, an **Instagram Creator or Business account** (switch in the IG app: Settings → Account type), and a TikTok account.

**Google / YouTube** (about 30 minutes)
- [ ] Create a Google Cloud project "ClipPro" and enable **YouTube Data API v3**.
- [ ] Configure the OAuth consent screen: External; app name, logo, support email, home page, privacy and terms URLs; authorised domain `clippro.ai`. Add the scopes `youtube.upload` and `youtube.readonly`. Keep it in **Testing** and add yourself and testers as test users.
- [ ] Verify `clippro.ai` in **Google Search Console** with the same Google account. Brand verification requires it.
- [ ] Create an OAuth client ID of type **Web application**. Redirect URIs: `http://localhost:8000/v1/social/oauth/youtube/callback` and `https://api.clippro.ai/v1/social/oauth/youtube/callback`.
- [ ] Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `apps/server/.env`.

**Meta / Instagram** (about 1 hour, plus the Business Verification wait)
- [ ] Create a developer account at developers.facebook.com and a **Meta Business portfolio** (business.facebook.com) for ClipPro.
- [ ] **Start Business Verification** in the Business portfolio now. It can take days to weeks.
- [ ] Create an app of type Business with the **Instagram** product and the use case "API setup with Instagram login". Link it to the Business portfolio.
- [ ] In Instagram › API setup with Instagram login › Business login settings, add the OAuth redirect `https://<tunnel-or-api-domain>/v1/social/oauth/instagram/callback`. Add the deauthorize URL `…/v1/social/instagram/deauthorize` and the data deletion URL `…/v1/social/instagram/data-deletion`.
- [ ] In App settings › Basic, add the privacy policy URL, terms URL, a 1024×1024 icon, the category and a contact email.
- [ ] In App roles › Roles › Instagram Testers, add your test IG account, then **accept the invite** in the Instagram app (Settings → Apps and websites → Tester invites).
- [ ] Put `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET` (the *Instagram* app ID and secret, not the Facebook ones) in `.env`.

**TikTok** (about 1 hour)
- [ ] Create an account at developers.tiktok.com and an **Organisation** for the company. Create an app under it.
- [ ] Fill in the app details (icon, name, category, description, terms and privacy URLs, web platform with the website URL). Verify the website domain if asked.
- [ ] Add the products **Login Kit** and **Content Posting API**, and turn on **Direct Post**.
- [ ] Add the scopes `user.info.basic` and `video.publish` (and `video.upload` if you want the draft fallback).
- [ ] Add the redirect URI `https://<tunnel-or-api-domain>/v1/social/oauth/tiktok/callback`.
- [ ] Use **Sandbox** mode and add your TikTok account as a target or test user.
- [ ] Put `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` in `.env`.

**Generate the encryption key**
- [ ] `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`, then set `SOCIAL_TOKEN_KEYS=<key>` in `.env`. Keep a copy in your password manager; losing it means every connection must be reconnected.

### During P1–P3 (W1–W3)
- [ ] When I finish each adapter, **connect your test account and press Publish**, then confirm the post looks right on the phone (crop, captions, audio, cover). About 15 minutes per platform.
- [ ] **YouTube:** tell me whether the test upload was public or forced to private. That settles the "unverified project" question.
- [ ] **Reconnect YouTube every 7 days** while the consent screen is in Testing. It's a known limitation, not a bug.
- [ ] Decide the open questions in §10.

### At P4 start (about W3, once staging has all three working)
- [ ] **Deploy staging** with the feature on and create a **reviewer login** (email and password) with a sample video already processed into clips.
- [ ] **Record the screencasts** using the scripts I write: one per Meta permission and one TikTok end-to-end flow showing every required UX element. Use English UI and narrate or caption each step.
- [ ] **Meta:** submit App Review for `instagram_business_basic` and `instagram_business_content_publish` (Advanced Access) after at least one successful API call per permission. Business Verification must be complete.
- [ ] **TikTok:** submit the **Content Posting API audit** with the screencast and staging access.
- [ ] **Google:** press **Publish app** on the consent screen. Submit **verification** for the sensitive scopes, with a YouTube demo video showing the consent screen and how each scope is used. Fill in the **YouTube API Services Audit & Quota Extension form** asking for more `videos.insert` quota. Estimate 1–2 uploads per active user per day.
- [ ] Reply to reviewer questions; they often come back once or twice. Forward them to me and I'll prepare the answers or fixes.

### At launch (as each approval lands, about W5–W9)
- [ ] Add the production redirect URIs and keys (Meta and TikTok apps switch from development to **Live** mode).
- [ ] Tell me which platform was approved. I'll enable it in `SOCIAL_PLATFORMS` for prod and remove the "private until approved" notice.
- [ ] Approve the final privacy policy, terms and marketing copy changes (they should list only the platforms that are live).

### Ongoing
- [ ] Watch for policy and compliance emails from Google, Meta and TikTok; they audit periodically.
- [ ] Renew the Meta Data Use Checkup each year.
- [ ] Watch API version deprecations. Graph API versions retire after about 2 years; I'll pin `INSTAGRAM_GRAPH_VERSION`.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| YouTube project-wide cap of 100 uploads per day | Apply for the quota extension early. Count uploads per day in Redis and show "YouTube daily limit reached, try later" instead of failing. |
| Reviews rejected or slow | Build the TikTok and Meta UX to the checklist from the start, and submit as soon as staging works. Each platform has its own flag, so one rejection doesn't block the others. |
| Instagram can't fetch our media URL | Use a public bucket endpoint with a 2-hour presign. Check the HEAD request ourselves before creating the container, and show a clear error. |
| Tokens expire silently | Refresh job, `needs_reauth` status, and a banner in the editor and settings asking the user to reconnect. |
| Posting the wrong version | `render_id` is pinned at publish time. If the render is outdated, the sheet offers "Render & publish". |
| Double posts | Idempotency key and a unique constraint. Retry reuses the same remote upload ID where the platform allows it. |
| Leaked tokens | Fernet with rotatable keys, tokens never in API responses or logs (structlog redaction), and revoke on disconnect. |
| Copyright | Users already attest rights at upload (`rights_attested_at`). The TikTok consent includes music usage confirmation. |

---

## 10. Open questions for you

1. Connections per **workspace** (my recommendation) or per **user**?
2. For TikTok before the audit passes, is it OK to ship as "posts are private and you make them public in the TikTok app", or do you prefer to hide TikTok until the audit passes?
3. Should a successful publish also count against credits or plan limits (for example, publishing only on paid plans)?
4. Should Facebook Reels be added later? It reuses the same Meta app, so it's cheap to add after Instagram is approved.
5. Which domain will host the API and public media in production? Several console steps above depend on it.
