'use client';

import { useState } from 'react';

interface MetricInfoPanelProps {
  metric: 'iops' | 'throughput' | 'latency' | 'queue' | 'capacity';
}

const METRIC_INFO: Record<string, {
  title: string;
  description: string;
  howItWorks: string;
  azureMetrics: string[];
  costImpact: {
    summary: string;
    details: string[];
    optimizationTips: string[];
  };
  thresholds: { label: string; value: string; color: string }[];
}> = {
  iops: {
    title: 'IOPS (Input/Output Operations Per Second)',
    description:
      'IOPS measures the number of read and write operations a disk can perform per second. It is the primary indicator of transactional storage performance — critical for databases, virtual desktops, and applications with many small, random I/O requests.',
    howItWorks:
      'Each Azure managed disk has a provisioned IOPS limit determined by its tier and size. When your workload exceeds this limit, additional I/O operations are throttled (queued), causing latency to spike. Some disk types (Premium SSD, Standard SSD) support "bursting" — temporary IOPS above the baseline funded by burst credits that accumulate during idle periods.',
    azureMetrics: [
      'Disk Transfers/sec — total read + write operations per second (guest-level, AMA)',
      'Disk Reads/sec — read operations per second',
      'Disk Writes/sec — write operations per second',
      'Data Disk IOPS Consumed Percentage — % of provisioned IOPS being used (platform metric)',
      'VM Uncached IOPS Consumed Percentage — % of the VM-level IOPS cap being used',
    ],
    costImpact: {
      summary:
        'IOPS directly determines the disk tier you need and therefore the monthly cost. Higher IOPS requirements push you into more expensive tiers.',
      details: [
        'Premium SSD: IOPS is fixed per tier — P15 (256 GiB) = 1,100 IOPS at $19.71/mo; P20 (512 GiB) = 2,300 IOPS at $38.41/mo. Doubling size roughly doubles IOPS and cost.',
        'Premium SSD v2: IOPS is independently configurable. Base 3,000 IOPS is free. Each additional 1 IOPS costs $0.00488/mo. Our 5,000 IOPS disk adds $9.76/mo above baseline.',
        'Ultra Disk: IOPS is fully configurable and charged hourly. Our 10,000 IOPS provisioning costs $33.58/mo — 37% of the Ultra Disk\'s total cost.',
        'Standard SSD/HDD: IOPS is lower and cannot be customized. Cost is size-based only. Standard HDD 512 GiB at 500 IOPS costs just $10.24/mo.',
        'VM-level cap: Even if your disk supports more IOPS, the VM SKU limits total disk IOPS. A D4s_v5 caps at 6,400 IOPS. Buying a P30 (5,000 IOPS) on a D2s_v5 (3,200 IOPS cap) wastes money.',
      ],
      optimizationTips: [
        'Watch "IOPS Consumed %" — if consistently below 50%, you are over-provisioned and paying for unused IOPS',
        'For Premium SSD v2 / Ultra: reduce provisioned IOPS to match actual peak usage + 20% headroom',
        'For Premium SSD: consider a smaller disk tier if IOPS headroom exceeds 40%',
        'Use burst credits (Premium SSD) for intermittent spikes instead of upgrading tiers',
      ],
    },
    thresholds: [
      { label: 'Standard HDD', value: '500 IOPS', color: 'text-red-400' },
      { label: 'Standard SSD E15', value: '500 IOPS', color: 'text-amber-400' },
      { label: 'Premium SSD P15', value: '1,100 IOPS', color: 'text-emerald-400' },
      { label: 'Premium SSD P20', value: '2,300 IOPS', color: 'text-emerald-400' },
      { label: 'Premium SSD v2 (ours)', value: '5,000 IOPS', color: 'text-blue-400' },
      { label: 'Ultra Disk (ours)', value: '10,000 IOPS', color: 'text-purple-400' },
    ],
  },

  throughput: {
    title: 'Throughput (MB/s)',
    description:
      'Throughput measures the total data transfer rate in megabytes per second. It reflects how fast large sequential data blocks can be read or written — critical for data warehouses, video streaming, backup/restore operations, and large file copies.',
    howItWorks:
      'Each disk tier has a maximum throughput limit. When your application performs sequential reads/writes with large block sizes (e.g., 1 MiB), throughput becomes the bottleneck rather than IOPS. Azure also imposes a VM-level throughput cap that applies across all attached disks combined.',
    azureMetrics: [
      'Disk Read Bytes/sec — read throughput in bytes per second (guest-level)',
      'Disk Write Bytes/sec — write throughput in bytes per second',
      'Disk Bytes/sec — total combined throughput',
      'Data Disk Bandwidth Consumed Percentage — % of provisioned throughput used (platform metric)',
      'VM Uncached Bandwidth Consumed Percentage — % of VM-level bandwidth cap used',
    ],
    costImpact: {
      summary:
        'Throughput requirements determine the minimum disk tier or, for Premium SSD v2 / Ultra Disk, add direct per-MBps charges to your monthly bill.',
      details: [
        'Premium SSD: Throughput is fixed per tier — P15 = 125 MB/s, P20 = 150 MB/s. You cannot increase throughput without changing the tier (and paying more).',
        'Premium SSD v2: Baseline 125 MB/s is free. Each additional MB/s costs $0.02691/mo. Our 200 MB/s provisioning adds $20.11/mo — the largest cost component of our PremV2 disk.',
        'Ultra Disk: Throughput is charged hourly at $0.000843/MBps/hr. Our 400 MB/s costs $24.62/mo.',
        'Standard SSD: Capped at 100 MB/s regardless of disk size. Standard HDD: 60 MB/s max.',
        'VM cap: D4s_v5 allows 200 MB/s uncached throughput across all disks. A single Ultra Disk provisioned at 400 MB/s will be capped at 200 MB/s on this VM — wasted spend.',
      ],
      optimizationTips: [
        'Monitor "Bandwidth Consumed %" — if below 30% consistently, you are over-provisioned',
        'For PremV2: reduce throughput to 125 MB/s (free baseline) if sequential workloads are infrequent — saves $20.11/mo',
        'Ensure VM throughput cap exceeds disk provisioned throughput — otherwise you pay for throughput you cannot use',
        'For sequential workloads (backup, ETL), schedule during off-peak and use burst rather than provisioning peak throughput',
      ],
    },
    thresholds: [
      { label: 'Standard HDD', value: '60 MB/s', color: 'text-red-400' },
      { label: 'Standard SSD', value: '100 MB/s', color: 'text-amber-400' },
      { label: 'Premium SSD P15', value: '125 MB/s', color: 'text-emerald-400' },
      { label: 'Premium SSD P20', value: '150 MB/s', color: 'text-emerald-400' },
      { label: 'Premium SSD v2 (ours)', value: '200 MB/s', color: 'text-blue-400' },
      { label: 'Ultra Disk (ours)', value: '400 MB/s', color: 'text-purple-400' },
    ],
  },

  latency: {
    title: 'Latency (milliseconds)',
    description:
      'Latency measures the time delay between issuing an I/O request and receiving the response. Low latency is essential for real-time applications, OLTP databases (SQL Server, PostgreSQL), and any workload where response time directly impacts user experience.',
    howItWorks:
      'Disk latency in Azure is determined by the storage tier, network path, and current I/O load. When a disk hits its IOPS or throughput ceiling, additional requests queue up, causing latency to spike. Azure reports average latency per sample interval, but tail latency (p95, p99) reveals worst-case user experience.',
    azureMetrics: [
      'Avg. Disk sec/Read — average time per read operation in seconds (multiply by 1000 for ms)',
      'Avg. Disk sec/Write — average time per write operation',
      'Avg. Disk sec/Transfer — average time per any I/O operation',
      'Data Disk Latency (Preview) — platform-level latency measurement in milliseconds',
    ],
    costImpact: {
      summary:
        'Latency is not directly billed, but achieving low latency requires expensive high-tier disks. It is the "hidden cost multiplier" — poor latency forces upgrades to more expensive tiers.',
      details: [
        'Ultra Disk: Sub-millisecond latency (~0.3 ms). Costs $91.07/mo for our 256 GiB disk.',
        'Premium SSD v2: Low latency (~1.2 ms). Costs $44.04/mo with custom IOPS/throughput.',
        'Premium SSD P15: Good latency (~2.0 ms). Costs $19.71/mo — best price/latency ratio for most workloads.',
        'Standard SSD: Moderate latency (~5.5 ms). Costs $15.36/mo — acceptable for dev/test.',
        'Standard HDD: Highest latency (~12 ms). Costs $10.24/mo — only suitable for archival/sequential workloads.',
        'The latency difference between Ultra ($91/mo) and Std HDD ($10/mo) is ~40× in performance for ~9× the cost.',
      ],
      optimizationTips: [
        'If p99 latency < 5ms on Premium SSD, do NOT upgrade to Ultra — you\'re within acceptable range',
        'High latency spikes during benchmarks indicate you\'re hitting the IOPS/throughput ceiling — address the root metric',
        'Standard HDD latency is acceptable for sequential workloads (backups) — don\'t pay for Premium for write-once data',
        'Consider Premium SSD v2 as the sweet spot: near-Ultra latency at roughly half the cost',
      ],
    },
    thresholds: [
      { label: 'Ultra Disk', value: '< 0.5 ms', color: 'text-purple-400' },
      { label: 'Premium SSD v2', value: '1 - 2 ms', color: 'text-blue-400' },
      { label: 'Premium SSD', value: '2 - 4 ms', color: 'text-emerald-400' },
      { label: 'Standard SSD', value: '4 - 10 ms', color: 'text-amber-400' },
      { label: 'Standard HDD', value: '10 - 20 ms', color: 'text-red-400' },
    ],
  },

  queue: {
    title: 'Queue Depth',
    description:
      'Queue depth measures the number of I/O operations waiting to be serviced by the disk at any given moment. A deeper queue means the application is submitting I/O faster than the disk can complete it. It is the leading indicator of impending performance degradation.',
    howItWorks:
      'When an application sends more I/O requests than the disk can handle at its provisioned IOPS rate, excess requests accumulate in the queue. Moderate queue depth (4–32) is normal and can actually improve throughput via command queuing. Sustained queue depth above 64 signals saturation — the disk is the bottleneck, and latency is rising.',
    azureMetrics: [
      'Current Disk Queue Length — number of outstanding I/O requests at sample time (guest-level)',
      'Avg. Disk Queue Length — average queue depth over the sample interval',
      'Data Disk Queue Depth — platform-level queue depth measurement',
    ],
    costImpact: {
      summary:
        'Queue depth itself has no direct cost. However, persistently high queue depth is the strongest signal that you need to upgrade to a higher-tier disk or a larger VM — both of which increase cost.',
      details: [
        'QD consistently > 32 on a Premium SSD P15 (1,100 IOPS) means the disk is saturated. Upgrading to P20 (2,300 IOPS, $38.41/mo) or PremV2 (custom IOPS, ~$44/mo) is likely needed — a $19–$24/mo increase.',
        'QD consistently > 64 on any disk means the VM\'s I/O subsystem is heavily loaded. Consider adding a second data disk and striping them (software RAID 0) — doubles IOPS at the cost of one more disk.',
        'High QD + high latency together = immediate upgrade signal. High QD + low latency = the system is efficiently pipelining and may be fine.',
        'For Ultra Disk: if QD stays low (< 4) during benchmarks, you\'ve over-provisioned IOPS. Reduce IOPS to save $0.00046/IOPS/hr (~$0.34/IOPS/mo).',
        'QD spikes during burst windows on Premium SSD indicate burst credits are being consumed — monitor burst credit balance to avoid throttling.',
      ],
      optimizationTips: [
        'QD < 2 consistently → disk is under-utilized; consider downgrading tier to save money',
        'QD 4–32 → healthy operating range for most disks; no action needed',
        'QD > 32 sustained → approaching saturation; plan an upgrade',
        'QD > 64 sustained → severely constrained; upgrade disk tier, add disks, or move to a larger VM',
        'Compare QD across disk types on the same VM to identify which disk is the bottleneck',
      ],
    },
    thresholds: [
      { label: 'Idle / Under-utilized', value: '0 - 2', color: 'text-slate-400' },
      { label: 'Normal operating range', value: '4 - 32', color: 'text-emerald-400' },
      { label: 'Approaching saturation', value: '32 - 64', color: 'text-amber-400' },
      { label: 'Saturated / Bottleneck', value: '> 64', color: 'text-red-400' },
    ],
  },

  capacity: {
    title: 'Disk Capacity Utilization',
    description:
      'Capacity utilization shows what percentage of a disk\'s provisioned storage space is consumed by data. Unlike IOPS and throughput which measure performance, capacity is about how full the disk is. Running out of space causes application failures, database corruption, and OS crashes.',
    howItWorks:
      'Azure managed disks are provisioned at fixed sizes (128 GiB, 256 GiB, 512 GiB, etc.). You pay for the provisioned size regardless of how much data is stored. When usage approaches 90%, performance may degrade due to filesystem overhead, and at 100% the disk is full — the VM may become unresponsive.',
    azureMetrics: [
      '% Used Space — percentage of disk capacity consumed (guest-level, Linux)',
      '% Free Space — percentage of free space remaining (guest-level, Windows)',
      'Free Megabytes — absolute free space in MB',
      '% Free Inodes — inode utilization on Linux (can fill up even with free space)',
    ],
    costImpact: {
      summary:
        'You pay for provisioned capacity, not used capacity. Over-provisioning wastes money. Under-provisioning risks downtime. But disk size also determines IOPS and throughput limits on Premium SSD.',
      details: [
        'Premium SSD pricing and performance scale with size: P10 (128 GiB) = $9.86/mo with 500 IOPS; P15 (256 GiB) = $19.71/mo with 1,100 IOPS; P20 (512 GiB) = $38.41/mo with 2,300 IOPS.',
        'If you need 1,100 IOPS but only 50 GiB of data, you still must buy P15 (256 GiB) — paying for 206 GiB of unused capacity.',
        'Premium SSD v2 decouples capacity from performance: $0.05536/GiB/mo. 256 GiB = $14.17/mo for capacity alone, with IOPS and throughput billed separately.',
        'Ultra Disk: $0.000176/GiB/hr. 256 GiB = $32.87/mo for capacity. Reducing to 128 GiB saves ~$16/mo but may not affect performance.',
        'Standard HDD is cheapest per GiB: 512 GiB = $10.24/mo ($0.02/GiB/mo). Use for archival data.',
        'Standard SSD: 256 GiB = $15.36/mo ($0.06/GiB/mo). Good balance for dev/test.',
      ],
      optimizationTips: [
        'If a disk is < 30% utilized and you don\'t need its IOPS tier, shrink it (Note: Azure disks cannot be shrunk in-place — requires data migration)',
        'For Premium SSD: if you\'re buying large disks only for IOPS, switch to Premium SSD v2 where you pay for IOPS independently',
        'Set up alerts at 80% capacity to allow time for expansion before downtime risk',
        'Standard HDD at $0.02/GiB/mo is 3× cheaper than Premium SSD at $0.06/GiB/mo — use HDD for cold data',
      ],
    },
    thresholds: [
      { label: 'Healthy', value: '0 - 60%', color: 'text-emerald-400' },
      { label: 'Monitor closely', value: '60 - 80%', color: 'text-amber-400' },
      { label: 'Critical — plan expansion', value: '80 - 90%', color: 'text-red-400' },
      { label: 'Emergency — imminent failure', value: '> 90%', color: 'text-red-500' },
    ],
  },
};

