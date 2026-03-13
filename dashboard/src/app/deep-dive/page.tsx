'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

// ============================================================================
// KQL Query Library — Complete catalog
// ============================================================================
const KQL_QUERIES = [
  { id: 'Q-01', title: 'Disk Inventory', category: 'Inventory', tables: 'Perf, Heartbeat', description: 'Lists all VMs with their attached disk instances currently reporting metrics. Joins Heartbeat for OS type and resource group.', kql: `Perf\n| where TimeGenerated > ago(1h)\n| where ObjectName in ("Logical Disk", "LogicalDisk")\n| where CounterName == "Disk Transfers/sec"\n| where InstanceName !in ("_Total", "/", "C:")\n| summarize LastSeen = max(TimeGenerated) by Computer, InstanceName\n| join kind=leftouter (\n    Heartbeat | where TimeGenerated > ago(1h)\n    | summarize arg_max(TimeGenerated, *) by Computer\n    | project Computer, OSType, ResourceGroup\n) on Computer\n| project Computer, OSType, ResourceGroup, DiskInstance=InstanceName, LastSeen\n| order by Computer asc, DiskInstance asc`, dashboard: 'Overview → Disk Inventory table' },
  { id: 'Q-02', title: 'IOPS by VM and Disk', category: 'Performance', tables: 'Perf', description: 'Shows average and maximum IOPS for each VM-disk combination. Essential for right-sizing disk tiers.', kql: `let timeRange = 1h;\nPerf\n| where TimeGenerated > ago(timeRange)\n| where ObjectName in ("Logical Disk", "LogicalDisk")\n| where CounterName == "Disk Transfers/sec"\n| where InstanceName !in ("_Total", "/")\n| summarize AvgIOPS=avg(CounterValue), MaxIOPS=max(CounterValue)\n    by Computer, InstanceName\n| order by AvgIOPS desc`, dashboard: 'IOPS tab → VM comparison chart' },
  { id: 'Q-03', title: 'Throughput by VM and Disk', category: 'Performance', tables: 'Perf', description: 'Calculates read+write throughput in MB/s. Divides raw bytes by 1,048,576 for human-readable output.', kql: `let timeRange = 1h;\nPerf\n| where TimeGenerated > ago(timeRange)\n| where ObjectName in ("Logical Disk", "LogicalDisk")\n| where CounterName == "Disk Bytes/sec"\n| where InstanceName !in ("_Total", "/")\n| summarize AvgThroughputMBs=avg(CounterValue)/1048576,\n            MaxThroughputMBs=max(CounterValue)/1048576\n    by Computer, InstanceName\n| order by AvgThroughputMBs desc`, dashboard: 'Throughput tab → time series' },
  { id: 'Q-04', title: 'Read/Write Latency', category: 'Performance', tables: 'Perf', description: 'Separates read and write latency using pivot(). Multiplies seconds by 1000 for millisecond display.', kql: `let timeRange = 1h;\nPerf\n| where TimeGenerated > ago(timeRange)\n| where ObjectName in ("Logical Disk", "LogicalDisk")\n| where CounterName in ("Avg. Disk sec/Read", "Avg. Disk sec/Write")\n| where InstanceName !in ("_Total", "/")\n| summarize AvgLatencyMs=avg(CounterValue)*1000\n    by Computer, InstanceName, CounterName\n| evaluate pivot(CounterName, take_any(AvgLatencyMs))`, dashboard: 'Latency tab → split read/write' },
  { id: 'Q-05', title: 'Queue Depth Over Time', category: 'Saturation', tables: 'Perf', description: 'Time-binned queue depth at 1-minute intervals. Shows when disks are under pressure.', kql: `let timeRange = 1h;\nPerf\n| where TimeGenerated > ago(timeRange)\n| where ObjectName in ("Logical Disk", "LogicalDisk")\n| where CounterName == "Current Disk Queue Length"\n| where InstanceName !in ("_Total", "/")\n| summarize AvgQueueDepth=avg(CounterValue)\n    by bin(TimeGenerated, 1m), Computer, InstanceName\n| order by TimeGenerated asc`, dashboard: 'Queue Depth tab → time series' },
  { id: 'Q-06', title: 'Top 10 Disks by IOPS', category: 'Rankings', tables: 'Perf', description: 'Finds the 10 busiest disks by average IOPS. Useful for identifying hotspots.', kql: `let timeRange = 1h;\nPerf\n| where TimeGenerated > ago(timeRange)\n| where ObjectName in ("Logical Disk", "LogicalDisk")\n| where CounterName == "Disk Transfers/sec"\n| where InstanceName !in ("_Total", "/")\n| summarize AvgIOPS=avg(CounterValue) by Computer, InstanceName\n| top 10 by AvgIOPS desc`, dashboard: 'IOPS tab → Top N bar chart' },
  { id: 'Q-07', title: 'Top 10 Disks by Latency', category: 'Rankings', tables: 'Perf', description: 'Identifies the 10 highest-latency disks. These are the first candidates for tier upgrade.', kql: `let timeRange = 1h;\nPerf\n| where TimeGenerated > ago(timeRange)\n| where ObjectName in ("Logical Disk", "LogicalDisk")\n| where CounterName in ("Avg. Disk sec/Read", "Avg. Disk sec/Write")\n| where InstanceName !in ("_Total", "/")\n| summarize AvgLatencyMs=avg(CounterValue)*1000\n    by Computer, InstanceName\n| top 10 by AvgLatencyMs desc`, dashboard: 'Latency tab → Top latency list' },
  { id: 'Q-08', title: 'Capacity Utilization', category: 'Capacity', tables: 'Perf', description: 'Shows disk space usage percentage per disk. Critical for capacity planning alerts.', kql: `let timeRange = 1h;\nPerf\n| where TimeGenerated > ago(timeRange)\n| where ObjectName in ("Logical Disk", "LogicalDisk")\n| where CounterName == "% Used Space"\n| where InstanceName !in ("_Total", "/")\n| summarize AvgUsedPct=avg(CounterValue)\n    by Computer, InstanceName\n| order by AvgUsedPct desc`, dashboard: 'Capacity tab → gauge cards' },
  { id: 'Q-09', title: 'VM Family Comparison', category: 'Comparison', tables: 'Perf, Heartbeat', description: 'Groups IOPS by VM family (D/E/L-series) using a static lookup table. Shows which VM families deliver the most disk performance.', kql: `let VMSkuLookup = datatable(Computer:string, VMSku:string, VMFamily:string) [\n    "vm-diskmon-dsv5-01","Standard_D4s_v5","D-series",\n    "vm-diskmon-dsv5-02","Standard_D8s_v5","D-series",\n    "vm-diskmon-esv5-01","Standard_E4s_v5","E-series",\n    "vm-diskmon-lsv3-01","Standard_L8s_v3","L-series"\n];\nPerf | where CounterName == "Disk Transfers/sec"\n| summarize AvgIOPS=avg(CounterValue) by Computer\n| join kind=inner VMSkuLookup on Computer\n| project VMFamily, VMSku, AvgIOPS`, dashboard: 'Comparison tab → VM family chart' },
  { id: 'Q-10', title: 'Disk Type Comparison', category: 'Comparison', tables: 'Perf, DiskBenchmark_CL', description: 'Joins benchmark metadata to correlate IOPS with disk type labels. Enables Premium SSD vs Ultra vs Standard comparisons.', kql: `DiskBenchmark_CL\n| where Status_s == "completed"\n| distinct VMName_s, DiskName_s, DiskType_s\n| join kind=inner (\n    Perf | where CounterName == "Disk Transfers/sec"\n    | summarize AvgIOPS=avg(CounterValue) by Computer\n) on $left.VMName_s == $right.Computer\n| summarize AvgIOPS=avg(AvgIOPS) by DiskType_s`, dashboard: 'Comparison tab → disk type chart' },
  { id: 'Q-11', title: 'IOPS Consumed %', category: 'Platform', tables: 'AzureMetrics', description: 'Queries platform-level IOPS consumed percentage. Shows how close disks and VMs are to their provisioned IOPS ceiling.', kql: `AzureMetrics\n| where TimeGenerated > ago(1h)\n| where MetricName in (\n    "Data Disk IOPS Consumed Percentage",\n    "VM Uncached IOPS Consumed Percentage"\n)\n| summarize AvgConsumedPct=avg(Average)\n    by bin(TimeGenerated, 5m), Resource, MetricName`, dashboard: 'Monitor → disk gauges' },
  { id: 'Q-12', title: 'Bandwidth Consumed %', category: 'Platform', tables: 'AzureMetrics', description: 'Same as Q-11 but for throughput/bandwidth. Helps identify throughput bottlenecks.', kql: `AzureMetrics\n| where TimeGenerated > ago(1h)\n| where MetricName in (\n    "Data Disk Bandwidth Consumed Percentage",\n    "VM Uncached Bandwidth Consumed Percentage"\n)\n| summarize AvgConsumedPct=avg(Average)\n    by bin(TimeGenerated, 5m), Resource, MetricName`, dashboard: 'Monitor → throughput progress bars' },
  { id: 'Q-14', title: 'Latency Percentiles', category: 'Advanced', tables: 'Perf', description: 'Computes p50, p95, p99 latency percentiles per disk. Reveals tail latency that averages hide.', kql: `let timeRange = 1h;\nPerf\n| where TimeGenerated > ago(timeRange)\n| where CounterName in ("Avg. Disk sec/Read","Avg. Disk sec/Write")\n| where InstanceName !in ("_Total", "/")\n| summarize p50=percentile(CounterValue*1000, 50),\n            p95=percentile(CounterValue*1000, 95),\n            p99=percentile(CounterValue*1000, 99)\n    by Computer, InstanceName, CounterName\n| order by p99 desc`, dashboard: 'Latency tab → percentile chart' },
  { id: 'T-01', title: 'Sustained High Throughput', category: 'Trends', tables: 'Perf', description: 'Detects time windows where throughput exceeds 80% of provisioned limit. Signals sustained saturation.', kql: `let timeRange = 24h;\nlet thresholdPct = 0.80;\nlet provisionedMBs = 125.0;\nPerf | where CounterName == "Disk Bytes/sec"\n| summarize AvgMBs=avg(CounterValue)/1048576\n    by bin(TimeGenerated, 5m), Computer, InstanceName\n| where AvgMBs > provisionedMBs * thresholdPct`, dashboard: 'Trend detection in dashboards' },
  { id: 'T-02', title: 'Latency Spikes', category: 'Trends', tables: 'Perf', description: 'Detects latency > 2× rolling average. Identifies sudden performance degradation events.', kql: `Perf | where CounterName in ("Avg. Disk sec/Read")\n| summarize AvgLat=avg(CounterValue)*1000\n    by bin(TimeGenerated, 5m), Computer, InstanceName\n| serialize\n| extend Rolling=avg_of(AvgLat, prev(AvgLat,1),...)\n| where AvgLat > Rolling * 2`, dashboard: 'Latency anomaly detection' },
  { id: 'T-03', title: 'IOPS Plateau Detection', category: 'Trends', tables: 'Perf', description: 'Finds periods where IOPS flatlines at or near the provisioned ceiling. Indicates the disk is maxed out.', kql: `Perf | where CounterName == "Disk Transfers/sec"\n| summarize AvgIOPS=avg(CounterValue)\n    by bin(TimeGenerated, 5m), Computer, InstanceName\n| serialize\n| extend Diff=abs(AvgIOPS - prev(AvgIOPS,1))\n| where Diff < AvgIOPS * 0.02 and AvgIOPS > 500`, dashboard: 'IOPS plateau overlay' },
  { id: 'T-04', title: 'Queue Depth vs Latency Correlation', category: 'Advanced', tables: 'Perf', description: 'Joins queue depth and latency time series to reveal the correlation. Proves that rising QD causes latency increase.', kql: `let qd = Perf | where CounterName == "Current Disk Queue Length"\n| summarize AvgQD=avg(CounterValue)\n    by bin(TimeGenerated,1m), Computer, InstanceName;\nlet lat = Perf | where CounterName in ("Avg. Disk sec/Read")\n| summarize AvgLat=avg(CounterValue)*1000\n    by bin(TimeGenerated,1m), Computer, InstanceName;\nqd | join kind=inner lat on TimeGenerated, Computer, InstanceName\n| project TimeGenerated, Computer, AvgQD, AvgLat`, dashboard: 'Queue Depth tab correlation' },
];

