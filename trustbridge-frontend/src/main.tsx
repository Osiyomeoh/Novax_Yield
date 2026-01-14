import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import App from './App'
import './index.css'
// Initialize i18n
import './i18n/config'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})

// Get Privy App ID from environment
const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

// Warn if App ID is missing (but let Privy validate the format)
if (!privyAppId) {
  console.warn('⚠️ VITE_PRIVY_APP_ID is not set. Please add it to your .env file.');
  console.warn('Get your App ID from: https://privy.io');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrivyProvider
      appId={privyAppId}
      config={{
        // Customize login methods - social logins need to be enabled in Privy dashboard
        loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord'],
        // Appearance customization
        appearance: {
          theme: 'light',
          accentColor: '#000000',
          logo: 'https://trustbridge.africa/logo.png',
        },
        // Embedded wallet configuration
        // We use programmatic wallet creation instead of automatic to have more control
        embeddedWallets: {
          createOnLogin: 'users-without-wallets', // Auto-create wallets for email/social login users
          // Wallets are created programmatically in PrivyWalletContext for better error handling
        },
        // Disable Solana wallet support (we only use Ethereum)
        externalWallets: {
          solana: {
            enabled: false,
          },
        },
        // Note: Mantle network chains are not natively supported by Privy
        // Users can switch to Mantle network after connecting their wallet
        // Or configure custom chains if Privy supports them in the future
      }}
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </PrivyProvider>
  </React.StrictMode>
)
