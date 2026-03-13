// ============================================================================
// Type definitions for disk monitoring data
// ============================================================================

export interface DiskMetric {
  timestamp: string;
  vmName: string;
  vmSku: string;
  vmFamily: string;
  diskName: string;
  diskType: string;
  diskTier: string;
  diskSizeGb: number;
  iopsRead: number;
  iopsWrite: number;
  iopsTotal: number;
  throughputReadMBs: number;
  throughputWriteMBs: number;
  throughputTotalMBs: number;
  latencyReadMs: number;
  latencyWriteMs: number;
  queueDepth: number;
  usedSpacePct: number;
  freeSpaceMb: number;
}

export interface VMSummary {
  vmName: string;
  vmSku: string;
  vmFamily: string;
  osType: string;
  diskCount: number;
  totalIops: number;
  avgLatencyMs: number;
  totalThroughputMBs: number;
}

export interface DiskInventoryItem {
  vmName: string;
  vmSku: string;
  resourceGroup: string;
  diskName: string;
  diskSizeGb: number;
  diskType: string;
  diskTier: string;
  avgIops: number;
  avgThroughputMBs: number;
  avgLatencyMs: number;
  avgQueueDepth: number;
  usedPct: number;
}

export interface OverviewStats {
  totalVMs: number;
  totalDisks: number;
  highIopsDisks: number;
  highLatencyDisks: number;
  diskTypeDistribution: { name: string; value: number }[];
  vmFamilyDistribution: { name: string; value: number }[];
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  series: string;
}

export interface ComparisonData {
  category: string;
  values: { name: string; value: number }[];
}
