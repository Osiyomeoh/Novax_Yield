/**
 * TRUSTMarketplaceV2 Service - Hedera Native Integration
 * Handles royalty-enabled marketplace operations using Hedera SDK
 */

import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Hbar,
  AccountId,
  TokenId,
  AccountAllowanceApproveTransaction,
  TransferTransaction,
  TransactionId,
  TokenAssociateTransaction,
} from '@hashgraph/sdk';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export class MarketplaceV2Service {
  
  /**
   * Set royalty for an NFT (call before listing)
   */
  async setRoyalty(
    nftTokenId: string,
    serialNumber: number,
    royaltyPercentage: number,
    accountId: string,
    signer: any,
    hederaClient: any
  ): Promise<{ transactionId: string }> {
    try {
      console.log('👑 Setting royalty on MarketplaceV2:', {
        nftTokenId,
        serialNumber,
        royaltyPercentage
      });

      // Convert Token ID to Solidity address (TokenId, not AccountId!)
      const tokenIdObj = TokenId.fromString(nftTokenId);
      const nftAddress = tokenIdObj.toSolidityAddress();
      
      console.log('Token ID converted to Solidity address:', {
        original: nftTokenId,
        solidityAddress: nftAddress
      });
      
      // Convert royalty percentage to basis points (5% = 500)
      const basisPoints = Math.floor(royaltyPercentage * 100);

      // Create contract execute transaction
      const contractExecTx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(CONTRACT_ADDRESSES.trustMarketplaceV2))
        .setGas(200000)
        .setFunction(
          'setRoyalty',
          new ContractFunctionParameters()
            .addAddress(nftAddress)
            .addUint256(serialNumber)
            .addUint256(basisPoints)
        )
        .setMaxTransactionFee(new Hbar(2));

      console.log('Transaction created, freezing with signer...');
      contractExecTx.freezeWithSigner(signer);
      
      console.log('Requesting signature from HashPack...');
      const signedTx = await signer.signTransaction(contractExecTx);
      
      // Execute
      const response = await signedTx.execute(hederaClient);
      const receipt = await response.getReceipt(hederaClient);

      console.log('✅ Royalty set successfully');

      return {
        transactionId: response.transactionId.toString()
      };
    } catch (error) {
      console.error('❌ Failed to set royalty:', error);
      throw error;
    }
  }

  /**
   * Transfer NFT to marketplace contract (instead of allowance)
   * This works around the SDK bug with NFT allowances
   */
  async approveNFT(
    nftTokenId: string,
    serialNumber: number,
    accountId: string,
    signer: any,
    hederaClient: any
  ): Promise<{ transactionId: string }> {
    try {
      console.log('🚀 STARTING NFT transfer to marketplace...');
      console.log('✅ Transferring NFT to MarketplaceV2 (using direct transfer)...', {
        nftTokenId,
        serialNumber,
        ownerAccount: accountId,
        marketplaceContract: CONTRACT_ADDRESSES.trustMarketplaceV2
      });
      
      // Basic validation
      if (!nftTokenId) throw new Error('nftTokenId is required');
      if (!serialNumber) throw new Error('serialNumber is required');
      if (!accountId) throw new Error('accountId is required');
      if (!signer) throw new Error('signer is required');
      if (!hederaClient) throw new Error('hederaClient is required');
      
      console.log('✅ All basic validations passed');
      
      // Check contract address
      if (!CONTRACT_ADDRESSES.trustMarketplaceV2) {
        throw new Error('trustMarketplaceV2 contract address is not defined');
      }
      console.log('✅ Contract address exists:', CONTRACT_ADDRESSES.trustMarketplaceV2);

      // Parse IDs
      const tokenId = TokenId.fromString(nftTokenId);
      const ownerAccountId = AccountId.fromString(accountId);
      const marketplaceAccountId = AccountId.fromString(CONTRACT_ADDRESSES.trustMarketplaceV2);
      
      console.log('✅ All IDs parsed successfully');
      console.log('  Token ID:', tokenId.toString());
      console.log('  Owner:', ownerAccountId.toString());
      console.log('  Marketplace:', marketplaceAccountId.toString());

      // Step 1: Check if user account is associated with the token
      console.log('🔍 Step 1: Ensuring user account is associated with token...');
      try {
        const associateTx = new TokenAssociateTransaction()
          .setAccountId(ownerAccountId)  // Associate with user's account, not marketplace
          .setTokenIds([tokenId])
          .setMaxTransactionFee(new Hbar(2));

        associateTx.setTransactionId(TransactionId.generate(ownerAccountId));
        associateTx.freezeWithSigner(signer);
        
        console.log('Requesting signature for token association...');
        const signedAssociateTx = await signer.signTransaction(associateTx);
        
        console.log('Executing token association...');
        const associateResponse = await signedAssociateTx.execute(hederaClient);
        await associateResponse.getReceipt(hederaClient);
        
        console.log('✅ Token associated with user account');
      } catch (associateError: any) {
        // If already associated, that's fine
        if (associateError.message?.includes('TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT')) {
          console.log('✅ Token already associated with user account');
        } else {
          console.error('❌ Token association failed:', associateError.message);
          throw new Error(`Token association failed: ${associateError.message}`);
        }
      }

      // Step 2: Create direct NFT transfer
      console.log('🔍 Step 2: Creating direct NFT transfer...');
      const transferTx = new TransferTransaction()
        .addNftTransfer(
          tokenId,
          serialNumber,
          ownerAccountId,      // From owner
          marketplaceAccountId // To marketplace
        )
        .setTransactionMemo(`Transfer NFT to marketplace for listing`)
        .setMaxTransactionFee(new Hbar(2));

      console.log('✅ Transfer transaction created');

      // Set transaction ID and freeze
      transferTx.setTransactionId(TransactionId.generate(ownerAccountId));
      transferTx.freezeWithSigner(signer);
      
      console.log('Requesting signature from HashPack...');
      const signedTx = await signer.signTransaction(transferTx);
      
      console.log('Executing transfer...');
      const response = await signedTx.execute(hederaClient);
      
      console.log('Waiting for receipt...');
      await response.getReceipt(hederaClient);

      console.log('✅ NFT transferred to marketplace successfully');

      return {
        transactionId: response.transactionId.toString()
      };
    } catch (error) {
      console.error('❌ Failed to transfer NFT to marketplace:', error);
      throw error;
    }
  }

  /**
   * Approve TRUST tokens for marketplace contract
   */
  async approveTRUST(
    amount: number,
    accountId: string,
    signer: any,
    hederaClient: any
  ): Promise<{ transactionId: string }> {
    try {
      console.log('💰 Approving TRUST for MarketplaceV2:', amount);

      const trustTokenId = TokenId.fromString('0.0.6935064');
      const marketplaceAccountId = AccountId.fromString(CONTRACT_ADDRESSES.trustMarketplaceV2);

      // Create token allowance
      const approveTx = new AccountAllowanceApproveTransaction()
        .approveTokenAllowance(
          trustTokenId,
          AccountId.fromString(accountId),
          marketplaceAccountId,
          amount * 100000000 // Convert to smallest unit
        )
        .setMaxTransactionFee(new Hbar(2));

      // Freeze with client (not signer) for allowance transactions
      await approveTx.freezeWith(hederaClient);
      
      // Sign and execute
      const signedTx = await signer.signTransaction(approveTx);
      const response = await signedTx.execute(hederaClient);
      await response.getReceipt(hederaClient);

      console.log('✅ TRUST tokens approved for marketplace');

      return {
        transactionId: response.transactionId.toString()
      };
    } catch (error) {
      console.error('❌ Failed to approve TRUST:', error);
      throw error;
    }
  }

  /**
   * List NFT on MarketplaceV2 (call after setting royalty and approval)
   */
  async listAsset(
    nftTokenId: string,
    serialNumber: number,
    price: number,
    duration: number,
    accountId: string,
    signer: any,
    hederaClient: any
  ): Promise<{ listingId: number; transactionId: string }> {
    try {
      console.log('📋 Listing asset on MarketplaceV2:', {
        nftTokenId,
        serialNumber,
        price,
        duration
      });

      // Convert Token ID to Solidity address (TokenId, not AccountId!)
      const tokenIdObj = TokenId.fromString(nftTokenId);
      const nftAddress = tokenIdObj.toSolidityAddress();
      
      const priceInSmallestUnit = Math.floor(price * 100000000); // Convert to smallest unit
      const durationInSeconds = duration * 24 * 60 * 60; // Convert days to seconds

      // Create contract execute transaction
      const contractExecTx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(CONTRACT_ADDRESSES.trustMarketplaceV2))
        .setGas(300000)
        .setFunction(
          'listAsset',
          new ContractFunctionParameters()
            .addAddress(nftAddress)
            .addUint256(serialNumber)
            .addUint256(priceInSmallestUnit)
            .addUint256(durationInSeconds)
        )
        .setMaxTransactionFee(new Hbar(5));

      // Freeze and sign
      console.log('Freezing transaction with signer...');
      contractExecTx.freezeWithSigner(signer);
      
      console.log('Requesting signature from HashPack...');
      const signedTx = await signer.signTransaction(contractExecTx);
      
      // Execute
      const response = await signedTx.execute(hederaClient);
      const receipt = await response.getReceipt(hederaClient);

      console.log('✅ Asset listed on MarketplaceV2');

      // TODO: Parse listing ID from contract call record
      const listingId = 1; // Placeholder - would need to query contract

      return {
        listingId,
        transactionId: response.transactionId.toString()
      };
    } catch (error) {
      console.error('❌ Failed to list asset:', error);
      throw error;
    }
  }

  /**
   * Buy NFT from MarketplaceV2 (automatic royalty distribution!)
   */
  async buyNFT(
    listingId: number,
    accountId: string,
    signer: any,
    hederaClient: any
  ): Promise<{ 
    transactionId: string;
    royaltyPaid?: number;
    platformFee?: number;
  }> {
    try {
      console.log('🛒 Buying NFT from MarketplaceV2:', { listingId });

      // Create contract execute transaction
      const contractExecTx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(CONTRACT_ADDRESSES.trustMarketplaceV2))
        .setGas(500000)
        .setFunction(
          'buyNFT',
          new ContractFunctionParameters()
            .addUint256(listingId)
        )
        .setMaxTransactionFee(new Hbar(10));

      // Freeze and sign
      await contractExecTx.freezeWithSigner(signer);
      const signedTx = await signer.signTransaction(contractExecTx);
      
      // Execute
      const response = await signedTx.execute(hederaClient);
      const receipt = await response.getReceipt(hederaClient);

      console.log('✅ NFT purchased from MarketplaceV2!');
      console.log('   🎉 Royalty automatically distributed to creator!');
      console.log('   💰 Platform fee automatically sent to treasury!');

      return {
        transactionId: response.transactionId.toString()
      };
    } catch (error) {
      console.error('❌ Failed to buy NFT:', error);
      throw error;
    }
  }

  /**
   * Cancel listing on marketplace contract
   */
  async cancelListing(
    listingId: number,
    accountId: string,
    signer: any,
    hederaClient: any
  ): Promise<{ transactionId: string }> {
    try {
      console.log('🚫 Cancelling listing on MarketplaceV2:', {
        listingId,
        seller: accountId
      });

      // Create contract execute transaction
      const contractExecTx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(CONTRACT_ADDRESSES.trustMarketplaceV2))
        .setGas(200000)
        .setFunction(
          'cancelListing',
          new ContractFunctionParameters()
            .addUint256(listingId)
        )
        .setMaxTransactionFee(new Hbar(2));

      console.log('Transaction created, freezing with signer...');
      contractExecTx.freezeWithSigner(signer);
      
      console.log('Requesting signature from HashPack...');
      const signedTx = await signer.signTransaction(contractExecTx);
      
      // Execute
      const response = await signedTx.execute(hederaClient);
      const receipt = await response.getReceipt(hederaClient);

      console.log('✅ Listing cancelled successfully');

      return {
        transactionId: response.transactionId.toString()
      };
    } catch (error) {
      console.error('❌ Failed to cancel listing:', error);
      throw error;
    }
  }
}

export const marketplaceV2Service = new MarketplaceV2Service();
export default marketplaceV2Service;

