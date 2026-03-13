#!/bin/bash
# ============================================================================
# Deploy Azure Disk Monitoring POC
# Subscription: e62428e7-08dd-4bc2-82e2-2c51586d9105
# ============================================================================
set -euo pipefail

SUBSCRIPTION_ID="e62428e7-08dd-4bc2-82e2-2c51586d9105"
LOCATION="eastus2"
DEPLOYMENT_NAME="diskmon-poc-$(date +%Y%m%d%H%M)"

echo "============================================"
echo " Azure Disk Monitoring POC — Deployment"
echo "============================================"
echo ""

# --- Pre-flight checks ---
echo "[1/6] Checking Azure CLI..."
az --version | head -1

echo "[2/6] Setting subscription..."
az account set --subscription "$SUBSCRIPTION_ID"
echo "Active subscription: $(az account show --query name -o tsv)"

# --- Prompt for secrets if not set ---
if [ -z "${ADMIN_SSH_KEY:-}" ]; then
    echo ""
    echo "[!] Provide the SSH public key for Linux VMs:"
    read -r ADMIN_SSH_KEY
fi

if [ -z "${ADMIN_PASSWORD:-}" ]; then
    echo ""
    echo "[!] Provide the admin password for Windows VM (min 12 chars, mixed case + number + special):"
    read -rs ADMIN_PASSWORD
    echo ""
fi

# --- Validate Bicep ---
echo "[3/6] Validating Bicep template..."
az deployment sub validate \
    --location "$LOCATION" \
    --template-file infra/main.bicep \
    --parameters infra/parameters/poc.bicepparam \
    --parameters adminSshPublicKey="$ADMIN_SSH_KEY" \
    --parameters adminPassword="$ADMIN_PASSWORD"

echo "    ✓ Validation passed"

# --- Deploy ---
echo "[4/6] Deploying infrastructure (this takes 10-15 minutes)..."
az deployment sub create \
    --name "$DEPLOYMENT_NAME" \
    --location "$LOCATION" \
    --template-file infra/main.bicep \
    --parameters infra/parameters/poc.bicepparam \
    --parameters adminSshPublicKey="$ADMIN_SSH_KEY" \
    --parameters adminPassword="$ADMIN_PASSWORD" \
    --verbose

echo "    ✓ Deployment complete"

# --- Output key info ---
echo "[5/6] Retrieving deployment outputs..."
RG_NAME=$(az deployment sub show --name "$DEPLOYMENT_NAME" --query "properties.outputs.resourceGroupName.value" -o tsv)
LAW_NAME=$(az deployment sub show --name "$DEPLOYMENT_NAME" --query "properties.outputs.logAnalyticsWorkspaceName.value" -o tsv)
GRAFANA_URL=$(az deployment sub show --name "$DEPLOYMENT_NAME" --query "properties.outputs.grafanaEndpoint.value" -o tsv)

echo ""
echo "============================================"
echo " Deployment Summary"
echo "============================================"
echo " Resource Group:    $RG_NAME"
echo " Log Analytics:     $LAW_NAME"
echo " Grafana URL:       $GRAFANA_URL"
echo " Subscription:      $SUBSCRIPTION_ID"
echo "============================================"

# --- Attach data disks to VMs ---
echo "[6/6] Attaching data disks to VMs..."

# vm-diskmon-dsv5-01: Premium SSD + Standard SSD
az vm disk attach --resource-group "$RG_NAME" --vm-name "vm-diskmon-dsv5-01" \
    --name "disk-diskmon-dsv5-01-premssd-256" --lun 0
az vm disk attach --resource-group "$RG_NAME" --vm-name "vm-diskmon-dsv5-01" \
    --name "disk-diskmon-dsv5-01-stdssd-256" --lun 1

# vm-diskmon-dsv5-02: Premium SSD + Standard HDD
az vm disk attach --resource-group "$RG_NAME" --vm-name "vm-diskmon-dsv5-02" \
    --name "disk-diskmon-dsv5-02-premssd-512" --lun 0
az vm disk attach --resource-group "$RG_NAME" --vm-name "vm-diskmon-dsv5-02" \
    --name "disk-diskmon-dsv5-02-stdhdd-512" --lun 1

# vm-diskmon-esv5-01: Premium SSD v2
az vm disk attach --resource-group "$RG_NAME" --vm-name "vm-diskmon-esv5-01" \
    --name "disk-diskmon-esv5-01-premssdv2-256" --lun 0

# vm-diskmon-lsv3-01: Ultra Disk + Premium SSD
az vm disk attach --resource-group "$RG_NAME" --vm-name "vm-diskmon-lsv3-01" \
    --name "disk-diskmon-lsv3-01-ultra-256" --lun 0
az vm disk attach --resource-group "$RG_NAME" --vm-name "vm-diskmon-lsv3-01" \
    --name "disk-diskmon-lsv3-01-premssd-256" --lun 1

# vm-diskmon-dsv5-03 (Windows): Premium SSD
az vm disk attach --resource-group "$RG_NAME" --vm-name "vm-diskmon-dsv5-03" \
    --name "disk-diskmon-dsv5-03-premssd-256" --lun 0

echo "    ✓ All data disks attached"
echo ""
echo "Deployment complete! Open Grafana at: $GRAFANA_URL"
