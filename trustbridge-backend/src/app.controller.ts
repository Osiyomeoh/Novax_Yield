import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      success: true,
      message: 'TrustBridge API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        api: '/api',
        docs: '/api-docs',
        health: '/api/health',
        graphql: '/graphql'
      }
    };
  }

  @Get('api/health')
  getHealth() {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: true,
          blockchain: true,
          api: true,
          mobile: true
        }
      },
      message: 'API is healthy'
    };
  }
}
