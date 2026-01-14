import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { AITrainingService } from './ai-training.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
  ],
  controllers: [AIController],
  providers: [AIService, AITrainingService],
  exports: [AIService, AITrainingService],
})
export class AIModule {}
