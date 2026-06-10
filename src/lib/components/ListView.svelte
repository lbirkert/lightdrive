<script lang="ts">
  import { Flex, Text } from "flewui";
  import { File, Folder, ArrowUp, ArrowDown } from "@lucide/svelte";
  import {
    formatSize,
    formatFullDate,
    getPreviewUrl,
    isVideoType,
  } from "./helpers";

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
  <div class="list-table">
    <div class="list-header">
      <button class="col-name col-header" onclick={() => updateSort?.("name")}>
        Name
        {#if sortIndicator?.("name") === "asc"}<ArrowUp size={12} />
        {:else if sortIndicator?.("name") === "desc"}<ArrowDown size={12} />
        {/if}
      </button>
      <button class="col-size col-header" onclick={() => updateSort?.("size")}>
        Size
        {#if sortIndicator?.("size") === "asc"}<ArrowUp size={12} />
        {:else if sortIndicator?.("size") === "desc"}<ArrowDown size={12} />
        {/if}
      </button>
      <button class="col-date col-header" onclick={() => updateSort?.("date")}>
        Created
        {#if sortIndicator?.("date") === "asc"}<ArrowUp size={12} />
        {:else if sortIndicator?.("date") === "desc"}<ArrowDown size={12} />
        {/if}
      </button>
      <span class="col-owner">Owner</span>
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
          <div class="icon">
            <Folder size={40} />
          </div>
          <Flex direction="column" gap="0" style="min-width: 0;">
            <Text>{f.name}</Text>
            <Text
              style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
              >{formatSize(folderSizes[f.id] ?? 0)} {formatFullDate(f.createdAt)}</Text
            >
          </Flex>
        </span>
        <span class="col-size"
          ><Text size="xs" color="tertiary"
            >{formatSize(folderSizes[f.id] ?? 0)}</Text
          ></span
        >
        <span class="col-date"
          ><Text size="xs" color="tertiary">{formatFullDate(f.createdAt)}</Text
          ></span
        >
        <span class="col-owner"
          ><Text size="xs" color="tertiary">You</Text></span
        >
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
          <div class="icon">
            {#if f.hasPreview || (isVideoType(f.type, f.originalName) && !failedImages.has(f.id))}
              <img
                src={getPreviewUrl(f.id, driveId)}
                alt=""
                class="list-thumb"
                onerror={() => imgError(f.id)}
              />
            {:else}
              <File size={40} />
            {/if}
          </div>
          <Flex direction="column" gap="0" style="min-width: 0;">
            <Text
              style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
              >{f.originalName}</Text
            >
            <Text
              style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
              >{formatSize(f.size)} {formatFullDate(f.uploadedAt)}</Text
            >
          </Flex>
        </span>
        <span class="col-size"
          ><Text size="xs" color="tertiary">{formatSize(f.size)}</Text></span
        >
        <span class="col-date"
          ><Text size="xs" color="tertiary">{formatFullDate(f.uploadedAt)}</Text
          ></span
        >
        <span class="col-owner"
          ><Text size="xs" color="tertiary">You</Text></span
        >
      </div>
    {/each}
  </div>
{:else}
  <Flex align="center" justify="center" style="height: 100%;">
    <Text color="tertiary">{emptyMessage}</Text>
  </Flex>
{/if}

<style>
  .list-table {
    width: 100%;
    border-collapse: collapse;
  }

  .list-header {
    display: grid;
    grid-template-columns: 1fr 80px 120px 80px;
    gap: var(--flew-spacing-2);
    padding: 8px 12px;
    border-bottom: 1px solid var(--flew-color-border);
    font-size: var(--flew-font-size-xs);
    color: var(--flew-color-text-tertiary);
    font-weight: 600;
    position: sticky;
    top: 0px;
    z-index: 1;
    background: var(--flew-color-bg);
  }

  .list-row {
    display: grid;
    grid-template-columns: 1fr 80px 120px 80px;
    gap: var(--flew-spacing-2);
    padding: 8px 12px;
    align-items: center;
    border-bottom: 1px solid var(--flew-color-border);
    cursor: pointer;
    transition: background var(--flew-transition-fast);
  }

  .list-row:hover {
    background: var(--flew-color-bg-hover);
  }

  .list-row.selected {
    background: var(--flew-color-bg-active);
  }

  .list-row.selected:hover {
    background: var(--flew-color-bg-active);
  }

  .col-header {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    font: inherit;
    padding: 0;
    transition: color var(--flew-transition-fast);
  }

  .col-header:hover {
    color: var(--flew-color-text);
  }

  .col-name {
    display: flex;
    align-items: center;
    gap: var(--flew-spacing-2);
    min-width: 0;
    overflow: hidden;
  }

  .list-thumb {
    width: 32px;
    height: 32px;
    object-fit: cover;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .list-header,
    .list-row {
      grid-template-columns: 1fr !important;
    }
    .list-header,
    .col-size,
    .col-date,
    .col-owner {
      display: none;
    }

    .list-row {
      padding: 20px 20px;
      font-size: 40px;
    }

    .list-row .col-name {
      gap: 20px;
    }

    .list-thumb {
      border-radius: 4px;
      width: 100%;
      height: 100%;
    }

    .col-name .icon :global(svg) {
      width: 50%;
      height: 50%;
    }

    .col-name .icon {
      border-radius: 4px;
      background-color: #444;
      width: 40px;
      height: 40px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
