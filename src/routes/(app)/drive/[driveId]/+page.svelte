<script lang="ts">
  import { page } from "$app/stores";
  import { goto, invalidate, replaceState, beforeNavigate, afterNavigate } from "$app/navigation";
  import { Button, Card, Flex, Input, Text, Modal, Select, Tag, Divider, Heading } from "flewui";
  import {
    Upload, File, Folder, Trash2,
    X, Share2, Clock, MoveRight, Save, Pen
  } from "@lucide/svelte";
  import { formatSize, formatDate, formatFullDate, getPreviewUrl, getFileIconClass } from "$lib/components/helpers";
  import Toolbar from "$lib/components/Toolbar.svelte";
  import FilePreview from "$lib/components/FilePreview.svelte";
  import ListView from "$lib/components/ListView.svelte";
  import GridView from "$lib/components/GridView.svelte";

  let { data } = $props();

  let driveId = $derived(data.driveId);
  let isShared = $derived(data.isShared);

  type ViewMode = "list" | "grid";
  let viewMode = $state<ViewMode>($page.url.hash === "#grid" ? "grid" : "list");

  $effect(() => {
    const hash = viewMode === "grid" ? "#grid" : "";
    const url = $page.url.pathname + $page.url.search + hash;
    if ($page.url.hash !== hash) {
      replaceState(url, {});
    }
  });

  let savedScroll = $state(0);

  beforeNavigate(({ to }) => {
    if (to?.url.pathname === $page.url.pathname) {
      savedScroll = document.querySelector<HTMLElement>(".content-area")?.scrollTop ?? 0;
    }
  });

  afterNavigate(() => {
    if (savedScroll > 0) {
      const el = document.querySelector<HTMLElement>(".content-area");
      if (el) el.scrollTop = savedScroll;
      savedScroll = 0;
    }
  });

  let dragOver = $state(false);

  // Personal drive state
  let showNewItem = $state(false);
  let newItemType = $state<"folder" | "txt" | "md" | "csv">("folder");
  let newItemName = $state("");
  let creatingItem = $state(false);

  // Upload progress
  const CHUNK_SIZE = 1024 * 1024;

  type UploadFileState = {
    name: string;
    totalBytes: number;
    uploadedBytes: number;
    speed: number;
    eta: number;
    done: boolean;
  };

  let uploadFiles = $state<UploadFileState[]>([]);
  let uploading = $derived(uploadFiles.length > 0 && uploadFiles.some(f => !f.done));
  let uploadProgress = $derived(uploadFiles.filter(f => f.done).length);
  let uploadTotal = $derived(uploadFiles.length);
  let overallBytes = $derived(uploadFiles.reduce((a, f) => a + f.totalBytes, 0));
  let totalUploadedBytes = $derived(uploadFiles.reduce((a, f) => a + f.uploadedBytes, 0));
  let uploadStartTime = $state(0);

  let now = $state(Date.now());
  $effect(() => {
    if (uploading) {
      const id = setInterval(() => now = Date.now(), 250);
      return () => clearInterval(id);
    }
  });

  let isOnline = $state(true);
  let currentXhr: XMLHttpRequest | null = null;
  let onlineResolve: (() => void) | null = null;

  $effect(() => {
    function onOnline() {
      isOnline = true;
      onlineResolve?.();
      onlineResolve = null;
    }
    function onOffline() {
      isOnline = false;
      currentXhr?.abort();
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  });

  function waitForOnline(): Promise<void> {
    if (isOnline) return Promise.resolve();
    return new Promise((resolve) => { onlineResolve = resolve; });
  }

  let totalSpeed = $derived(
    totalUploadedBytes > 0 && uploadStartTime > 0
      ? totalUploadedBytes / ((now - uploadStartTime) / 1000)
      : 0
  );
  let totalEta = $derived(totalSpeed > 0 ? (overallBytes - totalUploadedBytes) / totalSpeed : 0);

  function formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
    if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
    return `${bytesPerSec.toFixed(0)} B/s`;
  }

  function formatEta(sec: number): string {
    if (!sec || !isFinite(sec)) return "—";
    if (sec > 60) return `${Math.ceil(sec / 60)}m ${Math.ceil(sec % 60)}s`;
    return `${Math.ceil(sec)}s`;
  }

  // Confirm dialog
  let confirmOpen = $state(false);
  let confirmTitle = $state("");
  let confirmMessage = $state("");
  let confirmAction = $state<() => void>(() => {});
  let confirmVariant = $state<"primary" | "danger">("primary");

  function showConfirm(title: string, message: string, action: () => void, variant: "primary" | "danger" = "danger") {
    confirmTitle = title;
    confirmMessage = message;
    confirmAction = () => { confirmOpen = false; action(); };
    confirmVariant = variant;
    confirmOpen = true;
  }

  // Share dialog (personal drive only)
  let showShareDialog = $state<{ id: string; name: string; type: "file" | "folder" } | null>(null);
  let shareDialogOpen = $state(false);
  let sharePermissions = $state("read");
  let shareExpiry = $state("");
  let shareUrlValue = $state("");
  let creatingShare = $state(false);
  let createShareError = $state("");

  let existingShares = $state<any[]>([]);
  let loadingShares = $state(false);

  let permissionOptions = [
    { value: "view", label: "View" },
    { value: "view,edit", label: "Edit" },
  ];

  async function loadShares() {
    if (!showShareDialog) return;
    loadingShares = true;
    const param = showShareDialog.type === "file" ? "fileId" : "folderId";
    const res = await fetch(`/api/shares?${param}=${showShareDialog.id}`);
    if (res.ok) {
      const r = await res.json();
      existingShares = r.shares;
    }
    loadingShares = false;
  }

  async function createShareLink() {
    if (!showShareDialog) return;
    creatingShare = true;
    createShareError = "";
    const hours = shareExpiry
      ? Math.round((new Date(shareExpiry).getTime() - Date.now()) / (1000 * 60 * 60))
      : null;
    const body: Record<string, any> = {
      permissions: sharePermissions,
      expiresInHours: hours && hours > 0 ? hours : null,
    };
    if (showShareDialog.type === "file") body.fileId = showShareDialog.id;
    else body.folderId = showShareDialog.id;

    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const r = await res.json();
      shareUrlValue = `${location.origin}/drive/${r.share.token}`;
      await loadShares();
    } else {
      const r = await res.json();
      createShareError = r.error || "Failed to create share link";
    }
    creatingShare = false;
  }

  async function revokeShare(id: string) {
    const res = await fetch("/api/shares", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      existingShares = existingShares.filter(s => s.id !== id);
    }
  }

  let copiedToken = $state<string | null>(null);

  async function copyShareUrl(token: string) {
    const url = `${location.origin}/drive/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      copiedToken = token;
      setTimeout(() => copiedToken = null, 2000);
    } catch {
      shareUrlValue = url;
    }
  }

  function openShareDialog(id: string, name: string, type: "file" | "folder") {
    showShareDialog = { id, name, type };
    shareDialogOpen = true;
    sharePermissions = "view";
    shareExpiry = "";
    shareUrlValue = "";
    createShareError = "";
    existingShares = [];
    loadShares();
  }

  function closeShareDialog() {
    shareDialogOpen = false;
    showShareDialog = null;
  }

  function currentFolderId(): string | null {
    return $page.url.searchParams.get("folder") || null;
  }

  function navigateTo(folderId: string | null) {
    clearSelection();
    const base = `/drive/${driveId}`;
    const url = folderId ? `${base}?folder=${folderId}` : base;
    goto(url);
  }

  function xhrPost(url: string, formData: FormData, onProgress: (pct: number) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      currentXhr = xhr;
      xhr.open("POST", url);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        currentXhr = null;
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject({ error: data.error || "Upload failed", status: xhr.status });
        } catch {
          reject({ error: "Invalid response", status: xhr.status });
        }
      };
      xhr.onerror = () => {
        currentXhr = null;
        reject({ error: "Network error" });
      };
      xhr.onabort = () => {
        currentXhr = null;
        reject({ error: "Aborted" });
      };
      xhr.send(formData);
    });
  }

  // Personal drive handlers
  async function uploadFileChunked(file: File, folderId: string | null): Promise<boolean> {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let storedName = "";
    let startTime = Date.now();
    const maxRetries = 3;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkSize = end - start;
      const chunk = file.slice(start, end);

      let lastError: any = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        await waitForOnline();
        try {
          const fd = new FormData();
          fd.set("files", chunk);
          fd.set("chunkIndex", String(i));
          fd.set("totalChunks", String(totalChunks));
          fd.set("originalName", file.name);
          fd.set("fileType", file.type);
          if (storedName) fd.set("storedName", storedName);
          if (folderId) fd.set("folderId", folderId);

          const data = await xhrPost(`/api/drive/${driveId}/files`, fd, (pct) => {
            const loaded = start + chunkSize * pct;
            const fi = uploadFiles.find(f => f.name === file.name);
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
            if (!isOnline) {
              await waitForOnline();
            } else {
              await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
            }
          }
        }
      }
      if (lastError) return false;
    }

    const fi = uploadFiles.find(f => f.name === file.name);
    if (fi) fi.done = true;
    return true;
  }

  async function handleUpload(e: SubmitEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const input = form.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input?.files?.length) return;

    const folderId = currentFolderId();
    const files_list = Array.from(input.files);

    uploadFiles = files_list.map(f => ({
      name: f.name,
      totalBytes: f.size,
      uploadedBytes: 0,
      speed: 0,
      eta: 0,
      done: false,
    }));
    uploadStartTime = Date.now();

    for (let i = 0; i < files_list.length; i++) {
      const ok = await uploadFileChunked(files_list[i], folderId);
      if (!ok) break;
    }

    form.reset();
    if (uploadFiles.every(f => f.done)) {
      invalidate("app:drive");
    }
  }

  async function doDeleteFile(fileId: string) {
    const res = await fetch(`/api/drive/${driveId}/files/${fileId}`, { method: "DELETE" });
    if (res.ok) {
      if (filePreviewId === fileId) closeFilePreview();
      invalidate("app:drive");
    }
  }

  async function handleDelete(fileId: string) {
    showConfirm(
      "Delete File",
      "Are you sure you want to delete this file?",
      () => doDeleteFile(fileId),
    );
  }

  async function handleDeleteFolder(folderId: string) {
    showConfirm(
      "Delete Folder",
      "Delete this folder and all its contents?",
      async () => {
        const res = await fetch(`/api/drive/${driveId}/folders/${folderId}`, { method: "DELETE" });
        if (res.ok) invalidate("app:drive");
      }
    );
  }

  async function handleCreateItem() {
    if (!newItemName.trim()) return;
    creatingItem = true;
    if (newItemType === "folder") {
      const res = await fetch(`/api/drive/${driveId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newItemName.trim(), parentId: currentFolderId() }),
      });
      creatingItem = false;
      if (res.ok) {
        showNewItem = false;
        newItemName = "";
        invalidate("app:drive");
      } else {
        const r = await res.json();
        showConfirm("Error", r.error || "Failed to create folder", () => {}, "primary");
      }
    } else {
      const res = await fetch(`/api/drive/${driveId}/files/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newItemName.trim(), type: newItemType, folderId: currentFolderId() }),
      });
      creatingItem = false;
      if (res.ok) {
        showNewItem = false;
        newItemName = "";
        invalidate("app:drive");
      } else {
        const r = await res.json();
        showConfirm("Error", r.error || "Failed to create document", () => {}, "primary");
      }
    }
  }

  // Rename dialog
  let renameDialogOpen = $state(false);
  let renameTargetId = $state("");
  let renameTargetName = $state("");
  let renameTargetType = $state<"file" | "folder">("file");
  let renameValue = $state("");
  let renaming = $state(false);
  let renameError = $state("");

  function openRenameDialog(id: string, name: string, type: "file" | "folder") {
    renameTargetId = id;
    renameTargetName = name;
    renameTargetType = type;
    renameValue = name;
    renameError = "";
    renaming = false;
    renameDialogOpen = true;
  }

  async function doRename() {
    if (!renameValue.trim()) return;
    renaming = true;
    renameError = "";
    const endpoint = renameTargetType === "folder"
      ? `/api/drive/${driveId}/folders/${renameTargetId}`
      : `/api/drive/${driveId}/files/${renameTargetId}`;
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (res.ok) {
      renameDialogOpen = false;
      invalidate("app:drive");
    } else {
      const r = await res.json();
      renameError = r.error || "Rename failed";
    }
    renaming = false;
  }

  // Move dialog (personal drive only)
  let moveDialogOpen = $state(false);
  let moveTargets = $state<{ id: string; isFolder: boolean }[]>([]);
  let moveTargetNames = $state<string>("");
  let moveDir = $state<string | null>(null);
  let allFolders = $state<{ id: string; name: string; parentId: string | null }[]>([]);
  let moveRunning = $state(false);

  async function openMoveDialog() {
    moveTargets = selectedItems.map((i: any) => ({ id: i.id, isFolder: i.originalName === undefined }));
    moveTargetNames = selectedItems.map((i: any) => i.name || i.originalName).join(", ");
    moveDir = currentFolderId();
    moveRunning = false;
    const res = await fetch(`/api/drive/${driveId}/folders?all=true`);
    if (res.ok) {
      const r = await res.json();
      allFolders = r.folders;
    } else {
      allFolders = [];
    }
    moveDialogOpen = true;
  }

  async function doMove(folderId: string | null) {
    moveRunning = true;
    for (const { id, isFolder } of moveTargets) {
      await fetch(`/api/drive/${driveId}/${isFolder ? "folders" : "files"}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
    }
    moveRunning = false;
    moveDialogOpen = false;
    clearSelection();
    invalidate("app:drive");
  }

  // Shared drive state
  let shareInfo = $derived(isShared ? data.shareInfo : null);
  let sharedFolders = $derived(isShared ? data.sharedFolders ?? [] : []);
  let sharedFiles = $derived(isShared ? data.sharedFiles ?? [] : []);
  let shareBreadcrumbs = $derived(isShared ? data.shareBreadcrumbs ?? [] : []);
  let showDeleteConfirm = $state(false);
  let deleteTargetId = $state("");

  function hasPermission(perm: string) {
    if (!data.shareInfo?.permissions) return false;
    return data.shareInfo.permissions.split(",").map((p: string) => p.trim()).includes(perm);
  }

  // File share preview
  let sharePreviewFile = $derived(shareInfo?.type === "file" ? {
    id: shareInfo.file.id,
    originalName: shareInfo.file.name,
    type: shareInfo.file.type,
    size: shareInfo.file.size,
    uploadedAt: shareInfo.createdAt || new Date().toISOString(),
    hasPreview: false,
  } : null);

  // File preview overlay
  let filePreviewId = $derived(
    isShared && shareInfo?.type === "file"
      ? shareInfo.file.id
      : $page.url.searchParams.get("file")
  );
  let previewFiles = $derived(
    isShared && shareInfo?.type === "file"
      ? (sharePreviewFile ? [sharePreviewFile] : [])
      : (isShared ? sharedFiles : data.files ?? [])
  );
  let previewFileIndex = $derived(filePreviewId ? previewFiles.findIndex(f => f.id === filePreviewId) : -1);
  let previewFile = $derived(filePreviewId ? previewFiles[previewFileIndex] ?? null : null);
  let previewContent = $state<any>(null);
  let previewLoading = $state(false);
  let previewError = $state("");

  function openFilePreview(fileId: string) {
    clearSelection();
    const params = new URLSearchParams();
    const folder = currentFolderId();
    if (folder) params.set("folder", folder);
    params.set("file", fileId);
    goto(`/drive/${driveId}?${params}`);
  }

  function closeFilePreview() {
    const folder = currentFolderId();
    if (isShared && shareInfo?.type === "file") return;
    const params = folder ? `?folder=${folder}` : "";
    goto(`/drive/${driveId}${params}`);
  }

  function goToPrevFile() {
    if (previewFileIndex > 0) {
      openFilePreview(previewFiles[previewFileIndex - 1].id);
    }
  }

  function goToNextFile() {
    if (previewFileIndex < previewFiles.length - 1) {
      openFilePreview(previewFiles[previewFileIndex + 1].id);
    }
  }

  async function loadPreviewContent() {
    if (!filePreviewId || !previewFile) return;
    previewLoading = true;
    previewError = "";
    previewContent = null;
    const res = await fetch(`/api/drive/${driveId}/files/${filePreviewId}/content`);
    if (res.ok) {
      const d = await res.json();
      previewContent = d;
    } else {
      previewError = "Failed to load preview";
    }
    previewLoading = false;
  }

  $effect(() => {
    if (filePreviewId && previewFile && !previewFile.type.startsWith("image/") && !previewFile.type.startsWith("audio/")) {
      loadPreviewContent();
    }
  });

  let previewCategory = $derived(filePreviewId && previewFile ? getFileIconClass(previewFile.type, previewFile.originalName) : null);

  // Edit mode
  let editMode = $state(false);
  let editText = $state("");

  function enableEdit() {
    if (previewContent?.content != null) {
      editText = previewContent.content;
      editMode = true;
    }
  }

  async function saveEdit() {
    if (!filePreviewId) return;
    const res = await fetch(`/api/drive/${driveId}/files/${filePreviewId}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText }),
    });
    if (res.ok) {
      editMode = false;
      loadPreviewContent();
      invalidate("app:drive");
    }
  }

  function cancelEdit() {
    editMode = false;
    editText = "";
  }

  function handleSharePreview() {
    // no-op: sharing from within share preview is not applicable
  }

  function handleDeletePreview(id: string) {
    if (isShared && hasPermission("structure")) {
      deleteTargetId = id;
      showDeleteConfirm = true;
    } else if (!isShared) {
      handleDelete(id);
    }
  }

  // Selection
  let selectedIds = $state(new Set<string>());
  let selectedCount = $derived(selectedIds.size);
  let hasSelection = $derived(selectedCount > 0);

  function toggleSelection(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  function clearSelection() {
    selectedIds = new Set();
  }

  let selectedItems = $derived.by(() => {
    const ids = selectedIds;
    return [
      ...filteredFolders.filter((f: any) => ids.has(f.id)),
      ...filteredFiles.filter((f: any) => ids.has(f.id)),
    ];
  });
  
  // Raw folders/files
  let rawFolders = $derived(isShared ? sharedFolders : data.folders ?? []);
  let rawFiles = $derived(isShared ? sharedFiles : data.files ?? []);
  let displayBreadcrumbs = $derived(isShared ? shareBreadcrumbs : data.breadcrumbs ?? []);
  let displayFolderSizes = $derived(!isShared ? data.folderSizes : undefined);

  // Search, filter, sort
  let searchOpen = $state(false);
  let searchQuery = $state("");
  type SortMode = "name-asc" | "name-desc" | "date-desc" | "date-asc" | "size-desc" | "size-asc";
  let sortMode = $state<SortMode>("date-desc");
  let filterType = $state("all");

  function updateSort(col: "name" | "date" | "size") {
    const map: Record<string, [SortMode, SortMode]> = {
      name: ["name-asc", "name-desc"],
      date: ["date-asc", "date-desc"],
      size: ["size-asc", "size-desc"],
    };
    const [asc, desc] = map[col];
    sortMode = sortMode === desc ? asc : desc;
  }

  function sortIndicator(col: "name" | "date" | "size"): "asc" | "desc" | null {
    if (sortMode === `${col}-asc`) return "asc";
    if (sortMode === `${col}-desc`) return "desc";
    return null;
  }

  function getFileCategory(f: any): string {
    const t = f.type || "";
    const n = f.originalName || "";
    const ext = n.split(".").pop()?.toLowerCase() || "";
    if (["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml", "image/avif"].includes(t)) return "images";
    if (["mp4", "webm", "mkv", "avi", "mov", "wmv", "flv", "m4v", "mpg", "mpeg", "3gp"].includes(ext) ||
        ["video/mp4", "video/webm", "video/x-matroska", "video/avi", "video/x-msvideo", "video/quicktime", "video/x-ms-wmv", "video/x-flv", "video/mpeg"].includes(t)) return "videos";
    if (["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma", "opus", "webm"].includes(ext) ||
        t.startsWith("audio/")) return "audio";
    if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "md"].includes(ext)) return "documents";
    if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return "archives";
    return "other";
  }

  let filteredFolders = $derived.by(() => {
    let items = rawFolders;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((f: any) => f.name.toLowerCase().includes(q));
    }
    const sortFn = sortMode === "name-asc" ? (a: any, b: any) => a.name.localeCompare(b.name)
      : sortMode === "name-desc" ? (a: any, b: any) => b.name.localeCompare(a.name)
      : sortMode === "date-asc" ? (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : sortMode === "date-desc" ? (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : () => 0;
    return [...items].sort(sortFn);
  });

  let filteredFiles = $derived.by(() => {
    let items = rawFiles;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((f: any) => f.originalName.toLowerCase().includes(q));
    }
    if (filterType !== "all") {
      items = items.filter((f: any) => getFileCategory(f) === filterType);
    }
    const sortFn = sortMode === "name-asc" ? (a: any, b: any) => a.originalName.localeCompare(b.originalName)
      : sortMode === "name-desc" ? (a: any, b: any) => b.originalName.localeCompare(a.originalName)
      : sortMode === "date-asc" ? (a: any, b: any) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
      : sortMode === "date-desc" ? (a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      : sortMode === "size-asc" ? (a: any, b: any) => a.size - b.size
      : sortMode === "size-desc" ? (a: any, b: any) => b.size - a.size
      : () => 0;
    return [...items].sort(sortFn);
  });

  // Folders/files for the display
  let displayFolders = $derived(filteredFolders);
  let displayFiles = $derived(filteredFiles);
  let canUpload = $derived(!isShared || hasPermission("insert"));
  let canDelete = $derived(!isShared || hasPermission("structure"));
  let canEdit = $derived(!isShared || (isShared && shareInfo?.type === "file" && hasPermission("edit")));
  let canRename = $derived(!isShared || hasPermission("structure"));
  let showUploadButton = $derived(canUpload);

  let singleSelected = $derived(selectedCount === 1 ? selectedItems[0] : null);
  let canRenameSelection = $derived(canRename && !!singleSelected);
  let canShareSelection = $derived(!isShared && !!singleSelected && singleSelected.originalName !== undefined);
  let canMoveSelection = $derived(!isShared && selectedCount > 0);
  let canDeleteSelection = $derived(canDelete && selectedCount > 0);

  async function handleBulkDelete() {
    if (!canDeleteSelection) return;
    showConfirm(
      "Delete",
      `Delete ${selectedCount} item${selectedCount > 1 ? "s" : ""}?`,
      async () => {
        for (const item of selectedItems) {
          if (item.originalName === undefined) {
            await fetch(`/api/drive/${driveId}/folders/${item.id}`, { method: "DELETE" });
          } else {
            await fetch(`/api/drive/${driveId}/files/${item.id}`, { method: "DELETE" });
          }
        }
        clearSelection();
        invalidate("app:drive");
      },
    );
  }

  function handleSelectionRename() {
    if (!singleSelected) return;
    const item = singleSelected;
    const type = item.originalName === undefined ? "folder" : "file";
    openRenameDialog(item.id, item.name || item.originalName, type);
    clearSelection();
  }

  function handleSelectionShare() {
    if (!singleSelected || singleSelected.originalName === undefined) return;
    openShareDialog(singleSelected.id, singleSelected.name || singleSelected.originalName, "file");
    clearSelection();
  }

  function handleSelectionMove() {
    openMoveDialog();
    clearSelection();
  }

</script>

<Flex direction="column" style="height: 100%;" gap="0">
  {#if isShared && shareInfo?.type === "file"}
    <div class="content-area">
      <FilePreview
        {driveId}
        {filePreviewId}
        previewFile={sharePreviewFile}
        {previewCategory}
        {previewContent}
        {previewLoading}
        {previewError}
        {previewFiles}
        previewFileIndex={0}
        bind:editMode
        bind:editText
        ongotoprev={() => {}}
        ongotonext={() => {}}
        onenableedit={canEdit ? enableEdit : undefined}
        onsaveedit={canEdit ? saveEdit : undefined}
        oncanceledit={canEdit ? cancelEdit : undefined}
        ondelete={canDelete ? () => handleDelete(shareInfo.file.id) : undefined}
      />
    </div>
  {:else if !isShared && !data.user}
    <Flex align="center" justify="center" style="flex: 1; padding: var(--flew-spacing-6);">
      <Card variant="outlined" paddingSize="lg" style="text-align: center;">
        <Text color="secondary">Sign in to access your drive.</Text>
        <a href="/auth"><Button variant="primary" style="margin-top: var(--flew-spacing-2);">Sign In</Button></a>
      </Card>
    </Flex>
  {:else}
    <Toolbar
      breadcrumbs={displayBreadcrumbs}
      {viewMode}
      onnavigate={navigateTo}
      onviewmodechange={(m) => viewMode = m}
      showNewButton={canUpload}
      onnewclick={() => { showNewItem = true; newItemType = "folder"; newItemName = ""; }}
      showUploadButton={showUploadButton}
      onuploadclick={() => document.querySelector<HTMLInputElement>("#drive-file-input")?.click()}
      {hasSelection}
      selectedCount={selectedCount}
      canRenameSelection={canRenameSelection}
      canShareSelection={canShareSelection}
      canMoveSelection={canMoveSelection}
      canDeleteSelection={canDeleteSelection}
      onRename={handleSelectionRename}
      onShare={handleSelectionShare}
      onMove={handleSelectionMove}
      onDelete={handleBulkDelete}
      onClearSelection={clearSelection}
      bind:searchOpen
      bind:searchQuery
      bind:filterType
      bind:sortMode
      onsearchclear={() => searchQuery = ""}
      onfilterchange={(v) => filterType = v}
      onsortchange={(v) => sortMode = v as any}
    />

    <form method="POST" enctype="multipart/form-data" style="display: none;" onsubmit={handleUpload}>
      <input
        id="drive-file-input"
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.md,.mp3,.wav,.flac,.ogg,.aac,.m4a,.wma,.opus,.webm"
        onchange={(e) => {
          (e.currentTarget as HTMLInputElement).form?.requestSubmit();
        }}
      />
    </form>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="content-area"
      class:drag-over={dragOver}
      ondragover={(e: DragEvent) => { e.preventDefault(); dragOver = true; }}
      ondragleave={() => dragOver = false}
      ondrop={(e: DragEvent) => {
        e.preventDefault();
        dragOver = false;
        if (!canUpload) return;
        const dt = e.dataTransfer;
        if (dt?.files.length) {
          const input = document.querySelector<HTMLInputElement>("#drive-file-input");
          if (input) {
            const dT = new DataTransfer();
            for (const f of dt.files) dT.items.add(f);
            input.files = dT.files;
            input.form?.requestSubmit();
          }
        }
      }}
    >
      {#if !isOnline}
        <div class="offline-banner" class:offline-banner--uploading={uploading}>
          <Text size="xs" color="warning">
            {uploading ? "Connection lost — upload paused, resumes automatically" : "No internet connection"}
          </Text>
        </div>
      {/if}
      {#if uploading}
        <div class="upload-banner">
          <Flex direction="vertical" gap="var(--flew-spacing-1)" style="width: 100%;">
            <Flex align="center" justify="between">
              <Flex align="center" gap="var(--flew-spacing-2)">
                <Upload size={16} />
                <Text size="sm" weight="medium">Uploading {uploadProgress}/{uploadTotal}</Text>
              </Flex>
              <Flex align="center" gap="var(--flew-spacing-2)">
                <Text size="xs" color="tertiary" style="width:80px;text-align:right;">
                  {totalEta > 0 ? `${formatEta(totalEta)} left` : ""}
                </Text>
                <Text size="xs" color="tertiary" style="width:72px;text-align:right;">
                  {totalSpeed > 0 ? formatSpeed(totalSpeed) : ""}
                </Text>
                <div style="width:80px;">
                  <div class="progress-bar progress-bar--sm">
                    <div class="progress-fill" style="width: {overallBytes ? (totalUploadedBytes / overallBytes * 100) : 0}%;"></div>
                  </div>
                </div>
              </Flex>
            </Flex>
            {#each uploadFiles as f}
              {#if !f.done}
                <Flex align="center" justify="between" style="padding-left: 24px;">
                  <Text size="xs" color="secondary" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:40%;">{f.name}</Text>
                  <Flex align="center" gap="var(--flew-spacing-2)">
                    <Text size="xs" color="tertiary" style="width:80px;text-align:right;">
                      {f.eta > 0 ? `${formatEta(f.eta)} left` : ""}
                    </Text>
                    <Text size="xs" color="tertiary" style="width:72px;text-align:right;">
                      {f.speed > 0 ? formatSpeed(f.speed) : ""}
                    </Text>
                    <div style="width:80px;">
                      <div class="progress-bar progress-bar--sm">
                        <div class="progress-fill" style="width: {f.totalBytes ? (f.uploadedBytes / f.totalBytes * 100) : 0}%;"></div>
                      </div>
                    </div>
                  </Flex>
                </Flex>
              {/if}
            {/each}
          </Flex>
        </div>
      {/if}

      <FilePreview
        {driveId}
        {filePreviewId}
        {previewFile}
        {previewCategory}
        {previewContent}
        {previewLoading}
        {previewError}
        previewFiles={previewFiles}
        {previewFileIndex}
        bind:editMode
        bind:editText
        onclose={closeFilePreview}
        ongotoprev={goToPrevFile}
        ongotonext={goToNextFile}
        onenableedit={!isShared ? enableEdit : undefined}
        onsaveedit={!isShared ? saveEdit : undefined}
        oncanceledit={!isShared ? cancelEdit : undefined}
        onshare={!isShared ? openShareDialog : undefined}
        ondelete={canDelete ? handleDeletePreview : undefined}
      />

      {#if !filePreviewId}
        {#if viewMode === "grid"}
          <GridView
            {driveId}
            folders={displayFolders}
            files={displayFiles}
            folderSizes={displayFolderSizes}
            {selectedIds}
            onnavigate={navigateTo}
            onopenfilepreview={openFilePreview}
            ontoggleselection={toggleSelection}
          />
        {:else}
          <ListView
            {driveId}
            folders={displayFolders}
            files={displayFiles}
            folderSizes={displayFolderSizes}
            {selectedIds}
            {sortMode}
            {updateSort}
            {sortIndicator}
            onnavigate={navigateTo}
            onopenfilepreview={openFilePreview}
            ontoggleselection={toggleSelection}
          />
        {/if}
      {/if}
    </div>
  {/if}
</Flex>

<!-- Share Dialog (personal drive only) -->
{#if !isShared}
  <Modal bind:open={shareDialogOpen} title={showShareDialog?.name ?? ""} onClose={closeShareDialog} width="520px">
    {#if showShareDialog}
      <form id="share-form" onsubmit={(e) => { e.preventDefault(); createShareLink(); }}>
        <Flex direction="vertical" gap="var(--flew-spacing-4)">
          <Select label="Permissions" bind:value={sharePermissions} options={permissionOptions} />
          <Input type="datetime-local" label="Expires at (optional)" bind:value={shareExpiry} />

          {#if shareUrlValue}
            <Flex direction="vertical" gap="var(--flew-spacing-1)">
              <Text size="xs" color="secondary" weight="semibold">Share URL</Text>
              <Input value={shareUrlValue} readonly />
            </Flex>
          {:else}
            <Button type="submit" variant="primary" size="sm" disabled={creatingShare}>
              {creatingShare ? "Creating..." : "Create Share Link"}
            </Button>
          {/if}

          {#if shareUrlValue}
            <Button type="button" variant="primary" size="sm" onclick={() => copyShareUrl(existingShares[0]?.token || "")}>
              {copiedToken ? "Copied!" : "Copy Link"}
            </Button>
          {/if}

          {#if createShareError}
            <Text size="sm" color="error">{createShareError}</Text>
          {/if}
        </Flex>
      </form>

      {#if existingShares.length > 0}
        <Divider />
        <Flex direction="vertical" gap="var(--flew-spacing-2)">
          <Text size="xs" color="tertiary" weight="semibold">EXISTING SHARE LINKS</Text>
          {#each existingShares as share, i}
            {#if i > 0}<Divider />{/if}
            <Flex direction="vertical" gap="var(--flew-spacing-1)">
              <Flex align="center" gap="var(--flew-spacing-2)">
                {#if share.file}
                  <File size={12} />
                  <Text size="xs" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {share.file.originalName}
                  </Text>
                {:else if share.folder}
                  <Folder size={12} />
                  <Text size="xs" style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {share.folder.name}
                  </Text>
                {/if}
              </Flex>
              <Flex align="center" gap="var(--flew-spacing-2)" style="flex-wrap: wrap;">
                {#each share.permissions.split(",") as perm}
                  <Tag size="sm" variant={perm === "view" ? "neutral" : "primary"}>{perm.trim()}</Tag>
                {/each}
                {#if share.expiresAt}
                  <Flex align="center" gap="2px">
                    <Clock size={10} />
                    <Text size="xs" color="tertiary">{formatDate(share.expiresAt)}</Text>
                  </Flex>
                {/if}
                <div style="flex: 1;"></div>
                <Button variant="ghost" size="xs" onclick={() => copyShareUrl(share.token)}>
                  {copiedToken === share.token ? "Copied!" : "Copy"}
                </Button>
                <Button variant="ghost" size="xs" icon onclick={() => revokeShare(share.id)} aria-label="Revoke">
                  <X size={12} />
                </Button>
              </Flex>
              <Text size="xs" color="secondary" style="word-break: break-all;">{location.origin}/drive/{share.token}</Text>
            </Flex>
          {/each}
        </Flex>
      {/if}
    {/if}
    {#snippet footer()}
      <Button variant="ghost" onclick={closeShareDialog}>Close</Button>
    {/snippet}
  </Modal>
{/if}

<!-- Confirm Dialog -->
<Modal bind:open={confirmOpen} title={confirmTitle} onClose={() => confirmOpen = false}>
  <Text>{confirmMessage}</Text>
  {#snippet footer()}
    <Flex gap="var(--flew-spacing-2)" justify="end">
      <Button variant="ghost" onclick={() => confirmOpen = false}>Cancel</Button>
      <Button variant={confirmVariant === "danger" ? "primary" : "primary"} onclick={confirmAction}>
        {confirmTitle}
      </Button>
    </Flex>
  {/snippet}
</Modal>

<!-- New Item Dialog -->
<Modal bind:open={showNewItem} title="New" onClose={() => { showNewItem = false; newItemName = ""; }} width="400px">
    <form id="new-item-form" onsubmit={(e) => { e.preventDefault(); handleCreateItem(); }}>
      <Flex direction="vertical" gap="var(--flew-spacing-4)">
        <Flex direction="vertical" gap="var(--flew-spacing-2)">
          <Text size="sm" weight="medium">Type</Text>
          <Select
            bind:value={newItemType}
            options={[
              { value: "folder", label: "Folder" },
              { value: "txt", label: "Text (.txt)" },
              { value: "md", label: "Markdown (.md)" },
              { value: "csv", label: "CSV (.csv)" },
            ]}
          />
        </Flex>
        <Flex direction="vertical" gap="var(--flew-spacing-2)">
          <Text size="sm" weight="medium">Name</Text>
          <Input bind:value={newItemName} placeholder={newItemType === "folder" ? "New Folder" : newItemType === "txt" ? "notes.txt" : newItemType === "md" ? "readme.md" : "data.csv"} required />
        </Flex>
      </Flex>
    </form>
    {#snippet footer()}
      <Flex gap="var(--flew-spacing-2)" justify="end">
        <Button variant="ghost" onclick={() => { showNewItem = false; newItemName = ""; }}>Cancel</Button>
        <Button type="submit" form="new-item-form" variant="primary" disabled={!newItemName.trim() || creatingItem}>
          {creatingItem ? "Creating..." : "Create"}
        </Button>
      </Flex>
    {/snippet}
  </Modal>

<!-- Move Dialog (personal drive only) -->
{#if !isShared}
  <Modal bind:open={moveDialogOpen} title="Move {selectedCount > 1 ? `${selectedCount} items` : moveTargetNames}" onClose={() => moveDialogOpen = false} width="480px">
    <form method="dialog">
      <Flex direction="vertical" gap="var(--flew-spacing-1)">
        <Text size="sm" weight="medium" style="margin-bottom: 4px;">Choose destination:</Text>
        <button type="button" class="move-option" onclick={() => doMove(null)} disabled={moveRunning}>
          <Folder size={16} />
          <Text size="sm">My Drive (root)</Text>
        </button>
        {#each allFolders.filter(f => f.id !== moveDir) as folder}
          <button type="button" class="move-option" onclick={() => doMove(folder.id)} disabled={moveRunning}>
            <Folder size={16} />
            <Text size="sm">{folder.name}</Text>
          </button>
        {/each}
      </Flex>
    </form>
    {#snippet footer()}
      <Button variant="ghost" onclick={() => moveDialogOpen = false} disabled={moveRunning}>Cancel</Button>
    {/snippet}
  </Modal>
{/if}

<!-- Rename Dialog -->
<Modal bind:open={renameDialogOpen} title="Rename &quot;{renameTargetName}&quot;" onClose={() => renameDialogOpen = false} width="400px">
  <form id="rename-form" onsubmit={(e) => { e.preventDefault(); doRename(); }}>
    <Flex direction="vertical" gap="var(--flew-spacing-3)">
      <Input label="Name" bind:value={renameValue} required />
      {#if renameError}
        <Text size="sm" color="error">{renameError}</Text>
      {/if}
    </Flex>
  </form>
  {#snippet footer()}
    <Flex gap="var(--flew-spacing-2)" justify="end">
      <Button variant="ghost" onclick={() => renameDialogOpen = false}>Cancel</Button>
      <Button type="submit" form="rename-form" variant="primary" disabled={renaming || !renameValue.trim()}>
        {renaming ? "Renaming..." : "Rename"}
      </Button>
    </Flex>
  {/snippet}
</Modal>

<!-- Delete Confirm (shared drive only) -->
{#if isShared}
  <Modal bind:open={showDeleteConfirm} title="Delete File" onClose={() => showDeleteConfirm = false}>
    <Text>Are you sure you want to delete this file?</Text>
    {#snippet footer()}
      <Flex gap="var(--flew-spacing-2)" justify="end">
        <Button variant="ghost" onclick={() => showDeleteConfirm = false}>Cancel</Button>
        <Button variant="primary" onclick={() => { showDeleteConfirm = false; doDeleteFile(deleteTargetId); }}>Delete</Button>
      </Flex>
    {/snippet}
  </Modal>
{/if}

<svelte:window onkeydown={(e) => { if (e.key === "Escape" && filePreviewId) closeFilePreview(); }} />

<style>
  .content-area {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    position: relative;
  }

  .content-area.drag-over {
    background: var(--flew-color-bg-active);
  }

  .upload-banner {
    display: flex;
    align-items: center;
    gap: var(--flew-spacing-2);
    padding: 10px 18px;
    background: var(--flew-color-bg-overlay);
    border-bottom: 1px solid var(--flew-color-border);
  }

  .progress-bar {
    height: 8px;
    background: var(--flew-color-bg-hover);
    border-radius: var(--flew-radius-full);
    overflow: hidden;
  }

  .progress-bar--sm {
    height: 4px;
  }

  .progress-fill {
    height: 100%;
    background: var(--flew-color-primary);
    border-radius: var(--flew-radius-full);
    transition: width 200ms ease;
  }

  .move-option {
    display: flex;
    align-items: center;
    gap: var(--flew-spacing-2);
    width: 100%;
    text-align: left;
    padding: 10px 14px;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: var(--flew-radius-sm);
    color: inherit;
    font-size: inherit;
    transition: background var(--flew-transition-fast);
  }

  .move-option:hover {
    background: var(--flew-color-bg-hover);
  }

  .offline-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 18px;
    background: var(--flew-color-warning-bg, #fef3c7);
    border-bottom: 1px solid var(--flew-color-warning-border, #f59e0b);
    flex-shrink: 0;
  }

  .offline-banner--uploading {
    background: var(--flew-color-danger-bg, #fee2e2);
    border-bottom-color: var(--flew-color-danger-border, #ef4444);
  }

</style>