export default function MetricInfoPanel({ metric }: MetricInfoPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const info = METRIC_INFO[metric];

  return (
    <div className="rounded-xl border border-slate-700 bg-gradient-to-r from-slate-800/80 to-slate-800/40 overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-700/30"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/20 p-1.5">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{info.title}</h3>
            <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{info.description.substring(0, 120)}...</p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-700 px-5 py-5 space-y-5">
          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">What is {info.title.split('(')[0].trim()}?</h4>
            <p className="text-sm leading-relaxed text-slate-300">{info.description}</p>
          </div>

          {/* How it Works */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">How it Works in Azure</h4>
            <p className="text-sm leading-relaxed text-slate-300">{info.howItWorks}</p>
          </div>

          {/* Azure Metrics Collected */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Azure Metrics Collected</h4>
            <ul className="space-y-1.5">
              {info.azureMetrics.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-blue-400" />
                  <span><code className="text-blue-400">{m.split('—')[0].trim()}</code>{m.includes('—') ? ` — ${m.split('—').slice(1).join('—').trim()}` : ''}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Performance Thresholds */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Performance Reference</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {info.thresholds.map((t, i) => (
                <div key={i} className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <div className={`text-sm font-mono font-bold ${t.color}`}>{t.value}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{t.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Impact — highlighted section */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-sm font-semibold text-amber-400">Cost Impact</h4>
            </div>
            <p className="text-sm text-amber-200/80">{info.costImpact.summary}</p>
            <ul className="space-y-2">
              {info.costImpact.details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-amber-400" />
                  {d}
                </li>
              ))}
            </ul>
          </div>

          {/* Optimization Tips */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Cost Optimization Tips</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {info.costImpact.optimizationTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-400 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                  <span className="text-xs text-slate-300">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
