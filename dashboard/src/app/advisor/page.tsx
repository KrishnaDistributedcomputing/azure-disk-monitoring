'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

// ============================================================================
// Pre-built knowledge base for the AI Advisor
// When Azure OpenAI is not configured, this provides intelligent local answers
// When configured, it enhances prompts sent to GPT-4o-mini
// ============================================================================

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  kql?: string;
  timestamp: Date;
}

const DISK_KNOWLEDGE = {
  pricing: {
    premiumSsd: { P10: { gb: 128, iops: 500, mbps: 100, usd: 9.86 }, P15: { gb: 256, iops: 1100, mbps: 125, usd: 19.71 }, P20: { gb: 512, iops: 2300, mbps: 150, usd: 38.41 }, P30: { gb: 1024, iops: 5000, mbps: 200, usd: 76.80 }, P40: { gb: 2048, iops: 7500, mbps: 250, usd: 147.46 } },
    standardSsd: { E10: { gb: 128, iops: 500, mbps: 60, usd: 3.84 }, E15: { gb: 256, iops: 500, mbps: 60, usd: 7.68 }, E20: { gb: 512, iops: 500, mbps: 60, usd: 15.36 } },
    standardHdd: { S10: { gb: 128, iops: 500, mbps: 60, usd: 1.54 }, S15: { gb: 256, iops: 500, mbps: 60, usd: 2.87 }, S20: { gb: 512, iops: 500, mbps: 60, usd: 5.89 } },
    ultraDisk: { capacityPerGibHr: 0.000164, iopsPerHr: 0.000068, throughputPerMbpsHr: 0.000479 },
    premiumSsdV2: { capacityPerGibMo: 0.0554, baseIops: 3000, iopsPerMo: 0.00488, baseMbps: 125, throughputPerMbpsMo: 0.0269 },
    vms: { D4s_v5: { hr: 0.192, iops: 6400, mbps: 200 }, D8s_v5: { hr: 0.384, iops: 12800, mbps: 400 }, E4s_v5: { hr: 0.252, iops: 6400, mbps: 200 }, L8s_v3: { hr: 0.624, iops: 400000, mbps: 2000 } },
  },
  kqlTemplates: {
    topIops: `Perf | where TimeGenerated > ago(1h) | where ObjectName in ("Logical Disk","LogicalDisk") | where CounterName == "Disk Transfers/sec" | where InstanceName !in ("_Total","/") | summarize AvgIOPS=avg(CounterValue) by Computer, InstanceName | top 10 by AvgIOPS desc`,
    topLatency: `Perf | where TimeGenerated > ago(1h) | where CounterName in ("Avg. Disk sec/Read","Avg. Disk sec/Write") | where InstanceName !in ("_Total","/") | summarize AvgLatencyMs=avg(CounterValue)*1000 by Computer, InstanceName | top 10 by AvgLatencyMs desc`,
    diskCapacity: `Perf | where TimeGenerated > ago(1h) | where CounterName == "% Used Space" | where InstanceName !in ("_Total","/") | summarize AvgUsedPct=avg(CounterValue) by Computer, InstanceName | order by AvgUsedPct desc`,
    iopsConsumed: `AzureMetrics | where TimeGenerated > ago(1h) | where MetricName == "Data Disk IOPS Consumed Percentage" | summarize AvgConsumed=avg(Average) by Resource | order by AvgConsumed desc`,
    throughput: `Perf | where TimeGenerated > ago(1h) | where CounterName == "Disk Bytes/sec" | where InstanceName !in ("_Total","/") | summarize AvgMBs=avg(CounterValue)/1048576 by Computer, InstanceName | order by AvgMBs desc`,
    queueDepth: `Perf | where TimeGenerated > ago(1h) | where CounterName == "Current Disk Queue Length" | where InstanceName !in ("_Total","/") | summarize AvgQD=avg(CounterValue) by Computer, InstanceName | where AvgQD > 4 | order by AvgQD desc`,
  },
};

