'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

const PAGES = [
  {
    title: 'Service Explorer',
    path: '/services',
    icon: '🔍',
    color: '#2563eb',
    category: 'Monitoring',
    description: 'Deep dive into every Azure service in the subscription. 21 service types, 209 resources with clickable drill-down showing instances, SKUs, locations, status, and Azure Portal links.',
    features: ['21 service types', '209 resources', 'Clickable drill-down', 'Per-resource details', 'Category & cost sorting', 'Azure Portal deep links', 'Cost by category pie chart'],
  },
  {
    title: 'Azure Advisor',
    path: '/azure-advisor',
    icon: '🎯',
    color: '#00bcf2',
    category: 'Finance',
    description: 'Azure Advisor recommendations across 4 Well-Architected Framework pillars: Security (211), Reliability (101), Cost (38), and Operations (9). Filterable by category and impact.',
    features: ['359 recommendations', '4 WAF pillars', 'Category & impact filters', 'Expandable detail cards', 'Savings estimates', 'Portal deep links'],
  },
  {
    title: 'Billing Dashboard',
    path: '/billing',
    icon: '💵',
    color: '#e81123',
    category: 'Finance',
    description: 'Azure subscription billing with 6-month history, monthly/daily trends, service cost breakdown, invoice tracking, and cost anomaly detection with root cause analysis.',
    features: ['6-month billing history', 'Monthly trend + MoM change', 'Daily spend area chart', 'Cost by Azure service', 'Invoice tracking', 'Cost anomaly detection', 'March forecast'],
  },
  {
    title: 'Workload Map',
    path: '/workloads',
    icon: '🗂️',
    color: '#f97316',
    category: 'Finance',
    description: 'Logical grouping of all subscription resources by the workload they host. 10 workloads across 28 resource groups with cost flow from environment → category → workload → resource group.',
    features: ['10 workloads identified', 'Environment/category filters', 'Cost treemap & bar charts', 'Resource group drill-down', 'Per-workload recommendations', 'Region cost breakdown'],
  },
  {
    title: 'Subscription Cost Analyzer',
    path: '/cost-analyzer',
    icon: '💳',
    color: '#0ea5e9',
    category: 'Finance',
    description: 'Full subscription cost analysis using Azure Cost Management API. Costs grouped by resource group and service type, with daily trends and actionable savings recommendations.',
    features: ['Live Azure cost data', 'Cost by resource group', 'Cost by service type', '8 savings recommendations', 'Daily spend trend', 'Azure CLI commands for refresh'],
  },
  {
    title: 'Disk FinOps',
    path: '/finops',
    icon: '💵',
    color: '#10b981',
    category: 'Finance',
    description: 'Cost intelligence for Azure infrastructure. Covers all 23 resources: VMs, data disks, OS disks, logging, and dashboards. PAYG pricing, RI assessment, clickable per-resource breakdown with recommendations.',
    features: ['23-resource cost analysis', 'PAYG + RI assessment', 'Clickable category drill-down', 'Per-resource recommendations', 'OS vs Data disk use cases', '6 metric optimization rules', '5 savings scenarios', 'ROI projection'],
  },
  {
    title: 'Metrics Dashboard',
    path: '/metrics',
    icon: '📊',
    color: '#3b82f6',
    category: 'Monitoring',
    description: 'Main dashboard with 7 metric tabs: Overview, IOPS, Throughput, Latency, Queue Depth, Capacity, and Comparison. Features sparkline grids, ranking views, and a filterable disk inventory table.',
    features: ['7 metric tabs', 'Sparkline grid view', 'Ranking bar view', 'Disk inventory table', 'Metric info panels with cost impact', 'Time range picker (1h/24h/7d/30d)', 'Auto-refresh every 60s'],
  },
  {
    title: 'Single Pane Monitor',
    path: '/monitor',
    icon: '🖥️',
    color: '#22c55e',
    category: 'Monitoring',
    description: 'Fleet-level monitoring with three drill-down levels: All VMs → VM Detail → Disk Detail. Health scores, IOPS/throughput gauges, and VM Start/Stop/Deallocate controls.',
    features: ['Fleet → VM → Disk drill-down', 'Health score gauges', 'VM Start/Stop/Deallocate', 'Filter by VM family & health', 'Sort by health, IOPS, latency, cost', 'Per-disk time series charts', 'Provisioned vs actual comparison'],
  },
  {
    title: 'Technical Details',
    path: '/technical',
    icon: '🏗️',
    color: '#8b5cf6',
    category: 'Documentation',
    description: 'Solution architecture with Mermaid.js diagrams, clickable data flow pipeline, interactive technology stack with Microsoft Learn links, live Azure pricing with USD/CAD toggle.',
    features: ['Mermaid.js architecture diagram', 'Clickable data flow pipeline', 'Interactive tech stack cards', 'Microsoft Learn links', 'Live Azure pricing (USD/CAD)', 'Pricing disclaimer', 'Benchmark profiles'],
  },
  {
    title: 'Deep Dive',
    path: '/deep-dive',
    icon: '🔍',
    color: '#06b6d4',
    category: 'Documentation',
    description: 'Complete catalog of 17 KQL queries (with full syntax-highlighted code), 29 guest-level performance counters (13 Linux + 16 Windows), and 42 platform metrics grouped by category.',
    features: ['17 KQL queries with code', 'Expandable query cards', 'Category filtering', '29 perf counters (Linux + Windows)', '42 platform metrics by category', 'Source distribution charts', 'Dashboard mapping'],
  },
  {
    title: 'Design Document',
    path: '/design',
    icon: '📐',
    color: '#f59e0b',
    category: 'Documentation',
    description: '8-section technical design document covering Overview, Infrastructure, Data Collection, Query Layer, Visualization, Benchmarks, Security, and Operations — all with Mermaid diagrams.',
    features: ['8 design sections', 'Key design decisions', 'Mermaid diagrams per section', 'Bicep module structure', 'Tagging strategy', 'Security POC vs production', 'Operational commands'],
  },
  {
    title: 'Power BI Spec',
    path: '/powerbi-spec',
    icon: '📊',
    color: '#f59e0b',
    category: 'Documentation',
    description: 'Power BI integration spec for disk monitoring: 3 architecture options, 4 datasets, 4 reports (18 pages), 5-week implementation plan, KQL export queries, and cost estimates.',
    features: ['3 architecture options', '4 Power BI datasets', '4 reports (18 pages)', '5-week implementation plan', 'KQL export queries', 'Cost comparison table', 'DAX measures'],
  },
  {
    title: 'Help & Reference',
    path: '/help',
    icon: '💡',
    color: '#ef4444',
    category: 'Tools',
    description: 'Interactive cost simulator for all 5 disk types, disk capability comparison, IOPS scaling chart, VM-level caps table, disk selection decision guide, and cost optimization tips.',
    features: ['Cost simulator (5 disk types)', 'Premium SSD tier picker', 'PremV2/Ultra sliders', 'Disk capability bars', 'IOPS scaling chart', 'VM disk cap table', 'Decision guide', '8 optimization tips'],
  },
  {
    title: 'AI Disk Advisor',
    path: '/advisor',
    icon: '✨',
    color: '#a855f7',
    category: 'Tools',
    description: 'AI-powered chat interface that answers questions about disk costs, performance optimization, and generates KQL queries. Uses Azure OpenAI GPT-4o-mini ($0.15/1M tokens) or runs locally with built-in knowledge.',
    features: ['Natural language Q&A', 'Cost analysis answers', 'Performance diagnostics', 'KQL query generation', 'Disk type recommendations', 'Azure OpenAI ready (GPT-4o-mini)', 'Zero-cost local mode', 'Suggested questions'],
  },
];

