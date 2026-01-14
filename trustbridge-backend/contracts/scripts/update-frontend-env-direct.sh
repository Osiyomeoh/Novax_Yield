#!/bin/bash

# Direct script to update frontend .env with new contract addresses
# Run from: trustbridge-backend/contracts

cd "$(dirname "$0")/../../../trustbridge-frontend"

if [ ! -f ".env" ]; then
    echo "❌ .env file not found at: $(pwd)/.env"
    echo "   Please create .env file first (copy from env.example)"
    exit 1
fi

echo "🔄 Updating frontend .env file with new contract addresses..."

# Backup existing .env
cp .env .env.backup.$(date +%s)
echo "✅ Backed up existing .env file"

# New contract addresses from latest deployment
TRUST_TOKEN="0x8960Eb29508098E35f4368906bD68A3CE9725f2F"
ASSET_NFT="0x8d0500fD3F4e8C8a3DF9a3ae1a719c31020F5300"
CORE_ASSET_FACTORY="0x3d047913e2D9852D24b9758D0804eF4C081Cdc7a"
VERIFICATION_REGISTRY="0x8f84aAD48D7870E9138DAaD4A8FE82Ca400Bd64e"
AMC_MANAGER="0x995a59e804c9c53Ca1fe7e529ccd6f0dA617e36A"
POOL_MANAGER="0x56535279704A7936621b84FFD5e9Cc1eD3c4093a"
TRUST_MARKETPLACE="0xd960d67Fd4E4736C93A1E15726034AB060Ee0846"
TRUST_FAUCET="0x71a12347C96F9Bac3c5C7f14A5107fC65f8f4BEd"

# Update contract addresses using sed (works on macOS)
# Note: TRUST_ASSET_FACTORY and TRUST_TOKEN_EXCHANGE are not in new deployment (removed as unnecessary)

sed -i.bak "s|VITE_TRUST_TOKEN_CONTRACT_ADDRESS=.*|VITE_TRUST_TOKEN_CONTRACT_ADDRESS=$TRUST_TOKEN|g" .env
sed -i.bak "s|VITE_ASSET_NFT_CONTRACT_ADDRESS=.*|VITE_ASSET_NFT_CONTRACT_ADDRESS=$ASSET_NFT|g" .env
sed -i.bak "s|VITE_CORE_ASSET_FACTORY_CONTRACT_ADDRESS=.*|VITE_CORE_ASSET_FACTORY_CONTRACT_ADDRESS=$CORE_ASSET_FACTORY|g" .env
sed -i.bak "s|VITE_VERIFICATION_REGISTRY_CONTRACT_ADDRESS=.*|VITE_VERIFICATION_REGISTRY_CONTRACT_ADDRESS=$VERIFICATION_REGISTRY|g" .env
sed -i.bak "s|VITE_AMC_MANAGER_ADDRESS=.*|VITE_AMC_MANAGER_ADDRESS=$AMC_MANAGER|g" .env
sed -i.bak "s|VITE_POOL_MANAGER_CONTRACT_ADDRESS=.*|VITE_POOL_MANAGER_CONTRACT_ADDRESS=$POOL_MANAGER|g" .env
sed -i.bak "s|VITE_TRUST_MARKETPLACE_CONTRACT_ADDRESS=.*|VITE_TRUST_MARKETPLACE_CONTRACT_ADDRESS=$TRUST_MARKETPLACE|g" .env
sed -i.bak "s|VITE_TRUST_FAUCET_CONTRACT_ADDRESS=.*|VITE_TRUST_FAUCET_CONTRACT_ADDRESS=$TRUST_FAUCET|g" .env

# Update network config
sed -i.bak "s|VITE_MANTLE_CHAIN_ID=.*|VITE_MANTLE_CHAIN_ID=5001|g" .env
sed -i.bak "s|VITE_MANTLE_TESTNET_RPC_URL=.*|VITE_MANTLE_TESTNET_RPC_URL=https://rpc.sepolia.mantle.xyz|g" .env
sed -i.bak "s|VITE_MANTLE_NETWORK=.*|VITE_MANTLE_NETWORK=testnet|g" .env

# Clean up backup files
rm -f .env.bak

echo ""
echo "✅ Frontend .env file updated successfully!"
echo ""
echo "📋 Updated addresses:"
echo "   TrustToken: $TRUST_TOKEN"
echo "   AssetNFT: $ASSET_NFT"
echo "   CoreAssetFactory: $CORE_ASSET_FACTORY"
echo "   VerificationRegistry: $VERIFICATION_REGISTRY"
echo "   AMCManager: $AMC_MANAGER"
echo "   PoolManager: $POOL_MANAGER"
echo "   TRUSTMarketplace: $TRUST_MARKETPLACE"
echo "   TRUSTFaucet: $TRUST_FAUCET"
echo ""
echo "📝 Note: TRUST_ASSET_FACTORY and TRUST_TOKEN_EXCHANGE were not deployed (removed as unnecessary)"
echo "   If these exist in your .env, they will remain unchanged (won't be used)"
echo ""
echo "🚀 Next steps:"
echo "   1. Restart your frontend dev server: npm run dev"
echo "   2. Verify addresses in browser console"


