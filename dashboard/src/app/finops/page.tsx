'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  AreaChart, Area,
} from 'recharts';

// ============================================================================
// Comprehensive FinOps Data — Covers ALL Azure services in this deployment
// All prices: PAYG (Pay-As-You-Go), East US 2, USD
// ============================================================================

const COST_CATEGORIES = [
  {
    id: 'compute',
    name: 'VM Compute',
    icon: '🖥️',
    color: '#3b82f6',
    count: 5,
    countLabel: 'Virtual Machines',
    monthlyCost: 1200,
    optimizedCost: 131,
    pricingModel: 'Pay-As-You-Go (per hour, billed per second)',
    riAvailable: true,
    riSavings: '~40% with 1-year RI, ~60% with 3-year RI',
    description: 'VM compute is the largest cost component. VMs are billed only when running — deallocating stops compute charges immediately while preserving all disk data.',
    recommendation: 'Schedule VMs to run only during active testing windows (estimated 80 hrs/mo). This single action reduces compute from $1,200 to $131/mo — a 89% reduction.',
    items: [
      { name: 'vm-diskmon-dsv5-01', sku: 'D4s_v5', role: 'General purpose baseline', hourly: 0.192, monthly: 140.16, riMonthly: 84, usage: 'Benchmark host for Premium SSD + Standard SSD comparison' },
      { name: 'vm-diskmon-dsv5-02', sku: 'D8s_v5', role: 'Scale-up comparison', hourly: 0.384, monthly: 280.32, riMonthly: 168, usage: 'Tests whether doubling vCPUs improves disk throughput' },
      { name: 'vm-diskmon-esv5-01', sku: 'E4s_v5', role: 'Memory-optimized', hourly: 0.252, monthly: 183.96, riMonthly: 110, usage: 'Host for Premium SSD v2 with custom IOPS' },
      { name: 'vm-diskmon-lsv3-01', sku: 'L8s_v3', role: 'Storage-optimized', hourly: 0.624, monthly: 455.52, riMonthly: 273, usage: 'Host for Ultra Disk — only SKU with 400K IOPS cap' },
      { name: 'vm-diskmon-dsv5-03', sku: 'D4s_v5', role: 'Windows comparison', hourly: 0.192, monthly: 140.16, riMonthly: 84, usage: 'DiskSpd benchmarks — Linux vs Windows comparison' },
    ],
  },
  {
    id: 'data-disks',
    name: 'Data Disks',
    icon: '💾',
    color: '#8b5cf6',
    count: 8,
    countLabel: 'Managed Data Disks',
    monthlyCost: 258,
    optimizedCost: 150,
    pricingModel: 'Pay-As-You-Go (billed 24/7 whether VM is on or off)',
    riAvailable: false,
    riSavings: 'Reserved Instances only available for P30+ tiers (1 TiB+). Our disks (P10-P20) do not qualify.',
    description: 'Data disks store application and benchmark data. They are billed continuously regardless of VM state. Each disk type has different pricing mechanics.',
    recommendation: 'Three actions: (1) Detach Ultra Disk when not benchmarking (-$91/mo), (2) Reduce PremSSD v2 to free baselines (-$30/mo), (3) Downgrade under-utilized P15 to P10 (-$10/mo).',
    items: [
      { name: 'disk-dsv5-01-premssd-256', sku: 'Premium SSD P15', role: 'OS: Benchmark target', hourly: 0, monthly: 19.71, riMonthly: 0, usage: 'Sequential and random I/O testing — 1,100 IOPS provisioned, avg utilization 64%' },
      { name: 'disk-dsv5-01-stdssd-256', sku: 'Standard SSD E15', role: 'Comparison: Budget SSD', hourly: 0, monthly: 15.36, riMonthly: 0, usage: 'Baseline comparison — same VM as Premium SSD to isolate disk type impact' },
      { name: 'disk-dsv5-02-premssd-512', sku: 'Premium SSD P20', role: 'Scale test: Larger tier', hourly: 0, monthly: 38.41, riMonthly: 0, usage: 'Tests IOPS scaling with disk size — 2,300 IOPS vs P15 1,100 IOPS' },
      { name: 'disk-dsv5-02-stdhdd-512', sku: 'Standard HDD S20', role: 'Comparison: Archive tier', hourly: 0, monthly: 10.24, riMonthly: 0, usage: 'Worst-case baseline — demonstrates latency impact of cheapest storage' },
      { name: 'disk-esv5-01-premssdv2-256', sku: 'Premium SSD v2', role: 'Custom IOPS testing', hourly: 0, monthly: 44.04, riMonthly: 0, usage: 'Demonstrates decoupled IOPS (5K) and throughput (200 MB/s) from capacity' },
      { name: 'disk-lsv3-01-ultra-256', sku: 'Ultra Disk', role: 'Maximum performance', hourly: 0, monthly: 91.07, riMonthly: 0, usage: 'Sub-millisecond latency testing — 10K IOPS, 400 MB/s. Charges 24/7 even when VM is off.' },
      { name: 'disk-lsv3-01-premssd-256', sku: 'Premium SSD P15', role: 'Comparison on same VM', hourly: 0, monthly: 19.71, riMonthly: 0, usage: 'Side-by-side comparison with Ultra Disk on the same L8s VM' },
      { name: 'disk-dsv5-03-premssd-256', sku: 'Premium SSD P15', role: 'Windows target', hourly: 0, monthly: 19.71, riMonthly: 0, usage: 'DiskSpd benchmark target on Windows Server 2022' },
    ],
  },
  {
    id: 'os-disks',
    name: 'OS Disks',
    icon: '💿',
    color: '#22c55e',
    count: 5,
    countLabel: 'OS Boot Disks',
    monthlyCost: 49,
    optimizedCost: 49,
    pricingModel: 'Pay-As-You-Go (P10 tier, always attached)',
    riAvailable: false,
    riSavings: 'P10 (128 GiB) does not qualify for Reserved Instances.',
    description: 'Every VM requires an OS disk for the operating system. P10 Premium SSD (128 GiB, 500 IOPS) is the standard choice — it provides sufficient performance for OS operations at the lowest Premium tier cost.',
    recommendation: 'No optimization needed. P10 at $9.86/mo per VM is already the optimal tier for OS disks. Downgrading to Standard SSD would save only $6/mo per disk but risks slower boot times and OS responsiveness.',
    items: [
      { name: 'osdisk-dsv5-01', sku: 'Premium SSD P10', role: 'Ubuntu 22.04 boot', hourly: 0, monthly: 9.86, riMonthly: 0, usage: 'OS disk — low I/O, adequate at P10 tier' },
      { name: 'osdisk-dsv5-02', sku: 'Premium SSD P10', role: 'Ubuntu 22.04 boot', hourly: 0, monthly: 9.86, riMonthly: 0, usage: 'OS disk' },
      { name: 'osdisk-esv5-01', sku: 'Premium SSD P10', role: 'Ubuntu 22.04 boot', hourly: 0, monthly: 9.86, riMonthly: 0, usage: 'OS disk' },
      { name: 'osdisk-lsv3-01', sku: 'Premium SSD P10', role: 'Ubuntu 22.04 boot', hourly: 0, monthly: 9.86, riMonthly: 0, usage: 'OS disk' },
      { name: 'osdisk-dsv5-03', sku: 'Premium SSD P10', role: 'Windows Server 2022', hourly: 0, monthly: 9.86, riMonthly: 0, usage: 'OS disk — Windows includes license cost in VM price' },
    ],
  },
  {
    id: 'logging',
    name: 'Logging & Monitoring',
    icon: '📊',
    color: '#f59e0b',
    count: 3,
    countLabel: 'Monitoring Services',
    monthlyCost: 50,
    optimizedCost: 20,
    pricingModel: 'Pay-As-You-Go (per GB ingested)',
    riAvailable: false,
    riSavings: 'Commitment tiers available at 100+ GB/day. Our usage (~5 GB/day) is below threshold.',
    description: 'Log Analytics ingests guest metrics (Perf table), platform metrics (AzureMetrics), and heartbeat data. Cost scales linearly with data volume. A daily cap prevents runaway ingestion during intensive benchmarks.',
    recommendation: 'Reduce daily ingestion cap from 5 GB to 1 GB during non-benchmark periods. This reduces monthly cost from ~$50 to ~$20. Raise cap only during active benchmark windows.',
    items: [
      { name: 'law-diskmon-poc-eastus2', sku: 'PerGB2018', role: 'Central telemetry store', hourly: 0, monthly: 40, riMonthly: 0, usage: 'Stores all 29 perf counters + 42 platform metrics from 5 VMs. Retention: 30 days.' },
      { name: 'dcr-diskmon-perf-poc', sku: 'Data Collection Rule', role: 'Collection configuration', hourly: 0, monthly: 0, riMonthly: 0, usage: 'Defines 29 counters at 60s interval. No cost — configuration resource only.' },
      { name: 'Diagnostic Settings (×5)', sku: 'AllMetrics export', role: 'Platform metric routing', hourly: 0, monthly: 10, riMonthly: 0, usage: 'Routes 42 platform metrics per VM to Log Analytics. Small ingestion cost.' },
    ],
  },
  {
    id: 'grafana',
    name: 'Grafana & Dashboards',
    icon: '📈',
    color: '#06b6d4',
    count: 2,
    countLabel: 'Dashboard Services',
    monthlyCost: 18,
    optimizedCost: 18,
    pricingModel: 'Fixed monthly (Standard tier)',
    riAvailable: false,
    riSavings: 'No RI available for these services.',
    description: 'Azure Managed Grafana provides Grafana-as-a-service with native Log Analytics integration. The Static Web App hosts the custom Next.js dashboard. Both are fixed-cost services.',
    recommendation: 'No optimization available. Both services are required for the monitoring platform and are already at their minimum tier. Combined cost of $18/mo is a small fraction of total spend.',
    items: [
      { name: 'grafana-diskmon-poc', sku: 'Standard', role: 'Secondary dashboard', hourly: 0, monthly: 9, riMonthly: 0, usage: 'Connects to Log Analytics via managed identity. Portal-native visualization.' },
      { name: 'swa-diskmon-poc', sku: 'Standard', role: 'Primary dashboard (this app)', hourly: 0, monthly: 9, riMonthly: 0, usage: 'Hosts 9-page Next.js dashboard. Global CDN. Automatic HTTPS.' },
    ],
  },
];

