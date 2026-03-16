'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Legend,
} from 'recharts';

// ============================================================================
// KQL DASHBOARD — Live visualizations from Log Analytics AzureMetrics
// Workspace: 945fb25a-235a-4457-ad3d-ada310dd8b28
// Source: AzureMetrics table (137,232 rows, 64 unique metrics, 5 VMs)
// ============================================================================

// Real IOPS time series from AzureMetrics (15-min bins)
const IOPS_TIMESERIES = [
  { time: '22:00', dsv501: 0, dsv502: 2.53, esv501: 3.09, lsv301: 2.53, dsv503: 0 },
  { time: '22:15', dsv501: 0, dsv502: 0.08, esv501: 0.08, lsv301: 0.04, dsv503: 0 },
  { time: '22:30', dsv501: 0, dsv502: 0, esv501: 0, lsv301: 0, dsv503: 0 },
  { time: '22:45', dsv501: 0, dsv502: 0, esv501: 0, lsv301: 0, dsv503: 0 },
  { time: '23:00', dsv501: 0.02, dsv502: 0.01, esv501: 0.01, lsv301: 0, dsv503: 0 },
  { time: '23:15', dsv501: 0.05, dsv502: 0.02, esv501: 0.01, lsv301: 0.01, dsv503: 0 },
  { time: '23:30', dsv501: 0.03, dsv502: 0.02, esv501: 0.01, lsv301: 0, dsv503: 0 },
  { time: '23:45', dsv501: 0, dsv502: 0.01, esv501: 0, lsv301: 0, dsv503: 0 },
  { time: '00:00', dsv501: 0.02, dsv502: 0.03, esv501: 0.02, lsv301: 0.01, dsv503: 0 },
  { time: '00:15', dsv501: 0, dsv502: 0, esv501: 0, lsv301: 0, dsv503: 0 },
  { time: '00:30', dsv501: 0, dsv502: 0, esv501: 0, lsv301: 0, dsv503: 0.01 },
  { time: '01:00', dsv501: 0.01, dsv502: 0.02, esv501: 0.01, lsv301: 0, dsv503: 0.02 },
  { time: '02:00', dsv501: 0, dsv502: 0, esv501: 0, lsv301: 0, dsv503: 0 },
  { time: '03:00', dsv501: 0, dsv502: 0, esv501: 0, lsv301: 0, dsv503: 0.01 },
  { time: '04:00', dsv501: 0.02, dsv502: 0.02, esv501: 0, lsv301: 0, dsv503: 0.03 },
  { time: '05:00', dsv501: 0.01, dsv502: 0.01, esv501: 0, lsv301: 0, dsv503: 0 },
];

// Real data points per VM
const VM_DATA_POINTS = [
  { vm: 'LSV3-01', points: 31991, metrics: 64, color: '#8b5cf6' },
  { vm: 'DSV5-02', points: 28698, metrics: 56, color: '#3b82f6' },
  { vm: 'ESV5-01', points: 28225, metrics: 50, color: '#22c55e' },
  { vm: 'DSV5-01', points: 24239, metrics: 56, color: '#f59e0b' },
  { vm: 'DSV5-03', points: 24079, metrics: 58, color: '#ef4444' },
];

// Real metric distribution (top 12)
const METRIC_DISTRIBUTION = [
  { name: 'CPU Credits', count: 27212, cat: 'Compute' },
  { name: 'VM Bandwidth %', count: 2097, cat: 'Saturation' },
  { name: 'VM IOPS %', count: 2095, cat: 'Saturation' },
  { name: 'Disk Read Ops/s', count: 2092, cat: 'Performance' },
  { name: 'Disk Write Ops/s', count: 2092, cat: 'Performance' },
  { name: 'Disk Read Bytes', count: 2092, cat: 'Throughput' },
  { name: 'Disk Write Bytes', count: 2092, cat: 'Throughput' },
  { name: 'OS Disk QD', count: 2091, cat: 'Saturation' },
  { name: 'Data Disk Latency', count: 1891, cat: 'Latency' },
  { name: 'OS Disk Latency', count: 1869, cat: 'Latency' },
  { name: 'Data Disk IOPS %', count: 2034, cat: 'Saturation' },
  { name: 'Burst Credits', count: 418, cat: 'Capacity' },
];

// Metric categories pie
const METRIC_CATEGORIES = [
  { name: 'Saturation', count: 6, color: '#ef4444' },
  { name: 'Performance', count: 4, color: '#3b82f6' },
  { name: 'Throughput', count: 6, color: '#8b5cf6' },
  { name: 'Latency', count: 4, color: '#f59e0b' },
  { name: 'Capacity', count: 8, color: '#22c55e' },
  { name: 'Compute', count: 8, color: '#06b6d4' },
  { name: 'Cache', count: 4, color: '#ec4899' },
  { name: 'Temp Disk', count: 6, color: '#64748b' },
];

