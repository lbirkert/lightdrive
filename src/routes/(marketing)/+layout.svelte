<script lang="ts">
  import "$lib/styles/marketing.css";
  import { page } from "$app/stores";
  import { ModeWatcher, mode, setMode } from "mode-watcher";
  import { Zap, Sun, Moon } from "@lucide/svelte";

  let { children }: { children: import("svelte").Snippet } = $props();

  let isDark = $state(true);
  $effect(() => { isDark = mode.current === "dark"; });

  function toggleTheme() {
    setMode(mode.current === "light" ? "dark" : "light");
  }

  let isMarketing = $derived($page.url.pathname === "/" || $page.url.pathname.startsWith("/api-docs"));
</script>

<ModeWatcher />
<div class="mk-root-wrap" class:mk-marketing={isMarketing}>
  {#if isMarketing}
    <header class="mk-marketing-header">
      <div class="mk-flex-row mk-gap-3 mk-align-center">
        <a href="/" class="mk-logo">
          <Zap size={20} />
          <span class="mk-text-semibold">LightDrive</span>
        </a>
        <div class="mk-flex-1"></div>
        <nav class="mk-marketing-nav">
          <a href="/" class="mk-nav-link" class:mk-active={$page.url.pathname === "/"}>
            Home
          </a>
          <a href="/api-docs" class="mk-nav-link" class:mk-active={$page.url.pathname.startsWith("/api-docs")}>
            API Docs
          </a>
          <button class="mk-nav-link mk-theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
            {#if isDark}
              <Sun size={14} />
            {:else}
              <Moon size={14} />
            {/if}
          </button>
          <a href="/drive" class="mk-nav-link mk-app-link">
            Go to App
          </a>
        </nav>
      </div>
    </header>
  {/if}
  <div class="mk-root-content" style="margin-top: 53px;">
    {@render children()}
  </div>
</div>
