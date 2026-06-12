<script lang="ts">
  import { Zap, Share2, Lock, ArrowRight, Upload, Grid3X3, Image, BarChart3, ExternalLink } from "@lucide/svelte";
  import { mode } from "mode-watcher";

  let isDark = $state(true);
  $effect(() => { isDark = mode.current === "dark"; });

  let features = [
    { icon: Upload, title: "Upload & Organize", desc: "Drag-and-drop files into folders. Supports images, documents, and more with auto-generated previews." },
    { icon: Grid3X3, title: "Multiple Views", desc: "Browse your files in List, Grid, or Presentation view — just like your local file manager." },
    { icon: Share2, title: "Share via Links", desc: "Generate shareable links with granular permissions for files and folders." },
    { icon: Image, title: "Smart Previews", desc: "Images get instant WEBP preview thumbnails. PDF, document previews included." },
    { icon: BarChart3, title: "Analytics Dashboard", desc: "Track uploads, storage usage, and download activity at a glance." },
    { icon: Lock, title: "Secure by Default", desc: "Passwords hashed with Argon2. Sessions via HTTP-only cookies." },
  ];
</script>

<svelte:head>
  <title>LightDrive - Self-Hosted Cloud Storage</title>
  <meta name="description" content="LightDrive – Your personal cloud storage: fast, private, and self-hosted. Upload, organize, and share files with ease." />
  <meta property="og:title" content="LightDrive - Self-Hosted Cloud Storage" />
  <meta property="og:description" content="Your personal cloud storage: fast, private, and self-hosted." />
</svelte:head>

<div class="mk-home">
  <div class="mk-hero">
    <div class="mk-hero-bg"></div>
    <div class="mk-hero-content">
      <div class="mk-hero-icon"><Zap size={56} /></div>
      <h1 class="mk-hero-title">LightDrive</h1>
      <p class="mk-hero-subtitle">Your personal cloud storage — fast, private, and self-hosted.</p>
      <div class="mk-hero-actions">
        <a href="/auth" class="mk-btn mk-btn-primary mk-btn-lg">Sign Up <ArrowRight size={16} /></a>
        <a href="/drive" class="mk-btn mk-btn-ghost mk-btn-lg">Go to Drive</a>
      </div>
      <div class="mk-hero-links">
        <a href="https://github.com/lbirkert/lightdrive" class="mk-nav-link" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> GitHub</a>
        <a href="https://github.com/lbirkert/lightdrive#readme" class="mk-nav-link" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Quickstart</a>
      </div>
    </div>
  </div>

  <div class="mk-screenshots mk-m-hide">
    <div class="mk-window-frame mk-window-frame--back">
      <div class="mk-window-titlebar">
        <div class="mk-window-dot mk-window-dot--red"></div>
        <div class="mk-window-dot mk-window-dot--yellow"></div>
        <div class="mk-window-dot mk-window-dot--green"></div>
      </div>
      {#if isDark}
        <img src="/marketing/dash_dark.png" alt="LightDrive dashboard screenshot" />
      {:else}
        <img src="/marketing/dash_light.png" alt="LightDrive dashboard screenshot" />
      {/if}
    </div>
    <div class="mk-window-frame mk-window-frame--front">
      <div class="mk-window-titlebar">
        <div class="mk-window-dot mk-window-dot--red"></div>
        <div class="mk-window-dot mk-window-dot--yellow"></div>
        <div class="mk-window-dot mk-window-dot--green"></div>
      </div>
      {#if isDark}
        <img src="/marketing/app_dark.png" alt="LightDrive app screenshot" />
      {:else}
        <img src="/marketing/app_light.png" alt="LightDrive app screenshot" />
      {/if}
    </div>
  </div>

  <div class="mk-features-section">
    <div class="mk-features-grid">
      {#each features as { icon: Icon, title, desc }}
        <div class="mk-feature-card">
          <Icon class="mk-feature-card-icon" size={24} />
          <h3 class="mk-heading-3">{title}</h3>
          <p class="mk-text-sm mk-text-secondary">{desc}</p>
        </div>
      {/each}
    </div>
  </div>

  <footer class="mk-footer">
    <p class="mk-text-sm mk-text-tertiary">Built with SvelteKit, Prisma, and SQLite.</p>
    <div class="mk-footer-links">
      <a href="https://github.com/lbirkert/lightdrive" class="mk-nav-link" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> GitHub</a>
      <a href="https://github.com/lbirkert/lightdrive#readme" class="mk-nav-link" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Quickstart</a>
    </div>
  </footer>
</div>
