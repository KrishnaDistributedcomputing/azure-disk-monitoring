'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, Legend,
} from 'recharts';

// ============================================================================
// DISK FREE SPACE % — Guest OS Capacity Monitoring
// Query: Perf | where ObjectName == "Logical Disk" | where CounterName == "% Free Space"
//        | summarize avg(CounterValue) by Computer, InstanceName, bin(TimeGenerated, 1h)
// Workspace: law-diskmon-poc-eastus2 (945fb25a-235a-4457-ad3d-ada310dd8b28)
// ============================================================================

const QUERY = `Perf
| where ObjectName == "Logical Disk"
| where CounterName == "% Free Space"
| summarize avg(CounterValue) by Computer, InstanceName, bin(TimeGenerated, 1h)`;

// Expected result data (VMs must be running with AMA for live data)
const RESULT_DATA = [
  { computer: 'vm-diskmon-dsv5-01', instance: '/dev/sda1', mount: '/ (OS)', sizeGb: 128, type: 'Premium SSD', freeSpace: [78.4, 78.5, 78.3, 78.4, 78.2, 78.5, 78.4, 78.3], avg: 78.4, status: 'Healthy' },
  { computer: 'vm-diskmon-dsv5-01', instance: '/dev/sdb1', mount: '/mnt/data1', sizeGb: 256, type: 'Premium SSD', freeSpace: [92.1, 92.1, 92.0, 92.1, 92.1, 92.0, 92.1, 92.1], avg: 92.1, status: 'Healthy' },
  { computer: 'vm-diskmon-dsv5-01', instance: '/dev/sdc1', mount: '/mnt/data2', sizeGb: 256, type: 'Standard SSD', freeSpace: [85.6, 85.7, 85.5, 85.6, 85.4, 85.6, 85.7, 85.5], avg: 85.6, status: 'Healthy' },
  { computer: 'vm-diskmon-dsv5-02', instance: '/dev/sda1', mount: '/ (OS)', sizeGb: 128, type: 'Premium SSD', freeSpace: [71.2, 71.3, 71.1, 71.0, 70.9, 71.2, 71.1, 71.0], avg: 71.1, status: 'Healthy' },
  { computer: 'vm-diskmon-dsv5-02', instance: '/dev/sdb1', mount: '/mnt/prem512', sizeGb: 512, type: 'Premium SSD', freeSpace: [88.9, 88.8, 88.9, 88.7, 88.9, 88.8, 88.9, 88.8], avg: 88.8, status: 'Healthy' },
  { computer: 'vm-diskmon-dsv5-02', instance: '/dev/sdc1', mount: '/mnt/hdd512', sizeGb: 512, type: 'Standard HDD', freeSpace: [95.2, 95.2, 95.1, 95.2, 95.2, 95.1, 95.2, 95.2], avg: 95.2, status: 'Healthy' },
  { computer: 'vm-diskmon-esv5-01', instance: '/dev/sda1', mount: '/ (OS)', sizeGb: 128, type: 'Premium SSD', freeSpace: [74.8, 74.9, 74.7, 74.8, 74.6, 74.8, 74.9, 74.7], avg: 74.8, status: 'Healthy' },
  { computer: 'vm-diskmon-esv5-01', instance: '/dev/sdb1', mount: '/mnt/premv2', sizeGb: 256, type: 'Premium SSD v2', freeSpace: [91.3, 91.4, 91.2, 91.3, 91.3, 91.2, 91.4, 91.3], avg: 91.3, status: 'Healthy' },
  { computer: 'vm-diskmon-lsv3-01', instance: '/dev/sda1', mount: '/ (OS)', sizeGb: 128, type: 'Premium SSD', freeSpace: [68.5, 68.6, 68.4, 68.3, 68.5, 68.4, 68.6, 68.3], avg: 68.4, status: 'Healthy' },
  { computer: 'vm-diskmon-lsv3-01', instance: '/dev/sdb1', mount: '/mnt/prem256', sizeGb: 256, type: 'Premium SSD', freeSpace: [83.7, 83.8, 83.6, 83.7, 83.5, 83.7, 83.8, 83.6], avg: 83.7, status: 'Healthy' },
  { computer: 'vm-diskmon-lsv3-01', instance: '/dev/sdc1', mount: '/mnt/ultra', sizeGb: 256, type: 'Ultra Disk', freeSpace: [97.1, 97.1, 97.0, 97.1, 97.1, 97.0, 97.1, 97.1], avg: 97.1, status: 'Healthy' },
  { computer: 'vm-diskmon-dsv5-03', instance: 'C:', mount: 'C: (OS)', sizeGb: 128, type: 'Premium SSD', freeSpace: [62.3, 62.4, 62.1, 62.0, 61.8, 62.3, 62.1, 62.0], avg: 62.1, status: 'Warning' },
  { computer: 'vm-diskmon-dsv5-03', instance: 'D:', mount: 'D: (Data)', sizeGb: 256, type: 'Premium SSD', freeSpace: [94.7, 94.7, 94.6, 94.7, 94.7, 94.6, 94.7, 94.7], avg: 94.7, status: 'Healthy' },
];

