#!/bin/bash
# ============================================================================
# Fix Azure Container Apps Environment Variables for Notification Integration
# ============================================================================
#
# This script adds the missing INTERNAL_API_KEY and NOTIFICATION_SERVICE_URL
# environment variables to the deployed Azure Container Apps.
#
# USAGE: bash scripts/fix-azure-notification-env.sh
# ============================================================================

set -euo pipefail

RESOURCE_GROUP="greencart-rg"
INTERNAL_API_KEY="greencart-internal-service-key-2026"
NOTIFICATION_URL="http://greencart-notification"

echo "==========================================="
echo " Fixing Notification Environment Variables"
echo "==========================================="

# --- 1. Authentication Service ---
echo "[1/4] Updating greencart-authentication..."
az containerapp update \
  --name greencart-authentication \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "INTERNAL_API_KEY=$INTERNAL_API_KEY" \
    "NOTIFICATION_SERVICE_URL=$NOTIFICATION_URL"

# --- 2. Inventory Service ---
echo "[2/4] Updating greencart-inventory..."
az containerapp update \
  --name greencart-inventory \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "INTERNAL_API_KEY=$INTERNAL_API_KEY" \
    "NOTIFICATION_SERVICE_URL=$NOTIFICATION_URL"

# --- 3. Payment Service ---
echo "[3/4] Updating greencart-payment..."
az containerapp update \
  --name greencart-payment \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "INTERNAL_API_KEY=$INTERNAL_API_KEY" \
    "NOTIFICATION_SERVICE_URL=$NOTIFICATION_URL"

# --- 4. Notification Service ---
echo "[4/4] Updating greencart-notification..."
az containerapp update \
  --name greencart-notification \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    "INTERNAL_API_KEY=$INTERNAL_API_KEY"

echo "==========================================="
echo " All services updated successfully!"
echo "==========================================="
