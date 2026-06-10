import { json } from "@sveltejs/kit";
import { getShareInvitationsForUser, getSentInvitations } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const scope = url.searchParams.get("scope") || "received";
  const invitations = scope === "sent"
    ? await getSentInvitations(locals.user.id)
    : await getShareInvitationsForUser(locals.user.id);

  return json({ invitations });
};
