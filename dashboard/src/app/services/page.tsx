'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';

// ============================================================================
// SERVICE EXPLORER — Deep dive into every Azure service in the subscription
// Data: Azure Resource Graph (209 resources) + Cost Management API (MTD)
// Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105
// ============================================================================

interface ServiceResource {
  name: string;
  rg: string;
  location: string;
  sku?: string;
  kind?: string;
  status?: string;
  tags?: Record<string, string>;
}

interface AzureService {
  id: string;
  provider: string;
  type: string;
  displayName: string;
  icon: string;
  count: number;
  mtdCost: number;
  category: 'Compute' | 'Networking' | 'Storage' | 'Containers' | 'Databases' | 'Monitoring' | 'Security' | 'AI/ML' | 'Web' | 'Identity' | 'Other';
  color: string;
  description: string;
  resources: ServiceResource[];
  portalUrl: string;
}

const SERVICES: AzureService[] = [
  {
    id: 'log-analytics', provider: 'microsoft.operationalinsights', type: 'workspaces',
    displayName: 'Log Analytics Workspaces', icon: '/icons/log-analytics.svg', count: 16, mtdCost: 0.55, category: 'Monitoring', color: '#10b981',
    description: 'Central log collection and KQL query engine. 16 workspaces across monitoring, AKS, AI, and default resource groups.',
    resources: [
      { name: 'law-diskmon-poc-eastus2', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', status: 'Active', tags: { project: 'diskmon', environment: 'poc' } },
      { name: 'hello-ca-logs', rg: 'rg-helloworld-canadacentral', location: 'canadacentral', tags: { project: 'helloworld', environment: 'demo' } },
      { name: 'hello-au-logs', rg: 'rg-helloworld-australiaeast', location: 'australiaeast', tags: { project: 'helloworld', environment: 'demo' } },
      { name: 'hello-us-logs', rg: 'rg-helloworld-eastus2', location: 'eastus2', tags: { project: 'helloworld', environment: 'demo' } },
      { name: 'hello-as-logs', rg: 'rg-helloworld-southeastasia', location: 'southeastasia', tags: { project: 'helloworld', environment: 'demo' } },
      { name: 'arp-dev-logs', rg: 'rg-arp-dev-core', location: 'eastus2' },
      { name: 'kv-logs-xxx (x6)', rg: 'rg-kv-ai-*', location: 'swedencentral' },
      { name: 'DefaultWorkspace-EUS', rg: 'DefaultResourceGroup-EUS', location: 'eastus' },
      { name: 'DefaultWorkspace-CCA', rg: 'DefaultResourceGroup-CCA', location: 'canadacentral' },
      { name: 'workspace-rgazvmcomputeXJ1W', rg: 'rg-azvm-compute', location: 'canadacentral' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.OperationalInsights%2Fworkspaces',
  },
  {
    id: 'nsg', provider: 'microsoft.network', type: 'networksecuritygroups',
    displayName: 'Network Security Groups', icon: '/icons/nsg.svg', count: 15, mtdCost: 0, category: 'Networking', color: '#3b82f6',
    description: 'Firewall rules for subnets and NICs. 15 NSGs across AKS node pools, VNets, and VM subnets.',
    resources: [
      { name: 'snet-diskmon-vms-poc-nsg', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', tags: { project: 'diskmon', environment: 'poc' } },
      { name: 'aks-agentpool-*-nsg (x8)', rg: 'MC_rg-helloworld-*', location: 'multi-region' },
      { name: 'subnet-nsg (x4)', rg: 'various', location: 'multi-region' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Network%2FnetworkSecurityGroups',
  },
  {
    id: 'acr', provider: 'microsoft.containerregistry', type: 'registries',
    displayName: 'Container Registries', icon: '/icons/container-registry.svg', count: 15, mtdCost: 22.40, category: 'Containers', color: '#8b5cf6',
    description: '15 registries — mostly Basic SKU. High count due to per-project/per-region deployments. Consolidation opportunity.',
    resources: [
      { name: 'azvmetlacr', rg: 'rg-azvm-compute', location: 'canadacentral', sku: 'Basic', tags: { project: 'azvm-compute', environment: 'dev' } },
      { name: 'restdiracr3yj6wtfbtsi32', rg: 'restdir-rg', location: 'canadacentral', sku: 'Basic' },
      { name: 'ca4fabaea789acr', rg: 'rg-arp-dev-core', location: 'eastus2', sku: 'Basic' },
      { name: 'kvacrXXXXX (x6)', rg: 'rg-kv-ai-*', location: 'swedencentral', sku: 'Basic' },
      { name: 'helloworld-acr (x4)', rg: 'rg-helloworld-*', location: 'multi-region', sku: 'Basic' },
      { name: 'acrboldorca260227', rg: 'rg-boldorca260227', location: 'westus3', sku: 'Basic' },
      { name: 'acrfastfox260227', rg: 'rg-fastfox260227', location: 'swedencentral', sku: 'Basic' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.ContainerRegistry%2Fregistries',
  },
  {
    id: 'container-apps', provider: 'microsoft.app', type: 'containerapps',
    displayName: 'Container Apps', icon: '/icons/container-app.svg', count: 15, mtdCost: 0.65, category: 'Containers', color: '#06b6d4',
    description: 'Serverless container instances. 15 apps across ARP dev (orchestrator + 5 regional pings), KV AI, and App Spaces.',
    resources: [
      { name: 'arp-dev-orch', rg: 'rg-arp-dev-core', location: 'eastus2', status: 'Running', tags: { project: 'arp', environment: 'dev' } },
      { name: 'arp-dev-ping-* (x5)', rg: 'rg-arp-dev-core', location: 'eastus2', status: 'Running' },
      { name: 'container-app-sh4tpwkxz5f5m', rg: 'appspacesragapp9b9f8efe', location: 'westus2', status: 'Running' },
      { name: 'kv-ai-app (x6)', rg: 'rg-kv-ai-*', location: 'swedencentral' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.App%2FcontainerApps',
  },
  {
    id: 'disks', provider: 'microsoft.compute', type: 'disks',
    displayName: 'Managed Disks', icon: '/icons/disks.svg', count: 13, mtdCost: 8.20, category: 'Compute', color: '#f59e0b',
    description: '13 disks: 8 data + 5 OS across 5 VM types (Premium SSD, Premium SSD v2, Standard SSD, Standard HDD, Ultra).',
    resources: [
      { name: 'disk-ultra-bench', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'UltraSSD_LRS', status: 'Attached', tags: { project: 'diskmon', environment: 'poc', purpose: 'benchmark' } },
      { name: 'disk-premv2-bench', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'PremiumV2_LRS', status: 'Attached', tags: { project: 'diskmon', environment: 'poc', purpose: 'benchmark' } },
      { name: 'disk-prem-iops', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Premium_LRS', status: 'Attached', tags: { project: 'diskmon', environment: 'poc' } },
      { name: 'disk-std-ssd-01', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'StandardSSD_LRS', status: 'Attached', tags: { project: 'diskmon', environment: 'poc' } },
      { name: 'disk-std-hdd-01', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Standard_LRS', status: 'Attached' },
      { name: 'OS disks (x5)', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Premium_LRS', status: 'Attached' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Compute%2Fdisks',
  },
  {
    id: 'vm-ext', provider: 'microsoft.compute', type: 'extensions',
    displayName: 'VM Extensions', icon: '/icons/vm-extensions.svg', count: 10, mtdCost: 0, category: 'Compute', color: '#6366f1',
    description: 'Azure Monitor Agent (AMA) x4, DependencyAgent x3, DiskSpd benchmark x1, and guest config extensions.',
    resources: [
      { name: 'AzureMonitorLinuxAgent (x3)', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', status: 'Provisioned' },
      { name: 'AzureMonitorWindowsAgent', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', status: 'Provisioned' },
      { name: 'DependencyAgentWindows', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', status: 'Provisioned' },
      { name: 'DiskSpdBenchmark', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', status: 'Provisioned' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Compute%2FvirtualMachines',
  },
  {
    id: 'pip', provider: 'microsoft.network', type: 'publicipaddresses',
    displayName: 'Public IP Addresses', icon: '/icons/public-ip.svg', count: 9, mtdCost: 1.20, category: 'Networking', color: '#0ea5e9',
    description: '9 public IPs — mostly from AKS load balancers (2 per cluster) and VM NICs.',
    resources: [
      { name: 'kubernetes-* (x8)', rg: 'MC_rg-helloworld-*', location: 'multi-region', sku: 'Standard' },
      { name: 'pip-diskmon-*', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Standard' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Network%2FpublicIPAddresses',
  },
  {
    id: 'managed-env', provider: 'microsoft.app', type: 'managedenvironments',
    displayName: 'Container App Environments', icon: '/icons/container-env.svg', count: 9, mtdCost: 10.38, category: 'Containers', color: '#14b8a6',
    description: '9 managed environments — each has a load balancer. Major cost driver for Container Apps workloads.',
    resources: [
      { name: 'arp-dev-env', rg: 'rg-arp-dev-core', location: 'eastus2' },
      { name: 'container-app-environment-*', rg: 'appspacesragapp9b9f8efe', location: 'westus2' },
      { name: 'kv-ai-env (x6)', rg: 'rg-kv-ai-*', location: 'swedencentral' },
      { name: 'azvm-etl-env', rg: 'rg-azvm-compute', location: 'canadacentral' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.App%2FmanagedEnvironments',
  },
  {
    id: 'vms', provider: 'microsoft.compute', type: 'virtualmachines',
    displayName: 'Virtual Machines', icon: '/icons/vm.svg', count: 5, mtdCost: 19.52, category: 'Compute', color: '#ef4444',
    description: '5 VMs for disk monitoring POC: D4s_v5 ×2 (Linux), D8s_v5 (Linux), E4s_v5 (Linux), L8s_v3 (NVMe).',
    resources: [
      { name: 'vm-diskmon-linux-01', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Standard_D4s_v5', status: 'Deallocated', tags: { project: 'diskmon', environment: 'poc', 'vm-purpose': 'general-purpose-baseline' } },
      { name: 'vm-diskmon-linux-02', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Standard_D4s_v5', status: 'Deallocated', tags: { project: 'diskmon', environment: 'poc', 'vm-purpose': 'general-purpose-scaleup' } },
      { name: 'vm-diskmon-linux-03', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Standard_D8s_v5', status: 'Deallocated', tags: { project: 'diskmon', environment: 'poc', 'vm-purpose': 'memory-optimized-comparison' } },
      { name: 'vm-diskmon-linux-04', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Standard_E4s_v5', status: 'Deallocated', tags: { project: 'diskmon', environment: 'poc', 'vm-purpose': 'storage-optimized-comparison' } },
      { name: 'vm-diskmon-win-01', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Standard_L8s_v3', status: 'Deallocated', tags: { project: 'diskmon', environment: 'poc', 'vm-purpose': 'windows-diskspd-comparison' } },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Compute%2FVirtualMachines',
  },
  {
    id: 'lb', provider: 'microsoft.network', type: 'loadbalancers',
    displayName: 'Load Balancers', icon: '/icons/load-balancer.svg', count: 5, mtdCost: 18.06, category: 'Networking', color: '#a855f7',
    description: '5 load balancers — 4 from AKS clusters (Kubernetes service), 1 from Container App managed environment.',
    resources: [
      { name: 'kubernetes (x4)', rg: 'MC_rg-helloworld-*', location: 'multi-region', sku: 'Standard' },
      { name: 'capp-svc-lb', rg: 'ME_*_appspacesragapp*', location: 'westus2', sku: 'Standard' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Network%2FloadBalancers',
  },
  {
    id: 'storage', provider: 'microsoft.storage', type: 'storageaccounts',
    displayName: 'Storage Accounts', icon: '/icons/storage.svg', count: 5, mtdCost: 12.90, category: 'Storage', color: '#f97316',
    description: '5 storage accounts — Cloud Shell, MCAPS Governance, AI project data, and event grid topics.',
    resources: [
      { name: 'cs1100320032*', rg: 'cloud-shell-storage-eastus', location: 'eastus', sku: 'Standard_LRS' },
      { name: 'mcapsstorageXX', rg: 'McapsGovernance', location: 'westus2', sku: 'Standard_LRS' },
      { name: 'kvstd3ocert7badhy', rg: 'rg-kv-ai-4e8c9', location: 'swedencentral', sku: 'Standard_LRS' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Storage%2FStorageAccounts',
  },
  {
    id: 'swa', provider: 'microsoft.web', type: 'staticsites',
    displayName: 'Static Web Apps', icon: '/icons/static-apps.svg', count: 5, mtdCost: 9.00, category: 'Web', color: '#22c55e',
    description: '5 SWAs: disk monitoring dashboard (Standard), ARP dev, CSI education, AZVM SKU lookup, quiz demo.',
    resources: [
      { name: 'swa-diskmon-poc', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Standard', status: 'Active', tags: { project: 'diskmon', environment: 'poc' } },
      { name: 'arp-dev-swa', rg: 'rg-arp-dev-core', location: 'eastus2', sku: 'Free', tags: { project: 'arp', environment: 'dev' } },
      { name: 'csi-education-vertical', rg: 'appspacesragapp9b9f8efe', location: 'westus2', sku: 'Free' },
      { name: 'azvm-sku-lookup-swa', rg: 'rg-azvm-compute', location: 'canadacentral', sku: 'Free' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Web%2FstaticSites',
  },
  {
    id: 'aks', provider: 'microsoft.containerservice', type: 'managedclusters',
    displayName: 'AKS Clusters', icon: '/icons/kubernetes.svg', count: 4, mtdCost: 0, category: 'Containers', color: '#7c3aed',
    description: '4 AKS clusters across 4 regions (Canada, Australia, US, SE Asia) for helloworld demo app.',
    resources: [
      { name: 'helloaks-aks', rg: 'rg-helloworld-canadacentral', location: 'canadacentral', sku: 'Free', tags: { project: 'helloworld', environment: 'demo' } },
      { name: 'helloau-aks', rg: 'rg-helloworld-australiaeast', location: 'australiaeast', sku: 'Free', tags: { project: 'helloworld', environment: 'demo' } },
      { name: 'hellous-aks', rg: 'rg-helloworld-eastus2', location: 'eastus2', sku: 'Free', tags: { project: 'helloworld', environment: 'demo' } },
      { name: 'helloas-aks', rg: 'rg-helloworld-southeastasia', location: 'southeastasia', sku: 'Free', tags: { project: 'helloworld', environment: 'demo' } },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.ContainerService%2FmanagedClusters',
  },
  {
    id: 'vmss', provider: 'microsoft.compute', type: 'virtualmachinescalesets',
    displayName: 'VM Scale Sets', icon: '/icons/vmss.svg', count: 4, mtdCost: 2.80, category: 'Compute', color: '#ec4899',
    description: '4 VMSS instances — AKS node pools (aks-system) one per cluster.',
    resources: [
      { name: 'aks-system-* (x4)', rg: 'MC_rg-helloworld-*', location: 'multi-region', sku: 'Standard_DS2_v2' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Compute%2FvirtualMachineScaleSets',
  },
  {
    id: 'ai-accounts', provider: 'microsoft.cognitiveservices', type: 'accounts',
    displayName: 'AI/Cognitive Services', icon: '/icons/cognitive.svg', count: 5, mtdCost: 0.00, category: 'AI/ML', color: '#a78bfa',
    description: '5 accounts: Azure OpenAI (disk monitoring), AI Foundry (KV AI), and 3 standalone Cognitive accounts.',
    resources: [
      { name: 'oai-diskmon-poc', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', kind: 'OpenAI', status: 'Active', tags: { project: 'diskmon', environment: 'poc' } },
      { name: 'kv-ai-d3ocert7badhy', rg: 'rg-kv-ai-4e8c9', location: 'swedencentral', kind: 'AIServices' },
      { name: 'aifastfox260227', rg: 'rg-fastfox260227', location: 'swedencentral', kind: 'AIServices' },
      { name: 'aiboldorca260227', rg: 'rg-boldorca260227', location: 'westus3', kind: 'AIServices' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.CognitiveServices%2Faccounts',
  },
  {
    id: 'postgres', provider: 'microsoft.dbforpostgresql', type: 'flexibleservers',
    displayName: 'PostgreSQL Flexible', icon: '/icons/postgresql.svg', count: 3, mtdCost: 5.21, category: 'Databases', color: '#0891b2',
    description: '3 PostgreSQL Flexible servers: 2 for AZVM compute (SKU lookup + ETL), 1 for restaurant directory.',
    resources: [
      { name: 'azurevmsku-pg', rg: 'rg-azvm-compute', location: 'canadacentral', sku: 'Standard_B1ms', tags: { project: 'azvm-compute', environment: 'dev' } },
      { name: 'azvm-compute-pg', rg: 'rg-azvm-compute', location: 'canadacentral', sku: 'Standard_B1ms', tags: { project: 'azvm-compute', environment: 'dev' } },
      { name: 'restdir-db-3yj6wtfbtsi32', rg: 'restdir-rg', location: 'canadacentral', sku: 'Standard_B1ms' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.DBforPostgreSQL%2FflexibleServers',
  },
  {
    id: 'cosmos', provider: 'microsoft.documentdb', type: 'databaseaccounts',
    displayName: 'Cosmos DB', icon: '/icons/cosmos-db.svg', count: 2, mtdCost: 5.37, category: 'Databases', color: '#2dd4bf',
    description: '2 Cosmos DB accounts: ARP dev (serverless, minimal use) and Global Sensor Storm demo.',
    resources: [
      { name: 'arp-dev-cosmos', rg: 'rg-arp-dev-core', location: 'eastus2', kind: 'GlobalDocumentDB', tags: { project: 'arp', environment: 'dev' } },
      { name: 'globalsensorstorm-cosmos', rg: 'rg-globalsensorstorm-global', location: 'canadacentral', kind: 'GlobalDocumentDB' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.DocumentDB%2FdatabaseAccounts',
  },
  {
    id: 'grafana', provider: 'microsoft.dashboard', type: 'grafana',
    displayName: 'Managed Grafana', icon: '/icons/grafana.svg', count: 1, mtdCost: 0, category: 'Monitoring', color: '#f97316',
    description: 'Azure Managed Grafana for disk performance dashboards. Connected to Log Analytics workspace.',
    resources: [
      { name: 'grafana-diskmon-poc', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', sku: 'Standard', status: 'Active', tags: { project: 'diskmon', environment: 'poc' } },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Dashboard%2Fgrafana',
  },
  {
    id: 'front-door', provider: 'microsoft.cdn', type: 'profiles',
    displayName: 'Front Door / CDN', icon: '/icons/front-door.svg', count: 1, mtdCost: 0.42, category: 'Networking', color: '#64748b',
    description: 'Azure Front Door profile for the disk monitoring SWA. Provides CDN caching and custom domain.',
    resources: [
      { name: 'afd-diskmon-poc', rg: 'rg-diskmon-poc-eastus2', location: 'Global', sku: 'Standard_AzureFrontDoor', status: 'Active' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Cdn%2Fprofiles',
  },
  {
    id: 'dcr', provider: 'microsoft.insights', type: 'datacollectionrules',
    displayName: 'Data Collection Rules', icon: '/icons/data-collection.svg', count: 1, mtdCost: 0, category: 'Monitoring', color: '#84cc16',
    description: 'DCR with 29 performance counters for AMA-based disk metrics collection at 60-second intervals.',
    resources: [
      { name: 'dcr-diskmon-perf-poc', rg: 'rg-diskmon-poc-eastus2', location: 'eastus2', status: 'Active', tags: { project: 'diskmon', environment: 'poc' } },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.Insights%2FdataCollectionRules',
  },
  {
    id: 'keyvault', provider: 'microsoft.keyvault', type: 'vaults',
    displayName: 'Key Vault', icon: '/icons/key-vault.svg', count: 1, mtdCost: 0.03, category: 'Security', color: '#eab308',
    description: 'Key Vault for KV AI project secrets and certificates.',
    resources: [
      { name: 'kv-kv-d3ocert7badhy', rg: 'rg-kv-ai-4e8c9', location: 'swedencentral', sku: 'Standard', status: 'Active' },
    ],
    portalUrl: 'https://portal.azure.com/#browse/Microsoft.KeyVault%2Fvaults',
  },
];

const TOTAL_RESOURCES = SERVICES.reduce((s, svc) => s + svc.count, 0);
const TOTAL_MTD_COST = SERVICES.reduce((s, svc) => s + svc.mtdCost, 0);
const CATEGORIES = [...new Set(SERVICES.map(s => s.category))];

const CAT_COLORS: Record<string, string> = {
  Compute: '#ef4444', Networking: '#3b82f6', Storage: '#f97316', Containers: '#8b5cf6',
  Databases: '#0891b2', Monitoring: '#10b981', Security: '#eab308', 'AI/ML': '#a78bfa',
  Web: '#22c55e', Identity: '#6366f1', Other: '#64748b',
};

export default function ServiceExplorerPage() {
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'count' | 'cost' | 'name'>('count');

  const filtered = useMemo(() => {
    let res = SERVICES;
    if (catFilter !== 'all') res = res.filter(s => s.category === catFilter);
    if (sortBy === 'count') res = [...res].sort((a, b) => b.count - a.count);
    else if (sortBy === 'cost') res = [...res].sort((a, b) => b.mtdCost - a.mtdCost);
    else res = [...res].sort((a, b) => a.displayName.localeCompare(b.displayName));
    return res;
  }, [catFilter, sortBy]);

  const costByCategory = CATEGORIES.map(c => ({
    category: c,
    cost: SERVICES.filter(s => s.category === c).reduce((sum, s) => sum + s.mtdCost, 0),
    count: SERVICES.filter(s => s.category === c).reduce((sum, s) => sum + s.count, 0),
    color: CAT_COLORS[c],
  })).sort((a, b) => b.cost - a.cost);

  const topByCount = [...SERVICES].sort((a, b) => b.count - a.count).slice(0, 8);

  const allResources = useMemo(() =>
    SERVICES.flatMap(svc => svc.resources.map(r => ({ ...r, service: svc.displayName, serviceColor: svc.color }))),
    []
  );
  const taggedResources = allResources.filter(r => r.tags && Object.keys(r.tags).length > 0);
  const untaggedResources = allResources.filter(r => !r.tags || Object.keys(r.tags).length === 0);
  const tagCoveragePct = Math.round((taggedResources.length / allResources.length) * 100);

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
              <span className="text-2xl" aria-hidden="true">🔍</span>
              <div>
                <h1 className="text-2xl font-bold text-white">Service Explorer</h1>
                <p className="text-sm text-slate-400">Deep dive into every Azure service in the subscription</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="text-sm text-slate-400">Services</div>
                <div className="text-xl font-bold text-white">{SERVICES.length}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" aria-hidden="true" />
              <div className="text-right">
                <div className="text-sm text-slate-400">Resources</div>
                <div className="text-xl font-bold text-white">{TOTAL_RESOURCES}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" aria-hidden="true" />
              <div className="text-right">
                <div className="text-sm text-slate-400">MTD Cost</div>
                <div className="text-xl font-bold text-white">${TOTAL_MTD_COST.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
        {/* Overview Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-base font-bold text-white mb-4">Resources by Service (Top 8)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topByCount} layout="vertical" margin={{ left: 140, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3250" />
                <XAxis type="number" tick={{ fill: '#dce4ed', fontSize: 13 }} />
                <YAxis type="category" dataKey="displayName" tick={{ fill: '#dce4ed', fontSize: 12 }} width={135} />
                <Tooltip formatter={(v: number) => `${v} resources`} contentStyle={{ backgroundColor: '#131f35', border: '1px solid #1e3250', borderRadius: 4, fontSize: 13 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {topByCount.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-base font-bold text-white mb-4">Cost by Category (MTD)</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="45%" height={260}>
                <PieChart>
                  <Pie data={costByCategory.filter(c => c.cost > 0)} dataKey="cost" nameKey="category" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                    {costByCategory.filter(c => c.cost > 0).map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} contentStyle={{ backgroundColor: '#131f35', border: '1px solid #1e3250', borderRadius: 4, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {costByCategory.map(c => (
                  <div key={c.category} className="flex items-center gap-2.5">
                    <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-sm text-slate-200 flex-1">{c.category}</span>
                    <span className="text-sm text-slate-300">{c.count} res</span>
                    <span className="text-sm font-mono font-bold text-white w-16 text-right">${c.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <fieldset className="flex rounded-lg border border-slate-700 bg-slate-800 flex-wrap" role="radiogroup" aria-label="Filter by category">
            <button onClick={() => setCatFilter('all')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${catFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}>All ({SERVICES.length})</button>
            {CATEGORIES.map((c, i) => (
              <button key={c} onClick={() => setCatFilter(c)} className={`px-3 py-2 text-sm font-medium ${catFilter === c ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'} ${i === CATEGORIES.length - 1 ? 'rounded-r-lg' : ''}`}>
                {c}
              </button>
            ))}
          </fieldset>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200" aria-label="Sort services">
            <option value="count">Sort by Resource Count</option>
            <option value="cost">Sort by Cost</option>
            <option value="name">Sort by Name</option>
          </select>
          <span className="text-sm text-slate-400">{filtered.length} services · {filtered.reduce((s, f) => s + f.count, 0)} resources</span>
        </div>

        {/* Service Cards */}
        <div className="space-y-3">
          {filtered.map(svc => {
            const isExpanded = expandedService === svc.id;
            return (
              <div key={svc.id} className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden transition-all hover:border-slate-600">
                <button onClick={() => setExpandedService(isExpanded ? null : svc.id)} className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-slate-700/20 transition-colors" aria-expanded={isExpanded}>
                  <img src={svc.icon} alt="" className="h-7 w-7 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-white">{svc.displayName}</h3>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: CAT_COLORS[svc.category] + '20', color: CAT_COLORS[svc.category] }}>{svc.category}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-1">{svc.description}</p>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{svc.count}</div>
                      <div className="text-xs text-slate-400">resources</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">${svc.mtdCost.toFixed(2)}</div>
                      <div className="text-xs text-slate-400">MTD cost</div>
                    </div>
                    <svg className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700 px-6 py-5 bg-slate-800/50 space-y-4">
                    <p className="text-sm text-slate-200 leading-relaxed">{svc.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-4 py-3 text-center">
                        <div className="text-2xl font-bold text-white">{svc.count}</div>
                        <div className="text-xs text-slate-400">Resources</div>
                      </div>
                      <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-4 py-3 text-center">
                        <div className="text-2xl font-bold text-white">${svc.mtdCost.toFixed(2)}</div>
                        <div className="text-xs text-slate-400">MTD Cost</div>
                      </div>
                      <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-4 py-3 text-center">
                        <div className="text-2xl font-bold text-white">{svc.resources.length}</div>
                        <div className="text-xs text-slate-400">Unique Instances</div>
                      </div>
                      <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-4 py-3 text-center">
                        <div className="text-2xl font-bold" style={{ color: svc.color }}>{svc.category}</div>
                        <div className="text-xs text-slate-400">Category</div>
                      </div>
                    </div>

                    {/* Resource table */}
                    <div className="rounded-lg border border-slate-700/50 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700 text-slate-300 bg-slate-900/30">
                            <th className="px-4 py-2.5 text-left font-semibold">Resource Name</th>
                            <th className="px-4 py-2.5 text-left font-semibold">Resource Group</th>
                            <th className="px-4 py-2.5 text-left font-semibold">Location</th>
                            {svc.resources.some(r => r.sku) && <th className="px-4 py-2.5 text-left font-semibold">SKU</th>}
                            {svc.resources.some(r => r.status) && <th className="px-4 py-2.5 text-center font-semibold">Status</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {svc.resources.map((r, i) => (
                            <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                              <td className="px-4 py-2.5 font-mono font-semibold text-blue-400">{r.name}</td>
                              <td className="px-4 py-2.5 text-slate-300">{r.rg}</td>
                              <td className="px-4 py-2.5 text-slate-300">{r.location}</td>
                              {svc.resources.some(res => res.sku) && <td className="px-4 py-2.5 text-slate-300">{r.sku || '—'}</td>}
                              {svc.resources.some(res => res.status) && (
                                <td className="px-4 py-2.5 text-center">
                                  {r.status ? (
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      r.status === 'Active' || r.status === 'Running' || r.status === 'Provisioned' || r.status === 'Attached' ? 'bg-emerald-500/20 text-emerald-400' :
                                      r.status === 'Deallocated' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'
                                    }`}>{r.status}</span>
                                  ) : '—'}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2">
                      <a href={svc.portalUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                        Open in Azure Portal →
                      </a>
                      <span className="rounded-lg bg-slate-700/50 px-4 py-2 text-xs text-slate-300 flex items-center">
                        {svc.provider}/{svc.type}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tag Coverage Tables */}
        <div className="space-y-6 mt-8">
          {/* Summary bar */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Tag Coverage</h2>
              <span className="text-sm text-slate-400">{taggedResources.length} tagged · {untaggedResources.length} untagged · {tagCoveragePct}% coverage</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${tagCoveragePct}%` }} />
            </div>
          </div>

          {/* Services WITHOUT Tags */}
          <div className="rounded-xl border border-red-500/30 bg-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-red-500/20 text-red-400 text-sm font-bold">!</span>
              <div>
                <h3 className="text-base font-bold text-white">Resources Without Tags ({untaggedResources.length})</h3>
                <p className="text-sm text-slate-400">These resources have no tags — consider adding project, environment, and cost-center tags</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300 bg-slate-900/30">
                    <th className="px-4 py-2.5 text-left font-semibold">Resource Name</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Service</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Resource Group</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Location</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {untaggedResources.map((r, i) => (
                    <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-4 py-2.5 font-mono font-semibold text-blue-400">{r.name}</td>
                      <td className="px-4 py-2.5"><span className="text-slate-300">{r.service}</span></td>
                      <td className="px-4 py-2.5 text-slate-300">{r.rg}</td>
                      <td className="px-4 py-2.5 text-slate-300">{r.location}</td>
                      <td className="px-4 py-2.5 text-center"><span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-red-500/20 text-red-400">none</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Services WITH Tags */}
          <div className="rounded-xl border border-emerald-500/30 bg-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold">✓</span>
              <div>
                <h3 className="text-base font-bold text-white">Resources With Tags ({taggedResources.length})</h3>
                <p className="text-sm text-slate-400">These resources are properly tagged for cost tracking and governance</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300 bg-slate-900/30">
                    <th className="px-4 py-2.5 text-left font-semibold">Resource Name</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Service</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Resource Group</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Location</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {taggedResources.map((r, i) => (
                    <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="px-4 py-2.5 font-mono font-semibold text-blue-400">{r.name}</td>
                      <td className="px-4 py-2.5"><span className="text-slate-300">{r.service}</span></td>
                      <td className="px-4 py-2.5 text-slate-300">{r.rg}</td>
                      <td className="px-4 py-2.5 text-slate-300">{r.location}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(r.tags!).map(([k, v]) => (
                            <span key={k} className="rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              {k}={v}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 mt-8">
        <div className="mx-auto max-w-[1400px] px-6 py-5 flex items-center justify-between text-sm text-slate-400">
          <span>Data: Azure Resource Graph + Cost Management API · {TOTAL_RESOURCES} resources across {SERVICES.length} service types</span>
          <span>Subscription: e62428e7-...2c51586d9105</span>
        </div>
      </div>
    </div>
  );
}
