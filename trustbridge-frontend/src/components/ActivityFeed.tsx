import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { activityService, ActivityEvent } from '../services/activityService';
import { Card, CardContent, CardHeader, CardTitle } from './UI/Card';
import { TrendingUp, ShoppingCart, Tag, ArrowRightLeft, Sparkles, ExternalLink, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  type: 'nft' | 'user' | 'marketplace' | 'collection';
  id?: string; // tokenId for nft/collection, accountId for user/marketplace
  serialNumber?: string; // for nft type
  limit?: number;
  showTitle?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  type,
  id,
  serialNumber,
  limit = 50,
  showTitle = true,
}) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [type, id, serialNumber]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      let data: ActivityEvent[] = [];

      switch (type) {
        case 'nft':
          if (id && serialNumber) {
            data = await activityService.getNFTActivity(id, serialNumber, limit);
          }
          break;
        case 'user':
          if (id) {
            data = await activityService.getUserActivity(id, limit);
          }
          break;
        case 'marketplace':
          if (id) {
            data = await activityService.getMarketplaceActivity(id, limit);
          }
          break;
        case 'collection':
          if (id) {
            data = await activityService.getCollectionActivity(id, limit);
          }
          break;
      }

      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'sale':
        return <ShoppingCart className="w-4 h-4 text-black dark:text-white" />;
      case 'listing':
        return <Tag className="w-4 h-4 text-black dark:text-white" />;
      case 'transfer':
        return <ArrowRightLeft className="w-4 h-4 text-blue-400" />;
      case 'mint':
        return <Sparkles className="w-4 h-4 text-yellow-400" />;
      case 'offer':
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'sale':
        return 'bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20';
      case 'listing':
        return 'bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20';
      case 'transfer':
        return 'bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20';
      case 'mint':
        return 'bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20';
      case 'offer':
        return 'bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20';
      default:
        return 'bg-black/10 dark:bg-white/10 text-black dark:text-white border-black/20 dark:border-white/20';
    }
  };

  const formatAddress = (address: string) => {
    if (!address || address === 'unknown') return 'Unknown';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getActivityDescription = (activity: ActivityEvent) => {
    const from = formatAddress(activity.from);
    const to = formatAddress(activity.to);

    switch (activity.type) {
      case 'sale':
        return (
          <>
            <span className="text-gray-400">{from}</span> sold to{' '}
            <span className="text-off-white font-semibold">{to}</span>
            {activity.price && (
              <>
                {' '}for{' '}
                <span className="text-black dark:text-white font-bold">
                  {activity.price.toFixed(2)} {activity.currency || 'TRUST'}
                </span>
              </>
            )}
          </>
        );
      case 'listing':
        return (
          <>
            <span className="text-off-white font-semibold">{from}</span> listed for sale
            {activity.price && (
              <>
                {' '}at{' '}
                <span className="text-black dark:text-white font-bold">
                  {activity.price.toFixed(2)} {activity.currency || 'TRUST'}
                </span>
              </>
            )}
          </>
        );
      case 'transfer':
        return (
          <>
            Transferred from <span className="text-gray-400">{from}</span> to{' '}
            <span className="text-off-white font-semibold">{to}</span>
          </>
        );
      case 'mint':
        return (
          <>
            Minted by <span className="text-off-white font-semibold">{to}</span>
          </>
        );
      case 'offer':
        return (
          <>
            <span className="text-off-white font-semibold">{from}</span> made an offer
            {activity.price && (
              <>
                {' '}of{' '}
                <span className="text-purple-400 font-bold">
                  {activity.price.toFixed(2)} {activity.currency || 'TRUST'}
                </span>
              </>
            )}
          </>
        );
      default:
        return 'Activity';
    }
  };

  if (loading) {
    return (
      <Card variant="floating">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading activity...</p>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card variant="floating">
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-blue" />
              Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-8 text-center">
          <p className="text-gray-400">No activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="floating">
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-blue" />
            Activity
            <span className="ml-auto px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-full border border-gray-700">
              {activities.length} events
            </span>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="divide-y divide-primary-blue-light/10">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 hover:bg-primary-dark/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-1">{getActivityIcon(activity.type)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Type Badge */}
                  <Badge variant="outline" className={`mb-2 ${getActivityColor(activity.type)}`}>
                    {activity.type}
                  </Badge>

                  {/* Description */}
                  <p className="text-sm text-gray-300 mb-2">{getActivityDescription(activity)}</p>

                  {/* NFT Info */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>
                      Token: {activity.tokenId}#{activity.serialNumber}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                  </div>
                </div>

                {/* Transaction Link */}
                <a
                  href={`https://hashscan.io/testnet/transaction/${activity.transactionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-blue-light hover:text-primary-blue transition-colors"
                  title="View on HashScan"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;

