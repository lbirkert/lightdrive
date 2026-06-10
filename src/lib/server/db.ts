import { hash, verify } from "argon2";
import { randomBytes } from "node:crypto";
import prisma from "./prisma";

export { prisma };

export async function hashPassword(password: string): Promise<string> {
  return await hash(password);
}

export async function verifyPassword(hashStr: string, password: string): Promise<boolean> {
  try {
    return await verify(hashStr, password);
  } catch {
    return false;
  }
}

export async function createUser(name: string, email: string, password: string) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { name, email, passwordHash },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { token, userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  return token;
}

export async function getSessionUser(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || (session.expiresAt && session.expiresAt < new Date())) {
    if (session) await prisma.session.delete({ where: { token } });
    return null;
  }
  return session.user;
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function getRootFolders(userId: string) {
  return prisma.folder.findMany({
    where: { userId, parentId: null },
    orderBy: { name: "asc" },
  });
}

export async function getSubFolders(parentId: string) {
  return prisma.folder.findMany({
    where: { parentId },
    orderBy: { name: "asc" },
  });
}

export async function createFolder(name: string, userId: string, parentId?: string) {
  return prisma.folder.create({
    data: { name, userId, parentId: parentId ?? null },
  });
}

export async function getFolder(id: string) {
  return prisma.folder.findUnique({ where: { id } });
}

export async function deleteFolder(id: string) {
  const children = await getSubFolders(id);
  for (const child of children) {
    await deleteFolder(child.id);
  }
  const files = await prisma.file.findMany({ where: { folderId: id }, select: { id: true, storedName: true } });
  await prisma.file.deleteMany({ where: { folderId: id } });
  await prisma.folder.deleteMany({ where: { id } });
  return { deletedFiles: files.map(f => f.storedName) };
}

export async function getFiles(userId: string, folderId?: string | null) {
  return prisma.file.findMany({
    where: { userId, folderId: folderId ?? null },
    orderBy: { uploadedAt: "desc" },
  });
}

export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml", "image/avif"]);

export function isImage(mime: string): boolean {
  return IMAGE_TYPES.has(mime);
}

export const AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac", "audio/x-flac",
  "audio/ogg", "audio/aac", "audio/mp4", "audio/x-m4a", "audio/x-aac",
  "audio/webm", "audio/opus", "audio/wma", "audio/x-ms-wma",
]);

export function isAudio(mime: string): boolean {
  return AUDIO_TYPES.has(mime);
}

export const VIDEO_TYPES = new Set([
  "video/mp4", "video/webm", "video/x-matroska", "video/avi", "video/x-msvideo",
  "video/quicktime", "video/x-ms-wmv", "video/x-flv", "video/mpeg", "video/3gpp",
  "video/x-m4v", "video/x-ms-asf",
]);

export function isVideo(mime: string): boolean {
  return VIDEO_TYPES.has(mime);
}

export async function addFile(
  userId: string,
  storedName: string,
  originalName: string,
  size: number,
  type: string,
  folderId?: string | null,
  hasPreview = false,
  transcodedName?: string | null,
  contentHash?: string | null,
) {
  return prisma.file.create({
    data: { storedName, originalName, contentHash, size, type, userId, folderId: folderId ?? null, hasPreview, transcodedName: transcodedName ?? null },
  });
}

export async function findDuplicateFile(userId: string, originalName: string, contentHash: string, folderId?: string | null) {
  return prisma.file.findFirst({
    where: { userId, originalName, contentHash, folderId: folderId ?? null },
  });
}

export async function updateFilePreview(id: string, hasPreview: boolean) {
  await prisma.file.updateMany({ where: { id }, data: { hasPreview } });
}

export async function updateFileSize(id: string, size: number) {
  await prisma.file.update({ where: { id }, data: { size } });
}

export async function getFile(id: string) {
  return prisma.file.findUnique({ where: { id } });
}

export async function getAllFolders(userId: string) {
  return prisma.folder.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
}

