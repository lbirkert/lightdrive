import { redirect } from "@sveltejs/kit";
import { getAcceptedDrives } from "$lib/server/db";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user ?? null;
  if (!user) redirect(302, "/auth");

  const accepted = await getAcceptedDrives(user.id);
  const acceptedDrives = accepted
    .filter(a => a.share)
    .map(a => {
      const share = a.share!;
      const name = share.folderId && share.folder
        ? share.folder.name
        : `${a.fromUser.name}'s Drive`;
      return { id: a.id, name, token: share.token };
    });

  const drives = [
    { id: user.id, name: "My Drive" },
    ...acceptedDrives.map(d => ({ id: d.token, name: d.name })),
  ];

  return {
    user,
    driveId: user.id,
    drives,
    breadcrumbs: [{ id: null, name: "Drives" }],
    acceptedDrives,
  };
};
