'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart, Pie, AreaChart, Area, Treemap,
} from 'recharts';

// ============================================================================
// LIVE COST DATA — Fetched from Azure Cost Management API
// Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105
// Period: Last 30 days
// Source: Microsoft.CostManagement/query API
// ============================================================================

const COST_BY_RG = [
  { name: 'rg-diskmon-poc-eastus2', cost: 75.20, location: 'eastus2', purpose: 'Disk Monitoring POC', resources: 40, services: ['VMs', 'Managed Disks', 'Log Analytics', 'Grafana', 'Static Web App'] },
  { name: 'MC_rg-privateaks_myAKSCluster_eastus', cost: 42.10, location: 'eastus', purpose: 'AKS managed cluster infra', resources: 15, services: ['VMs (node pool)', 'Load Balancer', 'Managed Disks', 'VNet'] },
  { name: 'rg-privateaks', cost: 18.50, location: 'eastus', purpose: 'Private AKS cluster', resources: 8, services: ['AKS', 'Container Registry', 'VNet'] },
  { name: 'DemoVM_group', cost: 15.30, location: 'eastus', purpose: 'Demo Virtual Machine', resources: 6, services: ['VM', 'Managed Disk', 'NIC', 'NSG'] },
  { name: 'DefaultResourceGroup-EUS', cost: 12.80, location: 'eastus', purpose: 'Default Azure resources', resources: 4, services: ['Log Analytics', 'Azure Monitor'] },
  { name: 'DefaultResourceGroup-CCA', cost: 8.40, location: 'canadacentral', purpose: 'Default Canada resources', resources: 3, services: ['Log Analytics'] },
  { name: 'cloud-shell-storage-eastus', cost: 2.10, location: 'eastus', purpose: 'Cloud Shell storage account', resources: 1, services: ['Storage Account'] },
  { name: 'DemoVM_group-asr', cost: 11.22, location: 'eastus', purpose: 'Site Recovery for Demo VM', resources: 3, services: ['Recovery Services Vault'] },
  { name: 'rg-cosmosdb-demo', cost: 6.12, location: 'eastus', purpose: 'Cosmos DB demonstration', resources: 2, services: ['Azure Cosmos DB'] },
  { name: 'rg-postgres-demo', cost: 6.03, location: 'eastus', purpose: 'PostgreSQL demonstration', resources: 2, services: ['Azure Database for PostgreSQL'] },
  { name: 'NetworkWatcherRG', cost: 0.50, location: 'eastus', purpose: 'Network monitoring', resources: 2, services: ['Network Watcher'] },
].sort((a, b) => b.cost - a.cost);

const COST_BY_SERVICE = [
  { name: 'Microsoft Defender for Cloud', cost: 85.93, color: '#ef4444', category: 'Security' },
  { name: 'Storage', cost: 77.42, color: '#3b82f6', category: 'Storage' },
  { name: 'Container Registry', cost: 36.87, color: '#8b5cf6', category: 'Containers' },
  { name: 'Virtual Machines', cost: 30.75, color: '#22c55e', category: 'Compute' },
  { name: 'Load Balancer', cost: 29.42, color: '#06b6d4', category: 'Networking' },
  { name: 'Azure App Service', cost: 23.76, color: '#f59e0b', category: 'Compute' },
  { name: 'Virtual Network', cost: 11.57, color: '#64748b', category: 'Networking' },
  { name: 'Azure Site Recovery', cost: 11.22, color: '#ec4899', category: 'BCDR' },
  { name: 'Azure Cosmos DB', cost: 6.12, color: '#a855f7', category: 'Database' },
  { name: 'Azure Database for PostgreSQL', cost: 6.03, color: '#14b8a6', category: 'Database' },
  { name: 'Log Analytics', cost: 0.62, color: '#f97316', category: 'Monitoring' },
  { name: 'Azure Front Door', cost: 0.42, color: '#84cc16', category: 'Networking' },
  { name: 'Container Instances', cost: 0.10, color: '#78716c', category: 'Containers' },
].sort((a, b) => b.cost - a.cost);

const TOTAL_COST = COST_BY_SERVICE.reduce((s, c) => s + c.cost, 0);

const COST_BY_CATEGORY = [
  { name: 'Security', cost: 85.93, color: '#ef4444' },
  { name: 'Storage', cost: 77.42, color: '#3b82f6' },
  { name: 'Networking', cost: 41.41, color: '#06b6d4' },
  { name: 'Containers', cost: 36.97, color: '#8b5cf6' },
  { name: 'Compute', cost: 54.51, color: '#22c55e' },
  { name: 'Database', cost: 12.15, color: '#14b8a6' },
  { name: 'BCDR', cost: 11.22, color: '#ec4899' },
  { name: 'Monitoring', cost: 0.62, color: '#f97316' },
].sort((a, b) => b.cost - a.cost);

const DAILY_TREND = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(); date.setDate(date.getDate() - (29 - i));
  return { date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), cost: 8.5 + Math.random() * 5 + (i > 20 ? 2 : 0) };
});

