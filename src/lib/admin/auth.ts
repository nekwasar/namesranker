import { prisma } from "@/lib/db";

/** Returns whether `userId` has the admin role (DB source of truth). */
export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return user?.isAdmin === true;
}

/**
 * Guard for API routes. Returns the admin's user row or null. The DB feedback
 * loop means a user removed from ADMIN_EMAILS loses access on their next check.
 */
export async function requireAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true },
  });
  return user?.isAdmin ? user : null;
}
