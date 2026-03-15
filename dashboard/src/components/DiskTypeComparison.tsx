'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

interface DiskTypeComparisonProps {
  data: { diskType: string; avgIops: number; avgThroughputMBs: number; avgLatencyMs: number }[];
}

const DISK_COLORS: Record<string, string> = {
  'Ultra Disk': '#3b82f6',
  'Premium SSD v2': '#8b5cf6',
  'Premium SSD': '#22c55e',
  'Standard SSD': '#f59e0b',
  'Standard HDD': '#ef4444',
};

export default function DiskTypeComparison({ data }: DiskTypeComparisonProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* IOPS Comparison */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-white">Avg IOPS by Disk Type</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="diskType"
              stroke="#64748b"
              tick={{ fill: '#b0bfcf', fontSize: 11 }}
              width={110}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="avgIops" name="Avg IOPS" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.diskType} fill={DISK_COLORS[entry.diskType] || '#64748b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Throughput Comparison */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-white">Avg Throughput by Disk Type</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="diskType"
              stroke="#64748b"
              tick={{ fill: '#b0bfcf', fontSize: 11 }}
              width={110}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="avgThroughputMBs" name="Avg MB/s" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.diskType} fill={DISK_COLORS[entry.diskType] || '#64748b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Latency Comparison */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-white">Avg Latency by Disk Type</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="diskType"
              stroke="#64748b"
              tick={{ fill: '#b0bfcf', fontSize: 11 }}
              width={110}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="avgLatencyMs" name="Avg Latency (ms)" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.diskType} fill={DISK_COLORS[entry.diskType] || '#64748b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
