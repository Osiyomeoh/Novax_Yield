import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, MapPin, Users, TrendingUp, Shield, Loader2 } from 'lucide-react';
import { Asset } from '../../types/api';

interface AssetImage {
  id: string;
  src: string;
  title: string;
  location: string;
  value: string;
  type: 'farm' | 'property' | 'business' | 'infrastructure';
  description: string;
  tokenized: boolean;
  investors: number;
  apy?: number;
  verificationScore?: number;
}

interface AssetGalleryProps {
  assets?: Asset[];
  loading?: boolean;
  error?: string | null;
}

const AssetGallery: React.FC<AssetGalleryProps> = ({ assets = [], loading = false, error = null }) => {
  const [selectedImage, setSelectedImage] = useState<AssetImage | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Convert real assets to display format
  const convertAssetToImage = (asset: Asset): AssetImage => {
    const getTypeMapping = (type: string) => {
      switch (type.toLowerCase()) {
        case 'agricultural': return 'farm';
        case 'real_estate': return 'property';
        case 'manufacturing': return 'business';
        case 'mining': return 'infrastructure';
        default: return 'business';
      }
    };

    const getDefaultImage = (type: string) => {
      switch (type.toLowerCase()) {
        case 'agricultural': return '/images/countryside-workers-together-field.jpg';
        case 'real_estate': return '/images/3trs.webp';
        case 'manufacturing': return '/images/pexels-fatima-yusuf-323522203-30541315.jpg';
        case 'mining': return '/images/4trs.jpeg';
        default: return '/images/countryside-workers-together-field.jpg';
      }
    };

    return {
      id: asset._id,
      src: getDefaultImage(asset.type),
      title: asset.name,
      location: `${asset.location.region}, ${asset.location.country}`,
      value: `$${(asset.totalValue / 1000000).toFixed(1)}M`,
      type: getTypeMapping(asset.type),
      description: asset.description,
      tokenized: asset.status === 'APPROVED' || asset.status === 'TOKENIZED',
      investors: asset.investments?.length || 0,
      apy: asset.expectedAPY,
      verificationScore: asset.verificationScore
    };
  };

  const displayAssets: AssetImage[] = assets.map(convertAssetToImage);

  const openModal = (asset: AssetImage, index: number) => {
    setSelectedImage(asset);
    setCurrentIndex(index);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % displayAssets.length);
    setSelectedImage(displayAssets[(currentIndex + 1) % displayAssets.length]);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + displayAssets.length) % displayAssets.length);
    setSelectedImage(displayAssets[(currentIndex - 1 + displayAssets.length) % displayAssets.length]);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-blue mx-auto mb-4" />
          <p className="text-off-white/70">Loading assets...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load assets</p>
          <p className="text-off-white/70 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (displayAssets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-off-white/70">No assets found matching your criteria</p>
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'farm': return '🌾';
      case 'property': return '🏢';
      case 'business': return '🏭';
      case 'infrastructure': return '⚡';
      default: return '📦';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'farm': return 'text-primary-blue';
      case 'property': return 'text-blue-400';
      case 'business': return 'text-purple-400';
      case 'infrastructure': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="w-full">
      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayAssets.map((asset, index) => (
          <motion.div
            key={asset.id}
            className="group cursor-pointer"
            onClick={() => openModal(asset, index)}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative overflow-hidden rounded-xl bg-dark-gray border border-medium-gray hover:border-primary-blue/50 transition-all duration-300">
              {/* Image */}
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={asset.src}
                  alt={asset.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Type Badge */}
                <div className="absolute top-3 left-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-black/50 backdrop-blur-sm ${getTypeColor(asset.type)}`}>
                    <span className="text-lg">{getTypeIcon(asset.type)}</span>
                    {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                  </span>
                </div>

                {/* Tokenized Badge */}
                {asset.tokenized && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-blue/20 text-primary-blue border border-primary-blue/30">
                      <Shield className="w-3 h-3" />
                      Tokenized
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-off-white mb-2 group-hover:text-primary-blue transition-colors">
                  {asset.title}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-medium-gray mb-3">
                  <MapPin className="w-4 h-4" />
                  {asset.location}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary-blue">
                      {asset.value}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-medium-gray">
                      <Users className="w-4 h-4" />
                      {asset.investors}
                    </div>
                  </div>
                  
                  {asset.apy && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-primary-blue-light" />
                      <span className="text-primary-blue-light font-semibold">{asset.apy}% APY</span>
                    </div>
                  )}
                  
                  {asset.verificationScore !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-primary-blue" />
                      <span className="text-primary-blue font-semibold">{asset.verificationScore}% Verified</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl bg-dark-gray border border-primary-blue/30"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-off-white hover:bg-primary-blue/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Navigation Buttons */}
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-off-white hover:bg-primary-blue/20 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-off-white hover:bg-primary-blue/20 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Image */}
              <div className="aspect-video relative">
                <img
                  src={selectedImage.src}
                  alt={selectedImage.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-off-white mb-2">
                      {selectedImage.title}
                    </h2>
                    <div className="flex items-center gap-2 text-medium-gray">
                      <MapPin className="w-4 h-4" />
                      {selectedImage.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary-blue mb-1">
                      {selectedImage.value}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-medium-gray">
                      <Users className="w-4 h-4" />
                      {selectedImage.investors} investors
                    </div>
                  </div>
                </div>

                <p className="text-off-white/80 mb-6 leading-relaxed">
                  {selectedImage.description}
                </p>

                <div className="flex items-center gap-4">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                    selectedImage.tokenized 
                      ? 'bg-primary-blue/20 text-primary-blue border border-primary-blue/30' 
                      : 'bg-medium-gray/20 text-medium-gray border border-medium-gray/30'
                  }`}>
                    <Shield className="w-4 h-4" />
                    {selectedImage.tokenized ? 'Tokenized' : 'Available for Tokenization'}
                  </div>
                  
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getTypeColor(selectedImage.type)} bg-black/20 border border-current/30`}>
                    <span className="text-lg">{getTypeIcon(selectedImage.type)}</span>
                    {selectedImage.type.charAt(0).toUpperCase() + selectedImage.type.slice(1)}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssetGallery;