const HOURS = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

const STATUS_COLORS: Record<string, string> = { Healthy: '#34d399', Warning: '#fbbf24', Critical: '#f87171' };
const TYPE_COLORS: Record<string, string> = { 'Ultra Disk': '#8b5cf6', 'Premium SSD v2': '#3b82f6', 'Premium SSD': '#22c55e', 'Standard SSD': '#f59e0b', 'Standard HDD': '#ef4444' };

// Aggregate by VM
const VM_SUMMARY = (() => {
  const map = new Map<string, { disks: number; avgFree: number; minFree: number; totalGb: number }>();
  RESULT_DATA.forEach(r => {
    const e = map.get(r.computer) || { disks: 0, avgFree: 0, minFree: 100, totalGb: 0 };
    e.disks++;
    e.avgFree += r.avg;
    e.minFree = Math.min(e.minFree, r.avg);
    e.totalGb += r.sizeGb;
    map.set(r.computer, e);
  });
  return Array.from(map.entries()).map(([vm, v]) => ({
    vm: vm.replace('vm-diskmon-', ''),
    fullName: vm,
    disks: v.disks,
    avgFree: Math.round((v.avgFree / v.disks) * 10) / 10,
    minFree: v.minFree,
    totalGb: v.totalGb,
    status: v.minFree < 20 ? 'Critical' : v.minFree < 50 ? 'Warning' : 'Healthy',
  })).sort((a, b) => a.minFree - b.minFree);
})();

// Time series for chart (one line per VM, showing lowest disk)
const TIMELINE = HOURS.map((h, i) => {
  const point: Record<string, string | number> = { time: h };
  VM_SUMMARY.forEach(vm => {
    const disks = RESULT_DATA.filter(r => r.computer === vm.fullName);
    const lowestDisk = disks.reduce((min, d) => d.freeSpace[i] < min.freeSpace[i] ? d : min);
    point[vm.vm] = lowestDisk.freeSpace[i];
  });
  return point;
});

const VM_COLORS: Record<string, string> = { 'dsv5-01': '#f59e0b', 'dsv5-02': '#3b82f6', 'esv5-01': '#22c55e', 'lsv3-01': '#8b5cf6', 'dsv5-03': '#ef4444' };

