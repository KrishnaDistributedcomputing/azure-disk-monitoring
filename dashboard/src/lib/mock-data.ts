// ============================================================================
// Mock data generator for demonstration when Log Analytics is unavailable
// This simulates realistic disk monitoring data for the POC dashboard
// ============================================================================

import {
  DiskMetric,
  DiskInventoryItem,
  OverviewStats,
  TimeSeriesPoint,
} from '@/types';

const VM_CONFIGS = [
  { vmName: 'vm-diskmon-dsv5-01', vmSku: 'Standard_D4s_v5', vmFamily: 'D-series', osType: 'Linux' },
  { vmName: 'vm-diskmon-dsv5-02', vmSku: 'Standard_D8s_v5', vmFamily: 'D-series', osType: 'Linux' },
  { vmName: 'vm-diskmon-esv5-01', vmSku: 'Standard_E4s_v5', vmFamily: 'E-series', osType: 'Linux' },
  { vmName: 'vm-diskmon-lsv3-01', vmSku: 'Standard_L8s_v3', vmFamily: 'L-series', osType: 'Linux' },
  { vmName: 'vm-diskmon-dsv5-03', vmSku: 'Standard_D4s_v5', vmFamily: 'D-series', osType: 'Windows' },
];

const DISK_CONFIGS = [
  { vmName: 'vm-diskmon-dsv5-01', diskName: 'disk-dsv5-01-premssd-256', diskType: 'Premium SSD', diskTier: 'P15', diskSizeGb: 256, baseIops: 1100, baseThroughput: 125, baseLatency: 2.1 },
  { vmName: 'vm-diskmon-dsv5-01', diskName: 'disk-dsv5-01-stdssd-256', diskType: 'Standard SSD', diskTier: 'E15', diskSizeGb: 256, baseIops: 500, baseThroughput: 60, baseLatency: 5.5 },
  { vmName: 'vm-diskmon-dsv5-02', diskName: 'disk-dsv5-02-premssd-512', diskType: 'Premium SSD', diskTier: 'P20', diskSizeGb: 512, baseIops: 2300, baseThroughput: 150, baseLatency: 1.8 },
  { vmName: 'vm-diskmon-dsv5-02', diskName: 'disk-dsv5-02-stdhdd-512', diskType: 'Standard HDD', diskTier: 'S20', diskSizeGb: 512, baseIops: 500, baseThroughput: 60, baseLatency: 12.4 },
  { vmName: 'vm-diskmon-esv5-01', diskName: 'disk-esv5-01-premssdv2-256', diskType: 'Premium SSD v2', diskTier: 'Custom', diskSizeGb: 256, baseIops: 5000, baseThroughput: 200, baseLatency: 1.2 },
  { vmName: 'vm-diskmon-lsv3-01', diskName: 'disk-lsv3-01-ultra-256', diskType: 'Ultra Disk', diskTier: 'Custom', diskSizeGb: 256, baseIops: 10000, baseThroughput: 400, baseLatency: 0.3 },
  { vmName: 'vm-diskmon-lsv3-01', diskName: 'disk-lsv3-01-premssd-256', diskType: 'Premium SSD', diskTier: 'P15', diskSizeGb: 256, baseIops: 1100, baseThroughput: 125, baseLatency: 2.0 },
  { vmName: 'vm-diskmon-dsv5-03', diskName: 'disk-dsv5-03-premssd-256', diskType: 'Premium SSD', diskTier: 'P15', diskSizeGb: 256, baseIops: 1100, baseThroughput: 125, baseLatency: 2.3 },
];

function jitter(base: number, pct: number = 0.2): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

export function generateOverviewStats(): OverviewStats {
  const diskTypeCounts: Record<string, number> = {};
  const vmFamilyCounts: Record<string, number> = {};

  DISK_CONFIGS.forEach((d) => {
    diskTypeCounts[d.diskType] = (diskTypeCounts[d.diskType] || 0) + 1;
  });

  VM_CONFIGS.forEach((v) => {
    vmFamilyCounts[v.vmFamily] = (vmFamilyCounts[v.vmFamily] || 0) + 1;
  });

  return {
    totalVMs: VM_CONFIGS.length,
    totalDisks: DISK_CONFIGS.length,
    highIopsDisks: DISK_CONFIGS.filter((d) => d.baseIops > 2000).length,
    highLatencyDisks: DISK_CONFIGS.filter((d) => d.baseLatency > 5).length,
    diskTypeDistribution: Object.entries(diskTypeCounts).map(([name, value]) => ({ name, value })),
    vmFamilyDistribution: Object.entries(vmFamilyCounts).map(([name, value]) => ({ name, value })),
  };
}

export function generateDiskInventory(): DiskInventoryItem[] {
  return DISK_CONFIGS.map((disk) => {
    const vm = VM_CONFIGS.find((v) => v.vmName === disk.vmName)!;
    return {
      vmName: disk.vmName,
      vmSku: vm.vmSku,
      resourceGroup: 'rg-diskmon-poc-eastus2',
      diskName: disk.diskName,
      diskSizeGb: disk.diskSizeGb,
      diskType: disk.diskType,
      diskTier: disk.diskTier,
      avgIops: Math.round(jitter(disk.baseIops * 0.6)),
      avgThroughputMBs: Math.round(jitter(disk.baseThroughput * 0.5) * 10) / 10,
      avgLatencyMs: Math.round(jitter(disk.baseLatency) * 100) / 100,
      avgQueueDepth: Math.round(jitter(4, 0.5) * 10) / 10,
      usedPct: Math.round(jitter(35, 0.4)),
    };
  });
}

