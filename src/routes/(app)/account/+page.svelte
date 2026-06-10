<script lang="ts">
  import { Button, Card, Flex, Heading, Input, Text, Modal, Avatar, Divider } from "flewui";
  import { Mail, Calendar, Save, Lock, Link as LinkIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";

  let { data } = $props();

  function getInitials(name: string) {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  }

  let name = $state(data.user!.name);
  let saving = $state(false);
  let message = $state("");
  let messageType = $state<"success" | "error">("success");

  async function saveProfile() {
    saving = true;
    message = "";
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      messageType = "success";
      message = "Profile updated";
      goto("/account");
    } else {
      const r = await res.json();
      messageType = "error";
      message = r.error || "Failed to update";
    }
    saving = false;
  }

  let showChangePassword = $state(false);
  let currentPassword = $state("");
  let newPassword = $state("");
  let changingPassword = $state(false);
  let passwordMessage = $state("");

  async function changePassword() {
    changingPassword = true;
    passwordMessage = "";
    const res = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      passwordMessage = "Password changed";
      currentPassword = "";
      newPassword = "";
      showChangePassword = false;
    } else {
      const r = await res.json();
      passwordMessage = r.error || "Failed to change password";
    }
    changingPassword = false;
  }
</script>

<Flex direction="vertical" gap="var(--flew-spacing-6)" style="padding: var(--flew-spacing-6); max-width: 640px; margin: 0 auto;">
  <Heading depth={1}>Account</Heading>

  <Card variant="outlined" paddingSize="lg">
    <Flex direction="vertical" gap="var(--flew-spacing-4)" align="center" style="text-align: center;">
      <Avatar initials={getInitials(data.user!.name)} size="xl" />
      <div>
        <Heading depth={2} margin="none">{data.user!.name}</Heading>
        <Flex align="center" gap="4px" justify="center">
          <Mail size={12} />
          <Text size="sm" color="secondary">{data.user!.email}</Text>
        </Flex>
      </div>
      <Flex align="center" gap="4px">
        <Calendar size={12} />
        <Text size="xs" color="tertiary">Joined {new Date(data.user!.createdAt).toLocaleDateString()}</Text>
      </Flex>
    </Flex>
  </Card>

  <Card variant="outlined" paddingSize="lg">
    <Flex direction="vertical" gap="var(--flew-spacing-4)">
      <Heading depth={3} margin="none">Edit Profile</Heading>

      <Input label="Name" bind:value={name} />

      <Flex gap="var(--flew-spacing-2)" align="center">
        <Button variant="primary" size="sm" onclick={saveProfile} disabled={saving}>
          <Save size={14} /> {saving ? "Saving..." : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onclick={() => showChangePassword = true}>
          <Lock size={14} /> Change Password
        </Button>
      </Flex>

      {#if message}
        <Text size="sm" color={messageType === "success" ? "success" : "error"}>{message}</Text>
      {/if}
    </Flex>
  </Card>

  <Card variant="outlined" paddingSize="lg">
    <Flex direction="vertical" gap="var(--flew-spacing-3)">
      <Flex align="center" gap="var(--flew-spacing-2)">
        <LinkIcon size={16} />
        <Heading depth={3} margin="none">Share Links</Heading>
      </Flex>
      <Text size="sm" color="secondary">Manage all your active share links across files and folders.</Text>
      <a href="/account/shares">
        <Button variant="primary" size="sm">Manage Share Links</Button>
      </a>
    </Flex>
  </Card>
</Flex>

<Modal bind:open={showChangePassword} title="Change Password" onClose={() => showChangePassword = false}>
  <form id="change-password-form" onsubmit={(e) => { e.preventDefault(); changePassword(); }}>
    <Flex direction="vertical" gap="var(--flew-spacing-3)">
      <Input label="Current Password" type="password" bind:value={currentPassword} required />
      <Input label="New Password" type="password" bind:value={newPassword} required />
      {#if passwordMessage}
        <Text size="sm">{passwordMessage}</Text>
      {/if}
    </Flex>
  </form>
  {#snippet footer()}
    <Flex gap="var(--flew-spacing-2)" justify="end">
      <Button variant="ghost" onclick={() => showChangePassword = false}>Cancel</Button>
      <Button type="submit" form="change-password-form" variant="primary" disabled={changingPassword || !currentPassword || !newPassword}>
        {changingPassword ? "Changing..." : "Change Password"}
      </Button>
    </Flex>
  {/snippet}
</Modal>