/**
 * Risk Dashboard Component
 * Displays risk assessment, warnings, and mitigations
 * Integrates with existing pool system
 */

import React, { useState, useEffect } from 'react';
import { riskAssessmentService, RiskAssessment, PoolRiskProfile } from '../../services/RiskAssessmentService';
import { AlertTriangle, Shield, TrendingUp, Info, CheckCircle, XCircle } from 'lucide-react';

interface RiskDashboardProps {
  poolId: string;
  poolName: string;
}

export const RiskDashboard: React.FC<RiskDashboardProps> = ({
  poolId,
  poolName
}) => {
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [poolProfile, setPoolProfile] = useState<PoolRiskProfile | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);

  useEffect(() => {
    if (poolId) {
      loadRiskData();
    }
  }, [poolId]);

  const loadRiskData = () => {
    const assessment = riskAssessmentService.getRiskAssessment(poolId);
    const profile = riskAssessmentService.getPoolRiskProfile(poolId);
    const metrics = riskAssessmentService.getRiskAdjustedReturns(poolId);

    setRiskAssessment(assessment);
    setPoolProfile(profile);
    setRiskMetrics(metrics);
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return 'text-primary-blue bg-primary-blue/20';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'HIGH':
        return 'text-orange-400 bg-orange-400/20';
      case 'VERY_HIGH':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getRiskFactorColor = (score: number) => {
    if (score < 25) return 'text-primary-blue';
    if (score < 50) return 'text-yellow-400';
    if (score < 75) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRiskFactorLabel = (score: number) => {
    if (score < 25) return 'Low';
    if (score < 50) return 'Medium';
    if (score < 75) return 'High';
    return 'Very High';
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Risk Assessment - {poolName}</h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(riskAssessment?.riskLevel || 'UNKNOWN')}`}>
          {riskAssessment?.riskLevel || 'UNKNOWN'} RISK
        </div>
      </div>

      {/* Overall Risk Score */}
      {riskAssessment && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
              <span className={`text-2xl font-bold ${getRiskFactorColor(riskAssessment.overallRiskScore)}`}>
                {riskAssessment.overallRiskScore}
              </span>
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Overall Risk Score</div>
              <div className="text-gray-400 text-sm">
                {getRiskFactorLabel(riskAssessment.overallRiskScore)} Risk Level
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                riskAssessment.overallRiskScore < 25 ? 'bg-primary-blue' :
                riskAssessment.overallRiskScore < 50 ? 'bg-yellow-400' :
                riskAssessment.overallRiskScore < 75 ? 'bg-orange-400' :
                'bg-red-400'
              }`}
              style={{ width: `${riskAssessment.overallRiskScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Risk Metrics */}
      {riskMetrics && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400 text-sm">Expected APY</span>
            </div>
            <div className="text-white text-lg font-semibold">
              {riskMetrics.expectedAPY.toFixed(2)}%
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary-blue" />
              <span className="text-gray-400 text-sm">Risk-Adjusted Return</span>
            </div>
            <div className="text-white text-lg font-semibold">
              {riskMetrics.riskAdjustedReturn.toFixed(2)}%
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400 text-sm">Sharpe Ratio</span>
            </div>
            <div className="text-white text-lg font-semibold">
              {riskMetrics.sharpeRatio.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {riskAssessment && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-white mb-4">Risk Factors Breakdown</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Liquidity Risk</span>
                <span className={`text-sm font-semibold ${getRiskFactorColor(riskAssessment.riskFactors.liquidityRisk)}`}>
                  {riskAssessment.riskFactors.liquidityRisk}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full ${getRiskFactorColor(riskAssessment.riskFactors.liquidityRisk).replace('text-', 'bg-')}`}
                  style={{ width: `${riskAssessment.riskFactors.liquidityRisk}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Market Risk</span>
                <span className={`text-sm font-semibold ${getRiskFactorColor(riskAssessment.riskFactors.marketRisk)}`}>
                  {riskAssessment.riskFactors.marketRisk}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full ${getRiskFactorColor(riskAssessment.riskFactors.marketRisk).replace('text-', 'bg-')}`}
                  style={{ width: `${riskAssessment.riskFactors.marketRisk}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Credit Risk</span>
                <span className={`text-sm font-semibold ${getRiskFactorColor(riskAssessment.riskFactors.creditRisk)}`}>
                  {riskAssessment.riskFactors.creditRisk}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full ${getRiskFactorColor(riskAssessment.riskFactors.creditRisk).replace('text-', 'bg-')}`}
                  style={{ width: `${riskAssessment.riskFactors.creditRisk}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Operational Risk</span>
                <span className={`text-sm font-semibold ${getRiskFactorColor(riskAssessment.riskFactors.operationalRisk)}`}>
                  {riskAssessment.riskFactors.operationalRisk}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full ${getRiskFactorColor(riskAssessment.riskFactors.operationalRisk).replace('text-', 'bg-')}`}
                  style={{ width: `${riskAssessment.riskFactors.operationalRisk}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Regulatory Risk</span>
                <span className={`text-sm font-semibold ${getRiskFactorColor(riskAssessment.riskFactors.regulatoryRisk)}`}>
                  {riskAssessment.riskFactors.regulatoryRisk}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full ${getRiskFactorColor(riskAssessment.riskFactors.regulatoryRisk).replace('text-', 'bg-')}`}
                  style={{ width: `${riskAssessment.riskFactors.regulatoryRisk}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Concentration Risk</span>
                <span className={`text-sm font-semibold ${getRiskFactorColor(riskAssessment.riskFactors.concentrationRisk)}`}>
                  {riskAssessment.riskFactors.concentrationRisk}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full ${getRiskFactorColor(riskAssessment.riskFactors.concentrationRisk).replace('text-', 'bg-')}`}
                  style={{ width: `${riskAssessment.riskFactors.concentrationRisk}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Warnings */}
      {riskAssessment && riskAssessment.riskWarnings.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Risk Warnings
          </h4>
          
          <div className="space-y-3">
            {riskAssessment.riskWarnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-3 bg-orange-400/10 border border-orange-400/20 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span className="text-orange-400 text-sm">{warning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Mitigations */}
      {riskAssessment && riskAssessment.riskMitigations.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-blue" />
            Risk Mitigations
          </h4>
          
          <div className="space-y-3">
            {riskAssessment.riskMitigations.map((mitigation, index) => (
              <div key={index} className="flex items-start gap-3 bg-primary-blue/10 border border-primary-blue/20 rounded-lg p-3">
                <CheckCircle className="w-4 h-4 text-primary-blue mt-0.5 flex-shrink-0" />
                <span className="text-primary-blue text-sm">{mitigation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pool Profile */}
      {poolProfile && (
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h4 className="text-lg font-semibold text-white mb-4">Pool Profile</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400 text-sm">Asset Type</div>
              <div className="text-white font-semibold">{poolProfile.assetType}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm">Geographic Region</div>
              <div className="text-white font-semibold">{poolProfile.geographicRegion}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm">Sector</div>
              <div className="text-white font-semibold">{poolProfile.sector}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm">Total Value</div>
              <div className="text-white font-semibold">${poolProfile.totalValue.toLocaleString()}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm">Diversification Score</div>
              <div className="text-white font-semibold">{poolProfile.diversificationScore}/100</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm">Transparency Score</div>
              <div className="text-white font-semibold">{poolProfile.transparencyScore}/100</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
