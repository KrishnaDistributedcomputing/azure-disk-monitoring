'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

// Mermaid renderer
function Mermaid({ chart, id }: { chart: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).__mermaidReady) { setReady(true); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    s.onload = () => { (window as any).__mermaidReady = true; setReady(true); };
    document.head.appendChild(s);
  }, []);
  useEffect(() => {
    if (!ready || !ref.current) return;
    const m = (window as any).mermaid;
    if (!m) return;
    m.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { darkMode: true, background: '#0f172a', primaryColor: '#1e40af', primaryTextColor: '#e2e8f0', primaryBorderColor: '#3b82f6', lineColor: '#64748b', secondaryColor: '#1e293b', tertiaryColor: '#334155', mainBkg: '#1e293b', clusterBkg: '#111827', clusterBorder: '#374151', nodeTextColor: '#e2e8f0', fontFamily: 'system-ui,sans-serif', fontSize: '11px' }, flowchart: { curve: 'basis', padding: 12, htmlLabels: true, useMaxWidth: true }, securityLevel: 'loose' });
    m.render(id + '-' + Date.now(), chart).then(({ svg }: { svg: string }) => {
      if (ref.current) { ref.current.innerHTML = svg; const el = ref.current.querySelector('svg'); if (el) { el.style.maxWidth = '100%'; el.style.height = 'auto'; } }
    }).catch(() => { if (ref.current) ref.current.innerHTML = `<pre style="color:#94a3b8;font-size:10px;white-space:pre-wrap">${chart}</pre>`; });
  }, [ready, chart, id]);
  return <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 overflow-x-auto">{!ready && <div className="text-sm text-slate-500 py-4 text-center">Loading...</div>}<div ref={ref} /></div>;
}

type DocSection = 'overview' | 'infra' | 'collection' | 'query' | 'viz' | 'benchmark' | 'security' | 'operations';

const SECTIONS: { key: DocSection; label: string }[] = [
  { key: 'overview', label: '1. Overview' },
  { key: 'infra', label: '2. Infrastructure' },
  { key: 'collection', label: '3. Data Collection' },
  { key: 'query', label: '4. Query Layer' },
  { key: 'viz', label: '5. Visualization' },
  { key: 'benchmark', label: '6. Benchmarks' },
  { key: 'security', label: '7. Security' },
  { key: 'operations', label: '8. Operations' },
];

