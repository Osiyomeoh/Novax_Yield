import { ethers } from 'ethers';
import { novaxContractAddresses } from '../config/contracts';
import { waitForTransaction } from '../utils/transactionUtils';
import { retryWithBackoff, batchRetry } from '../utils/retryUtils';

// Import Novax contract ABIs
import NovaxRwaFactoryABI from '../contracts/NovaxRwaFactory.json';
import NovaxReceivableFactoryABI from '../contracts/NovaxReceivableFactory.json';
import NovaxPoolManagerABI from '../contracts/NovaxPoolManager.json';
import NovaxMarketplaceABI from '../contracts/NovaxMarketplace.json';
import PoolTokenABI from '../contracts/PoolToken.json';
import NVXTokenABI from '../contracts/NVXToken.json';
import MockUSDCABI from '../contracts/MockUSDC.json';

/**
 * Novax Contract Service
 * Handles all smart contract interactions for Novax Yield on Arbitrum One
 */
export class NovaxContractService {
  private signer: ethers.Signer | null = null;
  private provider: ethers.Provider | null = null;
  
  // RPC endpoints with fallback support
  private readonly rpcEndpoints = [
    import.meta.env.VITE_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    'https://sepolia-rollup.arbitrum.io/rpc',
    'https://arbitrum-sepolia-rpc.publicnode.com',
    'https://rpc.ankr.com/arbitrum_sepolia',
  ].filter(Boolean);
  
