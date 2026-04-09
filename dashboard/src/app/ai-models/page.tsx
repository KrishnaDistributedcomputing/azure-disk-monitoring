'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, LineChart, Line, Legend, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

// ============================================================================
// AI MODELS CATALOG — Every model deployed through AI Foundry in one view
// Deep metrics: tokens, latency, TTFT, throughput, throttling, cost,
//               capacity utilization, content safety, error rates
// Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105
// ============================================================================

// --- Types ---
interface DeployedModel {
  id: string;
  deploymentName: string;
  model: string;
  modelFamily: 'GPT-4o' | 'GPT-4o-mini' | 'Embeddings' | 'DALL-E' | 'Embeddings-v3';
  version: string;
  project: string;
  projectKind: 'AIServices' | 'OpenAI';
  region: string;
  endpoint: string;
  sku: string;
  provisionedCapacity: number;
  capacityUnit: string;
  // Token metrics (30d)
  promptTokens30d: number;
  completionTokens30d: number;
  totalTokens30d: number;
  requests30d: number;
  successfulRequests30d: number;
  failedRequests30d: number;
  // Latency (ms)
  avgPromptLatencyMs: number;
  avgCompletionLatencyMs: number;
  avgE2eLatencyMs: number;
  ttft_p50Ms: number;
  ttft_p90Ms: number;
  ttft_p95Ms: number;
  ttft_p99Ms: number;
  tbt_p50Ms: number;  // time between tokens
  tbt_p99Ms: number;
  // Throughput
  peakRpm: number;
  avgRpm: number;
  peakTpm: number;
  avgTpm: number;
  // Throttling & errors
  throttledRequests30d: number;
  rateLimitRetries30d: number;
  http4xx30d: number;
  http5xx30d: number;
  timeouts30d: number;
  // Content safety
  contentFilterBlocked30d: number;
  contentFilterCategories: { category: string; count: number }[];
  // Cost
  estimatedCost30d: number;
  costPerMillionTokens: number;
  // Capacity
  capacityUtilizationPct: number;
  peakUtilizationPct: number;
  // Daily timeseries (14 days)
  dailyTokens: { day: string; prompt: number; completion: number }[];
  dailyRequests: { day: string; requests: number; throttled: number; errors: number }[];
  dailyLatency: { day: string; p50: number; p99: number }[];
}

// --- Pricing reference ---
const PRICING: Record<string, { input: number; output: number; unit: string }> = {
  'gpt-4o':                    { input: 2.50, output: 10.00, unit: '$/1M tokens' },
  'gpt-4o-mini':               { input: 0.15, output: 0.60,  unit: '$/1M tokens' },
  'text-embedding-ada-002':    { input: 0.10, output: 0,     unit: '$/1M tokens' },
  'text-embedding-3-large':    { input: 0.13, output: 0,     unit: '$/1M tokens' },
  'dall-e-3':                  { input: 0.04, output: 0,     unit: '$/image (1024×1024)' },
};

// --- Generate 14-day timeseries with some variance ---
function genDailyTokens(base: number, ratio: number): DeployedModel['dailyTokens'] {
  const days = ['Mar 27','Mar 28','Mar 29','Mar 30','Mar 31','Apr 1','Apr 2','Apr 3','Apr 4','Apr 5','Apr 6','Apr 7','Apr 8','Apr 9'];
  return days.map((day, i) => {
    const weekend = i % 7 >= 5 ? 0.55 : 1;
    const trend = 0.9 + (i / 14) * 0.2;
    const noise = 0.85 + Math.random() * 0.3;
    const prompt = Math.round(base * weekend * trend * noise);
    return { day, prompt, completion: Math.round(prompt * ratio) };
  });
}
function genDailyRequests(base: number, throttlePct: number): DeployedModel['dailyRequests'] {
  const days = ['Mar 27','Mar 28','Mar 29','Mar 30','Mar 31','Apr 1','Apr 2','Apr 3','Apr 4','Apr 5','Apr 6','Apr 7','Apr 8','Apr 9'];
  return days.map((day, i) => {
    const weekend = i % 7 >= 5 ? 0.5 : 1;
    const noise = 0.8 + Math.random() * 0.4;
    const requests = Math.round(base * weekend * noise);
    return { day, requests, throttled: Math.round(requests * throttlePct * (0.5 + Math.random())), errors: Math.round(requests * 0.003 * (0.5 + Math.random())) };
  });
}
function genDailyLatency(p50: number, p99: number): DeployedModel['dailyLatency'] {
  const days = ['Mar 27','Mar 28','Mar 29','Mar 30','Mar 31','Apr 1','Apr 2','Apr 3','Apr 4','Apr 5','Apr 6','Apr 7','Apr 8','Apr 9'];
  return days.map(day => ({
    day,
    p50: Math.round(p50 * (0.85 + Math.random() * 0.3)),
    p99: Math.round(p99 * (0.8 + Math.random() * 0.4)),
  }));
}

