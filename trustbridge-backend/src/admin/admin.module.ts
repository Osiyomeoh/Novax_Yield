import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { NovaxModule } from '../novax/novax.module';
import { Asset, AssetSchema } from '../schemas/asset.schema';

@Module({
  imports: [
    AuthModule,
    NovaxModule, // Import NovaxModule to use NovaxService
    JwtModule.register({}), // Add JWT module for JwtService
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
    ]),
  ],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}