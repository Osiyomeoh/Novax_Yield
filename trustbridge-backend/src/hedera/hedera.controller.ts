import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { HederaService } from './hedera.service';
import { TrustTokenService } from './trust-token.service';
import { HscsContractService } from './hscs-contract.service';
import { HscsHybridService } from './hscs-hybrid.service';
import { MarketplaceService } from './marketplace.service';
import { HcsService } from './hcs.service';
import { TokenizationRequestDto } from './dto/tokenization-request.dto';

export class SettlementRequestDto {
  assetId: string;
  buyer: string;
  seller: string;
  amount: number;
  deliveryDeadline: Date;
}

export class KYCRequestDto {
  @ApiProperty({ example: '0.0.1234567' })
  @IsString()
  accountId: string;

  @ApiProperty({ example: '0.0.9876543' })
  @IsString()
  tokenId: string;

  @ApiProperty({ example: 'GRANT', enum: ['GRANT', 'REVOKE'] })
  @IsString()
  kycStatus: 'GRANT' | 'REVOKE';

  @ApiProperty({ example: 'KYC verification completed', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class FreezeRequestDto {
  @ApiProperty({ example: '0.0.1234567' })
  @IsString()
  accountId: string;

  @ApiProperty({ example: '0.0.9876543' })
  @IsString()
  tokenId: string;

  @ApiProperty({ example: 'FREEZE', enum: ['FREEZE', 'UNFREEZE'] })
  @IsString()
  freezeStatus: 'FREEZE' | 'UNFREEZE';

  @ApiProperty({ example: 'Compliance violation', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TokenAssociationRequestDto {
  @ApiProperty({ example: '0.0.1234567' })
  @IsString()
  accountId: string;

  @ApiProperty({ example: '0.0.9876543' })
  @IsString()
  tokenId: string;

  @ApiProperty({ example: 'ASSOCIATE', enum: ['ASSOCIATE', 'DISSOCIATE'] })
  @IsString()
  action: 'ASSOCIATE' | 'DISSOCIATE';
}

@ApiTags('Hedera')
@Controller('hedera')
export class HederaController {
  constructor(
    private readonly hederaService: HederaService,
    private readonly trustTokenService: TrustTokenService,
    private readonly hscsContractService: HscsContractService,
    private readonly hscsHybridService: HscsHybridService,
    private readonly marketplaceService: MarketplaceService,
    private readonly hcsService: HcsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get Hedera services overview' })
  @ApiResponse({ status: 200, description: 'Hedera services overview' })
  async getHederaOverview() {
    return {
      success: true,
      data: {
        status: 'Hedera services are running',
        availableEndpoints: [
          'GET /api/hedera/status - Get network status',
          'POST /api/hedera/tokenize - Create asset token',
          'POST /api/hedera/mint/:tokenId - Mint tokens',
          'POST /api/hedera/transfer - Transfer tokens',
          'GET /api/hedera/balance/:accountId - Get account balance',
          'GET /api/hedera/token-balance/:accountId/:tokenId - Get token balance',
          'POST /api/hedera/kyc/grant - Grant KYC status',
          'POST /api/hedera/kyc/revoke - Revoke KYC status',
          'POST /api/hedera/freeze - Freeze account',
          'POST /api/hedera/unfreeze - Unfreeze account'
        ]
      },
      message: 'Hedera services are operational'
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Hedera services status' })
  @ApiResponse({ status: 200, description: 'Hedera services status' })
  async getStatus() {
    const status = await this.hederaService.getNetworkStatus();
    return {
      success: true,
      data: status,
      message: 'Hedera services status'
    };
  }

  @Post('tokenize')
  @ApiOperation({ summary: 'Create asset token on Hedera' })
  @ApiBody({ type: TokenizationRequestDto })
  @ApiResponse({ status: 201, description: 'Asset tokenized successfully' })
  async tokenizeAsset(@Body() tokenizationRequest: TokenizationRequestDto) {
    const result = await this.hederaService.createAssetToken(tokenizationRequest);
    return {
      success: true,
      data: result,
      message: 'Asset tokenized successfully'
    };
  }

  @Post('mint/:tokenId')
  @ApiOperation({ summary: 'Mint tokens for asset' })
  @ApiResponse({ status: 200, description: 'Tokens minted successfully' })
  async mintTokens(
    @Param('tokenId') tokenId: string,
    @Body() body: { amount: number; recipient: string }
  ) {
    const transactionId = await this.hederaService.mintTokens(
      tokenId,
      body.amount,
      body.recipient
    );
    return {
      success: true,
      data: { transactionId },
      message: 'Tokens minted successfully'
    };
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer tokens between accounts' })
  @ApiResponse({ status: 200, description: 'Tokens transferred successfully' })
  async transferTokens(@Body() body: {
    tokenId: string;
    from: string;
    to: string;
    amount: number;
  }) {
    const transactionId = await this.hederaService.transferTokens(
      body.tokenId,
      body.from,
      body.to,
      body.amount
    );
    return {
      success: true,
      data: { transactionId },
      message: 'Tokens transferred successfully'
    };
  }

  @Post('settlement')
  @ApiOperation({ summary: 'Create settlement on Hedera' })
  @ApiBody({ type: SettlementRequestDto })
  @ApiResponse({ status: 201, description: 'Settlement created successfully' })
  async createSettlement(@Body() settlementRequest: SettlementRequestDto) {
    const transactionId = await this.hederaService.createSettlement(settlementRequest);
    return {
      success: true,
      data: { transactionId },
      message: 'Settlement created successfully'
    };
  }

  @Get('balance/:accountId')
  @ApiOperation({ summary: 'Get account balance' })
  @ApiResponse({ status: 200, description: 'Account balance retrieved' })
  async getAccountBalance(@Param('accountId') accountId: string) {
    const balance = await this.hederaService.getAccountBalance(accountId);
    return {
      success: true,
      data: { accountId, balance },
      message: 'Account balance retrieved'
    };
  }

  @Get('token-balance/:accountId/:tokenId')
  @ApiOperation({ summary: 'Get token balance for account' })
  @ApiResponse({ status: 200, description: 'Token balance retrieved' })
  async getTokenBalance(
    @Param('accountId') accountId: string,
    @Param('tokenId') tokenId: string
  ) {
    const balance = await this.hederaService.getTokenBalance(accountId, tokenId);
    return {
      success: true,
      data: { accountId, tokenId, balance },
      message: 'Token balance retrieved'
    };
  }

  @Post('hcs/message')
  @ApiOperation({ summary: 'Submit message to HCS topic' })
  @ApiResponse({ status: 200, description: 'Message submitted successfully' })
  async submitHCSMessage(@Body() body: { topicId: string; message: any }) {
    const transactionId = await this.hederaService.createHCSMessage(
      body.topicId,
      body.message
    );
    return {
      success: true,
      data: { transactionId },
      message: 'HCS message submitted successfully'
    };
  }

  @Post('hfs/upload')
  @ApiOperation({ summary: 'Upload file to HFS' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(@Body() body: { content: string; fileName: string }) {
    const contentBuffer = Buffer.from(body.content, 'base64');
    const fileId = await this.hederaService.storeFileOnHFS(contentBuffer, body.fileName);
    return {
      success: true,
      data: { fileId },
      message: 'File uploaded successfully'
    };
  }

  @Post('create-dual-tokenization')
  @ApiOperation({ summary: 'Create dual tokenization (ERC-721 + HTS) for an asset' })
  @ApiResponse({ status: 201, description: 'Dual tokenization created successfully' })
  async createDualTokenization(@Body() body: {
    name: string;
    symbol: string;
    description: string;
    imageURI: string;
    owner: string;
    category: string;
    assetType: string;
    totalValue: string;
    erc721TokenId: string;
    erc721AssetId: string;
  }) {
    const result = await this.hederaService.createDualTokenization(body);
    return {
      success: true,
      data: result,
      message: 'Dual tokenization created successfully'
    };
  }

  @Get('user-assets/:userAddress')
  @ApiOperation({ summary: 'Get all assets for a user using Hedera services' })
  @ApiResponse({ status: 200, description: 'User assets retrieved successfully' })
  async getUserAssets(@Param('userAddress') userAddress: string) {
    const result = await this.hederaService.getUserAssets(userAddress);
    return {
      success: true,
      data: result,
      message: 'User assets retrieved successfully'
    };
  }

  @Get('marketplace-data')
  @ApiOperation({ summary: 'Get marketplace data using Hedera services' })
  @ApiResponse({ status: 200, description: 'Marketplace data retrieved successfully' })
  async getMarketplaceData() {
    const result = await this.hederaService.getMarketplaceData();
    return {
      success: true,
      data: result,
      message: 'Marketplace data retrieved successfully'
    };
  }

  @Post('approve-asset')
  @ApiOperation({ summary: 'Approve RWA asset on Hedera network' })
  @ApiResponse({ status: 200, description: 'Asset approved successfully' })
  async approveAsset(@Body() body: { tokenId: string; approved: boolean; comments?: string; verificationScore?: number }) {
    try {
      const result = await this.hederaService.approveRWAAsset(body.tokenId, body.approved, body.comments, body.verificationScore);
      return {
        success: true,
        data: result,
        message: 'Asset approved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to approve asset'
      };
    }
  }

  @Post('reject-asset')
  @ApiOperation({ summary: 'Reject RWA asset on Hedera network' })
  @ApiResponse({ status: 200, description: 'Asset rejected successfully' })
  async rejectAsset(@Body() body: { tokenId: string; approved: boolean; comments?: string }) {
    try {
      const result = await this.hederaService.rejectRWAAsset(body.tokenId, body.comments);
      return {
        success: true,
        data: result,
        message: 'Asset rejected successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to reject asset'
      };
    }
  }

  @Post('update-dual-tokenization')
  @ApiOperation({ summary: 'Update dual tokenization with ERC-721 data' })
  @ApiResponse({ status: 200, description: 'Dual tokenization updated successfully' })
  async updateDualTokenization(@Body() body: {
    erc721TokenId: string;
    erc721AssetId: string;
    name: string;
    symbol: string;
    description: string;
    imageURI: string;
    owner: string;
    category: string;
    assetType: string;
    totalValue: string;
  }) {
    const result = await this.hederaService.updateDualTokenization(body);
    return {
      success: true,
      data: result,
      message: 'Dual tokenization updated successfully'
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for Hedera services' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async healthCheck() {
    const isHealthy = await this.hederaService.healthCheck();
    return {
      success: true,
      data: { healthy: isHealthy },
      message: isHealthy ? 'Hedera services are healthy' : 'Hedera services are not responding'
    };
  }

  @Post('test-hts-simple')
  @ApiOperation({ summary: 'Test simple HTS token creation' })
  @ApiResponse({ status: 200, description: 'HTS test completed' })
  async testHTSSimple() {
    try {
      const result = await this.hederaService.testSimpleHTSToken();
      return {
        success: true,
        data: result,
        message: 'Simple HTS test completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Simple HTS test failed'
      };
    }
  }

  @Post('test-hfs-hcs')
  @ApiOperation({ summary: 'Test HFS + HCS integration (simplest flow)' })
  @ApiResponse({ status: 200, description: 'HFS + HCS test completed' })
  async testHFSHCS() {
    try {
      const result = await this.hederaService.testHFSHCSIntegration();
      return {
        success: true,
        data: result,
        message: 'HFS + HCS test completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'HFS + HCS test failed'
      };
    }
  }

  // KYC Management Endpoints
  @Post('kyc/grant')
  @ApiOperation({ summary: 'Grant KYC status for account on token' })
  @ApiBody({ type: KYCRequestDto })
  @ApiResponse({ status: 200, description: 'KYC granted successfully' })
  async grantKYC(@Body() kycRequest: KYCRequestDto) {
    const transactionId = await this.hederaService.grantKYC(kycRequest);
    return {
      success: true,
      data: { transactionId },
      message: 'KYC granted successfully'
    };
  }

  @Post('kyc/revoke')
  @ApiOperation({ summary: 'Revoke KYC status for account on token' })
  @ApiBody({ type: KYCRequestDto })
  @ApiResponse({ status: 200, description: 'KYC revoked successfully' })
  async revokeKYC(@Body() kycRequest: KYCRequestDto) {
    const transactionId = await this.hederaService.revokeKYC(kycRequest);
    return {
      success: true,
      data: { transactionId },
      message: 'KYC revoked successfully'
    };
  }


  // Freeze Management Endpoints
  @Post('freeze')
  @ApiOperation({ summary: 'Freeze account for token' })
  @ApiBody({ type: FreezeRequestDto })
  @ApiResponse({ status: 200, description: 'Account frozen successfully' })
  async freezeAccount(@Body() freezeRequest: FreezeRequestDto) {
    const transactionId = await this.hederaService.freezeAccount(freezeRequest);
    return {
      success: true,
      data: { transactionId },
      message: 'Account frozen successfully'
    };
  }

  @Post('unfreeze')
  @ApiOperation({ summary: 'Unfreeze account for token' })
  @ApiBody({ type: FreezeRequestDto })
  @ApiResponse({ status: 200, description: 'Account unfrozen successfully' })
  async unfreezeAccount(@Body() freezeRequest: FreezeRequestDto) {
    const transactionId = await this.hederaService.unfreezeAccount(freezeRequest);
    return {
      success: true,
      data: { transactionId },
      message: 'Account unfrozen successfully'
    };
  }

  @Post('freeze/token')
  @ApiOperation({ summary: 'Freeze or unfreeze token' })
  @ApiBody({ type: FreezeRequestDto })
  @ApiResponse({ status: 200, description: 'Token freeze status updated successfully' })
  async freezeToken(@Body() freezeRequest: FreezeRequestDto) {
    const transactionId = await this.hederaService.freezeToken(freezeRequest);
    return {
      success: true,
      data: { transactionId },
      message: `Token ${freezeRequest.freezeStatus === 'FREEZE' ? 'frozen' : 'unfrozen'} successfully`
    };
  }

  // Token Association Endpoints
  @Post('associate')
  @ApiOperation({ summary: 'Associate token with account' })
  @ApiBody({ type: TokenAssociationRequestDto })
  @ApiResponse({ status: 200, description: 'Token associated successfully' })
  async associateToken(@Body() associationRequest: TokenAssociationRequestDto) {
    const transactionId = await this.hederaService.associateToken(associationRequest);
    return {
      success: true,
      data: { transactionId },
      message: 'Token associated successfully'
    };
  }

  @Post('dissociate')
  @ApiOperation({ summary: 'Dissociate token from account' })
  @ApiBody({ type: TokenAssociationRequestDto })
  @ApiResponse({ status: 200, description: 'Token dissociated successfully' })
  async dissociateToken(@Body() associationRequest: TokenAssociationRequestDto) {
    const transactionId = await this.hederaService.dissociateToken(associationRequest);
    return {
      success: true,
      data: { transactionId },
      message: 'Token dissociated successfully'
    };
  }

  // Token Information Endpoints
  @Get('token-info/:tokenId')
  @ApiOperation({ summary: 'Get token information' })
  @ApiResponse({ status: 200, description: 'Token information retrieved' })
  async getTokenInfo(@Param('tokenId') tokenId: string) {
    const tokenInfo = await this.hederaService.getTokenInfo(tokenId);
    return {
      success: true,
      data: tokenInfo,
      message: 'Token information retrieved'
    };
  }

  @Get('account-info/:accountId')
  @ApiOperation({ summary: 'Get account information' })
  @ApiResponse({ status: 200, description: 'Account information retrieved' })
  async getAccountInfo(@Param('accountId') accountId: string) {
    const accountInfo = await this.hederaService.getAccountInfo(accountId);
    return {
      success: true,
      data: accountInfo,
      message: 'Account information retrieved'
    };
  }

  // Compliance Workflow Endpoints
  @Post('compliance/kyc-workflow')
  @ApiOperation({ summary: 'Complete KYC workflow (associate + grant/revoke KYC)' })
  @ApiResponse({ status: 200, description: 'KYC workflow completed' })
  async completeKYCWorkflow(@Body() body: {
    accountId: string;
    tokenId: string;
    kycStatus: 'GRANT' | 'REVOKE';
  }) {
    const result = await this.hederaService.completeKYCWorkflow(
      body.accountId,
      body.tokenId,
      body.kycStatus
    );
    return {
      success: true,
      data: result,
      message: 'KYC workflow completed successfully'
    };
  }

  @Post('compliance/freeze-workflow')
  @ApiOperation({ summary: 'Complete freeze workflow (freeze/unfreeze account)' })
  @ApiResponse({ status: 200, description: 'Freeze workflow completed' })
  async completeFreezeWorkflow(@Body() body: {
    accountId: string;
    tokenId: string;
    freezeStatus: 'FREEZE' | 'UNFREEZE';
  }) {
    const result = await this.hederaService.completeFreezeWorkflow(
      body.accountId,
      body.tokenId,
      body.freezeStatus
    );
    return {
      success: true,
      data: result,
      message: 'Freeze workflow completed successfully'
    };
  }

  // TRUST Token Management Endpoints
  @Post('trust-token/initialize')
  @ApiOperation({ summary: 'Initialize TRUST token on Hedera' })
  @ApiResponse({ status: 201, description: 'TRUST token initialized successfully' })
  async initializeTrustToken() {
    const tokenId = await this.trustTokenService.initializeTrustToken();
    return {
      success: true,
      data: { tokenId },
      message: 'TRUST token initialized successfully'
    };
  }

  @Post('trust-token/mint')
  @ApiOperation({ summary: 'Mint TRUST tokens to an account' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        toAccountId: { type: 'string', example: '0.0.1234567' },
        amount: { type: 'number', example: 1000 }
      },
      required: ['toAccountId', 'amount']
    }
  })
  @ApiResponse({ status: 201, description: 'TRUST tokens minted successfully' })
  async mintTrustTokens(@Body() body: { toAccountId: string; amount: number }) {
    const transactionId = await this.trustTokenService.mintTrustTokens(body.toAccountId, body.amount);
    return {
      success: true,
      data: { transactionId },
      message: `${body.amount} TRUST tokens minted to ${body.toAccountId}`
    };
  }

  @Get('trust-token/balance/:accountId')
  @ApiOperation({ summary: 'Get TRUST token balance for an account' })
  @ApiResponse({ status: 200, description: 'TRUST token balance retrieved' })
  async getTrustTokenBalance(@Param('accountId') accountId: string) {
    const balance = await this.trustTokenService.getTrustTokenBalance(accountId);
    return {
      success: true,
      data: { balance },
      message: `TRUST token balance for ${accountId}: ${balance}`
    };
  }

  @Get('trust-token/info')
  @ApiOperation({ summary: 'Get TRUST token information' })
  @ApiResponse({ status: 200, description: 'TRUST token information retrieved' })
  async getTrustTokenInfo() {
    const tokenId = this.trustTokenService.getTrustTokenId();
    return {
      success: true,
      data: { tokenId },
      message: tokenId ? `TRUST token ID: ${tokenId}` : 'TRUST token not initialized'
    };
  }

  // HSCS Contract Endpoints

  @Post('trust-token/exchange')
  @ApiOperation({ summary: 'Exchange HBAR for TRUST tokens via HSCS contract' })
  @ApiResponse({ status: 200, description: 'Exchange successful' })
  async exchangeHbarForTrust(@Body() exchangeRequest: any) {
    try {
      const result = await this.hscsContractService.exchangeHbarForTrust(
        exchangeRequest.accountId,
        exchangeRequest.hbarAmount,
        exchangeRequest.treasuryAccountId,
        exchangeRequest.operationsAccountId,
        exchangeRequest.stakingAccountId
      );
      return {
        success: true,
        data: result,
        message: 'HBAR exchanged for TRUST tokens successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to exchange HBAR for TRUST tokens'
      };
    }
  }

  @Post('trust-token/burn')
  @ApiOperation({ summary: 'Burn TRUST tokens via HSCS contract' })
  @ApiResponse({ status: 200, description: 'Burn successful' })
  async burnTrustTokens(@Body() burnRequest: any) {
    try {
      const transactionId = await this.hscsContractService.burnTrustTokens(
        burnRequest.accountId,
        burnRequest.amount,
        burnRequest.reason || 'NFT_CREATION'
      );
      return {
        success: true,
        data: { transactionId },
        message: 'TRUST tokens burned successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to burn TRUST tokens'
      };
    }
  }

  @Get('trust-token/exchange-info')
  @ApiOperation({ summary: 'Get exchange information from HSCS contract' })
  @ApiResponse({ status: 200, description: 'Exchange information' })
  async getExchangeInfo() {
    try {
      const info = await this.hscsContractService.getExchangeInfo();
      return {
        success: true,
        data: info,
        message: 'Exchange information retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get exchange information'
      };
    }
  }

  @Post('trust-token/calculate-fee')
  @ApiOperation({ summary: 'Calculate NFT creation fee via HSCS contract' })
  @ApiResponse({ status: 200, description: 'Fee calculated' })
  async calculateNftCreationFee(@Body() feeRequest: any) {
    try {
      const fee = await this.hscsContractService.calculateNftCreationFee(
        feeRequest.verificationLevel,
        feeRequest.rarity
      );
      return {
        success: true,
        data: { fee },
        message: 'NFT creation fee calculated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate NFT creation fee'
      };
    }
  }

  @Post('trust-token/stake')
  @ApiOperation({ summary: 'Stake TRUST tokens via HSCS contract' })
  @ApiResponse({ status: 200, description: 'Staking successful' })
  async stakeTrustTokens(@Body() stakeRequest: any) {
    try {
      const transactionId = await this.hscsContractService.stakeTrustTokens(
        stakeRequest.accountId,
        stakeRequest.amount,
        stakeRequest.duration
      );
      return {
        success: true,
        data: { transactionId },
        message: 'TRUST tokens staked successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to stake TRUST tokens'
      };
    }
  }

  // HSCS Hybrid Endpoints (HSCS + HTS)

  @Post('trust-token/hybrid/exchange')
  @ApiOperation({ summary: 'Exchange HBAR for TRUST tokens using hybrid HSCS + HTS approach' })
  @ApiResponse({ status: 200, description: 'Exchange successful' })
  async hybridExchangeHbarForTrust(@Body() exchangeRequest: any) {
    try {
      const result = await this.hscsHybridService.exchangeHbarForTrust(
        exchangeRequest.accountId,
        exchangeRequest.hbarAmount,
        exchangeRequest.treasuryAccountId,
        exchangeRequest.operationsAccountId,
        exchangeRequest.stakingAccountId,
        exchangeRequest.fromAccountPrivateKey // Optional private key for signing
      );
      return {
        success: true,
        data: result,
        message: 'HBAR exchanged for TRUST tokens successfully via hybrid approach'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to exchange HBAR for TRUST tokens via hybrid approach'
      };
    }
  }

  @Post('trust-token/hybrid/burn')
  @ApiOperation({ summary: 'Burn TRUST tokens using hybrid HSCS + HTS approach' })
  @ApiResponse({ status: 200, description: 'Burn successful' })
  async hybridBurnTrustTokens(@Body() burnRequest: any) {
    try {
      const transactionId = await this.hscsHybridService.burnTrustTokens(
        burnRequest.accountId,
        burnRequest.amount,
        burnRequest.reason || 'NFT_CREATION',
        burnRequest.fromAccountPrivateKey // Optional private key for signing
      );
      return {
        success: true,
        data: { transactionId },
        message: 'TRUST tokens burned successfully via hybrid approach'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to burn TRUST tokens via hybrid approach'
      };
    }
  }

  @Post('trust-token/hybrid/calculate-fee')
  @ApiOperation({ summary: 'Calculate NFT creation fee using hybrid HSCS + HTS approach' })
  @ApiResponse({ status: 200, description: 'Fee calculated' })
  async hybridCalculateNftCreationFee(@Body() feeRequest: any) {
    try {
      const fee = await this.hscsHybridService.calculateNftCreationFee(
        feeRequest.verificationLevel,
        feeRequest.rarity
      );
      return {
        success: true,
        data: { fee },
        message: 'NFT creation fee calculated successfully via hybrid approach'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to calculate NFT creation fee via hybrid approach'
      };
    }
  }

  @Get('trust-token/hybrid/balance/:accountId')
  @ApiOperation({ summary: 'Get TRUST token balance using hybrid HSCS + HTS approach' })
  @ApiResponse({ status: 200, description: 'Balance retrieved' })
  async hybridGetTrustTokenBalance(@Param('accountId') accountId: string) {
    try {
      const balance = await this.hscsHybridService.getTrustTokenBalance(accountId);
      return {
        success: true,
        data: { balance },
        message: 'TRUST token balance retrieved successfully via hybrid approach'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get TRUST token balance via hybrid approach'
      };
    }
  }

  @Post('trust-token/hybrid/stake')
  @ApiOperation({ summary: 'Stake TRUST tokens using hybrid HSCS + HTS approach' })
  @ApiResponse({ status: 200, description: 'Staking successful' })
  async hybridStakeTrustTokens(@Body() stakeRequest: any) {
    try {
      const transactionId = await this.hscsHybridService.stakeTrustTokens(
        stakeRequest.accountId,
        stakeRequest.amount,
        stakeRequest.duration
      );
      return {
        success: true,
        data: { transactionId },
        message: 'TRUST tokens staked successfully via hybrid approach'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to stake TRUST tokens via hybrid approach'
      };
    }
  }


  // ============ Marketplace Endpoints ============

  @Post('marketplace/list')
  @ApiOperation({ summary: 'List NFT on marketplace' })
  @ApiResponse({ status: 200, description: 'NFT listed successfully' })
  async marketplaceListNFT(@Body() listingData: {
    nftTokenId: string;
    serialNumber: number;
    price: number;
    sellerAccountId: string;
  }) {
    try {
      const result = await this.marketplaceService.listNFT(
        listingData.nftTokenId,
        listingData.serialNumber,
        listingData.price,
        listingData.sellerAccountId
      );
      
      return {
        success: true,
        data: result,
        message: 'NFT listed on marketplace successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to list NFT on marketplace'
      };
    }
  }

  @Post('marketplace/buy/:listingId')
  @ApiOperation({ summary: 'Buy NFT from marketplace' })
  @ApiResponse({ status: 200, description: 'NFT purchased successfully' })
  async marketplaceBuyNFT(
    @Param('listingId') listingId: number,
    @Body() buyData: {
      buyerAccountId: string;
      buyerPrivateKey?: string;
    }
  ) {
    try {
      const result = await this.marketplaceService.buyNFT(
        listingId,
        buyData.buyerAccountId,
        buyData.buyerPrivateKey
      );
      
      return {
        success: true,
        data: result,
        message: 'NFT purchased successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to buy NFT'
      };
    }
  }

  @Post('marketplace/cancel/:listingId')
  @ApiOperation({ summary: 'Cancel marketplace listing' })
  @ApiResponse({ status: 200, description: 'Listing cancelled successfully' })
  async marketplaceCancelListing(@Param('listingId') listingId: number) {
    try {
      const result = await this.marketplaceService.cancelListing(listingId);
      
      return {
        success: true,
        data: result,
        message: 'Listing cancelled successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to cancel listing'
      };
    }
  }

  @Post('marketplace/update-price')
  @ApiOperation({ summary: 'Update marketplace listing price' })
  @ApiResponse({ status: 200, description: 'Price updated successfully' })
  async marketplaceUpdatePrice(@Body() priceData: {
    listingId: number;
    newPrice: number;
  }) {
    try {
      const result = await this.marketplaceService.updatePrice(
        priceData.listingId,
        priceData.newPrice
      );
      
      return {
        success: true,
        data: result,
        message: 'Listing price updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to update listing price'
      };
    }
  }

  @Get('marketplace/listing/:listingId')
  @ApiOperation({ summary: 'Get marketplace listing details' })
  @ApiResponse({ status: 200, description: 'Listing details retrieved' })
  async marketplaceGetListing(@Param('listingId') listingId: number) {
    try {
      const result = await this.marketplaceService.getListing(listingId);
      
      return {
        success: true,
        data: result,
        message: 'Listing details retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get listing details'
      };
    }
  }

  @Get('marketplace/check-listing/:nftTokenId/:serialNumber')
  @ApiOperation({ summary: 'Check if NFT is listed' })
  @ApiResponse({ status: 200, description: 'NFT listing status checked' })
  async marketplaceCheckListing(
    @Param('nftTokenId') nftTokenId: string,
    @Param('serialNumber') serialNumber: number
  ) {
    try {
      const result = await this.marketplaceService.isNFTListed(nftTokenId, serialNumber);
      
      return {
        success: true,
        data: result,
        message: 'NFT listing status retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to check NFT listing status'
      };
    }
  }

  @Get('marketplace/config')
  @ApiOperation({ summary: 'Get marketplace configuration' })
  @ApiResponse({ status: 200, description: 'Marketplace config retrieved' })
  async marketplaceGetConfig() {
    try {
      const result = await this.marketplaceService.getMarketplaceConfig();
      
      return {
        success: true,
        data: result,
        message: 'Marketplace configuration retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get marketplace configuration'
      };
    }
  }

  @Post('marketplace/transfer-nft')
  @ApiOperation({ summary: 'Transfer NFT from marketplace escrow to buyer' })
  @ApiResponse({ status: 200, description: 'NFT transferred successfully' })
  async marketplaceTransferNFT(@Body() transferData: {
    nftTokenId: string;
    serialNumber: number;
    buyerAccountId: string;
    listingId: number;
  }) {
    try {
      const result = await this.marketplaceService.transferNFTFromEscrow(
        transferData.nftTokenId,
        transferData.serialNumber,
        transferData.buyerAccountId
      );
      
      return {
        success: true,
        data: result,
        message: 'NFT transferred from marketplace escrow to buyer'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to transfer NFT from escrow'
      };
    }
  }

  @Post('marketplace/return-nft')
  @ApiOperation({ summary: 'Return NFT from marketplace escrow to seller (unlist)' })
  @ApiResponse({ status: 200, description: 'NFT returned successfully' })
  async marketplaceReturnNFT(@Body() returnData: {
    nftTokenId: string;
    serialNumber: number;
    sellerAccountId: string;
  }) {
    try {
      const result = await this.marketplaceService.transferNFTFromEscrow(
        returnData.nftTokenId,
        returnData.serialNumber,
        returnData.sellerAccountId
      );
      
      return {
        success: true,
        data: result,
        message: 'NFT returned from marketplace escrow to seller'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to return NFT from escrow'
      };
    }
  }

  // ============ HCS Endpoints ============

  @Post('hcs/marketplace/event')
  @ApiOperation({ summary: 'Submit marketplace event to HCS (immutable audit trail)' })
  @ApiResponse({ status: 200, description: 'Event submitted successfully' })
  async submitMarketplaceEvent(@Body() event: any) {
    try {
      const transactionId = await this.hcsService.submitMarketplaceEvent(event);
      return {
        success: true,
        data: {
          transactionId,
          topicId: this.hcsService.getMarketplaceTopicId(),
        },
        message: 'Marketplace event submitted to HCS'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to submit marketplace event'
      };
    }
  }

  @Get('hcs/marketplace/events')
  @ApiOperation({ summary: 'Query marketplace events from HCS' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  async getMarketplaceEvents(
    @Param('limit') limit?: number,
    @Param('assetTokenId') assetTokenId?: string
  ) {
    try {
      const events = await this.hcsService.queryMarketplaceEvents(limit || 100, assetTokenId);
      return {
        success: true,
        data: {
          events,
          topicId: this.hcsService.getMarketplaceTopicId(),
          count: events.length,
        },
        message: 'Marketplace events retrieved from HCS'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to query marketplace events'
      };
    }
  }

  @Get('hcs/marketplace/events/:assetTokenId')
  @ApiOperation({ summary: 'Query marketplace events for specific asset from HCS' })
  @ApiResponse({ status: 200, description: 'Asset events retrieved successfully' })
  async getAssetEvents(@Param('assetTokenId') assetTokenId: string) {
    try {
      const events = await this.hcsService.queryMarketplaceEvents(1000, assetTokenId);
      return {
        success: true,
        data: {
          events,
          assetTokenId,
          count: events.length,
        },
        message: `Retrieved ${events.length} events for asset ${assetTokenId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to query asset events'
      };
    }
  }

  @Post('hcs/offers/message')
  @ApiOperation({ summary: 'Submit offer message to HCS (decentralized communication)' })
  @ApiResponse({ status: 200, description: 'Message submitted successfully' })
  async submitOfferMessage(@Body() message: any) {
    try {
      const transactionId = await this.hcsService.submitOfferMessage(message);
      return {
        success: true,
        data: {
          transactionId,
          topicId: this.hcsService.getOfferTopicId(),
        },
        message: 'Offer message submitted to HCS'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to submit offer message'
      };
    }
  }

  @Get('hcs/offers/messages/:assetTokenId')
  @ApiOperation({ summary: 'Query offer messages for specific asset from HCS' })
  @ApiResponse({ status: 200, description: 'Offer messages retrieved successfully' })
  async getOfferMessages(@Param('assetTokenId') assetTokenId: string) {
    try {
      const messages = await this.hcsService.queryOfferMessages(assetTokenId);
      return {
        success: true,
        data: {
          messages,
          assetTokenId,
          count: messages.length,
        },
        message: `Retrieved ${messages.length} offer messages for asset ${assetTokenId}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to query offer messages'
      };
    }
  }

  @Get('hcs/topics/info')
  @ApiOperation({ summary: 'Get HCS topic information' })
  @ApiResponse({ status: 200, description: 'Topic info retrieved successfully' })
  async getTopicsInfo() {
    try {
      const marketplaceTopicId = this.hcsService.getMarketplaceTopicId();
      const offerTopicId = this.hcsService.getOfferTopicId();

      const marketplaceInfo = marketplaceTopicId 
        ? await this.hcsService.getTopicInfo(marketplaceTopicId)
        : null;
      
      const offerInfo = offerTopicId
        ? await this.hcsService.getTopicInfo(offerTopicId)
        : null;

      return {
        success: true,
        data: {
          marketplaceTopic: marketplaceInfo,
          offerTopic: offerInfo,
        },
        message: 'HCS topic information retrieved'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get topic information'
      };
    }
  }

  // ============ TrustBridge HCS RWA Asset Endpoints ============

  @Post('rwa/create-with-hcs')
  @ApiOperation({ summary: 'Create RWA asset with HCS submission for AMC approval' })
  @ApiResponse({ status: 201, description: 'RWA asset created and submitted for approval' })
  async createRWAAssetWithHCS(@Body() assetData: {
    nftTokenId: string;
    creator: string;
    name: string;
    type: string;
    assetType: string;
    category: string;
    totalValue: number;
    expectedAPY: number;
    maturityDate: string;
    location: string;
    description: string;
    metadataCid: string;
    displayImage: string;
    documentUrls: string[];
    compressedHash: string;
  }) {
    try {
      // Create HCS message for TrustBridge topic
      const hcsMessage = {
        type: 'TRUSTBRIDGE_ASSET_CREATED',
        rwaTokenId: assetData.nftTokenId,
        creator: assetData.creator,
        timestamp: new Date().toISOString(),
        status: 'SUBMITTED_FOR_APPROVAL',
        assetData: {
          name: assetData.name,
          type: assetData.type,
          assetType: assetData.assetType,
          category: assetData.category,
          totalValue: assetData.totalValue,
          expectedAPY: assetData.expectedAPY,
          maturityDate: assetData.maturityDate,
          location: assetData.location,
          description: assetData.description,
          metadataCid: assetData.metadataCid,
          displayImage: assetData.displayImage,
          documentUrls: assetData.documentUrls,
          compressedHash: assetData.compressedHash
        }
      };
      
      // Submit to TrustBridge HCS topic
      const transactionId = await this.hederaService.submitToTrustBridgeTopic(hcsMessage);
      
      return {
        success: true,
        data: { 
          nftTokenId: assetData.nftTokenId,
          hcsTransactionId: transactionId,
          topicId: '0.0.7102808'
        },
        message: 'RWA asset registered in HCS for AMC approval'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to register RWA asset in HCS'
      };
    }
  }

  @Get('rwa/trustbridge-assets')
  @ApiOperation({ summary: 'Get all TrustBridge RWA assets from HCS topic' })
  @ApiResponse({ status: 200, description: 'TrustBridge RWA assets retrieved' })
  async getTrustBridgeRWAAssets() {
    try {
      console.log('🔧 Getting TrustBridge RWA assets...');
      const messages = await this.hederaService.getTrustBridgeTopicMessages();
      console.log('🔧 Total messages retrieved:', messages.length);
      
      // Filter for asset creation messages
      const assetMessages = messages.filter(msg => msg.type === 'TRUSTBRIDGE_ASSET_CREATED');
      console.log('🔧 Asset creation messages found:', assetMessages.length);
      
      // Get status update messages
      const statusMessages = messages.filter(msg => msg.type === 'TRUSTBRIDGE_ASSET_STATUS_UPDATE');
      console.log('🔧 Status update messages found:', statusMessages.length);
      
      // Create a map of current statuses
      const currentStatuses = new Map();
      statusMessages.forEach(statusMsg => {
        currentStatuses.set(statusMsg.rwaTokenId, statusMsg.status);
      });
      
      // Update asset statuses with current status from HCS
      const assetsWithStatus = assetMessages.map(asset => ({
        ...asset,
        status: currentStatuses.get(asset.rwaTokenId) || asset.status
      }));
      
      // Debug: Log displayImage values
      assetsWithStatus.forEach((asset, index) => {
        console.log(`🔍 Asset ${index + 1} - displayImage:`, asset.assetData?.displayImage);
      });
      
      console.log('🔧 Assets with updated statuses:', assetsWithStatus.length);
      
      return {
        success: true,
        data: {
          assets: assetsWithStatus,
          count: assetsWithStatus.length,
          totalMessages: messages.length
        },
        message: 'TrustBridge RWA assets retrieved from HCS topic'
      };
    } catch (error) {
      console.error('❌ Error in getTrustBridgeRWAAssets:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get TrustBridge RWA assets'
      };
    }
  }

  @Post('rwa/update-status')
  @ApiOperation({ summary: 'Update RWA asset status in HCS topic' })
  @ApiResponse({ status: 200, description: 'Asset status updated successfully' })
  async updateRWAAssetStatus(@Body() statusData: {
    tokenId: string;
    status: string;
    adminAddress: string;
    notes?: string;
  }) {
    try {
      await this.hederaService.updateRWAAssetStatus(
        statusData.tokenId,
        statusData.status,
        statusData.adminAddress,
        statusData.notes
      );
      
      return {
        success: true,
        data: {
          tokenId: statusData.tokenId,
          status: statusData.status,
          adminAddress: statusData.adminAddress,
          timestamp: Date.now()
        },
        message: 'RWA asset status updated in HCS topic'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to update RWA asset status'
      };
    }
  }

  @Get('rwa/topic-info')
  @ApiOperation({ summary: 'Get TrustBridge HCS topic information' })
  @ApiResponse({ status: 200, description: 'Topic information retrieved' })
  async getTrustBridgeTopicInfo() {
    try {
      const topicId = await this.hederaService.createOrGetTrustBridgeTopic();
      return {
        success: true,
        data: { topicId },
        message: 'TrustBridge HCS topic information retrieved'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get TrustBridge topic information'
      };
    }
  }
}
