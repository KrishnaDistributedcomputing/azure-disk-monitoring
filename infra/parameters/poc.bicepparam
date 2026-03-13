using '../main.bicep'

param location = 'eastus2'
param environment = 'poc'
param project = 'diskmon'

// Provide these at deployment time via --parameters or key vault
// param adminSshPublicKey = '<your-ssh-public-key>'
// param adminPassword = '<your-windows-password>'
