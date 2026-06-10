<script lang="ts">
  import { onMount } from "svelte";
  import { Spinner, Flex, Text } from "flewui";

  let loading = $state(true);
  let error = $state("");

  onMount(async () => {
    try {
      const el = document.getElementById("scalar-container");
      if (!el) throw new Error("Container not found");

      // Load Scalar script - auto-init is a no-op without #api-reference element
      await loadScalarScript();

      // Mount Scalar on our container
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

<div id="scalar-container" style="flex: 1; width: 100%;">
  {#if loading && !error}
    <Flex direction="vertical" align="center" justify="center" style="height: 100%;" gap="var(--flew-spacing-3)">
      <Spinner />
      <Text color="secondary">Loading API documentation...</Text>
    </Flex>
  {:else if error}
    <Flex direction="vertical" align="center" justify="center" style="height: 100%;" gap="var(--flew-spacing-3)">
      <Text color="error">{error}</Text>
      <Text color="secondary" size="sm">Try refreshing the page or check your internet connection.</Text>
    </Flex>
  {/if}
</div>


<style>
  #scalar-container {
    --scalar-header-height: 54px;
    height: 100vh;
    overflow-y: scroll;
  }
</style>