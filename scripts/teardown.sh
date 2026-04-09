#!/bin/bash
# ============================================================================
# Teardown Azure Disk Monitoring POC — Safe & Complete Cleanup
# ============================================================================
# Ensures ordered deletion of all resources to avoid orphaned artifacts
# and reduce ongoing costs. Steps:
#   1. Validate prerequisites
#   2. Remove resource locks
#   3. Deallocate VMs (releases compute billing immediately)
#   4. Remove DCR associations
#   5. Remove Grafana role assignments
#   6. Remove diagnostic settings
#   7. Delete resource group (and all contained resources)
#   8. Verify deletion
# ============================================================================
set -euo pipefail

SUBSCRIPTION_ID="e62428e7-08dd-4bc2-82e2-2c51586d9105"
PROJECT="diskmon"
ENVIRONMENT="poc"
LOCATION="eastus2"
RG_NAME="rg-${PROJECT}-${ENVIRONMENT}-${LOCATION}"

# VM names deployed by main.bicep
VM_NAMES=(
  "vm-${PROJECT}-dsv5-01"
  "vm-${PROJECT}-dsv5-02"
  "vm-${PROJECT}-esv5-01"
  "vm-${PROJECT}-lsv3-01"
  "vm-${PROJECT}-dsv5-03"
)

GRAFANA_NAME="grafana-${PROJECT}-${ENVIRONMENT}"
LAW_NAME="law-${PROJECT}-${ENVIRONMENT}-${LOCATION}"
DCR_NAME="dcr-${PROJECT}-perf-${ENVIRONMENT}"

echo "============================================"
echo " Azure Disk Monitoring POC — Safe Teardown"
echo "============================================"
echo ""
echo "This will permanently DELETE all resources:"
echo "  Resource Group:    $RG_NAME"
echo "  VMs:               ${VM_NAMES[*]}"
echo "  Grafana:           $GRAFANA_NAME"
echo "  Log Analytics:     $LAW_NAME"
echo "  DCR:               $DCR_NAME"
echo "  + all managed disks, NICs, VNet, NSGs"
echo "  Subscription:      $SUBSCRIPTION_ID"
echo ""
read -p "Type 'yes' to confirm deletion: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "[0/8] Setting subscription..."
az account set --subscription "$SUBSCRIPTION_ID"
echo "      Active: $(az account show --query name -o tsv)"

# --- Check if resource group exists ---
if ! az group show --name "$RG_NAME" &>/dev/null; then
    echo ""
    echo "Resource group '$RG_NAME' does not exist. Nothing to delete."
    exit 0
fi

# ======================== Step 1: Remove Resource Locks ========================
echo ""
echo "[1/8] Removing resource locks..."
LOCKS=$(az lock list --resource-group "$RG_NAME" --query "[].name" -o tsv 2>/dev/null || true)
if [ -n "$LOCKS" ]; then
    while IFS= read -r LOCK_NAME; do
        echo "      Removing lock: $LOCK_NAME"
        az lock delete --name "$LOCK_NAME" --resource-group "$RG_NAME"
    done <<< "$LOCKS"
    echo "      ✓ All locks removed"
else
    echo "      No locks found"
fi

# ======================== Step 2: Deallocate VMs ========================
echo ""
echo "[2/8] Deallocating VMs (stops billing immediately)..."
for VM in "${VM_NAMES[@]}"; do
    if az vm show --resource-group "$RG_NAME" --name "$VM" &>/dev/null; then
        echo "      Deallocating $VM..."
        az vm deallocate --resource-group "$RG_NAME" --name "$VM" --no-wait || true
    else
        echo "      $VM not found, skipping"
    fi
done
# Wait for all VMs to deallocate
for VM in "${VM_NAMES[@]}"; do
    if az vm show --resource-group "$RG_NAME" --name "$VM" &>/dev/null; then
        echo "      Waiting for $VM to deallocate..."
        az vm wait --resource-group "$RG_NAME" --name "$VM" --custom "instanceView.statuses[?code=='PowerState/deallocated']" --timeout 300 2>/dev/null || true
    fi
done
echo "      ✓ VMs deallocated"

