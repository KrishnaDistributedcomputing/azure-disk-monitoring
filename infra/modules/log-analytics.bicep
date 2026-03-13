// ============================================================================
// Module: Log Analytics Workspace
// ============================================================================

@description('Azure region for deployment')
param location string

@description('Common tags for all resources')
param tags object

@description('Log Analytics Workspace name')
param workspaceName string

@description('Retention in days')
param retentionDays int = 30

@description('Daily ingestion cap in GB')
param dailyCapGb int = 5

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionDays
    workspaceCapping: {
      dailyQuotaGb: dailyCapGb
    }
    features: {
      enableLogAccessUsingOnlyResourcePermissions: false
    }
  }
}

output workspaceId string = workspace.id
output workspaceName string = workspace.name
output workspaceCustomerId string = workspace.properties.customerId
