import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { getCurrentUser, verifyCsrf, type SessionUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function clientKey(req: NextRequest, bucket: string): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || "local";
  return `${bucket}:${ip}`;
}

interface GuardOptions {
  rateLimit?: { limit: number; windowMs: number; bucket?: string };
  requireAuth?: boolean;
  requireCsrf?: boolean; // default true for mutations
}

export interface AuthedContext {
  user: SessionUser;
  req: NextRequest;
}

/**
 * Wrap a route handler with rate limiting, authentication, CSRF protection and
 * uniform error handling. Mutating routes get CSRF checks by default.
 */
export function route(
  handler: (ctx: AuthedContext) => Promise<NextResponse>,
  options: GuardOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const {
        requireAuth = true,
        requireCsrf = req.method !== "GET" && req.method !== "HEAD",
        rateLimit: rl = { limit: 60, windowMs: 60_000 },
      } = options;

      const bucket = rl.bucket ?? new URL(req.url).pathname;
      const limit = rateLimit(clientKey(req, bucket), rl.limit, rl.windowMs);
      if (!limit.allowed) {
        return NextResponse.json(
          { ok: false, error: "Too many requests. Please slow down." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
            },
          }
        );
      }

      let user: SessionUser | null = null;
      if (requireAuth) {
        user = await getCurrentUser();
        if (!user) return fail(401, "You must be signed in.");
      }

      if (requireCsrf) {
        const header = req.headers.get("x-csrf-token");
        const valid = await verifyCsrf(header);
        if (!valid) return fail(403, "Invalid or missing CSRF token.");
      }

      return await handler({ user: user as SessionUser, req });
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, err.message);
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return fail(400, first ? first.message : "Invalid input.");
      }
      console.error("[api] unhandled error", err);
      return fail(500, "Something went wrong on our end.");
    }
  };
}

/** Parse + validate a JSON body, throwing ApiError(400) on failure. */
export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
  return schema.parse(json);
}