const STATS = [
  { label: 'Dashboard Pages', value: '15', icon: '📱', href: '#pages', desc: 'See all pages below' },
  { label: 'VMs Monitored', value: '5', icon: '🖥️', href: '/monitor', desc: 'D4s, D8s, E4s, L8s, D4s-Win → Single Pane Monitor' },
  { label: 'Disk Types', value: '5', icon: '💾', href: '/help#disk-types', desc: 'Premium SSD, PremV2, Std SSD, HDD, Ultra → Help page' },
  { label: 'KQL Queries', value: '17', icon: '🔎', href: '/deep-dive', desc: 'Inventory, IOPS, latency, comparison → Deep Dive' },
  { label: 'Perf Counters', value: '29', icon: '📡', href: '/deep-dive', desc: '13 Linux + 16 Windows via DCR → Deep Dive' },
  { label: 'Platform Metrics', value: '42', icon: '📊', href: '/deep-dive', desc: 'IOPS consumed %, burst credits, cache → Deep Dive' },
  { label: 'FIO Profiles', value: '7', icon: '⚙️', href: '/technical', desc: 'seq, rand, mixed, latency, QD ramp → Technical' },
  { label: 'Data Disks', value: '13', icon: '💿', href: '/monitor', desc: '8 data + 5 OS disks across 5 VMs → Monitor' },
];

