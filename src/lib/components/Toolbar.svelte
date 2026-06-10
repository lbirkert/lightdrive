<script lang="ts">
  import { Button, Flex, Text } from "flewui";
  import { ChevronRight, Plus, Upload, Grid3X3, List, Pen, Share2, MoveRight, Trash2, X, ArrowLeft, Search } from "@lucide/svelte";

  type FilterOption = { value: string; label: string };
  type SortOption = { value: string; label: string };

  type Props = {
    breadcrumbs: { id: string | null; name: string }[];
    viewMode?: "list" | "grid";
    showViewToggle?: boolean;
    showNewButton?: boolean;
    showUploadButton?: boolean;
    onnavigate?: (id: string | null) => void;
    onviewmodechange?: (mode: "list" | "grid") => void;
    onnewclick?: () => void;
    onuploadclick?: () => void;
    hasSelection?: boolean;
    selectedCount?: number;
    canRenameSelection?: boolean;
    canShareSelection?: boolean;
    canMoveSelection?: boolean;
    canDeleteSelection?: boolean;
    onRename?: () => void;
    onShare?: () => void;
    onMove?: () => void;
    onDelete?: () => void;
    onClearSelection?: () => void;
    searchOpen?: boolean;
    searchQuery?: string;
    filterType?: string;
    sortMode?: string;
    onsearchclear?: () => void;
    onfilterchange?: (value: string) => void;
    onsortchange?: (value: string) => void;
    filterOptions?: FilterOption[];
    sortOptions?: SortOption[];
  };

  let {
    breadcrumbs, viewMode = "list", showViewToggle = true, showNewButton = true, showUploadButton = true,
    onnavigate, onviewmodechange, onnewclick, onuploadclick,
    hasSelection = false, selectedCount = 0,
    canRenameSelection = false, canShareSelection = false, canMoveSelection = false, canDeleteSelection = false,
    onRename, onShare, onMove, onDelete, onClearSelection,
    searchQuery = $bindable(""), filterType = $bindable("all"), sortMode = $bindable("date-desc"),
    searchOpen = $bindable(false),
    onsearchclear, onfilterchange, onsortchange,
    filterOptions = [
      { value: "all", label: "All" },
      { value: "images", label: "Images" },
      { value: "videos", label: "Videos" },
      { value: "audio", label: "Audio" },
      { value: "documents", label: "Documents" },
    ],
    sortOptions = [
      { value: "date-desc", label: "Newest" },
      { value: "date-asc", label: "Oldest" },
      { value: "name-asc", label: "A-Z" },
      { value: "name-desc", label: "Z-A" },
      { value: "size-desc", label: "Largest" },
      { value: "size-asc", label: "Smallest" },
    ],
  }: Props = $props();

  let searchInputEl: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (searchOpen && searchInputEl) {
      queueMicrotask(() => searchInputEl?.focus());
    }
  });
</script>

