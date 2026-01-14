import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../UI/Card';
import Button from '../UI/Button';
import { useToast } from '../../hooks/useToast';
import { contractService, ListingData } from '../../services/contractService';
import { useWallet } from '../../contexts/WalletContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  User, 
  Eye, 
  Heart,
  TrendingUp,
  Filter,
  Search
} from 'lucide-react';

interface Listing {
  id: number;
  seller: string;
  nftContract: string;
  tokenId: number;
  price: string;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
}

const AssetMarketplace: React.FC = () => {
  const { toast } = useToast();
  const { isConnected, address } = useWallet();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState({ min: 0, max: 1000000 });
  const [sortBy, setSortBy] = useState<'price' | 'date' | 'popularity'>('date');

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      const activeListings = await contractService.getActiveListings();
      setListings(activeListings);
    } catch (error) {
      console.error('Failed to load listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load marketplace listings',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyAsset = async (listingId: number, price: string) => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to buy assets',
        type: 'error'
      });
      return;
    }

    try {
      const result = await contractService.buyAsset(listingId, price);
      if (result.success) {
        toast({
          title: 'Asset Purchased!',
          description: `Successfully purchased asset. Transaction: ${result.transactionHash}`,
          type: 'success'
        });
        loadListings(); // Refresh listings
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      });
    }
  };

  const handleMakeOffer = async (listingId: number, offerPrice: string) => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to make offers',
        type: 'error'
      });
      return;
    }

    try {
      // This would need to be implemented in the contract service
      toast({
        title: 'Offer Feature',
        description: 'Offer functionality coming soon!',
        type: 'info'
      });
    } catch (error) {
      console.error('Offer failed:', error);
      toast({
        title: 'Offer Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error'
      });
    }
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.id.toString().includes(searchTerm) || 
                         listing.seller.toLowerCase().includes(searchTerm.toLowerCase());
    const price = parseFloat(listing.price);
    const matchesPrice = price >= priceFilter.min && price <= priceFilter.max;
    return matchesSearch && matchesPrice;
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return parseFloat(a.price) - parseFloat(b.price);
      case 'date':
        return b.createdAt - a.createdAt;
      default:
        return 0;
    }
  });

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numPrice);
  };

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Expired';
    
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-off-white mb-2">Asset Marketplace</h2>
        <p className="text-medium-gray">
          Buy and sell tokenized assets on the secondary market
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-dark-gray/50 rounded-lg p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-medium-gray w-4 h-4" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-midnight-800 border border-medium-gray rounded-lg text-off-white placeholder-medium-gray focus:border-primary-blue focus:outline-none"
            />
          </div>

          {/* Price Filter */}
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min Price"
              value={priceFilter.min}
              onChange={(e) => setPriceFilter(prev => ({ ...prev, min: parseFloat(e.target.value) || 0 }))}
              className="w-24 px-3 py-2 bg-midnight-800 border border-medium-gray rounded-lg text-off-white placeholder-medium-gray focus:border-primary-blue focus:outline-none"
            />
            <input
              type="number"
              placeholder="Max Price"
              value={priceFilter.max}
              onChange={(e) => setPriceFilter(prev => ({ ...prev, max: parseFloat(e.target.value) || 1000000 }))}
              className="w-24 px-3 py-2 bg-midnight-800 border border-medium-gray rounded-lg text-off-white placeholder-medium-gray focus:border-primary-blue focus:outline-none"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'price' | 'date' | 'popularity')}
            className="px-3 py-2 bg-midnight-800 border border-medium-gray rounded-lg text-off-white focus:border-primary-blue focus:outline-none"
          >
            <option value="date">Sort by Date</option>
            <option value="price">Sort by Price</option>
            <option value="popularity">Sort by Popularity</option>
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedListings.map((listing) => (
          <motion.div
            key={listing.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="group"
          >
            <Card className="bg-dark-gray/50 border-medium-gray hover:border-primary-blue/50 transition-all duration-200 overflow-hidden">
              <CardContent className="p-0">
                {/* Asset Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-primary-blue/20 to-primary-blue-light/20 flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-primary-blue mx-auto mb-2" />
                    <p className="text-off-white font-semibold">Tokenized Asset</p>
                    <p className="text-sm text-medium-gray">#{listing.tokenId}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Price and Time */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-primary-blue">
                        {formatPrice(listing.price)}
                      </p>
                      <p className="text-sm text-medium-gray">Current Price</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm text-medium-gray">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatTimeRemaining(listing.expiresAt)}
                      </div>
                    </div>
                  </div>

                  {/* Seller Info */}
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-medium-gray" />
                    <span className="text-sm text-medium-gray">
                      Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      onClick={() => handleBuyAsset(listing.id, listing.price)}
                      className="flex-1 bg-primary-blue hover:bg-primary-blue/80 text-midnight-900"
                      disabled={!isConnected}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Buy Now
                    </Button>
                    <Button
                      onClick={() => handleMakeOffer(listing.id, listing.price)}
                      variant="outline"
                      className="flex-1 border-primary-blue text-primary-blue hover:bg-primary-blue/10"
                      disabled={!isConnected}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Offer
                    </Button>
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center justify-between text-xs text-medium-gray pt-2 border-t border-medium-gray/30">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>View Details</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-3 h-3" />
                      <span>Save</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {sortedListings.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-medium-gray mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-off-white mb-2">No Assets Found</h3>
          <p className="text-medium-gray">
            {searchTerm || priceFilter.min > 0 || priceFilter.max < 1000000
              ? 'Try adjusting your search criteria'
              : 'No assets are currently listed for sale'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default AssetMarketplace;
