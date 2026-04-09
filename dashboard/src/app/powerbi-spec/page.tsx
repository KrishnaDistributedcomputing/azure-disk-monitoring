'use client';

import { useState, useMemo } from 'react';
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

type Tab = 'overview' | 'architecture' | 'azure-options' | 'connectivity' | 'regions-capacity' | 'datasets' | 'reports' | 'implementation' | 'performance' | 'kql';

interface ConnectionMode {
  name: string;
  icon: string;
  color: string;
  howItWorks: string;
  dataFlow: string[];
  latency: string;
  freshness: string;
  maxDataset: string;
  skuRequired: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  azureSetup: string[];
}

const CONNECTION_MODES: ConnectionMode[] = [
  {
    name: 'Import Mode',
    icon: '📦',
    color: '#3b82f6',
    howItWorks: 'Data is copied from the source into an in-memory VertiPaq columnar store inside the Power BI dataset. Queries run entirely against the local copy — the source is not contacted at query time.',
    dataFlow: ['Log Analytics / REST API', 'Power Query (M) extracts data', 'VertiPaq compresses & stores in-memory', 'DAX queries run against local cache', 'Scheduled refresh pulls fresh data'],
    latency: '< 100ms per visual (cached)',
    freshness: 'As stale as last refresh (1h – 24h typical)',
    maxDataset: '1 GB (Pro) / 100 GB (PPU) / 400 GB (P2/F64)',
    skuRequired: 'Any SKU (Free, Pro, PPU, Premium, Fabric)',
    pros: ['Fastest query performance — sub-second visuals', 'Works offline after refresh', 'Full DAX calculation engine', 'Best compression ratio (~10:1)', 'Supports all visual types'],
    cons: ['Data staleness between refreshes', 'Large datasets consume memory/capacity', 'Refresh can fail if source is slow/unavailable', 'Dataset size limits per SKU'],
    bestFor: 'Most reports — cost data, inventory, advisor findings. Best for datasets < 10 GB with hourly or daily freshness.',
    azureSetup: ['Power BI Desktop → Get Data → Azure Monitor Logs / REST API', 'Transform in Power Query editor', 'Set refresh schedule: Service → Dataset → Settings → Scheduled Refresh', 'Enable incremental refresh for large tables (Perf_IOPS)'],
  },
  {
    name: 'DirectQuery',
    icon: '⚡',
    color: '#f59e0b',
    howItWorks: 'No data is imported. Every visual interaction sends a live query back to the source (Log Analytics KQL, SQL, etc.). The source must be online and responsive for every report view.',
    dataFlow: ['User opens report / clicks slicer', 'Power BI generates DAX → translates to source query (KQL / SQL)', 'Query sent to Log Analytics workspace in real-time', 'Source returns results', 'Visual renders with live data'],
    latency: '500ms – 5s per visual (depends on source)',
    freshness: 'Real-time (always current)',
    maxDataset: 'Unlimited (no local storage)',
    skuRequired: 'Pro or higher (not Free)',
    pros: ['Always shows live data — no refresh needed', 'No dataset size limits', 'No memory consumption on capacity', 'Ideal for real-time monitoring dashboards', 'Source-side security (RLS pushed to source)'],
    cons: ['Slower visuals — each interaction = network round-trip', 'Source must handle concurrent query load', 'Limited DAX functions (no complex calculations)', 'Cannot combine with other import tables easily', 'Source throttling can cause timeouts'],
    bestFor: 'Real-time disk performance monitoring (IOPS, latency). Use for the "Disk Performance Deep Dive" report where 15-minute freshness matters.',
    azureSetup: ['Power BI Desktop → Get Data → Azure Monitor Logs', 'Select DirectQuery mode (not Import)', 'Configure Log Analytics workspace ID + credentials', 'Optimize KQL: pre-aggregate with summarize, use time filters', 'Set query timeout to 120s in dataset settings'],
  },
  {
    name: 'DirectLake',
    icon: '🚀',
    color: '#10b981',
    howItWorks: 'Fabric-exclusive mode. Data is stored in OneLake (Parquet/Delta format) and read directly into the VertiPaq engine on demand — no import copy, no refresh needed. Combines the speed of Import with the freshness of DirectQuery.',
    dataFlow: ['Data lands in OneLake (Lakehouse/Warehouse) as Delta tables', 'Power BI semantic model points to Delta tables', 'On first query, VertiPaq loads columns from Parquet files', 'Subsequent queries hit in-memory cache', 'When Delta files update, cache auto-invalidates and reloads'],
    latency: '< 200ms per visual (near Import speed)',
    freshness: 'Near real-time (seconds after data lands in OneLake)',
    maxDataset: 'Unlimited (reads from OneLake, not capacity memory)',
    skuRequired: 'Fabric F8+ (Fabric capacity required)',
    pros: ['Import-like speed without scheduled refresh', 'No data duplication — reads directly from OneLake', 'Near real-time freshness as soon as data lands', 'Massive scale — TB-sized datasets with fast queries', 'Automatic cache management (eviction + reload)', 'Full DAX support (unlike DirectQuery)'],
    cons: ['Requires Fabric capacity (F8+ for Copilot, F2 minimum)', 'Data must be in OneLake (Delta/Parquet format)', 'Need to set up Lakehouse or Warehouse first', 'Fallback to DirectQuery if cache is cold (rare)', 'Newer technology — less community content'],
    bestFor: 'Future state / enterprise target. Once data pipeline writes to OneLake, DirectLake replaces Import for all reports — faster, fresher, no refresh failures.',
    azureSetup: ['Create Fabric Lakehouse in your workspace', 'Ingest data: Log Analytics → Eventstream or Pipeline → Lakehouse Delta table', 'Create semantic model: Lakehouse → "New semantic model"', 'Tables auto-map to DirectLake mode (no configuration needed)', 'Monitor with Fabric Capacity Metrics app → check framing behavior'],
  },
  {
    name: 'Composite Model (Hybrid)',
    icon: '🔀',
    color: '#8b5cf6',
    howItWorks: 'Combines Import and DirectQuery tables in a single model. Slow-changing data (cost, inventory) is imported for speed; fast-changing data (IOPS, latency) uses DirectQuery for freshness.',
    dataFlow: ['Import tables: Cost, Inventory, Advisor → loaded into VertiPaq', 'DirectQuery tables: Perf_IOPS, Perf_Latency → live queries to Log Analytics', 'DAX engine joins both in a single data model', 'Visuals can mix imported and live data', 'Import tables refresh on schedule; DQ tables always live'],
    latency: '200ms – 3s (depends on DQ portion)',
    freshness: 'Mixed: imported tables = stale, DQ tables = live',
    maxDataset: 'Import portion has SKU limits; DQ portion unlimited',
    skuRequired: 'PPU or Premium/Fabric capacity',
    pros: ['Best of both worlds — speed + freshness', 'Reduce source load (import what you can)', 'Single model for cross-source analysis', 'Can later migrate DQ tables to DirectLake'],
    cons: ['Complex model design', 'Cross-source joins can be slow', 'Harder to troubleshoot performance issues', 'Requires PPU or capacity SKU'],
    bestFor: 'Recommended intermediate architecture. Import cost/inventory data, DirectQuery for live performance metrics.',
    azureSetup: ['Create model with Import tables first (cost, inventory, advisor)', 'Add DirectQuery connection to Log Analytics for perf tables', 'Set storage mode per table: Model view → Properties → Storage mode', 'Create relationships between import and DQ tables', 'Test cross-source visual performance with Performance Analyzer'],
  },
];

