# Vercel Environment Variables for Novax Yield

This document lists all required environment variables for the Vercel deployment at https://novax-yield.vercel.app/

## How to Add Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `novax-yield` (or `trustbridge-frontend`)
3. Go to **Settings** → **Environment Variables**
4. Add each variable below
5. Select **Production**, **Preview**, and **Development** environments
6. Click **Save**
7. **Redeploy** your application for changes to take effect

---

## Required Environment Variables

### 🔐 Authentication & API

```bash
# Privy App ID (Required for wallet authentication)
VITE_PRIVY_APP_ID=your_privy_app_id_here

# Backend API URL (Required for API calls)
VITE_API_URL=https://your-backend.onrender.com/api
```

### 🌐 Network Configuration (Arbitrum One)

```bash
# Network name
VITE_NETWORK=arbitrum_one

# Chain ID (Arbitrum One)
VITE_CHAIN_ID=42161

# RPC URL (use one of the provided endpoints)
VITE_RPC_URL=https://arb1.arbitrum.io/rpc
# Alternative RPC endpoints:
# - https://rpc.ankr.com/arbitrum
# - https://arbitrum.llamarpc.com

# Explorer URL
VITE_EXPLORER_URL=https://arbiscan.io
```

### 📝 Smart Contract Addresses (Novax Yield - Arbitrum One)

**Note**: Contract addresses need to be deployed to Arbitrum One first. Update these after deployment.

```bash
# RWA Factory (to be deployed)
VITE_NOVAX_RWA_FACTORY_ADDRESS=

# Receivable Factory (to be deployed)
VITE_NOVAX_RECEIVABLE_FACTORY_ADDRESS=

# Pool Manager (to be deployed)
VITE_NOVAX_POOL_MANAGER_ADDRESS=

# Marketplace (to be deployed)
VITE_NOVAX_MARKETPLACE_ADDRESS=

# NVX Token (to be deployed)
VITE_NVX_TOKEN_ADDRESS=

# USDC (Native USDC on Arbitrum One)
VITE_USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831

# Staking Vault (to be deployed)
VITE_STAKING_VAULT_ADDRESS=

# Vault Capacity Manager (to be deployed)
VITE_VAULT_CAPACITY_MANAGER_ADDRESS=
```

### 📋 Legacy Contract Addresses (Optional - for backward compatibility)

These are only needed if you're using legacy TrustBridge features:

```bash
# Legacy TrustBridge contracts (if needed)
VITE_TRUST_TOKEN_CONTRACT_ADDRESS=0x...
VITE_ASSET_NFT_CONTRACT_ADDRESS=0x...
VITE_CORE_ASSET_FACTORY_CONTRACT_ADDRESS=0x...
VITE_TRUST_ASSET_FACTORY_CONTRACT_ADDRESS=0x...
VITE_POOL_MANAGER_CONTRACT_ADDRESS=0x...
VITE_VERIFICATION_REGISTRY_CONTRACT_ADDRESS=0x...
VITE_TRUST_MARKETPLACE_CONTRACT_ADDRESS=0x...
VITE_TRUST_FAUCET_CONTRACT_ADDRESS=0x...
VITE_AMC_MANAGER_ADDRESS=0x...
```

---

## Quick Copy-Paste for Vercel Dashboard

Copy and paste these into Vercel's Environment Variables section:

### Production Environment Variables

```
VITE_PRIVY_APP_ID=your_privy_app_id_here
VITE_API_URL=https://your-backend.onrender.com/api
VITE_NETWORK=arbitrum_one
VITE_CHAIN_ID=42161
VITE_RPC_URL=https://arb1.arbitrum.io/rpc
VITE_EXPLORER_URL=https://arbiscan.io
VITE_NOVAX_RWA_FACTORY_ADDRESS=
VITE_NOVAX_RECEIVABLE_FACTORY_ADDRESS=
VITE_NOVAX_POOL_MANAGER_ADDRESS=
VITE_NOVAX_MARKETPLACE_ADDRESS=
VITE_NVX_TOKEN_ADDRESS=
VITE_USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
VITE_STAKING_VAULT_ADDRESS=
VITE_VAULT_CAPACITY_MANAGER_ADDRESS=
```

**Important**: Contract addresses need to be deployed to Arbitrum One first. Update the empty addresses above after deployment.

---

## Important Notes

1. **All variables must start with `VITE_`** - This is required for Vite to expose them to the frontend
2. **Replace placeholder values**:
   - `VITE_PRIVY_APP_ID` - Get from [Privy Dashboard](https://privy.io)
   - `VITE_API_URL` - Your backend API URL (e.g., Render, Railway, etc.)
3. **Contract addresses need to be deployed to Arbitrum One** - Update addresses after deployment
4. **After adding variables, redeploy** - Changes won't take effect until you redeploy

---

## Verification

After setting up environment variables, verify they're loaded correctly:

1. Open browser console on https://novax-yield.vercel.app/
2. Check for any error messages about missing environment variables
3. Try connecting a wallet - should work if `VITE_PRIVY_APP_ID` is set
4. Try viewing pools - should load if contract addresses are correct

---

## Deployment Info

- **Network**: Arbitrum One (Mainnet)
- **Chain ID**: 42161
- **RPC**: https://arb1.arbitrum.io/rpc (or use alternatives: https://rpc.ankr.com/arbitrum, https://arbitrum.llamarpc.com)
- **Explorer**: https://arbiscan.io
- **Last Updated**: February 15, 2026
- **Migration**: Migrated from Etherlink Shadownet to Arbitrum One
- **Contract Deployment**: Contracts need to be deployed to Arbitrum One

---

## Support

If you encounter issues:
1. Check Vercel build logs for errors
2. Verify all required variables are set
3. Ensure contract addresses match the deployment file
4. Check browser console for runtime errors


