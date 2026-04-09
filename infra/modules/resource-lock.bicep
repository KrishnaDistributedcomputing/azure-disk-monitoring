// ============================================================================
// Module: Resource Lock — Prevent Accidental Deletion
// ============================================================================
// Applies a CanNotDelete lock to the resource group when enabled.
// Disable the lock before running teardown to allow safe cleanup.
// ============================================================================

@description('Enable or disable the deletion lock')
param enableLock bool = true

@description('Common tags for all resources')
param tags object

resource deleteLock 'Microsoft.Authorization/locks@2020-05-01' = if (enableLock) {
  name: 'lock-prevent-accidental-delete'
  properties: {
    level: 'CanNotDelete'
    notes: 'Prevents accidental deletion of the Disk Monitoring POC resource group and all resources within it. Disable this lock before running teardown.'
  }
}

output lockEnabled bool = enableLock
output lockName string = enableLock ? deleteLock.name : ''
