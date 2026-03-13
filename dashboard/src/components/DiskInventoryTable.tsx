'use client';

import { DiskInventoryItem } from '@/types';
import { useState, useMemo } from 'react';

interface DiskInventoryTableProps {
  data: DiskInventoryItem[];
}

export default function DiskInventoryTable({ data }: DiskInventoryTableProps) {
  const [sortField, setSortField] = useState<keyof DiskInventoryItem>('avgIops');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterDiskType, setFilterDiskType] = useState<string>('all');
  const [filterVmFamily, setFilterVmFamily] = useState<string>('all');

  const diskTypes = useMemo(() => [...new Set(data.map((d) => d.diskType))], [data]);
  const vmFamilies = useMemo(() => {
    const families = new Set<string>();
    data.forEach((d) => {
      if (d.vmSku.includes('D')) families.add('D-series');
      else if (d.vmSku.includes('E')) families.add('E-series');
      else if (d.vmSku.includes('L')) families.add('L-series');
    });
    return [...families];
  }, [data]);

  const filtered = useMemo(() => {
    let result = [...data];
    if (filterDiskType !== 'all') {
      result = result.filter((d) => d.diskType === filterDiskType);
    }
    if (filterVmFamily !== 'all') {
      result = result.filter((d) => {
        if (filterVmFamily === 'D-series') return d.vmSku.includes('D');
        if (filterVmFamily === 'E-series') return d.vmSku.includes('E');
        if (filterVmFamily === 'L-series') return d.vmSku.includes('L');
        return true;
      });
    }
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return result;
  }, [data, filterDiskType, filterVmFamily, sortField, sortDir]);

  const handleSort = (field: keyof DiskInventoryItem) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: keyof DiskInventoryItem }) => {
    if (sortField !== field) return <span className="ml-1 text-slate-600">↕</span>;
    return <span className="ml-1 text-blue-400">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const latencyColor = (ms: number) => {
    if (ms < 2) return 'text-emerald-400';
    if (ms < 5) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterDiskType}
          onChange={(e) => setFilterDiskType(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Disk Types</option>
          {diskTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterVmFamily}
          onChange={(e) => setFilterVmFamily(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All VM Families</option>
          {vmFamilies.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <span className="self-center text-xs text-slate-500">
          {filtered.length} of {data.length} disks
        </span>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-xs uppercase text-slate-400">
              <th className="cursor-pointer px-4 py-3 hover:text-white" onClick={() => handleSort('vmName')}>
                VM Name <SortIcon field="vmName" />
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-white" onClick={() => handleSort('vmSku')}>
                VM SKU <SortIcon field="vmSku" />
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-white" onClick={() => handleSort('diskName')}>
                Disk Name <SortIcon field="diskName" />
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-white" onClick={() => handleSort('diskSizeGb')}>
                Size (GB) <SortIcon field="diskSizeGb" />
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-white" onClick={() => handleSort('diskType')}>
                Type <SortIcon field="diskType" />
              </th>
              <th className="px-4 py-3">Tier</th>
              <th className="cursor-pointer px-4 py-3 hover:text-white" onClick={() => handleSort('avgIops')}>
                Avg IOPS <SortIcon field="avgIops" />
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-white" onClick={() => handleSort('avgThroughputMBs')}>
                Throughput (MB/s) <SortIcon field="avgThroughputMBs" />
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-white" onClick={() => handleSort('avgLatencyMs')}>
                Latency (ms) <SortIcon field="avgLatencyMs" />
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-white" onClick={() => handleSort('avgQueueDepth')}>
                Queue Depth <SortIcon field="avgQueueDepth" />
              </th>
              <th className="cursor-pointer px-4 py-3 hover:text-white" onClick={() => handleSort('usedPct')}>
                Used % <SortIcon field="usedPct" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={`${row.vmName}-${row.diskName}`} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-white">{row.vmName}</td>
                <td className="px-4 py-3 text-slate-300">{row.vmSku}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-300">{row.diskName}</td>
                <td className="px-4 py-3 text-slate-300">{row.diskSizeGb}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-200">
                    {row.diskType}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{row.diskTier}</td>
                <td className="px-4 py-3 font-mono text-blue-400">{row.avgIops.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-purple-400">{row.avgThroughputMBs}</td>
                <td className={`px-4 py-3 font-mono ${latencyColor(row.avgLatencyMs)}`}>{row.avgLatencyMs}</td>
                <td className="px-4 py-3 font-mono text-slate-300">{row.avgQueueDepth}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={`h-full rounded-full ${row.usedPct > 80 ? 'bg-red-500' : row.usedPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${row.usedPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{row.usedPct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
