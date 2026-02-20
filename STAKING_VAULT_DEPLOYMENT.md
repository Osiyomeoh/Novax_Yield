# Staking Vault Deployment Guide

## Quick Deploy

The staking vault deployment script is ready. Run it with:

```bash
cd trustbridge-backend/contracts
npx hardhat run scripts/novax/deploy-staking-vault-arbitrum-sepolia.ts --network arbitrum_sepolia
```

## Prerequisites

1. Make sure you have your private key set in `.env`:
   ```
   ARBITRUM_PRIVATE_KEY=your_private_key_here
   ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   ```

2. Ensure you have ETH on Arbitrum Sepolia for gas fees

## What Gets Deployed

1. **NovaxStakingVault** - Main staking contract
2. **VaultCapacityManager** - Manages vault capacity and waitlists

## Configuration

The script will automatically:
- Deploy both contracts
- Configure the staking vault with the capacity manager
- Grant POOL_MANAGER_ROLE to the existing PoolManager
- Grant ADMIN_ROLE to the deployer
- Update the PoolManager to use the new staking vault

## After Deployment

The script will output the deployed addresses. Add them to your frontend `.env`:

```
VITE_STAKING_VAULT_ADDRESS=<deployed_address>
VITE_VAULT_CAPACITY_MANAGER_ADDRESS=<deployed_address>
```

Then restart your frontend to use the new contracts.

## Existing Contract Addresses Used

- USDC: `0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D` (MockUSDC)
- NVX Token: `0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff`
- Pool Manager: `0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5`

These can be overridden via environment variables if needed.


