#!/bin/bash
# ============================================================================
# Fix Azure Container Apps Environment Variables for Notification Integration
# ============================================================================
#
# This script adds the missing INTERNAL_API_KEY and NOTIFICATION_SERVICE_URL
# environment variables to the deployed Azure Container Apps.
#
# ROOT CAUSE: Notifications work locally because the .env files set
# INTERNAL_API_KEY, but in the deployed Azure Container Apps these variables
# were never configured. Without INTERNAL_API_KEY:
#   1. Sender services (inventory/payment/authentication) silently skip
#      emitting events (emitNotificationEvent returns early)
#   2. Notification service returns 503 for any incoming internal requests
#
# PREREQUISITES:
#   - Azure CLI installed and logged in (az login)
#   - Access to the 'greencart-rg' resource group
#
# USAGE: bash scripts/fix-azure-notification-env.sh
# ============================================================================

set -euo pipefail

RESOURCE_GROUP="greencart-rg"
INTERNAL_API_KEY="greencart-internal-service-key-2026"

# The internal FQDN for Azure Container Apps in the same environment
# Format: http://<container-app-name>
NOTIFICATION_URL="http://greencart-notification"

echo "==========================================="
echo " Fixing Notification Environment Variables"
echo "==========================================="
echo ""

# --- 1. Authentication Service ---
echo "[1/4] Updating greencart-authentication..."
az containerapp update \
  --name greencart-authentication \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "INTERNAL_API_KEY=$INTERNAL_API_KEY" \
    "NOTIFICATION_SERVICE_URL=$NOTIFICATION_URL"
echo "  ✓ greencart-authentication updated"
echo ""

# --- 2. Inventory Service ---
echo "[2/4] Updating greencart-inventory..."
az containerapp update \
  --name greencart-inventory \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "INTERNAL_API_KEY=$INTERNAL_API_KEY" \
    "NOTIFICATION_SERVICE_URL=$NOTIFICATION_URL"
echo "  ✓ greencart-inventory updated"
echo ""

# --- 3. Payment Service ---
echo "[3/4] Updating greencart-payment..."
az containerapp update \
  --name greencart-payment \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "INTERNAL_API_KEY=$INTERNAL_API_KEY" \
    "NOTIFICATION_SERVICE_URL=$NOTIFICATION_URL"
echo "  ✓ greencart-payment updated"
echo ""

# --- 4. Notification Service (receiver) ---
echo "[4/4] Updating greencart-notification..."
az containerapp update \
  --name greencart-notification \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "INTERNAL_API_KEY=$INTERNAL_API_KEY"
echo "  ✓ greencart-notification updated"
echo ""

echo "==========================================="
echo " All services updated successfully!"
echo "==========================================="
echo ""
echo "The services will restart automatically with"
echo "the new environment variables. Notifications"
echo "should now work in the deployed environment."
echo ""
echo "To verify, try adding an item to the cart or"
echo "creating an inventory item and check the"
echo "notifications page."
