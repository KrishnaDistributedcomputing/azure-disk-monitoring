'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie, Legend, LineChart, Line,
} from 'recharts';
import {
  generateVMFleet, generateFleetSummary, generateDiskTimeSeries,
  VMHealthStatus, DiskDetail, FleetSummary, TimeSeriesMetric,
} from '@/lib/fleet-data';

// ===================== Breadcrumb =====================
type DrillLevel = 'fleet' | 'vm' | 'disk';

function Breadcrumb({ level, vmName, diskName, onNavigate }: {
  level: DrillLevel; vmName?: string; diskName?: string;
  onNavigate: (level: DrillLevel, vmName?: string) => void;
}) {
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <button onClick={() => onNavigate('fleet')} className={`rounded px-2 py-1 transition-colors ${level === 'fleet' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'}`}>
        All VMs
      </button>
      {(level === 'vm' || level === 'disk') && vmName && (
        <>
          <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <button onClick={() => onNavigate('vm', vmName)} className={`rounded px-2 py-1 transition-colors ${level === 'vm' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white'}`}>
            {vmName}
          </button>
        </>
      )}
      {level === 'disk' && diskName && (
        <>
          <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="rounded bg-blue-600/20 px-2 py-1 text-blue-400 font-semibold">{diskName}</span>
        </>
      )}
    </nav>
  );
}

// ===================== Health Badge =====================
function HealthBadge({ status, score }: { status: string; score: number }) {
  const colors = { healthy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30', critical: 'bg-red-500/20 text-red-400 border-red-500/30' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[status as keyof typeof colors] || colors.healthy}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'healthy' ? 'bg-emerald-400' : status === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} />
      {score}%
    </span>
  );
}

// ===================== Gauge =====================
function MiniGauge({ value, max, label, color, unit = '' }: { value: number; max: number; label: string; color: string; unit?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="text-center">
      <div className="relative mx-auto h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
          <path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831" fill="none" stroke="#334155" strokeWidth="3" />
          <path d="M18 2.0845a15.9155 15.9155 0 010 31.831 15.9155 15.9155 0 010-31.831" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{pct}%</span>
        </div>
      </div>
      <div className="mt-1 text-[10px] text-slate-400">{label}</div>
      <div className="text-xs font-mono text-slate-300">{typeof value === 'number' ? value.toLocaleString() : value}{unit} / {typeof max === 'number' ? max.toLocaleString() : max}{unit}</div>
    </div>
  );
}

