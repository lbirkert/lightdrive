import { redirect } from "@sveltejs/kit";
import { getUserById } from "$lib/server/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, "/auth");
  const user = await getUserById(locals.user.id);
  return { user: { id: user!.id, name: user!.name, email: user!.email, createdAt: user!.createdAt } };
};