import { getFileIconClass } from "./helpers";
import type { ViewMode, SortMode, NewItemType, UploadFileState, ShareDialogState, PageData } from "./types";
import {
  DRIVE_CHUNK_SIZE, formatSpeed, formatEta, getFileCategory,
  currentFolderId, hasPermission, createFolderSortFn, createFileSortFn,
  updateSortValue as computeNextSortMode, sortIndicator as getSortIndicator,
} from "./drive-utils";
import { uploadStore } from "./upload-store.svelte";

interface Kit {
  goto: (url: string) => Promise<void>;
  invalidate: (dep: string) => Promise<void>;
}

export class DriveStore {
  data = $state<PageData>(null!);
  kit: Kit;
  pageUrl = $state<URL>(new URL("http://localhost"));

  driveId = $derived(this.data.driveId);
  isShared = $derived(this.data.isShared);

  viewMode: ViewMode = $state("list");

  dragOver = $state(false);

  showNewItem = $state(false);
  newItemType = $state<NewItemType>("folder");
  newItemName = $state("");
  creatingItem = $state(false);

  uploading = $derived(uploadStore.uploading);
  uploadProgress = $derived(uploadStore.progress);
  uploadTotal = $derived(uploadStore.total);

  confirmOpen = $state(false);
  confirmTitle = $state("");
  confirmMessage = $state("");
  confirmAction = $state<() => void>(() => { });

  shareDialogOpen = $state(false);
  showShareDialog = $state<ShareDialogState | null>(null);
  sharePermissions = $state("view");
  shareExpiry = $state("");
  shareUrlValue = $state("");
  creatingShare = $state(false);
  createShareError = $state("");
  existingShares = $state<any[]>([]);
  loadingShares = $state(false);
  copiedToken = $state<string | null>(null);

  readonly permissionOptions = [
    { value: "view", label: "View" },
    { value: "view,edit", label: "Edit" },
  ];

  renameDialogOpen = $state(false);
  renameTargetId = $state("");
  renameTargetName = $state("");
  renameTargetType = $state<"file" | "folder">("file");
  renameValue = $state("");
  renaming = $state(false);
  renameError = $state("");

  moveDialogOpen = $state(false);
  moveTargets = $state<{ id: string; isFolder: boolean }[]>([]);
  moveTargetNames = $state<string>("");
  moveDir = $state<string | null>(null);
  allFolders = $state<{ id: string; name: string; parentId: string | null }[]>([]);
  moveRunning = $state(false);

  previewContent = $state<any>(null);
  previewLoading = $state(false);
  previewError = $state("");
  editMode = $state(false);
  editText = $state("");

  selectedIds = $state<Set<string>>(new Set());
  selectedCount = $derived(this.selectedIds.size);
  hasSelection = $derived(this.selectedCount > 0);

  searchOpen = $state(false);
  searchQuery = $state("");
  sortMode = $state<SortMode>("date-desc");
  filterType = $state("all");

  shareInfo = $derived(this.isShared ? this.data.shareInfo ?? null : null);
  sharedFolders = $derived(this.isShared ? this.data.sharedFolders ?? [] : []);
  sharedFiles = $derived(this.isShared ? this.data.sharedFiles ?? [] : []);
  shareBreadcrumbs = $derived(this.isShared ? this.data.shareBreadcrumbs ?? [] : []);
  showDeleteConfirm = $state(false);
  deleteTargetId = $state("");

  sharePreviewFile = $derived(this.shareInfo?.type === "file" ? {
    id: this.shareInfo.file!.id,
    originalName: this.shareInfo.file!.name,
    type: this.shareInfo.file!.type,
    size: this.shareInfo.file!.size,
    uploadedAt: this.shareInfo.createdAt || new Date().toISOString(),
    hasPreview: false,
  } : null);

  filePreviewId = $derived(
    this.isShared && this.shareInfo?.type === "file"
      ? this.shareInfo.file!.id
      : this.pageUrl.searchParams.get("file")
  );
  previewFiles = $derived(
    this.isShared && this.shareInfo?.type === "file"
      ? (this.sharePreviewFile ? [this.sharePreviewFile] : [])
      : (this.isShared ? this.sharedFiles : this.data.files ?? [])
  );
  previewFileIndex = $derived(this.filePreviewId ? this.previewFiles.findIndex((f: any) => f.id === this.filePreviewId) : -1);
  previewFile = $derived(this.filePreviewId ? this.previewFiles[this.previewFileIndex] ?? null : null);
  previewCategory = $derived(
    this.filePreviewId && this.previewFile
      ? getFileIconClass(this.previewFile.type, this.previewFile.originalName)
      : null
  );
  
