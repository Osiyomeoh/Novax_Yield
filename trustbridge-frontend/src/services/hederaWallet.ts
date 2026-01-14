import {
  Client,
  PrivateKey,
  AccountId,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TokenBurnTransaction,
  TokenWipeTransaction,
  TokenPauseTransaction,
  TokenUnpauseTransaction,
  TokenDeleteTransaction,
  AccountBalanceQuery,
  LedgerId
} from "@hashgraph/sdk";
import { HashConnect } from "hashconnect";

export class HederaWalletService {
  private client: Client | null = null;
  private hashconnect: HashConnect | null = null;
  private accountId: string | null = null;
  private privateKey: PrivateKey | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initializeHashConnect();
  }

  private async initializeHashConnect() {
    try {
      this.hashconnect = new HashConnect();
      await this.hashconnect.init();
      console.log("HashConnect initialized successfully");
    } catch (error) {
      console.error("Failed to initialize HashConnect:", error);
    }
  }

  async connectHashPack(): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
      if (!this.hashconnect) {
        return { success: false, error: "HashConnect not initialized" };
      }

      // Check if already connected
      if (this.isConnected && this.accountId) {
        return { success: true, accountId: this.accountId };
      }

      // Open pairing modal
      this.hashconnect.openPairingModal();

      // Listen for pairing events
      return new Promise((resolve) => {
        this.hashconnect!.pairingEvent.on((pairingData) => {
          console.log("Paired with HashPack:", pairingData);
          this.accountId = pairingData.accountIds[0];
          this.isConnected = true;
          resolve({ success: true, accountId: this.accountId });
        });

        this.hashconnect!.disconnectionEvent.on(() => {
          console.log("Disconnected from HashPack");
          this.isConnected = false;
          this.accountId = null;
        });
      });
    } catch (error) {
      console.error("HashPack connection failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async disconnectHashPack(): Promise<void> {
    if (this.hashconnect && this.isConnected) {
      this.hashconnect.disconnect();
      this.isConnected = false;
      this.accountId = null;
    }
  }

  isHashPackConnected(): boolean {
    return this.isConnected && !!this.accountId;
  }

  getAccountId(): string | null {
    return this.accountId;
  }

  async createToken(params: {
    tokenName: string;
    tokenSymbol: string;
    totalSupply: number;
    decimals: number;
    treasuryAccountId: string;
    adminKey: string;
    supplyKey: string;
    freezeKey: string;
    kycKey: string;
    metadata: any;
  }): Promise<{ success: boolean; tokenId?: string; transactionId?: string; transactionHash?: string; tokenAddress?: string; fullSignature?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.accountId) {
        return { success: false, error: "Not connected to HashPack" };
      }

      // Use HashConnect service to create real token
      if (!this.client) {
        throw new Error("HashConnect client not initialized");
      }

      const tokenCreateTransaction = new TokenCreateTransaction()
        .setTokenName(params.name)
        .setTokenSymbol(params.symbol)
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(params.decimals)
        .setInitialSupply(params.initialSupply)
        .setTreasuryAccountId(this.accountId)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(params.maxSupply)
        .setAdminKey(this.accountId)
        .setSupplyKey(this.accountId)
        .setWipeKey(this.accountId)
        .setFreezeKey(this.accountId)
        .setPauseKey(this.accountId)
        .setKycKey(this.accountId)
        .setFeeScheduleKey(this.accountId);

      const tokenCreateTransactionResponse = await tokenCreateTransaction.execute(this.client);
      const tokenCreateReceipt = await tokenCreateTransactionResponse.getReceipt(this.client);
      const tokenId = tokenCreateReceipt.tokenId;

      console.log("Token created successfully:", tokenId);

      return {
        success: true,
        tokenId: tokenId.toString(),
        transactionId: tokenCreateTransactionResponse.transactionId.toString(),
        transactionHash: tokenCreateTransactionResponse.transactionId.toString(),
        tokenAddress: tokenId.toString(),
        fullSignature: tokenCreateTransactionResponse.transactionId.toString()
      };
    } catch (error) {
      console.error("Token creation failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async getAccountBalance(accountId: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      if (!this.client) {
        return { success: false, error: "Client not initialized" };
      }

      const balance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(this.client);

      return {
        success: true,
        balance: balance.hbars.toNumber()
      };
    } catch (error) {
      console.error("Failed to get account balance:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async mintToken(tokenId: string, amount: number): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.accountId) {
        return { success: false, error: "Not connected to HashPack" };
      }

      // Use HashConnect service to mint real tokens
      if (!this.client) {
        throw new Error("HashConnect client not initialized");
      }

      const tokenMintTransaction = new TokenMintTransaction()
        .setTokenId(tokenId)
        .setAmount(amount);

      const tokenMintTransactionResponse = await tokenMintTransaction.execute(this.client);
      const tokenMintReceipt = await tokenMintTransactionResponse.getReceipt(this.client);

      console.log("Token minted successfully:", tokenMintReceipt);

      return {
        success: true,
        transactionId: tokenMintTransactionResponse.transactionId.toString()
      };
    } catch (error) {
      console.error("Token minting failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async burnToken(tokenId: string, amount: number): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.accountId) {
        return { success: false, error: "Not connected to HashPack" };
      }

      // Use HashConnect service to burn real tokens
      if (!this.client) {
        throw new Error("HashConnect client not initialized");
      }

      const tokenBurnTransaction = new TokenBurnTransaction()
        .setTokenId(tokenId)
        .setAmount(amount);

      const tokenBurnTransactionResponse = await tokenBurnTransaction.execute(this.client);
      const tokenBurnReceipt = await tokenBurnTransactionResponse.getReceipt(this.client);

      console.log("Token burned successfully:", tokenBurnReceipt);

      return {
        success: true,
        transactionId: tokenBurnTransactionResponse.transactionId.toString()
      };
    } catch (error) {
      console.error("Token burning failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async pauseToken(tokenId: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.accountId) {
        return { success: false, error: "Not connected to HashPack" };
      }

      // Use HashConnect service to pause real tokens
      if (!this.client) {
        throw new Error("HashConnect client not initialized");
      }

      const tokenPauseTransaction = new TokenPauseTransaction()
        .setTokenId(tokenId);

      const tokenPauseTransactionResponse = await tokenPauseTransaction.execute(this.client);
      const tokenPauseReceipt = await tokenPauseTransactionResponse.getReceipt(this.client);

      console.log("Token paused successfully:", tokenPauseReceipt);

      return {
        success: true,
        transactionId: tokenPauseTransactionResponse.transactionId.toString()
      };
    } catch (error) {
      console.error("Token pausing failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async unpauseToken(tokenId: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.accountId) {
        return { success: false, error: "Not connected to HashPack" };
      }

      // Use HashConnect service to unpause real tokens
      if (!this.client) {
        throw new Error("HashConnect client not initialized");
      }

      const tokenUnpauseTransaction = new TokenUnpauseTransaction()
        .setTokenId(tokenId);

      const tokenUnpauseTransactionResponse = await tokenUnpauseTransaction.execute(this.client);
      const tokenUnpauseReceipt = await tokenUnpauseTransactionResponse.getReceipt(this.client);

      console.log("Token unpaused successfully:", tokenUnpauseReceipt);

      return {
        success: true,
        transactionId: tokenUnpauseTransactionResponse.transactionId.toString()
      };
    } catch (error) {
      console.error("Token unpausing failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }

  async deleteToken(tokenId: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      if (!this.isConnected || !this.accountId) {
        return { success: false, error: "Not connected to HashPack" };
      }

      // Use HashConnect service to delete real tokens
      if (!this.client) {
        throw new Error("HashConnect client not initialized");
      }

      const tokenDeleteTransaction = new TokenDeleteTransaction()
        .setTokenId(tokenId);

      const tokenDeleteTransactionResponse = await tokenDeleteTransaction.execute(this.client);
      const tokenDeleteReceipt = await tokenDeleteTransactionResponse.getReceipt(this.client);

      console.log("Token deleted successfully:", tokenDeleteReceipt);

      return {
        success: true,
        transactionId: tokenDeleteTransactionResponse.transactionId.toString()
      };
    } catch (error) {
      console.error("Token deletion failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  }
}

export const hederaWallet = new HederaWalletService();
