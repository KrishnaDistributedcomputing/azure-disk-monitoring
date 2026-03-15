// ============================================================================
// Extended mock data for the Single Pane of Glass Monitor page
// Provides VM-level and disk-level drill-down data
// ============================================================================

export interface VMHealthStatus {
  vmName: string;
  vmSku: string;
  vmFamily: string;
  osType: string;
  region: string;
  resourceGroup: string;
  powerState: 'Running' | 'Deallocated' | 'Stopped';
  diskCount: number;
  healthScore: number; // 0-100
  healthStatus: 'healthy' | 'warning' | 'critical';
  totalIops: number;
  maxIops: number;
  iopsConsumedPct: number;
  totalThroughputMBs: number;
  maxThroughputMBs: number;
  bwConsumedPct: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  avgQueueDepth: number;
  totalDiskSizeGb: number;
  totalUsedGb: number;
  capacityPct: number;
  monthlyCost: number;
  disks: DiskDetail[];
  tags: Record<string, string>;
}

export interface DiskDetail {
  diskName: string;
  diskType: string;
  diskTier: string;
  diskSizeGb: number;
  provisionedIops: number;
  provisionedThroughput: number;
  currentIops: number;
  currentThroughputMBs: number;
  iopsConsumedPct: number;
  bwConsumedPct: number;
  readLatencyMs: number;
  writeLatencyMs: number;
  avgLatencyMs: number;
  queueDepth: number;
  usedPct: number;
  usedGb: number;
  freeGb: number;
  healthScore: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  monthlyCost: number;
  lun: number;
  caching: string;
  burstCreditsRemaining: number;
}

export interface FleetSummary {
  totalVMs: number;
  runningVMs: number;
  totalDisks: number;
  healthyVMs: number;
  warningVMs: number;
  criticalVMs: number;
  totalProvisionedTb: number;
  totalUsedTb: number;
  avgIopsConsumedPct: number;
  avgBwConsumedPct: number;
  avgLatencyMs: number;
  totalMonthlyCost: number;
  diskMonthlyCost: number;
  vmMonthlyCost: number;
  regions: string[];
  vmFamilies: { name: string; count: number }[];
  diskTypes: { name: string; count: number }[];
  topIopsVMs: { vmName: string; iops: number }[];
  topLatencyDisks: { vmName: string; diskName: string; latencyMs: number }[];
  alertCount: number;
}

export interface TimeSeriesMetric {
  timestamp: string;
  iops: number;
  throughputMBs: number;
  latencyMs: number;
  queueDepth: number;
}

function jitter(base: number, pct: number = 0.2): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

const VM_FLEET: Omit<VMHealthStatus, 'disks' | 'healthScore' | 'healthStatus' | 'totalIops' | 'maxIops' | 'iopsConsumedPct' | 'totalThroughputMBs' | 'maxThroughputMBs' | 'bwConsumedPct' | 'avgLatencyMs' | 'maxLatencyMs' | 'avgQueueDepth' | 'totalDiskSizeGb' | 'totalUsedGb' | 'capacityPct' | 'monthlyCost'>[] = [
  { vmName: 'vm-diskmon-dsv5-01', vmSku: 'Standard_D4s_v5', vmFamily: 'D-series', osType: 'Linux', region: 'eastus2', resourceGroup: 'rg-diskmon-poc-eastus2', powerState: 'Deallocated', diskCount: 3, tags: { project: 'diskmon', environment: 'poc', 'vm-purpose': 'general-purpose-baseline' } },
  { vmName: 'vm-diskmon-dsv5-02', vmSku: 'Standard_D8s_v5', vmFamily: 'D-series', osType: 'Linux', region: 'eastus2', resourceGroup: 'rg-diskmon-poc-eastus2', powerState: 'Deallocated', diskCount: 3, tags: { project: 'diskmon', environment: 'poc', 'vm-purpose': 'general-purpose-scaleup' } },
  { vmName: 'vm-diskmon-esv5-01', vmSku: 'Standard_E4s_v5', vmFamily: 'E-series', osType: 'Linux', region: 'eastus2', resourceGroup: 'rg-diskmon-poc-eastus2', powerState: 'Deallocated', diskCount: 2, tags: { project: 'diskmon', environment: 'poc', 'vm-purpose': 'memory-optimized-comparison' } },
  { vmName: 'vm-diskmon-lsv3-01', vmSku: 'Standard_L8s_v3', vmFamily: 'L-series', osType: 'Linux', region: 'eastus2', resourceGroup: 'rg-diskmon-poc-eastus2', powerState: 'Deallocated', diskCount: 3, tags: { project: 'diskmon', environment: 'poc', 'vm-purpose': 'storage-optimized-comparison' } },
  { vmName: 'vm-diskmon-dsv5-03', vmSku: 'Standard_D4s_v5', vmFamily: 'D-series', osType: 'Windows', region: 'eastus2', resourceGroup: 'rg-diskmon-poc-eastus2', powerState: 'Deallocated', diskCount: 2, tags: { project: 'diskmon', environment: 'poc', 'vm-purpose': 'windows-diskspd-comparison' } },
];

