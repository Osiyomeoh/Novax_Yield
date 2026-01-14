import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsArray, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CoordinatesDto {
  @ApiProperty({ example: 6.5244 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 3.3792 })
  @IsNumber()
  lng: number;
}

export class LocationDto {
  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto;

  @ApiProperty({ example: 'Lagos, Nigeria' })
  @IsString()
  address: string;
}

export class DocumentDto {
  @ApiProperty({ example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' })
  @IsString()
  data: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  mimeType: string;

  @ApiProperty({ example: 'land_certificate.pdf' })
  @IsString()
  fileName: string;
}

export class PhotoDto {
  @ApiProperty({ example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' })
  @IsString()
  data: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType: string;

  @ApiProperty({ type: CoordinatesDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  gps?: CoordinatesDto;
}

export class EvidenceDto {
  @ApiProperty({ type: [DocumentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  @ApiProperty({ type: [PhotoDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoDto)
  photos?: PhotoDto[];

  @ApiProperty({ type: LocationDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  additionalInfo?: any;
}

export class SubmitVerificationDto {
  @ApiProperty({ example: 'AGRICULTURAL_1756990208031_bf3qrljet' })
  @IsString()
  assetId: string;

  @ApiProperty({ type: EvidenceDto })
  @ValidateNested()
  @Type(() => EvidenceDto)
  evidence: EvidenceDto;
}
