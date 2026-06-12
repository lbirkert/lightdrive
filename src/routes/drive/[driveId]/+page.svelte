<script lang="ts">
  import {
    X,
    ChevronLeft,
    ChevronRight,
    Pen,
    Download,
    Share2,
    Trash2,
  } from "@lucide/svelte";
  import { page } from "$app/state";
  import {
    goto,
    invalidate,
    beforeNavigate,
    afterNavigate,
  } from "$app/navigation";
  import {
    formatSize,
    formatDate,
    formatFullDate,
    getPreviewUrl,
  } from "$lib/helpers.js";
  import Toolbar from "$lib/components/Toolbar.svelte";
  import FilePreview from "$lib/components/FilePreview.svelte";
  import ListView from "$lib/components/ListView.svelte";
  import GridView from "$lib/components/GridView.svelte";
  import ShareDialog from "$lib/components/ShareDialog.svelte";
  import FolderTree from "$lib/components/FolderTree.svelte";
  import { DriveStore } from "$lib/components/drive-store.svelte.js";
  import { uploadStore } from "$lib/components/upload-store.svelte.js";
    import { onMount } from "svelte";

  let { data } = $props();

  let shareTitle = $derived(
    data.isShared
      ? data.shareInfo?.type === "file"
        ? `${data.shareInfo.file.name} - LightDrive`
        : data.shareInfo?.name
          ? `${data.shareInfo.name} - LightDrive`
          : "LightDrive"
      : "LightDrive"
  );
  let shareDesc = $derived(
    data.isShared
      ? data.shareInfo?.type === "file"
        ? `Shared file: ${data.shareInfo.file.name} (${data.shareInfo.file.type})`
        : data.shareInfo?.name
          ? `Shared: ${data.shareInfo.name}`
          : ""
      : ""
  );


  // svelte-ignore state_referenced_locally
  const store = new DriveStore(data, { goto, invalidate }, page.url);

  $effect(() => {
    store.data = data;
  });
  $effect(() => {
    store.pageUrl = page.url;
  });

  $effect(() => {
    const hash = page.url.hash;
    if (hash === "#grid" && store.viewMode !== "grid") {
      store.viewMode = "grid";
    } else if (hash !== "#grid" && store.viewMode !== "list") {
      store.viewMode = "list";
    }
  });

  $effect(() => {
    if (
      store.filePreviewId &&
      store.previewFile &&
      !store.previewFile.type.startsWith("image/") &&
      !store.previewFile.type.startsWith("audio/")
    ) {
      store.loadPreviewContent();
    }
  });

  let savedScroll = 0;

  beforeNavigate(({ to }) => {
    if (to?.url.pathname === page.url.pathname) {
      savedScroll =
        document.querySelector<HTMLElement>(".content-area")?.scrollTop ?? 0;
    }
  });

  afterNavigate(() => {
    var scrollText = page.url.searchParams.get("scroll");
    if(scrollText === null) return;
    savedScroll = parseInt(scrollText);
    if (savedScroll > 0) {
      const el = document.querySelector<HTMLElement>(".content-area");
      if (el) el.scrollTop = savedScroll;
      savedScroll = 0;
    }
  });
</script>

