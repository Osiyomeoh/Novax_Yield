# Arbitrum Sepolia Deployment Summary

**Deployment Date**: February 18, 2026  
**Network**: Arbitrum Sepolia (Testnet)  
**Chain ID**: 421614  
**Deployer**: `0x00224492F572944500AB4eb91E413cfA34770c60`

## ✅ Successfully Deployed Contracts

| Contract | Address | Explorer |
|----------|---------|----------|
| **MockUSDC** | `0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D` | [View](https://sepolia.arbiscan.io/address/0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D) |
| **NVX Token** | `0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff` | [View](https://sepolia.arbiscan.io/address/0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff) |
| **RWA Factory** | `0x83E58aaa63B9437ec39985Eb913CABA27f85A442` | [View](https://sepolia.arbiscan.io/address/0x83E58aaa63B9437ec39985Eb913CABA27f85A442) |
| **Receivable Factory** | `0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b` | [View](https://sepolia.arbiscan.io/address/0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b) |
| **Exporter Registry** | `0x9Fa386f4367be09881745C3F5760bf605604A04B` | [View](https://sepolia.arbiscan.io/address/0x9Fa386f4367be09881745C3F5760bf605604A04B) |
| **Pool Manager** | `0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5` | [View](https://sepolia.arbiscan.io/address/0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5) |
| **Price Manager** | `0xCDd8a581C6958bc4e463cf9B77da396f6d7417C0` | [View](https://sepolia.arbiscan.io/address/0xCDd8a581C6958bc4e463cf9B77da396f6d7417C0) |
| **Fallback Library** | `0x37fa6Ba131706d350ABEc43902BB6128D1F53C14` | [View](https://sepolia.arbiscan.io/address/0x37fa6Ba131706d350ABEc43902BB6128D1F53C14) |

## Configuration

- **Platform Treasury**: `0x00224492F572944500AB4eb91E413cfA34770c60`
- **AMC Address**: `0x00224492F572944500AB4eb91E413cfA34770c60`
- **Platform Fee**: 100 bps (1%)
- **AMC Fee**: 200 bps (2%)

## Contract Linking

✅ All contracts have been automatically linked:
- Pool Manager → RWA Factory
- RWA Factory → Pool Manager
- Receivable Factory → Pool Manager
- NVX Token → Pool Manager

## Environment Variables

### Frontend (`.env` or Vercel)

```bash
VITE_NETWORK=arbitrum_sepolia
VITE_CHAIN_ID=421614
VITE_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
VITE_EXPLORER_URL=https://sepolia.arbiscan.io

VITE_NOVAX_RWA_FACTORY_ADDRESS=0x83E58aaa63B9437ec39985Eb913CABA27f85A442
VITE_NOVAX_RECEIVABLE_FACTORY_ADDRESS=0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b
VITE_NOVAX_POOL_MANAGER_ADDRESS=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5
VITE_NVX_TOKEN_ADDRESS=0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff
VITE_USDC_ADDRESS=0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D
```

### Backend (`.env` or Render)

```bash
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ARBITRUM_CHAIN_ID=421614

USDC_ADDRESS=0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D
NVX_TOKEN_ADDRESS=0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff
RWA_FACTORY_ADDRESS=0x83E58aaa63B9437ec39985Eb913CABA27f85A442
RECEIVABLE_FACTORY_ADDRESS=0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b
POOL_MANAGER_ADDRESS=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5
```

## Next Steps

1. ✅ **Update Frontend Environment Variables** - Set in Vercel or `.env`
2. ✅ **Update Backend Environment Variables** - Set in Render or `.env`
3. ✅ **Test Contract Interactions** - Create receivables, pools, invest, etc.
4. ⏳ **Verify Contracts on Arbiscan** (Optional) - For transparency
5. ⏳ **Test Full Flow** - End-to-end testing of all features

## Network Information

- **Network Name**: Arbitrum Sepolia
- **Chain ID**: 421614 (0x66EEE)
- **RPC URL**: https://sepolia-rollup.arbitrum.io/rpc
- **Explorer**: https://sepolia.arbiscan.io
- **Faucet**: https://faucet.quicknode.com/arbitrum/sepolia

## Notes

- This is a **testnet deployment** - use for testing only
- MockUSDC was deployed for testing purposes
- VRF and Verification modules were skipped (no Chainlink addresses provided)
- All contracts are linked and ready to use

---

**Deployment File**: `trustbridge-backend/contracts/deployments/novax-arbitrum-sepolia-421614.json`