const DISK_FLEET: Omit<DiskDetail, 'currentIops' | 'currentThroughputMBs' | 'iopsConsumedPct' | 'bwConsumedPct' | 'readLatencyMs' | 'writeLatencyMs' | 'avgLatencyMs' | 'queueDepth' | 'usedPct' | 'usedGb' | 'freeGb' | 'healthScore' | 'healthStatus' | 'burstCreditsRemaining'>[] = [
  // vm-diskmon-dsv5-01
  { diskName: 'osdisk-dsv5-01', diskType: 'Premium SSD', diskTier: 'P10', diskSizeGb: 128, provisionedIops: 500, provisionedThroughput: 100, monthlyCost: 9.86, lun: -1, caching: 'ReadWrite' },
  { diskName: 'disk-dsv5-01-premssd-256', diskType: 'Premium SSD', diskTier: 'P15', diskSizeGb: 256, provisionedIops: 1100, provisionedThroughput: 125, monthlyCost: 19.71, lun: 0, caching: 'ReadOnly' },
  { diskName: 'disk-dsv5-01-stdssd-256', diskType: 'Standard SSD', diskTier: 'E15', diskSizeGb: 256, provisionedIops: 500, provisionedThroughput: 60, monthlyCost: 15.36, lun: 1, caching: 'None' },
  // vm-diskmon-dsv5-02
  { diskName: 'osdisk-dsv5-02', diskType: 'Premium SSD', diskTier: 'P10', diskSizeGb: 128, provisionedIops: 500, provisionedThroughput: 100, monthlyCost: 9.86, lun: -1, caching: 'ReadWrite' },
  { diskName: 'disk-dsv5-02-premssd-512', diskType: 'Premium SSD', diskTier: 'P20', diskSizeGb: 512, provisionedIops: 2300, provisionedThroughput: 150, monthlyCost: 38.41, lun: 0, caching: 'ReadOnly' },
  { diskName: 'disk-dsv5-02-stdhdd-512', diskType: 'Standard HDD', diskTier: 'S20', diskSizeGb: 512, provisionedIops: 500, provisionedThroughput: 60, monthlyCost: 10.24, lun: 1, caching: 'None' },
  // vm-diskmon-esv5-01
  { diskName: 'osdisk-esv5-01', diskType: 'Premium SSD', diskTier: 'P10', diskSizeGb: 128, provisionedIops: 500, provisionedThroughput: 100, monthlyCost: 9.86, lun: -1, caching: 'ReadWrite' },
  { diskName: 'disk-esv5-01-premssdv2-256', diskType: 'Premium SSD v2', diskTier: 'Custom', diskSizeGb: 256, provisionedIops: 5000, provisionedThroughput: 200, monthlyCost: 44.04, lun: 0, caching: 'None' },
  // vm-diskmon-lsv3-01
  { diskName: 'osdisk-lsv3-01', diskType: 'Premium SSD', diskTier: 'P10', diskSizeGb: 128, provisionedIops: 500, provisionedThroughput: 100, monthlyCost: 9.86, lun: -1, caching: 'ReadWrite' },
  { diskName: 'disk-lsv3-01-ultra-256', diskType: 'Ultra Disk', diskTier: 'Custom', diskSizeGb: 256, provisionedIops: 10000, provisionedThroughput: 400, monthlyCost: 91.07, lun: 0, caching: 'None' },
  { diskName: 'disk-lsv3-01-premssd-256', diskType: 'Premium SSD', diskTier: 'P15', diskSizeGb: 256, provisionedIops: 1100, provisionedThroughput: 125, monthlyCost: 19.71, lun: 1, caching: 'ReadOnly' },
  // vm-diskmon-dsv5-03 (Windows)
  { diskName: 'osdisk-dsv5-03', diskType: 'Premium SSD', diskTier: 'P10', diskSizeGb: 128, provisionedIops: 500, provisionedThroughput: 100, monthlyCost: 9.86, lun: -1, caching: 'ReadWrite' },
  { diskName: 'disk-dsv5-03-premssd-256', diskType: 'Premium SSD', diskTier: 'P15', diskSizeGb: 256, provisionedIops: 1100, provisionedThroughput: 125, monthlyCost: 19.71, lun: 0, caching: 'ReadOnly' },
];

