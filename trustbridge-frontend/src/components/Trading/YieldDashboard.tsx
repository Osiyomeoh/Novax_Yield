/**
 * Yield Dashboard Component
 * Displays yield distribution, tracking, and management
 * Integrates with existing pool system
 */

import React, { useState, useEffect } from 'react';
import { yieldDistributionService, YieldHistory, UserYieldPosition } from '../../services/YieldDistributionService';
import { useWallet } from '../../contexts/WalletContext';
import { useToast } from '../../hooks/useToast';
import { TrendingUp, Calendar, DollarSign, Users, CheckCircle } from 'lucide-react';

interface YieldDashboardProps {
  poolId: string;
  poolName: string;
}

export const YieldDashboard: React.FC<YieldDashboardProps> = ({
  poolId,
  poolName
}) => {
  const { accountId, isConnected, signer, hederaClient } = useWallet();
  const { toast } = useToast();
  
  const [yieldHistory, setYieldHistory] = useState<YieldHistory | null>(null);
  const [userPosition, setUserPosition] = useState<UserYieldPosition | null>(null);
  const [yieldMetrics, setYieldMetrics] = useState<any>(null);
  const [poolData, setPoolData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (poolId) {
      loadYieldData();
    }
  }, [poolId, accountId]);

  const loadYieldData = async () => {
    setIsLoading(true);
    try {
      // Fetch real pool data from backend
      const apiUrl = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiUrl}/amc-pools/${poolId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const pool = await response.json();
        setPoolData(pool);

        // Calculate metrics from real pool data
        const dividends = pool.dividends || [];
        const investments = pool.investments || [];
        const activeInvestments = investments.filter((inv: any) => inv.isActive);
        
        const totalDividendsDistributed = pool.totalDividendsDistributed || dividends.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
        const totalActiveTokens = activeInvestments.reduce((sum: number, inv: any) => sum + (inv.tokens || 0), 0);
        
        // Calculate yield per token from the most recent dividend or average
        const yieldPerToken = dividends.length > 0 
          ? dividends[dividends.length - 1].perToken || (totalActiveTokens > 0 ? totalDividendsDistributed / totalActiveTokens : 0)
          : 0;
        const averageYieldRate = pool.expectedAPY || 0;
        const totalHolders = activeInvestments.length;

        setYieldMetrics({
          totalYieldDistributed: totalDividendsDistributed,
          averageYieldRate: averageYieldRate,
          totalHolders: totalHolders,
          yieldPerToken: yieldPerToken,
          nextDistributionDate: null // Can be calculated if needed
        });

        // Find user's position
        if (accountId) {
          const userInvestment = activeInvestments.find((inv: any) => 
            inv.investorAddress?.toLowerCase() === accountId.toLowerCase()
          );

          if (userInvestment) {
            const userTokens = userInvestment.tokens || 0;
            const dividendsReceived = userInvestment.dividendsReceived || 0;
            // Dividends are auto-distributed as HBAR, so no pending yield to claim
            const pendingYield = 0;

            // Find last dividend date from dividends array
            const userDividendHistory = dividends
              .filter((d: any) => d.transactionHash)
              .sort((a: any, b: any) => new Date(b.distributedAt).getTime() - new Date(a.distributedAt).getTime());
            
            const lastYieldClaimed = userDividendHistory.length > 0 
              ? new Date(userDividendHistory[0].distributedAt) 
              : null;

            setUserPosition({
              userId: accountId,
              poolId: poolId,
              tokenBalance: userTokens,
              totalYieldEarned: dividendsReceived,
              pendingYield: pendingYield, // Always 0 since dividends are auto-distributed
              lastYieldClaimed: lastYieldClaimed || undefined,
              yieldHistory: []
            });
          } else {
            setUserPosition(null);
          }
        }

        // Build yield history from dividends
        if (dividends.length > 0) {
          const distributions = dividends.map((d: any, index: number) => ({
            id: `div-${index}`,
            poolId: poolId,
            amount: d.amount || 0,
            currency: 'HBAR',
            distributionDate: new Date(d.distributedAt || d.createdAt),
            recordDate: new Date(d.distributedAt || d.createdAt),
            exDividendDate: new Date(d.distributedAt || d.createdAt),
            status: d.transactionHash ? 'DISTRIBUTED' : 'PENDING' as 'PENDING' | 'DISTRIBUTED' | 'FAILED',
            totalHolders: totalHolders,
            totalTokens: totalActiveTokens,
            yieldRate: averageYieldRate,
            transactionId: d.transactionHash || undefined
          }));

          const lastDistribution = distributions.sort((a: any, b: any) => 
            b.distributionDate.getTime() - a.distributionDate.getTime()
          )[0];

          setYieldHistory({
            poolId: poolId,
            distributions: distributions,
            totalYieldDistributed: totalDividendsDistributed,
            averageYieldRate: averageYieldRate,
            lastDistributionDate: lastDistribution?.distributionDate,
            nextDistributionDate: undefined
          });
        }
      } else {
        console.warn('Failed to fetch pool data, using mock data');
        // Fallback to mock data
        loadMockData();
      }
    } catch (error) {
      console.error('Error loading yield data:', error);
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockData = () => {
    const history = yieldDistributionService.getYieldHistory(poolId);
    setYieldHistory(history);

    if (accountId) {
      const positions = yieldDistributionService.getUserYieldPositions(accountId);
      const position = positions.find(p => p.poolId === poolId);
      setUserPosition(position || null);
    }

    const metrics = yieldDistributionService.getYieldMetrics(poolId);
    setYieldMetrics(metrics);
  };

  // Note: Dividends are automatically distributed as HBAR transfers on-chain
  // There's nothing to "claim" - dividends are sent directly to investor wallets

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const formatHbar = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(amount);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Yield Dashboard - {poolName}</h3>
        <div className="flex items-center gap-2 text-primary-blue">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-medium">Active Yield Generation</span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">Loading yield data...</div>
      ) : (
        <>
          {/* Yield Metrics Overview */}
          {yieldMetrics && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary-blue" />
              <span className="text-gray-400 text-sm">Total Distributed</span>
            </div>
            <div className="text-white text-lg font-semibold">
              {formatHbar(yieldMetrics.totalYieldDistributed)} HBAR
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-gray-400 text-sm">Avg Yield Rate</span>
            </div>
            <div className="text-white text-lg font-semibold">
              {yieldMetrics.averageYieldRate.toFixed(2)}%
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400 text-sm">Total Holders</span>
            </div>
            <div className="text-white text-lg font-semibold">
              {yieldMetrics.totalHolders}
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-400 text-sm">Yield Per Token</span>
            </div>
            <div className="text-white text-lg font-semibold">
              {formatHbar(yieldMetrics.yieldPerToken)} HBAR
            </div>
          </div>
        </div>
      )}

      {/* User Position */}
      {userPosition && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-white mb-4">Your Yield Position</h4>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-gray-400 text-sm">Token Balance</div>
              <div className="text-white text-lg font-semibold">{userPosition.tokenBalance.toLocaleString()}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm">Total Yield Earned</div>
              <div className="text-primary-blue text-lg font-semibold">
                {formatHbar(userPosition.totalYieldEarned)} HBAR
              </div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm">Dividends Received</div>
              <div className="text-blue-400 text-lg font-semibold">
                {poolData?.dividends?.length || 0} distributions
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-primary-blue/20 border border-primary-blue/30 rounded-lg">
            <div className="flex items-center gap-2 text-primary-blue text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Dividends are automatically distributed as HBAR transfers to your wallet.</span>
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Check your Hedera wallet for received HBAR from dividend distributions.
            </div>
          </div>

          {userPosition.lastYieldClaimed && (
            <div className="mt-4 text-sm text-gray-400">
              Last claimed: {formatDate(userPosition.lastYieldClaimed)}
            </div>
          )}
        </div>
      )}

      {/* Yield History */}
      {yieldHistory && yieldHistory.distributions.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Yield Distribution History</h4>
          
          <div className="space-y-3">
            {yieldHistory.distributions
              .sort((a, b) => b.distributionDate.getTime() - a.distributionDate.getTime())
              .slice(0, 10)
              .map((distribution) => (
                <div key={distribution.id} className="flex justify-between items-center bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      distribution.status === 'DISTRIBUTED' ? 'bg-primary-blue' :
                      distribution.status === 'PENDING' ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`} />
                    
                    <div>
                      <div className="text-white font-semibold">
                        {formatHbar(distribution.amount)} HBAR
                      </div>
                      <div className="text-gray-400 text-sm">
                        {formatDate(distribution.distributionDate)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-gray-400 text-sm">
                      {distribution.yieldRate.toFixed(2)}% APY
                    </div>
                    <div className="text-gray-400 text-sm">
                      {distribution.totalHolders} holders
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Upcoming Distributions */}
      {yieldMetrics?.nextDistributionDate && (
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h4 className="text-lg font-semibold text-white mb-4">Upcoming Distribution</h4>
          
          <div className="flex items-center gap-4">
            <Calendar className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-white font-semibold">
                Next Distribution
              </div>
              <div className="text-gray-400 text-sm">
                {formatDate(yieldMetrics.nextDistributionDate)}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