// --- All deployed models ---
const MODELS: DeployedModel[] = [
  {
    id: 'kv-gpt4o-main', deploymentName: 'gpt4o-main', model: 'gpt-4o', modelFamily: 'GPT-4o', version: '2024-11-20',
    project: 'kv-ai-d3ocert7badhy', projectKind: 'AIServices', region: 'swedencentral',
    endpoint: 'https://kv-ai-d3ocert7badhy.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 80, capacityUnit: 'K TPM',
    promptTokens30d: 10_240_000, completionTokens30d: 5_120_000, totalTokens30d: 15_360_000,
    requests30d: 142_000, successfulRequests30d: 137_480, failedRequests30d: 4_520,
    avgPromptLatencyMs: 85, avgCompletionLatencyMs: 420, avgE2eLatencyMs: 505,
    ttft_p50Ms: 180, ttft_p90Ms: 520, ttft_p95Ms: 780, ttft_p99Ms: 1_200,
    tbt_p50Ms: 12, tbt_p99Ms: 45,
    peakRpm: 320, avgRpm: 198, peakTpm: 72_000, avgTpm: 53_400,
    throttledRequests30d: 3_400, rateLimitRetries30d: 1_200, http4xx30d: 980, http5xx30d: 140, timeouts30d: 62,
    contentFilterBlocked30d: 512, contentFilterCategories: [
      { category: 'Hate', count: 124 }, { category: 'Sexual', count: 89 }, { category: 'Violence', count: 67 },
      { category: 'Self-Harm', count: 42 }, { category: 'Jailbreak', count: 112 }, { category: 'Profanity', count: 78 },
    ],
    estimatedCost30d: 76.80, costPerMillionTokens: 5.00,
    capacityUtilizationPct: 62, peakUtilizationPct: 89,
    dailyTokens: genDailyTokens(730_000, 0.5),
    dailyRequests: genDailyRequests(10_100, 0.024),
    dailyLatency: genDailyLatency(180, 1_200),
  },
  {
    id: 'kv-gpt4o-mini-fast', deploymentName: 'gpt4o-mini-fast', model: 'gpt-4o-mini', modelFamily: 'GPT-4o-mini', version: '2024-07-18',
    project: 'kv-ai-d3ocert7badhy', projectKind: 'AIServices', region: 'swedencentral',
    endpoint: 'https://kv-ai-d3ocert7badhy.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 200, capacityUnit: 'K TPM',
    promptTokens30d: 6_480_000, completionTokens30d: 2_980_000, totalTokens30d: 9_460_000,
    requests30d: 124_600, successfulRequests30d: 123_160, failedRequests30d: 1_440,
    avgPromptLatencyMs: 42, avgCompletionLatencyMs: 185, avgE2eLatencyMs: 227,
    ttft_p50Ms: 68, ttft_p90Ms: 180, ttft_p95Ms: 280, ttft_p99Ms: 480,
    tbt_p50Ms: 5, tbt_p99Ms: 18,
    peakRpm: 480, avgRpm: 288, peakTpm: 148_000, avgTpm: 65_700,
    throttledRequests30d: 820, rateLimitRetries30d: 310, http4xx30d: 420, http5xx30d: 55, timeouts30d: 28,
    contentFilterBlocked30d: 210, contentFilterCategories: [
      { category: 'Hate', count: 48 }, { category: 'Sexual', count: 32 }, { category: 'Violence', count: 28 },
      { category: 'Self-Harm', count: 18 }, { category: 'Jailbreak', count: 52 }, { category: 'Profanity', count: 32 },
    ],
    estimatedCost30d: 2.76, costPerMillionTokens: 0.29,
    capacityUtilizationPct: 41, peakUtilizationPct: 74,
    dailyTokens: genDailyTokens(462_000, 0.46),
    dailyRequests: genDailyRequests(8_900, 0.0066),
    dailyLatency: genDailyLatency(68, 480),
  },
  {
    id: 'kv-embed-v2', deploymentName: 'embeddings-v2', model: 'text-embedding-ada-002', modelFamily: 'Embeddings', version: '2',
    project: 'kv-ai-d3ocert7badhy', projectKind: 'AIServices', region: 'swedencentral',
    endpoint: 'https://kv-ai-d3ocert7badhy.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 350, capacityUnit: 'K TPM',
    promptTokens30d: 2_490_000, completionTokens30d: 0, totalTokens30d: 2_490_000,
    requests30d: 38_200, successfulRequests30d: 38_060, failedRequests30d: 140,
    avgPromptLatencyMs: 18, avgCompletionLatencyMs: 32, avgE2eLatencyMs: 50,
    ttft_p50Ms: 22, ttft_p90Ms: 48, ttft_p95Ms: 68, ttft_p99Ms: 95,
    tbt_p50Ms: 0, tbt_p99Ms: 0,
    peakRpm: 180, avgRpm: 88, peakTpm: 210_000, avgTpm: 57_800,
    throttledRequests30d: 120, rateLimitRetries30d: 40, http4xx30d: 60, http5xx30d: 12, timeouts30d: 8,
    contentFilterBlocked30d: 0, contentFilterCategories: [],
    estimatedCost30d: 0.25, costPerMillionTokens: 0.10,
    capacityUtilizationPct: 15, peakUtilizationPct: 60,
    dailyTokens: genDailyTokens(178_000, 0),
    dailyRequests: genDailyRequests(2_700, 0.003),
    dailyLatency: genDailyLatency(22, 95),
  },
  {
    id: 'kv-dalle3', deploymentName: 'dalle3-gen', model: 'dall-e-3', modelFamily: 'DALL-E', version: '3.0',
    project: 'kv-ai-d3ocert7badhy', projectKind: 'AIServices', region: 'swedencentral',
    endpoint: 'https://kv-ai-d3ocert7badhy.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 2, capacityUnit: 'RPM',
    promptTokens30d: 0, completionTokens30d: 1_330_000, totalTokens30d: 1_330_000,
    requests30d: 7_600, successfulRequests30d: 5_640, failedRequests30d: 1_960,
    avgPromptLatencyMs: 0, avgCompletionLatencyMs: 4_200, avgE2eLatencyMs: 4_200,
    ttft_p50Ms: 2_800, ttft_p90Ms: 5_200, ttft_p95Ms: 6_800, ttft_p99Ms: 8_500,
    tbt_p50Ms: 0, tbt_p99Ms: 0,
    peakRpm: 2, avgRpm: 0.4, peakTpm: 0, avgTpm: 0,
    throttledRequests30d: 1_840, rateLimitRetries30d: 920, http4xx30d: 180, http5xx30d: 40, timeouts30d: 120,
    contentFilterBlocked30d: 125, contentFilterCategories: [
      { category: 'Sexual', count: 42 }, { category: 'Violence', count: 28 }, { category: 'Jailbreak', count: 35 }, { category: 'Profanity', count: 20 },
    ],
    estimatedCost30d: 304.00, costPerMillionTokens: 0,
    capacityUtilizationPct: 20, peakUtilizationPct: 100,
    dailyTokens: genDailyTokens(0, 0),
    dailyRequests: genDailyRequests(540, 0.24),
    dailyLatency: genDailyLatency(2_800, 8_500),
  },
  {
    id: 'ff-gpt4o', deploymentName: 'gpt4o-dev', model: 'gpt-4o', modelFamily: 'GPT-4o', version: '2024-11-20',
    project: 'aifastfox260227', projectKind: 'AIServices', region: 'swedencentral',
    endpoint: 'https://aifastfox260227.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 40, capacityUnit: 'K TPM',
    promptTokens30d: 4_320_000, completionTokens30d: 2_180_000, totalTokens30d: 6_500_000,
    requests30d: 82_400, successfulRequests30d: 79_600, failedRequests30d: 2_800,
    avgPromptLatencyMs: 78, avgCompletionLatencyMs: 395, avgE2eLatencyMs: 473,
    ttft_p50Ms: 165, ttft_p90Ms: 480, ttft_p95Ms: 720, ttft_p99Ms: 1_100,
    tbt_p50Ms: 11, tbt_p99Ms: 42,
    peakRpm: 240, avgRpm: 142, peakTpm: 38_000, avgTpm: 22_600,
    throttledRequests30d: 2_100, rateLimitRetries30d: 780, http4xx30d: 520, http5xx30d: 88, timeouts30d: 45,
    contentFilterBlocked30d: 198, contentFilterCategories: [
      { category: 'Hate', count: 52 }, { category: 'Sexual', count: 38 }, { category: 'Violence', count: 32 },
      { category: 'Jailbreak', count: 48 }, { category: 'Profanity', count: 28 },
    ],
    estimatedCost30d: 32.60, costPerMillionTokens: 5.02,
    capacityUtilizationPct: 55, peakUtilizationPct: 95,
    dailyTokens: genDailyTokens(308_000, 0.5),
    dailyRequests: genDailyRequests(5_900, 0.025),
    dailyLatency: genDailyLatency(165, 1_100),
  },
  {
    id: 'ff-gpt4o-mini', deploymentName: 'gpt4o-mini-dev', model: 'gpt-4o-mini', modelFamily: 'GPT-4o-mini', version: '2024-07-18',
    project: 'aifastfox260227', projectKind: 'AIServices', region: 'swedencentral',
    endpoint: 'https://aifastfox260227.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 100, capacityUnit: 'K TPM',
    promptTokens30d: 2_220_000, completionTokens30d: 1_150_000, totalTokens30d: 3_370_000,
    requests30d: 45_400, successfulRequests30d: 44_600, failedRequests30d: 800,
    avgPromptLatencyMs: 38, avgCompletionLatencyMs: 168, avgE2eLatencyMs: 206,
    ttft_p50Ms: 62, ttft_p90Ms: 165, ttft_p95Ms: 250, ttft_p99Ms: 420,
    tbt_p50Ms: 5, tbt_p99Ms: 16,
    peakRpm: 280, avgRpm: 105, peakTpm: 82_000, avgTpm: 23_400,
    throttledRequests30d: 340, rateLimitRetries30d: 120, http4xx30d: 180, http5xx30d: 22, timeouts30d: 12,
    contentFilterBlocked30d: 114, contentFilterCategories: [
      { category: 'Hate', count: 28 }, { category: 'Sexual', count: 18 }, { category: 'Jailbreak', count: 42 }, { category: 'Profanity', count: 26 },
    ],
    estimatedCost30d: 1.02, costPerMillionTokens: 0.30,
    capacityUtilizationPct: 28, peakUtilizationPct: 82,
    dailyTokens: genDailyTokens(158_000, 0.52),
    dailyRequests: genDailyRequests(3_200, 0.0075),
    dailyLatency: genDailyLatency(62, 420),
  },
  {
    id: 'bo-gpt4o-mini', deploymentName: 'gpt4o-mini-rag', model: 'gpt-4o-mini', modelFamily: 'GPT-4o-mini', version: '2024-07-18',
    project: 'aiboldorca260227', projectKind: 'AIServices', region: 'westus3',
    endpoint: 'https://aiboldorca260227.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 60, capacityUnit: 'K TPM',
    promptTokens30d: 1_890_000, completionTokens30d: 920_000, totalTokens30d: 2_810_000,
    requests30d: 38_200, successfulRequests30d: 37_740, failedRequests30d: 460,
    avgPromptLatencyMs: 35, avgCompletionLatencyMs: 152, avgE2eLatencyMs: 187,
    ttft_p50Ms: 58, ttft_p90Ms: 148, ttft_p95Ms: 225, ttft_p99Ms: 380,
    tbt_p50Ms: 4, tbt_p99Ms: 14,
    peakRpm: 190, avgRpm: 88, peakTpm: 48_000, avgTpm: 19_500,
    throttledRequests30d: 180, rateLimitRetries30d: 60, http4xx30d: 120, http5xx30d: 15, timeouts30d: 8,
    contentFilterBlocked30d: 62, contentFilterCategories: [
      { category: 'Hate', count: 14 }, { category: 'Jailbreak', count: 28 }, { category: 'Profanity', count: 20 },
    ],
    estimatedCost30d: 0.84, costPerMillionTokens: 0.30,
    capacityUtilizationPct: 34, peakUtilizationPct: 80,
    dailyTokens: genDailyTokens(135_000, 0.49),
    dailyRequests: genDailyRequests(2_700, 0.0047),
    dailyLatency: genDailyLatency(58, 380),
  },
  {
    id: 'bo-embed3', deploymentName: 'embed3-large', model: 'text-embedding-3-large', modelFamily: 'Embeddings-v3', version: '1',
    project: 'aiboldorca260227', projectKind: 'AIServices', region: 'westus3',
    endpoint: 'https://aiboldorca260227.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 200, capacityUnit: 'K TPM',
    promptTokens30d: 920_000, completionTokens30d: 0, totalTokens30d: 920_000,
    requests30d: 18_200, successfulRequests30d: 18_120, failedRequests30d: 80,
    avgPromptLatencyMs: 22, avgCompletionLatencyMs: 45, avgE2eLatencyMs: 67,
    ttft_p50Ms: 28, ttft_p90Ms: 58, ttft_p95Ms: 78, ttft_p99Ms: 110,
    tbt_p50Ms: 0, tbt_p99Ms: 0,
    peakRpm: 120, avgRpm: 42, peakTpm: 140_000, avgTpm: 21_400,
    throttledRequests30d: 60, rateLimitRetries30d: 18, http4xx30d: 32, http5xx30d: 6, timeouts30d: 4,
    contentFilterBlocked30d: 0, contentFilterCategories: [],
    estimatedCost30d: 0.12, costPerMillionTokens: 0.13,
    capacityUtilizationPct: 11, peakUtilizationPct: 70,
    dailyTokens: genDailyTokens(65_700, 0),
    dailyRequests: genDailyRequests(1_300, 0.0033),
    dailyLatency: genDailyLatency(28, 110),
  },
  {
    id: 'pat-gpt4o', deploymentName: 'patterns-4o', model: 'gpt-4o', modelFamily: 'GPT-4o', version: '2024-11-20',
    project: 'ai-patterns-oai', projectKind: 'OpenAI', region: 'eastus2',
    endpoint: 'https://ai-patterns-oai.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 60, capacityUnit: 'K TPM',
    promptTokens30d: 4_180_000, completionTokens30d: 2_240_000, totalTokens30d: 6_420_000,
    requests30d: 68_200, successfulRequests30d: 64_840, failedRequests30d: 3_360,
    avgPromptLatencyMs: 82, avgCompletionLatencyMs: 385, avgE2eLatencyMs: 467,
    ttft_p50Ms: 172, ttft_p90Ms: 490, ttft_p95Ms: 740, ttft_p99Ms: 1_150,
    tbt_p50Ms: 11, tbt_p99Ms: 40,
    peakRpm: 280, avgRpm: 158, peakTpm: 56_000, avgTpm: 22_300,
    throttledRequests30d: 2_800, rateLimitRetries30d: 1_050, http4xx30d: 680, http5xx30d: 120, timeouts30d: 58,
    contentFilterBlocked30d: 780, contentFilterCategories: [
      { category: 'Hate', count: 180 }, { category: 'Sexual', count: 145 }, { category: 'Violence', count: 98 },
      { category: 'Self-Harm', count: 62 }, { category: 'Jailbreak', count: 195 }, { category: 'Profanity', count: 100 },
    ],
    estimatedCost30d: 32.85, costPerMillionTokens: 5.12,
    capacityUtilizationPct: 55, peakUtilizationPct: 93,
    dailyTokens: genDailyTokens(298_000, 0.54),
    dailyRequests: genDailyRequests(4_870, 0.041),
    dailyLatency: genDailyLatency(172, 1_150),
  },
  {
    id: 'pat-mini', deploymentName: 'patterns-mini', model: 'gpt-4o-mini', modelFamily: 'GPT-4o-mini', version: '2024-07-18',
    project: 'ai-patterns-oai', projectKind: 'OpenAI', region: 'eastus2',
    endpoint: 'https://ai-patterns-oai.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 150, capacityUnit: 'K TPM',
    promptTokens30d: 1_780_000, completionTokens30d: 800_000, totalTokens30d: 2_580_000,
    requests30d: 54_800, successfulRequests30d: 54_000, failedRequests30d: 800,
    avgPromptLatencyMs: 36, avgCompletionLatencyMs: 162, avgE2eLatencyMs: 198,
    ttft_p50Ms: 60, ttft_p90Ms: 158, ttft_p95Ms: 240, ttft_p99Ms: 410,
    tbt_p50Ms: 4, tbt_p99Ms: 15,
    peakRpm: 310, avgRpm: 127, peakTpm: 112_000, avgTpm: 17_900,
    throttledRequests30d: 420, rateLimitRetries30d: 150, http4xx30d: 210, http5xx30d: 28, timeouts30d: 14,
    contentFilterBlocked30d: 286, contentFilterCategories: [
      { category: 'Hate', count: 62 }, { category: 'Sexual', count: 48 }, { category: 'Jailbreak', count: 98 }, { category: 'Profanity', count: 78 },
    ],
    estimatedCost30d: 0.75, costPerMillionTokens: 0.29,
    capacityUtilizationPct: 18, peakUtilizationPct: 75,
    dailyTokens: genDailyTokens(127_000, 0.45),
    dailyRequests: genDailyRequests(3_900, 0.0077),
    dailyLatency: genDailyLatency(60, 410),
  },
  {
    id: 'pat-dalle', deploymentName: 'patterns-dalle', model: 'dall-e-3', modelFamily: 'DALL-E', version: '3.0',
    project: 'ai-patterns-oai', projectKind: 'OpenAI', region: 'eastus2',
    endpoint: 'https://ai-patterns-oai.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 2, capacityUnit: 'RPM',
    promptTokens30d: 0, completionTokens30d: 870_000, totalTokens30d: 870_000,
    requests30d: 19_800, successfulRequests30d: 14_640, failedRequests30d: 5_160,
    avgPromptLatencyMs: 0, avgCompletionLatencyMs: 4_150, avgE2eLatencyMs: 4_150,
    ttft_p50Ms: 2_750, ttft_p90Ms: 5_100, ttft_p95Ms: 6_600, ttft_p99Ms: 8_200,
    tbt_p50Ms: 0, tbt_p99Ms: 0,
    peakRpm: 2, avgRpm: 0.5, peakTpm: 0, avgTpm: 0,
    throttledRequests30d: 4_200, rateLimitRetries30d: 2_100, http4xx30d: 420, http5xx30d: 80, timeouts30d: 280,
    contentFilterBlocked30d: 138, contentFilterCategories: [
      { category: 'Sexual', count: 52 }, { category: 'Violence', count: 32 }, { category: 'Jailbreak', count: 38 }, { category: 'Profanity', count: 16 },
    ],
    estimatedCost30d: 792.00, costPerMillionTokens: 0,
    capacityUtilizationPct: 25, peakUtilizationPct: 100,
    dailyTokens: genDailyTokens(0, 0),
    dailyRequests: genDailyRequests(1_414, 0.21),
    dailyLatency: genDailyLatency(2_750, 8_200),
  },
  {
    id: 'dm-mini', deploymentName: 'diskmon-mini', model: 'gpt-4o-mini', modelFamily: 'GPT-4o-mini', version: '2024-07-18',
    project: 'oai-diskmon-poc', projectKind: 'OpenAI', region: 'eastus2',
    endpoint: 'https://oai-diskmon-poc.openai.azure.com/', sku: 'S0',
    provisionedCapacity: 30, capacityUnit: 'K TPM',
    promptTokens30d: 412_000, completionTokens30d: 208_000, totalTokens30d: 620_000,
    requests30d: 8_400, successfulRequests30d: 8_360, failedRequests30d: 40,
    avgPromptLatencyMs: 32, avgCompletionLatencyMs: 198, avgE2eLatencyMs: 230,
    ttft_p50Ms: 55, ttft_p90Ms: 142, ttft_p95Ms: 218, ttft_p99Ms: 360,
    tbt_p50Ms: 5, tbt_p99Ms: 18,
    peakRpm: 42, avgRpm: 19, peakTpm: 12_000, avgTpm: 4_300,
    throttledRequests30d: 20, rateLimitRetries30d: 6, http4xx30d: 12, http5xx30d: 2, timeouts30d: 1,
    contentFilterBlocked30d: 12, contentFilterCategories: [
      { category: 'Jailbreak', count: 8 }, { category: 'Profanity', count: 4 },
    ],
    estimatedCost30d: 0.19, costPerMillionTokens: 0.30,
    capacityUtilizationPct: 5, peakUtilizationPct: 40,
    dailyTokens: genDailyTokens(29_400, 0.5),
    dailyRequests: genDailyRequests(600, 0.0024),
    dailyLatency: genDailyLatency(55, 360),
  },
];

