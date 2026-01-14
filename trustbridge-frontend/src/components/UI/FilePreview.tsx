import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  Image, 
  File, 
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { ipfsService } from '../../services/ipfs';

interface FilePreviewProps {
  cid: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({
  cid,
  fileName,
  fileType,
  fileSize,
  isOpen,
  onClose,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && cid) {
      loadFile();
    }
  }, [isOpen, cid]);

  const loadFile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the file URL from IPFS
      const url = ipfsService.getFileUrl(cid);
      setFileUrl(url);
      
      // Preload the file to check if it's accessible
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('File not accessible');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const handleOpenExternal = () => {
    window.open(fileUrl, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-400" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-400" />;
    } else {
      return <File className="w-8 h-8 text-gray-400" />;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-blue-light mx-auto mb-4" />
            <p className="text-off-white/70">Loading file...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-2">Failed to load file</p>
            <p className="text-off-white/70 text-sm">{error}</p>
          </div>
        </div>
      );
    }

    if (fileType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-64">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-lg"
            onLoad={() => setIsLoading(false)}
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }

    if (fileType === 'application/pdf') {
      return (
        <div className="h-64">
          <iframe
            src={ipfsService.getPreviewUrl(cid, fileType)}
            className="w-full h-full rounded-lg border-0"
            title={fileName}
            onLoad={() => setIsLoading(false)}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      );
    }

    // For other file types, show a download prompt
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          {getFileIcon()}
          <p className="text-off-white mt-4 mb-2">{fileName}</p>
          <p className="text-off-white/70 text-sm mb-4">
            {fileSize && formatFileSize(fileSize)}
          </p>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-primary-blue text-black rounded-lg font-medium hover:bg-primary-blue-light transition-colors"
          >
            Download File
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${
          isFullscreen ? 'p-0' : ''
        }`}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-gray-900 rounded-xl border border-gray-700 shadow-2xl ${
            isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl max-h-[90vh]'
          } ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              {getFileIcon()}
              <div>
                <h3 className="text-lg font-semibold text-off-white truncate max-w-md">
                  {fileName}
                </h3>
                {fileSize && (
                  <p className="text-sm text-off-white/70">
                    {formatFileSize(fileSize)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-off-white/70 hover:text-off-white transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
              
              <button
                onClick={handleDownload}
                className="p-2 text-off-white/70 hover:text-primary-blue-light transition-colors"
                title="Download file"
              >
                <Download className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleOpenExternal}
                className="p-2 text-off-white/70 hover:text-primary-blue-light transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
              
              <button
                onClick={onClose}
                className="p-2 text-off-white/70 hover:text-red-400 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-auto">
            {renderContent()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-700">
            <div className="text-sm text-off-white/70">
              <span className="font-mono">CID: {cid}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-off-white/70">
                Stored on IPFS
              </span>
              <div className="w-2 h-2 bg-primary-blue rounded-full"></div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FilePreview;