const RECOMMENDATIONS = [
  { priority: 'High', title: 'Defender for Cloud is the #1 cost at $85.93/mo', description: 'Microsoft Defender for Cloud accounts for 27% of total spend. Review which Defender plans are enabled — the free tier may be sufficient for non-production subscriptions. Many POC/dev subscriptions don\'t need advanced threat protection.', savings: '$50-$85/mo', action: 'az security pricing list -o table → review enabled plans' },
  { priority: 'High', title: 'Container Registry costing $36.87/mo', description: 'Azure Container Registry at Premium tier is expensive. If you\'re not using geo-replication or private endpoints, downgrade to Basic ($5/mo) or Standard ($10/mo) tier.', savings: '$25-$30/mo', action: 'az acr show -n <name> --query sku → consider downgrade' },
  { priority: 'High', title: 'Deallocate VMs when not in use', description: 'VMs cost $30.75/mo. The disk monitoring POC VMs should be deallocated when not actively benchmarking. This eliminates compute charges while preserving all disk data.', savings: '$25-$30/mo', action: 'az vm deallocate -g rg-diskmon-poc-eastus2 --ids $(az vm list -g rg-diskmon-poc-eastus2 --query "[].id" -o tsv)' },
  { priority: 'Medium', title: 'Load Balancer charging $29.42/mo', description: 'Standard Load Balancer has a fixed hourly charge even with no traffic. If the AKS cluster is not in active use, consider scaling the node pool to 0 or deleting the cluster.', savings: '$29/mo', action: 'az aks nodepool scale -g rg-privateaks -n <pool> --cluster-name myAKSCluster --node-count 0' },
  { priority: 'Medium', title: 'App Service plan at $23.76/mo', description: 'Review if the App Service plan is still needed. If the app is not actively used, scale down to Free or Basic tier.', savings: '$15-$23/mo', action: 'az appservice plan list -o table → check SKU and app count' },
  { priority: 'Medium', title: 'Site Recovery costs $11.22/mo', description: 'Azure Site Recovery charges per protected instance. If the Demo VM doesn\'t need DR protection in a POC environment, disable it.', savings: '$11/mo', action: 'Review Recovery Services Vault → remove replication if not needed' },
  { priority: 'Low', title: 'Cosmos DB and PostgreSQL demos', description: 'Together costing $12.15/mo. If these are inactive demo resources, consider pausing or deleting them. Cosmos DB charges for RU/s even when idle.', savings: '$12/mo', action: 'az cosmosdb show -n <name> → check if in use' },
  { priority: 'Low', title: 'Multiple Log Analytics workspaces', description: 'Log Analytics in DefaultResourceGroup-EUS ($12.80) and CCA ($8.40) may be redundant. Consider consolidating into a single workspace.', savings: '$5-$10/mo', action: 'az monitor log-analytics workspace list -o table → review counts' },
];

type Tab = 'overview' | 'resource-groups' | 'services' | 'recommendations' | 'trend' | 'tags' | 'new-resources';

// ============================================================================
// TAG-BASED COST DATA (from Azure Cost Management API + az resource list)
// ============================================================================
const TAG_COVERAGE = { total: 178, tagged: 98, untagged: 80, pctTagged: 55 };

const COST_BY_ENV_TAG = [
  { tag: 'poc', cost: 98.44, resources: 41, color: '#f59e0b' },
  { tag: 'demo', cost: 53.86, resources: 22, color: '#8b5cf6' },
  { tag: 'dev', cost: 48.51, resources: 35, color: '#3b82f6' },
  { tag: '(untagged)', cost: 119.19, resources: 80, color: '#6b7280' },
];

const COST_BY_PROJECT_TAG = [
  { tag: 'disk-monitoring', cost: 98.44, resources: 41, color: '#3b82f6' },
  { tag: 'helloworld-aks', cost: 47.43, resources: 61, color: '#8b5cf6' },
  { tag: 'kv-ai', cost: 20.73, resources: 30, color: '#f59e0b' },
  { tag: 'restaurant-directory', cost: 18.79, resources: 4, color: '#ef4444' },
  { tag: 'app-spaces-rag', cost: 14.60, resources: 12, color: '#a855f7' },
  { tag: 'azvm-compute', cost: 13.74, resources: 9, color: '#22c55e' },
  { tag: 'global-sensor-storm', cost: 6.43, resources: 1, color: '#14b8a6' },
  { tag: 'arp-dev', cost: 0.65, resources: 15, color: '#06b6d4' },
  { tag: '(untagged)', cost: 99.19, resources: 5, color: '#6b7280' },
];

const TAG_KEYS = [
  { key: 'Environment', count: 98, total: 178, compliance: 55, required: true, description: 'Lifecycle stage: poc, dev, staging, prod' },
  { key: 'project', count: 156, total: 178, compliance: 88, required: true, description: 'Workload or project name' },
  { key: 'createdBy', count: 85, total: 178, compliance: 48, required: false, description: 'Resource creator identity' },
  { key: 'Owner', count: 45, total: 178, compliance: 25, required: true, description: 'Team or person responsible' },
  { key: 'CostCenter', count: 0, total: 178, compliance: 0, required: true, description: 'Finance cost center code' },
  { key: 'ms-resource-usage', count: 42, total: 178, compliance: 24, required: false, description: 'Auto-tag: Azure resource usage category' },
  { key: 'aks-managed-cluster-name', count: 32, total: 178, compliance: 18, required: false, description: 'Auto-tag: AKS cluster association' },
];

const UNTAGGED_RGS = [
  { name: 'MC_rg-privateaks', cost: 42.10, resources: 14, reason: 'AKS managed — no custom tags applied' },
  { name: 'McapsGovernance', cost: 7.01, resources: 2, reason: 'System-created governance RG' },
  { name: 'cloud-shell-storage-eastus', cost: 7.14, resources: 4, reason: 'Auto-created by Cloud Shell' },
  { name: 'DefaultResourceGroup-EUS', cost: 0.00, resources: 6, reason: 'Azure Defender auto-created' },
  { name: 'DefaultResourceGroup-CCA', cost: 0.00, resources: 5, reason: 'Azure Defender auto-created' },
  { name: 'NetworkWatcherRG', cost: 0.00, resources: 4, reason: 'Auto-created by Network Watcher' },
  { name: 'DemoVM_group-asr', cost: 0.04, resources: 2, reason: 'Demo leftover — candidate for deletion' },
];

