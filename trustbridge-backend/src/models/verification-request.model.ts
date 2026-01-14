import mongoose, { Document, Schema } from 'mongoose';

export interface IEvidence {
  type: string;
  provider: string;
  confidence: number;
  result: any;
  timestamp: Date;
}

export interface IAttestation {
  attestorAddress: string;
  confidence: number;
  evidence: string;
  timestamp: Date;
  onChainTxHash?: string;
}

export interface IVerificationScoring {
  automatedScore: number;
  attestorScore: number;
  finalScore: number;
  breakdown: any;
}

export interface IVerificationRequest extends Document {
  assetId: string;
  assetType: string;
  ownerAddress: string;
  declaredValue: number;
  status: 'SUBMITTED' | 'EVIDENCE_GATHERING' | 'ATTESTOR_REVIEW' | 'MANUAL_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  evidence: IEvidence[];
  attestations: IAttestation[];
  scoring: IVerificationScoring;
  assignedAttestors: string[];
  metadata: any;
  documents: Array<{
    name: string;
    fileRef: string;
  }>;
  photos: Array<{
    description: string;
    fileRef: string;
    gpsData?: {
      lat: number;
      lng: number;
    };
  }>;
  createdAt: Date;
  expiresAt?: Date;
  updatedAt: Date;
}

const EvidenceSchema = new Schema<IEvidence>({
  type: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  result: {
    type: Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  }
}, { _id: false });

const AttestationSchema = new Schema<IAttestation>({
  attestorAddress: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  evidence: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  onChainTxHash: String
}, { _id: false });

const VerificationScoringSchema = new Schema<IVerificationScoring>({
  automatedScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  attestorScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  finalScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  breakdown: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const VerificationRequestSchema = new Schema<IVerificationRequest>({
  assetId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  assetType: {
    type: String,
    required: true,
    index: true
  },
  ownerAddress: {
    type: String,
    required: true,
    index: true
  },
  declaredValue: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['SUBMITTED', 'EVIDENCE_GATHERING', 'ATTESTOR_REVIEW', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'],
    default: 'SUBMITTED',
    index: true
  },
  evidence: [EvidenceSchema],
  attestations: [AttestationSchema],
  scoring: {
    type: VerificationScoringSchema,
    default: () => ({})
  },
  assignedAttestors: [{
    type: String,
    index: true
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  documents: [{
    name: {
      type: String,
      required: true
    },
    fileRef: {
      type: String,
      required: true
    }
  }],
  photos: [{
    description: {
      type: String,
      required: true
    },
    fileRef: {
      type: String,
      required: true
    },
    gpsData: {
      lat: Number,
      lng: Number
    }
  }],
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
VerificationRequestSchema.index({ status: 1, createdAt: -1 });
VerificationRequestSchema.index({ assetType: 1, status: 1 });
VerificationRequestSchema.index({ 'metadata.country': 1 });
VerificationRequestSchema.index({ assignedAttestors: 1, status: 1 });

export const VerificationRequestModel = mongoose.model<IVerificationRequest>('VerificationRequest', VerificationRequestSchema);
