<script lang="ts">
  let { src, alt = "", class: className = "", onerror }: {
    src: string;
    alt?: string;
    class?: string;
    onerror?: () => void;
  } = $props();

  let visible = $state(false);
  let element: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          visible = true;
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  });
</script>

{#if visible}
  <img {src} {alt} class={className} loading="lazy" onerror={onerror} />
{:else}
  <div bind:this={element} class={className} role="presentation" aria-hidden="true"></div>
{/if}
