import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, HttpStatus, HttpException } from '@nestjs/common';
import { CollectionsService } from './collections.service';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /**
   * Create a new collection
   * POST /collections
   */
  @Post()
  async createCollection(@Body() body: any, @Request() req: any) {
    try {
      const collection = await this.collectionsService.createCollection({
        name: body.name,
        description: body.description,
        symbol: body.symbol,
        creator: body.creator || req.user?.accountId,
        bannerImage: body.bannerImage,
        profileImage: body.profileImage,
        category: body.category,
        royaltyPercentage: body.royaltyPercentage,
        socialLinks: body.socialLinks,
      });

      return {
        success: true,
        data: collection,
        message: 'Collection created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create collection',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get collection by ID
   * GET /collections/:id
   */
  @Get(':id')
  async getCollection(@Param('id') id: string) {
    try {
      const collection = await this.collectionsService.getCollection(id);

      if (!collection) {
        throw new HttpException(
          {
            success: false,
            message: 'Collection not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: collection,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch collection',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all collections with filters
   * GET /collections?creator=0.0.123&verified=true&sortBy=volume
   */
  @Get()
  async getCollections(
    @Query('creator') creator?: string,
    @Query('verified') verified?: string,
    @Query('category') category?: string,
    @Query('sortBy') sortBy?: 'volume' | 'floor' | 'items' | 'created',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    try {
      const filters: any = {};
      
      if (creator) filters.creator = creator;
      if (verified !== undefined) filters.verified = verified === 'true';
      if (category) filters.category = category;
      if (sortBy) filters.sortBy = sortBy;
      if (sortOrder) filters.sortOrder = sortOrder;
      if (limit) filters.limit = parseInt(limit);
      if (skip) filters.skip = parseInt(skip);

      const result = await this.collectionsService.getCollections(filters);

      return {
        success: true,
        data: result.collections,
        total: result.total,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch collections',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Add NFT to collection
   * POST /collections/:id/nfts
   */
  @Post(':id/nfts')
  async addNFTToCollection(
    @Param('id') collectionId: string,
    @Body() body: { tokenId: string },
  ) {
    try {
      const collection = await this.collectionsService.addNFTToCollection(
        collectionId,
        body.tokenId,
      );

      if (!collection) {
        throw new HttpException(
          {
            success: false,
            message: 'Collection not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: collection,
        message: 'NFT added to collection',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to add NFT to collection',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update collection stats
   * PUT /collections/:id/stats
   */
  @Put(':id/stats')
  async updateCollectionStats(
    @Param('id') collectionId: string,
    @Body() stats: any,
  ) {
    try {
      const collection = await this.collectionsService.updateCollectionStats(
        collectionId,
        stats,
      );

      if (!collection) {
        throw new HttpException(
          {
            success: false,
            message: 'Collection not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: collection,
        message: 'Collection stats updated',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update collection stats',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search collections
   * GET /collections/search?q=bored+apes
   */
  @Get('search/query')
  async searchCollections(@Query('q') query: string, @Query('limit') limit?: string) {
    try {
      const collections = await this.collectionsService.searchCollections(
        query,
        limit ? parseInt(limit) : 20,
      );

      return {
        success: true,
        data: collections,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to search collections',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get trending collections
   * GET /collections/trending
   */
  @Get('trending/list')
  async getTrendingCollections(@Query('limit') limit?: string) {
    try {
      const collections = await this.collectionsService.getTrendingCollections(
        limit ? parseInt(limit) : 10,
      );

      return {
        success: true,
        data: collections,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch trending collections',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get collections by creator
   * GET /collections/creator/:address
   */
  @Get('creator/:address')
  async getCollectionsByCreator(@Param('address') address: string) {
    try {
      const collections = await this.collectionsService.getCollectionsByCreator(address);

      return {
        success: true,
        data: collections,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch collections by creator',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