const VM_DISK_MAP: Record<string, string[]> = {
  'vm-diskmon-dsv5-01': ['osdisk-dsv5-01', 'disk-dsv5-01-premssd-256', 'disk-dsv5-01-stdssd-256'],
  'vm-diskmon-dsv5-02': ['osdisk-dsv5-02', 'disk-dsv5-02-premssd-512', 'disk-dsv5-02-stdhdd-512'],
  'vm-diskmon-esv5-01': ['osdisk-esv5-01', 'disk-esv5-01-premssdv2-256'],
  'vm-diskmon-lsv3-01': ['osdisk-lsv3-01', 'disk-lsv3-01-ultra-256', 'disk-lsv3-01-premssd-256'],
  'vm-diskmon-dsv5-03': ['osdisk-dsv5-03', 'disk-dsv5-03-premssd-256'],
};

const VM_MAX_IOPS: Record<string, number> = {
  'Standard_D4s_v5': 6400, 'Standard_D8s_v5': 12800, 'Standard_E4s_v5': 6400, 'Standard_L8s_v3': 400000,
};
const VM_MAX_THROUGHPUT: Record<string, number> = {
  'Standard_D4s_v5': 200, 'Standard_D8s_v5': 400, 'Standard_E4s_v5': 200, 'Standard_L8s_v3': 2000,
};
const VM_HOURLY_COST: Record<string, number> = {
  'Standard_D4s_v5': 0.192, 'Standard_D8s_v5': 0.384, 'Standard_E4s_v5': 0.252, 'Standard_L8s_v3': 0.624,
};

function computeDiskMetrics(disk: typeof DISK_FLEET[0], inBenchmark: boolean): DiskDetail {
  const mult = inBenchmark ? 0.78 : 0.25;
  const latMult = inBenchmark ? 1.4 : 1.0;
  const baseLatency = disk.diskType === 'Ultra Disk' ? 0.3 : disk.diskType === 'Premium SSD v2' ? 1.2 : disk.diskType === 'Premium SSD' ? 2.1 : disk.diskType === 'Standard SSD' ? 5.5 : 12.4;
  const currentIops = Math.round(jitter(disk.provisionedIops * mult, 0.15));
  const currentThroughput = Math.round(jitter(disk.provisionedThroughput * mult, 0.15) * 10) / 10;
  const readLat = Math.round(jitter(baseLatency * latMult * 0.9, 0.2) * 100) / 100;
  const writeLat = Math.round(jitter(baseLatency * latMult * 1.1, 0.2) * 100) / 100;
  const usedPct = Math.round(jitter(disk.lun === -1 ? 45 : 30, 0.3));
  const usedGb = Math.round(disk.diskSizeGb * usedPct / 100);
  const iopsConsPct = Math.round((currentIops / disk.provisionedIops) * 100);
  const bwConsPct = Math.round((currentThroughput / disk.provisionedThroughput) * 100);
  const qd = inBenchmark ? Math.round(jitter(18, 0.4) * 10) / 10 : Math.round(jitter(2, 0.5) * 10) / 10;

  let healthScore = 100;
  if (iopsConsPct > 90) healthScore -= 30;
  else if (iopsConsPct > 70) healthScore -= 10;
  if ((readLat + writeLat) / 2 > 10) healthScore -= 25;
  else if ((readLat + writeLat) / 2 > 5) healthScore -= 10;
  if (usedPct > 85) healthScore -= 20;
  if (qd > 32) healthScore -= 15;

  return {
    ...disk,
    currentIops,
    currentThroughputMBs: currentThroughput,
    iopsConsumedPct: iopsConsPct,
    bwConsumedPct: bwConsPct,
    readLatencyMs: readLat,
    writeLatencyMs: writeLat,
    avgLatencyMs: Math.round(((readLat + writeLat) / 2) * 100) / 100,
    queueDepth: qd,
    usedPct,
    usedGb,
    freeGb: disk.diskSizeGb - usedGb,
    healthScore: Math.max(0, healthScore),
    healthStatus: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical',
    burstCreditsRemaining: disk.diskType.includes('Premium') || disk.diskType === 'Standard SSD' ? Math.round(jitter(75, 0.3)) : 0,
  };
}

