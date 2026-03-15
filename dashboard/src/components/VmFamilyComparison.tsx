'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface VmComparisonProps {
  data: {
    vmFamily: string;
    vmSku: string;
    avgIops: number;
    maxIops: number;
    avgLatencyMs: number;
    avgThroughputMBs: number;
  }[];
}

export default function VmFamilyComparison({ data }: VmComparisonProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* IOPS by VM */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-white">IOPS by VM (Avg vs Max)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="vmSku" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} angle={-15} />
            <YAxis stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="avgIops" name="Avg IOPS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="maxIops" name="Max IOPS" fill="#3b82f6" fillOpacity={0.4} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Latency + Throughput by VM */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-white">Latency &amp; Throughput by VM</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="vmSku" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} angle={-15} />
            <YAxis yAxisId="left" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar yAxisId="left" dataKey="avgLatencyMs" name="Avg Latency (ms)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="avgThroughputMBs" name="Avg Throughput (MB/s)" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
