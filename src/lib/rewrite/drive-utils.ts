import type { SortMode, ShareInfo } from "./types";

export const DRIVE_CHUNK_SIZE = 1024 * 1024;

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
  if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${bytesPerSec.toFixed(0)} B/s`;
}

export function formatEta(sec: number): string {
  if (!sec || !isFinite(sec)) return "\u2014";
  if (sec > 60) return `${Math.ceil(sec / 60)}m ${Math.ceil(sec % 60)}s`;
  return `${Math.ceil(sec)}s`;
}

export function getFileCategory(f: { type?: string; originalName?: string }): string {
  const t = f.type || "";
  const n = f.originalName || "";
  const ext = n.split(".").pop()?.toLowerCase() || "";
  if (["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml", "image/avif"].includes(t)) return "images";
  if (["mp4", "webm", "mkv", "avi", "mov", "wmv", "flv", "m4v", "mpg", "mpeg", "3gp"].includes(ext) || ["video/mp4", "video/webm", "video/x-matroska", "video/avi", "video/x-msvideo", "video/quicktime", "video/x-ms-wmv", "video/x-flv", "video/mpeg"].includes(t)) return "videos";
  if (["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma", "opus", "webm"].includes(ext) || t.startsWith("audio/")) return "audio";
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "md"].includes(ext)) return "documents";
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return "archives";
  return "other";
}

export function currentFolderId(url: URL): string | null {
  return url.searchParams.get("folder") || null;
}

export function hasPermission(shareInfo: ShareInfo | null, perm: string): boolean {
  if (!shareInfo?.permissions) return false;
  return shareInfo.permissions.split(",").map((p: string) => p.trim()).includes(perm);
}

export function createFolderSortFn(sortMode: SortMode) {
  switch (sortMode) {
    case "name-asc": return (a: any, b: any) => a.name.localeCompare(b.name);
    case "name-desc": return (a: any, b: any) => b.name.localeCompare(a.name);
    case "date-asc": return (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case "date-desc": return (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    default: return () => 0;
  }
}

export function createFileSortFn(sortMode: SortMode) {
  switch (sortMode) {
    case "name-asc": return (a: any, b: any) => a.originalName.localeCompare(b.originalName);
    case "name-desc": return (a: any, b: any) => b.originalName.localeCompare(a.originalName);
    case "date-asc": return (a: any, b: any) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
    case "date-desc": return (a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    case "size-asc": return (a: any, b: any) => a.size - b.size;
    case "size-desc": return (a: any, b: any) => b.size - a.size;
    default: return () => 0;
  }
}

export function updateSortValue(sortMode: SortMode, col: "name" | "date" | "size"): SortMode {
  const map: Record<string, [SortMode, SortMode]> = {
    name: ["name-asc", "name-desc"],
    date: ["date-asc", "date-desc"],
    size: ["size-asc", "size-desc"],
  };
  const [asc, desc] = map[col];
  return sortMode === desc ? asc : desc;
}

export function sortIndicator(sortMode: SortMode, col: "name" | "date" | "size"): "asc" | "desc" | null {
  if (sortMode === `${col}-asc` as SortMode) return "asc";
  if (sortMode === `${col}-desc` as SortMode) return "desc";
  return null;
}
