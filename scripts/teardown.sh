#!/bin/bash
# ============================================================================
# Teardown Azure Disk Monitoring POC
# ============================================================================
set -euo pipefail

SUBSCRIPTION_ID="e62428e7-08dd-4bc2-82e2-2c51586d9105"
RG_NAME="rg-diskmon-poc-eastus2"

echo "============================================"
echo " Azure Disk Monitoring POC — Teardown"
echo "============================================"
echo ""
echo "WARNING: This will DELETE the resource group and ALL resources within it:"
echo "  Resource Group: $RG_NAME"
echo "  Subscription:   $SUBSCRIPTION_ID"
echo ""
read -p "Type 'yes' to confirm deletion: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

az account set --subscription "$SUBSCRIPTION_ID"

echo "Deleting resource group $RG_NAME..."
az group delete --name "$RG_NAME" --yes --no-wait

echo "Resource group deletion initiated (running in background)."
echo "Monitor with: az group show --name $RG_NAME --query provisioningState -o tsv"
