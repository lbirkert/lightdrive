<script lang="ts">
  import { Button, Flex, Text, Spinner } from "flewui";
  import {
    File, Download, Trash2, X, Share2, ChevronLeft, ChevronRight,
    Image, FileText, FileSpreadsheet, Save, Music, Video
  } from "@lucide/svelte";
  import { formatSize, formatFullDate, getPreviewUrl } from "./helpers";

  type Props = {
    driveId: string;
    filePreviewId: string | null;
    previewFile: any;
    previewCategory: string | null;
    previewContent: any;
    previewLoading: boolean;
    previewError: string;
    previewFiles: any[];
    previewFileIndex: number;
    editMode: boolean;
    editText: string;
    onclose?: () => void;
    ongotoprev: () => void;
    ongotonext: () => void;
    onenableedit?: () => void;
    onsaveedit?: () => void;
    oncanceledit?: () => void;
    onshare?: (id: string, name: string, type: "file" | "folder") => void;
    ondelete?: (id: string) => void;
  };

  let {
    driveId, filePreviewId, previewFile, previewCategory, previewContent,
    previewLoading, previewError, previewFiles, previewFileIndex,
    editMode = $bindable(), editText = $bindable(),
    onclose, ongotoprev, ongotonext, onenableedit, onsaveedit, oncanceledit,
    onshare, ondelete,
  }: Props = $props();

  function isEditable() {
    return previewCategory === "txt" || previewCategory === "md" || previewCategory === "csv" || previewCategory === "docx";
  }
</script>