export function generateIopsTimeSeries(hours: number = 1): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = Date.now();
  const intervalMs = 60_000; // 1 minute
  const totalPoints = (hours * 60);

  DISK_CONFIGS.forEach((disk) => {
    for (let i = 0; i < totalPoints; i++) {
      const ts = new Date(now - (totalPoints - i) * intervalMs).toISOString();
      // Simulate a benchmark spike in the middle third
      const inBenchmark = i > totalPoints * 0.33 && i < totalPoints * 0.66;
      const multiplier = inBenchmark ? 0.85 : 0.3;
      points.push({
        timestamp: ts,
        value: Math.round(jitter(disk.baseIops * multiplier, 0.15)),
        series: `${disk.vmName}/${disk.diskName}`,
      });
    }
  });

  return points;
}

export function generateThroughputTimeSeries(hours: number = 1): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = Date.now();
  const intervalMs = 60_000;
  const totalPoints = hours * 60;

  DISK_CONFIGS.forEach((disk) => {
    for (let i = 0; i < totalPoints; i++) {
      const ts = new Date(now - (totalPoints - i) * intervalMs).toISOString();
      const inBenchmark = i > totalPoints * 0.33 && i < totalPoints * 0.66;
      const multiplier = inBenchmark ? 0.75 : 0.25;
      points.push({
        timestamp: ts,
        value: Math.round(jitter(disk.baseThroughput * multiplier, 0.15) * 10) / 10,
        series: `${disk.vmName}/${disk.diskName}`,
      });
    }
  });

  return points;
}

export function generateLatencyTimeSeries(hours: number = 1): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = Date.now();
  const intervalMs = 60_000;
  const totalPoints = hours * 60;

  DISK_CONFIGS.forEach((disk) => {
    for (let i = 0; i < totalPoints; i++) {
      const ts = new Date(now - (totalPoints - i) * intervalMs).toISOString();
      const inBenchmark = i > totalPoints * 0.33 && i < totalPoints * 0.66;
      const multiplier = inBenchmark ? 1.5 : 1.0;
      points.push({
        timestamp: ts,
        value: Math.round(jitter(disk.baseLatency * multiplier, 0.2) * 100) / 100,
        series: `${disk.vmName}/${disk.diskName}`,
      });
    }
  });

  return points;
}

export function generateQueueDepthTimeSeries(hours: number = 1): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = Date.now();
  const intervalMs = 60_000;
  const totalPoints = hours * 60;

  DISK_CONFIGS.forEach((disk) => {
    for (let i = 0; i < totalPoints; i++) {
      const ts = new Date(now - (totalPoints - i) * intervalMs).toISOString();
      const inBenchmark = i > totalPoints * 0.33 && i < totalPoints * 0.66;
      const baseQd = inBenchmark ? 24 : 2;
      points.push({
        timestamp: ts,
        value: Math.round(jitter(baseQd, 0.3) * 10) / 10,
        series: `${disk.vmName}/${disk.diskName}`,
      });
    }
  });

  return points;
}

export function generateDiskTypeComparison(): { diskType: string; avgIops: number; avgThroughputMBs: number; avgLatencyMs: number }[] {
  const grouped: Record<string, { iops: number[]; throughput: number[]; latency: number[] }> = {};

  DISK_CONFIGS.forEach((d) => {
    if (!grouped[d.diskType]) {
      grouped[d.diskType] = { iops: [], throughput: [], latency: [] };
    }
    grouped[d.diskType].iops.push(jitter(d.baseIops * 0.7));
    grouped[d.diskType].throughput.push(jitter(d.baseThroughput * 0.6));
    grouped[d.diskType].latency.push(jitter(d.baseLatency));
  });

  return Object.entries(grouped).map(([diskType, data]) => ({
    diskType,
    avgIops: Math.round(data.iops.reduce((a, b) => a + b, 0) / data.iops.length),
    avgThroughputMBs: Math.round((data.throughput.reduce((a, b) => a + b, 0) / data.throughput.length) * 10) / 10,
    avgLatencyMs: Math.round((data.latency.reduce((a, b) => a + b, 0) / data.latency.length) * 100) / 100,
  }));
}

export function generateVmFamilyComparison(): { vmFamily: string; vmSku: string; avgIops: number; maxIops: number; avgLatencyMs: number; avgThroughputMBs: number }[] {
  return VM_CONFIGS.map((vm) => {
    const disks = DISK_CONFIGS.filter((d) => d.vmName === vm.vmName);
    const totalBaseIops = disks.reduce((sum, d) => sum + d.baseIops, 0);
    const avgBaseLatency = disks.reduce((sum, d) => sum + d.baseLatency, 0) / (disks.length || 1);
    const totalBaseThroughput = disks.reduce((sum, d) => sum + d.baseThroughput, 0);

    return {
      vmFamily: vm.vmFamily,
      vmSku: vm.vmSku,
      avgIops: Math.round(jitter(totalBaseIops * 0.6)),
      maxIops: Math.round(jitter(totalBaseIops * 0.9)),
      avgLatencyMs: Math.round(jitter(avgBaseLatency) * 100) / 100,
      avgThroughputMBs: Math.round(jitter(totalBaseThroughput * 0.55) * 10) / 10,
    };
  });
}

export function generateLatencyPercentiles(): { vmName: string; diskName: string; diskType: string; p50: number; p95: number; p99: number }[] {
  return DISK_CONFIGS.map((disk) => ({
    vmName: disk.vmName,
    diskName: disk.diskName,
    diskType: disk.diskType,
    p50: Math.round(disk.baseLatency * 0.8 * 100) / 100,
    p95: Math.round(disk.baseLatency * 1.8 * 100) / 100,
    p99: Math.round(disk.baseLatency * 3.2 * 100) / 100,
  }));
}
