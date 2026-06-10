<script lang="ts">
  import { onMount } from "svelte";
  import { getFormCtx } from "./form-context.js";
  import { writable } from "svelte/store";

  type Props = {
    class?: string;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
    id?: string;
    name?: string;
    rows?: number;
    readonly?: boolean;
    required?: boolean;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
  };

  let {
    class: classProp = "",
    value = $bindable(""),
    placeholder = "",
    disabled = false,
    label = "",
    id = "",
    name = "",
    rows = 3,
    readonly = false,
    required = false,
    oninput,
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
<textarea
  name={name || id}
  id={id}
  {placeholder}
  {disabled}
  {readonly}
  {required}
  {rows}
  bind:value={() => $valStore, (val) => ($valStore = val)}
  class={classProp}
  {oninput}
  {onchange}
></textarea>