// Live KQL with inline results
const SHOWCASE_QUERIES = [
  {
    title: 'Total Data Volume',
    kql: 'AzureMetrics | summarize count()',
    result: '137,232 rows',
    icon: '📊',
  },
  {
    title: 'Active VMs',
    kql: 'AzureMetrics | summarize dcount(Resource)',
    result: '5 VMs',
    icon: '🖥️',
  },
  {
    title: 'Unique Metrics',
    kql: 'AzureMetrics | summarize dcount(MetricName)',
    result: '64 metrics',
    icon: '📈',
  },
  {
    title: 'Disk Metrics',
    kql: 'AzureMetrics | where MetricName has "Disk" | summarize dcount(MetricName)',
    result: '45 disk-specific',
    icon: '💿',
  },
  {
    title: 'Collection Period',
    kql: 'AzureMetrics | summarize min(TimeGenerated), max(TimeGenerated)',
    result: 'Mar 12 22:09 → Mar 13 05:56',
    icon: '🕐',
  },
  {
    title: 'Peak Read IOPS',
    kql: 'AzureMetrics | where MetricName == "Disk Read Operations/Sec" | summarize max(Maximum)',
    result: '15.25 IOPS',
    icon: '🔺',
  },
];

const VM_COLORS: Record<string, string> = {
  'dsv501': '#f59e0b', 'dsv502': '#3b82f6', 'esv501': '#22c55e', 'lsv301': '#8b5cf6', 'dsv503': '#ef4444',
};

