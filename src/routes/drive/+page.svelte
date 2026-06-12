<script lang="ts">
  import { goto } from "$app/navigation";
  import Toolbar from "$lib/components/Toolbar.svelte";
  import ListView from "$lib/components/ListView.svelte";
  import GridView from "$lib/components/GridView.svelte";

  let { data } = $props();

  let viewMode = $state<"list" | "grid">("list");
  let sortMode = $state("name-asc");

  let drives = $derived(data.drives ?? []);

  let sortedDrives = $derived.by(() => {
    const items = [...drives];
    switch (sortMode) {
      case "name-asc": items.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name-desc": items.sort((a, b) => b.name.localeCompare(a.name)); break;
    }
    return items;
  });

  function navigateToDrive(id: string | null) {
    goto(`/drive/${id ?? ""}`);
  }

  function updateSort(col: "name" | "date" | "size") {
    if (col === "name") {
      sortMode = sortMode === "name-asc" ? "name-desc" : "name-asc";
    }
  }

  function sortIndicator(col: "name" | "date" | "size"): "asc" | "desc" | null {
    if (sortMode === "name-asc" && col === "name") return "asc";
    if (sortMode === "name-desc" && col === "name") return "desc";
    return null;
  }
</script>

<div class="drive-container">
  <Toolbar
    breadcrumbs={[{ id: null, name: "Select Drive" }]}
    viewMode={viewMode}
    onviewmodechange={(m) => (viewMode = m)}
    showNewButton={false}
    showUploadButton={false}
    hasSelection={false}
    selectedCount={0}
    canRenameSelection={false}
    canShareSelection={false}
    canMoveSelection={false}
    canDeleteSelection={false}
    sortMode={sortMode}
    onsortchange={(v) => (sortMode = v)}
  />

  <div class="content-area">
    {#if viewMode === "grid"}
      <GridView
        folders={sortedDrives}
        files={[]}
        selectedIds={new Set()}
        onnavigate={navigateToDrive}
        emptyMessage="No drives available."
        useDriveIcon={true}
      />
    {:else}
      <ListView
        folders={sortedDrives}
        files={[]}
        selectedIds={new Set()}
        sortMode={sortMode}
        updateSort={updateSort}
        sortIndicator={sortIndicator}
        onnavigate={navigateToDrive}
        emptyMessage="No drives available."
        useDriveIcon={true}
      />
    {/if}
  </div>
</div>
