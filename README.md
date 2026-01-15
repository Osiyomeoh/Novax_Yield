# TrustBridge Africa - Real-World Asset Tokenization Platform

**Real-World Asset Tokenization on Mantle Network**

**Live Platform:** [tbafrica.xyz](https://tbafrica.xyz) | **Documentation:** [Documentation Page](https://tbafrica.xyz/documentation) | **One-Pager Pitch:** [View on Google Drive](https://drive.google.com/file/d/1hNhHUClXNU4i8NvwcMFX35VmI_VbwpSH/view?usp=sharing)

---

## Quick Start

**TrustBridge is built on Mantle Network** - an EVM Layer 2 blockchain optimized for real-world asset tokenization.

### Why Mantle Network?

- **Low Gas Fees** - Perfect for fractional ownership and micro-investments
- **High Throughput** - Handles thousands of asset tokenizations
- **EVM Compatibility** - Seamless MetaMask integration
- **Modular Architecture** - Ideal for scaling RWA tokenization globally

### Installation

```bash
# Clone repository
git clone https://github.com/Osiyomeoh/TrustBridgeAfrica.git
cd TrustBridgeAfrica

# Install backend dependencies
cd trustbridge-backend && npm install

# Install frontend dependencies
cd ../trustbridge-frontend && npm install

# Install contract dependencies
cd ../trustbridge-backend/contracts && npm install
```

### Setup

1. **Backend Setup**:
   ```bash
   cd trustbridge-backend
   cp .env.example .env
   # Edit .env with your configuration
   npm run start:dev
   ```

2. **Frontend Setup**:
   ```bash
   cd trustbridge-frontend
   cp env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Deploy Contracts**:
   ```bash
   cd trustbridge-backend/contracts
   cp env.example .env
   # Configure Mantle Network RPC and private keys
   npx hardhat deploy --network mantle_sepolia
   ```

---

## The Vision

TrustBridge enables **anyone with a basic mobile phone** to tokenize real-world assets (farms, real estate, commodities) and access global investment opportunities, **without requiring smartphones, internet, traditional banks or crypto knowledge**.

### Mission
**Democratize $1T+ in African real-world assets** via:
- **Web Platform**: Accessible investment interface
- **Mantle Network**: Low-cost EVM Layer 2 blockchain
- **Smart Contracts**: Automated asset management and pool creation
- **Real Yields**: Actual ROI from tokenized assets

---

## The Problem: Africa's Untapped Wealth

### **The Challenge**
Africa holds **$1 trillion+ in "dead capital"** - assets that cannot be used as collateral, invested, or accessed by global markets:

1. **No Banking Infrastructure**
   - 65% of Africans are unbanked (400M+ people)
   - No credit history → No access to capital
   - Cash economy limits investment

2. **Illiquid Assets**
   - $350B in real estate owned but not tradeable
   - $150B in agricultural land without deed registration
   - Farmers can't prove ownership or asset value

3. **Traditional Banks Fail**
   - Banks require credit history → excludes 65% of Africans
   - High fees (5-15%) eat into small business margins
   - Slow processing (days/weeks) prevents agility
   - Geographic limitations (urban-focused branches)
   - Bureaucratic lending processes

4. **Digital Divide**
   - 60% don't have internet access
   - 70% use basic phones (not smartphones)
   - No crypto knowledge or wallet infrastructure

5. **Limited Investment Access**
   - Local investors can't diversify globally
   - International investors can't access African assets
   - Fragmented markets prevent liquidity

### **The Solution: TrustBridge**

TrustBridge **tokenizes** African real-world assets on Mantle Network, making them **investable, tradeable, and accessible** to global investors:

#### **For Asset Owners (Farmers, Landowners, Property Owners)**
- **Tokenize** real-world assets (farmland, real estate, equipment, infrastructure) on Mantle Network
- **Access capital** by selling fractional ownership
- **Earn ongoing yields** from asset-backed pool investments
- **Set investable percentage** - Control how much of your asset can be tokenized
- **Transparent ownership** - All transactions recorded on-chain
- **Revenue reporting** - Submit periodic revenue reports for dividend distribution

#### **For Investors (Local & Global)**
- **Diversify** portfolio with African agriculture, real estate, commodities, infrastructure
- **Fractional ownership** of high-value real-world assets (invest as little as $1)
- **Real yields** from actual asset performance, not speculation
- **Global liquidity** on Mantle Network
- **Transparent ownership** via immutable blockchain audit trail
- **Real-time ROI** - Track your investment returns second-by-second
- **AMC-managed pools** - Professional asset management and oversight

#### **Trust Economy Benefits**
- **TRUST token** powers platform transactions
- **Deflationary** tokenomics via burning
- **Governance** through DAO voting
- **Staking rewards** for token holders
- **Universal value** across African markets

**Live Platform:** [tbafrica.xyz](https://tbafrica.xyz)

---

## Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TRUSTBRIDGE PLATFORM                               │
│                      Built on Mantle Network                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                                     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │              React + TypeScript + Vite                      │            │
│  │  • MetaMask Wallet Integration                              │            │
│  │  • Asset Creation & Management                               │            │
│  │  • Pool Investment Interface                                │            │
│  │  • Real-time ROI Tracking                                   │            │
│  │  • AMC Dashboard                                            │            │
│  │  • Portfolio Management                                     │            │
│  └────────────────────────────────────────────────────────────┘            │
│          ↓                                                                  │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │              NestJS Backend API                             │            │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │            │
│  │  │ Asset    │  │ AMC      │  │ ROI      │  │ Mantle   │  │            │
│  │  │ Service  │  │ Pools    │  │ Calc     │  │ Service  │  │            │
│  │  │          │  │ Service  │  │ Service  │  │          │  │            │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │            │
│  └────────────────────────────────────────────────────────────┘            │
│          ↓                                                                  │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │                    MongoDB Database                         │            │
│  │  • Users, Assets, Pools, Investments, Earnings             │            │
│  │  • Asset Owner Management, Revenue Reports                 │            │
│  └────────────────────────────────────────────────────────────┘            │
└────────────────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────────────────┐
│                    MANTLE NETWORK (EVM Layer 2)                            │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  Smart Contracts (Solidity)                                   │          │
│  │                                                               │          │
│  │  • CoreAssetFactory:    RWA asset creation & management    │          │
│  │  • PoolManager:          Investment pool creation & trading │          │
│  │  • AMCManager:          Asset Management Company oversight  │          │
│  │  • TrustToken:          Platform utility token (TRUST)     │          │
│  │  • PoolToken:           ERC-20 tokens for pool investments  │          │
│  │                                                               │          │
│  │  Features:                                                    │          │
│  │  • Fractional ownership (18 decimals for micro-investments)  │          │
│  │  • Secondary trading (on-chain & DEX compatible)          │          │
│  │  • Redeeming (burn tokens for TRUST)                        │          │
│  │  • Tranche support (Senior/Junior)                           │          │
│  │  • Real-time ROI calculation                                 │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  IPFS (Pinata) - Decentralized Storage                       │          │
│  │                                                               │          │
│  │  • Asset Metadata:    RWA details & documentation           │          │
│  │  • Evidence Files:    Legal documents, photos               │          │
│  │  • Immutable Links:   Content-addressed storage             │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │  External Integrations                                        │          │
│  │                                                               │          │
│  │  • Chainlink Oracles:   Real-time price feeds               │          │
│  │  • Google AI (Gemini):  Investment analysis                 │          │
│  │  • MetaMask:            Wallet integration                   │          │
│  └──────────────────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Implemented Features - Production Ready

### Real-World Asset (RWA) Tokenization

TrustBridge focuses exclusively on **Real-World Assets** - physical assets that generate real revenue and yield.

#### **Supported Asset Types**
- **Agriculture**: Farmland, agribusiness, agricultural equipment
- **Real Estate**: Commercial properties, residential buildings, land
- **Infrastructure**: Roads, bridges, renewable energy projects
- **Commodities**: Natural resources, mining assets
- **Equipment**: Machinery, vehicles, industrial equipment

#### **Asset Creation Flow**
```
1. Asset owner connects MetaMask wallet
   ↓
2. Navigate to "Create RWA Asset"
   ↓
3. Enter asset details (type, location, value, size)
   ↓
4. Set investable percentage (how much can be tokenized)
   ↓
5. Upload legal documents to IPFS (deeds, photos, certificates)
   ↓
6. Submit asset for AMC approval
   ↓
7. Smart contract creates asset on Mantle Network
   ↓
8. AMC reviews and approves/rejects
   ↓
9. Approved assets added to investment pools
   ↓
10. Investors can now invest in tokenized assets
```

**Technical Implementation:**
- **IPFS**: `PinataService` uploads documents → returns CID
- **Smart Contracts**: `CoreAssetFactory.createRWAAsset()` creates on-chain asset
- **Blockchain**: All asset data stored on Mantle Network
- **MongoDB**: Stores asset metadata with on-chain asset ID
- **Real-time Updates**: Direct blockchain queries for verification
- **AMC Oversight**: Licensed Asset Management Companies verify and manage assets

#### **AMC Pool Management**

**Pool Creation:**
- Multiple RWAs bundled into single pool via `PoolManager.createPool()`
- ERC-20 pool tokens created for fractional ownership
- Supports simple pools and tranched pools (Senior/Junior)
- Pool metadata stored on-chain

**Investment Flow:**
- Investor connects MetaMask wallet
- Invests TRUST tokens in pool (minimum $1 investment)
- Receives pool tokens proportional to investment
- Investment tracked on-chain and in MongoDB
- Real-time ROI calculation based on APY

**Yield Distribution:**
- Asset owners submit revenue reports
- AMC verifies and distributes dividends
- Dividends distributed as TRUST tokens to investors
- ROI automatically calculated and displayed
- All transactions recorded on-chain

### Real Yield System

#### **How Investors Make Money**
1. **Asset Revenue Generation**: Real-world assets (farms, real estate) generate actual revenue
2. **Revenue Reporting**: Asset owners submit revenue reports to AMC
3. **Verification**: AMC verifies reports and calculates dividends
4. **Distribution**: Dividends distributed as TRUST tokens to investors
5. **ROI Calculation**: Real-time ROI based on actual dividends received + projected APY

#### **Asset Owner Flow**
1. **Tokenize Asset**: Create RWA asset on-chain
2. **Set Investable %**: Define maximum percentage that can be tokenized
3. **AMC Approval**: Asset reviewed and approved by AMC
4. **Pool Creation**: Asset added to investment pool
5. **Capital Received**: Receive TRUST tokens from tokenization
6. **Revenue Reporting**: Submit periodic revenue reports
7. **Dividend Distribution**: Dividends distributed to investors

#### **Fraud Prevention**
- On-chain ownership verification
- Duplicate report detection
- Amount and period validation
- Historical consistency checks
- Pattern detection algorithms

### Trust Token Economy

The **TRUST token** is the native utility token powering the entire TrustBridge ecosystem, creating a self-sustaining economy for African asset tokenization.

#### **Tokenomics**
- **Total Supply**: 1 Billion TRUST tokens
- **Distribution**: 
  - 40% Community (rewards, staking, referrals)
  - 25% Team & Advisors (vested 4 years)
  - 20% Investors (vested 3 years)
  - 10% Ecosystem Fund (AMCs, partnerships)
  - 5% Liquidity & Reserves
- **Deflationary**: 2% burn on every transaction
- **Exchange**: TRUST token trading on Mantle Network

#### **Use Cases**
1. **Platform Fees**: Pay for asset creation, trading, AMC fees
2. **Staking**: Lock TRUST for rewards and priority access
3. **Governance**: Vote on DAO proposals and platform decisions
4. **Liquidity**: Provide liquidity in pools for trading rewards
5. **AI Services**: Access AI-powered analytics and insights
6. **Premium Features**: Unlock advanced portfolio tools

#### **Governance (DAO)**
- **Proposal System**: Any holder can submit proposals
- **Voting**: Weighted by TRUST holdings
- **Execution**: Automated via smart contracts
- **Proposals**: Fee changes, AMC additions, new features

#### **Staking Rewards**
- **Lock Periods**: 1, 3, 6, or 12 months
- **APY**: 5-20% based on lock duration
- **Bonus**: Higher rewards for longer locks
- **Auto-Compounding**: Monthly reward distribution

#### **Burning Mechanism**
Every transaction burns 2% of TRUST tokens:
- **Asset Tokenization**: Platform burns tokens on creation
- **Pool Investments**: Burn on each investment
- **Yield Distribution**: Burn on dividend payments
- **Trading**: Burn on marketplace transactions

**Result**: Supply decreases over time → **token appreciation** for holders

### AI-Powered Analytics

#### **Google Gemini Integration**
- **Investment Analysis**: AI recommendations based on user profile
- **Risk Assessment**: ML-powered portfolio scoring
- **Market Intelligence**: Real-time trend analysis
- **Content Generation**: Marketing materials & descriptions

**Implementation:**
- Google AI Studio API calls from backend
- TRUST token gating for AI services
- Rate limiting and usage tracking
- Multi-modal AI (text, image, video)

### Analytics Dashboard

#### **Real-Time Data**
- **TVL**: Sum of all asset values
- **Active Users**: MongoDB user count
- **Geographic Distribution**: Countries with assets
- **Asset Categories**: Breakdown by sector
- **Pools**: Investment pool statistics

**Implementation:**
- Backend aggregates from Mantle Network + MongoDB
- HCS topic queries for asset count
- Real-time updates via polling
- Charts and visualizations in frontend

---

## Technology Stack

### **Frontend**
```typescript
React 18 + TypeScript + Vite + Tailwind CSS
├── UI Components (shadcn/ui)
├── State Management (Context API + Hooks)
├── Wallet Integration (WalletConnect + HashPack)
├── USSD Simulator (Custom React Component)
├── Analytics Dashboard (Recharts + Custom Charts)
└── Responsive Design (Mobile-First)
```

### **Backend**
```typescript
NestJS + MongoDB + JWT + Swagger
├── Asset Management Service
├── AMC Pool Management Service
├── USSD Handler Service
├── Mantle Network Integration Layer
├── IPFS Service (Pinata)
├── Google AI Service
├── Analytics Service
└── Admin Management Service
```

### **Blockchain (Mantle Network)**
```typescript
Ethers.js + Hardhat
├── Smart Contracts: CoreAssetFactory, PoolManager, AMCManager
├── ERC-20 Tokens: TrustToken, PoolToken
├── Web3 Integration: MetaMask, WalletConnect
└── Contract Deployment: Hardhat deployment scripts
```

---

## Business Model & Market Value

### Revenue Streams

#### **1. Transaction Fees**
- **RWA Trading**: 1-3% of transaction value
- **Pool Investments**: Platform fee on all investments
- **Yield Distribution**: Fee on dividend payments

#### **2. Listing Fees**
- **Asset Creation**: One-time listing fee for RWAs
- **AMC Pool Launch**: Pool creation fee
- **Premium Listings**: Featured placement fees

#### **3. Subscription Revenue**
- **AMC Licenses**: Monthly/annual AMC licensing fees
- **Enterprise Plans**: Large-scale institutional plans
- **Premium Features**: Advanced analytics & tools

#### **4. Tokenomics**
- **TRUST Token**: Platform utility creates demand
- **Burn Mechanism**: Deflationary supply
- **Staking Rewards**: Lock tokens for rewards
- **Governance**: Voting rights drive value

#### **5. API & Data**
- **Market Data**: Sell aggregated market insights
- **API Access**: Developer API subscriptions
- **White-Label**: License platform to institutions

### Total Addressable Market (TAM)

| Market Segment | Size | TrustBridge Capture |
|----------------|------|---------------------|
| **African Agriculture** | $150B+ | 0.1% = $150M |
| **Real Estate** | $350B+ | 0.1% = $350M |
| **Commodities** | $100B+ | 0.1% = $100M |
| **Infrastructure** | $50B+ | 0.1% = $50M |
| **TOTAL TAM** | **$650B+** | **$650M+** |

### Competitive Advantages

| Feature | Traditional RWA | TrustBridge |
|---------|----------------|-------------|
| **Access** | Web3 savvy only | USSD + Web |
| **Fees** | $50-200 per txn | $0.001 |
| **Speed** | Minutes-hours | 3 seconds |
| **Gas** | User pays | Sponsor covers |
| **Mobile** | Smartphone only | Basic phone OK |
| **Yields** | Synthetic | Real asset-backed |
| **Compliance** | Light | KYC/AML + AMC |

### Growth Trajectory

**Year 1**: 10K users, 1,000 assets, $10M volume  
**Year 2**: 50K users, 5,000 assets, $50M volume  
**Year 3**: 200K users, 20,000 assets, $200M volume  
**Year 5**: 1M users, 100,000 assets, $1B volume  

---

## Complete User Flows

### Asset Owner: "Farmer Ibrahim"

**Scenario**: Ibrahim has a 5-hectare cashew farm in Lagos worth ₦10M ($12,500)

**Flow**:
```
1. Visit tbafrica.xyz and connect MetaMask wallet
   ↓
2. Navigate to "Create RWA Asset"
   ↓
3. Enter asset details: 5 hectares, Lagos address, ₦10M value
   ↓
4. Set investable percentage: 50% (₦5M can be tokenized)
   ↓
5. Upload legal documents (deed, photos) → Stored on IPFS
   ↓
6. Submit asset for AMC approval
   ↓
7. Backend creates asset on Mantle via CoreAssetFactory
   ↓
8. Asset created on-chain representing the farm
   ↓
9. AMC reviews and approves asset
   ↓
10. Asset added to "West Africa Agriculture Pool"
    ↓
11. Pool tokens created, investors start buying
    ↓
12. Ibrahim receives TRUST tokens from tokenization
    ↓
13. Monthly revenue reports submitted → Dividends distributed
    ↓
14. Ibrahim checks portfolio: "My Assets: 1, Value: ₦10M, Earnings: ₦100K"
```

**Mantle Network Transactions**:
- Asset creation: `CoreAssetFactory.createRWAAsset()`
- Pool creation: `PoolManager.createPool()`
- Investment: `PoolManager.invest()` (TRUST tokens → pool tokens)
- Dividends: `AMCManager.distributeDividends()` (TRUST tokens to investors)

### Investor: "Sarah from Lagos"

**Scenario**: Sarah wants to invest $5,000 in African agriculture

**Flow**:
```
1. Visit tbafrica.xyz on laptop/phone
   ↓
2. Connect MetaMask wallet (Mantle Sepolia Testnet)
   ↓
3. Complete KYC verification
   ↓
4. Browse AMC pools → "West Africa Agriculture Pool"
   ↓
5. View assets: 10 farms, total value $500K, 12% APY
   ↓
6. Click "Invest" → Enter $5,000 (or invest as little as $1)
   ↓
7. Approve TRUST token spending
   ↓
8. Sign investment transaction in MetaMask
   ↓
9. TRUST tokens deducted, pool tokens credited
   ↓
10. Investment tracked on-chain and in MongoDB
    ↓
11. Real-time ROI calculation starts immediately
    ↓
12. Monthly dividends: $5,000 × 12% / 12 = $50
    ↓
13. Dividends distributed as TRUST tokens
    ↓
14. Sarah views portfolio: "Pool Tokens: 1,000, APY: 12%, ROI: 3.5%, Earned: $150"
```

**Mantle Network Transactions**:
- Investment: `PoolManager.invest()` (TRUST → pool tokens)
- Dividends: `AMCManager.distributeDividends()` (TRUST to investors)
- All transactions recorded on-chain for transparency

### AMC Admin: "Mr. Johnson"

**Scenario**: Licensed AMC manager managing asset pools

**Flow**:
```
1. Login to AMC Dashboard
   ↓
2. Review pending assets (Ibrahim's farm)
   ↓
3. Verify documentation from IPFS
   ↓
4. Check legal compliance + valuation
   ↓
5. Approve asset → Recorded on-chain
   ↓
6. Create pool "West Africa Agriculture Pool"
   ↓
7. Bundle 10 approved farms → $500K total value
   ↓
8. Set APY: 12% annual
   ↓
9. Create pool tokens (ERC-20) → Launch pool
   ↓
10. Monitor performance: $50K invested, 3 investors
    ↓
11. Receive revenue reports from asset owners
    ↓
12. Verify and distribute dividends: $500 TRUST to each investor
    ↓
13. All transactions recorded on-chain
    ↓
14. Generate reports for regulators
```

---

## Security & Compliance

### **Blockchain Security**
- **On-Chain Audit Trail**: All transactions immutable on Mantle Network
- **Smart Contracts**: Automated, audited business logic
- **Multi-signature**: Critical operations require multiple approvals
- **Block Explorer**: Real-time transaction verification

### **Platform Security**
- **PIN Security**: Bcrypt hashing, lockout mechanisms
- **JWT Tokens**: Secure API authentication
- **Role-Based Access**: Granular permissions (user, AMC, admin, super admin)
- **KYC/AML**: Didit integration + on-platform checks

### **Data Protection**
- **IPFS Encryption**: End-to-end document encryption
- **GDPR Compliance**: Data privacy controls
- **Session Management**: Secure session handling
- **API Rate Limiting**: DDoS protection


## Platform Metrics

### **Current Status (Testnet)**
| Metric | Value |
|--------|-------|
| **Platform** | tbafrica.xyz |
| **Blockchain** | Mantle Sepolia Testnet (testnet only) |
| **Assets** | Test RWAs tokenized (test data only) |
| **Users** | Test users (testnet) |
| **Pools** | Test AMC pools (test data only) |
| **Volume** | Test investments (no real money) |
| **Uptime** | 99.9% |
| **Gas Fees** | Ultra-low on Mantle L2 |
| **Status** | **Testnet with test data only - no real assets or real money** |

### **Technical Performance**
| Metric | Value |
|--------|-------|
| **Transaction Speed** | ~2 seconds finality |
| **Transaction Cost** | Ultra-low on Mantle L2 |
| **Gas Fees** | Fraction of Ethereum mainnet |
| **API Latency** | <500ms |
| **Frontend Load** | <2s |
| **Database Queries** | <100ms |

---

## Market Opportunity - Africa

### **Demographics**
- **Population**: 1.4 billion people
- **Unbanked**: 60% without bank accounts
- **Mobile**: 80% own mobile phones
- **USSD Usage**: 90% of mobile transactions

### **Asset Classes**
- **Agriculture**: $150B+ annual output
- **Real Estate**: $350B+ property value
- **Commodities**: $100B+ natural resources
- **Infrastructure**: $50B+ projects needed

### **Regulatory Environment**
- **Pro-Blockchain**: Nigeria, Ghana, Kenya, South Africa
- **Financial Inclusion**: Governments driving bankless adoption
- **RWA Frameworks**: Emerging tokenization regulations
- **Tax Incentives**: Favorable for foreign investments

---

## Deployment Status

### Testnet Deployment (Current)
- **Backend API**: NestJS backend with MongoDB
- **Frontend**: React + Vite application
- **Database**: MongoDB Atlas
- **Blockchain**: Mantle Sepolia Testnet (testnet only - no real assets)
- **IPFS**: Pinata infrastructure
- **Analytics**: Real-time blockchain data
- **Status**: Platform operates with **test data only** - no real assets, real money, or real investments

### **Smart Contracts Deployed (Testnet)**
| Contract | Address | Purpose |
|----------|---------|---------|
| **CoreAssetFactory** | Deployed on Mantle Sepolia Testnet | RWA asset creation & management (test data only) |
| **PoolManager** | Deployed on Mantle Sepolia Testnet | Investment pool creation & trading (test data only) |
| **AMCManager** | Deployed on Mantle Sepolia Testnet | Asset Management Company oversight (test data only) |
| **TrustToken** | Deployed on Mantle Sepolia Testnet | Platform utility token (TRUST) - test tokens only |
| **PoolToken** | Created per pool (testnet) | ERC-20 tokens for pool investments (test data only) |

**Note**: All contracts are deployed on Mantle Sepolia Testnet. No real assets or real money are involved.

---

## Documentation & Resources

### **User Documentation**
- **Getting Started**: [tbafrica.xyz/documentation](https://tbafrica.xyz/documentation)
- **For Asset Owners**: Complete tokenization guide
- **For Investors**: Investment walkthrough
- **USSD Guide**: Mobile banking tutorial

### **Developer Resources**
- **API Docs**: [Swagger UI](https://trustbridge-backend.onrender.com/api-docs)
- **GitHub**: [Source Code](https://github.com/Osiyomeoh/TrustBridgeAfrica)
- **Mantle Network**: [Documentation](https://docs.mantle.xyz)

---

## Partnerships

### **Blockchain**
- **Mantle Network** - EVM Layer 2 blockchain
- **MetaMask** - Primary wallet provider
- **Pinata** - IPFS storage partner
- **Chainlink** - Oracle price feeds

### **Financial Inclusion (Planned)**
- **Africa's Talking** - USSD gateway integration (Planned)
- **Paga** - Production payment processing (Planned)
- **MTN/Airtel/Orange** - USSD infrastructure (Planned)

### **Institutions**
- **AMCs**: Licensed asset management companies
- **Real Estate Firms**: Property developers
- **Agricultural Co-ops**: Farming collectives
- **Government**: Financial inclusion partnerships

---

## Roadmap

### Q1 2026 - Complete
- Core RWA tokenization platform
- AMC pool management system
- Mantle Network integration
- Analytics dashboard
- Smart contract deployment
- IPFS storage
- Google AI integration
- Trust Token economy
- Real yield system
- ROI calculation & tracking
- Asset owner management
- Fraud prevention system

### Q2 2026
- Mobile apps (iOS/Android)
- DeFi lending/borrowing
- Cross-chain bridges
- Advanced analytics

---

## Why TrustBridge Wins

### **1. First-Mover in African RWA Tokenization**
No platform offers real-world asset tokenization on Mantle Network with real yields

### **2. Blockchain-Native Architecture**
Built entirely on Mantle Network (EVM Layer 2) for speed & low cost

### **3. Actual Market Need**
60% of Africans are unbanked but own mobile phones → $650B untapped market

### **4. Regulatory Compliance**
KYC/AML + AMC certification = institutional-ready

### **5. Real Yields**
Actual ROI from assets, not synthetic DeFi products

### **6. Scalable Technology**
Handles millions of users on Mantle Network's scalable Layer 2 infrastructure

---

## Getting Started

### Wallet Setup - MetaMask Required

**MetaMask** is the wallet used by TrustBridge on Mantle Network. You'll need it to connect to the platform.

#### **Step 1: Install MetaMask Wallet**
- **Chrome/Brave**: [Download MetaMask Extension](https://metamask.io/download/)
- **Firefox**: [Download MetaMask Add-on](https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/)
- **Mobile**: [iOS App Store](https://apps.apple.com/app/metamask/id1438144202) | [Google Play Store](https://play.google.com/store/apps/details?id=io.metamask)

#### **Step 2: Create MetaMask Account**
1. Install extension/add-on
2. Open MetaMask
3. Click **"Create a Wallet"**
4. **Save your recovery phrase** (12 words) - write it down securely!
5. Create password
6. Wallet created!

#### **Step 3: Add Mantle Sepolia Testnet**
TrustBridge uses Mantle **Sepolia Testnet** for all transactions.

1. Open MetaMask
2. Click network dropdown (top of extension)
3. Click **"Add Network"** → **"Add a network manually"**
4. Enter the following details:
   - **Network Name**: Mantle Sepolia Testnet
   - **RPC URL**: `https://rpc.sepolia.mantle.xyz`
   - **Chain ID**: `5003`
   - **Currency Symbol**: `MNT`
   - **Block Explorer**: `https://explorer.sepolia.mantle.xyz`

5. Click **"Save"**
6. Mantle Sepolia added!

#### **Step 4: Get Free Test Tokens**
You need test tokens to pay for transactions on Testnet:

**Get Test MNT:**
1. Visit [Mantle Faucet](https://faucet.sepolia.mantle.xyz)
2. Enter your MetaMask wallet address
3. Click **"Request Tokens"**
4. Receive test MNT

**Get Test TRUST:**
1. Connect wallet to TrustBridge platform
2. Use the TRUST faucet (if available)
3. Or request from admin

#### **Step 5: Connect to TrustBridge**
1. Visit [tbafrica.xyz](https://tbafrica.xyz)
2. Click **"Connect Wallet"**
3. Select **MetaMask**
4. Approve connection in MetaMask popup
5. Connected!

---

**For Developers**:
1. Install MetaMask and add Mantle Sepolia Testnet
2. Get test tokens from faucet
3. Clone repo: `git clone https://github.com/Osiyomeoh/TrustBridgeAfrica.git`
4. Configure `.env` files with Mantle RPC and private keys
5. Deploy contracts: `cd trustbridge-backend/contracts && npx hardhat deploy --network mantle_sepolia`
6. Run `npm run dev`

**For Investors**:
1. Setup MetaMask wallet (above)
2. Add Mantle Sepolia Testnet
3. Get test tokens
4. Connect to platform
5. Browse AMC pools and start investing

---

## Team

### **Core Team**

*[Team bios to be added - please provide team member information]*

#### **Founders & Leadership**
- **Samuel Aleonomoh**
  - **Role**: Founder & CEO
  - **Bio**: Visionary leader building Africa's first real-world asset tokenization platform on blockchain
  - **Contact**: [samuelaleonomoh5@gmail.com](mailto:samuelaleonomoh5@gmail.com)

#### **Design Team**
- **Blessing**
  - **Role**: Designer
  - **Bio**: Creative designer crafting intuitive user experiences for TrustBridge Africa
  - **Contact**: [samuelaleonomoh5@gmail.com](mailto:samuelaleonomoh5@gmail.com)

### **Contact Information**

- **General Inquiries**: [samuelaleonomoh5@gmail.com](mailto:samuelaleonomoh5@gmail.com)
- **Business Partnerships**: [samuelaleonomoh5@gmail.com](mailto:samuelaleonomoh5@gmail.com)
- **Technical Support**: [samuelaleonomoh5@gmail.com](mailto:samuelaleonomoh5@gmail.com)
- **Media & Press**: [samuelaleonomoh5@gmail.com](mailto:samuelaleonomoh5@gmail.com)
- **Website**: [tbafrica.xyz](https://tbafrica.xyz)
- **GitHub**: [github.com/Osiyomeoh/TrustBridgeAfrica](https://github.com/Osiyomeoh/TrustBridgeAfrica)

---

## Compliance Declaration

### **IMPORTANT: Testnet Status**

**CURRENT STATUS**: TrustBridge Africa is currently operating on **Mantle Sepolia Testnet** with **test data only**. **No real assets are being tokenized or traded on the platform at this time.** All assets, pools, investments, and transactions are for testing and demonstration purposes only.

### **Regulated Assets Disclosure**

**TrustBridge Africa** is designed to operate a real-world asset (RWA) tokenization platform that would facilitate the tokenization and fractional ownership of physical assets including:

- **Real Estate** (commercial and residential properties)
- **Agricultural Assets** (farmland, agribusiness, agricultural equipment)
- **Infrastructure Assets** (roads, bridges, renewable energy projects)
- **Commodities** (natural resources, mining assets)
- **Equipment** (machinery, vehicles, industrial equipment)

### **Regulatory Status**

**IMPORTANT DISCLOSURE**: When TrustBridge Africa transitions to mainnet and begins tokenizing real assets, the platform will involve **regulated assets** and will be subject to securities regulations, financial services regulations, and other applicable laws in various jurisdictions. **Currently, the platform operates on testnet with test data only and does not involve any real assets or regulated activities.**

#### **Key Regulatory Considerations**

1. **Securities Regulations**
   - Pool tokens and fractional ownership interests may constitute **securities** under applicable laws
   - Platform operates with **Asset Management Company (AMC) oversight** to ensure compliance
   - All pools are managed by **licensed Asset Management Companies** subject to regulatory supervision

2. **Financial Services Regulations**
   - Platform may be subject to **financial services licensing** requirements in various jurisdictions
   - **KYC/AML compliance** implemented for all users
   - **Anti-Money Laundering (AML)** and **Know Your Customer (KYC)** procedures enforced

3. **Asset-Specific Regulations**
   - **Real Estate**: Subject to property laws, land registration requirements, and real estate regulations
   - **Agricultural Assets**: Subject to agricultural and land use regulations
   - **Commodities**: Subject to commodity trading and resource extraction regulations

4. **Cross-Border Considerations**
   - Platform serves users across multiple African jurisdictions and globally
   - Compliance with **local regulations** in each jurisdiction where assets are located
   - Compliance with **investor jurisdiction regulations** where applicable

### **Compliance Measures**

TrustBridge Africa is designed to implement the following compliance measures when operating on mainnet with real assets:

- **KYC/AML Procedures**: Will be required for all users before using the platform with real assets  
- **AMC Oversight**: All tokenized assets will be reviewed and managed by licensed Asset Management Companies  
- **Smart Contract Audits**: All smart contracts undergo security audits before deployment  
- **Regulatory Monitoring**: Ongoing monitoring of regulatory developments in relevant jurisdictions  
- **Legal Documentation**: Comprehensive legal documentation for asset tokenization and pool creation  
- **Transparent Reporting**: All transactions recorded on-chain for auditability and transparency  

**Note**: On testnet, these measures are simulated for testing purposes only.  

### **Jurisdictional Compliance**

**Note**: The following compliance requirements will apply when TrustBridge Africa transitions to mainnet and begins tokenizing real assets:

- **Nigeria**: Will operate in compliance with SEC regulations and financial services laws
- **Ghana**: Will adhere to Securities and Exchange Commission requirements
- **Kenya**: Will comply with Capital Markets Authority regulations
- **South Africa**: Will adhere to Financial Sector Conduct Authority requirements
- **Other Jurisdictions**: Platform expansion subject to local regulatory approval

**Current Status**: Platform is on testnet only - no regulatory compliance required for test data.

### **Risk Disclosures**

**TESTNET DISCLAIMER**: The platform currently operates on testnet with test data only. No real money, real assets, or real investments are involved.

**When operating on mainnet with real assets, investors should be aware that**:

- Tokenized assets may be subject to **regulatory changes** that could affect their value or transferability
- **Regulatory actions** in any jurisdiction could impact platform operations
- **Securities laws** may restrict the transfer or trading of pool tokens in certain jurisdictions
- **Asset ownership** is subject to local property laws and regulations
- **Tax implications** may vary by jurisdiction for both asset owners and investors

### **Legal Disclaimer**

**TESTNET STATUS**: TrustBridge Africa is currently operating on Mantle Sepolia Testnet with test data only. No real assets, real money, or real investments are involved. All transactions, assets, and pools are for testing and demonstration purposes only.

**This platform is not intended to provide legal, financial, or investment advice. Users should consult with qualified legal and financial advisors before participating in asset tokenization or making investment decisions. TrustBridge Africa does not guarantee regulatory compliance in all jurisdictions and users are responsible for ensuring their participation complies with applicable laws in their jurisdiction.**

**When the platform transitions to mainnet with real assets, all applicable regulatory requirements will be implemented and enforced.**

### **Regulatory Updates**

TrustBridge Africa is committed to maintaining compliance with evolving regulatory frameworks when operating on mainnet with real assets. For the latest regulatory information and compliance updates, please contact us at [samuelaleonomoh5@gmail.com](mailto:samuelaleonomoh5@gmail.com).

---

**TrustBridge Africa** - *Where Real-World Assets Meet Blockchain Innovation*

*Built on Mantle Network • Powered by Trust • Designed for Africa • Real Yields from Real Assets*

---

© 2026 TrustBridge Africa. All rights reserved.  
**Live**: [tbafrica.xyz](https://tbafrica.xyz) | **Docs**: [Documentation](https://tbafrica.xyz/documentation)
