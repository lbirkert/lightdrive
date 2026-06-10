import type { UploadFileState } from "./types";

export class UploadStore {
  files = $state<UploadFileState[]>([]);
  startTime = $state(0);
  now = $state(Date.now());
  currentXhr: XMLHttpRequest | null = null;
  onlineResolve: (() => void) | null = null;
  isOnline = $state(true);
  expanded = $state(false);

  uploading = $derived(this.files.length > 0 && this.files.some(f => !f.done));
  progress = $derived(this.files.filter(f => f.done).length);
  total = $derived(this.files.length);
  overallBytes = $derived(this.files.reduce((a, f) => a + f.totalBytes, 0));
  totalUploadedBytes = $derived(this.files.reduce((a, f) => a + f.uploadedBytes, 0));
  totalSpeed = $derived(
    this.totalUploadedBytes > 0 && this.startTime > 0
      ? this.totalUploadedBytes / ((this.now - this.startTime) / 1000)
      : 0
  );
  totalEta = $derived(
    this.totalSpeed > 0 ? (this.overallBytes - this.totalUploadedBytes) / this.totalSpeed : 0
  );
}

export const uploadStore = new UploadStore();
