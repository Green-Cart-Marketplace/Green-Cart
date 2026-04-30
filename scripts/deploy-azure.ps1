# Green-Cart Azure Deployment Script
# This script provisions infrastructure and deploys all microservices to Azure Container Apps.

$config = Get-Content -Raw -Path "$PSScriptRoot/azure-config.json" | ConvertFrom-Json

Write-Host "--- Starting Azure Deployment for Green-Cart ---" -ForegroundColor Cyan

# 1. Login & Set Subscription (Manual step usually, but check if logged in)
$account = az account show --query "name" -o tsv
if ($null -eq $account) {
    Write-Error "Please run 'az login' first."
    exit
}

# 2. Provision Core Infrastructure
Write-Host "Step 1: Provisioning Infrastructure..." -ForegroundColor Yellow

az group create --name $config.resourceGroup --location $config.location

Write-Host "Creating Azure Container Registry: $($config.acrName)..."
az acr create --resource-group $config.resourceGroup --name $config.acrName --sku Basic --admin-enabled true

$acrServer = az acr show --name $config.acrName --query "loginServer" -o tsv
# az acr login --name $config.acrName # Not needed for az acr build

Write-Host "Creating Container Apps Environment: $($config.acaEnvName)..."
az containerapp env create --name $config.acaEnvName --resource-group $config.resourceGroup --location $config.location

# 3. Deploy Backend Services
$services = @("authentication", "inventory", "notification", "payment")
$fqdns = @{}

foreach ($service in $services) {
    Write-Host "Deploying Service: $service..." -ForegroundColor Yellow
    
    # Build & Push using Azure Container Registry (No local Docker required)
    Write-Host "Building image in Azure for $service..."
    az acr build --registry $config.acrName --image "$($service):latest" "./$service"

    # Create/Update Container App
    # Note: We use public ingress for now for ease of testing, but in production, some should be internal.
    $app = az containerapp create `
        --name "greencart-$service" `
        --resource-group $config.resourceGroup `
        --environment $config.acaEnvName `
        --image "$acrServer/$($service):latest" `
        --target-port (if ($service -eq "notification") { 5005 } else { if ($service -eq "authentication") { 8081 } elseif ($service -eq "inventory") { 8082 } else { 8083 } }) `
        --ingress external `
        --registry-server $acrServer `
        --registry-username $config.acrName `
        --registry-password (az acr credential show --name $config.acrName --query "passwords[0].value" -o tsv) `
        --query "properties.configuration.ingress.fqdn" -o tsv

    $fqdns[$service] = "https://$app"
    Write-Host "Deployed $service at: $($fqdns[$service])" -ForegroundColor Green
}

# 4. Deploy API Gateway
Write-Host "Deploying API Gateway..." -ForegroundColor Yellow
Write-Host "Building API Gateway image in Azure..."
az acr build --registry $config.acrName --image "api-gateway:latest" "./api-gateway"

$gatewayApp = az containerapp create `
    --name "greencart-api-gateway" `
    --resource-group $config.resourceGroup `
    --environment $config.acaEnvName `
    --image "$acrServer/api-gateway:latest" `
    --target-port 8080 `
    --ingress external `
    --registry-server $acrServer `
    --registry-username $config.acrName `
    --registry-password (az acr credential show --name $config.acrName --query "passwords[0].value" -o tsv) `
    --env-vars `
        "AUTH_SERVICE_URL=$($fqdns['authentication'])" `
        "INVENTORY_SERVICE_URL=$($fqdns['inventory'])" `
        "PAYMENT_SERVICE_URL=$($fqdns['payment'])" `
        "NOTIFICATION_SERVICE_URL=$($fqdns['notification'])" `
        "PORT=8080" `
        "NODE_ENV=production" `
    --query "properties.configuration.ingress.fqdn" -o tsv

$gatewayUrl = "https://$gatewayApp"
Write-Host "API Gateway deployed at: $gatewayUrl" -ForegroundColor Green

# 5. Deploy Frontend
Write-Host "Deploying Frontend..." -ForegroundColor Yellow

# Build in Azure with NEXT_PUBLIC_API_BASE_URL as build-arg
Write-Host "Building Frontend image in Azure..."
az acr build --registry $config.acrName --image "frontend:latest" "./frontend" --build-arg NEXT_PUBLIC_API_BASE_URL=$gatewayUrl

$frontendApp = az containerapp create `
    --name "greencart-frontend" `
    --resource-group $config.resourceGroup `
    --environment $config.acaEnvName `
    --image "$acrServer/frontend:latest" `
    --target-port 3000 `
    --ingress external `
    --registry-server $acrServer `
    --registry-username $config.acrName `
    --registry-password (az acr credential show --name $config.acrName --query "passwords[0].value" -o tsv) `
    --env-vars "NEXT_PUBLIC_API_BASE_URL=$gatewayUrl" `
    --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "Frontend deployed at: https://$frontendApp" -ForegroundColor Cyan
Write-Host "--- Deployment Complete ---" -ForegroundColor Cyan
