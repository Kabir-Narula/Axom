import { route, parseBody, ok } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { loginUser } from "@/lib/services/auth-service";

export const POST = route(
  async ({ req }) => {
    const input = await parseBody(req, loginSchema);
    const user = await loginUser(input);
    return ok(user);
  },
  {
    requireAuth: false,
    requireCsrf: false,
    rateLimit: { limit: 10, windowMs: 60_000, bucket: "auth:login" },
  }
);
