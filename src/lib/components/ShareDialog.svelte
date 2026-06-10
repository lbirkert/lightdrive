<script lang="ts">
  import { formatDate } from "$lib/helpers.js";

  let {
    open = false,
    name = "",
    type = "file" as "file" | "folder" | "drive",
    id = "",
    onclose = () => {},
    onshare = (share: any) => {},
  } = $props();

  let tab = $state<"link" | "user">("link");
  let permissions = $state("view");
  let expiry = $state("");
  let shareUrl = $state("");
  let creating = $state(false);
  let error = $state("");
  let existingShares = $state<any[]>([]);
  let loadingShares = $state(false);
  let copiedToken = $state<string | null>(null);

  let inviteEmail = $state("");
  let inviteSending = $state(false);
  let inviteError = $state("");

  let permissionOptions = [
    { value: "view", label: "View" },
    { value: "view,insert", label: "View & Insert" },
    { value: "view,insert,structure", label: "View, Insert & Structure" },
    { value: "view,insert,edit,structure", label: "Full access" },
  ];

  $effect(() => {
    if (open) {
      permissions = "view";
      expiry = "";
      shareUrl = "";
      error = "";
      existingShares = [];
      copiedToken = null;
      inviteEmail = "";
      inviteError = "";
      tab = "link";
      if (type !== "drive") loadShares();
    }
  });

  function shareUrlFor(token: string) {
    return `${location.origin}/drive/${token}`;
  }

  async function loadShares() {
    loadingShares = true;
    const param = type === "file" ? "fileId" : "folderId";
    const res = await fetch(`/api/shares?${param}=${id}`);
    if (res.ok) {
      const r = await res.json();
      existingShares = r.shares;
    }
    loadingShares = false;
  }

  async function createShareLink() {
    creating = true;
    error = "";
    const hours = expiry
      ? Math.round((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60))
      : null;
    const body: Record<string, any> = {
      permissions,
      expiresInHours: hours && hours > 0 ? hours : null,
    };
    if (type === "drive") {
      body.drive = true;
    } else if (type === "file") {
      body.fileId = id;
    } else {
      body.folderId = id;
    }

    const res = await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const r = await res.json();
      shareUrl = shareUrlFor(r.share.token);
      onshare(r.share);
      if (type !== "drive") {
        existingShares = [r.share, ...existingShares];
      }
    } else {
      const r = await res.json();
      error = r.error || "Failed to create share link";
    }
    creating = false;
  }

  async function copyLink(token: string) {
    const url = shareUrlFor(token);
    try {
      await navigator.clipboard.writeText(url);
      copiedToken = token;
      setTimeout(() => (copiedToken = null), 2000);
    } catch {
      shareUrl = url;
    }
  }

  async function revokeShare(shareId: string) {
    const res = await fetch("/api/shares", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: shareId }),
    });
    if (res.ok) {
      existingShares = existingShares.filter((s) => s.id !== shareId);
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    inviteSending = true;
    inviteError = "";
    const body: Record<string, any> = { email: inviteEmail.trim(), permissions };
    if (type === "folder") { body.folderId = id; body.folderName = name; }
    const res = await fetch("/api/shares/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      inviteEmail = "";
    } else {
      const r = await res.json();
      inviteError = r.error || "Failed to send invitation";
    }
    inviteSending = false;
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    role="button"
    tabindex="0"
    onclick={onclose}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2>{name}</h2>

      <div class="tabs">
        <button class="tab" class:active={tab === "link"} onclick={() => tab = "link"}>Create Link</button>
        {#if type !== "file"}
          <button class="tab" class:active={tab === "user"} onclick={() => tab = "user"}>Share with User</button>
        {/if}
      </div>

      {#if tab === "link"}
        <form
          onsubmit={(e) => {
            e.preventDefault();
            createShareLink();
          }}
        >
          <div class="field">
            <label for="share-permissions">Permissions</label>
            <select id="share-permissions" bind:value={permissions}>
              {#each permissionOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
          <div class="field">
            <label for="share-expiry">Expires at (optional)</label>
            <input
              id="share-expiry"
              type="datetime-local"
              bind:value={expiry}
            />
          </div>
          {#if shareUrl}
            <div class="field">
              <label for="share-url">Share URL</label>
              <input id="share-url" value={shareUrl} readonly />
            </div>
            <button
              type="button"
              class="btn-primary"
              onclick={() => copyLink(shareUrl.split("/").pop() || "")}
              >{copiedToken ? "Copied!" : "Copy Link"}</button
            >
          {:else}
            <button
              type="submit"
              class="btn-primary"
              disabled={creating}
              >{creating ? "Creating..." : "Create Share Link"}</button
            >
          {/if}
          {#if error}
            <p class="error">{error}</p>
          {/if}
        </form>
        {#if existingShares.length > 0}
          <hr />
          <h3>Existing Share Links</h3>
          <ul class="share-list">
            {#each existingShares as share}
              <li>
                <span
                  >{share.file?.originalName ||
                    share.folder?.name ||
                    "Unknown"}</span
                >
                <span>{share.permissions}</span>
                {#if share.expiresAt}<span
                    >Expires {formatDate(share.expiresAt)}</span
                  >{/if}
                <button
                  class="btn-sm"
                  onclick={() => copyLink(share.token)}
                  >{copiedToken === share.token
                    ? "Copied!"
                    : "Copy"}</button
                >
                <button class="btn-sm" onclick={() => revokeShare(share.id)}
                  >Revoke</button
                >
              </li>
            {/each}
          </ul>
        {/if}
      {:else}
        <form
          onsubmit={(e) => {
            e.preventDefault();
            sendInvite();
          }}
        >
          <div class="field">
            <label for="invite-permissions">Permissions</label>
            <select id="invite-permissions" bind:value={permissions}>
              {#each permissionOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </div>
          <div class="field">
            <label for="invite-email">User Email</label>
            <input
              id="invite-email"
              type="email"
              bind:value={inviteEmail}
              placeholder="user@example.com"
              required
            />
          </div>
          <button
            type="submit"
            class="btn-primary"
            disabled={inviteSending || !inviteEmail.trim()}
            >{inviteSending ? "Sending..." : "Send Invitation"}</button
          >
          {#if inviteError}
            <p class="error">{inviteError}</p>
          {/if}
        </form>
      {/if}
      <button class="btn-ghost" onclick={onclose}>Close</button>
    </div>
  </div>
{/if}