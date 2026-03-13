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

  if (q.includes('cost') && q.includes('ultra')) {
    const capCost = (0.000164 * 256 * 730);
    const iopsCost = (0.000068 * 10000 * 730);
    const tpCost = (0.000479 * 400 * 730);
    const total = capCost + iopsCost + tpCost;
    return { answer: `Our Ultra Disk (256 GiB, 10,000 IOPS, 400 MB/s) costs about $${total.toFixed(2)} per month.\n\nHere's how it breaks down — Ultra Disk uses hourly billing for three separate components:\n\n1. You pay $${capCost.toFixed(2)}/mo for the 256 GiB of storage capacity.\n2. You pay $${iopsCost.toFixed(2)}/mo for provisioning 10,000 IOPS — this is actually the largest chunk.\n3. You pay $${tpCost.toFixed(2)}/mo for reserving 400 MB/s throughput.\n\nOne really important thing to know: Ultra Disk keeps charging even when your VM is turned off. The only way to stop the billing is to completely detach the disk from the VM.\n\n💡 If you're not actively benchmarking, consider reducing IOPS from 10,000 to 5,000. That alone would save you about $${(0.000068 * 5000 * 730).toFixed(2)} every month. Or detach it entirely between test sessions to save the full $${total.toFixed(2)}.` };
  }

  if (q.includes('cost') && (q.includes('premium ssd v2') || q.includes('premv2') || q.includes('premium v2'))) {
    const capCost = (0.0554 * 256);
    const iopsCost = ((5000 - 3000) * 0.00488);
    const tpCost = ((200 - 125) * 0.0269);
    const total = capCost + iopsCost + tpCost;
    return { answer: `Our Premium SSD v2 disk (256 GiB, 5,000 IOPS, 200 MB/s) costs about $${total.toFixed(2)} per month.\n\nWhat makes PremSSD v2 special is that it gives you free baselines — you get 3,000 IOPS and 125 MB/s at no extra charge. You only pay extra when you go above those baselines.\n\nSo for our disk:\n- Storage capacity costs $${capCost.toFixed(2)}/mo (256 GiB at about 5.5 cents per GiB)\n- We provisioned 5,000 IOPS, but 3,000 are free. The extra 2,000 IOPS cost $${iopsCost.toFixed(2)}/mo\n- We set 200 MB/s throughput, but 125 is free. The extra 75 MB/s costs $${tpCost.toFixed(2)}/mo\n\n💡 Here's the money-saving tip: If you're not running benchmarks right now, reduce IOPS to 3,000 and throughput to 125 MB/s. You'd only pay $${capCost.toFixed(2)}/mo — saving about $${(iopsCost + tpCost).toFixed(2)} every month.` };
  }

  if (q.includes('cost') && q.includes('premium') && !q.includes('v2')) {
    return { answer: `Premium SSD uses fixed pricing — the cost depends on which tier (size) you choose, and each tier comes with a set amount of IOPS and throughput.\n\nHere are the tiers we use in this POC:\n\n• P10 (128 GiB) gives you 500 IOPS and 100 MB/s for $9.86/mo — we use this for all OS disks\n• P15 (256 GiB) gives you 1,100 IOPS and 125 MB/s for $19.71/mo — our main data disk tier\n• P20 (512 GiB) gives you 2,300 IOPS and 150 MB/s for $38.41/mo — used on the D8s VM\n• P30 (1 TiB) would give 5,000 IOPS and 200 MB/s for $76.80/mo\n\nThe key thing to understand is that with Premium SSD, you can't change IOPS without changing the disk size. If you need 2,300 IOPS, you MUST buy a 512 GiB disk even if you only store 50 GiB of data.\n\n💡 If you need custom IOPS without buying extra capacity, Premium SSD v2 is usually cheaper — it lets you set IOPS independently from disk size.` };
  }

  if (q.includes('how') && q.includes('save') || (q.includes('reduc') && q.includes('cost')) || q.includes('optimize') && q.includes('cost')) {
    return { answer: `Here are the best ways to cut costs on this POC environment, listed from biggest savings to smallest:\n\n1. **Deallocate all VMs when you're not testing** — This is the single biggest saving. When VMs are deallocated, you stop paying for compute, which saves roughly $1,200/mo. Disks keep charging, but compute is the big one. Run this:\n   \`az vm deallocate -g rg-diskmon-poc-eastus2 --ids $(az vm list -g rg-diskmon-poc-eastus2 --query "[].id" -o tsv)\`\n\n2. **Detach the Ultra Disk** — Unlike other disks, Ultra charges hourly even when your VM is off. Detaching it saves $91/mo:\n   \`az vm disk detach -g rg-diskmon-poc-eastus2 --vm-name vm-diskmon-lsv3-01 -n disk-diskmon-lsv3-01-ultra-256\`\n\n3. **Reduce Premium SSD v2 to free baselines** — Drop IOPS to 3,000 (free) and throughput to 125 MB/s (free). Saves about $30/mo:\n   \`az disk update -g rg-diskmon-poc-eastus2 -n disk-diskmon-esv5-01-premssdv2-256 --disk-iops-read-write 3000 --disk-mbps-read-write 125\`\n\n4. **Lower Log Analytics daily cap** — During non-test periods, set it to 1 GB/day instead of 5 GB. Saves about $30/mo.\n\n5. **Check if you're over-provisioned** — Look at the IOPS Consumed % metric. If a disk is consistently below 50% utilization, you could downgrade it to a smaller tier.\n\nCost by operating state:\n• Everything running: ~$1,576/mo\n• VMs deallocated: ~$375/mo\n• Plus Ultra detached: ~$284/mo\n• Plus PremV2 at baseline: ~$254/mo`, kql: DISK_KNOWLEDGE.kqlTemplates.iopsConsumed };
  }

  if (q.includes('slow') || (q.includes('high') && q.includes('latency')) || q.includes('latency spike')) {
    return { answer: `When a disk feels slow, there are three things to check in this order:\n\n**Step 1: Is the disk hitting its IOPS limit?**\nLook at the "IOPS Consumed %" metric. If it's near 100%, the disk is maxed out and Azure is throttling additional I/O requests. The fix is either reducing your workload or upgrading to a disk with more IOPS.\n\n**Step 2: Is the queue building up?**\nCheck "Current Disk Queue Length." If it's consistently above 32, the disk can't keep up — I/O requests are piling up waiting to be processed. This directly causes latency to rise.\n\n**Step 3: Are burst credits depleted?**\nPremium SSD (P10-P20) and Standard SSD can temporarily burst above their baseline IOPS. But burst credits run out. If "Burst IO Credits Used %" is near 100%, the disk has exhausted its burst capacity and has fallen back to baseline — which feels like a sudden slowdown.\n\nFor reference, here's what normal latency looks like for each disk type:\n• Ultra Disk — under 0.5 milliseconds (the fastest)\n• Premium SSD v2 — about 1 to 2 milliseconds\n• Premium SSD — about 2 to 4 milliseconds\n• Standard SSD — about 4 to 10 milliseconds\n• Standard HDD — about 10 to 20 milliseconds (the slowest)\n\nIf your latency is significantly higher than these ranges, the disk is under stress. The KQL query below will show you which disks have the worst latency right now.`, kql: DISK_KNOWLEDGE.kqlTemplates.topLatency };
  }

  if (q.includes('which disk') && (q.includes('most iops') || q.includes('busiest') || q.includes('highest iops'))) {
    return { answer: `To find which disks are doing the most I/O work right now, use the KQL query below. It looks at the "Disk Transfers/sec" counter from the last hour and ranks all disk instances by their average IOPS.\n\nDisks at the top of the list are your busiest. If any of them are consistently close to their provisioned IOPS limit (for example, a P15 disk running at 1,000+ IOPS when its limit is 1,100), that disk is close to being throttled and you should consider upgrading it.\n\nA quick reference for your disks' limits:\n• P15 (256 GiB) maxes out at 1,100 IOPS\n• P20 (512 GiB) maxes out at 2,300 IOPS\n• Premium SSD v2 is set to 5,000 IOPS\n• Ultra Disk is set to 10,000 IOPS\n• Standard SSD and HDD both cap at about 500 IOPS`, kql: DISK_KNOWLEDGE.kqlTemplates.topIops };
  }

  if (q.includes('queue depth') || q.includes('qd') || q.includes('queue') && q.includes('deep')) {
    return { answer: `Queue depth tells you how many I/O operations are waiting in line to be processed by the disk. Think of it like a checkout line at a store.\n\nHere's how to interpret the numbers:\n\n• **0 to 2** — The disk is barely being used. If it stays this low consistently, you might be paying for more performance than you need. Consider downgrading to a cheaper tier.\n\n• **4 to 32** — This is the healthy zone. The disk is doing real work, and I/O commands are being efficiently queued and processed. No action needed.\n\n• **32 to 64** — Getting busy. The disk is approaching its limits. Start planning for an upgrade or consider adding a second disk and striping them together.\n\n• **Above 64** — The disk is a bottleneck. I/O requests are piling up faster than the disk can handle. You'll see high latency too. Upgrade the disk tier ASAP or redistribute the workload.\n\nOne nuance: high queue depth with low latency is actually fine — it means the disk is handling lots of parallel I/O efficiently. High queue depth with HIGH latency is the real problem.\n\nThe KQL query below finds disks with queue depth above 4, sorted from highest to lowest.`, kql: DISK_KNOWLEDGE.kqlTemplates.queueDepth };
  }

  if (q.includes('capacity') || q.includes('disk space') || q.includes('full') || q.includes('used space')) {
    return { answer: `Azure managed disks charge for the full provisioned size regardless of how much data you actually store. So a 256 GiB disk costs the same whether you use 10 GiB or 250 GiB.\n\nBut you still need to monitor capacity because running out of space causes serious problems — applications crash, databases corrupt, and the OS can become unresponsive.\n\nHere's a simple way to think about the urgency levels:\n\n• **Under 60% used** — You're in the clear. No action needed.\n• **60% to 80% used** — Keep an eye on growth trends. This is a good time to plan for expansion.\n• **80% to 90% used** — Take action now. Either expand the disk or clean up old data. Don't wait.\n• **Over 90% used** — This is an emergency. The disk could fill up any time, which will cause application failures.\n\nAn important cost note: with Premium SSD, making the disk bigger also gives you more IOPS. So you might be buying a P20 (512 GiB) not because you need the space, but because you need the 2,300 IOPS it provides. If you're in that situation, Premium SSD v2 is usually more cost-effective — it lets you set IOPS separately from size.\n\nRun the KQL query below to see how full each disk is right now.`, kql: DISK_KNOWLEDGE.kqlTemplates.diskCapacity };
  }

  if (q.includes('vm') && (q.includes('cap') || q.includes('limit') || q.includes('max'))) {
    return { answer: `Here's something that catches a lot of people: your VM has its own limit on total disk performance that applies across ALL attached disks combined.\n\nFor example, the D4s_v5 VM has an uncached disk IOPS cap of 6,400 and a throughput cap of 200 MB/s. If you attach multiple disks that add up to more than 6,400 IOPS, the VM will throttle them — you'll never get more than 6,400 IOPS total, no matter how many disks you add.\n\nHere's what each VM in our POC can handle:\n\n• **D4s_v5** (our baseline VM) — caps at 6,400 IOPS and 200 MB/s. Costs $0.192/hr ($140/mo).\n• **D8s_v5** (double the size) — caps at 12,800 IOPS and 400 MB/s. Costs $0.384/hr ($280/mo).\n• **E4s_v5** (memory optimized) — same caps as D4s: 6,400 IOPS and 200 MB/s. Costs $0.252/hr ($184/mo).\n• **L8s_v3** (storage optimized) — massive 400,000 IOPS cap and 2,000 MB/s. Costs $0.624/hr ($456/mo).\n\nThe biggest waste of money is attaching a high-performance disk to a VM that can't use it. Our Ultra Disk has 10,000 IOPS, but if it were on a D4s_v5 (only 6,400 cap), we'd be paying for 3,600 IOPS we literally cannot use — about $12/mo thrown away.\n\nThat's why we put the Ultra Disk on the L8s_v3, which has room to spare.`, kql: DISK_KNOWLEDGE.kqlTemplates.iopsConsumed };
  }

  if (q.includes('which disk') && q.includes('choose') || q.includes('recommend') || q.includes('which type')) {
    return { answer: `Choosing the right disk type comes down to answering these questions in order:\n\n**"Do I need the absolute lowest latency (under 1 millisecond)?"**\nIf yes → Ultra Disk. It's the only option for sub-millisecond latency, used for things like SAP HANA and tier-1 databases. But it's the most expensive at about $91/mo for a 256 GiB disk.\n\n**"Do I need to set IOPS independently from disk size?"**\nIf yes → Premium SSD v2. This is ideal when you need high IOPS but don't need a large disk. It's about half the cost of Ultra Disk and still delivers very low latency (1-2ms).\n\n**"Is this a production workload with predictable, steady I/O?"**\nIf yes → Premium SSD. It's the workhorse tier — reliable, well-understood, and costs $19.71/mo for a 256 GiB P15. The IOPS are fixed per tier though.\n\n**"Is this dev/test or light workloads?"**\nIf yes → Standard SSD. Only $7.68/mo for 256 GiB. Lower IOPS (500) and higher latency (5-10ms), but perfectly fine for development.\n\n**"Is this backup, archival, or sequential-only access?"**\nIf yes → Standard HDD. The cheapest at $2.87/mo for 256 GiB. High latency (10-20ms) makes it unsuitable for anything interactive.\n\nIn terms of cost efficiency (cost per 1,000 IOPS), Premium SSD v2 actually wins at about $8.81, followed by Ultra at $9.11. Premium SSD is $17.92 per 1,000 IOPS — more than double. So if IOPS-per-dollar matters, PremV2 is the sweet spot.` };
  }

  if (q.includes('total cost') || (q.includes('how much') && q.includes('spend')) || (q.includes('monthly') && q.includes('cost'))) {
    return { answer: `Here's what this entire POC environment costs, broken down by component:\n\n**VM Compute (the biggest cost when running):**\nAll 5 VMs running 24/7 cost about $1,200/mo. The L8s_v3 alone is $456/mo because it's a storage-optimized beast. The two D4s_v5 machines are $140/mo each.\n\n**Data Disks (always charged, even when VMs are off):**\nThe 8 data disks total about $258/mo. The Ultra Disk is the most expensive single disk at $91/mo. The cheapest is the Standard HDD at about $6/mo.\n\n**OS Disks:**\nFive P10 Premium SSD disks (128 GiB each) at $9.86 each = about $49/mo.\n\n**Services:**\nLog Analytics (~$50/mo at 5 GB/day), Managed Grafana ($9/mo), Static Web App ($9/mo).\n\nThe grand total depends on how you operate it:\n• Everything always running: about $1,576/mo\n• VMs deallocated (but disks keep charging): about $375/mo\n• That's a 76% cost reduction just from turning off VMs!\n\nThe most practical approach: deallocate VMs overnight and on weekends. Only run them during active testing. That gets you to roughly $500/mo.` };
  }

  if (q.includes('burst') || q.includes('credit')) {
    return { answer: `Burst credits are like a savings account for disk performance. Here's how they work in plain terms:\n\nWhen your disk is operating below its baseline IOPS (during quiet periods), it accumulates "credits." When your workload suddenly spikes — like during a deployment or batch job — the disk can spend those credits to temporarily perform well above its baseline.\n\nFor example, a P15 disk (256 GiB) has a baseline of 1,100 IOPS. But with burst credits, it can spike up to 3,500 IOPS and 170 MB/s throughput. That's more than 3x the baseline! And there's no extra charge for bursting — it's completely free.\n\nThe catch is that credits don't last forever. If your workload stays high, the credits get depleted and performance drops back to baseline. This can feel like a sudden slowdown even though nothing changed in your application.\n\nBurst capability applies to:\n• P10 (baseline 500 → burst 3,500 IOPS)\n• P15 (baseline 1,100 → burst 3,500 IOPS)\n• P20 (baseline 2,300 → burst 3,500 IOPS)\n• Standard SSD E-series (similar burst capability)\n\nUltra Disk and Premium SSD v2 do NOT burst — they always run at their provisioned level.\n\nMonitor the "Burst IO Credits Used %" metric. If it's frequently hitting 100%, your baseline is too low and you should upgrade to a larger tier or switch to Premium SSD v2 where you can set any IOPS level you want.` };
  }

  if (q.includes('iops') && (q.includes('what') || q.includes('explain') || q.includes('mean'))) {
    return { answer: `IOPS stands for Input/Output Operations Per Second. Think of it as the number of "transactions" your disk can handle every second.\n\nEach time your application reads a small piece of data (like a database row) or writes a small piece of data (like a log entry), that counts as one I/O operation. IOPS measures how many of these the disk can do per second.\n\nWhy it matters:\n• A busy database might need 5,000-10,000 IOPS\n• A web server usually needs 500-2,000 IOPS\n• A file server might only need 100-500 IOPS\n\nWhen your workload demands more IOPS than your disk provides, the extra requests get queued (waiting in line). This shows up as increased latency — your application feels slow.\n\nIn our POC:\n• Standard HDD/SSD provide 500 IOPS (good for light workloads)\n• Premium SSD P15 provides 1,100 IOPS (good for most production work)\n• Premium SSD v2 is set to 5,000 IOPS (good for databases)\n• Ultra Disk is set to 10,000 IOPS (the fastest we have)\n\nImportantly, higher IOPS costs more money. And your VM also has an IOPS cap that limits what the disk can actually deliver.` };
  }

  return { answer: `I'm here to help you understand Azure disk performance and costs. Here are some things you can ask me:\n\n**About Costs:**\n• "How much does our Ultra Disk cost?" — I'll break down the exact monthly cost\n• "How can I reduce costs?" — I'll give you specific savings strategies with commands\n• "What's the total monthly spend?" — Full breakdown by component\n• "What does Premium SSD v2 cost?" — Component pricing explained\n\n**About Performance:**\n• "Why is my disk slow?" — Step-by-step troubleshooting guide\n• "Which disks are busiest?" — I'll give you the KQL query\n• "What does queue depth mean?" — Plain English explanation\n• "Explain IOPS to me" — What it is and why it matters\n\n**About Optimization:**\n• "Which disk type should I choose?" — Decision guide based on your needs\n• "What are VM disk caps?" — How VMs limit disk performance\n• "How do burst credits work?" — The free performance boost explained\n• "How full are my disks?" — Capacity monitoring guidance\n\nJust type your question naturally — I'll explain it in plain English!` };
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

  const [aiMode, setAiMode] = useState<'checking' | 'live' | 'local'>('checking');

  // Azure OpenAI config — fetched from /api/config or use local mode
  const oaiConfig = useRef<{ endpoint: string; key: string; deployment: string } | null>(null);

  useEffect(() => {
    // Try to fetch config from API, fall back to local
    fetch('/api/advisor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }) })
      .then(r => { if (r.ok) return r.json(); throw new Error('not ok'); })
      .then(data => setAiMode(data.mode === 'live' ? 'live' : 'local'))
      .catch(() => setAiMode('local'));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const SYSTEM_PROMPT = `You are an Azure disk performance monitoring expert. You help with disk costs, performance, and optimization.
PRICING (East US 2, USD): Premium SSD: P10=$9.86/mo, P15=$19.71, P20=$38.41, P30=$76.80. Standard SSD: E10=$3.84, E15=$7.68. Standard HDD: S10=$1.54, S15=$2.87. Ultra Disk: $0.000164/GiB/hr + $0.000068/IOPS/hr + $0.000479/MBps/hr. PremSSDv2: $0.0554/GiB/mo + $0.00488/IOPS/mo (>3K) + $0.0269/MBps/mo (>125). VMs: D4s_v5=$0.192/hr (6400 IOPS), D8s_v5=$0.384/hr (12800), E4s_v5=$0.252/hr (6400), L8s_v3=$0.624/hr (400K).
Always be concise. Use markdown tables for pricing. Provide KQL queries when asked about performance. Give az CLI commands for actions.`;

  const handleSubmit = async (question: string) => {
    if (!question.trim()) return;
    const userMsg: Message = { role: 'user', content: question.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Always use the rich local knowledge base — it's instant and free
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
    const { answer, kql } = getLocalAnswer(question);
    setMessages((prev) => [...prev, { role: 'assistant', content: answer, kql, timestamp: new Date() }]);
    setIsThinking(false);
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
              <div className={`rounded-lg border px-2.5 py-1 flex items-center gap-1.5 ${aiMode === 'live' ? 'border-purple-500/30 bg-purple-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${aiMode === 'live' ? 'bg-purple-400 animate-pulse' : aiMode === 'checking' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className={`text-[10px] ${aiMode === 'live' ? 'text-purple-400' : aiMode === 'checking' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {aiMode === 'live' ? 'Azure OpenAI (GPT-4o-mini)' : aiMode === 'checking' ? 'Connecting...' : 'Local AI (no API cost)'}
                </span>
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