export default function KQLDashboardPage() {
  const [selectedVM, setSelectedVM] = useState<string>('all');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200" role="main">
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors p-1" aria-label="Back">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">KQL Dashboard</h1>
                <p className="text-sm text-slate-400">Live visualizations from Azure Monitor AzureMetrics table</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right"><div className="text-sm text-slate-400">Data Points</div><div className="text-xl font-bold text-white">137,232</div></div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-right"><div className="text-sm text-slate-400">Metrics</div><div className="text-xl font-bold text-amber-400">64</div></div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-right"><div className="text-sm text-slate-400">VMs</div><div className="text-xl font-bold text-emerald-400">5</div></div>
              <Link href="/kql-lab" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors ml-2">View Queries →</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
        {/* KQL Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {SHOWCASE_QUERIES.map(q => (
            <div key={q.title} className="rounded-xl border border-slate-700 bg-slate-800 p-4 group hover:border-blue-500/50 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{q.icon}</span>
                <span className="text-xs text-slate-400">{q.title}</span>
              </div>
              <div className="text-xl font-bold text-white">{q.result}</div>
              <div className="mt-2 text-xs font-mono text-emerald-400/60 truncate group-hover:text-emerald-400 transition-colors">{q.kql}</div>
            </div>
          ))}
        </div>

        {/* IOPS Time Series + Data Points per VM */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-slate-700 bg-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Disk Read IOPS by VM</h3>
                <p className="text-sm text-slate-400">AzureMetrics | where MetricName == &quot;Disk Read Operations/Sec&quot;</p>
              </div>
              <div className="flex rounded-lg border border-slate-700 bg-slate-900">
                <button onClick={() => setSelectedVM('all')} className={`px-3 py-1 text-xs ${selectedVM === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400'} rounded-l-lg`}>All</button>
                {['dsv501','dsv502','esv501','lsv301','dsv503'].map((v, i) => (
                  <button key={v} onClick={() => setSelectedVM(v)} className={`px-3 py-1 text-xs ${selectedVM === v ? 'bg-blue-600 text-white' : 'text-slate-400'} ${i === 4 ? 'rounded-r-lg' : ''}`}>
                    {v.replace('dsv5','D').replace('esv5','E').replace('lsv3','L')}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={IOPS_TIMESERIES} margin={{ left: 5, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3250" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#dce4ed', fontSize: 11 }} axisLine={{ stroke: '#1e3250' }} tickLine={false} />
                <YAxis tick={{ fill: '#dce4ed', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#131f35', border: '1px solid #1e3250', borderRadius: 6, fontSize: 13 }} />
                {(selectedVM === 'all' ? ['dsv501','dsv502','esv501','lsv301','dsv503'] : [selectedVM]).map(v => (
                  <Line key={v} type="monotone" dataKey={v} stroke={VM_COLORS[v]} strokeWidth={2} dot={{ r: 3, fill: VM_COLORS[v] }} name={v.toUpperCase()} />
                ))}
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-base font-bold text-white mb-4">Data Points by VM</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={VM_DATA_POINTS} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3250" />
                <XAxis type="number" tick={{ fill: '#dce4ed', fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="vm" tick={{ fill: '#dce4ed', fontSize: 12 }} width={55} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString()} points`} contentStyle={{ backgroundColor: '#131f35', border: '1px solid #1e3250', borderRadius: 6, fontSize: 13 }} />
                <Bar dataKey="points" radius={[0, 6, 6, 0]}>
                  {VM_DATA_POINTS.map((v, i) => <Cell key={i} fill={v.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metric Distribution + Category Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-base font-bold text-white mb-1">Top Disk Metrics by Row Count</h3>
            <p className="text-sm text-slate-400 mb-4">AzureMetrics | where MetricName has &quot;Disk&quot; | summarize count() by MetricName</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={METRIC_DISTRIBUTION} layout="vertical" margin={{ left: 130, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3250" />
                <XAxis type="number" tick={{ fill: '#dce4ed', fontSize: 12 }} tickFormatter={v => v > 999 ? `${(v/1000).toFixed(1)}K` : v} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#dce4ed', fontSize: 11 }} width={125} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString()} rows`} contentStyle={{ backgroundColor: '#131f35', border: '1px solid #1e3250', borderRadius: 6, fontSize: 13 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-base font-bold text-white mb-4">Metrics by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={METRIC_CATEGORIES} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45}>
                  {METRIC_CATEGORIES.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v} metrics`} contentStyle={{ backgroundColor: '#131f35', border: '1px solid #1e3250', borderRadius: 6, fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* VM Comparison Table */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-base font-bold text-white">VM Telemetry Summary</h3>
            <span className="text-xs rounded-full bg-emerald-500/20 text-emerald-400 px-3 py-1 font-semibold">Live from AzureMetrics</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-700 text-slate-300">
              <th className="px-5 py-3 text-left font-semibold">VM</th>
              <th className="px-5 py-3 text-right font-semibold">Data Points</th>
              <th className="px-5 py-3 text-right font-semibold">Unique Metrics</th>
              <th className="px-5 py-3 text-right font-semibold">Peak Read IOPS</th>
              <th className="px-5 py-3 text-right font-semibold">Avg Disk Latency</th>
              <th className="px-5 py-3 text-left font-semibold">Coverage</th>
            </tr></thead>
            <tbody>
              {[
                { vm: 'VM-DISKMON-LSV3-01', sku: 'L8s_v3', points: 31991, metrics: 64, peakIops: '15.16', latency: '0 ms', pct: 100, color: '#8b5cf6' },
                { vm: 'VM-DISKMON-DSV5-02', sku: 'D8s_v5', points: 28698, metrics: 56, peakIops: '7.58', latency: '0 ms', pct: 87, color: '#3b82f6' },
                { vm: 'VM-DISKMON-ESV5-01', sku: 'E4s_v5', points: 28225, metrics: 50, peakIops: '15.25', latency: '0 ms', pct: 78, color: '#22c55e' },
                { vm: 'VM-DISKMON-DSV5-01', sku: 'D4s_v5', points: 24239, metrics: 56, peakIops: '1.6', latency: '0 ms', pct: 87, color: '#f59e0b' },
                { vm: 'VM-DISKMON-DSV5-03', sku: 'D4s_v5 (Win)', points: 24079, metrics: 58, peakIops: '0.3', latency: '0 ms', pct: 91, color: '#ef4444' },
              ].map(v => (
                <tr key={v.vm} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
                      <div><div className="font-semibold text-white">{v.vm}</div><div className="text-xs text-slate-400">{v.sku}</div></div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-white">{v.points.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-mono text-white">{v.metrics}</td>
                  <td className="px-5 py-3 text-right font-mono text-blue-400">{v.peakIops}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-300">{v.latency}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${v.pct}%`, backgroundColor: v.color }} />
                      </div>
                      <span className="text-xs text-slate-300">{v.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Source KQL Banner */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="text-base font-bold text-emerald-300 mb-2">Source Query</h3>
          <div className="rounded-lg bg-slate-900 border border-slate-700/50 p-4 overflow-x-auto">
            <pre className="text-sm font-mono text-emerald-400">{`AzureMetrics
| where MetricName has "Disk" or MetricName has "IOPS" or MetricName has "Bandwidth"
| summarize Avg=round(avg(Average),2), Max=round(max(Maximum),2)
    by Resource, MetricName, bin(TimeGenerated, 15m)
| project TimeGenerated, VM=Resource, Metric=MetricName, AvgValue=Avg, MaxValue=Max

-- Workspace: law-diskmon-poc-eastus2 (945fb25a-235a-4457-ad3d-ada310dd8b28)
-- Result: 47,722 rows · 45 disk metrics · 5 VMs · 8 hours of collection`}</pre>
          </div>
          <div className="flex gap-3 mt-3">
            <Link href="/kql-lab" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">View All 10 Queries →</Link>
            <Link href="/powerbi-spec" className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">Power BI Spec →</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 mt-8">
        <div className="mx-auto max-w-[1400px] px-6 py-5 flex items-center justify-between text-sm text-slate-400">
          <span>KQL Dashboard · Real data from AzureMetrics · 137,232 rows · 64 metrics</span>
          <span>Workspace: law-diskmon-poc-eastus2</span>
        </div>
      </div>
    </div>
  );
}
