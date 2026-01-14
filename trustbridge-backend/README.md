# TrustBridge Backend

A comprehensive NestJS backend for the TrustBridge Real-World Asset (RWA) tokenization platform, built on Hedera blockchain with advanced trading capabilities.

## 🚀 Features

### Core Functionality
- **Real-World Asset Management** - Create, verify, and manage RWA tokens
- **AMC Pool Management** - Create and manage Asset Management Company pools
- **Advanced Trading System** - Order book, yield distribution, risk assessment
- **Trust Token Economy** - Dual-token system with HBAR and TRUST tokens
- **Hedera Integration** - Full HTS (Token Service) and HCS (Consensus Service) integration
- **IPFS Storage** - Decentralized file storage for asset metadata
- **Admin Dashboard** - Comprehensive admin management system

### Blockchain Features
- **Hedera Token Service (HTS)** - Create and manage fungible and non-fungible tokens
- **Hedera Consensus Service (HCS)** - Immutable audit trail for all operations
- **Smart Contract Integration** - Deployed contracts for advanced functionality
- **Multi-signature Support** - Secure transaction signing with HashPack wallet

### Trading Features
- **Advanced Order Book** - Market, limit, and stop orders
- **Automated Yield Distribution** - Automatic dividend payments to investors
- **Risk Assessment System** - Real-time risk scoring and warnings
- **Centrifuge-style Trading** - Professional-grade trading interface

## 🏗️ Architecture

### Core Modules
- **AssetsModule** - Asset creation and management
- **InvestmentsModule** - Investment tracking and analytics
- **VerificationModule** - Asset verification workflows
- **PortfolioModule** - User portfolio management
- **AnalyticsModule** - Analytics and reporting
- **TradingModule** - Trading functionality
- **AMCModule** - AMC management
- **AMCPoolsModule** - Pool creation and management
- **PoolTokensModule** - Pool token management
- **DividendsModule** - Dividend distribution
- **RWAModule** - Real World Assets
- **CollectionsModule** - Asset collections
- **RoyaltiesModule** - Royalty management

### Service Modules
- **HederaModule** - Blockchain integration
- **ChainlinkModule** - Oracle price feeds
- **UsersModule** - User management
- **FileUploadModule** - File handling
- **NotificationsModule** - Notification system
- **WebSocketModule** - Real-time communication
- **AdminModule** - Admin functionality
- **PublicModule** - Public endpoints
- **MobileModule** - Mobile support
- **PaymentsModule** - Payment processing
- **ExternalApisModule** - External API integration
- **TokenomicsModule** - Token economics
- **IPFSModule** - IPFS integration
- **PoolsModule** - Pool management
- **HealthModule** - Health checks
- **ApiModule** - API utilities
- **ActivityModule** - Activity tracking
- **KycModule** - KYC functionality

## 🛠️ Technology Stack

- **Framework**: NestJS
- **Database**: MongoDB with Mongoose
- **Blockchain**: Hedera (HTS + HCS)
- **File Storage**: IPFS (Pinata)
- **Authentication**: JWT
- **Validation**: Class-validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Deployment**: Docker

## 📦 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd trustbridge-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp env.example .env
```

4. **Configure environment variables**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/trustbridge

# Hedera
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.xxxxxx
HEDERA_PRIVATE_KEY=your-private-key

# JWT
JWT_SECRET=your-jwt-secret

# IPFS
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_KEY=your-pinata-secret

# Trust Token
TRUST_TOKEN_ID=0.0.xxxxxx
TREASURY_ACCOUNT_ID=0.0.xxxxxx
```

5. **Start the application**
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token

### Assets
- `GET /api/assets` - List all assets
- `POST /api/assets` - Create new asset
- `GET /api/assets/:id` - Get asset details
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### AMC Pools
- `GET /api/amc-pools` - List all pools
- `POST /api/amc-pools` - Create new pool
- `GET /api/amc-pools/:id` - Get pool details
- `PUT /api/amc-pools/:id/launch` - Launch pool
- `DELETE /api/amc-pools/:id` - Delete pool

### Trading
- `GET /api/trading/orderbook/:poolId` - Get order book
- `POST /api/trading/orders` - Place order
- `DELETE /api/trading/orders/:id` - Cancel order
- `GET /api/trading/trades/recent` - Recent trades
- `GET /api/trading/stats` - Trading statistics

### Admin
- `GET /api/admin/assets` - Admin asset management
- `POST /api/admin/assets/:id/approve` - Approve asset
- `POST /api/admin/assets/:id/reject` - Reject asset
- `GET /api/admin/users` - User management
- `GET /api/admin/analytics` - Admin analytics

### Hedera Integration
- `POST /api/hedera/tokens/create` - Create token
- `POST /api/hedera/hcs/submit` - Submit to HCS
- `GET /api/hedera/hcs/messages` - Get HCS messages
- `POST /api/hedera/transfer` - Transfer tokens

## 🗄️ Database Schema

### Key Collections
- **Assets** - Real-world asset information
- **Users** - User profiles and authentication
- **AMCPools** - Asset management company pools
- **TradingOrders** - Trading order book
- **TradeExecutions** - Executed trades
- **Investments** - User investments
- **VerificationRequests** - Asset verification requests

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Access Control** - Admin, AMC, and user roles
- **Input Validation** - Comprehensive request validation
- **Rate Limiting** - API rate limiting protection
- **CORS Configuration** - Cross-origin resource sharing
- **Environment Variables** - Secure configuration management

## 📊 Monitoring & Health

- **Health Checks** - Application health monitoring
- **Logging** - Comprehensive logging system
- **Analytics** - Usage analytics and reporting
- **Error Handling** - Robust error handling and reporting

## 🚀 Deployment

### Docker Deployment
```bash
# Build image
docker build -t trustbridge-backend .

# Run container
docker run -p 3000:3000 trustbridge-backend
```

### Production Deployment
```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

## 🔧 Development

### Available Scripts
- `npm run start` - Start the application
- `npm run start:dev` - Start in development mode
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build the application
- `npm run test` - Run tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run tests with coverage

### Code Structure
```
src/
├── assets/          # Asset management
├── auth/            # Authentication
├── admin/           # Admin functionality
├── amc-pools/       # AMC pool management
├── trading/         # Trading system
├── hedera/          # Hedera integration
├── schemas/         # Database schemas
├── services/        # Business logic services
└── utils/           # Utility functions
```

## 📝 API Documentation

API documentation is available at `/api-docs` when the server is running.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**TrustBridge Backend** - Empowering Real-World Asset Tokenization on Hedera Blockchain 🚀