// ============================================================================
// Performance Counters — DCR Configuration
// ============================================================================
const LINUX_COUNTERS = [
  { counter: 'Disk Reads/sec', object: 'Logical Disk', what: 'Read operations per second per disk', why: 'Read-heavy workloads (caching candidates)' },
  { counter: 'Disk Writes/sec', object: 'Logical Disk', what: 'Write operations per second per disk', why: 'Write-heavy workloads (journal, WAL)' },
  { counter: 'Disk Transfers/sec', object: 'Logical Disk', what: 'Total IOPS (reads + writes combined)', why: 'Primary IOPS metric for right-sizing' },
  { counter: 'Disk Read Bytes/sec', object: 'Logical Disk', what: 'Read throughput in bytes per second', why: 'Sequential read bandwidth measurement' },
  { counter: 'Disk Write Bytes/sec', object: 'Logical Disk', what: 'Write throughput in bytes per second', why: 'Sequential write bandwidth measurement' },
  { counter: 'Disk Bytes/sec', object: 'Logical Disk', what: 'Total throughput (read + write combined)', why: 'Total throughput for VM-cap comparison' },
  { counter: 'Avg. Disk sec/Read', object: 'Logical Disk', what: 'Average time per read operation (seconds)', why: 'Read latency — multiply by 1000 for ms' },
  { counter: 'Avg. Disk sec/Write', object: 'Logical Disk', what: 'Average time per write operation', why: 'Write latency — critical for DB commits' },
  { counter: 'Avg. Disk sec/Transfer', object: 'Logical Disk', what: 'Average time per any I/O operation', why: 'Combined latency metric' },
  { counter: 'Current Disk Queue Length', object: 'Logical Disk', what: 'Pending I/O count at sample time', why: 'Saturation indicator — >32 = concern' },
  { counter: '% Used Space', object: 'Logical Disk', what: 'Percentage of disk capacity consumed', why: 'Capacity planning — alert at 80%' },
  { counter: 'Free Megabytes', object: 'Logical Disk', what: 'Absolute free space in MB', why: 'Complements % for large disks' },
  { counter: '% Free Inodes', object: 'Logical Disk', what: 'Inode utilization (Linux-specific)', why: 'Can fill even with free disk space' },
];

