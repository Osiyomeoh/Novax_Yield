# Arbiscan API Query Examples

## Your API Key
`QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB`

## Quick Query Examples

### 1. Get Contract ABI (Pool Manager)

```bash
curl "https://api-sepolia.arbiscan.io/api?module=contract&action=getabi&address=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5&apikey=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB"
```

### 2. Get Contract Source Code

```bash
curl "https://api-sepolia.arbiscan.io/api?module=contract&action=getsourcecode&address=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5&apikey=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB"
```

### 3. Get Contract Balance

```bash
curl "https://api-sepolia.arbiscan.io/api?module=account&action=balance&address=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5&tag=latest&apikey=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB"
```

### 4. Get Recent Transactions

```bash
curl "https://api-sepolia.arbiscan.io/api?module=account&action=txlist&address=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB"
```

### 5. Get Internal Transactions

```bash
curl "https://api-sepolia.arbiscan.io/api?module=account&action=txlistinternal&address=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB"
```

### 6. Get ERC-20 Token Transfers

```bash
curl "https://api-sepolia.arbiscan.io/api?module=account&action=tokentx&contractaddress=0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D&address=0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5&page=1&offset=10&sort=desc&apikey=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB"
```

## Using the Query Script

```bash
cd trustbridge-backend/contracts
npx hardhat run scripts/novax/query-arbitrum-sepolia.ts --network arbitrum_sepolia
```

This will query all deployed contracts and show:
- Verification status
- Source code info
- Creation transactions
- Balances
- Recent transactions

## Contract Verification

For verification, you can use the Hardhat verify plugin directly:

```bash
# Verify Pool Manager
npx hardhat verify --network arbitrum_sepolia \
  0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5 \
  "0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D" \
  "0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff" \
  "0x00224492F572944500AB4eb91E413cfA34770c60" \
  "0x00224492F572944500AB4eb91E413cfA34770c60" \
  "100" \
  "200"
```

## API Endpoints

### Arbitrum Sepolia (Testnet)
- **API URL**: `https://api-sepolia.arbiscan.io/api`
- **Chain ID**: 421614
- **Explorer**: `https://sepolia.arbiscan.io`

### Arbitrum One (Mainnet)
- **API URL**: `https://api.arbiscan.io/api`
- **Chain ID**: 42161
- **Explorer**: `https://arbiscan.io`

## Rate Limits

- **Free Tier**: 5 calls/second
- **Pro Tier**: Higher limits

## All Deployed Contracts

| Contract | Address |
|----------|---------|
| Pool Manager | `0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5` |
| Receivable Factory | `0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b` |
| RWA Factory | `0x83E58aaa63B9437ec39985Eb913CABA27f85A442` |
| NVX Token | `0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff` |
| MockUSDC | `0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D` |


