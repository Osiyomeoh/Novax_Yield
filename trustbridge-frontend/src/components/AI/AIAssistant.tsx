import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Card, { CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { Badge } from '../UI/Badge';
import { 
  Bot, 
  TrendingUp, 
  Target, 
  Send,
  Loader2,
  MessageCircle
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { TRUSTBRIDGE_AI_CONTEXT, enhanceQueryWithContext } from './ai-training-context';

interface AIAssistantProps {
  className?: string;
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

const AIAssistant: React.FC<AIAssistantProps> = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queryType, setQueryType] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const { toast } = useToast();

  // Fetch AI usage data
  const fetchAIUsage = async () => {
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
    }
  };

  // Fetch usage on component mount
  React.useEffect(() => {
    fetchAIUsage();
  }, []);


  const handleSubmit = async (customQuery?: string) => {
    const queryToSubmit = customQuery || query;
    if (!queryToSubmit.trim()) return;

    setIsLoading(true);
    setResponse('');

    try {
      const response = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          query: enhanceQueryWithContext(queryToSubmit),
          context: {
            platform: 'TrustBridge Africa',
            userRole: 'assistant',
            trainingContext: TRUSTBRIDGE_AI_CONTEXT
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      setResponse(data.response);
      setQueryType(data.metadata?.queryType || 'general');
      setConfidence(data.metadata?.confidence || 0.8);
      
      // Refresh AI usage data after successful query
      fetchAIUsage();

    } catch (error) {
      // Silently handle backend unavailability - this is expected when backend is down
      setResponse('I apologize, but the AI service is currently unavailable. The backend server appears to be offline. Please try again later or contact support if the issue persists.');
      toast({
        title: 'AI Service Unavailable',
        description: 'The AI service is currently offline. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getQueryTypeIcon = (type: string) => {
    switch (type) {
      case 'general_advice':
        return <MessageCircle className="w-4 h-4" />;
      case 'risk_assessment':
        return <Shield className="w-4 h-4" />;
      case 'portfolio_optimization':
        return <Target className="w-4 h-4" />;
      case 'market_analysis':
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getQueryTypeColor = (type: string) => {
    switch (type) {
      case 'general_advice':
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              TrustBridge Africa AI Assistant
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your AI assistant for TrustBridge Africa
            </p>
          </div>
        </div>
        
        {/* AI Usage Display */}
        {aiUsage && (
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{aiUsage.dailyUsage}/{aiUsage.dailyLimit} today</span>
            </div>
            <div className="flex items-center space-x-1 bg-primary-blue dark:bg-primary-blue px-3 py-1 rounded-full">
              <TrendingUp className="w-4 h-4 text-primary-blue" />
              <span className="font-medium">{aiUsage.monthlyUsage}/{aiUsage.monthlyLimit} this month</span>
            </div>
          </div>
        )}
      </div>


      {/* Custom Query */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Ask a Question</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about TrustBridge Africa or our platform..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={!query.trim() || isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {/* Response */}
          {response && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
            >
              <div className="space-y-3">
                {/* Response metadata */}
                {(queryType || confidence > 0) && (
                  <div className="flex items-center space-x-2">
                    {queryType && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getQueryTypeColor(queryType)}`}
                      >
                        {getQueryTypeIcon(queryType)}
                        <span className="ml-1 capitalize">
                          {queryType.replace('_', ' ')}
                        </span>
                      </Badge>
                    )}
                    {confidence > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(confidence * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                )}

                {/* Response content */}
                <div 
                  className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(response) }}
                />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAssistant;
