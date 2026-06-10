<script lang="ts">
  import { Upload, Download, HardDrive, TrendingUp } from "@lucide/svelte";
  import Chart from "$lib/rewrite/Chart.svelte";

  let { data } = $props();

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  }

  const typeColors: Record<string, string> = {
    images: "#3b82f6", documents: "#22c55e", archives: "#f59e0b",
    audio: "#a855f7", video: "#ef4444", other: "#6b7280",
  };

  const typeLabels: Record<string, string> = {
    images: "Images", documents: "Documents", archives: "Archives",
    audio: "Audio", video: "Video", other: "Other",
  };

  let totalPct = $derived(data.breakdown.reduce((s: number, t: { size: number }) => s + t.size, 0));

  let typeChartData = $derived({
    labels: data.breakdown.map((t: { type: string }) => typeLabels[t.type] ?? t.type),
    datasets: [{
      data: data.breakdown.map((t: { size: number }) => t.size),
      backgroundColor: data.breakdown.map((t: { type: string }) => typeColors[t.type] ?? typeColors.other),
      borderWidth: 0,
    }],
  });

  let activityChartData = $derived({
    labels: data.recentUploads.map((d: { date: string }) => {
      const parts = d.date.split("-");
      return `${Number(parts[1])}/${Number(parts[2])}`;
    }),
    datasets: [{
      label: "Uploads",
      data: data.recentUploads.map((d: { count: number }) => d.count),
      borderColor: "var(--flew-color-primary)",
      backgroundColor: "var(--flew-color-primary-bg)",
      tension: 0.3,
      fill: true,
    }],
  });

  let sizeChartData = $derived({
    labels: data.sizeDist.map((s: { label: string }) => s.label),
    datasets: [{
      label: "Files",
      data: data.sizeDist.map((s: { count: number }) => s.count),
      backgroundColor: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"],
      borderRadius: 4,
    }],
  });

  let topDownloadsChartData = $derived({
    labels: data.topDownloads.map((f: { originalName: string }) => {
      const maxLen = 20;
      return f.originalName.length > maxLen ? f.originalName.slice(0, maxLen) + "..." : f.originalName;
    }),
    datasets: [{
      label: "Downloads",
      data: data.topDownloads.map((f: { downloads: number }) => f.downloads),
      backgroundColor: "var(--flew-color-primary)",
      borderRadius: 4,
    }],
  });

  const doughnutOptions = {
    plugins: {
      legend: { display: true, position: "bottom" as const, labels: { boxWidth: 12, padding: 12 } },
    },
    cutout: "60%",
  };

  const noLegendOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

  const barLegendOptions = {
    plugins: {
      legend: { display: true, position: "bottom" as const, labels: { boxWidth: 12, padding: 12 } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };
</script>

<div class="page page:md">
  <h1>Dashboard</h1>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-header">
        <Upload size={16} />
        <span>Uploads</span>
      </div>
      <div class="stat-value">{data.stats.totalFiles}</div>
    </div>
    <div class="stat-card">
      <div class="stat-header">
        <Download size={16} />
        <span>Downloads</span>
      </div>
      <div class="stat-value">{data.stats.totalDownloads}</div>
    </div>
    <div class="stat-card">
      <div class="stat-header">
        <HardDrive size={16} />
        <span>Storage Used</span>
      </div>
      <div class="stat-value">{formatSize(data.stats.totalSize)}</div>
    </div>
  </div>

  <div class="chart-grid">
    <div class="chart-card">
      <h2>Storage by Type</h2>
      {#if data.breakdown.length > 0}
        <Chart type="doughnut" data={typeChartData} options={doughnutOptions} height="280px" />
        <div class="breakdown-list">
          {#each data.breakdown as t}
            {@const pct = totalPct > 0 ? (t.size / totalPct * 100) : 0}
            <div class="breakdown-row">
              <div class="breakdown-info">
                <span>{typeLabels[t.type] ?? t.type}</span>
                <span>{t.count} file{t.count !== 1 ? "s" : ""}</span>
              </div>
              <div class="breakdown-bar">
                <div class="bar-fill" style="width:{pct}%"></div>
              </div>
              <span class="breakdown-pct">{pct.toFixed(0)}%</span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-chart">No data yet</div>
      {/if}
    </div>

    <div class="chart-card">
      <h2>File Size Distribution</h2>
      {#if data.sizeDist.some((s: { count: number }) => s.count > 0)}
        <Chart type="bar" data={sizeChartData} options={noLegendOptions} height="280px" />
      {:else}
        <div class="empty-chart">No data yet</div>
      {/if}
    </div>
  </div>

  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-title-row">
        <TrendingUp size={18} />
        <h2>Upload Activity (30 days)</h2>
      </div>
      {#if data.recentUploads.some((d: { count: number }) => d.count > 0)}
        <Chart type="line" data={activityChartData} options={noLegendOptions} height="280px" />
      {:else}
        <div class="empty-chart">No uploads yet</div>
      {/if}
    </div>

    <div class="chart-card">
      <h2>Top Downloads</h2>
      {#if data.topDownloads.length > 0}
        <Chart type="bar" data={topDownloadsChartData} options={barLegendOptions} height="280px" />
      {:else}
        <div class="empty-chart">No downloads yet</div>
      {/if}
    </div>
  </div>
</div>
