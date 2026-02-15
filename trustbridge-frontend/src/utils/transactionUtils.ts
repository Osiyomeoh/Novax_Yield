import { ethers } from 'ethers';

/**
 * Wait for transaction confirmation with polling (for slow networks like Etherlink)
 * @param provider - Ethers provider
 * @param txHash - Transaction hash
 * @param maxWaitTime - Maximum time to wait in seconds (default: 180 for Etherlink)
 * @param pollInterval - Polling interval in milliseconds (default: 2000)
 * @returns Transaction receipt or null if timeout
 */
export async function waitForTransactionWithPolling(
  provider: ethers.Provider,
  txHash: string,
  maxWaitTime: number = 180, // 3 minutes for Etherlink
  pollInterval: number = 2000 // Poll every 2 seconds
): Promise<ethers.TransactionReceipt | null> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitTime * 1000;
  
  console.log(`⏳ Waiting for transaction confirmation: ${txHash.slice(0, 10)}...`);
  console.log(`   Network: Etherlink (may take 2-3 minutes)`);
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt && receipt.blockNumber) {
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        return receipt;
      }
    } catch (error) {
      // Ignore errors during polling, just continue
      console.log(`   Still waiting... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  console.warn(`⚠️ Transaction not confirmed after ${maxWaitTime} seconds: ${txHash}`);
  console.warn(`   Check status at: https://shadownet.explorer.etherlink.com/tx/${txHash}`);
  return null;
}

/**
 * Wait for transaction with fallback to polling
 * @param tx - Transaction response
 * @param provider - Ethers provider (optional, for polling fallback)
 * @param timeout - Timeout in seconds (default: 180)
 * @returns Transaction receipt
 */
export async function waitForTransaction(
  tx: ethers.ContractTransactionResponse,
  provider?: ethers.Provider,
  timeout: number = 180
): Promise<ethers.TransactionReceipt> {
  try {
    // Try the standard wait() first (works on fast networks)
    const receipt = await Promise.race([
      tx.wait(),
      new Promise<ethers.TransactionReceipt>((_, reject) =>
        setTimeout(() => reject(new Error('Transaction wait timeout')), timeout * 1000)
      )
    ]);
    return receipt;
  } catch (error: any) {
    // If wait() times out or hangs, use polling
    if (provider && tx.hash) {
      console.log(`⚠️ Standard wait() failed, using polling fallback...`);
      const receipt = await waitForTransactionWithPolling(provider, tx.hash, timeout);
      if (receipt) {
        return receipt;
      }
      throw new Error(`Transaction not confirmed after ${timeout} seconds. Hash: ${tx.hash}`);
    }
    throw error;
  }
}

/**
 * Get transaction status message
 */
export function getTransactionStatusMessage(elapsedSeconds: number): string {
  if (elapsedSeconds < 30) {
    return 'Submitting transaction...';
  } else if (elapsedSeconds < 60) {
    return 'Waiting for confirmation (this may take 1-2 minutes on Etherlink)...';
  } else if (elapsedSeconds < 120) {
    return 'Still waiting for confirmation (Etherlink can be slow)...';
  } else {
    return 'Transaction is taking longer than usual. Please check the explorer if needed.';
  }
}

