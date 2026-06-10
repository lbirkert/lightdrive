<script lang="ts">
  import { uploadStore } from "$lib/rewrite/upload-store.svelte";
  import { formatSpeed, formatEta } from "$lib/rewrite/drive-utils";
  import { Check, ChevronDown, ChevronUp, X } from "@lucide/svelte";

  $effect(() => {
    if (uploadStore.uploading) {
      const id = setInterval(() => (uploadStore.now = Date.now()), 250);
      return () => clearInterval(id);
    }
  });

  $effect(() => {
    if (!uploadStore.uploading && uploadStore.files.length > 0) {
      const id = setTimeout(() => {
        uploadStore.files = [];
        uploadStore.expanded = false;
      }, 4000);
      return () => clearTimeout(id);
    }
  });

  function cancelAll() {
    uploadStore.currentXhr?.abort();
    uploadStore.files = [];
    uploadStore.expanded = false;
  }
</script>

{#if uploadStore.files.length > 0}
  <footer class="upload-footer" class:upload-footer--expanded={uploadStore.expanded} class:upload-footer--done={!uploadStore.uploading}>
    <div class="upload-footer-summary" role="button" tabindex="0" onclick={() => (uploadStore.expanded = !uploadStore.expanded)} onkeydown={(e) => e.key === 'Enter' && (uploadStore.expanded = !uploadStore.expanded)}>
      <div class="upload-footer-summary-info">
        {#if uploadStore.uploading}
          <span class="upload-footer-status">Uploading</span>
        {:else}
          <span class="upload-footer-status upload-footer-status--done">
            <Check size={12} />
            Complete
          </span>
        {/if}
        <span class="upload-footer-count">{uploadStore.progress}/{uploadStore.total} files</span>
        {#if uploadStore.totalSpeed > 0}
          <span class="upload-footer-speed">{formatSpeed(uploadStore.totalSpeed)}</span>
        {/if}
        {#if uploadStore.totalEta > 0}
          <span class="upload-footer-eta">{formatEta(uploadStore.totalEta)} left</span>
        {/if}
      </div>
      <div class="upload-footer-summary-bar">
        <div class="progress-bar">
          <div
            class="progress-fill"
            style="width:{uploadStore.overallBytes
              ? (uploadStore.totalUploadedBytes / uploadStore.overallBytes) * 100
              : 0}%"
          ></div>
        </div>
        <button class="upload-footer-toggle" onclick={(e) => { e.stopPropagation(); uploadStore.expanded = !uploadStore.expanded; }} aria-label={uploadStore.expanded ? 'Collapse' : 'Expand'}>
          {#if uploadStore.expanded}
            <ChevronDown size={14} />
          {:else}
            <ChevronUp size={14} />
          {/if}
        </button>
        <button class="upload-footer-close" onclick={(e) => { e.stopPropagation(); cancelAll(); }} aria-label="Cancel all uploads">
          <X size={14} />
        </button>
      </div>
    </div>
    {#if uploadStore.expanded}
      <div class="upload-footer-items">
        {#each uploadStore.files as f}
          <div class="upload-footer-item" class:upload-footer-item--done={f.done}>
            <span class="upload-footer-item-name">{f.name}</span>
            <div class="progress-bar">
              <div
                class="progress-fill"
                style="width:{f.totalBytes ? (f.uploadedBytes / f.totalBytes) * 100 : 0}%"
              ></div>
            </div>
            {#if f.done}
              <span class="upload-footer-item-done"><Check size={12} /></span>
            {:else}
              {#if f.speed > 0}
                <span class="upload-footer-item-speed">{formatSpeed(f.speed)}</span>
              {/if}
              {#if f.eta > 0}
                <span class="upload-footer-item-eta">{formatEta(f.eta)} left</span>
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </footer>
{/if}
