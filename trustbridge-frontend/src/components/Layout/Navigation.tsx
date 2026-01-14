import React from 'react';
import { useLocation } from 'react-router-dom';
import DashboardNavigation from './DashboardNavigation';

const Navigation: React.FC = () => {
  const location = useLocation();
  const isDashboardRoute = location.pathname.startsWith('/dashboard');
  const isTradingRoute = location.pathname.startsWith('/pool-trading') || 
                        location.pathname.startsWith('/trading') || 
                        location.pathname.startsWith('/pools') ||
                        location.pathname.startsWith('/pool-dashboard') ||
                        location.pathname.startsWith('/pool-token-portfolio') ||
                        location.pathname.startsWith('/staking') ||
                        location.pathname.startsWith('/governance') ||
                        location.pathname.startsWith('/spv');

  // Render dashboard navigation on dashboard routes and trading routes
  if (isDashboardRoute || isTradingRoute) {
    return <DashboardNavigation />;
  }

  // No navigation on landing page
  return null;
};

export default Navigation;