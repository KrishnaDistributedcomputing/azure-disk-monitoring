// ============================================================================
// Azure Function: Delete Resource Group
// Uses Managed Identity (DefaultAzureCredential) to call ARM REST API
// ============================================================================

const https = require("https");

const SUBSCRIPTION_ID = "e62428e7-08dd-4bc2-82e2-2c51586d9105";
const API_VERSION = "2024-03-01";

// Allowed resource group prefixes — safety guard against deleting unrelated resources
const ALLOWED_RG_PREFIXES = [
  "rg-diskmon-",
  "rg-kv-ai-",
  "restdir-rg",
  "appspacesragapp",
  "ME_container-app-environment-",
  "rg-azvm-compute",
  "rg-globalsensorstorm-",
  "rg-boldorca",
  "rg-fastfox",
  "rg-coolwolf",
  "rg-arp-dev-",
  "quiz-demo-rg-",
  "rg-oakvilleschools-",
  "rg-irishspicebag-",
  "rg-ai-patterns-",
  "rg-aks-store-demo",
  "MC_rg-aks-store-demo",
  "rg-imdsoft-",
];

function isAllowedRg(rgName) {
  return ALLOWED_RG_PREFIXES.some((prefix) => rgName.startsWith(prefix));
}

// Get access token from Managed Identity (works in SWA/Azure Functions)
async function getAccessToken() {
  const msiEndpoint = process.env.IDENTITY_ENDPOINT || process.env.MSI_ENDPOINT;
  const msiSecret = process.env.IDENTITY_HEADER || process.env.MSI_SECRET;

  if (!msiEndpoint || !msiSecret) {
    throw new Error("Managed Identity not configured. Enable System Identity on the Static Web App.");
  }

  const url = `${msiEndpoint}?resource=https://management.azure.com&api-version=2019-08-01`;

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "X-IDENTITY-HEADER": msiSecret,
      },
    };

    const protocol = parsed.protocol === "http:" ? require("http") : https;
    const req = protocol.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve(data.access_token);
          } catch (e) {
            reject(new Error(`Failed to parse token response: ${e.message}`));
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

// Check if resource group exists
async function checkResourceGroup(token, rgName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "management.azure.com",
      path: `/subscriptions/${SUBSCRIPTION_ID}/resourcegroups/${encodeURIComponent(rgName)}?api-version=${API_VERSION}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// Delete resource group via ARM REST API
async function deleteResourceGroup(token, rgName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "management.azure.com",
      path: `/subscriptions/${SUBSCRIPTION_ID}/resourcegroups/${encodeURIComponent(rgName)}?api-version=${API_VERSION}`,
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, body: body || null });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// Remove resource lock if present
async function removeLocks(token, rgName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "management.azure.com",
      path: `/subscriptions/${SUBSCRIPTION_ID}/resourcegroups/${encodeURIComponent(rgName)}/providers/Microsoft.Authorization/locks?api-version=2020-05-01`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", async () => {
        if (res.statusCode !== 200) {
          resolve([]);
          return;
        }
        try {
          const data = JSON.parse(body);
          const locks = data.value || [];
          const removed = [];
          for (const lock of locks) {
            await deleteLock(token, lock.id);
            removed.push(lock.name);
          }
          resolve(removed);
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on("error", () => resolve([]));
    req.end();
  });
}

async function deleteLock(token, lockId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "management.azure.com",
      path: `${lockId}?api-version=2020-05-01`,
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode }));
    });
    req.on("error", () => resolve({ status: 500 }));
    req.end();
  });
}

module.exports = async function (context, req) {
  // Only accept POST
  if (req.method !== "POST") {
    context.res = { status: 405, body: { error: "Method not allowed" } };
    return;
  }

  const rgName = req.body && req.body.resourceGroupName;
  const confirmDelete = req.body && req.body.confirm === true;

  // Validate input
  if (!rgName || typeof rgName !== "string") {
    context.res = {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: "Missing or invalid resourceGroupName" },
    };
    return;
  }

  // Safety: must confirm
  if (!confirmDelete) {
    context.res = {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: "Must send confirm: true to delete" },
    };
    return;
  }

  // Safety: only allow known resource groups
  if (!isAllowedRg(rgName)) {
    context.res = {
      status: 403,
      headers: { "Content-Type": "application/json" },
      body: { error: `Resource group '${rgName}' is not in the allowed deletion list. This is a safety guard.` },
    };
    return;
  }

  try {
    // Get managed identity token
    const token = await getAccessToken();

    // Check if RG exists
    const check = await checkResourceGroup(token, rgName);
    if (check.status === 404) {
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: { status: "already_deleted", resourceGroup: rgName, message: "Resource group does not exist (already deleted)" },
      };
      return;
    }
    if (check.status !== 200) {
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { error: `Failed to check resource group: ${check.status}`, details: check.body },
      };
      return;
    }

    // Remove locks first
    const removedLocks = await removeLocks(token, rgName);

    // Delete resource group (async — returns 202 Accepted)
    const result = await deleteResourceGroup(token, rgName);

    if (result.status === 202 || result.status === 200) {
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
          status: "deleting",
          resourceGroup: rgName,
          message: `Resource group '${rgName}' deletion initiated`,
          locksRemoved: removedLocks,
        },
      };
    } else if (result.status === 409) {
      context.res = {
        status: 409,
        headers: { "Content-Type": "application/json" },
        body: { error: "Resource group has a lock or is already being deleted", details: result.body },
      };
    } else {
      context.res = {
        status: result.status,
        headers: { "Content-Type": "application/json" },
        body: { error: `Deletion failed with status ${result.status}`, details: result.body },
      };
    }
  } catch (err) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: err.message || "Internal server error" },
    };
  }
};
