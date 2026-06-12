import { json, error } from "@sveltejs/kit";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { getDriveContext, getFolder, deleteFolder, renameFolder, moveFolder, moveFolderToDrive, isFolderInSharedFolder, getFolderAncestors } from "$lib/server/db";
import prisma from "$lib/server/prisma";
import type { RequestHandler } from "./$types";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) error(404, "Drive not found");

  const folder = await getFolder(params.folderId);
  if (!folder || folder.userId !== ctx.userId) error(404, "Folder not found");

  if (ctx.type === "share") {
    const perms = (ctx.share!.permissions || "").split(",").map(p => p.trim());
    if (!perms.includes("structure")) error(403, "Structure permission not granted");
    if (ctx.share!.fileId) error(400, "Can only rename folders in shared drives");
    const allowed = await isFolderInSharedFolder(params.folderId, ctx.share!.folderId);
    if (!allowed) error(403, "Folder is not in the shared drive");
  }

  const body = await request.json();

  if (body.name) {
    await renameFolder(params.folderId, body.name.trim());
    return json({ renamed: params.folderId, name: body.name.trim() });
  }

  const { folderId, targetDriveId } = body;

  if (targetDriveId && targetDriveId !== params.driveId) {
    const targetCtx = await getDriveContext(targetDriveId, locals, "structure");
    if (!targetCtx) return json({ error: "Target drive not found or insufficient permissions" }, { status: 404 });

    if (folderId) {
      const targetFolder = await getFolder(folderId);
      if (!targetFolder || targetFolder.userId !== targetCtx.userId) {
        return json({ error: "Target folder not found" }, { status: 404 });
      }
    }

    const fs = folder.size;
    if (folder.parentId) {
      const oldAncestors = await getFolderAncestors(folder.parentId);
      if (oldAncestors.length > 0) {
        await prisma.folder.updateMany({ where: { id: { in: oldAncestors } }, data: { size: { increment: -fs } } });
      }
    }
    await moveFolderToDrive(params.folderId, folderId ?? null, targetCtx.userId);
    return json({ moved: params.folderId, folderId: folderId ?? null, targetDriveId });
  }

  const fs = folder.size;
  if (folder.parentId) {
    const oldAncestors = await getFolderAncestors(folder.parentId);
    if (oldAncestors.length > 0) {
      await prisma.folder.updateMany({ where: { id: { in: oldAncestors } }, data: { size: { increment: -fs } } });
    }
  }
  await moveFolder(params.folderId, folderId ?? null);
  if (folderId) {
    const newAncestors = await getFolderAncestors(folderId);
    if (newAncestors.length > 0) {
      await prisma.folder.updateMany({ where: { id: { in: newAncestors } }, data: { size: { increment: fs } } });
    }
  }
  return json({ moved: params.folderId, folderId: folderId ?? null });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) return json({ error: "Drive not found" }, { status: 404 });

  if (ctx.type === "share") {
    const perms = (ctx.share!.permissions || "").split(",").map(p => p.trim());
    if (!perms.includes("structure")) error(403, "Structure permission not granted");
    if (ctx.share!.fileId) error(400, "Can only rename folders in shared drives");
    if (params.folderId === ctx.share!.folderId) error(403, "Cannot delete the shared root folder");
    const allowed = await isFolderInSharedFolder(params.folderId, ctx.share!.folderId);
    if (!allowed) error(403, "Folder is not in the shared drive");
  }

  const folder = await getFolder(params.folderId);
  if (!folder) return json({ error: "Folder not found" }, { status: 404 });
  if (folder.userId !== ctx.userId) {
    return json({ error: "Folder not found" }, { status: 404 });
  }

  if (ctx.type === "share" && ctx.share?.folderId) {
    const allowed = await isFolderInSharedFolder(params.folderId, ctx.share.folderId);
    if (!allowed) error(403, "Folder is not in the shared drive");
  }

  if (folder.parentId) {
    const ancestors = await getFolderAncestors(folder.parentId);
    if (ancestors.length > 0) {
      await prisma.folder.updateMany({ where: { id: { in: ancestors } }, data: { size: { increment: -folder.size } } });
    }
  }

  const result = await deleteFolder(params.folderId);

  for (const storedName of result.deletedFiles) {
    try { await unlink(join(UPLOAD_DIR, storedName)); } catch {}
    try { await unlink(join(UPLOAD_DIR, "previews", `${storedName}.webp`)); } catch {}
  }

  return json({ deleted: params.folderId, cleanedFiles: result.deletedFiles.length });
};
