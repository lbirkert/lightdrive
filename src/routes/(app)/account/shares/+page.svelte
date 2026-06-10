<script lang="ts">
  let { data } = $props();

  let shares = $state([]);

  $effect(() => { shares = data.shares; });

  let showRevokeConfirm = $state(false);
  let revokeTargetId = $state("");

  let showEditModal = $state(false);
  let editingShare = $state<any>(null);
  let editPermissions = $state("");
  let editExpiry = $state("");

  let copiedToken = $state<string | null>(null);

  function shareUrl(token: string) { return `${location.origin}/ui-rewrite/drive/${token}`; }

  async function copyLink(token: string) {
    try { await navigator.clipboard.writeText(shareUrl(token)); copiedToken = token; setTimeout(() => copiedToken = null, 2000); }
    catch { prompt("Copy this link:", shareUrl(token)); }
  }

  async function revokeShare() {
    const res = await fetch("/api/shares", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: revokeTargetId }),
    });
    if (res.ok) { shares = shares.filter((s: any) => s.id !== revokeTargetId); showRevokeConfirm = false; }
  }

  function openEdit(share: any) {
    editingShare = share;
    editPermissions = share.permissions;
    editExpiry = share.expiresAt ? new Date(share.expiresAt).toISOString().slice(0, 16) : "";
    showEditModal = true;
  }

  async function saveEdit(e: SubmitEvent) {
    e.preventDefault();
    if (!editingShare) return;
    const hours = editExpiry ? Math.round((new Date(editExpiry).getTime() - Date.now()) / (1000 * 60 * 60)) : null;
    const res = await fetch("/api/shares", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingShare.id, permissions: editPermissions, expiresInHours: hours && hours > 0 ? hours : null }),
    });
    if (res.ok) { const r = await res.json(); shares = shares.map((s: any) => s.id === r.share.id ? r.share : s); showEditModal = false; editingShare = null; }
  }

  function formatDate(d: string | Date) { return new Date(d).toLocaleDateString(); }

  let permissionOptions = [
    { value: "view", label: "View" },
    { value: "view,insert", label: "View & Insert" },
    { value: "view,insert,structure", label: "View, Insert & Structure" },
    { value: "view,insert,edit,structure", label: "Full access" },
  ];
</script>

<div class="page page:sm shares-page">
  <h1>Share Links</h1>

  <a href="/ui-rewrite/account" class="back-link">&larr; Back to Account</a>

  {#if shares.length === 0}
    <div class="card empty-state">
      <p class="secondary">No share links yet. Go to your Drive to share files and folders.</p>
      <a href="/ui-rewrite/drive" class="btn-primary">Go to Drive</a>
    </div>
  {:else}
    <ul class="share-list">
      {#each shares as share}
        <li class="card">
          <div class="share-info">
            <span class="share-name">{share.file?.originalName || share.folder?.name || "Unknown"}</span>
            <span class="share-perms">{share.permissions}</span>
          </div>
          <div class="share-meta">
            {#if share.expiresAt}
              <span class="tertiary">Expires {formatDate(share.expiresAt)}</span>
            {:else}
              <span class="tertiary">No expiry</span>
            {/if}
            <span class="tertiary">Created {formatDate(share.createdAt)}</span>
          </div>
          <div class="share-actions">
            <button class="btn-sm" onclick={() => copyLink(share.token)}>{copiedToken === share.token ? "Copied!" : "Copy Link"}</button>
            <button class="btn-sm" onclick={() => openEdit(share)}>Edit</button>
            <button class="btn-sm" onclick={() => { revokeTargetId = share.id; showRevokeConfirm = true; }}>Revoke</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if showRevokeConfirm}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-overlay" role="button" tabindex="0" onclick={() => showRevokeConfirm = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <h2>Revoke Share Link</h2>
      <p>Are you sure you want to revoke this share link? External users will lose access immediately.</p>
      <div class="modal-actions">
        <button class="btn-ghost" onclick={() => showRevokeConfirm = false}>Cancel</button>
        <button class="btn-primary" onclick={revokeShare}>Revoke</button>
      </div>
    </div>
  </div>
{/if}

{#if showEditModal && editingShare}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-overlay" role="button" tabindex="0" onclick={() => { showEditModal = false; editingShare = null; }}>
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <h2>Edit Share Link</h2>
      <form onsubmit={saveEdit}>
        <div class="field">
          <label for="edit-permissions">Permissions</label>
          <select id="edit-permissions" bind:value={editPermissions}>
            {#each permissionOptions as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </div>
        <div class="field">
          <label for="edit-expiry">Expires at (optional)</label>
          <input id="edit-expiry" type="datetime-local" bind:value={editExpiry} />
        </div>
        <div class="field">
          <label for="edit-share-url">Share URL</label>
          <input id="edit-share-url" value={shareUrl(editingShare.token)} readonly />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-ghost" onclick={() => { showEditModal = false; editingShare = null; }}>Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  </div>
{/if}
