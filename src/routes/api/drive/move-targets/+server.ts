import { json } from "@sveltejs/kit";
import { getMoveTargets } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });
  const drives = await getMoveTargets(locals.user.id);
  return json({ drives });
};
