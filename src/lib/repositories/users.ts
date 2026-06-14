import { prisma } from "@/lib/db";

export const userRepo = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: { email: string; name: string; passwordHash: string }) {
    return prisma.user.create({
      data: { ...data, email: data.email.toLowerCase() },
    });
  },
};
