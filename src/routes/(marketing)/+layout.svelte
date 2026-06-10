<script lang="ts">
  import "$lib/styles/marketing.css";
  import { page } from "$app/stores";
  import { ModeWatcher } from "mode-watcher";
  import { HardDrive } from "@lucide/svelte";

  let { children }: { children: import("svelte").Snippet } = $props();

  let isMarketing = $derived($page.url.pathname === "/" || $page.url.pathname.startsWith("/api-docs"));
</script>

<ModeWatcher />
<div class="root-wrap" class:marketing={isMarketing}>
  {#if isMarketing}
    <header class="marketing-header">
      <div class="flex-row gap-3 align-center">
        <a href="/" class="logo">
          <HardDrive size={20} />
          <span class="text-semibold">LightDrive</span>
        </a>
        <div class="flex-1"></div>
        <nav class="marketing-nav">
          <a href="/" class="nav-link" class:active={$page.url.pathname === "/"}>
            Home
          </a>
          <a href="/api-docs" class="nav-link" class:active={$page.url.pathname.startsWith("/api-docs")}>
            API Docs
          </a>
          <a href="/drive" class="nav-link app-link">
            Go to App
          </a>
        </nav>
      </div>
    </header>
  {/if}
  <div class="root-content">
    {@render children()}
  </div>
</div>
