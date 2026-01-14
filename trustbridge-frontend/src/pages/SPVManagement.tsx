import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, TrendingUp, Shield, FileText, Plus, Eye, Edit } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

const SPVManagement: React.FC = () => {
  const [spvs, setSpvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSPVs: 0,
    totalCapitalManaged: '0 HBAR',
    activeInvestments: '0 HBAR',
  });

  useEffect(() => {
    // TODO: Load real data from SPV service
    loadSPVs();
  }, []);

  const loadSPVs = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const data = await spvService.getSPVs();
      // setSpvs(data.spvs);
      // setStats(data.stats);
      
      // For now, show empty state
      setSpvs([]);
      setStats({
        totalSPVs: 0,
        totalCapitalManaged: '0 HBAR',
        activeInvestments: '0 HBAR',
      });
    } catch (error) {
      console.error('Failed to load SPVs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'text-primary-blue bg-primary-blue/10 border-primary-blue/30';
      case 'Closed':
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
      case 'Pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      default:
        return 'text-primary-blue-light bg-primary-blue-light/10 border-primary-blue-light/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-black dark:via-gray-900 dark:to-black text-gray-900 dark:text-off-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-2">
                SPV Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Manage Special Purpose Vehicles for institutional investments
              </p>
            </div>
            <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg">
              <Plus className="w-5 h-5 mr-2" />
              Create New SPV
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <Card variant="floating" className="p-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-indigo-200/50 dark:border-indigo-400/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSPVs}</div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">Total SPVs</div>
              </div>
            </div>
          </Card>

          <Card variant="floating" className="p-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-purple-200/50 dark:border-purple-400/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCapitalManaged}</div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">Total Capital Managed</div>
              </div>
            </div>
          </Card>

          <Card variant="floating" className="p-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-pink-200/50 dark:border-pink-400/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-pink-100 dark:bg-pink-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeInvestments}</div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">Active Investments</div>
              </div>
            </div>
          </Card>

          <Card variant="floating" className="p-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-primary-blue/50 dark:border-primary-blue/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-blue dark:bg-primary-blue/20 rounded-lg">
                <Shield className="w-6 h-6 text-primary-blue dark:text-primary-blue" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">+12.2%</div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">Avg Performance</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* SPV List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          {loading ? (
            <Card variant="floating" className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading SPVs...</p>
            </Card>
          ) : spvs.length === 0 ? (
            <Card variant="floating" className="p-8 text-center">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No SPVs Yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Create your first Special Purpose Vehicle to start managing institutional investments.
              </p>
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                Create First SPV
              </Button>
            </Card>
          ) : (
            spvs.map((spv, index) => (
            <motion.div
              key={spv.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card variant="floating" className="p-6 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-off-white">{spv.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(spv.status)}`}>
                        {spv.status}
                      </span>
                    </div>
                    <p className="text-primary-blue-light text-sm mb-3">{spv.description}</p>
                    <div className="flex items-center gap-4 text-sm text-primary-blue-light">
                      <span>Type: {spv.type}</span>
                      <span>•</span>
                      <span>Created: {spv.created}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-blue">{spv.totalValue}</div>
                    <div className="text-sm text-primary-blue-light">Total Value</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-background-secondary/50 rounded-lg">
                    <div className="text-lg font-semibold text-off-white">{spv.investors}</div>
                    <div className="text-sm text-primary-blue-light">Investors</div>
                  </div>
                  <div className="text-center p-4 bg-background-secondary/50 rounded-lg">
                    <div className="text-lg font-semibold text-primary-blue">{spv.performance}</div>
                    <div className="text-sm text-primary-blue-light">Performance</div>
                  </div>
                  <div className="text-center p-4 bg-background-secondary/50 rounded-lg">
                    <div className="text-lg font-semibold text-off-white">₦2.1M</div>
                    <div className="text-sm text-primary-blue-light">Avg Investment</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-primary-blue/30 text-primary-blue hover:bg-primary-blue/10">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="outline" className="flex-1 border-primary-blue-light/30 text-primary-blue-light hover:bg-primary-blue-light/10">
                    <Edit className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                  <Button variant="outline" className="border-blue-400/30 text-blue-400 hover:bg-blue-400/10">
                    <FileText className="w-4 h-4 mr-2" />
                    Reports
                  </Button>
                </div>
              </Card>
            </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SPVManagement;
