import { json, error } from "@sveltejs/kit";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { getDriveContext, getFolder, deleteFolder, renameFolder, moveFolder, isFolderInSharedFolder } from "$lib/server/db";
import type { RequestHandler } from "./$types";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) error(404, "Drive not found");

  const folder = await getFolder(params.folderId);
  if (!folder || folder.userId !== ctx.userId) error(404, "Folder not found");

  if (ctx.type === "share") {
    const perms = (ctx.share?.permissions || "").split(",").map(p => p.trim());
    if (!perms.includes("structure")) error(403, "Structure permission not granted");
    if (!ctx.share?.folderId) error(400, "Can only rename folders in shared drives");
    const allowed = await isFolderInSharedFolder(params.folderId, ctx.share.folderId);
    if (!allowed) error(403, "Folder is not in the shared drive");
  }

  const body = await request.json();

  if (body.name) {
    await renameFolder(params.folderId, body.name.trim());
    return json({ renamed: params.folderId, name: body.name.trim() });
  }

  const { folderId } = body;
  await moveFolder(params.folderId, folderId ?? null);
  return json({ moved: params.folderId, folderId: folderId ?? null });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) return json({ error: "Drive not found" }, { status: 404 });

  if (ctx.type === "share") {
    const perms = (ctx.share?.permissions || "").split(",").map(p => p.trim());
    if (!perms.includes("structure")) error(403, "Structure permission not granted");
    if (!ctx.share?.folderId) error(400, "Can only delete folders in shared drives");
    if (params.folderId === ctx.share.folderId) error(403, "Cannot delete the shared root folder");
  }

  const folder = await getFolder(params.folderId);
  if (!folder) return json({ error: "Folder not found" }, { status: 404 });
  if (ctx.type !== "share" && folder.userId !== ctx.userId) {
    return json({ error: "Folder not found" }, { status: 404 });
  }

  if (ctx.type === "share" && ctx.share?.folderId) {
    const allowed = await isFolderInSharedFolder(params.folderId, ctx.share.folderId);
    if (!allowed) error(403, "Folder is not in the shared drive");
  }

  const result = await deleteFolder(params.folderId);

  for (const storedName of result.deletedFiles) {
    try { await unlink(join(UPLOAD_DIR, storedName)); } catch {}
    try { await unlink(join(UPLOAD_DIR, "previews", `${storedName}.webp`)); } catch {}
  }

  return json({ deleted: params.folderId, cleanedFiles: result.deletedFiles.length });
};
