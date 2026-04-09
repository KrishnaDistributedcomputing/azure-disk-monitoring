'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';

// ============================================================================
// Project Cleanup — Application-level Teardown Dashboard
// ============================================================================

const SUBSCRIPTION_ID = 'e62428e7-08dd-4bc2-82e2-2c51586d9105';

// ============================================================================
// Composite Application Definitions
// ============================================================================

interface ResourceGroup {
  name: string;
  location: string;
  cost: number;
  resourceCount: number;
}

interface ApplicationResource {
  name: string;
  type: string;
  icon: string;
  resourceGroup: string;
}

interface CleanupStep {
  id: number;
  title: string;
  description: string;
  command: string;
  icon: string;
  impact: string;
  costSaving: string;
}

interface Application {
  id: string;
  name: string;
  environment: string;
  category: string;
  status: string;
  icon: string;
  color: string;
  totalCost: number;
  resourceGroups: ResourceGroup[];
  resources: ApplicationResource[];
  cleanupSteps: CleanupStep[];
  notes: string[];
}

const APPLICATIONS: Application[] = [
  {
    id: 'disk-monitoring',
    name: 'Disk Performance Monitoring POC',
    environment: 'POC',
    category: 'Monitoring',
    status: 'Active',
    icon: '📊',
    color: '#3b82f6',
    totalCost: 414.89,
    resourceGroups: [
      { name: 'rg-diskmon-poc-eastus2', location: 'East US 2', cost: 414.89, resourceCount: 42 },
    ],
    resources: [
      { name: 'vm-diskmon-dsv5-01', type: 'Virtual Machine (D4s_v5 Linux)', icon: '🖥️', resourceGroup: 'rg-diskmon-poc-eastus2' },
      { name: 'vm-diskmon-dsv5-02', type: 'Virtual Machine (D8s_v5 Linux)', icon: '🖥️', resourceGroup: 'rg-diskmon-poc-eastus2' },
      { name: 'vm-diskmon-esv5-01', type: 'Virtual Machine (E4s_v5 Linux)', icon: '🖥️', resourceGroup: 'rg-diskmon-poc-eastus2' },
      { name: 'vm-diskmon-lsv3-01', type: 'Virtual Machine (L8s_v3 Linux)', icon: '🖥️', resourceGroup: 'rg-diskmon-poc-eastus2' },
      { name: 'vm-diskmon-dsv5-03', type: 'Virtual Machine (D4s_v5 Windows)', icon: '🖥️', resourceGroup: 'rg-diskmon-poc-eastus2' },
      { name: '8 data disks + 5 OS disks', type: 'Managed Disks (Premium, Ultra, Standard)', icon: '💾', resourceGroup: 'rg-diskmon-poc-eastus2' },
      { name: 'law-diskmon-poc-eastus2', type: 'Log Analytics Workspace', icon: '📊', resourceGroup: 'rg-diskmon-poc-eastus2' },
      { name: 'grafana-diskmon-poc', type: 'Azure Managed Grafana', icon: '📈', resourceGroup: 'rg-diskmon-poc-eastus2' },
      { name: 'dcr-diskmon-perf-poc', type: 'Data Collection Rule', icon: '📡', resourceGroup: 'rg-diskmon-poc-eastus2' },
      { name: 'vnet-diskmon-poc-eastus2', type: 'Virtual Network + 5 NICs', icon: '🌐', resourceGroup: 'rg-diskmon-poc-eastus2' },
      { name: 'swa-diskmon-poc', type: 'Static Web App (Dashboard)', icon: '🌍', resourceGroup: 'rg-diskmon-poc-eastus2' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Remove Resource Locks', description: 'Delete the CanNotDelete lock on the resource group.', command: 'az lock delete --name lock-prevent-accidental-delete --resource-group rg-diskmon-poc-eastus2', icon: '🔓', impact: 'Enables deletion of all resources', costSaving: 'No direct cost impact' },
      { id: 2, title: 'Deallocate Virtual Machines', description: 'Stop and deallocate all 5 VMs to immediately stop compute billing.', command: 'for vm in vm-diskmon-dsv5-01 vm-diskmon-dsv5-02 vm-diskmon-esv5-01 vm-diskmon-lsv3-01 vm-diskmon-dsv5-03; do\n  az vm deallocate --resource-group rg-diskmon-poc-eastus2 --name $vm --no-wait\ndone', icon: '⏹️', impact: 'Stops compute billing on 5 VMs', costSaving: '~$600-800/month' },
      { id: 3, title: 'Remove DCR Associations', description: 'Detach Data Collection Rule associations from all VMs.', command: 'for vm in vm-diskmon-dsv5-01 vm-diskmon-dsv5-02 vm-diskmon-esv5-01 vm-diskmon-lsv3-01 vm-diskmon-dsv5-03; do\n  VM_ID=$(az vm show -g rg-diskmon-poc-eastus2 -n $vm --query id -o tsv)\n  az monitor data-collection rule association list --resource "$VM_ID" --query "[].name" -o tsv | while read a; do\n    az monitor data-collection rule association delete --name "$a" --resource "$VM_ID" --yes\n  done\ndone', icon: '📡', impact: 'Cleans up monitoring pipeline', costSaving: 'Prevents orphaned ingestion' },
      { id: 4, title: 'Remove Grafana Role Assignments', description: 'Delete RBAC role assignments granted to Grafana managed identity.', command: 'PRINCIPAL=$(az grafana show -g rg-diskmon-poc-eastus2 -n grafana-diskmon-poc --query "identity.principalId" -o tsv)\naz role assignment list --assignee "$PRINCIPAL" --query "[].id" -o tsv | while read id; do\n  az role assignment delete --ids "$id"\ndone', icon: '🔐', impact: 'Cleans up subscription-level RBAC', costSaving: 'Security posture cleanup' },
      { id: 5, title: 'Remove VM Extensions', description: 'Uninstall Azure Monitor Agent and other extensions.', command: 'for vm in vm-diskmon-dsv5-01 vm-diskmon-dsv5-02 vm-diskmon-esv5-01 vm-diskmon-lsv3-01 vm-diskmon-dsv5-03; do\n  az vm extension list -g rg-diskmon-poc-eastus2 --vm-name $vm --query "[].name" -o tsv | while read ext; do\n    az vm extension delete -g rg-diskmon-poc-eastus2 --vm-name $vm -n "$ext" --no-wait\n  done\ndone', icon: '🧩', impact: 'Clean agent decommission', costSaving: 'No direct cost' },
      { id: 6, title: 'Delete Resource Group', description: 'Delete the entire resource group and all remaining resources.', command: 'az group delete --name rg-diskmon-poc-eastus2 --yes', icon: '🗑️', impact: 'Removes ALL 42 resources', costSaving: '~$414.89/month savings' },
      { id: 7, title: 'Verify Deletion', description: 'Confirm the resource group no longer exists.', command: 'az group show --name rg-diskmon-poc-eastus2 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms zero residual resources', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Has a CanNotDelete resource lock — must remove first',
      'VMs should be deallocated before deletion to stop billing immediately',
      'Grafana has subscription-level role assignments that need cleanup',
      'Log Analytics data retained per workspace retention policy',
      'Static Web App (dashboard) will also be deleted',
    ],
  },
  {
    id: 'oakvilleschools',
    name: 'Oakville Schools Directory',
    environment: 'Prod',
    category: 'Web App',
    status: 'Active',
    icon: '🏫',
    color: '#0ea5e9',
    totalCost: 83.27,
    resourceGroups: [
      { name: 'rg-oakvilleschools-prod', location: 'Canada Central', cost: 83.27, resourceCount: 25 },
    ],
    resources: [
      { name: 'app-web-oakvilleschools-prod', type: 'Web App (Frontend)', icon: '🌐', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'app-api-oakvilleschools-prod', type: 'Web App (API)', icon: '🌐', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'psql-oakvilleschools-prod', type: 'PostgreSQL Flexible Server', icon: '🗄️', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'data-psql-oakvilleschools-prod', type: 'PostgreSQL Flexible Server (Data)', icon: '🗄️', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'data-redis-oakvilleschools-prod', type: 'Azure Cache for Redis', icon: '⚡', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'redis-oakvilleschools-prod', type: 'Azure Cache for Redis', icon: '⚡', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'net-fd-oakvilleschools-prod', type: 'Azure Front Door (CDN)', icon: '🌍', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'wkr-playwright-osd-prod', type: 'Container App (Playwright Worker)', icon: '📦', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'wkr-sched-osd-prod', type: 'Container App (Scheduler Worker)', icon: '📦', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'acrva73eeihwhwqk', type: 'Container Registry', icon: '📦', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'stva73eeihwhwqk', type: 'Storage Account', icon: '💾', resourceGroup: 'rg-oakvilleschools-prod' },
      { name: 'mon-ai-oakvilleschools-prod', type: 'Application Insights', icon: '📊', resourceGroup: 'rg-oakvilleschools-prod' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete Resource Group', description: 'Delete the Oakville Schools resource group and all 25 resources.', command: 'az group delete --name rg-oakvilleschools-prod --yes', icon: '🗑️', impact: 'Removes Web Apps, PostgreSQL, Redis, Front Door, Container Apps', costSaving: '~$83.27/month' },
      { id: 2, title: 'Verify Deletion', description: 'Confirm the resource group is gone.', command: 'az group show --name rg-oakvilleschools-prod 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Production environment — verify no active users before deletion',
      '2 PostgreSQL servers and 2 Redis caches — significant data tier',
      'Azure Front Door CDN configured with custom endpoint',
      'Container Apps for Playwright and scheduled workers',
    ],
  },
  {
    id: 'platform-infra',
    name: 'Platform & Infrastructure',
    environment: 'System',
    category: 'Infrastructure',
    status: 'Active',
    icon: '⚙️',
    color: '#64748b',
    totalCost: 83.71,
    resourceGroups: [
      { name: 'DefaultResourceGroup-EUS', location: 'East US', cost: 53.79, resourceCount: 8 },
      { name: 'cloud-shell-storage-eastus', location: 'East US', cost: 15.10, resourceCount: 4 },
      { name: 'McapsGovernance', location: 'West US 2', cost: 14.82, resourceCount: 2 },
      { name: 'DefaultResourceGroup-CCA', location: 'Canada Central', cost: 0.00, resourceCount: 5 },
      { name: 'Default-ActivityLogAlerts', location: 'East US', cost: 0.00, resourceCount: 2 },
      { name: 'NetworkWatcherRG', location: 'Canada Central', cost: 0.00, resourceCount: 4 },
      { name: 'quiz-demo-rg-ca', location: 'Canada Central', cost: 0.00, resourceCount: 2 },
    ],
    resources: [
      { name: 'Cloud Shell storage', type: 'Storage Account', icon: '☁️', resourceGroup: 'cloud-shell-storage-eastus' },
      { name: 'McapsGovernance', type: 'Governance resources', icon: '🛡️', resourceGroup: 'McapsGovernance' },
      { name: 'Default monitoring', type: 'Log Analytics, Activity Log Alerts', icon: '📊', resourceGroup: 'DefaultResourceGroup-*' },
      { name: 'Network Watchers', type: 'Network monitoring', icon: '🌐', resourceGroup: 'NetworkWatcherRG' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Review Before Deleting', description: 'Platform infrastructure supports other workloads. Review each RG carefully.', command: '# List resources in each group before deleting:\nfor rg in cloud-shell-storage-eastus McapsGovernance DefaultResourceGroup-EUS DefaultResourceGroup-CCA NetworkWatcherRG quiz-demo-rg-ca; do\n  echo "=== $rg ==="\n  az resource list -g "$rg" --query "[].{name:name, type:type}" -o table\ndone', icon: '🔍', impact: 'Audit before any deletion', costSaving: 'Identify safe-to-delete resources' },
      { id: 2, title: 'Delete Non-Essential Groups', description: 'Delete only the non-essential resource groups.', command: 'az group delete --name quiz-demo-rg-ca --yes --no-wait', icon: '🗑️', impact: 'Removes demo/test leftovers', costSaving: '~$0/month' },
      { id: 3, title: 'Verify Deletion', description: 'Confirm non-essential groups are gone.', command: 'az group show --name quiz-demo-rg-ca 2>&1 || echo "✓ quiz-demo deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified' },
    ],
    notes: [
      '⚠️ HIGH RISK: Deleting platform groups may break other workloads',
      'Cloud Shell storage is needed for az cli in portal',
      'DefaultResourceGroup contains shared monitoring resources',
      'NetworkWatcherRG is auto-managed by Azure — do not delete',
      'Only quiz-demo-rg-ca is safe to remove',
    ],
  },
  {
    id: 'kv-ai-projects',
    name: 'KV AI Projects (6 Deployments)',
    environment: 'Dev',
    category: 'AI/ML',
    status: 'Mixed',
    icon: '🤖',
    color: '#a855f7',
    totalCost: 44.31,
    resourceGroups: [
      { name: 'rg-kv-ai-4e8c9', location: 'Sweden Central', cost: 19.78, resourceCount: 10 },
      { name: 'rg-kv-ai-e1ba8', location: 'Sweden Central', cost: 4.95, resourceCount: 4 },
      { name: 'rg-kv-ai-51143', location: 'Sweden Central', cost: 4.93, resourceCount: 4 },
      { name: 'rg-kv-ai-b2cae', location: 'Sweden Central', cost: 4.89, resourceCount: 4 },
      { name: 'rg-kv-ai-57877', location: 'Sweden Central', cost: 4.89, resourceCount: 4 },
      { name: 'rg-kv-ai-b97a3', location: 'Sweden Central', cost: 4.87, resourceCount: 4 },
    ],
    resources: [
      { name: '6 AI Hub / Project environments', type: 'Azure AI Studio Projects', icon: '🤖', resourceGroup: 'rg-kv-ai-*' },
      { name: 'Azure OpenAI endpoints', type: 'Cognitive Services', icon: '🧠', resourceGroup: 'rg-kv-ai-4e8c9' },
      { name: 'Storage accounts & Key Vaults', type: 'Supporting Infrastructure', icon: '🔑', resourceGroup: 'rg-kv-ai-*' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete AI Resource Groups', description: 'Delete all 6 AI project resource groups.', command: 'for rg in rg-kv-ai-4e8c9 rg-kv-ai-e1ba8 rg-kv-ai-51143 rg-kv-ai-57877 rg-kv-ai-b2cae rg-kv-ai-b97a3; do\n  echo "Deleting $rg..."\n  az group delete --name "$rg" --yes --no-wait\ndone', icon: '🗑️', impact: 'Removes all 6 AI projects (30 resources)', costSaving: '~$44.31/month' },
      { id: 2, title: 'Purge Soft-Deleted Resources', description: 'Purge soft-deleted Cognitive Services and Key Vault resources.', command: 'az cognitiveservices account list-deleted --query "[].id" -o tsv | while read id; do\n  az cognitiveservices account purge --id "$id"\ndone\naz keyvault list-deleted --query "[].name" -o tsv | while read kv; do\n  az keyvault purge --name "$kv"\ndone', icon: '🧹', impact: 'Prevents ghost resources and naming conflicts', costSaving: 'Prevents residual charges' },
      { id: 3, title: 'Verify Deletion', description: 'Confirm all resource groups are removed.', command: 'for rg in rg-kv-ai-4e8c9 rg-kv-ai-e1ba8 rg-kv-ai-51143 rg-kv-ai-57877 rg-kv-ai-b2cae rg-kv-ai-b97a3; do\n  az group show --name "$rg" 2>&1 || echo "✓ $rg deleted"\ndone', icon: '✅', impact: 'Confirms full cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Cognitive Services use soft-delete — must purge after deletion',
      'Key Vaults also soft-delete — purge to free names and stop charges',
      'Primary project (4e8c9) contains the most resources',
      'All projects are in Sweden Central region',
    ],
  },
  {
    id: 'restdir',
    name: 'Restaurant Directory',
    environment: 'Dev',
    category: 'Web App',
    status: 'Active',
    icon: '🍽️',
    color: '#f97316',
    totalCost: 34.43,
    resourceGroups: [
      { name: 'restdir-rg', location: 'Canada Central', cost: 34.43, resourceCount: 7 },
    ],
    resources: [
      { name: 'restdir-web-3yj6wtfbtsi32', type: 'Web App', icon: '🌐', resourceGroup: 'restdir-rg' },
      { name: 'restdir-db-3yj6wtfbtsi32', type: 'PostgreSQL Flexible Server', icon: '🗄️', resourceGroup: 'restdir-rg' },
      { name: 'restdiracr3yj6wtfbtsi32', type: 'Container Registry', icon: '📦', resourceGroup: 'restdir-rg' },
      { name: 'restdir-openai', type: 'Azure OpenAI (Cognitive Services)', icon: '🧠', resourceGroup: 'restdir-rg' },
      { name: 'restdir-pipeline + restdir-enrich', type: 'Container Instances (2)', icon: '📦', resourceGroup: 'restdir-rg' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete Resource Group', description: 'Delete the restaurant directory resource group.', command: 'az group delete --name restdir-rg --yes', icon: '🗑️', impact: 'Removes Web App, PostgreSQL, ACR, OpenAI, Container Instances', costSaving: '~$34.43/month' },
      { id: 2, title: 'Purge Soft-Deleted Resources', description: 'Purge soft-deleted Cognitive Services.', command: 'az cognitiveservices account list-deleted --query "[].id" -o tsv | while read id; do\n  az cognitiveservices account purge --id "$id"\ndone', icon: '🧹', impact: 'Prevents ghost resources', costSaving: 'Prevents residual charges' },
      { id: 3, title: 'Verify Deletion', description: 'Confirm the resource group is gone.', command: 'az group show --name restdir-rg 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Now uses PostgreSQL instead of Cosmos DB',
      'Includes Azure OpenAI Cognitive Services account — soft-delete purge needed',
      'Container Instances for data pipeline and enrichment',
    ],
  },
  {
    id: 'azvm-compute',
    name: 'Azure VM Compute App',
    environment: 'Dev',
    category: 'Web App',
    status: 'Active',
    icon: '🖥️',
    color: '#22c55e',
    totalCost: 33.38,
    resourceGroups: [
      { name: 'rg-azvm-compute', location: 'Canada Central', cost: 33.38, resourceCount: 9 },
    ],
    resources: [
      { name: 'azvm-sku-lookup-swa', type: 'Static Web App', icon: '🌍', resourceGroup: 'rg-azvm-compute' },
      { name: 'App Service + Plan', type: 'Backend API', icon: '🌐', resourceGroup: 'rg-azvm-compute' },
      { name: 'Cosmos DB', type: 'Database', icon: '🗄️', resourceGroup: 'rg-azvm-compute' },
      { name: 'Application Insights', type: 'Monitoring', icon: '📊', resourceGroup: 'rg-azvm-compute' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete Resource Group', description: 'Delete the Azure VM compute resource group.', command: 'az group delete --name rg-azvm-compute --yes', icon: '🗑️', impact: 'Removes SWA, App Service, Cosmos DB', costSaving: '~$33.38/month' },
      { id: 2, title: 'Verify Deletion', description: 'Confirm the resource group is gone.', command: 'az group show --name rg-azvm-compute 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Single resource group — straightforward deletion',
      'Cosmos DB may have soft-delete — check settings',
    ],
  },
  {
    id: 'appspaces-rag',
    name: 'App Spaces RAG Application',
    environment: 'Dev',
    category: 'AI/ML',
    status: 'Active',
    icon: '🔗',
    color: '#06b6d4',
    totalCost: 30.81,
    resourceGroups: [
      { name: 'appspacesragapp9b9f8efe', location: 'West US 2', cost: 8.96, resourceCount: 12 },
      { name: 'ME_container-app-environment-sh4tpwkxz5f5m_appspacesragapp9b9f8efe_westus2', location: 'West US 2', cost: 21.85, resourceCount: 2 },
    ],
    resources: [
      { name: 'Container App', type: 'Container Apps', icon: '📦', resourceGroup: 'appspacesragapp9b9f8efe' },
      { name: 'Container App Environment', type: 'Managed Environment', icon: '🔧', resourceGroup: 'appspacesragapp9b9f8efe' },
      { name: 'Static Web App', type: 'Frontend', icon: '🌍', resourceGroup: 'appspacesragapp9b9f8efe' },
      { name: 'AI Services', type: 'Cognitive Services', icon: '🤖', resourceGroup: 'appspacesragapp9b9f8efe' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete Primary Resource Group', description: 'Delete the main App Spaces resource group (managed environment RG auto-deletes).', command: 'az group delete --name appspacesragapp9b9f8efe --yes', icon: '🗑️', impact: 'Removes Container App, SWA, AI Services', costSaving: '~$30.81/month' },
      { id: 2, title: 'Purge Soft-Deleted AI Resources', description: 'Purge any soft-deleted Cognitive Services.', command: 'az cognitiveservices account list-deleted --query "[].id" -o tsv | while read id; do\n  az cognitiveservices account purge --id "$id"\ndone', icon: '🧹', impact: 'Prevents ghost resources', costSaving: 'Prevents residual charges' },
      { id: 3, title: 'Verify Deletion', description: 'Confirm both resource groups are gone.', command: 'az group show --name appspacesragapp9b9f8efe 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'ME_ managed environment resource group will auto-delete with parent',
      'Has Cognitive Services — soft-delete purge may be needed',
      'Container App Environment is the biggest cost driver ($21.85)',
    ],
  },
  {
    id: 'irishspicebag',
    name: 'Irish Spice Bag',
    environment: 'Prod',
    category: 'Web App',
    status: 'Active',
    icon: '🍟',
    color: '#16a34a',
    totalCost: 27.29,
    resourceGroups: [
      { name: 'rg-irishspicebag-prod', location: 'West Europe', cost: 27.29, resourceCount: 9 },
    ],
    resources: [
      { name: 'isb-prod-app', type: 'Web App', icon: '🌐', resourceGroup: 'rg-irishspicebag-prod' },
      { name: 'isb-prod-redis', type: 'Azure Cache for Redis', icon: '⚡', resourceGroup: 'rg-irishspicebag-prod' },
      { name: 'isbprodstorage', type: 'Storage Account', icon: '💾', resourceGroup: 'rg-irishspicebag-prod' },
      { name: 'isb-prod-kv', type: 'Key Vault', icon: '🔑', resourceGroup: 'rg-irishspicebag-prod' },
      { name: 'isb-prod-insights', type: 'Application Insights', icon: '📊', resourceGroup: 'rg-irishspicebag-prod' },
      { name: 'isb-prod-logs', type: 'Log Analytics Workspace', icon: '📊', resourceGroup: 'rg-irishspicebag-prod' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete Resource Group', description: 'Delete the Irish Spice Bag resource group.', command: 'az group delete --name rg-irishspicebag-prod --yes', icon: '🗑️', impact: 'Removes Web App, Redis, Storage, Key Vault', costSaving: '~$27.29/month' },
      { id: 2, title: 'Purge Soft-Deleted Key Vault', description: 'Purge any soft-deleted Key Vault.', command: 'az keyvault list-deleted --query "[].name" -o tsv | while read kv; do\n  az keyvault purge --name "$kv"\ndone', icon: '🧹', impact: 'Frees Key Vault name', costSaving: 'No direct cost' },
      { id: 3, title: 'Verify Deletion', description: 'Confirm the resource group is gone.', command: 'az group show --name rg-irishspicebag-prod 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Production environment — verify no active users before deletion',
      'Key Vault uses soft-delete — purge to free names',
      'Redis cache is a significant cost driver',
      'Hosted in West Europe region',
    ],
  },
  {
    id: 'cosmos-sensor',
    name: 'Global Sensor Storm',
    environment: 'Demo',
    category: 'Database',
    status: 'Empty',
    icon: '🌍',
    color: '#10b981',
    totalCost: 25.57,
    resourceGroups: [
      { name: 'rg-globalsensorstorm-global', location: 'Canada Central', cost: 25.57, resourceCount: 0 },
    ],
    resources: [],
    cleanupSteps: [
      { id: 1, title: 'Delete Resource Group', description: 'Delete the empty Global Sensor Storm resource group.', command: 'az group delete --name rg-globalsensorstorm-global --yes', icon: '🗑️', impact: 'Removes empty resource group', costSaving: '~$25.57/month (residual charges from deleted Cosmos DB)' },
      { id: 2, title: 'Verify Deletion', description: 'Confirm the resource group is gone.', command: 'az group show --name rg-globalsensorstorm-global 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Resource group is now EMPTY — Cosmos DB has been deleted',
      'Still accumulating charges from deleted resources earlier this month',
      'Delete the empty RG to prevent further residual billing',
    ],
  },
  {
    id: 'ai-accounts',
    name: 'Azure AI Service Accounts',
    environment: 'Dev',
    category: 'AI/ML',
    status: 'Mixed',
    icon: '🧠',
    color: '#8b5cf6',
    totalCost: 10.12,
    resourceGroups: [
      { name: 'rg-boldorca260227', location: 'West US 3', cost: 5.06, resourceCount: 2 },
      { name: 'rg-fastfox260227', location: 'Sweden Central', cost: 5.06, resourceCount: 2 },
      { name: 'rg-coolwolf260227', location: 'Canada Central', cost: 0.00, resourceCount: 1 },
    ],
    resources: [
      { name: 'boldorca AI account', type: 'Cognitive Services (West US 3)', icon: '🧠', resourceGroup: 'rg-boldorca260227' },
      { name: 'fastfox AI account', type: 'Cognitive Services (Sweden Central)', icon: '🧠', resourceGroup: 'rg-fastfox260227' },
      { name: 'coolwolf AI account', type: 'Cognitive Services (Canada Central)', icon: '🧠', resourceGroup: 'rg-coolwolf260227' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete Resource Groups', description: 'Delete all 3 AI account resource groups.', command: 'for rg in rg-boldorca260227 rg-fastfox260227 rg-coolwolf260227; do\n  az group delete --name "$rg" --yes --no-wait\ndone', icon: '🗑️', impact: 'Removes 3 AI service accounts', costSaving: '~$10.12/month' },
      { id: 2, title: 'Purge Soft-Deleted Resources', description: 'Purge soft-deleted Cognitive Services to free names and prevent charges.', command: 'az cognitiveservices account list-deleted --query "[].id" -o tsv | while read id; do\n  az cognitiveservices account purge --id "$id"\ndone', icon: '🧹', impact: 'Prevents ghost resources', costSaving: 'Prevents residual charges' },
      { id: 3, title: 'Verify Deletion', description: 'Confirm all resource groups are deleted.', command: 'for rg in rg-boldorca260227 rg-fastfox260227 rg-coolwolf260227; do\n  az group show --name "$rg" 2>&1 || echo "✓ $rg deleted"\ndone', icon: '✅', impact: 'Confirms full cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Cognitive Services use soft-delete — must purge after deletion',
      'coolwolf account costs $0 — may already be deallocated',
      'Spread across 3 regions (West US 3, Sweden Central, Canada Central)',
    ],
  },
  {
    id: 'arp-dev',
    name: 'ARP Dev (Availability & Reachability Platform)',
    environment: 'Dev',
    category: 'Web App',
    status: 'Active',
    icon: '📡',
    color: '#f59e0b',
    totalCost: 10.40,
    resourceGroups: [
      { name: 'rg-arp-dev-core', location: 'East US 2', cost: 10.40, resourceCount: 15 },
    ],
    resources: [
      { name: 'arp-dev-swa', type: 'Static Web App', icon: '🌍', resourceGroup: 'rg-arp-dev-core' },
      { name: 'App Services & Plans', type: 'Backend APIs', icon: '🌐', resourceGroup: 'rg-arp-dev-core' },
      { name: 'Storage, Key Vault, App Insights', type: 'Supporting Infrastructure', icon: '🔑', resourceGroup: 'rg-arp-dev-core' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete Resource Group', description: 'Delete the ARP dev resource group.', command: 'az group delete --name rg-arp-dev-core --yes', icon: '🗑️', impact: 'Removes SWA, App Services, Storage, Key Vault', costSaving: '~$10.40/month' },
      { id: 2, title: 'Purge Soft-Deleted Key Vault', description: 'Purge any soft-deleted Key Vault.', command: 'az keyvault list-deleted --query "[].name" -o tsv | while read kv; do\n  az keyvault purge --name "$kv"\ndone', icon: '🧹', impact: 'Frees Key Vault name', costSaving: 'No direct cost' },
      { id: 3, title: 'Verify Deletion', description: 'Confirm the resource group is gone.', command: 'az group show --name rg-arp-dev-core 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Has 15 resources despite moderate cost (many at free tier)',
      'Key Vault uses soft-delete — purge to free names',
    ],
  },
  {
    id: 'imdsoft-crawler',
    name: 'IMDSoft Explorer',
    environment: 'Dev',
    category: 'Web App',
    status: 'Active',
    icon: '🔍',
    color: '#ec4899',
    totalCost: 3.79,
    resourceGroups: [
      { name: 'rg-imdsoft-crawler', location: 'East US', cost: 3.79, resourceCount: 2 },
    ],
    resources: [
      { name: 'imdsoft-explorer', type: 'Web App', icon: '🌐', resourceGroup: 'rg-imdsoft-crawler' },
      { name: 'plan-imdsoft', type: 'App Service Plan', icon: '📋', resourceGroup: 'rg-imdsoft-crawler' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete Resource Group', description: 'Delete the IMDSoft crawler resource group.', command: 'az group delete --name rg-imdsoft-crawler --yes', icon: '🗑️', impact: 'Removes Web App and App Service Plan', costSaving: '~$3.79/month' },
      { id: 2, title: 'Verify Deletion', description: 'Confirm the resource group is gone.', command: 'az group show --name rg-imdsoft-crawler 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Simple 2-resource application (Web App + Plan)',
      'Low cost — $3.79/month',
    ],
  },
  {
    id: 'aks-store-demo',
    name: 'AKS Store Demo (EHR System)',
    environment: 'Demo',
    category: 'Containers',
    status: 'Active',
    icon: '☸️',
    color: '#326ce5',
    totalCost: 0.11,
    resourceGroups: [
      { name: 'rg-aks-store-demo', location: 'Canada Central', cost: 0.08, resourceCount: 7 },
      { name: 'MC_rg-aks-store-demo_aks-store-demo_canadacentral', location: 'Canada Central', cost: 0.03, resourceCount: 9 },
    ],
    resources: [
      { name: 'aks-store-demo', type: 'AKS Cluster', icon: '☸️', resourceGroup: 'rg-aks-store-demo' },
      { name: 'ehrdb-canadacentral', type: 'PostgreSQL Flexible Server', icon: '🗄️', resourceGroup: 'rg-aks-store-demo' },
      { name: 'ehracrcanada', type: 'Container Registry', icon: '📦', resourceGroup: 'rg-aks-store-demo' },
      { name: 'ehr-api-canadacentral', type: 'Web App (API)', icon: '🌐', resourceGroup: 'rg-aks-store-demo' },
      { name: 'ehr-portal-canadacentral', type: 'Web App (Portal)', icon: '🌐', resourceGroup: 'rg-aks-store-demo' },
      { name: 'ehr-costing-canadacentral', type: 'Web App (Costing)', icon: '🌐', resourceGroup: 'rg-aks-store-demo' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete AKS Cluster', description: 'Delete the AKS cluster — this automatically removes the MC_ managed resource group.', command: 'az aks delete -g rg-aks-store-demo -n aks-store-demo --yes --no-wait', icon: '☸️', impact: 'Deletes AKS cluster + managed RG', costSaving: 'Removes node pool costs' },
      { id: 2, title: 'Delete Parent Resource Group', description: 'Delete the parent resource group after AKS is removed.', command: 'az group delete --name rg-aks-store-demo --yes', icon: '🗑️', impact: 'Removes PostgreSQL, ACR, Web Apps', costSaving: '~$0.11/month total' },
      { id: 3, title: 'Verify Deletion', description: 'Confirm both resource groups are gone.', command: 'az group show --name rg-aks-store-demo 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Newly created — currently very low cost ($0.11/month)',
      'AKS cluster with EHR (Electronic Health Records) application stack',
      'Delete AKS first, then parent resource group',
      'MC_ managed resource group will auto-delete with AKS cluster',
    ],
  },
  {
    id: 'ai-patterns-landing',
    name: 'AI Patterns Portal',
    environment: 'Dev',
    category: 'Web App',
    status: 'Active',
    icon: '🤖',
    color: '#7c3aed',
    totalCost: 0.00,
    resourceGroups: [
      { name: 'rg-ai-patterns-landing', location: 'Canada Central', cost: 0.00, resourceCount: 1 },
    ],
    resources: [
      { name: 'ai-patterns-portal', type: 'Static Web App', icon: '🌍', resourceGroup: 'rg-ai-patterns-landing' },
    ],
    cleanupSteps: [
      { id: 1, title: 'Delete Resource Group', description: 'Delete the AI Patterns landing page resource group.', command: 'az group delete --name rg-ai-patterns-landing --yes', icon: '🗑️', impact: 'Removes Static Web App', costSaving: '~$0/month (free tier SWA)' },
      { id: 2, title: 'Verify Deletion', description: 'Confirm the resource group is gone.', command: 'az group show --name rg-ai-patterns-landing 2>&1 || echo "✓ Deleted"', icon: '✅', impact: 'Confirms cleanup', costSaving: 'Verified $0 ongoing' },
    ],
    notes: [
      'Single Static Web App — likely free tier',
      'Zero cost — lowest priority for cleanup',
    ],
  },
];

export default function TeardownPage() {
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<number | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deletingRgs, setDeletingRgs] = useState<Set<string>>(new Set());
  const [deletedRgs, setDeletedRgs] = useState<Set<string>>(new Set());
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const [liveRgs, setLiveRgs] = useState<Set<string> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const selectedApp = useMemo(() => APPLICATIONS.find((a) => a.id === selectedAppId) || null, [selectedAppId]);

  const totalSubscriptionCost = APPLICATIONS.reduce((sum, a) => sum + a.totalCost, 0);
  const totalResourceGroups = APPLICATIONS.reduce((sum, a) => sum + a.resourceGroups.length, 0);

  const refreshResourceGroups = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch('/api/list-rgs');
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setRefreshError(`API unavailable — deploy the Azure Functions backend or use Azure CLI: az group list --output table`);
        return;
      }
      if (res.ok && data.resourceGroups) {
        const names = new Set<string>(data.resourceGroups.map((rg: { name: string }) => rg.name));
        setLiveRgs(names);
        setLastRefreshed(new Date());
        // Auto-mark RGs that no longer exist as deleted
        APPLICATIONS.forEach((app) => {
          app.resourceGroups.forEach((rg) => {
            if (!names.has(rg.name)) {
              setDeletedRgs((prev) => new Set(prev).add(rg.name));
            }
          });
        });
      } else {
        setRefreshError(data.error || `Failed (${res.status})`);
      }
    } catch (err: unknown) {
      setRefreshError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleAppChange = (appId: string) => {
    setSelectedAppId(appId);
    setExpandedStep(null);
    setCopiedCmd(null);
    setCheckedSteps(new Set());
    setShowConfirm(false);
    setConfirmText('');
    setDeletingRgs(new Set());
    setDeletedRgs(new Set());
    setDeleteErrors({});
  };

  const toggleStep = (id: number) => {
    setExpandedStep(expandedStep === id ? null : id);
  };

  const toggleCheck = (id: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyCommand = (cmd: string, stepId: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(stepId);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const deleteResourceGroup = async (rgName: string) => {
    setDeletingRgs((prev) => new Set(prev).add(rgName));
    setDeleteErrors((prev) => { const n = { ...prev }; delete n[rgName]; return n; });
    try {
      const res = await fetch('/api/delete-rg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceGroupName: rgName, confirm: true }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setDeleteErrors((prev) => ({ ...prev, [rgName]: 'API unavailable — use Azure CLI: az group delete --name ' + rgName + ' --yes --no-wait' }));
        return;
      }
      if (res.ok && (data.status === 'deleting' || data.status === 'already_deleted')) {
        setDeletedRgs((prev) => new Set(prev).add(rgName));
      } else {
        setDeleteErrors((prev) => ({ ...prev, [rgName]: data.error || `Failed (${res.status})` }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      setDeleteErrors((prev) => ({ ...prev, [rgName]: message }));
    } finally {
      setDeletingRgs((prev) => { const n = new Set(prev); n.delete(rgName); return n; });
    }
  };

  const deleteAllResourceGroups = async (rgs: ResourceGroup[]) => {
    for (const rg of rgs) {
      if (!deletedRgs.has(rg.name)) {
        await deleteResourceGroup(rg.name);
      }
    }
  };

  const progress = selectedApp ? (checkedSteps.size / selectedApp.cleanupSteps.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="mx-auto max-w-[1400px] px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors">← Home</Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">🧹</span> Project Cleanup
                </h1>
                <p className="text-sm text-slate-400 mt-1">Select an application to perform a safe, ordered teardown of all its Azure resources</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshResourceGroups}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-600/20 px-4 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" /></svg>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              {lastRefreshed && (
                <span className="text-[10px] text-slate-500">Updated {lastRefreshed.toLocaleTimeString()}</span>
              )}
              {refreshError && (
                <span className="text-[10px] text-red-400">{refreshError}</span>
              )}
              <span className="rounded-full bg-red-600/20 border border-red-500/30 px-3 py-1 text-xs font-semibold text-red-400">Destructive</span>
              <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300">{APPLICATIONS.length} apps &bull; {totalResourceGroups} RGs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-8">
        {/* Application Selector */}
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-600/10 via-slate-800/50 to-blue-600/10 p-6">
          <h2 className="text-lg font-bold text-white mb-1">Select Application to Clean Up</h2>
          <p className="text-sm text-slate-400 mb-4">Choose a composite application from the subscription to view its resources and execute a targeted teardown.</p>

          <div className="relative">
            <select
              value={selectedAppId}
              onChange={(e) => handleAppChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-600 bg-slate-800 px-5 py-4 text-base text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="">-- Select an application --</option>
              {APPLICATIONS.sort((a, b) => b.totalCost - a.totalCost).map((app) => (
                <option key={app.id} value={app.id}>
                  {app.icon} {app.name} — ${app.totalCost.toFixed(2)}/mo ({app.resourceGroups.length} RG{app.resourceGroups.length > 1 ? 's' : ''}) [{app.environment}]
                </option>
              ))}
            </select>
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
          </div>

          {/* Quick selection cards */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {APPLICATIONS.sort((a, b) => b.totalCost - a.totalCost).map((app) => {
              const allGone = liveRgs !== null && app.resourceGroups.every((rg) => !liveRgs.has(rg.name));
              return (
              <button
                key={app.id}
                onClick={() => handleAppChange(app.id)}
                className={`rounded-xl border p-3 text-left transition-all hover:scale-[1.02] ${allGone ? 'opacity-50' : ''} ${selectedAppId === app.id ? 'border-blue-500 bg-blue-600/20 ring-1 ring-blue-500' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{app.icon}</span>
                  {allGone ? (
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold bg-green-500/20 text-green-400">Deleted</span>
                  ) : (
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${app.status === 'Active' ? 'bg-green-500/20 text-green-400' : app.status === 'Idle' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-600/50 text-slate-400'}`}>{app.status}</span>
                  )}
                </div>
                <div className="text-xs font-semibold text-white truncate">{app.name.length > 25 ? app.name.substring(0, 25) + '...' : app.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold" style={{ color: allGone ? '#6b7280' : app.color }}>{allGone ? 'Deleted' : `$${app.totalCost.toFixed(2)}`}</span>
                  <span className="text-[10px] text-slate-500">{app.resourceGroups.length} RG{app.resourceGroups.length > 1 ? 's' : ''}</span>
                </div>
              </button>
              );
            })}
          </div>
        </div>

        {/* Subscription Summary (when no app selected) */}
        {!selectedApp && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
            <span className="text-5xl">☝️</span>
            <h3 className="text-xl font-bold text-white mt-4">Select an Application Above</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
              Choose one of the {APPLICATIONS.length} composite applications to view its resource inventory, cost breakdown, and execute an ordered cleanup.
            </p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                <div className="text-2xl font-bold text-white">{APPLICATIONS.length}</div>
                <div className="text-xs text-slate-400">Applications</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                <div className="text-2xl font-bold text-white">{totalResourceGroups}</div>
                <div className="text-xs text-slate-400">Resource Groups</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                <div className="text-2xl font-bold text-red-400">${totalSubscriptionCost.toFixed(2)}</div>
                <div className="text-xs text-slate-400">Total Monthly Cost</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                <div className="text-2xl font-bold text-green-400">{APPLICATIONS.reduce((s, a) => s + a.resources.length, 0)}</div>
                <div className="text-xs text-slate-400">Total Resources</div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Application Details */}
        {selectedApp && (
          <>
            {/* App Overview Banner */}
            <div className="rounded-2xl border bg-gradient-to-r p-6" style={{ borderColor: selectedApp.color + '40', background: `linear-gradient(135deg, ${selectedApp.color}10, transparent, ${selectedApp.color}05)` }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{selectedApp.icon}</span>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedApp.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: selectedApp.color + '20', color: selectedApp.color }}>{selectedApp.category}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedApp.status === 'Active' ? 'bg-green-500/20 text-green-400' : selectedApp.status === 'Idle' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-600/50 text-slate-400'}`}>{selectedApp.status}</span>
                        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">{selectedApp.environment}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">${selectedApp.totalCost.toFixed(2)}/mo</div>
                  <div className="text-xs text-slate-400 mt-1">{selectedApp.resourceGroups.length} resource group{selectedApp.resourceGroups.length > 1 ? 's' : ''} &bull; {selectedApp.resources.length} resources</div>
                </div>
              </div>

              {/* Resource Group Cost Breakdown */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {selectedApp.resourceGroups.map((rg) => {
                  const rgExists = liveRgs === null ? null : liveRgs.has(rg.name);
                  return (
                    <div key={rg.name} className={`rounded-lg border p-3 ${rgExists === false ? 'border-green-500/30 bg-green-900/10 opacity-60' : 'border-slate-700/50 bg-slate-800/60'}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-mono text-slate-400 truncate" title={rg.name}>{rg.name}</div>
                        {rgExists !== null && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rgExists ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                            {rgExists ? 'ACTIVE' : 'GONE'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-base font-bold text-white">${rg.cost.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-500">{rg.resourceCount} resources</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{rg.location}</div>
                      {selectedApp.totalCost > 0 && (
                        <div className="mt-2 h-1 rounded-full bg-slate-700">
                          <div className="h-1 rounded-full" style={{ width: `${(rg.cost / selectedApp.totalCost) * 100}%`, backgroundColor: selectedApp.color }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">Cleanup Progress — {selectedApp.name}</span>
                <span className="text-sm text-slate-400">{checkedSteps.size}/{selectedApp.cleanupSteps.length} steps</span>
              </div>
              <div className="h-3 rounded-full bg-slate-700">
                <div className="h-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              {checkedSteps.size === selectedApp.cleanupSteps.length && (
                <p className="mt-2 text-sm text-green-400 font-semibold">All cleanup steps completed for {selectedApp.name}.</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Cleanup Steps */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold text-white">Cleanup Steps</h2>
                <p className="text-sm text-slate-400 -mt-2">Execute steps in order. Check each as completed.</p>

                {selectedApp.cleanupSteps.map((step) => (
                  <div key={step.id} className={`rounded-xl border transition-all ${checkedSteps.has(step.id) ? 'border-green-500/30 bg-green-900/10' : 'border-slate-700 bg-slate-800'}`}>
                    <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => toggleStep(step.id)}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCheck(step.id); }}
                        className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${checkedSteps.has(step.id) ? 'border-green-500 bg-green-500 text-white' : 'border-slate-600 hover:border-slate-500'}`}
                        aria-label={`Mark step ${step.id} as ${checkedSteps.has(step.id) ? 'incomplete' : 'complete'}`}
                      >
                        {checkedSteps.has(step.id) && (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        )}
                      </button>
                      <span className="text-2xl flex-shrink-0">{step.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500">Step {step.id}</span>
                          <h3 className={`text-base font-semibold ${checkedSteps.has(step.id) ? 'text-green-400 line-through' : 'text-white'}`}>{step.title}</h3>
                        </div>
                        <p className="text-sm text-slate-400 mt-0.5 truncate">{step.description}</p>
                      </div>
                      <svg className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${expandedStep === step.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </div>

                    {expandedStep === step.id && (
                      <div className="border-t border-slate-700/50 p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-lg bg-slate-900/50 p-3">
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Impact</div>
                            <div className="text-sm text-slate-200 mt-1">{step.impact}</div>
                          </div>
                          <div className="rounded-lg bg-slate-900/50 p-3">
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Cost Saving</div>
                            <div className="text-sm text-green-400 mt-1">{step.costSaving}</div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">Azure CLI Command</span>
                            <button
                              onClick={() => copyCommand(step.command, step.id)}
                              className="rounded-lg bg-slate-700 px-3 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-600 transition-colors"
                            >
                              {copiedCmd === step.id ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                          <pre className="rounded-lg bg-slate-950 border border-slate-700 p-4 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">{step.command}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Copy All Steps */}
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="text-xl">📜</span> Full Cleanup Script
                    </h3>
                    <button
                      onClick={() => {
                        const allCmds = selectedApp.cleanupSteps.map((s) => `# Step ${s.id}: ${s.title}\n${s.command}`).join('\n\n');
                        copyCommand(allCmds, -1);
                      }}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                    >
                      {copiedCmd === -1 ? '✓ Copied' : 'Copy All Commands'}
                    </button>
                  </div>
                  <pre className="rounded-lg bg-slate-950 border border-slate-700 p-4 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {selectedApp.cleanupSteps.map((s) => `# Step ${s.id}: ${s.title}\n${s.command}`).join('\n\n')}
                  </pre>
                </div>
              </div>

              {/* Right: Resource Inventory & Notes */}
              <div className="space-y-6">
                {/* Subscription Info */}
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="text-base font-bold text-white mb-3">Application Info</h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-slate-500 text-xs">Subscription</dt>
                      <dd className="text-slate-200 font-mono text-xs mt-0.5">{SUBSCRIPTION_ID}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-xs">Resource Groups</dt>
                      <dd className="text-slate-200 mt-0.5">{selectedApp.resourceGroups.length} groups across {[...new Set(selectedApp.resourceGroups.map((r) => r.location))].length} region(s)</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-xs">Category</dt>
                      <dd className="mt-0.5"><span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: selectedApp.color + '20', color: selectedApp.color }}>{selectedApp.category}</span></dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-xs">Monthly Cost</dt>
                      <dd className="text-red-400 font-bold mt-0.5">${selectedApp.totalCost.toFixed(2)}</dd>
                    </div>
                  </dl>
                </div>

                {/* Resources */}
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="text-base font-bold text-white mb-3">Resources ({selectedApp.resources.length})</h3>
                  <div className="space-y-2">
                    {selectedApp.resources.map((res, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-900/50 p-3">
                        <span className="text-lg flex-shrink-0">{res.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-200 truncate">{res.name}</div>
                          <div className="text-[10px] text-slate-500">{res.type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safety Notes */}
                <div className="rounded-xl border border-orange-500/30 bg-orange-600/10 p-5">
                  <h3 className="text-base font-bold text-orange-400 flex items-center gap-2">
                    <span>⚠️</span> Safety Notes
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-300">
                    {selectedApp.notes.map((note, i) => (
                      <li key={i} className="flex gap-2"><span className="text-orange-400 flex-shrink-0">•</span>{note}</li>
                    ))}
                  </ul>
                </div>

                {/* Danger Zone — Delete Project */}
                <div className="rounded-xl border-2 border-red-500/40 bg-red-900/10 p-5">
                  <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                    <span>🚨</span> Delete Project
                  </h3>
                  <p className="text-sm text-slate-400 mt-2">
                    Permanently delete <strong className="text-white">{selectedApp.name}</strong> and all {selectedApp.resourceGroups.length} resource group{selectedApp.resourceGroups.length > 1 ? 's' : ''}. This cannot be undone.
                  </p>

                  {!showConfirm ? (
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="mt-4 w-full rounded-xl border-2 border-red-500/50 bg-red-600 px-4 py-4 text-base font-bold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      Delete {selectedApp.name}
                    </button>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {/* Confirmation gate */}
                      <div className="rounded-lg bg-red-950/50 border border-red-500/30 p-4">
                        <p className="text-sm text-red-300 font-semibold mb-3">
                          Type <code className="bg-red-900/50 px-2 py-0.5 rounded text-red-400 font-mono">delete {selectedApp.id}</code> to confirm:
                        </p>
                        <input
                          type="text"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder={`delete ${selectedApp.id}`}
                          className="w-full rounded-lg border border-red-500/30 bg-slate-900 px-4 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
                          autoFocus
                        />
                      </div>

                      {/* Per-resource-group delete buttons */}
                      {confirmText === `delete ${selectedApp.id}` && (
                        <div className="space-y-3 animate-in fade-in">
                          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Delete each resource group:</p>
                          {selectedApp.resourceGroups.map((rg) => (
                            <div key={rg.name} className={`rounded-lg border p-3 transition-all ${deletedRgs.has(rg.name) ? 'border-green-500/30 bg-green-900/10' : deleteErrors[rg.name] ? 'border-red-500/30 bg-red-900/10' : 'border-slate-700 bg-slate-800/50'}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-mono text-slate-300 truncate">{rg.name}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-500">{rg.location}</span>
                                    <span className="text-[10px] text-slate-600">•</span>
                                    <span className="text-[10px] text-slate-500">{rg.resourceCount} resources</span>
                                    <span className="text-[10px] text-slate-600">•</span>
                                    <span className="text-[10px] text-red-400">${rg.cost.toFixed(2)}/mo</span>
                                  </div>
                                  {deleteErrors[rg.name] && (
                                    <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                                      <span>⚠</span> {deleteErrors[rg.name]}
                                    </div>
                                  )}
                                </div>
                                {deletedRgs.has(rg.name) ? (
                                  <span className="flex items-center gap-1 rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-semibold text-green-400">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                    Deleted
                                  </span>
                                ) : deletingRgs.has(rg.name) ? (
                                  <span className="flex items-center gap-1.5 rounded-lg bg-yellow-500/20 px-3 py-1.5 text-xs font-semibold text-yellow-400">
                                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Deleting...
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => deleteResourceGroup(rg.name)}
                                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 flex-shrink-0"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Delete All button */}
                          <button
                            onClick={() => deleteAllResourceGroups(selectedApp.resourceGroups)}
                            disabled={deletingRgs.size > 0 || deletedRgs.size === selectedApp.resourceGroups.length}
                            className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingRgs.size > 0 ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                Deleting...
                              </>
                            ) : deletedRgs.size === selectedApp.resourceGroups.length ? (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                All Deleted
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                Delete All {selectedApp.resourceGroups.length} Resource Groups
                              </>
                            )}
                          </button>

                          {/* CLI alternative */}
                          <div className="rounded-lg bg-slate-950 border border-slate-700 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Or run via CLI</span>
                              <button
                                onClick={() => {
                                  const cmd = selectedApp.resourceGroups.map((rg) => `az group delete --name ${rg.name} --yes --no-wait`).join('\n');
                                  copyCommand(cmd, -2);
                                }}
                                className="rounded bg-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:text-white transition-colors"
                              >
                                {copiedCmd === -2 ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>
                            <pre className="text-[11px] text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                              {selectedApp.resourceGroups.map((rg) => `az group delete --name ${rg.name} --yes --no-wait`).join('\n')}
                            </pre>
                          </div>

                          {/* Progress */}
                          {deletedRgs.size > 0 && (
                            <div className="rounded-lg bg-slate-800 border border-slate-700 p-3">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-slate-400">Deletion progress</span>
                                <span className="text-slate-300 font-semibold">{deletedRgs.size}/{selectedApp.resourceGroups.length}</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-700">
                                <div className="h-2 rounded-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-500" style={{ width: `${(deletedRgs.size / selectedApp.resourceGroups.length) * 100}%` }} />
                              </div>
                              {deletedRgs.size === selectedApp.resourceGroups.length && (
                                <p className="mt-2 text-xs text-green-400 font-semibold flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                  All resource groups deleted. ${selectedApp.totalCost.toFixed(2)}/mo saved.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cancel */}
                      <button
                        onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-8">
        Azure Disk Performance Monitoring POC &bull; Project Cleanup &bull; {APPLICATIONS.length} applications &bull; ${totalSubscriptionCost.toFixed(2)}/mo
        <Link href="/" className="text-blue-400 hover:underline ml-2">Back to Home</Link>
      </footer>
    </div>
  );
}
