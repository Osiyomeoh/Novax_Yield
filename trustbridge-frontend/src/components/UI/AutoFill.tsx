import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import Button from './Button';
import { 
  Zap, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AutoFillService, AutoFillData } from '../../services/autoFillService';

interface AutoFillProps {
  onAutoFill: (data: AutoFillData) => void;
  disabled?: boolean;
  className?: string;
}

const AutoFill: React.FC<AutoFillProps> = ({ 
  onAutoFill, 
  disabled = false, 
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  
  const autoFillService = AutoFillService.getInstance();
  const availableDataSets = autoFillService.getAvailableDataSets();

  const handleAutoFill = async (dataType: string) => {
    if (disabled) return;
    
    setIsLoading(true);
    setLastUsed(dataType);
    
    try {
      // Simulate loading delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const testData = autoFillService.getTestData(dataType as any);
      onAutoFill(testData);
    } catch (error) {
      console.error('Auto-fill error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomFill = async () => {
    if (disabled) return;
    
    setIsLoading(true);
    setLastUsed('random');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const randomData = autoFillService.getRandomTestData();
      onAutoFill(randomData);
    } catch (error) {
      console.error('Random fill error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDataSetDisplayName = (dataType: string): string => {
    const displayNames: Record<string, string> = {
      farmProduce: '🌾 Farm Produce (Cocoa)',
      realEstate: '🏢 Real Estate (Apartment)',
      farmland: '🚜 Farmland (Rice Farm)',
      vehicle: '🚛 Vehicle (Truck)'
    };
    return displayNames[dataType] || dataType;
  };

  return (
    <Card variant="glass" className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-primary-blue" />
          Auto-Fill for Testing
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto p-1"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomFill}
            disabled={disabled || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading && lastUsed === 'random' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            Random Fill
          </Button>
          
          {lastUsed && (
            <div className="flex items-center gap-1 text-sm text-primary-blue-light">
              <CheckCircle className="w-4 h-4" />
              Last used: {getDataSetDisplayName(lastUsed)}
            </div>
          )}
        </div>

        {/* Expanded Options */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="text-sm text-off-white/70 mb-3">
              Choose a specific test data set:
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableDataSets.map((dataType) => (
                <Button
                  key={dataType}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAutoFill(dataType)}
                  disabled={disabled || isLoading}
                  className="justify-start text-left h-auto p-3 hover:bg-primary-blue/10"
                >
                  <div className="flex items-center gap-2 w-full">
                    {isLoading && lastUsed === dataType ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-primary-blue" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-primary-blue/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary-blue" />
                      </div>
                    )}
                    <span className="text-sm">{getDataSetDisplayName(dataType)}</span>
                  </div>
                </Button>
              ))}
            </div>

            <div className="pt-2 border-t border-border-accent/20">
              <div className="flex items-start gap-2 text-xs text-off-white/60">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Auto-fill includes:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Complete form data with realistic values</li>
                    <li>• Asset information and ownership details</li>
                    <li>• Location and valuation data</li>
                    <li>• Proper validation and formatting</li>
                    <li>• <strong>Note:</strong> You still need to upload real documents and photos</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoFill;
