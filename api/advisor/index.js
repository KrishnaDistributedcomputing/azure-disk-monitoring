// ============================================================================
// Azure Function: AI Disk Advisor
// Connects GPT-4o-mini to Log Analytics for live disk performance Q&A
// Uses REST API directly for maximum compatibility
// ============================================================================

// Polyfill for SWA managed functions
if (typeof globalThis.crypto === 'undefined') {
  try { globalThis.crypto = require('crypto'); } catch(e) { /* ignore */ }
}

const https = require("https");

const OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const OPENAI_KEY = process.env.AZURE_OPENAI_KEY || "";
const OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
const LOG_ANALYTICS_WORKSPACE_ID = process.env.LOG_ANALYTICS_WORKSPACE_ID || "";

const SYSTEM_PROMPT = `You are an Azure disk performance monitoring expert AI assistant. You help engineers understand disk costs, performance metrics, and optimization strategies.

ENVIRONMENT CONTEXT:
- Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105
- Resource Group: rg-diskmon-poc-eastus2
- Region: East US 2
- Log Analytics Workspace: law-diskmon-poc-eastus2
- 5 VMs: vm-diskmon-dsv5-01 (D4s_v5), vm-diskmon-dsv5-02 (D8s_v5), vm-diskmon-esv5-01 (E4s_v5), vm-diskmon-lsv3-01 (L8s_v3), vm-diskmon-dsv5-03 (D4s_v5 Windows)
- 8 data disks: Premium SSD (P15, P20), Premium SSD v2 (5K IOPS), Standard SSD (E15), Standard HDD (S20), Ultra Disk (10K IOPS)

PRICING (East US 2, USD, Pay-as-you-go):
- Premium SSD: P10=$9.86/mo, P15=$19.71/mo, P20=$38.41/mo, P30=$76.80/mo
- Standard SSD: E10=$3.84/mo, E15=$7.68/mo, E20=$15.36/mo
- Standard HDD: S10=$1.54/mo, S15=$2.87/mo, S20=$5.89/mo
- Ultra Disk: $0.000164/GiB/hr + $0.000068/IOPS/hr + $0.000479/MBps/hr
- Premium SSD v2: $0.0554/GiB/mo + $0.00488/IOPS/mo (above 3K free) + $0.0269/MBps/mo (above 125 free)
- VM: D4s_v5=$0.192/hr (6400 IOPS cap), D8s_v5=$0.384/hr (12800 cap), E4s_v5=$0.252/hr (6400 cap), L8s_v3=$0.624/hr (400K cap)

RULES:
1. When asked about performance, suggest a KQL query to investigate. Format KQL in a code block.
2. When asked about costs, provide exact dollar amounts.
3. Always provide actionable Azure CLI commands when suggesting changes.
4. If you can run a KQL query against Log Analytics, do so and interpret the results.
5. Be concise but thorough. Use markdown formatting.`;

// KQL function definitions for GPT function calling
const KQL_FUNCTIONS = [
  {
    name: "run_kql_query",
    description: "Execute a KQL query against the Log Analytics workspace to get live disk performance metrics",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The KQL query to execute against Log Analytics" },
        timespan: { type: "string", description: "ISO 8601 duration like PT1H for 1 hour, PT24H for 24 hours", default: "PT1H" }
      },
      required: ["query"]
    }
  }
];

async function callOpenAI(messages) {
  const endpoint = OPENAI_ENDPOINT.replace(/\/$/, '');
  const hostname = endpoint.replace('https://', '').replace('http://', '');
  const path = `/openai/deployments/${OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;
  const body = JSON.stringify({ messages, temperature: 0.3, max_tokens: 1500, functions: KQL_FUNCTIONS });
  return new Promise((resolve, reject) => {
    const options = { hostname, port: 443, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': OPENAI_KEY } };
    const req = https.request(options, (res) => {
      let data = ''; res.on('data', (c) => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('Parse error: ' + data.substring(0, 200))); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function callOpenAISimple(messages) {
  const endpoint = OPENAI_ENDPOINT.replace(/\/$/, '');
  const hostname = endpoint.replace('https://', '').replace('http://', '');
  const path = `/openai/deployments/${OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;
  const body = JSON.stringify({ messages, temperature: 0.3, max_tokens: 1500 });
  return new Promise((resolve, reject) => {
    const options = { hostname, port: 443, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': OPENAI_KEY } };
    const req = https.request(options, (res) => {
      let data = ''; res.on('data', (c) => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('Parse error')); } });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

module.exports = async function (context, req) {
  context.res = {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }
  };

  if (req.method === "OPTIONS") { context.res.status = 204; context.res.body = ""; return; }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    context.res.status = 400;
    context.res.body = JSON.stringify({ error: "messages array required" });
    return;
  }

  if (!OPENAI_ENDPOINT || !OPENAI_KEY) {
    context.res.status = 200;
    context.res.body = JSON.stringify({ mode: "local", message: "Azure OpenAI not configured" });
    return;
  }

  try {
    const chatMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages.map(m => ({ role: m.role, content: m.content }))];
    const response = await callOpenAI(chatMessages);

    if (response.error) {
      context.res.status = 200;
      context.res.body = JSON.stringify({ mode: "live", content: `API returned: ${response.error.message}`, usage: null });
      return;
    }

    const choice = response.choices && response.choices[0];
    if (!choice) {
      context.res.status = 200;
      context.res.body = JSON.stringify({ mode: "live", content: "No response generated.", usage: response.usage });
      return;
    }

    // Handle function calling
    if (choice.finish_reason === "function_call" && choice.message && choice.message.function_call) {
      const fc = choice.message.function_call;
      if (fc.name === "run_kql_query") {
        const args = JSON.parse(fc.arguments);
        // We don't execute KQL server-side in this version — return the query for the user
        const followUp = [...chatMessages, choice.message, { role: "function", name: "run_kql_query", content: JSON.stringify({ note: "KQL query generated. User should run this in Log Analytics to see live results.", query: args.query }) }];
        const response2 = await callOpenAISimple(followUp);
        const choice2 = response2.choices && response2.choices[0];
        context.res.status = 200;
        context.res.body = JSON.stringify({
          mode: "live",
          content: choice2 ? choice2.message.content : "Query generated.",
          kql: args.query,
          usage: response2.usage,
        });
        return;
      }
    }

    context.res.status = 200;
    context.res.body = JSON.stringify({ mode: "live", content: choice.message.content, usage: response.usage });
  } catch (err) {
    context.res.status = 200;
    context.res.body = JSON.stringify({ mode: "live", content: `Error: ${err.message}. Falling back to local knowledge.`, usage: null });
  }
};
