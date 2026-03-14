'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Treemap,
} from 'recharts';

// ============================================================================
// WORKLOAD MAP — Logical grouping of Azure resources by the workload they host
// Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105
// Source: az resource list + az rest (Cost Management API)
// ============================================================================

interface Resource {
  type: string;
  name: string;
  count?: number;
}

interface Workload {
  id: string;
  name: string;
  description: string;
  environment: 'POC' | 'Dev' | 'Demo' | 'System' | 'Production';
  category: 'Monitoring' | 'Containers' | 'Web App' | 'AI/ML' | 'Database' | 'Infrastructure' | 'DevOps';
  icon: string;
  color: string;
  resourceGroups: { name: string; location: string; cost: number; resourceCount: number }[];
  resources: Resource[];
  totalCost: number;
  status: 'Active' | 'Idle' | 'Deallocated' | 'Mixed';
  recommendations: string[];
}

const WORKLOADS: Workload[] = [
  {
    id: 'disk-monitoring',
    name: 'Disk Performance Monitoring POC',
    description: 'Azure Disk performance monitoring with 5 VMs (Linux + Windows), 13 managed disks across 5 types, Azure Monitor Agent, Log Analytics, Grafana dashboards, and a Next.js static web app.',
    environment: 'POC',
    category: 'Monitoring',
    icon: '📊',
    color: '#3b82f6',
    resourceGroups: [
      { name: 'rg-diskmon-poc-eastus2', location: 'East US 2', cost: 98.44, resourceCount: 41 },
    ],
    resources: [
      { type: 'Virtual Machines', name: 'D4s_v5 ×2, D8s_v5, E4s_v5, L8s_v3', count: 5 },
      { type: 'Managed Disks', name: '8 data + 5 OS (Prem, PremV2, StdSSD, HDD, Ultra)', count: 13 },
      { type: 'VM Extensions', name: 'AMA ×4, DependencyAgent ×3, DiskSpd ×1', count: 10 },
      { type: 'NICs', name: 'One per VM', count: 5 },
      { type: 'Log Analytics Workspace', name: 'law-diskmon-poc-eastus2', count: 1 },
      { type: 'Data Collection Rule', name: 'dcr-diskmon-perf-poc', count: 1 },
      { type: 'Managed Grafana', name: 'grafana-diskmon-poc', count: 1 },
      { type: 'Static Web App', name: 'swa-diskmon-poc', count: 1 },
      { type: 'Azure OpenAI', name: 'oai-diskmon-poc', count: 1 },
      { type: 'Azure Front Door', name: 'afd-diskmon-poc', count: 1 },
      { type: 'Virtual Network', name: 'vnet-diskmon-poc-eastus2', count: 1 },
      { type: 'NSG', name: 'snet-diskmon-vms-poc-nsg-eastus2', count: 1 },
    ],
    totalCost: 98.44,
    status: 'Active',
    recommendations: [
      'Deallocate VMs when not benchmarking to save ~$25-30/mo compute',
      'Azure Front Door ($0.42/mo) adds little value for a POC — consider removing',
      'Managed Grafana can be shared across workloads',
    ],
  },
  {
    id: 'helloworld-aks',
    name: 'Hello World AKS (Multi-Region)',
    description: 'AKS clusters deployed across 4 regions (Canada Central, Australia East, East US 2, Southeast Asia) with Application Insights, Log Analytics, and Container Registries per region.',
    environment: 'Demo',
    category: 'Containers',
    icon: '☸️',
    color: '#8b5cf6',
    resourceGroups: [
      { name: 'rg-helloworld-canadacentral', location: 'Canada Central', cost: 7.61, resourceCount: 6 },
      { name: 'MC_rg-helloworld-canadacentral_helloaks-aks_canadacentral', location: 'Canada Central', cost: 5.93, resourceCount: 10 },
      { name: 'rg-helloworld-australiaeast', location: 'Australia East', cost: 7.64, resourceCount: 5 },
      { name: 'MC_rg-helloworld-australiaeast_helloau-aks_australiaeast', location: 'Australia East', cost: 6.00, resourceCount: 10 },
      { name: 'rg-helloworld-eastus2', location: 'East US 2', cost: 5.72, resourceCount: 5 },
      { name: 'MC_rg-helloworld-eastus2_hellous-aks_eastus2', location: 'East US 2', cost: 4.50, resourceCount: 10 },
      { name: 'rg-helloworld-southeastasia', location: 'Southeast Asia', cost: 5.60, resourceCount: 5 },
      { name: 'MC_rg-helloworld-southeastasia_helloas-aks_southeastasia', location: 'Southeast Asia', cost: 4.43, resourceCount: 10 },
    ],
    resources: [
      { type: 'AKS Clusters', name: 'helloaks-aks, helloau-aks, hellous-aks, helloas-aks', count: 4 },
      { type: 'Container Registries', name: 'One per region', count: 4 },
      { type: 'VMSS (Node Pools)', name: 'aks-system per cluster', count: 4 },
      { type: 'Load Balancers', name: 'Kubernetes LB per cluster', count: 4 },
      { type: 'Virtual Networks', name: 'aks-vnet per cluster', count: 4 },
      { type: 'NSGs', name: 'agentpool + appgateway + virtualkubelet per region', count: 12 },
      { type: 'Route Tables', name: 'Per agentpool', count: 4 },
      { type: 'Public IPs', name: '2 per cluster (LB + egress)', count: 8 },
      { type: 'Application Insights', name: 'hello{region}-ai', count: 4 },
      { type: 'Log Analytics', name: 'hello{region}-logs', count: 4 },
      { type: 'Alert Rules', name: 'Smart Detection Failure Anomalies', count: 4 },
    ],
    totalCost: 47.43,
    status: 'Active',
    recommendations: [
      'Running 4 identical demo clusters in 4 regions costs $47/mo — consolidate to 1 region',
      'Scale node pools to 0 when not in use to save compute + LB costs',
      '4 Container Registries may be redundant — one with geo-replication is cheaper',
      'Consider AKS Free tier if RBAC/SLA not needed',
    ],
  },
  {
    id: 'arp-dev',
    name: 'ARP Dev (Availability & Reachability Platform)',
    description: 'Azure Container Apps environment with orchestrator and 5 regional ping services (East US, Australia East, East US 2, West US 2, West Europe, SE Asia), Cosmos DB, SignalR, and Static Web App.',
    environment: 'Dev',
    category: 'Web App',
    icon: '🌐',
    color: '#06b6d4',
    resourceGroups: [
      { name: 'rg-arp-dev-core', location: 'East US 2', cost: 0.65, resourceCount: 15 },
    ],
    resources: [
      { type: 'Container Apps', name: 'arp-dev-orch + 5 regional ping services', count: 7 },
      { type: 'Container App Environment', name: 'arp-dev-env', count: 1 },
      { type: 'Container Registry', name: 'ca4fabaea789acr', count: 1 },
      { type: 'Cosmos DB', name: 'arp-dev-cosmos (serverless)', count: 1 },
      { type: 'Static Web App', name: 'arp-dev-swa', count: 1 },
      { type: 'SignalR Service', name: 'arp-dev-signalr', count: 1 },
      { type: 'Application Insights', name: 'arp-dev-appi', count: 1 },
      { type: 'Log Analytics', name: 'arp-dev-logs', count: 1 },
    ],
    totalCost: 0.65,
    status: 'Idle',
    recommendations: [
      'Extremely low cost ($0.65/mo) — Container Apps scaled to zero when idle',
      'Good candidate for keeping as-is (serverless architecture)',
    ],
  },
  {
    id: 'appspaces-rag',
    name: 'App Spaces RAG Application',
    description: 'Container App with database backend, managed identity, Application Insights — deployed via Azure App Spaces. Includes dedicated managed environment with load balancer.',
    environment: 'Dev',
    category: 'AI/ML',
    icon: '🤖',
    color: '#a855f7',
    resourceGroups: [
      { name: 'appspacesragapp9b9f8efe', location: 'West US 2', cost: 4.22, resourceCount: 12 },
      { name: 'ME_container-app-environment-sh4tpwkxz5f5m_appspacesragapp9b9f8efe_westus2', location: 'West US 2', cost: 10.38, resourceCount: 2 },
    ],
    resources: [
      { type: 'Container App', name: 'container-app-sh4tpwkxz5f5m', count: 1 },
      { type: 'Container App DB', name: 'container-app-db-sh4tpwkxz5f5m', count: 1 },
      { type: 'Container App Env', name: 'container-app-environment-sh4tpwkxz5f5m', count: 1 },
      { type: 'App Space', name: 'appspace-582f7d43-b7bf', count: 1 },
      { type: 'Managed Identity', name: 'container-app-oidcUserIdentity-msi', count: 1 },
      { type: 'Application Insights', name: 'app-insights-sh4tpwkxz5f5m', count: 1 },
      { type: 'Log Analytics', name: 'workspaceuweh7tyko4kho', count: 1 },
      { type: 'Static Web App', name: 'csi-education-vertical', count: 1 },
      { type: 'Load Balancer', name: 'capp-svc-lb (managed env)', count: 1 },
      { type: 'Virtual Network', name: 'vnetuweh7tyko4kho', count: 1 },
      { type: 'NSG', name: 'subnet NSG', count: 1 },
      { type: 'Builder', name: 'builder0024b', count: 1 },
    ],
    totalCost: 14.60,
    status: 'Active',
    recommendations: [
      'Managed environment LB costs $10.38/mo even when idle',
      'Consider consumption-only environment to eliminate fixed LB cost',
      'If not in active development, scale container apps to 0 replicas',
    ],
  },
  {
    id: 'azvm-compute',
    name: 'Azure VM Compute App',
    description: 'VM SKU lookup tool with Next.js frontend (Static Web App), Azure Function backend, Container Apps ETL job, PostgreSQL databases, and Container Registry.',
    environment: 'Dev',
    category: 'Web App',
    icon: '🖥️',
    color: '#22c55e',
    resourceGroups: [
      { name: 'rg-azvm-compute', location: 'Canada Central', cost: 13.74, resourceCount: 9 },
    ],
    resources: [
      { type: 'Static Web App', name: 'azvm-sku-lookup-swa', count: 1 },
      { type: 'App Service Plan', name: 'azvm-compute-plan', count: 1 },
      { type: 'Function App', name: 'azvm-compute-app', count: 1 },
      { type: 'PostgreSQL Flexible', name: 'azurevmsku-pg, azvm-compute-pg', count: 2 },
      { type: 'Container App Env', name: 'azvm-etl-env', count: 1 },
      { type: 'Container App Job', name: 'azvm-etl-job', count: 1 },
      { type: 'Container Registry', name: 'azvmetlacr', count: 1 },
      { type: 'Log Analytics', name: 'workspace-rgazvmcomputeXJ1W', count: 1 },
    ],
    totalCost: 13.74,
    status: 'Active',
    recommendations: [
      'Two PostgreSQL Flexible instances — consolidate if schemas allow',
      'App Service Plan has fixed cost — verify it\'s not oversized',
      'ETL job on Container Apps is cost-efficient (runs on schedule)',
    ],
  },
  {
    id: 'kv-ai-projects',
    name: 'KV AI Projects (6 Deployments)',
    description: 'Multiple Azure AI container app deployments in Sweden Central, each with their own Container Registry, managed environment, and Log Analytics workspace. Likely from Azure AI templates.',
    environment: 'Dev',
    category: 'AI/ML',
    icon: '🧠',
    color: '#f59e0b',
    resourceGroups: [
      { name: 'rg-kv-ai-4e8c9', location: 'Sweden Central', cost: 9.33, resourceCount: 10 },
      { name: 'rg-kv-ai-e1ba8', location: 'Sweden Central', cost: 2.31, resourceCount: 4 },
      { name: 'rg-kv-ai-51143', location: 'Sweden Central', cost: 2.30, resourceCount: 4 },
      { name: 'rg-kv-ai-57877', location: 'Sweden Central', cost: 2.27, resourceCount: 4 },
      { name: 'rg-kv-ai-b2cae', location: 'Sweden Central', cost: 2.27, resourceCount: 4 },
      { name: 'rg-kv-ai-b97a3', location: 'Sweden Central', cost: 2.25, resourceCount: 4 },
    ],
    resources: [
      { type: 'Container Apps', name: 'One per deployment', count: 6 },
      { type: 'Container App Envs', name: 'Managed environment per deployment', count: 6 },
      { type: 'Container Registries', name: 'kvacrXXXXX', count: 6 },
      { type: 'Log Analytics', name: 'kv-logs-XXXXX + kv-env/app/hub/proj', count: 9 },
      { type: 'Key Vault', name: 'kv-kv-d3ocert7badhy', count: 1 },
      { type: 'Azure AI Account', name: 'kv-ai-d3ocert7badhy', count: 1 },
      { type: 'Storage Account', name: 'kvstd3ocert7badhy', count: 1 },
    ],
    totalCost: 20.73,
    status: 'Mixed',
    recommendations: [
      '6 separate deployments with 6 Container Registries ($2-3/mo each) — consolidate to 1 shared ACR',
      '9 Log Analytics workspaces — consolidate to 1 shared workspace',
      'Biggest cost saver: delete unused deployments and keep only the latest',
      'If only rg-kv-ai-4e8c9 is active, delete the other 5 to save ~$11/mo',
    ],
  },
  {
    id: 'restdir',
    name: 'Restaurant Directory',
    description: 'Web application with PostgreSQL database, App Service, and Container Registry. Deployed in Canada Central.',
    environment: 'Dev',
    category: 'Web App',
    icon: '🍽️',
    color: '#ef4444',
    resourceGroups: [
      { name: 'restdir-rg', location: 'Canada Central', cost: 18.79, resourceCount: 4 },
    ],
    resources: [
      { type: 'App Service', name: 'restdir-web-3yj6wtfbtsi32', count: 1 },
      { type: 'App Service Plan', name: 'restdir-plan-3yj6wtfbtsi32', count: 1 },
      { type: 'PostgreSQL Flexible', name: 'restdir-db-3yj6wtfbtsi32', count: 1 },
      { type: 'Container Registry', name: 'restdiracr3yj6wtfbtsi32', count: 1 },
    ],
    totalCost: 18.79,
    status: 'Active',
    recommendations: [
      'PostgreSQL Flexible Server is likely the main cost driver',
      'If not actively used, stop the DB server to save ~$12/mo',
      'App Service could move to Free tier if it\'s just a demo',
    ],
  },
  {
    id: 'ai-accounts',
    name: 'Azure AI Service Accounts',
    description: 'Standalone Azure AI/OpenAI accounts with Container Registries in multiple regions (West US 3, Sweden Central, Canada Central).',
    environment: 'Dev',
    category: 'AI/ML',
    icon: '🔮',
    color: '#ec4899',
    resourceGroups: [
      { name: 'rg-boldorca260227', location: 'West US 3', cost: 2.39, resourceCount: 2 },
      { name: 'rg-fastfox260227', location: 'Sweden Central', cost: 2.39, resourceCount: 2 },
      { name: 'rg-coolwolf260227', location: 'Canada Central', cost: 0.00, resourceCount: 1 },
    ],
    resources: [
      { type: 'Azure AI Accounts', name: 'aifastfox260227, others', count: 3 },
      { type: 'Container Registries', name: 'acrboldorca260227, acrfastfox260227', count: 2 },
    ],
    totalCost: 4.78,
    status: 'Mixed',
    recommendations: [
      'Three separate AI accounts across 3 regions — consolidate to 1 if possible',
      'Container Registries cost ~$2/mo each even when empty — delete if unused',
    ],
  },
  {
    id: 'cosmos-sensor',
    name: 'Global Sensor Storm',
    description: 'Cosmos DB account for a global sensor data ingestion demo. Single resource with global distribution capability.',
    environment: 'Demo',
    category: 'Database',
    icon: '🌍',
    color: '#14b8a6',
    resourceGroups: [
      { name: 'rg-globalsensorstorm-global', location: 'Canada Central', cost: 6.43, resourceCount: 1 },
    ],
    resources: [
      { type: 'Cosmos DB', name: 'arp-dev-cosmos (serverless)', count: 1 },
    ],
    totalCost: 6.43,
    status: 'Idle',
    recommendations: [
      'Cosmos DB charges for provisioned RU/s even when idle',
      'Switch to serverless mode if workload is bursty and infrequent',
      'Delete if the demo is complete — saves entire $6.43/mo',
    ],
  },
  {
    id: 'platform-infra',
    name: 'Platform & Infrastructure',
    description: 'Shared Azure infrastructure: Cloud Shell storage, Network Watchers, MCAPS governance, Defender/Security defaults, and the Demo VM ASR setup.',
    environment: 'System',
    category: 'Infrastructure',
    icon: '🏗️',
    color: '#64748b',
    resourceGroups: [
      { name: 'cloud-shell-storage-eastus', location: 'East US', cost: 7.14, resourceCount: 4 },
      { name: 'McapsGovernance', location: 'West US 2', cost: 7.01, resourceCount: 2 },
      { name: 'DefaultResourceGroup-EUS', location: 'East US', cost: 0.00, resourceCount: 6 },
      { name: 'DefaultResourceGroup-CCA', location: 'Canada Central', cost: 0.00, resourceCount: 5 },
      { name: 'Default-ActivityLogAlerts', location: 'Global', cost: 0.00, resourceCount: 2 },
      { name: 'NetworkWatcherRG', location: 'Multi-region', cost: 0.00, resourceCount: 4 },
      { name: 'DemoVM_group-asr', location: 'Canada Central', cost: 0.04, resourceCount: 2 },
      { name: 'quiz-demo-rg-ca', location: 'Canada Central', cost: 0.00, resourceCount: 2 },
    ],
    resources: [
      { type: 'Storage Accounts', name: 'Cloud Shell, Governance, Quiz demo', count: 4 },
      { type: 'Network Watchers', name: 'Canada Central, Australia East, East US 2, SE Asia', count: 4 },
      { type: 'Log Analytics', name: 'DefaultWorkspace-EUS, DefaultWorkspace-CCA', count: 2 },
      { type: 'Solutions', name: 'Security, SecurityCenterFree, SQLAdvancedThreatProtection, SQLVulnAssessment', count: 8 },
      { type: 'Action Groups', name: 'Activity log alert defaults', count: 2 },
      { type: 'ASR Resources', name: 'DemoVM availability set + NSG', count: 2 },
      { type: 'Event Grid Topics', name: 'System topics for storage events', count: 4 },
    ],
    totalCost: 14.19,
    status: 'Active',
    recommendations: [
      'Default Log Analytics workspaces may duplicate data — consolidate with workload-specific ones',
      'Cloud Shell storage is necessary — no action needed',
      'DemoVM ASR ($0.04/mo) is nearly free — keep or delete based on need',
      'Review MCAPS Governance storage ($7.01/mo) — may be auto-created',
    ],
  },
];

