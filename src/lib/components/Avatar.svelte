<script lang="ts">
  import { getInitials } from "../helpers";

  type Props = {
    name: string;
    url?: string | null;
    color?: string | null;
    size?: "sm" | "md" | "lg";
  };

  let { name, url, color, size = "sm" }: Props = $props();

  let imgError = $state(false);
  $effect(() => { imgError = false; });

  function avatarSrc(): string | undefined {
    if (!url) return undefined;
    if (size === "lg" && url.endsWith(".webp")) {
      return url.replace(".webp", "@1024.webp");
    }
    return url;
  }
</script>

{#if url && !imgError}
  <img
    src={avatarSrc()}
    alt={name}
    class="avatar avatar:{size}"
    onerror={() => imgError = true}
  />
{:else}
  <span
    class="avatar avatar:{size}"
    style="background-color: {color ?? 'var(--flew-color-primary)'}"
  >{getInitials(name)}</span>
{/if}
