import React from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { useAdminRefresh } from '../../hooks/useAdminRefresh';
import { Shield, Crown, Building, Users, RefreshCw } from 'lucide-react';

interface AdminStatusIndicatorProps {
  className?: string;
  showRefreshButton?: boolean;
}

export const AdminStatusIndicator: React.FC<AdminStatusIndicatorProps> = ({ 
  className = '',
  showRefreshButton = true 
}) => {
  const { isAdmin, isSuperAdmin, isPlatformAdmin, isAmcAdmin, loading } = useAdmin();
  const { refreshAdminStatus } = useAdminRefresh();

  const getAdminRoleInfo = () => {
    if (isSuperAdmin) return { label: 'Super Admin', icon: Crown, color: 'text-red-600' };
    if (isPlatformAdmin) return { label: 'Platform Admin', icon: Building, color: 'text-blue-600' };
    if (isAmcAdmin) return { label: 'AMC Admin', icon: Users, color: 'text-primary-blue' };
    if (isAdmin) return { label: 'Admin', icon: Shield, color: 'text-purple-600' };
    return null;
  };

  const adminInfo = getAdminRoleInfo();

  if (!adminInfo) {
    return null;
  }

  const IconComponent = adminInfo.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <IconComponent className={`w-4 h-4 ${adminInfo.color}`} />
        <span className={`text-sm font-medium ${adminInfo.color}`}>
          {adminInfo.label}
        </span>
      </div>
      
      {showRefreshButton && (
        <button
          onClick={refreshAdminStatus}
          disabled={loading}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Refresh admin status"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};
