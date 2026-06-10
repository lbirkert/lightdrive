import { redirect } from "@sveltejs/kit";
import { getUserShares } from "$lib/server/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, "/auth");
  const shares = await getUserShares(locals.user.id);
  return { shares };
};