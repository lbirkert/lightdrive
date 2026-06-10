import { redirect } from "@sveltejs/kit";
import { getTotalStats, getFileTypeBreakdown, getRecentUploads, getTopDownloads, getFileSizeDistribution } from "$lib/server/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, "/ui-rewrite/auth");

  const [stats, breakdown, recentUploads, topDownloads, sizeDist] = await Promise.all([
    getTotalStats(locals.user.id),
    getFileTypeBreakdown(locals.user.id),
    getRecentUploads(locals.user.id),
    getTopDownloads(locals.user.id),
    getFileSizeDistribution(locals.user.id),
  ]);

  return {
    user: locals.user,
    stats,
    breakdown,
    recentUploads,
    topDownloads,
    sizeDist,
  };
};
