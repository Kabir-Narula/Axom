import "server-only";
import { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "axom_session";
const CSRF_COOKIE = "axom_csrf";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function token(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

/** Create a DB session and set httpOnly session + readable CSRF cookies. */
export async function createSession(userId: string): Promise<void> {
  const csrfToken = token(24);
  const session = await prisma.session.create({
    data: {
      userId,
      csrfToken,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  // CSRF token is intentionally readable by the client (double-submit pattern).
  jar.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** Resolve the current user from the session cookie, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (!sid) return null;

  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: sid } }).catch(() => {});
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}

/** Validate the CSRF token sent by the client against the session's token. */
export async function verifyCsrf(headerToken: string | null): Promise<boolean> {
  if (!headerToken) return false;
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (!sid) return false;
  const session = await prisma.session.findUnique({ where: { id: sid } });
  if (!session) return false;
  const a = Buffer.from(session.csrfToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (sid) {
    await prisma.session.delete({ where: { id: sid } }).catch(() => {});
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(CSRF_COOKIE);
}

export { SESSION_COOKIE, CSRF_COOKIE };
