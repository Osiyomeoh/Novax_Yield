import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Vote, Users, Clock, CheckCircle, XCircle, Plus, TrendingUp, Shield, FileText } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

const DAOGovernance: React.FC = () => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeProposals: 0,
    votingMembers: 0,
    proposalsPassed: 0,
    participationRate: 0
  });

  useEffect(() => {
    // TODO: Load real data from governance service
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const data = await governanceService.getProposals();
      // setProposals(data);
      // setStats(data.stats);
      
      // For now, show empty state
      setProposals([]);
      setStats({
        activeProposals: 0,
        votingMembers: 0,
        proposalsPassed: 0,
        participationRate: 0
      });
    } catch (error) {
      console.error('Failed to load proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20 border-blue-200 dark:border-blue-400/30';
      case 'Passed':
        return 'text-primary-blue dark:text-primary-blue bg-primary-blue dark:bg-primary-blue/20 border-primary-blue dark:border-primary-blue/30';
      case 'Rejected':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-400/30';
      case 'Pending':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/20 border-yellow-200 dark:border-yellow-400/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-500/20 border-gray-200 dark:border-gray-400/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <Clock className="w-4 h-4" />;
      case 'Passed':
        return <CheckCircle className="w-4 h-4" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
                DAO Governance
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Participate in platform governance and decision-making
              </p>
            </div>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg">
              <Plus className="w-5 h-5 mr-2" />
              Create Proposal
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
          <Card variant="floating" className="p-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-blue-200/50 dark:border-blue-400/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                <Vote className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeProposals}</div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">Active Proposals</div>
              </div>
            </div>
          </Card>

          <Card variant="floating" className="p-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-purple-200/50 dark:border-purple-400/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.votingMembers.toLocaleString()}</div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">Voting Members</div>
              </div>
            </div>
          </Card>

          <Card variant="floating" className="p-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-primary-blue/50 dark:border-primary-blue/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-blue dark:bg-primary-blue/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-primary-blue dark:text-primary-blue" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.proposalsPassed}</div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">Proposals Passed</div>
              </div>
            </div>
          </Card>

          <Card variant="floating" className="p-6 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-orange-200/50 dark:border-orange-400/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.participationRate}%</div>
                <div className="text-gray-600 dark:text-gray-300 text-sm">Participation Rate</div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Proposals List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          {loading ? (
            <Card variant="floating" className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading proposals...</p>
            </Card>
          ) : proposals.length === 0 ? (
            <Card variant="floating" className="p-8 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Proposals Yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Be the first to create a governance proposal for the platform.
              </p>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                Create First Proposal
              </Button>
            </Card>
          ) : (
            proposals.map((proposal, index) => (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card variant="floating" className="p-6 hover:scale-[1.01] transition-all duration-300 bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{proposal.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatusColor(proposal.status)}`}>
                        {getStatusIcon(proposal.status)}
                        {proposal.status}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{proposal.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Category: {proposal.category}</span>
                      <span>•</span>
                      <span>Proposer: {proposal.proposer}</span>
                      <span>•</span>
                      <span>Ends: {proposal.endDate}</span>
                    </div>
                  </div>
                </div>

                {/* Voting Progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                    <span>Voting Progress</span>
                    <span>{proposal.totalVotes} votes</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(proposal.votesFor / proposal.totalVotes) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2 text-primary-blue dark:text-primary-blue">
                      <CheckCircle className="w-4 h-4" />
                      {proposal.votesFor} For
                    </div>
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                      {proposal.votesAgainst} Against
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {proposal.status === 'Active' && (
                    <>
                      <Button className="flex-1 bg-primary-blue hover:bg-primary-blue dark:bg-primary-blue dark:hover:bg-primary-blue text-white font-semibold">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Vote For
                      </Button>
                      <Button variant="outline" className="flex-1 border-red-400/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10">
                        <XCircle className="w-4 h-4 mr-2" />
                        Vote Against
                      </Button>
                    </>
                  )}
                  <Button variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <Shield className="w-4 h-4 mr-2" />
                    View Details
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

export default DAOGovernance;
