export type ViewMode = "list" | "grid";

export type SortMode = "name-asc" | "name-desc" | "date-desc" | "date-asc" | "size-desc" | "size-asc";

export type NewItemType = "folder" | "txt" | "md" | "csv";

export interface UploadFileState {
  name: string;
  totalBytes: number;
  uploadedBytes: number;
  speed: number;
  eta: number;
  done: boolean;
}

export interface ShareDialogState {
  id: string;
  name: string;
  type: "file" | "folder" | "drive";
}

export interface FileItem {
  id: string;
  originalName: string;
  type: string;
  size: number;
  uploadedAt: string | Date;
  hasPreview: boolean;
  name?: string;
  user?: { id: string; name: string };
  involved?: { id: string; name: string }[];
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt?: string | Date;
  user?: { id: string; name: string };
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export interface ShareInfo {
  type: "file" | "folder";
  file?: { id: string; name: string; type: string; size: number };
  folder?: any;
  permissions: string;
  createdAt?: string;
  token?: string;
}

export interface AcceptedDrive {
  id: string;
  name: string;
  token: string;
}

export interface DriveTarget {
  id: string;
  name: string;
  isOwner: boolean;
  token: string | null;
  folders: { id: string; name: string; parentId: string | null }[];
}

export interface PageData {
  driveId: string;
  isShared: boolean;
  user: any;
  shareInfo?: ShareInfo | null;
  sharedFolders?: FolderItem[];
  sharedFiles?: FileItem[];
  shareBreadcrumbs?: BreadcrumbItem[];
  folders?: FolderItem[];
  files?: FileItem[];
  folderSizes?: Record<string, number>;
  breadcrumbs?: BreadcrumbItem[];
  acceptedDrives?: AcceptedDrive[];
}
