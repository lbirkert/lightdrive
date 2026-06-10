import { json } from "@sveltejs/kit";
import { prisma } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const { name } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return json({ error: "Name is required" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: locals.user.id },
    data: { name: name.trim() },
  });

  return json({ user: { id: user.id, name: user.name, email: user.email } });
};