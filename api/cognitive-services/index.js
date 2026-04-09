// ============================================================================
// Azure Function: Cognitive Services Inventory & Metrics
// Fetches all Cognitive Services accounts in the subscription via ARM API
// Returns service metadata, SKU, usage quotas, and endpoint status
// ============================================================================

const https = require("https");

const SUBSCRIPTION_ID = process.env.AZURE_SUBSCRIPTION_ID || "e62428e7-08dd-4bc2-82e2-2c51586d9105";

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

module.exports = async function (context, req) {
  // Requires managed identity or bearer token forwarded from the SWA auth
  const authHeader = req.headers["authorization"] || req.headers["x-ms-token-aad-access-token"] || "";

  if (!authHeader) {
    context.res = {
      status: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "No authorization token provided" }),
    };
    return;
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader : `Bearer ${authHeader}`;

  try {
    // List all Cognitive Services accounts in the subscription
    const url = `https://management.azure.com/subscriptions/${encodeURIComponent(SUBSCRIPTION_ID)}/providers/Microsoft.CognitiveServices/accounts?api-version=2024-10-01`;
    const result = await httpsGet(url, { Authorization: token });

    if (result.status !== 200) {
      context.res = {
        status: result.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "ARM API error", details: result.data }),
      };
      return;
    }

    const accounts = (result.data.value || []).map((a) => ({
      id: a.id,
      name: a.name,
      location: a.location,
      kind: a.kind,
      sku: a.sku,
      endpoint: a.properties?.endpoint,
      provisioningState: a.properties?.provisioningState,
      customSubDomainName: a.properties?.customSubDomainName,
      publicNetworkAccess: a.properties?.publicNetworkAccess,
      tags: a.tags,
    }));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accounts, count: accounts.length }),
    };
  } catch (err) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
