<script lang="ts">
  import { HardDrive, Folder } from "@lucide/svelte";
  import FolderTreeNode from "./FolderTreeNode.svelte";

  type DriveTarget = {
    id: string;
    name: string;
    isOwner: boolean;
    token: string | null;
    folders: { id: string; name: string; parentId: string | null }[];
  };

  let {
    drives,
    currentFolderId,
    currentDriveId,
    onselect,
  }: {
    drives: DriveTarget[];
    currentFolderId: string | null;
    currentDriveId: string;
    onselect: (folderId: string | null, driveId: string) => void;
  } = $props();

  let expandedDrives = $state<Set<number>>(new Set());

  function toggleDrive(index: number) {
    const next = new Set(expandedDrives);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    expandedDrives = next;
  }
</script>

{#each drives as drive, i}
  <div class="folder-tree-drive">
    <button class="folder-tree-drive-header" onclick={() => toggleDrive(i)}>
      <HardDrive size={14} />
      <span>{drive.name}</span>
    </button>
    {#if expandedDrives.has(i)}
      <div class="folder-tree-nodes">
        <button
          class="folder-tree-item"
          class:folder-tree-item--disabled={currentDriveId === drive.id && currentFolderId === null}
          onclick={() => onselect(null, drive.id)}
        >
          <Folder size={14} />
          <span>{drive.name} (root)</span>
        </button>
        <div class="folder-tree-children">
          {#each drive.folders.filter(f => f.parentId === null) as folder}
            <FolderTreeNode
              {folder}
              folders={drive.folders}
              driveId={drive.id}
              currentDriveId={currentDriveId}
              currentFolderId={currentDriveId === drive.id ? currentFolderId : null}
              {onselect}
            />
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/each}