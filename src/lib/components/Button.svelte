<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    class?: string;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    href?: string;
    children: Snippet;
    onclick?: (e: MouseEvent) => void;
  };

  let {
    class: classProp = "",
    type = "button",
    disabled = false,
    href,
    children,
    onclick,
    ...restProps
  }: Props = $props();
</script>

{#if href}
  <a {href} class={classProp} onclick={onclick} {...restProps}>
    {@render children()}
  </a>
{:else}
  <button {type} class={classProp} {disabled} {onclick} {...restProps}>
    {@render children()}
  </button>
{/if}
