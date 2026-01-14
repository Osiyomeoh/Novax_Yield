import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import { CheckCircle, Clock, Shield, Zap, Timer, DollarSign } from 'lucide-react';

interface VerificationTier {
  name: 'INSTANT' | 'FAST' | 'STANDARD';
  maxAssetValue: number;
  maxProcessingTime: number;
  requiresManualReview: boolean;
  confidenceThreshold: number;
  description: string;
  benefits: string[];
  icon: React.ComponentType<any>;
  color: string;
}

const verificationTiers: VerificationTier[] = [
  {
    name: 'INSTANT',
    maxAssetValue: 10000,
    maxProcessingTime: 5,
    requiresManualReview: false,
    confidenceThreshold: 0.85,
    description: 'Instant verification for low-value, high-confidence assets',
    benefits: [
      'Approved in under 5 minutes',
      'No manual review required',
      'Immediate tokenization',
      'Available for investment instantly'
    ],
    icon: Zap,
    color: 'text-primary-blue'
  },
  {
    name: 'FAST',
    maxAssetValue: 100000,
    maxProcessingTime: 30,
    requiresManualReview: false,
    confidenceThreshold: 0.75,
    description: 'Fast verification for medium-value assets with good documentation',
    benefits: [
      'Approved in under 30 minutes',
      'Automated verification',
      'Quick tokenization',
      'Available for investment within hours'
    ],
    icon: Timer,
    color: 'text-blue-500'
  },
  {
    name: 'STANDARD',
    maxAssetValue: Infinity,
    maxProcessingTime: 1440,
    requiresManualReview: true,
    confidenceThreshold: 0.6,
    description: 'Standard verification with manual review for high-value or complex assets',
    benefits: [
      'Thorough verification process',
      'Expert manual review',
      'Highest security standards',
      'Suitable for high-value assets'
    ],
    icon: Shield,
    color: 'text-purple-500'
  }
];

interface VerificationTiersProps {
  selectedTier?: string;
  onTierSelect?: (tier: string) => void;
  assetValue?: number;
}

const VerificationTiers: React.FC<VerificationTiersProps> = ({ 
  selectedTier, 
  onTierSelect, 
  assetValue 
}) => {
  const getTierForAsset = (value: number) => {
    if (value <= 10000) return 'INSTANT';
    if (value <= 100000) return 'FAST';
    return 'STANDARD';
  };

  const predictedTier = assetValue ? getTierForAsset(assetValue) : null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-off-white mb-2">Verification Tiers</h3>
        <p className="text-off-white/70">
          Your asset will be assigned to the appropriate verification tier based on value and documentation quality
        </p>
        {predictedTier && (
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-primary-blue/10 border border-primary-blue/30 rounded-lg">
            <DollarSign className="w-5 h-5 text-primary-blue mr-2" />
            <span className="text-primary-blue font-semibold">
              Predicted Tier: {predictedTier} (Asset Value: ${assetValue?.toLocaleString()})
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {verificationTiers.map((tier) => {
          const Icon = tier.icon;
          const isSelected = selectedTier === tier.name;
          const isPredicted = predictedTier === tier.name;
          
          return (
            <Card 
              key={tier.name}
              className={`cursor-pointer transition-all duration-300 ${
                isSelected 
                  ? 'border-primary-blue bg-primary-blue/5' 
                  : isPredicted
                  ? 'border-blue-500/50 bg-blue-500/5'
                  : 'border-gray-600/30 bg-dark-card/50 hover:border-gray-500/50'
              }`}
              onClick={() => onTierSelect?.(tier.name)}
            >
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full bg-gray-800/50 ${tier.color}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-off-white">
                  {tier.name}
                </CardTitle>
                <p className="text-off-white/70 text-sm">
                  {tier.description}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-off-white/70">Max Asset Value:</span>
                  <span className="text-off-white font-semibold">
                    {tier.maxAssetValue === Infinity ? 'Unlimited' : `$${tier.maxAssetValue.toLocaleString()}`}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-off-white/70">Processing Time:</span>
                  <span className="text-off-white font-semibold">
                    {tier.maxProcessingTime < 60 
                      ? `${tier.maxProcessingTime} minutes`
                      : `${Math.round(tier.maxProcessingTime / 60)} hours`
                    }
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-off-white/70">Manual Review:</span>
                  <span className={`font-semibold ${tier.requiresManualReview ? 'text-yellow-500' : 'text-primary-blue'}`}>
                    {tier.requiresManualReview ? 'Required' : 'Not Required'}
                  </span>
                </div>

                <div className="pt-4 border-t border-gray-600/30">
                  <h4 className="text-sm font-semibold text-off-white mb-2">Benefits:</h4>
                  <ul className="space-y-1">
                    {tier.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start text-xs text-off-white/70">
                        <CheckCircle className="w-3 h-3 text-primary-blue mr-2 mt-0.5 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                {isPredicted && (
                  <div className="mt-4 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-center">
                    <span className="text-blue-500 text-xs font-semibold">
                      Predicted for your asset
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default VerificationTiers;