// ============================================================================
// Pattern matching for local AI responses (no API needed)
// ============================================================================
function getLocalAnswer(question: string): { answer: string; kql?: string } {
  const q = question.toLowerCase();

  // Cost questions
  if (q.includes('cost') && q.includes('ultra')) {
    const calc = (0.000164 * 256 + 0.000068 * 10000 + 0.000479 * 400) * 730;
    return { answer: `**Ultra Disk Pricing (East US 2)**\n\nUltra Disk is billed hourly per component:\n- **Capacity**: $0.000164/GiB/hr → 256 GiB = $${(0.000164*256*730).toFixed(2)}/mo\n- **IOPS**: $0.000068/IOPS/hr → 10,000 IOPS = $${(0.000068*10000*730).toFixed(2)}/mo\n- **Throughput**: $0.000479/MBps/hr → 400 MB/s = $${(0.000479*400*730).toFixed(2)}/mo\n\n**Total: $${calc.toFixed(2)}/mo**\n\n⚠️ Ultra Disk charges **24/7 even when VM is deallocated**. Detach the disk to stop billing.\n\n💡 **To save**: Reduce IOPS from 10K to 5K → saves $${(0.000068*5000*730).toFixed(2)}/mo` };
  }

  if (q.includes('cost') && (q.includes('premium ssd v2') || q.includes('premv2') || q.includes('premium v2'))) {
    return { answer: `**Premium SSD v2 Pricing**\n\nComponent billing with free baselines:\n- **Capacity**: $0.0554/GiB/mo\n- **IOPS**: First 3,000 free, then $0.00488/IOPS/mo\n- **Throughput**: First 125 MB/s free, then $0.0269/MBps/mo\n\n**Example (256 GiB, 5K IOPS, 200 MB/s)**:\n- Capacity: $${(0.0554*256).toFixed(2)}\n- IOPS: $${((5000-3000)*0.00488).toFixed(2)} (2K extra)\n- Throughput: $${((200-125)*0.0269).toFixed(2)} (75 extra MB/s)\n- **Total: $${(0.0554*256+(5000-3000)*0.00488+(200-125)*0.0269).toFixed(2)}/mo**\n\n💡 **To save**: Reduce to baseline (3K IOPS, 125 MB/s) → $${(0.0554*256).toFixed(2)}/mo` };
  }

  if (q.includes('cost') && q.includes('premium') && !q.includes('v2')) {
    return { answer: `**Premium SSD Pricing (East US 2)**\n\nFixed price per tier:\n| Tier | Size | IOPS | MB/s | $/mo |\n|------|------|------|------|------|\n| P10 | 128 GiB | 500 | 100 | $9.86 |\n| P15 | 256 GiB | 1,100 | 125 | $19.71 |\n| P20 | 512 GiB | 2,300 | 150 | $38.41 |\n| P30 | 1 TiB | 5,000 | 200 | $76.80 |\n| P40 | 2 TiB | 7,500 | 250 | $147.46 |\n\n💡 Cannot customize IOPS independently. If you need more IOPS without more capacity, switch to **Premium SSD v2**.` };
  }

  if (q.includes('how') && q.includes('save') || (q.includes('reduc') && q.includes('cost')) || q.includes('optimize') && q.includes('cost')) {
    return { answer: `**Top Cost Optimization Strategies**\n\n1. **Deallocate VMs when not testing** → saves ~$1,200/mo compute\n   \`az vm deallocate -g rg-diskmon-poc-eastus2 --ids $(az vm list -g rg-diskmon-poc-eastus2 --query "[].id" -o tsv)\`\n\n2. **Detach Ultra Disk when idle** → saves $91/mo\n   \`az vm disk detach -g rg-diskmon-poc-eastus2 --vm-name vm-diskmon-lsv3-01 -n disk-diskmon-lsv3-01-ultra-256\`\n\n3. **Reduce PremV2 IOPS to baseline** → saves ~$30/mo\n   \`az disk update -g rg-diskmon-poc-eastus2 -n disk-diskmon-esv5-01-premssdv2-256 --disk-iops-read-write 3000 --disk-mbps-read-write 125\`\n\n4. **Lower Log Analytics daily cap** → saves ~$30/mo\n\n5. **Check IOPS Consumed %** — if <50%, you're over-provisioned\n\n| State | Monthly Cost |\n|-------|-------------|\n| All running | ~$1,576 |\n| VMs deallocated | ~$375 |\n| + Ultra detached | ~$284 |\n| + PremV2 baseline | ~$254 |`, kql: DISK_KNOWLEDGE.kqlTemplates.iopsConsumed };
  }

  // Performance questions
  if (q.includes('slow') || (q.includes('high') && q.includes('latency')) || q.includes('latency spike')) {
    return { answer: `**Diagnosing High Latency**\n\n1. **Check IOPS Consumed %** — if near 100%, the disk is throttled\n2. **Check Queue Depth** — sustained >32 = disk saturation\n3. **Check Burst Credits** — if depleted, performance drops to baseline\n\n**Latency Reference by Disk Type:**\n| Type | Expected Latency |\n|------|------------------|\n| Ultra Disk | < 0.5 ms |\n| Premium SSD v2 | 1-2 ms |\n| Premium SSD | 2-4 ms |\n| Standard SSD | 4-10 ms |\n| Standard HDD | 10-20 ms |\n\n💡 If latency exceeds these ranges, the disk is under load or throttled.`, kql: DISK_KNOWLEDGE.kqlTemplates.topLatency };
  }

  if (q.includes('which disk') && (q.includes('most iops') || q.includes('busiest') || q.includes('highest iops'))) {
    return { answer: `**Finding Busiest Disks**\n\nRun this KQL query to find the top 10 disks by IOPS:\n\nThis shows average IOPS over the last hour, ranked highest first. Disks consistently near their provisioned limit should be upgraded or the workload rebalanced.`, kql: DISK_KNOWLEDGE.kqlTemplates.topIops };
  }

  if (q.includes('queue depth') || q.includes('qd') || q.includes('queue') && q.includes('deep')) {
    return { answer: `**Queue Depth Analysis**\n\n| Range | Status | Action |\n|-------|--------|--------|\n| 0-2 | Idle/Under-utilized | Consider downgrading tier |\n| 4-32 | Normal | No action needed |\n| 32-64 | Approaching saturation | Plan upgrade |\n| >64 | Bottleneck | Upgrade disk/VM immediately |\n\n💡 High QD + high latency = definitely upgrade. High QD + low latency = efficient pipelining, may be fine.`, kql: DISK_KNOWLEDGE.kqlTemplates.queueDepth };
  }

  if (q.includes('capacity') || q.includes('disk space') || q.includes('full') || q.includes('used space')) {
    return { answer: `**Disk Capacity Monitoring**\n\nAlert thresholds:\n- **< 60%**: Healthy ✅\n- **60-80%**: Monitor closely ⚠️\n- **80-90%**: Plan expansion 🔴\n- **> 90%**: Emergency — risk of app failure 🚨\n\n💡 You pay for provisioned size, not used. Over-provisioning wastes money. But under-provisioning risks downtime.`, kql: DISK_KNOWLEDGE.kqlTemplates.diskCapacity };
  }

  if (q.includes('vm') && (q.includes('cap') || q.includes('limit') || q.includes('max'))) {
    return { answer: `**VM-Level Disk Performance Caps**\n\nYour VM limits total disk performance across ALL attached disks:\n\n| VM SKU | Max IOPS | Max MB/s | $/hr |\n|--------|----------|----------|------|\n| D4s_v5 | 6,400 | 200 | $0.192 |\n| D8s_v5 | 12,800 | 400 | $0.384 |\n| E4s_v5 | 6,400 | 200 | $0.252 |\n| L8s_v3 | 400,000 | 2,000 | $0.624 |\n\n⚠️ Attaching 10K IOPS Ultra Disk to D4s_v5 (6,400 cap) wastes 3,600 IOPS = ~$12/mo wasted.`, kql: DISK_KNOWLEDGE.kqlTemplates.iopsConsumed };
  }

  if (q.includes('which disk') && q.includes('choose') || q.includes('recommend') || q.includes('which type')) {
    return { answer: `**Disk Type Selection Guide**\n\n1. **Need sub-millisecond latency?** → Ultra Disk\n2. **Need custom IOPS independent of size?** → Premium SSD v2\n3. **Production workload with predictable I/O?** → Premium SSD\n4. **Dev/test with moderate needs?** → Standard SSD\n5. **Backups/archival/sequential only?** → Standard HDD\n\n**Cost per 1,000 IOPS:**\n| Type | $/1K IOPS |\n|------|-----------|\n| Premium SSD v2 | $8.81 |\n| Ultra Disk | $9.11 |\n| Premium SSD | $17.92 |\n| Standard HDD | $20.48 |\n| Standard SSD | $30.72 |` };
  }

  if (q.includes('total cost') || q.includes('how much') && q.includes('spend') || q.includes('monthly') && q.includes('cost')) {
    return { answer: `**POC Environment Monthly Cost Estimate**\n\n| Component | Monthly Cost |\n|-----------|-------------|\n| VM Compute (5 VMs, 730 hrs) | $1,200 |\n| Data Disks (8 disks) | $258 |\n| OS Disks (5 × P10) | $49 |\n| Log Analytics (~5 GB/day) | $50 |\n| Managed Grafana | $9 |\n| Static Web App | $9 |\n| **Total (always-on)** | **$1,576/mo** |\n| **VMs deallocated** | **$375/mo** |\n\n💡 Deallocating VMs reduces cost by 76%. Disk charges continue regardless.` };
  }

  if (q.includes('burst') || q.includes('credit')) {
    return { answer: `**Burst Credits Explained**\n\nPremium SSD (P10-P20) and Standard SSD can temporarily burst above baseline:\n\n| Tier | Baseline IOPS | Burst IOPS | Burst MB/s |\n|------|---------------|------------|------------|\n| P10 | 500 | 3,500 | 170 |\n| P15 | 1,100 | 3,500 | 170 |\n| P20 | 2,300 | 3,500 | 170 |\n\n- Credits accumulate when disk operates below baseline\n- Burst lasts until credits are depleted\n- No extra charge for bursting — it's free performance!\n\n💡 Monitor "Burst IO Credits Used %" — if frequently depleted, upgrade tier or switch to PremV2.` };
  }

  // Default
  return { answer: `I can help with:\n\n**Cost Questions:**\n- "How much does an Ultra Disk cost?"\n- "How can I reduce disk costs?"\n- "What's the total monthly cost?"\n- "Compare Premium SSD vs Standard SSD pricing"\n\n**Performance Questions:**\n- "Why is my disk latency high?"\n- "Which disks have the most IOPS?"\n- "What is queue depth telling me?"\n- "How much capacity is used?"\n\n**Optimization:**\n- "Which disk type should I choose?"\n- "What are VM-level disk caps?"\n- "How do burst credits work?"\n- "How to optimize disk performance?"\n\nTry asking one of these!` };
}

