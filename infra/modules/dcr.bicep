// ============================================================================
// Module: Data Collection Rule — Disk Performance Counters
// ============================================================================

@description('Azure region for deployment')
param location string

@description('Common tags for all resources')
param tags object

@description('Data Collection Rule name')
param dcrName string

@description('Log Analytics Workspace ID (resource ID)')
param workspaceId string

@description('Collection interval in seconds')
param intervalSeconds int = 60

resource dcr 'Microsoft.Insights/dataCollectionRules@2023-03-11' = {
  name: dcrName
  location: location
  tags: tags
  properties: {
    description: 'Disk performance monitoring - collects disk metrics from Linux and Windows VMs'
    dataSources: {
      performanceCounters: [
        {
          name: 'diskPerfLinux'
          streams: [
            'Microsoft-Perf'
          ]
          samplingFrequencyInSeconds: intervalSeconds
          counterSpecifiers: [
            '\\Logical Disk(*)\\Disk Reads/sec'
            '\\Logical Disk(*)\\Disk Writes/sec'
            '\\Logical Disk(*)\\Disk Transfers/sec'
            '\\Logical Disk(*)\\Disk Read Bytes/sec'
            '\\Logical Disk(*)\\Disk Write Bytes/sec'
            '\\Logical Disk(*)\\Disk Bytes/sec'
            '\\Logical Disk(*)\\Avg. Disk sec/Read'
            '\\Logical Disk(*)\\Avg. Disk sec/Write'
            '\\Logical Disk(*)\\Avg. Disk sec/Transfer'
            '\\Logical Disk(*)\\Current Disk Queue Length'
            '\\Logical Disk(*)\\% Used Space'
            '\\Logical Disk(*)\\Free Megabytes'
            '\\Logical Disk(*)\\% Free Inodes'
          ]
        }
        {
          name: 'diskPerfWindows'
          streams: [
            'Microsoft-Perf'
          ]
          samplingFrequencyInSeconds: intervalSeconds
          counterSpecifiers: [
            '\\LogicalDisk(*)\\Disk Reads/sec'
            '\\LogicalDisk(*)\\Disk Writes/sec'
            '\\LogicalDisk(*)\\Disk Transfers/sec'
            '\\LogicalDisk(*)\\Disk Read Bytes/sec'
            '\\LogicalDisk(*)\\Disk Write Bytes/sec'
            '\\LogicalDisk(*)\\Disk Bytes/sec'
            '\\LogicalDisk(*)\\Avg. Disk sec/Read'
            '\\LogicalDisk(*)\\Avg. Disk sec/Write'
            '\\LogicalDisk(*)\\Avg. Disk Queue Length'
            '\\LogicalDisk(*)\\Current Disk Queue Length'
            '\\LogicalDisk(*)\\% Free Space'
            '\\LogicalDisk(*)\\Free Megabytes'
            '\\PhysicalDisk(*)\\Disk Reads/sec'
            '\\PhysicalDisk(*)\\Disk Writes/sec'
            '\\PhysicalDisk(*)\\Avg. Disk sec/Read'
            '\\PhysicalDisk(*)\\Avg. Disk sec/Write'
            '\\PhysicalDisk(*)\\Avg. Disk Queue Length'
          ]
        }
      ]
    }
    destinations: {
      logAnalytics: [
        {
          workspaceResourceId: workspaceId
          name: 'logAnalyticsDest'
        }
      ]
    }
    dataFlows: [
      {
        streams: [
          'Microsoft-Perf'
        ]
        destinations: [
          'logAnalyticsDest'
        ]
      }
    ]
  }
}

output dcrId string = dcr.id
output dcrName string = dcr.name
