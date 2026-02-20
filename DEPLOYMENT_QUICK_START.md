# Quick Start: Deploy to Arbitrum One

## 1. Set Up Environment Variables

Add to `trustbridge-backend/contracts/.env`:

```bash
# Arbitrum RPC (already configured in hardhat.config.ts)
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Your deployer private key (KEEP SECRET!)
ARBITRUM_PRIVATE_KEY=your_private_key_here

# Optional: Platform configuration
PLATFORM_TREASURY=your_treasury_address  # Defaults to deployer
AMC_ADDRESS=your_amc_address              # Defaults to deployer
PLATFORM_FEE_BPS=100                     # 1% default
AMC_FEE_BPS=200                          # 2% default
```

## 2. Check Connection & Balance

```bash
cd trustbridge-backend/contracts
npx hardhat run scripts/novax/check-arbitrum-connection.ts --network arbitrum_one
```

This will verify:
- ✅ Network connection
- ✅ Your deployer address
- ✅ ETH balance (need at least 0.1 ETH)

## 3. Deploy Contracts

```bash
npx hardhat run scripts/novax/deploy-novax-arbitrum.ts --network arbitrum_one
```

## 4. Save Contract Addresses

After deployment, update:
- Frontend `.env` or Vercel: `VITE_NOVAX_*_ADDRESS`
- Backend `.env` or Render: `*_ADDRESS`

See `deployments/novax-arbitrum-42161.json` for all addresses.

---

**Need help?** See `ARBITRUM_DEPLOYMENT_GUIDE.md` for detailed instructions.
