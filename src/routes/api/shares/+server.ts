import { json } from "@sveltejs/kit";
import { getFile, getFolder, createShare, getFileShares, getFolderShares, deleteShare, updateShare, getUserShares } from "$lib/server/db";
import type { RequestHandler } from "./$types";

const VALID_PERMISSIONS = ["view", "insert", "edit", "structure"];

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const { fileId, folderId, permissions, expiresInHours } = await request.json();
  if (!fileId && !folderId) {
    return json({ error: "fileId or folderId is required" }, { status: 400 });
  }

  const perms = permissions || "view";
  for (const p of perms.split(",")) {
    if (!VALID_PERMISSIONS.includes(p.trim())) {
      return json({ error: `Invalid permission: ${p}` }, { status: 400 });
    }
  }

  if (fileId) {
    const file = await getFile(fileId);
    if (!file || file.userId !== locals.user.id) {
      return json({ error: "File not found" }, { status: 404 });
    }
  }

  if (folderId) {
    const folder = await getFolder(folderId);
    if (!folder || folder.userId !== locals.user.id) {
      return json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null;

  const share = await createShare({ fileId, folderId, permissions: perms, expiresAt });
  return json({ share }, { status: 201 });
};

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const fileId = url.searchParams.get("fileId");
  const folderId = url.searchParams.get("folderId");
  const all = url.searchParams.get("all");

  if (all === "true") {
    const shares = await getUserShares(locals.user.id);
    return json({ shares });
  }

  if (folderId) {
    const folder = await getFolder(folderId);
    if (!folder || folder.userId !== locals.user.id) {
      return json({ error: "Folder not found" }, { status: 404 });
    }
    const shares = await getFolderShares(folderId);
    return json({ shares });
  }

  if (!fileId) return json({ error: "fileId or folderId query param is required" }, { status: 400 });

  const file = await getFile(fileId);
  if (!file || file.userId !== locals.user.id) {
    return json({ error: "File not found" }, { status: 404 });
  }

  const shares = await getFileShares(fileId);
  return json({ shares });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const { id, permissions, expiresInHours } = await request.json();
  if (!id) return json({ error: "Share id is required" }, { status: 400 });

  const data: { permissions?: string; expiresAt?: Date | null } = {};
  if (permissions) {
    for (const p of permissions.split(",")) {
      if (!VALID_PERMISSIONS.includes(p.trim())) {
        return json({ error: `Invalid permission: ${p}` }, { status: 400 });
      }
    }
    data.permissions = permissions;
  }
  if (expiresInHours !== undefined) {
    data.expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000) : null;
  }

  const share = await updateShare(id, data);
  return json({ share });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return json({ error: "Share id is required" }, { status: 400 });

  await deleteShare(id);
  return json({ deleted: id });
};