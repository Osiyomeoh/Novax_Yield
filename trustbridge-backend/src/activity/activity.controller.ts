import { Controller, Get, Param, Query, HttpStatus, HttpException } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * Get activity for a specific NFT
   * GET /activity/nft/:tokenId/:serialNumber
   */
  @Get('nft/:tokenId/:serialNumber')
  async getNFTActivity(
    @Param('tokenId') tokenId: string,
    @Param('serialNumber') serialNumber: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit) : 50;
      const activities = await this.activityService.getNFTActivity(tokenId, serialNumber, limitNum);

      return {
        success: true,
        data: activities,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch NFT activity',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get activity for a user
   * GET /activity/user/:accountId
   */
  @Get('user/:accountId')
  async getUserActivity(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit) : 100;
      const activities = await this.activityService.getUserActivity(accountId, limitNum);

      return {
        success: true,
        data: activities,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch user activity',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get marketplace activity
   * GET /activity/marketplace/:accountId
   */
  @Get('marketplace/:accountId')
  async getMarketplaceActivity(
    @Param('accountId') accountId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit) : 50;
      const activities = await this.activityService.getMarketplaceActivity(accountId, limitNum);

      return {
        success: true,
        data: activities,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch marketplace activity',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get collection activity
   * GET /activity/collection/:tokenId
   */
  @Get('collection/:tokenId')
  async getCollectionActivity(
    @Param('tokenId') tokenId: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const limitNum = limit ? parseInt(limit) : 50;
      const activities = await this.activityService.getCollectionActivity(tokenId, limitNum);

      return {
        success: true,
        data: activities,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch collection activity',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get price history for an NFT
   * GET /activity/nft/:tokenId/:serialNumber/price-history
   */
  @Get('nft/:tokenId/:serialNumber/price-history')
  async getNFTPriceHistory(
    @Param('tokenId') tokenId: string,
    @Param('serialNumber') serialNumber: string,
  ) {
    try {
      const priceHistory = await this.activityService.getNFTPriceHistory(tokenId, serialNumber);

      return {
        success: true,
        data: priceHistory,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch price history',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

