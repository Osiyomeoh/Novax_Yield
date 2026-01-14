import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class TokenizationRequestDto {
  @ApiProperty({ example: 'AGRICULTURAL_1756990208031_bf3qrljet' })
  @IsString()
  assetId: string;

  @ApiProperty({ example: '0x1234567890123456789012345678901234567890' })
  @IsString()
  owner: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  totalSupply: number;

  @ApiProperty({ example: 'Coffee Farm Token' })
  @IsString()
  tokenName: string;

  @ApiProperty({ example: 'CFT' })
  @IsString()
  tokenSymbol: string;

  @ApiProperty({ example: { description: 'Test coffee farm token' }, required: false })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enableKyc?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  enableFreeze?: boolean;
}