const WINDOWS_COUNTERS = [
  { counter: 'Disk Reads/sec', object: 'LogicalDisk', what: 'Read operations per second', why: '' },
  { counter: 'Disk Writes/sec', object: 'LogicalDisk', what: 'Write operations per second', why: '' },
  { counter: 'Disk Transfers/sec', object: 'LogicalDisk', what: 'Total IOPS', why: '' },
  { counter: 'Disk Read Bytes/sec', object: 'LogicalDisk', what: 'Read throughput', why: '' },
  { counter: 'Disk Write Bytes/sec', object: 'LogicalDisk', what: 'Write throughput', why: '' },
  { counter: 'Disk Bytes/sec', object: 'LogicalDisk', what: 'Total throughput', why: '' },
  { counter: 'Avg. Disk sec/Read', object: 'LogicalDisk', what: 'Read latency (seconds)', why: '' },
  { counter: 'Avg. Disk sec/Write', object: 'LogicalDisk', what: 'Write latency (seconds)', why: '' },
  { counter: 'Avg. Disk Queue Length', object: 'LogicalDisk', what: 'Average queue depth', why: '' },
  { counter: 'Current Disk Queue Length', object: 'LogicalDisk', what: 'Instant queue depth', why: '' },
  { counter: '% Free Space', object: 'LogicalDisk', what: 'Free space percentage', why: '' },
  { counter: 'Free Megabytes', object: 'LogicalDisk', what: 'Free space in MB', why: '' },
  { counter: 'Disk Reads/sec', object: 'PhysicalDisk', what: 'Physical disk reads/sec', why: 'Physical layer view' },
  { counter: 'Disk Writes/sec', object: 'PhysicalDisk', what: 'Physical disk writes/sec', why: '' },
  { counter: 'Avg. Disk sec/Read', object: 'PhysicalDisk', what: 'Physical read latency', why: '' },
  { counter: 'Avg. Disk sec/Write', object: 'PhysicalDisk', what: 'Physical write latency', why: '' },
];