const TOTAL_CURRENT = COST_CATEGORIES.reduce((s, c) => s + c.monthlyCost, 0);
const TOTAL_OPTIMIZED = COST_CATEGORIES.reduce((s, c) => s + c.optimizedCost, 0);
const TOTAL_COMPONENTS = COST_CATEGORIES.reduce((s, c) => s + c.count, 0);

const SCENARIOS = [
  { name: 'Always On', vm: 1200, disk: 307, monitoring: 50, dashboards: 18, total: 1575 },
  { name: 'Business Hours\nOnly (80 hrs)', vm: 131, disk: 307, monitoring: 50, dashboards: 18, total: 506 },
  { name: 'VMs Off\n(Disks Only)', vm: 0, disk: 307, monitoring: 20, dashboards: 18, total: 345 },
  { name: 'Optimized\n(Ultra Detached)', vm: 0, disk: 216, monitoring: 20, dashboards: 18, total: 254 },
  { name: 'Minimum\nViable', vm: 0, disk: 120, monitoring: 10, dashboards: 18, total: 148 },
];

const TREND = [
  { month: 'Mo 1', current: 1575, optimized: 506 },
  { month: 'Mo 3', current: 4725, optimized: 1518 },
  { month: 'Mo 6', current: 9450, optimized: 3036 },
  { month: 'Mo 12', current: 18900, optimized: 6072 },
];

