import { json } from "@sveltejs/kit";
import { createFolder, getRootFolders, getSubFolders, getAllFolders, getDriveContext, isFolderInSharedFolder } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals, params }) => {
  const ctx = await getDriveContext(params.driveId, locals);
  if (!ctx) return json({ error: "Drive not found" }, { status: 404 });

  const all = url.searchParams.get("all");
  if (all === "true") {
    if (ctx.type === "share") return json({ error: "Not available for shared drives" }, { status: 403 });
    const folders = await getAllFolders(ctx.userId);
    return json({ folders });
  }

  let parentId = url.searchParams.get("parentId");

  if (ctx.type === "share" && ctx.share?.folderId) {
    if (parentId && !(await isFolderInSharedFolder(parentId, ctx.share.folderId))) {
      return json({ error: "Folder not in shared drive" }, { status: 403 });
    }
    if (!parentId) parentId = ctx.share.folderId;
  }

  const folders = parentId
    ? await getSubFolders(parentId)
    : await getRootFolders(ctx.userId);

  return json({ folders });
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
  const ctx = await getDriveContext(params.driveId, locals, "structure");
  if (!ctx) return json({ error: "Drive not found or upload not permitted" }, { status: 404 });
  if (ctx.type === "share" && !ctx.share?.folderId) {
    return json({ error: "Can only create folders in shared folders" }, { status: 400 });
  }

  const { name, parentId } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return json({ error: "Folder name is required" }, { status: 400 });
  }

  if (ctx.type === "share" && ctx.share?.folderId) {
    const targetParent = parentId || ctx.share.folderId;
    if (!(await isFolderInSharedFolder(targetParent, ctx.share.folderId))) {
      return json({ error: "Folder not in shared drive" }, { status: 403 });
    }
  }

  const resolvedParentId = ctx.type === "share" && ctx.share?.folderId ? (parentId || ctx.share.folderId) : parentId;
  const folder = await createFolder(name.trim(), ctx.userId, resolvedParentId);
  return json({ folder }, { status: 201 });
};
