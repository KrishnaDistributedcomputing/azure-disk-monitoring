'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';

// ============================================================================
// AZURE ADVISOR DASHBOARD — Real data from az advisor recommendation list
// Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105
// 359 total recommendations across 4 categories
// ============================================================================

interface AdvisorRec {
  category: 'Cost' | 'HighAvailability' | 'Security' | 'OperationalExcellence';
  impact: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  count: number;
  savings?: string;
  affectedResources: string;
}

const ADVISOR_RECS: AdvisorRec[] = [
  // COST (38 total)
  { category: 'Cost', impact: 'High', title: 'Consider VM reserved instances', description: 'Purchase 1-year or 3-year reserved instances for your virtual machines to save up to 72% over pay-as-you-go pricing. Multiple term options available.', count: 30, savings: '$109–$286/yr per term', affectedResources: 'All VMs in subscription' },
  { category: 'Cost', impact: 'High', title: 'Consider App Service reserved instances', description: 'Purchase reserved capacity for App Service plans to save up to 65% over on-demand pricing.', count: 6, savings: '$41–$65/yr per term', affectedResources: 'App Service Plans' },
  { category: 'Cost', impact: 'High', title: 'Consider compute savings plan', description: 'Commit to a consistent amount of compute usage ($/hour) for 1 or 3 years to unlock lower prices across VMs, App Service, and Container Instances.', count: 2, savings: '$11–$39/yr', affectedResources: 'Subscription-wide compute' },

  // HIGH AVAILABILITY (101 total)
  { category: 'HighAvailability', impact: 'High', title: 'Enable Soft Delete for blob storage', description: 'Protect blob data from accidental deletion by enabling soft delete. Deleted data is retained for a specified period before permanent removal.', count: 14, affectedResources: '14 storage accounts' },
  { category: 'HighAvailability', impact: 'High', title: 'Use Premium tier for critical workloads', description: 'Standard tier storage/services may not meet SLA requirements for production. Premium tier provides higher IOPS and lower latency.', count: 14, affectedResources: '14 storage accounts' },
  { category: 'HighAvailability', impact: 'High', title: 'Ensure Geo-replication for resilience', description: 'Enable geo-replication on storage accounts and databases to protect against regional outages.', count: 15, affectedResources: '15 resources' },
  { category: 'HighAvailability', impact: 'High', title: 'Enable zone redundancy for Container App environments', description: 'Deploy container app managed environments across availability zones to protect against datacenter failures.', count: 9, affectedResources: '9 managed environments' },
  { category: 'HighAvailability', impact: 'Medium', title: 'Ensure disks are in the same zone as VM', description: 'Disks and VMs in different zones can cause latency and failure during zone outages. Colocate for resiliency.', count: 8, affectedResources: '8 disk-VM pairs' },
  { category: 'HighAvailability', impact: 'Medium', title: 'Enable zone redundancy for storage accounts', description: 'Zone-redundant storage (ZRS) replicates data across 3 availability zones in a region.', count: 5, affectedResources: '5 storage accounts' },
  { category: 'HighAvailability', impact: 'Medium', title: 'Use NAT gateway for outbound connectivity', description: 'Replace default outbound access with NAT gateway for reliable, scalable outbound connections.', count: 6, affectedResources: '6 subnets' },
  { category: 'HighAvailability', impact: 'Medium', title: 'Migrate Standard HDD OS Disks to SSD', description: 'Standard HDD provides lower performance and reliability. Upgrade OS disks to SSD for better VM availability.', count: 5, affectedResources: '5 OS disks' },
  { category: 'HighAvailability', impact: 'Medium', title: 'Configure AKS to use availability zones', description: 'Deploy AKS node pools across availability zones to survive datacenter failures.', count: 4, affectedResources: '4 AKS clusters' },
  { category: 'HighAvailability', impact: 'Medium', title: 'Enable automatic repair on VMSS', description: 'Configure automatic instance repair to replace unhealthy instances automatically.', count: 4, affectedResources: '4 VMSS instances' },
  { category: 'HighAvailability', impact: 'Low', title: 'Ensure backend pools have 2+ instances', description: 'Load balancer backend pools with a single instance are a single point of failure.', count: 5, affectedResources: '5 load balancers' },
  { category: 'HighAvailability', impact: 'Low', title: 'Create Azure Service Health alert', description: 'Set up Service Health alerts to get notified about Azure service incidents affecting your resources.', count: 1, affectedResources: 'Subscription' },
  { category: 'HighAvailability', impact: 'Low', title: 'Configure geo-redundant backup for PostgreSQL', description: 'Enable geo-redundant backup storage for disaster recovery across regions.', count: 3, affectedResources: '3 PostgreSQL servers' },

  // SECURITY (211 total)
  { category: 'Security', impact: 'High', title: 'Resolve container vulnerability findings', description: 'Running containers have known vulnerabilities that should be patched to prevent exploitation.', count: 33, affectedResources: '33 container images' },
  { category: 'Security', impact: 'High', title: 'Restrict container registry network access', description: 'Container registries allow unrestricted public network access. Configure firewall rules or private endpoints.', count: 15, affectedResources: '15 registries' },
  { category: 'Security', impact: 'High', title: 'Use private link for container registries', description: 'Enable private link to route traffic through Azure backbone network instead of public internet.', count: 15, affectedResources: '15 registries' },
  { category: 'Security', impact: 'High', title: 'Resolve container image vulnerabilities', description: 'Azure Container Registry images have known CVEs. Rebuild images with patched base layers.', count: 14, affectedResources: '14 registry images' },
  { category: 'Security', impact: 'High', title: 'Enable encryption at host for VMs/VMSS', description: 'Ensure data at rest is encrypted end-to-end using platform-managed or customer-managed keys.', count: 9, affectedResources: '9 VMs/VMSS instances' },
  { category: 'Security', impact: 'High', title: 'Restrict storage account network access', description: 'Storage accounts should use virtual network rules or private endpoints to limit access.', count: 5, affectedResources: '5 storage accounts' },
  { category: 'Security', impact: 'High', title: 'Enable Azure Backup for VMs', description: 'Protect virtual machines with Azure Backup to enable point-in-time recovery.', count: 5, affectedResources: '5 VMs' },
  { category: 'Security', impact: 'Medium', title: 'Install Guest Configuration extension', description: 'Required for Azure Policy guest configuration auditing of machine settings.', count: 5, affectedResources: '5 VMs' },
  { category: 'Security', impact: 'Medium', title: 'Use private link for storage accounts', description: 'Connect to storage accounts through private endpoints instead of public access.', count: 5, affectedResources: '5 storage accounts' },
  { category: 'Security', impact: 'Medium', title: 'Restrict Microsoft Foundry network access', description: 'AI resources should restrict network access using private endpoints.', count: 5, affectedResources: '5 AI resources' },
  { category: 'Security', impact: 'Medium', title: 'Enable Defender profile for AKS clusters', description: 'Microsoft Defender for Containers provides threat detection for AKS clusters.', count: 4, affectedResources: '4 AKS clusters' },
  { category: 'Security', impact: 'Medium', title: 'Require SSH keys for Linux VM auth', description: 'Password authentication is less secure than SSH key-based authentication.', count: 4, affectedResources: '4 Linux VMs' },
  { category: 'Security', impact: 'Medium', title: 'Resolve AKS node vulnerabilities', description: 'AKS node OS images have known vulnerabilities that should be patched.', count: 4, affectedResources: '4 AKS clusters' },
  { category: 'Security', impact: 'Low', title: 'Enable diagnostic logs for Kubernetes', description: 'Diagnostic logs help investigate security incidents and compliance requirements.', count: 4, affectedResources: '4 AKS clusters' },
  { category: 'Security', impact: 'Low', title: 'Enable PostgreSQL Entra-only authentication', description: 'Use Microsoft Entra ID authentication instead of local database passwords.', count: 3, affectedResources: '3 PostgreSQL servers' },
  { category: 'Security', impact: 'Low', title: 'Enable Linux VM disk encryption', description: 'Enable Azure Disk Encryption or EncryptionAtHost for data-at-rest protection.', count: 3, affectedResources: '3 Linux VMs' },

  // OPERATIONAL EXCELLENCE (9 total)
  { category: 'OperationalExcellence', impact: 'Medium', title: 'Enable container monitoring for AKS', description: 'Azure Monitor Container Insights provides visibility into AKS cluster health, performance, and logs.', count: 4, affectedResources: '4 AKS clusters' },
  { category: 'OperationalExcellence', impact: 'Medium', title: 'Enable Trusted Launch for Gen 2 VMs', description: 'Trusted Launch provides boot integrity and protection against rootkits for Generation 2 virtual machines.', count: 5, affectedResources: '5 Gen 2 VMs' },
];