const UPGRADE_TIMELINE = [
  {
    phase: 'Phase 1 — POC',
    duration: 'Weeks 1–2',
    mode: 'Import',
    sku: 'Power BI Pro ($9.99/user)',
    color: '#3b82f6',
    tasks: [
      'Set up Pro licenses for 2 authors + 3 stakeholders',
      'Build 4 reports using Import mode (scheduled refresh)',
      'Connect to Log Analytics, Cost Management, Resource Graph, Advisor APIs',
      'Validate data accuracy against live Azure portal',
      'Publish to Power BI Service workspace',
    ],
    outcome: 'Working reports with daily/hourly refresh, shared with small team',
  },
  {
    phase: 'Phase 2 — Hybrid Connectivity',
    duration: 'Weeks 3–4',
    mode: 'Composite (Import + DirectQuery)',
    sku: 'PPU ($20/user) or Fabric F2 ($262/mo)',
    color: '#8b5cf6',
    tasks: [
      'Switch Perf_IOPS and Perf_Latency tables to DirectQuery mode',
      'Keep Cost, Inventory, Advisor tables as Import',
      'Upgrade to PPU or provision Fabric F2 capacity',
      'Enable incremental refresh on large Import tables',
      'Benchmark: confirm visual load < 3s with DirectQuery tables',
    ],
    outcome: 'Real-time performance monitoring + cached cost/inventory data in one model',
  },
  {
    phase: 'Phase 3 — Scale & Embed',
    duration: 'Weeks 5–6',
    mode: 'Composite + Embedded',
    sku: 'Fabric F8 ($1,050/mo) or Embedded A2 ($1,470/mo)',
    color: '#f59e0b',
    tasks: [
      'Embed reports into the Next.js SWA using powerbi-client-react SDK',
      'Implement row-level security (RLS) per resource group',
      'Configure Power BI alerts → Teams/email on IOPS > 80%, Latency > 10ms',
      'Set up mobile dashboard for on-call engineers',
      'Load test: validate capacity handles 15+ concurrent viewers',
    ],
    outcome: 'Embedded analytics with unlimited viewers, alerts, and mobile access',
  },
  {
    phase: 'Phase 4 — DirectLake Migration',
    duration: 'Weeks 7–10',
    mode: 'DirectLake',
    sku: 'Fabric F8+ ($1,050+/mo)',
    color: '#10b981',
    tasks: [
      'Create Fabric Lakehouse in the workspace',
      'Set up data pipeline: Log Analytics → Eventstream → Lakehouse (Delta tables)',
      'Set up pipeline: Cost/Inventory/Advisor APIs → Lakehouse (Delta tables)',
      'Switch semantic model from Import/DQ to DirectLake mode',
      'Remove scheduled refresh — DirectLake auto-refreshes from Delta',
      'Validate: Import-like speed (<200ms/visual) with near real-time freshness',
      'Enable Copilot for natural language Q&A on reports',
    ],
    outcome: 'Zero-refresh, near real-time analytics with DirectLake — the end state',
  },
  {
    phase: 'Phase 5 — Enterprise Rollout',
    duration: 'Weeks 11–14',
    mode: 'DirectLake + Copilot',
    sku: 'Fabric F64 ($8,397/mo)',
    color: '#ef4444',
    tasks: [
      'Scale capacity to F64 for unlimited Power BI viewers',
      'Onboard additional teams: Finance, Security, App Dev',
      'Create deployment pipeline: Dev → Test → Production workspaces',
      'Add Copilot summaries and AI narration to reports',
      'Set up autoscale rules: scale up on CPU > 70%, scale down on < 30%',
      'Integrate with Azure DevOps for report version control (TMDL format)',
      'Document data lineage, refresh schedules, and support runbook',
    ],
    outcome: 'Enterprise-grade analytics platform with AI, version control, and multi-team access',
  },
];

const UPGRADE_COMPARISON = [
  { from: 'Pro', to: 'PPU', trigger: 'Need >1 GB datasets, AI features, or 48 refreshes/day', effort: 'Low — change license type per user', downtime: 'None', risk: 'Low' },
  { from: 'Pro', to: 'Fabric F2', trigger: 'Need embedding, pause/resume billing, or >10 viewers', effort: 'Medium — provision Fabric capacity + reassign workspace', downtime: '~5 min (workspace reassignment)', risk: 'Low' },
  { from: 'PPU', to: 'Fabric F8', trigger: 'Need DirectLake, Copilot, or unlimited viewers', effort: 'Medium — provision capacity, migrate workspace', downtime: '~10 min', risk: 'Low' },
  { from: 'Embedded A1', to: 'Fabric F8', trigger: 'Want DirectLake, Copilot, pause/resume + lower cost', effort: 'Medium — reassign workspace to Fabric capacity', downtime: '~10 min', risk: 'Low' },
  { from: 'Premium P1', to: 'Fabric F64', trigger: 'Microsoft retiring Premium Per Capacity (2027). Fabric is successor.', effort: 'High — migrate workspaces, test all reports', downtime: '~30 min (planned)', risk: 'Medium' },
  { from: 'Import', to: 'DirectQuery', trigger: 'Need real-time data freshness (e.g., live IOPS monitoring)', effort: 'Medium — change storage mode per table, optimize source queries', downtime: 'None (new model version)', risk: 'Medium — source perf matters' },
  { from: 'Import', to: 'DirectLake', trigger: 'Data in OneLake (Lakehouse/Warehouse). Want zero-refresh + speed.', effort: 'High — build data pipeline to Lakehouse first', downtime: 'None (new model)', risk: 'Medium — new pipeline' },
  { from: 'DirectQuery', to: 'DirectLake', trigger: 'Slow DQ visuals, want Import-like speed without losing freshness', effort: 'High — move data to OneLake Delta tables', downtime: 'None (new model)', risk: 'Medium — pipeline work' },
  { from: 'Composite', to: 'DirectLake', trigger: 'Simplify architecture — one mode replaces Import + DQ', effort: 'High — all tables must be in OneLake', downtime: 'None (new model)', risk: 'Low once pipeline is set up' },
];

interface PbiSku {
  name: string;
  sku: string;
  vCores: number;
  ramGb: number;
  maxDatasetGb: number;
  refreshesPerDay: number;
  price: string;
  priceNum: number;
  bestFor: string;
  tier: 'Free' | 'Pro' | 'PPU' | 'Premium' | 'Embedded' | 'Fabric';
  color: string;
}

const PBI_SKUS: PbiSku[] = [
  { name: 'Power BI Free', sku: 'Free', vCores: 0, ramGb: 0, maxDatasetGb: 1, refreshesPerDay: 8, price: '$0', priceNum: 0, bestFor: 'Individual exploration, no sharing', tier: 'Free', color: '#64748b' },
  { name: 'Power BI Pro', sku: 'Pro', vCores: 0, ramGb: 0, maxDatasetGb: 1, refreshesPerDay: 8, price: '$9.99/user/mo', priceNum: 9.99, bestFor: 'Small teams (<10 users), sharing & collaboration', tier: 'Pro', color: '#3b82f6' },
  { name: 'Power BI Premium Per User', sku: 'PPU', vCores: 0, ramGb: 0, maxDatasetGb: 100, refreshesPerDay: 48, price: '$20/user/mo', priceNum: 20, bestFor: 'Advanced analytics, AI, large datasets per user', tier: 'PPU', color: '#8b5cf6' },
  { name: 'Power BI Embedded A1', sku: 'A1', vCores: 1, ramGb: 3, maxDatasetGb: 3, refreshesPerDay: 0, price: '$735/mo', priceNum: 735, bestFor: 'Embed reports in custom apps, pay-per-capacity', tier: 'Embedded', color: '#06b6d4' },
  { name: 'Power BI Embedded A2', sku: 'A2', vCores: 2, ramGb: 5, maxDatasetGb: 6, refreshesPerDay: 0, price: '$1,470/mo', priceNum: 1470, bestFor: 'Medium embedded workloads, more concurrency', tier: 'Embedded', color: '#06b6d4' },
  { name: 'Power BI Embedded A4', sku: 'A4', vCores: 8, ramGb: 25, maxDatasetGb: 25, refreshesPerDay: 0, price: '$5,878/mo', priceNum: 5878, bestFor: 'Large embedded deployments, high concurrency', tier: 'Embedded', color: '#06b6d4' },
  { name: 'Premium P1', sku: 'P1', vCores: 8, ramGb: 25, maxDatasetGb: 25, refreshesPerDay: 48, price: '$4,995/mo', priceNum: 4995, bestFor: 'Unlimited viewers, paginated reports, XMLA endpoint', tier: 'Premium', color: '#f59e0b' },
  { name: 'Premium P2', sku: 'P2', vCores: 16, ramGb: 50, maxDatasetGb: 50, refreshesPerDay: 48, price: '$9,990/mo', priceNum: 9990, bestFor: 'Large enterprise, very large datasets', tier: 'Premium', color: '#f59e0b' },
  { name: 'Fabric F2', sku: 'F2', vCores: 2, ramGb: 0, maxDatasetGb: 3, refreshesPerDay: 0, price: '$262/mo', priceNum: 262, bestFor: 'Entry-level Fabric, pause/resume, Azure-native', tier: 'Fabric', color: '#10b981' },
  { name: 'Fabric F4', sku: 'F4', vCores: 4, ramGb: 0, maxDatasetGb: 3, refreshesPerDay: 0, price: '$525/mo', priceNum: 525, bestFor: 'Small Fabric workloads, Power BI + Data Engineering', tier: 'Fabric', color: '#10b981' },
  { name: 'Fabric F8', sku: 'F8', vCores: 8, ramGb: 0, maxDatasetGb: 25, refreshesPerDay: 0, price: '$1,050/mo', priceNum: 1050, bestFor: 'Copilot-enabled, full Fabric analytics, DirectLake', tier: 'Fabric', color: '#10b981' },
  { name: 'Fabric F64', sku: 'F64', vCores: 64, ramGb: 0, maxDatasetGb: 400, refreshesPerDay: 0, price: '$8,397/mo', priceNum: 8397, bestFor: 'Enterprise Fabric, unlimited Power BI viewers, Copilot', tier: 'Fabric', color: '#10b981' },
];

