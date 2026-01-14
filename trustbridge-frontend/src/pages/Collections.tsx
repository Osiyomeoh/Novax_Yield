import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collectionsService, Collection } from '../services/collectionsService';
import { Card, CardContent } from '../components/UI/Card';
import Button from '../components/UI/Button';
import { Search, TrendingUp, Grid, List, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export const Collections: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'floor' | 'items' | 'created'>('volume');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadCollections();
  }, [sortBy]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const result = await collectionsService.getCollections({
        sortBy,
        sortOrder: 'desc',
        limit: 50,
      });
      setCollections(result.collections);
    } catch (error) {
      console.error('Failed to load collections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collections',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCollections();
      return;
    }

    try {
      setLoading(true);
      const results = await collectionsService.searchCollections(searchQuery);
      setCollections(results);
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: 'Error',
        description: 'Search failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-primary-dark to-dark">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-off-white mb-2">
            Collections
          </h1>
          <p className="text-lg text-primary-blue-light">
            Discover trending NFT collections on TrustBridge
          </p>
        </div>

        {/* Search and Filters */}
        <Card variant="floating" className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-primary-dark text-off-white border border-primary-blue-light/20 rounded-lg focus:outline-none focus:border-primary-blue"
              >
                <option value="volume">Total Volume</option>
                <option value="floor">Floor Price</option>
                <option value="items">Items</option>
                <option value="created">Recently Created</option>
              </select>

              {/* View Mode */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collections Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-blue mx-auto"></div>
            <p className="text-off-white mt-4">Loading collections...</p>
          </div>
        ) : collections.length === 0 ? (
          <Card variant="floating">
            <CardContent className="p-12 text-center">
              <p className="text-xl text-off-white mb-2">No collections found</p>
              <p className="text-gray-400">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {collections.map((collection) => (
              <motion.div
                key={collection.collectionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  variant="floating"
                  className="cursor-pointer overflow-hidden"
                  onClick={() => navigate(`/collections/${collection.collectionId}`)}
                >
                  {/* Banner Image */}
                  {collection.bannerImage && (
                    <div className="h-32 overflow-hidden">
                      <img
                        src={collection.bannerImage}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Profile Image (overlapping banner) */}
                  <div className={collection.bannerImage ? '-mt-12 px-6' : 'pt-6 px-6'}>
                    <div className="w-24 h-24 rounded-xl border-4 border-primary-dark overflow-hidden bg-primary-dark">
                      {collection.profileImage ? (
                        <img
                          src={collection.profileImage}
                          alt={collection.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary-blue">
                          {collection.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-6 pt-4">
                    {/* Name and Verification */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-off-white">{collection.name}</h3>
                      {collection.verified && (
                        <CheckCircle className="w-5 h-5 text-primary-blue" />
                      )}
                    </div>

                    {/* Description */}
                    {collection.description && (
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {collection.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Floor Price</p>
                        <p className="text-lg font-bold text-primary-blue">
                          {collection.floorPrice > 0 ? `${formatNumber(collection.floorPrice)} TRUST` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Total Volume</p>
                        <p className="text-lg font-bold text-primary-blue-light">
                          {formatNumber(collection.totalVolume)} TRUST
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Items</p>
                        <p className="text-lg font-bold text-off-white">
                          {collection.itemCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Owners</p>
                        <p className="text-lg font-bold text-off-white">
                          {collection.ownerCount}
                        </p>
                      </div>
                    </div>

                    {/* 24h Stats */}
                    {collection.stats?.volume24h && collection.stats.volume24h > 0 && (
                      <div className="mt-4 pt-4 border-t border-primary-blue-light/20">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">24h Volume</span>
                          <span className="text-primary-blue font-semibold">
                            {formatNumber(collection.stats.volume24h)} TRUST
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Collections;

