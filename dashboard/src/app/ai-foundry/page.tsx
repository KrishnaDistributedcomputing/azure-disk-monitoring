'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, LineChart, Line, Legend,
} from 'recharts';

// ============================================================================
// AI FOUNDRY DASHBOARD — Focused view of Azure AI Foundry projects & hubs
// Shows: AI Foundry projects, OpenAI model deployments, connected resources,
//        token throughput, prompt/completion breakdown, safety metrics,
//        and per-project cost attribution
// Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105
// ============================================================================

// --- Types ---
interface FoundryProject {
  id: string;
  name: string;
  hub: string;
  location: string;
  rg: string;
  kind: 'AIServices' | 'OpenAI';
  status: 'Active' | 'Inactive' | 'Provisioning';
  openaiEndpoint: string;
  models: string[];
  connectedResources: { type: string; name: string }[];
  mtdCost: number;
  totalTokens30d: number;
  promptTokens30d: number;
  completionTokens30d: number;
  totalRequests30d: number;
  successRate: number;
  avgLatencyMs: number;
  contentFilterBlocked30d: number;
  portalUrl: string;
}

interface ModelMetrics {
  project: string;
  model: string;
  version: string;
  deploymentName: string;
  provisionedCapacity: number;
  capacityUnit: string;
  promptTokens30d: number;
  completionTokens30d: number;
  totalTokens30d: number;
  requests30d: number;
  avgPromptLatencyMs: number;
  avgCompletionLatencyMs: number;
  ttft_p50Ms: number;  // time to first token
  ttft_p99Ms: number;
  throttledRequests30d: number;
  contentFilterBlocked30d: number;
}

// --- AI Foundry Projects ---
const PROJECTS: FoundryProject[] = [
  {
    id: 'kv-ai-project-01',
    name: 'kv-ai-d3ocert7badhy',
    hub: 'kv-ai-hub-swedencentral',
    location: 'swedencentral',
    rg: 'rg-kv-ai-4e8c9',
    kind: 'AIServices',
    status: 'Active',
    openaiEndpoint: 'https://kv-ai-d3ocert7badhy.openai.azure.com/',
    models: ['gpt-4o', 'gpt-4o-mini', 'text-embedding-ada-002', 'dall-e-3'],
    connectedResources: [
      { type: 'Storage', name: 'kvstd3ocert7badhy' },
      { type: 'Container Registry', name: 'kvacrXXXXX' },
      { type: 'Key Vault', name: 'kv-ai-keyvault-01' },
      { type: 'Log Analytics', name: 'kv-ai-logs' },
      { type: 'Application Insights', name: 'kv-ai-appinsights' },
    ],
    mtdCost: 68.42,
    totalTokens30d: 28_640_000,
    promptTokens30d: 19_210_000,
    completionTokens30d: 9_430_000,
    totalRequests30d: 312_400,
    successRate: 98.8,
    avgLatencyMs: 298,
    contentFilterBlocked30d: 847,
    portalUrl: 'https://ai.azure.com/projectoverview',
  },
  {
    id: 'ai-fastfox',
    name: 'aifastfox260227',
    hub: 'ai-hub-swedencentral',
    location: 'swedencentral',
    rg: 'rg-fastfox260227',
    kind: 'AIServices',
    status: 'Active',
    openaiEndpoint: 'https://aifastfox260227.openai.azure.com/',
    models: ['gpt-4o', 'gpt-4o-mini'],
    connectedResources: [
      { type: 'Storage', name: 'stfastfox260227' },
      { type: 'Container Registry', name: 'acrfastfox260227' },
      { type: 'Key Vault', name: 'kv-fastfox' },
    ],
    mtdCost: 24.18,
    totalTokens30d: 9_870_000,
    promptTokens30d: 6_540_000,
    completionTokens30d: 3_330_000,
    totalRequests30d: 127_800,
    successRate: 99.1,
    avgLatencyMs: 276,
    contentFilterBlocked30d: 312,
    portalUrl: 'https://ai.azure.com/projectoverview',
  },
  {
    id: 'ai-boldorca',
    name: 'aiboldorca260227',
    hub: 'ai-hub-westus3',
    location: 'westus3',
    rg: 'rg-boldorca260227',
    kind: 'AIServices',
    status: 'Active',
    openaiEndpoint: 'https://aiboldorca260227.openai.azure.com/',
    models: ['gpt-4o-mini', 'text-embedding-3-large'],
    connectedResources: [
      { type: 'Storage', name: 'stboldorca260227' },
      { type: 'Container Registry', name: 'acrboldorca260227' },
      { type: 'Key Vault', name: 'kv-boldorca' },
    ],
    mtdCost: 12.36,
    totalTokens30d: 4_180_000,
    promptTokens30d: 2_810_000,
    completionTokens30d: 1_370_000,
    totalRequests30d: 56_400,
    successRate: 99.4,
    avgLatencyMs: 184,
    contentFilterBlocked30d: 98,
    portalUrl: 'https://ai.azure.com/projectoverview',
  },
  {
    id: 'ai-patterns',
    name: 'ai-patterns-oai',
    hub: 'ai-patterns-hub',
    location: 'eastus2',
    rg: 'rg-ai-patterns-landing',
    kind: 'OpenAI',
    status: 'Active',
    openaiEndpoint: 'https://ai-patterns-oai.openai.azure.com/',
    models: ['gpt-4o', 'gpt-4o-mini', 'dall-e-3'],
    connectedResources: [
      { type: 'Speech', name: 'ai-patterns-speech' },
      { type: 'Vision', name: 'ai-patterns-vision' },
      { type: 'Language', name: 'ai-patterns-language' },
      { type: 'Translator', name: 'ai-patterns-translator' },
      { type: 'Static Web App', name: 'ai-patterns-portal' },
    ],
    mtdCost: 34.68,
    totalTokens30d: 9_870_000,
    promptTokens30d: 6_680_000,
    completionTokens30d: 3_190_000,
    totalRequests30d: 142_800,
    successRate: 98.2,
    avgLatencyMs: 312,
    contentFilterBlocked30d: 1_204,
    portalUrl: 'https://ai.azure.com/projectoverview',
  },
  {
    id: 'diskmon-poc',
    name: 'oai-diskmon-poc',
    hub: 'diskmon-hub',
    location: 'eastus2',
    rg: 'rg-diskmon-poc-eastus2',
    kind: 'OpenAI',
    status: 'Active',
    openaiEndpoint: 'https://oai-diskmon-poc.openai.azure.com/',
    models: ['gpt-4o-mini'],
    connectedResources: [
      { type: 'Log Analytics', name: 'law-diskmon-poc-eastus2' },
      { type: 'Static Web App', name: 'swa-diskmon-poc' },
    ],
    mtdCost: 2.14,
    totalTokens30d: 620_000,
    promptTokens30d: 412_000,
    completionTokens30d: 208_000,
    totalRequests30d: 8_400,
    successRate: 99.8,
    avgLatencyMs: 198,
    contentFilterBlocked30d: 12,
    portalUrl: 'https://ai.azure.com/projectoverview',
  },
];

