import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, 
  Shield, 
  Users, 
  BarChart3, 
  Settings, 
  CheckCircle,
  TrendingUp,
  DollarSign,
  Building2,
  FileText
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { useWallet } from '../contexts/WalletContext';
import { AdminGuard } from '../contexts/AdminContext';
import { novaxContractService } from '../services/novaxContractService';
// Using Arbitrum Sepolia/Novax contracts
import { ethers } from 'ethers';
import Card, { CardContent } from '../components/UI/Card';
import Button from '../components/UI/Button';
import AdminManagement from '../components/Admin/AdminManagement';

const AdminDashboard: React.FC = () => {
  const { 
    isAdmin, 
    isVerifier, 
    isSuperAdmin, 
    isPlatformAdmin, 
    isAmcAdmin, 
    adminRoles, 
    loading 
  } = useAdmin();
  const { address, signer, isConnected, provider } = useWallet();
  const navigate = useNavigate();
  const hasAdminAccess = isAdmin || isAmcAdmin || isSuperAdmin || isPlatformAdmin;
  const [stats, setStats] = useState({
    totalVerifications: 0,
    activeVerifications: 0,
    totalAssets: 0,
    pendingAssets: 0,
    pendingReceivables: 0,
    verifiedReceivables: 0,
    activePools: 0,
    fundedPools: 0,
    totalInvested: '0',
    poolsReadyForYield: 0,
    totalPendingYield: '0'
  });

  useEffect(() => {
    // Load admin statistics from Novax contracts
    if (isConnected && provider && (isAmcAdmin || isSuperAdmin || isPlatformAdmin)) {
      loadAdminStats();
    }
  }, [isConnected, provider, isAmcAdmin, isSuperAdmin, isPlatformAdmin]);

  const loadAdminStats = async () => {
    try {
      if (!provider || !address) return;

      // Initialize contract service
      if (signer) {
        novaxContractService.initialize(signer, provider);
      } else {
        // Use provider only for read operations
        const tempSigner = {} as ethers.Signer;
        novaxContractService.initialize(tempSigner, provider);
      }

      // Fetch receivables
      let pendingReceivables = 0;
      let verifiedReceivables = 0;
      try {
        const allReceivables = await novaxContractService.getAllReceivables();
        const receivableDetails = await Promise.all(
          allReceivables.slice(0, 50).map(async (id: string) => {
            try {
              const rec = await novaxContractService.getReceivable(id);
              return {
                status: Number(rec.status || 0),
                verified: Number(rec.status || 0) === 1 // VERIFIED = 1
              };
            } catch (error) {
              console.error(`Error fetching receivable ${id}:`, error);
              return null;
            }
          })
        );

        const validReceivables = receivableDetails.filter((r): r is { status: number; verified: boolean } => r !== null);
        pendingReceivables = validReceivables.filter(r => r.status === 0).length; // PENDING = 0
        verifiedReceivables = validReceivables.filter(r => r.verified).length;
      } catch (error) {
        console.error('Error fetching receivables:', error);
      }

      // Fetch pools and calculate yield
      let activePools = 0;
      let fundedPools = 0;
      let totalInvested = '0';
      let poolsReadyForYield = 0;
      let totalPendingYield = '0';
      try {
        const allPools = await novaxContractService.getAllPools();
        const poolDetails = await Promise.all(
          allPools.slice(0, 50).map(async (id: string) => {
            try {
              const pool = await novaxContractService.getPool(id);
              return {
                status: Number(pool.status || 0), // 0=ACTIVE, 1=FUNDED, 2=MATURED, 3=PAID, 4=DEFAULTED, 5=CLOSED, 6=PAUSED
                totalInvested: pool.totalInvested || 0n,
                apr: pool.apr || 0n,
                createdAt: Number(pool.createdAt || 0),
                maturityDate: Number(pool.maturityDate || 0),
                totalPaid: pool.totalPaid || 0n,
                targetAmount: pool.targetAmount || 0n
              };
            } catch (error) {
              console.error(`Error fetching pool ${id}:`, error);
              return null;
            }
          })
        );

        const validPools = poolDetails.filter((p): p is { 
          status: number; 
          totalInvested: bigint;
          apr: bigint;
          createdAt: number;
          maturityDate: number;
          totalPaid: bigint;
          targetAmount: bigint;
        } => p !== null);
        
        activePools = validPools.filter(p => p.status === 0).length; // ACTIVE = 0
        fundedPools = validPools.filter(p => p.status === 1).length; // FUNDED = 1
        
        // Calculate total invested
        const totalInvestedBigInt = validPools.reduce((sum, p) => sum + (p.totalInvested || 0n), 0n);
        totalInvested = ethers.formatUnits(totalInvestedBigInt, 6); // USDC has 6 decimals
        
        // Calculate yield for pools ready for distribution (status = PAID = 3)
        const paidPools = validPools.filter(p => p.status === 3); // PAID = 3
        poolsReadyForYield = paidPools.length;
        
        // Calculate total pending yield using the same formula as the contract
        // totalYield = (apr * daysHeld * totalInvested) / (365 * 10000)
        let totalPendingYieldBigInt = 0n;
        for (const pool of paidPools) {
          if (pool.maturityDate > 0 && pool.createdAt > 0 && pool.totalInvested > 0n && pool.apr > 0n) {
            const daysHeld = BigInt(Math.floor((pool.maturityDate - pool.createdAt) / (24 * 60 * 60)));
            if (daysHeld > 0n) {
              // Use BigInt arithmetic to match contract precision
              const totalYield = (pool.apr * daysHeld * pool.totalInvested) / (365n * 10000n);
              totalPendingYieldBigInt += totalYield;
            }
          }
        }
        totalPendingYield = ethers.formatUnits(totalPendingYieldBigInt, 6); // USDC has 6 decimals
      } catch (error) {
        console.error('Error fetching pools:', error);
      }

      setStats({
        totalAssets: 0, // RWA assets not used in Novax Yield
        pendingAssets: 0, // RWA assets not used in Novax Yield
        totalVerifications: verifiedReceivables,
        activeVerifications: verifiedReceivables,
        pendingReceivables,
        verifiedReceivables,
        activePools,
        fundedPools,
        totalInvested,
        poolsReadyForYield,
        totalPendingYield
      });
    } catch (error) {
      console.error('Failed to load admin stats:', error);
      // Set empty stats on error
      setStats({
        totalAssets: 0,
        pendingAssets: 0,
        totalVerifications: 0,
        activeVerifications: 0,
        pendingReceivables: 0,
        verifiedReceivables: 0,
        activePools: 0,
        fundedPools: 0,
        totalInvested: '0',
        poolsReadyForYield: 0,
        totalPendingYield: '0'
      });
    }
  };

  // Organize admin actions by category and role
  const adminActions: Array<{
    id: string;
    title: string;
    description: string;
    icon: any;
    href: string;
    available: boolean;
    category: 'core' | 'amc' | 'system';
    priority: number;
  }> = [
    // Novax Yield - Receivables Management (AMC Admins)
    {
      id: 'receivables-management',
      title: 'Receivables Management',
      description: 'View and verify trade receivables for pool creation',
      icon: FileText,
      href: '/dashboard/admin/receivables',
      available: isAmcAdmin || isSuperAdmin || isPlatformAdmin,
      category: 'amc',
      priority: 1
    },
    
    // AMC Management (AMC Admins & Super Admins)
    {
      id: 'amc-pool-management',
      title: 'Pool Management',
      description: 'Create and manage investment pools',
      icon: BarChart3,
      href: '/dashboard/admin/amc-pools',
      available: isAmcAdmin || isSuperAdmin || isPlatformAdmin,
      category: 'amc',
      priority: 2
    },
    {
      id: 'dividend-management',
      title: 'Yield Distribution',
      description: 'Distribute yield to investors after payment received',
      icon: DollarSign,
      href: '/dashboard/admin/dividend-management',
      available: isAmcAdmin || isSuperAdmin || isPlatformAdmin,
      category: 'amc',
      priority: 3
    },
    
    // Removed RWA-related actions (not needed for Novax Yield receivables flow)
    // - Asset Management (RWA)
    // - Verification Dashboard (RWA)
    // - AMC Dashboard (RWA)
    
    // User & System Management (Super Admins & Platform Admins)
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      href: '/dashboard/admin/users',
      available: false,
      category: 'system',
      priority: 1
    },
    {
      id: 'system-settings',
      title: 'System Settings',
      description: 'Configure platform settings and parameters',
      icon: Settings,
      href: '/dashboard/settings',
      available: isSuperAdmin || isPlatformAdmin,
      category: 'system',
      priority: 2
    },
    {
      id: 'analytics',
      title: 'Admin Analytics',
      description: 'View platform analytics and reports',
      icon: TrendingUp,
      href: '/dashboard/analytics', // Use general analytics page for now
      available: isAdmin || isVerifier || isAmcAdmin,
      category: 'system',
      priority: 3
    }
  ];

  // Filter and sort admin actions by availability and priority
  const availableActions = adminActions
    .filter(action => action.available)
    .sort((a, b) => {
      // Sort by category first, then priority
      const categoryOrder = { core: 1, amc: 2, system: 3 };
      const categoryDiff = (categoryOrder[a.category as keyof typeof categoryOrder] || 99) - (categoryOrder[b.category as keyof typeof categoryOrder] || 99);
      if (categoryDiff !== 0) return categoryDiff;
      return a.priority - b.priority;
    });

  const statCards = [
    {
      title: 'Pending Receivables',
      value: stats.pendingReceivables,
      icon: FileText,
      description: 'Awaiting verification'
    },
    {
      title: 'Verified Receivables',
      value: stats.verifiedReceivables,
      icon: CheckCircle,
      description: 'Ready for pool creation'
    },
    {
      title: 'Active Pools',
      value: stats.activePools,
      icon: BarChart3,
      description: 'Open for investment'
    },
    {
      title: 'Funded Pools',
      value: stats.fundedPools,
      icon: TrendingUp,
      description: 'Fully funded'
    },
    {
      title: 'Total Invested',
      value: `$${parseFloat(stats.totalInvested).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      description: 'Total USDC invested'
    },
    {
      title: 'Pools Ready for Yield',
      value: stats.poolsReadyForYield,
      icon: DollarSign,
      description: 'Ready for distribution'
    },
    {
      title: 'Total Pending Yield',
      value: `$${parseFloat(stats.totalPendingYield).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      description: 'Calculated yield to distribute'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminGuard 
      requireVerifier={true}
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Crown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Admin privileges required to access this page.
            </p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 text-black p-8 sm:p-12 lg:p-16">
        <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12">
        {/* Header - Simple black and white style */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-medium text-black mb-2">Admin Dashboard</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage and monitor the TrustBridge platform</p>
          {hasAdminAccess && (
            <div className="flex items-center gap-2 mt-3">
              <span className="px-2 py-0.5 bg-black text-white text-xs font-medium rounded">
                ADMIN ACCESS
              </span>
              {(isAmcAdmin || isSuperAdmin || isPlatformAdmin) && (
                <span className="px-2 py-0.5 bg-gray-800 text-white text-xs font-medium rounded">
                  {isSuperAdmin ? 'SUPER ADMIN' : isAmcAdmin ? 'AMC ADMIN' : 'PLATFORM ADMIN'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Admin Status Banner - Simple black and white */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-gray-100 rounded-lg">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-medium text-black mb-1">
                  Admin Access Active
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {isAdmin 
                    ? 'Full administrative access granted. You can manage all platform functions.'
                    : 'Verifier access granted. You can review and approve attestor applications.'
                  }
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-lg sm:text-xl font-medium text-black">
                {adminRoles.isAdmin ? 'ADMIN' : 'VERIFIER'}
              </div>
              <div className="text-xs text-gray-500">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} variant="default">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <p className="text-xs text-gray-600 uppercase tracking-wide">{stat.title}</p>
                  </div>
                  <p className="text-2xl font-medium text-black mb-1">{stat.value}</p>
                  {stat.description && (
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Admin Actions - Organized by Category */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl font-medium text-black mb-6">Admin Actions</h2>
          
          {/* Core Asset Management Section */}
          {(isAdmin || isVerifier || isAmcAdmin) && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-4">Core Asset Management</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {availableActions
                  .filter(action => action.category === 'core')
                  .map((action) => {
                    const Icon = action.icon;
                    return (
                      <Card 
                        key={action.id}
                        variant="default"
                        className="h-full transition-all duration-200 hover:shadow-md cursor-pointer border-gray-300"
                        onClick={() => navigate(action.href)}
                      >
                        <CardContent className="p-6">
                          <div className="text-center h-full flex flex-col">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Icon className="w-6 h-6 text-gray-600" />
                            </div>
                            <h3 className="text-base font-medium text-black mb-2 min-h-[2.5rem] flex items-center justify-center">
                              {action.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-2">
                              {action.description}
                            </p>
                            <Button 
                              variant="default"
                              size="sm" 
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(action.href);
                              }}
                            >
                              Access
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* AMC Management Section */}
          {(isAmcAdmin || isSuperAdmin || isPlatformAdmin) && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-4">AMC Management</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {availableActions
                  .filter(action => action.category === 'amc')
                  .map((action) => {
                    const Icon = action.icon;
                    return (
                      <Card 
                        key={action.id}
                        variant="default"
                        className="h-full transition-all duration-200 hover:shadow-md cursor-pointer border-gray-300"
                        onClick={() => navigate(action.href)}
                      >
                        <CardContent className="p-6">
                          <div className="text-center h-full flex flex-col">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Icon className="w-6 h-6 text-gray-600" />
                            </div>
                            <h3 className="text-base font-medium text-black mb-2 min-h-[2.5rem] flex items-center justify-center">
                              {action.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-2">
                              {action.description}
                            </p>
                            <Button 
                              variant="default"
                              size="sm" 
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(action.href);
                              }}
                            >
                              Access
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {/* System Management Section */}
          {(isAdmin || isSuperAdmin || isPlatformAdmin) && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-4">System Management</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {availableActions
                  .filter(action => action.category === 'system')
                  .map((action) => {
                    const Icon = action.icon;
                    return (
                      <Card 
                        key={action.id}
                        variant="default"
                        className="h-full transition-all duration-200 hover:shadow-md cursor-pointer border-gray-300"
                        onClick={() => navigate(action.href)}
                      >
                        <CardContent className="p-6">
                          <div className="text-center h-full flex flex-col">
                            <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Icon className="w-6 h-6 text-gray-600" />
                            </div>
                            <h3 className="text-base font-medium text-black mb-2 min-h-[2.5rem] flex items-center justify-center">
                              {action.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-2">
                              {action.description}
                            </p>
                            <Button 
                              variant="default"
                              size="sm" 
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(action.href);
                              }}
                            >
                              Access
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions - Based on Role and Stats */}
        <div>
          <h2 className="text-xl font-medium text-black mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Receivables Management Quick Action */}
            {(isAmcAdmin || isSuperAdmin || isPlatformAdmin) && (
              <Card variant="default">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <FileText className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-black mb-1">
                        Review Receivables
                      </h3>
                      <p className="text-sm text-gray-600">
                        {stats.pendingReceivables} pending {stats.pendingReceivables === 1 ? 'receivable' : 'receivables'}
                      </p>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={() => {
                        navigate('/dashboard/admin/receivables');
                      }}
                    >
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AMC Dashboard Quick Action */}
            {(isAmcAdmin || isSuperAdmin || isPlatformAdmin) && (
              <Card variant="default">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <Building2 className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-black mb-1">
                        AMC Dashboard
                      </h3>
                      <p className="text-sm text-gray-600">
                        Complete inspections & transfers
                      </p>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={() => {
                        navigate('/dashboard/amc-dashboard');
                      }}
                    >
                      Access
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analytics Quick Action */}
            {(isAdmin || isVerifier || isAmcAdmin) && (
              <Card variant="default">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-black mb-1">
                        Platform Analytics
                      </h3>
                      <p className="text-sm text-gray-600">
                        View detailed reports
                      </p>
                    </div>
                  <Button 
                    variant="default"
                    size="sm"
                      onClick={() => {
                        navigate('/dashboard/analytics');
                      }}
                    >
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Settings - Only for Super/Platform Admins */}
            {(isSuperAdmin || isPlatformAdmin) && (
              <Card variant="default">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <Settings className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-black mb-1">
                        System Settings
                      </h3>
                      <p className="text-sm text-gray-600">
                        Configure platform
                      </p>
                    </div>
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={() => {
                        navigate('/dashboard/settings');
                      }}
                    >
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Admin Management Section */}
        {isSuperAdmin && (
          <div className="mt-8">
            <AdminManagement />
          </div>
        )}
        </div>
      </div>
    </AdminGuard>
  );
};

export default AdminDashboard;
