<script lang="ts">
  import { HardDrive, Share2, Lock, ArrowRight, Upload, Grid3X3, Image, BarChart3 } from "@lucide/svelte";

  let features = [
    { icon: Upload, title: "Upload & Organize", desc: "Drag-and-drop files into folders. Supports images, documents, and more with auto-generated previews." },
    { icon: Grid3X3, title: "Multiple Views", desc: "Browse your files in List, Grid, or Presentation view — just like your local file manager." },
    { icon: Share2, title: "Share via Links", desc: "Generate shareable links with granular permissions for files and folders." },
    { icon: Image, title: "Smart Previews", desc: "Images get instant WEBP preview thumbnails. PDF, document previews included." },
    { icon: BarChart3, title: "Analytics Dashboard", desc: "Track uploads, storage usage, and download activity at a glance." },
    { icon: Lock, title: "Secure by Default", desc: "Passwords hashed with Argon2. Sessions via HTTP-only cookies." },
  ];
</script>

<div class="home">
  <div class="hero">
    <div class="hero-bg"></div>
    <div class="hero-content">
      <div class="hero-icon"><HardDrive size={56} /></div>
      <h1 class="hero-title">LightDrive</h1>
      <p class="hero-subtitle">Your personal cloud storage — fast, private, and self-hosted.</p>
      <div class="hero-actions">
        <a href="/auth" class="btn btn-primary btn-lg">Get Started <ArrowRight size={16} /></a>
        <a href="/drive" class="btn btn-ghost btn-lg">Go to Drive</a>
      </div>
    </div>
  </div>

  <div class="features-section">
    <div class="features-grid">
      {#each features as { icon: Icon, title, desc }}
        <div class="feature-card">
          <Icon class="feature-card-icon" size={24} />
          <h3 class="heading-3">{title}</h3>
          <p class="text-sm text-secondary">{desc}</p>
        </div>
      {/each}
    </div>
  </div>

  <footer class="footer">
    <p class="text-sm text-tertiary">Built with SvelteKit, Prisma, and SQLite.</p>
  </footer>
</div>
