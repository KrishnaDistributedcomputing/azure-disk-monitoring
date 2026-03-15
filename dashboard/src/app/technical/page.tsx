'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

// ============================================================================
// LIVE AZURE PRICING — Fetched from Azure Retail Prices API (East US 2)
// API: https://prices.azure.com/api/retail/prices
// Last updated: 2026-03-12
// ============================================================================
const LIVE_PRICING = {
  fetchedAt: '2026-03-12T00:00:00Z',
  region: 'eastus2',
  currencyCode: 'USD',
  source: 'Azure Retail Prices API (https://prices.azure.com/api/retail/prices)',
  premiumSsd: {
    P10: { sizeGb: 128, iops: 500, throughputMBs: 100, monthlyUsd: 9.86, burstIops: 3500, burstThroughput: 170 },
    P15: { sizeGb: 256, iops: 1100, throughputMBs: 125, monthlyUsd: 19.71, burstIops: 3500, burstThroughput: 170 },
    P20: { sizeGb: 512, iops: 2300, throughputMBs: 150, monthlyUsd: 38.41, burstIops: 3500, burstThroughput: 170 },
    P30: { sizeGb: 1024, iops: 5000, throughputMBs: 200, monthlyUsd: 76.80, burstIops: 30000, burstThroughput: 1000 },
    P40: { sizeGb: 2048, iops: 7500, throughputMBs: 250, monthlyUsd: 147.46, burstIops: 30000, burstThroughput: 1000 },
    P50: { sizeGb: 4096, iops: 7500, throughputMBs: 250, monthlyUsd: 294.91, burstIops: 30000, burstThroughput: 1000 },
  },
  standardSsd: {
    E10: { sizeGb: 128, iops: 500, throughputMBs: 60, monthlyUsd: 3.84 },
    E15: { sizeGb: 256, iops: 500, throughputMBs: 60, monthlyUsd: 7.68 },
    E20: { sizeGb: 512, iops: 500, throughputMBs: 60, monthlyUsd: 15.36 },
    E30: { sizeGb: 1024, iops: 500, throughputMBs: 60, monthlyUsd: 30.72 },
  },
  standardHdd: {
    S10: { sizeGb: 128, iops: 500, throughputMBs: 60, monthlyUsd: 1.54 },
    S15: { sizeGb: 256, iops: 500, throughputMBs: 60, monthlyUsd: 2.87 },
    S20: { sizeGb: 512, iops: 500, throughputMBs: 60, monthlyUsd: 5.89 },
    S30: { sizeGb: 1024, iops: 500, throughputMBs: 60, monthlyUsd: 11.26 },
  },
  ultraDisk: {
    capacityPerGibPerHour: 0.000164,
    iopsPerIopsPerHour: 0.000068,
    throughputPerMbpsPerHour: 0.000479,
  },
  premiumSsdV2: {
    capacityPerGibPerMonth: 0.0554,
    baselineIops: 3000,
    iopsPerIopsPerMonth: 0.00488,
    baselineThroughputMBs: 125,
    throughputPerMbpsPerMonth: 0.0269,
  },
  vms: {
    Standard_D4s_v5: { vcpus: 4, ramGb: 16, perHour: 0.192, maxDiskIops: 6400, maxDiskMBs: 200 },
    Standard_D8s_v5: { vcpus: 8, ramGb: 32, perHour: 0.384, maxDiskIops: 12800, maxDiskMBs: 400 },
    Standard_E4s_v5: { vcpus: 4, ramGb: 32, perHour: 0.252, maxDiskIops: 6400, maxDiskMBs: 200 },
    Standard_L8s_v3: { vcpus: 8, ramGb: 64, perHour: 0.624, maxDiskIops: 400000, maxDiskMBs: 2000 },
  },
};

// ============================================================================
// Mermaid Diagram Component (inline, loads from CDN)
// ============================================================================
function MermaidBlock() {
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
    m.initialize({ startOnLoad: false, theme: 'dark',
      themeVariables: { darkMode: true, background: '#0f172a', primaryColor: '#1e40af', primaryTextColor: '#e2e8f0', primaryBorderColor: '#3b82f6', lineColor: '#64748b', secondaryColor: '#1e293b', tertiaryColor: '#334155', mainBkg: '#1e293b', clusterBkg: '#111827', clusterBorder: '#374151', nodeTextColor: '#e2e8f0', fontFamily: 'system-ui,sans-serif', fontSize: '12px' },
      flowchart: { curve: 'basis', padding: 15, htmlLabels: true, useMaxWidth: true }, securityLevel: 'loose' });
    const chart = `graph TB
  subgraph SUB["Azure Subscription e62428e7-..."]
    subgraph RG["rg-diskmon-poc-eastus2"]
      subgraph VMS["Virtual Machines"]
        VM1["D4s_v5 Linux<br/>3 disks • FIO"]
        VM2["D8s_v5 Linux<br/>3 disks • FIO"]
        VM3["E4s_v5 Linux<br/>2 disks • FIO"]
        VM4["L8s_v3 Linux<br/>3 disks • FIO"]
        VM5["D4s_v5 Windows<br/>2 disks • DiskSpd"]
      end
      subgraph DISKS["Managed Disks — 5 Types"]
        D1["Premium SSD<br/>P10, P15, P20"]
        D2["Premium SSD v2<br/>Custom IOPS"]
        D3["Standard SSD<br/>E15"]
        D4["Standard HDD<br/>S20"]
        D5["Ultra Disk<br/>10K IOPS"]
      end
      AMA["Azure Monitor Agent<br/>29 perf counters @ 60s"]
      DCR["Data Collection Rule<br/>dcr-diskmon-perf-poc"]
      DIAG["Diagnostic Settings<br/>42 platform metrics"]
      LAW["Log Analytics Workspace<br/>law-diskmon-poc-eastus2<br/>Perf • AzureMetrics • Heartbeat"]
    end
    subgraph VIZ["Visualization Layer"]
      SWA["Next.js Dashboard<br/>Azure Static Web Apps<br/>4 pages • Recharts"]
      GRAF["Azure Managed Grafana<br/>grafana-diskmon-poc"]
      KQL["KQL Query Library<br/>15+ queries"]
    end
  end
  VMS --> AMA
  AMA --> DCR
  DCR -->|Guest Metrics| LAW
  VMS --> DIAG
  DIAG -->|Platform Metrics| LAW
  LAW --> SWA
  LAW --> GRAF
  LAW --> KQL
  DISKS -.->|attached to| VMS
  style SUB fill:#0c1222,stroke:#1e3a5f
  style RG fill:#0f172a,stroke:#334155
  style VMS fill:#111827,stroke:#1e40af
  style DISKS fill:#111827,stroke:#7c3aed
  style VIZ fill:#111827,stroke:#059669
  style LAW fill:#1e293b,stroke:#f59e0b
  style AMA fill:#1e293b,stroke:#3b82f6
  style DCR fill:#1e293b,stroke:#3b82f6
  style DIAG fill:#1e293b,stroke:#f59e0b
  style SWA fill:#1e293b,stroke:#22c55e
  style GRAF fill:#1e293b,stroke:#22c55e
  style KQL fill:#1e293b,stroke:#22c55e`;
    const uid = 'arch-' + Date.now();
    m.render(uid, chart).then(({ svg }: { svg: string }) => {
      if (ref.current) { ref.current.innerHTML = svg; const el = ref.current.querySelector('svg'); if (el) { el.style.maxWidth = '100%'; el.style.height = 'auto'; } }
    }).catch(() => { if (ref.current) ref.current.innerHTML = '<pre style="color:#94a3b8;font-size:11px">Diagram failed to render</pre>'; });
  }, [ready]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 overflow-x-auto">
      {!ready && <div className="text-sm text-slate-500 py-8 text-center">Loading Mermaid diagram...</div>}
      <div ref={ref} />
    </div>
  );
}

