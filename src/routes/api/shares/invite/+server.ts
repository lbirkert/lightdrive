import { json } from "@sveltejs/kit";
import { getUserByEmail, createShareInvitation } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const { email, permissions, folderId, folderName } = await request.json();
  if (!email || typeof email !== "string") {
    return json({ error: "Email is required" }, { status: 400 });
  }

  const target = await getUserByEmail(email);
  if (!target) return json({ error: "User not found" }, { status: 404 });
  if (target.id === locals.user.id) return json({ error: "Cannot share with yourself" }, { status: 400 });

  const invitation = await createShareInvitation({
    fromUserId: locals.user.id,
    toUserId: target.id,
    folderId: folderId || null,
    folderName: folderName || null,
    permissions: permissions || "view",
  });

  return json({ invitation }, { status: 201 });
};
