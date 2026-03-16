'use client';

import { useState } from 'react';
import Link from 'next/link';

// ============================================================================
// POWER BI INTEGRATION SPEC — Disk Performance Monitoring
// Architecture, data flow, embedding options, and implementation plan
// ============================================================================

const DATASETS = [
  {
    id: 'perf-metrics',
    name: 'Disk Performance Metrics',
    source: 'Log Analytics (KQL export)',
    refresh: 'Every 15 minutes (DirectQuery) or 1 hour (Import)',
    tables: ['Perf_IOPS', 'Perf_Throughput', 'Perf_Latency', 'Perf_QueueDepth', 'Perf_Capacity'],
    rows: '~2.5M rows/month (5 VMs × 13 disks × 60 samples/hr × 730 hrs)',
    measures: ['Avg IOPS', 'Max IOPS', 'P95 Latency', 'Throughput MB/s', 'IOPS Consumed %', 'Burst Credits Remaining'],
  },
  {
    id: 'cost-data',
    name: 'Cost & Billing Data',
    source: 'Azure Cost Management API (REST export)',
    refresh: 'Daily at 06:00 UTC',
    tables: ['Cost_ByResourceGroup', 'Cost_ByService', 'Cost_ByTag', 'Cost_Daily', 'Billing_Invoices'],
    rows: '~50K rows/month',
    measures: ['MTD Spend', 'MoM Change %', 'Daily Avg', 'Forecast', 'Savings Potential'],
  },
  {
    id: 'inventory',
    name: 'Resource Inventory',
    source: 'Azure Resource Graph (REST)',
    refresh: 'Every 6 hours',
    tables: ['Resources_All', 'Resources_ByType', 'Tags_Compliance', 'VM_Fleet', 'Disk_Fleet'],
    rows: '~209 rows (resource count)',
    measures: ['Total Resources', 'Tagged %', 'By Category', 'By Region', 'By RG'],
  },
  {
    id: 'advisor',
    name: 'Advisor Recommendations',
    source: 'Azure Advisor API (REST)',
    refresh: 'Daily at 08:00 UTC',
    tables: ['Advisor_Security', 'Advisor_Reliability', 'Advisor_Cost', 'Advisor_Operations'],
    rows: '~359 rows',
    measures: ['Total Findings', 'High Priority', 'Savings Estimate', 'Compliance Score'],
  },
];

const REPORTS = [
  {
    id: 'exec-summary',
    name: 'Executive Summary',
    audience: 'CIO / VP Infrastructure',
    pages: ['Cost Overview', 'Resource Growth', 'Advisor Score', 'Monthly Trend'],
    visuals: ['KPI Cards', 'Line Chart (6-month trend)', 'Donut (cost by category)', 'Table (top 5 RGs)'],
    refresh: 'Daily',
    slicers: ['Date range', 'Resource Group', 'Environment tag'],
  },
  {
    id: 'disk-perf',
    name: 'Disk Performance Deep Dive',
    audience: 'Infrastructure Engineers',
    pages: ['IOPS Analysis', 'Latency Heatmap', 'Throughput Trends', 'Queue Depth Alerts', 'Capacity Planning'],
    visuals: ['Matrix (VM × Disk heatmap)', 'Area Chart (IOPS over time)', 'Gauge (% consumed)', 'Scatter (latency vs IOPS)', 'Bar (cost per IOPS)'],
    refresh: '15 min (DirectQuery)',
    slicers: ['VM Name', 'Disk Type', 'Time Range', 'Health Status'],
  },
  {
    id: 'finops',
    name: 'FinOps & Cost Intelligence',
    audience: 'Finance / FinOps Team',
    pages: ['Budget vs Actual', 'Tag Compliance', 'RI Recommendations', 'Anomaly Detection', 'Chargeback'],
    visuals: ['Waterfall (cost breakdown)', 'Treemap (cost by workload)', 'Bullet Chart (budget progress)', 'Table (untagged resources)'],
    refresh: 'Daily',
    slicers: ['Cost Center', 'Project tag', 'Environment', 'Date range'],
  },
  {
    id: 'compliance',
    name: 'Compliance & Governance',
    audience: 'Security / Compliance Officers',
    pages: ['Advisor Overview', 'Security Findings', 'Reliability Gaps', 'Tag Governance'],
    visuals: ['Scorecard (WAF pillars)', 'Bar (findings by severity)', 'Table (actionable items)', 'Trend (score over time)'],
    refresh: 'Daily',
    slicers: ['Category', 'Impact', 'Resource Type'],
  },
];