export default function LandingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = [...new Set(PAGES.map((p) => p.category))];

  const filteredPages = useMemo(() => {
    let result = PAGES;
    if (categoryFilter !== 'all') result = result.filter((p) => p.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.features.some((f) => f.toLowerCase().includes(q)));
    }
    return result;
  }, [searchQuery, categoryFilter]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/10 via-[#4a9eff]/5 to-[#2563eb]/8" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(74,158,255,0.05) 0%, transparent 50%)' }} />
        <div className="relative mx-auto max-w-[1400px] px-6 pt-16 pb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 p-4 mb-6">
              <svg className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" /></svg>
            </div>
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
              Azure Disk Performance
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#60a5fa] via-[#4a9eff] to-[#93c5fd]">Monitoring Platform</span>
            </h1>
            <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">Single pane of glass to monitor disk performance across Azure VMs — with drill-down, cost simulation, live pricing, and comprehensive documentation.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/monitor" className="rounded-xl bg-blue-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25">Open Monitor</Link>
              <Link href="/metrics" className="rounded-xl border border-slate-600 bg-slate-800 px-7 py-3.5 text-base font-semibold text-slate-200 hover:text-white hover:border-slate-500 transition-colors">View Metrics</Link>
              <a href="https://github.com/KrishnaDistributedcomputing/azure-disk-monitoring" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-600 bg-slate-800 px-7 py-3.5 text-base font-semibold text-slate-200 hover:text-white hover:border-slate-500 transition-colors flex items-center gap-2">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </a>
            </div>
          </div>
          {/* Stats — clickable */}
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {STATS.map((s) => (
              <Link key={s.label} href={s.href} className="group rounded-lg border border-slate-700/50 bg-slate-800/50 backdrop-blur px-3 py-4 text-center transition-all hover:border-blue-500/50 hover:bg-slate-800/80 hover:scale-105 relative">
                <span className="text-xl" aria-hidden="true">{s.icon}</span>
                <div className="text-2xl font-bold text-white mt-1 group-hover:text-blue-400 transition-colors">{s.value}</div>
                <div className="text-xs text-slate-400 group-hover:text-slate-300 font-medium">{s.label}</div>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-xs text-slate-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg" role="tooltip">
                  {s.desc}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-slate-700" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Pages */}
      <div id="pages" className="scroll-mt-8 mx-auto max-w-[1400px] px-6 py-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[260px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input type="text" placeholder="Search pages, features, metrics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search pages" className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-3 text-base text-slate-200 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>}
          </div>
          <fieldset className="flex rounded-xl border border-slate-700 bg-slate-800/80" role="radiogroup" aria-label="Filter by category">
            <button onClick={() => setCategoryFilter('all')} className={`px-4 py-2.5 text-sm font-semibold rounded-l-xl transition-colors ${categoryFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`} aria-pressed={categoryFilter === 'all'}>All ({PAGES.length})</button>
            {categories.map((c, i) => (
              <button key={c} onClick={() => setCategoryFilter(c)} className={`px-4 py-2.5 text-sm font-semibold transition-colors ${categoryFilter === c ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'} ${i === categories.length - 1 ? 'rounded-r-xl' : ''}`} aria-pressed={categoryFilter === c}>{c} ({PAGES.filter((p) => p.category === c).length})</button>
            ))}
          </fieldset>
          <span className="text-sm text-slate-400 font-medium">{filteredPages.length} pages</span>
        </div>

        {/* Page Cards */}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredPages.map((page) => (
            <Link key={page.path} href={page.path} className="group rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden transition-all hover:border-slate-500 hover:shadow-xl hover:shadow-blue-900/10 hover:scale-[1.01]">
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${page.color}, ${page.color}80)` }} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden="true">{page.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{page.title}</h3>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: page.color + '20', color: page.color }}>{page.category}</span>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-slate-600 group-hover:text-blue-400 transition-all group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">{page.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {page.features.slice(0, 5).map((f) => (
                    <span key={f} className="rounded-lg bg-slate-700/50 px-2.5 py-1 text-xs text-slate-300">{f}</span>
                  ))}
                  {page.features.length > 5 && <span className="rounded-lg bg-slate-700/50 px-2.5 py-1 text-xs text-slate-400">+{page.features.length - 5} more</span>}
                </div>
              </div>
              <div className="border-t border-slate-700/50 px-6 py-3 flex items-center justify-between">
                <code className="text-xs font-mono text-slate-400">{page.path}</code>
                <span className="text-xs text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
              </div>
            </Link>
          ))}
        </div>

        {filteredPages.length === 0 && (
          <div className="mt-12 text-center py-16">
            <p className="text-slate-500">No pages match &quot;{searchQuery}&quot;</p>
            <button onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }} className="mt-3 text-sm text-blue-400 hover:underline">Clear filters</button>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
          <h2 className="text-xl font-bold text-white mb-6">Quick Links</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Azure Portal', desc: 'View deployed resources', url: 'https://portal.azure.com', icon: '☁️' },
              { label: 'GitHub Repo', desc: 'Source code & IaC', url: 'https://github.com/KrishnaDistributedcomputing/azure-disk-monitoring', icon: '🐙' },
              { label: 'Azure Pricing', desc: 'Official pricing calculator', url: 'https://azure.microsoft.com/en-us/pricing/calculator/', icon: '💰' },
              { label: 'Azure Monitor Docs', desc: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/', icon: '📚' },
            ].map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-700 bg-slate-800 p-4 transition-all hover:border-blue-500/50 group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{link.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{link.label}</div>
                    <div className="text-[11px] text-slate-500">{link.desc}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Azure Disk Performance Monitoring POC &bull; East US 2 &bull;
        <a href="https://github.com/KrishnaDistributedcomputing/azure-disk-monitoring" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">GitHub</a>
      </footer>
    </div>
  );
}
