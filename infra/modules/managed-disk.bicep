// ============================================================================
// Module: Managed Data Disk + Attachment to VM
// ============================================================================

@description('Azure region for deployment')
param location string

@description('Common tags for all resources')
param tags object

@description('Managed disk name')
param diskName string

@description('Disk SKU: Premium_LRS, StandardSSD_LRS, Standard_LRS, PremiumV2_LRS, UltraSSD_LRS')
param diskSku string

@description('Disk size in GiB')
param diskSizeGb int

@description('Disk IOPS read/write (only for PremiumV2_LRS and UltraSSD_LRS)')
param diskIops int = 0

@description('Disk throughput in MBps (only for PremiumV2_LRS and UltraSSD_LRS)')
param diskMbps int = 0

@description('VM resource ID to attach the disk to')
param vmName string

@description('LUN number for the data disk')
param lun int

@description('Disk type label for tagging')
param diskTypeLabel string

@description('Disk tier label for tagging')
param diskTierLabel string

@description('Availability zone (required for Ultra and PremiumV2)')
param zone string = ''

// ---------- Managed Disk ----------
resource disk 'Microsoft.Compute/disks@2024-03-02' = {
  name: diskName
  location: location
  tags: union(tags, {
    'disk-type': diskTypeLabel
    'disk-tier': diskTierLabel
    'disk-size-gb': string(diskSizeGb)
    'attached-vm': vmName
    'component': 'storage'
  })
  sku: {
    name: diskSku
  }
  zones: zone != '' ? [zone] : []
  properties: {
    diskSizeGB: diskSizeGb
    creationData: {
      createOption: 'Empty'
    }
    diskIOPSReadWrite: diskIops > 0 ? diskIops : null
    diskMBpsReadWrite: diskMbps > 0 ? diskMbps : null
  }
}

// ---------- Attach via VM update ----------
// Note: Disk attachment is done in the main.bicep via VM data disk array
// This module only creates the disk resource

output diskId string = disk.id
output diskName string = disk.name
