'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import DiskInventoryTable from '@/components/DiskInventoryTable';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import DiskTypeComparison from '@/components/DiskTypeComparison';
import VmFamilyComparison from '@/components/VmFamilyComparison';
import LatencyPercentiles from '@/components/LatencyPercentiles';
import DistributionChart from '@/components/DistributionChart';
import MetricInfoPanel from '@/components/MetricInfoPanel';
import {
  generateOverviewStats,
  generateDiskInventory,
  generateIopsTimeSeries,
  generateThroughputTimeSeries,
  generateLatencyTimeSeries,
  generateQueueDepthTimeSeries,
  generateDiskTypeComparison,
  generateVmFamilyComparison,
  generateLatencyPercentiles,
} from '@/lib/mock-data';

type TimeRange = '1h' | '24h' | '7d' | '30d';
type Tab = 'overview' | 'iops' | 'throughput' | 'latency' | 'queue' | 'capacity' | 'comparison';

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'iops', label: 'IOPS' },
  { key: 'throughput', label: 'Throughput' },
  { key: 'latency', label: 'Latency' },
  { key: 'queue', label: 'Queue Depth' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'comparison', label: 'Comparison' },
];

const TIME_RANGE_LABELS: { key: TimeRange; label: string }[] = [
  { key: '1h', label: 'Last 1h' },
  { key: '24h', label: 'Last 24h' },
  { key: '7d', label: 'Last 7d' },
  { key: '30d', label: 'Last 30d' },
];

function timeRangeToHours(range: TimeRange): number {
  switch (range) {
    case '1h': return 1;
    case '24h': return 24;
    case '7d': return 168;
    case '30d': return 720;
    default: return 1;
  }
}

// SVG Icons
const ServerIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3" />
  </svg>
);

const DiskIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
  </svg>
);

const BoltIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Generate data (in production, these would be API calls to Log Analytics)
  const overview = useMemo(() => generateOverviewStats(), [refreshKey]);
  const inventory = useMemo(() => generateDiskInventory(), [refreshKey]);
  const hours = timeRangeToHours(timeRange);
  const iopsSeries = useMemo(() => generateIopsTimeSeries(Math.min(hours, 24)), [timeRange, refreshKey]);
  const throughputSeries = useMemo(() => generateThroughputTimeSeries(Math.min(hours, 24)), [timeRange, refreshKey]);
  const latencySeries = useMemo(() => generateLatencyTimeSeries(Math.min(hours, 24)), [timeRange, refreshKey]);
  const queueSeries = useMemo(() => generateQueueDepthTimeSeries(Math.min(hours, 24)), [timeRange, refreshKey]);
  const diskTypeComp = useMemo(() => generateDiskTypeComparison(), [refreshKey]);
  const vmFamilyComp = useMemo(() => generateVmFamilyComparison(), [refreshKey]);
  const latencyPct = useMemo(() => generateLatencyPercentiles(), [refreshKey]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Azure Disk Performance Monitor</h1>
                <p className="text-xs text-slate-400">
                  Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105 &bull; Region: East US 2
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Time Range Picker */}
              <div className="flex rounded-lg border border-slate-700 bg-slate-800">
                {TIME_RANGE_LABELS.map(({ key, label }) => (
                  <button
                    key={key}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      timeRange === key
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    } ${key === '1h' ? 'rounded-l-lg' : ''} ${key === '30d' ? 'rounded-r-lg' : ''}`}
                    onClick={() => setTimeRange(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Refresh */}
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 transition-colors hover:text-white"
                title="Refresh data"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              </button>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                Live
              </span>
              {/* Monitor Page Link */}
              <Link
                href="/monitor"
                className="rounded-lg border border-blue-500/50 bg-blue-600/20 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-600/30"
                title="Single Pane of Glass — Drill-Down Monitor"
              >
                Single Pane
              </Link>
              {/* Technical Details Link */}
              <Link
                href="/technical"
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-emerald-400 hover:border-emerald-500/50"
                title="Technical Details, Metrics & Live Pricing"
              >
                Technical
              </Link>
              {/* Help Page Link */}
              <Link
                href="/help"
                className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 transition-colors hover:text-blue-400 hover:border-blue-500/50"
                title="Help & Reference Guide"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="mt-4 flex gap-1">
            {TAB_LABELS.map(({ key, label }) => (
              <button
                key={key}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total VMs Monitored"
                value={overview.totalVMs}
                subtitle="5 VMs across 3 families"
                icon={<ServerIcon />}
                color="blue"
              />
              <StatCard
                title="Total Disks"
                value={overview.totalDisks}
                subtitle="8 data disks + 5 OS disks"
                icon={<DiskIcon />}
                color="purple"
              />
              <StatCard
                title="High IOPS Disks"
                value={overview.highIopsDisks}
                subtitle="Disks > 2,000 IOPS provisioned"
                icon={<BoltIcon />}
                color="amber"
              />
              <StatCard
                title="High Latency Disks"
                value={overview.highLatencyDisks}
                subtitle="Avg latency > 5 ms"
                icon={<ClockIcon />}
                color="red"
              />
            </div>

            {/* Distribution Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <DistributionChart data={overview.diskTypeDistribution} title="Disk Type Distribution" />
              <DistributionChart data={overview.vmFamilyDistribution} title="VM Family Distribution" />
            </div>

            {/* Disk Inventory Table */}
            <div>
              <h2 className="mb-4 text-xl font-bold text-white">Disk Inventory</h2>
              <DiskInventoryTable data={inventory} />
            </div>
          </div>
        )}

        {/* ===== IOPS TAB ===== */}
        {activeTab === 'iops' && (
          <div className="space-y-6">
            <MetricInfoPanel metric="iops" />
            <TimeSeriesChart
              data={iopsSeries}
              title={`IOPS Over Time (${timeRange})`}
              yAxisLabel="IOPS"
            />
            <DiskTypeComparison data={diskTypeComp} />
          </div>
        )}

        {/* ===== THROUGHPUT TAB ===== */}
        {activeTab === 'throughput' && (
          <div className="space-y-6">
            <MetricInfoPanel metric="throughput" />
            <TimeSeriesChart
              data={throughputSeries}
              title={`Throughput Over Time (${timeRange})`}
              yAxisLabel="MB/s"
            />
          </div>
        )}

        {/* ===== LATENCY TAB ===== */}
        {activeTab === 'latency' && (
          <div className="space-y-6">
            <MetricInfoPanel metric="latency" />
            <TimeSeriesChart
              data={latencySeries}
              title={`Latency Over Time (${timeRange})`}
              yAxisLabel="ms"
            />
            <LatencyPercentiles data={latencyPct} />
          </div>
        )}

        {/* ===== QUEUE DEPTH TAB ===== */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <MetricInfoPanel metric="queue" />
            <TimeSeriesChart
              data={queueSeries}
              title={`Queue Depth Over Time (${timeRange})`}
              yAxisLabel="Queue Depth"
            />
          </div>
        )}

        {/* ===== CAPACITY TAB ===== */}
        {activeTab === 'capacity' && (
          <div className="space-y-6">
            <MetricInfoPanel metric="capacity" />
            <h2 className="text-xl font-bold text-white">Disk Capacity Utilization</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {inventory.map((disk) => (
                <div key={`${disk.vmName}-${disk.diskName}`} className="card">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">{disk.diskName.replace('disk-diskmon-', '')}</span>
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      {disk.diskType}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{disk.vmName.replace('vm-diskmon-', '')}</span>
                      <span className={`font-mono font-bold ${disk.usedPct > 80 ? 'text-red-400' : disk.usedPct > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {disk.usedPct}%
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all ${
                          disk.usedPct > 80 ? 'bg-red-500' : disk.usedPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${disk.usedPct}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{disk.diskSizeGb} GB &bull; Tier: {disk.diskTier}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== COMPARISON TAB ===== */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">VM Family Comparison</h2>
            <VmFamilyComparison data={vmFamilyComp} />

            <h2 className="text-xl font-bold text-white">Disk Type Comparison</h2>
            <DiskTypeComparison data={diskTypeComp} />

            <h2 className="text-xl font-bold text-white">Latency Percentiles by Disk</h2>
            <LatencyPercentiles data={latencyPct} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Azure Disk Performance Monitoring POC &bull; Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105 &bull; Data refreshes every 60s
      </footer>
    </div>
  );
}
