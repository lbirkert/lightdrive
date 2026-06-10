export type { User, Session, Folder, File, Share } from "./server/prisma-client/browser";

export type Item = Record<string, any>;

export type ViewMode = "list" | "grid";

export type SortMode = "name-asc" | "name-desc" | "date-desc" | "date-asc" | "size-desc" | "size-asc";

export type UploadFileState = {
  name: string;
  totalBytes: number;
  uploadedBytes: number;
  speed: number;
  eta: number;
  done: boolean;
};

export type FilterOption = { value: string; label: string };
export type SortOption = { value: string; label: string };

export type DriveContext = {
  type: "user" | "share";
  userId: string;
  share?: { folderId: string | null; fileId: string | null; permissions: string };
};

export type Breadcrumb = { id: string | null; name: string };
