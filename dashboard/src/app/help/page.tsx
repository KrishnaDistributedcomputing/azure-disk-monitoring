'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie,
  ScatterChart, Scatter, ZAxis, LineChart, Line,
} from 'recharts';
import Link from 'next/link';

// ============================================================================
// Data for interactive charts
// ============================================================================

const DISK_TYPES = [
  { name: 'Ultra Disk', color: '#8b5cf6', iops: 160000, throughput: 4000, latency: 0.3, costPerGib: 0.128, bestFor: 'SAP HANA, top-tier databases, transaction-heavy workloads' },
  { name: 'Premium SSD v2', color: '#3b82f6', iops: 80000, throughput: 1200, latency: 1.0, costPerGib: 0.055, bestFor: 'Production databases, latency-sensitive apps, custom IOPS needs' },
  { name: 'Premium SSD', color: '#22c55e', iops: 20000, throughput: 900, latency: 2.0, costPerGib: 0.077, bestFor: 'Production VMs, web servers, moderate databases' },
  { name: 'Standard SSD', color: '#f59e0b', iops: 6000, throughput: 750, latency: 5.0, costPerGib: 0.060, bestFor: 'Dev/test, light workloads, web servers with low traffic' },
  { name: 'Standard HDD', color: '#ef4444', iops: 2000, throughput: 500, latency: 12.0, costPerGib: 0.020, bestFor: 'Backups, archival, infrequent access, sequential I/O' },
];

const COST_COMPARISON_256GB = [
  { name: 'Standard HDD', monthly: 10.24, iops: 500, throughput: 60, latencyMs: 12 },
  { name: 'Standard SSD', monthly: 15.36, iops: 500, throughput: 100, latencyMs: 5.5 },
  { name: 'Premium SSD', monthly: 19.71, iops: 1100, throughput: 125, latencyMs: 2.0 },
  { name: 'Premium SSD v2', monthly: 44.04, iops: 5000, throughput: 200, latencyMs: 1.0 },
  { name: 'Ultra Disk', monthly: 91.07, iops: 10000, throughput: 400, latencyMs: 0.3 },
];

const COST_PER_IOPS = [
  { name: 'Standard HDD', costPer1000Iops: 20.48, type: 'Fixed' },
  { name: 'Standard SSD', costPer1000Iops: 30.72, type: 'Fixed' },
  { name: 'Premium SSD', costPer1000Iops: 17.92, type: 'Fixed' },
  { name: 'Premium SSD v2', costPer1000Iops: 8.81, type: 'Configurable' },
  { name: 'Ultra Disk', costPer1000Iops: 9.11, type: 'Configurable' },
];

const SCALING_DATA = [
  { size: '32 GiB', premSsd: 120, premSsdV2: 3000, ultra: 10000, stdSsd: 500, stdHdd: 500 },
  { size: '64 GiB', premSsd: 240, premSsdV2: 3000, ultra: 10000, stdSsd: 500, stdHdd: 500 },
  { size: '128 GiB', premSsd: 500, premSsdV2: 3000, ultra: 10000, stdSsd: 500, stdHdd: 500 },
  { size: '256 GiB', premSsd: 1100, premSsdV2: 5000, ultra: 10000, stdSsd: 500, stdHdd: 500 },
  { size: '512 GiB', premSsd: 2300, premSsdV2: 5000, ultra: 10000, stdSsd: 500, stdHdd: 500 },
  { size: '1 TiB', premSsd: 5000, premSsdV2: 5000, ultra: 10000, stdSsd: 500, stdHdd: 500 },
  { size: '2 TiB', premSsd: 7500, premSsdV2: 5000, ultra: 10000, stdSsd: 6000, stdHdd: 2000 },
  { size: '4 TiB', premSsd: 7500, premSsdV2: 5000, ultra: 10000, stdSsd: 6000, stdHdd: 2000 },
];

const RADAR_DATA = [
  { metric: 'IOPS', ultra: 100, premV2: 50, premSsd: 13, stdSsd: 4, stdHdd: 1 },
  { metric: 'Throughput', ultra: 100, premV2: 30, premSsd: 23, stdSsd: 19, stdHdd: 13 },
  { metric: 'Latency', ultra: 100, premV2: 85, premSsd: 70, stdSsd: 40, stdHdd: 10 },
  { metric: 'Cost Efficiency', ultra: 20, premV2: 65, premSsd: 80, stdSsd: 85, stdHdd: 100 },
  { metric: 'Flexibility', ultra: 95, premV2: 100, premSsd: 30, stdSsd: 20, stdHdd: 10 },
  { metric: 'Burst Capable', ultra: 0, premV2: 0, premSsd: 80, stdSsd: 80, stdHdd: 0 },
];

