import { json } from "@sveltejs/kit";
import { prisma, verifyPassword, hashPassword } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return json({ error: "Current and new password are required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: locals.user.id } });
  if (!user) return json({ error: "User not found" }, { status: 404 });

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) return json({ error: "Current password is incorrect" }, { status: 401 });

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: locals.user.id },
    data: { passwordHash },
  });

  return json({ success: true });
};