// ============================================================================
// Main Orchestrator — Azure Disk Performance Monitoring POC
// ============================================================================
// Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105
// ============================================================================

targetScope = 'subscription'

// ======================== Parameters ========================

@description('Azure region')
param location string = 'eastus2'

@description('Environment name')
param environment string = 'poc'

@description('Project name')
param project string = 'diskmon'

@description('Admin SSH public key for Linux VMs')
@secure()
param adminSshPublicKey string

@description('Admin password for Windows VMs')
@secure()
param adminPassword string

@description('Deployment timestamp for unique naming')
param deploymentTimestamp string = utcNow('yyyyMMddHHmm')

// ======================== Variables ========================

var commonTags = {
  'project': project
  'environment': environment
  'cost-center': 'platform-engineering'
  'owner': 'disk-monitoring-team'
  'created-by': 'bicep-iac'
  'created-date': deploymentTimestamp
  'purpose': 'disk-performance-monitoring-poc'
  'subscription-id': 'e62428e7-08dd-4bc2-82e2-2c51586d9105'
}

var rgName = 'rg-${project}-${environment}-${location}'

// ======================== Resource Group ========================

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: rgName
  location: location
  tags: commonTags
}

// ======================== Networking ========================

module network 'modules/network.bicep' = {
  name: 'deploy-network'
  scope: rg
  params: {
    location: location
    tags: commonTags
    vnetName: 'vnet-${project}-${environment}-${location}'
    subnetName: 'snet-${project}-vms-${environment}'
    addressPrefix: '10.200.0.0/16'
    subnetPrefix: '10.200.1.0/24'
  }
}

// ======================== Log Analytics ========================

module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'deploy-log-analytics'
  scope: rg
  params: {
    location: location
    tags: commonTags
    workspaceName: 'law-${project}-${environment}-${location}'
    retentionDays: 30
    dailyCapGb: 5
  }
}

// ======================== Data Collection Rule ========================

module dcr 'modules/dcr.bicep' = {
  name: 'deploy-dcr'
  scope: rg
  params: {
    location: location
    tags: commonTags
    dcrName: 'dcr-${project}-perf-${environment}'
    workspaceId: logAnalytics.outputs.workspaceId
  }
}

// ======================== Grafana ========================

module grafana 'modules/grafana.bicep' = {
  name: 'deploy-grafana'
  scope: rg
  params: {
    location: location
    tags: commonTags
    grafanaName: 'grafana-${project}-${environment}'
    workspaceId: logAnalytics.outputs.workspaceId
  }
}

// ======================== Linux VMs ========================

// VM 1: D4s_v5 — General Purpose baseline
module vmDsv5_01 'modules/vm-linux.bicep' = {
  name: 'deploy-vm-dsv5-01'
  scope: rg
  params: {
    location: location
    tags: commonTags
    vmName: 'vm-${project}-dsv5-01'
    vmSize: 'Standard_D4s_v5'
    subnetId: network.outputs.subnetId
    adminSshPublicKey: adminSshPublicKey
    dcrId: dcr.outputs.dcrId
    workspaceId: logAnalytics.outputs.workspaceId
    vmFamily: 'D-series'
    vmPurpose: 'general-purpose-baseline'
  }
}

// VM 2: D8s_v5 — General Purpose larger size
module vmDsv5_02 'modules/vm-linux.bicep' = {
  name: 'deploy-vm-dsv5-02'
  scope: rg
  params: {
    location: location
    tags: commonTags
    vmName: 'vm-${project}-dsv5-02'
    vmSize: 'Standard_D8s_v5'
    subnetId: network.outputs.subnetId
    adminSshPublicKey: adminSshPublicKey
    dcrId: dcr.outputs.dcrId
    workspaceId: logAnalytics.outputs.workspaceId
    vmFamily: 'D-series'
    vmPurpose: 'general-purpose-scaleup'
  }
}

// VM 3: E4s_v5 — Memory Optimized
module vmEsv5_01 'modules/vm-linux.bicep' = {
  name: 'deploy-vm-esv5-01'
  scope: rg
  params: {
    location: location
    tags: commonTags
    vmName: 'vm-${project}-esv5-01'
    vmSize: 'Standard_E4s_v5'
    subnetId: network.outputs.subnetId
    adminSshPublicKey: adminSshPublicKey
    dcrId: dcr.outputs.dcrId
    workspaceId: logAnalytics.outputs.workspaceId
    vmFamily: 'E-series'
    vmPurpose: 'memory-optimized-comparison'
    zone: '1'
  }
}

// VM 4: L8s_v3 — Storage Optimized
module vmLsv3_01 'modules/vm-linux.bicep' = {
  name: 'deploy-vm-lsv3-01'
  scope: rg
  params: {
    location: location
    tags: commonTags
    vmName: 'vm-${project}-lsv3-01'
    vmSize: 'Standard_L8s_v3'
    subnetId: network.outputs.subnetId
    adminSshPublicKey: adminSshPublicKey
    dcrId: dcr.outputs.dcrId
    workspaceId: logAnalytics.outputs.workspaceId
    vmFamily: 'L-series'
    vmPurpose: 'storage-optimized-comparison'
    zone: '1'
    ultraSSDEnabled: true
  }
}

// ======================== Windows VM ========================

module vmDsv5_03_win 'modules/vm-windows.bicep' = {
  name: 'deploy-vm-dsv5-03'
  scope: rg
  params: {
    location: location
    tags: commonTags
    vmName: 'vm-${project}-dsv5-03'
    vmSize: 'Standard_D4s_v5'
    subnetId: network.outputs.subnetId
    adminPassword: adminPassword
    dcrId: dcr.outputs.dcrId
    workspaceId: logAnalytics.outputs.workspaceId
    vmFamily: 'D-series'
    vmPurpose: 'windows-diskspd-comparison'
  }
}