// --- Model-level metrics ---
const MODEL_METRICS: ModelMetrics[] = [
  // kv-ai project
  { project: 'kv-ai-d3ocert7badhy', model: 'gpt-4o', version: '2024-11-20', deploymentName: 'gpt4o-main', provisionedCapacity: 80, capacityUnit: 'K TPM',
    promptTokens30d: 10_240_000, completionTokens30d: 5_120_000, totalTokens30d: 15_360_000, requests30d: 142_000,
    avgPromptLatencyMs: 85, avgCompletionLatencyMs: 420, ttft_p50Ms: 180, ttft_p99Ms: 1_200,
    throttledRequests30d: 3_400, contentFilterBlocked30d: 512 },
  { project: 'kv-ai-d3ocert7badhy', model: 'gpt-4o-mini', version: '2024-07-18', deploymentName: 'gpt4o-mini-fast', provisionedCapacity: 200, capacityUnit: 'K TPM',
    promptTokens30d: 6_480_000, completionTokens30d: 2_980_000, totalTokens30d: 9_460_000, requests30d: 124_600,
    avgPromptLatencyMs: 42, avgCompletionLatencyMs: 185, ttft_p50Ms: 68, ttft_p99Ms: 480,
    throttledRequests30d: 820, contentFilterBlocked30d: 210 },
  { project: 'kv-ai-d3ocert7badhy', model: 'text-embedding-ada-002', version: '2', deploymentName: 'embeddings-v2', provisionedCapacity: 350, capacityUnit: 'K TPM',
    promptTokens30d: 2_490_000, completionTokens30d: 0, totalTokens30d: 2_490_000, requests30d: 38_200,
    avgPromptLatencyMs: 18, avgCompletionLatencyMs: 32, ttft_p50Ms: 22, ttft_p99Ms: 95,
    throttledRequests30d: 120, contentFilterBlocked30d: 0 },
  { project: 'kv-ai-d3ocert7badhy', model: 'dall-e-3', version: '3.0', deploymentName: 'dalle3-gen', provisionedCapacity: 2, capacityUnit: 'RPM',
    promptTokens30d: 0, completionTokens30d: 1_330_000, totalTokens30d: 1_330_000, requests30d: 7_600,
    avgPromptLatencyMs: 0, avgCompletionLatencyMs: 4_200, ttft_p50Ms: 2_800, ttft_p99Ms: 8_500,
    throttledRequests30d: 1_840, contentFilterBlocked30d: 125 },
  // fastfox
  { project: 'aifastfox260227', model: 'gpt-4o', version: '2024-11-20', deploymentName: 'gpt4o-dev', provisionedCapacity: 40, capacityUnit: 'K TPM',
    promptTokens30d: 4_320_000, completionTokens30d: 2_180_000, totalTokens30d: 6_500_000, requests30d: 82_400,
    avgPromptLatencyMs: 78, avgCompletionLatencyMs: 395, ttft_p50Ms: 165, ttft_p99Ms: 1_100,
    throttledRequests30d: 2_100, contentFilterBlocked30d: 198 },
  { project: 'aifastfox260227', model: 'gpt-4o-mini', version: '2024-07-18', deploymentName: 'gpt4o-mini-dev', provisionedCapacity: 100, capacityUnit: 'K TPM',
    promptTokens30d: 2_220_000, completionTokens30d: 1_150_000, totalTokens30d: 3_370_000, requests30d: 45_400,
    avgPromptLatencyMs: 38, avgCompletionLatencyMs: 168, ttft_p50Ms: 62, ttft_p99Ms: 420,
    throttledRequests30d: 340, contentFilterBlocked30d: 114 },
  // boldorca
  { project: 'aiboldorca260227', model: 'gpt-4o-mini', version: '2024-07-18', deploymentName: 'gpt4o-mini-rag', provisionedCapacity: 60, capacityUnit: 'K TPM',
    promptTokens30d: 1_890_000, completionTokens30d: 920_000, totalTokens30d: 2_810_000, requests30d: 38_200,
    avgPromptLatencyMs: 35, avgCompletionLatencyMs: 152, ttft_p50Ms: 58, ttft_p99Ms: 380,
    throttledRequests30d: 180, contentFilterBlocked30d: 62 },
  { project: 'aiboldorca260227', model: 'text-embedding-3-large', version: '1', deploymentName: 'embed3-large', provisionedCapacity: 200, capacityUnit: 'K TPM',
    promptTokens30d: 920_000, completionTokens30d: 0, totalTokens30d: 920_000, requests30d: 18_200,
    avgPromptLatencyMs: 22, avgCompletionLatencyMs: 45, ttft_p50Ms: 28, ttft_p99Ms: 110,
    throttledRequests30d: 60, contentFilterBlocked30d: 0 },
  // ai-patterns
  { project: 'ai-patterns-oai', model: 'gpt-4o', version: '2024-11-20', deploymentName: 'patterns-4o', provisionedCapacity: 60, capacityUnit: 'K TPM',
    promptTokens30d: 4_180_000, completionTokens30d: 2_240_000, totalTokens30d: 6_420_000, requests30d: 68_200,
    avgPromptLatencyMs: 82, avgCompletionLatencyMs: 385, ttft_p50Ms: 172, ttft_p99Ms: 1_150,
    throttledRequests30d: 2_800, contentFilterBlocked30d: 780 },
  { project: 'ai-patterns-oai', model: 'gpt-4o-mini', version: '2024-07-18', deploymentName: 'patterns-mini', provisionedCapacity: 150, capacityUnit: 'K TPM',
    promptTokens30d: 1_780_000, completionTokens30d: 800_000, totalTokens30d: 2_580_000, requests30d: 54_800,
    avgPromptLatencyMs: 36, avgCompletionLatencyMs: 162, ttft_p50Ms: 60, ttft_p99Ms: 410,
    throttledRequests30d: 420, contentFilterBlocked30d: 286 },
  { project: 'ai-patterns-oai', model: 'dall-e-3', version: '3.0', deploymentName: 'patterns-dalle', provisionedCapacity: 2, capacityUnit: 'RPM',
    promptTokens30d: 0, completionTokens30d: 870_000, totalTokens30d: 870_000, requests30d: 19_800,
    avgPromptLatencyMs: 0, avgCompletionLatencyMs: 4_150, ttft_p50Ms: 2_750, ttft_p99Ms: 8_200,
    throttledRequests30d: 4_200, contentFilterBlocked30d: 138 },
  // diskmon
  { project: 'oai-diskmon-poc', model: 'gpt-4o-mini', version: '2024-07-18', deploymentName: 'diskmon-mini', provisionedCapacity: 30, capacityUnit: 'K TPM',
    promptTokens30d: 412_000, completionTokens30d: 208_000, totalTokens30d: 620_000, requests30d: 8_400,
    avgPromptLatencyMs: 32, avgCompletionLatencyMs: 198, ttft_p50Ms: 55, ttft_p99Ms: 360,
    throttledRequests30d: 20, contentFilterBlocked30d: 12 },
];

