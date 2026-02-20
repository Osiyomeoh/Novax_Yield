# Migration from Etherlink to Arbitrum One

This document outlines the migration of Novax Yield from Etherlink Shadownet to Arbitrum One.

## ✅ Completed Changes

### Frontend (`trustbridge-frontend`)

1. **Network Configuration** (`src/config/contracts.ts`)
   - Updated network config from Etherlink Shadownet to Arbitrum One
   - Chain ID: `127823` → `42161`
   - RPC URL: `https://node.shadownet.etherlink.com` → `https://arb1.arbitrum.io/rpc`
   - Explorer: `https://shadownet.explorer.etherlink.com` → `https://arbiscan.io`
   - Updated USDC address to native Arbitrum USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`

2. **Contract Service** (`src/services/novaxContractService.ts`)
   - Renamed `ensureEtherlinkNetwork()` → `ensureArbitrumNetwork()`
   - Updated chain ID from `0x1F2EF` (127823) to `0xA4B1` (42161)
   - Updated network name: "Etherlink Shadownet" → "Arbitrum One"
   - Updated native currency: XTZ → ETH
   - Added multiple RPC endpoints with fallback support:
     - `https://arb1.arbitrum.io/rpc` (primary)
     - `https://rpc.ankr.com/arbitrum` (fallback)
     - `https://arbitrum.llamarpc.com` (fallback)

3. **Environment Variables**
   - Created `env.novax.example` with Arbitrum configuration
   - Updated Vercel environment variables documentation

### Backend (`trustbridge-backend`)

1. **Hardhat Configuration** (`contracts/hardhat.config.ts`)
   - Added `arbitrum_one` network configuration
   - Chain ID: `42161`
   - RPC URL: `https://arb1.arbitrum.io/rpc`
   - Updated verification config for Arbiscan
   - Removed Etherlink-specific network configs

2. **Environment Variables** (`env.example`)
   - Updated blockchain section from Etherlink to Arbitrum One
   - Changed `ETHERLINK_RPC_URL` → `ARBITRUM_RPC_URL`
   - Changed `ETHERLINK_CHAIN_ID` → `ARBITRUM_CHAIN_ID`
   - Updated USDC address to native Arbitrum USDC
   - Added `ARBITRUM_PRIVATE_KEY` for deployment

## 📋 Next Steps (Required)

### 1. Deploy Contracts to Arbitrum One

Contracts need to be deployed to Arbitrum One. Use the Hardhat deployment script:

```bash
cd trustbridge-backend/contracts
npx hardhat run scripts/novax/deploy-novax-etherlink.ts --network arbitrum_one
```

**Note**: You may need to create a new deployment script or update the existing one to work with Arbitrum.

### 2. Update Contract Addresses

After deployment, update contract addresses in:

- **Frontend**: Environment variables (`.env` or Vercel)
  - `VITE_NOVAX_RWA_FACTORY_ADDRESS`
  - `VITE_NOVAX_RECEIVABLE_FACTORY_ADDRESS`
  - `VITE_NOVAX_POOL_MANAGER_ADDRESS`
  - `VITE_NOVAX_MARKETPLACE_ADDRESS`
  - `VITE_NVX_TOKEN_ADDRESS`
  - `VITE_STAKING_VAULT_ADDRESS`
  - `VITE_VAULT_CAPACITY_MANAGER_ADDRESS`

- **Backend**: Environment variables (`.env` or Render)
  - `RWA_FACTORY_ADDRESS`
  - `RECEIVABLE_FACTORY_ADDRESS`
  - `POOL_MANAGER_ADDRESS`
  - `NVX_TOKEN_ADDRESS`

### 3. Get Arbiscan API Key (Optional)

For contract verification on Arbiscan:

1. Get API key from [Arbiscan](https://arbiscan.io/apis)
2. Add to `.env`: `ARBISCAN_API_KEY=your_api_key`
3. Verify contracts: `npx hardhat verify --network arbitrum_one <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>`

### 4. Update Environment Variables

#### Frontend (Vercel)
Update all environment variables in Vercel dashboard:
- `VITE_NETWORK=arbitrum_one`
- `VITE_CHAIN_ID=42161`
- `VITE_RPC_URL=https://arb1.arbitrum.io/rpc`
- `VITE_EXPLORER_URL=https://arbiscan.io`
- Update all contract addresses after deployment

#### Backend (Render)
Update environment variables in Render dashboard:
- `ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc`
- `ARBITRUM_CHAIN_ID=42161`
- Update all contract addresses after deployment

### 5. Test Deployment

1. **Test Network Connection**
   - Verify wallet can connect to Arbitrum One
   - Check RPC endpoint is accessible

2. **Test Contract Interactions**
   - Create receivable
   - Verify receivable
   - Create pool
   - Invest in pool
   - Record payment
   - Distribute yield

3. **Test UI Components**
   - Admin Dashboard
   - Pool Marketplace
   - Pool Detail Page
   - Receivables Dashboard

## 🔄 Network Differences

| Feature | Etherlink Shadownet | Arbitrum One |
|---------|-------------------|--------------|
| Chain ID | 127823 | 42161 |
| Native Currency | XTZ | ETH |
| RPC Endpoint | https://node.shadownet.etherlink.com | https://arb1.arbitrum.io/rpc |
| Explorer | https://shadownet.explorer.etherlink.com | https://arbiscan.io |
| Network Type | Testnet | Mainnet |
| USDC Address | MockUSDC (0x1557...) | Native USDC (0xaf88...) |

## 📚 Resources

- **Arbitrum Docs**: https://docs.arbitrum.io/
- **Arbitrum SDK**: https://github.com/OffchainLabs/arbitrum-sdk
- **Arbiscan**: https://arbiscan.io
- **RPC Endpoints**:
  - https://arb1.arbitrum.io/rpc
  - https://rpc.ankr.com/arbitrum
  - https://arbitrum.llamarpc.com

## ⚠️ Important Notes

1. **Contract Addresses**: All contract addresses are currently empty/placeholder. They must be populated after deployment.

2. **USDC**: Using native USDC on Arbitrum One (`0xaf88d065e77c8cC2239327C5EDb3A432268e5831`), not a mock token.

3. **Gas Costs**: Arbitrum One is a mainnet, so all transactions will cost real ETH. Ensure sufficient ETH balance for deployment and operations.

4. **Migration Path**: If you have existing data on Etherlink, you'll need to:
   - Export data from Etherlink contracts
   - Recreate receivables/pools on Arbitrum (if needed)
   - Update user balances/positions

5. **Testing**: Consider deploying to Arbitrum Sepolia testnet first for testing before mainnet deployment.

## 🚀 Deployment Checklist

- [ ] Deploy contracts to Arbitrum One
- [ ] Update contract addresses in frontend `.env` / Vercel
- [ ] Update contract addresses in backend `.env` / Render
- [ ] Verify contracts on Arbiscan (optional)
- [ ] Test network connection
- [ ] Test contract interactions
- [ ] Test UI components
- [ ] Update documentation
- [ ] Notify users of migration

---

**Migration Date**: February 15, 2026
**Status**: Configuration Complete - Awaiting Contract Deployment


