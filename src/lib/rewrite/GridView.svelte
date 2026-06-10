<script lang="ts">
  import { formatSize, getPreviewUrl, isImageType, isVideoType } from "./helpers";
  import { Folder, FileText } from "@lucide/svelte";

  let failedImages = $state<Set<string>>(new Set());
  function imgError(fileId: string) {
    failedImages.add(fileId);
    failedImages = new Set(failedImages);
  }

  type Item = Record<string, any>;

  type Props = {
    driveId?: string;
    folders: Item[];
    files: Item[];
    folderSizes?: Record<string, number>;
    selectedIds: Set<string>;
    onnavigate?: (id: string | null) => void;
    onopenfilepreview?: (id: string) => void;
    ontoggleselection?: (id: string) => void;
    emptyMessage?: string;
  };

  let {
    driveId, folders, files, folderSizes = {},
    selectedIds,
    onnavigate, onopenfilepreview, ontoggleselection,
    emptyMessage = "No files yet.",
  }: Props = $props();

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressFired = false;

  function touchStart(id: string) {
    longPressFired = false;
    longPressTimer = setTimeout(() => {
      ontoggleselection?.(id);
      longPressTimer = null;
      longPressFired = true;
    }, 500);
  }

  function touchEnd() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  function touchMove() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  function handleClick(e: MouseEvent, id: string, isFolder: boolean) {
    if (longPressFired) { longPressFired = false; return; }
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    if (e.ctrlKey || e.metaKey) { ontoggleselection?.(id); }
    else if (selectedIds.size > 0) { ontoggleselection?.(id); }
    else { if (isFolder) onnavigate?.(id); else onopenfilepreview?.(id); }
  }
</script>

{#if folders.length > 0 || files.length > 0}
  <div class="grid-view">
    {#each folders as f}
      <div
        class="grid-item"
        class:selected={selectedIds.has(f.id)}
        onclick={(e) => handleClick(e, f.id, true)}
        oncontextmenu={(e) => e.preventDefault()}
        ontouchstart={() => touchStart(f.id)}
        ontouchend={touchEnd}
        ontouchmove={touchMove}
        role="button"
        tabindex={0}
        onkeydown={(e) => { if (e.key === "Enter") handleClick(e, f.id, true); }}
      >
        <div class="grid-preview"><Folder size={24} /></div>
        <div class="grid-info">
          <span class="grid-name">{f.name}</span>
          <span class="grid-size">{formatSize(folderSizes[f.id] ?? 0)}</span>
        </div>
      </div>
    {/each}
    {#each files as f}
      <div
        class="grid-item"
        class:selected={selectedIds.has(f.id)}
        onclick={(e) => handleClick(e, f.id, false)}
        oncontextmenu={(e) => e.preventDefault()}
        ontouchstart={() => touchStart(f.id)}
        ontouchend={touchEnd}
        ontouchmove={touchMove}
        role="button"
        tabindex={0}
        onkeydown={(e) => { if (e.key === "Enter") handleClick(e, f.id, false); }}
      >
        <div class="grid-preview">
          {#if f.hasPreview || (isVideoType(f.type, f.originalName) && !failedImages.has(f.id))}
            <img src={getPreviewUrl(f.id, driveId)} alt={f.originalName} class="grid-thumb" loading="lazy" onerror={() => imgError(f.id)} />
          {:else if isImageType(f.type)}
            <img src="/api/drive/{driveId}/files/{f.id}/download" alt={f.originalName} class="grid-thumb" loading="lazy" />
          {:else}
            <FileText size={24} />
          {/if}
        </div>
        <div class="grid-info">
          <span class="grid-name">{f.originalName}</span>
          <span class="grid-size">{formatSize(f.size)}</span>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="empty-state">{emptyMessage}</div>
{/if}
