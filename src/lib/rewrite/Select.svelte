<script lang="ts">
  import { onMount } from "svelte";
  import { getFormCtx } from "./form-context.js";
  import { writable } from "svelte/store";

  type Option = { value: string; label: string; disabled?: boolean };

  type Props = {
    class?: string;
    value?: string;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    label?: string;
    id?: string;
    name?: string;
    required?: boolean;
    onchange?: (e: Event) => void;
  };

  let {
    class: classProp = "",
    value = $bindable(""),
    options,
    placeholder = "",
    disabled = false,
    label = "",
    id = "",
    name = "",
    required = false,
    onchange,
  }: Props = $props();

  const formCtx = getFormCtx();
  let valStore = writable<string>(value);

  $effect(() => {
    value = $valStore;
  });

  $effect(() => {
    valStore.set(value);
  });

  onMount(() => {
    if (!formCtx || !id) return;
    formCtx.register({ id, value: valStore });
    return () => formCtx.unregister(id);
  });
</script>

{#if label}
  <label for={id || name}>{label}{#if required}<span class="required">*</span>{/if}</label>
{/if}
<select
  name={name || id}
  id={id}
  {disabled}
  {required}
  bind:value={$valStore}
  class={classProp}
  {onchange}
>
  {#if placeholder}
    <option value="" disabled>{placeholder}</option>
  {/if}
  {#each options as opt}
    <option value={opt.value} disabled={opt.disabled}>{opt.label}</option>
  {/each}
</select>