const PERF_TESTS = [
  {
    tool: 'Power BI Performance Analyzer',
    type: 'Built-in',
    desc: 'Built into Power BI Desktop. Records time for each visual: DAX query, visual rendering, and other processing. Use View → Performance Analyzer → Start Recording.',
    metrics: ['DAX query duration (ms)', 'Visual display time (ms)', 'Other processing time (ms)', 'Total render time per visual'],
    when: 'During development to identify slow visuals before publishing',
    steps: ['Open report in Power BI Desktop', 'View → Performance Analyzer → Start recording', 'Navigate between pages and interact with slicers', 'Click "Stop" → export results to JSON', 'Sort by total time to find bottlenecks'],
  },
  {
    tool: 'DAX Studio',
    type: 'External (free)',
    desc: 'Open-source tool for DAX query profiling. Connects to published datasets via XMLA endpoint. Measures server timings: Storage Engine (SE) vs Formula Engine (FE).',
    metrics: ['SE query time (ms)', 'FE query time (ms)', 'SE queries count', 'Cache hit/miss ratio', 'Rows scanned vs returned'],
    when: 'Profiling slow DAX measures, optimizing data model cardinality',
    steps: ['Connect to workspace via XMLA endpoint', 'Enable Server Timings (F3)', 'Run DAX query from measure or Performance Analyzer export', 'Analyze SE vs FE split — SE should be >90% of work', 'Look for high-cardinality columns causing FE bottlenecks'],
  },
  {
    tool: 'Best Practice Analyzer (Tabular Editor)',
    type: 'External (free)',
    desc: 'Scans the data model (.bim) for anti-patterns: unused columns, missing summarization, high-cardinality text columns, bi-directional relationships.',
    metrics: ['Rule violations by severity', 'Model size estimate', 'Column cardinality report', 'Relationship complexity'],
    when: 'Before publishing — catches model design issues that degrade query performance',
    steps: ['Open .pbix in Tabular Editor 3 (free)', 'Run Best Practice Analyzer (BPA)', 'Fix Critical + Warning rules', 'Re-check: ensure no "high cardinality" or "unused columns" warnings', 'Export clean model back to .pbix'],
  },
  {
    tool: 'Azure Log Analytics (Capacity Metrics)',
    type: 'Azure-native',
    desc: 'For Premium/Fabric capacities. Monitor CPU usage, query duration, refresh duration, and throttling events via the "Microsoft Fabric Capacity Metrics" app.',
    metrics: ['CPU % consumed', 'Query overload seconds', 'Refresh duration (s)', 'Throttling events/day', 'Active vs background CU usage'],
    when: 'Post-deployment monitoring of production capacity health',
    steps: ['Install "Microsoft Fabric Capacity Metrics" app from AppSource', 'Connect to your capacity ID', 'Monitor CPU tab: sustained >80% = need to scale up', 'Check Throttling tab: any throttle events = user impact', 'Set alerts on CPU > 70% for proactive scale-out'],
  },
  {
    tool: 'Power BI REST API (Load Testing)',
    type: 'Custom script',
    desc: 'Use the Power BI REST API to programmatically execute queries against a published dataset and measure response times under concurrent load.',
    metrics: ['Response time (P50/P95/P99)', 'Concurrent user capacity', 'Error rate under load', 'Throttle/429 response count'],
    when: 'Before go-live — validate capacity can handle expected concurrent viewers',
    steps: ['Register Azure AD app with Power BI read permissions', 'Script sequential queries: POST /datasets/{id}/executeQueries', 'Ramp up concurrency: 1 → 5 → 10 → 25 → 50 parallel', 'Measure P95 response time at each concurrency level', 'If P95 > 3s at target concurrency, scale up capacity SKU'],
  },
];

const PERF_BENCHMARKS = [
  { metric: 'Visual render time', good: '< 500ms', warning: '500ms – 2s', critical: '> 2s', action: 'Reduce visual count per page, simplify DAX' },
  { metric: 'DAX query time', good: '< 200ms', warning: '200ms – 1s', critical: '> 1s', action: 'Optimize measures, add aggregation tables' },
  { metric: 'Page load time', good: '< 3s', warning: '3s – 8s', critical: '> 8s', action: 'Reduce visuals to <8 per page, use bookmarks' },
  { metric: 'Dataset refresh', good: '< 5 min', warning: '5 – 30 min', critical: '> 30 min', action: 'Enable incremental refresh, reduce columns' },
  { metric: 'Model size', good: '< 500 MB', warning: '500 MB – 2 GB', critical: '> 2 GB', action: 'Remove unused columns, reduce cardinality' },
  { metric: 'Capacity CPU', good: '< 50%', warning: '50% – 80%', critical: '> 80%', action: 'Scale up SKU or optimize queries' },
  { metric: 'Concurrent users', good: 'No throttling', warning: 'Occasional 429s', critical: 'Frequent 429s', action: 'Scale up or enable autoscale (Fabric)' },
];