// --- Daily token throughput (all projects combined, last 14 days) ---
const DAILY_TOKENS = [
  { day: 'Mar 27', prompt: 1_420_000, completion: 680_000 },
  { day: 'Mar 28', prompt: 1_180_000, completion: 560_000 },
  { day: 'Mar 29', prompt: 890_000, completion: 420_000 },
  { day: 'Mar 30', prompt: 1_050_000, completion: 510_000 },
  { day: 'Mar 31', prompt: 1_380_000, completion: 650_000 },
  { day: 'Apr 1', prompt: 1_540_000, completion: 740_000 },
  { day: 'Apr 2', prompt: 1_620_000, completion: 780_000 },
  { day: 'Apr 3', prompt: 1_710_000, completion: 820_000 },
  { day: 'Apr 4', prompt: 1_580_000, completion: 760_000 },
  { day: 'Apr 5', prompt: 1_190_000, completion: 570_000 },
  { day: 'Apr 6', prompt: 1_080_000, completion: 520_000 },
  { day: 'Apr 7', prompt: 1_650_000, completion: 790_000 },
  { day: 'Apr 8', prompt: 1_780_000, completion: 860_000 },
  { day: 'Apr 9', prompt: 1_320_000, completion: 640_000 },
];

// --- Hourly requests by model (last 24h) ---
const HOURLY_BY_MODEL = Array.from({ length: 24 }, (_, i) => {
  const business = i >= 9 && i <= 17 ? 1.8 : 1;
  return {
    hour: `${String(i).padStart(2, '0')}:00`,
    'gpt-4o': Math.round((420 + Math.random() * 600) * business),
    'gpt-4o-mini': Math.round((580 + Math.random() * 900) * business),
    'embeddings': Math.round((120 + Math.random() * 280) * business * 0.6),
    'dall-e-3': Math.round((15 + Math.random() * 40) * business * 0.4),
  };
});

