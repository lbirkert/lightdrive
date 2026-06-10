<script lang="ts">
  import "$lib/styles/styles.css";
  import { ModeWatcher } from "mode-watcher";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { Folder, BarChart3, LogIn, LogOut, User, Settings, Link, HardDrive, Menu } from "@lucide/svelte";
  import UploadFooter from "$lib/rewrite/UploadFooter.svelte";
  import { uploadStore } from "$lib/rewrite/upload-store.svelte";

  let { data, children }: { data: { user: { id: string; name: string; email: string } | null }; children: import("svelte").Snippet } = $props();
  let user = $derived(data.user);

  let userMenuOpen = $state(false);

  function getInitials(name: string) {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    goto("/ui-rewrite/auth");
  }

  const links = [
    { href: "/ui-rewrite/drive", label: "Drive", icon: Folder },
    { href: "/ui-rewrite/dashboard", label: "Dashboard", icon: BarChart3 },
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
<input type="checkbox" id="mobile-menu-toggle" class="mobile-menu-checkbox" />
<div class="app-shell">
  <header class="app-header">
    <a href="/ui-rewrite/drive" class="logo"><HardDrive size={18} /> LightDrive</a>

    <nav class="desktop-nav">
      <ul>
        {#each links as { href, label, icon: Icon }}
          <li>
            <a href={href} class="nav-link" class:active={$page.url.pathname.startsWith(href)}>
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
            onclick={() => userMenuOpen = !userMenuOpen}
            onblur={() => setTimeout(() => userMenuOpen = false, 150)}
          >
            <span class="avatar avatar:sm">{getInitials(user.name)}</span>
            <span class="user-name">{user.name}</span>
          </button>
          {#if userMenuOpen}
            <nav class="user-dropdown">
              <ul>
                <li><a href="/ui-rewrite/account" class="nav-link" onclick={() => userMenuOpen = false}><User size={14} /> Account</a></li>
                <li><a href="/ui-rewrite/account/preferences" class="nav-link" onclick={() => userMenuOpen = false}><Settings size={14} /> Preferences</a></li>
                <li><a href="/ui-rewrite/account/shares" class="nav-link" onclick={() => userMenuOpen = false}><Link size={14} /> Share Links</a></li>
                <li>
                  <button class="nav-link" onclick={() => { userMenuOpen = false; logout(); }}><LogOut size={14} /> Sign Out</button>
                </li>
              </ul>
            </nav>
          {/if}
        </div>
      {:else}
        <a href="/ui-rewrite/auth" class="sign-in-link"><LogIn size={14} /> Sign In</a>
      {/if}
    </div>

    <label class="burger-label" for="mobile-menu-toggle" aria-label="Menu"><Menu size={22} /></label>
  </header>

  <div class="app-content">
    <div class="mobile-overlay">
      <label class="mobile-overlay-close" for="mobile-menu-toggle"></label>
      <nav class="mobile-menu">
        <ul>
          {#each links as { href, label, icon: Icon }}
            <li>
              <a href={href} class="nav-link" onclick={() => { const cb = document.getElementById('mobile-menu-toggle') as HTMLInputElement; if (cb) cb.checked = false; }}>
                <Icon size={18} />
                {label}
              </a>
            </li>
          {/each}
        </ul>
        {#if user}
          <hr />
          <div class="mobile-user-info">
            <span class="avatar avatar:md">{getInitials(user.name)}</span>
            <div>
              <span class="user-name">{user.name}</span>
              <span class="mobile-user-email">{user.email}</span>
            </div>
          </div>
          <ul>
            <li><a href="/ui-rewrite/account" class="nav-link" onclick={() => { const cb = document.getElementById('mobile-menu-toggle') as HTMLInputElement; if (cb) cb.checked = false; }}><User size={18} /> Account</a></li>
            <li><a href="/ui-rewrite/account/preferences" class="nav-link" onclick={() => { const cb = document.getElementById('mobile-menu-toggle') as HTMLInputElement; if (cb) cb.checked = false; }}><Settings size={18} /> Preferences</a></li>
            <li><a href="/ui-rewrite/account/shares" class="nav-link" onclick={() => { const cb = document.getElementById('mobile-menu-toggle') as HTMLInputElement; if (cb) cb.checked = false; }}><Link size={18} /> Share Links</a></li>
            <li>
              <button class="nav-link" onclick={() => { const cb = document.getElementById('mobile-menu-toggle') as HTMLInputElement; if (cb) cb.checked = false; logout(); }}><LogOut size={18} /> Sign Out</button>
            </li>
          </ul>
        {:else}
          <hr />
          <ul>
            <li><a href="/ui-rewrite/auth" class="nav-link" onclick={() => { const cb = document.getElementById('mobile-menu-toggle') as HTMLInputElement; if (cb) cb.checked = false; }}><LogIn size={18} /> Sign In</a></li>
          </ul>
        {/if}
      </nav>
    </div>
    <main class="app-main">
      {@render children()}
    </main>
  </div>
  <UploadFooter />
</div>

