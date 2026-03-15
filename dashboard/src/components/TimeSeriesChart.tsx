'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { TimeSeriesPoint } from '@/types';
import { useMemo, useState } from 'react';

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  title: string;
  yAxisLabel: string;
  color?: string;
  selectedSeries?: string[];
}

const SERIES_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1',
];

export default function TimeSeriesChart({ data, title, yAxisLabel, selectedSeries }: TimeSeriesChartProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'bar'>('grid');
  const [highlightedSeries, setHighlightedSeries] = useState<string | null>(null);

  const { seriesData, seriesNames, globalMax } = useMemo(() => {
    const allSeries = [...new Set(data.map((d) => d.series))];
    const filtered = selectedSeries && selectedSeries.length > 0
      ? allSeries.filter((s) => selectedSeries.includes(s))
      : allSeries;

    const grouped: Record<string, { timestamp: string; value: number }[]> = {};
    let globalMax = 0;
    data.forEach((point) => {
      if (!filtered.includes(point.series)) return;
      if (!grouped[point.series]) grouped[point.series] = [];
      grouped[point.series].push({ timestamp: point.timestamp, value: point.value });
      if (point.value > globalMax) globalMax = point.value;
    });

    Object.keys(grouped).forEach((key) => {
      const arr = grouped[key].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const step = Math.max(1, Math.floor(arr.length / 40));
      grouped[key] = arr.filter((_, i) => i % step === 0).map((p) => ({
        ...p,
        timestamp: new Date(p.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }));
    });

    return { seriesData: grouped, seriesNames: filtered, globalMax };
  }, [data, selectedSeries]);

  const summaryStats = useMemo(() => {
    return seriesNames.map((name, i) => {
      const points = seriesData[name] || [];
      const values = points.map((p) => p.value);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const max = values.length ? Math.max(...values) : 0;
      const min = values.length ? Math.min(...values) : 0;
      const shortName = name.split('/').pop()?.replace('disk-', '').replace('vm-diskmon-', '') || name;
      return { name, shortName, avg: Math.round(avg * 10) / 10, max: Math.round(max * 10) / 10, min: Math.round(min * 10) / 10, color: SERIES_COLORS[i % SERIES_COLORS.length] };
    }).sort((a, b) => b.avg - a.avg);
  }, [seriesData, seriesNames]);

  const gridCols = seriesNames.length <= 4 ? 'lg:grid-cols-2' : seriesNames.length <= 6 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{seriesNames.length} disks</span>
          <div className="flex rounded-lg border border-slate-700 bg-slate-800">
            <button onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-[11px] font-medium rounded-l-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              Sparklines
            </button>
            <button onClick={() => setViewMode('bar')}
              className={`px-3 py-1 text-[11px] font-medium rounded-r-lg transition-colors ${viewMode === 'bar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              Ranking
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${gridCols}`}>
          {seriesNames.map((series, i) => {
            const points = seriesData[series] || [];
            const values = points.map((p) => p.value);
            const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            const max = values.length ? Math.max(...values) : 0;
            const color = SERIES_COLORS[i % SERIES_COLORS.length];
            const shortName = series.split('/').pop()?.replace('disk-', '').replace('vm-diskmon-', '') || series;
            const isHighlighted = !highlightedSeries || highlightedSeries === series;

            return (
              <div key={series}
                className={`rounded-lg border bg-slate-800/50 p-3 transition-all cursor-pointer ${isHighlighted ? 'border-slate-600 opacity-100' : 'border-slate-700/50 opacity-40'}`}
                style={highlightedSeries === series ? { borderColor: color, borderWidth: '2px' } : {}}
                onMouseEnter={() => setHighlightedSeries(series)}
                onMouseLeave={() => setHighlightedSeries(null)}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[11px] font-medium text-slate-200 truncate max-w-[140px]" title={series}>{shortName}</span>
                  </div>
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-slate-500">avg <span className="font-mono text-slate-300">{Math.round(avg)}</span></span>
                    <span className="text-slate-500">max <span className="font-mono text-white">{Math.round(max)}</span></span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={70}>
                  <AreaChart data={points} margin={{ top: 2, right: 2, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <YAxis domain={[0, globalMax * 1.1]} hide />
                    <XAxis dataKey="timestamp" hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px', fontSize: '10px', padding: '4px 8px' }}
                      formatter={(v: number) => [`${v} ${yAxisLabel}`, shortName]}
                      labelStyle={{ color: '#64748b', fontSize: '9px' }}
                    />
                    <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#grad-${i})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'bar' && (
        <div className="space-y-4">
          <div className="space-y-2">
            {summaryStats.map((s, i) => {
              const pct = globalMax > 0 ? (s.avg / globalMax) * 100 : 0;
              const maxPct = globalMax > 0 ? (s.max / globalMax) * 100 : 0;
              return (
                <div key={s.name} className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-2.5 hover:border-slate-600 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 w-5">#{i + 1}</span>
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-xs font-medium text-slate-200">{s.shortName}</span>
                    </div>
                    <div className="flex gap-4 text-[10px]">
                      <span className="text-slate-500">min <span className="font-mono text-slate-400">{s.min}</span></span>
                      <span className="text-slate-500">avg <span className="font-mono text-white font-bold">{s.avg}</span></span>
                      <span className="text-slate-500">max <span className="font-mono text-amber-400">{s.max}</span></span>
                    </div>
                  </div>
                  <div className="relative h-3 w-full rounded-full bg-slate-700/40 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: s.color, opacity: 0.8 }} />
                    <div className="absolute inset-y-0 rounded-full transition-all duration-500" style={{ left: `${Math.max(0, maxPct - 0.5)}%`, width: '3px', backgroundColor: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h4 className="text-xs font-semibold text-slate-400 mb-3">Average {yAxisLabel} Comparison</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={summaryStats} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} />
                <YAxis type="category" dataKey="shortName" stroke="#64748b" tick={{ fill: '#b0bfcf', fontSize: 10 }} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', fontSize: '11px' }} formatter={(v: number) => [`${v} ${yAxisLabel}`, 'Avg']} />
                <Bar dataKey="avg" name={`Avg ${yAxisLabel}`} radius={[0, 4, 4, 0]}>
                  {summaryStats.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
