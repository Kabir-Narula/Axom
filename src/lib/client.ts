"use client";

/**
 * Typed client-side fetch helper.
 * - Attaches the CSRF token (read from the readable cookie) to mutations.
 * - Normalizes the { ok, data | error } envelope into a throwable result.
 * - Handles network failures and non-JSON responses gracefully.
 */

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|; )axom_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export class ApiClientError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, formData } = options;
  const headers: Record<string, string> = {};

  if (method !== "GET") headers["x-csrf-token"] = getCsrfToken();
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError(0, "Network error — check your connection.");
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON response.
  }

  const env = payload as { ok?: boolean; data?: T; error?: string } | null;

  if (!res.ok || !env?.ok) {
    const message =
      env?.error ??
      (res.status === 429
        ? "You're going a bit fast — please wait a moment."
        : "Request failed. Please try again.");
    throw new ApiClientError(res.status, message);
  }

  return env.data as T;
}
