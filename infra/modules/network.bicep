// ============================================================================
// Module: Virtual Network + Subnet
// ============================================================================

@description('Azure region for deployment')
param location string

@description('Common tags for all resources')
param tags object

@description('VNet name')
param vnetName string

@description('VNet address prefix')
param addressPrefix string = '10.200.0.0/16'

@description('Subnet name')
param subnetName string

@description('Subnet address prefix')
param subnetPrefix string = '10.200.1.0/24'

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        addressPrefix
      ]
    }
    subnets: [
      {
        name: subnetName
        properties: {
          addressPrefix: subnetPrefix
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output subnetId string = vnet.properties.subnets[0].id
output vnetName string = vnet.name
output subnetName string = vnet.properties.subnets[0].name
