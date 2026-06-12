<script lang="ts">
  import ShareDialog from "$lib/components/ShareDialog.svelte";

  let { data } = $props();

  let shares = $state<any[]>([]);
  let incomingPending = $state<any[]>([]);
  let incomingAccepted = $state<any[]>([]);
  let sent = $state<any[]>([]);
  let message = $state("");

  $effect(() => {
    shares = data.shares;
    incomingPending = data.incomingPending;
    incomingAccepted = data.incomingAccepted;
    sent = data.sent;
  });

  let reqTab = $state<"incoming" | "outgoing">("incoming");
  let showRevokeConfirm = $state(false);
  let revokeTargetId = $state("");

  let showEditModal = $state(false);
  let editingShare = $state<any>(null);
  let editPermissions = $state("");
  let editExpiry = $state("");

  let showShareDialog = $state(false);

  let copiedToken = $state<string | null>(null);
  let responding = $state<string | null>(null);
  let revoking = $state<string | null>(null);

  function shareUrl(token: string) {
    return `${location.origin}/drive/${token}`;
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      copiedToken = token;
      setTimeout(() => (copiedToken = null), 2000);
    } catch {
      prompt("Copy this link:", shareUrl(token));
    }
  }

  async function revokeShare() {
    const res = await fetch("/api/shares", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: revokeTargetId }),
    });
    if (res.ok) {
      shares = shares.filter((s: any) => s.id !== revokeTargetId);
      showRevokeConfirm = false;
    }
  }

  function openEditLink(share: any) {
    editingShare = share;
    editPermissions = share.permissions;
    editExpiry = share.expiresAt
      ? new Date(share.expiresAt).toISOString().slice(0, 16)
      : "";
    showEditModal = true;
  }

  async function saveEdit(e: SubmitEvent) {
    e.preventDefault();
    if (!editingShare) return;
    const hours = editExpiry
      ? Math.round(
          (new Date(editExpiry).getTime() - Date.now()) / (1000 * 60 * 60),
        )
      : null;
    const res = await fetch("/api/shares", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingShare.id,
        permissions: editPermissions,
        expiresInHours: hours && hours > 0 ? hours : null,
      }),
    });
    if (res.ok) {
      const r = await res.json();
      shares = shares.map((s: any) => (s.id === r.share.id ? r.share : s));
      showEditModal = false;
      editingShare = null;
    }
  }

  function shareName(share: any) {
    if (share.file) return share.file.originalName;
    if (share.folder) return share.folder.name;
    if (share.user) return "My Drive";
    return "Unknown";
  }

  function handleDriveShare(share: any) {
    shares = [share, ...shares];
    showShareDialog = false;
  }

  function shareLabel(inv: any) {
    if (inv.folderName) return `shared folder "${inv.folderName}"`;
    return "shared their drive";
  }

  async function respond(id: string, action: "accept" | "decline" | "cancel") {
    responding = id;
    message = "";
    const label =
      action === "accept"
        ? "Accepted!"
        : action === "cancel"
          ? "Cancelled."
          : "Declined.";
    const res = await fetch(`/api/shares/invitations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      incomingPending = incomingPending.filter((i: any) => i.id !== id);
      sent = sent.filter((i: any) => i.id !== id);
      message = label;
    } else {
      const r = await res.json();
      message = r.error || "Failed to respond";
    }
    responding = null;
  }

  async function revokeAccess(invitationId: string) {
    revoking = invitationId;
    message = "";
    const res = await fetch(`/api/shares/revoke-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    if (res.ok) {
      incomingAccepted = incomingAccepted.filter(
        (a: any) => a.id !== invitationId,
      );
      message = "Access revoked.";
    } else {
      const r = await res.json();
      message = r.error || "Failed to revoke";
    }
    revoking = null;
  }

  function formatDate(d: string | Date) {
    return new Date(d).toLocaleDateString();
  }

  let permissionOptions = [
    { value: "view", label: "View" },
    { value: "view,insert", label: "View & Insert" },
    { value: "view,insert,structure", label: "View, Insert & Structure" },
    { value: "view,insert,edit,structure", label: "Full access" },
  ];
</script>

<div class="page page:sm shares-page">
  <a href="/account" class="back-link">&larr; Back to Account</a>

  <h1>Sharing</h1>

  {#if message}
    <p class="success">{message}</p>
  {/if}

  <!-- TODO: deprecate this -->
  <button class="btn-primary" onclick={() => (showShareDialog = true)}>
    Share Drive
  </button>

  <!-- Share Links -->
  <h2>Share Links</h2>
  {#if shares.length === 0}
    <div class="card empty-state">
      <p class="secondary">
        No share links yet. Share your drive with a link above.
      </p>
    </div>
  {:else}
    <ul class="share-list">
      {#each shares as share}
        <li class="card">
          <div class="share-info">
            <span class="share-name">{shareName(share)}</span>
            <span class="share-perms">{share.permissions}</span>
          </div>
          <div class="share-meta">
            {#if share.invitedUser}
              <span class="badge badge-restricted"
                >Restricted to {share.invitedUser.email}</span
              >
            {:else}
              <span class="badge badge-public">Public link</span>
            {/if}
            {#if share.expiresAt}
              <span class="tertiary">Expires {formatDate(share.expiresAt)}</span
              >
            {:else}
              <span class="tertiary">No expiry</span>
            {/if}
            <span class="tertiary">Created {formatDate(share.createdAt)}</span>
          </div>
          <div class="share-actions">
            <button class="btn-sm" onclick={() => copyLink(share.token)}
              >{copiedToken === share.token ? "Copied!" : "Copy Link"}</button
            >
            <button class="btn-sm" onclick={() => openEditLink(share)}
              >Edit</button
            >
            <button
              class="btn-sm"
              onclick={() => {
                revokeTargetId = share.id;
                showRevokeConfirm = true;
              }}>Revoke</button
            >
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <h2>Sharing Requests</h2>

  <!-- Sharing Requests -->
  <div class="sharing-requests">
    <div class="tabs" role="tablist">
      <button
        class="tab"
        class:active={reqTab === "incoming"}
        onclick={() => (reqTab = "incoming")}
        role="tab"
      >
        Incoming
        {#if incomingPending.length > 0}
          <span class="badge-count">{incomingPending.length}</span>
        {/if}
      </button>
      <button
        class="tab"
        class:active={reqTab === "outgoing"}
        onclick={() => (reqTab = "outgoing")}
        role="tab">Outgoing</button
      >
    </div>

    {#if reqTab === "incoming"}
      {#if incomingPending.length > 0}
        <h3>Pending Requests</h3>
        <ul class="share-list">
          {#each incomingPending as inv}
            <li class="card">
              <div class="share-info">
                <span class="share-name"
                  >{inv.fromUser.name} {shareLabel(inv)}</span
                >
                <span class="share-perms">{inv.permissions}</span>
              </div>
              <div class="share-meta">
                <span class="tertiary">{formatDate(inv.createdAt)}</span>
              </div>
              {#if responding === inv.id}
                <p class="secondary">Processing...</p>
              {:else}
                <div class="share-actions">
                  <button
                    class="btn-primary"
                    onclick={() => respond(inv.id, "accept")}>Accept</button
                  >
                  <button
                    class="btn-ghost"
                    onclick={() => respond(inv.id, "decline")}>Decline</button
                  >
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}

      {#if incomingAccepted.length > 0}
        <ul class="share-list">
          {#each incomingAccepted as acc}
            <li class="card">
              <div class="share-info">
                <span class="share-name"
                  >{acc.fromUser.name} {shareLabel(acc)}</span
                >
                <span class="share-perms">{acc.permissions}</span>
              </div>
              <div class="share-meta">
                <span class="tertiary"
                  >Accepted {formatDate(acc.respondedAt)}</span
                >
              </div>
              {#if revoking === acc.id}
                <p class="secondary">Revoking...</p>
              {:else}
                <div class="share-actions">
                  <button class="btn-ghost" onclick={() => revokeAccess(acc.id)}
                    >Revoke Access</button
                  >
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}

      {#if incomingPending.length === 0 && incomingAccepted.length === 0}
        <div class="card empty-state">
          <p class="secondary">No incoming sharing requests.</p>
        </div>
      {/if}
    {:else if sent.length > 0}
      <ul class="share-list">
        {#each sent as inv}
          <li class="card">
            <div class="share-info">
              <span class="share-name"
                >To {inv.toUser.name || inv.toUser.email}</span
              >
              {#if inv.folderName}
                <span class="share-name-secondary">{inv.folderName}</span>
              {/if}
              <span class="share-perms">{inv.permissions}</span>
            </div>
            <div class="share-meta">
              {#if inv.status === "pending"}
                <span class="badge badge-pending">Pending</span>
              {:else if inv.status === "accepted"}
                <span class="badge badge-accepted"
                  >Accepted {formatDate(inv.respondedAt)}</span
                >
              {:else if inv.status === "declined"}
                <span class="badge badge-declined"
                  >Declined {formatDate(inv.respondedAt)}</span
                >
              {/if}
              <span class="tertiary">{formatDate(inv.createdAt)}</span>
            </div>
            {#if inv.status === "pending"}
              {#if responding === inv.id}
                <p class="secondary">Cancelling...</p>
              {:else}
                <div class="share-actions">
                  <button
                    class="btn-ghost"
                    onclick={() => respond(inv.id, "cancel")}>Cancel</button
                  >
                </div>
              {/if}
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <div class="card empty-state">
        <p class="secondary">No outgoing sharing requests.</p>
      </div>
    {/if}
  </div>
</div>

<ShareDialog
  open={showShareDialog}
  name="My Drive"
  type="drive"
  id={data.user?.id ?? ""}
  onclose={() => (showShareDialog = false)}
  onshare={handleDriveShare}
/>

{#if showRevokeConfirm}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => (showRevokeConfirm = false)}
  >
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2>Revoke Share Link</h2>
      <p>
        Are you sure you want to revoke this share link? External users will
        lose access immediately.
      </p>
      <div class="modal-actions">
        <button class="btn-ghost" onclick={() => (showRevokeConfirm = false)}
          >Cancel</button
        >
        <button class="btn-primary" onclick={revokeShare}>Revoke</button>
      </div>
    </div>
  </div>
{/if}

{#if showEditModal && editingShare}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={() => {
      showEditModal = false;
      editingShare = null;
    }}
  >
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
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
          <input
            id="edit-expiry"
            type="datetime-local"
            bind:value={editExpiry}
          />
        </div>
        <div class="field">
          <label for="edit-share-url">Share URL</label>
          <input
            id="edit-share-url"
            value={shareUrl(editingShare.token)}
            readonly
          />
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="btn-ghost"
            onclick={() => {
              showEditModal = false;
              editingShare = null;
            }}>Cancel</button
          >
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  </div>
{/if}