// --- Content safety breakdown ---
const SAFETY_CATEGORIES = [
  { category: 'Hate & Fairness', blocked: 412, severity: 'medium', color: '#f87171' },
  { category: 'Sexual', blocked: 287, severity: 'high', color: '#ec4899' },
  { category: 'Violence', blocked: 198, severity: 'medium', color: '#f97316' },
  { category: 'Self-Harm', blocked: 156, severity: 'high', color: '#ef4444' },
  { category: 'Profanity', blocked: 842, severity: 'low', color: '#fbbf24' },
  { category: 'Jailbreak Attempt', blocked: 378, severity: 'high', color: '#dc2626' },
  { category: 'Protected Material', blocked: 200, severity: 'medium', color: '#a855f7' },
];

// --- Throttling events (hourly, last 24h) ---
const HOURLY_THROTTLE = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  throttled: Math.round((i >= 10 && i <= 15 ? 80 : 12) + Math.random() * (i >= 10 && i <= 15 ? 120 : 30)),
  succeeded: Math.round((i >= 9 && i <= 17 ? 2400 : 800) + Math.random() * 600),
}));

// --- Computed aggregates ---
const TOTAL_COST = PROJECTS.reduce((s, p) => s + p.mtdCost, 0);
const TOTAL_TOKENS = PROJECTS.reduce((s, p) => s + p.totalTokens30d, 0);
const TOTAL_PROMPT = PROJECTS.reduce((s, p) => s + p.promptTokens30d, 0);
const TOTAL_COMPLETION = PROJECTS.reduce((s, p) => s + p.completionTokens30d, 0);
const TOTAL_REQUESTS = PROJECTS.reduce((s, p) => s + p.totalRequests30d, 0);
const TOTAL_BLOCKED = PROJECTS.reduce((s, p) => s + p.contentFilterBlocked30d, 0);
const AVG_LATENCY = Math.round(PROJECTS.reduce((s, p) => s + p.avgLatencyMs * p.totalRequests30d, 0) / TOTAL_REQUESTS);
const AVG_SUCCESS = +(PROJECTS.reduce((s, p) => s + p.successRate * p.totalRequests30d, 0) / TOTAL_REQUESTS).toFixed(1);
const ACTIVE_MODELS = MODEL_METRICS.length;
const TOTAL_THROTTLED = MODEL_METRICS.reduce((s, m) => s + m.throttledRequests30d, 0);

// --- Per-model token aggregates ---
const modelTokenAgg = MODEL_METRICS.reduce<Record<string, { model: string; prompt: number; completion: number; requests: number }>>((acc, m) => {
  const key = m.model;
  if (!acc[key]) acc[key] = { model: key, prompt: 0, completion: 0, requests: 0 };
  acc[key].prompt += m.promptTokens30d;
  acc[key].completion += m.completionTokens30d;
  acc[key].requests += m.requests30d;
  return acc;
}, {});
const TOKEN_BY_MODEL = Object.values(modelTokenAgg).sort((a, b) => (b.prompt + b.completion) - (a.prompt + a.completion));

const MODEL_COLORS: Record<string, string> = {
  'gpt-4o': '#3b82f6',
  'gpt-4o-mini': '#10b981',
  'text-embedding-ada-002': '#8b5cf6',
  'text-embedding-3-large': '#a78bfa',
  'dall-e-3': '#f59e0b',
};

// --- Tabs ---
type Tab = 'overview' | 'projects' | 'models' | 'safety' | 'throughput';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'projects', label: 'Projects', icon: '🏗️' },
  { key: 'models', label: 'Model Deployments', icon: '🤖' },
  { key: 'throughput', label: 'Token Throughput', icon: '⚡' },
  { key: 'safety', label: 'Content Safety', icon: '🛡️' },
];

