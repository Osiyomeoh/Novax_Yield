import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  Home,
  ChevronRight,
  Unlock,
  Download,
  Upload,
  PieChart,
  TrendingUp as TrendingUpIcon,
  Award,
  Coins,
  Play,
  Pause,
  X,
  FileText,
  History,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import Button from '../UI/Button';

interface DividendDistribution {
  distributionId: string;
  poolId: string;
  poolName: string;
  createdBy: string;
  dividendType: string;
  status: string;
  totalDividendAmount: number;
  perTokenRate: number;
  totalTokensEligible: number;
  totalRecipients: number;
  distributionDate: string;
  recordDate: string;
  description: string;
  sourceOfFunds: string;
  recipients: any[];
  totalClaimed: number;
  totalUnclaimed: number;
  claimCount: number;
  distributedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  metadata: {
    dividendYield: number;
    payoutRatio: number;
    frequency: string;
    currency: string;
  };
}

interface DividendStats {
  totalDistributions: number;
  totalDistributed: number;
  totalClaimed: number;
  totalUnclaimed: number;
  averageDividendYield: number;
  distributionsThisYear: number;
  distributionsThisMonth: number;
  pendingDistributions: number;
}

interface CreateDividendForm {
  poolId: string;
  dividendType: string;
  totalDividendAmount: number;
  distributionDate: string;
  recordDate: string;
  description: string;
  sourceOfFunds: string;
  dividendYield: number;
  payoutRatio: number;
  frequency: string;
  currency: string;
}