// ============================================================================
// Page sections & data
// ============================================================================
type Section = 'architecture' | 'metrics' | 'pricing' | 'technology' | 'data-flow' | 'benchmarks';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'architecture', label: 'Architecture' },
  { key: 'data-flow', label: 'Data Flow' },
  { key: 'metrics', label: 'Metrics Catalog' },
  { key: 'pricing', label: 'Live Pricing' },
  { key: 'technology', label: 'Technology Stack' },
  { key: 'benchmarks', label: 'Benchmarks' },
];

const ALL_METRICS = [
  // Platform metrics
  { name: 'Data Disk Read Bytes/sec', source: 'Platform', category: 'Throughput', unit: 'Bytes/sec', description: 'Bytes read from data disks per second', dashboard: 'Throughput tab, time series chart', costRelevance: 'Bandwidth consumed % → right-size throughput provisioning', plainEnglish: 'This tells you how fast data is being read from your disk, measured in bytes per second. Think of it like the download speed from your disk. If this number is consistently close to your disk\'s maximum throughput, your applications may be waiting for data, which slows them down. For most workloads, you want this well below the disk\'s limit to have headroom for spikes.' },
  { name: 'Data Disk Write Bytes/sec', source: 'Platform', category: 'Throughput', unit: 'Bytes/sec', description: 'Bytes written to data disks per second', dashboard: 'Throughput tab, time series chart', costRelevance: 'Same as above', plainEnglish: 'This measures how fast data is being written to your disk. Critical for databases that write transaction logs, applications saving files, or backup processes. If write throughput is consistently near the disk\'s maximum, writes will queue up and your application will feel sluggish. For PremSSD v2, you can increase throughput independently — but each extra MB/s costs $0.027/month.' },
  { name: 'Data Disk Read Operations/sec', source: 'Platform', category: 'IOPS', unit: 'Count/sec', description: 'Read operations per second on data disks', dashboard: 'IOPS tab, VM comparison chart', costRelevance: 'IOPS consumed % → right-size disk tier', plainEnglish: 'This counts how many individual read requests your disk handles every second. Each time your application reads a database record, opens a config file, or loads a web page asset, that\'s one read operation. Databases typically generate thousands of these per second. If your disk is hitting its IOPS limit, additional reads get queued and your application responds slower.' },
  { name: 'Data Disk Write Operations/sec', source: 'Platform', category: 'IOPS', unit: 'Count/sec', description: 'Write operations per second on data disks', dashboard: 'IOPS tab, VM comparison chart', costRelevance: 'IOPS consumed % → right-size disk tier', plainEnglish: 'This counts write requests per second — every database commit, log entry, or file save. Write operations are generally more expensive (in terms of latency) than reads. If your application is write-heavy (like a transaction processing system), this metric determines which disk tier you need. A Standard HDD handles 500 write ops/sec while an Ultra Disk handles 160,000.' },
  { name: 'Data Disk Queue Depth', source: 'Platform', category: 'Saturation', unit: 'Count', description: 'Number of pending I/O operations on data disks', dashboard: 'Queue Depth tab, time series', costRelevance: 'High QD → upgrade signal → cost increase', plainEnglish: 'Imagine a checkout line at a grocery store. Queue depth is the number of I/O requests waiting in line to be processed by your disk. A short queue (under 4) means the disk is handling requests easily. A long queue (over 32) means requests are piling up faster than the disk can process them — your applications are waiting. This is the earliest warning sign that you need a faster disk.' },
  { name: 'Data Disk Latency', source: 'Platform', category: 'Latency', unit: 'ms', description: 'Average latency per operation on data disks', dashboard: 'Latency tab, percentile chart', costRelevance: 'High latency → tier upgrade needed', plainEnglish: 'Latency is how long each disk operation takes to complete, measured in milliseconds. This is what users actually feel — a 2ms latency means your database query gets its data in 2 thousandths of a second. A 15ms latency (Standard HDD) means the same query takes 7.5× longer. For user-facing applications, every millisecond matters. Ultra Disk delivers under 0.5ms; Standard HDD averages 10-15ms.' },
  { name: 'Data Disk IOPS Consumed %', source: 'Platform', category: 'Saturation', unit: '%', description: 'Percentage of provisioned IOPS being consumed', dashboard: 'Monitor → disk gauge', costRelevance: '<50% = over-provisioned = wasted spend', plainEnglish: 'This is the single most important metric for cost optimization. It shows what percentage of your paid-for IOPS you are actually using. If your P20 disk (2,300 IOPS, $38/mo) consistently shows only 30% consumed, you\'re using only 690 IOPS — a P10 disk (500 IOPS, $9.86/mo) might be sufficient. Monitoring this metric across all disks is how you find and eliminate wasted spend.' },
  { name: 'Data Disk Bandwidth Consumed %', source: 'Platform', category: 'Saturation', unit: '%', description: 'Percentage of provisioned throughput consumed', dashboard: 'Monitor → disk progress bar', costRelevance: '<50% = reduce PremV2 throughput → save $/mo', plainEnglish: 'Similar to IOPS Consumed %, but for throughput (MB/s). If your PremSSD v2 disk is provisioned at 200 MB/s but this metric shows only 25% consumed, you\'re using just 50 MB/s. Reducing to the free baseline of 125 MB/s would save $20/mo with no performance impact. This metric only matters for PremSSD v2 and Ultra Disk where throughput is independently billed.' },
  { name: 'VM Uncached IOPS Consumed %', source: 'Platform', category: 'Saturation', unit: '%', description: 'How much of the VM-level IOPS cap is used', dashboard: 'Monitor → VM gauge', costRelevance: '>85% = VM bottleneck → larger VM needed', plainEnglish: 'Your VM has its own IOPS limit that applies across ALL attached disks combined. A D4s_v5 VM caps at 6,400 total IOPS regardless of how many disks you attach. If this metric exceeds 85%, the VM itself is the bottleneck — not the disks. Adding faster disks won\'t help; you need a larger VM (which costs more). This prevents you from wasting money on expensive disks when the VM is the real constraint.' },
  { name: 'VM Uncached BW Consumed %', source: 'Platform', category: 'Saturation', unit: '%', description: 'How much of the VM-level throughput cap is used', dashboard: 'Monitor → VM gauge', costRelevance: '>85% = VM bottleneck → larger VM needed', plainEnglish: 'Same concept as VM IOPS Consumed %, but for throughput. A D4s_v5 caps at 200 MB/s total disk throughput. If you\'re running backup jobs that saturate this, no disk upgrade will help. You need a D8s_v5 (400 MB/s cap) or L8s_v3 (2,000 MB/s cap). This metric prevents the common mistake of buying an Ultra Disk (400 MB/s) on a VM that only allows 200 MB/s — you\'d pay for 200 MB/s you can\'t use.' },
  { name: 'OS Disk Read/Write Bytes/sec', source: 'Platform', category: 'Throughput', unit: 'Bytes/sec', description: 'Throughput on the OS disk', dashboard: 'Monitor → disk detail', costRelevance: 'Usually low — P10 ($9.86/mo) is sufficient', plainEnglish: 'The OS disk stores your operating system (Windows or Linux). It sees activity during boot, OS updates, and log file writes, but for most workloads it\'s lightly used. A P10 Premium SSD ($9.86/mo) is almost always sufficient. This metric helps verify that assumption — if OS disk throughput is consistently low, there\'s no reason to spend more on a larger OS disk tier.' },
  { name: 'OS Disk Queue Depth', source: 'Platform', category: 'Saturation', unit: 'Count', description: 'Queue depth on OS disk', dashboard: 'Monitor → disk detail', costRelevance: 'High OS QD → slow VM boot/login', plainEnglish: 'If the OS disk queue depth is high, your VM will feel slow to boot, log into, and perform basic OS tasks. This is rare with Premium SSD but can happen if the OS disk is also being used for application data (which is not recommended). The fix is to move application workloads to a dedicated data disk, keeping the OS disk for operating system use only.' },
  { name: 'Premium SSD Burst IO Credits', source: 'Platform', category: 'Burst', unit: 'Credits', description: 'Remaining burst IOPS credits (P10-P20 only)', dashboard: 'Monitor → disk burst gauge', costRelevance: 'Free performance — use before upgrading tier', plainEnglish: 'Premium SSD disks (P10-P20) can temporarily burst above their baseline IOPS during quiet periods by accumulating credits — like a savings account for performance. A P15 normally does 1,100 IOPS but can burst to 3,500 IOPS using credits. This burst is completely free. If this metric stays high (credits never depleted), it means your workload fits within the smaller tier. If credits are frequently exhausted, you either need a larger tier or should switch to PremSSD v2.' },
  { name: 'Premium SSD Burst BPS Credits', source: 'Platform', category: 'Burst', unit: 'Credits', description: 'Remaining burst throughput credits', dashboard: 'Monitor → disk burst gauge', costRelevance: 'Free throughput — avoids tier upgrade', plainEnglish: 'Same concept as burst IOPS credits, but for throughput (MB/s). A P15 normally delivers 125 MB/s but can burst to 170 MB/s. If your backup job occasionally needs 170 MB/s for 30 minutes, burst credits handle it for free instead of you paying for a P20 tier ($38/mo vs $20/mo). Monitor this to decide whether burst is sufficient or a permanent upgrade is warranted.' },
  // Guest metrics (AMA via DCR)
  { name: 'Disk Transfers/sec', source: 'AMA (Guest)', category: 'IOPS', unit: 'ops/sec', description: 'Total read+write operations per second per disk instance', dashboard: 'IOPS tab, inventory table', costRelevance: 'Maps to IOPS consumed; right-size provisioning', plainEnglish: 'This is the guest OS view of total IOPS — reads plus writes combined — for each individual disk partition or volume. Unlike the platform metric that shows the whole disk, this shows per-partition detail (e.g., /data vs /logs on Linux, or D: vs E: on Windows). Use this to identify which specific volume is generating the most I/O, which helps you decide where to focus optimization efforts.' },
  { name: 'Disk Bytes/sec', source: 'AMA (Guest)', category: 'Throughput', unit: 'Bytes/sec', description: 'Total combined throughput per disk instance', dashboard: 'Throughput tab, inventory table', costRelevance: 'Maps to bandwidth consumed', plainEnglish: 'The total data transfer rate per disk volume as seen by the operating system. This combines reads and writes into one throughput number. Useful for identifying which volumes are doing the most data movement — for example, a database data volume might show high throughput during ETL jobs while the log volume stays quiet. This helps you place different workloads on appropriately-sized disks.' },
  { name: 'Avg. Disk sec/Read', source: 'AMA (Guest)', category: 'Latency', unit: 'seconds', description: 'Average time per read operation (×1000 for ms)', dashboard: 'Latency tab, percentile chart', costRelevance: 'Latency drives tier selection', plainEnglish: 'The average time the operating system waits for each read operation to complete, measured in seconds (multiply by 1,000 to get milliseconds). A value of 0.002 means 2 milliseconds per read — normal for Premium SSD. A value of 0.015 means 15ms — typical for Standard HDD and painfully slow for interactive applications. This is the metric that most directly impacts end-user experience for read-heavy applications like web servers and reporting tools.' },
  { name: 'Avg. Disk sec/Write', source: 'AMA (Guest)', category: 'Latency', unit: 'seconds', description: 'Average time per write operation', dashboard: 'Latency tab, percentile chart', costRelevance: 'Write latency critical for DB workloads', plainEnglish: 'The average time for each write operation. Write latency is especially critical for database workloads because every transaction commit must wait for the write to complete before acknowledging to the user. A SQL Server database on a disk with 10ms write latency will process transactions much slower than one on a disk with 1ms write latency. This single metric often determines whether you need Premium SSD, PremSSD v2, or Ultra Disk for your database tier.' },
  { name: 'Current Disk Queue Length', source: 'AMA (Guest)', category: 'Saturation', unit: 'Count', description: 'Instantaneous queue depth at sample time', dashboard: 'Queue Depth tab', costRelevance: 'Sustained >32 = upgrade needed', plainEnglish: 'The number of I/O requests waiting to be processed at the exact moment the sample was taken. Unlike the platform metric which shows an average, this captures the instantaneous snapshot. If you see this consistently above 32, the disk is a bottleneck — I/O requests are accumulating faster than the disk can handle them. The fix is either upgrading the disk tier, adding a second disk with striping, or moving workloads to a faster disk type.' },
  { name: '% Used Space', source: 'AMA (Guest)', category: 'Capacity', unit: '%', description: 'Percentage of disk space consumed', dashboard: 'Capacity tab, gauge cards', costRelevance: 'Overprov: paying for unused GiB', plainEnglish: 'How full the disk is, as a percentage. Azure charges for the full provisioned size regardless of how much data you store — a 512 GiB disk costs the same whether you use 10 GiB or 500 GiB. If a disk is only 20% full, you may be over-provisioned. However, with Premium SSD, larger disks also provide more IOPS, so sometimes you buy a bigger disk for performance, not capacity. PremSSD v2 solves this by charging for capacity and IOPS separately.' },
  { name: 'Free Megabytes', source: 'AMA (Guest)', category: 'Capacity', unit: 'MB', description: 'Absolute free space remaining', dashboard: 'Capacity tab, inventory', costRelevance: 'Plan growth vs emergency upsizing', plainEnglish: 'The actual amount of free space remaining in megabytes. While percentage is useful for small disks, absolute numbers matter more for large ones — 10% free on a 4 TiB disk is still 400 GB, which is plenty. But 10% free on a 128 GiB disk is only 12.8 GB, which can fill up quickly. Use this alongside the percentage to make informed decisions about when to expand, and plan ahead rather than doing emergency upsizes (which can cause downtime).' },
  { name: '% Free Inodes', source: 'AMA (Guest)', category: 'Capacity', unit: '%', description: 'Inode utilization on Linux (can fill with space remaining)', dashboard: 'Not shown by default', costRelevance: 'Inode exhaustion → app failures', plainEnglish: 'Linux-specific metric. Every file and directory uses an inode (an index entry). A disk can run out of inodes while still having free space — this happens when you have millions of tiny files (like email systems or container image layers). When inodes are exhausted, the OS cannot create new files even though disk space is available. This causes mysterious application failures. Not common, but devastating when it happens.' },
  { name: 'Disk Reads/sec', source: 'AMA (Guest)', category: 'IOPS', unit: 'ops/sec', description: 'Read operations per second per disk instance', dashboard: 'IOPS tab breakdown', costRelevance: 'Read-heavy → caching optimization', plainEnglish: 'Read operations per second for each disk volume. When this is high relative to writes, your workload is read-heavy — common for web servers, reporting databases, and file servers. Read-heavy workloads benefit significantly from Azure\'s disk caching feature (set to ReadOnly). Caching stores frequently-read data in the VM\'s local memory, reducing the number of reads that actually hit the disk and dramatically improving performance at no extra cost.' },
  { name: 'Disk Writes/sec', source: 'AMA (Guest)', category: 'IOPS', unit: 'ops/sec', description: 'Write operations per second per disk instance', dashboard: 'IOPS tab breakdown', costRelevance: 'Write-heavy → disable caching, consider Ultra', plainEnglish: 'Write operations per second per disk volume. Write-heavy workloads (transaction databases, logging systems, data ingestion) need different optimization than read-heavy ones. Disk caching should be set to "None" for write-heavy disks because the cache adds latency to writes. If write IOPS consistently exceeds what your current disk provides, consider Ultra Disk or PremSSD v2 where you can provision exactly the write IOPS you need without buying unnecessary capacity.' },
];

