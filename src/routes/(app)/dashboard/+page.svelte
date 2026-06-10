<script lang="ts">
  import { Card, Flex, Heading, Text, Chart } from "flewui";
  import { Upload, Download, Users, HardDrive, Image, FileText, Archive, Music, Video, TrendingUp } from "@lucide/svelte";

  let { data } = $props();

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  }

  const typeColors: Record<string, string> = {
    images: "#3b82f6",
    documents: "#22c55e",
    archives: "#f59e0b",
    audio: "#a855f7",
    video: "#ef4444",
    other: "#6b7280",
  };

  const typeLabels: Record<string, { label: string; icon: any }> = {
    images: { label: "Images", icon: Image },
    documents: { label: "Documents", icon: FileText },
    archives: { label: "Archives", icon: Archive },
    audio: { label: "Audio", icon: Music },
    video: { label: "Video", icon: Video },
    other: { label: "Other", icon: HardDrive },
  };

  let totalPct = $derived(data.breakdown.reduce((s: number, t: { size: number }) => s + t.size, 0));

  let typeChartData = $derived({
    labels: data.breakdown.map((t: { type: string }) => typeLabels[t.type]?.label ?? t.type),
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

  const chartOptions = {
    plugins: {
      legend: { display: true, position: "bottom" as const, labels: { boxWidth: 12, padding: 12 } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

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
</script>

<div class="dashboard-wrap">
  <Heading depth={1}>Dashboard</Heading>

  <div class="stat-grid">
    <Card variant="outlined" paddingSize="md">
      <Flex direction="vertical" gap="var(--flew-spacing-1)">
        <Flex align="center" gap="var(--flew-spacing-2)">
          <Upload size={16} />
          <Text size="xs" color="secondary">Total Files</Text>
        </Flex>
        <Text size="xl" weight="bold">{data.stats.totalFiles}</Text>
      </Flex>
    </Card>
    <Card variant="outlined" paddingSize="md">
      <Flex direction="vertical" gap="var(--flew-spacing-1)">
        <Flex align="center" gap="var(--flew-spacing-2)">
          <Download size={16} />
          <Text size="xs" color="secondary">Downloads</Text>
        </Flex>
        <Text size="xl" weight="bold">{data.stats.totalDownloads}</Text>
      </Flex>
    </Card>
    <Card variant="outlined" paddingSize="md">
      <Flex direction="vertical" gap="var(--flew-spacing-1)">
        <Flex align="center" gap="var(--flew-spacing-2)">
          <Users size={16} />
          <Text size="xs" color="secondary">Active Users</Text>
        </Flex>
        <Text size="xl" weight="bold">{data.stats.totalFiles > 0 ? 1 : 0}</Text>
      </Flex>
    </Card>
    <Card variant="outlined" paddingSize="md">
      <Flex direction="vertical" gap="var(--flew-spacing-1)">
        <Flex align="center" gap="var(--flew-spacing-2)">
          <HardDrive size={16} />
          <Text size="xs" color="secondary">Storage Used</Text>
        </Flex>
        <Text size="xl" weight="bold">{formatSize(data.stats.totalSize)}</Text>
      </Flex>
    </Card>
  </div>

  <div class="chart-grid">
    <Card variant="outlined" paddingSize="lg">
      <Heading depth={2}>Storage by Type</Heading>
      <Chart type="doughnut" data={typeChartData} options={doughnutOptions} height="280px" />
      <Flex direction="vertical" gap="var(--flew-spacing-2)" style="margin-top: var(--flew-spacing-3);">
        {#each data.breakdown as t}
          {@const info = typeLabels[t.type] ?? { label: t.type, icon: HardDrive }}
          {@const pct = totalPct > 0 ? (t.size / totalPct * 100) : 0}
          <Flex direction="vertical" gap="var(--flew-spacing-1)">
            <Flex align="center" gap="var(--flew-spacing-2)">
              <info.icon size={14} />
              <Text size="xs" style="flex: 1;">{info.label}</Text>
              <Text size="xs" color="tertiary">{t.count} file{t.count !== 1 ? "s" : ""}</Text>
              <Text size="xs" color="secondary">{pct.toFixed(0)}%</Text>
            </Flex>
            <div class="bar">
              <div class="bar-fill" style="width: {pct}%;"></div>
            </div>
          </Flex>
        {:else}
          <Text color="tertiary" style="padding: var(--flew-spacing-4) 0;" align="center">No data yet</Text>
        {/each}
      </Flex>
    </Card>

    <Card variant="outlined" paddingSize="lg">
      <Heading depth={2}>File Size Distribution</Heading>
      {#if data.sizeDist.some((s: { count: number }) => s.count > 0)}
        <Chart type="bar" data={sizeChartData} options={noLegendOptions} height="280px" />
      {:else}
        <Text color="tertiary" style="padding: var(--flew-spacing-8) 0;" align="center">No data yet</Text>
      {/if}
    </Card>
  </div>

  <div class="chart-grid">
    <Card variant="outlined" paddingSize="lg">
      <Flex align="center" gap="var(--flew-spacing-2)">
        <TrendingUp size={18} />
        <Heading depth={2} margin="none">Upload Activity (30 days)</Heading>
      </Flex>
      {#if data.recentUploads.some((d: { count: number }) => d.count > 0)}
        <Chart type="line" data={activityChartData} options={noLegendOptions} height="280px" />
      {:else}
        <Text color="tertiary" style="padding: var(--flew-spacing-8) 0;" align="center">No uploads yet</Text>
      {/if}
    </Card>

    <Card variant="outlined" paddingSize="lg">
      <Heading depth={2}>Top Downloads</Heading>
      {#if data.topDownloads.length > 0}
        <Chart type="bar" data={topDownloadsChartData} options={chartOptions} height="280px" />
      {:else}
        <Text color="tertiary" style="padding: var(--flew-spacing-8) 0;" align="center">No downloads yet</Text>
      {/if}
    </Card>
  </div>
</div>

<style>
  .dashboard-wrap {
    padding: var(--flew-spacing-6);
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--flew-spacing-6);
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--flew-spacing-4);
  }

  .chart-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--flew-spacing-4);
  }

  .bar {
    width: 100%;
    height: 6px;
    background: var(--flew-color-bg-active);
    border-radius: var(--flew-radius-full);
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: var(--flew-color-primary);
    border-radius: var(--flew-radius-full);
    transition: width 300ms ease;
  }

  @media (max-width: 768px) {
    .dashboard-wrap {
      padding: var(--flew-spacing-4);
    }

    .stat-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .chart-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .stat-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