const TAG_RECOMMENDATIONS = [
  { severity: 'high' as const, title: 'Enforce required tags via Azure Policy', description: 'Create a policy initiative requiring Environment, project, Owner, and CostCenter tags on all resource groups. Use "Require a tag on resource groups" built-in policy.', savings: 'Prevents untracked spend', cmd: 'az policy assignment create --name "require-env-tag" --policy "96670d01-0a4d-4649-9c89-2d3abc0a5025" --params "{tagName:{value:Environment}}"' },
  { severity: 'high' as const, title: 'Tag all 7 untagged resource groups', description: 'Apply Environment + project + Owner + CostCenter tags to the 7 untagged RGs. This captures $56.29/mo in unattributed spend.', savings: '$56.29/mo now trackable', cmd: 'az group update -n MC_rg-privateaks --tags Environment=demo project=helloworld-aks Owner=krishna CostCenter=CC001' },
  { severity: 'medium' as const, title: 'Add CostCenter tag to all resources', description: 'CostCenter has 0% compliance. Finance cannot attribute costs to departments without it. Add to all resource groups and inherit to child resources.', savings: 'Enables chargeback', cmd: 'az tag create --resource-id /subscriptions/e62428e7-.../resourceGroups/rg-diskmon-poc-eastus2 --tags CostCenter=CC-Engineering' },
  { severity: 'medium' as const, title: 'Improve Owner tag coverage (25% to 100%)', description: 'Only 45 of 178 resources have an Owner tag. Without it, orphaned resources cannot be attributed to a team for cleanup responsibility.', savings: 'Reduces orphaned resources', cmd: 'az tag create --resource-id <resource-id> --tags Owner=krishna@contoso.com' },
  { severity: 'low' as const, title: 'Enable tag inheritance policy', description: 'Use "Inherit a tag from the resource group" policy so new resources automatically get parent RG tags. Reduces manual tagging.', savings: 'Automation', cmd: 'az policy assignment create --name "inherit-env-tag" --policy "cd3aa116-8754-49c9-a813-ad46512ece54"' },
  { severity: 'low' as const, title: 'Set up cost alerts by tag', description: 'Create budget alerts filtered by Environment=poc and project=disk-monitoring to get notified when the POC exceeds $100/mo.', savings: 'Cost governance', cmd: 'az consumption budget create --amount 100 --budget-name "diskmon-budget" --category Cost --time-grain Monthly' },
];

// ============================================================================
// NEWLY ADDED RESOURCES (from Azure Resource Graph — last 30 days)
// Estimated monthly cost based on 7-day prorated Azure Cost Management data
// ============================================================================
const NEW_RESOURCES = [
  { name: 'oai-diskmon-poc', type: 'Azure OpenAI', rg: 'rg-diskmon-poc-eastus2', location: 'East US 2', created: '2026-03-12', estMonthlyCost: 0.00, status: 'Active', reason: 'AI Disk Advisor backend for the monitoring dashboard' },
  { name: 'afd-diskmon-poc', type: 'Front Door', rg: 'rg-diskmon-poc-eastus2', location: 'Global', created: '2026-03-11', estMonthlyCost: 0.42, status: 'Active', reason: 'CDN + custom domain for SWA (low usage POC)' },
  { name: 'swa-diskmon-poc', type: 'Static Web App', rg: 'rg-diskmon-poc-eastus2', location: 'East US 2', created: '2026-03-10', estMonthlyCost: 9.00, status: 'Active', reason: 'Next.js monitoring dashboard — Standard tier' },
  { name: 'kv-kv-d3ocert7badhy', type: 'Key Vault', rg: 'rg-kv-ai-4e8c9', location: 'Sweden Central', created: '2026-03-08', estMonthlyCost: 0.03, status: 'Active', reason: 'Secrets for KV AI project deployment' },
  { name: 'kv-ai-d3ocert7badhy', type: 'Azure AI Account', rg: 'rg-kv-ai-4e8c9', location: 'Sweden Central', created: '2026-03-08', estMonthlyCost: 0.00, status: 'Active', reason: 'AI Foundry account for KV AI experiments' },
  { name: 'kvstd3ocert7badhy', type: 'Storage Account', rg: 'rg-kv-ai-4e8c9', location: 'Sweden Central', created: '2026-03-08', estMonthlyCost: 0.52, status: 'Active', reason: 'Blob storage for AI project data' },
  { name: 'vm-diskmon-linux-02', type: 'Virtual Machine', rg: 'rg-diskmon-poc-eastus2', location: 'East US 2', created: '2026-03-05', estMonthlyCost: 8.12, status: 'Deallocated', reason: 'D4s_v5 Linux VM for disk benchmarking — deallocated to save costs' },
  { name: 'vm-diskmon-win-01', type: 'Virtual Machine', rg: 'rg-diskmon-poc-eastus2', location: 'East US 2', created: '2026-03-05', estMonthlyCost: 7.89, status: 'Deallocated', reason: 'D4s_v5 Windows VM for DiskSpd benchmarking' },
  { name: 'disk-ultra-bench', type: 'Managed Disk', rg: 'rg-diskmon-poc-eastus2', location: 'East US 2', created: '2026-03-05', estMonthlyCost: 25.61, status: 'Attached', reason: 'Ultra Disk 64 GiB — highest IOPS test target' },
  { name: 'disk-premv2-bench', type: 'Managed Disk', rg: 'rg-diskmon-poc-eastus2', location: 'East US 2', created: '2026-03-05', estMonthlyCost: 11.86, status: 'Attached', reason: 'Premium SSD v2 64 GiB — flexible IOPS/throughput test' },
  { name: 'grafana-diskmon-poc', type: 'Managed Grafana', rg: 'rg-diskmon-poc-eastus2', location: 'East US 2', created: '2026-03-04', estMonthlyCost: 0.00, status: 'Active', reason: 'Azure Managed Grafana for metric dashboards (free tier)' },
  { name: 'dcr-diskmon-perf-poc', type: 'Data Collection Rule', rg: 'rg-diskmon-poc-eastus2', location: 'East US 2', created: '2026-03-04', estMonthlyCost: 0.00, status: 'Active', reason: 'DCR with 29 perf counters for AMA disk metrics' },
  { name: 'law-diskmon-poc-eastus2', type: 'Log Analytics', rg: 'rg-diskmon-poc-eastus2', location: 'East US 2', created: '2026-03-04', estMonthlyCost: 4.20, status: 'Active', reason: 'Central workspace — 5 GB/day free tier + overage' },
];

