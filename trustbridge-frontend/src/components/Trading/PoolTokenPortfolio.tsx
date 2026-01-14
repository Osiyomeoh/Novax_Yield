import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users, 
  Calendar, 
  Target,
  Shield,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CheckCircle,
  AlertTriangle,
  Filter,
  Search,
  Star,
  StarOff,
  Plus,
  Minus,
  Clock,
  Zap,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Gift,
  Lock,
  Unlock,
  Download,
  Upload,
  PieChart,
  TrendingUp as TrendingUpIcon,
  Award,
  Coins
} from 'lucide-react';

interface PoolTokenHolding {
  poolId: string;
  poolName: string;
  totalTokens: number;
  availableTokens: number;
  lockedTokens: number;
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  roi: number;
  totalDividendsUnclaimed: number;
  averageBuyPrice: number;
  firstInvestmentDate: string;
  lastActivityDate: string;
  metadata: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    poolType: string;
    expectedAPY: number;
    maturityDate: string;
    isTradeable: boolean;
    priceChange24h: number;
  };
}

interface PortfolioSummary {
  totalHoldings: number;
  totalInvested: number;
  totalValue: number;
  totalPnL: number;
  totalDividends: number;
  totalDividendsClaimed: number;
  totalDividendsUnclaimed: number;
  roi: number;
  holdings: PoolTokenHolding[];
}

interface UnclaimedDividend {
  dividendId: string;
  poolId: string;
  poolName: string;
  amount: number;
  perToken: number;
  distributedAt: string;
  description: string;
  holderAddress: string;
}

