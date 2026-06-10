<script lang="ts">
  import type { Snippet } from "svelte";
  import { setFormCtx, type FormCtx, type FormErrors, type FormValues, type FieldRegistration } from "./form-context.js";
  import type { Readable } from "svelte/store";

  type Props = {
    onSubmit: (data: FormValues, e: SubmitEvent) => void;
    class?: string;
    novalidate?: boolean;
    children: Snippet;
  };

  let {
    onSubmit,
    class: classProp = "",
    novalidate = false,
    children,
  }: Props = $props();

  let fields = $state<Map<string, FieldRegistration>>(new Map());
  let errors = $state<FormErrors>({});
  let submitted = $state(false);

  let hasErrors = $derived(Object.values(errors).some(e => e !== undefined && e !== ""));

  function setError(id: string, error: string | undefined) {
    errors = { ...errors, [id]: error };
  }

  let values: { [key: string]: Readable<any> } = {};

  const ctx: FormCtx = {
    register(field: FieldRegistration) { values[field.id] = field.value; },
    unregister(id: string) { delete values[id]; },
    setError,
    get errors() { return errors; },
    get hasErrors() { return hasErrors; },
    get values() { return values; },
    get submitted() { return submitted; },
    validateAll() { return true; },
  };

  setFormCtx(ctx);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    submitted = true;
    if (!novalidate && hasErrors) return;
    onSubmit(values, e);
  }
</script>

<form {novalidate} onsubmit={handleSubmit} class={classProp}>
  {@render children()}
</form>
