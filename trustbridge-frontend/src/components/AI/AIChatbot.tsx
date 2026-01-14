import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../hooks/useToast';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Card, { CardContent, CardHeader, CardTitle } from '../UI/Card';
import { Badge } from '../UI/Badge';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  X, 
  Minimize2,
  Maximize2,
  Sparkles,
  TrendingUp,
  Shield,
  Target,
  Coins,
  AlertTriangle
} from 'lucide-react';
import { TRUSTBRIDGE_AI_CONTEXT, getContextualResponse, enhanceQueryWithContext } from './ai-training-context';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  metadata?: {
    queryType: string;
    confidence: number;
    processingTime: number;
  };
}

interface AIUsage {
  dailyUsage: number;
  monthlyUsage: number;
  totalQueries: number;
  dailyLimit: number;
  monthlyLimit: number;
}

interface AIChatbotProps {
  className?: string;
  defaultOpen?: boolean;
  onAssetAnalysis?: (assetData: any) => void;
  onPortfolioOptimization?: (portfolioData: any) => void;
}

// Simple markdown formatter
const formatMarkdown = (text: string) => {
  return text
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // Bullet points
    .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Wrap in paragraph tags
    .split('<br>')
    .map(line => line.trim() ? `<p class="mb-2">${line}</p>` : '')
    .join('');
};

