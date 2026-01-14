import React, { useState } from 'react';
import { Search, Loader2, FileText, AlertCircle } from 'lucide-react';
import { storyProtocolService, IPAsset } from '../../services/storyProtocol.service';
import { useToast } from '../../hooks/useToast';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Card from '../UI/Card';

interface IPSearchProps {
  onIPSelected?: (ip: IPAsset) => void;
}

const IPSearch: React.FC<IPSearchProps> = ({ onIPSelected }) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<IPAsset[]>([]);
  const [selectedIP, setSelectedIP] = useState<IPAsset | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an IP ID or title to search',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSelectedIP(null);

    try {
      const searchResults = await storyProtocolService.searchIPs(searchQuery);
      
      if (searchResults.length === 0) {
        toast({
          title: 'No Results',
          description: `No IP assets found matching "${searchQuery}"`,
          variant: 'default',
        });
      } else {
        setResults(searchResults);
        if (searchResults.length === 1) {
          // Auto-select if only one result
          setSelectedIP(searchResults[0]);
          onIPSelected?.(searchResults[0]);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Failed',
        description: error instanceof Error ? error.message : 'Failed to search IP assets',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectIP = (ip: IPAsset) => {
    setSelectedIP(ip);
    onIPSelected?.(ip);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Enter IP ID (0x...) or title/name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="px-6"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </div>

      {/* Search Hint */}
      <p className="text-sm text-gray-400">
        Search by IP ID (e.g., 0x1234...) or by title/name
      </p>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">
            Found {results.length} IP asset{results.length !== 1 ? 's' : ''}
          </h3>
          
          {results.map((ip) => (
            <Card
              key={ip.ipId}
              className={`p-4 cursor-pointer transition-all ${
                selectedIP?.ipId === ip.ipId
                  ? 'border-primary-blue bg-primary-blue/10'
                  : 'hover:border-gray-600'
              }`}
              onClick={() => handleSelectIP(ip)}
            >
              <div className="flex items-start gap-4">
                {ip.mediaUrl && (
                  <img
                    src={ip.mediaUrl}
                    alt={ip.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white">{ip.name}</h4>
                    {selectedIP?.ipId === ip.ipId && (
                      <span className="text-xs text-primary-blue">Selected</span>
                    )}
                  </div>
                  {ip.description && (
                    <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                      {ip.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="font-mono">{ip.ipId.slice(0, 10)}...</span>
                    {ip.hederaAssetId && (
                      <span className="text-primary-blue">
                        Linked to Hedera: {ip.hederaAssetId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Selected IP Details */}
      {selectedIP && (
        <Card className="p-4 bg-primary-blue/5 border-primary-blue/30">
          <div className="flex items-start gap-2 mb-3">
            <FileText className="w-5 h-5 text-primary-blue mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-1">Selected IP Asset</h4>
              <p className="text-sm text-gray-400">{selectedIP.name}</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-400">IP ID:</span>
              <span className="ml-2 font-mono text-white">{selectedIP.ipId}</span>
            </div>
            {selectedIP.owner && (
              <div>
                <span className="text-gray-400">Owner:</span>
                <span className="ml-2 font-mono text-white">{selectedIP.owner}</span>
              </div>
            )}
            {selectedIP.hederaAssetId && (
              <div>
                <span className="text-gray-400">Hedera Asset:</span>
                <span className="ml-2 text-primary-blue">{selectedIP.hederaAssetId}</span>
              </div>
            )}
            {selectedIP.txHash && (
              <div>
                <span className="text-gray-400">Transaction:</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${selectedIP.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-primary-blue hover:underline"
                >
                  View on Etherscan
                </a>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* No Results Message */}
      {!isSearching && results.length === 0 && searchQuery && (
        <Card className="p-4 border-gray-700">
          <div className="flex items-center gap-2 text-gray-400">
            <AlertCircle className="w-5 h-5" />
            <p>No IP assets found. Try a different search term.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default IPSearch;


