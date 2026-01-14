import { IsString, IsNumber, IsDateString, IsArray, IsOptional } from 'class-validator';

export class FraudCheckDto {
  @IsString()
  assetId: string;

  @IsString()
  ownerAddress: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsNumber()
  grossRevenue: number;

  @IsNumber()
  expenses: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documentHashes?: string[];
}

