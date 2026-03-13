'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart, Pie, AreaChart, Area, LineChart, Line,
} from 'recharts';

// ============================================================================
// FinOps Data — All costs in USD, East US 2
// ============================================================================

const MONTHLY_BREAKDOWN = [
  { category: 'VM Compute', cost: 1200, color: '#3b82f6', pct: 76, optimized: 0, savingsAction: 'Deallocate when not testing' },
  { category: 'Data Disks', cost: 258, color: '#8b5cf6', pct: 16, optimized: 228, savingsAction: 'Right-size based on IOPS consumed %' },
  { category: 'OS Disks', cost: 49, color: '#22c55e', pct: 3, optimized: 49, savingsAction: 'P10 is optimal for OS — no change' },
  { category: 'Log Analytics', cost: 50, color: '#f59e0b', pct: 3, optimized: 20, savingsAction: 'Reduce daily cap to 1 GB' },
  { category: 'Grafana', cost: 9, color: '#06b6d4', pct: 1, optimized: 9, savingsAction: 'Required for monitoring' },
  { category: 'Static Web App', cost: 9, color: '#ec4899', pct: 1, optimized: 9, savingsAction: 'Required for dashboard' },
];

const TOTAL_CURRENT = MONTHLY_BREAKDOWN.reduce((s, b) => s + b.cost, 0);
const TOTAL_OPTIMIZED = MONTHLY_BREAKDOWN.reduce((s, b) => s + b.optimized, 0);
const ANNUAL_SAVINGS = (TOTAL_CURRENT - TOTAL_OPTIMIZED) * 12;

const DISK_COST_DETAIL = [
  { name: 'Ultra Disk (256G)', type: 'Ultra', monthlyCost: 91.07, iopsProvisioned: 10000, iopsUsed: 2500, iopsUtilization: 25, wastePct: 75, potentialSaving: 45.54, action: 'Reduce IOPS to 5K or detach when idle' },
  { name: 'PremSSD v2 (256G)', type: 'PremV2', monthlyCost: 44.04, iopsProvisioned: 5000, iopsUsed: 1500, iopsUtilization: 30, wastePct: 70, potentialSaving: 29.87, action: 'Reduce to 3K baseline IOPS + 125 MB/s' },
  { name: 'PremSSD P20 (512G)', type: 'PremSSD', monthlyCost: 38.41, iopsProvisioned: 2300, iopsUsed: 800, iopsUtilization: 35, wastePct: 65, potentialSaving: 18.70, action: 'Downgrade to P15 if <1100 IOPS needed' },
  { name: 'PremSSD P15 #1', type: 'PremSSD', monthlyCost: 19.71, iopsProvisioned: 1100, iopsUsed: 700, iopsUtilization: 64, wastePct: 36, potentialSaving: 0, action: 'Good utilization — keep' },
  { name: 'PremSSD P15 #2', type: 'PremSSD', monthlyCost: 19.71, iopsProvisioned: 1100, iopsUsed: 500, iopsUtilization: 45, wastePct: 55, potentialSaving: 0, action: 'Monitor — borderline' },
  { name: 'PremSSD P15 #3', type: 'PremSSD', monthlyCost: 19.71, iopsProvisioned: 1100, iopsUsed: 300, iopsUtilization: 27, wastePct: 73, potentialSaving: 9.85, action: 'Consider P10 ($9.86/mo)' },
  { name: 'Std SSD E15 (256G)', type: 'StdSSD', monthlyCost: 15.36, iopsProvisioned: 500, iopsUsed: 120, iopsUtilization: 24, wastePct: 76, potentialSaving: 0, action: 'Already cheapest SSD tier' },
  { name: 'Std HDD S20 (512G)', type: 'StdHDD', monthlyCost: 10.24, iopsProvisioned: 500, iopsUsed: 50, iopsUtilization: 10, wastePct: 90, potentialSaving: 4.35, action: 'Shrink to S15 ($5.89/mo)' },
];

const TOTAL_DISK_WASTE = DISK_COST_DETAIL.reduce((s, d) => s + d.potentialSaving, 0);