export async function getFolderTreeSizes(userId: string): Promise<Record<string, number>> {
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({ where: { userId }, select: { id: true, parentId: true } }),
    prisma.file.findMany({ where: { userId }, select: { folderId: true, size: true } }),
  ]);

  const childMap = new Map<string | null, string[]>();
  for (const f of folders) {
    const p = f.parentId ?? "";
    if (!childMap.has(p)) childMap.set(p, []);
    childMap.get(p)!.push(f.id);
  }

  const dirSizes = new Map<string, number>();
  for (const f of files) {
    const key = f.folderId ?? "";
    dirSizes.set(key, (dirSizes.get(key) ?? 0) + f.size);
  }

  const folderSet = new Set(folders.map(f => f.id));
  function getDescendantIds(id: string): string[] {
    const ids: string[] = [id];
    const children = childMap.get(id) ?? [];
    for (const cid of children) {
      ids.push(...getDescendantIds(cid));
    }
    return ids;
  }

  const result: Record<string, number> = {};
  for (const f of folders) {
    const allIds = getDescendantIds(f.id);
    let total = 0;
    for (const id of allIds) {
      total += dirSizes.get(id) ?? 0;
    }
    result[f.id] = total;
  }

  return result;
}

export async function moveFile(id: string, folderId: string | null) {
  await prisma.file.updateMany({
    where: { id },
    data: { folderId },
  });
}

export async function moveFolder(id: string, parentId: string | null) {
  await prisma.folder.updateMany({
    where: { id },
    data: { parentId },
  });
}

export async function renameFile(id: string, name: string) {
  await prisma.file.update({
    where: { id },
    data: { originalName: name },
  });
}

export async function renameFolder(id: string, name: string) {
  await prisma.folder.update({
    where: { id },
    data: { name },
  });
}

export async function deleteFileRecord(id: string) {
  await prisma.file.deleteMany({ where: { id } });
}

export async function incrementDownloads(id: string) {
  await prisma.file.updateMany({ where: { id }, data: { downloads: { increment: 1 } } });
}

export async function getRecentUploads(userId: string, days = 30) {
  const files = await prisma.file.findMany({
    where: { userId, uploadedAt: { gte: new Date(Date.now() - days * 86400000) } },
    select: { uploadedAt: true, size: true },
    orderBy: { uploadedAt: "asc" },
  });

  const byDay = new Map<string, { count: number; size: number }>();
  for (const f of files) {
    const day = f.uploadedAt.toISOString().slice(0, 10);
    const g = byDay.get(day) ?? { count: 0, size: 0 };
    g.count++;
    g.size += f.size;
    byDay.set(day, g);
  }

  const result: { date: string; count: number; size: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const existing = byDay.get(d);
    result.unshift({ date: d, count: existing?.count ?? 0, size: existing?.size ?? 0 });
  }
  return result;
}

export async function getTopDownloads(userId: string, limit = 5) {
  return prisma.file.findMany({
    where: { userId },
    orderBy: { downloads: "desc" },
    take: limit,
    select: { id: true, originalName: true, downloads: true, size: true },
  });
}

export async function getFileSizeDistribution(userId: string) {
  const files = await prisma.file.findMany({
    where: { userId },
    select: { size: true },
  });

  let small = 0, medium = 0, large = 0, veryLarge = 0;
  for (const f of files) {
    if (f.size < 102400) small++;
    else if (f.size < 1048576) medium++;
    else if (f.size < 10485760) large++;
    else veryLarge++;
  }

  return [
    { key: "small", label: "<100 KB", count: small },
    { key: "medium", label: "100 KB - 1 MB", count: medium },
    { key: "large", label: "1 MB - 10 MB", count: large },
    { key: "veryLarge", label: ">10 MB", count: veryLarge },
  ];
}

export async function getTotalStats(userId: string) {
  const result = await prisma.file.aggregate({
    where: { userId },
    _count: { id: true },
    _sum: { size: true, downloads: true },
  });
  return {
    totalFiles: result._count.id,
    totalSize: result._sum.size ?? 0,
    totalDownloads: result._sum.downloads ?? 0,
  };
}

