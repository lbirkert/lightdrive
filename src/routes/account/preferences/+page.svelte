<script lang="ts">
  import { mode, setMode } from "mode-watcher";

  function parseMode(mode: string): "light" | "dark" | "system" {
    return (mode == "light" || mode == "dark" || mode == "system") ? mode : "system";
  }
</script>

<div class="page page:sm">
  <a href="/account" class="back-link">&larr; Back to Account</a>

  <h1>Preferences</h1>

  <div class="card">
    <h3>Theme</h3>

    <p class="secondary">
      Choose how LightDrive looks. System follows your OS preference.
    </p>

    <div class="field">
      <label for="theme-select">Theme</label>
      <select
        id="theme-select"
        value={mode.current}
        onchange={(e) => setMode(parseMode((e.target as HTMLSelectElement).value))}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  </div>
</div>
