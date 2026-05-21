/**
 * HTTP client for the ScoutAgent Runtime API.
 *
 * Base URL is read from the SCOUT_AGENT_API environment variable
 * (default: http://localhost:3001).
 */

const BASE_URL =
  process.env.SCOUT_AGENT_API?.replace(/\/+$/, "") ??
  "http://localhost:3001";

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export async function apiGet<T = unknown>(
  path: string,
  query?: Record<string, string | undefined>,
): Promise<ApiResponse<T>> {
  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const data = (await res.json()) as T;
  return { ok: res.ok, status: res.status, data };
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<ApiResponse<T>> {
  const res = await fetch(new URL(path, BASE_URL).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T;
  return { ok: res.ok, status: res.status, data };
}
