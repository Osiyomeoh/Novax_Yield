import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  async getHealth() {
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