export async function getFileTypeBreakdown(userId: string) {
  const files = await prisma.file.findMany({
    where: { userId },
    select: { originalName: true, size: true, type: true },
  });
  const groups = new Map<string, { count: number; size: number }>();
  for (const f of files) {
    const ext = f.originalName.includes(".") ? f.originalName.split(".").pop()!.toLowerCase() : "unknown";
    const key = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext) ? "images"
      : ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(ext) ? "documents"
      : ["zip", "tar", "gz", "rar", "7z"].includes(ext) ? "archives"
      : ["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma"].includes(ext) ? "audio"
      : ["mp4", "webm", "mkv", "avi", "mov", "wmv", "flv", "m4v", "mpg", "mpeg", "3gp"].includes(ext) ? "video"
      : "other";
    const g = groups.get(key) ?? { count: 0, size: 0 };
    g.count++;
    g.size += f.size;
    groups.set(key, g);
  }
  return Array.from(groups.entries()).map(([type, data]) => ({ type, ...data }));
}

export async function getValidShare(token: string, permission?: string) {
  const share = await prisma.share.findUnique({
    where: { token },
    include: { file: true, folder: { select: { id: true, userId: true, parentId: true } } },
  });
  if (!share) return null;
  if (share.expiresAt && share.expiresAt < new Date()) return null;
  const perms = share.permissions.split(",").map(p => p.trim());
  if (!perms.includes("view") && !perms.includes("read")) return null;
  if (permission && !perms.includes(permission)) return null;
  return share;
}

export type DriveContext = {
  type: "user" | "share";
  userId: string;
  share?: { folderId: string | null; fileId: string | null; permissions: string };
};

export async function getDriveContext(
  driveId: string,
  locals: { user?: { id: string } | null },
  permission?: string,
): Promise<DriveContext | null> {
  // Try as share token
  const share = await getValidShare(driveId, permission);
  if (share) {
    const uid = share.folder?.userId || share.file?.userId;
    if (!uid) return null;
    return {
      type: "share",
      userId: uid,
      share: { folderId: share.folderId, fileId: share.fileId, permissions: share.permissions },
    };
  }

  // Try as user's personal drive
  if (locals.user && locals.user.id === driveId) {
    return { type: "user", userId: locals.user.id };
  }

  return null;
}

export async function isFileInSharedFolder(fileId: string, shareFolderId: string): Promise<boolean> {
  const file = await prisma.file.findUnique({ where: { id: fileId }, select: { folderId: true } });
  if (!file) return false;
  let folderId: string | null = file.folderId;
  let allowed = folderId === shareFolderId;
  while (!allowed && folderId) {
    const parent = await prisma.folder.findUnique({ where: { id: folderId }, select: { parentId: true } });
    if (!parent) break;
    allowed = parent.parentId === shareFolderId;
    folderId = parent.parentId;
  }
  return allowed;
}

export async function isFolderInSharedFolder(folderId: string, shareFolderId: string): Promise<boolean> {
  if (folderId === shareFolderId) return true;
  let current: string | null = folderId;
  while (current) {
    const parent: { parentId: string | null } | null = await prisma.folder.findUnique({ where: { id: current }, select: { parentId: true } });
    if (!parent) break;
    if (parent.parentId === shareFolderId) return true;
    current = parent.parentId;
  }
  return false;
}

export async function createShare(
  options: { fileId?: string; folderId?: string; permissions?: string; expiresAt?: Date | null }
) {
  return prisma.share.create({
    data: {
      fileId: options.fileId ?? null,
      folderId: options.folderId ?? null,
      permissions: options.permissions ?? "read",
      expiresAt: options.expiresAt ?? null,
    },
    include: { file: true, folder: true },
  });
}

export async function getShare(token: string) {
  return prisma.share.findUnique({
    where: { token },
    include: {
      file: true,
      folder: { include: { files: true, children: true } },
    },
  });
}

export async function getFileShares(fileId: string) {
  return prisma.share.findMany({
    where: { fileId },
    include: { file: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFolderShares(folderId: string) {
  return prisma.share.findMany({
    where: { folderId },
    include: { folder: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserShares(userId: string) {
  return prisma.share.findMany({
    where: {
      OR: [
        { file: { userId } },
        { folder: { userId } },
      ],
    },
    include: { file: true, folder: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteShare(id: string) {
  await prisma.share.deleteMany({ where: { id } });
}

export async function updateShare(id: string, data: { permissions?: string; expiresAt?: Date | null }) {
  return prisma.share.update({
    where: { id },
    data,
    include: { file: true, folder: true },
  });
}