const PoolTokenPortfolio: React.FC = () => {
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [unclaimedDividends, setUnclaimedDividends] = useState<UnclaimedDividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'dividends' | 'analytics'>('overview');
  const [selectedHolding, setSelectedHolding] = useState<PoolTokenHolding | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      // Fetch portfolio summary
      const summaryResponse = await fetch(`${apiUrl}/pool-tokens/portfolio/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Fetch unclaimed dividends
      const dividendsResponse = await fetch(`${apiUrl}/pool-tokens/unclaimed-dividends`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (summaryResponse.ok && dividendsResponse.ok) {
        const [summary, dividends] = await Promise.all([
          summaryResponse.json(),
          dividendsResponse.json()
        ]);
        
        setPortfolioSummary(summary);
        setUnclaimedDividends(dividends);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDividend = async (dividendId: string, poolId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const response = await fetch(`${apiUrl}/pool-tokens/claim-dividends`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dividendId,
          poolId
        })
      });

      if (response.ok) {
        await fetchPortfolioData(); // Refresh data
        setShowClaimModal(false);
      } else {
        console.error('Failed to claim dividend');
      }
    } catch (error) {
      console.error('Failed to claim dividend:', error);
    }
  };

  const handleClaimAllDividends = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      for (const dividend of unclaimedDividends) {
        await fetch(`${apiUrl}/pool-tokens/claim-dividends`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            dividendId: dividend.dividendId,
            poolId: dividend.poolId
          })
        });
      }

      await fetchPortfolioData(); // Refresh data
      setShowClaimModal(false);
    } catch (error) {
      console.error('Failed to claim all dividends:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'text-primary-blue bg-primary-blue';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-100';
      case 'HIGH': return 'text-red-400 bg-red-100';
      default: return 'text-gray-400 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-off-white p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-800 rounded-lg p-6">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-off-white p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-blue mb-2">Pool Token Portfolio</h1>
          <p className="text-text-secondary">Manage your pool token holdings and dividends</p>
        </div>
        <div className="flex items-center gap-4">
          {unclaimedDividends.length > 0 && (
            <button
              onClick={() => setShowClaimModal(true)}
              className="flex items-center gap-2 bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-primary-blue transition-colors"
            >
              <Gift className="w-4 h-4" />
              Claim All Dividends ({unclaimedDividends.length})
            </button>
          )}
          <button
            onClick={fetchPortfolioData}
            className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {portfolioSummary && (
        <>
          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Total Value</p>
                  <p className="text-2xl font-bold text-primary-blue">{formatCurrency(portfolioSummary.totalValue)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-primary-blue" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Total P&L</p>
                  <p className={`text-2xl font-bold flex items-center gap-1 ${
                    portfolioSummary.totalPnL >= 0 ? 'text-primary-blue' : 'text-red-400'
                  }`}>
                    {portfolioSummary.totalPnL >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    {formatCurrency(portfolioSummary.totalPnL)}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">ROI</p>
                  <p className={`text-2xl font-bold ${
                    portfolioSummary.roi >= 0 ? 'text-primary-blue' : 'text-red-400'
                  }`}>
                    {formatPercentage(portfolioSummary.roi)}
                  </p>
                </div>
                <TrendingUpIcon className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Total Dividends</p>
                  <p className="text-2xl font-bold text-orange-400">{formatCurrency(portfolioSummary.totalDividends)}</p>
                </div>
                <Gift className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Total Invested</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(portfolioSummary.totalInvested)}</p>
                </div>
                <Coins className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Unclaimed Dividends</p>
                  <p className="text-xl font-bold text-yellow-400">{formatCurrency(portfolioSummary.totalDividendsUnclaimed)}</p>
                </div>
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Total Holdings</p>
                  <p className="text-xl font-bold text-blue-400">{portfolioSummary.totalHoldings}</p>
                </div>
                <Target className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex gap-2 mb-6">
              {['overview', 'holdings', 'dividends', 'analytics'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize ${
                    activeTab === tab ? 'bg-primary-blue text-black' : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Holdings */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Top Holdings</h3>
                  <div className="space-y-3">
                    {portfolioSummary.holdings
                      .sort((a, b) => b.currentValue - a.currentValue)
                      .slice(0, 5)
                      .map((holding) => (
                        <div key={holding.poolId} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{holding.poolName}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(holding.metadata.riskLevel)}`}>
                              {holding.metadata.riskLevel}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-text-secondary">Value</p>
                              <p className="font-semibold">{formatCurrency(holding.currentValue)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-text-secondary">ROI</p>
                              <p className={`font-semibold ${
                                holding.roi >= 0 ? 'text-primary-blue' : 'text-red-400'
                              }`}>
                                {formatPercentage(holding.roi)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Unclaimed Dividends</h3>
                  {unclaimedDividends.length > 0 ? (
                    <div className="space-y-3">
                      {unclaimedDividends.slice(0, 5).map((dividend) => (
                        <div key={dividend.dividendId} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{dividend.poolName}</h4>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-400">
                              Unclaimed
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-text-secondary">Amount</p>
                              <p className="font-semibold">{formatCurrency(dividend.amount)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-text-secondary">Date</p>
                              <p className="font-semibold">{formatDate(dividend.distributedAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-400 mb-2">No Unclaimed Dividends</h3>
                      <p className="text-text-secondary">All your dividends have been claimed!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'holdings' && (
              <div className="space-y-4">
                {portfolioSummary.holdings.map((holding) => (
                  <div key={holding.poolId} className="bg-gray-700 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-primary-blue mb-2">{holding.poolName}</h3>
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(holding.metadata.riskLevel)}`}>
                            {holding.metadata.riskLevel} RISK
                          </span>
                          <span className="text-text-secondary">Type: {holding.metadata.poolType}</span>
                          <span className="text-text-secondary">APY: {holding.metadata.expectedAPY}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-blue">{formatCurrency(holding.currentValue)}</p>
                        <p className={`text-sm flex items-center justify-end gap-1 ${
                          holding.roi >= 0 ? 'text-primary-blue' : 'text-red-400'
                        }`}>
                          {holding.roi >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {formatPercentage(holding.roi)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-text-secondary text-sm">Total Tokens</p>
                        <p className="font-semibold">{formatNumber(holding.totalTokens)}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-sm">Available</p>
                        <p className="font-semibold">{formatNumber(holding.availableTokens)}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-sm">Locked</p>
                        <p className="font-semibold">{formatNumber(holding.lockedTokens)}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-sm">Avg. Buy Price</p>
                        <p className="font-semibold">{formatCurrency(holding.averageBuyPrice)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-text-secondary text-sm">Total Invested</p>
                        <p className="font-semibold">{formatCurrency(holding.totalInvested)}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-sm">Total P&L</p>
                        <p className={`font-semibold ${
                          holding.totalPnL >= 0 ? 'text-primary-blue' : 'text-red-400'
                        }`}>
                          {formatCurrency(holding.totalPnL)}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-sm">Unclaimed Dividends</p>
                        <p className="font-semibold text-yellow-400">{formatCurrency(holding.totalDividendsUnclaimed)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'dividends' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Dividend Management</h3>
                {unclaimedDividends.length > 0 ? (
                  <div className="space-y-4">
                    {unclaimedDividends.map((dividend) => (
                      <div key={dividend.dividendId} className="bg-gray-700 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-lg font-bold text-primary-blue mb-2">{dividend.poolName}</h4>
                            <p className="text-text-secondary">{dividend.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary-blue">{formatCurrency(dividend.amount)}</p>
                            <p className="text-sm text-text-secondary">{formatDate(dividend.distributedAt)}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-text-secondary">
                            Per Token: {formatCurrency(dividend.perToken)}
                          </div>
                          <button
                            onClick={() => handleClaimDividend(dividend.dividendId, dividend.poolId)}
                            className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-primary-blue transition-colors"
                          >
                            Claim Dividend
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">No Unclaimed Dividends</h3>
                    <p className="text-text-secondary">All your dividends have been claimed!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Portfolio Analytics</h3>
                <div className="text-center py-12">
                  <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">Analytics Coming Soon</h3>
                  <p className="text-text-secondary">Advanced portfolio analytics will be available here.</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Claim Dividends Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-primary-blue">Claim Dividends</h2>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Unclaimed Dividends Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Amount</span>
                    <span className="font-semibold text-primary-blue">
                      {formatCurrency(unclaimedDividends.reduce((sum, d) => sum + d.amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Number of Dividends</span>
                    <span className="font-semibold">{unclaimedDividends.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleClaimAllDividends}
                  className="flex-1 bg-primary-blue text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-blue transition-colors"
                >
                  Claim All Dividends
                </button>
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolTokenPortfolio;
