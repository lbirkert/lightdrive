<script lang="ts">
  import {
    formatSize,
    formatFullDate,
    getPreviewUrl,
    isVideoType,
  } from "./helpers";
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
    sortMode?: string;
    updateSort?: (col: "name" | "date" | "size") => void;
    sortIndicator?: (col: "name" | "date" | "size") => "asc" | "desc" | null;
    onnavigate?: (id: string | null) => void;
    onopenfilepreview?: (id: string) => void;
    ontoggleselection?: (id: string) => void;
    emptyMessage?: string;
  };

  let {
    driveId,
    folders,
    files,
    folderSizes = {},
    selectedIds,
    sortMode = "date-desc",
    updateSort,
    sortIndicator,
    onnavigate,
    onopenfilepreview,
    ontoggleselection,
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
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function touchMove() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handleClick(
    e: { ctrlKey: boolean; metaKey: boolean },
    id: string,
    isFolder: boolean,
  ) {
    if (longPressFired) {
      longPressFired = false;
      return;
    }
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (e.ctrlKey || e.metaKey) {
      ontoggleselection?.(id);
    } else if (selectedIds.size > 0) {
      ontoggleselection?.(id);
    } else {
      if (isFolder) onnavigate?.(id);
      else onopenfilepreview?.(id);
    }
  }
</script>

{#if folders.length > 0 || files.length > 0}
  <div class="list-table">
    <div class="list-header">
      <button class="col-header" onclick={() => updateSort?.("name")}>
        Name{sortIndicator?.("name") === "asc"
          ? " ↑"
          : sortIndicator?.("name") === "desc"
            ? " ↓"
            : ""}
      </button>
      <button class="col-header col-size" onclick={() => updateSort?.("size")}>
        Size{sortIndicator?.("size") === "asc"
          ? " ↑"
          : sortIndicator?.("size") === "desc"
            ? " ↓"
            : ""}
      </button>
      <button class="col-header col-date" onclick={() => updateSort?.("date")}>
        Created{sortIndicator?.("date") === "asc"
          ? " ↑"
          : sortIndicator?.("date") === "desc"
            ? " ↓"
            : ""}
      </button>
      <span class="col-header col-owner">Owner</span>
    </div>
    {#each folders as f}
      <div
        class="list-row"
        class:selected={selectedIds.has(f.id)}
        onclick={(e) => handleClick(e, f.id, true)}
        oncontextmenu={(e) => e.preventDefault()}
        ontouchstart={() => touchStart(f.id)}
        ontouchend={touchEnd}
        ontouchmove={touchMove}
        role="button"
        tabindex={0}
        onkeydown={(e) => {
          if (e.key === "Enter") handleClick(e, f.id, true);
        }}
      >
        <span class="col-name">
          <span class="list-thumb-placeholder"><Folder size={16} /></span>
          <div>
            <span class="name-text">{f.name}</span>
            <span class="name-size m-show">{formatSize(folderSizes[f.id] ?? 0)}</span>
          </div>
        </span>
        <span class="col-size">{formatSize(folderSizes[f.id] ?? 0)}</span>
        <span class="col-date">{formatFullDate(f.createdAt)}</span>
        <span class="col-owner">You</span>
      </div>
    {/each}
    {#each files as f}
      <div
        class="list-row"
        class:selected={selectedIds.has(f.id)}
        onclick={(e) => handleClick(e, f.id, false)}
        oncontextmenu={(e) => e.preventDefault()}
        ontouchstart={() => touchStart(f.id)}
        ontouchend={touchEnd}
        ontouchmove={touchMove}
        role="button"
        tabindex={0}
        onkeydown={(e) => {
          if (e.key === "Enter") handleClick(e, f.id, false);
        }}
      >
        <span class="col-name">
          {#if f.hasPreview || (isVideoType(f.type, f.originalName) && !failedImages.has(f.id))}
            <img
              src={getPreviewUrl(f.id, driveId)}
              alt=""
              class="list-thumb"
              onerror={() => imgError(f.id)}
            />
          {:else}
            <span class="list-thumb-placeholder"><FileText size={16} /></span>
          {/if}
          <div>
            <span class="name-text">{f.originalName}</span>
            <span class="name-size m-show">{formatSize(f.size)}</span>
          </div>
        </span>
        <span class="col-size">{formatSize(f.size)}</span>
        <span class="col-date">{formatFullDate(f.uploadedAt)}</span>
        <span class="col-owner">You</span>
      </div>
    {/each}
  </div>
{:else}
  <div class="empty-state">{emptyMessage}</div>
{/if}
