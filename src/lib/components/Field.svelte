<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    class?: string;
    name?: string;
    label?: string;
    required?: boolean;
    children: Snippet;
  };

  let {
    class: classProp = "",
    name = "",
    label = "",
    required = false,
    children,
  }: Props = $props();
</script>

<div class={classProp}>
  {#if label}
    <label for={name}>
      {label}
      {#if required}<span class="required">*</span>{/if}
    </label>
  {/if}
  {@render children()}
</div>
