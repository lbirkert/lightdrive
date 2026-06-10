import { json } from "@sveltejs/kit";
import { getShareInvitation, acceptShareInvitation, declineShareInvitation } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const invitation = await getShareInvitation(params.id);
  if (!invitation) return json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.toUserId !== locals.user.id) return json({ error: "Not your invitation" }, { status: 403 });
  if (invitation.status !== "pending") return json({ error: "Invitation already responded" }, { status: 400 });

  const { action } = await request.json();

  if (action === "accept") {
    const result = await acceptShareInvitation(params.id);
    if (!result) return json({ error: "Failed to accept" }, { status: 500 });
    return json({ invitation: result.invitation, share: result.share });
  }

  if (action === "decline") {
    const result = await declineShareInvitation(params.id);
    return json({ invitation: result });
  }

  return json({ error: "Invalid action" }, { status: 400 });
};