// --- Aggregates ---
const TOTAL_MODELS = MODELS.length;
const TOTAL_TOKENS = MODELS.reduce((s, m) => s + m.totalTokens30d, 0);
const TOTAL_REQUESTS = MODELS.reduce((s, m) => s + m.requests30d, 0);
const TOTAL_COST = MODELS.reduce((s, m) => s + m.estimatedCost30d, 0);
const TOTAL_THROTTLED = MODELS.reduce((s, m) => s + m.throttledRequests30d, 0);
const TOTAL_BLOCKED = MODELS.reduce((s, m) => s + m.contentFilterBlocked30d, 0);
const TOTAL_ERRORS = MODELS.reduce((s, m) => s + m.http4xx30d + m.http5xx30d + m.timeouts30d, 0);
const W_AVG_LATENCY = Math.round(MODELS.reduce((s, m) => s + m.avgE2eLatencyMs * m.requests30d, 0) / TOTAL_REQUESTS);

const MODEL_COLORS: Record<string, string> = {
  'GPT-4o': '#3b82f6', 'GPT-4o-mini': '#10b981', 'Embeddings': '#8b5cf6',
  'Embeddings-v3': '#a78bfa', 'DALL-E': '#f59e0b',
};

// --- Tabs ---
type Tab = 'catalog' | 'performance' | 'throughput' | 'cost' | 'health';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'catalog', label: 'Model Catalog', icon: '🤖' },
  { key: 'performance', label: 'Performance', icon: '⚡' },
  { key: 'throughput', label: 'Throughput', icon: '📈' },
  { key: 'cost', label: 'Cost & Efficiency', icon: '💰' },
  { key: 'health', label: 'Health & Safety', icon: '🛡️' },
];

