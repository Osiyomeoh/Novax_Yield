import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import Button from '../components/UI/Button';
import { 
  Crown, 
  FileText, 
  BarChart3, 
  DollarSign,
  ArrowRight, 
  CheckCircle, 
  Loader2,
  AlertCircle,
  TrendingUp,
  Users,
  Package,
  Eye,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { useWallet } from '../contexts/WalletContext';
import { useToast } from '../hooks/useToast';
import { novaxContractService } from '../services/novaxContractService';
import { hasAMCRoleOnPoolManager } from '../services/contractRoleService';
import { ethers } from 'ethers';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: string;
  href: string;
  completed: boolean;
  available: boolean;
  status?: 'pending' | 'in-progress' | 'completed';
}

const AdminHub: React.FC = () => {
  const { 
    isAdmin, 
    isAmcAdmin, 
    isSuperAdmin, 
    isPlatformAdmin,
    loading: adminLoading 
  } = useAdmin();
  const { address, isConnected, provider } = useWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [pendingReceivables, setPendingReceivables] = useState<number>(0);
  const [activePools, setActivePools] = useState<number>(0);
  const [totalInvested, setTotalInvested] = useState<string>('0');
  const [hasOnChainRole, setHasOnChainRole] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address && provider && (isAmcAdmin || isSuperAdmin || isPlatformAdmin)) {
      fetchAdminData();
      checkOnChainRole();
    } else {
      setLoading(false);
    }
  }, [isConnected, address, provider, isAmcAdmin, isSuperAdmin, isPlatformAdmin]);

  const checkOnChainRole = async () => {
    if (!address || !provider) return;
    
    try {
      const hasRole = await hasAMCRoleOnPoolManager(address, provider);
      setHasOnChainRole(hasRole);
      
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

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (!provider || !address) return;

      // Initialize contract service
      const signer = await provider.getSigner();
      novaxContractService.initialize(signer, provider);

      // Fetch pending receivables (status = 1 = VERIFIED, ready for pool creation)
      try {
        const allReceivables = await novaxContractService.getAllReceivables();
        const receivableDetails = await Promise.all(
          allReceivables.slice(0, 20).map(async (id: string) => {
            try {
              const rec = await novaxContractService.getReceivable(id);
              return {
                id,
                status: Number(rec.status || 0)
              };
            } catch (error) {
              return null;
            }
          })
        );
        
        const verified = receivableDetails.filter((r: any) => r && r.status === 1).length;
        setPendingReceivables(verified);
      } catch (error) {
        console.error('Error fetching receivables:', error);
      }

      // Fetch active pools
      try {
        const pools = await novaxContractService.getAllPools();
        setActivePools(pools.length);
        
        // Calculate total invested
        let total = BigInt(0);
        for (const poolId of pools) {
          try {
            const pool = await novaxContractService.getPool(poolId);
            total += BigInt(pool.totalInvested || 0);
          } catch (error) {
            // Skip if pool fetch fails
          }
        }
        setTotalInvested(ethers.formatUnits(total, 6));
      } catch (error) {
        console.error('Error fetching pools:', error);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasAdminAccess = isAdmin || isAmcAdmin || isSuperAdmin || isPlatformAdmin;

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">Admin Access Required</h1>
            <p className="text-gray-600 mb-8">
              You need admin privileges to access this page
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const steps: Step[] = [
    {
      id: 1,
      title: 'Review Receivables',
      description: 'Review and verify trade receivables submitted by exporters',
      icon: FileText,
      action: 'Review Receivables',
      href: '/dashboard/admin/receivables',
      completed: false,
      available: true,
      status: pendingReceivables > 0 ? 'in-progress' : 'pending'
    },
    {
      id: 2,
      title: 'Create Pool from Receivable',
      description: 'Create an investment pool from a verified receivable',
      icon: Plus,
      action: 'Create Pool',
      href: '/dashboard/admin/create-pool',
      completed: false,
      available: pendingReceivables > 0 && hasOnChainRole,
      status: pendingReceivables > 0 && hasOnChainRole ? 'pending' : 'pending'
    },
    {
      id: 3,
      title: 'Manage Pools',
      description: 'View and manage all active pools, track investments',
      icon: BarChart3,
      action: 'Manage Pools',
      href: '/dashboard/admin/amc-pools',
      completed: false,
      available: true,
      status: activePools > 0 ? 'in-progress' : 'pending'
    },
    {
      id: 4,
      title: 'Record Payment',
      description: 'Record when importer pays the receivable',
      icon: DollarSign,
      action: 'Record Payment',
      href: '/dashboard/admin/amc-pools',
      completed: false,
      available: activePools > 0,
      status: 'pending'
    },
    {
      id: 5,
      title: 'Distribute Yield',
      description: 'Distribute yield to investors after payment received',
      icon: TrendingUp,
      action: 'Distribute Yield',
      href: '/dashboard/admin/yield-distribution',
      completed: false,
      available: activePools > 0,
      status: 'pending'
    }
  ];

  const getNextStep = () => {
    return steps.find(step => step.available && !step.completed) || steps[0];
  };

  const nextStep = getNextStep();

  return (
    <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold">Admin Hub</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Complete guide to manage receivables and create investment pools
          </p>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-blue-500" />
                <span className="text-sm text-gray-600">Pending Receivables</span>
              </div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  pendingReceivables
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Ready for pool creation</p>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-6 h-6 text-green-500" />
                <span className="text-sm text-gray-600">Active Pools</span>
              </div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  activePools
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card variant="default">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-6 h-6 text-purple-500" />
                <span className="text-sm text-gray-600">Total Invested</span>
              </div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  `$${parseFloat(totalInvested).toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}`
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Across all pools</p>
            </CardContent>
          </Card>
        </div>

        {/* On-Chain Role Warning */}
        {!hasOnChainRole && (isAmcAdmin || isSuperAdmin || isPlatformAdmin) && (
          <Card variant="default" className="mb-12 bg-yellow-50 border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-black mb-2">On-Chain AMC Role Required</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    You have backend admin access but need the AMC_ROLE on the PoolManager contract to create pools on-chain.
                  </p>
                  <Button
                    variant="outline"
                    onClick={checkOnChainRole}
                    className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Role Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Step CTA */}
        {nextStep && (
          <Card variant="default" className="mb-12 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {nextStep.id}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Next Step: {nextStep.title}</h3>
                      <p className="text-gray-600">{nextStep.description}</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(nextStep.href)}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={!nextStep.available}
                >
                  {nextStep.action}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Admin Flow */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Complete Admin Flow</h2>
          <div className="space-y-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === nextStep?.id;
              const isCompleted = step.completed;
              
              return (
                <Card 
                  key={step.id} 
                  variant="default"
                  className={`transition-all ${
                    isActive ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                  } ${!step.available ? 'opacity-50' : ''}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Step Number */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                        isCompleted 
                          ? 'bg-green-600 text-white' 
                          : isActive
                          ? 'bg-purple-600 text-white'
                          : step.status === 'in-progress'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          step.id
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Icon className={`w-6 h-6 ${
                              isCompleted ? 'text-green-600' : 
                              isActive ? 'text-purple-600' : 
                              step.status === 'in-progress' ? 'text-blue-500' : 
                              'text-gray-400'
                            }`} />
                            <h3 className={`text-xl font-bold ${
                              isCompleted ? 'text-gray-500 line-through' : ''
                            }`}>
                              {step.title}
                            </h3>
                          </div>
                          {step.status === 'in-progress' && (
                            <span className="text-sm text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                              In Progress
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-sm text-green-600 font-medium">Completed</span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-4">{step.description}</p>
                        
                        {/* Action Button */}
                        <div className="flex items-center gap-4">
                          <Button
                            onClick={() => navigate(step.href)}
                            variant={isActive ? "default" : "outline"}
                            disabled={!step.available}
                            className={isActive ? 'bg-purple-600 hover:bg-purple-700' : ''}
                          >
                            {step.action}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                          {!step.available && (
                            <span className="text-sm text-gray-500">
                              {step.id === 2 && !hasOnChainRole 
                                ? 'On-chain AMC role required'
                                : 'Complete previous steps first'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/admin/receivables')}
                className="h-auto py-4 flex flex-col items-center"
              >
                <FileText className="w-8 h-8 mb-2" />
                <span className="font-semibold">Review Receivables</span>
                <span className="text-xs text-gray-500 mt-1">
                  {pendingReceivables} pending
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/admin/create-pool')}
                className="h-auto py-4 flex flex-col items-center"
                disabled={!hasOnChainRole || pendingReceivables === 0}
              >
                <Plus className="w-8 h-8 mb-2" />
                <span className="font-semibold">Create Pool</span>
                <span className="text-xs text-gray-500 mt-1">
                  From verified receivables
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/admin/amc-pools')}
                className="h-auto py-4 flex flex-col items-center"
              >
                <BarChart3 className="w-8 h-8 mb-2" />
                <span className="font-semibold">Manage Pools</span>
                <span className="text-xs text-gray-500 mt-1">
                  {activePools} active pools
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card variant="default" className="mt-8 bg-purple-50 border-purple-200">
          <CardContent className="p-6">
            <h3 className="font-bold text-black mb-3">Admin Workflow</h3>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li><strong>Review Receivables:</strong> Exporters submit receivables, you verify them</li>
              <li><strong>Create Pool:</strong> Create investment pool from verified receivable</li>
              <li><strong>Pool Auto-Deploys:</strong> Staking vault automatically deploys capital to pools</li>
              <li><strong>Record Payment:</strong> When importer pays, record the payment</li>
              <li><strong>Distribute Yield:</strong> Distribute yield to investors based on their investment</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminHub;


