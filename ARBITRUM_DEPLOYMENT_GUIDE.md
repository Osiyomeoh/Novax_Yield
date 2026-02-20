# Arbitrum One Deployment Guide

This guide will help you deploy Novax Yield contracts to Arbitrum One.

## Prerequisites

1. **ETH on Arbitrum One** - You need ETH for gas fees (recommended: at least 0.1 ETH)
2. **Private Key** - Your deployer wallet private key
3. **Environment Variables** - Set up in `.env` file

## Step 1: Set Up Environment Variables

Create or update `.env` file in `trustbridge-backend/contracts/`:

```bash
# Arbitrum RPC URL
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Deployer Private Key (KEEP SECRET!)
ARBITRUM_PRIVATE_KEY=your_private_key_here

# Optional: Platform Configuration
PLATFORM_TREASURY=your_treasury_address
AMC_ADDRESS=your_amc_address
PLATFORM_FEE_BPS=100  # 1% in basis points
AMC_FEE_BPS=200       # 2% in basis points

# USDC Address (native USDC on Arbitrum)
USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831

# Optional: Chainlink Addresses (if using Chainlink features)
# ARBITRUM_ETH_USD_FEED=0x...
# ARBITRUM_BTC_USD_FEED=0x...
# ARBITRUM_USDC_USD_FEED=0x...
# ARBITRUM_LINK_USD_FEED=0x...
```

## Step 2: Verify Your Wallet Has ETH

Check your balance on Arbitrum One:
- Use [Arbiscan](https://arbiscan.io) to check your address
- Or use a wallet like MetaMask to view your Arbitrum balance

**Minimum recommended**: 0.1 ETH for deployment

## Step 3: Deploy Contracts

Run the deployment script:

```bash
cd trustbridge-backend/contracts
npx hardhat run scripts/novax/deploy-novax-arbitrum.ts --network arbitrum_one
```

## Step 4: Save Deployment Addresses

After deployment, the script will:
1. Save addresses to `deployments/novax-arbitrum-42161.json`
2. Print all contract addresses to console

**IMPORTANT**: Copy these addresses immediately!

## Step 5: Update Environment Variables

### Frontend (`.env` or Vercel)

```bash
VITE_NOVAX_RWA_FACTORY_ADDRESS=<deployed_address>
VITE_NOVAX_RECEIVABLE_FACTORY_ADDRESS=<deployed_address>
VITE_NOVAX_POOL_MANAGER_ADDRESS=<deployed_address>
VITE_NVX_TOKEN_ADDRESS=<deployed_address>
VITE_USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
```

### Backend (`.env` or Render)

```bash
RWA_FACTORY_ADDRESS=<deployed_address>
RECEIVABLE_FACTORY_ADDRESS=<deployed_address>
POOL_MANAGER_ADDRESS=<deployed_address>
NVX_TOKEN_ADDRESS=<deployed_address>
USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
```

## Step 6: Verify Contracts (Optional)

To verify contracts on Arbiscan:

1. Get Arbiscan API key from [arbiscan.io/apis](https://arbiscan.io/apis)
2. Add to `.env`: `ARBISCAN_API_KEY=your_api_key`
3. Verify each contract:

```bash
npx hardhat verify --network arbitrum_one <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

For example, for Pool Manager:
```bash
npx hardhat verify --network arbitrum_one <POOL_MANAGER_ADDRESS> \
  <USDC_ADDRESS> \
  <NVX_TOKEN_ADDRESS> \
  <PLATFORM_TREASURY> \
  <AMC_ADDRESS> \
  <PLATFORM_FEE_BPS> \
  <AMC_FEE_BPS>
```

## Deployment Order

The script deploys contracts in this order:
1. USDC (uses existing native USDC)
2. NVX Token
3. RWA Factory
4. Receivable Factory
5. Exporter Registry
6. Pool Manager
7. Price Manager
8. VRF Module (optional)
9. Verification Module (optional)
10. Fallback Library

Then links all contracts together.

## Troubleshooting

### Error: Insufficient funds
- **Solution**: Add more ETH to your deployer wallet on Arbitrum One

### Error: Nonce too high
- **Solution**: Wait a few minutes and try again, or reset your wallet nonce

### Error: Contract deployment failed
- **Solution**: Check gas price, ensure RPC endpoint is working, verify contract code compiles

### Contracts not linking
- **Solution**: Check deployment addresses are correct, ensure all transactions confirmed

## Gas Estimates

Approximate gas costs (may vary):
- NVX Token: ~2M gas
- RWA Factory: ~3M gas
- Receivable Factory: ~3M gas
- Pool Manager: ~4M gas
- Total: ~15-20M gas

At current Arbitrum gas prices (~0.1 gwei), total cost: ~0.001-0.002 ETH

## Next Steps After Deployment

1. ✅ Update frontend environment variables
2. ✅ Update backend environment variables
3. ✅ Test contract interactions
4. ✅ Verify contracts on Arbiscan
5. ✅ Test full flow (create receivable → verify → create pool → invest)

## Support

If you encounter issues:
1. Check deployment logs for specific errors
2. Verify all environment variables are set correctly
3. Ensure sufficient ETH balance
4. Check Arbitrum network status

---

**Network**: Arbitrum One (Mainnet)
**Chain ID**: 42161
**Explorer**: https://arbiscan.io
**RPC**: https://arb1.arbitrum.io/rpc

