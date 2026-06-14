import { route, parseBody, ok } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { registerUser } from "@/lib/services/auth-service";

export const POST = route(
  async ({ req }) => {
    const input = await parseBody(req, registerSchema);
    const user = await registerUser(input);
    return ok(user, { status: 201 });
  },
  {
    requireAuth: false,
    requireCsrf: false,
    rateLimit: { limit: 8, windowMs: 60_000, bucket: "auth:register" },
  }
);
