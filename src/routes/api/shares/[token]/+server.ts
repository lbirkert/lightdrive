import { json, error } from "@sveltejs/kit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getShare, getFile, incrementDownloads, getFiles, getSubFolders } from "$lib/server/db";
import prisma from "$lib/server/prisma";
import type { RequestHandler } from "./$types";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export const GET: RequestHandler = async ({ params, url }) => {
  const share = await getShare(params.token);
  if (!share) error(404, "Share link not found");
  if (share.expiresAt && share.expiresAt < new Date()) error(410, "Share link has expired");

  if (share.fileId && share.file) {
    const accept = params.token.includes(".");
    if (accept) {
      try {
        const buffer = await readFile(join(UPLOAD_DIR, share.file.storedName));
        await incrementDownloads(share.file.id);
        return new Response(buffer, {
          headers: {
            "Content-Type": share.file.type || "application/octet-stream",
            "Content-Disposition": `attachment; filename="${share.file.originalName}"`,
            "Content-Length": String(share.file.size),
          },
        });
      } catch {
        error(404, "File not found on disk");
      }
    }

    return json({
      type: "file",
      share: {
        token: share.token,
        permissions: share.permissions,
        file: {
          id: share.file.id,
          name: share.file.originalName,
          size: share.file.size,
          type: share.file.type,
        },
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
      },
    });
  }

  if (share.folderId && share.folder) {
    const folderId = url.searchParams.get("folder") || null;
    const targetFolderId = folderId || share.folderId;
    const folders = await getSubFolders(targetFolderId);
    const files = await getFiles(share.folder.userId, targetFolderId);

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
      share: {
        token: share.token,
        permissions: share.permissions,
        folder: { id: share.folder.id, name: share.folder.name },
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
      },
      folders,
      files,
      breadcrumbs,
    });
  }

  error(404, "Share link has no associated content");
};