// --- Reusable components ---
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

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.02] ${color}`}>
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>{children}</span>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AIFoundryPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const filteredModels = useMemo(() => {
    if (selectedProject === 'all') return MODEL_METRICS;
    return MODEL_METRICS.filter(m => m.project === selectedProject);
  }, [selectedProject]);

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
              <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-2xl">🔮</span>AI Foundry Dashboard
                <Badge color="bg-purple-500/20 text-purple-400 border-purple-500/30">Preview</Badge>
              </h1>
              <p className="text-xs text-[var(--text-tertiary)]">{PROJECTS.length} projects &bull; {ACTIVE_MODELS} model deployments &bull; Last refreshed: Apr 9, 2026 14:32 UTC</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/cognitive-services" className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-blue-500/50 transition-colors">
              All Cognitive Services →
            </Link>
            <a href="https://ai.azure.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/20 transition-colors">
              Open AI Foundry →
            </a>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-card)]/50">
        <div className="mx-auto max-w-[1600px] px-6 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-purple-500 text-purple-400' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}>
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
              <Stat label="Active Projects" value={String(PROJECTS.filter(p => p.status === 'Active').length)} sub={`${PROJECTS.length} total`} color="from-purple-500/20 to-purple-600/5 border-purple-500/30" />
              <Stat label="MTD Cost" value={`$${TOTAL_COST.toFixed(2)}`} sub="Apr 1–9, 2026" color="from-emerald-500/20 to-emerald-600/5 border-emerald-500/30" />
              <Stat label="Total Tokens (30d)" value={`${(TOTAL_TOKENS / 1_000_000).toFixed(1)}M`} sub={`${(TOTAL_PROMPT / 1_000_000).toFixed(1)}M prompt + ${(TOTAL_COMPLETION / 1_000_000).toFixed(1)}M completion`} color="from-blue-500/20 to-blue-600/5 border-blue-500/30" />
              <Stat label="Requests (30d)" value={`${(TOTAL_REQUESTS / 1000).toFixed(0)}K`} sub={`${AVG_SUCCESS}% success rate`} color="from-cyan-500/20 to-cyan-600/5 border-cyan-500/30" />
              <Stat label="Avg Latency" value={`${AVG_LATENCY}ms`} sub="Weighted across all models" color="from-amber-500/20 to-amber-600/5 border-amber-500/30" />
              <Stat label="Content Blocked" value={TOTAL_BLOCKED.toLocaleString()} sub={`${TOTAL_THROTTLED.toLocaleString()} throttled`} color="from-red-500/20 to-red-600/5 border-red-500/30" />
            </div>

            {/* Row: Token throughput trend + Cost by project */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Daily token throughput */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Token Throughput — Last 14 Days</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={DAILY_TOKENS}>
                    <defs>
                      <linearGradient id="promptGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="prompt" name="Prompt Tokens" stroke="#3b82f6" fill="url(#promptGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="completion" name="Completion Tokens" stroke="#10b981" fill="url(#compGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Cost by project */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">MTD Cost by Project</h2>
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={280}>
                    <PieChart>
                      <Pie data={PROJECTS.map(p => ({ name: p.name, cost: p.mtdCost }))} dataKey="cost" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={50} paddingAngle={2} label={({ cost }) => `$${cost}`}>
                        {PROJECTS.map((_, i) => (
                          <Cell key={i} fill={['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'][i % 5]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    {[...PROJECTS].sort((a, b) => b.mtdCost - a.mtdCost).map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ['#8b5cf6', '#3b82f6', '#10b981', '#06b6d4', '#f59e0b'][i % 5] }} />
                          <span className="text-sm text-[var(--text-secondary)] truncate max-w-[160px]" title={p.name}>{p.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">${p.mtdCost.toFixed(2)}</span>
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

            {/* Row: Requests by model type + Throttling */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Requests by model (24h) */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Requests by Model — Last 24h</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={HOURLY_BY_MODEL}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="hour" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} interval={3} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="gpt-4o" name="GPT-4o" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="gpt-4o-mini" name="GPT-4o-mini" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="embeddings" name="Embeddings" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="dall-e-3" name="DALL-E 3" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Throttling */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Throttled vs Succeeded — Last 24h</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={HOURLY_THROTTLE}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="hour" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} interval={3} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="succeeded" name="Succeeded" fill="#34d399" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="throttled" name="Throttled (429)" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Token breakdown by model */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Token Consumption by Model (30d)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={TOKEN_BY_MODEL}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="model" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="prompt" name="Prompt Tokens" stackId="tok" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="completion" name="Completion Tokens" stackId="tok" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ============ PROJECTS TAB ============ */}
        {tab === 'projects' && (
          <div className="space-y-6">
            <p className="text-sm text-[var(--text-tertiary)]">All Azure AI Foundry projects and standalone OpenAI accounts in the subscription</p>
            {PROJECTS.map(project => (
              <div key={project.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden transition-all hover:border-purple-500/30">
                <button onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)} className="w-full text-left p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-xl">
                        {project.kind === 'AIServices' ? '🔮' : '🤖'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-base font-bold text-[var(--text-primary)]">{project.name}</h3>
                          <Badge color="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">● {project.status}</Badge>
                          <Badge color="bg-purple-500/20 text-purple-400 border-purple-500/30">{project.kind}</Badge>
                          <span className="text-xs text-[var(--text-tertiary)]">{project.location}</span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] mt-1">Hub: {project.hub} &bull; RG: {project.rg} &bull; Models: {project.models.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-[var(--text-tertiary)]">MTD Cost</p>
                        <p className="text-lg font-bold text-emerald-400">${project.mtdCost.toFixed(2)}</p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-[var(--text-tertiary)]">Tokens (30d)</p>
                        <p className="text-lg font-bold text-[var(--text-primary)]">{(project.totalTokens30d / 1_000_000).toFixed(1)}M</p>
                      </div>
                      <div className="text-right hidden lg:block">
                        <p className="text-xs text-[var(--text-tertiary)]">Requests (30d)</p>
                        <p className="text-lg font-bold text-[var(--text-primary)]">{(project.totalRequests30d / 1000).toFixed(1)}K</p>
                      </div>
                      <svg className={`h-5 w-5 text-[var(--text-tertiary)] transition-transform ${expandedProject === project.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </div>
                  </div>
                </button>

                {expandedProject === project.id && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg-primary)]/50">
                    {/* Metrics bar */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 p-6 pb-0">
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Prompt Tokens</p>
                        <p className="text-sm font-bold text-blue-400 mt-1">{(project.promptTokens30d / 1_000_000).toFixed(2)}M</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Completion Tokens</p>
                        <p className="text-sm font-bold text-emerald-400 mt-1">{(project.completionTokens30d / 1_000_000).toFixed(2)}M</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Avg Latency</p>
                        <p className={`text-sm font-bold mt-1 ${project.avgLatencyMs > 300 ? 'text-amber-400' : 'text-emerald-400'}`}>{project.avgLatencyMs}ms</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Success Rate</p>
                        <p className={`text-sm font-bold mt-1 ${project.successRate >= 99 ? 'text-emerald-400' : project.successRate >= 98 ? 'text-amber-400' : 'text-red-400'}`}>{project.successRate}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Content Blocked</p>
                        <p className="text-sm font-bold text-red-400 mt-1">{project.contentFilterBlocked30d.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Endpoint</p>
                        <p className="text-xs text-blue-400 font-mono break-all mt-1">{project.openaiEndpoint}</p>
                      </div>
                    </div>

                    {/* Connected resources */}
                    <div className="p-6 pt-4">
                      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Connected Resources</p>
                      <div className="flex flex-wrap gap-2">
                        {project.connectedResources.map(r => (
                          <span key={r.name} className="rounded-lg bg-slate-700/50 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                            <span className="text-[var(--text-tertiary)]">{r.type}:</span> {r.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Model deployments for this project */}
                    <div className="border-t border-[var(--border)] p-6">
                      <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Model Deployments</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-[var(--text-tertiary)]">
                              <th className="pb-2 pr-4 font-medium">Deployment</th>
                              <th className="pb-2 pr-4 font-medium">Model</th>
                              <th className="pb-2 pr-4 font-medium text-right">Capacity</th>
                              <th className="pb-2 pr-4 font-medium text-right">Tokens</th>
                              <th className="pb-2 pr-4 font-medium text-right">TTFT P50</th>
                              <th className="pb-2 pr-4 font-medium text-right">TTFT P99</th>
                              <th className="pb-2 font-medium text-right">Throttled</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MODEL_METRICS.filter(m => m.project === project.name).map(m => (
                              <tr key={m.deploymentName} className="border-t border-[var(--border)]/30">
                                <td className="py-2 pr-4 font-mono text-[var(--text-secondary)]">{m.deploymentName}</td>
                                <td className="py-2 pr-4"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: (MODEL_COLORS[m.model] || '#6b7280') + '20', color: MODEL_COLORS[m.model] || '#6b7280' }}>{m.model}</span></td>
                                <td className="py-2 pr-4 text-right text-[var(--text-primary)] font-semibold">{m.provisionedCapacity} {m.capacityUnit}</td>
                                <td className="py-2 pr-4 text-right font-mono text-[var(--text-primary)]">{(m.totalTokens30d / 1_000_000).toFixed(2)}M</td>
                                <td className="py-2 pr-4 text-right text-[var(--text-secondary)]">{m.ttft_p50Ms}ms</td>
                                <td className="py-2 pr-4 text-right"><span className={m.ttft_p99Ms > 2000 ? 'text-amber-400' : 'text-[var(--text-secondary)]'}>{m.ttft_p99Ms.toLocaleString()}ms</span></td>
                                <td className="py-2 text-right"><span className={m.throttledRequests30d > 1000 ? 'text-red-400 font-semibold' : 'text-[var(--text-secondary)]'}>{m.throttledRequests30d.toLocaleString()}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ============ MODEL DEPLOYMENTS TAB ============ */}
        {tab === 'models' && (
          <div className="space-y-6">
            {/* Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-[var(--text-tertiary)]">Filter by project:</label>
              <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-purple-500 focus:outline-none">
                <option value="all">All projects ({MODEL_METRICS.length} deployments)</option>
                {PROJECTS.map(p => (
                  <option key={p.id} value={p.name}>{p.name} ({MODEL_METRICS.filter(m => m.project === p.name).length})</option>
                ))}
              </select>
            </div>

            {/* Time to First Token comparison */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Time to First Token (TTFT)</h2>
              <p className="text-xs text-[var(--text-tertiary)] mb-6">P50 vs P99 latency in milliseconds — lower is better</p>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={filteredModels.map(m => ({ name: `${m.deploymentName}`, p50: m.ttft_p50Ms, p99: m.ttft_p99Ms, model: m.model }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `${v}ms`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="p50" name="TTFT P50" fill="#34d399" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="p99" name="TTFT P99" fill="#f87171" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Full deployment table */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-primary)]/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Project</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Deployment</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Model</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Capacity</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Prompt Tok</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Compl Tok</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Requests</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">TTFT P50</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">TTFT P99</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Throttled</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Blocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModels.map(m => (
                      <tr key={`${m.project}-${m.deploymentName}`} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-card-hover)] transition-colors">
                        <td className="px-5 py-3 text-xs text-[var(--text-tertiary)] truncate max-w-[120px]" title={m.project}>{m.project.length > 16 ? m.project.slice(0, 14) + '…' : m.project}</td>
                        <td className="px-5 py-3 font-mono text-xs text-[var(--text-secondary)]">{m.deploymentName}</td>
                        <td className="px-5 py-3"><span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: (MODEL_COLORS[m.model] || '#6b7280') + '20', color: MODEL_COLORS[m.model] || '#6b7280' }}>{m.model}</span></td>
                        <td className="px-5 py-3 text-right text-xs font-semibold text-[var(--text-primary)]">{m.provisionedCapacity} {m.capacityUnit}</td>
                        <td className="px-5 py-3 text-right text-xs font-mono text-blue-400">{(m.promptTokens30d / 1_000_000).toFixed(2)}M</td>
                        <td className="px-5 py-3 text-right text-xs font-mono text-emerald-400">{(m.completionTokens30d / 1_000_000).toFixed(2)}M</td>
                        <td className="px-5 py-3 text-right text-xs font-mono text-[var(--text-primary)]">{m.requests30d.toLocaleString()}</td>
                        <td className="px-5 py-3 text-right text-xs text-[var(--text-secondary)]">{m.ttft_p50Ms}ms</td>
                        <td className="px-5 py-3 text-right text-xs"><span className={m.ttft_p99Ms > 2000 ? 'text-amber-400 font-semibold' : 'text-[var(--text-secondary)]'}>{m.ttft_p99Ms.toLocaleString()}ms</span></td>
                        <td className="px-5 py-3 text-right text-xs"><span className={m.throttledRequests30d > 1000 ? 'text-red-400 font-semibold' : 'text-[var(--text-secondary)]'}>{m.throttledRequests30d.toLocaleString()}</span></td>
                        <td className="px-5 py-3 text-right text-xs"><span className={m.contentFilterBlocked30d > 200 ? 'text-amber-400' : 'text-[var(--text-secondary)]'}>{m.contentFilterBlocked30d.toLocaleString()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============ TOKEN THROUGHPUT TAB ============ */}
        {tab === 'throughput' && (
          <div className="space-y-6">
            {/* Prompt/Completion ratio cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Prompt Tokens (30d)" value={`${(TOTAL_PROMPT / 1_000_000).toFixed(1)}M`} sub={`${((TOTAL_PROMPT / TOTAL_TOKENS) * 100).toFixed(0)}% of total`} color="from-blue-500/20 to-blue-600/5 border-blue-500/30" />
              <Stat label="Completion Tokens (30d)" value={`${(TOTAL_COMPLETION / 1_000_000).toFixed(1)}M`} sub={`${((TOTAL_COMPLETION / TOTAL_TOKENS) * 100).toFixed(0)}% of total`} color="from-emerald-500/20 to-emerald-600/5 border-emerald-500/30" />
              <Stat label="Prompt:Completion Ratio" value={`${(TOTAL_PROMPT / TOTAL_COMPLETION).toFixed(1)}:1`} sub="Higher = more input context" color="from-purple-500/20 to-purple-600/5 border-purple-500/30" />
              <Stat label="Avg Tokens/Request" value={Math.round(TOTAL_TOKENS / TOTAL_REQUESTS).toLocaleString()} sub={`${TOTAL_REQUESTS.toLocaleString()} requests`} color="from-amber-500/20 to-amber-600/5 border-amber-500/30" />
            </div>

            {/* Per-project token breakdown */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Token Consumption by Project (30d)</h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={PROJECTS.map(p => ({ name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name, prompt: p.promptTokens30d, completion: p.completionTokens30d, fullName: p.name }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={160} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="prompt" name="Prompt Tokens" stackId="tok" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="completion" name="Completion Tokens" stackId="tok" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Daily token trend (larger) */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Daily Token Volume — 14 Day Trend</h2>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={DAILY_TOKENS.map(d => ({ ...d, total: d.prompt + d.completion }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="total" name="Total Tokens" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 4, fill: '#a78bfa' }} />
                  <Line type="monotone" dataKey="prompt" name="Prompt" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="completion" name="Completion" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Throttled requests per deployment */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Throttled Requests by Deployment (30d)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={MODEL_METRICS.filter(m => m.throttledRequests30d > 0).sort((a, b) => b.throttledRequests30d - a.throttledRequests30d).map(m => ({ name: m.deploymentName, throttled: m.throttledRequests30d, model: m.model }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="throttled" name="Throttled (429)" radius={[6, 6, 0, 0]}>
                    {MODEL_METRICS.filter(m => m.throttledRequests30d > 0).sort((a, b) => b.throttledRequests30d - a.throttledRequests30d).map((m, i) => (
                      <Cell key={i} fill={m.throttledRequests30d > 2000 ? '#ef4444' : m.throttledRequests30d > 500 ? '#fbbf24' : '#34d399'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ============ CONTENT SAFETY TAB ============ */}
        {tab === 'safety' && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Total Blocked (30d)" value={SAFETY_CATEGORIES.reduce((s, c) => s + c.blocked, 0).toLocaleString()} sub="Across all categories" color="from-red-500/20 to-red-600/5 border-red-500/30" />
              <Stat label="Block Rate" value={`${((SAFETY_CATEGORIES.reduce((s, c) => s + c.blocked, 0) / TOTAL_REQUESTS) * 100).toFixed(2)}%`} sub={`of ${(TOTAL_REQUESTS / 1000).toFixed(0)}K total requests`} color="from-amber-500/20 to-amber-600/5 border-amber-500/30" />
              <Stat label="Top Category" value="Profanity" sub={`${SAFETY_CATEGORIES[4].blocked.toLocaleString()} blocked`} color="from-purple-500/20 to-purple-600/5 border-purple-500/30" />
              <Stat label="Jailbreak Attempts" value={SAFETY_CATEGORIES[5].blocked.toLocaleString()} sub="High severity" color="from-rose-500/20 to-rose-600/5 border-rose-500/30" />
            </div>

            {/* Safety category breakdown */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Blocked Requests by Category</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={SAFETY_CATEGORIES.sort((a, b) => b.blocked - a.blocked)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                    <YAxis type="category" dataKey="category" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={160} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="blocked" name="Blocked Requests" radius={[0, 6, 6, 0]}>
                      {SAFETY_CATEGORIES.sort((a, b) => b.blocked - a.blocked).map(c => (
                        <Cell key={c.category} fill={c.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Distribution by Severity</h2>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={[
                        { severity: 'High', count: SAFETY_CATEGORIES.filter(c => c.severity === 'high').reduce((s, c) => s + c.blocked, 0) },
                        { severity: 'Medium', count: SAFETY_CATEGORIES.filter(c => c.severity === 'medium').reduce((s, c) => s + c.blocked, 0) },
                        { severity: 'Low', count: SAFETY_CATEGORIES.filter(c => c.severity === 'low').reduce((s, c) => s + c.blocked, 0) },
                      ]}
                      dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={120} innerRadius={60} paddingAngle={3}
                      label={({ severity, count }) => `${severity}: ${count}`}
                    >
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#3b82f6" />
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 flex justify-center gap-6">
                  {[{ label: 'High', color: '#ef4444' }, { label: 'Medium', color: '#f59e0b' }, { label: 'Low', color: '#3b82f6' }].map(l => (
                    <div key={l.label} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Per-project content filter table */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Content Filter Blocks by Project (30d)</h2>
              <div className="space-y-3">
                {[...PROJECTS].sort((a, b) => b.contentFilterBlocked30d - a.contentFilterBlocked30d).map(p => (
                  <div key={p.id} className="flex items-center gap-4">
                    <span className="text-sm text-[var(--text-secondary)] w-48 truncate" title={p.name}>{p.name}</span>
                    <div className="flex-1 h-3 rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${(p.contentFilterBlocked30d / Math.max(...PROJECTS.map(pp => pp.contentFilterBlocked30d))) * 100}%`,
                        backgroundColor: p.contentFilterBlocked30d > 1000 ? '#ef4444' : p.contentFilterBlocked30d > 500 ? '#fbbf24' : '#34d399',
                      }} />
                    </div>
                    <span className={`text-sm font-bold w-16 text-right ${p.contentFilterBlocked30d > 1000 ? 'text-red-400' : p.contentFilterBlocked30d > 500 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {p.contentFilterBlocked30d.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">🛡️ Safety Recommendations</h2>
              <div className="space-y-3">
                {[
                  { title: 'Review jailbreak attempts on ai-patterns-oai', desc: '1,204 content blocks — highest across all projects. 780 from GPT-4o alone. Consider adding custom blocklists or prompt shields.', severity: 'high' },
                  { title: 'Enable prompt shields for all DALL-E 3 deployments', desc: '263 content filter blocks from image generation. Prompt shields can catch adversarial prompts before generation starts.', severity: 'high' },
                  { title: 'Tune content filter sensitivity for kv-ai project', desc: '847 blocks may include false positives. Review logs and consider adjusting thresholds for the dev environment.', severity: 'medium' },
                  { title: 'Add custom blocklists for domain-specific terms', desc: 'Profanity category (842 blocks) may include industry jargon. Custom blocklists reduce false positives.', severity: 'low' },
                ].map(rec => (
                  <div key={rec.title} className="rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--bg-card-hover)] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${rec.severity === 'high' ? 'bg-red-400' : rec.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{rec.title}</h3>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1 ml-4">{rec.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--text-tertiary)]">
        Azure AI Foundry Dashboard &bull; {PROJECTS.length} projects &bull; {ACTIVE_MODELS} model deployments &bull;
        <a href="https://ai.azure.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline ml-1">AI Foundry</a>
        <span className="mx-2">&bull;</span>
        <Link href="/cognitive-services" className="text-blue-400 hover:underline">All Cognitive Services</Link>
      </footer>
    </div>
  );
}
