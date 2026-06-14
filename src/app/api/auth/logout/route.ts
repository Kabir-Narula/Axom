import { route, ok } from "@/lib/api";
import { destroySession } from "@/lib/auth/session";

export const POST = route(
  async () => {
    await destroySession();
    return ok({ loggedOut: true });
  },
  { requireAuth: false, requireCsrf: true, rateLimit: { limit: 20, windowMs: 60_000 } }
);
