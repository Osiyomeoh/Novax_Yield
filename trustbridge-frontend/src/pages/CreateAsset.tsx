import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  Image, 
  CheckCircle, 
  AlertCircle,
  Building,
  TrendingUp
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

interface RWAAssetData {
  // Basic Information
  name: string;
  description: string;
  type: string;
  category: string;
  
  // Location
  country: string;
  region: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  
  // Financial
  totalValue: number;
  expectedAPY: number;
  maturityDate: string;
  
  // Documentation
  ownershipDocuments: File[];
  photos: File[];
  inspectionReports: File[];
  certificates: File[];
  
  // Additional Details
  condition: string;
  maintenanceHistory: string;
  insuranceInfo: string;
  complianceStatus: string;
}

const CreateAsset: React.FC = () => {
  const { address } = useWallet();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [assetData, setAssetData] = useState<RWAAssetData>({
    name: '',
    description: '',
    type: '',
    category: '',
    country: '',
    region: '',
      address: '',
    coordinates: { lat: 0, lng: 0 },
    totalValue: 0,
    expectedAPY: 0,
    maturityDate: '',
    ownershipDocuments: [],
    photos: [],
    inspectionReports: [],
    certificates: [],
    condition: '',
    maintenanceHistory: '',
    insuranceInfo: '',
    complianceStatus: ''
  });

  const assetTypes = [
    // Primary Focus
    { value: 'REAL_ESTATE', label: 'Real Estate', icon: Building, description: 'Commercial buildings, residential properties, industrial facilities', isPrimary: true },
    { value: 'COMMODITY', label: 'Commodity', icon: Truck, description: 'Precious metals, energy resources, raw materials', isPrimary: true },
    { value: 'AGRICULTURAL', label: 'Agriculture', icon: TreePine, description: 'Farmland, plantations, agricultural facilities, crops', isPrimary: true },
    { value: 'INFRASTRUCTURE', label: 'Infrastructure', icon: Building, description: 'Roads, bridges, utilities, public facilities', isPrimary: true },
    { value: 'BUSINESS', label: 'Business Assets', icon: DollarSign, description: 'Bonds, revenue streams, business equity, financial instruments', isPrimary: true },
    // Other Types
    { value: 'EQUIPMENT', label: 'Equipment', icon: Wrench, description: 'Machinery, vehicles, industrial equipment', isPrimary: false },
    { value: 'INVENTORY', label: 'Inventory', icon: Package, description: 'Finished goods, stock, warehouse inventory', isPrimary: false }
  ];

  const handleInputChange = (field: keyof RWAAssetData, value: any) => {
    setAssetData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (field: 'ownershipDocuments' | 'photos' | 'inspectionReports' | 'certificates', files: File[]) => {
    setAssetData(prev => ({
      ...prev,
      [field]: [...prev[field], ...files]
    }));
  };

  const uploadFiles = async (files: File[]) => {
    // In a real implementation, upload to IPFS or cloud storage
    const uploadPromises = files.map(async (file) => {
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        filename: file.name,
        size: file.size,
        type: file.type,
        cid: `bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi${Math.random().toString(36).substring(2)}`
      };
    });
    
    return Promise.all(uploadPromises);
  };

  // Compress multiple IPFS CIDs into a single hash for token memo storage
  const compressIPFSHashes = (cids: string[]): string => {
    // Create a compressed hash from multiple IPFS CIDs
    // This allows us to store multiple document references in the token memo
    const combinedCids = cids.join('|');
    
    // Create a hash of the combined CIDs to fit in token memo (100 char limit)
    const encoder = new TextEncoder();
    const data = encoder.encode(combinedCids);
    
    // Use a simple hash function to create a shorter representation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    
    // Convert to base36 for shorter representation
    return hash.toString(36);
  };

  // Decode compressed hash back to IPFS CIDs
  const decodeIPFSHashes = (compressedHash: string, originalCids: string[]): string[] => {
    // In a real implementation, this would decode the compressed hash
    // For now, we'll return the original CIDs
    return originalCids;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!address) {
        throw new Error('Wallet not connected');
      }

      // Upload all files to IPFS (simplified for now)
      const uploadedFiles = {
        ownershipDocuments: await uploadFiles(assetData.ownershipDocuments),
        photos: await uploadFiles(assetData.photos),
        inspectionReports: await uploadFiles(assetData.inspectionReports),
        certificates: await uploadFiles(assetData.certificates)
      };

      // Extract all IPFS CIDs from uploaded files
      const allCids: string[] = [
        ...uploadedFiles.ownershipDocuments.map(f => f.cid),
        ...uploadedFiles.photos.map(f => f.cid),
        ...uploadedFiles.inspectionReports.map(f => f.cid),
        ...uploadedFiles.certificates.map(f => f.cid)
      ];

      // Create IPFS metadata hash (simplified)
      const metadata = {
        name: assetData.name,
        description: assetData.description,
        type: assetData.type,
        category: assetData.category,
        location: {
          country: assetData.country,
          region: assetData.region,
          address: assetData.address,
          coordinates: assetData.coordinates
        },
        totalValue: assetData.totalValue,
        expectedAPY: assetData.expectedAPY,
        maturityDate: assetData.maturityDate,
        documents: uploadedFiles,
        condition: assetData.condition,
        maintenanceHistory: assetData.maintenanceHistory,
        insuranceInfo: assetData.insuranceInfo,
        complianceStatus: assetData.complianceStatus,
        createdAt: new Date().toISOString()
      };

      // Simulate IPFS upload for metadata (in real implementation, upload to IPFS and get CID)
      const metadataCid = `bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi-${Date.now()}`;

      // Compress multiple IPFS CIDs into a single hash for token memo storage
      const compressedHash = compressIPFSHashes(allCids);

      // Create RWA asset with HCS submission
      const assetPayload = {
        name: assetData.name,
        type: assetData.type,
        value: assetData.totalValue,
        location: `${assetData.country}, ${assetData.region}`,
        description: assetData.description,
        expectedAPY: assetData.expectedAPY,
        creator: address,
        metadataCid: metadataCid,
        compressedHash: compressedHash,
        documentCids: allCids
      };

      // Submit to TrustBridge HCS endpoint
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hedera/rwa/create-with-hcs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assetPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to submit asset: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('RWA asset created with HCS:', result);

      setSuccess(true);
    } catch (error) {
      console.error('Error submitting asset:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit asset');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return assetData.name && assetData.description && assetData.type;
      case 2:
        return assetData.country && assetData.region && assetData.address;
      case 3:
        return assetData.totalValue > 0 && assetData.expectedAPY > 0 && assetData.maturityDate;
      case 4:
        return assetData.ownershipDocuments.length > 0 && assetData.photos.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-primary-blue mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Asset Submitted Successfully!
          </h2>
          <p className="text-gray-900 dark:text-gray-100 mb-6">
            Your RWA asset has been created on Hedera and submitted to the TrustBridge HCS topic for AMC approval. Our team will review it and contact you for physical inspection.
          </p>
          <Button onClick={() => navigate('/portfolio')}>
            View Portfolio
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Submit RWA Asset for Tokenization
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Complete the form below to submit your real-world asset for verification and tokenization
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {step}
                </div>
                {step < 5 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>Basic Info</span>
            <span>Location</span>
            <span>Financial</span>
            <span>Documents</span>
            <span>Review</span>
          </div>
        </div>

        {/* Form Steps */}
        <Card className="p-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h2>
              
                  <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Asset Name *
                    </label>
                <input
                  type="text"
                  value={assetData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter asset name"
                    />
                  </div>

                  <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                    </label>
                <textarea
                  value={assetData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your asset in detail"
                    />
                  </div>

                  <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Asset Type *
                    </label>
                <div className="space-y-4">
                  {/* Primary Asset Types */}
                  <div>
                    <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">Primary Asset Types</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {assetTypes.filter(type => type.isPrimary).map((type) => {
                        const Icon = type.icon;
                        return (
                          <div
                            key={type.value}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              assetData.type === type.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600'
                            }`}
                            onClick={() => handleInputChange('type', type.value)}
                          >
                            <div className="flex items-center space-x-3">
                              <Icon className="w-6 h-6 text-blue-500" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {type.label}
                                  </span>
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">Primary</span>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {type.description}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Other Asset Types */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Other Asset Types</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {assetTypes.filter(type => !type.isPrimary).map((type) => {
                        const Icon = type.icon;
                        return (
                          <div
                            key={type.value}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              assetData.type === type.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => handleInputChange('type', type.value)}
                          >
                            <div className="flex items-center space-x-3">
                              <Icon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {type.label}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {type.description}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                  </div>
            </motion.div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Asset Location
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Country *
                    </label>
                  <input
                    type="text"
                    value={assetData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Country"
                    />
                  </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Region/State *
                  </label>
                  <input
                    type="text"
                    value={assetData.region}
                    onChange={(e) => handleInputChange('region', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Region or State"
                  />
                </div>
              </div>

                  <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Address *
                    </label>
                <textarea
                  value={assetData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Complete address"
                    />
                  </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Latitude
                      </label>
                  <input
                    type="number"
                    step="any"
                    value={assetData.coordinates.lat}
                    onChange={(e) => handleInputChange('coordinates', { ...assetData.coordinates, lat: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Latitude"
                      />
                    </div>
                
                    <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Longitude
                      </label>
                  <input
                    type="number"
                    step="any"
                    value={assetData.coordinates.lng}
                    onChange={(e) => handleInputChange('coordinates', { ...assetData.coordinates, lng: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Longitude"
                      />
                    </div>
                  </div>
            </motion.div>
          )}

          {/* Step 3: Financial Details */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Financial Details
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Asset Value (USD) *
                    </label>
                  <input
                      type="number"
                    value={assetData.totalValue}
                    onChange={(e) => handleInputChange('totalValue', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Asset value in USD"
                  />
                  </div>

                    <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Expected APY (%) *
                      </label>
                  <input
                        type="number"
                    step="0.1"
                    value={assetData.expectedAPY}
                    onChange={(e) => handleInputChange('expectedAPY', parseFloat(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Expected annual return"
                      />
                    </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Maturity Date *
                      </label>
                  <input
                        type="date"
                    value={assetData.maturityDate}
                        onChange={(e) => handleInputChange('maturityDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Asset Condition
                  </label>
                  <select
                    value={assetData.condition}
                    onChange={(e) => handleInputChange('condition', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select condition</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Documents */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Required Documents
              </h2>
              
              {/* Ownership Documents */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ownership Documents * (Deed, Title, Certificate of Ownership)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload('ownershipDocuments', Array.from(e.target.files || []))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Upload legal documents proving ownership
                </p>
              </div>

              {/* Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Asset Photos * (Multiple angles, current condition)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif"
                  onChange={(e) => handleFileUpload('photos', Array.from(e.target.files || []))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Upload clear photos showing the asset from different angles
                </p>
              </div>

              {/* Inspection Reports */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inspection Reports (If available)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => handleFileUpload('inspectionReports', Array.from(e.target.files || []))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Professional inspection reports, appraisals, or assessments
                      </p>
                    </div>
                    
              {/* Certificates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Certificates & Compliance Documents
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload('certificates', Array.from(e.target.files || []))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Compliance certificates, permits, licenses, insurance documents
                </p>
                      </div>
            </motion.div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Review & Submit
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Basic Information</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><strong>Name:</strong> {assetData.name}</p>
                      <p><strong>Type:</strong> {assetData.type}</p>
                      <p><strong>Description:</strong> {assetData.description}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Location</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><strong>Country:</strong> {assetData.country}</p>
                      <p><strong>Region:</strong> {assetData.region}</p>
                      <p><strong>Address:</strong> {assetData.address}</p>
                  </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Financial Details</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><strong>Value:</strong> ${assetData.totalValue.toLocaleString()}</p>
                      <p><strong>APY:</strong> {assetData.expectedAPY}%</p>
                      <p><strong>Maturity:</strong> {assetData.maturityDate}</p>
                      <p><strong>Condition:</strong> {assetData.condition || 'Not specified'}</p>
                    </div>
                    </div>
                    
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Documents</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><strong>Ownership Docs:</strong> {assetData.ownershipDocuments.length}</p>
                      <p><strong>Photos:</strong> {assetData.photos.length}</p>
                      <p><strong>Inspection Reports:</strong> {assetData.inspectionReports.length}</p>
                      <p><strong>Certificates:</strong> {assetData.certificates.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-700 dark:text-red-300">{error}</p>
                  </div>
                </div>
              )}
            </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
              variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Previous
                </Button>

            {currentStep < 5 ? (
                  <Button
                onClick={nextStep}
                disabled={!isStepValid(currentStep)}
              >
                Next
                  </Button>
                ) : (
                  <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-primary-blue hover:bg-primary-blue text-white"
              >
                {loading ? 'Submitting...' : 'Submit Asset'}
                  </Button>
                )}
              </div>
          </Card>
      </div>
    </div>
  );
};

export default CreateAsset;