  /**
   * Get a reliable provider, falling back to public RPC if current provider fails
   * For read operations, always prefer public RPC to avoid MetaMask RPC issues
   */
  private async getReliableProvider(): Promise<ethers.Provider> {
    // Always use public RPC for read operations - skip MetaMask entirely
    // MetaMask RPC is unreliable for read operations (frequent -32603 errors)
    console.log('🔄 Using public RPC for read operations (skipping MetaMask)...');
    
    // Try public RPC endpoints in order (always use public RPC, never MetaMask)
    for (const rpcUrl of this.rpcEndpoints) {
      try {
        const publicProvider = new ethers.JsonRpcProvider(rpcUrl);
        const blockNumber = await Promise.race([
          publicProvider.getBlockNumber(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), 5000))
        ]);
        console.log(`✅ Using public RPC: ${rpcUrl} (block: ${blockNumber})`);
        return publicProvider;
      } catch (error) {
        console.warn(`⚠️ Failed to connect to ${rpcUrl}:`, error instanceof Error ? error.message : error);
        continue;
      }
    }
    
    // If all public RPCs fail, fall back to current provider as last resort
    if (this.provider) {
      console.warn('⚠️ All public RPCs failed, falling back to current provider...');
      return this.provider;
    }
    
    throw new Error('Failed to connect to any RPC endpoint');
  }

  // Arbitrum Sepolia network configuration
  private readonly ARBITRUM_CHAIN_ID = '0x66EEE'; // 421614 in hex
  private readonly ARBITRUM_CHAIN_ID_DECIMAL = 421614;
  private readonly ARBITRUM_RPC_URL = import.meta.env.VITE_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
  private readonly ARBITRUM_CHAIN_NAME = 'Arbitrum Sepolia';
  private readonly ARBITRUM_EXPLORER = import.meta.env.VITE_EXPLORER_URL || 'https://sepolia.arbiscan.io';

  /**
   * Initialize with signer and provider
   */
  initialize(signer: ethers.Signer, provider: ethers.Provider) {
    this.signer = signer;
    this.provider = provider;
  }

  // Track pending network switch requests to avoid duplicates
  private pendingNetworkSwitch: Promise<void> | null = null;

  /**
   * Get gas options with proper buffering to prevent "max fee per gas less than block base fee" errors
   * This fetches current fee data and adds a buffer to account for base fee increases
   */
  private async getGasOptions(bufferPercent: number = 20): Promise<any> {
    if (!this.provider) {
      return {};
    }

    try {
      const feeData = await this.provider.getFeeData();
      
      // Use EIP-1559 fees if available, otherwise use legacy gas price
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // Add buffer to maxFeePerGas to account for base fee increases
        const bufferedMaxFee = (feeData.maxFeePerGas * BigInt(100 + bufferPercent)) / 100n;
        const bufferedPriorityFee = (feeData.maxPriorityFeePerGas * BigInt(100 + bufferPercent)) / 100n;
        
        return {
          maxFeePerGas: bufferedMaxFee,
          maxPriorityFeePerGas: bufferedPriorityFee
        };
      } else if (feeData.gasPrice) {
        // Use legacy gas price with buffer
        const bufferedGasPrice = (feeData.gasPrice * BigInt(100 + bufferPercent)) / 100n;
        return { gasPrice: bufferedGasPrice };
      }
    } catch (feeError) {
      console.warn('⚠️ Could not fetch fee data:', feeError);
    }
    
    return {}; // Return empty object to let ethers/MetaMask estimate
  }

  /**
   * Ensure we're connected to Arbitrum Sepolia network (for MetaMask/external wallets)
   * This should ONLY be called before WRITE operations (transactions), NOT read operations
   * 
   * IMPORTANT: This function will trigger MetaMask prompts, so it should NEVER be called for:
   * - Read operations (getReceivable, getExporterReceivables, getAllReceivables, etc.)
   * - Page load/refresh
   * - Component initialization
   * 
   * Only call this before actual write operations like createReceivable, verifyReceivable, etc.
   */
  private async ensureArbitrumNetwork(): Promise<void> {
    // Always check network if window.ethereum exists (MetaMask/external wallet)
    // Only skip if we truly don't have window.ethereum
    if (typeof window === 'undefined' || !window.ethereum) {
      console.log('⏭️ Skipping network check - no window.ethereum (likely embedded wallet)');
      return;
    }
    
    // If window.ethereum exists, ALWAYS check and switch network
    // This ensures MetaMask users are on the correct network
    // Even if Privy embedded wallet is also available, MetaMask takes precedence for network switching
    console.log('🔍 Checking network - window.ethereum detected (MetaMask or external wallet), verifying network...');
    
    // Only proceed if we have window.ethereum (MetaMask/external wallet)
    if (window.ethereum) {
      // If there's already a pending request, wait for it
      if (this.pendingNetworkSwitch) {
        console.log('⏳ Waiting for pending network switch request...');
        try {
          await this.pendingNetworkSwitch;
          console.log('✅ Pending network switch completed');
        } catch (error) {
          console.warn('⚠️ Pending network switch failed:', error);
          // Continue to try again
        }
        this.pendingNetworkSwitch = null;
      }

      try {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        // Normalize chain IDs for comparison (handle case differences)
        const normalizedCurrent = currentChainId.toLowerCase();
        const normalizedRequired = this.ARBITRUM_CHAIN_ID.toLowerCase();
        
        // Check if we're already on Arbitrum Sepolia
        const isOnArbitrum = normalizedCurrent === normalizedRequired;
        
        if (isOnArbitrum) {
          console.log('✅ Already on Arbitrum Sepolia network', {
            chainId: currentChainId,
            normalized: normalizedCurrent
          });
        } else {
          console.log('🔄 MetaMask is on wrong network, switching to Arbitrum Sepolia...', {
            current: currentChainId,
            required: this.ARBITRUM_CHAIN_ID
          });
          
          // Create a promise for the network switch
          this.pendingNetworkSwitch = (async () => {
            try {
              // Try to switch to Arbitrum One
              try {
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: this.ARBITRUM_CHAIN_ID }],
                });
                // Verify the switch was successful
                const verifyChainId = await window.ethereum.request({ method: 'eth_chainId' });
                console.log('✅ Successfully switched to Arbitrum Sepolia network', {
                  previousChainId: currentChainId,
                  newChainId: verifyChainId,
                  chainIdDecimal: this.ARBITRUM_CHAIN_ID_DECIMAL
                });
              } catch (switchError: any) {
                if (switchError.code === 4902) {
                  // Chain not added, try to add it
                  console.log('➕ Adding Arbitrum Sepolia network to MetaMask...');
                  try {
                    await window.ethereum.request({
                      method: 'wallet_addEthereumChain',
                      params: [{
                        chainId: this.ARBITRUM_CHAIN_ID,
                        chainName: this.ARBITRUM_CHAIN_NAME,
                        rpcUrls: [
                          this.ARBITRUM_RPC_URL,
                          'https://sepolia-rollup.arbitrum.io/rpc',
                          'https://arbitrum-sepolia-rpc.publicnode.com'
                        ],
                        nativeCurrency: {
                          name: 'Ether',
                          symbol: 'ETH',
                          decimals: 18,
                        },
                        blockExplorerUrls: [this.ARBITRUM_EXPLORER],
                      }],
                    });
                    // Verify the network was added and we're on it
                    const verifyChainId = await window.ethereum.request({ method: 'eth_chainId' });
                    console.log('✅ Successfully added and switched to Arbitrum Sepolia network', {
                      chainId: verifyChainId,
                      chainIdDecimal: this.ARBITRUM_CHAIN_ID_DECIMAL,
                      networkName: this.ARBITRUM_CHAIN_NAME
                    });
                  } catch (addError: any) {
                    throw new Error(`Failed to add Arbitrum Sepolia network: ${addError.message}`);
                  }
                } else if (switchError.code === -32002) {
                  // Request already pending - wait a bit and check again
                  console.log('⏳ Network switch request already pending, waiting...');
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  // Check if we're on the right network now
                  const newChainId = await window.ethereum.request({ method: 'eth_chainId' });
                  const normalizedNew = newChainId.toLowerCase();
                  if (normalizedNew === normalizedRequired) {
                    console.log('✅ Network switch completed successfully', {
                      chainId: newChainId,
                      chainIdDecimal: this.ARBITRUM_CHAIN_ID_DECIMAL,
                      note: 'Pending request was approved'
                    });
                  } else {
                    throw new Error('Network switch is still pending. Please approve the request in MetaMask.');
                  }
                  } else {
                    throw new Error(`Failed to switch to Arbitrum Sepolia network: ${switchError.message}`);
                  }
              }
            } finally {
              this.pendingNetworkSwitch = null;
            }
          })();

          await this.pendingNetworkSwitch;
          
          // Final verification after switch
          const finalChainId = await window.ethereum.request({ method: 'eth_chainId' });
          const normalizedFinal = finalChainId.toLowerCase();
          if (normalizedFinal === normalizedRequired || normalizedFinal === normalizedAlt) {
            console.log('✅ Network switch verified - ready to proceed', {
              chainId: finalChainId,
              chainIdDecimal: this.ARBITRUM_CHAIN_ID_DECIMAL
            });
          }
        }
      } catch (error: any) {
        this.pendingNetworkSwitch = null;
        console.error('⚠️ Failed to ensure Arbitrum network:', error);
        
        // Provide more helpful error messages
        if (error.code === -32002) {
          throw new Error('Network switch request is already pending in MetaMask. Please approve or reject the request in MetaMask and try again.');
        }
        throw new Error(`Network error: Please switch MetaMask to Arbitrum Sepolia network (Chain ID: ${this.ARBITRUM_CHAIN_ID_DECIMAL})`);
      }
    }
    
    // Also verify provider chain ID if available
    if (this.provider && 'getNetwork' in this.provider) {
      try {
        const network = await this.provider.getNetwork();
        if (network.chainId !== BigInt(this.ARBITRUM_CHAIN_ID_DECIMAL)) {
          console.warn('⚠️ Provider chain ID mismatch:', {
            provider: network.chainId.toString(),
            required: this.ARBITRUM_CHAIN_ID_DECIMAL.toString()
          });
        }
      } catch (err) {
        // Provider might not support getNetwork, that's OK
        console.log('Provider does not support getNetwork()');
      }
    }
  }

  /**
   * Get contract instance
   */
  private getContract(address: string, abi: any): ethers.Contract {
    if (!this.signer && !this.provider) {
      throw new Error('Signer or provider not initialized. Please connect wallet first.');
    }
    const abiArray = Array.isArray(abi) ? abi : abi.abi || abi;
    return new ethers.Contract(address, abiArray, this.signer || this.provider!);
  }

  // ==================== RWA FACTORY METHODS ====================

  /**
   * Create RWA asset
   * @param category Asset category (0-5: REAL_ESTATE, AGRICULTURE, INFRASTRUCTURE, COMMODITY, EQUIPMENT, OTHER)
   * @param valueUSD Asset value in USDC (6 decimals)
   * @param maxLTV Maximum Loan-to-Value percentage (0-100)
   * @param metadataCID IPFS CID as bytes32
   */
  async createRwa(
    category: number,
    valueUSD: bigint,
    maxLTV: number,
    metadataCID: string | Uint8Array
  ): Promise<{ assetId: string; txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    // Ensure we're on Arbitrum network before signing
    await this.ensureArbitrumNetwork();

    const factory = this.getContract(
      novaxContractAddresses.RWA_FACTORY,
      NovaxRwaFactoryABI
    );

    // Convert metadataCID to bytes32 if it's a string
    let metadataCIDBytes32: string;
    if (typeof metadataCID === 'string') {
      // If it's already a hex string (0x...), use it directly
      if (metadataCID.startsWith('0x') && metadataCID.length === 66) {
        metadataCIDBytes32 = metadataCID;
      } else {
        // Otherwise, hash it to bytes32
        metadataCIDBytes32 = ethers.id(metadataCID);
      }
    } else {
      // If it's Uint8Array, convert to hex
      metadataCIDBytes32 = ethers.hexlify(metadataCID);
    }

    console.log('🚀 Creating RWA asset:', {
      category,
      valueUSD: ethers.formatUnits(valueUSD, 6),
      maxLTV,
      metadataCID: metadataCIDBytes32,
    });

    const tx = await factory.createRwa(category, valueUSD, maxLTV, metadataCIDBytes32);
    console.log('⏳ Transaction submitted:', tx.hash);

    const receipt = await waitForTransaction(tx, this.provider, 180);
    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    // Parse event to get asset ID
    const eventLog = receipt.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
        return parsed?.name === 'RwaAssetCreated';
      } catch {
        return false;
      }
    });

    if (!eventLog) {
      throw new Error('RwaAssetCreated event not found in transaction receipt');
    }

    const parsedEvent = factory.interface.parseLog({
      topics: eventLog.topics,
      data: eventLog.data,
    });

    const assetId = parsedEvent?.args[0] || eventLog.topics[1];
    
    console.log('✅ RWA asset created:', {
      assetId,
      txHash: receipt.hash,
    });

    return {
      assetId: typeof assetId === 'string' ? assetId : ethers.hexlify(assetId),
      txHash: receipt.hash,
    };
  }

  /**
   * Get RWA asset details
   */
  async getAsset(assetId: string): Promise<any> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const factory = this.getContract(
      novaxContractAddresses.RWA_FACTORY,
      NovaxRwaFactoryABI
    );

    // Convert assetId to bytes32 if needed
    const assetIdBytes32 = assetId.startsWith('0x') && assetId.length === 66
      ? assetId
      : ethers.id(assetId);

    const asset = await factory.getAsset(assetIdBytes32);
    return asset;
  }

  /**
   * Approve asset (AMC only)
   * @param assetId Asset ID
   * @param riskScore Risk score (0-100)
   */
  async approveAsset(assetId: string, riskScore: number): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    const factory = this.getContract(
      novaxContractAddresses.RWA_FACTORY,
      NovaxRwaFactoryABI
    );

    const assetIdBytes32 = assetId.startsWith('0x') && assetId.length === 66
      ? assetId
      : ethers.id(assetId);

    const tx = await factory.approveAsset(assetIdBytes32, riskScore);
    const receipt = await tx.wait();

    return { txHash: receipt.hash };
  }

  // ==================== RECEIVABLE FACTORY METHODS ====================

  /**
   * Create trade receivable
   * @param importer Importer address
   * @param amountUSD Receivable amount in USDC (6 decimals)
   * @param dueDate Due date (Unix timestamp)
   * @param metadataCID IPFS CID as bytes32
   */
  async createReceivable(
    importer: string,
    amountUSD: bigint,
    dueDate: number,
    metadataCID: string | Uint8Array
  ): Promise<{ receivableId: string; txHash: string }> {
    // For Privy embedded wallets, signer might be null but provider should be available
    if (!this.signer && !this.provider) {
      throw new Error('Wallet not initialized. Please connect wallet first.');
    }

    // Try to get signer from provider if not available
    if (!this.signer && this.provider) {
      try {
        if ('getSigner' in this.provider && typeof this.provider.getSigner === 'function') {
          this.signer = await this.provider.getSigner();
          console.log('✅ Got signer from provider');
        }
      } catch (err) {
        console.warn('Could not get signer from provider:', err);
      }
    }

    // Signer is required for write operations
    if (!this.signer) {
      throw new Error('Signer not available. Please ensure your wallet is fully connected and try again.');
    }

    // Ensure we're on Arbitrum network before signing
    await this.ensureArbitrumNetwork();

    const factory = this.getContract(
      novaxContractAddresses.RECEIVABLE_FACTORY,
      NovaxReceivableFactoryABI
    );

    // Check if contract is paused before attempting transaction
    try {
      const isPaused = await factory.paused();
      if (isPaused) {
        throw new Error('Contract is currently paused. Please contact support.');
      }
    } catch (pauseCheckError) {
      console.warn('Could not check pause status:', pauseCheckError);
      // Continue anyway - pause check might fail but transaction might succeed
    }

    // Convert metadataCID to bytes32
    let metadataCIDBytes32: string;
    if (typeof metadataCID === 'string') {
      metadataCIDBytes32 = metadataCID.startsWith('0x') && metadataCID.length === 66
        ? metadataCID
        : ethers.id(metadataCID);
    } else {
      metadataCIDBytes32 = ethers.hexlify(metadataCID);
    }

    // Validate parameters before sending transaction
    if (amountUSD <= 0n) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Convert dueDate to BigInt to ensure proper uint256 encoding
    // JavaScript numbers can lose precision, so we explicitly convert to BigInt
    const dueDateBigInt = typeof dueDate === 'bigint' ? dueDate : BigInt(Math.floor(dueDate));
    
    // Get current block timestamp to validate due date
    try {
      const currentBlock = await this.provider!.getBlock('latest');
      const currentTimestamp = currentBlock?.timestamp || BigInt(Math.floor(Date.now() / 1000));
      const currentTimestampBigInt = typeof currentTimestamp === 'bigint' ? currentTimestamp : BigInt(currentTimestamp);
      
      if (dueDateBigInt <= currentTimestampBigInt) {
        throw new Error(`Due date (${dueDateBigInt.toString()}) must be greater than current block timestamp (${currentTimestampBigInt.toString()}). Please select a date further in the future.`);
      }
      
      console.log('✅ Pre-flight validation:', {
        amountUSD: amountUSD.toString(),
        dueDate: dueDateBigInt.toString(),
        currentBlockTimestamp: currentTimestampBigInt.toString(),
        difference: (dueDateBigInt - currentTimestampBigInt).toString(),
        differenceDays: Number(dueDateBigInt - currentTimestampBigInt) / (24 * 60 * 60),
        metadataCIDBytes32,
        importer
      });
    } catch (validationError) {
      console.warn('Could not validate against block timestamp:', validationError);
      // Continue anyway - validation might fail but transaction might succeed
    }

    // createReceivable requires 5 parameters: importer, amountUSD, dueDate, metadataCID, importerApprovalId
    // importerApprovalId can be zero (bytes32(0)) if not using ImporterApproval contract
    const importerApprovalId = ethers.ZeroHash; // Default to zero if not provided
    
    console.log('📤 Calling createReceivable with params:', {
      importer,
      amountUSD: amountUSD.toString(),
      dueDate: dueDateBigInt.toString(),
      dueDateOriginal: dueDate,
      dueDateAsDate: new Date(Number(dueDateBigInt) * 1000).toISOString(),
      metadataCIDBytes32,
      importerApprovalId
    });
    
    // Validate dueDate is a valid BigInt
    if (dueDateBigInt <= 0n) {
      throw new Error(`Invalid due date: ${dueDateBigInt.toString()}. Due date must be a positive Unix timestamp.`);
    }
    
    // Try to simulate the transaction first using a public RPC to get better error messages
    // This helps identify real contract errors vs MetaMask RPC errors
    try {
      const publicRpcUrl = 'https://sepolia-rollup.arbitrum.io/rpc';
      const publicProvider = new ethers.JsonRpcProvider(publicRpcUrl);
      const publicFactory = new ethers.Contract(
        novaxContractAddresses.RECEIVABLE_FACTORY,
        factory.interface,
        publicProvider
      );
      
      // Try to call static (simulate) to get the actual revert reason
      try {
        const signerAddress = await this.signer.getAddress();
        
        // Get current block timestamp from public RPC for comparison
        const publicBlock = await publicProvider.getBlock('latest');
        const publicBlockTimestamp = publicBlock?.timestamp || 0;
        
        console.log('🔍 Public RPC block info:', {
          blockNumber: publicBlock?.number,
          blockTimestamp: publicBlockTimestamp,
          dueDate: dueDateBigInt.toString(),
          difference: Number(dueDateBigInt) - Number(publicBlockTimestamp),
          isValid: Number(dueDateBigInt) > Number(publicBlockTimestamp)
        });
        
        await publicFactory.createReceivable.staticCall(
          importer,
          amountUSD,
          dueDateBigInt,
          metadataCIDBytes32,
          importerApprovalId,
          { from: signerAddress }
        );
        console.log('✅ Static call succeeded - transaction should work');
      } catch (staticError: any) {
        console.error('❌ Static call failed:', staticError);
        // Extract revert reason if available
        if (staticError.reason) {
          throw new Error(`Transaction will fail: ${staticError.reason}`);
        } else if (staticError.data) {
          // Try to decode the error
          try {
            const errorFragment = factory.interface.parseError(staticError.data);
            throw new Error(`Transaction will fail: ${errorFragment?.name || 'Unknown error'}`);
          } catch {
            throw new Error(`Transaction will fail. Error data: ${staticError.data}`);
          }
        }
        throw staticError;
      }
    } catch (simError: any) {
      // If simulation fails with a clear error, throw it
      if (simError.message && !simError.message.includes('Could not simulate')) {
        throw simError;
      }
      console.warn('⚠️ Could not simulate transaction, proceeding anyway:', simError.message);
      // Continue with actual transaction - simulation might fail but transaction might succeed
    }
    
    // Use try-catch around the actual transaction call to handle MetaMask RPC errors
    let tx;
    try {
      // Log the exact parameters being sent
      console.log('🔍 Final transaction parameters:', {
        importer,
        amountUSD: amountUSD.toString(),
        dueDateBigInt: dueDateBigInt.toString(),
        dueDateHex: '0x' + dueDateBigInt.toString(16),
        metadataCIDBytes32,
        importerApprovalId
      });
      
      // Get current block timestamp from the provider being used for the transaction
      // This helps debug timestamp-related issues
      try {
        const currentBlock = await this.provider!.getBlock('latest');
        const currentBlockTimestamp = currentBlock?.timestamp || 0;
        const currentBlockTimestampBigInt = typeof currentBlockTimestamp === 'bigint' 
          ? currentBlockTimestamp 
          : BigInt(currentBlockTimestamp);
        
        console.log('🔍 Transaction provider block info:', {
          blockNumber: currentBlock?.number,
          blockTimestamp: currentBlockTimestampBigInt.toString(),
          dueDate: dueDateBigInt.toString(),
          difference: (dueDateBigInt - currentBlockTimestampBigInt).toString(),
          differenceSeconds: Number(dueDateBigInt - currentBlockTimestampBigInt),
          isValid: dueDateBigInt > currentBlockTimestampBigInt
        });
        
        if (dueDateBigInt <= currentBlockTimestampBigInt) {
          throw new Error(`Due date (${dueDateBigInt.toString()}) must be greater than current block timestamp (${currentBlockTimestampBigInt.toString()}). Block timestamp may have advanced since validation.`);
        }
      } catch (blockError: any) {
        console.warn('⚠️ Could not verify block timestamp before transaction:', blockError);
        // Continue anyway - the contract will validate
      }
      
      // Note: We skip explicit gas estimation here because:
      // 1. Static call already validated the transaction will work
      // 2. MetaMask's estimateGas might fail due to RPC issues, but the transaction can still succeed
      // 3. We'll use a reasonable default gas limit and let ethers.js handle it
      console.log('⏭️ Skipping explicit gas estimation (static call already validated transaction)');
      
      // Fetch current gas prices to ensure we have enough for the transaction
      // This prevents "max fee per gas less than block base fee" errors
      let gasOptions: any = {};
      try {
        const feeData = await this.provider!.getFeeData();
        console.log('⛽ Current fee data:', {
          gasPrice: feeData.gasPrice?.toString(),
          maxFeePerGas: feeData.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
        });
        
        // Use EIP-1559 fees if available, otherwise use legacy gas price
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          // Add 20% buffer to maxFeePerGas to account for base fee increases
          const bufferedMaxFee = (feeData.maxFeePerGas * 120n) / 100n;
          const bufferedPriorityFee = (feeData.maxPriorityFeePerGas * 120n) / 100n;
          
          gasOptions = {
            maxFeePerGas: bufferedMaxFee,
            maxPriorityFeePerGas: bufferedPriorityFee
          };
          
          console.log('⛽ Using buffered EIP-1559 fees:', {
            maxFeePerGas: bufferedMaxFee.toString(),
            maxPriorityFeePerGas: bufferedPriorityFee.toString()
          });
        } else if (feeData.gasPrice) {
          // Use legacy gas price with 20% buffer
          const bufferedGasPrice = (feeData.gasPrice * 120n) / 100n;
          gasOptions = { gasPrice: bufferedGasPrice };
          
          console.log('⛽ Using buffered legacy gas price:', {
            gasPrice: bufferedGasPrice.toString()
          });
        }
      } catch (feeError) {
        console.warn('⚠️ Could not fetch fee data, using default:', feeError);
        // Continue without explicit gas options - ethers will estimate
      }
      
      // Try to send the transaction with proper gas prices
      // If estimateGas failed but static call succeeded, use a reasonable gas limit
      const DEFAULT_GAS_LIMIT = 500000n; // Reasonable default for createReceivable
      
      try {
        tx = await factory.createReceivable(
          importer,
          amountUSD,
          dueDateBigInt,
          metadataCIDBytes32,
          importerApprovalId,
          {
            ...gasOptions,
            gasLimit: DEFAULT_GAS_LIMIT // Use default gas limit as fallback
          }
        );
      } catch (txError: any) {
        // If it fails due to gas price, try with fresh fee data
        if (txError.message?.includes('max fee per gas') || txError.message?.includes('base fee')) {
          console.warn('⚠️ Gas price issue detected, fetching fresh fee data and retrying...');
          try {
            const freshFeeData = await this.provider!.getFeeData();
            if (freshFeeData.maxFeePerGas && freshFeeData.maxPriorityFeePerGas) {
              // Add 30% buffer this time to be safe
              const bufferedMaxFee = (freshFeeData.maxFeePerGas * 130n) / 100n;
              const bufferedPriorityFee = (freshFeeData.maxPriorityFeePerGas * 130n) / 100n;
              
              tx = await factory.createReceivable(
                importer,
                amountUSD,
                dueDateBigInt,
                metadataCIDBytes32,
                importerApprovalId,
                {
                  maxFeePerGas: bufferedMaxFee,
                  maxPriorityFeePerGas: bufferedPriorityFee,
                  gasLimit: DEFAULT_GAS_LIMIT
                }
              );
            } else {
              throw txError; // Re-throw original error if we can't get fee data
            }
          } catch (retryError: any) {
            // If retry fails, try without explicit gas options (let MetaMask handle it)
            if (retryError.message?.includes('max fee per gas') || retryError.message?.includes('base fee')) {
              console.warn('⚠️ Retrying transaction without explicit gas prices (let MetaMask estimate)...');
              tx = await factory.createReceivable(
                importer,
                amountUSD,
                dueDateBigInt,
                metadataCIDBytes32,
                importerApprovalId
              );
            } else {
              throw retryError;
            }
          }
        } else if (txError.message?.includes('gas') || txError.code === 'UNPREDICTABLE_GAS_LIMIT') {
          console.warn('⚠️ Retrying transaction without explicit gas limit...');
          tx = await factory.createReceivable(
            importer,
            amountUSD,
            dueDateBigInt,
            metadataCIDBytes32,
            importerApprovalId,
            gasOptions // Still use the gas price options
          );
        } else {
          throw txError;
        }
      }
    } catch (txError: any) {
      console.error('❌ Transaction call failed:', txError);
      // If it's a MetaMask RPC error, the transaction might still be pending
      if (txError.code === -32603 || txError.message?.includes('Internal JSON-RPC error')) {
        console.warn('⚠️ MetaMask RPC error during transaction. The transaction might still be pending in your wallet.');
        console.warn('   Please check MetaMask for pending transactions. The transaction may succeed despite this error.');
        throw new Error('MetaMask RPC error. Please check your wallet for pending transactions - the transaction may still be processing.');
      }
      throw txError;
    }

    const receipt = await waitForTransaction(tx, this.provider, 180);
    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    // Parse event
    const eventLog = receipt.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
        return parsed?.name === 'ReceivableCreated';
      } catch {
        return false;
      }
    });

    if (!eventLog) {
      throw new Error('ReceivableCreated event not found');
    }

    const parsedEvent = factory.interface.parseLog({
      topics: eventLog.topics,
      data: eventLog.data,
    });

    const receivableId = parsedEvent?.args[0] || eventLog.topics[1];
    const formattedReceivableId = typeof receivableId === 'string' ? receivableId : ethers.hexlify(receivableId);

    console.log('✅✅✅ RECEIVABLE CREATED SUCCESSFULLY ✅✅✅', {
      receivableId: formattedReceivableId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      importer,
      amountUSD: amountUSD.toString(),
      dueDate: new Date(Number(dueDateBigInt) * 1000).toISOString(),
      dueDateTimestamp: dueDateBigInt.toString(),
      metadataCID: typeof metadataCID === 'string' ? metadataCID : 'bytes',
      timestamp: new Date().toISOString()
    });

    return {
      receivableId: formattedReceivableId,
      txHash: receipt.hash,
    };
  }

  /**
   * Get receivable details
   */
  async getReceivable(receivableId: string): Promise<any> {
    // Get a reliable provider (with fallback to public RPC)
    const reliableProvider = await this.getReliableProvider();
    
    // Extract ABI from JSON if needed
    const abiArray = Array.isArray(NovaxReceivableFactoryABI) 
      ? NovaxReceivableFactoryABI 
      : (NovaxReceivableFactoryABI.abi || NovaxReceivableFactoryABI);
    
    const factory = new ethers.Contract(
      novaxContractAddresses.RECEIVABLE_FACTORY,
      abiArray,
      reliableProvider
    );

    const receivableIdBytes32 = receivableId.startsWith('0x') && receivableId.length === 66
      ? receivableId
      : ethers.id(receivableId);

    return await factory.getReceivable(receivableIdBytes32);
  }

  /**
   * Verify receivable (AMC only)
   */
  async verifyReceivable(
    receivableId: string,
    riskScore: number,
    apr: number
  ): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    // Ensure we're on Arbitrum network before signing
    await this.ensureArbitrumNetwork();

    const factory = this.getContract(
      novaxContractAddresses.RECEIVABLE_FACTORY,
      NovaxReceivableFactoryABI
    );

    const receivableIdBytes32 = receivableId.startsWith('0x') && receivableId.length === 66
      ? receivableId
      : ethers.id(receivableId);

    // Get gas options with buffer to prevent gas price errors
    const gasOptions = await this.getGasOptions(30); // Use 30% buffer for safety
    
    let tx;
    try {
      tx = await factory.verifyReceivable(receivableIdBytes32, riskScore, apr, gasOptions);
    } catch (txError: any) {
      // If it fails due to gas price, retry with fresh fee data
      if (txError.message?.includes('max fee per gas') || txError.message?.includes('base fee')) {
        console.warn('⚠️ Gas price issue detected, retrying with fresh fee data...');
        const freshGasOptions = await this.getGasOptions(40); // Use 40% buffer on retry
        tx = await factory.verifyReceivable(receivableIdBytes32, riskScore, apr, freshGasOptions);
      } else {
        throw txError;
      }
    }
    
    // Use polling for Arbitrum (may take time)
    const receipt = await waitForTransaction(tx, this.provider, 120);
    
    if (!receipt) {
      throw new Error('Transaction not confirmed. Please check the explorer.');
    }

    return { txHash: receipt.hash };
  }

  /**
   * Get all receivables using contract getter (much faster than querying events!)
   * Uses the allReceivables array from the contract
   * @returns Array of receivable IDs
   */
  async getAllReceivables(): Promise<string[]> {
    try {
      console.log('🔍 Fetching all receivables using contract getter (allReceivables array)...');
      
      // Get a reliable provider (with fallback to public RPC)
      const reliableProvider = await this.getReliableProvider();
      
      // Extract ABI from JSON if needed
      const abiArray = Array.isArray(NovaxReceivableFactoryABI) 
        ? NovaxReceivableFactoryABI 
        : (NovaxReceivableFactoryABI.abi || NovaxReceivableFactoryABI);
      
      const factory = new ethers.Contract(
        novaxContractAddresses.RECEIVABLE_FACTORY,
        abiArray,
        reliableProvider
      );
      
      // Use the allReceivables public array getter - much faster than querying events!
      // Read totalReceivables first to know how many to fetch
      const totalReceivables = await factory.totalReceivables();
      console.log(`📊 Total receivables: ${totalReceivables}`);
      
      if (totalReceivables === 0n) {
        console.log('✅ No receivables found');
        return [];
      }
      
      // Use getAllReceivableIds() - same as test scripts, with retry for reliability
      const receivableIds = await retryWithBackoff(
        () => factory.getAllReceivableIds(),
        { maxRetries: 3, initialDelay: 500 }
      );
      console.log(`✅ Found ${receivableIds.length} receivables using getAllReceivableIds()`);
      
      // Convert bytes32[] to string[]
      return receivableIds.map((id: any) => 
        typeof id === 'string' ? id : ethers.hexlify(id)
      );
    } catch (error) {
      console.error('Error querying receivables:', error);
      throw new Error(`Failed to fetch receivables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get receivables for a specific exporter using the contract's mapping (MUCH FASTER!)
   * @param exporterAddress Exporter wallet address
   * @returns Array of receivable IDs
   */
  async getExporterReceivables(exporterAddress: string): Promise<string[]> {
    try {
      console.log('📥 Fetching receivables for exporter:', exporterAddress);
      
      // Get a reliable provider (with fallback to public RPC)
      const reliableProvider = await this.getReliableProvider();
      
      // Extract ABI from JSON if needed
      const abiArray = Array.isArray(NovaxReceivableFactoryABI) 
        ? NovaxReceivableFactoryABI 
        : (NovaxReceivableFactoryABI.abi || NovaxReceivableFactoryABI);
      
      const factory = new ethers.Contract(
        novaxContractAddresses.RECEIVABLE_FACTORY,
        abiArray,
        reliableProvider
      );
      
      // Use the contract's built-in mapping - much more efficient than querying events!
      // Use retry for reliability
      const receivableIds = await retryWithBackoff(
        () => factory.getExporterReceivables(exporterAddress),
        { maxRetries: 3, initialDelay: 500 }
      );
      console.log(`✅ Found ${receivableIds.length} receivables for exporter`);
      
      // Convert bytes32[] to string[]
      return receivableIds.map(id => typeof id === 'string' ? id : ethers.hexlify(id));
    } catch (error) {
      console.error('Error fetching exporter receivables:', error);
      throw new Error(`Failed to fetch exporter receivables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  // ==================== POOL MANAGER METHODS ====================

  /**
   * Create investment pool (AMC only)
   * @param poolType 0 = RWA, 1 = RECEIVABLE
   * @param assetId Asset ID or Receivable ID
   * @param targetAmount Target funding amount in USDC (6 decimals)
   * @param minInvestment Minimum investment in USDC (6 decimals)
   * @param maxInvestment Maximum investment per user in USDC (6 decimals)
   * @param apr Annual Percentage Rate in basis points (e.g., 1200 = 12%)
   * @param maturityDate Maturity date (Unix timestamp)
   * @param rewardPool NVX reward pool amount (18 decimals, optional, default 0)
   * @param tokenName Pool token name
   * @param tokenSymbol Pool token symbol
   */
  async createPool(
    poolType: number,
    assetId: string,
    targetAmount: bigint,
    minInvestment: bigint,
    maxInvestment: bigint,
    apr: number,
    maturityDate: number,
    rewardPool: bigint,
    tokenName: string,
    tokenSymbol: string
  ): Promise<{ poolId: string; txHash: string; poolToken: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    // Ensure we're on Arbitrum network before signing
    await this.ensureArbitrumNetwork();

    const poolManager = this.getContract(
      novaxContractAddresses.POOL_MANAGER,
      NovaxPoolManagerABI
    );

    const assetIdBytes32 = assetId.startsWith('0x') && assetId.length === 66
      ? assetId
      : ethers.id(assetId);

    console.log('🏊 Creating pool:', {
      poolType: poolType === 1 ? 'RECEIVABLE' : 'RWA',
      assetId: assetIdBytes32,
      targetAmount: ethers.formatUnits(targetAmount, 6),
      minInvestment: ethers.formatUnits(minInvestment, 6),
      maxInvestment: ethers.formatUnits(maxInvestment, 6),
      apr: apr / 100 + '%',
      maturityDate: new Date(maturityDate * 1000).toISOString(),
      rewardPool: ethers.formatUnits(rewardPool, 18),
    });

    const gasOptions = await this.getGasOptions(30);
    let tx;
    try {
      tx = await poolManager.createPool(
        poolType,
        assetIdBytes32,
        targetAmount,
        minInvestment,
        maxInvestment,
        apr,
        maturityDate,
        rewardPool,
        tokenName,
        tokenSymbol,
        gasOptions
      );
    } catch (txError: any) {
      if (txError.message?.includes('max fee per gas') || txError.message?.includes('base fee')) {
        console.warn('⚠️ Gas price issue detected, retrying with fresh fee data...');
        const freshGasOptions = await this.getGasOptions(40);
        tx = await poolManager.createPool(
          poolType,
          assetIdBytes32,
          targetAmount,
          minInvestment,
          maxInvestment,
          apr,
          maturityDate,
          rewardPool,
          tokenName,
          tokenSymbol,
          freshGasOptions
        );
      } else {
        throw txError;
      }
    }

    const receipt = await waitForTransaction(tx, this.provider, 180);
    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    // Parse event
    const eventLog = receipt.logs.find((log: any) => {
      try {
        const parsed = poolManager.interface.parseLog({ topics: log.topics, data: log.data });
        return parsed?.name === 'PoolCreated';
      } catch {
        return false;
      }
    });

    if (!eventLog) {
      throw new Error('PoolCreated event not found');
    }

    const parsedEvent = poolManager.interface.parseLog({
      topics: eventLog.topics,
      data: eventLog.data,
    });

    const poolId = parsedEvent?.args[0] || eventLog.topics[1];
    const pool = await poolManager.getPool(poolId);
    const poolToken = pool.poolToken;

    return {
      poolId: typeof poolId === 'string' ? poolId : ethers.hexlify(poolId),
      txHash: receipt.hash,
      poolToken,
    };
  }

  /**
   * Invest in pool
   * @param poolId Pool ID
   * @param usdcAmount Investment amount in USDC (6 decimals)
   */
  async invest(poolId: string, usdcAmount: bigint): Promise<{ txHash: string; shares: bigint }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    // Ensure we're on Arbitrum network before signing
    await this.ensureArbitrumNetwork();

    const poolManager = this.getContract(
      novaxContractAddresses.POOL_MANAGER,
      NovaxPoolManagerABI
    );

    const poolIdBytes32 = poolId.startsWith('0x') && poolId.length === 66
      ? poolId
      : ethers.id(poolId);

    // First, approve USDC spending
    const usdc = this.getContract(novaxContractAddresses.USDC, MockUSDCABI);
    const userAddress = await this.signer.getAddress();
    
    const allowance = await usdc.allowance(userAddress, novaxContractAddresses.POOL_MANAGER);
    if (allowance < usdcAmount) {
      console.log('📝 Approving USDC spending...');
      const approveGasOptions = await this.getGasOptions(30);
      const approveTx = await usdc.approve(novaxContractAddresses.POOL_MANAGER, usdcAmount, approveGasOptions);
      await waitForTransaction(approveTx, this.provider, 180);
      console.log('✅ USDC approved');
    }

    // Invest in pool
    const gasOptions = await this.getGasOptions(30);
    let tx;
    try {
      tx = await poolManager.invest(poolIdBytes32, usdcAmount, gasOptions);
    } catch (txError: any) {
      if (txError.message?.includes('max fee per gas') || txError.message?.includes('base fee')) {
        console.warn('⚠️ Gas price issue detected, retrying with fresh fee data...');
        const freshGasOptions = await this.getGasOptions(40);
        tx = await poolManager.invest(poolIdBytes32, usdcAmount, freshGasOptions);
      } else {
        throw txError;
      }
    }
    const receipt = await waitForTransaction(tx, this.provider, 180);

    // Get shares from event or pool
    let shares = 0n;
    const eventLog = receipt.logs.find((log: any) => {
      try {
        const parsed = poolManager.interface.parseLog({ topics: log.topics, data: log.data });
        return parsed?.name === 'InvestmentMade';
      } catch {
        return false;
      }
    });

    if (eventLog) {
      const parsedEvent = poolManager.interface.parseLog({
        topics: eventLog.topics,
        data: eventLog.data,
      });
      shares = parsedEvent?.args[3] || 0n; // sharesMinted
    } else {
      // Fallback: get user investment and calculate shares
      const userInvestment = await poolManager.getUserInvestment(poolIdBytes32, userAddress);
      const pool = await poolManager.getPool(poolIdBytes32);
      if (pool.totalShares > 0n && pool.totalInvested > 0n) {
        shares = (userInvestment * pool.totalShares) / pool.totalInvested;
      }
    }

    return {
      txHash: receipt.hash,
      shares,
    };
  }

  /**
   * Withdraw from pool
   */
  async withdraw(poolId: string, shares: bigint): Promise<{ txHash: string; usdcAmount: bigint }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    const poolManager = this.getContract(
      novaxContractAddresses.POOL_MANAGER,
      NovaxPoolManagerABI
    );

    const poolIdBytes32 = poolId.startsWith('0x') && poolId.length === 66
      ? poolId
      : ethers.id(poolId);

    const tx = await poolManager.withdraw(poolIdBytes32, shares);
    const receipt = await tx.wait();

    // Get USDC amount from event
    let usdcAmount = 0n;
    const eventLog = receipt.logs.find((log: any) => {
      try {
        const parsed = poolManager.interface.parseLog({ topics: log.topics, data: log.data });
        return parsed?.name === 'WithdrawalMade';
      } catch {
        return false;
      }
    });

    if (eventLog) {
      const parsedEvent = poolManager.interface.parseLog({
        topics: eventLog.topics,
        data: eventLog.data,
      });
      usdcAmount = parsedEvent?.args[2] || 0n; // usdcAmount
    }

    return {
      txHash: receipt.hash,
      usdcAmount,
    };
  }

  /**
   * Get pool details
   */
  async getPool(poolId: string): Promise<any> {
    const poolManagerAddress = novaxContractAddresses.POOL_MANAGER;
    if (!poolManagerAddress) {
      throw new Error('POOL_MANAGER address not configured');
    }

    // Get a reliable provider (with fallback)
    const reliableProvider = await this.getReliableProvider();
    // Extract ABI from JSON if needed (same logic as getContract)
    const abiArray = Array.isArray(NovaxPoolManagerABI) ? NovaxPoolManagerABI : (NovaxPoolManagerABI.abi || NovaxPoolManagerABI);
    const poolManager = new ethers.Contract(
      poolManagerAddress,
      abiArray,
      reliableProvider
    );

    const poolIdBytes32 = poolId.startsWith('0x') && poolId.length === 66
      ? poolId
      : ethers.id(poolId);

    // Use retry for reliability with fallback RPC
    return await retryWithBackoff(
      () => poolManager.getPool(poolIdBytes32),
      { 
        maxRetries: 3, 
        initialDelay: 500,
        retryableErrors: [
          'CALL_EXCEPTION',
          'NETWORK_ERROR',
          'TIMEOUT',
          'ECONNRESET',
          'ETIMEDOUT',
          'Internal JSON-RPC error',
          'missing revert data',
          '-32603', // Internal JSON-RPC error code
        ]
      }
    );
  }

  /**
   * Get user investment in pool
   */
  async getUserInvestment(poolId: string, userAddress: string): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const poolManager = this.getContract(
      novaxContractAddresses.POOL_MANAGER,
      NovaxPoolManagerABI
    );

    const poolIdBytes32 = poolId.startsWith('0x') && poolId.length === 66
      ? poolId
      : ethers.id(poolId);

    return await poolManager.getUserInvestment(poolIdBytes32, userAddress);
  }

  /**
   * Record payment for a pool (AMC only)
   * @param poolId Pool ID
   * @param paymentAmount Payment amount in USDC (6 decimals)
   */
  async recordPayment(poolId: string, paymentAmount: bigint): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    // Ensure we're on Arbitrum network before signing
    await this.ensureArbitrumNetwork();

    const poolManager = this.getContract(
      novaxContractAddresses.POOL_MANAGER,
      NovaxPoolManagerABI
    );

    const poolIdBytes32 = poolId.startsWith('0x') && poolId.length === 66
      ? poolId
      : ethers.id(poolId);

    console.log('💰 Recording payment:', {
      poolId: poolIdBytes32,
      paymentAmount: ethers.formatUnits(paymentAmount, 6),
    });

    const gasOptions = await this.getGasOptions(30);
    let tx;
    try {
      tx = await poolManager.recordPayment(poolIdBytes32, paymentAmount, gasOptions);
    } catch (txError: any) {
      if (txError.message?.includes('max fee per gas') || txError.message?.includes('base fee')) {
        console.warn('⚠️ Gas price issue detected, retrying with fresh fee data...');
        const freshGasOptions = await this.getGasOptions(40);
        tx = await poolManager.recordPayment(poolIdBytes32, paymentAmount, freshGasOptions);
      } else {
        throw txError;
      }
    }
    const receipt = await waitForTransaction(tx, this.provider, 180);
    
    if (!receipt) {
      throw new Error('Transaction not confirmed. Please check the explorer.');
    }

    return { txHash: receipt.hash };
  }

  /**
   * Distribute yield (AMC only) - automatically calculates yield
   * @param poolId Pool ID
   */
  async distributeYield(poolId: string): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    // Ensure we're on Arbitrum network before signing
    await this.ensureArbitrumNetwork();

    const poolManager = this.getContract(
      novaxContractAddresses.POOL_MANAGER,
      NovaxPoolManagerABI
    );

    const poolIdBytes32 = poolId.startsWith('0x') && poolId.length === 66
      ? poolId
      : ethers.id(poolId);

    console.log('💰 Distributing yield for pool:', poolIdBytes32);

    const gasOptions = await this.getGasOptions(30);
    let tx;
    try {
      tx = await poolManager.distributeYield(poolIdBytes32, gasOptions);
    } catch (txError: any) {
      if (txError.message?.includes('max fee per gas') || txError.message?.includes('base fee')) {
        console.warn('⚠️ Gas price issue detected, retrying with fresh fee data...');
        const freshGasOptions = await this.getGasOptions(40);
        tx = await poolManager.distributeYield(poolIdBytes32, freshGasOptions);
      } else {
        throw txError;
      }
    }
    const receipt = await waitForTransaction(tx, this.provider, 180);
    
    if (!receipt) {
      throw new Error('Transaction not confirmed. Please check the explorer.');
    }

    return { txHash: receipt.hash };
  }

  /**
   * Get all pools using contract getters (much faster than pagination!)
   * Uses the public allPools array and totalPools getter
   * @returns Array of pool IDs
   */
  async getAllPools(): Promise<string[]> {
    const poolManagerAddress = novaxContractAddresses.POOL_MANAGER;
    if (!poolManagerAddress) {
      throw new Error('POOL_MANAGER address not configured');
    }

    console.log('🔍 Fetching all pools using contract getters (allPools array)...');
    console.log('   Pool Manager address:', poolManagerAddress);

    // Get a reliable provider (with fallback)
    const reliableProvider = await this.getReliableProvider();
    // Extract ABI from JSON if needed (same logic as getContract)
    const abiArray = Array.isArray(NovaxPoolManagerABI) ? NovaxPoolManagerABI : (NovaxPoolManagerABI.abi || NovaxPoolManagerABI);
    const poolManager = new ethers.Contract(
      poolManagerAddress,
      abiArray,
      reliableProvider
    );

    try {
      // Based on test results: getPoolsPaginated is fastest (353ms vs 625ms for parallel getters)
      // Use getPoolsPaginated with retry for best performance and reliability
      console.log('📊 Getting all pools using getPoolsPaginated (with retry and fallback RPC)...');
      console.log(`   Contract address: ${poolManagerAddress}`);
      console.log(`   ABI length: ${abiArray.length} functions`);
      
      const [pools, total] = await retryWithBackoff(
        async () => {
          console.log('   🔄 Attempting getPoolsPaginated call...');
          // Try to get all pools in one call (up to 1000)
          const result = await poolManager.getPoolsPaginated(0, 1000);
          console.log('   ✅ getPoolsPaginated call succeeded');
          return result;
        },
        { 
          maxRetries: 3, 
          initialDelay: 500,
          retryableErrors: [
            'CALL_EXCEPTION',
            'NETWORK_ERROR',
            'TIMEOUT',
            'ECONNRESET',
            'ETIMEDOUT',
            'Internal JSON-RPC error',
            'missing revert data',
            '-32603', // Internal JSON-RPC error code
          ]
        }
      );
      
      const totalCount = Number(total);
      console.log(`   📊 Total pools in contract: ${totalCount}`);
      console.log(`   📦 Fetched ${pools.length} pools from contract`);
      console.log(`   📋 Pools data type:`, Array.isArray(pools) ? 'array' : typeof pools);
      
      if (pools.length === 0 && totalCount === 0) {
        console.log('   ℹ️ No pools exist in the contract yet');
        return [];
      }
      
      if (pools.length === 0 && totalCount > 0) {
        console.warn(`   ⚠️ Contract reports ${totalCount} pools but returned 0 pools - trying direct getters as fallback...`);
        
        // Fallback: Use direct getters (totalPools and allPools)
        try {
          const directTotal = await poolManager.totalPools();
          const directTotalNum = Number(directTotal);
          console.log(`   📊 Direct totalPools() call: ${directTotalNum}`);
          
          if (directTotalNum === 0) {
            return [];
          }
          
          const directPoolIds: string[] = [];
          for (let i = 0; i < Math.min(directTotalNum, 100); i++) {
            try {
              const poolId = await poolManager.allPools(i);
              const poolIdString = ethers.hexlify(poolId);
              directPoolIds.push(poolIdString);
              if (i < 5) {
                console.log(`   Pool ${i + 1}/${directTotalNum}: ${poolIdString.slice(0, 10)}...`);
              }
            } catch (error) {
              console.error(`   Error fetching pool at index ${i}:`, error);
            }
          }
          
          console.log(`✅ Found ${directPoolIds.length} pools using direct getters (fallback)`);
          return directPoolIds;
        } catch (fallbackError) {
          console.error('❌ Fallback to direct getters also failed:', fallbackError);
          return [];
        }
      }

      if (pools.length === 0) {
        console.log('📦 No pools in contract');
        return [];
      }

      // Extract pool IDs from the pool structs
      const poolIds = pools.map((pool: any, index: number) => {
        const id = pool.id || pool.poolId;
        if (!id) {
          console.warn(`⚠️ Pool at index ${index} missing ID:`, pool);
          return null;
        }
        const poolIdString = typeof id === 'string' ? id : ethers.hexlify(id);
        if (index < 5 || index === pools.length - 1) {
          console.log(`   Pool ${index + 1}/${totalCount}: ${poolIdString.slice(0, 10)}... (status: ${pool.status})`);
        }
        return poolIdString;
      }).filter((id: string | null): id is string => id !== null);
      
      console.log(`✅ Found ${poolIds.length} pools using getPoolsPaginated (with retry)`);
      return poolIds;
    } catch (error) {
      console.error('❌ Error fetching pools:', error);
      console.error('   Provider:', this.provider ? 'initialized' : 'not initialized');
      console.error('   Pool Manager address:', novaxContractAddresses.POOL_MANAGER);
      
      // Check if it's a CALL_EXCEPTION (contract doesn't exist or function doesn't exist)
      if (error && typeof error === 'object' && 'code' in error && error.code === 'CALL_EXCEPTION') {
        const errorMsg = `Contract call failed. This usually means:
1. The contract at ${poolManagerAddress} doesn't exist or isn't deployed
2. The contract doesn't have the getPoolsPaginated function
3. The function is reverting (check contract state)
4. Network mismatch (provider connected to wrong network)

Original error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        throw new Error(errorMsg);
      }
      
      throw new Error(`Failed to fetch pools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pools by status using pagination and frontend filtering
   * @param status Pool status to filter
   * @returns Array of pools with the specified status
   */
  async getPoolsByStatus(status: number): Promise<any[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const poolManager = this.getContract(
      novaxContractAddresses.POOL_MANAGER,
      NovaxPoolManagerABI
    );

    try {
      const allPools: any[] = [];
      let offset = 0;
      const pageSize = 100;
      let total = 0;

      // Fetch all pools using pagination
      while (true) {
        const [pools, totalCount] = await poolManager.getPoolsPaginated(offset, pageSize);
        allPools.push(...pools);
        total = Number(totalCount);

        if (pools.length < pageSize || allPools.length >= total) {
          break;
        }
        offset += pageSize;
      }

      // Filter by status on frontend
      return allPools.filter((pool: any) => pool.status === status);
    } catch (error) {
      console.error('Error fetching pools by status:', error);
      throw new Error(`Failed to fetch pools by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pools that need payment recording (for AMC)
   * Uses getPoolsPaginated and filters on frontend
   * @returns Array of pools needing payment
   */
  async getPoolsNeedingPayment(): Promise<any[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const poolManager = this.getContract(
      novaxContractAddresses.POOL_MANAGER,
      NovaxPoolManagerABI
    );

    try {
      const allPools: any[] = [];
      let offset = 0;
      const pageSize = 100;
      let total = 0;

      // Fetch all pools using pagination
      while (true) {
        const [pools, totalCount] = await poolManager.getPoolsPaginated(offset, pageSize);
        allPools.push(...pools);
        total = Number(totalCount);

        if (pools.length < pageSize || allPools.length >= total) {
          break;
        }
        offset += pageSize;
      }

      // Filter: (status == FUNDED || status == MATURED) && paymentStatus != FULL
      // FUNDED = 1, MATURED = 2, FULL = 2
      return allPools.filter((pool: any) => 
        (pool.status === 1 || pool.status === 2) && pool.paymentStatus !== 2
      );
    } catch (error) {
      console.error('Error fetching pools needing payment:', error);
      throw new Error(`Failed to fetch pools needing payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pools ready for yield distribution (for Admin)
   * Uses getPoolsPaginated and filters on frontend
   * @returns Array of pools ready for yield
   */
  async getPoolsReadyForYield(): Promise<any[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const poolManager = this.getContract(
      novaxContractAddresses.POOL_MANAGER,
      NovaxPoolManagerABI
    );

    try {
      const allPools: any[] = [];
      let offset = 0;
      const pageSize = 100;
      let total = 0;

      // Fetch all pools using pagination
      while (true) {
        const [pools, totalCount] = await poolManager.getPoolsPaginated(offset, pageSize);
        allPools.push(...pools);
        total = Number(totalCount);

        if (pools.length < pageSize || allPools.length >= total) {
          break;
        }
        offset += pageSize;
      }

      // Filter: status == PAID && paymentStatus == FULL
      // PAID = 3, FULL = 2
      return allPools.filter((pool: any) => 
        pool.status === 3 && pool.paymentStatus === 2
      );
    } catch (error) {
      console.error('Error fetching pools ready for yield:', error);
      throw new Error(`Failed to fetch pools ready for yield: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== MARKETPLACE METHODS ====================

  /**
   * Create marketplace listing
   */
  async createListing(
    poolToken: string,
    poolId: string,
    amount: bigint,
    pricePerToken: bigint,
    minPurchase: bigint,
    maxPurchase: bigint,
    deadline: number
  ): Promise<{ listingId: string; txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    const marketplace = this.getContract(
      novaxContractAddresses.MARKETPLACE,
      NovaxMarketplaceABI
    );

    const poolIdBytes32 = poolId.startsWith('0x') && poolId.length === 66
      ? poolId
      : ethers.id(poolId);

    // Approve pool tokens
    const poolTokenContract = this.getContract(poolToken, PoolTokenABI);
    const userAddress = await this.signer.getAddress();
    
    const allowance = await poolTokenContract.allowance(userAddress, novaxContractAddresses.MARKETPLACE);
    if (allowance < amount) {
      const approveTx = await poolTokenContract.approve(novaxContractAddresses.MARKETPLACE, amount);
      await approveTx.wait();
    }

    const tx = await marketplace.createListing(
      poolToken,
      poolIdBytes32,
      amount,
      pricePerToken,
      minPurchase,
      maxPurchase,
      deadline
    );

    const receipt = await waitForTransaction(tx, this.provider, 180);
    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    // Parse event
    const eventLog = receipt.logs.find((log: any) => {
      try {
        const parsed = marketplace.interface.parseLog({ topics: log.topics, data: log.data });
        return parsed?.name === 'ListingCreated';
      } catch {
        return false;
      }
    });

    if (!eventLog) {
      throw new Error('ListingCreated event not found');
    }

    const parsedEvent = marketplace.interface.parseLog({
      topics: eventLog.topics,
      data: eventLog.data,
    });

    const listingId = parsedEvent?.args[0] || eventLog.topics[1];

    return {
      listingId: typeof listingId === 'string' ? listingId : ethers.hexlify(listingId),
      txHash: receipt.hash,
    };
  }

  /**
   * Buy tokens from marketplace
   */
  async buyTokens(listingId: string, amount: bigint): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    const marketplace = this.getContract(
      novaxContractAddresses.MARKETPLACE,
      NovaxMarketplaceABI
    );

    const listingIdBytes32 = listingId.startsWith('0x') && listingId.length === 66
      ? listingId
      : ethers.id(listingId);

    // Get listing to calculate total price
    const listing = await marketplace.getListing(listingIdBytes32);
    const totalPrice = (amount * listing.pricePerToken) / ethers.parseUnits('1', 18);

    // Approve USDC
    const usdc = this.getContract(novaxContractAddresses.USDC, MockUSDCABI);
    const userAddress = await this.signer.getAddress();
    
    const allowance = await usdc.allowance(userAddress, novaxContractAddresses.MARKETPLACE);
    if (allowance < totalPrice) {
      const approveTx = await usdc.approve(novaxContractAddresses.MARKETPLACE, totalPrice);
      await approveTx.wait();
    }

    const tx = await marketplace.buyTokens(listingIdBytes32, amount);
    const receipt = await tx.wait();

    return { txHash: receipt.hash };
  }

  /**
   * Get marketplace listing
   */
  async getListing(listingId: string): Promise<any> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const marketplace = this.getContract(
      novaxContractAddresses.MARKETPLACE,
      NovaxMarketplaceABI
    );

    const listingIdBytes32 = listingId.startsWith('0x') && listingId.length === 66
      ? listingId
      : ethers.id(listingId);

    return await marketplace.getListing(listingIdBytes32);
  }

  /**
   * Get all listings for a pool
   */
  async getPoolListings(poolId: string): Promise<any[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const marketplace = this.getContract(
      novaxContractAddresses.MARKETPLACE,
      NovaxMarketplaceABI
    );

    const poolIdBytes32 = poolId.startsWith('0x') && poolId.length === 66
      ? poolId
      : ethers.id(poolId);

    const listingIds = await marketplace.getPoolListings(poolIdBytes32);
    const listings = [];

    for (const listingId of listingIds) {
      try {
        const listing = await marketplace.getListing(listingId);
        if (listing.active) {
          listings.push({
            listingId: listingId,
            ...listing,
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch listing ${listingId}:`, error);
      }
    }

    return listings;
  }

  /**
   * Get user's listings
   */
  async getUserListings(userAddress: string): Promise<any[]> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const marketplace = this.getContract(
      novaxContractAddresses.MARKETPLACE,
      NovaxMarketplaceABI
    );

    const listingIds = await marketplace.getUserListings(userAddress);
    const listings = [];

    for (const listingId of listingIds) {
      try {
        const listing = await marketplace.getListing(listingId);
        listings.push({
          listingId: listingId,
          ...listing,
        });
      } catch (error) {
        console.warn(`Failed to fetch listing ${listingId}:`, error);
      }
    }

    return listings;
  }

  /**
   * Cancel marketplace listing
   */
  async cancelListing(listingId: string): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    const marketplace = this.getContract(
      novaxContractAddresses.MARKETPLACE,
      NovaxMarketplaceABI
    );

    const listingIdBytes32 = listingId.startsWith('0x') && listingId.length === 66
      ? listingId
      : ethers.id(listingId);

    const tx = await marketplace.cancelListing(listingIdBytes32);
    const receipt = await tx.wait();

    return { txHash: receipt.hash };
  }

  // ==================== TOKEN METHODS ====================

  /**
   * Get USDC balance
   */
  async getUSDCBalance(address: string): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const usdc = this.getContract(novaxContractAddresses.USDC, MockUSDCABI);
    return await usdc.balanceOf(address);
  }

  /**
   * Approve USDC spending
   */
  async approveUSDC(spender: string, amount: bigint): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    // Get gas options with buffer to prevent gas price errors
    const gasOptions = await this.getGasOptions(30);
    
    const usdc = this.getContract(novaxContractAddresses.USDC, MockUSDCABI);
    
    let tx;
    try {
      tx = await usdc.approve(spender, amount, gasOptions);
    } catch (txError: any) {
      // If it fails due to gas price, retry with fresh fee data
      if (txError.message?.includes('max fee per gas') || txError.message?.includes('base fee')) {
        console.warn('⚠️ Gas price issue detected in approveUSDC, retrying with fresh fee data...');
        const freshGasOptions = await this.getGasOptions(40);
        tx = await usdc.approve(spender, amount, freshGasOptions);
      } else {
        throw txError;
      }
    }
    
    const receipt = await tx.wait();

    return { txHash: receipt.hash };
  }

  /**
   * Get PoolToken balance
   */
  async getPoolTokenBalance(poolToken: string, address: string): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const poolTokenContract = this.getContract(poolToken, PoolTokenABI);
    return await poolTokenContract.balanceOf(address);
  }

  /**
   * Get native token (ETH) balance for gas
   */
  async getETHBalance(address?: string): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    let walletAddress: string;
    if (address) {
      walletAddress = address;
    } else if (this.signer) {
      walletAddress = await this.signer.getAddress();
    } else {
      throw new Error('Signer not initialized and no address provided');
    }

    return await this.provider.getBalance(walletAddress);
  }

  /**
   * Get NVX token balance
   */
  async getNVXBalance(address: string): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider not initialized. Please call initialize() first.');
    }

    try {
      const nvxToken = this.getContract(novaxContractAddresses.NVX_TOKEN, NVXTokenABI);
      return await nvxToken.balanceOf(address);
    } catch (error: any) {
      // If contract not deployed or wrong address, return 0
      if (error.code === 'BAD_DATA' || error.message?.includes('decode') || error.message?.includes('0x')) {
        console.warn('NVX token contract may not be deployed or ABI mismatch');
        return BigInt(0);
      }
      throw error;
    }
  }

  /**
   * Approve NVX token spending
   */
  async approveNVX(spender: string, amount: bigint): Promise<{ txHash: string }> {
    if (!this.signer) {
      throw new Error('Signer not initialized. Please connect wallet first.');
    }

    const nvxToken = this.getContract(novaxContractAddresses.NVX_TOKEN, NVXTokenABI);
    const tx = await nvxToken.approve(spender, amount);
    const receipt = await tx.wait();

    return { txHash: receipt.hash };
  }
}

// Export singleton instance
export const novaxContractService = new NovaxContractService();

