import type { LayoutServerLoad } from "./(app)/$types";

export const load: LayoutServerLoad = ({ locals }) => {
  return { user: locals.user ?? null };
};