const DividendManagement: React.FC = () => {
  const navigate = useNavigate();
  const [distributions, setDistributions] = useState<DividendDistribution[]>([]);
  const [stats, setStats] = useState<DividendStats | null>(null);
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'distributions' | 'create' | 'analytics'>('overview');
  const [selectedDistribution, setSelectedDistribution] = useState<DividendDistribution | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateDividendForm>({
    poolId: '',
    dividendType: 'REGULAR',
    totalDividendAmount: 0,
    distributionDate: '',
    recordDate: '',
    description: '',
    sourceOfFunds: '',
    dividendYield: 0,
    payoutRatio: 0,
    frequency: 'QUARTERLY',
    currency: 'USD'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      // Fetch dividend distributions
      const distributionsResponse = await fetch(`${apiUrl}/dividends/distributions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Fetch dividend stats
      const statsResponse = await fetch(`${apiUrl}/dividends/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Fetch pools
      const poolsResponse = await fetch(`${apiUrl}/amc-pools/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (distributionsResponse.ok && statsResponse.ok && poolsResponse.ok) {
        const [distributionsData, statsData, poolsData] = await Promise.all([
          distributionsResponse.json(),
          statsResponse.json(),
          poolsResponse.json()
        ]);
        
        setDistributions(distributionsData);
        setStats(statsData);
        setPools(poolsData.filter((pool: any) => pool.isTradeable && pool.status === 'ACTIVE'));
      }
    } catch (error) {
      console.error('Failed to fetch dividend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDividend = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const response = await fetch(`${apiUrl}/dividends/distributions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });

      if (response.ok) {
        await fetchData(); // Refresh data
        setShowCreateForm(false);
        resetForm();
      } else {
        console.error('Failed to create dividend distribution');
      }
    } catch (error) {
      console.error('Failed to create dividend distribution:', error);
    }
  };

  const handleExecuteDividend = async (distributionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const response = await fetch(`${apiUrl}/dividends/distributions/${distributionId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchData(); // Refresh data
      } else {
        console.error('Failed to execute dividend distribution');
      }
    } catch (error) {
      console.error('Failed to execute dividend distribution:', error);
    }
  };

  const handleCancelDividend = async (distributionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl) return;
      
      const response = await fetch(`${apiUrl}/dividends/distributions/${distributionId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchData(); // Refresh data
      } else {
        console.error('Failed to cancel dividend distribution');
      }
    } catch (error) {
      console.error('Failed to cancel dividend distribution:', error);
    }
  };

  const resetForm = () => {
    setCreateForm({
      poolId: '',
      dividendType: 'REGULAR',
      totalDividendAmount: 0,
      distributionDate: '',
      recordDate: '',
      description: '',
      sourceOfFunds: '',
      dividendYield: 0,
      payoutRatio: 0,
      frequency: 'QUARTERLY',
      currency: 'USD'
    });
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

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-400 bg-yellow-100';
      case 'DISTRIBUTING': return 'text-blue-400 bg-blue-100';
      case 'DISTRIBUTED': return 'text-primary-blue bg-primary-blue';
      case 'COMPLETED': return 'text-primary-blue bg-primary-blue';
      case 'FAILED': return 'text-red-400 bg-red-100';
      case 'CANCELLED': return 'text-gray-400 bg-gray-100';
      default: return 'text-gray-400 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'DISTRIBUTING': return <Activity className="w-4 h-4" />;
      case 'DISTRIBUTED': return <CheckCircle2 className="w-4 h-4" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'FAILED': return <XCircle className="w-4 h-4" />;
      case 'CANCELLED': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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
      {/* Navigation Header */}
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-4">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-1 hover:text-primary-blue transition-colors"
          >
            <Home className="w-4 h-4" />
            Admin Dashboard
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-primary-blue font-medium">Dividend Management</span>
        </nav>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Button>
          <div className="flex-1" />
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-blue mb-2">Dividend Management</h1>
          <p className="text-text-secondary">Create and manage dividend distributions</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-primary-blue text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-blue-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Dividend
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Total Distributions</p>
                  <p className="text-2xl font-bold text-primary-blue">{stats.totalDistributions}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-primary-blue" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Total Distributed</p>
                  <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.totalDistributed)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Total Claimed</p>
                  <p className="text-2xl font-bold text-primary-blue">{formatCurrency(stats.totalClaimed)}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-primary-blue" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Unclaimed</p>
                  <p className="text-2xl font-bold text-orange-400">{formatCurrency(stats.totalUnclaimed)}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Avg. Yield</p>
                  <p className="text-xl font-bold text-purple-400">{stats.averageDividendYield.toFixed(2)}%</p>
                </div>
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">This Year</p>
                  <p className="text-xl font-bold text-yellow-400">{stats.distributionsThisYear}</p>
                </div>
                <Calendar className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">This Month</p>
                  <p className="text-xl font-bold text-indigo-400">{stats.distributionsThisMonth}</p>
                </div>
                <Clock className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">Pending</p>
                  <p className="text-xl font-bold text-red-400">{stats.pendingDistributions}</p>
                </div>
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex gap-2 mb-6">
              {['overview', 'distributions', 'create', 'analytics'].map((tab) => (
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
                {/* Recent Distributions */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Distributions</h3>
                  <div className="space-y-3">
                    {distributions.slice(0, 5).map((distribution) => (
                      <div key={distribution.distributionId} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{distribution.poolName}</h4>
                            <p className="text-sm text-text-secondary">{distribution.description}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(distribution.status)}`}>
                            {distribution.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-text-secondary">Amount</p>
                            <p className="font-semibold">{formatCurrency(distribution.totalDividendAmount)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-text-secondary">Date</p>
                            <p className="font-semibold">{formatDate(distribution.distributionDate)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distribution Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Distribution Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Total Recipients</span>
                      <span className="font-semibold">{distributions.reduce((sum, d) => sum + d.totalRecipients, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Claim Rate</span>
                      <span className="font-semibold">
                        {stats.totalDistributed > 0 ? 
                          ((stats.totalClaimed / stats.totalDistributed) * 100).toFixed(1) + '%' : 
                          '0%'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Avg. Per Distribution</span>
                      <span className="font-semibold">
                        {distributions.length > 0 ? 
                          formatCurrency(stats.totalDistributed / distributions.length) : 
                          formatCurrency(0)
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Pending Distributions</span>
                      <span className="font-semibold text-yellow-400">{stats.pendingDistributions}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'distributions' && (
              <div className="space-y-4">
                {distributions.map((distribution) => (
                  <div key={distribution.distributionId} className="bg-gray-700 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-primary-blue mb-2">{distribution.poolName}</h3>
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(distribution.status)}`}>
                            {distribution.status}
                          </span>
                          <span className="text-text-secondary">Type: {distribution.dividendType}</span>
                          <span className="text-text-secondary">Recipients: {distribution.totalRecipients}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary-blue">{formatCurrency(distribution.totalDividendAmount)}</p>
                        <p className="text-sm text-text-secondary">{formatDate(distribution.distributionDate)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-text-secondary text-sm">Per Token Rate</p>
                        <p className="font-semibold">{formatCurrency(distribution.perTokenRate)}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-sm">Total Claimed</p>
                        <p className="font-semibold text-primary-blue">{formatCurrency(distribution.totalClaimed)}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-sm">Unclaimed</p>
                        <p className="font-semibold text-orange-400">{formatCurrency(distribution.totalUnclaimed)}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-sm">Claim Count</p>
                        <p className="font-semibold">{distribution.claimCount}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {distribution.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleExecuteDividend(distribution.distributionId)}
                            className="bg-primary-blue text-white px-3 py-2 rounded text-sm font-medium hover:bg-primary-blue transition-colors flex items-center gap-1"
                          >
                            <Play className="w-4 h-4" />
                            Execute
                          </button>
                          <button
                            onClick={() => handleCancelDividend(distribution.distributionId)}
                            className="bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedDistribution(distribution)}
                        className="bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'create' && (
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold mb-6">Create Dividend Distribution</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Pool</label>
                    <select
                      value={createForm.poolId}
                      onChange={(e) => setCreateForm({...createForm, poolId: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-blue"
                    >
                      <option value="">Select a pool...</option>
                      {pools.map((pool) => (
                        <option key={pool.poolId} value={pool.poolId}>{pool.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Dividend Type</label>
                      <select
                        value={createForm.dividendType}
                        onChange={(e) => setCreateForm({...createForm, dividendType: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-blue"
                      >
                        <option value="REGULAR">Regular</option>
                        <option value="SPECIAL">Special</option>
                        <option value="BONUS">Bonus</option>
                        <option value="FINAL">Final</option>
                        <option value="INTERIM">Interim</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Total Amount ($)</label>
                      <input
                        type="number"
                        value={createForm.totalDividendAmount}
                        onChange={(e) => setCreateForm({...createForm, totalDividendAmount: parseFloat(e.target.value) || 0})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-blue"
                        placeholder="100000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Distribution Date</label>
                      <input
                        type="date"
                        value={createForm.distributionDate}
                        onChange={(e) => setCreateForm({...createForm, distributionDate: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Record Date</label>
                      <input
                        type="date"
                        value={createForm.recordDate}
                        onChange={(e) => setCreateForm({...createForm, recordDate: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-blue"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-blue"
                      rows={3}
                      placeholder="Enter dividend description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Source of Funds</label>
                    <input
                      type="text"
                      value={createForm.sourceOfFunds}
                      onChange={(e) => setCreateForm({...createForm, sourceOfFunds: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-blue"
                      placeholder="e.g., Pool profits, asset sales, etc."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateDividend}
                      className="flex-1 bg-primary-blue text-black px-4 py-2 rounded-lg font-semibold hover:bg-primary-blue-light transition-colors"
                    >
                      Create Distribution
                    </button>
                    <button
                      onClick={resetForm}
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                    >
                      Reset Form
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Dividend Analytics</h3>
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">Analytics Coming Soon</h3>
                  <p className="text-text-secondary">Advanced dividend analytics will be available here.</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Distribution Details Modal */}
      {selectedDistribution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary-blue">{selectedDistribution.poolName}</h2>
              <button
                onClick={() => setSelectedDistribution(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Distribution Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Distribution ID</span>
                    <span className="font-mono text-sm">{selectedDistribution.distributionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDistribution.status)}`}>
                      {selectedDistribution.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Type</span>
                    <span>{selectedDistribution.dividendType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Amount</span>
                    <span className="font-semibold">{formatCurrency(selectedDistribution.totalDividendAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Per Token Rate</span>
                    <span className="font-semibold">{formatCurrency(selectedDistribution.perTokenRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Distribution Date</span>
                    <span>{formatDate(selectedDistribution.distributionDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Record Date</span>
                    <span>{formatDate(selectedDistribution.recordDate)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Distribution Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Recipients</span>
                    <span className="font-semibold">{selectedDistribution.totalRecipients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Claimed</span>
                    <span className="font-semibold text-primary-blue">{formatCurrency(selectedDistribution.totalClaimed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Unclaimed</span>
                    <span className="font-semibold text-orange-400">{formatCurrency(selectedDistribution.totalUnclaimed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Claim Count</span>
                    <span className="font-semibold">{selectedDistribution.claimCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Claim Rate</span>
                    <span className="font-semibold">
                      {selectedDistribution.totalDividendAmount > 0 ? 
                        ((selectedDistribution.totalClaimed / selectedDistribution.totalDividendAmount) * 100).toFixed(1) + '%' : 
                        '0%'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              <p className="text-text-secondary">{selectedDistribution.description}</p>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Source of Funds</h3>
              <p className="text-text-secondary">{selectedDistribution.sourceOfFunds}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DividendManagement;