const METRICS_INDEX = [
  { category: 'Performance', metrics: [
    { name: 'IOPS', description: 'I/O operations per second — measures transactional throughput', unit: 'ops/sec', importance: 'Critical for databases and random I/O workloads', costLink: 'Higher IOPS = higher tier = more cost. PremV2/Ultra: billed per IOPS provisioned.' },
    { name: 'Throughput', description: 'Data transfer rate — measures sequential read/write speed', unit: 'MB/s', importance: 'Critical for data warehouses, backups, large file operations', costLink: 'PremV2: $0.027/MBps/mo above 125 baseline. Ultra: $0.000843/MBps/hr.' },
    { name: 'Latency', description: 'Time per I/O operation — measures responsiveness', unit: 'milliseconds', importance: 'Critical for user-facing apps and OLTP databases', costLink: 'Low latency requires expensive tiers. Ultra (0.3ms) costs 9× more than HDD (12ms).' },
  ]},
  { category: 'Saturation', metrics: [
    { name: 'Queue Depth', description: 'Pending I/O operations — measures disk saturation', unit: 'count', importance: 'Leading indicator of performance degradation', costLink: 'Sustained high QD = upgrade signal. Adding disks or upsizing tier increases cost.' },
    { name: 'IOPS Consumed %', description: 'Percentage of provisioned IOPS being used', unit: '%', importance: 'Shows proximity to provisioned ceiling', costLink: 'Below 50% = over-provisioned = wasted spend. Near 100% = throttling risk.' },
    { name: 'Bandwidth Consumed %', description: 'Percentage of provisioned throughput being used', unit: '%', importance: 'Shows proximity to throughput ceiling', costLink: 'Below 50% = over-provisioned. Reduce PremV2 throughput to save $0.027/MBps/mo.' },
  ]},
  { category: 'Capacity', metrics: [
    { name: '% Used Space', description: 'Disk space consumed as a percentage of provisioned size', unit: '%', importance: 'Prevents application failures from full disks', costLink: 'You pay for provisioned size, not used. Over-provisioning wastes money.' },
    { name: 'Free Megabytes', description: 'Absolute free space remaining', unit: 'MB', importance: 'Absolute measure — percentages can be misleading on large disks', costLink: 'Plan growth to avoid emergency upsizing at premium pricing.' },
  ]},
  { category: 'Burst Credits', metrics: [
    { name: 'Burst IO Credits', description: 'Available burst credits for IOPS above baseline', unit: 'credits', importance: 'Premium/Standard SSD only — enables temporary performance spikes', costLink: 'Free performance boost. Using bursts avoids upgrading to a more expensive tier.' },
    { name: 'Burst BPS Credits', description: 'Available burst credits for throughput above baseline', unit: 'credits', importance: 'Enables temporary throughput spikes without tier upgrade', costLink: 'Free throughput boost. Monitor depletion to avoid unexpected throttling.' },
  ]},
];

const VM_DISK_CAPS = [
  { vm: 'D2s_v5', vcpu: 2, ram: 8, maxIops: 3200, maxThroughput: 100, maxDisks: 4 },
  { vm: 'D4s_v5', vcpu: 4, ram: 16, maxIops: 6400, maxThroughput: 200, maxDisks: 8 },
  { vm: 'D8s_v5', vcpu: 8, ram: 32, maxIops: 12800, maxThroughput: 400, maxDisks: 16 },
  { vm: 'E4s_v5', vcpu: 4, ram: 32, maxIops: 6400, maxThroughput: 200, maxDisks: 8 },
  { vm: 'L8s_v3', vcpu: 8, ram: 64, maxIops: 400000, maxThroughput: 2000, maxDisks: 16 },
];

const DECISION_TREE = [
  { question: 'Do you need sub-millisecond latency?', yes: 'Ultra Disk', no: 'next' },
  { question: 'Do you need custom IOPS independent of disk size?', yes: 'Premium SSD v2', no: 'next' },
  { question: 'Is this a production workload?', yes: 'Premium SSD', no: 'next' },
  { question: 'Is this dev/test with moderate performance needs?', yes: 'Standard SSD', no: 'Standard HDD' },
];

// ============================================================================
// Subcomponents
// ============================================================================

