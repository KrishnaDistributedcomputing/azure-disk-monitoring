# Azure Disk Performance Monitoring — Proof of Concept Specification

| Field              | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| **Document**       | Technical Specification                                      |
| **Version**        | 1.0                                                          |
| **Status**         | Draft                                                        |
| **Author**         | Platform Engineering                                         |
| **Date**           | 2026-03-12                                                   |
| **Classification** | Internal — Lab / POC                                         |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [Success Criteria](#3-success-criteria)
4. [Architecture Overview](#4-architecture-overview)
5. [Resource Naming Convention](#5-resource-naming-convention)
6. [POC Environment — Infrastructure](#6-poc-environment--infrastructure)
7. [Disk Performance Workload Generation](#7-disk-performance-workload-generation)
8. [Data Collection Layer](#8-data-collection-layer)
9. [Data Aggregation and Analysis (KQL)](#9-data-aggregation-and-analysis-kql)
10. [Monitoring and Visualization Layer](#10-monitoring-and-visualization-layer)
11. [Performance Trend Analysis](#11-performance-trend-analysis)
12. [Performance Exploration and Comparison](#12-performance-exploration-and-comparison)
13. [Scalability Considerations](#13-scalability-considerations)
14. [Cost Estimate](#14-cost-estimate)
15. [Risks and Mitigations](#15-risks-and-mitigations)
16. [Deliverables](#16-deliverables)
17. [Implementation Phases](#17-implementation-phases)
18. [Appendix A — VM and Disk Matrix](#appendix-a--vm-and-disk-matrix)
19. [Appendix B — FIO Job Profiles](#appendix-b--fio-job-profiles)
20. [Appendix C — KQL Query Library](#appendix-c--kql-query-library)
21. [Appendix D — Glossary](#appendix-d--glossary)

---

## 1. Executive Summary

This specification defines a Proof-of-Concept (POC) Azure solution that provides a **single pane of glass** to monitor disk performance and utilization across Azure Virtual Machines. The primary objective is **learning and exploration** — to understand what disk monitoring metrics Azure exposes, how Azure Monitor tooling works, and how different disk workloads behave under stress across various VM and disk configurations.

The POC deploys a controlled lab of VMs spanning multiple VM families (D-series, E-series, L-series) and disk types (Premium SSD, Premium SSD v2, Standard SSD, Standard HDD, Ultra Disk). Benchmarking tools (FIO / DiskSpd) generate controlled I/O workloads whose telemetry flows through Azure Monitor Agent into a centralized Log Analytics Workspace. KQL queries aggregate the data and Azure Managed Grafana dashboards expose it as a unified monitoring surface.

---

## 2. Goals and Non-Goals

### 2.1 Goals

| ID   | Goal                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------ |
| G-1  | Deploy a multi-VM lab covering at least three VM families and four disk types.                          |
| G-2  | Collect a comprehensive set of disk metrics (IOPS, throughput, latency, queue depth, capacity).         |
| G-3  | Centralize all telemetry in a single Log Analytics Workspace.                                          |
| G-4  | Build a library of KQL queries that explore, aggregate, and compare disk metrics.                      |
| G-5  | Deliver a dashboard ("single pane of glass") for disk performance and inventory visibility.             |
| G-6  | Run structured benchmarks to compare VM + disk combinations and document results.                      |
| G-7  | Design for future scalability (multi-subscription, multi-region) even if the POC is single-region.     |
| G-8  | Produce documentation sufficient for another engineer to reproduce the environment.                    |

### 2.2 Non-Goals

| ID    | Non-Goal                                                                                |
| ----- | --------------------------------------------------------------------------------------- |
| NG-1  | Production-grade security hardening (NSGs, Private Link, RBAC scoping, disk encryption). |
| NG-2  | Enterprise governance (Azure Policy, Management Groups, Sentinel integration).           |
| NG-3  | Automated alerting and incident response (alerts may be explored but are not required).  |
| NG-4  | Application-layer monitoring (APM, dependency mapping).                                  |
| NG-5  | Cost optimization of the monitoring pipeline itself.                                     |

---

## 3. Success Criteria

| #  | Criterion                                                                                                     | Measurement                                                            |
| -- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| SC-1 | All VMs report disk metrics to Log Analytics within 60 seconds of agent installation.                       | Query `Heartbeat` table — all VMs present.                             |
| SC-2 | At least 10 distinct disk metrics are collected per VM (reads/s, writes/s, IOPS, latency, queue depth, etc). | Run `Perf | distinct CounterName` — ≥ 10 disk counters.               |
| SC-3 | KQL queries can compare metrics across VM families and disk types in a single result set.                    | Execute comparison query — returns rows for each VM/disk combo.        |
| SC-4 | Dashboard loads in < 5 seconds and shows real-time data (≤ 5-minute lag).                                    | Manual observation during benchmark run.                               |
| SC-5 | Benchmark tests produce measurable differentiation between disk types (e.g., Ultra vs Standard HDD latency). | Side-by-side latency charts show clear separation.                     |

---

## 4. Architecture Overview

### 4.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Azure Subscription (POC)                           │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  VM-Dsv5     │  │  VM-Esv5    │  │  VM-Lsv3    │  │  VM-Dsv5-2  │  ...  │
│  │ (Gen Purpose)│  │ (Memory Opt)│  │ (Storage Opt)│  │ (Comparison)│       │
│  │             │  │             │  │             │  │             │       │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │       │
│  │ │ OS Disk │ │  │ │ OS Disk │ │  │ │ OS Disk │ │  │ │ OS Disk │ │       │
│  │ │ PremSSD │ │  │ │ PremSSD │ │  │ │ PremSSD │ │  │ │ PremSSD │ │       │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │       │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │       │
│  │ │Data Disk│ │  │ │Data Disk│ │  │ │Data Disk│ │  │ │Data Disk│ │       │
│  │ │ StdSSD  │ │  │ │PremSSDv2│ │  │ │UltraDisk│ │  │ │ StdHDD  │ │       │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │       │
│  │             │  │             │  │             │  │             │       │
│  │  AMA Agent  │  │  AMA Agent  │  │  AMA Agent  │  │  AMA Agent  │       │
│  │  FIO/DiskSpd│  │  FIO/DiskSpd│  │  FIO/DiskSpd│  │  FIO/DiskSpd│       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │                │                │               │
│         └────────────────┼────────────────┼────────────────┘               │
│                          │                │                                │
│                  ┌───────▼────────────────▼───────┐                        │
│                  │  Data Collection Rule (DCR)     │                        │
│                  │  - Perf counters (60 s)         │                        │
│                  │  - InsightsMetrics              │                        │
│                  │  - Disk custom logs (optional)  │                        │
│                  └───────────────┬────────────────┘                        │
│                                 │                                          │
│                  ┌──────────────▼──────────────┐                           │
│                  │  Log Analytics Workspace     │                           │
│                  │  (Perf, InsightsMetrics,     │                           │
│                  │   Heartbeat, VMProcess)      │                           │
│                  └──────────────┬──────────────┘                           │
│                                 │                                          │
│              ┌──────────────────┼──────────────────┐                       │
│              │                  │                   │                       │
│    ┌─────────▼────────┐ ┌──────▼──────┐  ┌────────▼─────────┐             │
│    │ Azure Managed     │ │  Azure      │  │  KQL Query       │             │
│    │ Grafana            │ │  Workbooks  │  │  Library (repo)  │             │
│    │ (Primary Dashboard)│ │ (Secondary) │  │                  │             │
│    └───────────────────┘ └─────────────┘  └──────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Summary

| Component                    | Purpose                                                              | Azure Service               |
| ---------------------------- | -------------------------------------------------------------------- | --------------------------- |
| Virtual Machines             | Run benchmark workloads and emit disk telemetry                      | Azure Virtual Machines      |
| Managed Disks                | Provide storage targets with varying performance tiers               | Azure Managed Disks         |
| Azure Monitor Agent (AMA)    | Collect guest-level and platform-level disk metrics                  | Azure Monitor Agent         |
| Data Collection Rule (DCR)   | Define which metrics/logs to collect and where to send them          | Azure Monitor DCR           |
| Log Analytics Workspace      | Central telemetry store; KQL query engine                            | Log Analytics               |
| VM Insights                  | Out-of-box performance maps and dashboards                           | Azure Monitor — VM Insights |
| Azure Managed Grafana        | Primary visualization layer ("single pane of glass")                 | Azure Managed Grafana       |
| Azure Monitor Workbooks      | Secondary / ad-hoc analysis                                          | Azure Monitor Workbooks     |
| FIO / DiskSpd                | Generate controlled I/O workloads on VMs                             | Open-source tools on VMs    |

---

## 5. Resource Naming Convention

All resources follow the pattern: `<type>-diskmon-<role>-<sequence>`

| Resource               | Name Example                    |
| ---------------------- | ------------------------------- |
| Resource Group         | `rg-diskmon-poc-01`             |
| Virtual Network        | `vnet-diskmon-poc-01`           |
| Subnet                 | `snet-diskmon-vms-01`           |
| Log Analytics WS       | `law-diskmon-poc-01`            |
| Data Collection Rule   | `dcr-diskmon-perf-01`           |
| Grafana Instance       | `grafana-diskmon-poc-01`        |
| VM (D-series)          | `vm-diskmon-dsv5-01`            |
| VM (E-series)          | `vm-diskmon-esv5-01`            |
| VM (L-series)          | `vm-diskmon-lsv3-01`            |
| Managed Disk (data)    | `disk-diskmon-dsv5-01-data-01`  |

---

## 6. POC Environment — Infrastructure

### 6.1 Region

| Setting       | Value                  | Rationale                                                                |
| ------------- | ---------------------- | ------------------------------------------------------------------------ |
| Primary Region | East US 2             | Broad VM SKU availability including L-series and Ultra Disk zones.       |

### 6.2 Virtual Network

| Setting           | Value            |
| ----------------- | ---------------- |
| Address Space     | 10.200.0.0/16    |
| VM Subnet         | 10.200.1.0/24    |

### 6.3 VM Configurations

The following table defines the initial VM fleet. VMs are intentionally varied to enable performance comparison.

| VM Name              | VM SKU             | Family           | vCPUs | RAM (GiB) | Max Disk IOPS (uncached) | OS          | Purpose                           |
| -------------------- | ------------------ | ---------------- | ----- | --------- | ------------------------ | ----------- | --------------------------------- |
| vm-diskmon-dsv5-01   | Standard_D4s_v5    | General Purpose  | 4     | 16        | 6,400                    | Ubuntu 22.04 | Baseline general-purpose VM       |
| vm-diskmon-dsv5-02   | Standard_D8s_v5    | General Purpose  | 8     | 32        | 12,800                   | Ubuntu 22.04 | Compare effect of larger VM size  |
| vm-diskmon-esv5-01   | Standard_E4s_v5    | Memory Optimized | 4     | 32        | 6,400                    | Ubuntu 22.04 | Memory-optimized comparison       |
| vm-diskmon-lsv3-01   | Standard_L8s_v3    | Storage Optimized| 8     | 64        | 400,000 (NVMe local)     | Ubuntu 22.04 | Storage-optimized; local NVMe     |
| vm-diskmon-dsv5-03   | Standard_D4s_v5    | General Purpose  | 4     | 16        | 6,400                    | Windows 2022 | Windows comparison (DiskSpd)      |

> **Extensibility**: Additional VMs (e.g., F-series compute-optimized, M-series large memory) can be added later by cloning a Bicep module and updating the parameter file.

### 6.4 Managed Disk Configurations

Each VM receives an OS disk and one or more data disks. Data disks are the primary benchmarking targets.

| Disk Name                        | Attached To            | Disk Type        | Size (GiB) | Provisioned IOPS | Provisioned Throughput (MBps) | Purpose                          |
| -------------------------------- | ---------------------- | ---------------- | ----------- | ----------------- | ----------------------------- | -------------------------------- |
| disk-dsv5-01-data-premssd-256    | vm-diskmon-dsv5-01     | Premium SSD (P15)| 256         | 1,100             | 125                           | Premium SSD baseline             |
| disk-dsv5-01-data-stdssd-256     | vm-diskmon-dsv5-01     | Standard SSD (E15)| 256        | 500               | 60                            | Standard SSD comparison          |
| disk-dsv5-02-data-premssd-512    | vm-diskmon-dsv5-02     | Premium SSD (P20)| 512         | 2,300             | 150                           | Larger Premium SSD               |
| disk-dsv5-02-data-stdhdd-512     | vm-diskmon-dsv5-02     | Standard HDD (S20)| 512        | 500               | 60                            | HDD baseline                     |
| disk-esv5-01-data-premssdv2-256  | vm-diskmon-esv5-01     | Premium SSD v2   | 256         | 5,000 (custom)    | 200 (custom)                  | Premium SSD v2 — custom IOPS     |
| disk-lsv3-01-data-ultra-256      | vm-diskmon-lsv3-01     | Ultra Disk       | 256         | 10,000 (custom)   | 400 (custom)                  | Ultra Disk — high-perf baseline  |
| disk-lsv3-01-data-premssd-256    | vm-diskmon-lsv3-01     | Premium SSD (P15)| 256         | 1,100             | 125                           | Compared against Ultra on same VM|
| disk-dsv5-03-data-premssd-256    | vm-diskmon-dsv5-03     | Premium SSD (P15)| 256         | 1,100             | 125                           | Windows DiskSpd target           |

> **Key insight**: Azure disk performance limits depend on **both** the disk tier/size **and** the VM SKU's uncached disk throughput cap. The POC intentionally creates situations where the disk can deliver more IOPS than the VM allows (and vice versa) to observe capping behavior.

### 6.5 Infrastructure as Code

All infrastructure is defined in **Bicep** with parameterized modules to allow easy addition/removal of VMs and disks.

```
infra/
├── main.bicep                  # Orchestrator
├── parameters/
│   └── poc.bicepparam          # POC parameter values
├── modules/
│   ├── network.bicep           # VNet + Subnet
│   ├── vm-linux.bicep          # Linux VM + AMA extension
│   ├── vm-windows.bicep        # Windows VM + AMA extension
│   ├── managed-disk.bicep      # Managed Disk + attachment
│   ├── log-analytics.bicep     # Log Analytics Workspace
│   ├── dcr.bicep               # Data Collection Rule
│   ├── grafana.bicep           # Azure Managed Grafana
│   └── vm-insights.bicep       # VM Insights enablement
└── scripts/
    ├── deploy.sh               # One-command deployment
    └── teardown.sh             # Clean removal
```

---

## 7. Disk Performance Workload Generation

### 7.1 Tool Selection

| Tool    | Platform | Use Case                                      |
| ------- | -------- | --------------------------------------------- |
| **FIO** | Linux    | Primary benchmark tool; rich job-file syntax.  |
| **DiskSpd** | Windows | Microsoft-recommended Windows storage benchmark.|

Both tools are installed via cloud-init (Linux) or custom script extension (Windows) during VM provisioning.

### 7.2 FIO Job Profiles

Each profile isolates one I/O pattern for clean metric comparison.

| Profile Name           | Pattern          | Block Size | Queue Depth | Duration | Target                          |
| ---------------------- | ---------------- | ---------- | ----------- | -------- | ------------------------------- |
| `seq-read-1m`         | Sequential Read  | 1 MiB      | 32          | 120 s    | Throughput ceiling               |
| `seq-write-1m`        | Sequential Write | 1 MiB      | 32          | 120 s    | Throughput ceiling               |
| `rand-read-4k`        | Random Read      | 4 KiB      | 64          | 120 s    | IOPS ceiling                     |
| `rand-write-4k`       | Random Write     | 4 KiB      | 64          | 120 s    | IOPS ceiling                     |
| `rand-rw-4k-70-30`    | 70% Read / 30% Write | 4 KiB | 32          | 120 s    | Mixed workload                   |
| `lat-probe-4k`        | Random Read      | 4 KiB      | 1           | 60 s     | Latency measurement (low QD)     |
| `qd-ramp`             | Random Read      | 4 KiB      | 1→128 (ramp)| 300 s   | Queue depth vs latency curve     |

> Full FIO job files are provided in [Appendix B](#appendix-b--fio-job-profiles).

### 7.3 DiskSpd Equivalent Profiles (Windows)

| Profile Name           | DiskSpd Arguments                                                  |
| ---------------------- | ------------------------------------------------------------------ |
| `seq-read-1m`         | `-b1M -o32 -t4 -r -d120 -Sh -D -L <drive>:\iotest.dat`           |
| `rand-write-4k`       | `-b4K -o64 -t4 -r -w100 -d120 -Sh -D -L <drive>:\iotest.dat`     |
| `rand-rw-4k-70-30`    | `-b4K -o32 -t4 -r -w30 -d120 -Sh -D -L <drive>:\iotest.dat`      |

### 7.4 Workload Execution Strategy

1. **Pre-condition disks**: Write 100% of the test file (`fio --name=precondition --filename=/dev/sdX --bs=1M --iodepth=32 --rw=write --size=100%`) to avoid first-write penalties on Premium SSD.
2. **Run one profile at a time** per VM to isolate variables.
3. **Tag each run** with metadata (VM name, disk name, profile name, timestamp) by writing a marker to a custom log table (`DiskBenchmark_CL`) so benchmark windows can be correlated with metric data in KQL.
4. **Cool-down**: Wait 60 seconds between profiles to allow metric pipelines to flush.

### 7.5 Benchmark Orchestration Script

A central bash script (`scripts/run-benchmarks.sh`) SSHes into each Linux VM and executes profiles in sequence, logging start/end timestamps to Log Analytics via the HTTP Data Collector API (or Azure Monitor Ingestion API with DCR).

---

## 8. Data Collection Layer

### 8.1 Azure Monitor Agent (AMA)

AMA is deployed as a VM extension during provisioning (Bicep module). It replaces the legacy Log Analytics Agent (MMA).

| Setting               | Value                                |
| --------------------- | ------------------------------------ |
| Agent Type            | Azure Monitor Agent (AMA)            |
| Provisioning Method   | Bicep VM extension resource          |
| Auto-upgrade          | Enabled                              |

### 8.2 Data Collection Rule (DCR)

A single DCR (`dcr-diskmon-perf-01`) is associated with all VMs.

#### 8.2.1 Performance Counters — Linux

| Object           | Counter                                      | Interval |
| ---------------- | -------------------------------------------- | -------- |
| Logical Disk     | Disk Reads/sec                               | 60 s     |
| Logical Disk     | Disk Writes/sec                              | 60 s     |
| Logical Disk     | Disk Transfers/sec                           | 60 s     |
| Logical Disk     | Disk Read Bytes/sec                          | 60 s     |
| Logical Disk     | Disk Write Bytes/sec                         | 60 s     |
| Logical Disk     | Avg. Disk sec/Read                           | 60 s     |
| Logical Disk     | Avg. Disk sec/Write                          | 60 s     |
| Logical Disk     | Avg. Disk sec/Transfer                       | 60 s     |
| Logical Disk     | Current Disk Queue Length                    | 60 s     |
| Logical Disk     | % Used Space                                 | 60 s     |
| Logical Disk     | Free Megabytes                               | 60 s     |
| Logical Disk     | % Free Inodes                                | 60 s     |
| Logical Disk     | Disk Bytes/sec                               | 60 s     |

#### 8.2.2 Performance Counters — Windows

| Object           | Counter                                      | Interval |
| ---------------- | -------------------------------------------- | -------- |
| LogicalDisk      | Disk Reads/sec                               | 60 s     |
| LogicalDisk      | Disk Writes/sec                              | 60 s     |
| LogicalDisk      | Disk Transfers/sec                           | 60 s     |
| LogicalDisk      | Disk Read Bytes/sec                          | 60 s     |
| LogicalDisk      | Disk Write Bytes/sec                         | 60 s     |
| LogicalDisk      | Avg. Disk sec/Read                           | 60 s     |
| LogicalDisk      | Avg. Disk sec/Write                          | 60 s     |
| LogicalDisk      | Avg. Disk Queue Length                       | 60 s     |
| LogicalDisk      | Current Disk Queue Length                    | 60 s     |
| LogicalDisk      | % Free Space                                 | 60 s     |
| LogicalDisk      | Free Megabytes                               | 60 s     |
| PhysicalDisk     | Disk Reads/sec                               | 60 s     |
| PhysicalDisk     | Disk Writes/sec                              | 60 s     |
| PhysicalDisk     | Avg. Disk sec/Read                           | 60 s     |
| PhysicalDisk     | Avg. Disk sec/Write                          | 60 s     |
| PhysicalDisk     | Avg. Disk Queue Length                       | 60 s     |

#### 8.2.3 VM Insights

VM Insights is enabled on all VMs. This populates the `InsightsMetrics` table with additional metrics:

| Namespace                   | Metric Name                            |
| --------------------------- | -------------------------------------- |
| LogicalDisk                 | ReadsPerSecond                         |
| LogicalDisk                 | WritesPerSecond                        |
| LogicalDisk                 | ReadBytesPerSecond                     |
| LogicalDisk                 | WriteBytesPerSecond                    |
| LogicalDisk                 | TransfersPerSecond                     |
| LogicalDisk                 | ReadLatencyMs                          |
| LogicalDisk                 | WriteLatencyMs                         |
| LogicalDisk                 | FreeSpaceMB                            |
| LogicalDisk                 | FreeSpacePercentage                    |

#### 8.2.4 Platform Metrics (Azure Monitor Metrics)

These are emitted automatically by the Azure platform (no agent required) and are available in Azure Monitor Metrics and can be queried via Azure Resource Graph or Metrics API:

| Metric Name                               | Unit      | Aggregation |
| ----------------------------------------- | --------- | ----------- |
| OS Disk Read Bytes/Sec                    | BytesPerSecond | Average |
| OS Disk Write Bytes/Sec                   | BytesPerSecond | Average |
| OS Disk Read Operations/Sec              | CountPerSecond | Average |
| OS Disk Write Operations/Sec             | CountPerSecond | Average |
| OS Disk Queue Depth                      | Count     | Average     |
| Data Disk Read Bytes/Sec                 | BytesPerSecond | Average |
| Data Disk Write Bytes/Sec                | BytesPerSecond | Average |
| Data Disk Read Operations/Sec            | CountPerSecond | Average |
| Data Disk Write Operations/Sec           | CountPerSecond | Average |
| Data Disk Queue Depth                    | Count     | Average     |
| Data Disk Latency (Preview)              | Milliseconds | Average  |
| Data Disk IOPS Consumed Percentage       | Percent   | Average     |
| Data Disk Bandwidth Consumed Percentage  | Percent   | Average     |
| VM Cached IOPS Consumed Percentage       | Percent   | Average     |
| VM Cached Bandwidth Consumed Percentage  | Percent   | Average     |
| VM Uncached IOPS Consumed Percentage     | Percent   | Average     |
| VM Uncached Bandwidth Consumed Percentage| Percent   | Average     |

> **Important**: The "Consumed Percentage" metrics are critical for understanding when a VM or disk is hitting its performance ceiling. These are only available as platform metrics—not in Log Analytics by default. To get them into Log Analytics, configure a **Diagnostic Setting** on each VM to export platform metrics to the workspace.

### 8.3 Diagnostic Settings

A Diagnostic Setting is applied to each VM to export platform metrics to the Log Analytics Workspace:

```
Resource Type: Microsoft.Compute/virtualMachines
Destination:   law-diskmon-poc-01
Categories:    AllMetrics
```

### 8.4 Custom Log Table — Benchmark Metadata

A custom table `DiskBenchmark_CL` captures benchmark run metadata:

| Column            | Type     | Description                               |
| ----------------- | -------- | ----------------------------------------- |
| TimeGenerated     | datetime | Start time of the benchmark run           |
| VMName_s          | string   | VM name                                   |
| VMSku_s           | string   | VM SKU                                    |
| DiskName_s        | string   | Target disk                               |
| DiskType_s        | string   | Disk type (PremiumSSD, UltraDisk, etc.)   |
| ProfileName_s     | string   | FIO/DiskSpd profile name                  |
| DurationSec_d     | double   | Duration seconds                          |
| BlockSize_s       | string   | Block size                                |
| QueueDepth_d      | double   | Queue depth                               |
| Status_s          | string   | running / completed                       |

### 8.5 Data Flow Summary

```
VM Guest OS
  ├─ AMA → DCR → Log Analytics (Perf, InsightsMetrics, Heartbeat)
  ├─ Platform Metrics → Diagnostic Setting → Log Analytics (AzureMetrics)
  └─ Benchmark Script → Azure Monitor Ingestion API → Log Analytics (DiskBenchmark_CL)
```

### 8.6 Log Analytics Workspace Configuration

| Setting                     | Value                   |
| --------------------------- | ----------------------- |
| Workspace Name              | law-diskmon-poc-01      |
| SKU                         | PerGB2018               |
| Retention                   | 30 days (POC default)   |
| Daily Cap                   | 5 GB/day (cost guard)   |
| Interactive Query Pack      | N/A (default)           |

---

## 9. Data Aggregation and Analysis (KQL)

### 9.1 Query Design Principles

1. **Parameterize time ranges** — every query uses `let timeRange = ...` so dashboards can bind time pickers.
2. **Tag enrichment** — join VM metadata (SKU, family) from `Heartbeat` or a static mapping table.
3. **Instance filtering** — exclude OS disk (`_Total`, `/`, `C:`) when analyzing data-disk performance.
4. **Scalability** — avoid `search *`; always specify table and use `where` early to reduce scanned data.

### 9.2 Core Query Library (Summary)

Detailed KQL is in [Appendix C](#appendix-c--kql-query-library). Below is an index:

| Query ID | Title                                        | Tables Used                        |
| -------- | -------------------------------------------- | ---------------------------------- |
| Q-01     | Disk Inventory — all VMs and disks           | Perf, Heartbeat                    |
| Q-02     | Current IOPS by VM and disk                  | Perf                               |
| Q-03     | Current throughput (MB/s) by VM and disk     | Perf                               |
| Q-04     | Average read/write latency by VM and disk    | Perf                               |
| Q-05     | Queue depth over time                        | Perf                               |
| Q-06     | Top 10 disks by IOPS                         | Perf                               |
| Q-07     | Top 10 disks by latency                      | Perf                               |
| Q-08     | Disk capacity utilization                    | Perf                               |
| Q-09     | VM family performance comparison             | Perf, Heartbeat                    |
| Q-10     | Disk type performance comparison             | Perf, DiskBenchmark_CL             |
| Q-11     | IOPS consumed % (platform metric)            | AzureMetrics                       |
| Q-12     | Bandwidth consumed % (platform metric)       | AzureMetrics                       |
| Q-13     | Benchmark run overlay (metrics + run window) | Perf, DiskBenchmark_CL             |
| Q-14     | Latency percentiles (p50, p95, p99)          | Perf                               |
| Q-15     | Time-series: throughput trend by disk type   | Perf                               |

---

## 10. Monitoring and Visualization Layer

### 10.1 Primary Dashboard — Azure Managed Grafana

Azure Managed Grafana is the primary "single pane of glass." It connects natively to Log Analytics and Azure Monitor Metrics as data sources.

#### 10.1.1 Dashboard Structure

| Dashboard         | Panels                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| **Overview**      | Total VMs monitored, Total disks, Disks > 80% IOPS consumed, Disks > 10 ms latency, Disk type distribution |
| **Disk Inventory**| Table: VM Name, VM SKU, Resource Group, Disk Name, Disk Size, Disk Type, IOPS, Throughput MB/s, Latency    |
| **IOPS**          | Time-series: IOPS by VM; Bar: top-N disks; Heatmap: IOPS by disk type                                     |
| **Throughput**    | Time-series: read/write MB/s by VM; Comparison by disk type                                                |
| **Latency**       | Time-series: avg latency by VM; p95/p99 stat panels; Latency by disk type                                 |
| **Queue Depth**   | Time-series: queue depth by VM; Correlation with latency                                                   |
| **Capacity**      | Gauge: % used by disk; Table: free space remaining                                                         |
| **Benchmarks**    | Annotations for benchmark runs; Side-by-side comparison panels                                             |

#### 10.1.2 Dashboard Variables (Filters)

| Variable       | Source                  | Multi-select | Purpose                          |
| -------------- | ----------------------- | ------------ | -------------------------------- |
| `vmName`       | Heartbeat → Computer   | Yes          | Filter by VM                     |
| `vmSku`        | Tag or static list      | Yes          | Filter by VM SKU / family        |
| `diskName`     | Perf → InstanceName    | Yes          | Filter by disk                   |
| `diskType`     | Tag or static list      | Yes          | Filter by disk type              |
| `timeRange`    | Grafana time picker     | N/A          | 1 h / 24 h / 7 d / 30 d         |
| `benchProfile` | DiskBenchmark_CL       | Yes          | Overlay benchmark run windows    |

#### 10.1.3 Example Panel — IOPS Time Series

```kusto
// Grafana panel query (Azure Monitor data source)
let timeRange = $__timeFilter(TimeGenerated);
Perf
| where TimeGenerated between (timeRange)
| where ObjectName == "Logical Disk" or ObjectName == "LogicalDisk"
| where CounterName == "Disk Transfers/sec"
| where InstanceName !in ("_Total", "/")
| where Computer in ($vmName)
| summarize AvgIOPS = avg(CounterValue) by bin(TimeGenerated, 1m), Computer, InstanceName
| order by TimeGenerated asc
```

### 10.2 Secondary — Azure Monitor Workbooks

A workbook (`workbooks/disk-performance.workbook.json`) provides an alternative view, useful for portal-native users. Layout mirrors the Grafana dashboard:

- **Tab 1**: Overview stats (tiles)
- **Tab 2**: Disk inventory (grid)
- **Tab 3**: Performance charts (IOPS, throughput, latency)
- **Tab 4**: Benchmark comparison

### 10.3 Grafana Provisioning

The Grafana instance is deployed via Bicep. Dashboards are stored as JSON models in the repository under `dashboards/` and imported via the Grafana API during deployment (or manually via UI upload).

```
dashboards/
├── overview.json
├── iops.json
├── throughput.json
├── latency.json
├── queue-depth.json
├── capacity.json
└── benchmarks.json
```

---

## 11. Performance Trend Analysis

### 11.1 Time Windows

All dashboards support the following time ranges via Grafana's native time picker:

| Window     | Use Case                                                        |
| ---------- | --------------------------------------------------------------- |
| Last 1 h   | Real-time observation during active benchmarks                 |
| Last 24 h  | Compare results from multiple benchmark runs in a day          |
| Last 7 d   | Week-over-week pattern analysis                                |
| Last 30 d  | Full POC duration trend                                        |
| Custom      | Arbitrary window for deep-dive                                |

### 11.2 Trend Detection Queries

| Query ID | Title                                             | Description                                                  |
| -------- | ------------------------------------------------- | ------------------------------------------------------------ |
| T-01     | Sustained high throughput windows                 | Identify periods where throughput > 80% of provisioned limit |
| T-02     | Latency spikes                                    | Detect latency > 2× rolling 1-hour average                  |
| T-03     | IOPS plateau detection                            | Identify periods where IOPS flatlines at provisioned limit   |
| T-04     | Queue depth buildup correlation                   | Correlate rising queue depth with latency increase           |

---

## 12. Performance Exploration and Comparison

### 12.1 Comparison Dimensions

Engineers should use the dashboards and KQL to compare along these dimensions:

| Dimension              | Example Comparison                                                |
| ---------------------- | ----------------------------------------------------------------- |
| **VM Family**          | D-series vs E-series vs L-series — same disk, different VM        |
| **VM Size**            | D4s_v5 vs D8s_v5 — does doubling vCPUs double disk throughput?    |
| **Disk Type**          | Premium SSD vs Standard SSD vs Ultra — same VM, different disk    |
| **Disk Size**          | P15 (256 GiB) vs P20 (512 GiB) — IOPS scaling with size          |
| **Workload Pattern**   | Sequential vs Random — how does each disk type respond?           |
| **Queue Depth**        | QD=1 vs QD=64 — latency vs IOPS tradeoff curve                   |
| **OS**                 | Linux vs Windows — same VM SKU, same disk, different OS stack     |

### 12.2 Expected Insights

| # | Hypothesis                                                                   | How to validate                               |
| - | ---------------------------------------------------------------------------- | ---------------------------------------------- |
| 1 | Ultra Disk delivers sub-millisecond latency at high IOPS.                    | `lat-probe-4k` + Q-14 latency percentiles     |
| 2 | Standard HDD shows high latency under random 4K workloads.                   | `rand-read-4k` + Q-07 top latency disks       |
| 3 | VM IOPS cap limits Premium SSD performance before disk limit is reached.     | Q-11 IOPS consumed % + Q-02 actual IOPS       |
| 4 | Larger VM SKU (D8s_v5) achieves higher throughput than D4s_v5 on same disk.  | Q-09 VM family comparison + `seq-read-1m`      |
| 5 | Queue depth ramp shows latency inflection point at disk IOPS ceiling.        | `qd-ramp` + Q-05 queue depth time series       |

---

## 13. Scalability Considerations

Although the POC starts small, the following design decisions ensure future scalability:

| Area                  | Design Decision                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| Log Analytics         | Use workspace-level queries (not resource-scoped) so adding VMs requires no query changes.               |
| KQL Queries           | All queries filter by `Computer` or resource tags — no hardcoded VM names.                               |
| Dashboard Variables   | Grafana variables auto-populate from Heartbeat table — new VMs appear automatically.                     |
| Multi-subscription    | Log Analytics can ingest from multiple subscriptions via DCR associations. Architecture supports this.    |
| Multi-region          | Deploy additional VMs in new regions pointing to the same workspace (up to latency tolerance).           |
| Data Volume           | Daily cap (5 GB) is a POC guard — remove or raise for production scale.                                  |
| Query Performance     | Use `materialized_view` or summary rules if table size exceeds 100 GB.                                   |

---

## 14. Cost Estimate

### 14.1 Managed Disk Costs (Always-On — Charged 24/7 Regardless of VM State)

Managed disks are billed continuously whether or not the VM is running. These are the **dominant cost drivers** when VMs are deallocated.

#### Data Disks

| Disk Name                          | SKU             | Size  | IOPS    | Throughput | Azure Tier | Monthly Cost (USD) | Billing Model                         |
| ---------------------------------- | --------------- | ----- | ------- | ---------- | ---------- | ------------------ | ------------------------------------- |
| disk-diskmon-dsv5-01-premssd-256   | Premium_LRS     | 256 GiB | 1,100   | 125 MB/s   | P15        | **$19.71**         | Fixed per tier                        |
| disk-diskmon-dsv5-01-stdssd-256    | StandardSSD_LRS | 256 GiB | 500     | 100 MB/s   | E15        | **$15.36**         | Fixed per tier                        |
| disk-diskmon-dsv5-02-premssd-512   | Premium_LRS     | 512 GiB | 2,300   | 150 MB/s   | P20        | **$38.41**         | Fixed per tier                        |
| disk-diskmon-dsv5-02-stdhdd-512    | Standard_LRS    | 512 GiB | 500     | 60 MB/s    | S20        | **$10.24**         | Fixed per tier                        |
| disk-diskmon-esv5-01-premssdv2-256 | PremiumV2_LRS   | 256 GiB | 5,000   | 200 MB/s   | Custom     | **$44.04**         | Capacity + IOPS + Throughput          |
| disk-diskmon-lsv3-01-ultra-256     | UltraSSD_LRS    | 256 GiB | 10,000  | 400 MB/s   | Custom     | **$91.07**         | Capacity + IOPS + Throughput + Reservation |
| disk-diskmon-lsv3-01-premssd-256   | Premium_LRS     | 256 GiB | 1,100   | 125 MB/s   | P15        | **$19.71**         | Fixed per tier                        |
| disk-diskmon-dsv5-03-premssd-256   | Premium_LRS     | 256 GiB | 1,100   | 125 MB/s   | P15        | **$19.71**         | Fixed per tier                        |
| **Data Disks Subtotal**            |                 |         |         |            |            | **$258.25/mo**     |                                       |

#### OS Disks (5 VMs × Premium SSD 128 GiB P10)

| Disk Name                     | SKU         | Size    | IOPS | Throughput | Tier | Monthly Cost (USD) |
| ----------------------------- | ----------- | ------- | ---- | ---------- | ---- | ------------------ |
| osdisk-vm-diskmon-dsv5-01     | Premium_LRS | 128 GiB | 500  | 100 MB/s   | P10  | **$9.86**          |
| osdisk-vm-diskmon-dsv5-02     | Premium_LRS | 128 GiB | 500  | 100 MB/s   | P10  | **$9.86**          |
| osdisk-vm-diskmon-dsv5-03     | Premium_LRS | 128 GiB | 500  | 100 MB/s   | P10  | **$9.86**          |
| osdisk-vm-diskmon-esv5-01     | Premium_LRS | 128 GiB | 500  | 100 MB/s   | P10  | **$9.86**          |
| osdisk-vm-diskmon-lsv3-01     | Premium_LRS | 128 GiB | 500  | 100 MB/s   | P10  | **$9.86**          |
| **OS Disks Subtotal**         |             |         |      |            |      | **$49.28/mo**      |

#### Disk Cost Breakdown by Type

| Disk Type        | Count | Monthly Cost | % of Disk Spend | Notes                                           |
| ---------------- | ----- | ------------ | --------------- | ----------------------------------------------- |
| Premium SSD      | 8     | $137.08      | 44.6%           | 4 data + 5 OS disks; fixed cost per tier        |
| Ultra Disk       | 1     | $91.07       | 29.6%           | Highest per-disk cost; billed even when VM is off |
| Premium SSD v2   | 1     | $44.04       | 14.3%           | Pay-per-IOPS + per-throughput model              |
| Standard SSD     | 1     | $15.36       | 5.0%            | Budget-friendly; good for comparison             |
| Standard HDD     | 1     | $10.24       | 3.3%            | Lowest cost; highest latency                     |
| **All Disks**    | **13**| **$307.53**  | **100%**        |                                                  |

#### Premium SSD v2 — Itemized Cost Breakdown

Premium SSD v2 uses a component billing model unlike standard tiers:

| Component          | Provisioned | Rate (East US 2)      | Monthly Cost |
| ------------------ | ----------- | --------------------- | ------------ |
| Capacity           | 256 GiB     | $0.05536/GiB/mo       | $14.17       |
| IOPS (above 3,000) | 5,000 IOPS  | $0.00488/IOPS/mo (2K) | $9.76        |
| Throughput (above 125 MB/s) | 200 MB/s | $0.02691/MBps/mo (75) | $20.11 |
| **Total**          |             |                       | **$44.04**   |

> Baseline included: 3,000 IOPS and 125 MB/s per disk at no extra charge. Only overages are billed.

#### Ultra Disk — Itemized Cost Breakdown

Ultra Disk charges per provisioned capacity, IOPS, and throughput:

| Component          | Provisioned  | Rate (East US 2)      | Monthly Cost |
| ------------------ | ------------ | --------------------- | ------------ |
| Capacity           | 256 GiB      | $0.000176/GiB/hr      | $32.87       |
| IOPS               | 10,000 IOPS  | $0.00046/IOPS/hr (×10K)| $33.58      |
| Throughput         | 400 MB/s     | $0.000843/MBps/hr (×400)| $24.62     |
| **Total**          |              |                       | **$91.07**   |

> **Critical**: Ultra Disk charges **do not stop** when the VM is deallocated. The disk must be **detached** to stop billing. Budget $91/mo for every month the Ultra Disk exists.

### 14.2 VM Compute Costs (Pay-as-you-go, Charged Only When Running)

| VM Name              | SKU             | vCPUs | RAM   | Hourly Rate | 80 hrs/mo  | 730 hrs/mo  |
| -------------------- | --------------- | ----- | ----- | ----------- | ---------- | ----------- |
| vm-diskmon-dsv5-01   | Standard_D4s_v5 | 4     | 16 GiB| $0.192      | $15.36     | $140.16     |
| vm-diskmon-dsv5-02   | Standard_D8s_v5 | 8     | 32 GiB| $0.384      | $30.72     | $280.32     |
| vm-diskmon-esv5-01   | Standard_E4s_v5 | 4     | 32 GiB| $0.252      | $20.16     | $183.96     |
| vm-diskmon-lsv3-01   | Standard_L8s_v3 | 8     | 64 GiB| $0.624      | $49.92     | $455.52     |
| vm-diskmon-dsv5-03   | Standard_D4s_v5 | 4     | 16 GiB| $0.192      | $15.36     | $140.16     |
| **VMs Subtotal**     |                 |       |       |             | **$131.52**| **$1,200.12**|

### 14.3 Other Services

| Resource                     | SKU / Tier              | Monthly Cost (USD) |
| ---------------------------- | ----------------------- | ------------------ |
| Log Analytics Workspace      | PerGB2018, 5 GB/day cap | ~$50 (usage-based) |
| Azure Managed Grafana        | Standard tier            | ~$9                |
| Azure Static Web App         | Standard tier            | ~$9                |
| Virtual Network              | (no charge)              | $0                 |
| Azure Monitor Agent          | (no charge)              | $0                 |
| Data Collection Rule         | (no charge)              | $0                 |
| **Services Subtotal**        |                         | **~$68/mo**        |

### 14.4 Total Cost Summary

| Scenario                          | Disks    | VMs      | Services | Total       |
| --------------------------------- | -------- | -------- | -------- | ----------- |
| **VMs deallocated** (idle month)  | $307.53  | $0       | $68      | **$375/mo** |
| **80 hrs active testing/month**   | $307.53  | $131.52  | $68      | **$507/mo** |
| **Always-on** (730 hrs/month)     | $307.53  | $1,200   | $68      | **$1,576/mo**|

### 14.5 Cost Optimization Recommendations

| Action                                          | Savings       | How                                                          |
| ----------------------------------------------- | ------------- | ------------------------------------------------------------ |
| Deallocate VMs when not testing                 | ~$1,200/mo    | `az vm deallocate -g rg-diskmon-poc-eastus2 -n <vm>`         |
| **Detach Ultra Disk** when not testing          | **$91/mo**    | `az vm disk detach -g rg-diskmon-poc-eastus2 --vm-name vm-diskmon-lsv3-01 -n disk-diskmon-lsv3-01-ultra-256` |
| Delete Ultra Disk entirely between test windows | $91/mo        | Recreate when needed with same parameters                    |
| Reduce PremiumV2 IOPS to 3,000 (free baseline) | $9.76/mo      | `az disk update --name disk-diskmon-esv5-01-premssdv2-256 --disk-iops-read-write 3000` |
| Reduce PremiumV2 throughput to 125 MB/s (free)  | $20.11/mo     | `az disk update --name disk-diskmon-esv5-01-premssdv2-256 --disk-mbps-read-write 125` |
| Set Log Analytics daily cap to 1 GB             | ~$30/mo       | Lower daily cap when not running benchmarks                  |
| **Maximum savings (idle state)**                | **~$1,351/mo**| All VMs off, Ultra detached, PremV2 at baseline              |

> **Prices are East US 2, Pay-as-you-go, as of March 2026. Actual costs may vary. Use the [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/) for exact quotes.**

---

## 15. Risks and Mitigations

| # | Risk                                                         | Likelihood | Impact | Mitigation                                                                    |
| - | ------------------------------------------------------------ | ---------- | ------ | ----------------------------------------------------------------------------- |
| 1 | SKU not available in selected region                         | Medium     | Medium | Check availability with `az vm list-skus --location eastus2` before deploy.   |
| 2 | Ultra Disk requires zone-specific deployment                 | High       | Low    | Pin Ultra Disk VMs to an availability zone that supports Ultra.               |
| 3 | Log Analytics ingestion lag > 5 minutes                      | Low        | Low    | Acceptable for POC. Use Metrics Explorer for near-real-time if needed.        |
| 4 | AMA agent fails to install on one OS                         | Low        | Medium | Test extension installation in isolation; fallback to manual install.         |
| 5 | Benchmark generates excessive ingestion cost                 | Medium     | Medium | Set daily cap; run benchmarks in controlled time windows.                     |
| 6 | Platform metrics not appearing in Log Analytics              | Medium     | Medium | Verify Diagnostic Settings are created and `AzureMetrics` table populates.    |

---

## 16. Deliverables

| #  | Deliverable                                  | Format / Location                                     |
| -- | -------------------------------------------- | ----------------------------------------------------- |
| D-1 | Architecture diagram                        | Embedded in this spec (§4) + draw.io source file       |
| D-2 | Infrastructure-as-Code (Bicep)              | `infra/` directory in repository                       |
| D-3 | Deployment script                           | `scripts/deploy.sh`, `scripts/teardown.sh`             |
| D-4 | FIO job files                               | `benchmarks/fio/` directory                            |
| D-5 | DiskSpd parameter files                     | `benchmarks/diskspd/` directory                        |
| D-6 | Benchmark orchestration script              | `scripts/run-benchmarks.sh`                            |
| D-7 | KQL query library                           | `queries/` directory (one `.kql` file per query)       |
| D-8 | Grafana dashboard JSON models               | `dashboards/` directory                                |
| D-9 | Azure Monitor Workbook JSON                 | `workbooks/` directory                                 |
| D-10 | Benchmark results report                   | `docs/benchmark-results.md`                            |
| D-11 | This specification document                 | `SPEC.md`                                              |

---

## 17. Implementation Phases

| Phase | Name                        | Duration  | Activities                                                                                     |
| ----- | --------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| 1     | **Foundation**              | 2 days    | Deploy VNet, Log Analytics, DCR, Grafana. Validate connectivity.                                |
| 2     | **VM Fleet**                | 2 days    | Deploy VMs with AMA. Attach managed disks. Verify metrics flowing to Log Analytics.             |
| 3     | **Benchmark Tooling**       | 1 day     | Install FIO/DiskSpd. Run quick smoke tests. Validate `DiskBenchmark_CL` ingestion.             |
| 4     | **Query Development**       | 2 days    | Write and test all KQL queries (Q-01 through Q-15, T-01 through T-04).                         |
| 5     | **Dashboard Build**         | 2 days    | Build Grafana dashboards and Workbook. Bind variables. Test with live data.                     |
| 6     | **Benchmark Execution**     | 2 days    | Run full benchmark suite across all VM/disk combos. Observe dashboards in real time.            |
| 7     | **Analysis & Documentation**| 1 day     | Document results. Capture screenshots. Write benchmark report. Finalize this spec.              |

**Total estimated**: ~12 working days

---

## Appendix A — VM and Disk Matrix

Cross-reference matrix showing which disk types are attached to which VMs.

| VM                     | Premium SSD P15 | Premium SSD P20 | Premium SSD v2 | Standard SSD E15 | Standard HDD S20 | Ultra Disk |
| ---------------------- | :-------------: | :-------------: | :------------: | :---------------: | :---------------: | :--------: |
| vm-diskmon-dsv5-01     | ●               |                 |                | ●                 |                   |            |
| vm-diskmon-dsv5-02     |                 | ●               |                |                   | ●                 |            |
| vm-diskmon-esv5-01     |                 |                 | ●              |                   |                   |            |
| vm-diskmon-lsv3-01     | ●               |                 |                |                   |                   | ●          |
| vm-diskmon-dsv5-03 (Win)|●               |                 |                |                   |                   |            |

---

## Appendix B — FIO Job Profiles

### B.1 Sequential Read — 1 MiB Block

```ini
; File: benchmarks/fio/seq-read-1m.fio
[global]
ioengine=libaio
direct=1
bs=1M
iodepth=32
runtime=120
time_based
group_reporting
numjobs=4

[seq-read]
rw=read
filename=/dev/sdc
size=10G
```

### B.2 Random Read — 4 KiB Block (IOPS test)

```ini
; File: benchmarks/fio/rand-read-4k.fio
[global]
ioengine=libaio
direct=1
bs=4K
iodepth=64
runtime=120
time_based
group_reporting
numjobs=4

[rand-read]
rw=randread
filename=/dev/sdc
size=10G
```

### B.3 Random Read/Write — 70/30 Mix

```ini
; File: benchmarks/fio/rand-rw-4k-70-30.fio
[global]
ioengine=libaio
direct=1
bs=4K
iodepth=32
runtime=120
time_based
group_reporting
numjobs=4

[rand-rw]
rw=randrw
rwmixread=70
filename=/dev/sdc
size=10G
```

### B.4 Latency Probe — Low Queue Depth

```ini
; File: benchmarks/fio/lat-probe-4k.fio
[global]
ioengine=libaio
direct=1
bs=4K
iodepth=1
runtime=60
time_based
group_reporting
numjobs=1

[lat-probe]
rw=randread
filename=/dev/sdc
size=10G
```

### B.5 Queue Depth Ramp

```ini
; File: benchmarks/fio/qd-ramp.fio
[global]
ioengine=libaio
direct=1
bs=4K
runtime=60
time_based
group_reporting
filename=/dev/sdc
size=10G

[qd-1]
rw=randread
iodepth=1

[qd-4]
rw=randread
iodepth=4
startdelay=60

[qd-16]
rw=randread
iodepth=16
startdelay=120

[qd-64]
rw=randread
iodepth=64
startdelay=180

[qd-128]
rw=randread
iodepth=128
startdelay=240
```

---

## Appendix C — KQL Query Library

### Q-01: Disk Inventory — All VMs and Disks

```kusto
// Lists all VMs with their attached disk instances reporting metrics
Perf
| where TimeGenerated > ago(1h)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Disk Transfers/sec"
| where InstanceName !in ("_Total", "/", "C:")
| summarize LastSeen = max(TimeGenerated) by Computer, InstanceName
| join kind=leftouter (
    Heartbeat
    | where TimeGenerated > ago(1h)
    | summarize arg_max(TimeGenerated, *) by Computer
    | project Computer, OSType, ResourceGroup
) on Computer
| project Computer, OSType, ResourceGroup, DiskInstance = InstanceName, LastSeen
| order by Computer asc, DiskInstance asc
```

### Q-02: Current IOPS by VM and Disk

```kusto
let timeRange = 1h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Disk Transfers/sec"
| where InstanceName !in ("_Total", "/")
| summarize AvgIOPS = avg(CounterValue), MaxIOPS = max(CounterValue)
    by Computer, InstanceName
| order by AvgIOPS desc
```

### Q-03: Current Throughput (MB/s) by VM and Disk

```kusto
let timeRange = 1h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Disk Bytes/sec"
| where InstanceName !in ("_Total", "/")
| summarize AvgThroughputMBs = avg(CounterValue) / 1048576,
            MaxThroughputMBs = max(CounterValue) / 1048576
    by Computer, InstanceName
| order by AvgThroughputMBs desc
```

### Q-04: Average Read/Write Latency by VM and Disk

```kusto
let timeRange = 1h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName in ("Avg. Disk sec/Read", "Avg. Disk sec/Write")
| where InstanceName !in ("_Total", "/")
| summarize AvgLatencyMs = avg(CounterValue) * 1000 by Computer, InstanceName, CounterName
| evaluate pivot(CounterName, take_any(AvgLatencyMs))
| project Computer, InstanceName,
    ReadLatencyMs = column_ifexists("Avg. Disk sec/Read", 0.0),
    WriteLatencyMs = column_ifexists("Avg. Disk sec/Write", 0.0)
| order by ReadLatencyMs desc
```

### Q-05: Queue Depth Over Time

```kusto
let timeRange = 1h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Current Disk Queue Length"
| where InstanceName !in ("_Total", "/")
| summarize AvgQueueDepth = avg(CounterValue) by bin(TimeGenerated, 1m), Computer, InstanceName
| order by TimeGenerated asc
```

### Q-06: Top 10 Disks by IOPS

```kusto
let timeRange = 1h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Disk Transfers/sec"
| where InstanceName !in ("_Total", "/")
| summarize AvgIOPS = avg(CounterValue) by Computer, InstanceName
| top 10 by AvgIOPS desc
```

### Q-07: Top 10 Disks by Latency

```kusto
let timeRange = 1h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName in ("Avg. Disk sec/Read", "Avg. Disk sec/Write")
| where InstanceName !in ("_Total", "/")
| summarize AvgLatencyMs = avg(CounterValue) * 1000 by Computer, InstanceName
| top 10 by AvgLatencyMs desc
```

### Q-08: Disk Capacity Utilization

```kusto
let timeRange = 1h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "% Used Space"
| where InstanceName !in ("_Total", "/")
| summarize AvgUsedPct = avg(CounterValue) by Computer, InstanceName
| order by AvgUsedPct desc
```

### Q-09: VM Family Performance Comparison

```kusto
// Requires Heartbeat or a static lookup for VM SKU
let VMSkuLookup = datatable(Computer: string, VMSku: string, VMFamily: string) [
    "vm-diskmon-dsv5-01", "Standard_D4s_v5", "D-series",
    "vm-diskmon-dsv5-02", "Standard_D8s_v5", "D-series",
    "vm-diskmon-esv5-01", "Standard_E4s_v5", "E-series",
    "vm-diskmon-lsv3-01", "Standard_L8s_v3", "L-series",
    "vm-diskmon-dsv5-03", "Standard_D4s_v5", "D-series"
];
let timeRange = 1h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Disk Transfers/sec"
| where InstanceName !in ("_Total", "/")
| summarize AvgIOPS = avg(CounterValue), MaxIOPS = max(CounterValue)
    by Computer, InstanceName
| join kind=inner VMSkuLookup on Computer
| project VMFamily, VMSku, Computer, InstanceName, AvgIOPS, MaxIOPS
| order by VMFamily asc, AvgIOPS desc
```

### Q-10: Disk Type Performance Comparison

```kusto
// Correlate with benchmark metadata for disk type
let timeRange = 1h;
DiskBenchmark_CL
| where TimeGenerated > ago(timeRange)
| where Status_s == "completed"
| distinct VMName_s, DiskName_s, DiskType_s
| join kind=inner (
    Perf
    | where TimeGenerated > ago(timeRange)
    | where ObjectName in ("Logical Disk", "LogicalDisk")
    | where CounterName == "Disk Transfers/sec"
    | where InstanceName !in ("_Total", "/")
    | summarize AvgIOPS = avg(CounterValue) by Computer, InstanceName
) on $left.VMName_s == $right.Computer
| summarize AvgIOPS = avg(AvgIOPS) by DiskType_s
| order by AvgIOPS desc
```

### Q-11: IOPS Consumed Percentage (Platform Metrics)

```kusto
AzureMetrics
| where TimeGenerated > ago(1h)
| where MetricName in (
    "Data Disk IOPS Consumed Percentage",
    "VM Uncached IOPS Consumed Percentage"
)
| summarize AvgConsumedPct = avg(Average) by bin(TimeGenerated, 5m), Resource, MetricName
| order by TimeGenerated asc
```

### Q-12: Bandwidth Consumed Percentage (Platform Metrics)

```kusto
AzureMetrics
| where TimeGenerated > ago(1h)
| where MetricName in (
    "Data Disk Bandwidth Consumed Percentage",
    "VM Uncached Bandwidth Consumed Percentage"
)
| summarize AvgConsumedPct = avg(Average) by bin(TimeGenerated, 5m), Resource, MetricName
| order by TimeGenerated asc
```

### Q-13: Benchmark Run Overlay

```kusto
// Overlay IOPS time series with benchmark run start/end markers
let benchRuns = DiskBenchmark_CL
| where TimeGenerated > ago(24h)
| project RunStart = TimeGenerated, VMName_s, ProfileName_s, DurationSec_d,
          RunEnd = datetime_add('second', toint(DurationSec_d), TimeGenerated);
let iopsSeries = Perf
| where TimeGenerated > ago(24h)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Disk Transfers/sec"
| where InstanceName !in ("_Total", "/")
| summarize AvgIOPS = avg(CounterValue) by bin(TimeGenerated, 1m), Computer, InstanceName;
iopsSeries
| join kind=leftouter (
    benchRuns
    | mv-expand TimeGenerated = range(RunStart, RunEnd, 1m) to typeof(datetime)
    | project TimeGenerated, Computer = VMName_s, BenchmarkProfile = ProfileName_s
) on TimeGenerated, Computer
| project TimeGenerated, Computer, InstanceName, AvgIOPS, BenchmarkProfile
| order by TimeGenerated asc
```

### Q-14: Latency Percentiles (p50, p95, p99)

```kusto
let timeRange = 1h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName in ("Avg. Disk sec/Read", "Avg. Disk sec/Write")
| where InstanceName !in ("_Total", "/")
| summarize p50 = percentile(CounterValue * 1000, 50),
            p95 = percentile(CounterValue * 1000, 95),
            p99 = percentile(CounterValue * 1000, 99)
    by Computer, InstanceName, CounterName
| order by p99 desc
```

### Q-15: Time Series — Throughput Trend by Disk Type

```kusto
let DiskTypeLookup = datatable(Computer: string, InstanceName: string, DiskType: string) [
    "vm-diskmon-dsv5-01", "sdc", "PremiumSSD",
    "vm-diskmon-dsv5-01", "sdd", "StandardSSD",
    "vm-diskmon-dsv5-02", "sdc", "PremiumSSD",
    "vm-diskmon-dsv5-02", "sdd", "StandardHDD",
    "vm-diskmon-esv5-01", "sdc", "PremiumSSDv2",
    "vm-diskmon-lsv3-01", "sdc", "UltraDisk",
    "vm-diskmon-lsv3-01", "sdd", "PremiumSSD"
];
let timeRange = 24h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Disk Bytes/sec"
| where InstanceName !in ("_Total", "/")
| join kind=inner DiskTypeLookup on Computer, InstanceName
| summarize AvgThroughputMBs = avg(CounterValue) / 1048576 by bin(TimeGenerated, 5m), DiskType
| order by TimeGenerated asc
```

### T-01: Sustained High Throughput Windows

```kusto
let timeRange = 24h;
let thresholdPct = 0.80;
let provisionedMBs = 125.0; // adjust per disk
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Disk Bytes/sec"
| where InstanceName !in ("_Total", "/")
| summarize AvgThroughputMBs = avg(CounterValue) / 1048576
    by bin(TimeGenerated, 5m), Computer, InstanceName
| where AvgThroughputMBs > provisionedMBs * thresholdPct
| order by TimeGenerated asc
```

### T-02: Latency Spikes

```kusto
let timeRange = 24h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName in ("Avg. Disk sec/Read", "Avg. Disk sec/Write")
| where InstanceName !in ("_Total", "/")
| summarize AvgLatencyMs = avg(CounterValue) * 1000
    by bin(TimeGenerated, 5m), Computer, InstanceName
| order by TimeGenerated asc
| serialize
| extend RollingAvg = avg_of(AvgLatencyMs, prev(AvgLatencyMs, 1), prev(AvgLatencyMs, 2),
                              prev(AvgLatencyMs, 3), prev(AvgLatencyMs, 4), prev(AvgLatencyMs, 5),
                              prev(AvgLatencyMs, 6), prev(AvgLatencyMs, 7), prev(AvgLatencyMs, 8),
                              prev(AvgLatencyMs, 9), prev(AvgLatencyMs, 10), prev(AvgLatencyMs, 11))
| where AvgLatencyMs > RollingAvg * 2
| project TimeGenerated, Computer, InstanceName, AvgLatencyMs, RollingAvg
```

### T-03: IOPS Plateau Detection

```kusto
let timeRange = 24h;
Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Disk Transfers/sec"
| where InstanceName !in ("_Total", "/")
| summarize AvgIOPS = avg(CounterValue) by bin(TimeGenerated, 5m), Computer, InstanceName
| order by Computer, InstanceName, TimeGenerated asc
| serialize
| extend Diff = abs(AvgIOPS - prev(AvgIOPS, 1))
| where Diff < AvgIOPS * 0.02 and AvgIOPS > 500  // <2% change and meaningful IOPS
| project TimeGenerated, Computer, InstanceName, AvgIOPS, Diff
```

### T-04: Queue Depth Buildup Correlation with Latency

```kusto
let timeRange = 1h;
let queueDepth = Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName == "Current Disk Queue Length"
| where InstanceName !in ("_Total", "/")
| summarize AvgQueueDepth = avg(CounterValue)
    by bin(TimeGenerated, 1m), Computer, InstanceName;
let latency = Perf
| where TimeGenerated > ago(timeRange)
| where ObjectName in ("Logical Disk", "LogicalDisk")
| where CounterName in ("Avg. Disk sec/Read", "Avg. Disk sec/Write")
| where InstanceName !in ("_Total", "/")
| summarize AvgLatencyMs = avg(CounterValue) * 1000
    by bin(TimeGenerated, 1m), Computer, InstanceName;
queueDepth
| join kind=inner latency on TimeGenerated, Computer, InstanceName
| project TimeGenerated, Computer, InstanceName, AvgQueueDepth, AvgLatencyMs
| order by TimeGenerated asc
```

---

## Appendix D — Glossary

| Term              | Definition                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| **AMA**           | Azure Monitor Agent — the current-generation agent for collecting VM telemetry.                     |
| **DCR**           | Data Collection Rule — defines what data AMA collects and where it sends it.                        |
| **FIO**           | Flexible I/O Tester — open-source Linux I/O benchmarking tool.                                     |
| **DiskSpd**       | Microsoft disk I/O benchmarking tool for Windows.                                                   |
| **IOPS**          | Input/Output Operations Per Second — a measure of storage transaction rate.                         |
| **Throughput**    | The rate of data transfer, typically measured in MB/s.                                               |
| **Latency**       | The time taken to complete a single I/O operation, measured in milliseconds.                        |
| **Queue Depth**   | The number of I/O operations pending in the storage queue.                                          |
| **KQL**           | Kusto Query Language — the query language used by Log Analytics.                                    |
| **Platform Metrics** | Metrics emitted by Azure infrastructure, not requiring a guest agent.                            |
| **Guest Metrics** | Metrics collected by an agent running inside the VM OS.                                             |
| **Premium SSD v2**| Azure managed disk with independently configurable IOPS, throughput, and capacity.                  |
| **Ultra Disk**    | Azure's highest-performance managed disk tier with sub-millisecond latency.                         |

---

*End of Specification*
