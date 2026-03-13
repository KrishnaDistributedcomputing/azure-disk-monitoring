#!/bin/bash
# ============================================================================
# Run Benchmark Suite Across All Linux VMs
# ============================================================================
set -euo pipefail

SUBSCRIPTION_ID="e62428e7-08dd-4bc2-82e2-2c51586d9105"
RG_NAME="rg-diskmon-poc-eastus2"
BENCHMARK_DIR="/opt/benchmarks"

# VM list: name → data disk device(s)
declare -A VM_DISKS
VM_DISKS["vm-diskmon-dsv5-01"]="/dev/sdc /dev/sdd"
VM_DISKS["vm-diskmon-dsv5-02"]="/dev/sdc /dev/sdd"
VM_DISKS["vm-diskmon-esv5-01"]="/dev/sdc"
VM_DISKS["vm-diskmon-lsv3-01"]="/dev/sdc /dev/sdd"

# FIO profiles to run
FIO_PROFILES="seq-read-1m seq-write-1m rand-read-4k rand-write-4k rand-rw-4k-70-30 lat-probe-4k"

echo "============================================"
echo " Disk Benchmark Suite"
echo "============================================"

az account set --subscription "$SUBSCRIPTION_ID"

for VM_NAME in "${!VM_DISKS[@]}"; do
    echo ""
    echo "--- $VM_NAME ---"
    
    # Get VM public IP (or use Bastion/serial console)
    VM_IP=$(az vm list-ip-addresses --resource-group "$RG_NAME" --name "$VM_NAME" \
        --query "[0].virtualMachine.network.publicIpAddresses[0].ipAddress" -o tsv 2>/dev/null || echo "")
    
    if [ -z "$VM_IP" ]; then
        echo "  [!] No public IP found for $VM_NAME — use az vm run-command instead"
        
        for DISK_DEV in ${VM_DISKS[$VM_NAME]}; do
            DISK_LABEL=$(basename "$DISK_DEV")
            
            for PROFILE in $FIO_PROFILES; do
                echo "  Running: $PROFILE on $DISK_DEV"
                
                # Run via az vm run-command
                az vm run-command invoke \
                    --resource-group "$RG_NAME" \
                    --name "$VM_NAME" \
                    --command-id RunShellScript \
                    --scripts "
                        echo '{\"VMName\": \"$VM_NAME\", \"Disk\": \"$DISK_DEV\", \"Profile\": \"$PROFILE\", \"Status\": \"running\"}' > /tmp/bench_status.json
                        fio $BENCHMARK_DIR/fio/${PROFILE}.fio --filename=$DISK_DEV --output=$BENCHMARK_DIR/results/${PROFILE}_${DISK_LABEL}.json --output-format=json
                        echo '{\"VMName\": \"$VM_NAME\", \"Disk\": \"$DISK_DEV\", \"Profile\": \"$PROFILE\", \"Status\": \"completed\"}' > /tmp/bench_status.json
                    " --output table 2>/dev/null || echo "  [!] Failed: $PROFILE on $DISK_DEV"
                
                # Cool-down between profiles
                echo "  Cooldown 60s..."
                sleep 60
            done
        done
    else
        echo "  VM IP: $VM_IP"
        echo "  [SSH mode] — run benchmarks via SSH"
        
        for DISK_DEV in ${VM_DISKS[$VM_NAME]}; do
            DISK_LABEL=$(basename "$DISK_DEV")
            
            for PROFILE in $FIO_PROFILES; do
                echo "  Running: $PROFILE on $DISK_DEV"
                ssh -o StrictHostKeyChecking=no "azureadmin@$VM_IP" \
                    "sudo mkdir -p $BENCHMARK_DIR/results && sudo fio $BENCHMARK_DIR/fio/${PROFILE}.fio --filename=$DISK_DEV --output=$BENCHMARK_DIR/results/${PROFILE}_${DISK_LABEL}.json --output-format=json"
                
                echo "  Cooldown 60s..."
                sleep 60
            done
        done
    fi
done

echo ""
echo "============================================"
echo " Benchmark suite complete!"
echo "============================================"
