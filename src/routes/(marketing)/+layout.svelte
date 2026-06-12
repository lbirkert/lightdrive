<script lang="ts">
  import "$lib/styles/marketing.css";
  import { page } from "$app/stores";
  import { ModeWatcher, mode, setMode } from "mode-watcher";
  import { Zap, Sun, Moon, Menu } from "@lucide/svelte";

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
    <input type="checkbox" id="mk-mobile-menu-toggle" class="mk-mobile-menu-checkbox" />
    <header class="mk-marketing-header">
      <div class="mk-flex-row mk-gap-3 mk-align-center">
        <a href="/" class="mk-logo">
          <Zap size={20} />
          <span class="mk-text-semibold">LightDrive</span>
        </a>
        <div class="mk-flex-1"></div>
        <label class="mk-burger-label" for="mk-mobile-menu-toggle" aria-label="Menu">
          <Menu size={22} />
        </label>
        <nav class="mk-marketing-nav">
          <a href="/" class="mk-nav-link" class:mk-active={$page.url.pathname === "/"}>
            Home
          </a>
          <a href="/api-docs" class="mk-nav-link" class:mk-active={$page.url.pathname.startsWith("/api-docs")}>
            API Docs
          </a>
          <a href="/drive" class="mk-nav-link mk-app-link">
            Go to App
          </a>
          <button class="mk-nav-link mk-theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
            {#if isDark}
              <Sun size={14} />
            {:else}
              <Moon size={14} />
            {/if}
          </button>
        </nav>
      </div>
    </header>

    <div class="mk-mobile-overlay">
      <nav class="mk-mobile-menu">
        <ul>
          <li>
            <a href="/" class="nav-link" class:active={$page.url.pathname === "/"} onclick={() => { const cb = document.getElementById("mk-mobile-menu-toggle") as HTMLInputElement; if (cb) cb.checked = false; }}>
              Home
            </a>
          </li>
          <li>
            <a href="/api-docs" class="nav-link" class:active={$page.url.pathname.startsWith("/api-docs")} onclick={() => { const cb = document.getElementById("mk-mobile-menu-toggle") as HTMLInputElement; if (cb) cb.checked = false; }}>
              API Docs
            </a>
          </li>
          <li>
            <a href="/drive" class="nav-link" class:active={$page.url.pathname.startsWith("/drive")} onclick={() => { const cb = document.getElementById("mk-mobile-menu-toggle") as HTMLInputElement; if (cb) cb.checked = false; }}>
              Go to App
            </a>
          </li>
        </ul>
        <hr />
        <ul>
          <li>
            <button class="nav-link" onclick={() => { toggleTheme(); const cb = document.getElementById("mk-mobile-menu-toggle") as HTMLInputElement; if (cb) cb.checked = false; }}>
              {#if isDark}<Sun size={18} /> Light Mode{:else}<Moon size={18} /> Dark Mode{/if}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  {/if}
  <div class="mk-root-content">
    {@render children()}
  </div>
</div>
