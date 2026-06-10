<script lang="ts">
  import { Button, Flex, Text } from "flewui";
  import { File, Folder } from "@lucide/svelte";
  import { formatSize, getPreviewUrl, isImageType, isVideoType } from "./helpers";

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

  function handleClick(e: MouseEvent, id: string, isFolder: boolean) {
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
        <div class="grid-preview grid-folder-preview">
          <Folder size={48} />
        </div>
        <div class="grid-info">
          <Text size="sm" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">{f.name}</Text>
          <Text size="xs" color="tertiary">{formatSize(folderSizes[f.id] ?? 0)}</Text>
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
            <File size={48} />
          {/if}
        </div>
        <div class="grid-info">
          <Text size="sm" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block;">{f.originalName}</Text>
          <Text size="xs" color="tertiary">{formatSize(f.size)}</Text>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <Flex align="center" justify="center" style="height: 100%;">
    <Text color="tertiary">{emptyMessage}</Text>
  </Flex>
{/if}

<style>
  .grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--flew-spacing-3);
    padding: 16px;
  }

  .grid-item {
    border: 1px solid var(--flew-color-border);
    border-radius: var(--flew-radius-md);
    overflow: hidden;
    cursor: pointer;
    transition: all var(--flew-transition-fast);
    background: var(--flew-color-bg);
  }

  .grid-item:hover {
    border-color: var(--flew-color-text-tertiary);
    box-shadow: var(--flew-shadow-sm);
  }

  .grid-item.selected {
    border-color: var(--flew-color-primary);
    box-shadow: 0 0 0 1px var(--flew-color-primary);
  }

  .grid-preview {
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--flew-color-bg-hover);
    overflow: hidden;
  }

  .grid-folder-preview {
    background: var(--flew-color-bg-active);
    color: var(--flew-color-text-secondary);
  }

  .grid-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .grid-info {
    padding: 8px 10px;
  }

  @media (max-width: 768px) {
    .grid-view {
      gap: var(--flew-spacing-3);
      padding: 12px;
    }

    .grid-preview {
      height: 180px;
    }

    .grid-item {
      font-size: 14px;
    }

    .grid-info :global(.flew-text--sm) {
      font-size: 14px !important;
    }
  }
</style>