<Flex direction="column" style="flex-shrink: 0;">
  <Flex
    align="center"
    gap="var(--flew-spacing-2)"
    style="padding: 10px 20px; border-bottom: 1px solid var(--flew-color-border); flex-shrink: 0; height: 56px; overflow: hidden;"
  >
    {#if hasSelection}
      <Text size="sm" weight="medium" style="white-space: nowrap;">{selectedCount} selected</Text>
      <div style="flex: 1;"></div>
      {#if canRenameSelection}
        <Button variant="ghost" size="sm" onclick={onRename}>
          <Pen size={14} /><span class="btn-label"> Rename</span>
        </Button>
      {/if}
      {#if canShareSelection}
        <Button variant="ghost" size="sm" onclick={onShare}>
          <Share2 size={14} /><span class="btn-label"> Share</span>
        </Button>
      {/if}
      {#if canMoveSelection}
        <Button variant="ghost" size="sm" onclick={onMove}>
          <MoveRight size={14} /><span class="btn-label"> Move</span>
        </Button>
      {/if}
      {#if canDeleteSelection}
        <Button variant="ghost" size="sm" onclick={onDelete}>
          <Trash2 size={14} /><span class="btn-label"> Delete</span>
        </Button>
      {/if}
      <Button variant="ghost" size="sm" onclick={onClearSelection}>
        <X size={14} /><span class="btn-label"> Cancel</span>
      </Button>
    {:else}
      <div class="breadcrumb-desktop">
        {#each breadcrumbs as crumb, i}
          {#if i > 0}<ChevronRight size={14} />{/if}
          <button class="breadcrumb" onclick={() => onnavigate?.(crumb.id)}>{crumb.name}</button>
        {/each}
      </div>
      <div class="breadcrumb-mobile">
        {#if breadcrumbs.length > 1}
          <button class="back-btn" onclick={() => onnavigate?.(breadcrumbs[breadcrumbs.length - 2].id)} aria-label="Back">
            <ArrowLeft size={16} />
          </button>
        {/if}
        <span class="current-folder">{breadcrumbs[breadcrumbs.length - 1]?.name ?? ""}</span>
      </div>
      <Button variant="ghost" size="sm" onclick={() => searchOpen = !searchOpen}>
        <Search size={14} /><span class="btn-label"> Search</span>
      </Button>
      {#if showNewButton}
        <Button variant="ghost" size="sm" onclick={onnewclick}>
          <Plus size={14} /><span class="btn-label"> New</span>
        </Button>
      {/if}
      {#if showUploadButton}
        <Button variant="ghost" size="sm" onclick={onuploadclick}>
          <Upload size={14} /><span class="btn-label"> Upload</span>
        </Button>
      {/if}
      {#if showViewToggle}
        <Flex gap="var(--flew-spacing-1)" style="border: 1px solid var(--flew-color-border); border-radius: var(--flew-radius-sm); padding: 2px; flex-shrink: 0;">
          <button class="view-btn" class:active={viewMode === "list"} onclick={() => onviewmodechange?.("list")} aria-label="List view">
            <List size={16} />
          </button>
          <button class="view-btn" class:active={viewMode === "grid"} onclick={() => onviewmodechange?.("grid")} aria-label="Grid view">
            <Grid3X3 size={16} />
          </button>
        </Flex>
      {/if}
    {/if}
  </Flex>

  {#if !hasSelection && searchOpen}
    <div class="search-container">
      <div class="search-row">
        <div class="search-input-wrap">
          <Search size={14} />
          <input
            type="text"
            class="search-input"
            placeholder="Search files..."
            bind:value={searchQuery}
            bind:this={searchInputEl}
          />
          {#if searchQuery}
            <button class="search-clear" onclick={onsearchclear} aria-label="Clear search">
              <X size={14} />
            </button>
          {/if}
        </div>
        <div class="sort-select-wrap">
          <select class="sort-select" value={sortMode} onchange={(e) => onsortchange?.((e.target as HTMLSelectElement).value)}>
            {#each sortOptions as opt}
              <option value={opt.value} selected={sortMode === opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="filter-chips">
        {#each filterOptions as f}
          <button
            class="chip"
            class:chip-active={filterType === f.value}
            onclick={() => onfilterchange?.(f.value)}
          >
            {f.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Flex>

<style>
  .breadcrumb-desktop {
    display: flex;
    align-items: center;
    gap: var(--flew-spacing-1);
    min-width: 0;
    overflow: hidden;
    flex: 1;
  }

  .breadcrumb-desktop :global(svg) {
    flex-shrink: 0;
    color: var(--flew-color-text-tertiary);
  }

  .breadcrumb-mobile {
    display: none;
    align-items: center;
    gap: var(--flew-spacing-1);
    flex: 1;
    min-width: 0;
  }

  .breadcrumb {
    background: none;
    border: none;
    cursor: pointer;
    font-size: var(--flew-font-size-sm);
    color: var(--flew-color-text-secondary);
    padding: 2px 6px;
    border-radius: var(--flew-radius-sm);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .breadcrumb:hover {
    color: var(--flew-color-text);
    background: var(--flew-color-bg-hover);
  }

  .breadcrumb:last-child {
    color: var(--flew-color-text);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .back-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--flew-color-text-secondary);
    padding: 2px;
    border-radius: var(--flew-radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .back-btn:hover {
    color: var(--flew-color-text);
    background: var(--flew-color-bg-hover);
  }

  .current-folder {
    font-size: var(--flew-font-size-sm);
    font-weight: 600;
    color: var(--flew-color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .view-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--flew-color-text-tertiary);
    padding: 6px;
    border-radius: var(--flew-radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--flew-transition-fast);
  }

  .view-btn:hover {
    color: var(--flew-color-text);
    background: var(--flew-color-bg-hover);
  }

  .view-btn.active {
    color: var(--flew-color-text);
    background: var(--flew-color-bg-active);
  }

  .search-container {
    display: flex;
    flex-direction: column;
    gap: var(--flew-spacing-2);
    padding: 10px 18px;
    border-bottom: 1px solid var(--flew-color-border);
    background: var(--flew-color-bg);
    flex-shrink: 0;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: var(--flew-spacing-2);
    flex: 1;
    min-width: 0;
  }

  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    border: 1px solid var(--flew-color-border);
    border-radius: var(--flew-radius-sm);
    background: var(--flew-color-bg);
    color: var(--flew-color-text);
  }

  .search-input-wrap:focus-within {
    border-color: var(--flew-color-primary);
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: inherit;
    font-size: var(--flew-font-size-sm);
    font-family: inherit;
    min-width: 0;
  }

  .search-input::placeholder {
    color: var(--flew-color-text-tertiary);
  }

  .search-clear {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--flew-color-text-tertiary);
    padding: 2px;
    display: flex;
    border-radius: var(--flew-radius-full);
  }

  .search-clear:hover {
    color: var(--flew-color-text);
    background: var(--flew-color-bg-hover);
  }

  .filter-chips {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .chip {
    background: none;
    border: 1px solid var(--flew-color-border);
    border-radius: var(--flew-radius-full);
    padding: 6px 12px;
    font-size: var(--flew-font-size-xs);
    cursor: pointer;
    color: var(--flew-color-text-secondary);
    transition: all var(--flew-transition-fast);
    white-space: nowrap;
    font-family: inherit;
  }

  .chip:hover {
    background: var(--flew-color-bg-hover);
    color: var(--flew-color-text);
  }

  .chip-active {
    background: var(--flew-color-primary);
    border-color: var(--flew-color-primary);
    color: white;
  }

  .chip-active:hover {
    background: var(--flew-color-primary-hover);
    color: white;
  }

  .sort-select-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border: 1px solid var(--flew-color-border);
    border-radius: var(--flew-radius-sm);
    color: var(--flew-color-text-secondary);
    flex-shrink: 0;
  }

  .sort-select {
    border: none;
    outline: none;
    background: transparent;
    color: inherit;
    font-size: var(--flew-font-size-xs);
    font-family: inherit;
    cursor: pointer;
  }

  @media (max-width: 640px) {
    .btn-label {
      display: none;
    }

    .breadcrumb-desktop {
      display: none;
    }

    .breadcrumb-mobile {
      display: flex;
    }
  }
</style>