  canEdit = $derived(
    !this.isShared || (this.isShared && this.shareInfo?.type === "file" && hasPermission(this.shareInfo, "edit"))
  );
  previewEditable = $derived(
    this.canEdit && this.previewCategory
      ? ["txt", "md", "csv", "docx"].includes(this.previewCategory)
      : false
  );

  rawFolders = $derived(this.isShared ? this.sharedFolders : this.data.folders ?? []);
  rawFiles = $derived(this.isShared ? this.sharedFiles : this.data.files ?? []);
  displayBreadcrumbs = $derived(this.isShared ? this.shareBreadcrumbs : this.data.breadcrumbs ?? []);
  displayFolderSizes = $derived(!this.isShared ? this.data.folderSizes : undefined);

  filteredFolders = $derived.by(() => {
    let items = this.rawFolders;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter((f: any) => f.name.toLowerCase().includes(q));
    }
    return [...items].sort(createFolderSortFn(this.sortMode));
  });

  filteredFiles = $derived.by(() => {
    let items = this.rawFiles;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      items = items.filter((f: any) => f.originalName.toLowerCase().includes(q));
    }
    if (this.filterType !== "all") items = items.filter((f: any) => getFileCategory(f) === this.filterType);
    return [...items].sort(createFileSortFn(this.sortMode));
  });

  displayFolders = $derived(this.filteredFolders);
  displayFiles = $derived(this.filteredFiles);

  canUpload = $derived(!this.isShared || hasPermission(this.shareInfo, "insert"));
  canDelete = $derived(!this.isShared || hasPermission(this.shareInfo, "structure"));

  selectedItems = $derived.by(() => {
    const ids = this.selectedIds;
    return [
      ...this.filteredFolders.filter((f: any) => ids.has(f.id)),
      ...this.filteredFiles.filter((f: any) => ids.has(f.id)),
    ] as any[];
  });

  singleSelected = $derived(this.selectedCount === 1 ? this.selectedItems[0] : null);
  canRenameSelection = $derived(
    (!this.isShared || hasPermission(this.shareInfo, "structure")) && !!this.singleSelected
  );
  canShareSelection = $derived(
    !this.isShared && !!this.singleSelected
  );
  canMoveSelection = $derived(!this.isShared && this.selectedCount > 0);
  canDeleteSelection = $derived(this.canDelete && this.selectedCount > 0);

  constructor(data: PageData, kit: Kit, initialUrl?: URL) {
    this.data = data;
    this.kit = kit;
    if (initialUrl) this.pageUrl = initialUrl;
    this.viewMode = initialUrl?.hash === "#grid" ? "grid" : "list";
  }

  updateSort = (col: "name" | "date" | "size") => {
    this.sortMode = computeNextSortMode(this.sortMode, col);
  };

  sortIndicator = (col: "name" | "date" | "size"): "asc" | "desc" | null => {
    return getSortIndicator(this.sortMode, col);
  };

  toggleSelection = (id: string) => {
    const next = new Set(this.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds = next;
  };

  clearSelection = () => {
    this.selectedIds = new Set();
  };

  showConfirm = (title: string, message: string, action: () => void) => {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmAction = () => { this.confirmOpen = false; action(); };
    this.confirmOpen = true;
  };

  currentFolderId = (): string | null => currentFolderId(this.pageUrl);

  navigateTo = (folderId: string | null) => {
    this.clearSelection();
    const base = `/ui-rewrite/drive/${this.driveId}`;
    this.kit.goto(folderId ? `${base}?folder=${folderId}` : base);
  };

  openFilePreview = (fileId: string) => {
    this.clearSelection();
    const scrollTop = document.querySelector<HTMLElement>(".content-area")?.scrollTop ?? 0;
    const params = new URLSearchParams();
    const folder = this.currentFolderId();
    if (folder) params.set("folder", folder);
    params.set("file", fileId);
    params.set("scroll", String(scrollTop));
    const hash = this.viewMode === "grid" ? "#grid" : "#list";
    this.kit.goto(`/ui-rewrite/drive/${this.driveId}?${params}${hash}`);
  };

  closeFilePreview = () => {
    const folder = this.currentFolderId();
    if (this.isShared && this.shareInfo?.type === "file") return;
    const hash = this.viewMode === "grid" ? "#grid" : "#list";
    const scroll = this.pageUrl?.searchParams.get("scroll");
    setTimeout(() => {
      const params = new URLSearchParams();
      if (folder) params.set("folder", folder);
      if (scroll) params.set("scroll", scroll);
      const qs = params.toString();
      this.kit.goto(qs ? `/ui-rewrite/drive/${this.driveId}?${qs}${hash}` : `/ui-rewrite/drive/${this.driveId}${hash}`);
    })
  };

  goToPrevFile = () => {
    if (this.previewFileIndex > 0) this.openFilePreview(this.previewFiles[this.previewFileIndex - 1].id);
  };

  goToNextFile = () => {
    if (this.previewFileIndex < this.previewFiles.length - 1) this.openFilePreview(this.previewFiles[this.previewFileIndex + 1].id);
  };

  loadPreviewContent = async () => {
    if (!this.filePreviewId || !this.previewFile) return;
    this.previewLoading = true;
    this.previewError = "";
    this.previewContent = null;
    const res = await fetch(`/api/drive/${this.driveId}/files/${this.filePreviewId}/content`);
    if (res.ok) { const d = await res.json(); this.previewContent = d; }
    else this.previewError = "Failed to load preview";
    this.previewLoading = false;
  };

  enableEdit = () => {
    if (this.previewContent?.content != null) {
      this.editText = this.previewContent.content;
      this.editMode = true;
    }
  };

  saveEdit = async () => {
    if (!this.filePreviewId) return;
    const res = await fetch(`/api/drive/${this.driveId}/files/${this.filePreviewId}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: this.editText }),
    });
    if (res.ok) { this.editMode = false; this.loadPreviewContent(); this.kit.invalidate("app:drive"); }
  };

  cancelEdit = () => {
    this.editMode = false;
    this.editText = "";
  };

  handleDeletePreview = (id: string) => {
    if (this.isShared && hasPermission(this.shareInfo, "structure")) {
      this.deleteTargetId = id;
      this.showDeleteConfirm = true;
    } else if (!this.isShared) this.handleDelete(id);
  };

  doDeleteFile = async (fileId: string) => {
    const res = await fetch(`/api/drive/${this.driveId}/files/${fileId}`, { method: "DELETE" });
    if (res.ok) {
      if (this.filePreviewId === fileId) this.closeFilePreview();
      this.kit.invalidate("app:drive");
    }
  };

  handleDelete = (fileId: string) => {
    this.showConfirm("Delete File", "Are you sure you want to delete this file?", () => this.doDeleteFile(fileId));
  };

  handleDeleteFolder = (folderId: string) => {
    this.showConfirm("Delete Folder", "Delete this folder and all its contents?", async () => {
      const res = await fetch(`/api/drive/${this.driveId}/folders/${folderId}`, { method: "DELETE" });
      if (res.ok) this.kit.invalidate("app:drive");
    });
  };

  handleCreateItem = async () => {
    if (!this.newItemName.trim()) return;
    this.creatingItem = true;
    if (this.newItemType === "folder") {
      const res = await fetch(`/api/drive/${this.driveId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: this.newItemName.trim(), parentId: this.currentFolderId() }),
      });
      this.creatingItem = false;
      if (res.ok) { this.showNewItem = false; this.newItemName = ""; this.kit.invalidate("app:drive"); }
      else { const r = await res.json(); this.showConfirm("Error", r.error || "Failed to create folder", () => { }); }
    } else {
      const res = await fetch(`/api/drive/${this.driveId}/files/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: this.newItemName.trim(), type: this.newItemType, folderId: this.currentFolderId() }),
      });
      this.creatingItem = false;
      if (res.ok) { this.showNewItem = false; this.newItemName = ""; this.kit.invalidate("app:drive"); }
      else { const r = await res.json(); this.showConfirm("Error", r.error || "Failed to create document", () => { }); }
    }
  };

  openRenameDialog = (id: string, name: string, type: "file" | "folder") => {
    this.renameTargetId = id; this.renameTargetName = name; this.renameTargetType = type;
    this.renameValue = name; this.renameError = ""; this.renaming = false; this.renameDialogOpen = true;
  };

  doRename = async () => {
    if (!this.renameValue.trim()) return;
    this.renaming = true; this.renameError = "";
    const endpoint = this.renameTargetType === "folder"
      ? `/api/drive/${this.driveId}/folders/${this.renameTargetId}`
      : `/api/drive/${this.driveId}/files/${this.renameTargetId}`;
    const res = await fetch(endpoint, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: this.renameValue.trim() }),
    });
    if (res.ok) { this.renameDialogOpen = false; this.kit.invalidate("app:drive"); }
    else { const r = await res.json(); this.renameError = r.error || "Rename failed"; }
    this.renaming = false;
  };

  openMoveDialog = async () => {
    this.moveTargets = this.selectedItems.map((i: any) => ({ id: i.id, isFolder: i.originalName === undefined }));
    this.moveTargetNames = this.selectedItems.map((i: any) => i.name || i.originalName).join(", ");
    this.moveDir = this.currentFolderId();
    this.moveRunning = false;
    const res = await fetch(`/api/drive/${this.driveId}/folders?all=true`);
    if (res.ok) { const r = await res.json(); this.allFolders = r.folders; }
    else this.allFolders = [];
    this.moveDialogOpen = true;
  };

  doMove = async (folderId: string | null) => {
    this.moveRunning = true;
    for (const { id, isFolder } of this.moveTargets) {
      await fetch(`/api/drive/${this.driveId}/${isFolder ? "folders" : "files"}/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
    }
    this.moveRunning = false; this.moveDialogOpen = false; this.clearSelection(); this.kit.invalidate("app:drive");
  };

  handleBulkDelete = async () => {
    if (!this.canDeleteSelection) return;
    this.showConfirm("Delete", `Delete ${this.selectedCount} item${this.selectedCount > 1 ? "s" : ""}?`, async () => {
      for (const item of this.selectedItems) {
        if (item.originalName === undefined) await fetch(`/api/drive/${this.driveId}/folders/${item.id}`, { method: "DELETE" });
        else await fetch(`/api/drive/${this.driveId}/files/${item.id}`, { method: "DELETE" });
      }
      this.clearSelection();
      this.kit.invalidate("app:drive");
    });
  };

  handleSelectionRename = () => {
    if (!this.singleSelected) return;
    this.openRenameDialog(
      this.singleSelected.id,
      this.singleSelected.name || this.singleSelected.originalName,
      this.singleSelected.originalName === undefined ? "folder" : "file"
    );
    this.clearSelection();
  };

  handleSelectionShare = () => {
    if (!this.singleSelected) return;
    const isFolder = this.singleSelected.originalName === undefined;
    this.openShareDialog(
      this.singleSelected.id,
      this.singleSelected.name || this.singleSelected.originalName,
      isFolder ? "folder" : "file"
    );
    this.clearSelection();
  };

  handleSelectionMove = () => {
    this.openMoveDialog();
    this.clearSelection();
  };

  openShareDialog = (id: string, name: string, type: "file" | "folder") => {
    this.showShareDialog = { id, name, type };
    this.shareDialogOpen = true;
    this.sharePermissions = "view";
    this.shareExpiry = "";
    this.shareUrlValue = "";
    this.createShareError = "";
    this.existingShares = [];
    this.loadShares();
  };

  closeShareDialog = () => {
    this.shareDialogOpen = false;
    this.showShareDialog = null;
  };

  loadShares = async () => {
    if (!this.showShareDialog) return;
    this.loadingShares = true;
    const param = this.showShareDialog.type === "file" ? "fileId" : "folderId";
    const res = await fetch(`/api/shares?${param}=${this.showShareDialog.id}`);
    if (res.ok) { const r = await res.json(); this.existingShares = r.shares; }
    this.loadingShares = false;
  };

  createShareLink = async () => {
    if (!this.showShareDialog) return;
    this.creatingShare = true;
    this.createShareError = "";
    const hours = this.shareExpiry
      ? Math.round((new Date(this.shareExpiry).getTime() - Date.now()) / (1000 * 60 * 60))
      : null;
    const body: Record<string, any> = {
      permissions: this.sharePermissions,
      expiresInHours: hours && hours > 0 ? hours : null,
    };
    if (this.showShareDialog.type === "file") body.fileId = this.showShareDialog.id;
    else body.folderId = this.showShareDialog.id;

    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const r = await res.json();
      this.shareUrlValue = `${location.origin}/ui-rewrite/drive/${r.share.token}`;
      await this.loadShares();
    } else {
      const r = await res.json();
      this.createShareError = r.error || "Failed to create share link";
    }
    this.creatingShare = false;
  };

  revokeShare = async (id: string) => {
    const res = await fetch("/api/shares", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) this.existingShares = this.existingShares.filter(s => s.id !== id);
  };

  copyShareUrl = async (token: string) => {
    const url = `${location.origin}/ui-rewrite/drive/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      this.copiedToken = token;
      setTimeout(() => this.copiedToken = null, 2000);
    } catch { this.shareUrlValue = url; }
  };

  private waitForOnline = (): Promise<void> => {
    if (uploadStore.isOnline) return Promise.resolve();
    return new Promise((resolve) => { uploadStore.onlineResolve = resolve; });
  };

  private xhrPost = (url: string, formData: FormData, onProgress: (pct: number) => void): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      uploadStore.currentXhr = xhr;
      xhr.open("POST", url);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.onload = () => {
        uploadStore.currentXhr = null;
        try { const d = JSON.parse(xhr.responseText); if (xhr.status >= 200 && xhr.status < 300) resolve(d); else reject({ error: d.error || "Upload failed", status: xhr.status }); }
        catch { reject({ error: "Invalid response", status: xhr.status }); }
      };
      xhr.onerror = () => { uploadStore.currentXhr = null; reject({ error: "Network error" }); };
      xhr.onabort = () => { uploadStore.currentXhr = null; reject({ error: "Aborted" }); };
      xhr.send(formData);
    });
  };

  private uploadFileChunked = async (file: File, folderId: string | null): Promise<boolean> => {
    const totalChunks = Math.ceil(file.size / DRIVE_CHUNK_SIZE);
    let storedName = "";
    let startTime = Date.now();
    const maxRetries = 3;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * DRIVE_CHUNK_SIZE;
      const end = Math.min(start + DRIVE_CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      let lastError: any = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        await this.waitForOnline();
        try {
          const fd = new FormData();
          fd.set("files", chunk);
          fd.set("chunkIndex", String(i));
          fd.set("totalChunks", String(totalChunks));
          fd.set("originalName", file.name);
          fd.set("fileType", file.type);
          if (storedName) fd.set("storedName", storedName);
          if (folderId) fd.set("folderId", folderId);
          const data = await this.xhrPost(`/api/drive/${this.driveId}/files`, fd, (pct) => {
            const loaded = start + DRIVE_CHUNK_SIZE * pct;
            const fi = uploadStore.files.find(f => f.name === file.name);
            if (fi) {
              fi.uploadedBytes = loaded;
              const elapsed = (Date.now() - startTime) / 1000 || 1;
              fi.speed = fi.uploadedBytes / elapsed;
              fi.eta = (fi.totalBytes - fi.uploadedBytes) / fi.speed;
            }
          });
          if (i === 0 && data.storedName) storedName = data.storedName;
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
          if (attempt < maxRetries) {
            if (!uploadStore.isOnline) await this.waitForOnline();
            else await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
          }
        }
      }
      if (lastError) return false;
    }
    const fi = uploadStore.files.find(f => f.name === file.name);
    if (fi) fi.done = true;
    return true;
  };

  handleUpload = async (e: SubmitEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const input = form.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input?.files?.length) return;
    const folderId = this.currentFolderId();
    const files_list = Array.from(input.files);

    const newEntries: UploadFileState[] = files_list.map(f => ({
      name: f.name, totalBytes: f.size, uploadedBytes: 0, speed: 0, eta: 0, done: false,
    }));
    uploadStore.files = [...uploadStore.files, ...newEntries];
    uploadStore.startTime = Date.now();
    for (let i = 0; i < files_list.length; i++) {
      const ok = await this.uploadFileChunked(files_list[i], folderId);
      if (!ok) break;
    }
    form.reset();
    if (uploadStore.files.every(f => f.done)) this.kit.invalidate("app:drive");
  };
}