const TECH_STACK = [
  { layer: 'Infrastructure', items: [
    { name: 'Azure Virtual Machines', desc: '5 VMs across D-series, E-series, L-series (Linux & Windows)', icon: '🖥️', snippet: 'Azure VMs are on-demand, scalable computing resources. They run Windows or Linux and come in families optimized for general purpose (D-series), memory (E-series), or storage (L-series). Each VM SKU has a fixed cap on disk IOPS and throughput — understanding these caps is critical for disk performance.', whyWeUseIt: 'We deploy 5 VMs across 3 families to compare how different VM SKUs affect disk performance. The D4s_v5 caps at 6,400 IOPS while the L8s_v3 allows 400,000 IOPS — a 62× difference.', learnUrl: 'https://learn.microsoft.com/en-us/azure/virtual-machines/overview' },
    { name: 'Azure Managed Disks', desc: '13 disks: Premium SSD, PremSSD v2, Standard SSD, Standard HDD, Ultra Disk', icon: '💾', snippet: 'Managed Disks are block-level storage volumes managed by Azure. They come in 5 tiers from Standard HDD ($0.02/GiB/mo) to Ultra Disk (sub-ms latency). Performance (IOPS, throughput) is either fixed per tier (Premium SSD) or independently configurable (Premium SSD v2, Ultra). Disks are billed 24/7 whether the VM is running or not.', whyWeUseIt: 'We attach all 5 disk types to test how each behaves under identical workloads. This reveals the real-world IOPS, latency, and throughput differences that justify the price gaps.', learnUrl: 'https://learn.microsoft.com/en-us/azure/virtual-machines/managed-disks-overview' },
    { name: 'Azure Virtual Network', desc: 'VNet 10.200.0.0/16 with VM subnet', icon: '🌐', snippet: 'Azure VNet is a logically isolated network where VMs communicate privately. Subnets segment traffic. In this POC, all VMs share one subnet for simplicity. VNet itself is free — you only pay for associated resources like public IPs or gateways.', whyWeUseIt: 'Provides the network fabric connecting all 5 VMs. Single subnet keeps the POC simple while still allowing future NSG and Private Link additions.', learnUrl: 'https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-overview' },
    { name: 'Bicep IaC', desc: '7 parameterized modules: network, vm-linux, vm-windows, managed-disk, log-analytics, dcr, grafana', icon: '📐', snippet: 'Bicep is Azure\'s domain-specific language for deploying infrastructure as code. It compiles to ARM templates but is far more readable. Modules allow reusable, parameterized components. Our 7 modules let us add/remove VMs and disks by changing parameters, not code.', whyWeUseIt: 'Enables reproducible deployment — the entire POC can be created or destroyed with a single command. Modules make it easy to add new VM/disk combinations for testing.', learnUrl: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview' },
  ]},
  { layer: 'Data Collection', items: [
    { name: 'Azure Monitor Agent (AMA)', desc: 'Guest-level metrics: 13 Linux + 16 Windows perf counters at 60s interval', icon: '📡', snippet: 'AMA is the current-generation agent that runs inside VMs to collect guest OS telemetry. It replaces the legacy Log Analytics Agent (MMA). AMA uses Data Collection Rules (DCRs) to define what to collect and where to send it. It supports both Linux and Windows with different counter sets.', whyWeUseIt: 'Collects 29 disk performance counters (reads/sec, writes/sec, latency, queue depth, capacity) from inside the OS. These guest-level metrics show per-disk-instance detail that platform metrics cannot provide.', learnUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-overview' },
    { name: 'Data Collection Rule (DCR)', desc: 'Defines all disk perf counters to collect and routes to Log Analytics', icon: '📋', snippet: 'A DCR is a JSON-defined rule that tells AMA exactly which performance counters to collect, at what interval, and where to send them. One DCR can be shared across multiple VMs. Changes to the DCR automatically update collection on all associated VMs — no agent restart needed.', whyWeUseIt: 'Single DCR (dcr-diskmon-perf-poc) configures all 29 disk counters at 60-second intervals for all 5 VMs. Adding a new VM just requires associating it with this DCR.', learnUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/data-collection-rule-overview' },
    { name: 'Diagnostic Settings', desc: 'Platform metrics (AllMetrics) exported to Log Analytics per VM', icon: '⚙️', snippet: 'Diagnostic Settings route Azure platform metrics and logs to destinations like Log Analytics, Storage, or Event Hubs. Platform metrics are emitted by Azure infrastructure itself — no agent needed. They include critical metrics like "IOPS Consumed %" and "Burst Credits" that AMA cannot collect.', whyWeUseIt: 'Platform metrics are the ONLY source for consumed-percentage metrics (how close you are to your IOPS/throughput ceiling) and burst credit balances. These are essential for right-sizing decisions.', learnUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings' },
    { name: 'VM Insights', desc: 'Out-of-box performance maps and InsightsMetrics table', icon: '🔍', snippet: 'VM Insights is an Azure Monitor feature that provides pre-built performance dashboards and dependency mapping for VMs. It populates the InsightsMetrics table with structured metric data. Enabling it requires the AMA agent and optionally the Dependency Agent.', whyWeUseIt: 'Provides additional structured metrics in the InsightsMetrics table and out-of-box Azure Portal dashboards for quick performance overviews without writing KQL.', learnUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/vm/vminsights-overview' },
  ]},
  { layer: 'Storage & Query', items: [
    { name: 'Log Analytics Workspace', desc: 'Central telemetry store: Perf, AzureMetrics, InsightsMetrics, Heartbeat tables', icon: '🗄️', snippet: 'A Log Analytics Workspace is Azure\'s central log and metric store. Data is organized into tables (Perf, AzureMetrics, Heartbeat, etc.) and queried using KQL. Pricing is per-GB ingested. Retention defaults to 30 days but can extend to 730 days. Daily caps prevent cost overruns.', whyWeUseIt: 'Single workspace (law-diskmon-poc-eastus2) receives all guest and platform metrics from all 5 VMs. This centralization is what enables cross-VM comparison queries and the "single pane of glass" dashboard.', learnUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/logs/log-analytics-workspace-overview' },
    { name: 'KQL Query Library', desc: '15+ queries: IOPS, throughput, latency, queue depth, VM/disk comparison, percentiles', icon: '🔎', snippet: 'Kusto Query Language (KQL) is a read-only query language for exploring data in Log Analytics. It uses a pipe-based syntax: table | where | summarize | project. KQL supports time-series analysis, percentiles, joins, pivots, and rendering charts — making it ideal for performance analysis.', whyWeUseIt: '15+ pre-built queries cover every monitoring scenario: inventory, IOPS ranking, latency percentiles (p50/p95/p99), VM family comparison, trend detection, and queue depth correlation with latency.', learnUrl: 'https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/' },
    { name: 'Azure Retail Prices API', desc: 'Live pricing fetched from prices.azure.com for cost dashboards', icon: '💰', snippet: 'The Azure Retail Prices API provides programmatic access to current Azure pricing. It returns pay-as-you-go prices for every Azure service, filterable by region, SKU, and meter. No authentication required — it is a public REST API.', whyWeUseIt: 'Powers the cost simulator and pricing tables with real-time Azure prices. Ensures cost estimates are always current without manual updates.', learnUrl: 'https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices' },
  ]},
  { layer: 'Visualization', items: [
    { name: 'Next.js 14', desc: 'React framework with static export for Azure Static Web Apps', icon: '⚡', snippet: 'Next.js is a React framework that supports server-side rendering, static site generation, and API routes. In "export" mode, it generates a fully static site (HTML/CSS/JS only) that can be hosted on any CDN. It supports file-based routing, TypeScript, and modern React features.', whyWeUseIt: 'Static export mode produces a zero-server-cost dashboard deployable to Azure Static Web Apps. File-based routing creates clean URLs for each page (/monitor, /help, /technical, etc.).', learnUrl: 'https://nextjs.org/docs' },
    { name: 'Recharts', desc: 'React charting: area, bar, pie, radar, scatter, line charts', icon: '📊', snippet: 'Recharts is a composable React charting library built on D3.js. It provides declarative chart components (AreaChart, BarChart, PieChart, etc.) that integrate naturally with React state and props. Charts are responsive and customizable via props.', whyWeUseIt: 'Used for all dashboard visualizations: sparkline grids, IOPS bar charts, latency percentile charts, cost pie charts, VM comparison charts, and the price-vs-performance scatter plot.', learnUrl: 'https://recharts.org/en-US/guide' },
    { name: 'Tailwind CSS', desc: 'Utility-first CSS with dark theme (slate-900 palette)', icon: '🎨', snippet: 'Tailwind is a utility-first CSS framework where you style elements using predefined classes like bg-slate-900, text-white, rounded-xl. It eliminates the need for separate CSS files and ensures consistent styling. The JIT compiler only includes classes you actually use.', whyWeUseIt: 'Enables rapid UI development with a consistent dark theme. All 7 pages share the same visual language (slate-900 background, slate-800 cards, blue-400 accents) without any custom CSS files.', learnUrl: 'https://tailwindcss.com/docs' },
    { name: 'Azure Static Web Apps', desc: 'Global CDN hosting with automatic HTTPS', icon: '🌍', snippet: 'Azure Static Web Apps hosts static content (HTML, CSS, JS) on Azure\'s global CDN with automatic HTTPS, custom domains, and optional authentication. The Standard tier costs ~$9/mo. Deployment is done via the SWA CLI or GitHub Actions.', whyWeUseIt: 'Hosts the dashboard at a public URL with zero server management. Global CDN ensures fast loads worldwide. The SWA CLI deploys the Next.js static export in one command.', learnUrl: 'https://learn.microsoft.com/en-us/azure/static-web-apps/overview' },
    { name: 'Azure Managed Grafana', desc: 'Secondary dashboard connected to Log Analytics', icon: '📈', snippet: 'Azure Managed Grafana is a fully managed Grafana instance that natively connects to Azure Monitor and Log Analytics as data sources. It supports dashboard-as-code (JSON models), alerting, and organizational sharing. Azure handles patching, scaling, and authentication.', whyWeUseIt: 'Provides a secondary visualization layer for users who prefer Grafana. Connects directly to Log Analytics using managed identity — no credentials to manage.', learnUrl: 'https://learn.microsoft.com/en-us/azure/managed-grafana/overview' },
  ]},
  { layer: 'Benchmarking', items: [
    { name: 'FIO (Flexible I/O Tester)', desc: '7 profiles: seq-read, seq-write, rand-read, rand-write, mixed, latency-probe, qd-ramp', icon: '⚙️', snippet: 'FIO is the industry-standard open-source I/O benchmarking tool for Linux. It can simulate any I/O pattern (sequential, random, mixed) with configurable block sizes, queue depths, and durations. Results include IOPS, throughput, and latency percentiles (p50, p95, p99, p99.9).', whyWeUseIt: '7 FIO profiles systematically test each disk under controlled conditions: 4K random I/O for IOPS ceiling, 1M sequential for throughput ceiling, QD=1 for baseline latency, and QD ramp for the latency-vs-IOPS tradeoff curve.', learnUrl: 'https://fio.readthedocs.io/en/latest/' },
    { name: 'DiskSpd', desc: 'Windows equivalent: 6 profiles matching FIO patterns', icon: '🪟', snippet: 'DiskSpd is Microsoft\'s official storage benchmarking tool for Windows. It provides similar capabilities to FIO: configurable block size, queue depth, thread count, read/write mix, and duration. Results include IOPS, throughput, and latency statistics.', whyWeUseIt: 'Runs on the Windows VM (vm-diskmon-dsv5-03) with profiles that match the FIO patterns, enabling Linux-vs-Windows performance comparison on identical hardware.', learnUrl: 'https://learn.microsoft.com/en-us/azure/virtual-machines/disks-benchmarks' },
  ]},
];

// Build price comparison chart data from live pricing
const PRICE_CHART_256 = [
  { tier: 'Std HDD S15', cost: LIVE_PRICING.standardHdd.S15.monthlyUsd, iops: 500, color: '#ef4444' },
  { tier: 'Std SSD E15', cost: LIVE_PRICING.standardSsd.E15.monthlyUsd, iops: 500, color: '#f59e0b' },
  { tier: 'Prem SSD P15', cost: LIVE_PRICING.premiumSsd.P15.monthlyUsd, iops: 1100, color: '#22c55e' },
  { tier: 'PremV2 (5K)', cost: +(LIVE_PRICING.premiumSsdV2.capacityPerGibPerMonth * 256 + (5000 - 3000) * LIVE_PRICING.premiumSsdV2.iopsPerIopsPerMonth + (200 - 125) * LIVE_PRICING.premiumSsdV2.throughputPerMbpsPerMonth).toFixed(2), iops: 5000, color: '#3b82f6' },
  { tier: 'Ultra (10K)', cost: +((LIVE_PRICING.ultraDisk.capacityPerGibPerHour * 256 + LIVE_PRICING.ultraDisk.iopsPerIopsPerHour * 10000 + LIVE_PRICING.ultraDisk.throughputPerMbpsPerHour * 400) * 730).toFixed(2), iops: 10000, color: '#8b5cf6' },
];

const VM_PRICE_CHART = Object.entries(LIVE_PRICING.vms).map(([sku, v]) => ({
  sku: sku.replace('Standard_', ''),
  hourly: v.perHour,
  monthly: +(v.perHour * 730).toFixed(2),
  maxIops: v.maxDiskIops,
  vcpus: v.vcpus,
}));

// ============================================================================
// Interactive Tech Stack Section with expandable cards
// ============================================================================
function TechStackSection({ stack }: { stack: typeof TECH_STACK }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      {stack.map((layer) => (
        <div key={layer.layer}>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{layer.layer} Layer</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {layer.items.map((item) => {
              const isOpen = expanded === item.name;
              return (
                <div key={item.name} className={`rounded-xl border bg-slate-800 overflow-hidden transition-all ${isOpen ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-700 hover:border-slate-600'}`}>
                  <button onClick={() => setExpanded(isOpen ? null : item.name)} className="w-full text-left px-5 py-4 flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white">{item.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.desc}</p>
                    </div>
                    <svg className={`h-5 w-5 text-slate-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-700 px-5 py-4 space-y-3">
                      <div>
                        <h5 className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">What is it?</h5>
                        <p className="text-xs text-slate-300 leading-relaxed">{item.snippet}</p>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">Why we use it in this POC</h5>
                        <p className="text-xs text-slate-300 leading-relaxed">{item.whyWeUseIt}</p>
                      </div>
                      <a href={item.learnUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                        Microsoft Learn Documentation
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Interactive Data Flow Section with clickable, expandable steps
// ============================================================================
const DATA_FLOW_STEPS = [
  { step: 1, title: 'Azure Monitor Agent (AMA)', desc: 'Installed as VM extension on all 5 VMs. Collects guest-level performance counters every 60 seconds.', detail: 'Linux: 13 counters (Logical Disk) | Windows: 16 counters (LogicalDisk + PhysicalDisk)', color: 'border-blue-500', data: '29 perf counters per VM', snippet: 'AMA runs inside each VM and captures OS-level disk metrics: reads/sec, writes/sec, latency, queue depth, capacity. It reports to Log Analytics via a Data Collection Rule. AMA replaces the legacy MMA agent and supports both Linux and Windows.', learnUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-overview' },
  { step: 2, title: 'Data Collection Rule (DCR)', desc: 'Defines which counters to collect and routes data to Log Analytics. Single DCR shared by all VMs.', detail: 'Counters: Disk Reads/sec, Writes/sec, Transfers/sec, Bytes/sec, Avg Disk sec/Read, sec/Write, Queue Length, % Used Space, Free MB', color: 'border-purple-500', data: 'dcr-diskmon-perf-poc', snippet: 'A DCR is a centralized configuration that tells AMA exactly what to collect. Our DCR specifies 29 disk performance counters at 60-second intervals. When you associate a new VM with this DCR, it automatically starts collecting the same metrics — no per-VM configuration needed.', learnUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/data-collection-rule-overview' },
  { step: 3, title: 'Diagnostic Settings', desc: 'Exports platform-level metrics (AllMetrics) from each VM to Log Analytics. No agent required.', detail: '42 metrics including IOPS/Bandwidth Consumed %, Burst Credits, Cache Hit/Miss', color: 'border-emerald-500', data: 'AzureMetrics table', snippet: 'Platform metrics are emitted by Azure infrastructure — not the guest OS. They include critical metrics like "Data Disk IOPS Consumed %" (how close to your ceiling) and "Burst IO Credits" (remaining burst capacity). These cannot be collected by AMA and require Diagnostic Settings.', learnUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings' },
  { step: 4, title: 'Log Analytics Workspace', desc: 'Central telemetry store. All metrics land in Perf and AzureMetrics tables. KQL engine for ad-hoc analysis.', detail: 'Tables: Perf (guest), AzureMetrics (platform), Heartbeat (availability), InsightsMetrics (VM Insights)', color: 'border-amber-500', data: 'law-diskmon-poc-eastus2', snippet: 'All telemetry converges in one workspace. Guest metrics go to the Perf table, platform metrics to AzureMetrics. KQL queries can join these tables to correlate guest-level latency with platform-level IOPS consumed % — showing WHY latency spiked (because you hit the IOPS ceiling).', learnUrl: 'https://learn.microsoft.com/en-us/azure/azure-monitor/logs/log-analytics-workspace-overview' },
  { step: 5, title: 'Visualization Layer', desc: 'Next.js dashboard (Azure Static Web Apps) and Grafana query Log Analytics to render charts.', detail: 'Static export: client-side rendering, mock data when offline, live KQL when connected.', color: 'border-red-500', data: 'swa-diskmon-poc', snippet: 'The dashboard runs entirely in the browser as a static site. It uses mock data generators that simulate realistic disk metrics for demos. When connected to Log Analytics (via API route), it executes live KQL queries. Grafana provides a secondary portal-native view.', learnUrl: 'https://learn.microsoft.com/en-us/azure/static-web-apps/overview' },
];

function DataFlowSection() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
      <h2 className="text-xl font-bold text-white mb-2">Data Collection Pipeline</h2>
      <p className="text-xs text-slate-400 mb-4">Click any step to learn more and find the Microsoft Learn documentation.</p>
      <div className="space-y-4">
        {DATA_FLOW_STEPS.map((s) => (
          <div key={s.step} className={`rounded-xl border-l-4 ${s.color} border border-slate-700 overflow-hidden transition-all ${expandedStep === s.step ? 'ring-1 ring-blue-500/20' : ''}`}>
            <button onClick={() => setExpandedStep(expandedStep === s.step ? null : s.step)} className="w-full text-left p-5 hover:bg-slate-700/20 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-lg font-bold text-white">{s.step}</div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white">{s.title}</h3>
                  <p className="text-sm text-slate-300 mt-1">{s.desc}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.detail}</p>
                  <span className="mt-2 inline-block rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-mono text-slate-300">{s.data}</span>
                </div>
                <svg className={`h-5 w-5 text-slate-400 transition-transform flex-shrink-0 mt-1 ${expandedStep === s.step ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </div>
            </button>
            {expandedStep === s.step && (
              <div className="border-t border-slate-700 px-5 py-4 ml-14 space-y-3 bg-slate-800/50">
                <p className="text-sm text-slate-300 leading-relaxed">{s.snippet}</p>
                <a href={s.learnUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                  Microsoft Learn
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TechDetailsPage() {
  const [activeSection, setActiveSection] = useState<Section>('architecture');
  const [metricFilter, setMetricFilter] = useState<string>('all');
  const [pricingTab, setPricingTab] = useState<'disks' | 'vms' | 'ultra' | 'premv2'>('disks');
  const [currency, setCurrency] = useState<'USD' | 'CAD'>('USD');
  const CAD_RATE = 1.36; // approximate USD to CAD conversion
  const cx = (usd: number) => currency === 'CAD' ? +(usd * CAD_RATE).toFixed(2) : usd;
  const sym = currency === 'CAD' ? 'C$' : '$';

  const filteredMetrics = metricFilter === 'all' ? ALL_METRICS : ALL_METRICS.filter((m) => m.category === metricFilter);
  const metricCategories = [...new Set(ALL_METRICS.map((m) => m.category))];
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 transition-colors" title="Home"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg></Link>
              <div>
                <h1 className="text-lg font-bold text-white">Technical Details &amp; Solution Architecture</h1>
                <p className="text-[11px] text-slate-500">Complete reference: architecture, metrics, live pricing, technology stack</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400">Prices fetched live from Azure API</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <nav className="flex gap-1 overflow-x-auto">
              {SECTIONS.map(({ key, label }) => (
                <button key={key} onClick={() => setActiveSection(key)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeSection === key ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>{label}</button>
              ))}
            </nav>
            <div className="flex gap-2 ml-4 flex-shrink-0">
              <Link href="/deep-dive" className="rounded-lg border border-cyan-500/50 bg-cyan-600/20 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:bg-cyan-600/30 transition-colors whitespace-nowrap">KQL &amp; Metrics Deep Dive</Link>
              <Link href="/design" className="rounded-lg border border-purple-500/50 bg-purple-600/20 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-600/30 transition-colors whitespace-nowrap">Design Document</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 space-y-8">

        {/* ========== ARCHITECTURE ========== */}
        {activeSection === 'architecture' && (
          <>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="text-xl font-bold text-white mb-2">Solution Architecture</h2>
              <p className="text-xs text-slate-400 mb-4">Rendered with Mermaid.js — interactive diagram of the complete data pipeline</p>
              <MermaidBlock />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'VMs', value: '5', detail: '3 families: D, E, L-series', color: 'text-blue-400', link: '/monitor' },
                { label: 'Data Disks', value: '8', detail: '5 types: PremSSD, PremV2, StdSSD, StdHDD, Ultra', color: 'text-purple-400', link: '/monitor' },
                { label: 'OS Disks', value: '5', detail: 'P10 Premium SSD (128 GiB each)', color: 'text-emerald-400', link: '/monitor' },
                { label: 'Perf Counters', value: '29', detail: '13 Linux + 16 Windows via DCR', color: 'text-cyan-400', link: '/deep-dive' },
                { label: 'Platform Metrics', value: '42', detail: 'IOPS, throughput, latency, burst, cache', color: 'text-amber-400', link: '/deep-dive' },
                { label: 'KQL Queries', value: '15+', detail: 'Inventory, comparison, trends, percentiles', color: 'text-red-400', link: '/deep-dive' },
              ].map((s) => (
                <Link href={s.link} key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-center transition-all hover:border-blue-500/50 hover:scale-[1.02]">
                  <div className={`text-4xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-sm font-semibold text-white mt-1">{s.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.detail}</div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ========== DATA FLOW ========== */}
        {activeSection === 'data-flow' && (
          <>
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Data Collection Pipeline</h2>
              <DataFlowSection />
            </div>
          </>
        )}

        {/* ========== METRICS CATALOG ========== */}
        {activeSection === 'metrics' && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-white">Complete Metrics Catalog</h2>
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs text-blue-400">{ALL_METRICS.length} metrics</span>
              <span className="text-[10px] text-slate-500">Click any row for details</span>
              <select value={metricFilter} onChange={(e) => setMetricFilter(e.target.value)} className="ml-auto rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none">
                <option value="all">All Categories ({ALL_METRICS.length})</option>
                {metricCategories.map((c) => <option key={c} value={c}>{c} ({ALL_METRICS.filter((m) => m.category === c).length})</option>)}
              </select>
            </div>
            {/* Metric category distribution */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 lg:col-span-1">
                <h3 className="text-sm font-semibold text-white mb-3">Metrics by Category</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={metricCategories.map((c) => ({ name: c, value: ALL_METRICS.filter((m) => m.category === c).length }))} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                      {metricCategories.map((_, i) => <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'][i % 6]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-white mb-3">Metrics by Data Source</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { source: 'Platform (Azure)', count: ALL_METRICS.filter((m) => m.source === 'Platform').length },
                    { source: 'AMA (Guest)', count: ALL_METRICS.filter((m) => m.source === 'AMA (Guest)').length },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="source" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                    <Bar dataKey="count" name="Metrics" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Metric Table — clickable rows */}
            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
              <table className="w-full text-left text-xs">
                <thead><tr className="border-b border-slate-700 text-[10px] uppercase text-slate-400">
                  <th className="px-4 py-3">Metric Name</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Shown In</th><th className="px-4 py-3">Cost Relevance</th><th className="px-4 py-3 w-8"></th>
                </tr></thead>
                <tbody>
                  {filteredMetrics.map((m) => {
                    const isExpanded = expandedMetric === m.name;
                    return (
                      <React.Fragment key={m.name}>
                        <tr onClick={() => setExpandedMetric(isExpanded ? null : m.name)} className="border-b border-slate-700/50 hover:bg-slate-700/20 cursor-pointer transition-colors">
                          <td className="px-4 py-2.5 font-mono font-medium text-white whitespace-nowrap">{m.name}</td>
                          <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${m.source === 'Platform' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{m.source}</span></td>
                          <td className="px-4 py-2.5 text-slate-300">{m.category}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-400">{m.unit}</td>
                          <td className="px-4 py-2.5 text-slate-400 max-w-[200px]">{m.description}</td>
                          <td className="px-4 py-2.5 text-slate-400 max-w-[150px]">{m.dashboard}</td>
                          <td className="px-4 py-2.5 text-amber-400/80 max-w-[200px]">{m.costRelevance}</td>
                          <td className="px-4 py-2.5"><svg className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></td>
                        </tr>
                        {isExpanded && (
                          <tr><td colSpan={8} className="px-6 py-4 bg-blue-500/5 border-b border-blue-500/20">
                            <div className="flex gap-3 items-start">
                              <div className="rounded-lg bg-blue-500/20 p-2 flex-shrink-0 mt-0.5"><svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg></div>
                              <div>
                                <div className="text-xs font-bold text-blue-400 mb-1">What does this mean in plain English?</div>
                                <p className="text-sm text-slate-300 leading-relaxed">{(m as any).plainEnglish}</p>
                              </div>
                            </div>
                          </td></tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ========== LIVE PRICING ========== */}
        {activeSection === 'pricing' && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-bold text-white">Live Azure Pricing (East US 2)</h2>
              <div className="flex items-center gap-4">
                {/* Currency Toggle */}
                <div className="flex rounded-lg border border-slate-700 bg-slate-800">
                  <button onClick={() => setCurrency('USD')} className={`px-3 py-1 text-xs font-medium rounded-l-lg transition-colors ${currency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>USD $</button>
                  <button onClick={() => setCurrency('CAD')} className={`px-3 py-1 text-xs font-medium rounded-r-lg transition-colors ${currency === 'CAD' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>CAD C$</button>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Source: prices.azure.com</div>
              </div>
            </div>
            {/* Disclaimer */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 flex items-start gap-2">
              <svg className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              <p className="text-[11px] text-amber-200/80"><strong>Disclaimer:</strong> All prices shown are for <strong>illustration purposes only</strong> and are based on Azure Retail Prices API (East US 2, Pay-as-you-go). Actual costs may vary based on your enterprise agreement, reserved instances, region, and applicable taxes. {currency === 'CAD' ? 'CAD prices use an approximate exchange rate of 1 USD = 1.36 CAD and are not official Azure CAD pricing.' : 'Base currency is USD.'} Always verify pricing at <a href="https://azure.microsoft.com/en-us/pricing/calculator/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">azure.microsoft.com/pricing</a>.</p>
            </div>
            <div className="flex gap-2">
              {(['disks', 'vms', 'ultra', 'premv2'] as const).map((t) => (
                <button key={t} onClick={() => setPricingTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${pricingTab === t ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                  {t === 'disks' ? 'Managed Disks' : t === 'vms' ? 'VM Compute' : t === 'ultra' ? 'Ultra Disk' : 'Premium SSD v2'}
                </button>
              ))}
            </div>

            {pricingTab === 'disks' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Monthly Cost — 256 GiB Equivalent (Live Prices)</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={PRICE_CHART_256}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="tier" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} formatter={(v: number, n: string) => n === 'Monthly Cost' ? `$${v}/mo` : v.toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="cost" name="Monthly Cost" radius={[4, 4, 0, 0]}>
                        {PRICE_CHART_256.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* All Tiers Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="border-b border-slate-700 text-[10px] uppercase text-slate-400">
                      <th className="px-4 py-2">Type</th><th className="px-4 py-2">Tier</th><th className="px-4 py-2">Size</th><th className="px-4 py-2">IOPS</th><th className="px-4 py-2">Throughput</th><th className="px-4 py-2">Monthly (USD)</th><th className="px-4 py-2">$/GiB/mo</th>
                    </tr></thead>
                    <tbody>
                      {Object.entries(LIVE_PRICING.premiumSsd).map(([tier, d]) => (
                        <tr key={tier} className="border-b border-slate-700/50 hover:bg-slate-700/20"><td className="px-4 py-2 text-emerald-400">Premium SSD</td><td className="px-4 py-2 font-mono text-white">{tier}</td><td className="px-4 py-2">{d.sizeGb} GiB</td><td className="px-4 py-2 font-mono">{d.iops.toLocaleString()}</td><td className="px-4 py-2 font-mono">{d.throughputMBs} MB/s</td><td className="px-4 py-2 font-mono text-amber-400">${d.monthlyUsd.toFixed(2)}</td><td className="px-4 py-2 font-mono text-slate-400">${(d.monthlyUsd / d.sizeGb).toFixed(4)}</td></tr>
                      ))}
                      {Object.entries(LIVE_PRICING.standardSsd).map(([tier, d]) => (
                        <tr key={tier} className="border-b border-slate-700/50 hover:bg-slate-700/20"><td className="px-4 py-2 text-amber-400">Standard SSD</td><td className="px-4 py-2 font-mono text-white">{tier}</td><td className="px-4 py-2">{d.sizeGb} GiB</td><td className="px-4 py-2 font-mono">{d.iops}</td><td className="px-4 py-2 font-mono">{d.throughputMBs} MB/s</td><td className="px-4 py-2 font-mono text-amber-400">${d.monthlyUsd.toFixed(2)}</td><td className="px-4 py-2 font-mono text-slate-400">${(d.monthlyUsd / d.sizeGb).toFixed(4)}</td></tr>
                      ))}
                      {Object.entries(LIVE_PRICING.standardHdd).map(([tier, d]) => (
                        <tr key={tier} className="border-b border-slate-700/50 hover:bg-slate-700/20"><td className="px-4 py-2 text-red-400">Standard HDD</td><td className="px-4 py-2 font-mono text-white">{tier}</td><td className="px-4 py-2">{d.sizeGb} GiB</td><td className="px-4 py-2 font-mono">{d.iops}</td><td className="px-4 py-2 font-mono">{d.throughputMBs} MB/s</td><td className="px-4 py-2 font-mono text-amber-400">${d.monthlyUsd.toFixed(2)}</td><td className="px-4 py-2 font-mono text-slate-400">${(d.monthlyUsd / d.sizeGb).toFixed(4)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {pricingTab === 'vms' && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">VM Compute — Monthly Cost (730 hrs)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={VM_PRICE_CHART}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="sku" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} formatter={(v: number, n: string) => n.includes('IOPS') ? v.toLocaleString() : `$${v}`} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="monthly" name="Monthly Cost (USD)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="border-b border-slate-700 text-[10px] uppercase text-slate-400">
                      <th className="px-4 py-2">SKU</th><th className="px-4 py-2">vCPUs</th><th className="px-4 py-2">RAM</th><th className="px-4 py-2">$/hr</th><th className="px-4 py-2">$/mo (730h)</th><th className="px-4 py-2">Max Disk IOPS</th><th className="px-4 py-2">Max Disk MB/s</th>
                    </tr></thead>
                    <tbody>
                      {Object.entries(LIVE_PRICING.vms).map(([sku, v]) => (
                        <tr key={sku} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                          <td className="px-4 py-2 font-mono text-white">{sku}</td><td className="px-4 py-2">{v.vcpus}</td><td className="px-4 py-2">{v.ramGb} GiB</td><td className="px-4 py-2 font-mono text-amber-400">${v.perHour}</td><td className="px-4 py-2 font-mono text-amber-400">${(v.perHour * 730).toFixed(2)}</td><td className="px-4 py-2 font-mono text-blue-400">{v.maxDiskIops.toLocaleString()}</td><td className="px-4 py-2 font-mono">{v.maxDiskMBs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {pricingTab === 'ultra' && (
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Ultra Disk — Component Pricing (Hourly)</h3>
                <p className="text-sm text-slate-400">Ultra Disk is billed per hour for each component independently. Charges apply 24/7 even when the VM is deallocated.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">${LIVE_PRICING.ultraDisk.capacityPerGibPerHour}</div>
                    <div className="text-xs text-slate-400 mt-1">per GiB per Hour</div>
                    <div className="text-sm font-semibold text-white mt-2">Capacity</div>
                    <div className="text-xs text-slate-500 mt-1">256 GiB = ${(LIVE_PRICING.ultraDisk.capacityPerGibPerHour * 256 * 730).toFixed(2)}/mo</div>
                  </div>
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-center">
                    <div className="text-3xl font-bold text-blue-400">${LIVE_PRICING.ultraDisk.iopsPerIopsPerHour}</div>
                    <div className="text-xs text-slate-400 mt-1">per IOPS per Hour</div>
                    <div className="text-sm font-semibold text-white mt-2">Provisioned IOPS</div>
                    <div className="text-xs text-slate-500 mt-1">10,000 IOPS = ${(LIVE_PRICING.ultraDisk.iopsPerIopsPerHour * 10000 * 730).toFixed(2)}/mo</div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-400">${LIVE_PRICING.ultraDisk.throughputPerMbpsPerHour}</div>
                    <div className="text-xs text-slate-400 mt-1">per MBps per Hour</div>
                    <div className="text-sm font-semibold text-white mt-2">Provisioned Throughput</div>
                    <div className="text-xs text-slate-500 mt-1">400 MB/s = ${(LIVE_PRICING.ultraDisk.throughputPerMbpsPerHour * 400 * 730).toFixed(2)}/mo</div>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                  <p className="text-sm text-amber-200"><strong>Our 256 GiB / 10K IOPS / 400 MB/s Ultra Disk total:</strong> ${((LIVE_PRICING.ultraDisk.capacityPerGibPerHour * 256 + LIVE_PRICING.ultraDisk.iopsPerIopsPerHour * 10000 + LIVE_PRICING.ultraDisk.throughputPerMbpsPerHour * 400) * 730).toFixed(2)}/mo</p>
                </div>
              </div>
            )}

            {pricingTab === 'premv2' && (
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Premium SSD v2 — Component Pricing (Monthly)</h3>
                <p className="text-sm text-slate-400">PremSSD v2 includes a free baseline of 3,000 IOPS and 125 MB/s. You only pay for overages.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-center">
                    <div className="text-3xl font-bold text-blue-400">${LIVE_PRICING.premiumSsdV2.capacityPerGibPerMonth}</div>
                    <div className="text-xs text-slate-400 mt-1">per GiB per Month</div>
                    <div className="text-sm font-semibold text-white mt-2">Capacity</div>
                    <div className="text-xs text-slate-500 mt-1">256 GiB = ${(LIVE_PRICING.premiumSsdV2.capacityPerGibPerMonth * 256).toFixed(2)}/mo</div>
                  </div>
                  <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4 text-center">
                    <div className="text-3xl font-bold text-purple-400">${LIVE_PRICING.premiumSsdV2.iopsPerIopsPerMonth}</div>
                    <div className="text-xs text-slate-400 mt-1">per IOPS/mo (above 3K baseline)</div>
                    <div className="text-sm font-semibold text-white mt-2">Extra IOPS</div>
                    <div className="text-xs text-slate-500 mt-1">5,000 IOPS (2K extra) = ${((5000 - 3000) * LIVE_PRICING.premiumSsdV2.iopsPerIopsPerMonth).toFixed(2)}/mo</div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-400">${LIVE_PRICING.premiumSsdV2.throughputPerMbpsPerMonth}</div>
                    <div className="text-xs text-slate-400 mt-1">per MB/s/mo (above 125 baseline)</div>
                    <div className="text-sm font-semibold text-white mt-2">Extra Throughput</div>
                    <div className="text-xs text-slate-500 mt-1">200 MB/s (75 extra) = ${((200 - 125) * LIVE_PRICING.premiumSsdV2.throughputPerMbpsPerMonth).toFixed(2)}/mo</div>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                  <p className="text-sm text-amber-200"><strong>Our 256 GiB / 5K IOPS / 200 MB/s PremV2 Disk total:</strong> ${(LIVE_PRICING.premiumSsdV2.capacityPerGibPerMonth * 256 + (5000 - 3000) * LIVE_PRICING.premiumSsdV2.iopsPerIopsPerMonth + (200 - 125) * LIVE_PRICING.premiumSsdV2.throughputPerMbpsPerMonth).toFixed(2)}/mo</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== TECHNOLOGY STACK ========== */}
        {activeSection === 'technology' && (
          <>
            <h2 className="text-xl font-bold text-white">Technology Stack</h2>
            <p className="text-sm text-slate-400 mb-2">Click any card to learn what it is, why we use it, and find the Microsoft Learn documentation.</p>
            <TechStackSection stack={TECH_STACK} />
          </>
        )}

        {/* ========== BENCHMARKS ========== */}
        {activeSection === 'benchmarks' && (
          <>
            <h2 className="text-xl font-bold text-white">Benchmark Profiles</h2>
            <p className="text-sm text-slate-400">FIO (Linux) and DiskSpd (Windows) generate controlled I/O workloads to test disk limits.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { name: 'seq-read-1m', pattern: 'Sequential Read', bs: '1 MiB', qd: 32, duration: '120s', target: 'Max throughput (MB/s)', color: '#3b82f6' },
                { name: 'seq-write-1m', pattern: 'Sequential Write', bs: '1 MiB', qd: 32, duration: '120s', target: 'Max write throughput', color: '#8b5cf6' },
                { name: 'rand-read-4k', pattern: 'Random Read', bs: '4 KiB', qd: 64, duration: '120s', target: 'Max IOPS ceiling', color: '#22c55e' },
                { name: 'rand-write-4k', pattern: 'Random Write', bs: '4 KiB', qd: 64, duration: '120s', target: 'Max write IOPS', color: '#f59e0b' },
                { name: 'rand-rw-70-30', pattern: '70% Read / 30% Write', bs: '4 KiB', qd: 32, duration: '120s', target: 'Mixed workload (DB-like)', color: '#ef4444' },
                { name: 'lat-probe-4k', pattern: 'Random Read (QD=1)', bs: '4 KiB', qd: 1, duration: '60s', target: 'Baseline latency measurement', color: '#06b6d4' },
                { name: 'qd-ramp', pattern: 'QD 1→4→16→64→128', bs: '4 KiB', qd: 'ramp', duration: '5×60s', target: 'Latency vs IOPS curve', color: '#a855f7' },
              ].map((p) => (
                <div key={p.name} className="rounded-xl border border-slate-700 bg-slate-800 p-5" style={{ borderTopColor: p.color, borderTopWidth: '3px' }}>
                  <h4 className="text-sm font-bold text-white font-mono">{p.name}</h4>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-400">Pattern</span><span className="text-white">{p.pattern}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Block Size</span><span className="font-mono text-white">{p.bs}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Queue Depth</span><span className="font-mono text-white">{p.qd}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Duration</span><span className="font-mono text-white">{p.duration}</span></div>
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-700/50 p-2">
                    <p className="text-[10px] text-slate-300"><strong>Measures:</strong> {p.target}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 py-3 text-center text-[10px] text-slate-500">
        Azure Disk Performance Monitoring POC &bull; Pricing source: Azure Retail Prices API (prices.azure.com) &bull; Region: East US 2 &bull; Currency: USD
      </footer>
    </div>
  );
}