export default function DesignDocPage() {
  const [section, setSection] = useState<DocSection>('overview');

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/technical" className="rounded-lg bg-slate-800 border border-slate-700 p-2 text-slate-400 hover:text-white transition-colors"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg></Link>
            <div>
              <h1 className="text-lg font-bold text-white">Detailed Design Document</h1>
              <p className="text-[11px] text-slate-500">Azure Disk Performance Monitoring POC — v1.0 — March 2026</p>
            </div>
          </div>
          <nav className="mt-3 flex flex-wrap gap-1">{SECTIONS.map(({ key, label }) => (
            <button key={key} onClick={() => setSection(key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${section === key ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>{label}</button>
          ))}</nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-6">
        <article className="prose prose-invert prose-sm max-w-none space-y-6">

          {section === 'overview' && (<>
            <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-3">1. Solution Overview</h2>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">1.1 Purpose</h3>
              <p className="text-sm text-slate-300 leading-relaxed">This document describes the detailed design of the Azure Disk Performance Monitoring Proof of Concept. The solution provides a <strong className="text-white">single pane of glass</strong> to monitor disk performance and utilization across Azure Virtual Machines, with drill-down capability from fleet level to individual disk metrics.</p>
              <h3 className="text-lg font-semibold text-white">1.2 Scope</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4"><h4 className="text-xs font-bold text-emerald-400 uppercase">In Scope</h4><ul className="mt-2 space-y-1 text-xs text-slate-300"><li>• 5 VMs across 3 families (D, E, L-series)</li><li>• 5 disk types (Premium SSD, PremV2, Standard SSD, HDD, Ultra)</li><li>• 29 guest-level + 42 platform-level disk metrics</li><li>• 15+ KQL queries for analysis</li><li>• 4-page web dashboard + Grafana</li><li>• FIO/DiskSpd benchmark suite (7 profiles)</li></ul></div>
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4"><h4 className="text-xs font-bold text-red-400 uppercase">Out of Scope</h4><ul className="mt-2 space-y-1 text-xs text-slate-300"><li>• Production security hardening</li><li>• Azure Policy / RBAC / Private Link</li><li>• Automated alerting and incident response</li><li>• Application-layer monitoring</li><li>• Multi-region deployment</li></ul></div>
              </div>
              <h3 className="text-lg font-semibold text-white">1.3 High-Level Architecture</h3>
              <Mermaid id="overview-arch" chart={`graph LR
  VM["5 Azure VMs<br/>D4s, D8s, E4s, L8s"] --> AMA["Azure Monitor Agent<br/>29 counters @ 60s"]
  VM --> DS["Diagnostic Settings<br/>42 platform metrics"]
  AMA --> DCR["Data Collection Rule"]
  DCR --> LAW["Log Analytics<br/>Workspace"]
  DS --> LAW
  LAW --> DASH["Next.js Dashboard<br/>Static Web App"]
  LAW --> GRAF["Azure Managed<br/>Grafana"]
  LAW --> KQL["KQL Query<br/>Library"]
  BENCH["FIO / DiskSpd<br/>7 profiles"] --> VM
  style VM fill:#1e293b,stroke:#3b82f6
  style LAW fill:#1e293b,stroke:#f59e0b
  style DASH fill:#1e293b,stroke:#22c55e
  style GRAF fill:#1e293b,stroke:#22c55e`} />
              <h3 className="text-lg font-semibold text-white">1.4 Key Design Decisions</h3>
              <div className="space-y-2">{[
                { decision: 'Azure Monitor Agent (AMA) over legacy MMA', rationale: 'AMA is the current-generation agent. MMA is deprecated. AMA supports DCR-based configuration.' },
                { decision: 'Single DCR for all VMs', rationale: 'Simplifies management. All VMs need the same disk counters. Add VM-specific DCRs later if needed.' },
                { decision: 'Diagnostic Settings for platform metrics', rationale: 'Platform metrics (consumed %, burst credits) are not available via AMA. Must use Diagnostic Settings to get them into Log Analytics.' },
                { decision: 'Next.js static export over server-side rendering', rationale: 'Azure Static Web Apps is free/cheap. No server-side code needed. Mock data for demos, live KQL for production.' },
                { decision: 'Premium SSD v2 and Ultra Disk in availability zones', rationale: 'These disk types require zonal deployment. VMs pinned to zone 1 in eastus2.' },
                { decision: 'Separate data disks (not in Bicep VM resource)', rationale: 'Disks created as separate resources for independent lifecycle. Attached via az vm disk attach post-deployment.' },
              ].map((d, i) => (
                <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <div className="text-sm font-semibold text-white">{d.decision}</div>
                  <p className="text-xs text-slate-400 mt-1">{d.rationale}</p>
                </div>
              ))}</div>
            </div>
          </>)}

          {section === 'infra' && (<>
            <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-3">2. Infrastructure Design</h2>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">2.1 Resource Topology</h3>
              <Mermaid id="infra-topo" chart={`graph TB
  subgraph RG["rg-diskmon-poc-eastus2"]
    VNET["VNet 10.200.0.0/16"] --> SNET["Subnet 10.200.1.0/24"]
    SNET --> VM1["vm-diskmon-dsv5-01<br/>D4s_v5 • Linux"]
    SNET --> VM2["vm-diskmon-dsv5-02<br/>D8s_v5 • Linux"]
    SNET --> VM3["vm-diskmon-esv5-01<br/>E4s_v5 • Linux • Zone 1"]
    SNET --> VM4["vm-diskmon-lsv3-01<br/>L8s_v3 • Linux • Zone 1"]
    SNET --> VM5["vm-diskmon-dsv5-03<br/>D4s_v5 • Windows"]
    VM1 --- D1A["P15 PremSSD 256G"]
    VM1 --- D1B["E15 StdSSD 256G"]
    VM2 --- D2A["P20 PremSSD 512G"]
    VM2 --- D2B["S20 StdHDD 512G"]
    VM3 --- D3["PremSSDv2 256G<br/>5K IOPS • 200MB/s"]
    VM4 --- D4A["Ultra 256G<br/>10K IOPS • 400MB/s"]
    VM4 --- D4B["P15 PremSSD 256G"]
    VM5 --- D5["P15 PremSSD 256G"]
    LAW["Log Analytics Workspace"]
    DCR["Data Collection Rule"]
    GRAF["Managed Grafana"]
    SWA["Static Web App"]
  end
  style RG fill:#0f172a,stroke:#334155
  style VNET fill:#1e293b,stroke:#3b82f6
  style LAW fill:#1e293b,stroke:#f59e0b
  style D3 fill:#1e293b,stroke:#3b82f6
  style D4A fill:#1e293b,stroke:#8b5cf6`} />
              <h3 className="text-lg font-semibold text-white">2.2 Bicep Module Structure</h3>
              <div className="rounded-lg bg-slate-900 p-4 font-mono text-xs text-slate-300">{`infra/
├── main.bicep              # Subscription-scoped orchestrator
├── parameters/
│   └── poc.bicepparam      # Environment-specific values
└── modules/
    ├── network.bicep       # VNet + Subnet
    ├── vm-linux.bicep      # Linux VM + AMA + zone support + ultraSSD
    ├── vm-windows.bicep    # Windows VM + AMA + DiskSpd install
    ├── managed-disk.bicep  # Managed Disk (all types)
    ├── log-analytics.bicep # Log Analytics Workspace
    ├── dcr.bicep           # Data Collection Rule (29 counters)
    └── grafana.bicep       # Azure Managed Grafana + RBAC`}</div>
              <h3 className="text-lg font-semibold text-white">2.3 Tagging Strategy</h3>
              <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead><tr className="border-b border-slate-700 text-[10px] uppercase text-slate-400"><th className="px-3 py-2">Tag</th><th className="px-3 py-2">Scope</th><th className="px-3 py-2">Example Value</th></tr></thead><tbody className="text-slate-300">{[
                ['project', 'All resources', 'diskmon'],['environment', 'All resources', 'poc'],['cost-center', 'All resources', 'platform-engineering'],['owner', 'All resources', 'disk-monitoring-team'],['created-by', 'All resources', 'bicep-iac'],['vm-family', 'VMs only', 'D-series'],['vm-sku', 'VMs only', 'Standard_D4s_v5'],['disk-type', 'Disks only', 'Premium SSD'],['disk-tier', 'Disks only', 'P15'],
              ].map(([tag, scope, val]) => (<tr key={tag} className="border-b border-slate-700/30"><td className="px-3 py-2 font-mono text-blue-400">{tag}</td><td className="px-3 py-2">{scope}</td><td className="px-3 py-2 font-mono">{val}</td></tr>))}</tbody></table></div>
            </div>
          </>)}

          {section === 'collection' && (<>
            <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-3">3. Data Collection Design</h2>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">3.1 Collection Architecture</h3>
              <Mermaid id="collection-flow" chart={`graph TB
  subgraph GUEST["Guest-Level Collection"]
    AMA["Azure Monitor Agent"] --> DCR["Data Collection Rule<br/>dcr-diskmon-perf-poc"]
    DCR --> |"Perf table"| LAW["Log Analytics Workspace"]
  end
  subgraph PLATFORM["Platform-Level Collection"]
    AZURE["Azure Infrastructure"] --> DS["Diagnostic Settings<br/>AllMetrics category"]
    DS --> |"AzureMetrics table"| LAW
  end
  subgraph CUSTOM["Custom Data"]
    BENCH["Benchmark Scripts"] --> API["Azure Monitor Ingestion API"]
    API --> |"DiskBenchmark_CL table"| LAW
  end
  style GUEST fill:#111827,stroke:#3b82f6
  style PLATFORM fill:#111827,stroke:#f59e0b
  style CUSTOM fill:#111827,stroke:#22c55e
  style LAW fill:#1e293b,stroke:#f59e0b`} />
              <h3 className="text-lg font-semibold text-white">3.2 Two Data Paths</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4"><h4 className="text-sm font-bold text-blue-400">Guest Metrics (AMA → Perf table)</h4><ul className="mt-2 space-y-1 text-xs text-slate-300"><li>• 13 Linux counters (Logical Disk object)</li><li>• 16 Windows counters (LogicalDisk + PhysicalDisk)</li><li>• Collection interval: 60 seconds</li><li>• Per-disk-instance granularity</li><li>• Requires AMA agent on each VM</li></ul></div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"><h4 className="text-sm font-bold text-amber-400">Platform Metrics (Diagnostic Settings → AzureMetrics)</h4><ul className="mt-2 space-y-1 text-xs text-slate-300"><li>• 42 metrics emitted by Azure infrastructure</li><li>• Includes Consumed %, burst credits, cache stats</li><li>• No agent required</li><li>• 1-minute granularity</li><li>• Critical: these are the ONLY source for IOPS/BW consumed %</li></ul></div>
              </div>
              <h3 className="text-lg font-semibold text-white">3.3 Log Analytics Configuration</h3>
              <div className="space-y-2 text-sm text-slate-300">{[
                ['Workspace', 'law-diskmon-poc-eastus2'],['SKU', 'PerGB2018 (pay-per-GB ingestion)'],['Retention', '30 days'],['Daily Cap', '5 GB/day (cost guard for POC)'],['Key Tables', 'Perf, AzureMetrics, Heartbeat, InsightsMetrics'],
              ].map(([k, v]) => (<div key={k} className="flex gap-3 rounded-lg bg-slate-700/30 px-4 py-2"><span className="text-xs text-slate-500 w-28 flex-shrink-0">{k}</span><span className="text-xs font-mono text-white">{v}</span></div>))}</div>
            </div>
          </>)}

          {section === 'query' && (<>
            <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-3">4. Query Layer Design</h2>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">4.1 Query Design Principles</h3>
              <div className="space-y-2">{[
                { principle: 'Parameterize time ranges', detail: 'All queries use `let timeRange = ...` so dashboards bind time pickers without query modification.' },
                { principle: 'Filter early, filter specific', detail: 'Always specify table name and use `where` clauses before `summarize` to minimize scanned data.' },
                { principle: 'Exclude system instances', detail: 'Filter out `_Total`, `/`, `C:` to focus on data disk instances only.' },
                { principle: 'Enrich with VM metadata', detail: 'Join Heartbeat or static lookup tables to add VM SKU, family, and resource group context.' },
                { principle: 'Scale-ready patterns', detail: 'No hardcoded VM names. Use `Computer in ($vmName)` for dashboard variable binding.' },
              ].map((p, i) => (<div key={i} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3"><div className="text-sm font-semibold text-blue-400">{p.principle}</div><p className="text-xs text-slate-400 mt-1">{p.detail}</p></div>))}</div>
              <h3 className="text-lg font-semibold text-white">4.2 Query Categories</h3>
              <Mermaid id="query-cats" chart={`graph LR
  KQL["15+ KQL Queries"] --> INV["Inventory<br/>Q-01"]
  KQL --> PERF["Performance<br/>Q-02 to Q-04"]
  KQL --> SAT["Saturation<br/>Q-05, Q-11, Q-12"]
  KQL --> RANK["Rankings<br/>Q-06, Q-07"]
  KQL --> CAP["Capacity<br/>Q-08"]
  KQL --> COMP["Comparison<br/>Q-09, Q-10"]
  KQL --> ADV["Advanced<br/>Q-14, T-04"]
  KQL --> TREND["Trends<br/>T-01 to T-03"]
  style KQL fill:#1e293b,stroke:#3b82f6
  style PERF fill:#1e293b,stroke:#22c55e
  style TREND fill:#1e293b,stroke:#ef4444`} />
              <p className="text-sm text-slate-300">See the <Link href="/deep-dive" className="text-blue-400 hover:underline">Deep Dive page</Link> for the complete query catalog with full KQL code, table references, and dashboard mapping.</p>
            </div>
          </>)}

          {section === 'viz' && (<>
            <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-3">5. Visualization Design</h2>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">5.1 Dashboard Architecture</h3>
              <Mermaid id="dash-arch" chart={`graph TB
  subgraph PAGES["Next.js Pages"]
    HOME["/ Dashboard<br/>7 metric tabs"]
    MON["/ Monitor<br/>Fleet→VM→Disk drill-down"]
    TECH["/ Technical<br/>Architecture + Mermaid"]
    HELP["/ Help<br/>Cost simulator + guides"]
    DEEP["/ Deep-Dive<br/>KQL + counters + metrics"]
    DESIGN["/ Design<br/>This document"]
  end
  SWA["Azure Static Web Apps<br/>Global CDN • HTTPS"] --> PAGES
  PAGES --> RECHARTS["Recharts<br/>Area • Bar • Pie • Radar • Scatter • Line"]
  PAGES --> TW["Tailwind CSS<br/>Dark theme (slate-900)"]
  PAGES --> MERMAID["Mermaid.js<br/>Architecture diagrams"]
  style PAGES fill:#111827,stroke:#22c55e
  style SWA fill:#1e293b,stroke:#3b82f6`} />
              <h3 className="text-lg font-semibold text-white">5.2 Drill-Down Pattern (Monitor Page)</h3>
              <Mermaid id="drill-down" chart={`graph LR
  L1["Level 1: Fleet Overview<br/>All VMs • KPI strip • Health donut<br/>Filter by family/health • Sort"] -->|Click VM| L2["Level 2: VM Detail<br/>VM header • Gauges • All disks<br/>IOPS/throughput/latency per disk"]
  L2 -->|Click Disk| L3["Level 3: Disk Detail<br/>8 metric cards • 4 time series<br/>Provisioned vs actual • Cost"]
  L3 -->|Breadcrumb| L2
  L2 -->|Breadcrumb| L1
  style L1 fill:#1e293b,stroke:#3b82f6
  style L2 fill:#1e293b,stroke:#8b5cf6
  style L3 fill:#1e293b,stroke:#22c55e`} />
              <h3 className="text-lg font-semibold text-white">5.3 Chart Types Used</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[
                { chart: 'Area Chart', usage: 'IOPS, throughput, latency, queue depth over time' },
                { chart: 'Bar Chart', usage: 'VM comparison, disk type ranking, cost comparison' },
                { chart: 'Pie/Donut', usage: 'Health distribution, disk type split, cost breakdown' },
                { chart: 'Radar Chart', usage: 'Disk type 6-axis capability comparison' },
                { chart: 'Scatter Plot', usage: 'Price vs performance (bubble = throughput)' },
                { chart: 'Line Chart', usage: 'IOPS scaling by disk size, trends' },
                { chart: 'Gauge (SVG)', usage: 'IOPS consumed %, throughput cap %, capacity' },
                { chart: 'Progress Bar', usage: 'Disk utilization, IOPS/BW consumed % inline' },
              ].map((c) => (<div key={c.chart} className="rounded-lg border border-slate-700 bg-slate-700/20 p-3"><div className="text-xs font-semibold text-blue-400">{c.chart}</div><p className="text-[10px] text-slate-400 mt-1">{c.usage}</p></div>))}</div>
            </div>
          </>)}

          {section === 'benchmark' && (<>
            <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-3">6. Benchmark Design</h2>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">6.1 Benchmark Execution Flow</h3>
              <Mermaid id="bench-flow" chart={`graph TB
  START["run-benchmarks.sh"] --> PRE["1. Pre-condition disk<br/>Write 100% test file"]
  PRE --> RUN["2. Run FIO profile<br/>e.g. rand-read-4k"]
  RUN --> LOG["3. Log metadata<br/>→ DiskBenchmark_CL"]
  LOG --> COOL["4. Cooldown 60s"]
  COOL --> |"Next profile"| RUN
  COOL --> |"All done"| ANALYZE["5. Analyze in KQL<br/>Correlate with Perf data"]
  style START fill:#1e293b,stroke:#22c55e
  style RUN fill:#1e293b,stroke:#3b82f6
  style ANALYZE fill:#1e293b,stroke:#f59e0b`} />
              <h3 className="text-lg font-semibold text-white">6.2 Profile Design Rationale</h3>
              <div className="space-y-2">{[
                { profile: 'seq-read-1m / seq-write-1m', why: 'Large 1 MiB blocks with QD=32 saturate throughput. Measures maximum sequential bandwidth (MB/s ceiling).' },
                { profile: 'rand-read-4k / rand-write-4k', why: '4 KiB random I/O with QD=64 saturates IOPS. Measures maximum random IOPS (ops/sec ceiling).' },
                { profile: 'rand-rw-4k-70-30', why: '70/30 read/write mix simulates real database workloads with moderate queue depth.' },
                { profile: 'lat-probe-4k', why: 'Single-threaded QD=1 random reads measure baseline latency without saturation effects.' },
                { profile: 'qd-ramp', why: 'Progressive QD 1→4→16→64→128 reveals the inflection point where latency starts climbing.' },
              ].map((p) => (<div key={p.profile} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4"><code className="text-xs font-mono text-emerald-400">{p.profile}</code><p className="text-xs text-slate-400 mt-1">{p.why}</p></div>))}</div>
            </div>
          </>)}

          {section === 'security' && (<>
            <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-3">7. Security Considerations</h2>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4"><p className="text-sm text-amber-200"><strong>Note:</strong> This is a POC. Security is intentionally relaxed for learning purposes. Production deployment requires hardening.</p></div>
              <h3 className="text-lg font-semibold text-white">7.1 Current POC State</h3>
              <div className="space-y-2">{[
                { item: 'Authentication', poc: 'SSH keys for Linux, password for Windows', prod: 'Azure AD + Just-in-Time VM Access + Bastion' },
                { item: 'Network', poc: 'Public IPs possible for SSH', prod: 'Private endpoints + NSGs + Azure Bastion' },
                { item: 'Disk Encryption', poc: 'Platform-managed encryption (default)', prod: 'Customer-managed keys (CMK) via Key Vault' },
                { item: 'RBAC', poc: 'Contributor on resource group', prod: 'Least-privilege custom roles per function' },
                { item: 'Dashboard Access', poc: 'Public Static Web App', prod: 'Azure AD authentication via EasyAuth' },
                { item: 'Secrets', poc: 'CLI parameters', prod: 'Azure Key Vault + managed identity' },
              ].map((s) => (<div key={s.item} className="grid grid-cols-3 gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3"><span className="text-xs font-semibold text-white">{s.item}</span><div className="rounded bg-amber-500/10 px-2 py-1 text-[10px] text-amber-400">{s.poc}</div><div className="rounded bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-400">{s.prod}</div></div>))}</div>
            </div>
          </>)}

          {section === 'operations' && (<>
            <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-3">8. Operations &amp; Cost Management</h2>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">8.1 Cost Control Procedures</h3>
              <Mermaid id="cost-ops" chart={`graph LR
  ACTIVE["Active Testing<br/>VMs running<br/>~$507/mo"] -->|"Stop testing"| IDLE["Idle State<br/>VMs deallocated<br/>~$375/mo"]
  IDLE -->|"Detach Ultra"| MINIMAL["Minimal<br/>Ultra detached<br/>~$284/mo"]
  MINIMAL -->|"Delete Ultra+PremV2"| SKELETON["Skeleton<br/>Disks deleted<br/>~$150/mo"]
  SKELETON -->|"Resume testing"| ACTIVE
  style ACTIVE fill:#1e293b,stroke:#ef4444
  style IDLE fill:#1e293b,stroke:#f59e0b
  style MINIMAL fill:#1e293b,stroke:#22c55e
  style SKELETON fill:#1e293b,stroke:#3b82f6`} />
              <h3 className="text-lg font-semibold text-white">8.2 Operational Commands</h3>
              <div className="space-y-2">{[
                { op: 'Deallocate all VMs', cmd: 'az vm deallocate -g rg-diskmon-poc-eastus2 --ids $(az vm list -g rg-diskmon-poc-eastus2 --query "[].id" -o tsv)' },
                { op: 'Start all VMs', cmd: 'az vm start -g rg-diskmon-poc-eastus2 --ids $(az vm list -g rg-diskmon-poc-eastus2 --query "[].id" -o tsv)' },
                { op: 'Detach Ultra Disk', cmd: 'az vm disk detach -g rg-diskmon-poc-eastus2 --vm-name vm-diskmon-lsv3-01 -n disk-diskmon-lsv3-01-ultra-256' },
                { op: 'Check monthly spend', cmd: 'az consumption usage list -g rg-diskmon-poc-eastus2 --query "sum([].pretaxCost)" -o tsv' },
                { op: 'Redeploy dashboard', cmd: 'cd dashboard && npm run build:static && swa deploy --app-location out --env production' },
                { op: 'Full teardown', cmd: 'az group delete -n rg-diskmon-poc-eastus2 --yes --no-wait' },
              ].map((o) => (<div key={o.op} className="rounded-lg border border-slate-700 bg-slate-900 p-3"><div className="text-xs font-semibold text-white mb-1">{o.op}</div><code className="text-[10px] text-emerald-400 font-mono break-all">{o.cmd}</code></div>))}</div>
              <h3 className="text-lg font-semibold text-white">8.3 Scalability Path</h3>
              <div className="space-y-2">{[
                { area: 'More VMs', design: 'Add Bicep module calls in main.bicep. DCR association auto-enrolls new VMs. Dashboard auto-populates from Heartbeat table.' },
                { area: 'Multi-subscription', design: 'Log Analytics ingests from multiple subscriptions via DCR associations. No query changes needed.' },
                { area: 'Multi-region', design: 'Deploy VMs in new regions pointing to same workspace (up to ingestion latency tolerance).' },
                { area: 'Large scale (100+ VMs)', design: 'Add summary rules or materialized views in Log Analytics. Use Azure Data Explorer for long-term analytics.' },
              ].map((s) => (<div key={s.area} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4"><div className="text-sm font-semibold text-blue-400">{s.area}</div><p className="text-xs text-slate-400 mt-1">{s.design}</p></div>))}</div>
            </div>
          </>)}

        </article>
      </main>
      <footer className="border-t border-slate-800 py-3 text-center text-[10px] text-slate-500">Detailed Design Document v1.0 — Azure Disk Performance Monitoring POC — March 2026</footer>
    </div>
  );
}
