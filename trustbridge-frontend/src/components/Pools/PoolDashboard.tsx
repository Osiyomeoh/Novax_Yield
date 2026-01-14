import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { useToast } from '../../hooks/useToast';
import { poolService, Pool, PoolCreationParams } from '../../services/poolService';
import { useWallet } from '../../contexts/WalletContext';
import { 
  Plus, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ArrowUpRight
} from 'lucide-react';

const PoolDashboard: React.FC = () => {
  const { address, signer } = useWallet();
  const { toast } = useToast();
  const [pools, setPools] = useState<Pool[]>([]);
  const [userPools, setUserPools] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInvestForm, setShowInvestForm] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [stats, setStats] = useState({
    totalPools: 0,
    totalValueLocked: '0',
  });

  // Create pool form state
  const [createForm, setCreateForm] = useState<PoolCreationParams>({
    name: '',
    description: '',
    targetValue: '',
    minInvestment: '',
    maxInvestment: '',
    managementFee: '',
    performanceFee: '',
    maturityDate: '',
  });

  // Investment form state
  const [investmentAmount, setInvestmentAmount] = useState('');

  useEffect(() => {
    if (signer) {
      try {
        poolService.initialize(window.ethereum as any, signer);
        loadData();
      } catch (error) {
        console.error('PoolService initialization failed:', error);
        loadEmptyData();
      }
    } else {
      loadEmptyData();
    }
  }, [signer]);

  const loadEmptyData = () => {
    setLoading(true);
    // Show empty state when no wallet connected
    setPools([]);
    setStats({
      totalPools: 0,
      totalValueLocked: '0',
    });
    setLoading(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [totalPools, totalValueLocked, userPoolsList] = await Promise.all([
        poolService.getTotalPools(),
        poolService.getTotalValueLocked(),
        address ? poolService.getUserPools(address) : Promise.resolve([]),
      ]);

      setStats({ totalPools, totalValueLocked });
      setUserPools(userPoolsList);

      // Load pool details for user pools
      const poolDetails = await Promise.all(
        userPoolsList.map(poolId => poolService.getPool(poolId))
      );
      setPools(poolDetails.filter(pool => pool !== null) as Pool[]);
    } catch (error) {
      console.error('Failed to load pool data:', error);
      toast({
        title: "Error",
        description: "Failed to load pool data",
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await poolService.createPool(createForm);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Pool created successfully! Pool ID: ${result.poolId}`,
          variant: 'default'
        });
        setShowCreateForm(false);
        setCreateForm({
          name: '',
          description: '',
          targetValue: '',
          minInvestment: '',
          maxInvestment: '',
          managementFee: '',
          performanceFee: '',
          maturityDate: '',
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create pool",
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Pool creation failed:', error);
      toast({
        title: "Error",
        description: "Failed to create pool",
        variant: 'destructive'
      });
    }
  };

  const handleInvest = async () => {
    if (!address || !selectedPool) {
      toast({
        title: "Error",
        description: "Please select a pool and connect your wallet",
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await poolService.investInPool({
        poolId: selectedPool.id,
        amount: investmentAmount,
      });
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully invested ${investmentAmount} HBAR in ${selectedPool.name}`,
          variant: 'default'
        });
        setShowInvestForm(false);
        setInvestmentAmount('');
        setSelectedPool(null);
        loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to invest in pool",
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Investment failed:', error);
      toast({
        title: "Error",
        description: "Failed to invest in pool",
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string) => {
    return `${Number(amount).toLocaleString()} HBAR`;
  };

  const getProgressPercentage = (current: string, target: string) => {
    const currentNum = Number(current);
    const targetNum = Number(target);
    return targetNum > 0 ? (currentNum / targetNum) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-black dark:via-gray-900 dark:to-black">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Demo Mode Notice */}
        {!address && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-400/30 rounded-xl p-6 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 text-blue-300">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="font-semibold text-lg">Connect Wallet</span>
            </div>
            <p className="text-blue-200 text-sm mt-2 ml-11">
              Connect your wallet to access pool management functionality.
            </p>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-blue via-primary-blue-light to-cyan-400 bg-clip-text text-transparent">
              Pool Dashboard
            </h1>
            <p className="text-gray-300 text-lg mt-2">Manage investment pools and track performance with professional tools</p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-primary-blue to-primary-blue-light text-black hover:from-primary-blue/90 hover:to-primary-blue-light/90 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-primary-blue/25"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Pool
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card variant="floating" className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border border-primary-blue/20 hover:border-primary-blue/40 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Total Pools</p>
                    <p className="text-3xl font-bold text-white">{stats.totalPools}</p>
                  </div>
                  <div className="p-3 bg-primary-blue/20 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-primary-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card variant="floating" className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border border-primary-blue-light/20 hover:border-primary-blue-light/40 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Total Value Locked</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(stats.totalValueLocked)}</p>
                  </div>
                  <div className="p-3 bg-primary-blue-light/20 rounded-xl">
                    <DollarSign className="w-8 h-8 text-primary-blue-light" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card variant="floating" className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border border-cyan-400/20 hover:border-cyan-400/40 transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Your Pools</p>
                    <p className="text-3xl font-bold text-white">{pools.length}</p>
                  </div>
                  <div className="p-3 bg-cyan-400/20 rounded-xl">
                    <Users className="w-8 h-8 text-cyan-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Pools List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-bold text-white">Your Investment Pools</h2>
        
        {pools.length === 0 ? (
          <Card variant="floating">
            <CardContent className="p-8 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No Pools Yet</h3>
              <p className="text-gray-400 mb-4">Create your first investment pool to get started</p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-primary-blue text-midnight-900 hover:bg-primary-blue-light"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Pool
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((pool) => (
              <motion.div
                key={pool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <Card variant="floating" className="hover:scale-105 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pool.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        {pool.isActive ? (
                          <CheckCircle className="w-5 h-5 text-primary-blue" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">{pool.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-off-white">
                          {formatCurrency(pool.currentValue)} / {formatCurrency(pool.targetValue)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-blue h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(pool.currentValue, pool.targetValue)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Min Investment</p>
                        <p className="text-off-white">{formatCurrency(pool.minInvestment)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Max Investment</p>
                        <p className="text-off-white">{formatCurrency(pool.maxInvestment)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Management Fee</p>
                        <p className="text-off-white">{pool.managementFee}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Performance Fee</p>
                        <p className="text-off-white">{pool.performanceFee}%</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(pool.maturityDate)}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {pool.totalInvestors} investors
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedPool(pool);
                          setShowInvestForm(true);
                        }}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Invest
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
        </motion.div>

        {/* Create Pool Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Create New Pool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Pool Name"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter pool name"
              />
              <Input
                label="Description"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter pool description"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Target Value (HBAR)"
                  type="number"
                  value={createForm.targetValue}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, targetValue: e.target.value }))}
                  placeholder="1000"
                />
                <Input
                  label="Min Investment (HBAR)"
                  type="number"
                  value={createForm.minInvestment}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, minInvestment: e.target.value }))}
                  placeholder="10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Max Investment (HBAR)"
                  type="number"
                  value={createForm.maxInvestment}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, maxInvestment: e.target.value }))}
                  placeholder="100"
                />
                <Input
                  label="Maturity Date"
                  type="date"
                  value={createForm.maturityDate}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, maturityDate: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Management Fee (%)"
                  type="number"
                  value={createForm.managementFee}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, managementFee: e.target.value }))}
                  placeholder="2"
                />
                <Input
                  label="Performance Fee (%)"
                  type="number"
                  value={createForm.performanceFee}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, performanceFee: e.target.value }))}
                  placeholder="20"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePool}
                  className="flex-1 bg-primary-blue text-midnight-900 hover:bg-primary-blue-light"
                >
                  Create Pool
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invest Modal */}
      {showInvestForm && selectedPool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Invest in {selectedPool.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Pool Details</p>
                <div className="bg-gray-800 p-3 rounded-lg space-y-1">
                  <p className="text-sm">Target: {formatCurrency(selectedPool.targetValue)}</p>
                  <p className="text-sm">Current: {formatCurrency(selectedPool.currentValue)}</p>
                  <p className="text-sm">Min: {formatCurrency(selectedPool.minInvestment)}</p>
                  <p className="text-sm">Max: {formatCurrency(selectedPool.maxInvestment)}</p>
                </div>
              </div>
              <Input
                label="Investment Amount (HBAR)"
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowInvestForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvest}
                  className="flex-1 bg-primary-blue text-midnight-900 hover:bg-primary-blue-light"
                >
                  Invest
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
};

export default PoolDashboard;
