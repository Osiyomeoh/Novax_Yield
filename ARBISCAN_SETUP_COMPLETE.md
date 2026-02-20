# Arbiscan API Setup Complete ✅

## Your API Key
**API Key**: `QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB`

## ✅ What's Been Set Up

1. **API Key Added** to `trustbridge-backend/contracts/.env`
2. **Query Script Created** - `query-arbitrum-sepolia.ts`
3. **Verification Script Created** - `verify-arbitrum-sepolia.ts`
4. **Hardhat Config Updated** - Custom chains configured

## 🔍 Querying Contracts

### Using the Query Script

```bash
cd trustbridge-backend/contracts
npx hardhat run scripts/novax/query-arbitrum-sepolia.ts --network arbitrum_sepolia
```

This queries all deployed contracts and shows:
- Contract verification status
- Source code information
- Creation transactions
- Balances
- Recent transactions

### Direct API Calls

#### Get Contract ABI
```bash
curl "https://api-sepolia.arbiscan.io/api?module=contract&action=getabi&address=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5&apikey=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB"
```

#### Get Contract Source Code
```bash
curl "https://api-sepolia.arbiscan.io/api?module=contract&action=getsourcecode&address=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5&apikey=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB"
```

#### Get Contract Balance
```bash
curl "https://api-sepolia.arbiscan.io/api?module=account&action=balance&address=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5&tag=latest&apikey=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB"
```

#### Get Recent Transactions
```bash
curl "https://api-sepolia.arbiscan.io/api?module=account&action=txlist&address=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB"
```

## ✅ Contract Verification

### Option 1: Manual Verification via Arbiscan Website

1. Go to contract on Arbiscan: https://sepolia.arbiscan.io/address/[CONTRACT_ADDRESS]
2. Click "Contract" tab
3. Click "Verify and Publish"
4. Fill in:
   - Compiler Version: `0.8.20` (or `0.8.28` for some contracts)
   - License: MIT
   - Optimization: Yes, 10000 runs (or 200 for 0.8.28)
   - Paste source code from `contracts/novax/[ContractName].sol`

### Option 2: Using Hardhat Verify (if config issue resolved)

The verification script is ready at:
- `scripts/novax/verify-arbitrum-sepolia.ts`

### Option 3: Direct API Verification

Use the Arbiscan API directly for verification. See `ARBISCAN_QUERY_EXAMPLES.md` for API endpoint details.

## 📋 Deployed Contract Addresses

| Contract | Address | Explorer |
|----------|---------|----------|
| **Pool Manager** | `0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5` | [View](https://sepolia.arbiscan.io/address/0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5) |
| **Receivable Factory** | `0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b` | [View](https://sepolia.arbiscan.io/address/0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b) |
| **RWA Factory** | `0x83E58aaa63B9437ec39985Eb913CABA27f85A442` | [View](https://sepolia.arbiscan.io/address/0x83E58aaa63B9437ec39985Eb913CABA27f85A442) |
| **NVX Token** | `0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff` | [View](https://sepolia.arbiscan.io/address/0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff) |
| **MockUSDC** | `0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D` | [View](https://sepolia.arbiscan.io/address/0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D) |
| **Exporter Registry** | `0x9Fa386f4367be09881745C3F5760bf605604A04B` | [View](https://sepolia.arbiscan.io/address/0x9Fa386f4367be09881745C3F5760bf605604A04B) |
| **Price Manager** | `0xCDd8a581C6958bc4e463cf9B77da396f6d7417C0` | [View](https://sepolia.arbiscan.io/address/0xCDd8a581C6958bc4e463cf9B77da396f6d7417C0) |
| **Fallback Library** | `0x37fa6Ba131706d350ABEc43902BB6128D1F53C14` | [View](https://sepolia.arbiscan.io/address/0x37fa6Ba131706d350ABEc43902BB6128D1F53C14) |

## 🌐 Network Information

### Arbitrum Sepolia (Testnet)
- **Chain ID**: 421614
- **API URL**: `https://api-sepolia.arbiscan.io/api`
- **Explorer**: `https://sepolia.arbiscan.io`
- **RPC**: `https://sepolia-rollup.arbitrum.io/rpc`

### Arbitrum One (Mainnet)
- **Chain ID**: 42161
- **API URL**: `https://api.arbiscan.io/api`
- **Explorer**: `https://arbiscan.io`
- **RPC**: `https://arb1.arbitrum.io/rpc`

## 📚 Resources

- **Arbiscan API Docs**: https://docs.arbiscan.io/
- **API Playground**: https://arbiscan.io/apis
- **Arbitrum Docs**: https://docs.arbitrum.io/

## ✅ Test Results

All contract tests **PASSED**:
- ✅ USDC minting
- ✅ Receivable creation
- ✅ Receivable verification
- ✅ Pool creation
- ✅ Investment
- ✅ Data retrieval

See `TEST_RESULTS.md` for full details.

---

**Status**: Contracts deployed and tested ✅  
**Next**: Verify contracts on Arbiscan (optional) or proceed with frontend integration


