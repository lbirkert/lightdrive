<script lang="ts">
  import { Search, Plus, Upload, List, Grid3x3, Pen, Share2, ArrowRight, Trash2, X } from "@lucide/svelte";

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

<div class="toolbar">
  <div class="toolbar-row">
    {#if hasSelection}
      <span class="selection-count">{selectedCount} selected</span>
      <span class="toolbar-spacer"></span>
      {#if canRenameSelection}
        <button class="btn-ghost" onclick={onRename}><Pen size={14} /> <span class="m-hide">Rename</span></button>
      {/if}
      {#if canShareSelection}
        <button class="btn-ghost" onclick={onShare}><Share2 size={14} /> <span class="m-hide">Share</span></button>
      {/if}
      {#if canMoveSelection}
        <button class="btn-ghost" onclick={onMove}><ArrowRight size={14} /> <span class="m-hide">Move</span></button>
      {/if}
      {#if canDeleteSelection}
        <button class="btn-ghost" onclick={onDelete}><Trash2 size={14} /> <span class="m-hide">Delete</span></button>
      {/if}
      <button class="btn-ghost" onclick={onClearSelection}><X size={14} /> <span class="m-hide">Cancel</span></button>
    {:else}
      <nav class="breadcrumb-desktop">
        {#each breadcrumbs as crumb, i}
          {#if i > 0}<span class="breadcrumb-sep">/</span>{/if}
          <a class="btn-ghost truncate breadcrumb-btn" href="/ui-rewrite/drive/{crumb.id || ''}" onclick={(e) => { e.preventDefault(); onnavigate?.(crumb.id); }}>{crumb.name}</a>
        {/each}
      </nav>
      <nav class="breadcrumb-mobile">
        {#if breadcrumbs.length > 1}
          <a class="back-btn" href="/ui-rewrite/drive/{breadcrumbs[breadcrumbs.length - 2]?.id || ''}" onclick={(e) => { e.preventDefault(); onnavigate?.(breadcrumbs[breadcrumbs.length - 2]?.id); }} aria-label="Back">&larr;</a>
        {/if}
        <span class="current-folder">{breadcrumbs[breadcrumbs.length - 1]?.name ?? ""}</span>
      </nav>
      <button class="btn-ghost" onclick={() => searchOpen = !searchOpen}><Search size={14} /> <span class="m-hide">Search</span></button>
      {#if showNewButton}
        <button class="btn-ghost" onclick={onnewclick}><Plus size={14} /> <span class="m-hide">New</span></button>
      {/if}
      {#if showUploadButton}
        <button class="btn-ghost" onclick={onuploadclick}><Upload size={14} /> <span class="m-hide">Upload</span></button>
      {/if}
      {#if showViewToggle}
        <div class="view-toggle">
          <a class="btn-ghost view-btn" class:active={viewMode === "list"} href="#list" aria-label="List view"><List size={14} /> <span class="m-hide">List</span></a>
          <a class="btn-ghost view-btn" class:active={viewMode === "grid"} href="#grid" aria-label="Grid view"><Grid3x3 size={14} /> <span class="m-hide">Grid</span></a>
        </div>
      {/if}
    {/if}
  </div>

  {#if !hasSelection && searchOpen}
    <div class="search-container">
      <div class="search-row">
        <div class="search-input-wrap">
          <input
            type="text"
            class="search-input"
            placeholder="Search files..."
            bind:value={searchQuery}
            bind:this={searchInputEl}
          />
          {#if searchQuery}
            <button class="search-clear" onclick={onsearchclear} aria-label="Clear search">&times;</button>
          {/if}
        </div>
        <select class="sort-select" value={sortMode} onchange={(e) => onsortchange?.((e.target as HTMLSelectElement).value)}>
          {#each sortOptions as opt}
            <option value={opt.value} selected={sortMode === opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>
      <div class="filter-chips">
        {#each filterOptions as f}
          <button
            class="chip"
            class:active={filterType === f.value}
            onclick={() => onfilterchange?.(f.value)}
          >
            {f.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