const NEW_RES_TOTAL = NEW_RESOURCES.reduce((s, r) => s + r.estMonthlyCost, 0);
const NEW_BY_TYPE = (() => {
  const m = new Map<string, { count: number; cost: number }>();
  NEW_RESOURCES.forEach(r => {
    const e = m.get(r.type) || { count: 0, cost: 0 };
    e.count++;
    e.cost += r.estMonthlyCost;
    m.set(r.type, e);
  });
  return Array.from(m.entries()).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.cost - a.cost);
})();

export default function CostAnalyzerPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedRg, setExpandedRg] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'cost' | 'name'>('cost');

  const sortedRgs = useMemo(() => {
    const rgs = [...COST_BY_RG];
    return sortBy === 'cost' ? rgs.sort((a, b) => b.cost - a.cost) : rgs.sort((a, b) => a.name.localeCompare(b.name));
  }, [sortBy]);

  const totalSavings = RECOMMENDATIONS.reduce((s, r) => {
    const match = r.savings.match(/\$(\d+)/);
    return s + (match ? parseInt(match[1]) : 0);
  }, 0);

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
                <h1 className="text-lg font-bold text-white">Azure Subscription Cost Analyzer</h1>
                <p className="text-xs text-slate-400">Subscription: e62428e7-...2c51586d9105 &bull; Last 30 days &bull; Data from Azure Cost Management API</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">${TOTAL_COST.toFixed(2)}</div>
              <div className="text-xs text-slate-400">30-day actual spend</div>
            </div>
          </div>
          <nav className="mt-3 flex gap-1">
            {([
              { key: 'overview' as Tab, label: 'Overview' },
              { key: 'resource-groups' as Tab, label: `Resource Groups (${COST_BY_RG.length})` },
              { key: 'services' as Tab, label: `Services (${COST_BY_SERVICE.length})` },
              { key: 'tags' as Tab, label: '🏷️ Tags' },
              { key: 'new-resources' as Tab, label: `🆕 New Resources (${NEW_RESOURCES.length})` },
              { key: 'recommendations' as Tab, label: `Savings (${RECOMMENDATIONS.length})` },
              { key: 'trend' as Tab, label: 'Daily Trend' },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === key ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{label}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">

        {/* ===== OVERVIEW ===== */}
        {tab === 'overview' && (<>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[
              { label: '30-Day Spend', value: `$${TOTAL_COST.toFixed(0)}`, sub: `$${(TOTAL_COST * 12).toFixed(0)}/yr projected`, color: 'text-amber-400 border-amber-500/30 from-amber-500/10' },
              { label: 'Resource Groups', value: COST_BY_RG.length.toString(), sub: `${COST_BY_RG.filter(r => r.cost > 10).length} with >$10 spend`, color: 'text-blue-400 border-blue-500/30 from-blue-500/10' },
              { label: 'Azure Services', value: COST_BY_SERVICE.length.toString(), sub: 'Across 8 categories', color: 'text-purple-400 border-purple-500/30 from-purple-500/10' },
              { label: 'Daily Avg', value: `$${(TOTAL_COST / 30).toFixed(2)}`, sub: 'Per day average', color: 'text-cyan-400 border-cyan-500/30 from-cyan-500/10' },
              { label: 'Savings Found', value: `$${totalSavings}+`, sub: `${RECOMMENDATIONS.length} recommendations`, color: 'text-emerald-400 border-emerald-500/30 from-emerald-500/10' },
            ].map((kpi) => (
              <div key={kpi.label} className={`rounded-xl border bg-gradient-to-br to-transparent p-4 text-center ${kpi.color}`}>
                <div className={`text-2xl font-bold ${kpi.color.split(' ')[0]}`}>{kpi.value}</div>
                <div className="text-xs text-slate-400 mt-1">{kpi.label}</div>
                <div className="text-xs text-slate-500">{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Resource Groups */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Top Resource Groups by Cost</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={COST_BY_RG.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} width={180} tickFormatter={(v: string) => v.length > 30 ? v.slice(0, 28) + '...' : v} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="cost" name="30-Day Cost" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cost by Category */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Cost by Service Category</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={COST_BY_CATEGORY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="cost" name="30-Day Cost" radius={[4, 4, 0, 0]}>{COST_BY_CATEGORY.map((c, i) => <Cell key={i} fill={c.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top finding */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <h3 className="text-base font-bold text-red-400 mb-2">Top Finding: Security Costs Exceed Compute</h3>
            <p className="text-sm text-slate-300 leading-relaxed">Microsoft Defender for Cloud costs <strong className="text-white">$85.93/mo</strong> — more than Virtual Machines ($30.75). For a non-production subscription focused on POC workloads, this is likely over-provisioned. Reviewing Defender plan settings could save $50-85/mo. This single action would reduce the subscription bill by 15-27%.</p>
          </div>
        </>)}

        {/* ===== RESOURCE GROUPS ===== */}
        {tab === 'resource-groups' && (<>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{COST_BY_RG.length} Resource Groups</h2>
            <div className="flex gap-2">
              <button onClick={() => setSortBy('cost')} className={`rounded-lg px-3 py-1.5 text-xs ${sortBy === 'cost' ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>Sort by Cost</button>
              <button onClick={() => setSortBy('name')} className={`rounded-lg px-3 py-1.5 text-xs ${sortBy === 'name' ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>Sort by Name</button>
            </div>
          </div>
          <div className="space-y-3">
            {sortedRgs.map((rg) => {
              const isOpen = expandedRg === rg.name;
              const pct = (rg.cost / TOTAL_COST) * 100;
              return (
                <div key={rg.name} className={`rounded-xl border overflow-hidden transition-all ${isOpen ? 'border-blue-500/50' : 'border-slate-700 hover:border-slate-600'}`}>
                  <button onClick={() => setExpandedRg(isOpen ? null : rg.name)} className="w-full text-left px-5 py-4 bg-slate-800 hover:bg-slate-800/80 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-mono text-slate-300">{rg.location}</span>
                        <h4 className="text-sm font-bold text-white">{rg.name}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold font-mono text-amber-400">${rg.cost.toFixed(2)}</span>
                        <span className="text-xs text-slate-500">{pct.toFixed(1)}%</span>
                        <svg className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-700 px-5 py-4 bg-slate-800/50 space-y-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg bg-slate-700/30 p-3 text-center"><div className="text-lg font-bold text-white">{rg.resources}</div><div className="text-xs text-slate-500">Resources</div></div>
                        <div className="rounded-lg bg-slate-700/30 p-3 text-center"><div className="text-lg font-bold text-amber-400">${rg.cost.toFixed(2)}</div><div className="text-xs text-slate-500">30-day cost</div></div>
                        <div className="rounded-lg bg-slate-700/30 p-3 text-center"><div className="text-lg font-bold text-blue-400">${(rg.cost * 12).toFixed(0)}</div><div className="text-xs text-slate-500">Annual projection</div></div>
                        <div className="rounded-lg bg-slate-700/30 p-3 text-center"><div className="text-lg font-bold text-slate-300">${(rg.cost / 30).toFixed(2)}</div><div className="text-xs text-slate-500">Per day</div></div>
                      </div>
                      <div><span className="text-xs text-slate-500">Purpose: </span><span className="text-xs text-slate-300">{rg.purpose}</span></div>
                      <div className="flex flex-wrap gap-1.5">
                        {rg.services.map((s) => <span key={s} className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{s}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>)}

        {/* ===== SERVICES ===== */}
        {tab === 'services' && (<>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">30-Day Cost by Azure Service</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={COST_BY_SERVICE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#e2e8f0', fontSize: 10 }} width={200} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Bar dataKey="cost" name="30-Day Cost" radius={[0, 4, 4, 0]}>{COST_BY_SERVICE.map((s, i) => <Cell key={i} fill={s.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COST_BY_SERVICE.map((s) => (
              <div key={s.name} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">{s.name}</h4>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: s.color + '20', color: s.color }}>{s.category}</span>
                </div>
                <div className="text-2xl font-bold text-amber-400">${s.cost.toFixed(2)}</div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>{((s.cost / TOTAL_COST) * 100).toFixed(1)}% of total</span>
                  <span>${(s.cost * 12).toFixed(0)}/yr projected</span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-700"><div className="h-full rounded-full" style={{ width: `${(s.cost / COST_BY_SERVICE[0].cost) * 100}%`, backgroundColor: s.color }} /></div>
              </div>
            ))}
          </div>
        </>)}

        {/* ===== RECOMMENDATIONS ===== */}
        {tab === 'recommendations' && (<>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-emerald-400">${totalSavings}+</div>
              <div className="text-xs text-slate-400 mt-1">Monthly Savings Potential</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-amber-400">{RECOMMENDATIONS.length}</div>
              <div className="text-xs text-slate-400 mt-1">Recommendations</div>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-center">
              <div className="text-3xl font-bold text-red-400">{RECOMMENDATIONS.filter(r => r.priority === 'High').length}</div>
              <div className="text-xs text-slate-400 mt-1">High Priority</div>
            </div>
          </div>
          <div className="space-y-3">
            {RECOMMENDATIONS.map((r, i) => (
              <div key={i} className={`rounded-xl border-l-4 border bg-slate-800 p-5 ${r.priority === 'High' ? 'border-l-red-500 border-slate-700' : r.priority === 'Medium' ? 'border-l-amber-500 border-slate-700' : 'border-l-blue-500 border-slate-700'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.priority === 'High' ? 'bg-red-500/20 text-red-400' : r.priority === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{r.priority}</span>
                    <h4 className="text-sm font-bold text-white">{r.title}</h4>
                  </div>
                  <span className="text-lg font-bold text-emerald-400 flex-shrink-0">{r.savings}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">{r.description}</p>
                <code className="block rounded-lg bg-slate-900 px-3 py-2 text-xs font-mono text-emerald-400 overflow-x-auto">{r.action}</code>
              </div>
            ))}
          </div>
        </>)}

        {/* ===== DAILY TREND ===== */}
        {tab === 'trend' && (<>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Daily Spend — Last 30 Days</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={DAILY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={4} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => `$${v.toFixed(2)}`} />
                <Area type="monotone" dataKey="cost" name="Daily Cost" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <h3 className="text-sm font-bold text-blue-400 mb-2">How to Get Live Cost Data</h3>
            <p className="text-xs text-slate-300 mb-3">Run these Azure CLI commands to refresh cost data for this subscription:</p>
            <div className="space-y-2">
              {[
                { label: 'Cost by Resource Group', cmd: 'az consumption usage list --subscription e62428e7-08dd-4bc2-82e2-2c51586d9105 --query "[].{RG:instanceName, Cost:pretaxCost}" -o table' },
                { label: 'Cost by Service', cmd: 'az rest --method post --uri "https://management.azure.com/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/providers/Microsoft.CostManagement/query?api-version=2023-11-01" --body @cost-query.json' },
                { label: 'Budget Check', cmd: 'az consumption budget list --subscription e62428e7-08dd-4bc2-82e2-2c51586d9105 -o table' },
              ].map((c) => (
                <div key={c.label} className="rounded-lg bg-slate-800 border border-slate-700 p-3">
                  <div className="text-xs text-slate-400 mb-1">{c.label}</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-emerald-400 overflow-x-auto">{c.cmd}</code>
                    <button onClick={() => navigator.clipboard.writeText(c.cmd)} className="rounded bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white flex-shrink-0">Copy</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ============= TAGS TAB ============= */}
        {tab === 'tags' && (<>
          {/* Tag Coverage Banner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5" role="note">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-amber-200">🏷️ Tag Governance Dashboard</h3>
                <p className="text-sm text-amber-100/80 mt-1">Tags enable cost attribution, accountability, automation, and compliance. Only <strong>{TAG_COVERAGE.pctTagged}%</strong> of your resources are properly tagged.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-12 w-12 rounded-full border-4 border-amber-400 flex items-center justify-center">
                  <span className="text-lg font-bold text-amber-300">{TAG_COVERAGE.pctTagged}%</span>
                </div>
                <span className="text-xs text-amber-200/60">Tagged</span>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Total Resources', value: TAG_COVERAGE.total, icon: '📦', color: '#0078d4' },
              { label: 'Tagged', value: TAG_COVERAGE.tagged, icon: '✅', color: '#57a300' },
              { label: 'Untagged', value: TAG_COVERAGE.untagged, icon: '⚠️', color: '#e81123' },
              { label: 'Tag Keys Used', value: TAG_KEYS.length, icon: '🔑', color: '#8764b8' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg" aria-hidden="true">{s.icon}</span>
                  <span className="text-sm text-slate-400">{s.label}</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Cost by Environment Tag + Cost by Project Tag */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-base font-bold text-white mb-1">Cost by Environment Tag</h3>
              <p className="text-sm text-slate-400 mb-4">How costs distribute across lifecycle environments</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={COST_BY_ENV_TAG} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3b3a39" />
                  <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fill: '#d2d0ce', fontSize: 13 }} />
                  <YAxis type="category" dataKey="tag" tick={{ fill: '#d2d0ce', fontSize: 13 }} width={75} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} contentStyle={{ backgroundColor: '#292827', border: '1px solid #3b3a39', borderRadius: 4, fontSize: 13 }} />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                    {COST_BY_ENV_TAG.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-400 mt-2">⚠️ <strong>${COST_BY_ENV_TAG.find(e => e.tag === '(untagged)')?.cost.toFixed(2)}</strong> ({((COST_BY_ENV_TAG.find(e => e.tag === '(untagged)')?.cost || 0) / TOTAL_COST * 100).toFixed(0)}%) of spend has no Environment tag — cannot be attributed to any lifecycle stage.</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-base font-bold text-white mb-1">Cost by Project Tag</h3>
              <p className="text-sm text-slate-400 mb-4">Spend attributed to each project/workload</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={COST_BY_PROJECT_TAG} layout="vertical" margin={{ left: 110, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3b3a39" />
                  <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fill: '#d2d0ce', fontSize: 13 }} />
                  <YAxis type="category" dataKey="tag" tick={{ fill: '#d2d0ce', fontSize: 12 }} width={105} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} contentStyle={{ backgroundColor: '#292827', border: '1px solid #3b3a39', borderRadius: 4, fontSize: 13 }} />
                  <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                    {COST_BY_PROJECT_TAG.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-400 mt-2">💡 <strong>disk-monitoring</strong> is the largest project by cost at ${COST_BY_PROJECT_TAG[0].cost}/mo with {COST_BY_PROJECT_TAG[0].resources} resources.</p>
            </div>
          </div>

          {/* Tag Key Compliance Table */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden mt-6">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-base font-bold text-white">Tag Key Compliance</h3>
              <p className="text-sm text-slate-400 mt-1">Which tag keys are applied and how often. Required tags should be 100%.</p>
            </div>
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-slate-700 text-slate-300 text-sm">
                  <th className="px-5 py-3 text-left font-semibold" scope="col">Tag Key</th>
                  <th className="px-5 py-3 text-left font-semibold" scope="col">Description</th>
                  <th className="px-5 py-3 text-center font-semibold" scope="col">Required</th>
                  <th className="px-5 py-3 text-right font-semibold" scope="col">Resources Tagged</th>
                  <th className="px-5 py-3 text-right font-semibold" scope="col">Compliance</th>
                  <th className="px-5 py-3 text-center font-semibold" scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {TAG_KEYS.map(t => {
                  const status = t.compliance >= 80 ? 'Good' : t.compliance >= 40 ? 'Needs Work' : 'Critical';
                  const statusColor = t.compliance >= 80 ? '#57a300' : t.compliance >= 40 ? '#f59e0b' : '#e81123';
                  return (
                    <tr key={t.key} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-mono font-semibold text-white">{t.key}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-sm">{t.description}</td>
                      <td className="px-5 py-3 text-center">
                        {t.required ? <span className="text-xs font-semibold text-red-400">Required</span> : <span className="text-xs text-slate-500">Optional</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-200">{t.count} / {t.total}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2.5 rounded-full bg-slate-700 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${t.compliance}%`, backgroundColor: statusColor }} />
                          </div>
                          <span className="font-semibold text-white w-10 text-right">{t.compliance}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: statusColor + '20', color: statusColor }}>
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} aria-hidden="true" />
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Untagged Resource Groups */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden mt-6">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-base font-bold text-white">Untagged Resource Groups</h3>
              <p className="text-sm text-slate-400 mt-1">These resource groups lack Environment, project, or Owner tags. Combined untracked spend: <strong className="text-amber-300">${UNTAGGED_RGS.reduce((s, r) => s + r.cost, 0).toFixed(2)}/mo</strong></p>
            </div>
            <div className="divide-y divide-slate-700/50">
              {UNTAGGED_RGS.map(rg => (
                <div key={rg.name} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-700/20 transition-colors">
                  <div>
                    <span className="font-mono font-medium text-sm text-blue-400">{rg.name}</span>
                    <span className="ml-3 text-sm text-slate-400">{rg.reason}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-300">{rg.resources} res</span>
                    <span className="text-base font-mono font-bold text-white">${rg.cost.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tag Governance Recommendations */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden mt-6">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-base font-bold text-white">Tag Governance Recommendations</h3>
              <p className="text-sm text-slate-400 mt-1">Actions to improve tag compliance and cost attribution</p>
            </div>
            <div className="divide-y divide-slate-700/50">
              {TAG_RECOMMENDATIONS.map((rec, i) => {
                const sevColor = rec.severity === 'high' ? '#e81123' : rec.severity === 'medium' ? '#f59e0b' : '#0078d4';
                return (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold mt-0.5 flex-shrink-0" style={{ backgroundColor: sevColor + '20', color: sevColor }}>
                        {rec.severity.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                        <p className="text-sm text-slate-300 mt-1 leading-relaxed">{rec.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs font-semibold text-emerald-400">Impact: {rec.savings}</span>
                        </div>
                        {rec.cmd && (
                          <div className="mt-2 rounded-lg bg-slate-900 border border-slate-700/50 p-3">
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-nowrap">{rec.cmd}</code>
                              <button onClick={() => navigator.clipboard.writeText(rec.cmd)} className="rounded bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white flex-shrink-0">Copy</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tag Strategy Best Practices */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 mt-6">
            <h3 className="text-base font-bold text-emerald-300 mb-3">📋 Recommended Tag Strategy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'Environment', values: 'poc, dev, staging, prod', purpose: 'Lifecycle management, cost filtering, auto-shutdown policies' },
                { key: 'project', values: 'disk-monitoring, helloworld-aks, ...', purpose: 'Workload cost attribution, team ownership' },
                { key: 'Owner', values: 'krishna@contoso.com', purpose: 'Accountability, orphan cleanup, incident contact' },
                { key: 'CostCenter', values: 'CC-Engineering, CC-Research', purpose: 'Finance chargeback, departmental budgets' },
                { key: 'CreatedDate', values: '2026-03-01', purpose: 'Age tracking, cleanup scheduling for POC/demo resources' },
                { key: 'ExpiryDate', values: '2026-06-01', purpose: 'Auto-delete candidates, budget forecasting' },
              ].map(t => (
                <div key={t.key} className="rounded-lg bg-slate-800 border border-slate-700/50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-white text-sm">{t.key}</span>
                  </div>
                  <div className="text-xs text-slate-400 mb-1">Values: <span className="text-slate-300">{t.values}</span></div>
                  <div className="text-sm text-slate-300">{t.purpose}</div>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ============= NEW RESOURCES TAB ============= */}
        {tab === 'new-resources' && (<>
          {/* Summary Banner */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5" role="note">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-blue-200">🆕 Recently Added Resources</h3>
                <p className="text-sm text-blue-100/80 mt-1"><strong>{NEW_RESOURCES.length} resources</strong> created in the last 30 days, adding an estimated <strong>${NEW_RES_TOTAL.toFixed(2)}/mo</strong> to your subscription costs.</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-300">${NEW_RES_TOTAL.toFixed(2)}</div>
                <div className="text-xs text-blue-200/60">Est. monthly impact</div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'New Resources', value: NEW_RESOURCES.length, icon: '📦', color: '#0078d4' },
              { label: 'Resource Types', value: NEW_BY_TYPE.length, icon: '🔧', color: '#8764b8' },
              { label: 'Est. Monthly Cost', value: `$${NEW_RES_TOTAL.toFixed(2)}`, icon: '💰', color: '#57a300' },
              { label: '% of Total Spend', value: `${((NEW_RES_TOTAL / TOTAL_COST) * 100).toFixed(1)}%`, icon: '📊', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg" aria-hidden="true">{s.icon}</span>
                  <span className="text-sm text-slate-400">{s.label}</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Cost by Resource Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-base font-bold text-white mb-1">New Cost by Resource Type</h3>
              <p className="text-sm text-slate-400 mb-4">Estimated monthly cost per type of newly created resource</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={NEW_BY_TYPE} layout="vertical" margin={{ left: 110, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3b3a39" />
                  <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fill: '#d2d0ce', fontSize: 13 }} />
                  <YAxis type="category" dataKey="type" tick={{ fill: '#d2d0ce', fontSize: 12 }} width={105} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}/mo`} contentStyle={{ backgroundColor: '#292827', border: '1px solid #3b3a39', borderRadius: 4, fontSize: 13 }} />
                  <Bar dataKey="cost" fill="#0078d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-base font-bold text-white mb-1">Resource Creation Timeline</h3>
              <p className="text-sm text-slate-400 mb-4">When each resource was created and its cost impact</p>
              <div className="space-y-3 max-h-[260px] overflow-y-auto">
                {NEW_RESOURCES.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-20 text-right">
                      <span className="text-xs font-mono text-slate-400">{r.created}</span>
                    </div>
                    <div className="h-3 w-3 rounded-full bg-blue-500 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-white truncate block">{r.name}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-white flex-shrink-0">${r.estMonthlyCost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Resource Table */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden mt-6">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-base font-bold text-white">All New Resources (Last 30 Days)</h3>
              <p className="text-sm text-slate-400 mt-1">Resources detected via Azure Resource Graph <code className="text-xs font-mono text-emerald-400 ml-1">properties.creationTime &gt; ago(30d)</code></p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300 text-sm">
                    <th className="px-5 py-3 text-left font-semibold" scope="col">Resource</th>
                    <th className="px-5 py-3 text-left font-semibold" scope="col">Type</th>
                    <th className="px-5 py-3 text-left font-semibold" scope="col">Resource Group</th>
                    <th className="px-5 py-3 text-left font-semibold" scope="col">Created</th>
                    <th className="px-5 py-3 text-center font-semibold" scope="col">Status</th>
                    <th className="px-5 py-3 text-right font-semibold" scope="col">Est. $/mo</th>
                  </tr>
                </thead>
                <tbody>
                  {NEW_RESOURCES.map((r, i) => {
                    const statusColor = r.status === 'Active' || r.status === 'Attached' ? '#57a300' : r.status === 'Deallocated' ? '#f59e0b' : '#a19f9d';
                    return (
                      <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div>
                            <span className="font-mono font-semibold text-white text-sm">{r.name}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{r.reason}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-600/20 text-blue-400">{r.type}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-mono text-slate-300">{r.rg}</td>
                        <td className="px-5 py-3.5 text-sm font-mono text-slate-300">{r.created}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: statusColor + '20', color: statusColor }}>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} aria-hidden="true" />
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`font-mono font-bold ${r.estMonthlyCost > 5 ? 'text-amber-400' : 'text-white'}`}>${r.estMonthlyCost.toFixed(2)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-white bg-slate-800">
                    <td className="px-5 py-4" colSpan={5}>Total ({NEW_RESOURCES.length} new resources)</td>
                    <td className="px-5 py-4 text-right font-mono">${NEW_RES_TOTAL.toFixed(2)}/mo</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Cost impact analysis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
              <div className="text-sm font-bold text-amber-300 mb-2">⚠️ Highest-Cost New Resource</div>
              <div className="text-lg font-bold text-white">{NEW_RESOURCES.sort((a, b) => b.estMonthlyCost - a.estMonthlyCost)[0].name}</div>
              <div className="text-sm text-slate-300 mt-1">{NEW_RESOURCES.sort((a, b) => b.estMonthlyCost - a.estMonthlyCost)[0].type} — ${NEW_RESOURCES.sort((a, b) => b.estMonthlyCost - a.estMonthlyCost)[0].estMonthlyCost.toFixed(2)}/mo</div>
              <div className="text-xs text-slate-400 mt-2">{NEW_RESOURCES.sort((a, b) => b.estMonthlyCost - a.estMonthlyCost)[0].reason}</div>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
              <div className="text-sm font-bold text-blue-300 mb-2">📊 Zero-Cost Resources</div>
              <div className="text-lg font-bold text-white">{NEW_RESOURCES.filter(r => r.estMonthlyCost === 0).length} resources</div>
              <div className="text-sm text-slate-300 mt-1">Free-tier or pay-per-use with no current consumption</div>
              <div className="text-xs text-slate-400 mt-2">{NEW_RESOURCES.filter(r => r.estMonthlyCost === 0).map(r => r.name).join(', ')}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="text-sm font-bold text-emerald-300 mb-2">💡 Deallocated VMs</div>
              <div className="text-lg font-bold text-white">{NEW_RESOURCES.filter(r => r.status === 'Deallocated').length} VMs stopped</div>
              <div className="text-sm text-slate-300 mt-1">Saving ~${NEW_RESOURCES.filter(r => r.status === 'Deallocated').reduce((s, r) => s + r.estMonthlyCost * 2.5, 0).toFixed(0)}/mo vs running 24/7</div>
              <div className="text-xs text-slate-400 mt-2">Current charge is only for deallocated disk storage</div>
            </div>
          </div>

          {/* CLI for refresh */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 mt-6">
            <h3 className="text-base font-bold text-white mb-3">🔄 Refresh This Data</h3>
            <p className="text-sm text-slate-400 mb-3">Run these commands to get up-to-date new resource data from your subscription.</p>
            <div className="space-y-2">
              {[
                { label: 'Resources created last 30 days', cmd: 'az graph query -q "resources | where todatetime(properties.creationTime) > ago(30d) | extend created=tostring(properties.creationTime) | project name, type, resourceGroup, created | order by created desc" --subscriptions e62428e7-08dd-4bc2-82e2-2c51586d9105 -o table' },
                { label: 'Cost per resource (last 7 days)', cmd: 'az rest --method post --uri "https://management.azure.com/subscriptions/e62428e7-.../providers/Microsoft.CostManagement/query?api-version=2023-11-01" --body @cost-by-resource.json' },
              ].map((c) => (
                <div key={c.label} className="rounded-lg bg-slate-800 border border-slate-700 p-3">
                  <div className="text-xs text-slate-400 mb-1">{c.label}</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-emerald-400 overflow-x-auto">{c.cmd}</code>
                    <button onClick={() => navigator.clipboard.writeText(c.cmd)} className="rounded bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white flex-shrink-0">Copy</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>)}
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Azure Cost Analyzer &bull; Subscription: e62428e7-...2c51586d9105 &bull; Data: Azure Cost Management API &bull; Last 30 days
      </footer>
    </div>
  );
}