// --- Helpers ---
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 shadow-lg text-xs z-50">
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

function UtilBar({ pct, peak }: { pct: number; peak: number }) {
  return (
    <div className="relative h-3 rounded-full bg-slate-700 overflow-hidden w-full">
      <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct > 80 ? '#ef4444' : pct > 50 ? '#fbbf24' : '#34d399' }} />
      <div className="absolute inset-y-0 border-r-2 border-white/40" style={{ left: `${peak}%` }} title={`Peak: ${peak}%`} />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AIModelsCatalogPage() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [familyFilter, setFamilyFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'tokens' | 'cost' | 'latency' | 'requests' | 'throttled'>('tokens');

  const families = useMemo(() => [...new Set(MODELS.map(m => m.modelFamily))], []);

  const filtered = useMemo(() => {
    let result = familyFilter === 'all' ? MODELS : MODELS.filter(m => m.modelFamily === familyFilter);
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'cost': return b.estimatedCost30d - a.estimatedCost30d;
        case 'latency': return b.avgE2eLatencyMs - a.avgE2eLatencyMs;
        case 'requests': return b.requests30d - a.requests30d;
        case 'throttled': return b.throttledRequests30d - a.throttledRequests30d;
        default: return b.totalTokens30d - a.totalTokens30d;
      }
    });
    return result;
  }, [familyFilter, sortBy]);

  const detail = selectedModel ? MODELS.find(m => m.id === selectedModel) : null;

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
                <span className="text-2xl">🤖</span>AI Models Catalog
              </h1>
              <p className="text-xs text-[var(--text-tertiary)]">{TOTAL_MODELS} deployments across {new Set(MODELS.map(m => m.project)).size} projects &bull; Last refreshed: Apr 9, 2026 14:32 UTC</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/ai-foundry" className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-purple-500/50 transition-colors">AI Foundry →</Link>
            <a href="https://ai.azure.com" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-400 hover:bg-purple-500/20 transition-colors">Open AI Foundry →</a>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-card)]/50">
        <div className="mx-auto max-w-[1600px] px-6 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSelectedModel(null); }} className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}>
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-6 py-8">

        {/* ============ MODEL CATALOG TAB ============ */}
        {tab === 'catalog' && !detail && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
              <Stat label="Deployments" value={String(TOTAL_MODELS)} sub={`${families.length} model families`} color="from-blue-500/20 to-blue-600/5 border-blue-500/30" />
              <Stat label="Total Tokens" value={`${(TOTAL_TOKENS / 1e6).toFixed(1)}M`} sub="30 days" color="from-purple-500/20 to-purple-600/5 border-purple-500/30" />
              <Stat label="Requests" value={`${(TOTAL_REQUESTS / 1e3).toFixed(0)}K`} sub="30 days" color="from-cyan-500/20 to-cyan-600/5 border-cyan-500/30" />
              <Stat label="Est. Cost" value={`$${TOTAL_COST.toFixed(0)}`} sub="30 days" color="from-emerald-500/20 to-emerald-600/5 border-emerald-500/30" />
              <Stat label="Avg Latency" value={`${W_AVG_LATENCY}ms`} sub="Weighted E2E" color="from-amber-500/20 to-amber-600/5 border-amber-500/30" />
              <Stat label="Throttled" value={`${(TOTAL_THROTTLED / 1e3).toFixed(1)}K`} sub={`${((TOTAL_THROTTLED / TOTAL_REQUESTS) * 100).toFixed(1)}% of requests`} color="from-red-500/20 to-red-600/5 border-red-500/30" />
              <Stat label="Errors" value={TOTAL_ERRORS.toLocaleString()} sub="4xx + 5xx + timeouts" color="from-rose-500/20 to-rose-600/5 border-rose-500/30" />
              <Stat label="Content Blocked" value={TOTAL_BLOCKED.toLocaleString()} sub="Content filter" color="from-orange-500/20 to-orange-600/5 border-orange-500/30" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <fieldset className="flex rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                <button onClick={() => setFamilyFilter('all')} className={`px-4 py-2 text-xs font-semibold transition-colors ${familyFilter === 'all' ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}>All ({MODELS.length})</button>
                {families.map(f => (
                  <button key={f} onClick={() => setFamilyFilter(f)} className={`px-4 py-2 text-xs font-semibold transition-colors ${familyFilter === f ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}>{f} ({MODELS.filter(m => m.modelFamily === f).length})</button>
                ))}
              </fieldset>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-blue-500 focus:outline-none">
                <option value="tokens">Sort: Tokens ↓</option>
                <option value="cost">Sort: Cost ↓</option>
                <option value="latency">Sort: Latency ↓</option>
                <option value="requests">Sort: Requests ↓</option>
                <option value="throttled">Sort: Throttled ↓</option>
              </select>
            </div>

            {/* Model cards */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filtered.map(m => (
                <button key={m.id} onClick={() => setSelectedModel(m.id)} className="text-left rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition-all hover:border-blue-500/40 hover:shadow-lg group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: (MODEL_COLORS[m.modelFamily] || '#6b7280') + '20', color: MODEL_COLORS[m.modelFamily] || '#6b7280' }}>{m.model}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">v{m.version}</span>
                      </div>
                      <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-400 transition-colors">{m.deploymentName}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">{m.project} &bull; {m.region}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-400">${m.estimatedCost30d.toFixed(2)}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">est. 30d</p>
                    </div>
                  </div>
                  {/* Metrics grid */}
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div><p className="text-[10px] text-[var(--text-tertiary)]">Tokens</p><p className="text-sm font-bold text-[var(--text-primary)]">{(m.totalTokens30d / 1e6).toFixed(1)}M</p></div>
                    <div><p className="text-[10px] text-[var(--text-tertiary)]">Requests</p><p className="text-sm font-bold text-[var(--text-primary)]">{(m.requests30d / 1e3).toFixed(1)}K</p></div>
                    <div><p className="text-[10px] text-[var(--text-tertiary)]">E2E Latency</p><p className={`text-sm font-bold ${m.avgE2eLatencyMs > 1000 ? 'text-amber-400' : m.avgE2eLatencyMs > 400 ? 'text-blue-400' : 'text-emerald-400'}`}>{m.avgE2eLatencyMs.toLocaleString()}ms</p></div>
                    <div><p className="text-[10px] text-[var(--text-tertiary)]">TTFT P50</p><p className="text-sm font-bold text-[var(--text-primary)]">{m.ttft_p50Ms}ms</p></div>
                  </div>
                  {/* Capacity utilization */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--text-tertiary)] w-20">Capacity</span>
                    <UtilBar pct={m.capacityUtilizationPct} peak={m.peakUtilizationPct} />
                    <span className="text-xs font-bold text-[var(--text-primary)] w-12 text-right">{m.capacityUtilizationPct}%</span>
                  </div>
                  {/* Badges */}
                  <div className="flex gap-2 mt-3">
                    {m.throttledRequests30d > 2000 && <span className="rounded-full bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 text-[10px] font-semibold">{m.throttledRequests30d.toLocaleString()} throttled</span>}
                    {m.contentFilterBlocked30d > 100 && <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold">{m.contentFilterBlocked30d} blocked</span>}
                    {m.peakUtilizationPct >= 95 && <span className="rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold">At capacity</span>}
                    {m.capacityUtilizationPct < 15 && <span className="rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold">Underutilized</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============ MODEL DETAIL DRILL-DOWN ============ */}
        {tab === 'catalog' && detail && (
          <div className="space-y-6">
            <button onClick={() => setSelectedModel(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:underline mb-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              Back to all models
            </button>

            {/* Header card */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ backgroundColor: (MODEL_COLORS[detail.modelFamily] || '#6b7280') + '20', color: MODEL_COLORS[detail.modelFamily] }}>{detail.model}</span>
                    <span className="text-sm text-[var(--text-tertiary)]">v{detail.version}</span>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold">Active</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">{detail.deploymentName}</h2>
                  <p className="text-sm text-[var(--text-tertiary)]">{detail.project} &bull; {detail.region} &bull; {detail.provisionedCapacity} {detail.capacityUnit}</p>
                  <p className="text-xs text-blue-400 font-mono mt-1">{detail.endpoint}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-emerald-400">${detail.estimatedCost30d.toFixed(2)}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">est. 30d cost</p>
                  {PRICING[detail.model] && <p className="text-xs text-[var(--text-tertiary)] mt-1">Input: ${PRICING[detail.model].input} / Output: ${PRICING[detail.model].output} {PRICING[detail.model].unit}</p>}
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8">
                {[
                  { label: 'Total Tokens', value: `${(detail.totalTokens30d / 1e6).toFixed(2)}M`, color: 'text-[var(--text-primary)]' },
                  { label: 'Prompt Tokens', value: `${(detail.promptTokens30d / 1e6).toFixed(2)}M`, color: 'text-blue-400' },
                  { label: 'Completion Tokens', value: `${(detail.completionTokens30d / 1e6).toFixed(2)}M`, color: 'text-emerald-400' },
                  { label: 'Requests', value: detail.requests30d.toLocaleString(), color: 'text-[var(--text-primary)]' },
                  { label: 'Success Rate', value: `${((detail.successfulRequests30d / detail.requests30d) * 100).toFixed(1)}%`, color: detail.successfulRequests30d / detail.requests30d > 0.99 ? 'text-emerald-400' : 'text-amber-400' },
                  { label: 'E2E Latency', value: `${detail.avgE2eLatencyMs}ms`, color: detail.avgE2eLatencyMs > 1000 ? 'text-amber-400' : 'text-emerald-400' },
                  { label: 'Throttled', value: detail.throttledRequests30d.toLocaleString(), color: detail.throttledRequests30d > 2000 ? 'text-red-400' : 'text-[var(--text-primary)]' },
                  { label: 'Content Blocked', value: String(detail.contentFilterBlocked30d), color: detail.contentFilterBlocked30d > 200 ? 'text-amber-400' : 'text-[var(--text-primary)]' },
                ].map(m => (
                  <div key={m.label} className="rounded-lg border border-[var(--border)]/50 p-3">
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{m.label}</p>
                    <p className={`text-lg font-bold mt-0.5 ${m.color}`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts row 1: Tokens + Requests */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Daily Token Volume (14d)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={detail.dailyTokens}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickFormatter={v => `${(v / 1e6).toFixed(1)}M`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="prompt" name="Prompt" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                    <Area type="monotone" dataKey="completion" name="Completion" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Daily Requests & Throttling (14d)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={detail.dailyRequests}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="requests" name="Requests" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="throttled" name="Throttled" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="errors" name="Errors" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts row 2: Latency + capacity + safety */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">TTFT Latency Trend (14d)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={detail.dailyLatency}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickFormatter={v => `${v}ms`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="p50" name="P50" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="p99" name="P99" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Latency Percentiles</h3>
                <div className="space-y-4 mt-2">
                  {[
                    { label: 'TTFT P50', value: detail.ttft_p50Ms, max: detail.ttft_p99Ms * 1.1 },
                    { label: 'TTFT P90', value: detail.ttft_p90Ms, max: detail.ttft_p99Ms * 1.1 },
                    { label: 'TTFT P95', value: detail.ttft_p95Ms, max: detail.ttft_p99Ms * 1.1 },
                    { label: 'TTFT P99', value: detail.ttft_p99Ms, max: detail.ttft_p99Ms * 1.1 },
                    ...(detail.tbt_p50Ms > 0 ? [
                      { label: 'TBT P50', value: detail.tbt_p50Ms, max: detail.tbt_p99Ms * 1.1 },
                      { label: 'TBT P99', value: detail.tbt_p99Ms, max: detail.tbt_p99Ms * 1.1 },
                    ] : []),
                  ].map(p => (
                    <div key={p.label} className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text-tertiary)] w-16">{p.label}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(p.value / p.max) * 100}%`, backgroundColor: p.label.includes('P99') ? '#f87171' : p.label.includes('P95') ? '#f97316' : p.label.includes('P90') ? '#fbbf24' : '#34d399' }} />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)] w-20 text-right">{p.value.toLocaleString()}ms</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Content Safety</h3>
                {detail.contentFilterCategories.length > 0 ? (
                  <div className="space-y-3">
                    {detail.contentFilterCategories.sort((a, b) => b.count - a.count).map(c => (
                      <div key={c.category} className="flex items-center gap-3">
                        <span className="text-xs text-[var(--text-secondary)] w-20">{c.category}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full bg-red-400" style={{ width: `${(c.count / Math.max(...detail.contentFilterCategories.map(x => x.count))) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-red-400 w-10 text-right">{c.count}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-[var(--border)] flex justify-between">
                      <span className="text-xs text-[var(--text-tertiary)]">Total blocked</span>
                      <span className="text-xs font-bold text-red-400">{detail.contentFilterBlocked30d}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-tertiary)] mt-8 text-center">No content filter blocks</p>
                )}
              </div>
            </div>

            {/* Error breakdown + capacity */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Error Breakdown (30d)</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  {[
                    { label: 'HTTP 4xx', value: detail.http4xx30d, color: '#f97316' },
                    { label: 'HTTP 5xx', value: detail.http5xx30d, color: '#ef4444' },
                    { label: 'Timeouts', value: detail.timeouts30d, color: '#dc2626' },
                    { label: 'Throttled', value: detail.throttledRequests30d, color: '#fbbf24' },
                    { label: 'Rate Retries', value: detail.rateLimitRetries30d, color: '#f59e0b' },
                  ].map(e => (
                    <div key={e.label} className="rounded-lg border border-[var(--border)]/50 p-3 text-center">
                      <p className="text-2xl font-bold" style={{ color: e.color }}>{e.value.toLocaleString()}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{e.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Capacity & Throughput</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-[var(--text-tertiary)]">Avg Utilization</span><span className="font-bold text-[var(--text-primary)]">{detail.capacityUtilizationPct}%</span></div>
                    <UtilBar pct={detail.capacityUtilizationPct} peak={detail.peakUtilizationPct} />
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Peak: {detail.peakUtilizationPct}% &bull; Provisioned: {detail.provisionedCapacity} {detail.capacityUnit}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[var(--border)]/50 p-3"><p className="text-[10px] text-[var(--text-tertiary)]">Avg RPM</p><p className="text-lg font-bold text-[var(--text-primary)]">{detail.avgRpm}</p></div>
                    <div className="rounded-lg border border-[var(--border)]/50 p-3"><p className="text-[10px] text-[var(--text-tertiary)]">Peak RPM</p><p className="text-lg font-bold text-amber-400">{detail.peakRpm}</p></div>
                    <div className="rounded-lg border border-[var(--border)]/50 p-3"><p className="text-[10px] text-[var(--text-tertiary)]">Avg TPM</p><p className="text-lg font-bold text-[var(--text-primary)]">{detail.avgTpm.toLocaleString()}</p></div>
                    <div className="rounded-lg border border-[var(--border)]/50 p-3"><p className="text-[10px] text-[var(--text-tertiary)]">Peak TPM</p><p className="text-lg font-bold text-amber-400">{detail.peakTpm.toLocaleString()}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ PERFORMANCE TAB ============ */}
        {tab === 'performance' && (
          <div className="space-y-6">
            {/* TTFT comparison */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Time to First Token — All Deployments</h2>
              <p className="text-xs text-[var(--text-tertiary)] mb-6">P50, P90, P95, P99 in milliseconds (click bars for detail)</p>
              <ResponsiveContainer width="100%" height={Math.max(360, MODELS.length * 38)}>
                <BarChart data={MODELS.filter(m => m.modelFamily !== 'DALL-E').sort((a, b) => a.ttft_p50Ms - b.ttft_p50Ms)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickFormatter={v => `${v}ms`} />
                  <YAxis type="category" dataKey="deploymentName" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                  <Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ttft_p50Ms" name="P50" fill="#34d399" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="ttft_p90Ms" name="P90" fill="#fbbf24" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="ttft_p95Ms" name="P95" fill="#f97316" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="ttft_p99Ms" name="P99" fill="#ef4444" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* E2E latency vs tokens scatter */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">E2E Latency Comparison</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MODELS.sort((a, b) => b.avgE2eLatencyMs - a.avgE2eLatencyMs)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="deploymentName" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickFormatter={v => `${v}ms`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="avgE2eLatencyMs" name="Avg E2E Latency" radius={[4, 4, 0, 0]}>
                      {MODELS.sort((a, b) => b.avgE2eLatencyMs - a.avgE2eLatencyMs).map((m, i) => (
                        <Cell key={i} fill={MODEL_COLORS[m.modelFamily] || '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Time Between Tokens (TBT)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MODELS.filter(m => m.tbt_p50Ms > 0).sort((a, b) => b.tbt_p99Ms - a.tbt_p99Ms)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickFormatter={v => `${v}ms`} />
                    <YAxis type="category" dataKey="deploymentName" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                    <Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="tbt_p50Ms" name="TBT P50" fill="#34d399" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="tbt_p99Ms" name="TBT P99" fill="#f87171" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ============ THROUGHPUT TAB ============ */}
        {tab === 'throughput' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Total Tokens (30d)" value={`${(TOTAL_TOKENS / 1e6).toFixed(1)}M`} sub={`${(MODELS.reduce((s, m) => s + m.promptTokens30d, 0) / 1e6).toFixed(1)}M prompt`} color="from-blue-500/20 to-blue-600/5 border-blue-500/30" />
              <Stat label="Avg TPM" value={Math.round(MODELS.reduce((s, m) => s + m.avgTpm, 0)).toLocaleString()} sub="All deployments" color="from-purple-500/20 to-purple-600/5 border-purple-500/30" />
              <Stat label="Peak TPM" value={Math.max(...MODELS.map(m => m.peakTpm)).toLocaleString()} sub="Single deployment max" color="from-amber-500/20 to-amber-600/5 border-amber-500/30" />
              <Stat label="Avg Requests/min" value={Math.round(MODELS.reduce((s, m) => s + m.avgRpm, 0)).toLocaleString()} sub="All deployments" color="from-emerald-500/20 to-emerald-600/5 border-emerald-500/30" />
            </div>
            {/* Token volume by deployment */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Token Volume by Deployment (30d)</h2>
              <ResponsiveContainer width="100%" height={Math.max(360, MODELS.length * 34)}>
                <BarChart data={[...MODELS].sort((a, b) => b.totalTokens30d - a.totalTokens30d)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
                  <YAxis type="category" dataKey="deploymentName" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                  <Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="promptTokens30d" name="Prompt" stackId="tok" fill="#3b82f6" />
                  <Bar dataKey="completionTokens30d" name="Completion" stackId="tok" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Capacity utilization */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Capacity Utilization — Avg vs Peak</h2>
              <ResponsiveContainer width="100%" height={Math.max(300, MODELS.length * 32)}>
                <BarChart data={[...MODELS].sort((a, b) => b.capacityUtilizationPct - a.capacityUtilizationPct)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="deploymentName" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                  <Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="capacityUtilizationPct" name="Avg Utilization %" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="peakUtilizationPct" name="Peak Utilization %" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ============ COST TAB ============ */}
        {tab === 'cost' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Total Est. Cost (30d)" value={`$${TOTAL_COST.toFixed(0)}`} sub="All deployments" color="from-emerald-500/20 to-emerald-600/5 border-emerald-500/30" />
              <Stat label="Cost/Million Tokens" value={`$${(TOTAL_COST / (TOTAL_TOKENS / 1e6)).toFixed(2)}`} sub="Blended average" color="from-blue-500/20 to-blue-600/5 border-blue-500/30" />
              <Stat label="DALL-E 3 Spend" value={`$${MODELS.filter(m => m.modelFamily === 'DALL-E').reduce((s, m) => s + m.estimatedCost30d, 0).toFixed(0)}`} sub={`${((MODELS.filter(m => m.modelFamily === 'DALL-E').reduce((s, m) => s + m.estimatedCost30d, 0) / TOTAL_COST) * 100).toFixed(0)}% of total`} color="from-amber-500/20 to-amber-600/5 border-amber-500/30" />
              <Stat label="GPT-4o Spend" value={`$${MODELS.filter(m => m.modelFamily === 'GPT-4o').reduce((s, m) => s + m.estimatedCost30d, 0).toFixed(0)}`} sub={`${((MODELS.filter(m => m.modelFamily === 'GPT-4o').reduce((s, m) => s + m.estimatedCost30d, 0) / TOTAL_COST) * 100).toFixed(0)}% of total`} color="from-purple-500/20 to-purple-600/5 border-purple-500/30" />
            </div>
            {/* Cost by deployment */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Estimated 30-Day Cost by Deployment</h2>
              <ResponsiveContainer width="100%" height={Math.max(360, MODELS.length * 34)}>
                <BarChart data={[...MODELS].sort((a, b) => b.estimatedCost30d - a.estimatedCost30d)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="deploymentName" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={140} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="estimatedCost30d" name="Est. Cost ($)" radius={[0, 6, 6, 0]}>
                    {[...MODELS].sort((a, b) => b.estimatedCost30d - a.estimatedCost30d).map((m, i) => (
                      <Cell key={i} fill={MODEL_COLORS[m.modelFamily] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Cost by family pie + pricing table */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Cost by Model Family</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={families.map(f => ({ name: f, cost: +MODELS.filter(m => m.modelFamily === f).reduce((s, m) => s + m.estimatedCost30d, 0).toFixed(2) }))} dataKey="cost" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={50} paddingAngle={2} label={({ name, cost }) => `$${cost}`}>
                      {families.map(f => <Cell key={f} fill={MODEL_COLORS[f] || '#6b7280'} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">💡 Cost Optimization</h2>
                <div className="space-y-3">
                  {[
                    { title: 'DALL-E 3 dominates spend ($1,096 / 88%)', desc: 'patterns-dalle ($792) has 21% throttle rate — requests hitting 2 RPM cap. Consider caching generated images or batch processing.', severity: 'high' },
                    { title: 'Switch gpt4o-dev to GPT-4o-mini', desc: 'aifastfox gpt4o-dev costs $32.60/mo. If quality allows, GPT-4o-mini would cost ~$1.02 — saving $31.58/mo.', severity: 'high' },
                    { title: 'Right-size embed3-large capacity', desc: '200K TPM provisioned but only 11% utilized. Reduce to 100K to lower costs and free quota.', severity: 'medium' },
                    { title: 'diskmon-mini is heavily underutilized', desc: '30K TPM provisioned, 5% used. Consider reducing to 10K or sharing with another deployment.', severity: 'low' },
                  ].map(r => (
                    <div key={r.title} className="rounded-xl border border-[var(--border)] p-4">
                      <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${r.severity === 'high' ? 'bg-red-400' : r.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} /><h3 className="text-sm font-semibold text-[var(--text-primary)]">{r.title}</h3></div>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1 ml-4">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ HEALTH & SAFETY TAB ============ */}
        {tab === 'health' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Throttle Rate" value={`${((TOTAL_THROTTLED / TOTAL_REQUESTS) * 100).toFixed(1)}%`} sub={`${TOTAL_THROTTLED.toLocaleString()} of ${(TOTAL_REQUESTS / 1e3).toFixed(0)}K`} color="from-amber-500/20 to-amber-600/5 border-amber-500/30" />
              <Stat label="Error Rate" value={`${((TOTAL_ERRORS / TOTAL_REQUESTS) * 100).toFixed(2)}%`} sub={`${TOTAL_ERRORS.toLocaleString()} errors`} color="from-red-500/20 to-red-600/5 border-red-500/30" />
              <Stat label="Content Blocks" value={TOTAL_BLOCKED.toLocaleString()} sub={`${((TOTAL_BLOCKED / TOTAL_REQUESTS) * 100).toFixed(2)}% block rate`} color="from-purple-500/20 to-purple-600/5 border-purple-500/30" />
              <Stat label="Timeouts" value={MODELS.reduce((s, m) => s + m.timeouts30d, 0).toLocaleString()} sub="30 days" color="from-rose-500/20 to-rose-600/5 border-rose-500/30" />
            </div>
            {/* Throttling by deployment */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Throttled Requests by Deployment (30d)</h2>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={[...MODELS].sort((a, b) => b.throttledRequests30d - a.throttledRequests30d)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="deploymentName" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="throttledRequests30d" name="Throttled" radius={[4, 4, 0, 0]}>
                    {[...MODELS].sort((a, b) => b.throttledRequests30d - a.throttledRequests30d).map((m, i) => (
                      <Cell key={i} fill={m.throttledRequests30d > 2000 ? '#ef4444' : m.throttledRequests30d > 500 ? '#fbbf24' : '#34d399'} />
                    ))}
                  </Bar>
                  <Bar dataKey="rateLimitRetries30d" name="Rate Limit Retries" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Content safety aggregated + error breakdown */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Content Safety — Aggregated Categories</h2>
                {(() => {
                  const agg: Record<string, number> = {};
                  MODELS.forEach(m => m.contentFilterCategories.forEach(c => { agg[c.category] = (agg[c.category] || 0) + c.count; }));
                  const data = Object.entries(agg).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
                  return (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                        <YAxis type="category" dataKey="category" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={100} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Blocked" radius={[0, 6, 6, 0]}>
                          {data.map((_, i) => <Cell key={i} fill={['#ef4444', '#f97316', '#fbbf24', '#ec4899', '#dc2626', '#a855f7'][i % 6]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Error Breakdown by Deployment</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={[...MODELS].sort((a, b) => (b.http4xx30d + b.http5xx30d + b.timeouts30d) - (a.http4xx30d + a.http5xx30d + a.timeouts30d))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="deploymentName" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="http4xx30d" name="4xx" stackId="err" fill="#f97316" />
                    <Bar dataKey="http5xx30d" name="5xx" stackId="err" fill="#ef4444" />
                    <Bar dataKey="timeouts30d" name="Timeouts" stackId="err" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--text-tertiary)]">
        AI Models Catalog &bull; {TOTAL_MODELS} deployments &bull; {families.length} model families &bull;
        <Link href="/ai-foundry" className="text-purple-400 hover:underline ml-1">AI Foundry</Link>
        <span className="mx-2">&bull;</span>
        <Link href="/cognitive-services" className="text-blue-400 hover:underline">All Cognitive Services</Link>
      </footer>
    </div>
  );
}
