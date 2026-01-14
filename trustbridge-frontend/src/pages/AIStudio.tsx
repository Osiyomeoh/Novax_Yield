import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Card, { CardContent, CardHeader, CardTitle } from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import { Textarea } from '../components/UI/Textarea';
import { Badge } from '../components/UI/Badge';
import { 
  Bot, 
  TrendingUp, 
  Shield, 
  Target, 
  Sparkles,
  Send,
  Loader2,
  MessageCircle,
  BarChart3,
  PieChart,
  DollarSign,
  Coins,
  Image,
  Video,
  Mic,
  Search,
  MapPin,
  Download,
  Eye,
  Wand2,
  Brain,
  Zap,
  Globe,
  Camera,
  Headphones
} from 'lucide-react';
import { useToast } from '../hooks/useToast';

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

const AIStudio = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queryType, setQueryType] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const { toast } = useToast();

  // Image Generation State
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Video Generation State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // Audio Transcription State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Web Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Maps Data State
  const [mapsQuery, setMapsQuery] = useState('');
  const [mapsData, setMapsData] = useState<any[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);

  const handleGenerate = async (type: string) => {
    if (!query.trim() && !imagePrompt.trim() && !videoPrompt.trim() && !searchQuery.trim() && !mapsQuery.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a prompt or query before generating.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let endpoint = '';
      let payload: any = {};

      switch (type) {
        case 'chat':
          endpoint = '/api/ai/query';
          payload = { query };
          break;
        case 'image':
          endpoint = '/api/ai/generate-image';
          payload = { prompt: imagePrompt };
          break;
        case 'video':
          endpoint = '/api/ai/generate-video';
          payload = { prompt: videoPrompt };
          break;
        case 'search':
          endpoint = '/api/ai/search';
          payload = { query: searchQuery };
          break;
        case 'maps':
          endpoint = '/api/ai/maps';
          payload = { query: mapsQuery };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      switch (type) {
        case 'chat':
          setResponse(data.response);
          setQueryType(data.queryType || 'general');
          setConfidence(data.confidence || 0);
          break;
        case 'image':
          setGeneratedImage(data.imageUrl);
          break;
        case 'video':
          setGeneratedVideo(data.videoUrl);
          break;
        case 'search':
          setSearchResults(data.results || []);
          break;
        case 'maps':
          setMapsData(data.results || []);
          break;
      }

      toast({
        title: "Success",
        description: `AI ${type} generated successfully!`,
      });

    } catch (error) {
      console.error(`Error generating ${type}:`, error);
      toast({
        title: "Error",
        description: `Failed to generate ${type}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      setTranscription(data.transcription);

      toast({
        title: "Success",
        description: "Audio transcribed successfully!",
      });

    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Error",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const tabs = [
    { id: 'chat', label: 'AI Chat', icon: MessageCircle },
    { id: 'image', label: 'Image Gen', icon: Image },
    { id: 'video', label: 'Video Gen', icon: Video },
    { id: 'audio', label: 'Audio', icon: Mic },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'maps', label: 'Maps', icon: MapPin },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI Studio
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Powered by Google AI Studio - Generate content with AI
          </p>
        </div>

        {/* Usage Limits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              AI Studio Usage Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Limit</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">50 queries per day</p>
                </div>
                <Badge variant="secondary">Free</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Limit</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">1000 queries per month</p>
                </div>
                <Badge variant="secondary">Free</Badge>
              </div>
            </div>
            <p className="text-sm text-primary-blue dark:text-primary-blue font-medium mt-3">
              Free to use! All AI features are available within your daily and monthly limits.
            </p>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {activeTab === 'chat' && <MessageCircle className="w-5 h-5" />}
                {activeTab === 'image' && <Image className="w-5 h-5" />}
                {activeTab === 'video' && <Video className="w-5 h-5" />}
                {activeTab === 'audio' && <Mic className="w-5 h-5" />}
                {activeTab === 'search' && <Search className="w-5 h-5" />}
                {activeTab === 'maps' && <MapPin className="w-5 h-5" />}
                {tabs.find(t => t.id === activeTab)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeTab === 'chat' && (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Ask me anything about investments, market trends, or portfolio optimization..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
              )}

              {activeTab === 'image' && (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Describe the image you want to generate..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
              )}

              {activeTab === 'video' && (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Describe the video you want to generate..."
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                      id="audio-upload"
                    />
                    <label
                      htmlFor="audio-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Headphones className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Click to upload audio file
                      </span>
                      {audioFile && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          Selected: {audioFile.name}
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'search' && (
                <div className="space-y-4">
                  <Input
                    placeholder="Search the web..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              )}

              {activeTab === 'maps' && (
                <div className="space-y-4">
                  <Input
                    placeholder="Search for places..."
                    value={mapsQuery}
                    onChange={(e) => setMapsQuery(e.target.value)}
                  />
                </div>
              )}

              <Button
                onClick={() => handleGenerate(activeTab)}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate {tabs.find(t => t.id === activeTab)?.label}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output Section */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Content</CardTitle>
            </CardHeader>
            <CardContent>
              {activeTab === 'chat' && response && (
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(response) }}
                />
              )}

              {activeTab === 'image' && generatedImage && (
                <div className="space-y-4">
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full h-auto rounded-lg"
                  />
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}

              {activeTab === 'video' && generatedVideo && (
                <div className="space-y-4">
                  <video
                    src={generatedVideo}
                    controls
                    className="w-full h-auto rounded-lg"
                  />
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}

              {activeTab === 'audio' && transcription && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {transcription}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'search' && searchResults.length > 0 && (
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-sm mb-2">{result.title}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {result.url}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {result.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'maps' && mapsData.length > 0 && (
                <div className="space-y-4">
                  {mapsData.map((place, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-sm mb-2">{place.name}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {place.address}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {place.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!response && !generatedImage && !generatedVideo && !transcription && searchResults.length === 0 && mapsData.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Generate content using the AI Studio features</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIStudio;