{#if filePreviewId && previewFile}
  <div class="file-preview">
    <div class="preview-edit-bar">
      {#if editMode && onsaveedit && oncanceledit}
        <Button variant="primary" size="xs" onclick={onsaveedit}><Save size={14} /> Save</Button>
        <Button variant="ghost" size="xs" onclick={oncanceledit}>Cancel</Button>
      {:else if isEditable() && onenableedit}
        <Button variant="ghost" size="xs" onclick={onenableedit}><Save size={14} /> Edit</Button>
      {/if}
    </div>
    <div class="preview-body">
      {#if previewCategory === "image"}
        <div class="preview-image-wrap">
          {#if previewFile.hasPreview}
            <img src={getPreviewUrl(previewFile.id, driveId)} alt={previewFile.originalName} class="preview-image" />
          {:else}
            <img src="/api/drive/{driveId}/files/{previewFile.id}/download" alt={previewFile.originalName} class="preview-image" />
          {/if}
        </div>
      {:else if previewCategory === "pdf"}
        <embed src="/api/drive/{driveId}/files/{previewFile.id}/download?inline=1" type="application/pdf" class="preview-pdf" />
      {:else if previewLoading}
        <Flex align="center" justify="center" style="flex: 1;">
          <Spinner />
        </Flex>
      {:else if previewError}
        <Flex align="center" justify="center" style="flex: 1;" direction="vertical" gap="var(--flew-spacing-3)">
          <Text color="error">{previewError}</Text>
          <a href="/api/drive/{driveId}/files/{previewFile.id}/download" download={previewFile.originalName}>
            <Button variant="primary" size="sm"><Download size={14} /> Download</Button>
          </a>
        </Flex>
      {:else if (previewCategory === "txt" || previewCategory === "md" || previewCategory === "csv") && previewContent}
        {#if editMode}
          <textarea class="preview-text" bind:value={editText}></textarea>
        {:else if previewCategory === "md" && previewContent.html}
          <div class="preview-doc">
            {@html previewContent.html}
          </div>
        {:else if previewCategory === "csv" && previewContent.rows}
          <div class="preview-sheet">
            <div class="sheet-table-wrap">
              <table class="sheet-table">
                {#each previewContent.rows as row}
                  <!-- svelte-ignore node_invalid_placement_ssr -->
                  <tr>{#each row as cell}<td>{cell == null ? "" : cell}</td>{/each}</tr>
                {/each}
              </table>
            </div>
          </div>
        {:else}
          <textarea class="preview-text" readonly value={previewContent.content}></textarea>
        {/if}
      {:else if previewCategory === "docx" && previewContent}
        {#if editMode}
          <textarea class="preview-text" bind:value={editText}></textarea>
        {:else}
          <div class="preview-doc">
            {#if previewContent.content}
              {@html previewContent.content}
            {:else}
              <Text color="secondary">No content</Text>
            {/if}
          </div>
        {/if}
      {:else if previewCategory === "xlsx" && previewContent}
        <div class="preview-sheet">
          {#each Object.entries(previewContent.content || {}) as [sheetName, rows]}
            <div style="margin-bottom: 16px;">
              <Text size="sm" weight="semibold" style="margin-bottom: 8px;">{sheetName}</Text>
              <div class="sheet-table-wrap">
                <table class="sheet-table">
                  {#each (rows as any) as row}
                    <!-- svelte-ignore node_invalid_placement_ssr -->
                    <tr>{#each row as cell}<td>{cell == null ? "" : cell}</td>{/each}</tr>
                  {/each}
                </table>
              </div>
            </div>
          {/each}
        </div>
      {:else if previewCategory === "audio"}
        <div class="preview-audio">
          <Music size={48} />
          <Text size="sm" color="secondary" style="text-align: center;">{previewFile.originalName}</Text>
          {#key filePreviewId}
            <audio controls autoplay class="audio-player">
              <source src="/api/drive/{driveId}/files/{previewFile.id}/download" type={previewFile.type} />
            </audio>
          {/key}
        </div>
      {:else if previewCategory === "video"}
        <div class="preview-video">
          {#key filePreviewId}
            <video controls autoplay class="video-player" poster={previewFile.hasPreview ? getPreviewUrl(previewFile.id, driveId) : undefined}>
              <source src="/api/drive/{driveId}/files/{previewFile.id}/stream" type="video/webm" />
            </video>
          {/key}
        </div>
      {:else}
        <Flex align="center" justify="center" style="flex: 1;" direction="vertical" gap="var(--flew-spacing-3)">
          <File size={48} />
          <Text color="secondary">{formatSize(previewFile.size)}</Text>
          <a href="/api/drive/{driveId}/files/{previewFile.id}/download" download={previewFile.originalName}>
            <Button variant="primary" size="sm"><Download size={14} /> Download</Button>
          </a>
        </Flex>
      {/if}
    </div>
    <div class="preview-footer">
      <div class="preview-file-info">
        <Flex align="center" gap="var(--flew-spacing-3)" style="min-width: 0;">
          {#if previewCategory === "image"}
            <Image size={16} />
          {:else if previewCategory === "pdf"}
            <FileText size={16} />
          {:else if previewCategory === "docx"}
            <FileText size={16} />
          {:else if previewCategory === "xlsx"}
            <FileSpreadsheet size={16} />
          {:else if previewCategory === "csv"}
            <FileSpreadsheet size={16} />
          {:else if previewCategory === "md"}
            <FileText size={16} />
          {:else if previewCategory === "audio"}
            <Music size={16} />
          {:else if previewCategory === "video"}
            <Video size={16} />
          {:else}
            <File size={16} />
          {/if}
          <div style="min-width: 0; flex: 1;">
            <Text size="sm" weight="medium" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{previewFile.originalName}</Text>
            <Text size="xs" color="tertiary">{formatSize(previewFile.size)} &middot; {formatFullDate(previewFile.uploadedAt)}</Text>
          </div>
        </Flex>
      </div>
      <div class="preview-actions">
        <Flex gap="var(--flew-spacing-1)">
          <Button variant="ghost" size="sm" icon disabled={previewFileIndex <= 0} onclick={ongotoprev} aria-label="Previous">
            <ChevronLeft size={18} />
          </Button>
          <Button variant="ghost" size="sm" icon disabled={previewFileIndex < 0 || previewFileIndex >= previewFiles.length - 1} onclick={ongotonext} aria-label="Next">
            <ChevronRight size={18} />
          </Button>
          <a href="/api/drive/{driveId}/files/{previewFile.id}/download" download={previewFile.originalName}>
            <Button variant="ghost" size="sm" icon aria-label="Download"><Download size={18} /></Button>
          </a>
          {#if onshare}
            <Button variant="ghost" size="sm" icon onclick={() => onshare(previewFile.id, previewFile.originalName, "file")} aria-label="Share">
              <Share2 size={18} />
            </Button>
          {/if}
          {#if ondelete}
            <Button variant="ghost" size="sm" icon onclick={() => ondelete(previewFile.id)} aria-label="Delete">
              <Trash2 size={18} />
            </Button>
          {/if}
          {#if onclose}
            <Button variant="ghost" size="sm" icon onclick={onclose} aria-label="Close"><X size={18} /></Button>
          {/if}
        </Flex>
      </div>
    </div>
  </div>
{/if}

<style>
  .file-preview {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
  }

  .preview-edit-bar {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 10;
    display: flex;
    gap: var(--flew-spacing-1);
  }

  .preview-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .preview-image-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow: hidden;
  }

  .preview-image {
    max-width: 90%;
    max-height: calc(100% - 80px);
    object-fit: contain;
    border-radius: var(--flew-radius-sm);
  }

  .preview-pdf {
    width: 100%;
    height: 100%;
    border: none;
  }

  .preview-text {
    width: 100%;
    flex: 1;
    border: none;
    outline: none;
    resize: none;
    padding: 16px;
    font-family: var(--flew-font-mono);
    font-size: var(--flew-font-size-sm);
    line-height: 1.6;
    background: var(--flew-color-bg);
    color: var(--flew-color-text);
    box-sizing: border-box;
  }

  .preview-doc {
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.7;
    width: 100%;
    box-sizing: border-box;
  }

  .preview-sheet {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }

  .preview-audio {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--flew-spacing-4);
    padding: 32px;
    color: var(--flew-color-text-secondary);
  }

  .preview-video {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    overflow: hidden;
    position: relative;
  }

  .audio-player {
    width: 100%;
    max-width: 400px;
  }

  .video-player {
    width: 100%;
    max-height: 100%;
    border-radius: var(--flew-radius-sm);
  }

  .preview-footer {
    display: flex;
    align-items: center;
    gap: var(--flew-spacing-2);
    padding: 8px 16px;
    background: var(--flew-color-bg-overlay);
    border-top: 1px solid var(--flew-color-border);
    border-radius: var(--flew-radius-md);
    margin: 0 8px 8px;
    flex-shrink: 0;
  }

  .sheet-table-wrap {
    border: 1px solid var(--flew-color-border);
    border-radius: var(--flew-radius-sm);
    overflow: hidden;
  }

  .sheet-table {
    border-collapse: collapse;
    width: 100%;
    font-size: var(--flew-font-size-sm);
  }

  .sheet-table td {
    padding: 6px 12px;
    border: 1px solid var(--flew-color-border);
    min-width: 80px;
  }

  .sheet-table tr:first-child td {
    font-weight: 600;
    background: var(--flew-color-bg-hover);
  }

  .preview-file-info {
    display: flex;
    min-width: 0;
    flex: 1;
  }

  .preview-actions {
    display: flex;
  }

  @media (max-width: 640px) {
    .preview-file-info {
      display: none;
    }
    .preview-actions {
      flex: 1;
    }
    .preview-actions button {
      flex: 1 !important;
      height: 44px !important;
      min-width: 44px !important;
    }
  }
</style>
