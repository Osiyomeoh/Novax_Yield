# 📋 Frontend .env Update Instructions

## ✅ Latest Deployment Contract Addresses

Deployment completed: **2026-01-12T19:11:44.686Z**
Network: **Mantle Sepolia Testnet** (Chain ID: 5001)

## 📝 Update Frontend .env File

Update your `trustbridge-frontend/.env` file with these addresses:

```env
# Contract Addresses - Updated from latest deployment
# Last updated: 2026-01-12T19:11:44.686Z
# Network: mantle_sepolia (Chain ID: 5001)

VITE_TRUST_TOKEN_CONTRACT_ADDRESS=0x8960Eb29508098E35f4368906bD68A3CE9725f2F
VITE_ASSET_NFT_CONTRACT_ADDRESS=0x8d0500fD3F4e8C8a3DF9a3ae1a719c31020F5300
VITE_CORE_ASSET_FACTORY_CONTRACT_ADDRESS=0x3d047913e2D9852D24b9758D0804eF4C081Cdc7a
VITE_VERIFICATION_REGISTRY_CONTRACT_ADDRESS=0x8f84aAD48D7870E9138DAaD4A8FE82Ca400Bd64e
VITE_AMC_MANAGER_ADDRESS=0x995a59e804c9c53Ca1fe7e529ccd6f0dA617e36A
VITE_POOL_MANAGER_CONTRACT_ADDRESS=0x56535279704A7936621b84FFD5e9Cc1eD3c4093a
VITE_TRUST_MARKETPLACE_CONTRACT_ADDRESS=0xd960d67Fd4E4736C93A1E15726034AB060Ee0846
VITE_TRUST_FAUCET_CONTRACT_ADDRESS=0x71a12347C96F9Bac3c5C7f14A5107fC65f8f4BEd

# Network Configuration
VITE_MANTLE_TESTNET_RPC_URL=https://rpc.sepolia.mantle.xyz
VITE_MANTLE_CHAIN_ID=5001
VITE_MANTLE_NETWORK=testnet
```

## 🚀 Quick Update Command

Run this command from the contracts directory:

```bash
cd trustbridge-backend/contracts
node scripts/update-frontend-env.js
```

Or manually update your `trustbridge-frontend/.env` file with the addresses above.

## 📋 Contract Details

| Contract | Address |
|----------|---------|
| **TrustToken** | `0x8960Eb29508098E35f4368906bD68A3CE9725f2F` |
| **AssetNFT** | `0x8d0500fD3F4e8C8a3DF9a3ae1a719c31020F5300` |
| **CoreAssetFactory** | `0x3d047913e2D9852D24b9758D0804eF4C081Cdc7a` |
| **VerificationRegistry** | `0x8f84aAD48D7870E9138DAaD4A8FE82Ca400Bd64e` |
| **AMCManager** | `0x995a59e804c9c53Ca1fe7e529ccd6f0dA617e36A` |
| **PoolManager** | `0x56535279704A7936621b84FFD5e9Cc1eD3c4093a` |
| **TRUSTMarketplace** | `0xd960d67Fd4E4736C93A1E15726034AB060Ee0846` |
| **TRUSTFaucet** | `0x71a12347C96F9Bac3c5C7f14A5107fC65f8f4BEd` |

## ✅ Post-Update Steps

1. **Restart your frontend development server:**
   ```bash
   cd trustbridge-frontend
   npm run dev
   ```

2. **Verify contract addresses in browser console:**
   - Open browser DevTools
   - Check console for contract address logs
   - Verify all addresses are loaded correctly

3. **Test contract interactions:**
   - Connect wallet
   - Try creating an asset
   - Test marketplace functionality

## 🔗 Network Configuration

- **Network**: Mantle Sepolia Testnet
- **Chain ID**: 5001
- **RPC URL**: https://rpc.sepolia.mantle.xyz
- **Explorer**: https://explorer.sepolia.mantle.xyz

## 📝 Notes

- All contracts deployed successfully ✅
- AMCManager linked to CoreAssetFactory ✅
- MINTER_ROLE granted on AssetNFT to CoreAssetFactory ✅
- MINTER_ROLE granted on TrustToken to TRUSTFaucet ✅


