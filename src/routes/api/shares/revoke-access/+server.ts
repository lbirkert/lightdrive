import { json } from "@sveltejs/kit";
import { revokeAcceptedShare } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const { invitationId } = await request.json();
  if (!invitationId) return json({ error: "Invitation ID required" }, { status: 400 });

  const result = await revokeAcceptedShare(invitationId, locals.user.id);
  if (!result) return json({ error: "Not found or not yours to revoke" }, { status: 404 });

  return json({ ok: true });
};
