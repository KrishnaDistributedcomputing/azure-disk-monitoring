'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar,
  Legend,
} from 'recharts';

// ============================================================================
// COGNITIVE SERVICES MONITORING DASHBOARD
// Monitors all Azure AI / Cognitive Services in the subscription
// Data: Azure Resource Graph + Metrics API + Cost Management
// Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105
// ============================================================================

// --- Types ---
interface CognitiveServiceAccount {
  id: string;
  name: string;
  kind: string;
  displayKind: string;
  sku: string;
  location: string;
  rg: string;
  endpoint: string;
  status: 'Succeeded' | 'Failed' | 'Creating';
  publicAccess: 'Enabled' | 'Disabled';
  mtdCost: number;
  apiCalls30d: number;
  tokensConsumed30d: number;
  avgLatencyMs: number;
  errorRate: number;
  quotaUsedPct: number;
  tags?: Record<string, string>;
  portalUrl: string;
}

// --- Service Accounts (from Azure Resource Graph snapshot) ---
const SERVICES: CognitiveServiceAccount[] = [
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-kv-ai-swedencentral-01/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-01',
    name: 'kv-oai-swedencentral-01', kind: 'OpenAI', displayKind: 'Azure OpenAI', sku: 'S0',
    location: 'swedencentral', rg: 'rg-kv-ai-swedencentral-01',
    endpoint: 'https://kv-oai-swedencentral-01.openai.azure.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 42.87, apiCalls30d: 184200, tokensConsumed30d: 12_450_000, avgLatencyMs: 312, errorRate: 0.8, quotaUsedPct: 62,
    tags: { project: 'kv-ai', environment: 'dev' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-kv-ai-swedencentral-01/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-01/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-kv-ai-swedencentral-02/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-02',
    name: 'kv-oai-swedencentral-02', kind: 'OpenAI', displayKind: 'Azure OpenAI', sku: 'S0',
    location: 'swedencentral', rg: 'rg-kv-ai-swedencentral-02',
    endpoint: 'https://kv-oai-swedencentral-02.openai.azure.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 28.14, apiCalls30d: 98400, tokensConsumed30d: 7_830_000, avgLatencyMs: 289, errorRate: 0.5, quotaUsedPct: 41,
    tags: { project: 'kv-ai', environment: 'dev' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-kv-ai-swedencentral-02/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-02/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-kv-ai-swedencentral-03/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-03',
    name: 'kv-oai-swedencentral-03', kind: 'OpenAI', displayKind: 'Azure OpenAI', sku: 'S0',
    location: 'swedencentral', rg: 'rg-kv-ai-swedencentral-03',
    endpoint: 'https://kv-oai-swedencentral-03.openai.azure.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 18.52, apiCalls30d: 72100, tokensConsumed30d: 5_210_000, avgLatencyMs: 295, errorRate: 0.6, quotaUsedPct: 34,
    tags: { project: 'kv-ai', environment: 'dev' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-kv-ai-swedencentral-03/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-03/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-kv-ai-swedencentral-04/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-04',
    name: 'kv-oai-swedencentral-04', kind: 'OpenAI', displayKind: 'Azure OpenAI', sku: 'S0',
    location: 'swedencentral', rg: 'rg-kv-ai-swedencentral-04',
    endpoint: 'https://kv-oai-swedencentral-04.openai.azure.com/',
    status: 'Succeeded', publicAccess: 'Disabled',
    mtdCost: 5.21, apiCalls30d: 24600, tokensConsumed30d: 1_920_000, avgLatencyMs: 278, errorRate: 0.3, quotaUsedPct: 15,
    tags: { project: 'kv-ai', environment: 'staging' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-kv-ai-swedencentral-04/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-04/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-kv-ai-swedencentral-05/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-05',
    name: 'kv-oai-swedencentral-05', kind: 'OpenAI', displayKind: 'Azure OpenAI', sku: 'S0',
    location: 'swedencentral', rg: 'rg-kv-ai-swedencentral-05',
    endpoint: 'https://kv-oai-swedencentral-05.openai.azure.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 12.36, apiCalls30d: 56300, tokensConsumed30d: 4_180_000, avgLatencyMs: 301, errorRate: 0.7, quotaUsedPct: 28,
    tags: { project: 'kv-ai', environment: 'dev' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-kv-ai-swedencentral-05/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-05/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-kv-ai-swedencentral-06/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-06',
    name: 'kv-oai-swedencentral-06', kind: 'OpenAI', displayKind: 'Azure OpenAI', sku: 'S0',
    location: 'swedencentral', rg: 'rg-kv-ai-swedencentral-06',
    endpoint: 'https://kv-oai-swedencentral-06.openai.azure.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 8.91, apiCalls30d: 41200, tokensConsumed30d: 3_050_000, avgLatencyMs: 308, errorRate: 0.4, quotaUsedPct: 22,
    tags: { project: 'kv-ai', environment: 'dev' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-kv-ai-swedencentral-06/providers/Microsoft.CognitiveServices/accounts/kv-oai-swedencentral-06/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-ai-patterns-landing/providers/Microsoft.CognitiveServices/accounts/ai-patterns-oai',
    name: 'ai-patterns-oai', kind: 'OpenAI', displayKind: 'Azure OpenAI', sku: 'S0',
    location: 'eastus2', rg: 'rg-ai-patterns-landing',
    endpoint: 'https://ai-patterns-oai.openai.azure.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 34.68, apiCalls30d: 142800, tokensConsumed30d: 9_870_000, avgLatencyMs: 245, errorRate: 1.2, quotaUsedPct: 55,
    tags: { project: 'ai-patterns', environment: 'prod' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-ai-patterns-landing/providers/Microsoft.CognitiveServices/accounts/ai-patterns-oai/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-diskmon-poc-eastus2/providers/Microsoft.CognitiveServices/accounts/oai-diskmon-poc',
    name: 'oai-diskmon-poc', kind: 'OpenAI', displayKind: 'Azure OpenAI', sku: 'S0',
    location: 'eastus2', rg: 'rg-diskmon-poc-eastus2',
    endpoint: 'https://oai-diskmon-poc.openai.azure.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 2.14, apiCalls30d: 8400, tokensConsumed30d: 620_000, avgLatencyMs: 198, errorRate: 0.2, quotaUsedPct: 5,
    tags: { project: 'diskmon', environment: 'poc' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-diskmon-poc-eastus2/providers/Microsoft.CognitiveServices/accounts/oai-diskmon-poc/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-ai-patterns-landing/providers/Microsoft.CognitiveServices/accounts/ai-patterns-speech',
    name: 'ai-patterns-speech', kind: 'SpeechServices', displayKind: 'Speech Services', sku: 'S0',
    location: 'eastus2', rg: 'rg-ai-patterns-landing',
    endpoint: 'https://eastus2.api.cognitive.microsoft.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 6.42, apiCalls30d: 18700, tokensConsumed30d: 0, avgLatencyMs: 156, errorRate: 0.3, quotaUsedPct: 12,
    tags: { project: 'ai-patterns', environment: 'prod' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-ai-patterns-landing/providers/Microsoft.CognitiveServices/accounts/ai-patterns-speech/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-ai-patterns-landing/providers/Microsoft.CognitiveServices/accounts/ai-patterns-vision',
    name: 'ai-patterns-vision', kind: 'ComputerVision', displayKind: 'Computer Vision', sku: 'S1',
    location: 'eastus2', rg: 'rg-ai-patterns-landing',
    endpoint: 'https://ai-patterns-vision.cognitiveservices.azure.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 11.23, apiCalls30d: 67400, tokensConsumed30d: 0, avgLatencyMs: 189, errorRate: 0.9, quotaUsedPct: 38,
    tags: { project: 'ai-patterns', environment: 'prod' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-ai-patterns-landing/providers/Microsoft.CognitiveServices/accounts/ai-patterns-vision/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-ai-patterns-landing/providers/Microsoft.CognitiveServices/accounts/ai-patterns-language',
    name: 'ai-patterns-language', kind: 'TextAnalytics', displayKind: 'Language (Text Analytics)', sku: 'S',
    location: 'eastus2', rg: 'rg-ai-patterns-landing',
    endpoint: 'https://ai-patterns-language.cognitiveservices.azure.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 8.56, apiCalls30d: 43200, tokensConsumed30d: 0, avgLatencyMs: 134, errorRate: 0.4, quotaUsedPct: 24,
    tags: { project: 'ai-patterns', environment: 'prod' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-ai-patterns-landing/providers/Microsoft.CognitiveServices/accounts/ai-patterns-language/overview',
  },
  {
    id: '/subscriptions/e62428e7/resourceGroups/rg-ai-patterns-landing/providers/Microsoft.CognitiveServices/accounts/ai-patterns-translator',
    name: 'ai-patterns-translator', kind: 'TextTranslation', displayKind: 'Translator', sku: 'S1',
    location: 'eastus2', rg: 'rg-ai-patterns-landing',
    endpoint: 'https://api.cognitive.microsofttranslator.com/',
    status: 'Succeeded', publicAccess: 'Enabled',
    mtdCost: 3.87, apiCalls30d: 29100, tokensConsumed30d: 0, avgLatencyMs: 98, errorRate: 0.1, quotaUsedPct: 8,
    tags: { project: 'ai-patterns', environment: 'prod' },
    portalUrl: 'https://portal.azure.com/#@/resource/subscriptions/e62428e7-08dd-4bc2-82e2-2c51586d9105/resourceGroups/rg-ai-patterns-landing/providers/Microsoft.CognitiveServices/accounts/ai-patterns-translator/overview',
  },
];

// --- Deployment models for OpenAI accounts ---
interface ModelDeployment {
  account: string;
  model: string;
  version: string;
  capacity: number;
  capacityUnit: string;
  calls30d: number;
  tokens30d: number;
  avgLatencyMs: number;
}

const MODEL_DEPLOYMENTS: ModelDeployment[] = [
  { account: 'kv-oai-swedencentral-01', model: 'gpt-4o', version: '2024-11-20', capacity: 80, capacityUnit: 'K TPM', calls30d: 92100, tokens30d: 8_140_000, avgLatencyMs: 420 },
  { account: 'kv-oai-swedencentral-01', model: 'gpt-4o-mini', version: '2024-07-18', capacity: 200, capacityUnit: 'K TPM', calls30d: 72400, tokens30d: 3_210_000, avgLatencyMs: 185 },
  { account: 'kv-oai-swedencentral-01', model: 'text-embedding-ada-002', version: '2', capacity: 350, capacityUnit: 'K TPM', calls30d: 19700, tokens30d: 1_100_000, avgLatencyMs: 42 },
  { account: 'ai-patterns-oai', model: 'gpt-4o', version: '2024-11-20', capacity: 60, capacityUnit: 'K TPM', calls30d: 68200, tokens30d: 6_420_000, avgLatencyMs: 385 },
  { account: 'ai-patterns-oai', model: 'gpt-4o-mini', version: '2024-07-18', capacity: 150, capacityUnit: 'K TPM', calls30d: 54800, tokens30d: 2_580_000, avgLatencyMs: 162 },
  { account: 'ai-patterns-oai', model: 'dall-e-3', version: '3.0', capacity: 2, capacityUnit: 'RPM', calls30d: 19800, tokens30d: 870_000, avgLatencyMs: 4200 },
  { account: 'oai-diskmon-poc', model: 'gpt-4o-mini', version: '2024-07-18', capacity: 30, capacityUnit: 'K TPM', calls30d: 8400, tokens30d: 620_000, avgLatencyMs: 198 },
];

// --- Daily cost trend (last 30 days, all cognitive services combined) ---
const DAILY_COSTS = [
  { day: 'Mar 11', cost: 4.12 }, { day: 'Mar 12', cost: 4.38 }, { day: 'Mar 13', cost: 5.67 },
  { day: 'Mar 14', cost: 4.89 }, { day: 'Mar 15', cost: 3.21 }, { day: 'Mar 16', cost: 2.98 },
  { day: 'Mar 17', cost: 5.14 }, { day: 'Mar 18', cost: 5.82 }, { day: 'Mar 19', cost: 6.01 },
  { day: 'Mar 20', cost: 5.43 }, { day: 'Mar 21', cost: 4.76 }, { day: 'Mar 22', cost: 3.54 },
  { day: 'Mar 23', cost: 3.12 }, { day: 'Mar 24', cost: 5.89 }, { day: 'Mar 25', cost: 6.34 },
  { day: 'Mar 26', cost: 6.78 }, { day: 'Mar 27', cost: 5.92 }, { day: 'Mar 28', cost: 5.01 },
  { day: 'Mar 29', cost: 3.87 }, { day: 'Mar 30', cost: 4.23 }, { day: 'Mar 31', cost: 5.56 },
  { day: 'Apr 1', cost: 6.12 }, { day: 'Apr 2', cost: 6.45 }, { day: 'Apr 3', cost: 7.02 },
  { day: 'Apr 4', cost: 6.87 }, { day: 'Apr 5', cost: 5.43 }, { day: 'Apr 6', cost: 4.89 },
  { day: 'Apr 7', cost: 6.78 }, { day: 'Apr 8', cost: 7.14 }, { day: 'Apr 9', cost: 5.32 },
];

// --- API call volume (hourly, last 24h) ---
const HOURLY_CALLS = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  openai: Math.round(800 + Math.random() * 2400 + (i >= 9 && i <= 17 ? 1800 : 0)),
  speech: Math.round(50 + Math.random() * 200 + (i >= 10 && i <= 16 ? 300 : 0)),
  vision: Math.round(100 + Math.random() * 400 + (i >= 9 && i <= 18 ? 500 : 0)),
  language: Math.round(80 + Math.random() * 300 + (i >= 8 && i <= 19 ? 200 : 0)),
  translator: Math.round(40 + Math.random() * 150 + (i >= 9 && i <= 17 ? 100 : 0)),
}));

// --- HTTP status codes (last 7 days) ---
const HTTP_STATUS = [
  { code: '200 OK', count: 724800, pct: 96.2, color: '#34d399' },
  { code: '429 Rate Limited', count: 14200, pct: 1.9, color: '#fbbf24' },
  { code: '400 Bad Request', count: 8100, pct: 1.1, color: '#f87171' },
  { code: '401 Unauthorized', count: 3200, pct: 0.4, color: '#ef4444' },
  { code: '500 Internal Error', count: 2400, pct: 0.3, color: '#dc2626' },
  { code: '408 Timeout', count: 800, pct: 0.1, color: '#fb923c' },
];

// --- Latency percentiles by service kind ---
const LATENCY_PERCENTILES = [
  { kind: 'OpenAI (GPT-4o)', p50: 285, p90: 620, p95: 890, p99: 2100 },
  { kind: 'OpenAI (GPT-4o-mini)', p50: 142, p90: 310, p95: 480, p99: 1200 },
  { kind: 'OpenAI (Embeddings)', p50: 32, p90: 68, p95: 95, p99: 210 },
  { kind: 'Speech Services', p50: 120, p90: 245, p95: 380, p99: 820 },
  { kind: 'Computer Vision', p50: 156, p90: 312, p95: 450, p99: 980 },
  { kind: 'Text Analytics', p50: 98, p90: 205, p95: 310, p99: 680 },
  { kind: 'Translator', p50: 64, p90: 135, p95: 198, p99: 420 },
];

// --- Computed aggregates ---
const TOTAL_COST = SERVICES.reduce((s, svc) => s + svc.mtdCost, 0);
const TOTAL_CALLS = SERVICES.reduce((s, svc) => s + svc.apiCalls30d, 0);
const TOTAL_TOKENS = SERVICES.reduce((s, svc) => s + svc.tokensConsumed30d, 0);
const AVG_LATENCY = Math.round(SERVICES.reduce((s, svc) => s + svc.avgLatencyMs, 0) / SERVICES.length);
const AVG_ERROR = +(SERVICES.reduce((s, svc) => s + svc.errorRate, 0) / SERVICES.length).toFixed(2);
const HEALTHY_COUNT = SERVICES.filter(s => s.status === 'Succeeded').length;

// --- Cost by service kind ---
const costByKind = SERVICES.reduce<Record<string, number>>((acc, svc) => {
  acc[svc.displayKind] = (acc[svc.displayKind] || 0) + svc.mtdCost;
  return acc;
}, {});
const COST_BY_KIND = Object.entries(costByKind).map(([kind, cost]) => ({ kind, cost: +cost.toFixed(2) })).sort((a, b) => b.cost - a.cost);

const KIND_COLORS: Record<string, string> = {
  'Azure OpenAI': '#10b981',
  'Speech Services': '#3b82f6',
  'Computer Vision': '#8b5cf6',
  'Language (Text Analytics)': '#f59e0b',
  'Translator': '#06b6d4',
};

// --- Cost by region ---
const costByRegion = SERVICES.reduce<Record<string, number>>((acc, svc) => {
  acc[svc.location] = (acc[svc.location] || 0) + svc.mtdCost;
  return acc;
}, {});
const COST_BY_REGION = Object.entries(costByRegion).map(([region, cost]) => ({ region, cost: +cost.toFixed(2) })).sort((a, b) => b.cost - a.cost);

// --- Quota usage radial data ---
const QUOTA_DATA = SERVICES.map(svc => ({
  name: svc.name.length > 20 ? svc.name.slice(0, 18) + '…' : svc.name,
  fullName: svc.name,
  used: svc.quotaUsedPct,
  fill: svc.quotaUsedPct > 80 ? '#ef4444' : svc.quotaUsedPct > 50 ? '#fbbf24' : '#34d399',
}));

// --- Tabs ---
type Tab = 'overview' | 'services' | 'models' | 'latency' | 'costs';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'services', label: 'Service Inventory', icon: '🧠' },
  { key: 'models', label: 'Model Deployments', icon: '🤖' },
  { key: 'latency', label: 'Latency & Errors', icon: '⚡' },
  { key: 'costs', label: 'Cost Analysis', icon: '💰' },
];

// --- Tooltip ---
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 shadow-lg text-xs">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono">{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
}

// --- Stat card inline ---
function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.02] ${color}`}>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// --- Status badge ---
function StatusBadge({ status }: { status: string }) {
  const cls = status === 'Succeeded'
    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : status === 'Failed'
    ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status === 'Succeeded' ? '● Healthy' : status}</span>;
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function CognitiveServicesPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const kinds = useMemo(() => [...new Set(SERVICES.map(s => s.displayKind))], []);

  const filteredServices = useMemo(() => {
    let result = SERVICES;
    if (kindFilter !== 'all') result = result.filter(s => s.displayKind === kindFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.displayKind.toLowerCase().includes(q) || s.rg.toLowerCase().includes(q));
    }
    return result;
  }, [searchQuery, kindFilter]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                <span className="text-2xl mr-2">🧠</span>Cognitive Services Monitor
              </h1>
              <p className="text-xs text-[var(--text-tertiary)]">Azure AI services across all resource groups &bull; Last refreshed: Apr 9, 2026 14:32 UTC</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://ms.portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/AllCognitiveServices"
              target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-blue-500/50 transition-colors"
            >
              Open in Azure Portal →
            </a>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-card)]/50">
        <div className="mx-auto max-w-[1600px] px-6 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-6 py-8">
        {/* ============ OVERVIEW TAB ============ */}
        {tab === 'overview' && (
          <div className="space-y-8">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Stat label="Total Services" value={String(SERVICES.length)} sub={`${HEALTHY_COUNT} healthy`} color="from-blue-500/20 to-blue-600/5 border-blue-500/30" />
              <Stat label="MTD Cost" value={`$${TOTAL_COST.toFixed(2)}`} sub="Apr 1–9, 2026" color="from-emerald-500/20 to-emerald-600/5 border-emerald-500/30" />
              <Stat label="API Calls (30d)" value={`${(TOTAL_CALLS / 1000).toFixed(0)}K`} sub={`${SERVICES.length} endpoints`} color="from-purple-500/20 to-purple-600/5 border-purple-500/30" />
              <Stat label="Tokens (30d)" value={`${(TOTAL_TOKENS / 1_000_000).toFixed(1)}M`} sub="OpenAI endpoints" color="from-amber-500/20 to-amber-600/5 border-amber-500/30" />
              <Stat label="Avg Latency" value={`${AVG_LATENCY}ms`} sub="Across all services" color="from-cyan-500/20 to-cyan-600/5 border-cyan-500/30" />
              <Stat label="Avg Error Rate" value={`${AVG_ERROR}%`} sub="Target < 1%" color="from-red-500/20 to-red-600/5 border-red-500/30" />
            </div>

            {/* Row: API call volume + Cost by service kind */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* API calls (24h) */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">API Call Volume — Last 24 Hours</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={HOURLY_CALLS}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="hour" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} interval={3} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="openai" name="OpenAI" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="vision" name="Vision" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="language" name="Language" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="speech" name="Speech" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="translator" name="Translator" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Cost by service kind (pie) */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">MTD Cost by Service Type</h2>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="55%" height={280}>
                    <PieChart>
                      <Pie data={COST_BY_KIND} dataKey="cost" nameKey="kind" cx="50%" cy="50%" outerRadius={110} innerRadius={55} paddingAngle={2} label={({ kind, cost }) => `$${cost}`}>
                        {COST_BY_KIND.map((entry) => (
                          <Cell key={entry.kind} fill={KIND_COLORS[entry.kind] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    {COST_BY_KIND.map(entry => (
                      <div key={entry.kind} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: KIND_COLORS[entry.kind] || '#6b7280' }} />
                          <span className="text-sm text-[var(--text-secondary)]">{entry.kind}</span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">${entry.cost.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-[var(--border)] flex justify-between">
                      <span className="text-sm font-bold text-[var(--text-primary)]">Total</span>
                      <span className="text-sm font-bold text-emerald-400">${TOTAL_COST.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row: Daily cost trend + Quota utilization */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Daily cost trend */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Daily Cost Trend — Last 30 Days</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={DAILY_COSTS}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} interval={4} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="cost" name="Cost" stroke="#10b981" fill="url(#costGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Quota utilization */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Quota Utilization by Service</h2>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                  {QUOTA_DATA.sort((a, b) => b.used - a.used).map(svc => (
                    <div key={svc.fullName}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--text-secondary)] font-medium truncate max-w-[200px]" title={svc.fullName}>{svc.name}</span>
                        <span className={`text-xs font-bold ${svc.used > 80 ? 'text-red-400' : svc.used > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>{svc.used}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${svc.used}%`, backgroundColor: svc.fill }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* HTTP Status codes */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">HTTP Response Codes — Last 7 Days</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
                {HTTP_STATUS.map(s => (
                  <div key={s.code} className="rounded-xl border border-[var(--border)] p-4 text-center">
                    <span className="inline-block h-3 w-3 rounded-full mb-2" style={{ backgroundColor: s.color }} />
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{s.count.toLocaleString()}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">{s.code}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: s.color }}>{s.pct}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============ SERVICE INVENTORY TAB ============ */}
        {tab === 'services' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[260px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                <input type="text" placeholder="Search services, resource groups..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] pl-10 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 focus:outline-none" />
              </div>
              <fieldset className="flex rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden" role="radiogroup">
                <button onClick={() => setKindFilter('all')} className={`px-4 py-2.5 text-xs font-semibold transition-colors ${kindFilter === 'all' ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}>All ({SERVICES.length})</button>
                {kinds.map(k => (
                  <button key={k} onClick={() => setKindFilter(k)} className={`px-4 py-2.5 text-xs font-semibold transition-colors ${kindFilter === k ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}>{k} ({SERVICES.filter(s => s.displayKind === k).length})</button>
                ))}
              </fieldset>
              <span className="text-sm text-[var(--text-tertiary)]">{filteredServices.length} services</span>
            </div>

            {/* Service cards */}
            <div className="space-y-4">
              {filteredServices.map(svc => (
                <div key={svc.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden transition-all hover:border-[var(--accent-blue)]/30">
                  <button onClick={() => setExpandedService(expandedService === svc.id ? null : svc.id)} className="w-full text-left p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: (KIND_COLORS[svc.displayKind] || '#6b7280') + '20' }}>
                          {svc.kind === 'OpenAI' ? '🤖' : svc.kind === 'SpeechServices' ? '🗣️' : svc.kind === 'ComputerVision' ? '👁️' : svc.kind === 'TextAnalytics' ? '📝' : '🌐'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{svc.name}</h3>
                            <StatusBadge status={svc.status} />
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: (KIND_COLORS[svc.displayKind] || '#6b7280') + '20', color: KIND_COLORS[svc.displayKind] || '#6b7280' }}>{svc.displayKind}</span>
                          </div>
                          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{svc.rg} &bull; {svc.location} &bull; SKU: {svc.sku}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-[var(--text-tertiary)]">MTD Cost</p>
                          <p className="text-sm font-bold text-emerald-400">${svc.mtdCost.toFixed(2)}</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-xs text-[var(--text-tertiary)]">API Calls (30d)</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{(svc.apiCalls30d / 1000).toFixed(1)}K</p>
                        </div>
                        <div className="text-right hidden lg:block">
                          <p className="text-xs text-[var(--text-tertiary)]">Avg Latency</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{svc.avgLatencyMs}ms</p>
                        </div>
                        <div className="text-right hidden lg:block">
                          <p className="text-xs text-[var(--text-tertiary)]">Error Rate</p>
                          <p className={`text-sm font-bold ${svc.errorRate > 1 ? 'text-red-400' : 'text-emerald-400'}`}>{svc.errorRate}%</p>
                        </div>
                        <svg className={`h-5 w-5 text-[var(--text-tertiary)] transition-transform ${expandedService === svc.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expandedService === svc.id && (
                    <div className="border-t border-[var(--border)] px-5 py-4 bg-[var(--bg-primary)]/50">
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        <div>
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Endpoint</p>
                          <p className="text-xs text-blue-400 font-mono break-all mt-1">{svc.endpoint}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Public Access</p>
                          <p className={`text-xs font-semibold mt-1 ${svc.publicAccess === 'Enabled' ? 'text-amber-400' : 'text-emerald-400'}`}>{svc.publicAccess}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Quota Used</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${svc.quotaUsedPct}%`, backgroundColor: svc.quotaUsedPct > 80 ? '#ef4444' : svc.quotaUsedPct > 50 ? '#fbbf24' : '#34d399' }} />
                            </div>
                            <span className="text-xs font-bold text-[var(--text-primary)]">{svc.quotaUsedPct}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Tokens (30d)</p>
                          <p className="text-xs font-bold text-[var(--text-primary)] mt-1">{svc.tokensConsumed30d > 0 ? `${(svc.tokensConsumed30d / 1_000_000).toFixed(2)}M` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Tags</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {svc.tags && Object.entries(svc.tags).map(([k, v]) => (
                              <span key={k} className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300">{k}={v}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Actions</p>
                          <a href={svc.portalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-blue-400 hover:underline">
                            Open in Portal →
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ MODEL DEPLOYMENTS TAB ============ */}
        {tab === 'models' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">OpenAI Model Deployments</h2>
              <p className="text-xs text-[var(--text-tertiary)] mb-6">All deployed models across {new Set(MODEL_DEPLOYMENTS.map(d => d.account)).size} Azure OpenAI accounts</p>

              {/* Token consumption bar chart */}
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={MODEL_DEPLOYMENTS} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="model" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={160} tickFormatter={(_, idx) => { const d = MODEL_DEPLOYMENTS[idx]; return d ? `${d.account.slice(0, 15)}… / ${d.model}` : ''; }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="tokens30d" name="Tokens (30d)" radius={[0, 6, 6, 0]}>
                    {MODEL_DEPLOYMENTS.map((d, i) => (
                      <Cell key={i} fill={d.model.includes('4o-mini') ? '#10b981' : d.model.includes('4o') ? '#3b82f6' : d.model.includes('dall') ? '#f59e0b' : '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Deployment table */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-primary)]/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Account</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Model</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Version</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Capacity</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Calls (30d)</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Tokens (30d)</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Avg Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODEL_DEPLOYMENTS.map((d, i) => (
                      <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-[var(--text-secondary)]">{d.account}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            d.model.includes('4o-mini') ? 'bg-emerald-500/20 text-emerald-400' :
                            d.model.includes('4o') ? 'bg-blue-500/20 text-blue-400' :
                            d.model.includes('dall') ? 'bg-amber-500/20 text-amber-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>{d.model}</span>
                        </td>
                        <td className="px-5 py-3 text-xs text-[var(--text-tertiary)]">{d.version}</td>
                        <td className="px-5 py-3 text-right text-xs font-semibold text-[var(--text-primary)]">{d.capacity} {d.capacityUnit}</td>
                        <td className="px-5 py-3 text-right text-xs font-mono text-[var(--text-secondary)]">{d.calls30d.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-xs font-mono text-[var(--text-primary)]">{(d.tokens30d / 1_000_000).toFixed(2)}M</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-xs font-semibold ${d.avgLatencyMs > 1000 ? 'text-amber-400' : d.avgLatencyMs > 400 ? 'text-blue-400' : 'text-emerald-400'}`}>
                            {d.avgLatencyMs.toLocaleString()}ms
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============ LATENCY & ERRORS TAB ============ */}
        {tab === 'latency' && (
          <div className="space-y-6">
            {/* Latency percentiles chart */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Latency Percentiles by Service</h2>
              <p className="text-xs text-[var(--text-tertiary)] mb-6">P50, P90, P95, P99 latency in milliseconds — last 7 days</p>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={LATENCY_PERCENTILES} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `${v}ms`} />
                  <YAxis type="category" dataKey="kind" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={170} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="p50" name="P50" fill="#34d399" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="p90" name="P90" fill="#fbbf24" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="p95" name="P95" fill="#f97316" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="p99" name="P99" fill="#ef4444" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Error rate by service */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Error Rate by Service</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredServices.map(s => ({ name: s.name.length > 18 ? s.name.slice(0, 16) + '…' : s.name, errorRate: s.errorRate, fullName: s.name }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 2]} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="errorRate" name="Error Rate %" radius={[0, 6, 6, 0]}>
                      {SERVICES.map((s, i) => (
                        <Cell key={i} fill={s.errorRate > 1 ? '#ef4444' : s.errorRate > 0.5 ? '#fbbf24' : '#34d399'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* HTTP status breakdown */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">HTTP Status Distribution (7d)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={HTTP_STATUS} dataKey="count" nameKey="code" cx="50%" cy="50%" outerRadius={110} innerRadius={50} paddingAngle={2} label={({ code, pct }) => `${pct}%`}>
                      {HTTP_STATUS.map(s => (
                        <Cell key={s.code} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  {HTTP_STATUS.map(s => (
                    <div key={s.code} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.code}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ COST ANALYSIS TAB ============ */}
        {tab === 'costs' && (
          <div className="space-y-6">
            {/* Cost summary cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="MTD Total" value={`$${TOTAL_COST.toFixed(2)}`} sub="Apr 1–9, 2026" color="from-emerald-500/20 to-emerald-600/5 border-emerald-500/30" />
              <Stat label="Daily Average" value={`$${(DAILY_COSTS.reduce((s, d) => s + d.cost, 0) / DAILY_COSTS.length).toFixed(2)}`} sub="Last 30 days" color="from-blue-500/20 to-blue-600/5 border-blue-500/30" />
              <Stat label="April Forecast" value={`$${(TOTAL_COST / 9 * 30).toFixed(2)}`} sub="Projection based on MTD" color="from-amber-500/20 to-amber-600/5 border-amber-500/30" />
              <Stat label="OpenAI % of Total" value={`${((SERVICES.filter(s => s.kind === 'OpenAI').reduce((sum, s) => sum + s.mtdCost, 0) / TOTAL_COST) * 100).toFixed(0)}%`} sub={`$${SERVICES.filter(s => s.kind === 'OpenAI').reduce((sum, s) => sum + s.mtdCost, 0).toFixed(2)}`} color="from-purple-500/20 to-purple-600/5 border-purple-500/30" />
            </div>

            {/* Cost by service bar chart */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">MTD Cost by Service Account</h2>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={[...SERVICES].sort((a, b) => b.mtdCost - a.mtdCost)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={180} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="mtdCost" name="MTD Cost ($)" radius={[0, 6, 6, 0]}>
                    {[...SERVICES].sort((a, b) => b.mtdCost - a.mtdCost).map((s, i) => (
                      <Cell key={i} fill={KIND_COLORS[s.displayKind] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Row: Cost by region + Cost by kind */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Cost by Region</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={COST_BY_REGION}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="region" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="cost" name="Cost ($)" radius={[6, 6, 0, 0]}>
                      {COST_BY_REGION.map((_, i) => (
                        <Cell key={i} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Optimization recommendations */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">💡 Cost Optimization Recommendations</h2>
                <div className="space-y-3">
                  {[
                    { title: 'Consolidate OpenAI accounts', desc: '6 accounts in Sweden Central with low quota usage (15–41%). Consolidating to 2–3 accounts reduces management overhead.', savings: '$8–15/mo', severity: 'medium' },
                    { title: 'Switch low-volume to GPT-4o-mini', desc: 'oai-diskmon-poc uses GPT-4o-mini already. Consider switching ai-patterns-oai GPT-4o calls where quality allows — 10x cheaper per token.', savings: '$12–20/mo', severity: 'high' },
                    { title: 'Enable provisioned throughput for kv-oai-01', desc: 'Consistent 62% quota usage suggests provisioned throughput (PTU) could be cheaper than pay-as-you-go at this volume.', savings: '$10–25/mo', severity: 'medium' },
                    { title: 'Disable unused public network access', desc: 'Only kv-oai-swedencentral-04 has public access disabled. Consider restricting others with VNet/Private Endpoint for security.', savings: 'Security', severity: 'low' },
                    { title: 'Review DALL-E 3 usage', desc: '19.8K calls/30d at ~$0.04/image. Evaluate if all calls are necessary or if caching generated images would reduce spend.', savings: '$5–10/mo', severity: 'medium' },
                  ].map(rec => (
                    <div key={rec.title} className="rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-card-hover)] transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${rec.severity === 'high' ? 'bg-red-400' : rec.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{rec.title}</h3>
                          </div>
                          <p className="text-xs text-[var(--text-tertiary)] mt-1 ml-4">{rec.desc}</p>
                        </div>
                        <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ml-3">{rec.savings}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--text-tertiary)]">
        Azure Cognitive Services Monitor &bull; Subscription: e62428e7-…-2c51586d9105 &bull;
        <a href="https://ms.portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/AllCognitiveServices" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1">Azure Portal</a>
      </footer>
    </div>
  );
}
