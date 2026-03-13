# Azure Disk Performance Monitoring POC

[![Azure](https://img.shields.io/badge/Azure-East%20US%202-0078D4?logo=microsoftazure)](https://portal.azure.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Dashboard](https://img.shields.io/badge/Live%20Dashboard-Online-22c55e)](https://zealous-bush-0d835120f.2.azurestaticapps.net)

**Single pane of glass** to monitor disk performance across Azure Virtual Machines — with drill-down from fleet to individual disk, interactive cost simulation, and live Azure pricing.

## Live Dashboard

**https://zealous-bush-0d835120f.2.azurestaticapps.net**

---

## Dashboard Pages

The dashboard contains **7 pages**, each serving a specific purpose:

| # | Page | URL Path | Description |
|---|------|----------|-------------|
| 1 | **Dashboard** | `/` | Main metrics dashboard with 7 tabs: Overview, IOPS, Throughput, Latency, Queue Depth, Capacity, Comparison. Sparkline grids and ranking views replace traditional spaghetti charts. Filterable disk inventory table with sorting. |
| 2 | **Single Pane Monitor** | `/monitor` | Fleet-level view of all VMs with health scores, IOPS/throughput gauges, and cost. Three drill-down levels: **Fleet → VM → Disk**. Includes Start VM / Stop VM / Deallocate buttons with Azure CLI command generation. Filter by VM family and health status. |
| 3 | **Technical Details** | `/technical` | Solution architecture with **Mermaid.js** interactive diagram. Live Azure pricing (fetched from prices.azure.com). Clickable technology stack with expandable cards showing what each component does, why we use it, and Microsoft Learn links. Benchmark profiles. |
| 4 | **Deep Dive** | `/deep-dive` | Complete catalog: **17 KQL queries** (expandable with syntax-highlighted code), **29 guest-level perf counters** (13 Linux + 16 Windows), **42 platform metrics** grouped by category. Each query shows tables used, dashboard mapping, and which page displays it. |
| 5 | **Design Document** | `/design` | 8-section technical design document with Mermaid diagrams: Overview, Infrastructure, Data Collection, Query Layer, Visualization, Benchmarks, Security, Operations. Includes key design decisions with rationale, and operational commands. |
| 6 | **Help & Reference** | `/help` | Interactive cost simulator for **all 5 disk types** (Premium SSD tier picker, PremV2/Ultra sliders). Disk type capability comparison. IOPS scaling chart. VM-level disk caps table. Interactive disk selection decision guide. 8 cost optimization best practices. |
| 7 | **Metric Info Panels** | *(embedded)* | Each metric tab (IOPS, Throughput, Latency, Queue Depth, Capacity) has an expandable info panel explaining the metric, Azure metrics collected, performance thresholds, cost impact, and optimization tips. |



### Key Numbers

| Metric | Value |
|--------|-------|
| VMs | 5 (D4s_v5, D8s_v5, E4s_v5, L8s_v3, D4s_v5-Win) |
| Data Disks | 8 (Premium SSD, PremV2, Standard SSD, Standard HDD, Ultra) |
| Guest Perf Counters | 29 (13 Linux + 16 Windows) |
| Platform Metrics | 42 (IOPS, throughput, latency, burst, cache) |
| KQL Queries | 17 (inventory, comparison, trends, percentiles) |
| FIO Benchmark Profiles | 7 (sequential, random, mixed, latency, QD ramp) |
| Dashboard Pages | 7 |

---

## Step-by-Step Deployment Guide

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Azure CLI | 2.50+ | [Install](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) |
| Bicep CLI | 0.24+ | `az bicep install` |
| Node.js | 18+ | [Install](https://nodejs.org/) |
| SWA CLI | latest | `npm install -g @azure/static-web-apps-cli` |
| Azure Subscription | Contributor access | [Free trial](https://azure.microsoft.com/free/) |

### Step 1: Clone the Repository

```bash
git clone https://github.com/KrishnaDistributedcomputing/azure-disk-monitoring.git
cd azure-disk-monitoring
```

### Step 2: Login to Azure

```bash
az login
az account set --subscription "<YOUR-SUBSCRIPTION-ID>"
```

### Step 3: Generate SSH Key (for Linux VMs)

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/diskmon_rsa -N ""
```

### Step 4: Deploy Infrastructure

```bash
# Validate first
az deployment sub validate \
  --location eastus2 \
  --template-file infra/main.bicep \
  --parameters adminSshPublicKey="$(cat ~/.ssh/diskmon_rsa.pub)" \
  --parameters adminPassword="YourP@ssw0rd123!"

# Deploy (takes ~10-15 minutes)
az deployment sub create \
  --name diskmon-poc \
  --location eastus2 \
  --template-file infra/main.bicep \
  --parameters adminSshPublicKey="$(cat ~/.ssh/diskmon_rsa.pub)" \
  --parameters adminPassword="YourP@ssw0rd123!"
```

> **Windows PowerShell**: Use `(Get-Content ~/.ssh/diskmon_rsa.pub -Raw).Trim()` instead of `$(cat ...)`.

### Step 5: Attach Data Disks

```bash
RG="rg-diskmon-poc-eastus2"

az vm disk attach -g $RG --vm-name vm-diskmon-dsv5-01 --name disk-diskmon-dsv5-01-premssd-256 --lun 0
az vm disk attach -g $RG --vm-name vm-diskmon-dsv5-01 --name disk-diskmon-dsv5-01-stdssd-256 --lun 1
az vm disk attach -g $RG --vm-name vm-diskmon-dsv5-02 --name disk-diskmon-dsv5-02-premssd-512 --lun 0
az vm disk attach -g $RG --vm-name vm-diskmon-dsv5-02 --name disk-diskmon-dsv5-02-stdhdd-512 --lun 1
az vm disk attach -g $RG --vm-name vm-diskmon-esv5-01 --name disk-diskmon-esv5-01-premssdv2-256 --lun 0
az vm disk attach -g $RG --vm-name vm-diskmon-lsv3-01 --name disk-diskmon-lsv3-01-ultra-256 --lun 0
az vm disk attach -g $RG --vm-name vm-diskmon-lsv3-01 --name disk-diskmon-lsv3-01-premssd-256 --lun 1
az vm disk attach -g $RG --vm-name vm-diskmon-dsv5-03 --name disk-diskmon-dsv5-03-premssd-256 --lun 0
```

### Step 6: Verify Metrics Are Flowing

Wait ~10-15 minutes after deployment, then:

```bash
# Get workspace ID
WS_ID=$(az monitor log-analytics workspace show -g $RG -n law-diskmon-poc-eastus2 --query customerId -o tsv)

# Check for disk metrics
az monitor log-analytics query -w $WS_ID \
  --analytics-query "AzureMetrics | where MetricName has 'Disk' | summarize count() by MetricName | take 10" \
  --output table
```

### Step 7: Deploy the Dashboard

```bash
cd dashboard
npm install

# Build for static hosting
NEXT_OUTPUT=export npm run build

# Deploy to Azure Static Web Apps
az staticwebapp create --name swa-diskmon-poc --resource-group $RG --location eastus2 --sku Standard
TOKEN=$(az staticwebapp secrets list --name swa-diskmon-poc -g $RG --query "properties.apiKey" -o tsv)
swa deploy --app-location out --deployment-token $TOKEN --env production
```

The dashboard URL will be shown in the output.

### Step 8: Run Benchmarks (Optional)

```bash
# Run FIO on Linux VMs via az vm run-command
az vm run-command invoke -g $RG -n vm-diskmon-dsv5-01 \
  --command-id RunShellScript \
  --scripts "fio /opt/benchmarks/fio/rand-read-4k.fio --filename=/dev/sdc --output-format=json"
```

### Step 9: Deallocate VMs to Save Cost

```bash
# Stop all VMs (saves ~$1,200/mo compute)
az vm deallocate -g $RG --ids $(az vm list -g $RG --query "[].id" -o tsv) --no-wait

# Disks continue to charge ~$307/mo
# Detach Ultra Disk to save additional $91/mo:
az vm disk detach -g $RG --vm-name vm-diskmon-lsv3-01 -n disk-diskmon-lsv3-01-ultra-256
```

### Step 10: Teardown (Delete Everything)

```bash
az group delete -n rg-diskmon-poc-eastus2 --yes --no-wait
```

---

## Project Structure

```
DiskMonitoring/
├── SPEC.md                          # Full technical specification
├── README.md                        # This file
├── LICENSE                          # MIT License
├── CONTRIBUTING.md                  # Contribution guidelines
├── CHANGELOG.md                     # Version history
├── infra/                           # Bicep Infrastructure-as-Code
│   ├── main.bicep                   # Orchestrator (subscription-scoped)
│   ├── parameters/poc.bicepparam    # POC parameter values
│   └── modules/
│       ├── network.bicep            # VNet + Subnet
│       ├── vm-linux.bicep           # Linux VM + AMA + zone + Ultra SSD
│       ├── vm-windows.bicep         # Windows VM + AMA + DiskSpd
│       ├── managed-disk.bicep       # Managed Disk (all types)
│       ├── log-analytics.bicep      # Log Analytics Workspace
│       ├── dcr.bicep                # Data Collection Rule (29 counters)
│       └── grafana.bicep            # Azure Managed Grafana + RBAC
├── scripts/
│   ├── deploy.sh                    # One-command deployment
│   ├── teardown.sh                  # Safe removal with confirmation
│   └── run-benchmarks.sh            # Benchmark orchestration
├── benchmarks/
│   ├── fio/                         # 7 FIO profiles (Linux)
│   └── diskspd/                     # DiskSpd profiles (Windows)
├── queries/                         # 11 KQL query files
└── dashboard/                       # Next.js 14 web dashboard
    ├── package.json
    ├── next.config.js               # Static export + standalone modes
    ├── src/app/
    │   ├── page.tsx                 # Main dashboard (7 metric tabs)
    │   ├── monitor/page.tsx         # Single Pane of Glass (drill-down)
    │   ├── technical/page.tsx       # Architecture + live pricing
    │   ├── deep-dive/page.tsx       # KQL + counters + metrics catalog
    │   ├── design/page.tsx          # Design document (8 sections)
    │   └── help/page.tsx            # Cost simulator + guides
    ├── src/components/              # 9 React components
    ├── src/lib/                     # Data generators + Azure client
    └── src/types/                   # TypeScript interfaces
```

## Resource Naming & Tagging

All resources follow [Azure CAF naming conventions](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming):

| Resource | Pattern | Example |
|----------|---------|---------|
| Resource Group | `rg-{project}-{env}-{region}` | `rg-diskmon-poc-eastus2` |
| VNet | `vnet-{project}-{env}-{region}` | `vnet-diskmon-poc-eastus2` |
| VM | `vm-{project}-{family}-{seq}` | `vm-diskmon-dsv5-01` |
| Disk | `disk-{project}-{vm}-{type}-{size}` | `disk-diskmon-dsv5-01-premssd-256` |
| Log Analytics | `law-{project}-{env}-{region}` | `law-diskmon-poc-eastus2` |
| DCR | `dcr-{project}-{purpose}-{env}` | `dcr-diskmon-perf-poc` |

### Tags on Every Resource

`project=diskmon`, `environment=poc`, `cost-center=platform-engineering`, `owner=disk-monitoring-team`, `created-by=bicep-iac`

VMs add: `vm-family`, `vm-sku`, `vm-purpose`, `os-type`, `benchmark-tool`
Disks add: `disk-type`, `disk-tier`, `disk-size-gb`, `attached-vm`

## Cost Summary

| Scenario | Disks | VMs | Services | Total |
|----------|-------|-----|----------|-------|
| VMs deallocated | $307/mo | $0 | $68 | **$375/mo** |
| 80 hrs testing/mo | $307/mo | $131 | $68 | **$507/mo** |
| Always-on | $307/mo | $1,200 | $68 | **$1,576/mo** |

See the [Help page cost simulator](https://zealous-bush-0d835120f.2.azurestaticapps.net/help/) for interactive pricing across all disk types.

## License

[MIT](LICENSE)
