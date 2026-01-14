import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';

interface AssetFlowProps {
  assetId: string;
  onFlowComplete: (assetId: string) => void;
}

interface FlowStatus {
  stage: number;
  progress: number;
  statusText: string;
  status: number;
}

interface AMCProfile {
  amcAddress: string;
  name: string;
  description: string;
  jurisdiction: string;
  managementFee: number;
  performanceFee: number;
  isActive: boolean;
  totalAssetsManaged: number;
  totalValueManaged: string;
  contactInfo: string;
  officeLocation: string;
}

const SimplifiedAssetFlow: React.FC<AssetFlowProps> = ({ assetId, onFlowComplete }) => {
  const [flowStatus, setFlowStatus] = useState<FlowStatus | null>(null);
  const [availableAMCs, setAvailableAMCs] = useState<AMCProfile[]>([]);
  const [selectedAMC, setSelectedAMC] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Flow stage descriptions for users
  const flowStages = [
    { stage: 0, title: "Asset Created", description: "Your asset has been created and is pending verification", icon: "📝" },
    { stage: 1, title: "Verified", description: "Your asset has been verified. Choose an Asset Management Company", icon: "✅" },
    { stage: 2, title: "AMC Selected", description: "Inspection has been scheduled. We'll visit your asset soon", icon: "🏢" },
    { stage: 3, title: "Inspection Complete", description: "Physical inspection completed. Legal transfer is being prepared", icon: "🔍" },
    { stage: 4, title: "Legal Transfer Pending", description: "Visit our office to complete legal transfer", icon: "📋" },
    { stage: 5, title: "Active & Earning", description: "Your asset is now active and earning income!", icon: "💰" },
    { stage: 7, title: "Rejected", description: "Asset was rejected during inspection", icon: "❌" }
  ];

  useEffect(() => {
    if (assetId) {
      fetchFlowStatus();
      fetchAvailableAMCs();
    }
  }, [assetId]);

  const fetchFlowStatus = async () => {
    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.mandatoryAMCFactory,
        require('../config/abis/MandatoryAMCFactory.json'),
        signer
      );

      const status = await contract.getAssetFlowStatus(assetId);
      setFlowStatus({
        stage: Number(status.stage),
        progress: Number(status.progress),
        statusText: status.statusText,
        status: Number(status.status)
      });
    } catch (err) {
      console.error('Error fetching flow status:', err);
      setError('Failed to fetch asset status');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableAMCs = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.mandatoryAMCFactory,
        require('../config/abis/MandatoryAMCFactory.json'),
        signer
      );

      const amcs = await contract.getAvailableAMCs();
      setAvailableAMCs(amcs);
    } catch (err) {
      console.error('Error fetching AMCs:', err);
    }
  };

  const handleAMCSelection = async () => {
    if (!selectedAMC) {
      setError('Please select an AMC');
      return;
    }

    try {
      setIsLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.mandatoryAMCFactory,
        require('../config/abis/MandatoryAMCFactory.json'),
        signer
      );

      const tx = await contract.selectAMC(assetId, selectedAMC);
      await tx.wait();
      
      // Refresh flow status
      await fetchFlowStatus();
      setError('');
    } catch (err) {
      console.error('Error selecting AMC:', err);
      setError('Failed to select AMC');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentStage = () => {
    if (!flowStatus) return null;
    return flowStages.find(stage => stage.stage === flowStatus.stage) || flowStages[0];
  };

  const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-primary-blue';
  };

  if (isLoading && !flowStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading asset status...</span>
      </div>
    );
  }

  if (!flowStatus) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">Failed to load asset status</p>
        <button 
          onClick={fetchFlowStatus}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentStage = getCurrentStage();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Asset Journey</h2>
        <p className="text-gray-600">Track your asset through the verification and management process</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-700">{flowStatus.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(flowStatus.progress)}`}
            style={{ width: `${flowStatus.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Current Stage */}
      <div className="mb-8 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">{currentStage?.icon}</span>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{currentStage?.title}</h3>
            <p className="text-gray-600">{currentStage?.description}</p>
          </div>
        </div>
        
        {flowStatus.statusText && (
          <div className="text-sm text-gray-500">
            Status: {flowStatus.statusText}
          </div>
        )}
      </div>

      {/* AMC Selection (if at stage 1) */}
      {flowStatus.stage === 1 && (
        <div className="mb-8 p-6 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose Your Asset Management Company</h3>
          <p className="text-gray-600 mb-4">
            Select a professional AMC to manage your asset. They will handle inspections, legal transfers, and ongoing management.
          </p>
          
          {availableAMCs.length > 0 ? (
            <div className="space-y-4">
              {availableAMCs.map((amc, index) => (
                <div 
                  key={index}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAMC === amc.amcAddress 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedAMC(amc.amcAddress)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-800">{amc.name}</h4>
                      <p className="text-sm text-gray-600">{amc.description}</p>
                      <p className="text-sm text-gray-500">📍 {amc.officeLocation}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>Management: {amc.managementFee / 100}%</p>
                      <p>Performance: {amc.performanceFee / 100}%</p>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={handleAMCSelection}
                disabled={!selectedAMC || isLoading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Selecting...' : 'Select This AMC'}
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No AMCs available at the moment. Please try again later.</p>
          )}
        </div>
      )}

      {/* Legal Transfer Instructions (if at stage 4) */}
      {flowStatus.stage === 4 && (
        <div className="mb-8 p-6 bg-orange-50 rounded-lg border-l-4 border-orange-500">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Complete Legal Transfer</h3>
          <p className="text-gray-600 mb-4">
            Visit our office to complete the legal transfer process. This is required for all assets.
          </p>
          <div className="bg-white p-4 rounded border">
            <h4 className="font-semibold text-gray-800 mb-2">What to bring:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Valid government-issued ID</li>
              <li>Original asset documents</li>
              <li>Proof of ownership</li>
              <li>Any additional verification documents</li>
            </ul>
          </div>
        </div>
      )}

      {/* Success Message (if completed) */}
      {flowStatus.stage === 5 && (
        <div className="mb-8 p-6 bg-primary-blue rounded-lg border-l-4 border-primary-blue">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🎉 Congratulations!</h3>
          <p className="text-gray-600 mb-4">
            Your asset is now active and being managed by a professional AMC. You can start earning income from your asset.
          </p>
          <button
            onClick={() => onFlowComplete(assetId)}
            className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-primary-blue"
          >
            View Asset Dashboard
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Flow Stages Overview */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Complete Process Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flowStages.map((stage, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border ${
                flowStatus.stage === stage.stage 
                  ? 'border-blue-500 bg-blue-50' 
                  : flowStatus.stage > stage.stage 
                    ? 'border-primary-blue bg-primary-blue' 
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{stage.icon}</span>
                <span className="font-semibold text-sm">{stage.title}</span>
              </div>
              <p className="text-xs text-gray-600">{stage.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimplifiedAssetFlow;