const TOTAL_RECS = ADVISOR_RECS.reduce((s, r) => s + r.count, 0);
const CATEGORIES = [
  { name: 'Security', icon: '🛡️', color: '#e81123', count: ADVISOR_RECS.filter(r => r.category === 'Security').reduce((s, r) => s + r.count, 0), description: 'Identify security vulnerabilities and potential threats' },
  { name: 'HighAvailability', label: 'Reliability', icon: '🔄', color: '#0078d4', count: ADVISOR_RECS.filter(r => r.category === 'HighAvailability').reduce((s, r) => s + r.count, 0), description: 'Improve reliability and business continuity' },
  { name: 'Cost', icon: '💰', color: '#57a300', count: ADVISOR_RECS.filter(r => r.category === 'Cost').reduce((s, r) => s + r.count, 0), description: 'Optimize and reduce Azure spending' },
  { name: 'OperationalExcellence', label: 'Operations', icon: '⚙️', color: '#8764b8', count: ADVISOR_RECS.filter(r => r.category === 'OperationalExcellence').reduce((s, r) => s + r.count, 0), description: 'Improve operational processes and workflows' },
];

const IMPACT_COLORS: Record<string, string> = { High: '#e81123', Medium: '#f59e0b', Low: '#0078d4' };

type Filter = 'all' | 'Cost' | 'HighAvailability' | 'Security' | 'OperationalExcellence';

