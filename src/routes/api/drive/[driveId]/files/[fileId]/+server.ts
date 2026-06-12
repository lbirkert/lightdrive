import { json, error } from "@sveltejs/kit";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { getFile, getFolder, deleteFileRecord, moveFile, moveFileToDrive, renameFile, getDriveContext, isFileInSharedFolder, isFolderInSharedFolder, adjustFolderSizes, getFolderAncestors } from "$lib/server/db";
import type { RequestHandler } from "./$types";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) return json({ error: "Drive not found" }, { status: 404 });

  const file = await getFile(params.fileId);
  if (!file || file.userId !== ctx.userId) return json({ error: "File not found" }, { status: 404 });

  const body = await request.json();

  if (body.name) {
    if (ctx.type === "share") {
      const perms = (ctx.share?.permissions || "").split(",").map(p => p.trim());
      if (!perms.includes("structure")) error(403, "Structure permission not granted");
      if (ctx.share?.fileId) {
        if (params.fileId !== ctx.share.fileId) error(403, "File is not in the shared drive");
      } else if (ctx.share?.folderId) {
        const allowed = await isFileInSharedFolder(params.fileId, ctx.share.folderId);
        if (!allowed) error(403, "File is not in the shared drive");
      }
    }
    await renameFile(params.fileId, body.name);
    return json({ renamed: params.fileId, name: body.name });
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

    const oldFolderId = file.folderId;
    await moveFileToDrive(params.fileId, folderId ?? null, targetCtx.userId);
    await adjustFolderSizes(oldFolderId, -file.size);
    return json({ moved: params.fileId, folderId: folderId ?? null, targetDriveId });
  }

  if (ctx.type === "share" && ctx.share?.folderId) {
    const targetFolder = folderId || null;
    if (targetFolder && !(await isFolderInSharedFolder(targetFolder, ctx.share.folderId))) {
      return json({ error: "Folder not in shared drive" }, { status: 403 });
    }
  }

  if (folderId) {
    const folder = await getFolder(folderId);
    if (!folder || folder.userId !== ctx.userId) {
      return json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const oldFolderId = file.folderId;
  await moveFile(params.fileId, folderId ?? null);
  await adjustFolderSizes(oldFolderId, -file.size);
  await adjustFolderSizes(folderId, file.size);
  return json({ moved: params.fileId, folderId: folderId ?? null });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) error(404, "Drive not found");

  if (ctx.type === "share") {
    const perms = (ctx.share?.permissions || "").split(",").map(p => p.trim());
    if (!perms.includes("structure")) error(403, "Structure permission not granted");
  }

  const file = await getFile(params.fileId);
  if (!file) error(404, "File not found");

  if (ctx.type === "share") {
    if (ctx.share?.fileId) {
      if (params.fileId !== ctx.share.fileId) error(403, "File is not in the shared drive");
    } else if (ctx.share?.folderId) {
      const allowed = await isFileInSharedFolder(params.fileId, ctx.share.folderId);
      if (!allowed) error(403, "File is not in the shared drive");
    }
  } else if (file.userId !== ctx.userId) {
    return json({ error: "File not found" }, { status: 404 });
  }

  await adjustFolderSizes(file.folderId, -file.size);
  await deleteFileRecord(params.fileId);
  try { await unlink(join(UPLOAD_DIR, file.storedName)); } catch {}

  return json({ deleted: params.fileId });
};