export default function PowerBISpecPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedOption, setExpandedOption] = useState<number | null>(null);
  const [calcUsers, setCalcUsers] = useState(10);
  const [calcAuthors, setCalcAuthors] = useState(2);
  const [calcDatasetGb, setCalcDatasetGb] = useState(5);
  const [calcConcurrent, setCalcConcurrent] = useState(5);

  const calcResults = useMemo(() => {
    return PBI_SKUS.map(sku => {
      let authCost = 0;
      let viewerCost = 0;
      let capacityCost = 0;
      let totalCost = 0;
      let fits = true;
      let note = '';

      if (sku.tier === 'Free') {
        authCost = 0; viewerCost = 0; capacityCost = 0;
        fits = calcUsers <= 1 && calcDatasetGb <= 1;
        note = fits ? 'Single user only, no sharing' : 'Cannot share reports';
      } else if (sku.tier === 'Pro') {
        authCost = sku.priceNum * calcAuthors;
        viewerCost = sku.priceNum * calcUsers;
        totalCost = authCost + viewerCost;
        fits = calcDatasetGb <= 1;
        note = fits ? 'Each viewer needs Pro license' : `Dataset ${calcDatasetGb} GB exceeds 1 GB limit`;
      } else if (sku.tier === 'PPU') {
        authCost = sku.priceNum * calcAuthors;
        viewerCost = sku.priceNum * calcUsers;
        totalCost = authCost + viewerCost;
        fits = calcDatasetGb <= 100;
        note = fits ? 'Each viewer needs PPU license' : `Dataset ${calcDatasetGb} GB exceeds 100 GB limit`;
      } else if (sku.tier === 'Embedded') {
        authCost = 9.99 * calcAuthors;
        viewerCost = 0;
        capacityCost = sku.priceNum;
        totalCost = authCost + capacityCost;
        fits = calcDatasetGb <= sku.maxDatasetGb;
        note = fits ? `Unlimited viewers, ${sku.vCores} vCores` : `Dataset ${calcDatasetGb} GB exceeds ${sku.maxDatasetGb} GB limit`;
      } else if (sku.tier === 'Premium') {
        authCost = 9.99 * calcAuthors;
        viewerCost = 0;
        capacityCost = sku.priceNum;
        totalCost = authCost + capacityCost;
        fits = calcDatasetGb <= sku.maxDatasetGb;
        note = fits ? `Unlimited viewers, ${sku.vCores} vCores, paginated reports` : `Dataset ${calcDatasetGb} GB exceeds ${sku.maxDatasetGb} GB limit`;
      } else if (sku.tier === 'Fabric') {
        authCost = 9.99 * calcAuthors;
        viewerCost = sku.sku === 'F64' ? 0 : 9.99 * calcUsers;
        capacityCost = sku.priceNum;
        totalCost = authCost + viewerCost + capacityCost;
        fits = calcDatasetGb <= sku.maxDatasetGb;
        note = fits
          ? (sku.sku === 'F64' ? 'Unlimited viewers, Copilot, DirectLake' : `Viewers need Pro/PPU license below F64`)
          : `Dataset ${calcDatasetGb} GB exceeds ${sku.maxDatasetGb} GB limit`;
      }

      return { ...sku, authCost, viewerCost, capacityCost, totalCost, fits, note };
    }).sort((a, b) => {
      if (a.fits && !b.fits) return -1;
      if (!a.fits && b.fits) return 1;
      return a.totalCost - b.totalCost;
    });
  }, [calcUsers, calcAuthors, calcDatasetGb, calcConcurrent]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'architecture', label: 'Architecture' },
    { key: 'connectivity', label: 'Connectivity' },
    { key: 'azure-options', label: 'Azure SKUs' },
    { key: 'regions-capacity', label: 'Regions & Capacity' },
    { key: 'datasets', label: 'Datasets' },
    { key: 'reports', label: 'Reports' },
    { key: 'performance', label: 'Perf Testing' },
    { key: 'implementation', label: 'Implementation' },
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

        {/* ============= CONNECTIVITY — DirectLake / DirectQuery / Import ============= */}
        {tab === 'connectivity' && (<>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5" role="note">
            <strong className="text-emerald-200">🔌 Connection Modes:</strong>
            <span className="text-emerald-100/80 ml-1">Power BI supports 4 connectivity modes — Import, DirectQuery, DirectLake, and Composite. Each trades off speed vs. freshness vs. cost. Choose based on your data volume, refresh requirements, and Fabric availability.</span>
          </div>

          {/* Mode Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CONNECTION_MODES.map(mode => (
              <div key={mode.name} className="rounded-xl border bg-slate-800 overflow-hidden" style={{ borderColor: mode.color + '40' }}>
                <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3" style={{ backgroundColor: mode.color + '10' }}>
                  <span className="text-2xl">{mode.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{mode.name}</h3>
                    <p className="text-sm text-slate-400">{mode.bestFor}</p>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-sm text-slate-200 leading-relaxed">{mode.howItWorks}</p>

                  {/* Key stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-3 py-2">
                      <div className="text-xs text-slate-400">Latency</div>
                      <div className="text-sm font-bold text-white">{mode.latency}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-3 py-2">
                      <div className="text-xs text-slate-400">Freshness</div>
                      <div className="text-sm font-bold text-white">{mode.freshness}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-3 py-2">
                      <div className="text-xs text-slate-400">Max Dataset</div>
                      <div className="text-sm font-bold text-white">{mode.maxDataset}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-3 py-2">
                      <div className="text-xs text-slate-400">Min SKU</div>
                      <div className="text-sm font-bold text-white">{mode.skuRequired}</div>
                    </div>
                  </div>

                  {/* Data Flow */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Data Flow</h4>
                    <div className="flex flex-col gap-1">
                      {mode.dataFlow.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: mode.color + '20', color: mode.color }}>{i + 1}</span>
                          <span className="text-slate-200">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pros & Cons */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400 mb-1.5">Pros</h4>
                      {mode.pros.map(p => (
                        <div key={p} className="flex items-start gap-1.5 text-xs text-slate-300 mb-1">
                          <span className="text-emerald-400 flex-shrink-0">+</span><span>{p}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-red-400 mb-1.5">Cons</h4>
                      {mode.cons.map(c => (
                        <div key={c} className="flex items-start gap-1.5 text-xs text-slate-300 mb-1">
                          <span className="text-red-400 flex-shrink-0">−</span><span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Azure Setup */}
                  <div className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Azure Setup Steps</h4>
                    {mode.azureSetup.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300 mb-1">
                        <span className="text-slate-500 w-3 flex-shrink-0">{i + 1}.</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-side comparison table */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Mode Comparison Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-3 py-3 text-left font-semibold">Attribute</th>
                    {CONNECTION_MODES.map(m => (
                      <th key={m.name} className="px-3 py-3 text-center font-semibold" style={{ color: m.color }}>{m.icon} {m.name.replace(' Mode', '').replace(' (Hybrid)', '')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { attr: 'Query speed', vals: ['⚡⚡⚡ Fastest', '⚡ Slow (network)', '⚡⚡⚡ Near-import', '⚡⚡ Mixed'] },
                    { attr: 'Data freshness', vals: ['Stale (scheduled)', '✓ Real-time', '✓ Near real-time', 'Mixed'] },
                    { attr: 'Dataset size limit', vals: ['1–400 GB (by SKU)', 'Unlimited', 'Unlimited', 'Mixed'] },
                    { attr: 'Refresh required', vals: ['Yes (scheduled)', 'No', 'No', 'Partial'] },
                    { attr: 'Source load', vals: ['Only at refresh', 'Every query', 'None (reads OneLake)', 'Partial'] },
                    { attr: 'Full DAX support', vals: ['✓ Yes', '✗ Limited', '✓ Yes', '✓ Yes'] },
                    { attr: 'Copilot / AI', vals: ['✓ PPU+', '✗ No', '✓ F8+', '✓ PPU+'] },
                    { attr: 'Offline access', vals: ['✓ Yes', '✗ No', '✗ No', '✗ Partial'] },
                    { attr: 'Min SKU', vals: ['Free', 'Pro', 'Fabric F2', 'PPU'] },
                    { attr: 'Complexity', vals: ['Low', 'Medium', 'High (pipeline)', 'High (design)'] },
                  ].map(row => (
                    <tr key={row.attr} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-3 py-2.5 font-medium text-white">{row.attr}</td>
                      {row.vals.map((v, i) => (
                        <td key={i} className="px-3 py-2.5 text-center text-sm text-slate-300">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timeline / Upgrade Path */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-2">Upgrade Timeline — POC to Enterprise</h3>
            <p className="text-sm text-slate-400 mb-6">A phased approach to progressively adopt better connectivity modes and higher-capacity SKUs as the project matures.</p>

            {/* Visual timeline bar */}
            <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
              {UPGRADE_TIMELINE.map((phase, i) => (
                <div key={i} className="flex items-center flex-shrink-0">
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto" style={{ backgroundColor: phase.color }}>{i + 1}</div>
                    <div className="text-xs font-bold text-white mt-1.5 max-w-[120px]">{phase.phase.replace(/ — .*/, '')}</div>
                    <div className="text-xs text-slate-400">{phase.duration}</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: phase.color }}>{phase.mode}</div>
                  </div>
                  {i < UPGRADE_TIMELINE.length - 1 && (
                    <div className="w-16 h-0.5 mx-2" style={{ backgroundColor: phase.color + '60' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Phase details */}
            <div className="space-y-4">
              {UPGRADE_TIMELINE.map((phase, i) => (
                <div key={i} className="rounded-lg border overflow-hidden" style={{ borderColor: phase.color + '30' }}>
                  <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: phase.color + '08' }}>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: phase.color }}>{i + 1}</div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{phase.phase}</h4>
                        <span className="text-xs text-slate-400">{phase.duration} · <span className="font-mono" style={{ color: phase.color }}>{phase.mode}</span></span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">{phase.sku}</span>
                  </div>
                  <div className="px-5 py-4 bg-slate-800/50 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <h5 className="text-xs font-bold text-slate-400 uppercase mb-1.5">Tasks</h5>
                        {phase.tasks.map((t, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm text-slate-300 mb-1">
                            <span className="text-xs text-slate-500 w-3 flex-shrink-0 mt-0.5">{j + 1}.</span>
                            <span>{t}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-400 uppercase mb-1.5">Outcome</h5>
                        <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 p-3">
                          <p className="text-sm text-slate-200">{phase.outcome}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade Path Decision Table */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Upgrade Decision Table</h3>
            <p className="text-sm text-slate-400 mb-4">When to upgrade from one SKU/mode to another — triggers, effort, and risk.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-3 py-3 text-left font-semibold">From</th>
                    <th className="px-3 py-3 text-center font-semibold">→</th>
                    <th className="px-3 py-3 text-left font-semibold">To</th>
                    <th className="px-3 py-3 text-left font-semibold">Trigger</th>
                    <th className="px-3 py-3 text-left font-semibold">Effort</th>
                    <th className="px-3 py-3 text-center font-semibold">Downtime</th>
                    <th className="px-3 py-3 text-center font-semibold">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {UPGRADE_COMPARISON.map((u, i) => (
                    <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-3 py-2.5 font-mono font-semibold text-blue-400">{u.from}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500">→</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-emerald-400">{u.to}</td>
                      <td className="px-3 py-2.5 text-slate-300 text-xs max-w-[250px]">{u.trigger}</td>
                      <td className="px-3 py-2.5 text-slate-300 text-xs max-w-[200px]">{u.effort}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-slate-400">{u.downtime}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          u.risk === 'Low' ? 'bg-emerald-500/20 text-emerald-400' :
                          u.risk.startsWith('Medium') ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{u.risk}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="text-base font-bold text-emerald-300 mb-2">Recommended Path for Disk Monitoring</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Start with <strong className="text-white">Import mode + Pro licenses</strong> (Phase 1). 
              Add <strong className="text-white">DirectQuery for live IOPS/latency</strong> tables in Phase 2 using a Composite model. 
              When Fabric is adopted, migrate to <strong className="text-white">DirectLake</strong> — it gives Import-like speed with near real-time freshness and eliminates scheduled refresh entirely.
              DirectLake is the endgame for all Power BI analytics on Azure.
            </p>
          </div>
        </>)}

        {/* ============= AZURE SKU OPTIONS ============= */}
        {tab === 'azure-options' && (<>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5" role="note">
            <strong className="text-blue-200">Power BI on Azure:</strong>
            <span className="text-blue-100/80 ml-1">Azure offers multiple Power BI SKUs — from free per-user licenses to dedicated Fabric capacities. The right choice depends on viewer count, dataset size, and whether you need embedding. Use the calculator below to compare costs for your scenario.</span>
          </div>

          {/* SKU Comparison Table */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Power BI SKU Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-3 py-3 text-left font-semibold">SKU</th>
                    <th className="px-3 py-3 text-left font-semibold">Tier</th>
                    <th className="px-3 py-3 text-center font-semibold">vCores</th>
                    <th className="px-3 py-3 text-center font-semibold">Max Dataset</th>
                    <th className="px-3 py-3 text-center font-semibold">Refreshes/Day</th>
                    <th className="px-3 py-3 text-right font-semibold">Price</th>
                    <th className="px-3 py-3 text-left font-semibold">Best For</th>
                  </tr>
                </thead>
                <tbody>
                  {PBI_SKUS.map(sku => (
                    <tr key={sku.sku} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-3 py-2.5 font-semibold text-white">{sku.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: sku.color + '20', color: sku.color }}>{sku.tier}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-300">{sku.vCores || '—'}</td>
                      <td className="px-3 py-2.5 text-center text-slate-300">{sku.maxDatasetGb} GB</td>
                      <td className="px-3 py-2.5 text-center text-slate-300">{sku.refreshesPerDay || 'Unlimited'}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-400">{sku.price}</td>
                      <td className="px-3 py-2.5 text-slate-400 text-xs">{sku.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feature Comparison by Tier */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Feature Comparison by Tier</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-3 py-3 text-left font-semibold">Feature</th>
                    <th className="px-3 py-3 text-center font-semibold">Free</th>
                    <th className="px-3 py-3 text-center font-semibold">Pro</th>
                    <th className="px-3 py-3 text-center font-semibold">PPU</th>
                    <th className="px-3 py-3 text-center font-semibold">Embedded</th>
                    <th className="px-3 py-3 text-center font-semibold">Premium</th>
                    <th className="px-3 py-3 text-center font-semibold">Fabric</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Create reports', free: true, pro: true, ppu: true, embedded: true, premium: true, fabric: true },
                    { feature: 'Share dashboards', free: false, pro: true, ppu: true, embedded: true, premium: true, fabric: true },
                    { feature: 'Embed in apps', free: false, pro: false, ppu: false, embedded: true, premium: true, fabric: true },
                    { feature: 'Unlimited viewers', free: false, pro: false, ppu: false, embedded: true, premium: true, fabric: 'F64+' },
                    { feature: 'Paginated reports', free: false, pro: false, ppu: true, embedded: true, premium: true, fabric: true },
                    { feature: 'AI / Copilot', free: false, pro: false, ppu: true, embedded: false, premium: true, fabric: 'F8+' },
                    { feature: 'XMLA endpoint', free: false, pro: false, ppu: true, embedded: true, premium: true, fabric: true },
                    { feature: 'Incremental refresh', free: false, pro: false, ppu: true, embedded: true, premium: true, fabric: true },
                    { feature: 'DirectLake mode', free: false, pro: false, ppu: false, embedded: false, premium: false, fabric: true },
                    { feature: 'Pause / resume billing', free: false, pro: false, ppu: false, embedded: true, premium: false, fabric: true },
                    { feature: 'Autoscale', free: false, pro: false, ppu: false, embedded: false, premium: true, fabric: true },
                    { feature: 'Dataflows Gen2', free: false, pro: true, ppu: true, embedded: false, premium: true, fabric: true },
                  ].map(row => (
                    <tr key={row.feature} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-3 py-2 text-white font-medium">{row.feature}</td>
                      {['free', 'pro', 'ppu', 'embedded', 'premium', 'fabric'].map(tier => {
                        const val = row[tier as keyof typeof row];
                        return (
                          <td key={tier} className="px-3 py-2 text-center">
                            {val === true ? <span className="text-emerald-400 font-bold">✓</span> :
                             val === false ? <span className="text-slate-600">—</span> :
                             <span className="text-amber-400 text-xs font-semibold">{String(val)}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost Calculator */}
          <div className="rounded-xl border border-amber-500/30 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">💰 Cost Calculator — Find Your Best SKU</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Report Viewers</label>
                <input type="number" min={1} max={1000} value={calcUsers} onChange={e => setCalcUsers(Math.max(1, parseInt(e.target.value) || 1))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white text-lg font-bold focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Report Authors</label>
                <input type="number" min={1} max={50} value={calcAuthors} onChange={e => setCalcAuthors(Math.max(1, parseInt(e.target.value) || 1))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white text-lg font-bold focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Dataset Size (GB)</label>
                <input type="number" min={1} max={400} value={calcDatasetGb} onChange={e => setCalcDatasetGb(Math.max(1, parseInt(e.target.value) || 1))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white text-lg font-bold focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Concurrent Users</label>
                <input type="number" min={1} max={500} value={calcConcurrent} onChange={e => setCalcConcurrent(Math.max(1, parseInt(e.target.value) || 1))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-white text-lg font-bold focus:border-blue-500 focus:outline-none" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-3 py-3 text-left font-semibold">SKU</th>
                    <th className="px-3 py-3 text-center font-semibold">Fits?</th>
                    <th className="px-3 py-3 text-right font-semibold">Author Cost</th>
                    <th className="px-3 py-3 text-right font-semibold">Viewer Cost</th>
                    <th className="px-3 py-3 text-right font-semibold">Capacity Cost</th>
                    <th className="px-3 py-3 text-right font-semibold">Total/mo</th>
                    <th className="px-3 py-3 text-right font-semibold">Annual</th>
                    <th className="px-3 py-3 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {calcResults.map((r, i) => (
                    <tr key={r.sku} className={`border-b border-slate-700/30 ${!r.fits ? 'opacity-40' : i === 0 ? 'bg-emerald-500/5 ring-1 ring-emerald-500/30' : 'hover:bg-slate-700/20'}`}>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-white">{r.name}</span>
                        {i === 0 && r.fits && <span className="ml-2 rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-xs font-bold">Best Value</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {r.fits ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-red-400 font-bold">✗</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">${r.authCost.toFixed(0)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">${r.viewerCost.toFixed(0)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-300">${r.capacityCost.toFixed(0)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-400">${r.totalCost.toFixed(0)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-400">${(r.totalCost * 12).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-400 max-w-[200px]">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">* Prices are estimates based on published Azure pricing as of March 2026. Actual costs may vary by region and agreement.</p>
          </div>

          {/* Recommendation */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="text-base font-bold text-emerald-300 mb-2">Recommendation for This Project</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              For the Disk Monitoring POC with 5 VMs, 13 disks, and a ~500 MB dataset: start with <strong className="text-white">Power BI Pro</strong> ($9.99/user/mo) for a small team.
              If viewer count exceeds 10 or you need embedding, switch to <strong className="text-white">Fabric F2</strong> ($262/mo, pause when not in use).
              For enterprise rollout with Copilot, target <strong className="text-white">Fabric F64</strong> (unlimited viewers, DirectLake, AI).
            </p>
          </div>
        </>)}

        {/* ============= REGIONS & CAPACITY ============= */}
        {tab === 'regions-capacity' && (<>
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5" role="note">
            <strong className="text-cyan-200">🌍 Regions & Capacity Planning:</strong>
            <span className="text-cyan-100/80 ml-1">Power BI and Fabric capacities run in specific Azure regions. Choosing the right region affects latency, data residency compliance, and available features. Capacity estimation ensures your SKU can handle the workload without throttling.</span>
          </div>

          {/* Region Selection */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-2">Power BI / Fabric Region Availability</h3>
            <p className="text-sm text-slate-400 mb-4">Fabric capacities are available in 40+ Azure regions. Your Power BI tenant home region is set when the tenant is created — but Fabric capacities can be provisioned in any supported region. Choose the region closest to your data sources to minimize query latency.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-3 py-3 text-left font-semibold">Region</th>
                    <th className="px-3 py-3 text-left font-semibold">Geography</th>
                    <th className="px-3 py-3 text-center font-semibold">Fabric</th>
                    <th className="px-3 py-3 text-center font-semibold">Embedded</th>
                    <th className="px-3 py-3 text-center font-semibold">Premium</th>
                    <th className="px-3 py-3 text-center font-semibold">Copilot</th>
                    <th className="px-3 py-3 text-center font-semibold">Multi-Geo</th>
                    <th className="px-3 py-3 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { region: 'East US 2', geo: 'US', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: '⭐ This project\'s region. Log Analytics + VMs here.', highlight: true },
                    { region: 'East US', geo: 'US', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Largest US region, most service availability' },
                    { region: 'West US 2', geo: 'US', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Secondary US West option' },
                    { region: 'West US 3', geo: 'US', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Newest US West' },
                    { region: 'Central US', geo: 'US', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Central backup for US workloads' },
                    { region: 'Canada Central', geo: 'Canada', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Canadian data residency' },
                    { region: 'Canada East', geo: 'Canada', fabric: true, embedded: true, premium: true, copilot: false, multiGeo: true, notes: 'DR pair for Canada Central' },
                    { region: 'North Europe', geo: 'Europe', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Ireland — popular EU region' },
                    { region: 'West Europe', geo: 'Europe', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Netherlands — EU data residency' },
                    { region: 'UK South', geo: 'Europe', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'UK data sovereignty' },
                    { region: 'France Central', geo: 'Europe', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'French data residency' },
                    { region: 'Germany West Central', geo: 'Europe', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'German data sovereignty' },
                    { region: 'Sweden Central', geo: 'Europe', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Azure OpenAI + Fabric hub' },
                    { region: 'Southeast Asia', geo: 'Asia Pacific', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Singapore — APAC hub' },
                    { region: 'Australia East', geo: 'Asia Pacific', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Australian data residency' },
                    { region: 'Japan East', geo: 'Asia Pacific', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'Primary Japan region' },
                    { region: 'Central India', geo: 'Asia Pacific', fabric: true, embedded: true, premium: true, copilot: true, multiGeo: true, notes: 'India data residency' },
                    { region: 'Brazil South', geo: 'South America', fabric: true, embedded: true, premium: true, copilot: false, multiGeo: true, notes: 'Only South America region with Fabric' },
                    { region: 'South Africa North', geo: 'Africa', fabric: true, embedded: true, premium: true, copilot: false, multiGeo: true, notes: 'Africa data residency' },
                    { region: 'UAE North', geo: 'Middle East', fabric: true, embedded: true, premium: true, copilot: false, multiGeo: true, notes: 'Middle East data residency' },
                  ].map(r => (
                    <tr key={r.region} className={`border-b border-slate-700/30 hover:bg-slate-700/20 ${r.highlight ? 'bg-cyan-500/5 ring-1 ring-cyan-500/20' : ''}`}>
                      <td className="px-3 py-2.5 font-semibold text-white">
                        {r.region}
                        {r.highlight && <span className="ml-2 rounded-full bg-cyan-500/20 text-cyan-400 px-2 py-0.5 text-xs font-bold">Current</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">{r.geo}</td>
                      {['fabric', 'embedded', 'premium', 'copilot', 'multiGeo'].map(k => (
                        <td key={k} className="px-3 py-2.5 text-center">
                          {(r as Record<string, unknown>)[k] ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-slate-600">—</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-xs text-slate-400">{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Region Selection Criteria */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">How to Choose a Region</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: '📡 Data Proximity',
                  color: '#3b82f6',
                  desc: 'Place your Power BI / Fabric capacity in the same region as your data sources. For this project, all resources (Log Analytics, VMs, Disks) are in East US 2 — so the capacity should be in East US 2.',
                  details: [
                    'DirectQuery latency = roundtrip to source region',
                    'Same-region queries: 5–30ms network latency',
                    'Cross-region queries: 50–200ms added latency',
                    'DirectLake: data in OneLake same region = <5ms',
                  ],
                },
                {
                  title: '🛡️ Data Residency & Compliance',
                  color: '#f59e0b',
                  desc: 'Regulatory requirements may mandate data stays in a specific geography. Power BI Multi-Geo lets you place datasets in a different region than your tenant home.',
                  details: [
                    'GDPR: EU data must stay in EU regions',
                    'HIPAA: US healthcare data → US regions only',
                    'Government: Azure Gov regions for FedRAMP',
                    'Multi-Geo: Premium/Fabric feature, extra cost',
                  ],
                },
                {
                  title: '⚡ Feature Availability',
                  color: '#10b981',
                  desc: 'Not all regions support all features. Copilot requires specific regions. DirectLake requires Fabric capacity. Check Azure status page for your region.',
                  details: [
                    'Copilot: US, EU, UK, Canada, Australia, Japan, India, SE Asia',
                    'Real-Time Intelligence: all Fabric regions',
                    'Eventstream: all Fabric regions',
                    'AI Skills: limited to Copilot-enabled regions',
                  ],
                },
                {
                  title: '💰 Pricing Variation',
                  color: '#ef4444',
                  desc: 'Fabric capacity prices vary by region. US regions are typically baseline. Europe is ~10–15% higher. Brazil and South Africa can be 20–40% higher.',
                  details: [
                    'East US 2: $0.36/hr (F2) — baseline',
                    'West Europe: $0.40/hr (F2) — ~11% premium',
                    'Brazil South: $0.52/hr (F2) — ~44% premium',
                    'Australia East: $0.43/hr (F2) — ~19% premium',
                  ],
                },
                {
                  title: '🔄 Disaster Recovery',
                  color: '#8b5cf6',
                  desc: 'For business continuity, consider the paired region for failover. Azure pairs regions for automatic geo-replication of some services.',
                  details: [
                    'East US 2 ↔ Central US (paired)',
                    'West Europe ↔ North Europe (paired)',
                    'Canada Central ↔ Canada East (paired)',
                    'Fabric BCDR: workspace-level backup (preview)',
                  ],
                },
                {
                  title: '🌐 Multi-Region Strategy',
                  color: '#06b6d4',
                  desc: 'For global orgs, use Multi-Geo to place datasets near regional users while keeping a single tenant. Requires Premium or Fabric capacity.',
                  details: [
                    'Tenant home: where metadata + reports live',
                    'Multi-Geo: datasets can be pinned to other regions',
                    'Users auto-routed to nearest capacity',
                    'Adds ~30% to capacity cost per region',
                  ],
                },
              ].map(item => (
                <div key={item.title} className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
                  <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">{item.desc}</p>
                  {item.details.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300 mb-1">
                      <span className="flex-shrink-0 mt-0.5" style={{ color: item.color }}>•</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Capacity Estimation Guide */}
          <div className="rounded-xl border border-amber-500/30 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-2">🧮 How to Estimate Capacity</h3>
            <p className="text-sm text-slate-400 mb-6">Fabric and Premium capacities are measured in <strong className="text-white">Capacity Units (CUs)</strong>. Each operation (query, refresh, rendering) consumes CUs. Estimate your total CU demand, then pick the smallest SKU that covers it with headroom.</p>

            {/* CU Consumption by Operation */}
            <h4 className="text-base font-bold text-white mb-3">Step 1: Understand CU Consumption by Operation</h4>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-3 py-3 text-left font-semibold">Operation</th>
                    <th className="px-3 py-3 text-center font-semibold">CU-seconds (typical)</th>
                    <th className="px-3 py-3 text-center font-semibold">How Often</th>
                    <th className="px-3 py-3 text-left font-semibold">What Drives Cost</th>
                    <th className="px-3 py-3 text-left font-semibold">Optimization</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { op: 'Interactive query (visual render)', cu: '0.01 – 2', freq: 'Per visual, per user click', driver: 'DAX complexity, dataset size, visual count', opt: 'Simplify DAX, reduce visuals per page' },
                    { op: 'Report page load', cu: '0.1 – 15', freq: 'Per page open', driver: 'Number of visuals × query complexity', opt: 'Limit to 6–8 visuals per page' },
                    { op: 'Dataset refresh (Import)', cu: '5 – 500', freq: 'Per refresh schedule', driver: 'Data volume, Power Query transforms, partitions', opt: 'Incremental refresh, query folding' },
                    { op: 'DirectQuery pass-through', cu: '0.05 – 5', freq: 'Per visual, real-time', driver: 'Source query latency, result set size', opt: 'Pre-aggregate at source, cache aggregations' },
                    { op: 'DirectLake column load', cu: '0.01 – 1', freq: 'On first query (cached after)', driver: 'Parquet file size, column cardinality', opt: 'Partition Delta tables, minimize columns' },
                    { op: 'Paginated report render', cu: '1 – 50', freq: 'Per export / render', driver: 'Row count, page count, formatting complexity', opt: 'Limit to necessary data, use parameters' },
                    { op: 'Dataflow Gen2 refresh', cu: '5 – 200', freq: 'Per schedule', driver: 'Data volume, transformation complexity', opt: 'Use query folding, reduce transformations' },
                    { op: 'Copilot / AI query', cu: '1 – 10', freq: 'Per natural language question', driver: 'Model complexity, response generation', opt: 'Ensure clean data model with good naming' },
                  ].map(row => (
                    <tr key={row.op} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-3 py-2.5 font-medium text-white">{row.op}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-amber-400">{row.cu}</td>
                      <td className="px-3 py-2.5 text-center text-slate-300 text-xs">{row.freq}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-400">{row.driver}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-400">{row.opt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Step 2: Estimate Your Workload */}
            <h4 className="text-base font-bold text-white mb-3">Step 2: Estimate Your Workload (CU Calculator)</h4>
            <p className="text-sm text-slate-400 mb-4">Fill in your expected workload below. The table calculates total CU-seconds per 30-second evaluation window and recommends a SKU.</p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-3 py-3 text-left font-semibold">Workload Factor</th>
                    <th className="px-3 py-3 text-center font-semibold">POC (This Project)</th>
                    <th className="px-3 py-3 text-center font-semibold">Small Team</th>
                    <th className="px-3 py-3 text-center font-semibold">Department</th>
                    <th className="px-3 py-3 text-center font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { factor: 'Concurrent viewers', poc: '3', small: '5–10', dept: '15–30', ent: '50–200' },
                    { factor: 'Reports', poc: '4', small: '8–12', dept: '20–40', ent: '50–100+' },
                    { factor: 'Visuals per page (avg)', poc: '6', small: '8', dept: '10', ent: '12–15' },
                    { factor: 'Page views / hour', poc: '20', small: '60', dept: '200', ent: '1,000+' },
                    { factor: 'Import dataset size', poc: '500 MB', small: '2 GB', dept: '10 GB', ent: '50–200 GB' },
                    { factor: 'Refresh frequency', poc: '1h', small: '30 min', dept: '15 min', ent: '5 min / DirectLake' },
                    { factor: 'Refreshes / day', poc: '24', small: '48', dept: '96', ent: '288 / none (DL)' },
                    { factor: 'DirectQuery tables', poc: '0', small: '1–2', dept: '3–5', ent: '0 (DirectLake)' },
                    { factor: 'Paginated reports', poc: '0', small: '1–2', dept: '5–10', ent: '20+' },
                    { factor: 'Copilot usage', poc: 'No', small: 'No', dept: 'Light', ent: 'Heavy' },
                  ].map(row => (
                    <tr key={row.factor} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-3 py-2 font-medium text-white">{row.factor}</td>
                      <td className="px-3 py-2 text-center text-slate-300">{row.poc}</td>
                      <td className="px-3 py-2 text-center text-slate-300">{row.small}</td>
                      <td className="px-3 py-2 text-center text-slate-300">{row.dept}</td>
                      <td className="px-3 py-2 text-center text-slate-300">{row.ent}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-600 bg-slate-900/30">
                    <td className="px-3 py-3 font-bold text-white">Est. CU / 30s window</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-amber-400">~2 CU</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-amber-400">~8 CU</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-amber-400">~20 CU</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-amber-400">~80 CU</td>
                  </tr>
                  <tr className="bg-emerald-500/5">
                    <td className="px-3 py-3 font-bold text-white">Recommended SKU</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-400">F2 / Pro</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-400">F4 / PPU</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-400">F8 / A2</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-400">F64 / P1</td>
                  </tr>
                  <tr className="bg-emerald-500/5">
                    <td className="px-3 py-3 font-bold text-white">Monthly Cost</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-amber-400">$262</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-amber-400">$525</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-amber-400">$1,050</td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-amber-400">$8,397</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Step 3: SKU to CU mapping */}
            <h4 className="text-base font-bold text-white mb-3">Step 3: Map CU Demand to SKU</h4>
            <p className="text-sm text-slate-400 mb-4">Each Fabric SKU provides a fixed number of CU-seconds per 30-second evaluation window. If your workload exceeds the CU budget in a window, Fabric applies <strong className="text-white">smoothing</strong> (spreads load over time) and then <strong className="text-white">throttling</strong> (delays interactive queries).</p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-3 py-3 text-left font-semibold">SKU</th>
                    <th className="px-3 py-3 text-center font-semibold">CU Count</th>
                    <th className="px-3 py-3 text-center font-semibold">CU-s / 30s Window</th>
                    <th className="px-3 py-3 text-center font-semibold">Max BG CU-s / 24h</th>
                    <th className="px-3 py-3 text-center font-semibold">Throttle Threshold</th>
                    <th className="px-3 py-3 text-center font-semibold">Rejection Threshold</th>
                    <th className="px-3 py-3 text-right font-semibold">Price/mo</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { sku: 'F2', cu: 2, window: 60, bg: 172800, throttle: '10 min overage', reject: '24h cumulative > 20×', price: '$262' },
                    { sku: 'F4', cu: 4, window: 120, bg: 345600, throttle: '10 min overage', reject: '24h cumulative > 20×', price: '$525' },
                    { sku: 'F8', cu: 8, window: 240, bg: 691200, throttle: '10 min overage', reject: '24h cumulative > 20×', price: '$1,050' },
                    { sku: 'F16', cu: 16, window: 480, bg: 1382400, throttle: '10 min overage', reject: '24h cumulative > 20×', price: '$2,099' },
                    { sku: 'F32', cu: 32, window: 960, bg: 2764800, throttle: '10 min overage', reject: '24h cumulative > 20×', price: '$4,198' },
                    { sku: 'F64', cu: 64, window: 1920, bg: 5529600, throttle: '10 min overage', reject: '24h cumulative > 20×', price: '$8,397' },
                    { sku: 'F128', cu: 128, window: 3840, bg: 11059200, throttle: '10 min overage', reject: '24h cumulative > 20×', price: '$16,794' },
                  ].map(row => (
                    <tr key={row.sku} className={`border-b border-slate-700/30 hover:bg-slate-700/20 ${row.sku === 'F2' ? 'bg-emerald-500/5' : ''}`}>
                      <td className="px-3 py-2.5 font-mono font-bold text-white">
                        {row.sku}
                        {row.sku === 'F2' && <span className="ml-2 rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-xs font-bold">Recommended</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-cyan-400">{row.cu}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-300">{row.window}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-300">{row.bg.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-amber-400">{row.throttle}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-red-400">{row.reject}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-amber-400">{row.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Capacity Estimation Formula */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Capacity Estimation Formula</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-white mb-3">Interactive Workload (Foreground CU)</h4>
                <div className="rounded-lg bg-slate-900 border border-slate-700/50 p-4 mb-3">
                  <pre className="text-sm font-mono text-cyan-400 whitespace-pre-wrap">{'Interactive CU/30s =\n  (concurrent_users)\n  × (page_views_per_30s)\n  × (visuals_per_page)\n  × (avg_CU_per_visual_query)\n\nExample (this POC):\n  3 users × 0.3 views/30s × 6 visuals\n  × 0.5 CU/query\n  = 2.7 CU per 30s window\n  → F2 (60 CU budget) = 4.5% utilization ✅'}</pre>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'avg_CU_per_visual_query', desc: '0.1–0.5 for simple Import visuals; 0.5–5 for complex DAX or DirectQuery' },
                    { label: 'page_views_per_30s', desc: 'Total page navigations across all users in a 30-second window' },
                    { label: 'overhead', desc: 'Add 20–30% buffer for slicer interactions, cross-filtering, drillthrough' },
                  ].map(item => (
                    <div key={item.label} className="text-xs text-slate-400">
                      <span className="font-mono text-cyan-400">{item.label}</span>: {item.desc}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-3">Background Workload (Refresh CU)</h4>
                <div className="rounded-lg bg-slate-900 border border-slate-700/50 p-4 mb-3">
                  <pre className="text-sm font-mono text-cyan-400 whitespace-pre-wrap">{'Background CU/day =\n  (num_datasets)\n  × (refreshes_per_day)\n  × (avg_CU_per_refresh)\n\nExample (this POC):\n  4 datasets × 24 refreshes/day\n  × 10 CU/refresh\n  = 960 CU-s per day\n  F2 budget = 172,800 CU-s/day\n  = 0.6% utilization ✅'}</pre>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'avg_CU_per_refresh', desc: '5–30 CU for small datasets (<1 GB); 50–500 CU for large datasets (>10 GB)' },
                    { label: 'DirectLake benefit', desc: 'No scheduled refresh — background CU drops to zero for DL tables' },
                    { label: 'smoothing', desc: 'Background CU is smoothed over 24h, so even large refreshes rarely cause throttling' },
                  ].map(item => (
                    <div key={item.label} className="text-xs text-slate-400">
                      <span className="font-mono text-cyan-400">{item.label}</span>: {item.desc}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Monitoring & Right-Sizing */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Post-Deployment: Monitor & Right-Size</h3>
            <p className="text-sm text-slate-400 mb-4">After deploying your capacity, use the Fabric Capacity Metrics app to validate your sizing. Right-size up or down based on actual utilization.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: '📉 Scale Down Signals',
                  color: '#10b981',
                  items: [
                    'CU utilization consistently < 30% over 2 weeks',
                    'No throttling or rejection events',
                    'P95 query time well under benchmark thresholds',
                    'Background CU usage < 10% of daily budget',
                    'Action: Scale down one SKU tier (e.g., F8 → F4)',
                    'Fabric allows pause/resume — pause during off-hours to save 50%+',
                  ],
                },
                {
                  title: '📈 Scale Up Signals',
                  color: '#ef4444',
                  items: [
                    'CU utilization > 70% sustained over 10-min windows',
                    'Any interactive throttling events (delayed queries)',
                    'P95 query time exceeding 3s for report visuals',
                    'Users reporting slowness or timeouts',
                    'Refresh duration growing (competing with interactive queries)',
                    'Action: Scale up one SKU tier or enable Fabric autoscale',
                  ],
                },
              ].map(section => (
                <div key={section.title} className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
                  <h4 className="text-sm font-bold text-white mb-3">{section.title}</h4>
                  {section.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-300 mb-1.5">
                      <span className="flex-shrink-0 mt-0.5" style={{ color: section.color }}>•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Cost Optimization Tips */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Capacity Cost Optimization Strategies</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  strategy: 'Pause During Off-Hours',
                  saving: 'Up to 65%',
                  desc: 'Fabric capacities can be paused via Azure portal, CLI, or scheduled automation. Pause from 7 PM – 7 AM + weekends = 65% saving.',
                  cmd: 'az fabric capacity suspend --resource-group rg-diskmon-poc-eastus2 --capacity-name fabric-diskmon-poc',
                },
                {
                  strategy: 'Reserved Instances (1-year)',
                  saving: 'Up to 40%',
                  desc: 'Commit to 1-year or 3-year reservation for predictable workloads. F8 drops from $1,050/mo to $630/mo with 1-year RI.',
                  cmd: '# Azure Portal → Reservations → Microsoft Fabric → Select SKU',
                },
                {
                  strategy: 'Start Small + Autoscale',
                  saving: 'Variable',
                  desc: 'Start with F2, enable Fabric autoscale. Fabric scales up during peak and scales down during idle — only pay for CUs consumed.',
                  cmd: '# Azure Portal → Fabric Capacity → Settings → Autoscale → Enable',
                },
              ].map(s => (
                <div key={s.strategy} className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-white">{s.strategy}</h4>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-xs font-bold">{s.saving}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{s.desc}</p>
                  <div className="rounded bg-slate-900 border border-slate-700/50 px-3 py-2">
                    <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">{s.cmd}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="text-base font-bold text-emerald-300 mb-2">Recommendation for This Project</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Deploy a <strong className="text-white">Fabric F2 capacity in East US 2</strong> (same region as Log Analytics + VMs). At $262/mo, F2 provides 2 CUs — more than enough for 3 concurrent viewers, 4 datasets, and hourly refresh. 
              Enable <strong className="text-white">pause/resume automation</strong> (weekday 7 AM – 7 PM only) to reduce cost to ~$92/mo. 
              When usage grows beyond 10 concurrent viewers, scale to <strong className="text-white">F4 ($525/mo) or F8 ($1,050/mo)</strong>. 
              For enterprise rollout, switch to a <strong className="text-white">1-year reservation</strong> for 40% savings.
            </p>
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

        {/* ============= PERFORMANCE TESTING ============= */}
        {tab === 'performance' && (<>
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5" role="note">
            <strong className="text-purple-200">⚡ Report Performance:</strong>
            <span className="text-purple-100/80 ml-1">A fast report loads in under 3 seconds, with each visual rendering in under 500ms. Use these tools and benchmarks to test, measure, and optimize before publishing to production.</span>
          </div>

          {/* Performance Benchmarks */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Performance Benchmarks</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-4 py-3 text-left font-semibold">Metric</th>
                    <th className="px-4 py-3 text-center font-semibold">Good</th>
                    <th className="px-4 py-3 text-center font-semibold">Warning</th>
                    <th className="px-4 py-3 text-center font-semibold">Critical</th>
                    <th className="px-4 py-3 text-left font-semibold">Action if Critical</th>
                  </tr>
                </thead>
                <tbody>
                  {PERF_BENCHMARKS.map(b => (
                    <tr key={b.metric} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-4 py-2.5 font-semibold text-white">{b.metric}</td>
                      <td className="px-4 py-2.5 text-center"><span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400">{b.good}</span></td>
                      <td className="px-4 py-2.5 text-center"><span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400">{b.warning}</span></td>
                      <td className="px-4 py-2.5 text-center"><span className="rounded-full px-2.5 py-0.5 text-xs font-bold bg-red-500/20 text-red-400">{b.critical}</span></td>
                      <td className="px-4 py-2.5 text-sm text-slate-400">{b.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Testing Tools */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Performance Testing Tools</h3>
            {PERF_TESTS.map(t => (
              <div key={t.tool} className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-base font-bold text-white">{t.tool}</h4>
                    <p className="text-sm text-slate-400 mt-1">{t.desc}</p>
                  </div>
                  <span className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold bg-purple-500/20 text-purple-400">{t.type}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Key Metrics</h5>
                    {t.metrics.map(m => (
                      <div key={m} className="flex items-center gap-2 text-sm text-slate-200 mb-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">When to Use</h5>
                    <p className="text-sm text-slate-200">{t.when}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Steps</h5>
                    {t.steps.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-200 mb-1.5">
                        <span className="text-xs text-slate-500 w-4 flex-shrink-0 mt-0.5">{i + 1}.</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Capacity Sizing Calculator */}
          <div className="rounded-xl border border-amber-500/30 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">📐 Capacity Sizing Calculator</h3>
            <p className="text-sm text-slate-400 mb-4">Estimate the right capacity SKU based on your workload. This table shows expected performance characteristics at different scales.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300">
                    <th className="px-3 py-3 text-left font-semibold">Scenario</th>
                    <th className="px-3 py-3 text-center font-semibold">Dataset</th>
                    <th className="px-3 py-3 text-center font-semibold">Visuals/Page</th>
                    <th className="px-3 py-3 text-center font-semibold">Concurrent</th>
                    <th className="px-3 py-3 text-center font-semibold">Refresh</th>
                    <th className="px-3 py-3 text-center font-semibold">Min SKU</th>
                    <th className="px-3 py-3 text-center font-semibold">Est. Page Load</th>
                    <th className="px-3 py-3 text-center font-semibold">Est. CPU</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { scenario: 'POC (this project)', dataset: '500 MB', visuals: 6, concurrent: 3, refresh: '1h', sku: 'Pro / F2', load: '~1.5s', cpu: '< 20%' },
                    { scenario: 'Small team', dataset: '2 GB', visuals: 8, concurrent: 5, refresh: '30 min', sku: 'PPU / F4', load: '~2s', cpu: '25–40%' },
                    { scenario: 'Department', dataset: '10 GB', visuals: 10, concurrent: 15, refresh: '15 min', sku: 'A2 / F8', load: '~3s', cpu: '40–60%' },
                    { scenario: 'Business unit', dataset: '50 GB', visuals: 12, concurrent: 30, refresh: '15 min', sku: 'P1 / F8', load: '~4s', cpu: '50–70%' },
                    { scenario: 'Enterprise', dataset: '100 GB', visuals: 15, concurrent: 50, refresh: '5 min', sku: 'P2 / F64', load: '~5s', cpu: '60–80%' },
                    { scenario: 'Large enterprise', dataset: '400 GB', visuals: 20, concurrent: 100, refresh: 'DirectLake', sku: 'F64+', load: '~3s (DL)', cpu: '40–60% (DL)' },
                  ].map(row => (
                    <tr key={row.scenario} className={`border-b border-slate-700/30 hover:bg-slate-700/20 ${row.scenario === 'POC (this project)' ? 'bg-emerald-500/5' : ''}`}>
                      <td className="px-3 py-2.5 font-semibold text-white">
                        {row.scenario}
                        {row.scenario === 'POC (this project)' && <span className="ml-2 rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-xs font-bold">You</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-300">{row.dataset}</td>
                      <td className="px-3 py-2.5 text-center text-slate-300">{row.visuals}</td>
                      <td className="px-3 py-2.5 text-center text-slate-300">{row.concurrent}</td>
                      <td className="px-3 py-2.5 text-center text-slate-300">{row.refresh}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-400">{row.sku}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          parseFloat(row.load) <= 3 ? 'bg-emerald-500/20 text-emerald-400' :
                          parseFloat(row.load) <= 5 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{row.load}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          row.cpu.includes('< 2') || row.cpu.includes('25') || row.cpu.includes('40–60') ? 'bg-emerald-500/20 text-emerald-400' :
                          row.cpu.includes('50–70') ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{row.cpu}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">* Estimates based on typical Power BI workloads. Page load depends on DAX complexity, data model, and visual count. DirectLake (DL) avoids import refresh entirely.</p>
          </div>

          {/* Optimization Checklist */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Optimization Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { area: 'Data Model', items: ['Remove unused columns (biggest impact)', 'Reduce cardinality of text columns', 'Use star schema — facts + dimensions', 'Avoid bi-directional relationships', 'Set summarization on numeric columns'] },
                { area: 'DAX Measures', items: ['Avoid CALCULATE inside iterators (SUMX, FILTER)', 'Use variables (VAR) to cache sub-expressions', 'Prefer DISTINCTCOUNT over COUNTROWS(VALUES())', 'Avoid row-level IF() — use calculated columns instead', 'Test with DAX Studio Server Timings'] },
                { area: 'Visual Design', items: ['Limit to 6–8 visuals per page', 'Use bookmarks instead of many pages', 'Avoid custom visuals with large DOM', 'Disable visual interactions where not needed', 'Use aggregation tables for large datasets'] },
                { area: 'Refresh & Deployment', items: ['Enable incremental refresh for >1M rows', 'Use query folding — push filters to source', 'Schedule refresh during off-peak hours', 'Monitor capacity metrics post-deployment', 'Set up alerts on CPU > 70% and throttling'] },
              ].map(section => (
                <div key={section.area} className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-4">
                  <h4 className="text-sm font-bold text-white mb-3">{section.area}</h4>
                  {section.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-300 mb-1.5">
                      <span className="text-emerald-400 flex-shrink-0 mt-0.5">☐</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
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
