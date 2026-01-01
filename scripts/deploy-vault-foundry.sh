#!/bin/bash

# Deploy WinnerVault using Foundry
# Make sure you have Foundry installed: curl -L https://foundry.paradigm.xyz | bash

echo "🚀 Deploying WinnerVault contract with Foundry..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Create a .env file with:"
    echo "  MONAD_RPC_URL=your_rpc_url"
    echo "  DEPLOYER_PRIVATE_KEY=your_private_key"
    exit 1
fi

# Load environment variables
source .env

# Check if required variables are set
if [ -z "$MONAD_RPC_URL" ]; then
    echo "❌ MONAD_RPC_URL not set in .env"
    exit 1
fi

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "❌ DEPLOYER_PRIVATE_KEY not set in .env"
    exit 1
fi

echo "📝 Deploying with Foundry..."
echo ""

# Deploy contract
DEPLOYMENT_OUTPUT=$(forge create --rpc-url $MONAD_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  contracts/WinnerVault.sol:WinnerVault \
  --legacy)

echo "$DEPLOYMENT_OUTPUT"

# Extract contract address
CONTRACT_ADDRESS=$(echo "$DEPLOYMENT_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ Deployment failed or address not found"
    exit 1
fi

echo ""
echo "============================================================"
echo "📋 ADD THIS TO YOUR .env.local FILE:"
echo "============================================================"
echo "NEXT_PUBLIC_WINNER_VAULT_ADDRESS=$CONTRACT_ADDRESS"
echo "============================================================"
echo ""
echo "✅ Deployment successful!"
echo "📍 Contract address: $CONTRACT_ADDRESS"
echo ""
echo "✨ Next steps:"
echo "1. Update NEXT_PUBLIC_WINNER_VAULT_ADDRESS in .env.local"
echo "2. Verify contract on block explorer"
echo "3. Test deposits and withdrawals"
