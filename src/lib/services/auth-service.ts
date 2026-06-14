import { userRepo } from "@/lib/repositories/users";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/api";
import type { LoginInput, RegisterInput } from "@/lib/validation";

export async function registerUser(input: RegisterInput) {
  const existing = await userRepo.findByEmail(input.email);
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.");
  }
  const passwordHash = await hashPassword(input.password);
  const user = await userRepo.create({
    email: input.email,
    name: input.name,
    passwordHash,
  });
  await createSession(user.id);
  return { id: user.id, email: user.email, name: user.name };
}

export async function loginUser(input: LoginInput) {
  const user = await userRepo.findByEmail(input.email);
  // Always run a hash comparison to avoid user-enumeration via timing.
  const dummyHash = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO0000000000000000000000000000000";
  const valid = user
    ? await verifyPassword(input.password, user.passwordHash)
    : await verifyPassword(input.password, dummyHash).then(() => false);

  if (!user || !valid) {
    throw new ApiError(401, "Incorrect email or password.");
  }
  await createSession(user.id);
  return { id: user.id, email: user.email, name: user.name };
}
