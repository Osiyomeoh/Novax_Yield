import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, BarChart3, Settings, X, Zap, User, LogOut, ChevronLeft, ChevronRight, ChevronDown, Shield, Coins, Vote, BarChart3 as BarChart, Building2, Crown, TreePine, Package, PieChart, Bot, Phone, ArrowLeftRight, DollarSign, FileText, Receipt, Home, Plus } from 'lucide-react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { useAdmin } from '../../contexts/AdminContext';
import { useToast } from '../../hooks/useToast';
import { useNVXBalance } from '../../hooks/useNVXBalance';
import NovaxLogo from '../UI/NovaxLogo';

const DashboardNavigation: React.FC = () => {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set(['investment'])); // Auto-expand Investment section
  const { isCollapsed, toggleSidebar, isMobileSidebarOpen, toggleMobileSidebar } = useSidebar();
  
  const { logout, user } = useAuth();
  const { disconnectWallet, address } = useWallet();
  const { isAdmin, isVerifier } = useAdmin();
  const { toast } = useToast();
  const { balance: nvxBalance, loading: nvxLoading } = useNVXBalance();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-expand sections when on related routes
  useEffect(() => {
    const investmentRoutes = ['/dashboard/marketplace', '/dashboard/staking', '/dashboard/portfolio'];
    const createRoutes = ['/dashboard/create-receivable', '/dashboard/receivables'];
    const adminRoutes = ['/dashboard/admin'];
    
    const isOnInvestmentRoute = investmentRoutes.some(route => location.pathname.startsWith(route));
    const isOnCreateRoute = createRoutes.some(route => location.pathname.startsWith(route));
    const isOnAdminRoute = adminRoutes.some(route => location.pathname.startsWith(route));
    
    const newOpenDropdowns = new Set<string>();
    if (isOnInvestmentRoute) newOpenDropdowns.add('investment');
    if (isOnCreateRoute) newOpenDropdowns.add('create');
    if (isOnAdminRoute) newOpenDropdowns.add('admin');
    
    if (newOpenDropdowns.size > 0) {
      setOpenDropdowns(prev => new Set([...prev, ...newOpenDropdowns]));
    }
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside the entire sidebar
      const sidebar = document.querySelector('nav');
      if (sidebar && !sidebar.contains(target)) {
        setIsUserDropdownOpen(false);
        // Keep Investment dropdown open when clicking outside
        setOpenDropdowns(prev => {
          const newSet = new Set(prev);
          // Keep investment open
          if (!newSet.has('investment')) {
            newSet.add('investment');
          }
          return newSet;
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle dropdown
  const toggleDropdown = (sectionId: string) => {
    console.log('🎯 Dropdown toggle clicked:', sectionId);
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
        console.log('🎯 Closing dropdown:', sectionId);
      } else {
        newSet.add(sectionId);
        console.log('🎯 Opening dropdown:', sectionId);
      }
      return newSet;
    });
  };

  // Handle navigation
  const handleNavigation = (href: string) => {
    console.log('🎯 Navigation clicked:', href);
    navigate(href);
  };

  // Handle disabled navigation (KYC required)
  const handleDisabledNavigation = (item: any) => {
    if (item.disabled) {
      toast({
        title: 'KYC Verification Required',
        description: 'Please complete your identity verification to access RWA features.',
        variant: 'destructive'
      });
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      logout();
      navigate('/');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      // Still navigate to landing page even if disconnect fails
      navigate('/');
    }
  };

  // Main navigation - always visible
  const navItems = [
    { id: 'marketplace', label: 'Marketplace', icon: TrendingUp, href: '/dashboard/marketplace' },
    { id: 'profile', label: 'Profile', icon: User, href: '/dashboard/profile' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
  ];

  // Investment section - for investors and stakers
  const investmentItems = [
    { id: 'investor-hub', label: 'Investor Hub', icon: TrendingUp, href: '/dashboard/investor-hub' },
    { id: 'pools', label: 'Pool Marketplace', icon: BarChart, href: '/dashboard/marketplace' },
    { id: 'staking', label: 'Staking Vault', icon: Coins, href: '/dashboard/staking' },
    { id: 'portfolio', label: 'My Investments', icon: PieChart, href: '/dashboard/portfolio' },
    { id: 'exchange', label: 'Exchange XTZ/NVX', icon: ArrowLeftRight, href: '/exchange' },
    { id: 'test-tokens', label: 'Get Test USDC', icon: DollarSign, href: '/get-test-tokens' },
  ];

  // Check KYC status for RWA features
  const isKYCApproved = user && user.kycStatus === 'approved';
  
  // Create section - for exporters
  const createItems = [
    { 
      id: 'create-receivable', 
      label: 'Create Receivable', 
      icon: FileText, 
      href: '/dashboard/create-receivable',
      disabled: false
    },
    { 
      id: 'my-receivables', 
      label: 'My Receivables', 
      icon: Receipt, 
      href: '/dashboard/receivables',
      disabled: false
    },
  ];

  const adminItems = [
    { id: 'admin-hub', label: 'Admin Hub', icon: Crown, href: '/dashboard/admin-hub' },
    { id: 'admin-dashboard', label: 'Admin Dashboard', icon: Crown, href: '/dashboard/admin' },
    { id: 'admin-receivables', label: 'Receivables Management', icon: FileText, href: '/dashboard/admin/receivables' },
    { id: 'admin-create-pool', label: 'Create Pool', icon: Plus, href: '/dashboard/admin/create-pool' },
    { id: 'admin-pools', label: 'Pool Management', icon: BarChart3, href: '/dashboard/admin/amc-pools' },
    { id: 'admin-yield', label: 'Yield Distribution', icon: DollarSign, href: '/dashboard/admin/yield-distribution' },
  ];

  const dropdownSections = [
    // Make Admin section FIRST and more prominent when user has admin access
    ...(isAdmin || isVerifier ? [{ 
      id: 'admin', 
      label: 'Admin', 
      icon: Crown, 
      items: adminItems,
      highlight: true // Mark admin section as highlighted
    }] : []),
    { id: 'create', label: 'Create', icon: FileText, items: createItems },
    { id: 'investment', label: 'Invest', icon: BarChart, items: investmentItems },
  ];

  // Helper functions
  const formatAddress = (addr: string | null) => {
    if (!addr) return 'Not connected';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Removed HBAR balance display

  return (
    <>
      {/* Mobile Sidebar Navigation */}
      <nav className={`lg:hidden fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-2xl z-[60] transition-all duration-300 ease-in-out ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } w-64`}>
        <div className="h-full flex flex-col w-full overflow-y-auto p-4">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-6">
            <div onClick={toggleMobileSidebar} className="flex items-center">
              <NovaxLogo size="md" showText={true} />
            </div>
            <button
              onClick={toggleMobileSidebar}
              className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:text-black hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Navigation Items */}
          <div className="flex-1 space-y-2">
            {/* Main Navigation */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.href)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-black text-white shadow-sm'
                        : 'text-gray-700 hover:text-black hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dropdown Sections */}
            <div className="space-y-1">
              {dropdownSections.map((section) => {
                const Icon = section.icon;
                const isOpen = openDropdowns.has(section.id);
                const isAdminSection = section.id === 'admin';
                const isHighlighted = (section as any).highlight;
                const hasActiveItem = section.items.some(item => location.pathname === item.href);
                
                return (
                  <div key={section.id}>
                    <button
                      onClick={() => toggleDropdown(section.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isAdminSection || isHighlighted
                          ? hasActiveItem
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg border border-purple-500'
                            : 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 hover:from-purple-100 hover:to-purple-200 border border-purple-200'
                          : hasActiveItem
                          ? 'bg-black text-white shadow-sm'
                          : 'text-gray-700 hover:text-black hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span>{section.label}</span>
                        {(isAdminSection || isHighlighted) && (
                          <span className="px-1.5 py-0.5 text-xs font-bold bg-purple-500 text-white rounded-full">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className={`ml-4 space-y-1 mt-1 ${
                        isAdminSection || isHighlighted ? 'border-l-2 border-purple-300 pl-3' : ''
                      }`}>
                        {section.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = location.pathname === item.href;
                          const isDisabled = (item as any).disabled;
                          const isComingSoon = (item as any).comingSoon;
                          return (
                            <button
                              key={item.id}
                              onClick={() => isDisabled ? handleDisabledNavigation(item) : handleNavigation(item.href)}
                              disabled={isDisabled || isComingSoon}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                isDisabled || isComingSoon
                                  ? 'text-gray-500 cursor-not-allowed opacity-50'
                                  : isActive
                                  ? isAdminSection || isHighlighted
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md border border-purple-500'
                                    : 'bg-black text-white shadow-sm'
                                  : isAdminSection || isHighlighted
                                  ? 'text-purple-700 hover:bg-purple-50'
                                  : 'text-gray-700 hover:text-black hover:bg-gray-100'
                              }`}
                            >
                              <ItemIcon className="w-4 h-4" />
                              <span>{item.label}</span>
                              {isDisabled && (
                                <Shield className="w-3 h-3 text-yellow-400 ml-auto" />
                              )}
                              {isComingSoon && (
                                <span className="ml-auto text-xs bg-gray-100 text-black px-2 py-0.5 rounded border border-gray-300">
                                  Soon
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile User Section */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="space-y-2">
              <div className="px-3 py-2 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-600">Wallet</p>
                <p className="text-sm font-mono text-black">{formatAddress(address)}</p>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-white/50 z-[50]"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Desktop Sidebar Navigation - Overlay Style */}
      <nav className={`hidden lg:flex fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-2xl z-[60] transition-all duration-300 ease-in-out group ${
        isCollapsed ? 'w-16 hover:w-56' : 'w-56'
      }`}>
        <div className={`h-full flex flex-col w-full transition-all duration-300 ease-in-out overflow-y-auto ${
          isCollapsed ? 'p-3 group-hover:p-4' : 'p-4'
        }`}>

          {/* Toggle Button - Professional Styling */}
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleSidebar}
              className="group relative p-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 hover:text-black transition-all duration-200"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 transition-transform duration-200" />
              ) : (
                <ChevronLeft className="w-4 h-4 transition-transform duration-200" />
              )}
            </button>
          </div>

          {/* Logo */}
          <div className="block mb-4">
            <div className={`flex items-center transition-all duration-300 cursor-pointer group/logo ${isCollapsed ? 'justify-center group-hover:justify-start' : ''}`}>
              {isCollapsed ? (
                <NovaxLogo variant="icon" size="md" />
              ) : (
                <NovaxLogo size="md" showText={true} />
              )}
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex flex-col gap-2 flex-1">
            {/* Main Navigation Items */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.href)}
                  className={`group relative flex items-center rounded-lg transition-all duration-200 ease-out w-full text-left
                    ${isCollapsed ? 'justify-center p-2.5 group-hover:justify-start group-hover:gap-2.5' : 'gap-2.5 p-2.5'}
                    ${isActive 
                      ? 'bg-black text-white shadow-md border border-black' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-black'
                    }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`${isCollapsed ? 'w-5 h-5 group-hover:w-4 group-hover:h-4' : 'w-4 h-4'} transition-all duration-200 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-black'}`} />
                  <span className={`text-sm font-medium transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 overflow-hidden' : 'w-auto opacity-100'}`}>{item.label}</span>
                  
                  {/* Enhanced tooltip for collapsed state - only show when not hovering */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-white backdrop-blur-sm border border-gray-300 rounded-lg text-sm text-black whitespace-nowrap opacity-0 group-hover:opacity-0 transition-all duration-300 pointer-events-none z-[70] shadow-xl shadow-gray-200">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Dropdown Sections - Only show when expanded */}
          {!isCollapsed && (
              <div className="mt-4 space-y-2">
                {dropdownSections.map((section) => {
                  const Icon = section.icon;
                  const isOpen = openDropdowns.has(section.id);
                  const hasActiveItem = section.items.some(item => location.pathname === item.href);
                  const isAdminSection = section.id === 'admin';
                  const isHighlighted = (section as any).highlight;
                  
                  return (
                    <div key={section.id} className="space-y-1">
                      {/* Dropdown Header */}
                      <button
                        onClick={() => toggleDropdown(section.id)}
                        className={`w-full flex items-center justify-between rounded-lg transition-all duration-200 gap-2.5 p-2.5 relative
                          ${isAdminSection || isHighlighted
                            ? hasActiveItem 
                              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg border border-purple-500' 
                              : 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 hover:from-purple-100 hover:to-purple-200 border border-purple-200'
                            : hasActiveItem 
                            ? 'bg-black text-white shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                          }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 transition-all duration-200 ${
                            isAdminSection || isHighlighted
                              ? hasActiveItem ? 'text-white' : 'text-purple-600'
                              : hasActiveItem ? 'text-white' : 'text-gray-600 group-hover:text-black'
                          }`} />
                          <span className="text-sm font-medium transition-all duration-200">{section.label}</span>
                          {(isAdminSection || isHighlighted) && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-purple-500 text-white rounded-full">
                              ADMIN
                            </span>
                          )}
                          {isOpen && <div className={`w-1.5 h-1.5 rounded-full ${
                            isAdminSection || isHighlighted ? 'bg-white' : 'bg-black'
                          }`}></div>}
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                          isAdminSection || isHighlighted
                            ? hasActiveItem ? 'text-white' : 'text-purple-600 dark:text-purple-400'
                            : hasActiveItem ? 'text-white' : 'text-gray-600'
                        }`} />
                      </button>

                      {/* Dropdown Items */}
                      {isOpen && (
                        <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${
                          isAdminSection || isHighlighted ? 'ml-4 border-l-2 border-purple-300  pl-3' : 'ml-4'
                        }`}>
                          {section.items.map((item) => {
                            const ItemIcon = item.icon;
                            const isActive = location.pathname === item.href;
                            const isDisabled = (item as any).disabled;
                            const isComingSoon = (item as any).comingSoon;
                            
                            return (
                              <button
                      key={item.id}
                                onClick={() => isDisabled ? handleDisabledNavigation(item) : handleNavigation(item.href)}
                                disabled={isDisabled || isComingSoon}
                                className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-200 w-full text-left ${
                                  isDisabled || isComingSoon
                                    ? 'text-gray-500 cursor-not-allowed opacity-50'
                                    : isActive
                                    ? isAdminSection || isHighlighted
                                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md border border-purple-500'
                                      : 'bg-black text-white shadow-sm'
                                    : isAdminSection || isHighlighted
                                    ? 'text-purple-700  hover:bg-purple-50 '
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                      }`}
                    >
                                <ItemIcon className={`w-3.5 h-3.5 transition-all duration-200 ${
                                  isDisabled || isComingSoon 
                                    ? 'text-gray-500' 
                                    : isActive 
                                    ? isAdminSection || isHighlighted ? 'text-white' : 'text-white'
                                    : isAdminSection || isHighlighted
                                    ? 'text-purple-600'
                                    : 'text-gray-600 group-hover:text-black'
                                }`} />
                      <span className="text-xs font-medium transition-all duration-200">{item.label}</span>
                      
                      {/* KYC Required indicator */}
                      {isDisabled && (
                        <Shield className="w-3 h-3 text-yellow-400 ml-auto" />
                      )}
                      
                      {/* Coming Soon indicator */}
                      {isComingSoon && (
                        <span className="ml-auto text-xs bg-gray-300 text-gray-700 px-1.5 py-0.5 rounded border border-gray-400 font-medium">
                          Soon
                        </span>
                      )}
                      
                      {/* Active indicator */}
                      {isActive && !isDisabled && !isComingSoon && (
                        <div className="absolute right-2 w-1.5 h-1.5 bg-black rounded-full"></div>
                      )}
                              </button>
                  );
                })}
            </div>
          )}
                      </div>
                  );
                })}
            </div>
          )}

          </div>

          {/* User Profile / Wallet */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all duration-200 group ${
                  isCollapsed ? 'justify-center group-hover:justify-start group-hover:gap-2.5' : ''
                } bg-gray-100 hover:bg-gray-200 border border-gray-300`}
              >
                <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center">
                  <span className="text-white font-bold text-xs">
                    {address ? 'U' : 'U'}
                  </span>
                  </div>
                <div className={`transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 overflow-hidden' : 'w-auto opacity-100'}`}>
                  <p className="text-xs font-semibold text-black">
                    {address ? 'Connected' : 'Not connected'}
                  </p>
                  {nvxLoading ? (
                    <p className="text-xs text-gray-600">
                      Loading...
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600">
                      {nvxBalance ? `${nvxBalance.toFixed(2)} NVX` : '0 NVX'}
                    </p>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''} ${isCollapsed ? 'hidden group-hover:block' : ''}`} />
              </button>

              {/* User Dropdown */}
              {isUserDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden z-[70]">
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={handleDisconnect}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-gray-700 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Disconnect & Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default DashboardNavigation;