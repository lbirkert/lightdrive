<script lang="ts">
  import "flewui/styles";
  import { page } from "$app/stores";
  import { ModeWatcher } from "mode-watcher";
  import { Flex, Text } from "flewui";
  import { HardDrive } from "@lucide/svelte";

  let { children }: { children: import("svelte").Snippet } = $props();

  let isMarketing = $derived($page.url.pathname === "/" || $page.url.pathname.startsWith("/api-docs"));
</script>

<ModeWatcher />
<div class="root-wrap" class:marketing={isMarketing}>
  {#if isMarketing}
    <header class="marketing-header">
      <Flex gap="var(--flew-spacing-3)" align="center">
        <a href="/" class="logo">
          <HardDrive size={20} />
          <Text weight="semibold">LightDrive</Text>
        </a>
        <div style="flex: 1;"></div>
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
      </Flex>
    </header>
  {/if}
  <div class="root-content">
    {@render children()}
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: var(--flew-font-sans);
    background: var(--flew-color-bg);
    color: var(--flew-color-text);
  }

  .root-wrap {
    display: flex;
    flex-direction: column;
    max-height: 100vh;
    overflow-y: scroll;
  }

  .root-wrap.marketing {
    min-height: 100dvh;
  }

  .root-content {
    height: calc(100vh - 54px);
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .marketing-header {
    top: 0;
    position: absolute;
    width: 100vw;
    z-index: 100;
    padding: 12px 24px;
    background: var(--flew-color-bg);
    flex-shrink: 0;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    color: inherit;
  }

  .marketing-nav {
    display: flex;
    align-items: center;
    gap: var(--flew-spacing-1);
  }

  .nav-link {
    text-decoration: none;
    color: var(--flew-color-text-secondary);
    font-size: var(--flew-font-size-sm);
    padding: 6px 12px;
    border-radius: var(--flew-radius-sm);
    transition: color var(--flew-transition-fast), background var(--flew-transition-fast);
  }

  .nav-link:hover {
    color: var(--flew-color-text);
    background: var(--flew-color-bg-hover);
  }

  .nav-link.active {
    color: var(--flew-color-text);
    font-weight: 500;
  }

  .app-link {
    background: var(--flew-color-primary);
    color: white;
    font-weight: 500;
  }

  .app-link:hover {
    background: var(--flew-color-primary-hover);
    color: white;
  }
</style>
