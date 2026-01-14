import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNumber, IsDateString, IsOptional, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetType } from '../../schemas/asset.schema';

export class LocationDto {
  @ApiProperty({ example: 'Kenya' })
  @IsString()
  country: string;

  @ApiProperty({ example: 'Kiambu' })
  @IsString()
  region: string;

  @ApiProperty({ example: { lat: -1.2921, lng: 36.8219 }, required: false })
  @IsOptional()
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export class CreateAssetDto {
  @ApiProperty({ example: '0.0.1234567' })
  @IsString()
  owner: string;

  @ApiProperty({ enum: AssetType, example: AssetType.AGRICULTURAL })
  @IsEnum(AssetType)
  type: AssetType;

  @ApiProperty({ example: 'Coffee Harvest Q1/2026' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Premium Arabica coffee from Kiambu region', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(1000)
  totalValue: number;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  @Min(1)
  tokenSupply: number;

  @ApiProperty({ example: '2026-03-31T00:00:00Z' })
  @IsDateString()
  maturityDate: string;

  @ApiProperty({ example: 20.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  expectedAPY: number;

  @ApiProperty({ example: { crop: 'Arabica', size: '5 hectares' }, required: false })
  @IsOptional()
  metadata?: any;

  // Hedera Integration Fields
  @ApiProperty({ example: '0.0.1234567', description: 'HTS Token ID for the asset NFT', required: false })
  @IsOptional()
  @IsString()
  tokenId?: string;

  @ApiProperty({ example: '0.0.1234567', description: 'HFS File ID for asset metadata', required: false })
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiProperty({ example: '0.0.1234567', description: 'HCS Topic ID for asset events', required: false })
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiProperty({ example: 'digital', description: 'Asset type: digital or rwa', required: false })
  @IsOptional()
  @IsString()
  assetType?: string;

  @ApiProperty({ example: 'verified', description: 'Asset verification status', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', description: 'Asset image URI', required: false })
  @IsOptional()
  @IsString()
  imageURI?: string;

  @ApiProperty({ example: 'https://example.com/document.pdf', description: 'Asset document URI', required: false })
  @IsOptional()
  @IsString()
  documentURI?: string;

  @ApiProperty({ example: '0.0.1234567', description: 'TRUST token ID for trading', required: false })
  @IsOptional()
  @IsString()
  trustTokenId?: string;
}
