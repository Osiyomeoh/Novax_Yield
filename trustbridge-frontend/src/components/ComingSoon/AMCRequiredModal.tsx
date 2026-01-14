import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Shield, CheckCircle, Calendar, Mail, ArrowRight } from 'lucide-react';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { useToast } from '../../hooks/useToast';
import { AMC_CONSTANTS } from '../../utils/amcRequirements';

interface AMCRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryDescription: string;
}

const AMCRequiredModal: React.FC<AMCRequiredModalProps> = ({
  isOpen,
  onClose,
  categoryName,
  categoryDescription
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasJoinedWaitlist, setHasJoinedWaitlist] = useState(false);

  const handleJoinWaitlist = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement actual waitlist signup API
      // For now, just simulate the submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store in localStorage for now
      const waitlist = JSON.parse(localStorage.getItem('rwa_waitlist') || '[]');
      waitlist.push({
        email,
        category: categoryName,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('rwa_waitlist', JSON.stringify(waitlist));
      
      setHasJoinedWaitlist(true);
      toast({
        title: 'Successfully Joined Waitlist!',
        description: "We'll notify you when RWA tokenization with AMC integration launches.",
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to join waitlist. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
              {/* Header */}
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-blue to-primary-blue-light rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">AMC Partnership Required</h2>
                      <p className="text-gray-400 text-sm">{categoryName} Tokenization</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Info Section */}
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">What is an AMC?</h3>
                      <p className="text-gray-300 leading-relaxed">
                        {categoryDescription}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Why AMC Required */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Why AMC is Required</h3>
                  <div className="space-y-3">
                    {[
                      'Regulatory compliance and legal oversight',
                      'Professional asset valuation and management',
                      'Investor protection and risk management',
                      'Transparent reporting and auditing',
                      'Dispute resolution and governance'
                    ].map((reason, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-primary-blue flex-shrink-0" />
                        <span className="text-gray-300">{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Launch Timeline */}
                <div className="bg-gradient-to-br from-primary-blue/10 to-primary-blue-light/10 border border-primary-blue/20 rounded-xl p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <Calendar className="w-6 h-6 text-primary-blue" />
                    <h3 className="text-lg font-semibold text-white">Coming Soon</h3>
                  </div>
                  <p className="text-gray-300 mb-4">
                    RWA tokenization with AMC integration is currently in development and will be available in <span className="text-primary-blue font-semibold">{AMC_CONSTANTS.LAUNCH_DATE}</span>.
                  </p>
                  <p className="text-gray-400 text-sm">
                    We're partnering with licensed Asset Management Companies to ensure full regulatory compliance and professional oversight for real-world asset tokenization.
                  </p>
                </div>

                {/* Waitlist Signup */}
                {!hasJoinedWaitlist ? (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Join the Waitlist</h3>
                    <p className="text-gray-400 mb-4">
                      Be the first to know when {categoryName} tokenization with AMC integration launches.
                    </p>
                    <div className="flex space-x-3">
                      <div className="flex-1">
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full"
                          icon={<Mail className="w-5 h-5" />}
                        />
                      </div>
                      <Button
                        onClick={handleJoinWaitlist}
                        disabled={isSubmitting}
                        className="bg-gradient-to-r from-primary-blue to-primary-blue-light text-black font-semibold"
                      >
                        {isSubmitting ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <ArrowRight className="w-5 h-5" />
                            </motion.div>
                          </>
                        ) : (
                          <>
                            Join Waitlist
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-primary-blue/10 to-primary-blue-light/10 border border-primary-blue/20 rounded-xl p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-primary-blue mx-auto mb-3" />
                    <h3 className="text-xl font-semibold text-white mb-2">You're on the List!</h3>
                    <p className="text-gray-300">
                      We'll notify you at <span className="text-primary-blue font-semibold">{email}</span> when RWA tokenization launches.
                    </p>
                  </div>
                )}

                {/* AMC Fee Structure */}
                <div className="border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">AMC Fee Structure</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm mb-1">Management Fee</p>
                      <p className="text-white font-semibold">{AMC_CONSTANTS.AMC_FEE_STRUCTURE.management}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm mb-1">Performance Fee</p>
                      <p className="text-white font-semibold">{AMC_CONSTANTS.AMC_FEE_STRUCTURE.performance}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm mb-1">Setup Fee</p>
                      <p className="text-white font-semibold">{AMC_CONSTANTS.AMC_FEE_STRUCTURE.setup}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-800 flex justify-between">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="px-6"
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.open('/amc/about', '_blank')}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-6"
                >
                  Learn More About AMCs
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AMCRequiredModal;




