import { getRootFolders, getSubFolders, getFolder, getFiles, getFolderTreeSizes, getShare } from "$lib/server/db";
import prisma from "$lib/server/prisma";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, depends, url, params }) => {
  depends("app:drive");
  const user = locals.user ?? null;
  const driveId = params.driveId;

  if (user && driveId === user.id) {
    const folderId = url.searchParams.get("folder") || null;
    const folders = folderId
      ? await getSubFolders(folderId)
      : await getRootFolders(user.id);
    const files = await getFiles(user.id, folderId);
    const folderSizes = await getFolderTreeSizes(user.id);

    const breadcrumbs: { id: string | null; name: string }[] = [{ id: null, name: "My Drive" }];
    if (folderId) {
      let current = await getFolder(folderId);
      const chain: { id: string; name: string }[] = [];
      while (current) {
        chain.unshift({ id: current.id, name: current.name });
        current = current.parentId ? await getFolder(current.parentId) : null;
      }
      breadcrumbs.push(...chain);
    }

    return { user, driveId, folders, files, breadcrumbs, folderSizes, isShared: false };
  }

  // Shared drive
  const share = await getShare(driveId);
  if (!share) error(404, "Share link not found.");
  if (share.expiresAt && share.expiresAt < new Date()) error(410, "This share link has expired.");

  if (share.fileId && share.file) {
    return {
      user, driveId, isShared: true,
      shareInfo: {
        type: "file" as const,
        permissions: share.permissions,
        file: { id: share.file.id, name: share.file.originalName, size: share.file.size, type: share.file.type },
        expiresAt: share.expiresAt,
      },
      sharedFiles: [],
      sharedFolders: [],
      shareBreadcrumbs: [],
    };
  }

  if (share.folderId && share.folder) {
    const folderId = url.searchParams.get("folder") || null;
    const targetFolderId = folderId || share.folderId;

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

    const folders = await getSubFolders(targetFolderId);
    const files = await getFiles(share.folder.userId, targetFolderId);

    return {
      user, driveId, isShared: true,
      shareInfo: {
        type: "folder" as const,
        permissions: share.permissions,
        name: share.folder.name,
        expiresAt: share.expiresAt,
      },
      sharedFiles: files,
      sharedFolders: folders,
      shareBreadcrumbs: breadcrumbs,
    };
  }

  error(404, "Share has no associated content.");
};
