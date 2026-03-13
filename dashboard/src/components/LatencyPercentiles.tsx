'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface LatencyPercentilesProps {
  data: {
    vmName: string;
    diskName: string;
    diskType: string;
    p50: number;
    p95: number;
    p99: number;
  }[];
}

export default function LatencyPercentiles({ data }: LatencyPercentilesProps) {
  const chartData = data.map((d) => ({
    name: d.diskName.replace('disk-diskmon-', '').replace('disk-', ''),
    diskType: d.diskType,
    p50: d.p50,
    p95: d.p95,
    p99: d.p99,
  }));

  return (
    <div className="card">
      <h3 className="mb-4 text-lg font-semibold text-white">Latency Percentiles (ms) — p50, p95, p99</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="name"
            stroke="#64748b"
            tick={{ fill: '#94a3b8', fontSize: 9 }}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '12px' }}
            formatter={(value: number) => `${value} ms`}
          />
          <Bar dataKey="p50" name="p50" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="p95" name="p95" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="p99" name="p99" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex justify-center gap-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> p50</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> p95</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> p99</span>
      </div>
    </div>
  );
}
