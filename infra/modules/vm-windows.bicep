// ============================================================================
// Module: Windows Virtual Machine with AMA Extension
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

@description('Admin password')
@secure()
param adminPassword string

@description('Data Collection Rule resource ID')
param dcrId string

@description('Log Analytics Workspace ID (resource ID)')
param workspaceId string

@description('VM family tag value')
param vmFamily string

@description('VM purpose tag value')
param vmPurpose string

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
  tags: union(tags, {
    'vm-family': vmFamily
    'vm-sku': vmSize
    'vm-purpose': vmPurpose
    'os-type': 'Windows'
    'benchmark-tool': 'diskspd'
  })
  properties: {
    hardwareProfile: {
      vmSize: vmSize
    }
    osProfile: {
      computerName: take(vmName, 15)
      adminUsername: adminUsername
      adminPassword: adminPassword
    }
    storageProfile: {
      imageReference: {
        publisher: 'MicrosoftWindowsServer'
        offer: 'WindowsServer'
        sku: '2022-datacenter-g2'
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
  name: 'AzureMonitorWindowsAgent'
  location: location
  tags: tags
  properties: {
    publisher: 'Microsoft.Azure.Monitor'
    type: 'AzureMonitorWindowsAgent'
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

// ---------- Install DiskSpd via Custom Script ----------
resource diskSpdExtension 'Microsoft.Compute/virtualMachines/extensions@2024-03-01' = {
  parent: vm
  name: 'InstallDiskSpd'
  location: location
  tags: tags
  properties: {
    publisher: 'Microsoft.Compute'
    type: 'CustomScriptExtension'
    typeHandlerVersion: '1.10'
    autoUpgradeMinorVersion: true
    settings: {
      commandToExecute: 'powershell -ExecutionPolicy Unrestricted -Command "New-Item -Path C:\\Benchmarks -ItemType Directory -Force; Invoke-WebRequest -Uri https://github.com/microsoft/diskspd/releases/latest/download/DiskSpd.zip -OutFile C:\\Benchmarks\\DiskSpd.zip; Expand-Archive -Path C:\\Benchmarks\\DiskSpd.zip -DestinationPath C:\\Benchmarks\\DiskSpd -Force"'
    }
  }
  dependsOn: [
    amaExtension
  ]
}

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
