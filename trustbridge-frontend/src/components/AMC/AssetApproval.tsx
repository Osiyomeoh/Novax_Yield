import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import { Badge } from '../UI/Badge';
import { useToast } from '@/hooks/useToast';
import { useWallet } from '@/contexts/WalletContext';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText, 
  MapPin, 
  DollarSign,
  Calendar,
  Building2,
  AlertTriangle,
  Shield
} from 'lucide-react';

interface PendingAsset {
  id: string;
  name: string;
  description: string;
  category: number;
  assetType: string;
  location: any;
  totalValue: number;
  expectedAPY: number;
  maturityDate: string;
  nftTokenId: string;
  nftSerialNumber: string;
  propertyId: string;
  owner: string;
  status: string;
  createdAt: string;
  evidenceFiles: any[];
  legalDocuments: any[];
}

export default function AssetApproval() {
  const { accountId, hederaClient, signer } = useWallet();
  const { toast } = useToast();
  const [pendingAssets, setPendingAssets] = useState<PendingAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<PendingAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');

  useEffect(() => {
    loadPendingAssets();
  }, []);

  const loadPendingAssets = async () => {
    try {
      // Load assets with PENDING_AMC_ASSIGNMENT status
      const assets = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      const pending = assets.filter((asset: any) => 
        asset.assetType === 'RWA' && 
        asset.status === 'PENDING_AMC_ASSIGNMENT'
      );
      setPendingAssets(pending);
    } catch (error) {
      console.error('Failed to load pending assets:', error);
    }
  };

  const handleApproveAsset = async (asset: PendingAsset) => {
    if (!hederaClient || !signer || !accountId) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to approve assets.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('✅ Approving RWA asset for trading...', asset.propertyId);

      // Update asset status to APPROVED_FOR_TRADING
      const assets = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      const updatedAssets = assets.map((a: any) => {
        if (a.id === asset.id) {
          return {
            ...a,
            status: 'APPROVED_FOR_TRADING',
            amcApprovedBy: accountId,
            amcApprovedAt: new Date().toISOString(),
            amcComments: approvalComments || 'Asset approved for trading by AMC'
          };
        }
        return a;
      });
      localStorage.setItem('assetReferences', JSON.stringify(updatedAssets));

      // Update backend (in production)
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        if (!apiUrl) return;
        const response = await fetch(`${apiUrl}/assets/rwa/${asset.id}/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            status: 'APPROVED_FOR_TRADING',
            amcApprovedBy: accountId,
            amcApprovedAt: new Date().toISOString(),
            amcComments: approvalComments || 'Asset approved for trading by AMC'
          })
        });

        if (!response.ok) {
          console.warn('Backend update failed, but local update succeeded');
        }
      } catch (backendError) {
        console.warn('Backend update failed:', backendError);
      }

      // Reload assets
      await loadPendingAssets();
      setSelectedAsset(null);
      setApprovalComments('');

      toast({
        title: 'Asset Approved!',
        description: `${asset.name} has been approved for trading.`,
        variant: 'default'
      });

    } catch (error) {
      console.error('❌ Asset approval failed:', error);
      toast({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectAsset = async (asset: PendingAsset) => {
    setIsLoading(true);
    try {
      console.log('❌ Rejecting RWA asset...', asset.propertyId);

      // Update asset status to REJECTED
      const assets = JSON.parse(localStorage.getItem('assetReferences') || '[]');
      const updatedAssets = assets.map((a: any) => {
        if (a.id === asset.id) {
          return {
            ...a,
            status: 'REJECTED_BY_AMC',
            amcRejectedBy: accountId,
            amcRejectedAt: new Date().toISOString(),
            amcComments: approvalComments || 'Asset rejected by AMC'
          };
        }
        return a;
      });
      localStorage.setItem('assetReferences', JSON.stringify(updatedAssets));

      // Reload assets
      await loadPendingAssets();
      setSelectedAsset(null);
      setApprovalComments('');

      toast({
        title: 'Asset Rejected',
        description: `${asset.name} has been rejected.`,
        variant: 'default'
      });

    } catch (error) {
      console.error('❌ Asset rejection failed:', error);
      toast({
        title: 'Rejection Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryName = (category: number) => {
    const categories = {
      0: 'Real Estate',
      1: 'Commodity',
      2: 'Art & Collectibles',
      3: 'Precious Metals',
      4: 'Infrastructure',
      5: 'Agriculture'
    };
    return categories[category as keyof typeof categories] || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Asset Approval</h2>
          <p className="text-muted-foreground">
            Review and approve RWA assets for trading
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          AMC Dashboard
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Assets List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Pending Approval ({pendingAssets.length})
            </CardTitle>
            <CardDescription>
              RWA assets waiting for AMC approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingAssets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assets pending approval
                </div>
              ) : (
                pendingAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAsset?.id === asset.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{asset.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {asset.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${asset.totalValue.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {getCategoryName(asset.category)}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline">{asset.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Asset Details & Approval */}
        {selectedAsset && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Asset Details
              </CardTitle>
              <CardDescription>
                Review asset information before approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">{selectedAsset.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedAsset.description}
                  </p>
                </div>

                <div className="h-px bg-border my-4"></div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">Type:</span>
                      <span>{getCategoryName(selectedAsset.category)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">Value:</span>
                      <span>${selectedAsset.totalValue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Maturity:</span>
                      <span>{selectedAsset.maturityDate}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Location:</span>
                      <span>{selectedAsset.location?.address || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Documents:</span>
                      <span>{selectedAsset.legalDocuments.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">APY:</span>
                      <span>{selectedAsset.expectedAPY}%</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-600 my-4"></div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Approval Comments</label>
                  <textarea
                    className="w-full p-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:border-primary-blue focus:outline-none text-sm"
                    rows={3}
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="Add comments about your approval decision..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApproveAsset(selectedAsset)}
                    disabled={isLoading}
                    className="flex-1 bg-primary-blue hover:bg-primary-blue"
                  >
                    {isLoading ? (
                      'Approving...'
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve for Trading
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleRejectAsset(selectedAsset)}
                    disabled={isLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isLoading ? (
                      'Rejecting...'
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