// ===================== Main Page =====================
export default function MonitorPage() {
  const [level, setLevel] = useState<DrillLevel>('fleet');
  const [selectedVM, setSelectedVM] = useState<string>('');
  const [selectedDisk, setSelectedDisk] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'1h' | '24h'>('1h');
  const [filterFamily, setFilterFamily] = useState<string>('all');
  const [filterHealth, setFilterHealth] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('healthScore');
  const [refreshKey, setRefreshKey] = useState(0);

  const fleet = useMemo(() => generateVMFleet(true), [refreshKey]);
  const summary = useMemo(() => generateFleetSummary(fleet), [fleet]);
  const activeVM = useMemo(() => fleet.find((v) => v.vmName === selectedVM), [fleet, selectedVM]);
  const activeDisk = useMemo(() => activeVM?.disks.find((d) => d.diskName === selectedDisk), [activeVM, selectedDisk]);
  const diskTS = useMemo(() => selectedDisk ? generateDiskTimeSeries(selectedDisk, timeRange === '1h' ? 1 : 24) : [], [selectedDisk, timeRange, refreshKey]);

  const navigate = useCallback((l: DrillLevel, vm?: string, disk?: string) => {
    setLevel(l);
    if (vm) setSelectedVM(vm);
    if (disk) setSelectedDisk(disk);
    if (l === 'fleet') { setSelectedVM(''); setSelectedDisk(''); }
    if (l === 'vm') { setSelectedDisk(''); }
  }, []);

  const filteredFleet = useMemo(() => {
    let result = [...fleet];
    if (filterFamily !== 'all') result = result.filter((v) => v.vmFamily === filterFamily);
    if (filterHealth !== 'all') result = result.filter((v) => v.healthStatus === filterHealth);
    result.sort((a, b) => {
      if (sortBy === 'healthScore') return a.healthScore - b.healthScore;
      if (sortBy === 'iops') return b.totalIops - a.totalIops;
      if (sortBy === 'latency') return b.avgLatencyMs - a.avgLatencyMs;
      if (sortBy === 'cost') return b.monthlyCost - a.monthlyCost;
      return 0;
    });
    return result;
  }, [fleet, filterFamily, filterHealth, sortBy]);

  const HEALTH_COLORS = { healthy: '#22c55e', warning: '#f59e0b', critical: '#ef4444' };
  const DISK_COLORS: Record<string, string> = { 'Ultra Disk': '#8b5cf6', 'Premium SSD v2': '#3b82f6', 'Premium SSD': '#22c55e', 'Standard SSD': '#f59e0b', 'Standard HDD': '#ef4444' };

  // VM Start/Stop/Deallocate state
  const [vmActions, setVmActions] = useState<Record<string, { status: 'idle' | 'running' | 'success' | 'error'; action: string; message: string }>>({});

  const executeVmAction = useCallback(async (vmName: string, action: 'start' | 'stop' | 'deallocate') => {
    const rg = 'rg-diskmon-poc-eastus2';
    setVmActions((prev) => ({ ...prev, [vmName]: { status: 'running', action, message: `${action === 'start' ? 'Starting' : action === 'deallocate' ? 'Deallocating' : 'Stopping'} ${vmName}...` } }));

    try {
      const resp = await fetch(`/api/vm-action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vmName, action, resourceGroup: rg }) });
      // Since we're on a static site, fall back to showing the Azure CLI command
      throw new Error('static-site');
    } catch {
      // Show the command to the user since we can't execute server-side
      const cmdMap = {
        start: `az vm start -g rg-diskmon-poc-eastus2 -n ${vmName} --no-wait`,
        stop: `az vm stop -g rg-diskmon-poc-eastus2 -n ${vmName} --no-wait`,
        deallocate: `az vm deallocate -g rg-diskmon-poc-eastus2 -n ${vmName} --no-wait`,
      };
      const savingsMap = {
        start: 'VM will resume billing upon start',
        stop: 'VM stopped — compute billing stops, but disk charges continue',
        deallocate: `VM deallocated — saves ~$${(fleet.find((v) => v.vmName === vmName)?.monthlyCost ? Math.round((fleet.find((v) => v.vmName === vmName)!.monthlyCost - fleet.find((v) => v.vmName === vmName)!.disks.reduce((s, d) => s + d.monthlyCost, 0))) : 0)}/mo compute cost`,
      };
      setVmActions((prev) => ({
        ...prev,
        [vmName]: {
          status: 'success',
          action,
          message: cmdMap[action],
        },
      }));
      // Auto-clear after 15 seconds
      setTimeout(() => setVmActions((prev) => { const n = { ...prev }; delete n[vmName]; return n; }), 15000);
    }
  }, [fleet]);

  const allVmNames = fleet.map((v) => v.vmName);
  const executeFleetAction = useCallback(async (action: 'start' | 'deallocate') => {
    for (const vmName of allVmNames) {
      await executeVmAction(vmName, action);
    }
  }, [allVmNames, executeVmAction]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 transition-colors" title="Home">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white">Teranet Disk Performance Monitor</h1>
                <p className="text-[11px] text-slate-500">Single Pane of Glass — All VMs &bull; All Disks &bull; Real-Time</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Breadcrumb level={level} vmName={selectedVM} diskName={selectedDisk} onNavigate={navigate} />
              <div className="flex rounded-lg border border-slate-700 bg-slate-800 ml-4">
                {(['1h', '24h'] as const).map((t) => (
                  <button key={t} onClick={() => setTimeRange(t)} className={`px-3 py-1 text-xs font-medium ${timeRange === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'} ${t === '1h' ? 'rounded-l-lg' : 'rounded-r-lg'}`}>{t}</button>
                ))}
              </div>
              <button onClick={() => setRefreshKey((k) => k + 1)} className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:text-white" title="Refresh">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
              </button>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">LIVE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-5 space-y-6">

        {/* ============================================================ */}
        {/* LEVEL 1: FLEET OVERVIEW */}
        {/* ============================================================ */}
        {level === 'fleet' && (
          <>
            {/* Fleet KPI Strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {[
                { label: 'VMs Running', value: `${summary.runningVMs}/${summary.totalVMs}`, color: 'text-blue-400' },
                { label: 'Total Disks', value: summary.totalDisks, color: 'text-purple-400' },
                { label: 'Healthy', value: summary.healthyVMs, color: 'text-emerald-400' },
                { label: 'Warning', value: summary.warningVMs, color: 'text-amber-400' },
                { label: 'Critical', value: summary.criticalVMs, color: 'text-red-400' },
                { label: 'Avg Latency', value: `${summary.avgLatencyMs}ms`, color: 'text-cyan-400' },
                { label: 'Storage', value: `${summary.totalUsedTb}/${summary.totalProvisionedTb} TB`, color: 'text-slate-300' },
                { label: 'Monthly Cost', value: `$${summary.totalMonthlyCost.toLocaleString()}`, color: 'text-amber-400' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-center">
                  <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Fleet Charts Row 1 */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Health Distribution */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">VM Health Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Healthy', value: summary.healthyVMs, fill: HEALTH_COLORS.healthy },
                      { name: 'Warning', value: summary.warningVMs, fill: HEALTH_COLORS.warning },
                      { name: 'Critical', value: summary.criticalVMs, fill: HEALTH_COLORS.critical },
                    ].filter((d) => d.value > 0)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* IOPS by VM */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Total IOPS by VM</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={fleet.map((v) => ({ name: v.vmName.replace('vm-diskmon-', ''), iops: v.totalIops, max: v.maxIops }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} width={65} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="iops" name="Current IOPS" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Disk Type Distribution */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Disk Type Distribution</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={summary.diskTypes.map((dt) => ({ ...dt, fill: DISK_COLORS[dt.name] || '#64748b' }))} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="count" stroke="none" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fleet Charts Row 2 — Latency, Throughput, Cost */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Latency by VM */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Avg Latency by VM (ms)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={fleet.map((v) => ({ name: v.vmName.replace('vm-diskmon-', ''), latency: v.avgLatencyMs }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} width={65} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number) => `${v} ms`} />
                    <Bar dataKey="latency" name="Avg Latency (ms)" radius={[0, 4, 4, 0]}>
                      {fleet.map((v, i) => <Cell key={i} fill={v.avgLatencyMs > 5 ? '#ef4444' : v.avgLatencyMs > 2 ? '#f59e0b' : '#22c55e'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Throughput by VM */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Throughput by VM (MB/s)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={fleet.map((v) => ({ name: v.vmName.replace('vm-diskmon-', ''), throughput: v.totalThroughputMBs, cap: v.maxThroughputMBs }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} width={65} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="throughput" name="Current MB/s" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Cost by VM */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Monthly Cost by VM ($)</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={fleet.map((v) => ({ name: v.vmName.replace('vm-diskmon-', ''), cost: Math.round(v.monthlyCost), diskCost: Math.round(v.disks.reduce((s, d) => s + d.monthlyCost, 0)) }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} width={65} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number) => `$${v}`} />
                    <Bar dataKey="cost" name="Total (VM+Disks)" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fleet Charts Row 3 — Capacity, Queue Depth, IOPS Consumed */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Capacity */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Disk Capacity by VM (% used)</h3>
                <div className="space-y-3">
                  {fleet.map((v) => (
                    <div key={v.vmName}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300">{v.vmName.replace('vm-diskmon-', '')}</span>
                        <span className={`font-mono ${v.capacityPct > 80 ? 'text-red-400' : v.capacityPct > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>{v.capacityPct}%</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full ${v.capacityPct > 80 ? 'bg-red-500' : v.capacityPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${v.capacityPct}%` }} />
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{v.totalUsedGb} / {v.totalDiskSizeGb} GB across {v.disks.length} disks</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Queue Depth */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Avg Queue Depth by VM</h3>
                <div className="space-y-3">
                  {fleet.map((v) => (
                    <div key={v.vmName}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300">{v.vmName.replace('vm-diskmon-', '')}</span>
                        <span className={`font-mono font-bold ${v.avgQueueDepth > 32 ? 'text-red-400' : v.avgQueueDepth > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>{v.avgQueueDepth}</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full ${v.avgQueueDepth > 32 ? 'bg-red-500' : v.avgQueueDepth > 8 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (v.avgQueueDepth / 64) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* IOPS Consumed % */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">IOPS Consumed % (VM Cap)</h3>
                <div className="space-y-3">
                  {fleet.map((v) => (
                    <div key={v.vmName}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300">{v.vmName.replace('vm-diskmon-', '')}</span>
                        <span className={`font-mono font-bold ${v.iopsConsumedPct > 80 ? 'text-red-400' : v.iopsConsumedPct > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>{v.iopsConsumedPct}%</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-700 overflow-hidden">
                        <div className={`h-full rounded-full ${v.iopsConsumedPct > 80 ? 'bg-red-500' : v.iopsConsumedPct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${v.iopsConsumedPct}%` }} />
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{v.totalIops.toLocaleString()} of {v.maxIops.toLocaleString()} IOPS cap</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* All Disks Metrics Table */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">All Disk Metrics ({fleet.reduce((s, v) => s + v.disks.length, 0)} disks across {fleet.length} VMs)</h3>
                <span className="text-[10px] text-slate-500">Sorted by latency (highest first)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead><tr className="border-b border-slate-700 text-[9px] uppercase text-slate-500">
                    <th className="px-3 py-2">VM</th><th className="px-3 py-2">Disk</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">IOPS</th><th className="px-3 py-2">IOPS %</th><th className="px-3 py-2">MB/s</th><th className="px-3 py-2">BW %</th>
                    <th className="px-3 py-2">Read Lat</th><th className="px-3 py-2">Write Lat</th><th className="px-3 py-2">QD</th><th className="px-3 py-2">Used %</th>
                    <th className="px-3 py-2">Burst</th><th className="px-3 py-2">$/mo</th><th className="px-3 py-2">Health</th>
                  </tr></thead>
                  <tbody>
                    {fleet.flatMap((v) => v.disks.map((d) => ({ vm: v.vmName.replace('vm-diskmon-', ''), ...d }))).sort((a, b) => b.avgLatencyMs - a.avgLatencyMs).map((d) => (
                      <tr key={`${d.vm}-${d.diskName}`} className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer" onClick={() => { const vm = fleet.find((v) => v.vmName.includes(d.vm)); if (vm) navigate('disk', vm.vmName, d.diskName); }}>
                        <td className="px-3 py-2 text-slate-400">{d.vm}</td>
                        <td className="px-3 py-2 font-medium text-white text-[10px]">{d.diskName.replace(/^(osdisk-|disk-)/, '')}</td>
                        <td className="px-3 py-2"><span className="rounded-full px-1.5 py-0.5 text-[8px] font-medium" style={{ backgroundColor: `${DISK_COLORS[d.diskType] || '#64748b'}20`, color: DISK_COLORS[d.diskType] || '#94a3b8' }}>{d.diskType}</span></td>
                        <td className="px-3 py-2 text-slate-400">{d.diskSizeGb}G</td>
                        <td className="px-3 py-2 font-mono text-blue-400">{d.currentIops.toLocaleString()}</td>
                        <td className="px-3 py-2"><div className="flex items-center gap-1"><div className="h-1.5 w-10 rounded-full bg-slate-700"><div className={`h-full rounded-full ${d.iopsConsumedPct > 80 ? 'bg-red-500' : d.iopsConsumedPct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${d.iopsConsumedPct}%` }} /></div><span className="text-[9px] text-slate-500">{d.iopsConsumedPct}%</span></div></td>
                        <td className="px-3 py-2 font-mono text-purple-400">{d.currentThroughputMBs}</td>
                        <td className="px-3 py-2"><div className="flex items-center gap-1"><div className="h-1.5 w-10 rounded-full bg-slate-700"><div className={`h-full rounded-full ${d.bwConsumedPct > 80 ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${d.bwConsumedPct}%` }} /></div><span className="text-[9px] text-slate-500">{d.bwConsumedPct}%</span></div></td>
                        <td className={`px-3 py-2 font-mono ${d.readLatencyMs > 5 ? 'text-red-400' : d.readLatencyMs > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{d.readLatencyMs}ms</td>
                        <td className={`px-3 py-2 font-mono ${d.writeLatencyMs > 5 ? 'text-red-400' : d.writeLatencyMs > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{d.writeLatencyMs}ms</td>
                        <td className={`px-3 py-2 font-mono ${d.queueDepth > 32 ? 'text-red-400' : d.queueDepth > 8 ? 'text-amber-400' : 'text-slate-300'}`}>{d.queueDepth}</td>
                        <td className="px-3 py-2"><div className="flex items-center gap-1"><div className="h-1.5 w-8 rounded-full bg-slate-700"><div className={`h-full rounded-full ${d.usedPct > 80 ? 'bg-red-500' : d.usedPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${d.usedPct}%` }} /></div><span className="text-[9px] text-slate-500">{d.usedPct}%</span></div></td>
                        <td className="px-3 py-2">{d.burstCreditsRemaining > 0 ? <span className={`text-[9px] ${d.burstCreditsRemaining < 30 ? 'text-red-400' : 'text-blue-400'}`}>{d.burstCreditsRemaining}%</span> : <span className="text-[9px] text-slate-600">—</span>}</td>
                        <td className="px-3 py-2 font-mono text-amber-400">${d.monthlyCost}</td>
                        <td className="px-3 py-2"><span className={`h-2 w-2 inline-block rounded-full ${d.healthStatus === 'healthy' ? 'bg-emerald-400' : d.healthStatus === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Filters, Sorting & Fleet Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-500">Filter:</span>
              <select value={filterFamily} onChange={(e) => setFilterFamily(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none">
                <option value="all">All Families</option>
                {summary.vmFamilies.map((f) => <option key={f.name} value={f.name}>{f.name} ({f.count})</option>)}
              </select>
              <select value={filterHealth} onChange={(e) => setFilterHealth(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none">
                <option value="all">All Health</option>
                <option value="healthy">Healthy</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
              <span className="text-xs text-slate-500 ml-4">Sort:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none">
                <option value="healthScore">Health (worst first)</option>
                <option value="iops">IOPS (highest first)</option>
                <option value="latency">Latency (highest first)</option>
                <option value="cost">Cost (highest first)</option>
              </select>
              <span className="ml-auto text-xs text-slate-500">{filteredFleet.length} of {fleet.length} VMs</span>
              {/* Fleet-wide Start/Stop */}
              <div className="flex gap-2 ml-2">
                <button onClick={() => executeFleetAction('start')} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Start All
                </button>
                <button onClick={() => executeFleetAction('deallocate')} className="flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30 transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" /></svg>
                  Deallocate All
                </button>
              </div>
            </div>

            {/* Fleet action notifications */}
            {Object.entries(vmActions).length > 0 && (
              <div className="space-y-2">
                {Object.entries(vmActions).map(([vm, state]) => (
                  <div key={vm} className={`flex items-center gap-3 rounded-lg border px-4 py-2 text-xs ${state.status === 'running' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : state.status === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                    {state.status === 'running' && <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                    {state.status === 'success' && <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>}
                    <span className="font-semibold">{vm}</span>
                    <code className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300 flex-1">{state.message}</code>
                    <button onClick={() => { navigator.clipboard.writeText(state.message); }} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white transition-colors">Copy</button>
                  </div>
                ))}
              </div>
            )}

            {/* VM Cards — Click to Drill Down */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredFleet.map((vm) => (
                <button key={vm.vmName} onClick={() => navigate('vm', vm.vmName)} className="text-left rounded-xl border border-slate-700 bg-slate-800 p-5 transition-all hover:border-blue-500/50 hover:bg-slate-800/80 group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{vm.vmName}</h3>
                      <p className="text-[11px] text-slate-500">{vm.vmSku} &bull; {vm.osType} &bull; {vm.region}</p>
                    </div>
                    <HealthBadge status={vm.healthStatus} score={vm.healthScore} />
                  </div>
                  {/* Mini gauges row */}
                  <div className="flex justify-between gap-2 mb-3">
                    <MiniGauge value={vm.totalIops} max={vm.maxIops} label="IOPS" color={vm.iopsConsumedPct > 80 ? '#ef4444' : vm.iopsConsumedPct > 50 ? '#f59e0b' : '#22c55e'} />
                    <MiniGauge value={vm.totalThroughputMBs} max={vm.maxThroughputMBs} label="Throughput" color={vm.bwConsumedPct > 80 ? '#ef4444' : '#3b82f6'} unit="" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{vm.avgLatencyMs}</div>
                      <div className="text-[10px] text-slate-400">Avg Latency</div>
                      <div className="text-xs text-slate-500">ms</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-400">${Math.round(vm.monthlyCost)}</div>
                      <div className="text-[10px] text-slate-400">Monthly</div>
                      <div className="text-xs text-slate-500">{vm.disks.length} disks</div>
                    </div>
                  </div>
                  {/* Disk mini list */}
                  <div className="space-y-1">
                    {vm.disks.map((d) => (
                      <div key={d.diskName} className="flex items-center justify-between rounded bg-slate-700/30 px-2 py-1 text-[10px]">
                        <span className="text-slate-300 truncate max-w-[140px]">{d.diskName}</span>
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ backgroundColor: `${DISK_COLORS[d.diskType] || '#64748b'}20`, color: DISK_COLORS[d.diskType] || '#94a3b8' }}>{d.diskType}</span>
                        <span className="font-mono text-slate-400">{d.currentIops} IOPS</span>
                        <span className={`font-mono ${d.avgLatencyMs > 5 ? 'text-red-400' : d.avgLatencyMs > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{d.avgLatencyMs}ms</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-center text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to drill down →</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* LEVEL 2: VM DETAIL */}
        {/* ============================================================ */}
        {level === 'vm' && activeVM && (
          <>
            {/* VM Header Card */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{activeVM.vmName}</h2>
                  <p className="text-sm text-slate-400">{activeVM.vmSku} &bull; {activeVM.osType} &bull; {activeVM.region} &bull; {activeVM.resourceGroup}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(activeVM.tags).map(([k, v]) => (
                      <span key={k} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">{k}: <strong>{v}</strong></span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <HealthBadge status={activeVM.healthStatus} score={activeVM.healthScore} />
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${activeVM.powerState === 'Running' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600 text-slate-400'}`}>{activeVM.powerState}</span>
                </div>
              </div>
              {/* VM Power Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-700 pt-4">
                <span className="text-xs text-slate-500">VM Actions:</span>
                <button onClick={(e) => { e.stopPropagation(); executeVmAction(activeVM.vmName, 'start'); }}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-600/20 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Start VM
                </button>
                <button onClick={(e) => { e.stopPropagation(); executeVmAction(activeVM.vmName, 'stop'); }}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-600/20 px-4 py-2 text-xs font-medium text-amber-400 hover:bg-amber-600/30 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" /></svg>
                  Stop VM
                </button>
                <button onClick={(e) => { e.stopPropagation(); executeVmAction(activeVM.vmName, 'deallocate'); }}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-600/20 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-600/30 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" /></svg>
                  Deallocate
                </button>
                <div className="ml-auto text-[10px] text-slate-500">
                  Deallocate saves ~${Math.round(activeVM.monthlyCost - activeVM.disks.reduce((s, d) => s + d.monthlyCost, 0))}/mo compute cost
                </div>
              </div>
              {/* VM action notifications */}
              {vmActions[activeVM.vmName] && (
                <div className={`mt-3 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-xs ${vmActions[activeVM.vmName].status === 'running' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
                  <span className="font-semibold">Run this command:</span>
                  <code className="rounded bg-slate-800 px-3 py-1 font-mono text-[11px] text-slate-300 flex-1">{vmActions[activeVM.vmName].message}</code>
                  <button onClick={() => navigator.clipboard.writeText(vmActions[activeVM.vmName].message)} className="rounded bg-slate-700 px-2.5 py-1 text-[10px] text-slate-400 hover:text-white transition-colors">Copy</button>
                </div>
              )}
              {/* VM Gauges */}
              <div className="mt-5 flex flex-wrap justify-around gap-4">
                <MiniGauge value={activeVM.totalIops} max={activeVM.maxIops} label="IOPS Cap" color={activeVM.iopsConsumedPct > 80 ? '#ef4444' : '#3b82f6'} />
                <MiniGauge value={activeVM.totalThroughputMBs} max={activeVM.maxThroughputMBs} label="Throughput Cap" color={activeVM.bwConsumedPct > 80 ? '#ef4444' : '#22c55e'} unit=" MB/s" />
                <MiniGauge value={activeVM.totalUsedGb} max={activeVM.totalDiskSizeGb} label="Capacity" color={activeVM.capacityPct > 80 ? '#ef4444' : '#3b82f6'} unit=" GB" />
                <div className="text-center">
                  <div className={`text-3xl font-bold ${activeVM.avgLatencyMs > 5 ? 'text-red-400' : activeVM.avgLatencyMs > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{activeVM.avgLatencyMs}</div>
                  <div className="text-[10px] text-slate-400">Avg Latency (ms)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-300">{activeVM.avgQueueDepth}</div>
                  <div className="text-[10px] text-slate-400">Avg Queue Depth</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-400">${Math.round(activeVM.monthlyCost)}</div>
                  <div className="text-[10px] text-slate-400">Monthly Cost</div>
                </div>
              </div>
            </div>

            {/* All Disks on this VM */}
            <h3 className="text-lg font-bold text-white">Attached Disks ({activeVM.disks.length})</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeVM.disks.map((disk) => (
                <button key={disk.diskName} onClick={() => navigate('disk', activeVM.vmName, disk.diskName)} className="text-left rounded-xl border border-slate-700 bg-slate-800 p-5 transition-all hover:border-blue-500/50 group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{disk.diskName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${DISK_COLORS[disk.diskType] || '#64748b'}20`, color: DISK_COLORS[disk.diskType] || '#94a3b8' }}>{disk.diskType}</span>
                        <span className="text-[10px] text-slate-500">{disk.diskTier} &bull; {disk.diskSizeGb} GiB &bull; LUN {disk.lun === -1 ? 'OS' : disk.lun}</span>
                      </div>
                    </div>
                    <HealthBadge status={disk.healthStatus} score={disk.healthScore} />
                  </div>
                  {/* Disk Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="rounded-lg bg-slate-700/30 p-2 text-center">
                      <div className="text-lg font-bold font-mono text-blue-400">{disk.currentIops.toLocaleString()}</div>
                      <div className="text-[9px] text-slate-500">IOPS ({disk.iopsConsumedPct}%)</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-slate-700"><div className={`h-full rounded-full ${disk.iopsConsumedPct > 80 ? 'bg-red-500' : disk.iopsConsumedPct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${disk.iopsConsumedPct}%` }} /></div>
                    </div>
                    <div className="rounded-lg bg-slate-700/30 p-2 text-center">
                      <div className="text-lg font-bold font-mono text-purple-400">{disk.currentThroughputMBs}</div>
                      <div className="text-[9px] text-slate-500">MB/s ({disk.bwConsumedPct}%)</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-slate-700"><div className={`h-full rounded-full ${disk.bwConsumedPct > 80 ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${disk.bwConsumedPct}%` }} /></div>
                    </div>
                    <div className="rounded-lg bg-slate-700/30 p-2 text-center">
                      <div className={`text-lg font-bold font-mono ${disk.avgLatencyMs > 5 ? 'text-red-400' : disk.avgLatencyMs > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>{disk.avgLatencyMs}</div>
                      <div className="text-[9px] text-slate-500">Latency (ms)</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>QD: {disk.queueDepth}</span>
                    <span>Used: {disk.usedPct}%</span>
                    <span className="text-amber-400">${disk.monthlyCost}/mo</span>
                  </div>
                  <div className="mt-2 text-center text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Click for detailed metrics →</div>
                </button>
              ))}
            </div>

            {/* VM-Level IOPS Comparison Chart */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Disk Performance Comparison on {activeVM.vmName}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activeVM.disks.map((d) => ({ name: d.diskName.replace(/^(osdisk-|disk-)/, ''), iops: d.currentIops, throughput: d.currentThroughputMBs, latency: d.avgLatencyMs, type: d.diskType }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="left" dataKey="iops" name="IOPS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="latency" name="Latency (ms)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* LEVEL 3: DISK DETAIL */}
        {/* ============================================================ */}
        {level === 'disk' && activeVM && activeDisk && (
          <>
            {/* Disk Header */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">{activeDisk.diskName}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: `${DISK_COLORS[activeDisk.diskType] || '#64748b'}20`, color: DISK_COLORS[activeDisk.diskType] || '#94a3b8' }}>{activeDisk.diskType}</span>
                    <span className="text-xs text-slate-500">Tier: {activeDisk.diskTier} &bull; {activeDisk.diskSizeGb} GiB &bull; LUN {activeDisk.lun === -1 ? 'OS' : activeDisk.lun} &bull; Caching: {activeDisk.caching}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">VM: {activeVM.vmName} ({activeVM.vmSku})</p>
                </div>
                <div className="flex items-center gap-3">
                  <HealthBadge status={activeDisk.healthStatus} score={activeDisk.healthScore} />
                  <span className="text-lg font-bold text-amber-400">${activeDisk.monthlyCost}<span className="text-xs text-slate-500">/mo</span></span>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {[
                  { label: 'IOPS', value: activeDisk.currentIops.toLocaleString(), sub: `of ${activeDisk.provisionedIops.toLocaleString()}`, pct: activeDisk.iopsConsumedPct, color: 'text-blue-400' },
                  { label: 'Throughput', value: `${activeDisk.currentThroughputMBs}`, sub: `of ${activeDisk.provisionedThroughput} MB/s`, pct: activeDisk.bwConsumedPct, color: 'text-purple-400' },
                  { label: 'Read Latency', value: `${activeDisk.readLatencyMs}`, sub: 'ms', pct: 0, color: activeDisk.readLatencyMs > 5 ? 'text-red-400' : 'text-emerald-400' },
                  { label: 'Write Latency', value: `${activeDisk.writeLatencyMs}`, sub: 'ms', pct: 0, color: activeDisk.writeLatencyMs > 5 ? 'text-red-400' : 'text-emerald-400' },
                  { label: 'Queue Depth', value: `${activeDisk.queueDepth}`, sub: '', pct: 0, color: activeDisk.queueDepth > 32 ? 'text-red-400' : 'text-slate-300' },
                  { label: 'Used Space', value: `${activeDisk.usedPct}%`, sub: `${activeDisk.usedGb}/${activeDisk.diskSizeGb} GB`, pct: activeDisk.usedPct, color: activeDisk.usedPct > 80 ? 'text-red-400' : 'text-emerald-400' },
                  { label: 'Burst Credits', value: `${activeDisk.burstCreditsRemaining}%`, sub: '', pct: activeDisk.burstCreditsRemaining, color: activeDisk.burstCreditsRemaining < 20 ? 'text-red-400' : 'text-blue-400' },
                  { label: 'Cost', value: `$${activeDisk.monthlyCost}`, sub: '/month', pct: 0, color: 'text-amber-400' },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border border-slate-700 bg-slate-700/30 p-3 text-center">
                    <div className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</div>
                    <div className="text-[9px] text-slate-500">{m.sub}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{m.label}</div>
                    {m.pct > 0 && (
                      <div className="mt-1 h-1 w-full rounded-full bg-slate-600"><div className={`h-full rounded-full ${m.pct > 80 ? 'bg-red-500' : m.pct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, m.pct)}%` }} /></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Time Series Charts */}
            {diskTS.length > 0 && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* IOPS & Throughput */}
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">IOPS Over Time</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={diskTS}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 9 }} tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} minTickGap={40} />
                      <YAxis stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
                      <Area type="monotone" dataKey="iops" name="IOPS" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Throughput Over Time</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={diskTS}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 9 }} tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} minTickGap={40} />
                      <YAxis stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
                      <Area type="monotone" dataKey="throughputMBs" name="Throughput (MB/s)" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Latency */}
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Latency Over Time</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={diskTS}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 9 }} tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} minTickGap={40} />
                      <YAxis stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
                      <Area type="monotone" dataKey="latencyMs" name="Latency (ms)" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Queue Depth */}
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Queue Depth Over Time</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={diskTS}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 9 }} tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} minTickGap={40} />
                      <YAxis stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
                      <Area type="monotone" dataKey="queueDepth" name="Queue Depth" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Provisioned vs Actual */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Provisioned vs Current Performance</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { metric: 'IOPS', provisioned: activeDisk.provisionedIops, current: activeDisk.currentIops },
                  { metric: 'Throughput (MB/s)', provisioned: activeDisk.provisionedThroughput, current: activeDisk.currentThroughputMBs },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="provisioned" name="Provisioned (Max)" fill="#334155" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="current" name="Current Usage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {activeDisk.iopsConsumedPct < 40 && (
                <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-xs text-amber-200">This disk is only using <strong>{activeDisk.iopsConsumedPct}%</strong> of provisioned IOPS. Consider downgrading to a lower tier to save ~${Math.round(activeDisk.monthlyCost * 0.3)}/mo.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 py-3 text-center text-[10px] text-slate-500">
        Teranet Azure Disk Monitor &bull; Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105 &bull; Data refreshes on click
      </footer>
    </div>
  );
}
