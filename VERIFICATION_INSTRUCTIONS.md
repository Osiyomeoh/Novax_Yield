# Contract Verification Instructions

## API Key
Your Arbiscan API Key: `QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB`

## Manual Verification Commands

### 1. MockUSDC (No constructor arguments)
```bash
cd trustbridge-backend/contracts
npx hardhat verify --network arbitrum_sepolia \
  0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D
```

### 2. NVX Token (No constructor arguments)
```bash
npx hardhat verify --network arbitrum_sepolia \
  0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff
```

### 3. RWA Factory (No constructor arguments)
```bash
npx hardhat verify --network arbitrum_sepolia \
  0x83E58aaa63B9437ec39985Eb913CABA27f85A442
```

### 4. Receivable Factory (No constructor arguments)
```bash
npx hardhat verify --network arbitrum_sepolia \
  0xEbf84CE8945B7e1BE6dBfB6914320222Cf05467b
```

### 5. Exporter Registry (No constructor arguments)
```bash
npx hardhat verify --network arbitrum_sepolia \
  0x9Fa386f4367be09881745C3F5760bf605604A04B
```

### 6. Pool Manager (With constructor arguments)
```bash
npx hardhat verify --network arbitrum_sepolia \
  0x31838f29811Fdb9822C0b7d56c290ccF358f0cb5 \
  "0xD1A4AB603d489F6A6D74e7A5E853ad880cB7C24D" \
  "0x9fF0637bCEEb4263DcA3ECdc00380E7C5077C8ff" \
  "0x00224492F572944500AB4eb91E413cfA34770c60" \
  "0x00224492F572944500AB4eb91E413cfA34770c60" \
  "100" \
  "200"
```

### 7. Price Manager (With constructor arguments - all zero addresses)
```bash
npx hardhat verify --network arbitrum_sepolia \
  0xCDd8a581C6958bc4e463cf9B77da396f6d7417C0 \
  "0x0000000000000000000000000000000000000000" \
  "0x0000000000000000000000000000000000000000" \
  "0x0000000000000000000000000000000000000000" \
  "0x0000000000000000000000000000000000000000"
```

### 8. Fallback Library (No constructor arguments)
```bash
npx hardhat verify --network arbitrum_sepolia \
  0x37fa6Ba131706d350ABEc43902BB6128D1F53C14
```

## Using Environment Variable

Make sure `ARBISCAN_API_KEY` is set in `.env`:

```bash
ARBISCAN_API_KEY=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB
```

Or export it before running:

```bash
export ARBISCAN_API_KEY=QCWT16DQAEVMIZCY123ZC7422ZMEAEP3HB
npx hardhat verify --network arbitrum_sepolia <address> [constructor args...]
```

## Verification Status

After verification, contracts will be visible on Arbiscan with:
- ✅ Source code
- ✅ ABI
- ✅ Read/Write contract interface
- ✅ Contract creation transaction

## Query Contract Data

Use the query script to check verification status:

```bash
npx hardhat run scripts/novax/query-arbitrum-sepolia.ts --network arbitrum_sepolia
```

Or use direct API calls (see `ARBISCAN_QUERY_EXAMPLES.md`)