const ARCHITECTURE_OPTIONS = [
  {
    option: 'Option A: Power BI Embedded (PaaS)',
    description: 'Embed Power BI reports directly into the existing Next.js Static Web App using the Power BI JavaScript SDK. Reports render in iframes with token-based authentication.',
    pros: ['Seamless integration with existing SWA', 'No separate Power BI license for viewers', 'Programmatic control (filters, bookmarks, events)', 'Custom branding possible'],
    cons: ['Requires Power BI Embedded capacity (A1: ~$750/mo)', 'Complex token management (Azure AD app registration)', 'Limited to published reports'],
    cost: '$735/mo (A1 SKU) + $9.99/mo per Pro license for authors',
    bestFor: 'Production deployment with many viewers and custom portal integration',
  },
  {
    option: 'Option B: Power BI Service + Published Links',
    description: 'Publish reports to Power BI Service workspace and share via "Publish to Web" (public) or secure links (authenticated). Link from the Next.js dashboard to Power BI.',
    pros: ['Simplest setup — no code changes needed', 'Full Power BI interactive experience', 'Free for viewers (if using Fabric free tier)', 'Power BI mobile app support'],
    cons: ['Separate authentication (not SSO with SWA)', 'Publish to Web is public (no auth)', 'Less integrated UX'],
    cost: '$9.99/mo per Pro user OR $4,995/mo Premium P1',
    bestFor: 'POC/small team where Power BI is already licensed',
  },
  {
    option: 'Option C: Power BI + Azure Synapse Link',
    description: 'Export Log Analytics data to Azure Data Lake via diagnostic settings, then use Synapse Serverless SQL to query. Power BI connects to Synapse endpoint.',
    pros: ['Unlimited data retention (beyond 30-day LA default)', 'SQL-based queries (familiar to BI teams)', 'Combine with other enterprise data sources', 'Best for large-scale analytics'],
    cons: ['Most complex architecture', 'Additional Synapse + ADLS costs', 'Data latency (export delay)'],
    cost: 'Synapse Serverless: ~$5/TB scanned + ADLS: ~$0.02/GB/mo + Power BI Pro: $9.99/user/mo',
    bestFor: 'Enterprise deployment with data warehouse strategy',
  },
];

const IMPLEMENTATION_PHASES = [
  {
    phase: 1,
    name: 'Data Pipeline Setup',
    duration: '1 week',
    tasks: [
      'Create Power BI workspace "Disk Monitoring POC"',
      'Configure Log Analytics data export to Azure Data Lake (if Option C)',
      'Set up Azure AD app registration for Power BI API access',
      'Create dataflow for Cost Management API → Power BI dataset',
      'Create dataflow for Resource Graph → Power BI dataset',
      'Create dataflow for Advisor API → Power BI dataset',
    ],
  },
  {
    phase: 2,
    name: 'Data Model & DAX',
    duration: '1 week',
    tasks: [
      'Design star schema: Fact_PerfMetrics, Dim_VM, Dim_Disk, Dim_Date, Dim_ResourceGroup',
      'Create relationships between performance, cost, and inventory tables',
      'Write DAX measures: YTD Cost, MoM %, Avg IOPS, P95 Latency, Health Score',
      'Create calculated columns: DiskType category, VM family, Environment tag',
      'Set up incremental refresh for Perf_Metrics (keep 6 months)',
      'Configure RLS (Row-Level Security) by resource group if multi-tenant',
    ],
  },
  {
    phase: 3,
    name: 'Report Development',
    duration: '2 weeks',
    tasks: [
      'Build Executive Summary report (4 pages)',
      'Build Disk Performance Deep Dive report (5 pages)',
      'Build FinOps & Cost Intelligence report (5 pages)',
      'Build Compliance & Governance report (4 pages)',
      'Add bookmarks for pre-set views (e.g., "Ultra Disk Focus", "High Latency VMs")',
      'Add drillthrough from cost → resource → performance detail',
      'Configure alerts: IOPS > 80% consumed, Latency > 10ms, Cost anomaly > 3x daily avg',
    ],
  },
  {
    phase: 4,
    name: 'Integration & Deployment',
    duration: '1 week',
    tasks: [
      'Embed reports into Next.js SWA (if Option A) using powerbi-client-react',
      'OR publish to Power BI Service with secure sharing (if Option B)',
      'Configure scheduled refresh for all datasets',
      'Set up Power BI alerts → Teams/email notifications',
      'Create Power BI mobile dashboard for on-the-go monitoring',
      'Document data lineage and refresh schedules',
      'User acceptance testing with infrastructure and finance teams',
    ],
  },
];

