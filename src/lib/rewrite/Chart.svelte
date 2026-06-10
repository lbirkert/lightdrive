<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { mode } from "mode-watcher";
  import type { ChartConfiguration, ChartType } from "chart.js";

  type Props = {
    type: ChartType;
    data: ChartConfiguration["data"];
    options?: ChartConfiguration["options"];
    height?: string;
    style?: string;
  };

  let { type, data, options = {}, height = "250px", style = "" }: Props = $props();
  let canvas: HTMLCanvasElement;
  let chart: import("chart.js").Chart | null = $state(null);

  function resolveCSSVars(el: HTMLElement, val: unknown): unknown {
    if (typeof val === "string" && val.includes("var(--")) {
      return val.replace(/var\((--[\w-]+)\)/g, (_, name) =>
        getComputedStyle(el).getPropertyValue(name).trim() || val
      );
    }
    if (Array.isArray(val)) {
      return val.map(v => resolveCSSVars(el, v));
    }
    if (val && typeof val === "object") {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(val as Record<string, unknown>)) {
        result[key] = resolveCSSVars(el, (val as Record<string, unknown>)[key]);
      }
      return result;
    }
    return val;
  }

  function cloneData(d: ChartConfiguration["data"]): ChartConfiguration["data"] {
    const raw = JSON.parse(JSON.stringify(d));
    if (canvas) {
      return resolveCSSVars(canvas, raw) as ChartConfiguration["data"];
    }
    return raw;
  }

  onMount(() => {
    async function init() {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);
      if (!canvas) return;
      chart = new Chart(canvas, {
        type,
        data: cloneData(data),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
        },
      });
    }
    init();
    return () => {
      chart?.destroy();
      chart = null;
    };
  });

  $effect(() => {
    if (!chart) return;
    mode.current;
    chart.data = cloneData(data);
    chart.update("none");
  });

  $effect(() => {
    if (!chart) return;
    const m = mode.current;
    const isDark = m === "dark";
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    const tickColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
    const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";

    const baseOpts: Record<string, unknown> = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: tickColor },
          border: { color: borderColor },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor },
          border: { color: borderColor },
        },
      },
    };

    (chart.options as Record<string, unknown>) = { ...baseOpts, ...options };
    chart.update("none");
  });
</script>

<div style="position:relative;width:100%;height:{height};{style}">
  <canvas bind:this={canvas}></canvas>
</div>