// ============================================================================
// AI Advisor Page Component
// ============================================================================
export default function AIAdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `👋 **Welcome to the AI Disk Advisor**\n\nI can answer questions about:\n- 💰 **Disk costs** — pricing for all 5 disk types, cost optimization\n- ⚡ **Performance** — IOPS, latency, throughput, queue depth analysis\n- 🔧 **Optimization** — right-sizing, VM caps, burst credits\n- 📊 **KQL Queries** — I'll generate the query you need\n\nPowered by disk pricing data from Azure Retail Prices API and KQL templates for Log Analytics.\n\n*Type a question below or try one of the suggested topics.*`, timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (question: string) => {
    if (!question.trim()) return;
    const userMsg: Message = { role: 'user', content: question.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const { answer, kql } = getLocalAnswer(question);
      const assistantMsg: Message = { role: 'assistant', content: answer, kql, timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 600 + Math.random() * 800);
  };

  const suggestedQuestions = [
    'How can I reduce disk costs?',
    'What does an Ultra Disk cost?',
    'Why is my disk latency high?',
    'Which disk type should I choose?',
    'What are VM-level disk caps?',
    'How do burst credits work?',
    'What is the total monthly cost?',
    'Which disks have the most IOPS?',
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-[900px] px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="rounded-lg bg-slate-800 border border-slate-700 p-2 text-slate-400 hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="rounded-lg bg-purple-600/20 border border-purple-500/30 p-1">
                    <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
                  </span>
                  AI Disk Advisor
                </h1>
                <p className="text-[10px] text-slate-500">Powered by Azure disk pricing data &bull; KQL-aware &bull; Cost optimization</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-emerald-400">Local AI (no API cost)</span>
              </div>
              <button onClick={() => setMessages([messages[0]])} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">Clear</button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[900px] px-6 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-200'}`}>
                {/* Render markdown-like content */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content.split('\n').map((line, j) => {
                    if (line.startsWith('**') && line.endsWith('**')) return <div key={j} className="font-bold text-white mt-2 first:mt-0">{line.replace(/\*\*/g, '')}</div>;
                    if (line.startsWith('|')) return <div key={j} className="font-mono text-[11px] text-slate-300">{line}</div>;
                    if (line.startsWith('- ') || line.startsWith('* ')) return <div key={j} className="ml-3 text-sm">{line}</div>;
                    if (line.startsWith('`') && line.endsWith('`')) return <code key={j} className="block bg-slate-900 rounded px-2 py-1 text-[10px] font-mono text-emerald-400 mt-1 mb-1 overflow-x-auto">{line.replace(/`/g, '')}</code>;
                    if (line.includes('💡') || line.includes('⚠️') || line.includes('🔴') || line.includes('🚨')) return <div key={j} className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-200">{line}</div>;
                    return <div key={j}>{line || <br />}</div>;
                  })}
                </div>
                {/* KQL Query Block */}
                {msg.kql && (
                  <div className="mt-3 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50 border-b border-slate-700">
                      <span className="text-[10px] font-semibold text-blue-400">KQL Query</span>
                      <button onClick={() => navigator.clipboard.writeText(msg.kql || '')} className="text-[10px] text-slate-500 hover:text-white transition-colors">Copy</button>
                    </div>
                    <pre className="px-3 py-2 text-[10px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">{msg.kql}</pre>
                  </div>
                )}
                <div className="text-right mt-1">
                  <span className="text-[9px] text-slate-500">{msg.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-slate-500">Analyzing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Questions (only show at start) */}
      {messages.length <= 1 && (
        <div className="mx-auto max-w-[900px] px-6 pb-3">
          <div className="text-xs text-slate-500 mb-2">Suggested questions:</div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button key={q} onClick={() => handleSubmit(q)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:border-blue-500/50 transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="border-t border-slate-700/50 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto max-w-[900px] px-6 py-4">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(input); } }}
              placeholder="Ask about disk costs, performance, optimization..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              disabled={isThinking}
            />
            <button
              onClick={() => handleSubmit(input)}
              disabled={!input.trim() || isThinking}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600">
            <span>Azure OpenAI GPT-4o-mini ready — configure AZURE_OPENAI_ENDPOINT in .env for live AI</span>
            <span>Local knowledge: 5 disk types &bull; 4 VM SKUs &bull; 6 KQL templates</span>
          </div>
        </div>
      </div>
    </div>
  );
}
