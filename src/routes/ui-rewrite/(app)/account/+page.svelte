<script lang="ts">
  import { goto } from "$app/navigation";

  let { data } = $props();

  function getInitials(name: string) {
    return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  }

  let name = $state("");
  let saving = $state(false);
  let message = $state("");
  let messageType = $state<"success" | "error">("success");

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
    if (res.ok) { messageType = "success"; message = "Profile updated"; goto("/ui-rewrite/account"); }
    else { const r = await res.json(); messageType = "error"; message = r.error || "Failed to update"; }
    saving = false;
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
      <div class="avatar avatar:lg">{getInitials(data.user!.name)}</div>
      <div>
        <h2>{data.user!.name}</h2>
        <p class="secondary">{data.user!.email}</p>
      </div>
      <p class="tertiary">Joined {new Date(data.user!.createdAt).toLocaleDateString()}</p>
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
    <h3>Share Links</h3>
    <p class="secondary">Manage all your active share links across files and folders.</p>
    <a href="/ui-rewrite/account/shares" class="btn-primary">Manage Share Links</a>
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