// ======================== Managed Data Disks ========================

// Disk 1: Premium SSD P15 (256 GiB) → vm-dsv5-01
module diskDsv5_01_premSsd 'modules/managed-disk.bicep' = {
  name: 'deploy-disk-dsv5-01-premssd'
  scope: rg
  params: {
    location: location
    tags: commonTags
    diskName: 'disk-${project}-dsv5-01-premssd-256'
    diskSku: 'Premium_LRS'
    diskSizeGb: 256
    vmName: 'vm-${project}-dsv5-01'
    lun: 0
    diskTypeLabel: 'Premium SSD'
    diskTierLabel: 'P15'
  }
}

// Disk 2: Standard SSD E15 (256 GiB) → vm-dsv5-01
module diskDsv5_01_stdSsd 'modules/managed-disk.bicep' = {
  name: 'deploy-disk-dsv5-01-stdssd'
  scope: rg
  params: {
    location: location
    tags: commonTags
    diskName: 'disk-${project}-dsv5-01-stdssd-256'
    diskSku: 'StandardSSD_LRS'
    diskSizeGb: 256
    vmName: 'vm-${project}-dsv5-01'
    lun: 1
    diskTypeLabel: 'Standard SSD'
    diskTierLabel: 'E15'
  }
}

// Disk 3: Premium SSD P20 (512 GiB) → vm-dsv5-02
module diskDsv5_02_premSsd 'modules/managed-disk.bicep' = {
  name: 'deploy-disk-dsv5-02-premssd'
  scope: rg
  params: {
    location: location
    tags: commonTags
    diskName: 'disk-${project}-dsv5-02-premssd-512'
    diskSku: 'Premium_LRS'
    diskSizeGb: 512
    vmName: 'vm-${project}-dsv5-02'
    lun: 0
    diskTypeLabel: 'Premium SSD'
    diskTierLabel: 'P20'
  }
}

// Disk 4: Standard HDD S20 (512 GiB) → vm-dsv5-02
module diskDsv5_02_stdHdd 'modules/managed-disk.bicep' = {
  name: 'deploy-disk-dsv5-02-stdhdd'
  scope: rg
  params: {
    location: location
    tags: commonTags
    diskName: 'disk-${project}-dsv5-02-stdhdd-512'
    diskSku: 'Standard_LRS'
    diskSizeGb: 512
    vmName: 'vm-${project}-dsv5-02'
    lun: 1
    diskTypeLabel: 'Standard HDD'
    diskTierLabel: 'S20'
  }
}

// Disk 5: Premium SSD v2 (256 GiB, 5000 IOPS, 200 MBps) → vm-esv5-01
module diskEsv5_01_premSsdV2 'modules/managed-disk.bicep' = {
  name: 'deploy-disk-esv5-01-premssdv2'
  scope: rg
  params: {
    location: location
    tags: commonTags
    diskName: 'disk-${project}-esv5-01-premssdv2-256'
    diskSku: 'PremiumV2_LRS'
    diskSizeGb: 256
    diskIops: 5000
    diskMbps: 200
    vmName: 'vm-${project}-esv5-01'
    lun: 0
    diskTypeLabel: 'Premium SSD v2'
    diskTierLabel: 'Custom'
    zone: '1'
  }
}

// Disk 6: Ultra Disk (256 GiB, 10000 IOPS, 400 MBps) → vm-lsv3-01
module diskLsv3_01_ultra 'modules/managed-disk.bicep' = {
  name: 'deploy-disk-lsv3-01-ultra'
  scope: rg
  params: {
    location: location
    tags: commonTags
    diskName: 'disk-${project}-lsv3-01-ultra-256'
    diskSku: 'UltraSSD_LRS'
    diskSizeGb: 256
    diskIops: 10000
    diskMbps: 400
    vmName: 'vm-${project}-lsv3-01'
    lun: 0
    diskTypeLabel: 'Ultra Disk'
    diskTierLabel: 'Custom'
    zone: '1'
  }
}

// Disk 7: Premium SSD P15 (256 GiB) → vm-lsv3-01
module diskLsv3_01_premSsd 'modules/managed-disk.bicep' = {
  name: 'deploy-disk-lsv3-01-premssd'
  scope: rg
  params: {
    location: location
    tags: commonTags
    diskName: 'disk-${project}-lsv3-01-premssd-256'
    diskSku: 'Premium_LRS'
    diskSizeGb: 256
    vmName: 'vm-${project}-lsv3-01'
    lun: 1
    diskTypeLabel: 'Premium SSD'
    diskTierLabel: 'P15'
  }
}

// Disk 8: Premium SSD P15 (256 GiB) → vm-dsv5-03 (Windows)
module diskDsv5_03_premSsd 'modules/managed-disk.bicep' = {
  name: 'deploy-disk-dsv5-03-premssd'
  scope: rg
  params: {
    location: location
    tags: commonTags
    diskName: 'disk-${project}-dsv5-03-premssd-256'
    diskSku: 'Premium_LRS'
    diskSizeGb: 256
    vmName: 'vm-${project}-dsv5-03'
    lun: 0
    diskTypeLabel: 'Premium SSD'
    diskTierLabel: 'P15'
  }
}

// ======================== Outputs ========================

output resourceGroupName string = rg.name
output logAnalyticsWorkspaceId string = logAnalytics.outputs.workspaceId
output logAnalyticsWorkspaceName string = logAnalytics.outputs.workspaceName
output grafanaEndpoint string = grafana.outputs.grafanaEndpoint
output dcrId string = dcr.outputs.dcrId
output vnetName string = network.outputs.vnetName