const KQL_EXPORTS = [
  {
    name: 'IOPS by VM and Disk (15-min avg)',
    kql: `Perf
| where TimeGenerated > ago(6h)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Disk Transfers/sec"
| where InstanceName !in ("_Total", "/")
| summarize AvgIOPS=avg(CounterValue), MaxIOPS=max(CounterValue)
    by bin(TimeGenerated, 15m), Computer, InstanceName
| project TimeGenerated, Computer, DiskInstance=InstanceName, AvgIOPS, MaxIOPS`,
    powerBiUse: 'Line chart: IOPS trend per disk, Matrix: VM × Disk heatmap',
  },
  {
    name: 'Latency Percentiles (hourly)',
    kql: `Perf
| where TimeGenerated > ago(24h)
| where CounterName in ("Avg. Disk sec/Read", "Avg. Disk sec/Write")
| where InstanceName !in ("_Total", "/")
| summarize P50=percentile(CounterValue, 50), P95=percentile(CounterValue, 95),
    P99=percentile(CounterValue, 99), Avg=avg(CounterValue)
    by bin(TimeGenerated, 1h), Computer, InstanceName, CounterName
| extend LatencyMs = Avg * 1000
| project TimeGenerated, Computer, DiskInstance=InstanceName, Operation=iif(CounterName has "Read", "Read", "Write"), P50_ms=P50*1000, P95_ms=P95*1000, P99_ms=P99*1000, Avg_ms=LatencyMs`,
    powerBiUse: 'Scatter plot: P95 vs Avg, Conditional formatting on P99 > 10ms',
  },
  {
    name: 'Cost by Tag (daily)',
    kql: `// Use Azure Cost Management REST API, not KQL
// POST https://management.azure.com/subscriptions/{id}/providers/Microsoft.CostManagement/query
// Body: { type: "ActualCost", timeframe: "MonthToDate", grouping: [{ type: "Tag", name: "project" }] }`,
    powerBiUse: 'Treemap: cost by project tag, Waterfall: cost breakdown by category',
  },
];

type Tab = 'overview' | 'architecture' | 'datasets' | 'reports' | 'implementation' | 'kql';

