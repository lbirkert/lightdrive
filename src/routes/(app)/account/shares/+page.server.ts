import { redirect } from "@sveltejs/kit";
import { getUserShares, getShareInvitationsForUser, getUserAcceptedShares, getSentInvitations } from "$lib/server/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, "/auth");
  const [shares, incomingPending, incomingAccepted, sent] = await Promise.all([
    getUserShares(locals.user.id),
    getShareInvitationsForUser(locals.user.id),
    getUserAcceptedShares(locals.user.id),
    getSentInvitations(locals.user.id),
  ]);
  return { shares, incomingPending, incomingAccepted, sent, user: locals.user };
};
