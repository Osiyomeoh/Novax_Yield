#!/bin/bash

# Script to update .env file with Mantle Sepolia contract addresses
# Usage: ./update-env.sh

ENV_FILE=".env"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file from env.example..."
    cp env.example .env
fi

# Check if Mantle config already exists
if grep -q "VITE_MANTLE_CHAIN_ID" "$ENV_FILE"; then
    echo "⚠️  Mantle configuration already exists in .env"
    echo "Please manually update or remove existing Mantle config first"
    exit 1
fi

# Append Mantle configuration
echo "" >> "$ENV_FILE"
echo "# Mantle Network Configuration" >> "$ENV_FILE"
echo "VITE_MANTLE_NETWORK=testnet" >> "$ENV_FILE"
echo "VITE_MANTLE_CHAIN_ID=5003" >> "$ENV_FILE"
echo "VITE_MANTLE_TESTNET_RPC_URL=https://rpc.sepolia.mantle.xyz" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"
echo "# TrustBridge Contract Addresses (Mantle Sepolia)" >> "$ENV_FILE"
echo "VITE_TRUST_TOKEN_CONTRACT_ADDRESS=0xaCCf2efADb0F786C3FC08370a69b6462038D89df" >> "$ENV_FILE"
echo "VITE_ASSET_NFT_CONTRACT_ADDRESS=0x8720C1387AF5c6ff28C515FAb2387A95637f5800" >> "$ENV_FILE"
echo "VITE_CORE_ASSET_FACTORY_CONTRACT_ADDRESS=0x7C3cBa0E5012837987a3C1041F2629Df4C8216cE" >> "$ENV_FILE"
echo "VITE_TRUST_ASSET_FACTORY_CONTRACT_ADDRESS=0x55cdfcA8f6ac9C848A6EB8Df45F285db3a03276a" >> "$ENV_FILE"
echo "VITE_POOL_MANAGER_CONTRACT_ADDRESS=0x8bE406D7C4370b40F500E4dAF50cD84569e20C52" >> "$ENV_FILE"
echo "VITE_VERIFICATION_REGISTRY_CONTRACT_ADDRESS=0x81F1CbE353907E9af21fE1dd2A0e2C0850cb3Dd6" >> "$ENV_FILE"
echo "VITE_TRUST_MARKETPLACE_CONTRACT_ADDRESS=0x015850d19b61F1B574Ce38cB79d5d0513EDd7DCD" >> "$ENV_FILE"
echo "VITE_TRUST_FAUCET_CONTRACT_ADDRESS=0x81B7B35c75cF4b553CFb018bDd2e908812172986" >> "$ENV_FILE"

echo "✅ .env file updated successfully!"
echo ""
echo "📋 Added configuration:"
echo "   - Mantle Network settings (Chain ID: 5003)"
echo "   - All 8 contract addresses"
echo ""
echo "📝 Next steps:"
echo "   1. Restart your dev server if it's running"
echo "   2. Verify configuration in browser console"
echo "   3. Connect wallet to Mantle Sepolia network"