<svelte:head>
  {#if data.isShared}
    <title>{shareTitle}</title>
    <meta property="og:title" content={shareTitle} />
    <meta name="description" content={shareDesc} />
    <meta property="og:description" content={shareDesc} />
    {#if data.shareInfo?.type === "file" && data.shareInfo?.file?.type?.startsWith("image/")}
      <meta property="og:image" content="{page.url.origin}/api/drive/{data.driveId}/files/{data.shareInfo.file.id}/preview" />
    {/if}
  {/if}
</svelte:head>

<div class="drive-container">
  {#if !store.isShared && !store.data.user}
    <div class="unauthorized">
      <p>Sign in to access your drive.</p>
      <a href="/auth" class="btn-primary">Sign In</a>
    </div>
  {:else}
    {#if store.filePreviewId}
      <div class="preview-toolbar">
        <div class="preview-toolbar-header">
          {#if !(store.isShared && store.shareInfo?.type === "file")}
            <button
              class="preview-toolbar-close"
              onclick={store.closeFilePreview}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          {/if}
          <span class="preview-toolbar-name"
            >{store.previewFile?.originalName ?? ""}</span
          >
        </div>
        <span class="toolbar-spacer"></span>
        <div class="preview-toolbar-actions">
          {#if store.editMode}
            <button class="preview-btn" onclick={store.saveEdit}>Save</button>
            <button class="preview-btn" onclick={store.cancelEdit}
              >Cancel</button
            >
          {:else if store.previewEditable}
            <button class="preview-btn" onclick={store.enableEdit}
              ><Pen size={14} /> Edit</button
            >
          {/if}
          {#if store.previewFile}
            <a
              class="preview-btn"
              href="/api/drive/{store.driveId}/files/{store.previewFile
                .id}/download"
              download={store.previewFile.originalName}
              ><Download size={14} /> <span class="m-hide">Download</span></a
            >
          {/if}
          {#if !store.isShared}
            <button
              class="preview-btn"
              onclick={() =>
                store.previewFile &&
                store.openShareDialog(
                  store.previewFile.id,
                  store.previewFile.originalName,
                  "file",
                )}
              ><Share2 size={14} /> <span class="m-hide">Share</span></button
            >
          {/if}
          {#if store.canDelete}
            <button
              class="preview-btn"
              onclick={() => store.handleDeletePreview(store.previewFile!.id)}
              ><Trash2 size={14} /> <span class="m-hide">Delete</span></button
            >
          {/if}
          <button
            class="preview-btn"
            disabled={store.previewFileIndex <= 0}
            onclick={store.goToPrevFile}
            aria-label="Previous"><ChevronLeft size={16} /></button
          >
          <button
            class="preview-btn"
            disabled={store.previewFileIndex < 0 ||
              store.previewFileIndex >= store.previewFiles.length - 1}
            onclick={store.goToNextFile}
            aria-label="Next"><ChevronRight size={16} /></button
          >
        </div>
      </div>
    {:else}
      <Toolbar
        breadcrumbs={store.displayBreadcrumbs}
        viewMode={store.viewMode}
        onnavigate={store.navigateTo}
        onviewmodechange={(m) => (store.viewMode = m)}
        showNewButton={store.canUpload}
        onnewclick={() => {
          store.showNewItem = true;
          store.newItemType = "folder";
          store.newItemName = "";
        }}
        showUploadButton={store.canUpload}
        onuploadclick={() =>
          document
            .querySelector<HTMLInputElement>("#drive-file-input")
            ?.click()}
        hasSelection={store.hasSelection}
        selectedCount={store.selectedCount}
        canRenameSelection={store.canRenameSelection}
        canShareSelection={store.canShareSelection}
        canMoveSelection={store.canMoveSelection}
        canDeleteSelection={store.canDeleteSelection}
        onRename={store.handleSelectionRename}
        onShare={store.handleSelectionShare}
        onMove={store.handleSelectionMove}
        onDelete={store.handleBulkDelete}
        onClearSelection={store.clearSelection}
        bind:searchOpen={store.searchOpen}
        bind:searchQuery={store.searchQuery}
        bind:filterType={store.filterType}
        bind:sortMode={store.sortMode}
        onsearchclear={() => (store.searchQuery = "")}
        onfilterchange={(v) => (store.filterType = v)}
        onsortchange={(v) => (store.sortMode = v as any)}
        driveId={store.driveId}
      />
    {/if}

    {#if store.isShared && store.shareInfo?.type === "file"}
      <div class="content-area">
        <FilePreview
          driveId={store.driveId}
          filePreviewId={store.filePreviewId}
          previewFile={store.sharePreviewFile}
          previewCategory={store.previewCategory}
          previewContent={store.previewContent}
          previewLoading={store.previewLoading}
          previewError={store.previewError}
          bind:editMode={store.editMode}
          bind:editText={store.editText}
        />
      </div>
    {:else}
      <form
        method="POST"
        enctype="multipart/form-data"
        style="display:none"
        onsubmit={store.handleUpload}
      >
        <input
          id="drive-file-input"
          type="file"
          multiple
          onchange={(e) => {
            (e.currentTarget as HTMLInputElement).form?.requestSubmit();
          }}
        />
      </form>

      <div
        class="content-area"
        class:drag-over={store.dragOver}
        role="application"
        ondragover={(e: DragEvent) => {
          e.preventDefault();
          store.dragOver = true;
        }}
        ondragleave={() => (store.dragOver = false)}
        ondrop={(e: DragEvent) => {
          e.preventDefault();
          store.dragOver = false;
          if (!store.canUpload) return;
          const dt = e.dataTransfer;
          if (dt?.files.length) {
            const input =
              document.querySelector<HTMLInputElement>("#drive-file-input");
            if (input) {
              const dT = new DataTransfer();
              for (const f of dt.files) dT.items.add(f);
              input.files = dT.files;
              input.form?.requestSubmit();
            }
          }
        }}
      >
        {#if !uploadStore.isOnline}
          <div class="offline-banner">
            {uploadStore.uploading
              ? "Connection lost &mdash; upload paused, resumes automatically"
              : "No internet connection"}
          </div>
        {/if}

        <FilePreview
          driveId={store.driveId}
          filePreviewId={store.filePreviewId}
          previewFile={store.previewFile}
          previewCategory={store.previewCategory}
          previewContent={store.previewContent}
          previewLoading={store.previewLoading}
          previewError={store.previewError}
          bind:editMode={store.editMode}
          bind:editText={store.editText}
        />

        {#if !store.filePreviewId}
          {#if store.viewMode === "grid"}
            <GridView
              driveId={store.driveId}
              folders={store.displayFolders}
              files={store.displayFiles}
              folderSizes={store.displayFolderSizes}
              selectedIds={store.selectedIds}
              onnavigate={store.navigateTo}
              onopenfilepreview={store.openFilePreview}
              ontoggleselection={store.toggleSelection}
            />
          {:else}
            <ListView
              driveId={store.driveId}
              folders={store.displayFolders}
              files={store.displayFiles}
              folderSizes={store.displayFolderSizes}
              selectedIds={store.selectedIds}
              sortMode={store.sortMode}
              updateSort={store.updateSort}
              sortIndicator={store.sortIndicator}
              onnavigate={store.navigateTo}
              onopenfilepreview={store.openFilePreview}
              ontoggleselection={store.toggleSelection}
              user={data.user}
            />
          {/if}
        {/if}
      </div>
    {/if}
  {/if}
</div>

<ShareDialog
  open={!store.isShared && store.shareDialogOpen && !!store.showShareDialog}
  name={store.showShareDialog?.name ?? ""}
  type={store.showShareDialog?.type ?? "file"}
  id={store.showShareDialog?.id ?? ""}
  onclose={store.closeShareDialog}
/>

<!-- Confirm Dialog -->
{#if store.confirmOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => (store.confirmOpen = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2>{store.confirmTitle}</h2>
      <p>{store.confirmMessage}</p>
      <div class="modal-actions">
        <button class="btn-ghost" onclick={() => (store.confirmOpen = false)}
          >Cancel</button
        >
        <button class="btn-primary" onclick={store.confirmAction}
          >{store.confirmTitle}</button
        >
      </div>
    </div>
  </div>
{/if}

<!-- New Item Dialog -->
{#if store.showNewItem}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => {
      store.showNewItem = false;
      store.newItemName = "";
    }}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2>New</h2>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          store.handleCreateItem();
        }}
      >
        <div class="field">
          <label for="new-item-type">Type</label>
          <select id="new-item-type" bind:value={store.newItemType}>
            <option value="folder">Folder</option>
            <option value="txt">Text (.txt)</option>
            <option value="md">Markdown (.md)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>
        <div class="field">
          <label for="new-item-name">Name</label>
          <input
            id="new-item-name"
            bind:value={store.newItemName}
            placeholder={store.newItemType === "folder"
              ? "New Folder"
              : store.newItemType === "txt"
                ? "notes.txt"
                : store.newItemType === "md"
                  ? "readme.md"
                  : "data.csv"}
            required
          />
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="btn-ghost"
            onclick={() => {
              store.showNewItem = false;
              store.newItemName = "";
            }}>Cancel</button
          >
          <button
            type="submit"
            class="btn-primary"
            disabled={!store.newItemName.trim() || store.creatingItem}
            >{store.creatingItem ? "Creating..." : "Create"}</button
          >
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Move Dialog -->
{#if store.moveDialogOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => (store.moveDialogOpen = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
    <div
      class="modal modal--tree"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2>
        Move {store.selectedCount > 1
          ? `${store.selectedCount} items`
          : store.moveTargetNames}
      </h2>
      <p>Choose destination:</p>
      <FolderTree
        drives={store.moveDrives}
        currentFolderId={store.moveDir}
        currentDriveId={store.driveId}
        onselect={(folderId, driveId) => store.doMove(folderId, driveId)}
      />
      <div class="modal-actions">
        <button
          class="btn-ghost"
          onclick={() => (store.moveDialogOpen = false)}
          disabled={store.moveRunning}>Cancel</button
        >
      </div>
    </div>
  </div>
{/if}

<!-- Rename Dialog -->
{#if store.renameDialogOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => (store.renameDialogOpen = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2>Rename &quot;{store.renameTargetName}&quot;</h2>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          store.doRename();
        }}
      >
        <div class="field">
          <label for="rename-value">Name</label>
          <input id="rename-value" bind:value={store.renameValue} required />
        </div>
        {#if store.renameError}
          <p class="error">{store.renameError}</p>
        {/if}
        <div class="modal-actions">
          <button
            type="button"
            class="btn-ghost"
            onclick={() => (store.renameDialogOpen = false)}>Cancel</button
          >
          <button
            type="submit"
            class="btn-primary"
            disabled={store.renaming || !store.renameValue.trim()}
            >{store.renaming ? "Renaming..." : "Rename"}</button
          >
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete Confirm (shared drive) -->
{#if store.isShared && store.showDeleteConfirm}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => (store.showDeleteConfirm = false)}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2>Delete File</h2>
      <p>Are you sure you want to delete this file?</p>
      <div class="modal-actions">
        <button
          class="btn-ghost"
          onclick={() => (store.showDeleteConfirm = false)}>Cancel</button
        >
        <button
          class="btn-primary"
          onclick={() => {
            store.showDeleteConfirm = false;
            store.doDeleteFile(store.deleteTargetId);
          }}>Delete</button
        >
      </div>
    </div>
  </div>
{/if}
