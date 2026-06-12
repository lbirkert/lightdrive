<script lang="ts">
  import { page } from "$app/stores";
  import "$lib/styles/styles.css";
  import { ModeWatcher, mode, setMode } from "mode-watcher";
  import { Zap, LogIn, Sun, Moon } from "@lucide/svelte";

  let status = $derived($page.status);
  let message = $derived(
    status === 404
      ? "Page not found"
      : status === 410
        ? "This content is no longer available"
        : ($page.error?.message ?? "Something went wrong"),
  );

  let isDark = $state(true);
  $effect(() => {
    isDark = mode.current === "dark";
  });

  function toggleTheme() {
    setMode(mode.current === "light" ? "dark" : "light");
  }
</script>

<svelte:head>
  <title>{status} - LightDrive</title>
</svelte:head>

<div class="unauthorized">
  <h1 style="font-size: 3rem; margin: 0;">{status}</h1>
  <p>{message}</p>
  <a href="/drive" class="btn-primary">Go to Drive</a>
</div>
