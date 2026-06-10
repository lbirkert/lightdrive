import { json, error } from "@sveltejs/kit";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { getFile, getFolder, deleteFileRecord, moveFile, renameFile, getDriveContext, isFileInSharedFolder } from "$lib/server/db";
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
      } else {
        error(400, "Invalid share configuration");
      }
    }
    await renameFile(params.fileId, body.name);
    return json({ renamed: params.fileId, name: body.name });
  }

  if (ctx.type === "share") return json({ error: "Move not supported in shared drives" }, { status: 403 });

  const { folderId } = body;
  if (folderId) {
    const folder = await getFolder(folderId);
    if (!folder || folder.userId !== ctx.userId) {
      return json({ error: "Folder not found" }, { status: 404 });
    }
  }

  await moveFile(params.fileId, folderId ?? null);
  return json({ moved: params.fileId, folderId: folderId ?? null });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) error(404, "Drive not found");

  if (ctx.type === "share") {
    const perms = (ctx.share?.permissions || "").split(",").map(p => p.trim());
    if (!perms.includes("structure")) error(403, "Structure permission not granted");
    if (!ctx.share?.folderId) error(400, "Can only delete from shared folders");
  }

  const file = await getFile(params.fileId);
  if (!file) error(404, "File not found");

  if (ctx.type === "share") {
    if (ctx.share?.fileId) {
      if (params.fileId !== ctx.share.fileId) error(403, "File is not in the shared drive");
    } else if (ctx.share?.folderId) {
      const allowed = await isFileInSharedFolder(params.fileId, ctx.share.folderId);
      if (!allowed) error(403, "File is not in the shared drive");
    } else {
      error(400, "Invalid share configuration");
    }
  } else if (file.userId !== ctx.userId) {
    return json({ error: "File not found" }, { status: 404 });
  }

  await deleteFileRecord(params.fileId);
  try { await unlink(join(UPLOAD_DIR, file.storedName)); } catch {}

  return json({ deleted: params.fileId });
};