const AIChatbot: React.FC<AIChatbotProps> = ({ 
  className = '', 
  defaultOpen = false,
  onAssetAnalysis,
  onPortfolioOptimization 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [aiUsage, setAiUsage] = useState<AIUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Check screen size for responsive positioning
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 480);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Fetch AI usage data
  const fetchAIUsage = async () => {
    setLoadingUsage(true);
    try {
      const response = await fetch('/api/ai/usage', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const usage = await response.json();
          setAiUsage(usage);
        } else {
          // Response is not JSON (likely HTML error page)
          throw new Error('Response is not JSON');
        }
      } else {
        // Backend not running or no auth - set default values
        setAiUsage({
          dailyUsage: 0,
          monthlyUsage: 0,
          totalQueries: 0,
          dailyLimit: 50,
          monthlyLimit: 1000
        });
      }
    } catch (error) {
      // Silently handle backend unavailability - this is expected when backend is down
      // Set default values when backend is not available
      setAiUsage({
        dailyUsage: 0,
        monthlyUsage: 0,
        totalQueries: 0,
        dailyLimit: 50,
        monthlyLimit: 1000
      });
    } finally {
      setLoadingUsage(false);
    }
  };

  // Initialize with welcome message and fetch usage
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: `🌍 Welcome to TrustBridge Africa! I'm your AI investment advisor, specialized in African markets and blockchain-based fractional ownership.

**How I Can Help:**
• African investment opportunities (real estate, agriculture, infrastructure)
• Fractional ownership guidance and risk assessment
• Portfolio optimization and market intelligence
• Platform navigation and trading support

**Usage:** Free to use within limits (50 daily, 1000 monthly queries)

Ready to explore African investment opportunities? Ask me anything!`,
        timestamp: new Date(),
        suggestions: [
          'What is TrustBridge Africa?',
          'How do I invest in African real estate?',
          'What are the best African investment opportunities?',
          'How does fractional ownership work?',
          'Tell me about AMC pools'
        ]
      }]);
    }

    // Fetch AI usage when chat opens
    if (isOpen) {
      fetchAIUsage();
    }
  }, [messages.length, isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          query: enhanceQueryWithContext(userMessage.content),
          context: {
            platform: 'TrustBridge Africa',
            userRole: 'investment_advisor',
            trainingContext: TRUSTBRIDGE_AI_CONTEXT
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const aiResponse = await response.json();
      
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: aiResponse.response,
        timestamp: new Date(),
        suggestions: aiResponse.suggestions,
        metadata: aiResponse.metadata
      };

      // Simulate typing delay for better UX
      setTimeout(() => {
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        setIsTyping(false);
        
        // Refresh AI usage data after successful query
        fetchAIUsage();
      }, 1000);

    } catch (error) {
      // Silently handle backend unavailability - this is expected when backend is down
      setIsLoading(false);
      setIsTyping(false);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: 'I apologize, but the AI service is currently unavailable. The backend server appears to be offline. Please try again later or contact support if the issue persists.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'AI Service Unavailable',
        description: 'The AI service is currently offline. Please try again later.',
        variant: 'destructive'
      });
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getQueryTypeIcon = (queryType: string) => {
    switch (queryType) {
      case 'investment_advice':
        return <TrendingUp className="w-4 h-4" />;
      case 'risk_assessment':
        return <Shield className="w-4 h-4" />;
      case 'portfolio_optimization':
        return <Target className="w-4 h-4" />;
      case 'market_analysis':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getQueryTypeColor = (queryType: string) => {
    switch (queryType) {
      case 'investment_advice':
        return 'bg-primary-blue text-primary-blue border-primary-blue';
      case 'risk_assessment':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'portfolio_optimization':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'market_analysis':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 ${isSmallScreen ? 'bottom-20' : ''} ${className}`}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl border-2 border-white/20 backdrop-blur-sm"
            style={{
              width: 'clamp(48px, 12vw, 64px)',
              height: 'clamp(48px, 12vw, 64px)',
              zIndex: 9999,
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4), 0 4px 16px rgba(0, 0, 0, 0.1)'
            }}
          >
            <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" />
          </Button>
        </motion.div>
        
        {/* Floating notification badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold"
        >
          AI
        </motion.div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        className={`fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 ${isSmallScreen ? 'bottom-20' : ''} ${className}`}
        style={{
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        <Card className={`w-80 sm:w-96 shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl ${isMinimized ? 'h-16' : ''} max-w-[calc(100vw-32px)] ${isSmallScreen ? 'h-[calc(100vh-120px)]' : 'h-[500px] sm:h-[600px]'}`}>
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white rounded-t-lg relative overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mb-16"></div>
            </div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Bot className="w-5 h-5" />
                </motion.div>
                <CardTitle className="text-lg font-bold">TrustBridge AI</CardTitle>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Smart
                </Badge>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-white hover:bg-white/20 transition-all duration-200"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* AI Usage Display */}
            {aiUsage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 space-y-2 relative z-10"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 bg-white/10 rounded-full px-2 py-1">
                      <Target className="w-3 h-3 text-blue-300" />
                      <span className="text-white/90">{aiUsage.dailyUsage}/{aiUsage.dailyLimit} today</span>
                    </div>
                    <div className="flex items-center space-x-1 bg-white/10 rounded-full px-2 py-1">
                      <TrendingUp className="w-3 h-3 text-primary-blue" />
                      <span className="text-white/90">{aiUsage.monthlyUsage}/{aiUsage.monthlyLimit} this month</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-primary-blue font-medium text-center bg-white/10 rounded-full py-1">
                  Free to use within limits
                </div>
              </motion.div>
            )}
          </CardHeader>

          {!isMinimized && (
            <CardContent className={`p-0 flex flex-col ${isSmallScreen ? 'h-[calc(100%-120px)]' : 'h-[420px] sm:h-[520px]'}`}>
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-800/50 min-h-0">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <motion.div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                            message.type === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          }`}
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </motion.div>
                        <motion.div 
                          className={`rounded-2xl p-4 shadow-lg backdrop-blur-sm ${
                            message.type === 'user'
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                              : 'bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-700/50'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <div 
                            className="text-sm prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
                          />
                          
                          {/* Metadata */}
                          {message.metadata && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.2 }}
                              className="mt-3 flex items-center space-x-2"
                            >
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getQueryTypeColor(message.metadata.queryType)}`}
                              >
                                {getQueryTypeIcon(message.metadata.queryType)}
                                <span className="ml-1 capitalize">
                                  {message.metadata.queryType.replace('_', ' ')}
                                </span>
                              </Badge>
                              {message.metadata.confidence && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(message.metadata.confidence * 100)}% confidence
                                </Badge>
                              )}
                            </motion.div>
                          )}
                          
                          {/* Suggestions */}
                          {message.suggestions && message.suggestions.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="mt-3 space-y-2"
                            >
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Suggestions:</div>
                              <div className="flex flex-wrap gap-2">
                                {message.suggestions.map((suggestion, suggestionIndex) => (
                                  <motion.div
                                    key={suggestionIndex}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 + suggestionIndex * 0.1 }}
                                  >
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSuggestionClick(suggestion)}
                                      className="text-xs h-7 hover:scale-105 transition-all duration-200 bg-white/50 dark:bg-gray-700/50"
                                    >
                                      {suggestion}
                                    </Button>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Typing indicator */}
                  {isTyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-start space-x-2">
                        <motion.div 
                          className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-lg"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <Bot className="w-4 h-4 text-white" />
                        </motion.div>
                        <motion.div 
                          className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-4 shadow-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <div className="flex space-x-1">
                            <motion.div 
                              className="w-2 h-2 bg-blue-500 rounded-full"
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 0.6, repeat: Infinity }}
                            ></motion.div>
                            <motion.div 
                              className="w-2 h-2 bg-purple-500 rounded-full"
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                            ></motion.div>
                            <motion.div 
                              className="w-2 h-2 bg-blue-500 rounded-full"
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                            ></motion.div>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex-shrink-0 min-h-[100px]">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me about investments..."
                      disabled={isLoading}
                      className="flex-1 bg-white/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/50"
                    />
                    {inputValue.trim() && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      >
                        <div className="w-2 h-2 bg-primary-blue rounded-full animate-pulse"></div>
                      </motion.div>
                    )}
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIChatbot;
