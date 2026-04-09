const https = require("https");

const SUBSCRIPTION_ID = "e62428e7-08dd-4bc2-82e2-2c51586d9105";
const API_VERSION = "2024-03-01";

async function getAccessToken() {
  const msiEndpoint = process.env.IDENTITY_ENDPOINT || process.env.MSI_ENDPOINT;
  const msiSecret = process.env.IDENTITY_HEADER || process.env.MSI_SECRET;

  if (!msiEndpoint || !msiSecret) {
    throw new Error("Managed Identity not configured.");
  }

  const url = `${msiEndpoint}?resource=https://management.azure.com&api-version=2019-08-01`;

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: { "X-IDENTITY-HEADER": msiSecret },
    };

    const protocol = parsed.protocol === "http:" ? require("http") : https;
    const req = protocol.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body).access_token);
          } catch (e) {
            reject(new Error(`Failed to parse token: ${e.message}`));
          }
        } else {
          reject(new Error(`Token request failed: ${res.statusCode} ${body}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function listResourceGroups(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "management.azure.com",
      path: `/subscriptions/${SUBSCRIPTION_ID}/resourcegroups?api-version=${API_VERSION}`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve(data.value || []);
          } catch (e) {
            reject(new Error(`Failed to parse RG list: ${e.message}`));
          }
        } else {
          reject(new Error(`List RGs failed: ${res.statusCode} ${body}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

module.exports = async function (context, req) {
  try {
    const token = await getAccessToken();
    const rgs = await listResourceGroups(token);

    const result = rgs.map((rg) => ({
      name: rg.name,
      location: rg.location,
      provisioningState: rg.properties?.provisioningState || "Unknown",
    }));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { resourceGroups: result },
    };
  } catch (err) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: err.message },
    };
  }
};
