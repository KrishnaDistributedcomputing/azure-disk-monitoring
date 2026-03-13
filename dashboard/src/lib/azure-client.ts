// ============================================================================
// Azure Log Analytics query client
// Uses @azure/monitor-query to execute KQL queries against the workspace
// Falls back to mock data when credentials are not configured
// ============================================================================

import { LogsQueryClient } from '@azure/monitor-query';
import { DefaultAzureCredential } from '@azure/identity';

const WORKSPACE_ID = process.env.LOG_ANALYTICS_WORKSPACE_ID || '';

let client: LogsQueryClient | null = null;

function getClient(): LogsQueryClient | null {
  if (!WORKSPACE_ID) return null;
  if (!client) {
    try {
      const credential = new DefaultAzureCredential();
      client = new LogsQueryClient(credential);
    } catch {
      console.warn('Azure credential not available — using mock data');
      return null;
    }
  }
  return client;
}

export async function queryLogAnalytics(kql: string, timeSpanIso: string = 'PT1H'): Promise<Record<string, unknown>[] | null> {
  const queryClient = getClient();
  if (!queryClient) return null;

  try {
    const result = await queryClient.queryWorkspace(WORKSPACE_ID, kql, {
      duration: timeSpanIso,
    });

    if (result.status === 'Success' && result.tables.length > 0) {
      const table = result.tables[0];
      const columns = table.columnDescriptors.map((c) => c.name);
      return table.rows.map((row) => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, i) => {
          if (col != null) {
            obj[col] = row[i];
          }
        });
        return obj;
      });
    }
    return [];
  } catch (err) {
    console.error('Log Analytics query failed:', err);
    return null;
  }
}
