import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';

@Injectable()
export class KeepAliveService implements OnModuleInit {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly baseUrl: string;

  constructor() {
    // Get the base URL from environment variable
    this.baseUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:4001';
  }

  async onModuleInit() {
    this.logger.log(`Keep-alive service initialized. Base URL: ${this.baseUrl}`);
    // Wait a bit for the server to be fully ready, then ping
    setTimeout(() => {
      this.pingHealthEndpoint();
    }, 10000); // Wait 10 seconds after module init
  }

  @Cron('*/5 * * * *') // Every 5 minutes
  async handleCron() {
    await this.pingHealthEndpoint();
  }

  private async pingHealthEndpoint() {
    try {
      const healthUrl = `${this.baseUrl}/api/health`;
      this.logger.debug(`Pinging health endpoint: ${healthUrl}`);
      
      const response = await axios.get(healthUrl, {
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status < 500, // Accept any status < 500
      });

      if (response.status === 200) {
        this.logger.log(`✅ Keep-alive ping successful - Server is healthy`);
      } else {
        this.logger.warn(`⚠️ Keep-alive ping returned status ${response.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `❌ Keep-alive ping failed: ${error.message}${error.response ? ` (Status: ${error.response.status})` : ''}`
        );
      } else {
        this.logger.error(`❌ Keep-alive ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
}

