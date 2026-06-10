<script lang="ts">
  import { Button, Flex, Heading, Text } from "flewui";
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
    <Flex direction="vertical" gap="var(--flew-spacing-4)" align="center" style="position: relative; z-index: 1; text-align: center; padding: 80px 24px;">
      <HardDrive size={56} />
      <Heading depth={1} margin="none" style="font-size: 3.5rem; letter-spacing: -0.02em;">LightDrive</Heading>
      <Text size="lg" color="secondary" style="font-size: 1.2rem; max-width: 540px;">
        Your personal cloud storage — fast, private, and self-hosted.
      </Text>
      <Flex gap="var(--flew-spacing-3)" style="margin-top: 12px;">
        <a href="/auth"><Button variant="primary" size="lg">Get Started <ArrowRight size={16} /></Button></a>
        <a href="/drive"><Button variant="ghost" size="lg">Go to Drive</Button></a>
      </Flex>
    </Flex>
  </div>

  <div class="features-section">
    <div class="features-grid">
      {#each features as { icon: Icon, title, desc }}
        <div class="feature-card">
          <Icon size={24} />
          <Heading depth={3} margin="none">{title}</Heading>
          <Text size="sm" color="secondary">{desc}</Text>
        </div>
      {/each}
    </div>
  </div>

  <footer class="footer">
    <Text size="sm" color="tertiary">Built with SvelteKit, Prisma, and SQLite.</Text>
  </footer>
</div>

<style>
  .home {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .hero {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 50%, var(--flew-color-primary-bg) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 50%, var(--flew-color-primary-bg) 0%, transparent 50%);
    opacity: 0.5;
  }

  .features-section {
    padding: 40px 24px 60px;
    max-width: 960px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--flew-spacing-4);
  }

  .feature-card {
    display: flex;
    flex-direction: column;
    gap: var(--flew-spacing-2);
    padding: var(--flew-spacing-5);
    border: 1px solid var(--flew-color-border);
    border-radius: var(--flew-radius-lg);
    transition: box-shadow var(--flew-transition-fast), border-color var(--flew-transition-fast);
  }

  .feature-card:hover {
    border-color: var(--flew-color-primary);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  }

  .footer {
    margin-top: auto;
    padding: 24px;
    text-align: center;
    border-top: 1px solid var(--flew-color-border);
  }

  @media (max-width: 600px) {
    .hero {
      padding: 40px 16px;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