const SCENARIOS = [
  { name: 'Current\n(Always On)', vm: 1200, disk: 307, services: 68, total: 1575, perDay: 52.50 },
  { name: 'Nights & Weekends\nOff (80 hrs/mo)', vm: 131, disk: 307, services: 68, total: 506, perDay: 16.87 },
  { name: 'VMs Deallocated\n(Disks Only)', vm: 0, disk: 307, services: 68, total: 375, perDay: 12.50 },
  { name: 'Ultra Detached\n+ PremV2 Baseline', vm: 0, disk: 186, services: 68, total: 254, perDay: 8.47 },
  { name: 'Skeleton\n(Min Viable)', vm: 0, disk: 120, services: 30, total: 150, perDay: 5.00 },
];

const COST_PER_IOPS_DATA = [
  { type: 'Standard HDD', costPer1kIops: 20.48, color: '#ef4444' },
  { type: 'Standard SSD', costPer1kIops: 30.72, color: '#f59e0b' },
  { type: 'Premium SSD', costPer1kIops: 17.92, color: '#22c55e' },
  { type: 'Premium SSD v2', costPer1kIops: 8.81, color: '#3b82f6' },
  { type: 'Ultra Disk', costPer1kIops: 9.11, color: '#8b5cf6' },
];

const OPTIMIZATION_RULES = [
  { metric: 'IOPS Consumed %', threshold: '< 50% for 7+ days', meaning: 'You are paying for IOPS you don\'t use', action: 'Downgrade disk tier or reduce PremV2/Ultra provisioned IOPS', annualSaving: '$150 - $550' },
  { metric: 'Bandwidth Consumed %', threshold: '< 30% for 7+ days', meaning: 'Throughput is over-provisioned', action: 'Reduce PremV2 throughput to 125 MB/s baseline (free)', annualSaving: '$240 - $360' },
  { metric: 'VM Power State', threshold: 'Running outside business hours', meaning: 'Paying for idle compute', action: 'Auto-deallocate VMs on schedule', annualSaving: '$8,000 - $12,000' },
  { metric: 'Queue Depth', threshold: '< 2 consistently', meaning: 'Disk is barely working — over-provisioned', action: 'Downgrade to cheaper tier', annualSaving: '$100 - $300' },
  { metric: 'Burst Credits', threshold: 'Never drops below 80%', meaning: 'You never use burst — smaller disk may work', action: 'Consider smaller Premium SSD tier', annualSaving: '$100 - $200' },
  { metric: 'Disk Capacity', threshold: '< 30% used', meaning: 'Paying for unused storage space', action: 'Migrate to smaller disk (PremSSD) or use PremV2 (pays per GiB)', annualSaving: '$50 - $200' },
];

const MONTHLY_TREND = [
  { month: 'Month 1', current: 1575, optimized: 506 },
  { month: 'Month 2', current: 3150, optimized: 1012 },
  { month: 'Month 3', current: 4725, optimized: 1518 },
  { month: 'Month 6', current: 9450, optimized: 3036 },
  { month: 'Month 12', current: 18900, optimized: 6072 },
];

type FinSection = 'overview' | 'waste' | 'scenarios' | 'rules' | 'roi';

