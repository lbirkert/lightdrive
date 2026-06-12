<script lang="ts">
  import { onMount } from "svelte";

  let loading = $state(true);
  let error = $state("");

  onMount(async () => {
    try {
      const el = document.getElementById("scalar-container");
      if (!el) throw new Error("Container not found");

      await loadScalarScript();

      el.innerHTML = "";
      loading = false;
      (window as any).Scalar.createApiReference(el, { url: "/api-docs/spec.json" });
    } catch (e: any) {
      error = e.message || "Failed to load API documentation";
      loading = false;
    }
  });

  function loadScalarScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-scalar]');
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.js";
      script.setAttribute("data-scalar", "");
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Scalar API Reference from CDN"));
      document.head.appendChild(script);
    });
  }
</script>

<svelte:head>
  <title>LightDrive API</title>
</svelte:head>

<div id="scalar-container">
  {#if loading && !error}
    <div class="api-docs-status">
      <div class="spinner"></div>
      <p class="text-secondary">Loading API documentation...</p>
    </div>
  {:else if error}
    <div class="mk-api-docs-status">
      <p class="mk-text-error">{error}</p>
      <p class="mk-text-secondary mk-text-sm">Try refreshing the page or check your internet connection.</p>
    </div>
  {/if}
</div>
