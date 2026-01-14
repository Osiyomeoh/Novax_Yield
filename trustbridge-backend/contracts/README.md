# TrustBridge Smart Contracts

## 🌍 Overview

TrustBridge is a comprehensive real-world asset (RWA) tokenization platform built on Hedera Hashgraph, specifically designed for the African market. This repository contains all the smart contracts that power the TrustBridge ecosystem.

## 📋 Contract Architecture

### Core Contracts

1. **TrustToken.sol** - Native platform token (TRUST)
2. **AssetFactory.sol** - Creates and manages individual asset tokens
3. **PoolFactory.sol** - Creates investment pools with DROP/TIN tokens
4. **TradingEngine.sol** - Secondary market trading platform
5. **ProfessionalAttestor.sol** - Licensed verification providers
6. **SPVManager.sol** - Special Purpose Vehicle for institutional compliance
7. **Governance.sol** - DAO governance system
8. **FeeDistribution.sol** - Protocol fee allocation

### Supporting Contracts

- **PoolToken.sol** - DROP (senior) and TIN (junior) tokens for pools
- **PoolManager.sol** - Individual pool management
- **AttestorManager.sol** - Attestor registration and reputation
- **VerificationRegistry.sol** - Asset verification tracking

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Hedera testnet account

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file:

```env
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=your-private-key
HEDERA_NETWORK=testnet
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm run test
```

### Deploy to Hedera Testnet

```bash
npm run deploy:testnet
```

## 📊 Contract Features

### 1. Asset Tokenization
- Individual asset tokenization
- KYC and freeze controls
- Verification integration
- Metadata storage

### 2. Pool Management
- DROP/TIN tranche structure
- Professional fund management
- Risk distribution
- Automated rewards

### 3. Trading Engine
- Order book system
- Automated matching
- Fee management
- Liquidity provision

### 4. Professional Attestors
- Licensed verification providers
- Reputation system
- Staking requirements
- Slashing mechanism

### 5. SPV Management
- Institutional compliance
- Investor management
- Distribution automation
- Regulatory reporting

### 6. Governance
- DAO voting system
- Proposal management
- Protocol upgrades
- Parameter changes

## 🔧 Development

### Testing

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run gas report
npm run gas-report
```

### Deployment

```bash
# Deploy to testnet
npm run deploy:testnet

# Deploy to mainnet
npm run deploy:mainnet

# Verify contracts
npm run verify:testnet
```

### Contract Sizes

```bash
npm run size
```

## 📈 Fee Structure

### Tokenization Fees
- **Asset Tokenization**: 2% of asset value
- **Pool Creation**: 0.1% of total pool value
- **Trading**: 0.25% per trade

### Management Fees
- **Pool Management**: 1% annually
- **SPV Management**: 1-2% annually
- **Performance Fees**: 10-20% of profits

### Fee Distribution
- **Treasury**: 40%
- **Stakers**: 30%
- **Insurance**: 20%
- **Validators**: 10%

## 🛡️ Security Features

- **Access Control**: Role-based permissions
- **Pausable**: Emergency stop functionality
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Upgradeable**: Proxy pattern for upgrades
- **Audit Ready**: Comprehensive test coverage

## 🌍 African Market Focus

### Mobile Optimization
- Gas-efficient operations
- Low transaction costs
- Offline capability support

### Local Features
- Multi-currency support
- Local language metadata
- Community verification
- Micro-investment support

## 📚 API Integration

### Backend Integration
- RESTful API endpoints
- WebSocket real-time updates
- Event monitoring
- Transaction tracking

### Frontend Integration
- React components
- Wallet integration
- Real-time data
- Mobile optimization

## 🔍 Monitoring

### Events
- Contract events for all major operations
- Real-time monitoring
- Analytics integration
- Alert system

### Metrics
- Transaction volume
- Fee collection
- User activity
- Performance metrics

## 🚀 Deployment

### Testnet Deployment
1. Configure Hedera testnet credentials
2. Run `npm run deploy:testnet`
3. Verify contracts
4. Test functionality

### Mainnet Deployment
1. Configure Hedera mainnet credentials
2. Run `npm run deploy:mainnet`
3. Verify contracts
4. Monitor operations

## 📞 Support

- **Documentation**: [docs.trustbridge.africa](https://docs.trustbridge.africa)
- **Discord**: [discord.gg/trustbridge](https://discord.gg/trustbridge)
- **GitHub**: [github.com/trustbridge](https://github.com/trustbridge)
- **Email**: dev@trustbridge.africa

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**TrustBridge - Building the bridge between African assets and global capital markets** 🌍✨