type FinTab = 'overview' | 'analysis' | 'scenarios' | 'roi';

export default function FinOpsPage() {
  const [tab, setTab] = useState<FinTab>('overview');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 transition-colors" title="Home">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white">Disk FinOps — Cost Intelligence</h1>
                <p className="text-[11px] text-slate-500">Financial Operations &bull; {TOTAL_COMPONENTS} Azure resources &bull; PAYG pricing &bull; East US 2</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">${TOTAL_CURRENT.toLocaleString()}<span className="text-sm text-slate-500">/mo</span></div>
              <div className="text-[10px] text-slate-500">Current PAYG monthly spend</div>
            </div>
          </div>
          {/* Disclaimer */}
          <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 flex items-start gap-2">
            <svg className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            <p className="text-[10px] text-amber-200/80"><strong>Disclaimer:</strong> Costs and recommendations shown are specific to this POC deployment ({TOTAL_COMPONENTS} resources in East US 2). Your production environment will vary based on resource count, region, enterprise agreements, and reserved instance commitments. All prices are <strong>Pay-As-You-Go (PAYG)</strong> retail rates from the Azure Retail Prices API. Verify at <a href="https://azure.microsoft.com/pricing/calculator/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">azure.microsoft.com/pricing</a>.</p>
          </div>
          <nav className="mt-3 flex gap-1">
            {([
              { key: 'overview' as FinTab, label: 'Cost Overview' },
              { key: 'analysis' as FinTab, label: 'Resource Analysis' },
              { key: 'scenarios' as FinTab, label: 'Savings Scenarios' },
              { key: 'roi' as FinTab, label: 'ROI Projection' },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">

        {/* ===== COST OVERVIEW ===== */}
        {tab === 'overview' && (<>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { label: 'Monthly Spend', value: `$${TOTAL_CURRENT.toLocaleString()}`, sub: `$${(TOTAL_CURRENT * 12).toLocaleString()}/yr`, color: 'border-amber-500/30 from-amber-500/10', textColor: 'text-amber-400' },
              { label: 'Optimized Spend', value: `$${TOTAL_OPTIMIZED}`, sub: `$${(TOTAL_OPTIMIZED * 12).toLocaleString()}/yr`, color: 'border-emerald-500/30 from-emerald-500/10', textColor: 'text-emerald-400' },
              { label: 'Monthly Savings', value: `$${TOTAL_CURRENT - TOTAL_OPTIMIZED}`, sub: `${Math.round((1 - TOTAL_OPTIMIZED / TOTAL_CURRENT) * 100)}% reduction`, color: 'border-blue-500/30 from-blue-500/10', textColor: 'text-blue-400' },
              { label: 'Azure Resources', value: TOTAL_COMPONENTS.toString(), sub: '5 service categories', color: 'border-purple-500/30 from-purple-500/10', textColor: 'text-purple-400' },
              { label: 'Daily Burn', value: `$${(TOTAL_CURRENT / 30).toFixed(0)}`, sub: `$${(TOTAL_OPTIMIZED / 30).toFixed(0)}/day optimized`, color: 'border-red-500/30 from-red-500/10', textColor: 'text-red-400' },
            ].map((kpi) => (
              <div key={kpi.label} className={`rounded-xl border bg-gradient-to-br to-transparent p-4 text-center ${kpi.color}`}>
                <div className={`text-2xl font-bold ${kpi.textColor}`}>{kpi.value}</div>
                <div className="text-xs text-slate-400 mt-1">{kpi.label}</div>
                <div className="text-[10px] text-slate-500">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Category Cards — clickable with expandable details */}
          <h3 className="text-lg font-bold text-white">Cost by Service Category — Click for Details</h3>
          <div className="space-y-3">
            {COST_CATEGORIES.map((cat) => {
              const isOpen = expandedCategory === cat.id;
              const savingsPossible = cat.monthlyCost - cat.optimizedCost;
              return (
                <div key={cat.id} className={`rounded-xl border overflow-hidden transition-all ${isOpen ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-700 hover:border-slate-600'}`}>
                  {/* Header — always visible */}
                  <button onClick={() => setExpandedCategory(isOpen ? null : cat.id)} className="w-full text-left px-5 py-4 bg-slate-800 hover:bg-slate-800/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{cat.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white">{cat.name}</h4>
                            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">{cat.count} {cat.countLabel}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{cat.pricingModel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">${cat.monthlyCost.toLocaleString()}<span className="text-xs text-slate-500">/mo</span></div>
                          {savingsPossible > 0 && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Save ${savingsPossible}/mo</span>}
                        </div>
                        <svg className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                      </div>
                    </div>
                    {/* Proportion bar */}
                    <div className="mt-3 h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(cat.monthlyCost / TOTAL_CURRENT) * 100}%`, backgroundColor: cat.color }} />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-slate-500">
                      <span>{Math.round((cat.monthlyCost / TOTAL_CURRENT) * 100)}% of total spend</span>
                      <span>${(cat.monthlyCost * 12).toLocaleString()}/year</span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-slate-700 px-5 py-5 bg-slate-800/50 space-y-4">
                      {/* Analysis */}
                      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                        <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Analysis</h5>
                        <p className="text-sm text-slate-300 leading-relaxed">{cat.description}</p>
                      </div>

                      {/* Recommendation */}
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                        <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Recommendation</h5>
                        <p className="text-sm text-slate-300 leading-relaxed">{cat.recommendation}</p>
                      </div>

                      {/* RI Info */}
                      <div className={`rounded-lg border p-3 ${cat.riAvailable ? 'bg-purple-500/10 border-purple-500/20' : 'bg-slate-700/30 border-slate-700'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${cat.riAvailable ? 'text-purple-400' : 'text-slate-500'}`}>
                            Reserved Instances: {cat.riAvailable ? 'Available' : 'Not Available'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{cat.riSavings}</p>
                      </div>

                      {/* Individual Resources */}
                      <div>
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Individual Resources ({cat.items.length})</h5>
                        <div className="space-y-2">
                          {cat.items.map((item) => (
                            <div key={item.name} className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="text-sm font-medium text-white">{item.name}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[9px] font-mono text-slate-300">{item.sku}</span>
                                    <span className="text-[10px] text-slate-500">{item.role}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-bold font-mono text-amber-400">${item.monthly.toFixed(2)}<span className="text-[9px] text-slate-500">/mo</span></span>
                                  {item.hourly > 0 && <div className="text-[9px] text-slate-500">${item.hourly}/hr</div>}
                                  {item.riMonthly > 0 && <div className="text-[9px] text-purple-400">RI: ${item.riMonthly}/mo</div>}
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">{item.usage}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current vs Optimized chart */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Current vs Optimized Monthly Cost by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={COST_CATEGORIES.map((c) => ({ name: c.name, current: c.monthlyCost, optimized: c.optimizedCost }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#e2e8f0', fontSize: 11 }} width={130} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => `$${v}/mo`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="current" name="Current (PAYG)" fill="#ef4444" fillOpacity={0.6} radius={[0, 4, 4, 0]} />
                <Bar dataKey="optimized" name="Optimized" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>)}

        {/* ===== RESOURCE ANALYSIS ===== */}
        {tab === 'analysis' && (<>
          <h2 className="text-xl font-bold text-white">Disk Use Cases &amp; Cost Impact</h2>
          <p className="text-sm text-slate-400">Understanding why each disk exists helps determine whether its cost is justified. Click each card for usage details.</p>

          {/* OS vs Data Disk Explanation */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">💿</span>
                <div>
                  <h3 className="text-base font-bold text-white">OS Disks (5 disks — $49/mo)</h3>
                  <span className="text-[10px] text-emerald-400">Required — cannot be removed</span>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-3">Every VM must have an OS disk. It stores the operating system, system files, and boot configuration. OS disks see low I/O during normal operation — most activity happens at boot time and during OS updates.</p>
              <div className="rounded-lg bg-slate-800 p-3 space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between"><span>Tier used</span><span className="text-white">P10 Premium SSD (128 GiB)</span></div>
                <div className="flex justify-between"><span>IOPS needed</span><span className="text-white">100-300 (low)</span></div>
                <div className="flex justify-between"><span>Cost per disk</span><span className="text-amber-400">$9.86/mo</span></div>
                <div className="flex justify-between"><span>Optimization potential</span><span className="text-emerald-400">None — already optimal</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">💾</span>
                <div>
                  <h3 className="text-base font-bold text-white">Data Disks (8 disks — $258/mo)</h3>
                  <span className="text-[10px] text-purple-400">Optimization target — $108/mo potential savings</span>
                </div>
              </div>
              <p className="text-sm text-slate-300 mb-3">Data disks store application data and serve as benchmark targets. They are the primary cost optimization target because their performance tier can be adjusted based on actual measured utilization.</p>
              <div className="rounded-lg bg-slate-800 p-3 space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between"><span>Types deployed</span><span className="text-white">5 different types for comparison</span></div>
                <div className="flex justify-between"><span>Most expensive</span><span className="text-red-400">Ultra Disk $91.07/mo (35% of disk cost)</span></div>
                <div className="flex justify-between"><span>Always-on billing</span><span className="text-amber-400">Yes — charges even when VM is off</span></div>
                <div className="flex justify-between"><span>RI eligible</span><span className="text-slate-500">No (requires P30+ / 1 TiB+)</span></div>
              </div>
            </div>
          </div>

          {/* Metric-driven optimization rules */}
          <h3 className="text-lg font-bold text-white mt-4">How Metrics Drive Cost Decisions</h3>
          <div className="space-y-3">
            {[
              { metric: 'IOPS Consumed %', trigger: 'Below 50% for 7+ days', signal: 'Over-provisioned IOPS', action: 'Downgrade disk tier or reduce PremV2/Ultra IOPS allocation', impact: '$150 — $550/yr', icon: '📉' },
              { metric: 'Bandwidth Consumed %', trigger: 'Below 30% for 7+ days', signal: 'Throughput over-provisioned', action: 'Reduce PremV2 throughput to 125 MB/s free baseline', impact: '$240 — $360/yr', icon: '📊' },
              { metric: 'VM Power State', trigger: 'Running outside business hours', signal: 'Idle compute charges', action: 'Auto-deallocate on schedule (Azure Automation or Logic App)', impact: '$8,000 — $12,000/yr', icon: '⏰' },
              { metric: 'Queue Depth', trigger: 'Consistently below 2', signal: 'Disk barely utilized', action: 'Consider downgrade to cheaper tier', impact: '$100 — $300/yr', icon: '📋' },
              { metric: 'Burst Credits', trigger: 'Never drops below 80%', signal: 'Burst capacity never needed', action: 'A smaller disk tier with burst may be sufficient', impact: '$100 — $200/yr', icon: '⚡' },
              { metric: 'Disk Capacity Used', trigger: 'Below 30%', signal: 'Paying for unused GiB', action: 'Use PremSSD v2 (pays per GiB) instead of fixed-tier PremSSD', impact: '$50 — $200/yr', icon: '📦' },
            ].map((rule) => (
              <div key={rule.metric} className="rounded-xl border border-slate-700 bg-slate-800 p-4 grid grid-cols-1 sm:grid-cols-6 gap-3 items-center">
                <div className="flex items-center gap-2"><span className="text-xl">{rule.icon}</span><div><div className="text-sm font-bold text-white">{rule.metric}</div><div className="text-[10px] text-slate-500">Azure Monitor metric</div></div></div>
                <div><div className="text-[9px] text-amber-400 font-bold uppercase">Trigger</div><div className="text-xs text-slate-300">{rule.trigger}</div></div>
                <div><div className="text-[9px] text-red-400 font-bold uppercase">Signal</div><div className="text-xs text-slate-300">{rule.signal}</div></div>
                <div className="sm:col-span-2"><div className="text-[9px] text-emerald-400 font-bold uppercase">Recommended Action</div><div className="text-xs text-slate-300">{rule.action}</div></div>
                <div className="text-right"><div className="text-lg font-bold text-amber-400">{rule.impact}</div><div className="text-[9px] text-slate-500">annual savings</div></div>
              </div>
            ))}
          </div>

          {/* RI Research */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
            <h3 className="text-base font-bold text-purple-400 mb-2">Reserved Instances (RI) Assessment</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">We investigated Azure Reserved Instances for all resource types in this deployment. Here are the findings:</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <h4 className="text-sm font-bold text-emerald-400">VMs — RI Recommended</h4>
                <p className="text-xs text-slate-300 mt-1">1-year RI saves ~40%, 3-year saves ~60% on VM compute. For the L8s_v3 alone, 1-year RI would reduce cost from $456/mo to ~$273/mo (saving $183/mo). However, RIs require commitment — not ideal for a POC that may be decommissioned.</p>
              </div>
              <div className="rounded-lg border border-slate-600 bg-slate-800 p-4">
                <h4 className="text-sm font-bold text-slate-400">Disks — RI Not Applicable</h4>
                <p className="text-xs text-slate-300 mt-1">Disk reservations are only available for P30+ tiers (1 TiB and above). All our disks are P10-P20 (128-512 GiB) — below the threshold. Additionally, Azure Retail Prices API shows P30 1-year RI at $1,401/yr vs PAYG at $922/yr — meaning RI is actually more expensive for P30.</p>
              </div>
              <div className="rounded-lg border border-slate-600 bg-slate-800 p-4">
                <h4 className="text-sm font-bold text-slate-400">Log Analytics — Commitment Tiers</h4>
                <p className="text-xs text-slate-300 mt-1">Commitment tiers start at 100 GB/day with ~15% savings. Our ingestion is ~5 GB/day — far below the threshold. PAYG remains the most cost-effective option at our scale.</p>
              </div>
              <div className="rounded-lg border border-slate-600 bg-slate-800 p-4">
                <h4 className="text-sm font-bold text-slate-400">Grafana &amp; SWA — No RI</h4>
                <p className="text-xs text-slate-300 mt-1">Azure Managed Grafana and Static Web Apps do not offer reserved pricing. Both are already at their Standard tier minimum ($9/mo each).</p>
              </div>
            </div>
          </div>
        </>)}

        {/* ===== SCENARIOS ===== */}
        {tab === 'scenarios' && (<>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Monthly Cost by Operating Scenario (PAYG)</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={SCENARIOS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={0} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number) => `$${v}`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="vm" name="VM Compute" stackId="a" fill="#3b82f6" />
                <Bar dataKey="disk" name="Disk Storage" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="monitoring" name="Logging & Monitoring" stackId="a" fill="#f59e0b" />
                <Bar dataKey="dashboards" name="Dashboards" stackId="a" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            {SCENARIOS.map((s, i) => (
              <div key={s.name} className={`rounded-xl border p-5 text-center ${i === 1 ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20 scale-105' : 'border-slate-700 bg-slate-800'}`}>
                {i === 1 && <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Recommended</div>}
                <div className="text-[11px] text-slate-400 whitespace-pre-line leading-tight mb-2">{s.name}</div>
                <div className="text-2xl font-bold text-white">${s.total.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">/month (PAYG)</div>
                {i > 0 && <div className="mt-2 text-[10px] text-emerald-400">Saves ${(SCENARIOS[0].total - s.total).toLocaleString()}/mo</div>}
              </div>
            ))}
          </div>
        </>)}

        {/* ===== ROI ===== */}
        {tab === 'roi' && (<>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-emerald-400">${((TOTAL_CURRENT - 506) * 12).toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">Annual Savings</div>
              <div className="text-[10px] text-slate-500">Scheduled operations</div>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-blue-400">${(108 * 12)}</div>
              <div className="text-xs text-slate-400 mt-1">Disk Right-Sizing</div>
              <div className="text-[10px] text-slate-500">Annual savings from metrics</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-amber-400">$0</div>
              <div className="text-xs text-slate-400 mt-1">Platform Cost</div>
              <div className="text-[10px] text-slate-500">Dashboard + AI Advisor</div>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-purple-400">&infin;</div>
              <div className="text-xs text-slate-400 mt-1">ROI</div>
              <div className="text-[10px] text-slate-500">Free tool, immediate savings</div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Cumulative Spend: Current PAYG vs Optimized</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="current" name="Current PAYG" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="optimized" name="Optimized" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 text-center text-sm text-slate-400">
              12-month projection: <span className="text-red-400 font-bold">$18,900</span> (current) vs <span className="text-emerald-400 font-bold">$6,072</span> (optimized) = <span className="text-white font-bold">$12,828 saved</span>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <h3 className="text-base font-bold text-emerald-400 mb-2">Executive Summary</h3>
            <p className="text-sm text-slate-300 leading-relaxed">This monitoring platform analyzes {TOTAL_COMPONENTS} Azure resources across 5 service categories. Based on actual performance metrics (IOPS utilization, throughput consumed, queue depth), it identifies <strong className="text-white">$12,828 in annual savings</strong> through scheduling VM operations and right-sizing disk tiers. These recommendations are specific to this deployment — production environments with different resource counts, regions, and enterprise agreements will produce different results. All prices shown are Pay-As-You-Go (PAYG) retail rates.</p>
          </div>
        </>)}
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Disk FinOps — Cost Intelligence &bull; {TOTAL_COMPONENTS} resources &bull; PAYG pricing &bull; East US 2 &bull; Recommendations specific to this deployment
      </footer>
    </div>
  );
}