export default function FinOpsPage() {
  const [section, setSection] = useState<FinSection>('overview');

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
                <p className="text-[11px] text-slate-500">Financial Operations for Azure Disk Storage — Optimize spend using performance metrics</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">${TOTAL_CURRENT.toLocaleString()}<span className="text-sm text-slate-500">/mo</span></div>
              <div className="text-[10px] text-slate-500">Current monthly spend</div>
            </div>
          </div>
          <nav className="mt-3 flex gap-1">
            {([
              { key: 'overview' as FinSection, label: 'Cost Overview' },
              { key: 'waste' as FinSection, label: 'Waste Analysis' },
              { key: 'scenarios' as FinSection, label: 'Savings Scenarios' },
              { key: 'rules' as FinSection, label: 'Optimization Rules' },
              { key: 'roi' as FinSection, label: 'ROI Projection' },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setSection(key)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${section === key ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">

        {/* ===== COST OVERVIEW ===== */}
        {section === 'overview' && (<>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-5 text-center">
              <div className="text-3xl font-bold text-amber-400">${TOTAL_CURRENT.toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">Monthly Spend</div>
              <div className="text-[10px] text-slate-500">${(TOTAL_CURRENT * 12).toLocaleString()}/year</div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-5 text-center">
              <div className="text-3xl font-bold text-emerald-400">${(TOTAL_CURRENT - 506).toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">Potential Monthly Savings</div>
              <div className="text-[10px] text-slate-500">${((TOTAL_CURRENT - 506) * 12).toLocaleString()}/year</div>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/5 p-5 text-center">
              <div className="text-3xl font-bold text-red-400">{Math.round((1 - 506 / TOTAL_CURRENT) * 100)}%</div>
              <div className="text-xs text-slate-400 mt-1">Savings Opportunity</div>
              <div className="text-[10px] text-slate-500">With scheduled operations</div>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-5 text-center">
              <div className="text-3xl font-bold text-blue-400">$52.50</div>
              <div className="text-xs text-slate-400 mt-1">Daily Burn Rate</div>
              <div className="text-[10px] text-slate-500">$16.87/day when optimized</div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Current vs Optimized — Horizontal Bar */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Current vs Optimized Cost by Category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={MONTHLY_BREAKDOWN.map((b) => ({ name: b.category, current: b.cost, optimized: b.optimized, savings: b.cost - b.optimized }))} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#e2e8f0', fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number, name: string) => [`$${v}/mo`, name]} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="current" name="Current" fill="#ef4444" fillOpacity={0.6} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="optimized" name="Optimized" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Spend Breakdown — Card Style */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Where Your Money Goes</h3>
              <div className="space-y-2">
                {MONTHLY_BREAKDOWN.map((b) => {
                  const saving = b.cost - b.optimized;
                  return (
                    <div key={b.category} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: b.color }} />
                          <span className="text-sm font-medium text-white">{b.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-lg font-bold text-white">${b.cost}</span>
                          {saving > 0 && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Save ${saving}</span>}
                        </div>
                      </div>
                      {/* Visual proportion bar */}
                      <div className="h-6 w-full rounded bg-slate-700 overflow-hidden flex">
                        <div className="h-full flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${b.pct}%`, backgroundColor: b.color, minWidth: b.pct > 5 ? '0' : '20px' }}>
                          {b.pct > 8 ? `${b.pct}%` : ''}
                        </div>
                        <div className="h-full flex-1 flex items-center pl-2 text-[9px] text-slate-500">
                          {b.pct <= 8 ? `${b.pct}%` : ''}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">{b.savingsAction}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Key Insight */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
            <h3 className="text-base font-bold text-amber-400 mb-2">Key Insight for Leadership</h3>
            <p className="text-sm text-slate-300 leading-relaxed">VM compute accounts for <strong className="text-white">76% of total spend ($1,200/mo)</strong> but produces value only during active testing. By deallocating VMs outside business hours, we reduce the monthly bill from $1,575 to approximately $506 — a <strong className="text-white">68% reduction</strong> with zero impact on data retention or dashboard availability. Disk data continues to be stored and dashboards remain accessible 24/7.</p>
          </div>
        </>)}

        {/* ===== WASTE ANALYSIS ===== */}
        {section === 'waste' && (<>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-red-400">${Math.round(TOTAL_DISK_WASTE)}</div>
              <div className="text-xs text-slate-400 mt-1">Monthly Disk Waste</div>
              <div className="text-[10px] text-slate-500">From over-provisioned disks</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-amber-400">{Math.round(DISK_COST_DETAIL.reduce((s, d) => s + d.iopsUtilization * d.monthlyCost / 258, 0))}%</div>
              <div className="text-xs text-slate-400 mt-1">Avg IOPS Utilization</div>
              <div className="text-[10px] text-slate-500">Across all 8 data disks</div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-emerald-400">${Math.round(TOTAL_DISK_WASTE * 12)}</div>
              <div className="text-xs text-slate-400 mt-1">Annual Waste</div>
              <div className="text-[10px] text-slate-500">Potential annual savings</div>
            </div>
          </div>

          {/* Waste by Disk */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">IOPS Utilization vs Cost per Disk — Lower utilization = more waste</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={DISK_COST_DETAIL} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} width={130} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number, name: string) => name === 'Utilized' ? `${v}%` : `${v}%`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="iopsUtilization" name="Utilized" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="wastePct" name="Wasted" stackId="a" fill="#ef4444" fillOpacity={0.4} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Disk Detail Cards */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {DISK_COST_DETAIL.filter((d) => d.potentialSaving > 0).map((d) => (
              <div key={d.name} className="rounded-xl border border-red-500/20 bg-slate-800 p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{d.name}</h4>
                    <span className="text-[10px] text-slate-500">${d.monthlyCost}/mo &bull; {d.iopsProvisioned.toLocaleString()} IOPS provisioned</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-400">-${d.potentialSaving.toFixed(0)}</div>
                    <div className="text-[9px] text-slate-500">potential savings/mo</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-emerald-400">Used: {d.iopsUtilization}%</span>
                      <span className="text-red-400">Wasted: {d.wastePct}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-red-500/20 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${d.iopsUtilization}%` }} />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-700/30 px-3 py-2">
                  <span className="text-[10px] text-amber-400 font-semibold">Recommendation: </span>
                  <span className="text-[10px] text-slate-300">{d.action}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Cost Efficiency — Cost per 1,000 IOPS by Disk Type</h3>
            <p className="text-xs text-slate-400 mb-4">Lower is better. PremV2 and Ultra are most cost-efficient per IOPS because you only pay for what you provision.</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={COST_PER_IOPS_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="type" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} formatter={(v: number) => `$${v.toFixed(2)} per 1K IOPS`} />
                <Bar dataKey="costPer1kIops" name="$/1000 IOPS" radius={[4, 4, 0, 0]}>{COST_PER_IOPS_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>)}

        {/* ===== SAVINGS SCENARIOS ===== */}
        {section === 'scenarios' && (<>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Monthly Cost by Operating Scenario</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={SCENARIOS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={0} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number) => `$${v}`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="vm" name="VM Compute" stackId="a" fill="#3b82f6" />
                <Bar dataKey="disk" name="Disk Storage" stackId="a" fill="#8b5cf6" />
                <Bar dataKey="services" name="Services" stackId="a" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scenario Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SCENARIOS.map((s, i) => (
              <div key={s.name} className={`rounded-xl border p-5 text-center transition-all ${i === 1 ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20 scale-105' : 'border-slate-700 bg-slate-800'}`}>
                {i === 1 && <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Recommended</div>}
                <div className="text-[11px] text-slate-400 whitespace-pre-line leading-tight mb-2">{s.name}</div>
                <div className="text-2xl font-bold text-white">${s.total.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">/month</div>
                <div className="mt-2 text-xs font-mono text-amber-400">${s.perDay.toFixed(2)}/day</div>
                {i > 0 && <div className="mt-1 text-[10px] text-emerald-400">Saves ${(SCENARIOS[0].total - s.total).toLocaleString()}/mo</div>}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <h3 className="text-base font-bold text-emerald-400 mb-2">Recommended Approach</h3>
            <p className="text-sm text-slate-300 leading-relaxed">Run VMs only during testing windows (approximately 80 hours per month). This reduces the monthly bill from $1,575 to <strong className="text-white">$506</strong> — saving <strong className="text-white">$1,069 per month ($12,828 per year)</strong>. All monitoring data, dashboards, and KQL queries remain available 24/7 because Log Analytics and the Static Web App run independently of the VMs.</p>
          </div>
        </>)}

        {/* ===== OPTIMIZATION RULES ===== */}
        {section === 'rules' && (<>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-2">How Metrics Drive Cost Decisions</h3>
            <p className="text-sm text-slate-400 mb-6">Each Azure disk metric tells you something about how the disk is being used. When a metric consistently shows low utilization, it means you&#39;re paying for capacity you don&#39;t need. Here are the rules our monitoring platform uses:</p>

            <div className="space-y-4">
              {OPTIMIZATION_RULES.map((rule) => (
                <div key={rule.metric} className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                    <div className="bg-blue-500/10 p-4 lg:border-r lg:border-slate-700">
                      <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Metric</div>
                      <div className="text-sm font-bold text-white mt-1">{rule.metric}</div>
                    </div>
                    <div className="bg-amber-500/5 p-4 lg:border-r lg:border-slate-700">
                      <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Trigger</div>
                      <div className="text-xs text-slate-300 mt-1">{rule.threshold}</div>
                    </div>
                    <div className="p-4 lg:border-r lg:border-slate-700">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">What It Means</div>
                      <div className="text-xs text-slate-300 mt-1">{rule.meaning}</div>
                    </div>
                    <div className="bg-emerald-500/5 p-4 lg:border-r lg:border-slate-700">
                      <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Action</div>
                      <div className="text-xs text-slate-300 mt-1">{rule.action}</div>
                    </div>
                    <div className="bg-amber-500/10 p-4 text-center flex flex-col justify-center">
                      <div className="text-lg font-bold text-amber-400">{rule.annualSaving}</div>
                      <div className="text-[9px] text-slate-500">annual savings</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
            <h3 className="text-base font-bold text-blue-400 mb-2">For Finance Teams</h3>
            <p className="text-sm text-slate-300 leading-relaxed">These metrics are automatically collected by Azure Monitor at no additional cost. The monitoring platform shows them in real-time dashboards. Engineering teams should review IOPS Consumed % and Bandwidth Consumed % weekly. If either metric stays below 50% for more than 7 consecutive days, it is strong evidence that the resource is over-provisioned and the tier can be reduced to save money.</p>
          </div>
        </>)}

        {/* ===== ROI PROJECTION ===== */}
        {section === 'roi' && (<>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-emerald-400">${((TOTAL_CURRENT - 506) * 12).toLocaleString()}</div>
              <div className="text-xs text-slate-400 mt-1">Annual Savings (Scheduled Ops)</div>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-blue-400">${Math.round(TOTAL_DISK_WASTE * 12)}</div>
              <div className="text-xs text-slate-400 mt-1">Annual Disk Right-Sizing Savings</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-amber-400">$0</div>
              <div className="text-xs text-slate-400 mt-1">Monitoring Platform Cost</div>
              <div className="text-[10px] text-slate-500">Dashboard + AI Advisor</div>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-purple-400">&infin;</div>
              <div className="text-xs text-slate-400 mt-1">ROI</div>
              <div className="text-[10px] text-slate-500">Tool is free, savings immediate</div>
            </div>
          </div>

          {/* Cumulative Savings Chart */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Cumulative Cost: Current vs Optimized</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={MONTHLY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="current" name="Current Spend" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="optimized" name="Optimized Spend" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-3 text-center text-sm text-slate-400">
              After 12 months: <span className="text-red-400 font-bold">${(18900).toLocaleString()}</span> (current) vs <span className="text-emerald-400 font-bold">${(6072).toLocaleString()}</span> (optimized) = <span className="text-white font-bold">${(12828).toLocaleString()} saved</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <h3 className="text-base font-bold text-emerald-400 mb-2">Executive Summary</h3>
            <p className="text-sm text-slate-300 leading-relaxed">This disk monitoring platform identifies <strong className="text-white">$12,828 in annual savings</strong> through two zero-cost actions: scheduling VM operations and right-sizing disk tiers based on actual usage metrics. The monitoring dashboard and AI advisor themselves cost nothing (static web app hosting is $9/mo). Every dollar of identified savings comes from reducing waste that is already being measured — no guesswork required.</p>
          </div>
        </>)}
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Disk FinOps Dashboard &bull; Prices: East US 2, Pay-as-you-go, USD &bull; Data source: Azure Monitor metrics &amp; Azure Retail Prices API
      </footer>
    </div>
  );
}
