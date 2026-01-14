import React, { useState, useEffect } from 'react';

// Test configuration
const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

interface TestResult {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface TokenInfo {
  token_id: string;
  balance: number;
  name?: string;
  symbol?: string;
  type?: string;
  decimals?: string;
}

const HederaBasicTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<TestResult>({ type: 'info', message: 'Ready to test basic Hedera functionality...' });
  const [isConnected, setIsConnected] = useState(false);
  const [accountId, setAccountId] = useState<string>('');
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [hederaClient, setHederaClient] = useState<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
  };

  const updateStatus = (message: string, type: TestResult['type'] = 'info') => {
    setStatus({ type, message });
  };

  // Test 1: Basic Environment Check
  const testEnvironment = () => {
    addLog('Testing basic environment...');
    
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        addLog('❌ Not in browser environment');
        updateStatus('Not in browser environment', 'error');
        return;
      }
      
      addLog('✅ Browser environment detected');
      
      // Check for required globals
      const globals = ['fetch', 'window', 'document'];
      globals.forEach(global => {
        if (typeof window[global as keyof Window] !== 'undefined') {
          addLog(`✅ ${global}: Available`);
        } else {
          addLog(`❌ ${global}: Not available`);
        }
      });
      
      updateStatus('Environment check completed', 'success');
      
    } catch (error: any) {
      addLog(`❌ Environment test failed: ${error.message}`);
      updateStatus(`Environment test failed: ${error.message}`, 'error');
    }
  };

  // Test 2: Mirror Node API
  const testMirrorNode = async () => {
    addLog('Testing Mirror Node API...');
    
    try {
      const testAccountId = '0.0.2'; // Hedera treasury account
      addLog(`Testing Mirror Node: ${MIRROR_NODE_URL}`);
      
      const response = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${testAccountId}`);
      
      if (response.ok) {
        const data = await response.json();
        addLog(`✅ Mirror Node API: Working`);
        addLog(`   Account: ${data.account}`);
        addLog(`   Balance: ${data.balance?.balance || 'N/A'}`);
        updateStatus('Mirror Node API working!', 'success');
      } else {
        addLog(`❌ Mirror Node API: HTTP ${response.status}`);
        updateStatus(`Mirror Node API failed: HTTP ${response.status}`, 'error');
      }
    } catch (error: any) {
      addLog(`❌ Mirror Node API: ${error.message}`);
      updateStatus(`Mirror Node API failed: ${error.message}`, 'error');
    }
  };

  // Test 3: Test Account Input
  const handleAccountInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAccountId(event.target.value);
  };

  // Test 4: Get Account Info from Mirror Node
  const getAccountInfo = async () => {
    if (!accountId.trim()) {
      addLog('❌ Please enter an account ID');
      updateStatus('Please enter an account ID', 'warning');
      return;
    }

    try {
      addLog(`Getting account information for: ${accountId}`);
      
      const response = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${accountId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        const info = {
          accountId: data.account,
          balance: data.balance?.balance || '0',
          key: data.key ? (typeof data.key === 'string' ? data.key : JSON.stringify(data.key)) : 'Unknown',
          memo: data.memo || 'None',
          isDeleted: data.deleted || false,
          autoRenewPeriod: data.auto_renew_period || 'Unknown'
        };
        
        setAccountInfo(info);
        setIsConnected(true);
        addLog('✅ Account information retrieved successfully');
        updateStatus(`Account info retrieved for ${accountId}`, 'success');
      } else {
        addLog(`❌ Failed to get account info: HTTP ${response.status}`);
        updateStatus(`Failed to get account info: HTTP ${response.status}`, 'error');
      }
      
    } catch (error: any) {
      addLog(`❌ Failed to get account info: ${error.message}`);
      updateStatus(`Failed to get account info: ${error.message}`, 'error');
    }
  };

  // Test 5: Get Token Balances
  const getTokenBalances = async () => {
    if (!accountId.trim()) {
      addLog('❌ Please enter an account ID first');
      updateStatus('Please enter an account ID first', 'warning');
      return;
    }

    try {
      addLog('Getting token balances from Mirror Node...');
      
      const response = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${accountId}/tokens?limit=100`);
      const data = await response.json();
      
      if (data.tokens && data.tokens.length > 0) {
        const tokenPromises = data.tokens.map(async (token: any) => {
          try {
            const tokenInfoResponse = await fetch(`${MIRROR_NODE_URL}/api/v1/tokens/${token.token_id}`);
            const tokenInfo = await tokenInfoResponse.json();
            
            return {
              token_id: token.token_id,
              balance: token.balance,
              name: tokenInfo.name || 'Unknown',
              symbol: tokenInfo.symbol || 'N/A',
              type: tokenInfo.type || 'Unknown',
              decimals: tokenInfo.decimals
            };
          } catch (error) {
            return {
              token_id: token.token_id,
              balance: token.balance,
              name: 'Unknown',
              symbol: 'N/A',
              type: 'Unknown'
            };
          }
        });
        
        const tokenInfos = await Promise.all(tokenPromises);
        setTokens(tokenInfos);
        addLog(`✅ Found ${tokenInfos.length} tokens`);
        updateStatus(`Found ${tokenInfos.length} tokens`, 'success');
      } else {
        setTokens([]);
        addLog('No tokens found');
        updateStatus('No tokens found for this account', 'info');
      }
      
    } catch (error: any) {
      addLog(`❌ Failed to get token balances: ${error.message}`);
      updateStatus(`Failed to get token balances: ${error.message}`, 'error');
    }
  };

  // Test 6: Test Hedera SDK Loading (Dynamic Import)
  const testHederaSDK = async () => {
    try {
      addLog('Testing Hedera SDK loading...');
      
      // Dynamic import to avoid optimization issues
      const { Client, AccountId, AccountBalanceQuery } = await import('@hashgraph/sdk');
      
      addLog('✅ Hedera SDK: Loaded successfully');
      addLog(`   - Client: ${typeof Client}`);
      addLog(`   - AccountId: ${typeof AccountId}`);
      addLog(`   - AccountBalanceQuery: ${typeof AccountBalanceQuery}`);
      
      // Try to create a client
      const client = Client.forTestnet();
      setHederaClient(client);
      addLog('✅ Hedera Client: Created successfully');
      
      updateStatus('Hedera SDK loaded successfully!', 'success');
      
    } catch (error: any) {
      addLog(`❌ Hedera SDK loading failed: ${error.message}`);
      updateStatus(`Hedera SDK loading failed: ${error.message}`, 'error');
    }
  };

  // Test 7: Test WalletConnect Loading (Dynamic Import)
  const testWalletConnect = async () => {
    try {
      addLog('Testing WalletConnect libraries loading...');
      
      // Dynamic import to avoid optimization issues
      const { DAppConnector, HederaJsonRpcMethod, HederaSessionEvent, HederaChainId } = await import('@hashgraph/hedera-wallet-connect');
      // const { Web3Modal } = await import('@walletconnect/modal');
      
      addLog('✅ Hedera WalletConnect: Loaded successfully');
      addLog(`   - DAppConnector: ${typeof DAppConnector}`);
      addLog(`   - HederaJsonRpcMethod: ${typeof HederaJsonRpcMethod}`);
      addLog(`   - HederaSessionEvent: ${typeof HederaSessionEvent}`);
      addLog(`   - HederaChainId: ${typeof HederaChainId}`);
      
      // addLog('✅ Web3Modal: Loaded successfully');
      // addLog(`   - Web3Modal: ${typeof Web3Modal}`);
      
      updateStatus('WalletConnect libraries loaded successfully!', 'success');
      
    } catch (error: any) {
      addLog(`❌ WalletConnect libraries loading failed: ${error.message}`);
      updateStatus(`WalletConnect libraries loading failed: ${error.message}`, 'error');
    }
  };

  // Auto-run environment test on mount
  useEffect(() => {
    testEnvironment();
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1>🔗 Hedera Basic Test (No WalletConnect Issues)</h1>
        <p>Test basic Hedera functionality without the problematic WalletConnect libraries.</p>
        
        <div style={{ 
          padding: '15px', 
          borderRadius: '6px', 
          margin: '10px 0', 
          fontWeight: 'bold',
          backgroundColor: status.type === 'success' ? '#d4edda' : 
                          status.type === 'error' ? '#f8d7da' : 
                          status.type === 'warning' ? '#fff3cd' : '#d1ecf1',
          color: status.type === 'success' ? '#155724' : 
                 status.type === 'error' ? '#721c24' : 
                 status.type === 'warning' ? '#856404' : '#0c5460',
          border: `1px solid ${status.type === 'success' ? '#c3e6cb' : 
                              status.type === 'error' ? '#f5c6cb' : 
                              status.type === 'warning' ? '#ffeaa7' : '#bee5eb'}`
        }}>
          {status.message}
        </div>
        
        <div style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '15px', margin: '10px 0' }}>
          <h4>1. Basic Environment Tests</h4>
          <button 
            onClick={testEnvironment}
            style={{ background: '#007bff', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', margin: '5px' }}
          >
            Test Environment
          </button>
          <button 
            onClick={testMirrorNode}
            style={{ background: '#007bff', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', margin: '5px' }}
          >
            Test Mirror Node
          </button>
        </div>
        
        <div style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '15px', margin: '10px 0' }}>
          <h4>2. Library Loading Tests (Dynamic Import)</h4>
          <button 
            onClick={testHederaSDK}
            style={{ background: '#007bff', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', margin: '5px' }}
          >
            Test Hedera SDK
          </button>
          <button 
            onClick={testWalletConnect}
            style={{ background: '#007bff', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', margin: '5px' }}
          >
            Test WalletConnect
          </button>
        </div>
        
        <div style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '15px', margin: '10px 0' }}>
          <h4>3. Account Testing (Manual Input)</h4>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Hedera Account ID (e.g., 0.0.123456):
            </label>
            <input
              type="text"
              value={accountId}
              onChange={handleAccountInput}
              placeholder="0.0.123456"
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <button 
            onClick={getAccountInfo}
            disabled={!accountId.trim()}
            style={{ 
              background: accountId.trim() ? '#007bff' : '#ccc', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '6px', 
              cursor: accountId.trim() ? 'pointer' : 'not-allowed', 
              margin: '5px' 
            }}
          >
            Get Account Info
          </button>
          <button 
            onClick={getTokenBalances}
            disabled={!accountId.trim()}
            style={{ 
              background: accountId.trim() ? '#007bff' : '#ccc', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '6px', 
              cursor: accountId.trim() ? 'pointer' : 'not-allowed', 
              margin: '5px' 
            }}
          >
            Get Token Balances
          </button>
        </div>
        
        {accountInfo && (
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', margin: '10px 0' }}>
            <h3>Account Information</h3>
            <div>
              <strong>Account ID:</strong> {accountInfo.accountId}<br/>
              <strong>Balance:</strong> {accountInfo.balance} HBAR<br/>
              <strong>Key:</strong> {accountInfo.key}<br/>
              <strong>Memo:</strong> {accountInfo.memo}<br/>
              <strong>Is Deleted:</strong> {accountInfo.isDeleted ? 'Yes' : 'No'}<br/>
              <strong>Auto Renew Period:</strong> {accountInfo.autoRenewPeriod}
            </div>
          </div>
        )}
        
        {tokens.length > 0 && (
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', margin: '10px 0' }}>
            <h3>Token Balances</h3>
            {tokens.map((token, index) => (
              <div key={index} style={{ background: '#e9ecef', padding: '10px', margin: '5px 0', borderRadius: '4px', borderLeft: '4px solid #007bff' }}>
                <strong>{token.name}</strong> ({token.symbol})
                <br/>Token ID: {token.token_id}
                <br/>Balance: {token.balance}
                <br/>Type: {token.type}
                {token.decimals && <><br/>Decimals: {token.decimals}</>}
              </div>
            ))}
          </div>
        )}
        
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', margin: '10px 0' }}>
          <h3>Debug Logs</h3>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '6px', 
            fontFamily: 'monospace', 
            whiteSpace: 'pre-wrap', 
            maxHeight: '300px', 
            overflowY: 'auto',
            fontSize: '12px'
          }}>
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HederaBasicTest;
