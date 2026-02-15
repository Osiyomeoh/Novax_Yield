import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  X,
  DollarSign,
  Calendar,
  TrendingUp,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  ChevronDown
} from 'lucide-react';
import { useWallet } from '../../contexts/PrivyWalletContext';
import { useAdmin } from '../../contexts/AdminContext';
import { novaxContractService } from '../../services/novaxContractService';
import { hasAMCRoleOnPoolManager } from '../../services/contractRoleService';
import { ethers } from 'ethers';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Card from '../UI/Card';
import { useToast } from '../../hooks/useToast';

interface Receivable {
  receivableId: string;
  exporter: string;
  importer: string;
  amountUSD: bigint;
  dueDate: number;
  status: number;
  riskScore?: number;
  apr?: number;
}

interface CreatePoolForm {
  receivableId: string;
  targetAmount: string;
  minInvestment: string;
  maxInvestment: string;
  apr: string;
  maturityDate: string;
  tokenName: string;
  tokenSymbol: string;
  rewardPool: string; // NVX reward pool (optional)
}

const CreateNovaxPool: React.FC = () => {
  const { address, signer, isConnected, provider } = useWallet();
  const { isAmcAdmin, isSuperAdmin, isPlatformAdmin } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [hasOnChainAMCRole, setHasOnChainAMCRole] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CreatePoolForm>({
    receivableId: '',
    targetAmount: '',
    minInvestment: '100',
    maxInvestment: '10000',
    apr: '',
    maturityDate: '',
    tokenName: '',
    tokenSymbol: '',
    rewardPool: '0'
  });

  useEffect(() => {
    if (signer && provider) {
      novaxContractService.initialize(signer, provider);
    }
  }, [signer, provider]);

  useEffect(() => {
    if (isConnected && provider && (isAmcAdmin || isSuperAdmin || isPlatformAdmin)) {
      checkOnChainAMCRole();
      fetchVerifiedReceivables();
    }
  }, [isConnected, provider, isAmcAdmin, isSuperAdmin, isPlatformAdmin]);

  const checkOnChainAMCRole = async () => {
    if (!address || !provider) return;
    
    try {
      const hasRole = await hasAMCRoleOnPoolManager(address, provider);
      setHasOnChainAMCRole(hasRole);
      
      if (!hasRole && (isAmcAdmin || isSuperAdmin || isPlatformAdmin)) {
        toast({
          title: 'On-Chain Role Missing',
          description: 'You have backend admin access but not on-chain AMC_ROLE. Please contact an admin to grant the role.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to check on-chain AMC role:', error);
    }
  };

  const fetchVerifiedReceivables = async () => {
    setLoading(true);
    try {
      if (signer && provider) {
        novaxContractService.initialize(signer, provider);
      } else if (provider) {
        novaxContractService.initialize(null as any, provider);
      }

      // Get all receivables
      const receivableIds = await novaxContractService.getAllReceivables();
      
      // Fetch details and filter for verified ones
      const receivablesData = await Promise.all(
        receivableIds.map(async (id) => {
          try {
            const rec = await novaxContractService.getReceivable(id);
            return {
              receivableId: id,
              exporter: rec.exporter || '',
              importer: rec.importer || '',
              amountUSD: rec.amountUSD || BigInt(0),
              dueDate: Number(rec.dueDate || 0),
              status: Number(rec.status || 0),
              riskScore: rec.riskScore ? Number(rec.riskScore) : undefined,
              apr: rec.apr ? Number(rec.apr) : undefined,
            } as Receivable;
          } catch {
            return null;
          }
        })
      );

      // Filter for verified receivables (status = 1)
      const verified = receivablesData.filter(
        (rec): rec is Receivable => rec !== null && rec.status === 1
      );

      setReceivables(verified);
    } catch (error: any) {
      console.error('Error fetching receivables:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch receivables: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReceivableSelect = (receivableId: string) => {
    const receivable = receivables.find(r => r.receivableId === receivableId);
    if (receivable) {
      setFormData(prev => ({
        ...prev,
        receivableId,
        // Pre-fill APR from receivable if available
        apr: receivable.apr ? (receivable.apr / 100).toString() : '',
        // Pre-fill token name and symbol
        tokenName: `Pool-${receivableId.slice(0, 8)}`,
        tokenSymbol: `POOL-${receivableId.slice(0, 6).toUpperCase()}`,
        // Set target amount to receivable amount (or allow override)
        targetAmount: ethers.formatUnits(receivable.amountUSD, 6),
        // Set maturity date to receivable due date
        maturityDate: new Date(receivable.dueDate * 1000).toISOString().split('T')[0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signer) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to create a pool.',
        variant: 'destructive'
      });
      return;
    }

    // Validation
    if (!formData.receivableId) {
      toast({
        title: 'Receivable Required',
        description: 'Please select a verified receivable.',
        variant: 'destructive'
      });
      return;
    }

    const targetAmount = parseFloat(formData.targetAmount);
    const minInvestment = parseFloat(formData.minInvestment);
    const maxInvestment = parseFloat(formData.maxInvestment);
    const apr = parseFloat(formData.apr);
    const rewardPool = parseFloat(formData.rewardPool || '0');

    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast({
        title: 'Invalid Target Amount',
        description: 'Target amount must be greater than 0',
        variant: 'destructive'
      });
      return;
    }

    if (isNaN(minInvestment) || minInvestment <= 0) {
      toast({
        title: 'Invalid Min Investment',
        description: 'Minimum investment must be greater than 0',
        variant: 'destructive'
      });
      return;
    }

    if (isNaN(maxInvestment) || maxInvestment < minInvestment) {
      toast({
        title: 'Invalid Max Investment',
        description: 'Maximum investment must be >= minimum investment',
        variant: 'destructive'
      });
      return;
    }

    if (isNaN(apr) || apr < 0 || apr > 50) {
      toast({
        title: 'Invalid APR',
        description: 'APR must be between 0% and 50%',
        variant: 'destructive'
      });
      return;
    }

    const maturityDate = new Date(formData.maturityDate);
    if (isNaN(maturityDate.getTime()) || maturityDate <= new Date()) {
      toast({
        title: 'Invalid Maturity Date',
        description: 'Maturity date must be in the future',
        variant: 'destructive'
      });
      return;
    }

    // Check on-chain AMC role before creating pool
    if (!hasOnChainAMCRole && address && provider) {
      const hasRole = await hasAMCRoleOnPoolManager(address, provider);
      if (!hasRole) {
        toast({
          title: 'Access Denied',
          description: 'You do not have AMC_ROLE on the contract. Only AMC admins can create pools.',
          variant: 'destructive'
        });
        return;
      }
      setHasOnChainAMCRole(true);
    }

    setCreating(true);
    try {
      // Convert to contract format
      const targetAmountUSDC = ethers.parseUnits(formData.targetAmount, 6);
      const minInvestmentUSDC = ethers.parseUnits(formData.minInvestment, 6);
      const maxInvestmentUSDC = ethers.parseUnits(formData.maxInvestment, 6);
      const aprBasisPoints = Math.round(apr * 100); // Convert percentage to basis points
      const maturityTimestamp = Math.floor(maturityDate.getTime() / 1000);
      const rewardPoolNVX = ethers.parseUnits(formData.rewardPool || '0', 18);

      // Create pool (poolType = 1 for RECEIVABLE)
      const result = await novaxContractService.createPool(
        1, // RECEIVABLE
        formData.receivableId,
        targetAmountUSDC,
        minInvestmentUSDC,
        maxInvestmentUSDC,
        aprBasisPoints,
        maturityTimestamp,
        rewardPoolNVX,
        formData.tokenName,
        formData.tokenSymbol
      );

      toast({
        title: 'Pool Created Successfully!',
        description: `Pool created with ID: ${result.poolId.slice(0, 16)}...`,
        variant: 'default'
      });

      // Navigate to pool management
      navigate('/dashboard/admin/amc-pools');
    } catch (error: any) {
      console.error('Error creating pool:', error);
      toast({
        title: 'Pool Creation Failed',
        description: error.message || 'Failed to create pool. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const formatAmount = (amount: bigint) => {
    return ethers.formatUnits(amount, 6);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter receivables based on search term
  const filteredReceivables = receivables.filter(rec => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      rec.receivableId.toLowerCase().includes(search) ||
      formatAmount(rec.amountUSD).includes(search) ||
      formatDate(rec.dueDate).toLowerCase().includes(search)
    );
  });

  // Get selected receivable details
  const selectedReceivable = receivables.find(r => r.receivableId === formData.receivableId);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Wallet Not Connected</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to create pools.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Investment Pool</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receivable Selection - Compact Dropdown */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Select Receivable</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">Loading verified receivables...</span>
              </div>
            ) : receivables.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No verified receivables available.</p>
                <p className="text-xs text-gray-500 mt-1">Please verify receivables first.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search/Filter Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={`Search ${receivables.length} receivables by ID, amount, or date...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4"
                  />
                </div>

                {/* Dropdown Select */}
                <div className="relative">
                  <select
                    value={formData.receivableId}
                    onChange={(e) => handleReceivableSelect(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                    disabled={creating}
                  >
                    <option value="">-- Select a receivable --</option>
                    {filteredReceivables.map((receivable) => (
                      <option key={receivable.receivableId} value={receivable.receivableId}>
                        {receivable.receivableId.slice(0, 20)}... | ${formatAmount(receivable.amountUSD)} | {formatDate(receivable.dueDate)} | APR: {receivable.apr ? (receivable.apr / 100).toFixed(2) + '%' : 'N/A'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Selected Receivable Details - Compact */}
                {selectedReceivable && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">Selected Receivable</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">ID</p>
                        <p className="font-mono text-gray-900">{selectedReceivable.receivableId.slice(0, 12)}...</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Amount</p>
                        <p className="font-semibold text-gray-900">${formatAmount(selectedReceivable.amountUSD)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Due Date</p>
                        <p className="font-medium text-gray-900">{formatDate(selectedReceivable.dueDate)}</p>
                      </div>
                      {selectedReceivable.riskScore !== undefined && selectedReceivable.apr !== undefined && (
                        <div>
                          <p className="text-gray-500">APR / Risk</p>
                          <p className="font-medium text-gray-900">{(selectedReceivable.apr / 100).toFixed(2)}% / {selectedReceivable.riskScore}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {searchTerm && filteredReceivables.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">No receivables match your search.</p>
                )}
              </div>
            )}
          </Card>

          {/* Pool Configuration */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Pool Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Amount (USDC)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Investment (USDC)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minInvestment}
                  onChange={(e) => setFormData(prev => ({ ...prev, minInvestment: e.target.value }))}
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Investment (USDC)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.maxInvestment}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxInvestment: e.target.value }))}
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  APR (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  step="0.1"
                  value={formData.apr}
                  onChange={(e) => setFormData(prev => ({ ...prev, apr: e.target.value }))}
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maturity Date
                </label>
                <Input
                  type="date"
                  value={formData.maturityDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, maturityDate: e.target.value }))}
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reward Pool (NVX) - Optional
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rewardPool}
                  onChange={(e) => setFormData(prev => ({ ...prev, rewardPool: e.target.value }))}
                  disabled={creating}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token Name
                </label>
                <Input
                  type="text"
                  value={formData.tokenName}
                  onChange={(e) => setFormData(prev => ({ ...prev, tokenName: e.target.value }))}
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token Symbol
                </label>
                <Input
                  type="text"
                  value={formData.tokenSymbol}
                  onChange={(e) => setFormData(prev => ({ ...prev, tokenSymbol: e.target.value }))}
                  required
                  disabled={creating}
                  maxLength={10}
                />
              </div>
            </div>
          </Card>

          {/* Submit Button - Sticky at bottom */}
          <div className="sticky bottom-0 bg-gray-50 pt-4 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-t border-gray-200">
            <div className="max-w-4xl mx-auto flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/admin/amc-pools')}
                disabled={creating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !formData.receivableId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Pool...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Pool
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNovaxPool;