export function generateVMFleet(inBenchmark: boolean = false): VMHealthStatus[] {
  return VM_FLEET.map((vm) => {
    const diskNames = VM_DISK_MAP[vm.vmName] || [];
    const disks = diskNames.map((dn) => {
      const diskCfg = DISK_FLEET.find((d) => d.diskName === dn)!;
      return computeDiskMetrics(diskCfg, inBenchmark);
    });

    const totalIops = disks.reduce((s, d) => s + d.currentIops, 0);
    const maxIops = VM_MAX_IOPS[vm.vmSku] || 6400;
    const totalThroughput = disks.reduce((s, d) => s + d.currentThroughputMBs, 0);
    const maxThroughput = VM_MAX_THROUGHPUT[vm.vmSku] || 200;
    const avgLat = disks.length ? disks.reduce((s, d) => s + d.avgLatencyMs, 0) / disks.length : 0;
    const maxLat = disks.length ? Math.max(...disks.map((d) => d.avgLatencyMs)) : 0;
    const avgQd = disks.length ? disks.reduce((s, d) => s + d.queueDepth, 0) / disks.length : 0;
    const totalSize = disks.reduce((s, d) => s + d.diskSizeGb, 0);
    const totalUsed = disks.reduce((s, d) => s + d.usedGb, 0);
    const diskCost = disks.reduce((s, d) => s + d.monthlyCost, 0);
    const vmCost = vm.powerState === 'Running' ? (VM_HOURLY_COST[vm.vmSku] || 0.192) * 730 : 0;

    let healthScore = 100;
    const iopsConsPct = Math.round((totalIops / maxIops) * 100);
    const bwConsPct = Math.round((totalThroughput / maxThroughput) * 100);
    if (iopsConsPct > 85) healthScore -= 25;
    if (avgLat > 8) healthScore -= 20;
    if (disks.some((d) => d.usedPct > 85)) healthScore -= 15;
    if (disks.some((d) => d.healthStatus === 'critical')) healthScore -= 20;

    return {
      ...vm,
      disks,
      totalIops,
      maxIops,
      iopsConsumedPct: iopsConsPct,
      totalThroughputMBs: Math.round(totalThroughput * 10) / 10,
      maxThroughputMBs: maxThroughput,
      bwConsumedPct: bwConsPct,
      avgLatencyMs: Math.round(avgLat * 100) / 100,
      maxLatencyMs: Math.round(maxLat * 100) / 100,
      avgQueueDepth: Math.round(avgQd * 10) / 10,
      totalDiskSizeGb: totalSize,
      totalUsedGb: totalUsed,
      capacityPct: Math.round((totalUsed / totalSize) * 100),
      healthScore: Math.max(0, healthScore),
      healthStatus: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical',
      monthlyCost: Math.round((diskCost + vmCost) * 100) / 100,
    };
  });
}

