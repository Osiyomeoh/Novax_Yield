# TrustBridge Frontend

A modern React-based frontend application for the TrustBridge Real-World Asset (RWA) tokenization platform, featuring advanced trading capabilities, asset management, and Hedera blockchain integration.

## 🚀 Features

### Core Functionality
- **Real-World Asset Management** - Create, view, and manage RWA tokens
- **AMC Pool Management** - Create and manage Asset Management Company investment pools
- **Advanced Trading Interface** - Professional-grade trading with order book functionality
- **Trust Token Economy** - Integrated HBAR and TRUST token management
- **Portfolio Management** - Comprehensive investment tracking and analytics
- **Admin Dashboard** - Asset approval and platform management

### Blockchain Features
- **Hedera Integration** - Full HTS (Token Service) and HCS (Consensus Service) integration
- **HashPack Wallet** - Secure wallet connection and transaction signing
- **Smart Contract Interaction** - Direct interaction with deployed contracts
- **IPFS Integration** - Decentralized file storage for asset metadata
- **Multi-signature Support** - Secure transaction signing with user approval

### Trading Features
- **Centrifuge-style Interface** - Professional investment experience
- **Advanced Order Book** - Market, limit, and stop orders
- **Automated Yield Distribution** - Yield tracking and claiming
- **Risk Assessment** - Real-time risk scoring and warnings
- **Real-time Updates** - Live price feeds and portfolio updates

## 🏗️ Technology Stack

### Frontend Framework
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **Tailwind CSS** for styling
- **React Hook Form** for form management

### Blockchain Integration
- **Hedera SDK** for blockchain interactions
- **HashPack Wallet** for wallet connection
- **IPFS** for file storage
- **Smart Contracts** for advanced functionality

### State Management
- **React Context** for global state
- **Custom Hooks** for reusable logic
- **Local Storage** for persistence

## 📁 Project Structure

```
trustbridge-frontend/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── Assets/             # Asset management components
│   │   ├── AMC/                # AMC pool management
│   │   ├── Trading/            # Trading interface components
│   │   ├── Layout/             # Layout components
│   │   ├── RWA/                # Real-world asset components
│   │   ├── Admin/              # Admin functionality
│   │   ├── Auth/               # Authentication components
│   │   ├── UI/                 # Reusable UI components
│   │   └── Verification/       # Verification components
│   ├── pages/                  # Main application pages
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── Profile.tsx         # User profile
│   │   ├── CreateAsset.tsx     # Asset creation
│   │   ├── AssetMarketplace.tsx # Asset marketplace
│   │   └── AdminDashboard.tsx  # Admin dashboard
│   ├── contexts/               # React contexts
│   │   ├── WalletContext.tsx   # Wallet connection
│   │   ├── AuthContext.tsx     # Authentication
│   │   ├── AdminContext.tsx    # Admin functionality
│   │   └── ThemeContext.tsx    # Theme management
│   ├── hooks/                  # Custom React hooks
│   │   ├── useWallet.ts        # Wallet integration
│   │   ├── useAuth.ts          # Authentication
│   │   └── useTrustTokenBalance.ts # Token balance
│   ├── services/               # API and external services
│   │   ├── api.ts              # API client
│   │   ├── hederaService.ts    # Hedera integration
│   │   └── ipfsService.ts      # IPFS integration
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   └── config/                 # Configuration files
├── public/                     # Static assets
├── images/                     # Image assets
└── package.json                # Dependencies
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- HashPack wallet
- Hedera testnet account

### Installation
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure environment variables
# Edit .env file with your configuration

# Start development server
npm run dev
```

### Environment Variables
```env
VITE_API_URL=http://localhost:3000/api
VITE_HEDERA_NETWORK=testnet
VITE_TRUST_TOKEN_ID=0.0.xxxxxx
VITE_TREASURY_ACCOUNT_ID=0.0.xxxxxx
VITE_PINATA_API_KEY=your-pinata-key
VITE_PINATA_SECRET_KEY=your-pinata-secret
```

## 🚀 Getting Started

### 1. Wallet Connection
- Install HashPack wallet extension
- Connect your Hedera account
- Ensure you have testnet HBAR and TRUST tokens

### 2. Asset Creation
- Navigate to the asset creation page
- Upload asset documentation and images
- Provide asset details and valuation
- Submit for admin approval

### 3. AMC Pool Management
- Create investment pools with multiple assets
- Set pool parameters (APY, minimum investment, etc.)
- Launch pools for public investment
- Manage pool performance and distributions

### 4. Trading
- Browse available investment opportunities
- Place orders through the advanced order book
- Monitor portfolio performance
- Claim yield distributions

## 🔧 Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

### Testing
```bash
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
```

## 📱 Component Overview

### Core Components
- **Dashboard** - Main application dashboard
- **AssetMarketplace** - Asset discovery and trading
- **CreateAsset** - Asset creation interface
- **Profile** - User profile and portfolio
- **AdminDashboard** - Admin management interface

### Trading Components
- **AdvancedOrderBook** - Order book interface
- **YieldDashboard** - Yield management
- **RiskDashboard** - Risk assessment
- **MarketplaceAssetModal** - Asset details and trading

### AMC Components
- **AMCPoolManagement** - Pool creation and management
- **DividendManagement** - Dividend distribution
- **AdminManagement** - Admin user management

## 🔐 Security Features

- **Wallet Integration** - Secure HashPack wallet connection
- **Transaction Signing** - User approval for all transactions
- **Input Validation** - Comprehensive form validation
- **Error Handling** - Robust error handling and user feedback
- **Environment Variables** - Secure configuration management

## 🎨 UI/UX Features

- **Responsive Design** - Mobile-first responsive design
- **Dark/Light Theme** - Theme switching capability
- **Modern UI** - Clean and professional interface
- **Loading States** - Smooth loading animations
- **Toast Notifications** - User feedback and notifications
- **Modal Interfaces** - Intuitive modal-based interactions

## 📊 State Management

### Context Providers
- **WalletContext** - Wallet connection and blockchain interactions
- **AuthContext** - Authentication state and user management
- **AdminContext** - Admin functionality and permissions
- **ThemeContext** - Theme and UI state management

### Custom Hooks
- **useWallet** - Wallet connection and blockchain operations
- **useAuth** - Authentication and user management
- **useTrustTokenBalance** - Token balance tracking
- **useToast** - Toast notification management

## 🔗 API Integration

### Backend API
- **Asset Management** - CRUD operations for assets
- **Pool Management** - AMC pool operations
- **Trading Operations** - Order placement and execution
- **User Management** - Authentication and profile management

### Blockchain Services
- **Hedera Service** - HTS and HCS operations
- **IPFS Service** - File upload and storage
- **Contract Service** - Smart contract interactions

## 🚀 Deployment

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Configuration
- Configure production environment variables
- Update API endpoints for production
- Set up CDN for static assets

## 🧪 Testing

### Unit Testing
```bash
npm run test
```

### Integration Testing
```bash
npm run test:integration
```

### E2E Testing
```bash
npm run test:e2e
```

## 📈 Performance Optimization

- **Code Splitting** - Lazy loading of components
- **Bundle Optimization** - Optimized build output
- **Image Optimization** - Optimized image loading
- **Caching** - Strategic caching of API responses
- **Memoization** - React.memo and useMemo optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**TrustBridge Frontend** - Modern React Interface for RWA Tokenization 🚀

*Built with ❤️ for the future of decentralized finance*