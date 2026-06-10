import { redirect } from "@sveltejs/kit";
import { getUserShares, getShareInvitationsForUser, getUserAcceptedShares } from "$lib/server/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, "/auth");
  const [shares, pending, accepted] = await Promise.all([
    getUserShares(locals.user.id),
    getShareInvitationsForUser(locals.user.id),
    getUserAcceptedShares(locals.user.id),
  ]);
  return { shares, pending, accepted, user: locals.user };
};
