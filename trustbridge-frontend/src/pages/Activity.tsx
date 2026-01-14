import React, { useState } from 'react';
import { ActivityFeed } from '../components/ActivityFeed';
import { Card, CardContent } from '../components/UI/Card';
import { TrendingUp, Users, ShoppingBag } from 'lucide-react';

const MARKETPLACE_ACCOUNT = '0.0.6916959'; // Your marketplace account

export const Activity: React.FC = () => {
  const [view, setView] = useState<'marketplace' | 'global'>('marketplace');

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-primary-dark to-dark">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-off-white mb-2 flex items-center gap-3">
            <TrendingUp className="w-10 h-10 text-primary-blue" />
            Activity
          </h1>
          <p className="text-lg text-primary-blue-light">
            Real-time marketplace transactions and events
          </p>
        </div>

        {/* View Toggle */}
        <Card variant="floating" className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <button
                onClick={() => setView('marketplace')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'marketplace'
                    ? 'bg-primary-blue text-black'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-off-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                Marketplace Activity
              </button>
              <button
                onClick={() => setView('global')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'global'
                    ? 'bg-primary-blue text-black'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-off-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Global Activity
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        {view === 'marketplace' && (
          <ActivityFeed
            type="marketplace"
            id={MARKETPLACE_ACCOUNT}
            limit={100}
            showTitle={false}
          />
        )}

        {view === 'global' && (
          <Card variant="floating">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-off-white mb-2">Global Activity Coming Soon</p>
              <p className="text-gray-400">
                We're building a comprehensive view of all Hedera NFT activity
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Activity;

