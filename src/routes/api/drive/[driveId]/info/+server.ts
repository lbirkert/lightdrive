import { json, error } from "@sveltejs/kit";
import { getDriveContext, getShare } from "$lib/server/db";
import prisma from "$lib/server/prisma";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, locals, url }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) error(404, "Drive not found");

  if (ctx.type === "user") {
    return json({ type: "personal" });
  }

  const share = await getShare(params.driveId);
  if (!share) error(404, "Share not found");
  if (share.expiresAt && share.expiresAt < new Date()) error(410, "Share link has expired");

  if (share.fileId && share.file) {
    return json({
      type: "file",
      permissions: share.permissions,
      file: { id: share.file.id, name: share.file.originalName, size: share.file.size, type: share.file.type },
      expiresAt: share.expiresAt,
    });
  }

  if (share.folderId && share.folder) {
    const folderId = url.searchParams.get("folder") || null;
    const breadcrumbs: { id: string | null; name: string }[] = [{ id: null, name: share.folder.name }];
    if (folderId) {
      let current = await prisma.folder.findUnique({ where: { id: folderId } });
      const chain: { id: string; name: string }[] = [];
      while (current && current.id !== share.folder.id) {
        chain.unshift({ id: current.id, name: current.name });
        current = current.parentId ? await prisma.folder.findUnique({ where: { id: current.parentId } }) : null;
      }
      breadcrumbs.push(...chain);
    }

    return json({
      type: "folder",
      permissions: share.permissions,
      name: share.folder.name,
      expiresAt: share.expiresAt,
      breadcrumbs,
    });
  }

  error(404, "Share has no associated content");
};
