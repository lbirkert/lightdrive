<script lang="ts">
  import { page } from "$app/stores";
  import { ModeWatcher, mode, setMode } from "mode-watcher";
  import "$lib/styles/mobile.css";
  import { goto } from "$app/navigation";
  import {
    Folder,
    BarChart3,
    LogIn,
    LogOut,
    User,
    Settings,
    HardDrive,
    Menu,
    Share2,
    Zap,
    Sun,
    Moon,
  } from "@lucide/svelte";

  let isDark = $state(true);
  $effect(() => {
    isDark = mode.current === "dark";
  });

  function toggleTheme() {
    setMode(mode.current === "light" ? "dark" : "light");
  }
  import UploadFooter from "$lib/components/UploadFooter.svelte";
  import { uploadStore } from "$lib/components/upload-store.svelte";
  import Avatar from "$lib/components/Avatar.svelte";

  let {
    data,
    children,
  }: {
    data: { user: App.Locals["user"] };
    children: import("svelte").Snippet;
  } = $props();
  let user = $derived(data.user);

  let isMarketing = $derived(
    $page.url.pathname === "/" || $page.url.pathname.startsWith("/api-docs"),
  );

  let userMenuOpen = $state(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    goto("/auth");
  }

  const links = [
    { href: "/drive", label: "Drive", icon: Folder },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  $effect(() => {
    function onOnline() {
      uploadStore.isOnline = true;
      uploadStore.onlineResolve?.();
      uploadStore.onlineResolve = null;
    }
    function onOffline() {
      uploadStore.isOnline = false;
      uploadStore.currentXhr?.abort();
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  });
</script>

<ModeWatcher />

{#if isMarketing}
  {@render children()}
{:else}
  <input type="checkbox" id="mobile-menu-toggle" class="mobile-menu-checkbox" />
  <div class="app-shell">
    <header class="app-header">
      <a href="/drive" class="logo"><Zap size={14} /> LightDrive</a>

      <nav class="desktop-nav">
        <ul>
          {#each links as { href, label, icon: Icon }}
            <li>
              <a
                {href}
                class="nav-link"
                class:active={$page.url.pathname.startsWith(href)}
              >
                <Icon size={14} />
                {label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>

      <div class="header-spacer"></div>

      <div class="desktop-user">
        {#if user}
          <div class="user-menu">
            <button
              class="user-btn ghost"
              onclick={() => (userMenuOpen = !userMenuOpen)}
              onblur={() => setTimeout(() => (userMenuOpen = false), 150)}
            >
              <Avatar
                name={user.name}
                url={user.avatarUrl}
                color={user.avatarColor}
                size="sm"
              />
              <span class="user-name">{user.name}</span>
            </button>
            {#if userMenuOpen}
              <nav class="user-dropdown">
                <ul>
                  <li>
                    <a
                      href="/account"
                      class="nav-link"
                      onclick={() => (userMenuOpen = false)}
                      ><User size={14} /> Account</a
                    >
                  </li>
                  <li>
                    <a
                      href="/account/preferences"
                      class="nav-link"
                      onclick={() => (userMenuOpen = false)}
                      ><Settings size={14} /> Preferences</a
                    >
                  </li>
                  <li>
                    <a
                      href="/account/shares"
                      class="nav-link"
                      onclick={() => (userMenuOpen = false)}
                      ><Share2 size={14} /> Sharing</a
                    >
                  </li>
                  <li>
                    <button
                      class="nav-link"
                      onclick={() => {
                        userMenuOpen = false;
                        logout();
                      }}><LogOut size={14} /> Sign Out</button
                    >
                  </li>
                </ul>
              </nav>
            {/if}
          </div>
        {:else}
          <a href="/auth" class="sign-in-link"><LogIn size={14} /> Sign In</a>
        {/if}
      </div>

      <button
        class="nav-link theme-toggle"
        onclick={toggleTheme}
        aria-label="Toggle theme"
      >
        {#if isDark}<Sun size={14} />{:else}<Moon size={14} />{/if}
      </button>

      <label class="burger-label" for="mobile-menu-toggle" aria-label="Menu"
        ><Menu size={22} /></label
      >
    </header>

    <div class="app-content">
      <div class="mobile-overlay">
        <nav class="mobile-menu">
          <ul>
            {#each links as { href, label, icon: Icon }}
              <li>
                <a
                  {href}
                  class="nav-link"
                  class:active={$page.url.pathname.startsWith(href)}
                  onclick={() => {
                    const cb = document.getElementById(
                      "mobile-menu-toggle",
                    ) as HTMLInputElement;
                    if (cb) cb.checked = false;
                  }}
                >
                  <Icon size={18} />
                  {label}
                </a>
              </li>
            {/each}
          </ul>
          {#if user}
            <hr />
            <div class="mobile-user-info">
              <Avatar
                name={user.name}
                url={user.avatarUrl}
                color={user.avatarColor}
                size="md"
              />
              <div>
                <span class="user-name">{user.name}</span>
                <span class="mobile-user-email">{user.email}</span>
              </div>
            </div>
            <ul>
              <li>
                <a
                  href="/account"
                  class="nav-link"
                  class:active={$page.url.pathname === "/account"}
                  onclick={() => {
                    const cb = document.getElementById(
                      "mobile-menu-toggle",
                    ) as HTMLInputElement;
                    if (cb) cb.checked = false;
                  }}><User size={18} /> Account</a
                >
              </li>
              <li>
                <a
                  href="/account/preferences"
                  class="nav-link"
                  class:active={$page.url.pathname === "/account/preferences"}
                  onclick={() => {
                    const cb = document.getElementById(
                      "mobile-menu-toggle",
                    ) as HTMLInputElement;
                    if (cb) cb.checked = false;
                  }}><Settings size={18} /> Preferences</a
                >
              </li>
              <li>
                <a
                  href="/account/shares"
                  class="nav-link"
                  class:active={$page.url.pathname === "/account/shares"}
                  onclick={() => {
                    const cb = document.getElementById(
                      "mobile-menu-toggle",
                    ) as HTMLInputElement;
                    if (cb) cb.checked = false;
                  }}><Share2 size={18} /> Sharing</a
                >
              </li>
              <li>
                <button
                  class="nav-link"
                  onclick={() => {
                    const cb = document.getElementById(
                      "mobile-menu-toggle",
                    ) as HTMLInputElement;
                    if (cb) cb.checked = false;
                    logout();
                  }}><LogOut size={18} /> Sign Out</button
                >
              </li>
            </ul>
          {:else}
            <hr />
            <ul>
              <li>
                <a
                  href="/auth"
                  class="nav-link"
                  class:active={$page.url.pathname === "/auth"}
                  onclick={() => {
                    const cb = document.getElementById(
                      "mobile-menu-toggle",
                    ) as HTMLInputElement;
                    if (cb) cb.checked = false;
                  }}><LogIn size={18} /> Sign In</a
                >
              </li>
            </ul>
          {/if}
          <hr />
          <ul>
            <li>
              <button class="nav-link" onclick={() => { toggleTheme(); const cb = document.getElementById("mobile-menu-toggle") as HTMLInputElement; if (cb) cb.checked = false; }}>
                {#if isDark}<Sun size={18} /> Light Mode{:else}<Moon size={18} /> Dark Mode{/if}
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <main class="app-main">
        {@render children()}
      </main>
    </div>
    <UploadFooter />
  </div>
{/if}
