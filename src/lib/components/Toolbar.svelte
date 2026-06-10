<script lang="ts">
  import { Search, Plus, Upload, List, Grid3x3, Pen, Share2, ArrowRight, Trash2, X, ChevronDown, ChevronRight } from "@lucide/svelte";
  import { goto } from "$app/navigation";

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
    acceptedDrives?: { id: string; name: string; token: string }[];
    driveId?: string;
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
    acceptedDrives = [], driveId = "",
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

  let driveDropdownOpen = $state(false);
  let driveDropdownDesktop = $state<HTMLElement | undefined>(undefined);
  let driveDropdownMobile = $state<HTMLElement | undefined>(undefined);

  function navigateToDrive(token: string) {
    driveDropdownOpen = false;
    goto(`/drive/${token}`);
  }

  function toggleDriveDropdown(e: Event) {
    e.stopPropagation();
    if (driveDropdownOpen) {
      driveDropdownOpen = false;
    } else {
      driveDropdownOpen = true;
      queueMicrotask(() => {
        const handler = (ev: MouseEvent) => {
          const anyOpen = driveDropdownDesktop?.contains(ev.target as Node) || driveDropdownMobile?.contains(ev.target as Node);
          if (!anyOpen) {
            driveDropdownOpen = false;
            document.removeEventListener("click", handler);
          }
        };
        document.addEventListener("click", handler);
      });
    }
  }
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
          {#if i === 0 && acceptedDrives.length > 0}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div class="drive-dropdown" bind:this={driveDropdownDesktop}>
              <button class="drive-dropdown-chevron" onclick={toggleDriveDropdown} aria-label="Switch drive">
                {#if driveDropdownOpen}
                  <ChevronDown size={14} />
                {:else}
                  <ChevronRight size={14} />
                {/if}
              </button>
              <a class="btn-ghost breadcrumb-btn" href="/drive/{driveId}" onclick={(e) => { e.preventDefault(); navigateToDrive(driveId); }}>
                {crumb.name}
              </a>
              {#if driveDropdownOpen}
                <div class="drive-dropdown-menu">
                  <a class="drive-dropdown-item" href="/drive/" onclick={(e) => { e.preventDefault(); driveDropdownOpen = false; navigateToDrive(""); }}>
                    My Drive
                  </a>
                  {#each acceptedDrives as drive}
                    <a class="drive-dropdown-item" href="/drive/{drive.token}" onclick={(e) => { e.preventDefault(); navigateToDrive(drive.token); }}>
                      {drive.name}
                    </a>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <a class="btn-ghost truncate breadcrumb-btn" href="/drive/{crumb.id || ''}" onclick={(e) => { e.preventDefault(); onnavigate?.(crumb.id); }}>{crumb.name}</a>
          {/if}
        {/each}
      </nav>
      <nav class="breadcrumb-mobile">
        {#if breadcrumbs.length > 1}
          <a class="back-btn" href="/drive/{breadcrumbs[breadcrumbs.length - 2]?.id || ''}" onclick={(e) => { e.preventDefault(); onnavigate?.(breadcrumbs[breadcrumbs.length - 2]?.id); }} aria-label="Back">&larr;</a>
        {/if}
        {#if acceptedDrives.length > 0 && breadcrumbs.length === 1}
          <div class="drive-dropdown" bind:this={driveDropdownMobile}>
            <button class="drive-dropdown-chevron" onclick={toggleDriveDropdown} aria-label="Switch drive">
              {#if driveDropdownOpen}
                <ChevronDown size={14} />
              {:else}
                <ChevronRight size={14} />
              {/if}
            </button>
            <span class="current-folder">{breadcrumbs[breadcrumbs.length - 1]?.name ?? ""}</span>
            {#if driveDropdownOpen}
              <div class="drive-dropdown-menu">
                <a class="drive-dropdown-item" href="/drive/" onclick={(e) => { e.preventDefault(); driveDropdownOpen = false; navigateToDrive(""); }}>
                  My Drive
                </a>
                {#each acceptedDrives as drive}
                  <a class="drive-dropdown-item" href="/drive/{drive.token}" onclick={(e) => { e.preventDefault(); navigateToDrive(drive.token); }}>
                    {drive.name}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <span class="current-folder">{breadcrumbs[breadcrumbs.length - 1]?.name ?? ""}</span>
        {/if}
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
