<script lang="ts">
  import { Button, Card, Flex, Heading, Text, Modal, Select, Input, Tag } from "flewui";
  import { Link, Trash2, Clock, File, Folder } from "@lucide/svelte";

  let { data } = $props();

  let shares = $state(data.shares);

  let showRevokeConfirm = $state(false);
  let revokeTargetId = $state("");

  let showEditModal = $state(false);
  let editingShare = $state<any>(null);
  let editPermissions = $state("");
  let editExpiry = $state("");

  let copiedToken = $state<string | null>(null);

  function shareUrl(token: string) {
    return `${location.origin}/drive/${token}`;
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      copiedToken = token;
      setTimeout(() => copiedToken = null, 2000);
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
      shares = shares.filter(s => s.id !== revokeTargetId);
      showRevokeConfirm = false;
    }
  }

  function openEdit(share: any) {
    editingShare = share;
    editPermissions = share.permissions;
    editExpiry = share.expiresAt ? new Date(share.expiresAt).toISOString().slice(0, 16) : "";
    showEditModal = true;
  }

  async function saveEdit() {
    if (!editingShare) return;
    const hours = editExpiry
      ? Math.round((new Date(editExpiry).getTime() - Date.now()) / (1000 * 60 * 60))
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
      shares = shares.map((s: any) => s.id === r.share.id ? r.share : s);
      showEditModal = false;
      editingShare = null;
    }
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

<Flex direction="vertical" gap="var(--flew-spacing-6)" style="padding: var(--flew-spacing-6); max-width: 800px; margin: 0 auto;">
  <Flex align="center" gap="var(--flew-spacing-2)">
    <Link size={24} />
    <Heading depth={1} margin="none">Share Links</Heading>
  </Flex>

  <a href="/account" style="text-decoration: none;">
    <Text size="sm" color="secondary">&larr; Back to Account</Text>
  </a>

  {#if shares.length === 0}
    <Card variant="filled" paddingSize="lg" style="text-align: center;">
      <Text color="secondary">No share links yet. Go to your Drive to share files and folders.</Text>
      <div style="margin-top: var(--flew-spacing-3);">
        <a href="/drive"><Button variant="primary">Go to Drive</Button></a>
      </div>
    </Card>
  {:else}
    <Flex direction="vertical" gap="var(--flew-spacing-2)">
      {#each shares as share}
        <Card variant="outlined" paddingSize="md">
          <Flex align="center" gap="var(--flew-spacing-3)" style="flex-wrap: wrap;">
            {#if share.file}
              <File size={16} />
            {:else if share.folder}
              <Folder size={16} />
            {/if}
            <Flex direction="vertical" gap="0" style="flex: 1; min-width: 0;">
              <Text size="sm" weight="semibold" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {share.file?.originalName || share.folder?.name || "Unknown"}
                {#each share.permissions.split(",") as perm}
                  <Tag size="sm" variant={perm === "view" ? "neutral" : "primary"}>{perm.trim()}</Tag>
                {/each}
              </Text>
              <Flex gap="var(--flew-spacing-2)" align="center" style="flex-wrap: wrap;">
                {#if share.expiresAt}
                  <Flex align="center" gap="2px">
                    <Clock size={10} />
                    <Text size="xs" color="tertiary">Expires {formatDate(share.expiresAt)}</Text>
                  </Flex>
                {:else}
                  <Text size="xs" color="tertiary">No expiry</Text>
                {/if}
                <Text size="xs" color="tertiary">Created {formatDate(share.createdAt)}</Text>
              </Flex>
            </Flex>
            <Flex gap="var(--flew-spacing-1)" align="center">
              <Button variant="ghost" size="xs" onclick={() => copyLink(share.token)}>
                {copiedToken === share.token ? "Copied!" : "Copy Link"}
              </Button>
              <Button variant="ghost" size="xs" onclick={() => openEdit(share)}>Edit</Button>
              <Button variant="ghost" size="xs" icon onclick={() => { revokeTargetId = share.id; showRevokeConfirm = true; }} aria-label="Revoke">
                <Trash2 size={14} />
              </Button>
            </Flex>
          </Flex>
        </Card>
      {/each}
    </Flex>
  {/if}
</Flex>

<Modal bind:open={showRevokeConfirm} title="Revoke Share Link" onClose={() => showRevokeConfirm = false}>
  <Text>Are you sure you want to revoke this share link? External users will lose access immediately.</Text>
  {#snippet footer()}
    <Flex gap="var(--flew-spacing-2)" justify="end">
      <Button variant="ghost" onclick={() => showRevokeConfirm = false}>Cancel</Button>
      <Button variant="primary" onclick={revokeShare}>Revoke</Button>
    </Flex>
  {/snippet}
</Modal>

<Modal bind:open={showEditModal} title="Edit Share Link" onClose={() => { showEditModal = false; editingShare = null; }}>
  {#if editingShare}
    <form id="edit-share-form" onsubmit={(e) => { e.preventDefault(); saveEdit(); }}>
      <Flex direction="vertical" gap="var(--flew-spacing-3)">
        <Select label="Permissions" bind:value={editPermissions} options={permissionOptions} />
        <Input type="datetime-local" label="Expires at (optional)" bind:value={editExpiry} />
        <Input label="Share URL" value={`${location.origin}/drive/${editingShare.token}`} readonly />
      </Flex>
    </form>
  {/if}
  {#snippet footer()}
    <Flex gap="var(--flew-spacing-2)" justify="end">
      <Button variant="ghost" onclick={() => { showEditModal = false; editingShare = null; }}>Cancel</Button>
      <Button type="submit" form="edit-share-form" variant="primary">Save Changes</Button>
    </Flex>
  {/snippet}
</Modal>