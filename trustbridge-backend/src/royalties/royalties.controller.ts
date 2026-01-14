import { Controller, Get, Post, Body, Param, Query, HttpStatus, HttpException } from '@nestjs/common';
import { RoyaltiesService } from './royalties.service';

@Controller('royalties')
export class RoyaltiesController {
  constructor(private readonly royaltiesService: RoyaltiesService) {}

  /**
   * Record a royalty payment
   * POST /royalties
   */
  @Post()
  async recordPayment(@Body() body: any) {
    try {
      const payment = await this.royaltiesService.recordRoyaltyPayment({
        transactionId: body.transactionId,
        nftContract: body.nftContract,
        tokenId: body.tokenId,
        salePrice: body.salePrice,
        royaltyAmount: body.royaltyAmount,
        royaltyPercentage: body.royaltyPercentage,
        creator: body.creator,
        seller: body.seller,
        buyer: body.buyer,
      });

      return {
        success: true,
        data: payment,
        message: 'Royalty payment recorded',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to record royalty payment',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get creator royalty payments
   * GET /royalties/creator/:address
   */
  @Get('creator/:address')
  async getCreatorPayments(
    @Param('address') address: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const options: any = {};
      
      if (limit) options.limit = parseInt(limit);
      if (skip) options.skip = parseInt(skip);
      if (startDate) options.startDate = new Date(startDate);
      if (endDate) options.endDate = new Date(endDate);

      const result = await this.royaltiesService.getCreatorRoyaltyPayments(address, options);

      return {
        success: true,
        data: result.payments,
        total: result.total,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch royalty payments',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get creator stats
   * GET /royalties/creator/:address/stats
   */
  @Get('creator/:address/stats')
  async getCreatorStats(@Param('address') address: string) {
    try {
      const stats = await this.royaltiesService.getCreatorStats(address);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch creator stats',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get monthly earnings
   * GET /royalties/creator/:address/monthly
   */
  @Get('creator/:address/monthly')
  async getMonthlyEarnings(
    @Param('address') address: string,
    @Query('months') months?: string,
  ) {
    try {
      const monthCount = months ? parseInt(months) : 12;
      const earnings = await this.royaltiesService.getMonthlyEarnings(address, monthCount);

      return {
        success: true,
        data: earnings,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch monthly earnings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get NFT royalty history
   * GET /royalties/nft/:contract/:tokenId
   */
  @Get('nft/:contract/:tokenId')
  async getNFTRoyaltyHistory(
    @Param('contract') contract: string,
    @Param('tokenId') tokenId: string,
  ) {
    try {
      const history = await this.royaltiesService.getNFTRoyaltyHistory(contract, tokenId);

      return {
        success: true,
        data: history,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch NFT royalty history',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get top earning creators
   * GET /royalties/top
   */
  @Get('top')
  async getTopCreators(@Query('limit') limit?: string) {
    try {
      const limitNum = limit ? parseInt(limit) : 10;
      const creators = await this.royaltiesService.getTopCreators(limitNum);

      return {
        success: true,
        data: creators,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch top creators',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