# ======================== Step 3: Remove DCR Associations ========================
echo ""
echo "[3/8] Removing Data Collection Rule associations..."
for VM in "${VM_NAMES[@]}"; do
    VM_ID=$(az vm show --resource-group "$RG_NAME" --name "$VM" --query id -o tsv 2>/dev/null || true)
    if [ -n "$VM_ID" ]; then
        ASSOCS=$(az monitor data-collection rule association list --resource "$VM_ID" --query "[].name" -o tsv 2>/dev/null || true)
        if [ -n "$ASSOCS" ]; then
            while IFS= read -r ASSOC_NAME; do
                echo "      Removing DCR association: $ASSOC_NAME from $VM"
                az monitor data-collection rule association delete --name "$ASSOC_NAME" --resource "$VM_ID" --yes 2>/dev/null || true
            done <<< "$ASSOCS"
        fi
    fi
done
echo "      ✓ DCR associations cleaned up"

# ======================== Step 4: Remove Grafana Role Assignments ========================
echo ""
echo "[4/8] Removing Grafana managed identity role assignments..."
GRAFANA_PRINCIPAL=$(az grafana show --resource-group "$RG_NAME" --name "$GRAFANA_NAME" --query "identity.principalId" -o tsv 2>/dev/null || true)
if [ -n "$GRAFANA_PRINCIPAL" ]; then
    ROLE_ASSIGNMENTS=$(az role assignment list --assignee "$GRAFANA_PRINCIPAL" --query "[].id" -o tsv 2>/dev/null || true)
    if [ -n "$ROLE_ASSIGNMENTS" ]; then
        while IFS= read -r RA_ID; do
            echo "      Removing role assignment: ${RA_ID##*/}"
            az role assignment delete --ids "$RA_ID" 2>/dev/null || true
        done <<< "$ROLE_ASSIGNMENTS"
    fi
    echo "      ✓ Grafana role assignments removed"
else
    echo "      Grafana not found or no managed identity, skipping"
fi

# ======================== Step 5: Remove Diagnostic Settings ========================
echo ""
echo "[5/8] Removing diagnostic settings from resources..."
RESOURCES=$(az resource list --resource-group "$RG_NAME" --query "[].id" -o tsv 2>/dev/null || true)
if [ -n "$RESOURCES" ]; then
    while IFS= read -r RES_ID; do
        DIAG_SETTINGS=$(az monitor diagnostic-settings list --resource "$RES_ID" --query "[].name" -o tsv 2>/dev/null || true)
        if [ -n "$DIAG_SETTINGS" ]; then
            while IFS= read -r DS_NAME; do
                echo "      Removing diagnostic setting: $DS_NAME"
                az monitor diagnostic-settings delete --resource "$RES_ID" --name "$DS_NAME" 2>/dev/null || true
            done <<< "$DIAG_SETTINGS"
        fi
    done <<< "$RESOURCES"
fi
echo "      ✓ Diagnostic settings cleaned up"

# ======================== Step 6: Remove VM Extensions ========================
echo ""
echo "[6/8] Removing VM extensions..."
for VM in "${VM_NAMES[@]}"; do
    EXTENSIONS=$(az vm extension list --resource-group "$RG_NAME" --vm-name "$VM" --query "[].name" -o tsv 2>/dev/null || true)
    if [ -n "$EXTENSIONS" ]; then
        while IFS= read -r EXT_NAME; do
            echo "      Removing extension $EXT_NAME from $VM"
            az vm extension delete --resource-group "$RG_NAME" --vm-name "$VM" --name "$EXT_NAME" --no-wait 2>/dev/null || true
        done <<< "$EXTENSIONS"
    fi
done
echo "      ✓ VM extensions cleaned up"

# ======================== Step 7: Delete Resource Group ========================
echo ""
echo "[7/8] Deleting resource group $RG_NAME..."
az group delete --name "$RG_NAME" --yes

echo "      ✓ Resource group deleted"

# ======================== Step 8: Verify Deletion ========================
echo ""
echo "[8/8] Verifying deletion..."
if az group show --name "$RG_NAME" &>/dev/null; then
    echo "      ⚠ Resource group still exists (deletion may still be in progress)"
    echo "      Monitor with: az group show --name $RG_NAME --query provisioningState -o tsv"
else
    echo "      ✓ Resource group confirmed deleted"
fi

echo ""
echo "============================================"
echo " Teardown Complete"
echo "============================================"
echo " All resources in $RG_NAME have been deleted."
echo " Billing for deallocated VMs stopped immediately."
echo " Resource group deletion removes all remaining resources."
echo "============================================"