const PLATFORM_METRICS = [
  { category: 'Data Disk Performance', metrics: [
    { name: 'Data Disk Read Bytes/sec', unit: 'BytesPerSecond', desc: 'Read throughput on data disks' },
    { name: 'Data Disk Write Bytes/sec', unit: 'BytesPerSecond', desc: 'Write throughput on data disks' },
    { name: 'Data Disk Read Operations/sec', unit: 'CountPerSecond', desc: 'Read IOPS on data disks' },
    { name: 'Data Disk Write Operations/sec', unit: 'CountPerSecond', desc: 'Write IOPS on data disks' },
    { name: 'Data Disk Queue Depth', unit: 'Count', desc: 'Pending I/O on data disks' },
    { name: 'Data Disk Latency', unit: 'Milliseconds', desc: 'Average I/O latency (preview)' },
  ]},
  { category: 'Consumed Percentages', metrics: [
    { name: 'Data Disk IOPS Consumed %', unit: '%', desc: 'How close to IOPS ceiling' },
    { name: 'Data Disk Bandwidth Consumed %', unit: '%', desc: 'How close to throughput ceiling' },
    { name: 'VM Uncached IOPS Consumed %', unit: '%', desc: 'VM-level IOPS cap usage' },
    { name: 'VM Uncached Bandwidth Consumed %', unit: '%', desc: 'VM-level throughput cap usage' },
    { name: 'VM Cached IOPS Consumed %', unit: '%', desc: 'Cached IOPS cap usage' },
    { name: 'VM Cached Bandwidth Consumed %', unit: '%', desc: 'Cached throughput cap usage' },
  ]},
  { category: 'OS Disk', metrics: [
    { name: 'OS Disk Read Bytes/sec', unit: 'BytesPerSecond', desc: 'OS disk read throughput' },
    { name: 'OS Disk Write Bytes/sec', unit: 'BytesPerSecond', desc: 'OS disk write throughput' },
    { name: 'OS Disk Read Operations/sec', unit: 'CountPerSecond', desc: 'OS disk read IOPS' },
    { name: 'OS Disk Write Operations/sec', unit: 'CountPerSecond', desc: 'OS disk write IOPS' },
    { name: 'OS Disk Queue Depth', unit: 'Count', desc: 'OS disk queue depth' },
    { name: 'OS Disk Latency', unit: 'Milliseconds', desc: 'OS disk latency (preview)' },
  ]},
  { category: 'Burst Credits', metrics: [
    { name: 'Data Disk Burst IO Credits Used %', unit: '%', desc: 'Burst IOPS credits consumed' },
    { name: 'Data Disk Burst BPS Credits Used %', unit: '%', desc: 'Burst throughput credits consumed' },
    { name: 'OS Disk Burst IO Credits Used %', unit: '%', desc: 'OS disk burst IOPS credits' },
    { name: 'OS Disk Burst BPS Credits Used %', unit: '%', desc: 'OS disk burst throughput credits' },
  ]},
  { category: 'Cache', metrics: [
    { name: 'Premium SSD Cache Read Hit', unit: 'Percent', desc: 'Cache read hit ratio' },
    { name: 'Premium SSD Cache Read Miss', unit: 'Percent', desc: 'Cache read miss ratio' },
  ]},
  { category: 'Temp Disk', metrics: [
    { name: 'Temp Disk Read Bytes/sec', unit: 'BytesPerSecond', desc: 'Local temp disk throughput' },
    { name: 'Temp Disk Write Bytes/sec', unit: 'BytesPerSecond', desc: 'Local temp disk write throughput' },
    { name: 'Temp Disk Read Operations/sec', unit: 'CountPerSecond', desc: 'Local temp disk IOPS' },
    { name: 'Temp Disk Write Operations/sec', unit: 'CountPerSecond', desc: 'Local temp disk write IOPS' },
    { name: 'Temp Disk Queue Depth', unit: 'Count', desc: 'Local temp disk queue depth' },
    { name: 'Temp Disk Latency', unit: 'Milliseconds', desc: 'Local temp disk latency' },
  ]},
  { category: 'Aggregates', metrics: [
    { name: 'Disk Read Bytes', unit: 'Bytes', desc: 'Total bytes read across all disks' },
    { name: 'Disk Write Bytes', unit: 'Bytes', desc: 'Total bytes written across all disks' },
    { name: 'Disk Read Operations/Sec', unit: 'CountPerSecond', desc: 'Total read IOPS all disks' },
    { name: 'Disk Write Operations/Sec', unit: 'CountPerSecond', desc: 'Total write IOPS all disks' },
  ]},
];

