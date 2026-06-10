<script lang="ts">
  import { onMount } from "svelte";
  import { getFormCtx } from "./form-context.js";
  import { writable } from "svelte/store";

  type Props = {
    class?: string;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    id?: string;
    name?: string;
    required?: boolean;
    onchange?: (e: Event) => void;
  };

  let {
    class: classProp = "",
    checked = $bindable(false),
    disabled = false,
    label = "",
    id = "",
    name = "",
    required = false,
    onchange,
  }: Props = $props();

  const formCtx = getFormCtx();
  let valStore = writable<string>(checked ? "true" : "false");

  $effect(() => {
    valStore.set(checked ? "true" : "false");
  });

  onMount(() => {
    if (!formCtx || !id) return;
    formCtx.register({ id, value: valStore });
    return () => formCtx.unregister(id);
  });
</script>

<label class={classProp}>
  <input
    type="checkbox"
    name={name || id}
    id={id}
    {disabled}
    bind:checked
    {onchange}
  />
  {#if label}
    <span>{label}{#if required}<span class="required">*</span>{/if}</span>
  {/if}
</label>
