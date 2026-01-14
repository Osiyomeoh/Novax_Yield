import { useAdmin } from '../contexts/AdminContext';

/**
 * Hook to provide admin refresh functionality
 * Useful for components that need to refresh admin status
 */
export const useAdminRefresh = () => {
  const { refreshAdminStatus, clearAdminState } = useAdmin();

  const handleRefresh = async () => {
    try {
      await refreshAdminStatus();
    } catch (error) {
      console.error('Error refreshing admin status:', error);
    }
  };

  const handleClearAndRefresh = async () => {
    try {
      clearAdminState();
      await refreshAdminStatus();
    } catch (error) {
      console.error('Error clearing and refreshing admin status:', error);
    }
  };

  return {
    refreshAdminStatus: handleRefresh,
    clearAndRefresh: handleClearAndRefresh,
    clearAdminState
  };
};
