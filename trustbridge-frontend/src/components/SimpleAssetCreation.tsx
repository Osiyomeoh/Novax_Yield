import React, { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';

interface SimpleAssetCreationProps {
  onAssetCreated: (assetId: string) => void;
}

const SimpleAssetCreation: React.FC<SimpleAssetCreationProps> = ({ onAssetCreated }) => {
  const [formData, setFormData] = useState({
    category: '0', // REAL_ESTATE
    assetType: '',
    name: '',
    location: '',
    totalValue: '',
    description: '',
    imageFile: null as File | null,
    documentFile: null as File | null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const assetCategories = [
    { value: '0', label: '🏠 Real Estate', description: 'Houses, land, commercial properties' },
    { value: '1', label: '🌾 Agriculture', description: 'Farms, crops, livestock' },
    { value: '2', label: '🏭 Infrastructure', description: 'Roads, bridges, utilities' },
    { value: '3', label: '💼 Business', description: 'Companies, franchises, intellectual property' },
    { value: '4', label: '🥇 Commodities', description: 'Gold, oil, minerals' },
    { value: '5', label: '📱 Other', description: 'Other valuable assets' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic validation
    if (!formData.name || !formData.location || !formData.totalValue || !formData.assetType) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.totalValue) <= 0) {
      setError('Asset value must be greater than 0');
      return;
    }

    try {
      setIsLoading(true);

      // Upload files to IPFS (simplified - in production, use proper IPFS service)
      const imageHash = formData.imageFile ? `ipfs://image_${Date.now()}` : 'ipfs://placeholder';
      const documentHash = formData.documentFile ? `ipfs://document_${Date.now()}` : 'ipfs://placeholder';

      // Connect to contract
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.mandatoryAMCFactory,
        require('../config/abis/MandatoryAMCFactory.json'),
        signer
      );

      // Prepare asset data
      const assetData = {
        category: parseInt(formData.category),
        assetType: formData.assetType,
        name: formData.name,
        location: formData.location,
        totalValue: ethers.parseEther(formData.totalValue),
        maturityDate: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
        evidenceHashes: [documentHash],
        documentTypes: ['Asset Document'],
        imageURI: imageHash,
        documentURI: documentHash,
        description: formData.description
      };

      // Create asset
      const tx = await contract.createAsset(
        assetData.category,
        assetData.assetType,
        assetData.name,
        assetData.location,
        assetData.totalValue,
        assetData.maturityDate,
        assetData.evidenceHashes,
        assetData.documentTypes,
        assetData.imageURI,
        assetData.documentURI,
        assetData.description
      );

      const receipt = await tx.wait();
      const assetId = receipt.logs[0].args.assetId;

      setSuccess(`Asset created successfully! Asset ID: ${assetId}`);
      onAssetCreated(assetId);

      // Reset form
      setFormData({
        category: '0',
        assetType: '',
        name: '',
        location: '',
        totalValue: '',
        description: '',
        imageFile: null,
        documentFile: null
      });

    } catch (err: any) {
      console.error('Error creating asset:', err);
      setError(err.message || 'Failed to create asset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Your Asset</h2>
        <p className="text-gray-600">
          Tell us about your asset and we'll handle the rest. Our team will verify, inspect, and manage it professionally.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Asset Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What type of asset do you have? *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assetCategories.map((category) => (
              <label
                key={category.value}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  formData.category === category.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={category.value}
                  checked={formData.category === category.value}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div className="text-lg font-semibold text-gray-800">{category.label}</div>
                <div className="text-sm text-gray-600">{category.description}</div>
              </label>
            ))}
          </div>
        </div>

        {/* Asset Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specific type of asset *
          </label>
          <input
            type="text"
            name="assetType"
            value={formData.assetType}
            onChange={handleInputChange}
            placeholder="e.g., Residential Villa, Cocoa Farm, Gold Mine"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Asset Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Lagos Luxury Villa, Premium Cocoa Farm"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location *
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="e.g., Lagos, Nigeria"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Total Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estimated value (in TRUST tokens) *
          </label>
          <div className="relative">
            <input
              type="number"
              name="totalValue"
              value={formData.totalValue}
              onChange={handleInputChange}
              placeholder="e.g., 500000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-gray-500 text-sm">TRUST</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            This is the estimated value of your asset. Our team will verify this during inspection.
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Tell us more about your asset..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* File Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset Photo
            </label>
            <input
              type="file"
              name="imageFile"
              onChange={handleFileChange}
              accept="image/*"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset Document
            </label>
            <input
              type="file"
              name="documentFile"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* What Happens Next */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">What happens next?</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. Our team will verify your asset information</li>
            <li>2. You'll choose a professional Asset Management Company</li>
            <li>3. They'll physically inspect your asset</li>
            <li>4. You'll complete legal transfer at our office</li>
            <li>5. Your asset starts earning income!</li>
          </ol>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-primary-blue rounded-lg border-l-4 border-primary-blue">
            <p className="text-primary-blue">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
        >
          {isLoading ? 'Creating Asset...' : 'Create Asset'}
        </button>
      </form>
    </div>
  );
};

export default SimpleAssetCreation;
