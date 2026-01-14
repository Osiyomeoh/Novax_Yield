import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Client, LedgerId } from '@hashgraph/sdk';
import { DAppConnector, HederaJsonRpcMethod, HederaSessionEvent, HederaChainId } from '@hashgraph/hedera-wallet-connect';

interface WalletContextType {
  isConnected: boolean;
  accountId: string | null;
  address: string | null; // Alias for compatibility
  balance: string | null;
  walletType: 'hashpack' | null;
  hederaClient: Client | null;
  signer: any | null; // HashPack DAppSigner
  connector: DAppConnector | null; // HashPack DAppConnector
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  loading: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// OLD HEDERA IMPLEMENTATION - DEPRECATED
// WalletProvider is now re-exported from RainbowWalletContext at the bottom of this file
// Keeping this code for reference but it's not exported anymore
const WalletProviderOld: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<'hashpack' | null>(null);
  const [hederaClient, setHederaClient] = useState<Client | null>(null);
  const [signer, setSigner] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connector, setConnector] = useState<DAppConnector | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  // Use ref to track connector for immediate access (avoids state update race condition)
  const connectorRef = useRef<DAppConnector | null>(null);
  // Track if connector was successfully initialized (not just created)
  const isInitializedRef = useRef<boolean>(false);
  // Track IndexedDB health status to prevent repeated checks and failed attempts
  const indexedDBHealthRef = useRef<{ checked: boolean; working: boolean; error?: string } | null>(null);

  // Clear all WalletConnect and IndexedDB data (mimics incognito mode)
  const clearAllWalletData = async (): Promise<void> => {
    console.log('🧹 Clearing all WalletConnect and IndexedDB data...');
    
    try {
      // Clear all WalletConnect localStorage keys
      const allKeys = Object.keys(localStorage);
      const walletConnectKeys = allKeys.filter(key => 
        key.startsWith('wc@') || 
        key.startsWith('WALLETCONNECT') ||
        key.startsWith('walletConnect') ||
        key.includes('walletconnect')
      );
      
      console.log(`🧹 Clearing ${walletConnectKeys.length} WalletConnect localStorage keys...`);
      walletConnectKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove ${key}:`, e);
        }
      });
      
      // Clear our own wallet keys
      localStorage.removeItem('walletConnected');
      localStorage.removeItem('walletAccountId');
      localStorage.removeItem('walletType');
      
      // Try to delete all IndexedDB databases (WalletConnect uses IndexedDB)
      if (window.indexedDB) {
        try {
          // Get all databases - we'll try to delete common WalletConnect database names
          const databasesToDelete = [
            'walletconnect',
            'walletconnect-v2',
            'WALLETCONNECT_V2',
            'wc@2',
            'wc-core',
            'wc-client',
            'wc-relayer',
          ];
          
          for (const dbName of databasesToDelete) {
            try {
              const deleteRequest = indexedDB.deleteDatabase(dbName);
              await new Promise((resolve, reject) => {
                deleteRequest.onsuccess = () => resolve(undefined);
                deleteRequest.onerror = () => reject(deleteRequest.error);
                deleteRequest.onblocked = () => {
                  console.warn(`IndexedDB database ${dbName} is blocked, will retry...`);
                  resolve(undefined); // Don't fail if blocked
                };
                setTimeout(() => resolve(undefined), 2000); // Timeout after 2 seconds
              });
              console.log(`✅ Deleted IndexedDB database: ${dbName}`);
            } catch (e) {
              console.warn(`⚠️ Failed to delete IndexedDB database ${dbName}:`, e);
            }
          }
        } catch (e) {
          console.warn('⚠️ Failed to clear IndexedDB databases:', e);
        }
      }
      
      console.log('✅ All WalletConnect and IndexedDB data cleared');
    } catch (error) {
      console.error('❌ Error clearing wallet data:', error);
    }
  };

  // Test if IndexedDB is actually working (not just checking if API exists)
  const testIndexedDBHealth = async (): Promise<{ working: boolean; error?: string }> => {
    try {
      if (!window.indexedDB) {
        return { working: false, error: 'IndexedDB API not available' };
      }
      
      // Try to open a test database to verify IndexedDB actually works
      return new Promise((resolve) => {
        const testDBName = `trustbridge-health-check-${Date.now()}`;
        let resolved = false;
        
        const request = indexedDB.open(testDBName, 1);
        
        request.onsuccess = () => {
          if (resolved) return;
          resolved = true;
          try {
            request.result.close();
            const deleteRequest = indexedDB.deleteDatabase(testDBName);
            deleteRequest.onsuccess = () => resolve({ working: true });
            deleteRequest.onerror = () => resolve({ working: true }); // DB works even if delete fails
            deleteRequest.onblocked = () => resolve({ working: true }); // DB works even if delete is blocked
            setTimeout(() => resolve({ working: true }), 1000); // Timeout delete
          } catch (e) {
            resolve({ working: true }); // Opening succeeded, so IndexedDB works
          }
        };
        
        request.onerror = () => {
          if (resolved) return;
          resolved = true;
          const error = request.error?.name || 'Unknown error';
          resolve({ working: false, error: `IndexedDB error: ${error}` });
        };
        
        request.onblocked = () => {
          if (resolved) return;
          resolved = true;
          resolve({ working: false, error: 'IndexedDB is blocked' });
        };
        
        // Timeout after 3 seconds
        setTimeout(() => {
          if (resolved) return;
          resolved = true;
          resolve({ working: false, error: 'IndexedDB test timed out' });
        }, 3000);
      });
    } catch (error) {
      return { working: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Fetch HBAR balance from Mirror Node
  const fetchBalance = async (accountId: string) => {
    try {
      console.log('Fetching balance for account:', accountId);
      const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/accounts/${accountId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Account not found on Mirror Node, setting balance to 0');
          setBalance('0');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const hbarBalance = data.balance?.balance || 0;
      const hbarAmount = hbarBalance / 100000000; // Convert tinybars to HBAR
      setBalance(hbarAmount.toString());
      console.log('Balance fetched successfully:', hbarAmount, 'HBAR');
    } catch (error) {
      console.warn('Failed to fetch balance (non-critical):', error);
      setBalance('0'); // Set to 0 if fetch fails
    }
  };

  // Initialize HashPack connection and restore previous session
  const initializeWallet = async () => {
    if (isInitializing || (connectorRef.current && isInitializedRef.current)) {
      console.log('Wallet already initialized or initializing, skipping...');
      return;
    }
    
    setIsInitializing(true);
    try {
        // Test IndexedDB health first - if it's broken, skip initialization entirely
        // Cache the result to avoid repeated checks
        let indexedDBHealth;
        if (indexedDBHealthRef.current?.checked) {
          indexedDBHealth = { working: indexedDBHealthRef.current.working, error: indexedDBHealthRef.current.error };
          console.log('🔍 Using cached IndexedDB health status:', indexedDBHealth.working ? 'working' : `broken (${indexedDBHealth.error})`);
        } else {
          console.log('🔍 Testing IndexedDB health...');
          indexedDBHealth = await testIndexedDBHealth();
          indexedDBHealthRef.current = { checked: true, working: indexedDBHealth.working, error: indexedDBHealth.error };
        }
        
        if (!indexedDBHealth.working) {
          console.error('❌ IndexedDB is not working:', indexedDBHealth.error);
          
          // Provide more specific error message based on the error type
          let errorMessage = `IndexedDB is not working in your browser (${indexedDBHealth.error}). This is required for wallet connection.\n\n`;
          
          if (indexedDBHealth.error?.includes('UnknownError') || indexedDBHealth.error?.includes('backing store')) {
            errorMessage += `🔍 This error typically occurs when:\n`;
            errorMessage += `• Browser extensions (ad blockers, privacy tools) are blocking IndexedDB\n`;
            errorMessage += `• IndexedDB state is corrupted from previous sessions\n`;
            errorMessage += `• Browser storage quota is exceeded\n\n`;
            errorMessage += `✅ Solutions:\n`;
            errorMessage += `1. Use an incognito/private window (works around extensions and corrupted state)\n`;
            errorMessage += `2. Disable browser extensions temporarily\n`;
            errorMessage += `3. Clear browser data/cache for this site\n`;
            errorMessage += `4. Check browser storage permissions in settings\n`;
            errorMessage += `5. Try a different browser\n`;
            errorMessage += `6. Restart your browser`;
          } else {
            errorMessage += `Please try: 1) Using an incognito/private window, 2) Clearing browser data/cache, 3) Checking browser storage permissions, or 4) Trying a different browser.`;
          }
          
          setError(errorMessage);
          setIsInitializing(false);
          return; // Skip initialization entirely
        }
        
        console.log('✅ IndexedDB health check passed');
        
        // Check if there's an active connection
        const hasStoredConnection = localStorage.getItem('walletConnected') === 'true';
        
        // If no active connection, proactively clear all WalletConnect data (mimics incognito mode)
        // This helps with production environments where stale cached data causes IndexedDB errors
        if (!hasStoredConnection) {
          console.log('🧹 No active connection found - clearing all WalletConnect data proactively (mimics incognito mode)...');
          await clearAllWalletData();
          // Wait a bit for IndexedDB to release any locks
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('✅ Cleared all WalletConnect data, proceeding with initialization...');
        } else {
          console.log('🔒 Active connection found - keeping WalletConnect session data');
        }
        
        const metadata = {
          name: "TrustBridge Africa",
          description: "African RWA Tokenization Platform",
          url: "https://trustbridge.africa",
          icons: ["https://trustbridge.africa/icon.png"]
        };

        console.log('🔧 Creating DAppConnector with project ID:', (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID || '57c1a62e8228b65451c34d64d9f63537');
        
        const newConnector = new DAppConnector(
          metadata,
          LedgerId.TESTNET,
          (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID || '57c1a62e8228b65451c34d64d9f63537',
          Object.values(HederaJsonRpcMethod),
          [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
          [HederaChainId.Testnet]
        );

        console.log('🔧 DAppConnector created, calling init()...');
        
        // Initialize with timeout to prevent hanging
        // Also catch unhandled promise rejections from IndexedDB
        try {
          const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
          const initTimeoutMs = isProduction ? 20000 : 10000; // 20 seconds in production, 10 seconds locally
          
          // Set up global error handler to catch IndexedDB errors
          let indexedDBError: Error | null = null;
          
          const errorHandler = (event: ErrorEvent) => {
            if (event.error && (
              event.error.message?.includes('indexedDB') ||
              event.error.message?.includes('IndexedDB') ||
              event.error.message?.includes('backing store') ||
              event.error.name === 'UnknownError'
            )) {
              indexedDBError = event.error;
              console.error('🔴 Caught IndexedDB error:', event.error);
              return true; // Prevent default error handling
            }
            return false;
          };
          
          const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
            if (event.reason && (
              event.reason.message?.includes('indexedDB') ||
              event.reason.message?.includes('IndexedDB') ||
              event.reason.message?.includes('backing store') ||
              event.reason.name === 'UnknownError' ||
              (event.reason.toString && event.reason.toString().includes('UnknownError'))
            )) {
              indexedDBError = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
              console.error('🔴 Caught unhandled IndexedDB rejection:', event.reason);
              event.preventDefault(); // Prevent default error handling
            }
          };
          
          // Add error handlers
          window.addEventListener('error', errorHandler);
          window.addEventListener('unhandledrejection', unhandledRejectionHandler);
          
          try {
            const initPromise = newConnector.init();
            const initTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`WalletConnect init() timed out after ${initTimeoutMs/1000} seconds`)), initTimeoutMs)
            );
            
            await Promise.race([initPromise, initTimeout]);
            
            // Check if IndexedDB error occurred
            if (indexedDBError) {
              throw indexedDBError;
            }
            
            console.log('🔧 DAppConnector.init() completed successfully');
          } finally {
            // Remove error handlers
            window.removeEventListener('error', errorHandler);
            window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
          }
          
          // Add a delay to ensure WalletConnect is fully ready (longer in production)
          const initDelay = isProduction ? 1000 : 500; // 1 second in production, 500ms locally
          await new Promise(resolve => setTimeout(resolve, initDelay));
          
          // Only set connector if init() succeeded
          connectorRef.current = newConnector;
          setConnector(newConnector);
          isInitializedRef.current = true; // Mark as successfully initialized
          console.log('✅ Wallet connector initialized successfully');
        } catch (initError) {
          // If init() fails, still set the connector - it might work on retry
          // The connector can exist even if init() failed (might be a timing/network issue)
          console.error('❌ WalletConnect init() failed:', initError);
          
          // Check if it's an IndexedDB error
          const errorMessage = initError instanceof Error ? initError.message : String(initError);
          const isIndexedDBError = errorMessage.includes('indexedDB') || 
                                   errorMessage.includes('IndexedDB') || 
                                   errorMessage.includes('backing store') ||
                                   errorMessage.includes('UnknownError');
          
          if (isIndexedDBError) {
            console.warn('⚠️ IndexedDB error detected - clearing all WalletConnect data and retrying...');
            
            // Clear all WalletConnect and IndexedDB data (mimics incognito mode)
            await clearAllWalletData();
            
            // Wait a bit for IndexedDB to release locks
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try to initialize again after clearing data
            try {
              console.log('🔄 Retrying initialization after clearing data...');
              const retryInitPromise = newConnector.init();
              const retryInitTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Retry init() timed out after 20 seconds')), 20000)
              );
              
              await Promise.race([retryInitPromise, retryInitTimeout]);
              console.log('✅ Retry initialization succeeded!');
              
              // Success - set connector and mark as initialized
              connectorRef.current = newConnector;
              setConnector(newConnector);
              isInitializedRef.current = true;
              setError(null); // Clear error
              console.log('✅ Wallet connector initialized successfully after retry');
            } catch (retryError) {
              console.error('❌ Retry initialization also failed:', retryError);
              // Still set connector - might work on manual connect
              connectorRef.current = newConnector;
              setConnector(newConnector);
              isInitializedRef.current = false;
              setError('IndexedDB is blocked or unavailable. Please try: 1) Refreshing the page, 2) Using an incognito/private window, 3) Checking browser storage permissions, or 4) Trying a different browser.');
            }
          } else {
            console.warn('⚠️ Init failed but setting connector anyway (will retry on connect)');
            // Still set connector - might be a network/timing issue
            connectorRef.current = newConnector;
            setConnector(newConnector);
            isInitializedRef.current = false; // Mark as not initialized
            setError(`Wallet initialization failed: ${errorMessage}. Will retry when you connect.`);
          }
        }
        
        // Check for existing connections and restore session (only if init succeeded)
        if (isInitializedRef.current && connectorRef.current && connectorRef.current.signers.length > 0) {
          console.log('Found existing HashPack connection, restoring session...');
          const signer = connectorRef.current.signers[0];
          const accountId = await signer.getAccountId();
          const hederaClient = Client.forTestnet();
          // Set the operator to the connected account for queries
          console.log('🔧 Setting operator on Hedera client...');
          // Note: DAppSigner doesn't need operator set for queries, it handles this internally
          
          setIsConnected(true);
          setAccountId(accountId.toString());
          setAddress(accountId.toString());
          setWalletType('hashpack');
          setSigner(signer);
          setHederaClient(hederaClient);
          await fetchBalance(accountId.toString());
          
          // Store connection state in localStorage for persistence
          localStorage.setItem('walletConnected', 'true');
          localStorage.setItem('walletAccountId', accountId.toString());
          localStorage.setItem('walletType', 'hashpack');
          
          console.log('Wallet session restored:', accountId.toString());
        } else {
          // Check localStorage for previous connection
          const wasConnected = localStorage.getItem('walletConnected') === 'true';
          const storedAccountId = localStorage.getItem('walletAccountId');
          const storedWalletType = localStorage.getItem('walletType');
          
          console.log('Checking localStorage for wallet persistence:', {
            wasConnected,
            storedAccountId,
            storedWalletType,
            allKeys: Object.keys(localStorage)
          });
          
          if (wasConnected && storedAccountId && storedWalletType === 'hashpack') {
            console.log('Found stored wallet connection, but signer not available - requiring reconnection...');
            // Clear the stored connection since we can't restore the signer
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('walletAccountId');
            localStorage.removeItem('walletType');
            console.log('Cleared stored wallet connection - user needs to reconnect');
          } else {
            console.log('No stored wallet connection found:', {
              wasConnected,
              hasAccountId: !!storedAccountId,
              walletTypeMatch: storedWalletType === 'hashpack'
            });
          }
        }
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
        setError(`Wallet initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsInitializing(false);
        console.log('🔧 Wallet initialization completed, connector status:', !!connectorRef.current);
      }
  };

  useEffect(() => {
    initializeWallet();
  }, []);

  const connectWallet = async () => {
    setLoading(true);
    setError(null);
    console.log('🔌 Attempting to connect wallet, connector status:', !!connectorRef.current);

    try {
      // Check IndexedDB health first - if it's broken, don't try to initialize
      if (indexedDBHealthRef.current?.checked && !indexedDBHealthRef.current.working) {
        console.error('❌ IndexedDB is broken - cannot initialize wallet');
        
        // Provide more specific error message based on the error type
        let errorMessage = `IndexedDB is not working in your browser (${indexedDBHealthRef.current.error}). This is required for wallet connection.\n\n`;
        
        if (indexedDBHealthRef.current.error?.includes('UnknownError') || indexedDBHealthRef.current.error?.includes('backing store')) {
          errorMessage += `🔍 This error typically occurs when:\n`;
          errorMessage += `• Browser extensions (ad blockers, privacy tools) are blocking IndexedDB\n`;
          errorMessage += `• IndexedDB state is corrupted from previous sessions\n`;
          errorMessage += `• Browser storage quota is exceeded\n\n`;
          errorMessage += `✅ Solutions:\n`;
          errorMessage += `1. Use an incognito/private window (works around extensions and corrupted state)\n`;
          errorMessage += `2. Disable browser extensions temporarily\n`;
          errorMessage += `3. Clear browser data/cache for this site\n`;
          errorMessage += `4. Check browser storage permissions in settings\n`;
          errorMessage += `5. Try a different browser\n`;
          errorMessage += `6. Restart your browser`;
        } else {
          errorMessage += `Please try: 1) Using an incognito/private window, 2) Clearing browser data/cache, 3) Checking browser storage permissions, or 4) Trying a different browser.`;
        }
        
        setError(errorMessage);
        setLoading(false);
        return;
      }
      
      // Use ref for immediate access (avoids state update race condition)
      let currentConnector = connectorRef.current;
      
      if (!currentConnector) {
        console.log('⚠️ Connector not ready, waiting for initialization...');
        console.log('Initialization status:', { isInitializing, connectorRef: !!connectorRef.current });
        
        // Wait for initialization to complete (longer timeout in production)
        const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
        const maxAttempts = isProduction ? 30 : 20; // 3 seconds in production, 2 seconds locally
        
        let attempts = 0;
        while (!currentConnector && (isInitializing || attempts < maxAttempts)) {
          await new Promise(resolve => setTimeout(resolve, 100));
          currentConnector = connectorRef.current; // Check ref on each iteration
          attempts++;
          
          if (attempts % 10 === 0) {
            console.log(`⏳ Still waiting for connector... (${attempts}/${maxAttempts})`);
          }
        }
        
        if (!currentConnector) {
          // If connector still not ready, try to initialize it now (lazy initialization)
          console.log('🔄 Connector not ready, attempting lazy initialization...');
          try {
            await initializeWallet();
            currentConnector = connectorRef.current;
            
            if (!currentConnector) {
              // Check if IndexedDB is broken (initialization might have failed due to IndexedDB)
              if (indexedDBHealthRef.current?.checked && !indexedDBHealthRef.current.working) {
                console.error('❌ IndexedDB is broken - cannot initialize wallet');
                
                // Provide more specific error message based on the error type
                let errorMessage = `IndexedDB is not working in your browser (${indexedDBHealthRef.current.error}). This is required for wallet connection.\n\n`;
                
                if (indexedDBHealthRef.current.error?.includes('UnknownError') || indexedDBHealthRef.current.error?.includes('backing store')) {
                  errorMessage += `🔍 This error typically occurs when:\n`;
                  errorMessage += `• Browser extensions (ad blockers, privacy tools) are blocking IndexedDB\n`;
                  errorMessage += `• IndexedDB state is corrupted from previous sessions\n`;
                  errorMessage += `• Browser storage quota is exceeded\n\n`;
                  errorMessage += `✅ Solutions:\n`;
                  errorMessage += `1. Use an incognito/private window (works around extensions and corrupted state)\n`;
                  errorMessage += `2. Disable browser extensions temporarily\n`;
                  errorMessage += `3. Clear browser data/cache for this site\n`;
                  errorMessage += `4. Check browser storage permissions in settings\n`;
                  errorMessage += `5. Try a different browser\n`;
                  errorMessage += `6. Restart your browser`;
                } else {
                  errorMessage += `Please try: 1) Using an incognito/private window, 2) Clearing browser data/cache, 3) Checking browser storage permissions, or 4) Trying a different browser.`;
                }
                
                setError(errorMessage);
                setLoading(false);
                return;
              }
              
              // Wait a bit more after lazy initialization
              await new Promise(resolve => setTimeout(resolve, 500));
              currentConnector = connectorRef.current;
            }
          } catch (lazyInitError) {
            console.error('Lazy initialization failed:', lazyInitError);
            // Check if it's an IndexedDB error
            const errorMessage = lazyInitError instanceof Error ? lazyInitError.message : String(lazyInitError);
            if (errorMessage.includes('IndexedDB') || errorMessage.includes('indexedDB')) {
              setError(`IndexedDB is not working in your browser. This is required for wallet connection. Please try: 1) Using an incognito/private window, 2) Clearing browser data/cache, 3) Checking browser storage permissions, or 4) Trying a different browser.`);
              setLoading(false);
              return;
            }
          }
        }
        
        if (!currentConnector) {
          // Check if IndexedDB is broken before showing generic error
          if (indexedDBHealthRef.current?.checked && !indexedDBHealthRef.current.working) {
            console.error('❌ IndexedDB is broken - cannot initialize wallet');
            setError(`IndexedDB is not working in your browser (${indexedDBHealthRef.current.error}). This is required for wallet connection. Please try: 1) Using an incognito/private window, 2) Clearing browser data/cache, 3) Checking browser storage permissions, or 4) Trying a different browser.`);
            setLoading(false);
            return;
          }
          
          console.error('❌ Wallet initialization failed - connector not available');
          throw new Error('Wallet initialization failed - please refresh the page or try again');
        }
        
        console.log('✅ Connector ready');
      }

      // Check if connector is actually initialized before trying to use it
      if (!isInitializedRef.current) {
        console.warn('⚠️ Connector exists but not initialized, attempting to initialize now...');
        try {
          // Try to initialize (don't check IndexedDB first - let init() handle errors)
          const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
          const initTimeoutMs = isProduction ? 20000 : 10000;
          
          const initPromise = currentConnector.init();
          const initTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`WalletConnect init() timed out after ${initTimeoutMs/1000} seconds`)), initTimeoutMs)
          );
          
          await Promise.race([initPromise, initTimeout]);
          isInitializedRef.current = true;
          console.log('✅ Connector initialized successfully');
        } catch (initError) {
          console.error('❌ Failed to initialize connector:', initError);
          const errorMessage = initError instanceof Error ? initError.message : String(initError);
          const isIndexedDBError = errorMessage.includes('indexedDB') || 
                                   errorMessage.includes('IndexedDB') || 
                                   errorMessage.includes('backing store') ||
                                   errorMessage.includes('UnknownError');
          
          if (isIndexedDBError) {
            console.warn('⚠️ IndexedDB error during connect - clearing all WalletConnect data and retrying...');
            
            // Clear all WalletConnect and IndexedDB data (mimics incognito mode)
            await clearAllWalletData();
            
            // Wait a bit for IndexedDB to release locks
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try to initialize again after clearing data
            try {
              console.log('🔄 Retrying initialization after clearing data...');
              const retryInitPromise = currentConnector.init();
              const retryInitTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Retry init() timed out after 20 seconds')), 20000)
              );
              
              await Promise.race([retryInitPromise, retryInitTimeout]);
              isInitializedRef.current = true;
              console.log('✅ Retry initialization succeeded!');
            } catch (retryError) {
              console.error('❌ Retry initialization also failed:', retryError);
              throw new Error('IndexedDB is blocked or unavailable. Please try: 1) Refreshing the page, 2) Using an incognito/private window, 3) Checking browser storage permissions, or 4) Trying a different browser.');
            }
          } else {
            throw new Error(`Failed to initialize wallet: ${errorMessage}. Please refresh the page or try again.`);
          }
        }
      }

      // Open wallet modal for connection
      console.log('🔧 Opening wallet modal...');
      try {
        await currentConnector.openModal();
        console.log('✅ Wallet modal opened successfully');
      } catch (modalError) {
        // If opening modal fails, it might be because init() didn't complete
        // Try to initialize again and retry
        console.warn('⚠️ Failed to open modal, attempting to re-initialize connector:', modalError);
        try {
          // Try to initialize the connector again (don't check IndexedDB first - let init() handle errors)
          const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');
          const initTimeoutMs = isProduction ? 20000 : 10000;
          
          const initPromise = currentConnector.init();
          const initTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`WalletConnect init() timed out after ${initTimeoutMs/1000} seconds`)), initTimeoutMs)
          );
          
          await Promise.race([initPromise, initTimeout]);
          isInitializedRef.current = true;
          console.log('✅ Connector re-initialized, retrying modal...');
          await currentConnector.openModal();
          console.log('✅ Wallet modal opened successfully after re-initialization');
        } catch (retryError) {
          console.error('❌ Failed to open modal even after re-initialization:', retryError);
          const errorMessage = retryError instanceof Error ? retryError.message : String(retryError);
          const isIndexedDBError = errorMessage.includes('indexedDB') || 
                                   errorMessage.includes('IndexedDB') || 
                                   errorMessage.includes('backing store') ||
                                   errorMessage.includes('UnknownError');
          
          if (isIndexedDBError) {
            console.warn('⚠️ IndexedDB error during modal open - clearing all WalletConnect data and retrying...');
            
            // Clear all WalletConnect and IndexedDB data (mimics incognito mode)
            await clearAllWalletData();
            
            // Wait a bit for IndexedDB to release locks
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try to initialize again after clearing data
            try {
              console.log('🔄 Retrying initialization after clearing data...');
              const retryInitPromise = currentConnector.init();
              const retryInitTimeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Retry init() timed out after 20 seconds')), 20000)
              );
              
              await Promise.race([retryInitPromise, retryInitTimeout]);
              isInitializedRef.current = true;
              console.log('✅ Retry initialization succeeded, retrying modal...');
              await currentConnector.openModal();
              console.log('✅ Wallet modal opened successfully after retry');
            } catch (retryError) {
              console.error('❌ Retry initialization also failed:', retryError);
              throw new Error('IndexedDB is blocked or unavailable. Please try: 1) Refreshing the page, 2) Using an incognito/private window, 3) Checking browser storage permissions, or 4) Trying a different browser.');
            }
          } else {
            throw new Error(`Failed to open wallet connection modal: ${errorMessage}. Please try again or refresh the page.`);
          }
        }
      }
      
      // Check if connection was established
      if (currentConnector.signers.length > 0) {
        const signer = currentConnector.signers[0];
        const accountId = await signer.getAccountId();
        
        console.log('🔍 Account ID from signer (connectWallet):', accountId);
        console.log('🔍 Account ID type (connectWallet):', typeof accountId);
        console.log('🔍 Account ID toString (connectWallet):', accountId?.toString());
        
        if (!accountId) {
          console.error('❌ Failed to get account ID from signer');
          throw new Error('Failed to get account ID from signer');
        }
        
        const hederaClient = Client.forTestnet();
        // Set the operator to the connected account for queries
        console.log('🔧 Setting operator on Hedera client (connectWallet)...');
        // Note: DAppSigner doesn't need operator set for queries, it handles this internally

        setIsConnected(true);
        setAccountId(accountId.toString());
        setAddress(accountId.toString());
        setWalletType('hashpack');
        setSigner(signer);
        setHederaClient(hederaClient);
        await fetchBalance(accountId.toString());
        
        // Store connection state in localStorage for persistence
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAccountId', accountId.toString());
        localStorage.setItem('walletType', 'hashpack');
        
        console.log('Wallet connection stored in localStorage:', {
          walletConnected: localStorage.getItem('walletConnected'),
          walletAccountId: localStorage.getItem('walletAccountId'),
          walletType: localStorage.getItem('walletType')
        });
        
      } else {
        throw new Error('User cancelled connection');
      }

      console.log('HashPack connected successfully:', accountId?.toString());
    } catch (err) {
      console.error('HashPack connection failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error during connection');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    setLoading(true);
    setError(null);

    try {
      const currentConnector = connectorRef.current;
      if (currentConnector) {
        await currentConnector.disconnectAll();
        connectorRef.current = null;
        isInitializedRef.current = false; // Reset initialization flag
      }

      setIsConnected(false);
      setAccountId(null);
      setAddress(null);
      setBalance(null);
      setWalletType(null);
      setHederaClient(null);
      setSigner(null);
      
      // Clear localStorage
      localStorage.removeItem('walletConnected');
      localStorage.removeItem('walletAccountId');
      localStorage.removeItem('walletType');

      console.log('HashPack disconnected successfully');
    } catch (err) {
      console.error('Wallet disconnection failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error during disconnection');
    } finally {
      setLoading(false);
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    console.log('signMessage called:', {
      hasSigner: !!signer,
      isConnected,
      accountId
    });

    if (!signer) {
      throw new Error('No signer available. Please connect your HashPack wallet.');
    }

    try {
      // For HashPack, we'll use a different approach since transaction signing is having issues
      // We'll create a signature that the backend can accept by using account verification
      
      console.log('Creating HashPack signature using account verification method...');
      
      // Create a message hash using SHA-256
      const messageHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
      const hashArray = Array.from(new Uint8Array(messageHash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // For HashPack, we'll create a signature that includes the account ID and message hash
      // The backend will need to be modified to handle HashPack signatures differently
      const timestamp = Date.now();
      
      // Create a signature that includes the account ID for verification
      const signature = `${accountId}:${hashHex}:${timestamp}`;
      
      console.log('Created HashPack signature for message:', {
        messageLength: message.length,
        signatureLength: signature.length,
        accountId,
        messageHash: hashHex.substring(0, 16) + '...',
        timestamp
      });
      
      return signature;
    } catch (err) {
      console.error('Message signing failed:', err);
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      throw new Error(err instanceof Error ? err.message : 'Failed to sign message');
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        accountId,
        address,
        balance,
        walletType,
        hederaClient,
        signer,
        connector,
        connectWallet,
        disconnectWallet,
        signMessage,
        loading,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Re-export from PrivyWalletContext for backward compatibility
// This allows all existing imports from './WalletContext' to continue working
// Now using Privy instead of RainbowKit/Wagmi
export { useWallet, PrivyWalletProvider as WalletProvider } from './PrivyWalletContext';