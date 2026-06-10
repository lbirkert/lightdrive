<script lang="ts">
  type Props = {
    class?: string;
    value?: string;
    name?: string;
    disabled?: boolean;
    label?: string;
    group?: string;
    onchange?: (e: Event) => void;
  };

  let {
    class: classProp = "",
    value = $bindable(""),
    name = "",
    disabled = false,
    label = "",
    group = $bindable(""),
    onchange,
  }: Props = $props();
</script>

<label class={classProp}>
  <input
    type="radio"
    {name}
    {disabled}
    bind:group
    bind:value
    {onchange}
  />
  {#if label}
    <span>{label}</span>
  {/if}
</label>