const TOTAL_COST = WORKLOADS.reduce((s, w) => s + w.totalCost, 0);
const TOTAL_RGS = WORKLOADS.reduce((s, w) => s + w.resourceGroups.length, 0);
const TOTAL_RESOURCES = WORKLOADS.reduce((s, w) => s + w.resourceGroups.reduce((rs, rg) => rs + rg.resourceCount, 0), 0);

const ENV_COLORS: Record<string, string> = {
  POC: '#f59e0b', Dev: '#3b82f6', Demo: '#8b5cf6', System: '#64748b', Production: '#22c55e',
};
const STATUS_COLORS: Record<string, string> = {
  Active: '#22c55e', Idle: '#f59e0b', Deallocated: '#ef4444', Mixed: '#8b5cf6',
};

type Tab = 'overview' | 'map' | 'sankey' | 'recommendations';

/* eslint-disable @typescript-eslint/no-explicit-any */
function TreemapCell(props: any) {
  const { x, y, width, height, name, color, cost } = props;
  if (width < 30 || height < 25) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} opacity={0.8} rx={4} />
      {width > 60 && height > 35 && (
        <>
          <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>{name}</text>
          <text x={x + 6} y={y + 30} fill="rgba(255,255,255,0.7)" fontSize={10}>${cost?.toFixed(2)}</text>
        </>
      )}
    </g>
  );
}

