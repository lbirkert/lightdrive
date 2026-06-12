<script lang="ts">
  import { Folder } from "@lucide/svelte";

  type FolderItem = { id: string; name: string; parentId: string | null };

  let {
    folder,
    folders,
    driveId,
    currentDriveId,
    currentFolderId,
    onselect,
  }: {
    folder: FolderItem;
    folders: FolderItem[];
    driveId: string;
    currentDriveId: string;
    currentFolderId: string | null;
    onselect: (folderId: string | null, driveId: string) => void;
  } = $props();

  import FolderTreeNode from "./FolderTreeNode.svelte";

  let expanded = $state(false);

  const children = $derived(folders.filter(f => f.parentId === folder.id));
  const hasChildren = $derived(children.length > 0);
  const isDisabled = $derived(currentDriveId === driveId && currentFolderId === folder.id);
</script>

<div class="folder-tree-node">
  <button
    class="folder-tree-item"
    class:folder-tree-item--disabled={isDisabled}
    onclick={() => {
      if (hasChildren) expanded = !expanded;
      onselect(folder.id, driveId);
    }}
  >
    {#if hasChildren}
      <span class="folder-tree-chevron" class:folder-tree-chevron--open={expanded}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </span>
    {:else}
      <span class="folder-tree-chevron folder-tree-chevron--empty"></span>
    {/if}
    <Folder size={14} />
    <span>{folder.name}</span>
  </button>
  {#if hasChildren && expanded}
    <div class="folder-tree-children">
      {#each children as child}
        <FolderTreeNode
          folder={child}
          {folders}
          {driveId}
          {currentDriveId}
          {currentFolderId}
          {onselect}
        />
      {/each}
    </div>
  {/if}
</div>