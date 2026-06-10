<script lang="ts">
  import { onMount } from "svelte";
  import { getFormCtx } from "./form-context.js";
  import { writable } from "svelte/store";

  type Props = {
    class?: string;
    value?: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
    id?: string;
    name?: string;
    readonly?: boolean;
    required?: boolean;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
    onblur?: (e: Event) => void;
  };

  let {
    class: classProp = "",
    value = $bindable(""),
    type = "text",
    placeholder = "",
    disabled = false,
    label = "",
    id = "",
    name = "",
    readonly = false,
    required = false,
    oninput,
    onchange,
    onblur,
  }: Props = $props();

  const formCtx = getFormCtx();
  let valStore = writable(value);

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
<input
  {type}
  name={name || id}
  id={id}
  {placeholder}
  {disabled}
  {readonly}
  {required}
  bind:value={() => $valStore, (val) => ($valStore = val)}
  class={classProp}
  {oninput}
  {onchange}
  {onblur}
/>