export function generateFleetSummary(fleet: VMHealthStatus[]): FleetSummary {
  const allDisks = fleet.flatMap((v) => v.disks);
  const diskTypeCounts: Record<string, number> = {};
  allDisks.forEach((d) => { diskTypeCounts[d.diskType] = (diskTypeCounts[d.diskType] || 0) + 1; });
  const vmFamilyCounts: Record<string, number> = {};
  fleet.forEach((v) => { vmFamilyCounts[v.vmFamily] = (vmFamilyCounts[v.vmFamily] || 0) + 1; });

  return {
    totalVMs: fleet.length,
    runningVMs: fleet.filter((v) => v.powerState === 'Running').length,
    totalDisks: allDisks.length,
    healthyVMs: fleet.filter((v) => v.healthStatus === 'healthy').length,
    warningVMs: fleet.filter((v) => v.healthStatus === 'warning').length,
    criticalVMs: fleet.filter((v) => v.healthStatus === 'critical').length,
    totalProvisionedTb: Math.round(fleet.reduce((s, v) => s + v.totalDiskSizeGb, 0) / 1024 * 100) / 100,
    totalUsedTb: Math.round(fleet.reduce((s, v) => s + v.totalUsedGb, 0) / 1024 * 100) / 100,
    avgIopsConsumedPct: Math.round(fleet.reduce((s, v) => s + v.iopsConsumedPct, 0) / fleet.length),
    avgBwConsumedPct: Math.round(fleet.reduce((s, v) => s + v.bwConsumedPct, 0) / fleet.length),
    avgLatencyMs: Math.round(fleet.reduce((s, v) => s + v.avgLatencyMs, 0) / fleet.length * 100) / 100,
    totalMonthlyCost: Math.round(fleet.reduce((s, v) => s + v.monthlyCost, 0) * 100) / 100,
    diskMonthlyCost: Math.round(fleet.reduce((s, v) => s + v.disks.reduce((ds, d) => ds + d.monthlyCost, 0), 0) * 100) / 100,
    vmMonthlyCost: Math.round(fleet.reduce((s, v) => s + v.monthlyCost - v.disks.reduce((ds, d) => ds + d.monthlyCost, 0), 0) * 100) / 100,
    regions: [...new Set(fleet.map((v) => v.region))],
    vmFamilies: Object.entries(vmFamilyCounts).map(([name, count]) => ({ name, count })),
    diskTypes: Object.entries(diskTypeCounts).map(([name, count]) => ({ name, count })),
    topIopsVMs: [...fleet].sort((a, b) => b.totalIops - a.totalIops).slice(0, 3).map((v) => ({ vmName: v.vmName, iops: v.totalIops })),
    topLatencyDisks: allDisks.sort((a, b) => b.avgLatencyMs - a.avgLatencyMs).slice(0, 3).map((d) => {
      const vm = fleet.find((v) => v.disks.includes(d))!;
      return { vmName: vm.vmName, diskName: d.diskName, latencyMs: d.avgLatencyMs };
    }),
    alertCount: fleet.filter((v) => v.healthStatus !== 'healthy').length + allDisks.filter((d) => d.healthStatus !== 'healthy').length,
  };
}

export function generateDiskTimeSeries(diskName: string, hours: number = 1): TimeSeriesMetric[] {
  const diskCfg = DISK_FLEET.find((d) => d.diskName === diskName);
  if (!diskCfg) return [];
  const baseLatency = diskCfg.diskType === 'Ultra Disk' ? 0.3 : diskCfg.diskType === 'Premium SSD v2' ? 1.2 : diskCfg.diskType === 'Premium SSD' ? 2.1 : diskCfg.diskType === 'Standard SSD' ? 5.5 : 12.4;
  const points: TimeSeriesMetric[] = [];
  const now = Date.now();
  const total = Math.min(hours * 60, 1440);
  for (let i = 0; i < total; i++) {
    const inBench = i > total * 0.33 && i < total * 0.66;
    const mult = inBench ? 0.8 : 0.25;
    const latMult = inBench ? 1.5 : 1.0;
    points.push({
      timestamp: new Date(now - (total - i) * 60_000).toISOString(),
      iops: Math.round(jitter(diskCfg.provisionedIops * mult, 0.15)),
      throughputMBs: Math.round(jitter(diskCfg.provisionedThroughput * mult, 0.15) * 10) / 10,
      latencyMs: Math.round(jitter(baseLatency * latMult, 0.2) * 100) / 100,
      queueDepth: Math.round(jitter(inBench ? 16 : 2, 0.4) * 10) / 10,
    });
  }
  return points;
}