export default function WorkloadMapPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedWorkload, setExpandedWorkload] = useState<string | null>(null);
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'cost' | 'name' | 'resources'>('cost');

  const envs = [...new Set(WORKLOADS.map(w => w.environment))];
  const cats = [...new Set(WORKLOADS.map(w => w.category))];

  const filtered = useMemo(() => {
    let result = WORKLOADS;
    if (envFilter !== 'all') result = result.filter(w => w.environment === envFilter);
    if (catFilter !== 'all') result = result.filter(w => w.category === catFilter);
    if (sortBy === 'cost') result = [...result].sort((a, b) => b.totalCost - a.totalCost);
    else if (sortBy === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else result = [...result].sort((a, b) => b.resourceGroups.reduce((s, rg) => s + rg.resourceCount, 0) - a.resourceGroups.reduce((s, rg) => s + rg.resourceCount, 0));
    return result;
  }, [envFilter, catFilter, sortBy]);

  // Data for charts
  const treemapData = WORKLOADS.map(w => ({
    name: w.name.length > 25 ? w.name.substring(0, 22) + '...' : w.name,
    fullName: w.name,
    size: Math.max(w.totalCost, 1),
    cost: w.totalCost,
    color: w.color,
  }));

  const costByEnv = envs.map(e => ({
    name: e,
    cost: WORKLOADS.filter(w => w.environment === e).reduce((s, w) => s + w.totalCost, 0),
    color: ENV_COLORS[e],
  })).sort((a, b) => b.cost - a.cost);

  const costByCat = cats.map(c => ({
    name: c,
    cost: WORKLOADS.filter(w => w.category === c).reduce((s, w) => s + w.totalCost, 0),
    count: WORKLOADS.filter(w => w.category === c).length,
    color: WORKLOADS.find(w => w.category === c)?.color || '#64748b',
  })).sort((a, b) => b.cost - a.cost);

  const regionData = (() => {
    const map = new Map<string, number>();
    WORKLOADS.forEach(w => w.resourceGroups.forEach(rg => {
      const loc = rg.location;
      map.set(loc, (map.get(loc) || 0) + rg.cost);
    }));
    return Array.from(map.entries()).map(([name, cost]) => ({ name, cost })).sort((a, b) => b.cost - a.cost);
  })();

  const allRecommendations = WORKLOADS.flatMap(w => w.recommendations.map(r => ({ workload: w.name, icon: w.icon, rec: r, cost: w.totalCost })));

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📋' },
    { key: 'map', label: 'Workload Cards', icon: '🗺️' },
    { key: 'sankey', label: 'Cost Breakdown', icon: '📊' },
    { key: 'recommendations', label: 'Recommendations', icon: '💡' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-500 hover:text-white transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              </Link>
              <span className="text-2xl">🗂️</span>
              <div>
                <h1 className="text-xl font-bold text-white">Workload Map</h1>
                <p className="text-xs text-slate-500">Resources grouped by the workload they host</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-500">Month-to-Date</div>
                <div className="text-lg font-bold text-white">${TOTAL_COST.toFixed(2)}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-right">
                <div className="text-xs text-slate-500">Workloads</div>
                <div className="text-lg font-bold text-white">{WORKLOADS.length}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-right">
                <div className="text-xs text-slate-500">Resource Groups</div>
                <div className="text-lg font-bold text-white">{TOTAL_RGS}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-right">
                <div className="text-xs text-slate-500">Resources</div>
                <div className="text-lg font-bold text-white">{TOTAL_RESOURCES}</div>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div className="mt-3 flex gap-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* ============= OVERVIEW TAB ============= */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Disclaimer */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200/80">
              <strong className="text-amber-300">📌 How this page works:</strong> Resources are grouped into <strong>logical workloads</strong> based on naming patterns, resource group structure, and inter-resource dependencies. Costs are from the Azure Cost Management API (month-to-date). One resource group can belong to exactly one workload.
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {costByEnv.map(e => (
                <div key={e.name} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-sm font-medium text-slate-300">{e.name}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">${e.cost.toFixed(2)}</div>
                  <div className="text-xs text-slate-500 mt-1">{WORKLOADS.filter(w => w.environment === e.name).length} workload(s) · {((e.cost / TOTAL_COST) * 100).toFixed(0)}% of total</div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Treemap */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Cost by Workload (Treemap)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#1e293b"
                    content={<TreemapCell />}
                  />
                </ResponsiveContainer>
              </div>

              {/* Cost by Category */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Cost by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costByCat} layout="vertical" margin={{ left: 80, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={75} />
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                      {costByCat.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost by Region */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Cost by Azure Region</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={regionData} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tickFormatter={v => `$${v}`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {regionData.map((_, i) => <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'][i % 8]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Workload Table */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">All Workloads</h3>
                <span className="text-xs text-slate-500">Sorted by cost (highest first)</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs">
                    <th className="px-4 py-3 text-left">Workload</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Environment</th>
                    <th className="px-4 py-3 text-right">Resource Groups</th>
                    <th className="px-4 py-3 text-right">Resources</th>
                    <th className="px-4 py-3 text-right">MTD Cost</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...WORKLOADS].sort((a, b) => b.totalCost - a.totalCost).map(w => (
                    <tr key={w.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{w.icon}</span>
                          <span className="font-medium text-white">{w.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: w.color + '20', color: w.color }}>{w.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: ENV_COLORS[w.environment] + '20', color: ENV_COLORS[w.environment] }}>{w.environment}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{w.resourceGroups.length}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{w.resourceGroups.reduce((s, rg) => s + rg.resourceCount, 0)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">${w.totalCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: STATUS_COLORS[w.status] + '20', color: STATUS_COLORS[w.status] }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[w.status] }} />
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 font-semibold text-white">
                    <td className="px-4 py-3" colSpan={3}>Total ({WORKLOADS.length} workloads)</td>
                    <td className="px-4 py-3 text-right">{TOTAL_RGS}</td>
                    <td className="px-4 py-3 text-right">{TOTAL_RESOURCES}</td>
                    <td className="px-4 py-3 text-right font-mono">${TOTAL_COST.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ============= WORKLOAD CARDS TAB ============= */}
        {tab === 'map' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg border border-slate-700 bg-slate-800">
                <button onClick={() => setEnvFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-l-lg ${envFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>All Envs</button>
                {envs.map((e, i) => (
                  <button key={e} onClick={() => setEnvFilter(e)} className={`px-3 py-1.5 text-xs font-medium ${envFilter === e ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'} ${i === envs.length - 1 ? 'rounded-r-lg' : ''}`}>{e}</button>
                ))}
              </div>
              <div className="flex rounded-lg border border-slate-700 bg-slate-800">
                <button onClick={() => setCatFilter('all')} className={`px-3 py-1.5 text-xs font-medium rounded-l-lg ${catFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>All Categories</button>
                {cats.map((c, i) => (
                  <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-1.5 text-xs font-medium ${catFilter === c ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'} ${i === cats.length - 1 ? 'rounded-r-lg' : ''}`}>{c}</button>
                ))}
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500">
                <option value="cost">Sort by Cost</option>
                <option value="name">Sort by Name</option>
                <option value="resources">Sort by Resources</option>
              </select>
              <span className="text-xs text-slate-500">{filtered.length} workload(s)</span>
            </div>

            {/* Cards */}
            {filtered.map(w => {
              const isExpanded = expandedWorkload === w.id;
              const totalRes = w.resourceGroups.reduce((s, rg) => s + rg.resourceCount, 0);
              return (
                <div key={w.id} className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden transition-all hover:border-slate-600">
                  {/* Header */}
                  <button onClick={() => setExpandedWorkload(isExpanded ? null : w.id)} className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-slate-700/20 transition-colors">
                    <span className="text-3xl">{w.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white">{w.name}</h3>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: ENV_COLORS[w.environment] + '20', color: ENV_COLORS[w.environment] }}>{w.environment}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: w.color + '20', color: w.color }}>{w.category}</span>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: STATUS_COLORS[w.status] + '20', color: STATUS_COLORS[w.status] }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[w.status] }} />
                          {w.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{w.description}</p>
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">RGs</div>
                        <div className="text-sm font-semibold text-white">{w.resourceGroups.length}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Resources</div>
                        <div className="text-sm font-semibold text-white">{totalRes}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">MTD Cost</div>
                        <div className="text-lg font-bold text-white">${w.totalCost.toFixed(2)}</div>
                      </div>
                      <svg className={`h-5 w-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 px-6 py-5 bg-slate-800/50 space-y-5">
                      <p className="text-sm text-slate-300 leading-relaxed">{w.description}</p>

                      {/* Resource Groups */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resource Groups</h4>
                        <div className="space-y-2">
                          {w.resourceGroups.map(rg => (
                            <div key={rg.name} className="flex items-center justify-between rounded-lg bg-slate-900/50 border border-slate-700/50 px-4 py-2.5">
                              <div>
                                <span className="text-sm font-mono text-blue-400">{rg.name}</span>
                                <span className="ml-2 text-xs text-slate-500">{rg.location}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-400">{rg.resourceCount} resources</span>
                                <span className="text-sm font-mono font-semibold text-white">${rg.cost.toFixed(2)}</span>
                                {/* Cost bar */}
                                <div className="w-20 h-2 rounded-full bg-slate-700 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (rg.cost / TOTAL_COST) * 100 * 5)}%`, backgroundColor: w.color }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Resources */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resources</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {w.resources.map((r, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-900/50 border border-slate-700/50 px-3 py-2">
                              <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-white">{r.count || 1}</div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-white">{r.type}</div>
                                <div className="text-[11px] text-slate-500 truncate">{r.name}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommendations */}
                      {w.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recommendations</h4>
                          <div className="space-y-1.5">
                            {w.recommendations.map((rec, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className="text-amber-400 mt-0.5">→</span>
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ============= COST BREAKDOWN TAB ============= */}
        {tab === 'sankey' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200/80">
              <strong className="text-amber-300">Flow:</strong> Subscription → Environment → Category → Workload → Resource Groups. This shows how your ${TOTAL_COST.toFixed(2)} MTD spend flows from top-level classification down to individual resource groups.
            </div>

            {/* Environment → Category flow  */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Environment breakdown */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">By Environment</h3>
                <div className="space-y-3">
                  {costByEnv.map(e => (
                    <div key={e.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium">{e.name}</span>
                        <span className="text-white font-semibold">${e.cost.toFixed(2)} ({((e.cost / TOTAL_COST) * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(e.cost / TOTAL_COST) * 100}%`, backgroundColor: e.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category pie chart */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">By Category</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={costByCat} dataKey="cost" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {costByCat.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Region breakdown */}
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">By Region</h3>
                <div className="space-y-3">
                  {regionData.map((r, i) => (
                    <div key={r.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{r.name}</span>
                        <span className="text-white font-semibold">${r.cost.toFixed(2)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(r.cost / regionData[0].cost) * 100}%`, backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'][i % 7] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed RG-level breakdown per workload */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Workload → Resource Group Cost Flow</h3>
              <div className="space-y-4">
                {[...WORKLOADS].sort((a, b) => b.totalCost - a.totalCost).map(w => (
                  <div key={w.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span>{w.icon}</span>
                      <span className="text-sm font-semibold text-white">{w.name}</span>
                      <span className="text-xs text-slate-500 ml-auto">${w.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="ml-8 space-y-1">
                      {w.resourceGroups.sort((a, b) => b.cost - a.cost).map(rg => (
                        <div key={rg.name} className="flex items-center gap-2">
                          <div className="h-1.5 rounded-full bg-slate-700 flex-1 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (rg.cost / TOTAL_COST) * 100 * 4)}%`, backgroundColor: w.color }} />
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 w-52 truncate text-right">{rg.name}</span>
                          <span className="text-[11px] font-mono text-white w-14 text-right">${rg.cost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============= RECOMMENDATIONS TAB ============= */}
        {tab === 'recommendations' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200/80">
              <strong className="text-emerald-300">💡 {allRecommendations.length} recommendations</strong> across {WORKLOADS.length} workloads. These are based on resource placement, environment type, and usage patterns.
            </div>

            {/* Grouped by workload */}
            {[...WORKLOADS].sort((a, b) => b.totalCost - a.totalCost).map(w => (
              <div key={w.id} className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between bg-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{w.icon}</span>
                    <span className="font-semibold text-white">{w.name}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: ENV_COLORS[w.environment] + '20', color: ENV_COLORS[w.environment] }}>{w.environment}</span>
                  </div>
                  <span className="text-sm font-mono text-slate-300">${w.totalCost.toFixed(2)}/mo</span>
                </div>
                <div className="px-5 py-3 space-y-2">
                  {w.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 py-1.5">
                      <span className="text-amber-400 mt-0.5 flex-shrink-0">→</span>
                      <span className="text-sm text-slate-300 leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Quick summary */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Quick Wins Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <div className="text-xs text-red-400 font-semibold mb-1">🔴 Delete Unused Resources</div>
                  <div className="text-sm text-slate-300">5 of 6 KV AI deployments may be unused. Delete to save ~$11/mo. Cosmos DB demo if inactive: $6/mo.</div>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <div className="text-xs text-amber-400 font-semibold mb-1">🟡 Consolidate Multi-Region</div>
                  <div className="text-sm text-slate-300">4 AKS demo clusters in 4 regions cost $47/mo. Consolidate to 1 region: save ~$35/mo.</div>
                </div>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <div className="text-xs text-blue-400 font-semibold mb-1">🔵 Deallocate When Idle</div>
                  <div className="text-sm text-slate-300">Disk monitoring VMs cost ~$25-30/mo in compute. Deallocate when not benchmarking.</div>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <div className="text-xs text-emerald-400 font-semibold mb-1">🟢 Efficient Architectures</div>
                  <div className="text-sm text-slate-300">ARP Dev ($0.65/mo) uses Container Apps + serverless Cosmos — exemplary cost efficiency.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 mt-8">
        <div className="mx-auto max-w-[1400px] px-6 py-4 flex items-center justify-between text-xs text-slate-600">
          <span>Workload grouping based on resource naming, RG structure, and dependencies. Group membership is manually curated.</span>
          <span>Costs: Azure Cost Management API (month-to-date)</span>
        </div>
      </div>
    </div>
  );
}