function SectionHeader({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  return (
    <div id={id} className="scroll-mt-24 pt-8 pb-4 border-b border-slate-700">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}

function InteractiveCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

// ============================================================================
// Main Help Page
// ============================================================================

export default function HelpPage() {
  const [selectedDiskType, setSelectedDiskType] = useState<string>('all');
  const [activeDecisionStep, setActiveDecisionStep] = useState(0);
  const [selectedMetricCategory, setSelectedMetricCategory] = useState<string>('Performance');
  const [simDiskType, setSimDiskType] = useState<string>('Premium SSD v2');
  const [costSimIops, setCostSimIops] = useState(3000);
  const [costSimThroughput, setCostSimThroughput] = useState(125);
  const [costSimSize, setCostSimSize] = useState(256);

  // Disk type configurations for the simulator
  const DISK_SIM_CONFIGS: Record<string, {
    sizes: { label: string; sizeGb: number; iops: number; throughput: number; monthly: number }[];
    customizable: boolean;
    color: string;
    baselineIops?: number;
    baselineThroughput?: number;
    iopsRate?: number;
    throughputRate?: number;
    capacityRate?: number;
    hourlyCapacity?: number;
    hourlyIops?: number;
    hourlyThroughput?: number;
    isHourly?: boolean;
  }> = {
    'Premium SSD': {
      customizable: false, color: '#22c55e',
      sizes: [
        { label: 'P4', sizeGb: 32, iops: 120, throughput: 25, monthly: 2.40 },
        { label: 'P6', sizeGb: 64, iops: 240, throughput: 50, monthly: 4.80 },
        { label: 'P10', sizeGb: 128, iops: 500, throughput: 100, monthly: 9.86 },
        { label: 'P15', sizeGb: 256, iops: 1100, throughput: 125, monthly: 19.71 },
        { label: 'P20', sizeGb: 512, iops: 2300, throughput: 150, monthly: 38.41 },
        { label: 'P30', sizeGb: 1024, iops: 5000, throughput: 200, monthly: 76.80 },
        { label: 'P40', sizeGb: 2048, iops: 7500, throughput: 250, monthly: 147.46 },
        { label: 'P50', sizeGb: 4096, iops: 7500, throughput: 250, monthly: 294.91 },
      ],
    },
    'Premium SSD v2': {
      customizable: true, color: '#3b82f6',
      baselineIops: 3000, baselineThroughput: 125,
      capacityRate: 0.0554, iopsRate: 0.00488, throughputRate: 0.0269,
      sizes: [],
    },
    'Standard SSD': {
      customizable: false, color: '#f59e0b',
      sizes: [
        { label: 'E4', sizeGb: 32, iops: 500, throughput: 60, monthly: 1.20 },
        { label: 'E6', sizeGb: 64, iops: 500, throughput: 60, monthly: 2.40 },
        { label: 'E10', sizeGb: 128, iops: 500, throughput: 60, monthly: 3.84 },
        { label: 'E15', sizeGb: 256, iops: 500, throughput: 60, monthly: 7.68 },
        { label: 'E20', sizeGb: 512, iops: 500, throughput: 60, monthly: 15.36 },
        { label: 'E30', sizeGb: 1024, iops: 500, throughput: 60, monthly: 30.72 },
        { label: 'E40', sizeGb: 2048, iops: 500, throughput: 60, monthly: 61.44 },
      ],
    },
    'Standard HDD': {
      customizable: false, color: '#ef4444',
      sizes: [
        { label: 'S4', sizeGb: 32, iops: 500, throughput: 60, monthly: 0.77 },
        { label: 'S6', sizeGb: 64, iops: 500, throughput: 60, monthly: 1.54 },
        { label: 'S10', sizeGb: 128, iops: 500, throughput: 60, monthly: 1.54 },
        { label: 'S15', sizeGb: 256, iops: 500, throughput: 60, monthly: 2.87 },
        { label: 'S20', sizeGb: 512, iops: 500, throughput: 60, monthly: 5.89 },
        { label: 'S30', sizeGb: 1024, iops: 500, throughput: 60, monthly: 11.26 },
        { label: 'S40', sizeGb: 2048, iops: 500, throughput: 60, monthly: 21.76 },
      ],
    },
    'Ultra Disk': {
      customizable: true, color: '#8b5cf6', isHourly: true,
      hourlyCapacity: 0.000164, hourlyIops: 0.000068, hourlyThroughput: 0.000479,
      sizes: [
        { label: '4 GiB', sizeGb: 4, iops: 0, throughput: 0, monthly: 0 },
        { label: '8 GiB', sizeGb: 8, iops: 0, throughput: 0, monthly: 0 },
        { label: '16 GiB', sizeGb: 16, iops: 0, throughput: 0, monthly: 0 },
        { label: '32 GiB', sizeGb: 32, iops: 0, throughput: 0, monthly: 0 },
        { label: '64 GiB', sizeGb: 64, iops: 0, throughput: 0, monthly: 0 },
        { label: '128 GiB', sizeGb: 128, iops: 0, throughput: 0, monthly: 0 },
        { label: '256 GiB', sizeGb: 256, iops: 0, throughput: 0, monthly: 0 },
        { label: '512 GiB', sizeGb: 512, iops: 0, throughput: 0, monthly: 0 },
        { label: '1024 GiB', sizeGb: 1024, iops: 0, throughput: 0, monthly: 0 },
        { label: '2048 GiB', sizeGb: 2048, iops: 0, throughput: 0, monthly: 0 },
        { label: '4096 GiB', sizeGb: 4096, iops: 0, throughput: 0, monthly: 0 },
      ],
    },
  };

  const simConfig = DISK_SIM_CONFIGS[simDiskType];
  const [simTierIndex, setSimTierIndex] = useState(3); // default P15 for fixed tiers

  // Calculate cost based on disk type
  let simTotal = 0;
  let simBreakdown: { label: string; value: number; color: string }[] = [];
  let simSpecs = { iops: 0, throughput: 0, sizeGb: costSimSize };

  if (simDiskType === 'Premium SSD v2' && simConfig.customizable) {
    const cap = costSimSize * (simConfig.capacityRate || 0);
    const iopsExtra = Math.max(0, costSimIops - (simConfig.baselineIops || 0)) * (simConfig.iopsRate || 0);
    const tpExtra = Math.max(0, costSimThroughput - (simConfig.baselineThroughput || 0)) * (simConfig.throughputRate || 0);
    simTotal = cap + iopsExtra + tpExtra;
    simBreakdown = [
      { label: `Capacity (${costSimSize} GiB)`, value: cap, color: '#3b82f6' },
      { label: `IOPS (${Math.max(0, costSimIops - 3000).toLocaleString()} extra)`, value: iopsExtra, color: '#8b5cf6' },
      { label: `Throughput (${Math.max(0, costSimThroughput - 125)} extra MB/s)`, value: tpExtra, color: '#22c55e' },
    ];
    simSpecs = { iops: costSimIops, throughput: costSimThroughput, sizeGb: costSimSize };
  } else if (simDiskType === 'Ultra Disk' && simConfig.isHourly) {
    const cap = (simConfig.hourlyCapacity || 0) * costSimSize * 730;
    const iopsC = (simConfig.hourlyIops || 0) * costSimIops * 730;
    const tpC = (simConfig.hourlyThroughput || 0) * costSimThroughput * 730;
    simTotal = cap + iopsC + tpC;
    simBreakdown = [
      { label: `Capacity (${costSimSize} GiB)`, value: cap, color: '#8b5cf6' },
      { label: `IOPS (${costSimIops.toLocaleString()})`, value: iopsC, color: '#3b82f6' },
      { label: `Throughput (${costSimThroughput} MB/s)`, value: tpC, color: '#22c55e' },
    ];
    simSpecs = { iops: costSimIops, throughput: costSimThroughput, sizeGb: costSimSize };
  } else if (!simConfig.customizable && simConfig.sizes.length > 0) {
    const idx = Math.min(simTierIndex, simConfig.sizes.length - 1);
    const tier = simConfig.sizes[idx];
    simTotal = tier.monthly;
    simBreakdown = [{ label: `${tier.label} (${tier.sizeGb} GiB)`, value: tier.monthly, color: simConfig.color }];
    simSpecs = { iops: tier.iops, throughput: tier.throughput, sizeGb: tier.sizeGb };
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="rounded-lg bg-blue-600 p-2 hover:bg-blue-700 transition-colors" title="Home">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white">Azure Disk Monitoring — Help &amp; Reference Guide</h1>
                <p className="text-xs text-slate-400">Interactive guide to Azure disk types, metrics, and cost optimization</p>
              </div>
            </div>
          </div>
          {/* Quick Jump Navigation */}
          <nav className="mt-3 flex flex-wrap gap-2">
            {['disk-types', 'cost-comparison', 'cost-simulator', 'metrics-reference', 'scaling', 'vm-caps', 'decision-guide', 'best-practices'].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 transition-colors hover:border-blue-500 hover:text-blue-400"
              >
                {id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6 space-y-8">

        {/* ================================================================== */}
        {/* SECTION 1: Azure Disk Types Overview */}
        {/* ================================================================== */}
        <SectionHeader id="disk-types" title="Azure Managed Disk Types" subtitle="Five tiers of managed disks to match every workload and budget" />

        {/* Disk Type Selector */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDiskType('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${selectedDiskType === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
          >
            All Types
          </button>
          {DISK_TYPES.map((dt) => (
            <button
              key={dt.name}
              onClick={() => setSelectedDiskType(dt.name)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${selectedDiskType === dt.name ? 'text-white' : 'text-slate-400 hover:text-white border border-slate-700'}`}
              style={selectedDiskType === dt.name ? { backgroundColor: dt.color } : { backgroundColor: '#1e293b' }}
            >
              {dt.name}
            </button>
          ))}
        </div>

        {/* Disk Type Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {DISK_TYPES.filter((dt) => selectedDiskType === 'all' || dt.name === selectedDiskType).map((dt) => (
            <div
              key={dt.name}
              className="rounded-xl border border-slate-700 bg-slate-800 p-5 transition-all hover:scale-[1.02]"
              style={{ borderTopColor: dt.color, borderTopWidth: '3px' }}
            >
              <h3 className="text-lg font-bold text-white">{dt.name}</h3>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Max IOPS</span>
                  <span className="font-mono text-white">{dt.iops.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Max Throughput</span>
                  <span className="font-mono text-white">{dt.throughput.toLocaleString()} MB/s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Typical Latency</span>
                  <span className="font-mono text-white">{dt.latency} ms</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Cost/GiB/mo</span>
                  <span className="font-mono text-amber-400">${dt.costPerGib}</span>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-slate-700/50 p-2">
                <p className="text-xs text-slate-300"><span className="font-semibold text-slate-200">Best for:</span> {dt.bestFor}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Capability Comparison — Grouped Bar Chart */}
        <InteractiveCard>
          <h3 className="mb-2 text-lg font-semibold text-white">Disk Type Capability Comparison</h3>
          <p className="mb-5 text-sm text-slate-400">Each capability scored 0–100. Longer bar = better. For latency, higher score = lower latency.</p>

          <div className="space-y-5">
            {RADAR_DATA.map((row) => (
              <div key={row.metric}>
                <div className="text-xs font-semibold text-slate-300 mb-2">{row.metric}</div>
                <div className="space-y-1.5">
                  {[
                    { name: 'Ultra Disk', value: row.ultra, color: '#8b5cf6' },
                    { name: 'Premium SSD v2', value: row.premV2, color: '#3b82f6' },
                    { name: 'Premium SSD', value: row.premSsd, color: '#22c55e' },
                    { name: 'Standard SSD', value: row.stdSsd, color: '#f59e0b' },
                    { name: 'Standard HDD', value: row.stdHdd, color: '#ef4444' },
                  ].map((disk) => (
                    <div key={disk.name} className="flex items-center gap-3">
                      <span className="w-28 text-[11px] text-slate-400 text-right flex-shrink-0 truncate">{disk.name}</span>
                      <div className="flex-1 h-5 rounded-full bg-slate-700/50 overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${disk.value}%`, backgroundColor: disk.color }}
                        />
                        {disk.value > 8 && (
                          <span className="absolute inset-y-0 flex items-center text-[10px] font-bold text-white" style={{ left: `${Math.min(disk.value - 3, 90)}%`, paddingLeft: '6px' }}>
                            {disk.value}
                          </span>
                        )}
                        {disk.value > 0 && disk.value <= 8 && (
                          <span className="absolute inset-y-0 flex items-center text-[10px] font-bold text-slate-300" style={{ left: `${disk.value + 1}%`, paddingLeft: '4px' }}>
                            {disk.value}
                          </span>
                        )}
                        {disk.value === 0 && (
                          <span className="absolute inset-y-0 flex items-center text-[10px] text-slate-500 pl-2">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs">
            {[
              { name: 'Ultra Disk', color: '#8b5cf6' },
              { name: 'Premium SSD v2', color: '#3b82f6' },
              { name: 'Premium SSD', color: '#22c55e' },
              { name: 'Standard SSD', color: '#f59e0b' },
              { name: 'Standard HDD', color: '#ef4444' },
            ].map((d) => (
              <span key={d.name} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
                <span className="text-slate-300">{d.name}</span>
              </span>
            ))}
          </div>
        </InteractiveCard>

        {/* ================================================================== */}
        {/* SECTION 2: Cost Comparison */}
        {/* ================================================================== */}
        <SectionHeader id="cost-comparison" title="Cost Comparison" subtitle="Side-by-side pricing for the same 256 GiB disk across all tiers" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Monthly Cost Bar Chart */}
          <InteractiveCard>
            <h3 className="mb-4 text-lg font-semibold text-white">Monthly Cost — 256 GiB Disk</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={COST_COMPARISON_256GB} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} formatter={(v: number) => `$${v.toFixed(2)}/mo`} />
                <Bar dataKey="monthly" name="Monthly Cost" radius={[0, 4, 4, 0]}>
                  {COST_COMPARISON_256GB.map((entry, i) => (
                    <Cell key={i} fill={DISK_TYPES[i]?.color || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </InteractiveCard>

          {/* Cost per 1000 IOPS */}
          <InteractiveCard>
            <h3 className="mb-4 text-lg font-semibold text-white">Effective Cost per 1,000 IOPS</h3>
            <p className="mb-3 text-xs text-slate-400">Shows cost-efficiency — lower is better. PremV2 and Ultra let you pay only for IOPS you need.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={COST_PER_IOPS} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} formatter={(v: number) => `$${v.toFixed(2)} per 1K IOPS`} />
                <Bar dataKey="costPer1000Iops" name="$/1000 IOPS" radius={[0, 4, 4, 0]}>
                  {COST_PER_IOPS.map((entry, i) => (
                    <Cell key={i} fill={DISK_TYPES[i]?.color || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </InteractiveCard>
        </div>

        {/* Price vs Performance Scatter */}
        <InteractiveCard>
          <h3 className="mb-4 text-lg font-semibold text-white">Price vs Performance (256 GiB)</h3>
          <p className="mb-3 text-xs text-slate-400">Bubble size = throughput (MB/s). X = monthly cost. Y = IOPS. Upper-left = best value.</p>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" dataKey="monthly" name="Monthly Cost" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="number" dataKey="iops" name="IOPS" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
              <ZAxis type="number" dataKey="throughput" range={[100, 800]} name="Throughput (MB/s)" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Monthly Cost') return `$${value.toFixed(2)}`;
                  if (name === 'Throughput (MB/s)') return `${value} MB/s`;
                  return value.toLocaleString();
                }}
              />
              <Scatter data={COST_COMPARISON_256GB} name="Disk Types">
                {COST_COMPARISON_256GB.map((_, i) => (
                  <Cell key={i} fill={DISK_TYPES[i]?.color || '#64748b'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
            {COST_COMPARISON_256GB.map((d, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DISK_TYPES[i]?.color }} />
                <span className="text-slate-400">{d.name}</span>
              </span>
            ))}
          </div>
        </InteractiveCard>

        {/* ================================================================== */}
        {/* SECTION 3: Interactive Cost Simulator — All Disk Types */}
        {/* ================================================================== */}
        <SectionHeader id="cost-simulator" title="Azure Disk Cost Simulator" subtitle="Select any disk type and configure size, IOPS, and throughput to estimate monthly cost" />

        <InteractiveCard>
          {/* Disk Type Selector */}
          <div className="mb-6">
            <div className="text-xs text-slate-500 mb-2">Select Disk Type</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DISK_SIM_CONFIGS).map(([name, cfg]) => (
                <button key={name} onClick={() => { setSimDiskType(name); setSimTierIndex(3); setCostSimIops(name === 'Ultra Disk' ? 10000 : 3000); setCostSimThroughput(name === 'Ultra Disk' ? 400 : 125); setCostSimSize(256); }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${simDiskType === name ? 'text-white border-2 scale-105' : 'text-slate-400 border border-slate-700 hover:text-white'}`}
                  style={simDiskType === name ? { backgroundColor: cfg.color + '30', borderColor: cfg.color } : {}}>
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Controls */}
            <div className="space-y-6">
              {simConfig.customizable || simConfig.isHourly ? (
                <>
                  {/* Capacity — Ultra uses fixed sizes, PremV2 uses flexible GiB */}
                  {simDiskType === 'Ultra Disk' ? (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Capacity (fixed sizes)</span>
                        <span className="font-mono text-white">{costSimSize} GiB</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {simConfig.sizes.map((s) => (
                          <button key={s.sizeGb} onClick={() => setCostSimSize(s.sizeGb)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${costSimSize === s.sizeGb ? 'bg-purple-600/30 text-white border-2 border-purple-500' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                            {s.sizeGb >= 1024 ? `${s.sizeGb / 1024} TiB` : `${s.sizeGb} GiB`}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">Azure Ultra Disk capacity must be a predefined size (powers of 2). IOPS and throughput are independently configurable.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Capacity</span>
                        <span className="font-mono text-white">{costSimSize} GiB</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048].map((sz) => (
                          <button key={sz} onClick={() => setCostSimSize(sz)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${costSimSize === sz ? 'bg-blue-600/30 text-white border-2 border-blue-500' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                            {sz >= 1024 ? `${sz / 1024} TiB` : `${sz} GiB`}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1.5">Premium SSD v2 capacity can be any size in 1 GiB increments. Common sizes shown above for quick selection.</p>
                    </div>
                  )}
                  {/* IOPS Slider */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Provisioned IOPS</span>
                      <span className="font-mono text-white">{costSimIops.toLocaleString()}</span>
                    </div>
                    <input type="range" min={simDiskType === 'Ultra Disk' ? 100 : 3000} max={simDiskType === 'Ultra Disk' ? 160000 : 80000} step={100} value={costSimIops} onChange={(e) => setCostSimIops(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700" style={{ accentColor: '#8b5cf6' }} />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>{simDiskType === 'Ultra Disk' ? '100' : '3,000 (free baseline)'}</span>
                      <span>{simDiskType === 'Ultra Disk' ? '160,000' : '80,000'}</span>
                    </div>
                  </div>
                  {/* Throughput Slider */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Provisioned Throughput</span>
                      <span className="font-mono text-white">{costSimThroughput} MB/s</span>
                    </div>
                    <input type="range" min={simDiskType === 'Ultra Disk' ? 1 : 125} max={simDiskType === 'Ultra Disk' ? 4000 : 1200} step={1} value={costSimThroughput} onChange={(e) => setCostSimThroughput(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700" style={{ accentColor: '#22c55e' }} />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>{simDiskType === 'Ultra Disk' ? '1 MB/s' : '125 MB/s (free baseline)'}</span>
                      <span>{simDiskType === 'Ultra Disk' ? '4,000 MB/s' : '1,200 MB/s'}</span>
                    </div>
                  </div>
                  {simDiskType === 'Ultra Disk' && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                      <p className="text-xs text-amber-200">Ultra Disk is billed <strong>hourly</strong> — charges apply 24/7 even when VM is deallocated. Detach the disk to stop billing.</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Fixed Tier Selector for Premium SSD, Standard SSD, Standard HDD */}
                  <div>
                    <div className="text-sm text-slate-400 mb-3">Select Disk Tier</div>
                    <div className="space-y-2">
                      {simConfig.sizes.map((tier, i) => (
                        <button key={tier.label} onClick={() => setSimTierIndex(i)}
                          className={`w-full flex items-center justify-between rounded-lg border p-3 transition-all text-left ${simTierIndex === i ? 'border-2 bg-slate-800/80' : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'}`}
                          style={simTierIndex === i ? { borderColor: simConfig.color } : {}}>
                          <div className="flex items-center gap-3">
                            <span className="rounded-lg px-2.5 py-1 text-xs font-bold font-mono" style={simTierIndex === i ? { backgroundColor: simConfig.color + '30', color: simConfig.color } : { backgroundColor: '#334155', color: '#94a3b8' }}>{tier.label}</span>
                            <div>
                              <div className="text-sm text-white">{tier.sizeGb} GiB</div>
                              <div className="text-[10px] text-slate-500">{tier.iops.toLocaleString()} IOPS &bull; {tier.throughput} MB/s</div>
                            </div>
                          </div>
                          <span className="text-sm font-mono font-bold text-amber-400">${tier.monthly.toFixed(2)}<span className="text-[10px] text-slate-500">/mo</span></span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                    <p className="text-xs text-blue-200">{simDiskType} has <strong>fixed</strong> IOPS and throughput per tier. To get custom IOPS, use Premium SSD v2 or Ultra Disk.</p>
                  </div>
                </>
              )}
            </div>

            {/* Cost Result */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-600 bg-gradient-to-br p-5" style={{ borderColor: simConfig.color + '60', background: `linear-gradient(135deg, ${simConfig.color}10, ${simConfig.color}05)` }}>
                <div className="text-sm text-slate-400 mb-1">Estimated Monthly Cost</div>
                <div className="text-4xl font-bold text-white">${simTotal.toFixed(2)}<span className="text-lg text-slate-400">/mo</span></div>
                <div className="mt-2 text-xs text-slate-500">{simDiskType} &bull; {simSpecs.sizeGb} GiB &bull; {simSpecs.iops.toLocaleString()} IOPS &bull; {simSpecs.throughput} MB/s</div>
              </div>

              {simBreakdown.length > 1 && (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={simBreakdown.map((b) => ({ name: b.label, value: Math.round(b.value * 100) / 100, fill: b.color }))} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => `$${v.toFixed(2)}/mo`} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}

              <div className="space-y-1.5 text-xs">
                {simBreakdown.map((b) => (
                  <div key={b.label} className="flex justify-between">
                    <span style={{ color: b.color }}>{b.label}</span>
                    <span className="font-mono text-white">${b.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Quick comparison */}
              <div className="rounded-lg bg-slate-700/30 border border-slate-700 p-3">
                <div className="text-[10px] text-slate-500 mb-2">Same capacity across disk types:</div>
                <div className="space-y-1">
                  {[
                    { name: 'Standard HDD', cost: simSpecs.sizeGb <= 32 ? 0.77 : simSpecs.sizeGb <= 64 ? 1.54 : simSpecs.sizeGb <= 128 ? 1.54 : simSpecs.sizeGb <= 256 ? 2.87 : simSpecs.sizeGb <= 512 ? 5.89 : simSpecs.sizeGb <= 1024 ? 11.26 : 21.76, color: '#ef4444' },
                    { name: 'Standard SSD', cost: simSpecs.sizeGb <= 32 ? 1.20 : simSpecs.sizeGb <= 64 ? 2.40 : simSpecs.sizeGb <= 128 ? 3.84 : simSpecs.sizeGb <= 256 ? 7.68 : simSpecs.sizeGb <= 512 ? 15.36 : simSpecs.sizeGb <= 1024 ? 30.72 : 61.44, color: '#f59e0b' },
                    { name: 'Premium SSD', cost: simSpecs.sizeGb <= 32 ? 2.40 : simSpecs.sizeGb <= 64 ? 4.80 : simSpecs.sizeGb <= 128 ? 9.86 : simSpecs.sizeGb <= 256 ? 19.71 : simSpecs.sizeGb <= 512 ? 38.41 : simSpecs.sizeGb <= 1024 ? 76.80 : 147.46, color: '#22c55e' },
                  ].filter((c) => c.name !== simDiskType).map((c) => (
                    <div key={c.name} className="flex justify-between text-[10px]">
                      <span style={{ color: c.color }}>{c.name} (~{simSpecs.sizeGb} GiB)</span>
                      <span className="font-mono text-slate-400">${c.cost.toFixed(2)}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </InteractiveCard>

        {/* ================================================================== */}
        {/* SECTION 4: Metrics Reference */}
        {/* ================================================================== */}
        <SectionHeader id="metrics-reference" title="Metrics Reference" subtitle="Every metric we collect, why it matters, and how it affects your Azure bill" />

        {/* Category Tabs */}
        <div className="flex gap-2">
          {METRICS_INDEX.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setSelectedMetricCategory(cat.category)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${selectedMetricCategory === cat.category ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              {cat.category}
            </button>
          ))}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {METRICS_INDEX.find((c) => c.category === selectedMetricCategory)?.metrics.map((m) => (
            <InteractiveCard key={m.name}>
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-base font-bold text-white">{m.name}</h4>
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-300">{m.unit}</span>
              </div>
              <p className="text-sm text-slate-300 mb-3">{m.description}</p>
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 mb-3">
                <div className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold mb-1">Why It Matters</div>
                <p className="text-xs text-slate-300">{m.importance}</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold mb-1">Cost Impact</div>
                <p className="text-xs text-slate-300">{m.costLink}</p>
              </div>
            </InteractiveCard>
          ))}
        </div>

        {/* ================================================================== */}
        {/* SECTION 5: IOPS Scaling by Disk Size */}
        {/* ================================================================== */}
        <SectionHeader id="scaling" title="IOPS Scaling by Disk Size" subtitle="Premium SSD IOPS scale with disk size — others don't. Understanding this prevents overspending." />

        <InteractiveCard>
          <h3 className="mb-4 text-lg font-semibold text-white">IOPS vs Disk Size by Type</h3>
          <p className="mb-3 text-xs text-slate-400">Premium SSD IOPS increase with each tier. PremV2 and Ultra are independently configurable. Standard tiers are mostly fixed.</p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={SCALING_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="size" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="ultra" name="Ultra Disk" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="premSsdV2" name="Premium SSD v2" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="premSsd" name="Premium SSD" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="stdSsd" name="Standard SSD" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="stdHdd" name="Standard HDD" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <p className="text-xs text-amber-200"><strong>Cost Insight:</strong> If you need 2,300 IOPS with Premium SSD, you must buy a P20 (512 GiB) at $38.41/mo — even if you only use 50 GiB of data. With Premium SSD v2, you can buy 256 GiB with 2,300 IOPS for ~$30/mo. This <strong>decoupling of IOPS from capacity</strong> is where PremV2 saves money.</p>
          </div>
        </InteractiveCard>

        {/* ================================================================== */}
        {/* SECTION 6: VM-Level Disk Caps */}
        {/* ================================================================== */}
        <SectionHeader id="vm-caps" title="VM-Level Disk Caps" subtitle="Your VM limits total disk performance — a disk can never exceed its host VM's cap" />

        <InteractiveCard>
          <h3 className="mb-4 text-lg font-semibold text-white">VM Uncached Disk Performance Limits</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={VM_DISK_CAPS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="vm" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar yAxisId="left" dataKey="maxIops" name="Max Uncached IOPS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="maxThroughput" name="Max Throughput (MB/s)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead><tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
                <th className="px-3 py-2">VM SKU</th><th className="px-3 py-2">vCPUs</th><th className="px-3 py-2">RAM</th><th className="px-3 py-2">Max IOPS</th><th className="px-3 py-2">Max Throughput</th><th className="px-3 py-2">Max Data Disks</th>
              </tr></thead>
              <tbody>
                {VM_DISK_CAPS.map((vm) => (
                  <tr key={vm.vm} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-3 py-2 font-mono text-white">{vm.vm}</td>
                    <td className="px-3 py-2 text-slate-300">{vm.vcpu}</td>
                    <td className="px-3 py-2 text-slate-300">{vm.ram} GiB</td>
                    <td className="px-3 py-2 font-mono text-blue-400">{vm.maxIops.toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-emerald-400">{vm.maxThroughput} MB/s</td>
                    <td className="px-3 py-2 text-slate-300">{vm.maxDisks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-xs text-red-200"><strong>Warning:</strong> Attaching an Ultra Disk (10,000 IOPS) to a D4s_v5 (6,400 IOPS cap) means you pay for 10,000 IOPS but can only use 6,400. That&apos;s <strong>$12.10/mo wasted</strong> on unusable IOPS. Always match disk provisioning to your VM&apos;s cap.</p>
          </div>
        </InteractiveCard>

        {/* ================================================================== */}
        {/* SECTION 7: Decision Guide */}
        {/* ================================================================== */}
        <SectionHeader id="decision-guide" title="Disk Type Decision Guide" subtitle="Interactive flowchart to choose the right disk type for your workload" />

        <InteractiveCard>
          <div className="space-y-4">
            {DECISION_TREE.map((step, i) => (
              <div
                key={i}
                className={`rounded-xl border p-5 transition-all ${i === activeDecisionStep ? 'border-blue-500 bg-blue-500/10 scale-[1.01]' : i < activeDecisionStep ? 'border-slate-600 bg-slate-800/50 opacity-60' : 'border-slate-700 bg-slate-800/30 opacity-40'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === activeDecisionStep ? 'bg-blue-600 text-white' : i < activeDecisionStep ? 'bg-slate-600 text-slate-300' : 'bg-slate-700 text-slate-500'}`}>
                    {i + 1}
                  </span>
                  <h4 className="text-base font-semibold text-white">{step.question}</h4>
                </div>
                {i === activeDecisionStep && (
                  <div className="flex gap-3 ml-11">
                    <button
                      onClick={() => {
                        if (step.yes && !step.yes.includes('next')) {
                          setActiveDecisionStep(DECISION_TREE.length); // show result
                        }
                      }}
                      className="rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-6 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                    >
                      Yes → <strong>{step.yes === 'next' ? 'Continue' : step.yes}</strong>
                    </button>
                    <button
                      onClick={() => {
                        if (step.no === 'next') {
                          setActiveDecisionStep(i + 1);
                        } else {
                          setActiveDecisionStep(DECISION_TREE.length);
                        }
                      }}
                      className="rounded-lg bg-slate-700/50 border border-slate-600 px-6 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      No → <strong>{step.no === 'next' ? 'Next Question' : step.no}</strong>
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() => setActiveDecisionStep(0)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Start Over
            </button>
          </div>
        </InteractiveCard>

        {/* ================================================================== */}
        {/* SECTION 8: Best Practices */}
        {/* ================================================================== */}
        <SectionHeader id="best-practices" title="Cost Optimization Best Practices" subtitle="Actionable strategies to reduce Azure disk spending" />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { icon: '💰', title: 'Right-size your disks', description: 'Monitor IOPS/Bandwidth Consumed %. If consistently below 50%, you\'re over-provisioned. Downgrade to save.', savings: 'Save 20-50% on disk costs' },
            { icon: '⏸️', title: 'Deallocate VMs when idle', description: 'VMs charge per-hour. Deallocating overnight and weekends saves ~75% on compute. Disks still charge.', savings: 'Save ~$900/mo on this POC' },
            { icon: '🔌', title: 'Detach Ultra Disks when not testing', description: 'Ultra Disk charges 24/7 even when the VM is off. Detach it to stop billing. Reattach when needed.', savings: 'Save $91/mo per Ultra Disk' },
            { icon: '📊', title: 'Use PremSSD v2 baseline IOPS', description: 'PremV2 includes 3,000 IOPS and 125 MB/s free. Only provision above baseline when actively testing.', savings: 'Save up to $30/mo per disk' },
            { icon: '🔄', title: 'Use burst credits instead of upgrading', description: 'Premium and Standard SSD accumulate burst credits during idle time. Use bursts for spikes instead of a bigger tier.', savings: 'Avoid $20-40/mo tier upgrades' },
            { icon: '📏', title: 'Decouple IOPS from capacity with PremV2', description: 'Premium SSD forces you to buy capacity for IOPS. PremV2 lets you set IOPS independently. 256GiB+5K IOPS is cheaper than P30.', savings: 'Save $15-30/mo vs Premium SSD' },
            { icon: '🖥️', title: 'Match disk to VM caps', description: 'Don\'t provision disk IOPS above your VM\'s uncached cap. A D4s_v5 caps at 6,400 IOPS — paying for more is wasted.', savings: 'Avoid $5-15/mo waste' },
            { icon: '📉', title: 'Set Log Analytics daily cap', description: 'During non-benchmark periods, set the daily cap to 1 GB. Raise it only during active testing.', savings: 'Save ~$30/mo on ingestion' },
          ].map((tip) => (
            <div key={tip.title} className="rounded-xl border border-slate-700 bg-slate-800 p-5 transition-all hover:border-emerald-500/30">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tip.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-white">{tip.title}</h4>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">{tip.description}</p>
                  <span className="mt-2 inline-block rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
                    {tip.savings}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ============= ABOUT THIS PLATFORM ============= */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 mt-8">
          <h2 className="text-xl font-bold text-white mb-4">About This Platform</h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            This is a comprehensive Azure resource monitoring, cost management, and governance platform built as a POC for subscription <code className="text-xs font-mono text-blue-400">e62428e7-...2c51586d9105</code>. It provides a single pane of glass across 14 interactive pages covering disk performance, billing, cost optimization, and operational intelligence.
          </p>

          <h3 className="text-base font-bold text-white mt-6 mb-3">All 14 Pages</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { path: '/', name: 'Home', desc: 'Landing page with search, category navigation, and 14 page cards' },
              { path: '/monitor', name: 'All Resources', desc: '21 subscription services inventory, VM fleet monitoring, disk drill-down' },
              { path: '/metrics', name: 'Metrics Dashboard', desc: '7-tab metrics: IOPS, throughput, latency, queue depth, capacity, comparison' },
              { path: '/services', name: 'Service Explorer', desc: 'Deep dive into 21 Azure service types with 209 clickable resources' },
              { path: '/workloads', name: 'Workload Map', desc: '10 logical workloads with cost flow, resource groups, and recommendations' },
              { path: '/cost-analyzer', name: 'Cost Analyzer', desc: 'Subscription cost by RG/service, tag governance, new resources tracker' },
              { path: '/billing', name: 'Billing Dashboard', desc: '6-month billing history, daily spend, invoices, cost anomaly detection' },
              { path: '/azure-advisor', name: 'Azure Advisor', desc: '359 recommendations across Security, Reliability, Cost, Operations' },
              { path: '/finops', name: 'FinOps', desc: 'All 23 resources with PAYG vs RI analysis, executive-friendly language' },
              { path: '/advisor', name: 'AI Disk Advisor', desc: 'Conversational AI for disk cost/performance Q&A with KQL generation' },
              { path: '/technical', name: 'Technical Details', desc: 'Architecture diagrams, 24 metrics catalog, live pricing, benchmarks' },
              { path: '/deep-dive', name: 'Deep Dive', desc: '17 KQL queries, 29 perf counters, 42 platform metrics by category' },
              { path: '/design', name: 'Design Document', desc: '8-section design doc with Mermaid diagrams for architecture decisions' },
              { path: '/help', name: 'Help & Simulator', desc: 'Disk cost simulator, comparison tables, decision guide, best practices' },
            ].map(p => (
              <Link key={p.path} href={p.path} className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-900/30 px-4 py-3 hover:bg-slate-700/20 transition-colors group">
                <code className="text-xs font-mono text-blue-400 flex-shrink-0 mt-0.5 group-hover:text-blue-300">{p.path}</code>
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.desc}</div>
                </div>
              </Link>
            ))}
          </div>

          <h3 className="text-base font-bold text-white mt-6 mb-3">Technology Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Frontend', value: 'Next.js 14 + Tailwind CSS + Recharts' },
              { label: 'Hosting', value: 'Azure Static Web Apps (Standard)' },
              { label: 'Infrastructure', value: 'Bicep IaC (7 modules, subscription-scoped)' },
              { label: 'Monitoring', value: 'AMA + DCR + Log Analytics' },
              { label: 'Visualization', value: 'Azure Managed Grafana' },
              { label: 'AI', value: 'Azure OpenAI GPT-4o-mini' },
              { label: 'Icons', value: 'Official Azure SVG icon set' },
              { label: 'Theme', value: 'Corporate Navy (Inter font, 15px)' },
            ].map(t => (
              <div key={t.label} className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-3 py-2">
                <div className="text-xs text-slate-400">{t.label}</div>
                <div className="text-sm font-medium text-white">{t.value}</div>
              </div>
            ))}
          </div>

          <h3 className="text-base font-bold text-white mt-6 mb-3">Key Data Sources</h3>
          <div className="space-y-2">
            {[
              { source: 'Azure Cost Management API', data: '6-month billing, daily spend, cost by service/RG/tag' },
              { source: 'Azure Resource Graph', data: '209 resources, 21 service types, creation timeline' },
              { source: 'Azure Advisor API', data: '359 recommendations across 4 WAF pillars' },
              { source: 'Azure Monitor / AMA', data: '29 perf counters, 42 platform metrics, DCR-based collection' },
              { source: 'ARM / Compute API', data: 'VM power states, disk SKUs, sizes, attachment status' },
            ].map(d => (
              <div key={d.source} className="flex items-center gap-3 text-sm">
                <span className="text-emerald-400 font-semibold flex-shrink-0 w-52">{d.source}</span>
                <span className="text-slate-300">{d.data}</span>
              </div>
            ))}
          </div>

          <h3 className="text-base font-bold text-white mt-6 mb-3">Azure Resources (POC)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Virtual Machines', value: '5 (all deallocated)' },
              { label: 'Managed Disks', value: '13 (5 types)' },
              { label: 'Total Subscription', value: '209 resources' },
              { label: 'Service Types', value: '21' },
              { label: 'Resource Groups', value: '28' },
              { label: 'Regions', value: '7 (East US 2 primary)' },
              { label: 'Advisor Findings', value: '359' },
              { label: 'MTD Cost', value: '~$185 (Mar 2026)' },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-3 py-2">
                <div className="text-xs text-slate-400">{s.label}</div>
                <div className="text-sm font-bold text-white">{s.value}</div>
              </div>
            ))}
          </div>

          <h3 className="text-base font-bold text-white mt-6 mb-3">GitHub Repository</h3>
          <a href="https://github.com/KrishnaDistributedcomputing/azure-disk-monitoring" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            KrishnaDistributedcomputing/azure-disk-monitoring
          </a>
        </div>

        {/* Back to Dashboard */}
        <div className="pt-8 pb-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Azure Disk Performance Monitoring POC &bull; Prices are East US 2, Pay-as-you-go, March 2026
      </footer>
    </div>
  );
}
