import createFetchClient, { type Middleware } from "openapi-fetch";
import { env } from "@/lib/env";
import { createClient as createSupabase } from "@/lib/supabase/client";
import { readStoredWorkspace } from "@/lib/workspace-store";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];
export type Video = Schemas["VideoOut"];
export type Job = Schemas["JobOut"];
export type JobOptions = Schemas["JobOptions"];
export type Clip = Schemas["ClipOut"];
export type ClipPatch = Schemas["ClipPatch"];
export type Render = Schemas["RenderOut"];
export type Me = Schemas["MeOut"];
export type Workspace = Schemas["WorkspaceOut"];
export type Member = Schemas["MemberOut"];
export type ApiKey = Schemas["ApiKeyOut"];
export type ApiKeyCreated = Schemas["ApiKeyCreated"];
export type WorkspaceRole = Workspace["role"];

/** The API's error envelope: {"error": {"code", "message", "details", "request_id"}}. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

export async function toApiError(res: Response): Promise<ApiError> {
  let body: {
    error?: {
      code?: string;
      message?: string;
      details?: unknown;
      request_id?: string;
    };
  } = {};
  try {
    body = await res.clone().json();
  } catch {
    // not JSON
  }
  const e = body.error;
  let message = e?.message ?? res.statusText ?? "Request failed";
  // Pydantic validation errors carry the field messages in details.
  if (
    e?.code === "validation_error" &&
    Array.isArray(e.details) &&
    e.details[0]?.msg
  ) {
    message = String(e.details[0].msg).replace(/^Value error, /, "");
  }
  return new ApiError(
    res.status,
    e?.code ?? `http_${res.status}`,
    message,
    e?.details,
    e?.request_id,
  );
}

// --- auth + workspace headers -------------------------------------------------------

export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await createSupabase().auth.getSession();
  const headers: Record<string, string> = {};
  if (data.session)
    headers.Authorization = `Bearer ${data.session.access_token}`;
  const workspaceId = readStoredWorkspace();
  if (workspaceId) headers["X-Workspace-Id"] = workspaceId;
  return headers;
}

const auth: Middleware = {
  async onRequest({ request }) {
    for (const [k, v] of Object.entries(await authHeaders()))
      request.headers.set(k, v);
    return request;
  },
  async onResponse({ response }) {
    if (!response.ok) throw await toApiError(response);
    return response;
  },
};

export const api = createFetchClient<paths>({ baseUrl: env.apiUrl });
api.use(auth);

/** Unwrap an openapi-fetch result; errors were already thrown by the middleware. */
export async function call<T>(
  promise: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, response } = await promise;
  if (response.status === 204) return undefined as T;
  return data as T;
}