export default function FreeSpacePage() {
  const [selectedVM, setSelectedVM] = useState<string>('all');
  const [showQuery, setShowQuery] = useState(false);

  const filteredData = selectedVM === 'all' ? RESULT_DATA : RESULT_DATA.filter(r => r.computer.includes(selectedVM));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200" role="main">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors p-1" aria-label="Back">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Disk Free Space % by Computer and Disk Instance (Hourly Average)</h1>
                <p className="text-sm text-slate-400">KQL: Perf → Logical Disk → % Free Space → summarize avg by Computer, Instance, 1h bins</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right"><div className="text-sm text-slate-400">Disks</div><div className="text-xl font-bold text-white">{RESULT_DATA.length}</div></div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-right"><div className="text-sm text-slate-400">VMs</div><div className="text-xl font-bold text-white">{VM_SUMMARY.length}</div></div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-right"><div className="text-sm text-slate-400">Lowest</div><div className="text-xl font-bold text-amber-400">{Math.min(...RESULT_DATA.map(r => r.avg))}%</div></div>
              <button onClick={() => setShowQuery(!showQuery)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors">{showQuery ? 'Hide' : 'Show'} KQL</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
        {/* KQL Query (toggleable) */}
        {showQuery && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-emerald-300">KQL Query</h3>
              <button onClick={() => navigator.clipboard.writeText(QUERY)} className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white">Copy</button>
            </div>
            <pre className="text-sm font-mono text-emerald-400 whitespace-pre leading-relaxed bg-slate-900 rounded-lg p-4 border border-slate-700/50 overflow-x-auto">{QUERY}</pre>
            <p className="text-xs text-slate-400 mt-3">Workspace: <code className="text-blue-400">law-diskmon-poc-eastus2</code> · ID: <code className="text-blue-400">945fb25a-235a-4457-ad3d-ada310dd8b28</code> · Requires VMs running with AMA + DCR</p>
          </div>
        )}

        {/* VM Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Filter by VM:</span>
          <div className="flex rounded-lg border border-slate-700 bg-slate-800">
            <button onClick={() => setSelectedVM('all')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${selectedVM === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}>All VMs</button>
            {VM_SUMMARY.map((vm, i) => (
              <button key={vm.vm} onClick={() => setSelectedVM(vm.vm)} className={`px-3 py-2 text-sm font-medium ${selectedVM === vm.vm ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'} ${i === VM_SUMMARY.length - 1 ? 'rounded-r-lg' : ''}`}>{vm.vm}</button>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Free Space Over Time (Area Chart) */}
          <div className="lg:col-span-2 rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-base font-bold text-white mb-1">Free Space % Over Time (Lowest Disk per VM)</h3>
            <p className="text-sm text-slate-400 mb-4">Hourly average — shows the most constrained disk on each VM</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={TIMELINE} margin={{ left: 5, right: 10 }}>
                <defs>
                  {VM_SUMMARY.map(vm => (
                    <linearGradient key={vm.vm} id={`grad-${vm.vm}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={VM_COLORS[vm.vm] || '#3b82f6'} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={VM_COLORS[vm.vm] || '#3b82f6'} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3250" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#dce4ed', fontSize: 12 }} axisLine={{ stroke: '#1e3250' }} tickLine={false} />
                <YAxis domain={[50, 100]} tick={{ fill: '#dce4ed', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: '#131f35', border: '1px solid #1e3250', borderRadius: 6, fontSize: 13 }} formatter={(v: number) => `${v}%`} />
                {(selectedVM === 'all' ? VM_SUMMARY : VM_SUMMARY.filter(v => v.vm === selectedVM)).map(vm => (
                  <Area key={vm.vm} type="monotone" dataKey={vm.vm} stroke={VM_COLORS[vm.vm] || '#3b82f6'} fill={`url(#grad-${vm.vm})`} strokeWidth={2} name={vm.vm} dot={{ r: 3, fill: VM_COLORS[vm.vm] || '#3b82f6' }} />
                ))}
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* VM Summary Bar */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-base font-bold text-white mb-4">Avg Free Space by VM</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={VM_SUMMARY} layout="vertical" margin={{ left: 65, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3250" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#dce4ed', fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="vm" tick={{ fill: '#dce4ed', fontSize: 12 }} width={60} />
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ backgroundColor: '#131f35', border: '1px solid #1e3250', borderRadius: 6, fontSize: 13 }} />
                <Bar dataKey="avgFree" name="Avg Free %" radius={[0, 6, 6, 0]}>
                  {VM_SUMMARY.map((v, i) => (
                    <Cell key={i} fill={v.avgFree < 50 ? '#f87171' : v.avgFree < 70 ? '#fbbf24' : '#34d399'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full Result Table */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Query Result Set</h3>
              <p className="text-sm text-slate-400 mt-0.5">{filteredData.length} disk instances across {selectedVM === 'all' ? VM_SUMMARY.length : 1} VMs — latest hourly averages</p>
            </div>
            <span className="text-xs rounded-full bg-blue-600/20 text-blue-400 px-3 py-1 font-semibold">Power BI Ready</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-300">
                  <th className="px-5 py-3 text-left font-semibold">Computer</th>
                  <th className="px-5 py-3 text-left font-semibold">InstanceName</th>
                  <th className="px-5 py-3 text-left font-semibold">Mount / Drive</th>
                  <th className="px-5 py-3 text-left font-semibold">Disk Type</th>
                  <th className="px-5 py-3 text-right font-semibold">Size</th>
                  <th className="px-5 py-3 text-right font-semibold">avg(% Free Space)</th>
                  <th className="px-5 py-3 text-left font-semibold">Trend (8h)</th>
                  <th className="px-5 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.sort((a, b) => a.avg - b.avg).map((r, i) => (
                  <tr key={i} className={`border-b border-slate-700/50 hover:bg-slate-700/20 ${r.avg < 50 ? 'bg-red-500/5' : r.avg < 70 ? 'bg-amber-500/5' : ''}`}>
                    <td className="px-5 py-3">
                      <span className="font-mono font-semibold text-blue-400">{r.computer}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-200">{r.instance}</td>
                    <td className="px-5 py-3 text-slate-300">{r.mount}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: (TYPE_COLORS[r.type] || '#64748b') + '20', color: TYPE_COLORS[r.type] || '#94a3b8' }}>{r.type}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-300">{r.sizeGb} GB</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-lg font-bold font-mono ${r.avg < 50 ? 'text-red-400' : r.avg < 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{r.avg}%</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-0.5 h-6">
                        {r.freeSpace.map((v, j) => (
                          <div key={j} className="w-3 rounded-sm" style={{ height: `${Math.max(4, (v - 50) * 0.5)}px`, backgroundColor: v < 50 ? '#f87171' : v < 70 ? '#fbbf24' : '#34d399', opacity: 0.6 + (j / r.freeSpace.length) * 0.4 }} title={`${HOURS[j]}: ${v}%`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: STATUS_COLORS[r.status] + '20', color: STATUS_COLORS[r.status] }}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[r.status] }} />
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* VM Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {VM_SUMMARY.map(vm => (
            <div key={vm.vm} className={`rounded-xl border p-4 ${vm.status === 'Warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-700 bg-slate-800'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: VM_COLORS[vm.vm] }} />
                <span className="text-sm font-bold text-white">{vm.vm}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: vm.avgFree < 50 ? '#f87171' : vm.avgFree < 70 ? '#fbbf24' : '#34d399' }}>{vm.avgFree}%</div>
              <div className="text-xs text-slate-400 mt-1">{vm.disks} disks · {vm.totalGb} GB total</div>
              <div className="text-xs text-slate-400">Lowest: <span className={vm.minFree < 70 ? 'text-amber-400' : 'text-emerald-400'}>{vm.minFree}%</span></div>
            </div>
          ))}
        </div>

        {/* Thresholds Reference  */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
          <h3 className="text-base font-bold text-white mb-3">Alert Thresholds</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">&gt; 50%</div>
              <div className="text-sm text-slate-300 mt-1">Healthy</div>
              <div className="text-xs text-slate-400">No action needed</div>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">20% – 50%</div>
              <div className="text-sm text-slate-300 mt-1">Warning</div>
              <div className="text-xs text-slate-400">Plan capacity expansion</div>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-center">
              <div className="text-2xl font-bold text-red-400">&lt; 20%</div>
              <div className="text-sm text-slate-300 mt-1">Critical</div>
              <div className="text-xs text-slate-400">Immediate action — disk full risk</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <Link href="/kql-lab" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">← KQL Lab (All Queries)</Link>
          <Link href="/kql-dashboard" className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">KQL Dashboard →</Link>
          <Link href="/powerbi-spec" className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">Power BI Spec →</Link>
        </div>
      </div>

      <div className="border-t border-slate-800 mt-8">
        <div className="mx-auto max-w-[1400px] px-6 py-5 flex items-center justify-between text-sm text-slate-400">
          <span>Perf → Logical Disk → % Free Space · {RESULT_DATA.length} disk instances · {VM_SUMMARY.length} VMs</span>
          <span>Workspace: law-diskmon-poc-eastus2</span>
        </div>
      </div>
    </div>
  );
}
