import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Card, { CardContent, CardHeader, CardTitle } from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import { Textarea } from '../UI/Textarea';
import { Badge } from '../UI/Badge';
import { 
  Bot, 
  Image, 
  Video, 
  Mic, 
  Search, 
  MapPin, 
  Sparkles,
  Loader2,
  Upload,
  Download,
  Play,
  Pause,
  Volume2
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { TRUSTBRIDGE_AI_CONTEXT, enhanceQueryWithContext } from './ai-training-context';

interface AIStudioProps {
  className?: string;
}

const AIStudio: React.FC<AIStudioProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const tabs = [
    { id: 'chat', label: 'AI Chat', icon: <Bot className="w-4 h-4" /> },
    { id: 'image', label: 'Image Gen', icon: <Image className="w-4 h-4" /> },
    { id: 'video', label: 'Video Gen', icon: <Video className="w-4 h-4" /> },
    { id: 'audio', label: 'Audio', icon: <Mic className="w-4 h-4" /> },
    { id: 'search', label: 'Search', icon: <Search className="w-4 h-4" /> },
    { id: 'maps', label: 'Maps', icon: <MapPin className="w-4 h-4" /> },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: 'File Uploaded',
        description: `${file.name} has been uploaded successfully`,
        variant: 'default'
      });
    }
  };

  const handleGenerate = async (type: string) => {
    if (!prompt.trim()) {
      toast({
        title: 'Missing Prompt',
        description: 'Please enter a prompt before generating',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let endpoint = '';
      let body: any = {};

      switch (type) {
        case 'chat':
          endpoint = '/api/ai/query';
          body = { 
            query: enhanceQueryWithContext(prompt),
            context: {
              platform: 'TrustBridge Africa',
              userRole: 'investment_advisor',
              trainingContext: TRUSTBRIDGE_AI_CONTEXT
            }
          };
          break;
        case 'image':
          endpoint = '/api/ai/generate-image';
          body = { prompt };
          break;
        case 'video':
          endpoint = '/api/ai/generate-video';
          body = { prompt };
          break;
        case 'audio':
          if (!uploadedFile) {
            toast({
              title: 'No Audio File',
              description: 'Please upload an audio file first',
              variant: 'destructive'
            });
            setLoading(false);
            return;
          }
          endpoint = '/api/ai/transcribe-audio';
          const audioBase64 = await fileToBase64(uploadedFile);
          body = { 
            audioBase64, 
            mimeType: uploadedFile.type 
          };
          break;
        case 'search':
          endpoint = '/api/ai/search';
          body = { query: prompt };
          break;
        case 'maps':
          endpoint = '/api/ai/maps';
          body = { query: prompt };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      setResult(data);

      toast({
        title: 'Success',
        description: `${type} generated successfully`,
        variant: 'default'
      });

    } catch (error) {
      // Silently handle backend unavailability - this is expected when backend is down
      toast({
        title: 'AI Service Unavailable',
        description: 'The AI service is currently offline. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result?.toString().split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const renderResult = () => {
    if (!result) return null;

    switch (activeTab) {
      case 'chat':
        return (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {result.response}
            </div>
            {result.suggestions && (
              <div className="mt-4 flex flex-wrap gap-2">
                {result.suggestions.map((suggestion: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {suggestion}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {result.imageUrl && (
              <div className="space-y-4">
                <img 
                  src={result.imageUrl} 
                  alt={result.prompt} 
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Prompt:</strong> {result.prompt}
                </div>
                <Button 
                  onClick={() => window.open(result.imageUrl, '_blank')}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Image
                </Button>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {result.videoUrl && (
              <div className="space-y-4">
                <video 
                  src={result.videoUrl} 
                  controls 
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Prompt:</strong> {result.prompt}
                </div>
                <Button 
                  onClick={() => window.open(result.videoUrl, '_blank')}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Video
                </Button>
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              <strong>Transcription:</strong>
              <br />
              {result.transcription}
            </div>
          </div>
        );

      case 'search':
        return (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="space-y-3">
              {result.searchResults?.map((item: any, index: number) => (
                <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">{item.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.snippet}</p>
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {item.url}
                  </a>
                </div>
              ))}
            </div>
          </div>
        );

      case 'maps':
        return (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="space-y-3">
              {result.mapsData?.map((place: any, index: number) => (
                <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">{place.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{place.address}</p>
                  {place.rating && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-sm text-yellow-600">⭐ {place.rating}</span>
                      <span className="text-xs text-gray-500">({place.reviews} reviews)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Google AI Studio
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Powered by Gemini - Generate content with AI
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center space-x-2 whitespace-nowrap"
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            {tabs.find(tab => tab.id === activeTab)?.icon}
            <span>{tabs.find(tab => tab.id === activeTab)?.label}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload for Audio */}
          {activeTab === 'audio' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload Audio File</label>
              <div className="flex items-center space-x-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
              {uploadedFile && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Selected: {uploadedFile.name}
                </div>
              )}
            </div>
          )}

          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {activeTab === 'audio' ? 'Analysis Prompt (optional)' : 'Prompt'}
            </label>
            {activeTab === 'chat' ? (
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask me anything about investments, market trends, or portfolio optimization..."
                rows={3}
                className="w-full"
              />
            ) : (
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  activeTab === 'image' ? 'Describe the image you want to generate...' :
                  activeTab === 'video' ? 'Describe the video you want to generate...' :
                  activeTab === 'audio' ? 'Describe what you want to analyze in the audio...' :
                  activeTab === 'search' ? 'Enter your search query...' :
                  activeTab === 'maps' ? 'Enter location or place to search...' :
                  'Enter your prompt...'
                }
                className="w-full"
              />
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={() => handleGenerate(activeTab)}
            disabled={loading || !prompt.trim() || (activeTab === 'audio' && !uploadedFile)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {loading ? 'Generating...' : `Generate ${tabs.find(tab => tab.id === activeTab)?.label}`}
          </Button>

          {/* Result */}
          {renderResult()}
        </CardContent>
      </Card>

      {/* Usage Limits Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Studio Usage Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium">Daily Limit</div>
                <div className="text-gray-600 dark:text-gray-400">50 queries per day</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">Monthly Limit</div>
                <div className="text-gray-600 dark:text-gray-400">1000 queries per month</div>
              </div>
            </div>
            <div className="p-3 bg-primary-blue dark:bg-primary-blue/20 rounded-lg">
              <div className="text-sm text-primary-blue dark:text-primary-blue">
                <strong>Free to use!</strong> All AI features are available within your daily and monthly limits.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIStudio;
