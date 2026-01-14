import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './Card';

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

interface ProgressModalProps {
  isOpen: boolean;
  title: string;
  steps: ProgressStep[];
  currentStepId?: string;
  error?: string | null;
  onClose?: () => void;
}

const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  title,
  steps,
  currentStepId,
  error,
  onClose
}) => {
  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-primary-blue" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-primary-blue';
      case 'processing':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-md mx-4"
        >
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">{title}</h3>
                {onClose && !steps.some(s => s.status === 'processing') && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => {
                  const isCurrent = currentStepId === step.id || 
                    (!currentStepId && step.status === 'processing');
                  
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                        isCurrent ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-gray-800/50'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getStepIcon(step)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${getStepColor(step)}`}>
                          {step.label}
                        </p>
                        {step.message && (
                          <p className="text-xs text-gray-400 mt-1">
                            {step.message}
                          </p>
                        )}
                        {step.status === 'processing' && (
                          <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                            <motion.div
                              className="bg-blue-500 h-1.5 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: '100%' }}
                              transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-500">Error</p>
                    <p className="text-xs text-red-400 mt-1">{error}</p>
                  </div>
                </motion.div>
              )}

              {steps.every(s => s.status === 'completed') && !error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-3 bg-primary-blue/10 border border-primary-blue/30 rounded-lg"
                >
                  <p className="text-sm font-medium text-primary-blue text-center">
                    ✓ All steps completed successfully!
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProgressModal;


