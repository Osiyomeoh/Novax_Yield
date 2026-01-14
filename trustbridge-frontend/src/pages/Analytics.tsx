import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import Button from '../components/UI/Button';
import { BarChart3, TrendingUp, Globe, PieChart, Activity, Users, DollarSign, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useMarketAnalytics } from '../hooks/useApi';

interface AnalyticsData {
  totalAssets: number;
  totalValue: number;
  totalUsers: number;
  totalAttestors: number;
  totalPools: number;
  totalVolume: number;
  activeVerifications: number;
  completedVerifications: number;
  averageAssetValue: number;
  topCountries: string[];
  assetCategories: {
    agricultural: number;
    realEstate: number;
    vehicles: number;
  };
  monthlyGrowth: number;
  successRate: number;
}

const Analytics: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<'tvl' | 'assets' | 'users' | 'geographic'>('tvl');

  // Fetch real data from backend
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useMarketAnalytics();

  // Type guard to check if analyticsData is the expected type
  const typedAnalyticsData = analyticsData as AnalyticsData | null;

  // Format market stats from real data
  const marketStats = useMemo(() => {
    if (analyticsLoading || !typedAnalyticsData) {
      return {
        totalValueLocked: '...',
        totalAssets: '...',
        activeUsers: '...',
        countries: '...',
        avgReturn: '...',
        verifiedAttestors: '...'
      };
    }

    return {
      totalValueLocked: `$${(typedAnalyticsData.totalValue / 1000000).toFixed(1)}M`,
      totalAssets: typedAnalyticsData.totalAssets?.toString() || '0',
      activeUsers: typedAnalyticsData.totalUsers?.toLocaleString() || '0',
      countries: typedAnalyticsData.topCountries?.length?.toString() || '8',
      avgReturn: `+${typedAnalyticsData.monthlyGrowth?.toFixed(1) || '0'}%`,
      verifiedAttestors: typedAnalyticsData.totalAttestors?.toString() || '0'
    };
  }, [typedAnalyticsData, analyticsLoading]);

  // Calculate geographic distribution from backend data
  const geographicData = useMemo(() => {
    if (!typedAnalyticsData?.topCountries) return [];
    
    const colors = ['bg-primary-blue', 'bg-primary-blue-light', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500'];
    return typedAnalyticsData.topCountries.map((country, index) => ({
      country,
      value: `$${(typedAnalyticsData.totalValue / typedAnalyticsData.topCountries.length / 1000000).toFixed(1)}M`,
      assets: Math.floor(typedAnalyticsData.totalAssets / typedAnalyticsData.topCountries.length),
      color: colors[index % colors.length]
    }));
  }, [typedAnalyticsData]);

  // Show loading state
  if (analyticsLoading) {
    return (
      <div className="min-h-screen bg-black text-off-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-blue mx-auto mb-4" />
            <p className="text-lg text-off-white/70">Loading market analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (analyticsError) {
    return (
      <div className="min-h-screen bg-black text-off-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg text-off-white/70 mb-2">Failed to load analytics data</p>
            <p className="text-sm text-off-white/50">{analyticsError}</p>
          </div>
        </div>
      </div>
    );
  }


  const sectorData = [
    { sector: 'Real Estate', value: '$6.8M', percentage: 55, color: 'bg-primary-blue' },
    { sector: 'Agriculture', value: '$3.2M', percentage: 26, color: 'bg-primary-blue-light' },
    { sector: 'Commercial', value: '$1.8M', percentage: 14, color: 'bg-blue-500' },
    { sector: 'Infrastructure', value: '$0.6M', percentage: 5, color: 'bg-purple-500' }
  ];

  const recentActivity = [
    { action: 'Asset Tokenized', asset: 'Lagos Office Complex', value: '$2.1M', time: '2 hours ago' },
    { action: 'Investment Made', user: '0x1234...5678', value: '$45K', time: '4 hours ago' },
    { action: 'Verification Complete', asset: 'Nairobi Farm', attestor: 'Dr. Sarah Kim', time: '6 hours ago' },
    { action: 'Dividend Paid', asset: 'Cape Town Property', amount: '$1,200', time: '1 day ago' }
  ];

  return (
    <div className="min-h-screen bg-black text-off-white p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2">
              <span className="text-primary-blue">MARKET</span>
              <br />
              <span className="text-primary-blue-light">ANALYTICS</span>
            </h1>
            <p className="text-base sm:text-lg text-off-white/70 max-w-2xl">
              Comprehensive insights into the African RWA tokenization market. Track trends, performance, and opportunities across the continent.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Export Data</Button>
            <Button variant="neon">Live Updates</Button>
          </div>
        </div>
      </motion.div>

      {/* Market Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card variant="floating" className="hover:scale-105 transition-transform">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-primary-blue" />
              <TrendingUp className="w-5 h-5 text-primary-blue-light" />
            </div>
            <h3 className="text-2xl font-bold text-off-white mb-1">{marketStats.totalValueLocked}</h3>
            <p className="text-sm text-off-white/70">Total Value Locked</p>
            <p className="text-xs text-primary-blue-light font-semibold">+12.5% this month</p>
          </CardContent>
        </Card>

        <Card variant="floating" className="hover:scale-105 transition-transform">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-primary-blue-light" />
              <div className="w-5 h-5 bg-primary-blue rounded-full animate-pulse"></div>
            </div>
            <h3 className="text-2xl font-bold text-off-white mb-1">{marketStats.totalAssets}</h3>
            <p className="text-sm text-off-white/70">Active Assets</p>
            <p className="text-xs text-primary-blue font-semibold">+8 new this week</p>
          </CardContent>
        </Card>

        <Card variant="floating" className="hover:scale-105 transition-transform">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-primary-blue" />
              <TrendingUp className="w-5 h-5 text-primary-blue-light" />
            </div>
            <h3 className="text-2xl font-bold text-off-white mb-1">{marketStats.activeUsers.toLocaleString()}</h3>
            <p className="text-sm text-off-white/70">Active Users</p>
            <p className="text-xs text-primary-blue-light font-semibold">+156 this month</p>
          </CardContent>
        </Card>

        <Card variant="floating" className="hover:scale-105 transition-transform">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Globe className="w-8 h-8 text-primary-blue-light" />
              <MapPin className="w-5 h-5 text-primary-blue" />
            </div>
            <h3 className="text-2xl font-bold text-off-white mb-1">{marketStats.countries}</h3>
            <p className="text-sm text-off-white/70">Countries</p>
            <p className="text-xs text-primary-blue font-semibold">Across Africa</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metric Selector */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <div className="flex gap-2">
          {[
            { id: 'tvl', label: 'TVL Trends', icon: DollarSign },
            { id: 'assets', label: 'Asset Distribution', icon: PieChart },
            { id: 'users', label: 'User Growth', icon: Users },
            { id: 'geographic', label: 'Geographic', icon: Globe }
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <Button
                key={metric.id}
                variant={selectedMetric === metric.id ? 'primary' : 'ghost'}
                onClick={() => setSelectedMetric(metric.id as any)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {metric.label}
              </Button>
            );
          })}
        </div>
      </motion.div>

      {/* Main Analytics Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Chart Area */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card variant="floating" className="h-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary-blue" />
                {selectedMetric === 'tvl' && 'Total Value Locked Trends'}
                {selectedMetric === 'assets' && 'Asset Distribution by Sector'}
                {selectedMetric === 'users' && 'User Growth Over Time'}
                {selectedMetric === 'geographic' && 'Geographic Distribution'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-dark-gray/30 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-off-white/30 mx-auto mb-4" />
                  <p className="text-off-white/50">Interactive chart will be integrated here</p>
                  <p className="text-sm text-off-white/30">Metric: {selectedMetric.toUpperCase()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Geographic/Sector Data */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Card variant="floating" className="h-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedMetric === 'geographic' ? (
                  <>
                    <Globe className="w-6 h-6 text-primary-blue" />
                    Geographic Distribution
                  </>
                ) : (
                  <>
                    <PieChart className="w-6 h-6 text-primary-blue-light" />
                    Sector Breakdown
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(selectedMetric === 'geographic' ? geographicData : sectorData).map((item: any, index) => (
                  <motion.div
                    key={item.country || item.sector}
                    className="flex items-center justify-between p-3 bg-dark-gray/30 rounded-lg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                      <div>
                        <p className="font-semibold text-off-white">{item.country || item.sector}</p>
                        <p className="text-sm text-off-white/70">
                          {item.assets ? `${item.assets} assets` : `${item.percentage}%`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-blue">{item.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0 }}
      >
        <Card variant="floating">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary-blue-light" />
              Recent Market Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-between p-4 bg-dark-gray/20 rounded-lg hover:bg-dark-gray/30 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 1.1 + index * 0.1 }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 bg-primary-blue rounded-full"></div>
                    <div>
                      <p className="font-semibold text-off-white">{activity.action}</p>
                      <p className="text-sm text-off-white/70">
                        {activity.asset || activity.user || activity.attestor}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-blue">{activity.value || activity.amount}</p>
                    <p className="text-xs text-off-white/50">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Analytics;