export default function PowerBISpecPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedOption, setExpandedOption] = useState<number | null>(null);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'architecture', label: 'Architecture Options' },
    { key: 'datasets', label: 'Datasets' },
    { key: 'reports', label: 'Reports' },
    { key: 'implementation', label: 'Implementation Plan' },
    { key: 'kql', label: 'KQL Exports' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200" role="main">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors p-1" aria-label="Back to home">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              </Link>
              <div className="flex items-center gap-2">
                <svg className="h-8 w-8 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3v18h18V3zm-2 16H5V5h14v14zm-3-2h-2V9h2v8zm-4 0h-2V7h2v10zm-4 0H6v-6h2v6z"/></svg>
                <div>
                  <h1 className="text-2xl font-bold text-white">Power BI Integration Spec</h1>
                  <p className="text-sm text-slate-400">Disk Performance Monitoring &mdash; Reporting & Analytics</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-slate-400">Reports</div>
                <div className="text-xl font-bold text-white">{REPORTS.length}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" aria-hidden="true" />
              <div className="text-right">
                <div className="text-sm text-slate-400">Datasets</div>
                <div className="text-xl font-bold text-white">{DATASETS.length}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" aria-hidden="true" />
              <div className="text-right">
                <div className="text-sm text-slate-400">Timeline</div>
                <div className="text-xl font-bold text-amber-400">5 weeks</div>
              </div>
            </div>
          </div>
          <nav className="mt-3 flex gap-1" aria-label="Spec sections" role="tablist">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} role="tab" aria-selected={tab === t.key} className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">

        {/* ============= OVERVIEW ============= */}
        {tab === 'overview' && (<>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5" role="note">
            <strong className="text-amber-200">📊 Purpose:</strong>
            <span className="text-amber-100/80 ml-1">This spec defines how to integrate Power BI with the existing Azure disk monitoring infrastructure to provide executive-grade reporting, self-service analytics, and automated alerting for disk performance, cost management, and compliance.</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Why Power BI?</h3>
              <div className="space-y-3">
                {[
                  { title: 'Executive Reporting', desc: 'Scheduled email reports and mobile dashboards for leadership — no portal login needed' },
                  { title: 'Self-Service Analytics', desc: 'Business users can build their own views without engineering involvement' },
                  { title: 'Cross-Source Correlation', desc: 'Join performance metrics with cost data, advisor findings, and tag compliance in one model' },
                  { title: 'Natural Language Q&A', desc: 'Copilot in Power BI lets users ask "What was our highest cost day in March?" in plain English' },
                  { title: 'Enterprise Distribution', desc: 'Embed in Teams, SharePoint, email subscriptions, and mobile app — meets users where they are' },
                  { title: 'Row-Level Security', desc: 'Show only relevant resource groups per team — finance sees cost, infra sees performance' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                    <div>
                      <span className="text-sm font-semibold text-white">{item.title}</span>
                      <span className="text-sm text-slate-400 ml-1">— {item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Scope</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-300 mb-2">Data Sources</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {['Log Analytics (perf metrics)', 'Cost Management API', 'Resource Graph', 'Advisor API'].map(s => (
                      <div key={s} className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-3 py-2 text-sm text-slate-200">{s}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-300 mb-2">Reports (4)</h4>
                  <div className="space-y-1">
                    {REPORTS.map(r => (
                      <div key={r.id} className="flex items-center justify-between text-sm">
                        <span className="text-white font-medium">{r.name}</span>
                        <span className="text-xs text-slate-400">{r.pages.length} pages · {r.audience}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-300 mb-2">Target Audiences</h4>
                  <div className="flex flex-wrap gap-2">
                    {['CIO / VP Infra', 'Infrastructure Engineers', 'Finance / FinOps', 'Security / Compliance'].map(a => (
                      <span key={a} className="rounded-full bg-blue-600/20 text-blue-400 px-3 py-1 text-xs font-semibold">{a}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Estimate */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Estimated Cost (Monthly)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-4 py-3 text-left font-semibold">Component</th>
                    <th className="px-4 py-3 text-left font-semibold">Option A (Embedded)</th>
                    <th className="px-4 py-3 text-left font-semibold">Option B (Service)</th>
                    <th className="px-4 py-3 text-left font-semibold">Option C (Synapse)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { component: 'Power BI Capacity/Licenses', a: '$735 (A1 Embedded)', b: '$9.99/user (Pro)', c: '$9.99/user (Pro)' },
                    { component: 'Author Licenses', a: '$9.99 × 2 = $20', b: '$9.99 × 2 = $20', c: '$9.99 × 2 = $20' },
                    { component: 'Data Lake Storage', a: '$0', b: '$0', c: '~$2/mo' },
                    { component: 'Synapse Serverless', a: '$0', b: '$0', c: '~$5/mo (1 TB scanned)' },
                    { component: 'Total (5 viewers)', a: '$755/mo', b: '$70/mo', c: '$97/mo' },
                  ].map(row => (
                    <tr key={row.component} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="px-4 py-3 font-medium text-white">{row.component}</td>
                      <td className="px-4 py-3 text-slate-300">{row.a}</td>
                      <td className="px-4 py-3 text-slate-300">{row.b}</td>
                      <td className="px-4 py-3 text-slate-300">{row.c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">💡 <strong>Recommendation for POC:</strong> Start with Option B (Power BI Service + Pro licenses) at ~$70/mo for 5 users. Migrate to Option A (Embedded) if viewer count exceeds 10 or custom portal integration is required.</p>
          </div>
        </>)}

        {/* ============= ARCHITECTURE ============= */}
        {tab === 'architecture' && (<>
          <div className="space-y-4">
            {ARCHITECTURE_OPTIONS.map((opt, i) => (
              <div key={i} className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
                <button onClick={() => setExpandedOption(expandedOption === i ? null : i)} className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors" aria-expanded={expandedOption === i}>
                  <div>
                    <h3 className="text-base font-bold text-white">{opt.option}</h3>
                    <p className="text-sm text-slate-400 mt-1">{opt.description}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-400">{opt.cost.split('+')[0]}</div>
                      <div className="text-xs text-slate-400">est. cost</div>
                    </div>
                    <svg className={`h-5 w-5 text-slate-400 transition-transform ${expandedOption === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </button>
                {expandedOption === i && (
                  <div className="border-t border-slate-700 px-6 py-5 bg-slate-800/50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-emerald-400 mb-2">Pros</h4>
                        {opt.pros.map(p => (
                          <div key={p} className="flex items-start gap-2 text-sm text-slate-300 mb-1">
                            <span className="text-emerald-400 flex-shrink-0">+</span>
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-red-400 mb-2">Cons</h4>
                        {opt.cons.map(c => (
                          <div key={c} className="flex items-start gap-2 text-sm text-slate-300 mb-1">
                            <span className="text-red-400 flex-shrink-0">−</span>
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 p-4">
                      <span className="text-xs text-slate-400">Best For:</span>
                      <span className="text-sm text-white ml-2">{opt.bestFor}</span>
                    </div>
                    <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 p-4">
                      <span className="text-xs text-slate-400">Full Cost:</span>
                      <span className="text-sm text-amber-400 font-mono ml-2">{opt.cost}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>)}

        {/* ============= DATASETS ============= */}
        {tab === 'datasets' && (<>
          <div className="space-y-4">
            {DATASETS.map(ds => (
              <div key={ds.id} className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{ds.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">Source: <span className="text-blue-400">{ds.source}</span></p>
                  </div>
                  <span className="text-xs rounded-full bg-blue-600/20 text-blue-400 px-3 py-1 font-semibold">{ds.refresh}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Tables</h4>
                    <div className="space-y-1">
                      {ds.tables.map(t => (
                        <div key={t} className="text-sm font-mono text-slate-200 bg-slate-900/50 rounded px-2 py-1">{t}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">DAX Measures</h4>
                    <div className="space-y-1">
                      {ds.measures.map(m => (
                        <div key={m} className="text-sm text-slate-200">• {m}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Volume</h4>
                    <div className="text-sm text-slate-200">{ds.rows}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* ============= REPORTS ============= */}
        {tab === 'reports' && (<>
          <div className="space-y-4">
            {REPORTS.map(r => (
              <div key={r.id} className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{r.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">Audience: <span className="text-blue-400">{r.audience}</span> · Refresh: <span className="text-emerald-400">{r.refresh}</span></p>
                  </div>
                  <span className="text-white font-bold text-lg">{r.pages.length} pages</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Report Pages</h4>
                    {r.pages.map((p, i) => (
                      <div key={p} className="flex items-center gap-2 text-sm text-slate-200 mb-1">
                        <span className="text-xs text-slate-500 w-4">{i + 1}.</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Visual Types</h4>
                    {r.visuals.map(v => (
                      <div key={v} className="text-sm text-slate-200 mb-1">• {v}</div>
                    ))}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Slicers / Filters</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {r.slicers.map(s => (
                        <span key={s} className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-2 py-1 text-xs text-slate-300">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* ============= IMPLEMENTATION ============= */}
        {tab === 'implementation' && (<>
          <div className="space-y-4">
            {IMPLEMENTATION_PHASES.map(phase => (
              <div key={phase.phase} className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">{phase.phase}</div>
                  <div>
                    <h3 className="text-base font-bold text-white">{phase.name}</h3>
                    <span className="text-sm text-slate-400">Duration: <span className="text-amber-400 font-semibold">{phase.duration}</span></span>
                  </div>
                </div>
                <div className="space-y-2 ml-14">
                  {phase.tasks.map((task, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="h-5 w-5 rounded border border-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-slate-500">{i + 1}</span>
                      </div>
                      <span className="text-slate-200">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <h3 className="text-base font-bold text-emerald-300 mb-2">Total Timeline: 5 Weeks</h3>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Wk 1</span> Data Pipeline →
                <span className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Wk 2</span> Data Model →
                <span className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Wk 3-4</span> Reports →
                <span className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Wk 5</span> Integration & Go-Live
              </div>
            </div>
          </div>
        </>)}

        {/* ============= KQL EXPORTS ============= */}
        {tab === 'kql' && (<>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5 mb-4" role="note">
            <strong className="text-blue-200">KQL → Power BI:</strong>
            <span className="text-blue-100/80 ml-1">These KQL queries export data from Log Analytics into Power BI datasets. Use the <strong>Azure Monitor connector</strong> in Power BI Desktop to connect directly, or schedule exports via Logic Apps / Data Factory.</span>
          </div>
          <div className="space-y-4">
            {KQL_EXPORTS.map(q => (
              <div key={q.name} className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                <h3 className="text-base font-bold text-white mb-1">{q.name}</h3>
                <p className="text-sm text-slate-400 mb-3">Power BI Use: <span className="text-emerald-400">{q.powerBiUse}</span></p>
                <div className="rounded-lg bg-slate-900 border border-slate-700/50 p-4 overflow-x-auto">
                  <pre className="text-sm font-mono text-emerald-400 whitespace-pre">{q.kql}</pre>
                </div>
                <button onClick={() => navigator.clipboard.writeText(q.kql)} className="mt-2 rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors">Copy KQL</button>
              </div>
            ))}
          </div>
        </>)}

      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 mt-8">
        <div className="mx-auto max-w-[1400px] px-6 py-5 flex items-center justify-between text-sm text-slate-400">
          <span>Power BI Integration Spec v1.0 — Azure Disk Performance Monitoring POC</span>
          <span>March 2026</span>
        </div>
      </div>
    </div>
  );
}
