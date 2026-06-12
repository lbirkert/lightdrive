<script lang="ts">
  import { goto } from "$app/navigation";
  import { AVATAR_COLORS } from "$lib/avatar";
  import Avatar from "$lib/components/Avatar.svelte";

  let { data } = $props();

  let name = $state("");
  let saving = $state(false);
  let message = $state("");
  let messageType = $state<"success" | "error">("success");

  let avatarUrl = $state(data.user?.avatarUrl ?? null);
  let avatarColor = $state(data.user?.avatarColor ?? null);
  let uploading = $state(false);

  $effect(() => { name = data.user?.name ?? ""; });

  async function saveProfile(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    message = "";
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) { messageType = "success"; message = "Profile updated"; goto("/account"); }
    else { const r = await res.json(); messageType = "error"; message = r.error || "Failed to update"; }
    saving = false;
  }

  async function uploadAvatar(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploading = true;
    const fd = new FormData();
    fd.set("avatar", file);
    const res = await fetch("/api/auth/avatar", { method: "POST", body: fd });
    if (res.ok) { const r = await res.json(); avatarUrl = r.avatarUrl; avatarColor = null; }
    uploading = false;
    input.value = "";
  }

  async function setColor(color: string) {
    avatarColor = color;
    avatarUrl = null;
    await fetch("/api/auth/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
  }

  let showChangePassword = $state(false);
  let currentPassword = $state("");
  let newPassword = $state("");
  let changingPassword = $state(false);
  let passwordMessage = $state("");

  async function changePassword(e: SubmitEvent) {
    e.preventDefault();
    changingPassword = true;
    passwordMessage = "";
    const res = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) { passwordMessage = "Password changed"; currentPassword = ""; newPassword = ""; showChangePassword = false; }
    else { const r = await res.json(); passwordMessage = r.error || "Failed to change password"; }
    changingPassword = false;
  }
</script>

<div class="page page:sm">
  <h1>Account</h1>

  <div class="card">
    <div class="profile-header">
      <div class="avatar-section">
        <Avatar name={data.user!.name} url={avatarUrl} color={avatarColor} size="lg" />
        <div class="avatar-actions">
          <label class="btn-ghost" class:disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Photo"}
            <input type="file" accept="image/*" onchange={uploadAvatar} hidden />
          </label>
        </div>
      </div>
      <div>
        <h2>{data.user!.name}</h2>
        <p class="secondary">{data.user!.email}</p>
      </div>
      <p class="tertiary">Joined {new Date(data.user!.createdAt).toLocaleDateString()}</p>
    </div>

    <div class="avatar-colors">
      <p class="secondary">Avatar Color</p>
      <div class="color-grid">
        {#each AVATAR_COLORS as c}
          <button
            class="color-swatch"
            class:active={avatarColor === c && !avatarUrl}
            style="background-color: {c}"
            onclick={() => setColor(c)}
            aria-label="Set avatar color"
          ></button>
        {/each}
      </div>
    </div>
  </div>

  <div class="card">
    <h3>Edit Profile</h3>
    <form class="profile-form" onsubmit={saveProfile}>
      <div class="field">
        <label for="profile-name">Name</label>
        <input id="profile-name" bind:value={name} />
      </div>
      <div class="form-actions">
        <button type="submit" class="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        <button type="button" class="btn-ghost" onclick={() => showChangePassword = true}>Change Password</button>
      </div>
      {#if message}
        <p class:success={messageType === "success"} class:error={messageType === "error"}>{message}</p>
      {/if}
    </form>
  </div>

  <div class="card">
    <h3>Preferences</h3>
    <p class="secondary">Update how lightdrive looks, feels and works for you.</p>
    <a href="/account/preferences" class="btn-ghost">Manage Preferences</a>
  </div>
  
  <div class="card">
    <h3>Sharing</h3>
    <p class="secondary">Manage your share links and view drives shared with you.</p>
    <a href="/account/shares" class="btn-ghost">Manage Sharing</a>
  </div>
</div>

{#if showChangePassword}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-overlay" role="button" tabindex="0" onclick={() => showChangePassword = false}>
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
      <h2>Change Password</h2>
      <form onsubmit={changePassword}>
        <div class="field">
          <label for="current-password">Current Password</label>
          <input id="current-password" type="password" bind:value={currentPassword} required />
        </div>
        <div class="field">
          <label for="new-password">New Password</label>
          <input id="new-password" type="password" bind:value={newPassword} required />
        </div>
        {#if passwordMessage}
          <p>{passwordMessage}</p>
        {/if}
        <div class="modal-actions">
          <button type="button" class="btn-ghost" onclick={() => showChangePassword = false}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={changingPassword || !currentPassword || !newPassword}>{changingPassword ? "Changing..." : "Change Password"}</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--flew-spacing-2);
  }

  .avatar-actions label {
    cursor: pointer;
    font-size: var(--flew-font-size-xs);
  }

  .avatar-actions label.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .avatar-colors {
    margin-top: var(--flew-spacing-4);
  }

  .color-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--flew-spacing-2);
    margin-top: var(--flew-spacing-2);
  }

  .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: var(--flew-radius-full);
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.1s;
  }

  .color-swatch:hover {
    transform: scale(1.15);
  }

  .color-swatch.active {
    border-color: var(--flew-color-text);
    transform: scale(1.15);
  }
</style>
