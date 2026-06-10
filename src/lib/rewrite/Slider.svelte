<script lang="ts">
  type Props = {
    class?: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    label?: string;
    oninput?: (e: Event) => void;
  };

  let {
    class: classProp = "",
    value = $bindable(0),
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    label = "",
    oninput,
  }: Props = $props();
</script>

{#if label}
  <div>
    <span>{label}</span>
    <span>{value}</span>
  </div>
{/if}
<input
  type="range"
  {min}
  {max}
  {step}
  {disabled}
  bind:value
  class={classProp}
  {oninput}
/>
