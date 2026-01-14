import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VerificationRequestDocument = VerificationRequest & Document;

export enum VerificationStatus {
  SUBMITTED = 'SUBMITTED',
  EVIDENCE_GATHERING = 'EVIDENCE_GATHERING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class IPFSFile {
  @Prop({ required: true })
  cid: string;

  @Prop({ required: true })
  ipfsUrl: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  fileType: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop()
  description?: string;

  @Prop()
  category?: string;
}

@Schema({ timestamps: true })
export class Evidence {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  confidence: number;

  @Prop({ type: Object, required: true })
  result: any;

  @Prop({ type: [IPFSFile], default: [] })
  files: IPFSFile[];
}

@Schema({ timestamps: true })
export class Attestation {
  @Prop({ required: true })
  attestorAddress: string;

  @Prop({ required: true })
  confidence: number;

  @Prop({ required: true })
  evidence: string;
}

@Schema({ timestamps: true })
export class Scoring {
  @Prop({ required: true })
  automatedScore: number;

  @Prop({ required: true })
  attestorScore: number;

  @Prop({ required: true })
  finalScore: number;
}

@Schema({ timestamps: true })
export class VerificationRequest {
  @Prop({ required: true })
  assetId: string;

  @Prop({ required: true, enum: VerificationStatus, default: VerificationStatus.SUBMITTED })
  status: VerificationStatus;

  @Prop({ type: [Evidence], default: [] })
  evidence: Evidence[];

  @Prop({ type: [Attestation], default: [] })
  attestations: Attestation[];

  @Prop({ type: Scoring })
  scoring?: Scoring;

  @Prop({ type: [IPFSFile], default: [] })
  documents: IPFSFile[];

  @Prop({ type: [IPFSFile], default: [] })
  photos: IPFSFile[];

  @Prop()
  submittedBy: string;

  @Prop()
  completedAt?: Date;
}

export const VerificationRequestSchema = SchemaFactory.createForClass(VerificationRequest);
