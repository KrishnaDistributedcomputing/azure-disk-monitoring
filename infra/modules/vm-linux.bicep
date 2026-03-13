// ============================================================================
// Module: Linux Virtual Machine with AMA Extension
// ============================================================================

@description('Azure region for deployment')
param location string

@description('Common tags for all resources')
param tags object

@description('VM name')
param vmName string

@description('VM size SKU')
param vmSize string

@description('Subnet resource ID')
param subnetId string

@description('Admin username')
param adminUsername string = 'azureadmin'

@description('Admin SSH public key')
@secure()
param adminSshPublicKey string

@description('Data Collection Rule resource ID')
param dcrId string

@description('Log Analytics Workspace ID (resource ID)')
param workspaceId string

@description('VM family tag value')
param vmFamily string

@description('VM purpose tag value')
param vmPurpose string

@description('Availability zone (required for Ultra Disk or Premium SSD v2 compatibility)')
param zone string = ''

@description('Enable Ultra SSD compatibility on this VM')
param ultraSSDEnabled bool = false

@description('Cloud-init script to install FIO')
param cloudInitScript string = '''
#cloud-config
package_update: true
packages:
  - fio
  - sysstat
  - iotop
runcmd:
  - mkdir -p /opt/benchmarks
  - echo "FIO installed and ready" > /opt/benchmarks/status.txt
'''

// ---------- NIC ----------
resource nic 'Microsoft.Network/networkInterfaces@2023-11-01' = {
  name: 'nic-${vmName}'
  location: location
  tags: union(tags, {
    'vm-name': vmName
    'component': 'networking'
  })
  properties: {
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: subnetId
          }
        }
      }
    ]
  }
}

// ---------- VM ----------
resource vm 'Microsoft.Compute/virtualMachines@2024-03-01' = {
  name: vmName
  location: location
  zones: zone != '' ? [zone] : []
  tags: union(tags, {
    'vm-family': vmFamily
    'vm-sku': vmSize
    'vm-purpose': vmPurpose
    'os-type': 'Linux'
    'benchmark-tool': 'fio'
  })
  properties: {
    hardwareProfile: {
      vmSize: vmSize
    }
    additionalCapabilities: {
      ultraSSDEnabled: ultraSSDEnabled
    }
    osProfile: {
      computerName: vmName
      adminUsername: adminUsername
      customData: base64(cloudInitScript)
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [
            {
              path: '/home/${adminUsername}/.ssh/authorized_keys'
              keyData: adminSshPublicKey
            }
          ]
        }
      }
    }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: '0001-com-ubuntu-server-jammy'
        sku: '22_04-lts-gen2'
        version: 'latest'
      }
      osDisk: {
        name: 'osdisk-${vmName}'
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: 'Premium_LRS'
        }
        diskSizeGB: 128
      }
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nic.id
        }
      ]
    }
    diagnosticsProfile: {
      bootDiagnostics: {
        enabled: true
      }
    }
  }
}

// ---------- Azure Monitor Agent Extension ----------
resource amaExtension 'Microsoft.Compute/virtualMachines/extensions@2024-03-01' = {
  parent: vm
  name: 'AzureMonitorLinuxAgent'
  location: location
  tags: tags
  properties: {
    publisher: 'Microsoft.Azure.Monitor'
    type: 'AzureMonitorLinuxAgent'
    typeHandlerVersion: '1.0'
    autoUpgradeMinorVersion: true
    enableAutomaticUpgrade: true
  }
}

// ---------- DCR Association ----------
resource dcrAssociation 'Microsoft.Insights/dataCollectionRuleAssociations@2023-03-11' = {
  name: 'dcr-assoc-${vmName}'
  scope: vm
  properties: {
    dataCollectionRuleId: dcrId
    description: 'DCR association for disk performance monitoring'
  }
  dependsOn: [
    amaExtension
  ]
}

// NOTE: DependencyAgentLinux removed — incompatible with Ubuntu 22.04.5 LTS
// AMA + DCR provides all disk performance metrics needed for this POC

// ---------- Diagnostic Settings (Platform Metrics → Log Analytics) ----------
resource diagSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-${vmName}'
  scope: vm
  properties: {
    workspaceId: workspaceId
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output vmId string = vm.id
output vmName string = vm.name
output nicId string = nic.id