const TOTAL_PLATFORM = PLATFORM_METRICS.reduce((s, c) => s + c.metrics.length, 0);

type ActiveTab = 'kql' | 'perf' | 'platform';

export default function DeepDivePage() {
  const [tab, setTab] = useState<ActiveTab>('kql');
  const [kqlCategory, setKqlCategory] = useState('all');
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);

  const kqlCategories = [...new Set(KQL_QUERIES.map((q) => q.category))];
  const filteredQueries = kqlCategory === 'all' ? KQL_QUERIES : KQL_QUERIES.filter((q) => q.category === kqlCategory);

  const kqlCatData = kqlCategories.map((c) => ({ name: c, count: KQL_QUERIES.filter((q) => q.category === c).length }));
  const platformCatData = PLATFORM_METRICS.map((c) => ({ name: c.category, count: c.metrics.length }));

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-[1500px] px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/technical" className="rounded-lg bg-slate-800 border border-slate-700 p-2 text-slate-400 hover:text-white transition-colors"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg></Link>
              <div>
                <h1 className="text-lg font-bold text-white">Metrics, Counters &amp; KQL Deep Dive</h1>
                <p className="text-[11px] text-slate-500">{KQL_QUERIES.length} KQL queries &bull; {LINUX_COUNTERS.length + WINDOWS_COUNTERS.length} perf counters &bull; {TOTAL_PLATFORM} platform metrics</p>
              </div>
            </div>
          </div>
          <nav className="mt-3 flex gap-1">
            {([
              { key: 'kql' as ActiveTab, label: `KQL Queries (${KQL_QUERIES.length})` },
              { key: 'perf' as ActiveTab, label: `Perf Counters (${LINUX_COUNTERS.length + WINDOWS_COUNTERS.length})` },
              { key: 'platform' as ActiveTab, label: `Platform Metrics (${TOTAL_PLATFORM})` },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-6 space-y-6">

        {/* =============== KQL QUERIES =============== */}
        {tab === 'kql' && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Category Distribution Chart */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Queries by Category</h3>
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart><Pie data={kqlCatData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="count" stroke="none">{kqlCatData.map((_, i) => <Cell key={i} fill={['#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4','#a855f7','#ec4899'][i % 8]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} /><Legend wrapperStyle={{ fontSize: '10px' }} /></PieChart>
                </ResponsiveContainer>
              </div>
              {/* Stats */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-white mb-3">Query Catalog Summary</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Total Queries', value: KQL_QUERIES.length, color: 'text-blue-400' },
                    { label: 'Tables Used', value: '4', color: 'text-purple-400', detail: 'Perf, AzureMetrics, Heartbeat, DiskBenchmark_CL' },
                    { label: 'Categories', value: kqlCategories.length, color: 'text-emerald-400' },
                    { label: 'Trend Queries', value: KQL_QUERIES.filter((q) => q.category === 'Trends').length, color: 'text-amber-400' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-center">
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs text-slate-500">Filter:</span>
                  <button onClick={() => setKqlCategory('all')} className={`rounded-lg px-3 py-1 text-xs font-medium ${kqlCategory === 'all' ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>All ({KQL_QUERIES.length})</button>
                  {kqlCategories.map((c) => <button key={c} onClick={() => setKqlCategory(c)} className={`rounded-lg px-3 py-1 text-xs font-medium ${kqlCategory === c ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>{c} ({KQL_QUERIES.filter((q) => q.category === c).length})</button>)}
                </div>
              </div>
            </div>

            {/* Query Cards */}
            <div className="space-y-3">
              {filteredQueries.map((q) => (
                <div key={q.id} className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
                  <button onClick={() => setExpandedQuery(expandedQuery === q.id ? null : q.id)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-mono font-bold text-blue-400">{q.id}</span>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{q.title}</h4>
                        <p className="text-[11px] text-slate-500">{q.category} &bull; Tables: {q.tables} &bull; Dashboard: {q.dashboard}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[9px] text-slate-400">{q.category}</span>
                      <svg className={`h-4 w-4 text-slate-400 transition-transform ${expandedQuery === q.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                  </button>
                  {expandedQuery === q.id && (
                    <div className="border-t border-slate-700 px-5 py-4 space-y-3">
                      <p className="text-sm text-slate-300">{q.description}</p>
                      <div className="rounded-lg bg-slate-900 p-4 overflow-x-auto">
                        <pre className="text-xs text-emerald-400 font-mono whitespace-pre leading-relaxed">{q.kql}</pre>
                      </div>
                      <div className="flex gap-2">
                        <span className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">Tables: {q.tables}</span>
                        <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">Shown in: {q.dashboard}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* =============== PERF COUNTERS =============== */}
        {tab === 'perf' && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Linux Counters */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">Linux</span>
                  <h3 className="text-sm font-semibold text-white">{LINUX_COUNTERS.length} Performance Counters</h3>
                  <span className="text-[10px] text-slate-500 ml-auto">Object: Logical Disk (*)</span>
                </div>
                <div className="rounded-lg bg-slate-700/20 px-3 py-2 mb-3 text-xs text-slate-400">
                  Collected via Azure Monitor Agent (AMA) through Data Collection Rule at <strong>60-second</strong> intervals
                </div>
                <div className="space-y-2">
                  {LINUX_COUNTERS.map((c) => (
                    <div key={c.counter + c.object} className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
                      <div className="flex items-start justify-between">
                        <code className="text-xs font-mono text-emerald-400">{c.object}\\{c.counter}</code>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{c.what}</p>
                      {c.why && <p className="text-[10px] text-amber-400/70 mt-0.5">{c.why}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Windows Counters */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-400">Windows</span>
                  <h3 className="text-sm font-semibold text-white">{WINDOWS_COUNTERS.length} Performance Counters</h3>
                  <span className="text-[10px] text-slate-500 ml-auto">LogicalDisk + PhysicalDisk</span>
                </div>
                <div className="rounded-lg bg-slate-700/20 px-3 py-2 mb-3 text-xs text-slate-400">
                  Windows VMs collect both LogicalDisk (partitions) and PhysicalDisk (raw device) counters
                </div>
                <div className="space-y-2">
                  {WINDOWS_COUNTERS.map((c, i) => (
                    <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
                      <code className="text-xs font-mono text-blue-400">{c.object}\\{c.counter}</code>
                      <p className="text-xs text-slate-300 mt-1">{c.what}</p>
                      {c.why && <p className="text-[10px] text-amber-400/70 mt-0.5">{c.why}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Counter comparison chart */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Counter Count by OS</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[{ name: 'Linux', counters: LINUX_COUNTERS.length, fill: '#f59e0b' }, { name: 'Windows', counters: WINDOWS_COUNTERS.length, fill: '#3b82f6' }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                  <Bar dataKey="counters" name="Perf Counters" radius={[4, 4, 0, 0]}>{[<Cell key={0} fill="#f59e0b" />, <Cell key={1} fill="#3b82f6" />]}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* =============== PLATFORM METRICS =============== */}
        {tab === 'platform' && (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Metrics by Category</h3>
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart><Pie data={platformCatData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="count" stroke="none">{platformCatData.map((_, i) => <Cell key={i} fill={['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#06b6d4','#ec4899'][i % 7]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} /><Legend wrapperStyle={{ fontSize: '10px' }} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-white mb-3">Platform Metrics Summary</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-center"><div className="text-2xl font-bold text-blue-400">{TOTAL_PLATFORM}</div><div className="text-[10px] text-slate-400">Total Metrics</div></div>
                  <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-center"><div className="text-2xl font-bold text-purple-400">{PLATFORM_METRICS.length}</div><div className="text-[10px] text-slate-400">Categories</div></div>
                  <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-center"><div className="text-2xl font-bold text-emerald-400">0</div><div className="text-[10px] text-slate-400">Agent Required</div></div>
                  <div className="rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-center"><div className="text-2xl font-bold text-amber-400">1 min</div><div className="text-[10px] text-slate-400">Granularity</div></div>
                </div>
                <p className="mt-3 text-xs text-slate-400">Platform metrics are emitted by Azure infrastructure automatically — no agent needed. They are routed to Log Analytics via Diagnostic Settings (AllMetrics category).</p>
              </div>
            </div>

            {/* Category Sections */}
            <div className="space-y-4">
              {PLATFORM_METRICS.map((cat) => (
                <div key={cat.category} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-400">{cat.metrics.length}</span>
                    {cat.category}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.metrics.map((m) => (
                      <div key={m.name} className="rounded-lg border border-slate-700 bg-slate-700/20 px-4 py-3">
                        <code className="text-xs font-mono text-cyan-400">{m.name}</code>
                        <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
                        <span className="mt-1 inline-block rounded bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-500">{m.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 py-3 text-center text-[10px] text-slate-500">
        Azure Disk Monitoring POC &bull; {KQL_QUERIES.length} KQL Queries &bull; {LINUX_COUNTERS.length + WINDOWS_COUNTERS.length} Perf Counters &bull; {TOTAL_PLATFORM} Platform Metrics
      </footer>
    </div>
  );
}