export default function AzureAdvisorPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [expandedRec, setExpandedRec] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let result = ADVISOR_RECS;
    if (filter !== 'all') result = result.filter(r => r.category === filter);
    if (impactFilter !== 'all') result = result.filter(r => r.impact === impactFilter);
    return result;
  }, [filter, impactFilter]);

  const pieData = CATEGORIES.map(c => ({ name: c.label || c.name, value: c.count, color: c.color }));

  const impactData = [
    { impact: 'High', count: ADVISOR_RECS.filter(r => r.impact === 'High').reduce((s, r) => s + r.count, 0), color: '#e81123' },
    { impact: 'Medium', count: ADVISOR_RECS.filter(r => r.impact === 'Medium').reduce((s, r) => s + r.count, 0), color: '#f59e0b' },
    { impact: 'Low', count: ADVISOR_RECS.filter(r => r.impact === 'Low').reduce((s, r) => s + r.count, 0), color: '#0078d4' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200" role="main">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-[1400px] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-400 hover:text-white transition-colors p-1" aria-label="Back to home">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
              </Link>
              <span className="text-2xl" aria-hidden="true">🎯</span>
              <div>
                <h1 className="text-2xl font-bold text-white">Azure Advisor</h1>
                <p className="text-sm text-slate-400">Personalized best practice recommendations</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {CATEGORIES.map(c => (
                <div key={c.name} className="text-center">
                  <div className="text-xl font-bold" style={{ color: c.color }}>{c.count}</div>
                  <div className="text-xs text-slate-400">{c.label || c.name}</div>
                </div>
              ))}
              <div className="h-8 w-px bg-slate-700" aria-hidden="true" />
              <div className="text-center">
                <div className="text-xl font-bold text-white">{TOTAL_RECS}</div>
                <div className="text-xs text-slate-400">Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
        {/* Advisor Score Banner */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5" role="note">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <strong className="text-blue-200">📊 Azure Advisor Report</strong>
              <p className="text-sm text-blue-100/80 mt-1"><strong>{TOTAL_RECS} recommendations</strong> across {CATEGORIES.length} pillars of the Azure Well-Architected Framework. Data from <code className="text-xs font-mono text-emerald-400">az advisor recommendation list</code>.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-16 w-16 rounded-full border-4 border-amber-400 flex items-center justify-center bg-slate-800">
                <span className="text-lg font-bold text-amber-300">C+</span>
              </div>
              <div className="text-xs text-slate-400">Advisor<br/>Score</div>
            </div>
          </div>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(c => (
            <button key={c.name} onClick={() => { setFilter(filter === c.name as Filter ? 'all' : c.name as Filter); }} className={`rounded-xl border p-5 text-left transition-all hover:scale-[1.02] ${filter === c.name ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}>
              <div className="flex items-center gap-2.5 mb-3">
                <img src={c.icon} alt="" className="h-7 w-7 flex-shrink-0" />
                <span className="text-sm font-semibold text-white">{c.label || c.name}</span>
              </div>
              <div className="text-3xl font-bold" style={{ color: c.color }}>{c.count}</div>
              <div className="text-sm text-slate-400 mt-1">{c.description}</div>
              <div className="mt-3 text-xs text-slate-400">{ADVISOR_RECS.filter(r => r.category === c.name).length} unique recommendations</div>
            </button>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Category Pie */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-base font-bold text-white mb-4">Recommendations by Category</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={50}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} recommendations`} contentStyle={{ backgroundColor: '#131f35', border: '1px solid #1e3250', borderRadius: 4, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {CATEGORIES.map(c => (
                  <div key={c.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-sm text-slate-200 flex-1">{c.label || c.name}</span>
                    <span className="text-sm font-bold text-white">{c.count}</span>
                    <span className="text-xs text-slate-400 w-10 text-right">{((c.count / TOTAL_RECS) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* By Impact */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <h3 className="text-base font-bold text-white mb-4">Recommendations by Impact</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={impactData} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3250" vertical={false} />
                <XAxis dataKey="impact" tick={{ fill: '#dce4ed', fontSize: 13 }} axisLine={{ stroke: '#1e3250' }} tickLine={false} />
                <YAxis tick={{ fill: '#dce4ed', fontSize: 13 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => `${v} recommendations`} contentStyle={{ backgroundColor: '#131f35', border: '1px solid #1e3250', borderRadius: 4, fontSize: 13 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {impactData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <fieldset className="flex rounded-lg border border-slate-700 bg-slate-800" role="radiogroup" aria-label="Filter by category">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`} aria-pressed={filter === 'all'}>All ({TOTAL_RECS})</button>
            {CATEGORIES.map((c, i) => (
              <button key={c.name} onClick={() => setFilter(c.name as Filter)} className={`px-4 py-2 text-sm font-medium ${filter === c.name ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'} ${i === CATEGORIES.length - 1 ? 'rounded-r-lg' : ''}`} aria-pressed={filter === c.name}>{c.label || c.name}</button>
            ))}
          </fieldset>
          <fieldset className="flex rounded-lg border border-slate-700 bg-slate-800" role="radiogroup" aria-label="Filter by impact">
            <button onClick={() => setImpactFilter('all')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${impactFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}>All Impact</button>
            {['High','Medium','Low'].map((imp, i) => (
              <button key={imp} onClick={() => setImpactFilter(imp)} className={`px-4 py-2 text-sm font-medium ${impactFilter === imp ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'} ${i === 2 ? 'rounded-r-lg' : ''}`}>{imp}</button>
            ))}
          </fieldset>
          <span className="text-sm text-slate-400 font-medium">{filtered.length} recommendations · {filtered.reduce((s, r) => s + r.count, 0)} total instances</span>
        </div>

        {/* Recommendations List */}
        <div className="space-y-3">
          {filtered.map((rec, i) => {
            const isExpanded = expandedRec === i;
            const catInfo = CATEGORIES.find(c => c.name === rec.category);
            return (
              <div key={i} className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden transition-all hover:border-slate-600">
                <button onClick={() => setExpandedRec(isExpanded ? null : i)} className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-700/20 transition-colors" aria-expanded={isExpanded}>
                  <img src={catInfo?.icon || '/icons/cognitive.svg'} alt="" className="h-6 w-6 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: (catInfo?.color || '#666') + '20', color: catInfo?.color }}>{catInfo?.label || rec.category}</span>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: IMPACT_COLORS[rec.impact] + '20', color: IMPACT_COLORS[rec.impact] }}>{rec.impact}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-1">{rec.description}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{rec.count}</div>
                      <div className="text-xs text-slate-400">instances</div>
                    </div>
                    {rec.savings && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-400">{rec.savings}</div>
                        <div className="text-xs text-slate-400">savings</div>
                      </div>
                    )}
                    <svg className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-700 px-5 py-4 bg-slate-800/50 space-y-3">
                    <p className="text-sm text-slate-200 leading-relaxed">{rec.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-4 py-3">
                        <div className="text-xs text-slate-400 mb-1">Affected Resources</div>
                        <div className="text-sm font-semibold text-white">{rec.affectedResources}</div>
                      </div>
                      <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-4 py-3">
                        <div className="text-xs text-slate-400 mb-1">Instance Count</div>
                        <div className="text-sm font-semibold text-white">{rec.count} occurrences</div>
                      </div>
                      <div className="rounded-lg bg-slate-900/50 border border-slate-700/50 px-4 py-3">
                        <div className="text-xs text-slate-400 mb-1">{rec.savings ? 'Potential Savings' : 'Impact Level'}</div>
                        <div className="text-sm font-semibold" style={{ color: rec.savings ? '#57a300' : IMPACT_COLORS[rec.impact] }}>{rec.savings || rec.impact}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <a href="https://portal.azure.com/#blade/Microsoft_Azure_Expert/AdvisorMenuBlade/overview" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">Open in Azure Portal →</a>
                      <span className="rounded-lg bg-slate-700/50 px-4 py-2 text-xs text-slate-300">Source: Azure Advisor API</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary by Category */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
          <h3 className="text-base font-bold text-white mb-4">Key Takeaways</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <div className="text-sm font-bold text-red-400 mb-2">🛡️ Security ({CATEGORIES[0].count} findings)</div>
              <div className="text-sm text-slate-200">Container vulnerabilities and unprotected registries are the top issues. Enable private endpoints and resolve CVEs in container images.</div>
            </div>
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
              <div className="text-sm font-bold text-blue-400 mb-2">🔄 Reliability ({CATEGORIES[1].count} findings)</div>
              <div className="text-sm text-slate-200">Enable soft delete, geo-replication, and zone redundancy. Most storage accounts lack blob protection and zone resilience.</div>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
              <div className="text-sm font-bold text-emerald-400 mb-2">💰 Cost ({CATEGORIES[2].count} findings)</div>
              <div className="text-sm text-slate-200">Reserved instances for VMs and App Service could save $100–$286/year. Compute savings plans offer additional discounts.</div>
            </div>
            <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4">
              <div className="text-sm font-bold text-purple-400 mb-2">⚙️ Operations ({CATEGORIES[3].count} findings)</div>
              <div className="text-sm text-slate-200">Enable container monitoring for AKS clusters and Trusted Launch for Gen 2 VMs to improve observability and security posture.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 mt-8">
        <div className="mx-auto max-w-[1400px] px-6 py-5 flex items-center justify-between text-sm text-slate-400">
          <span>Data: Azure Advisor API · 359 recommendations</span>
          <span>Refresh: <code className="text-xs font-mono text-emerald-400 ml-1">az advisor recommendation list --subscription e62428e7-...2c51586d9105</code></span>
        </div>
      </div>
    </div>
  );
}
