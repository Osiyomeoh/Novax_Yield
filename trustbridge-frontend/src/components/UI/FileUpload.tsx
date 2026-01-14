import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  FileText, 
  Image, 
  File, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  Download,
  Trash2
} from 'lucide-react';
import { ipfsService, IPFSUploadResult, IPFSFileMetadata } from '../../services/ipfs';
import { useToast } from '../../hooks/useToast';

export interface UploadedFile {
  id: string;
  file: File;
  cid?: string;
  ipfsUrl?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  metadata?: IPFSFileMetadata;
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  onFileUpload?: (result: IPFSUploadResult) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  allowMultiple?: boolean;
  category?: string;
  description?: string;
  className?: string;
  showUploadButton?: boolean; // Whether to show individual upload button
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesChange,
  onFileUpload,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx', '.txt'],
  allowMultiple = true,
  category = 'general',
  description = 'Upload files',
  className = '',
  showUploadButton = true
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-400" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-400" />;
    } else {
      return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-primary-blue" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Upload className="w-4 h-4 text-gray-400" />;
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`
      };
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type || file.name.toLowerCase().endsWith(type.toLowerCase());
    });

    if (!isValidType) {
      return {
        valid: false,
        error: 'File type not supported'
      };
    }

    return { valid: true };
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: UploadedFile[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const validation = validateFile(file);
      
      if (validation.valid) {
        validFiles.push({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`,
          file,
          status: 'pending',
          metadata: {
            name: file.name,
            type: file.type,
            size: file.size,
            category,
            description: description
          }
        });
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Invalid Files",
        description: errors.join(', ')
      });
    }

    if (validFiles.length > 0) {
      setFiles(prev => {
        const updated = [...prev, ...validFiles];
        // Use setTimeout to avoid state update during render
        setTimeout(() => onFilesChange(updated), 0);
        return updated;
      });
    }
  }, [maxSize, acceptedTypes, category, description, onFilesChange, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    if (event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  }, [addFiles]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const uploadFile = async (uploadedFile: UploadedFile) => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, status: 'uploading' as const }
          : f
      ));

      const result = await ipfsService.uploadFile(uploadedFile.file, uploadedFile.metadata);
      
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { 
              ...f, 
              status: 'completed' as const,
              cid: result.cid,
              ipfsUrl: result.ipfsUrl
            }
          : f
      ));

      onFileUpload?.(result);

      toast({
        variant: "success",
        title: "File Uploaded",
        description: `${uploadedFile.file.name} uploaded successfully to IPFS`
      });

    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { 
              ...f, 
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          : f
      ));

      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: `Failed to upload ${uploadedFile.file.name}`
      });
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      await Promise.all(pendingFiles.map(uploadFile));
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Use setTimeout to avoid state update during render
      setTimeout(() => onFilesChange(updated), 0);
      return updated;
    });
  };

  const retryUpload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      uploadFile(file);
    }
  };

  const openFile = (file: UploadedFile) => {
    if (file.ipfsUrl) {
      window.open(file.ipfsUrl, '_blank');
    }
  };

  const downloadFile = (file: UploadedFile) => {
    if (file.ipfsUrl) {
      const link = document.createElement('a');
      link.href = file.ipfsUrl;
      link.download = file.file.name;
      link.click();
    }
  };

  const pendingFiles = files.filter(f => f.status === 'pending');
  const completedFiles = files.filter(f => f.status === 'completed');
  const errorFiles = files.filter(f => f.status === 'error');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-primary-blue bg-primary-blue/10'
            : 'border-medium-gray hover:border-primary-blue/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload className="w-12 h-12 text-primary-blue-light" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-off-white mb-2">
              {isDragOver ? 'Drop files here' : 'Upload Files'}
            </h3>
            <p className="text-off-white/70 mb-4">
              {description}
            </p>
            <p className="text-sm text-off-white/50">
              Max {Math.round(maxSize / 1024 / 1024)}MB per file • {maxFiles} files max
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-primary-blue text-black rounded-lg font-medium hover:bg-primary-blue-light transition-colors"
          >
            Choose Files
          </button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold text-off-white">
              Files ({files.length})
            </h4>
            {pendingFiles.length > 0 && showUploadButton && (
              <button
                onClick={uploadAllFiles}
                disabled={isUploading}
                className="px-4 py-2 bg-primary-blue-light text-black rounded-lg font-medium hover:bg-primary-blue transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Upload All (${pendingFiles.length})`
                )}
              </button>
            )}
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {files.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-center justify-between p-3 bg-dark-gray rounded-lg border border-medium-gray"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {getFileIcon(file.file.type)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-off-white truncate">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-off-white/70">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {file.error && (
                        <p className="text-xs text-red-400">{file.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getFileStatusIcon(file.status)}
                    
                    {file.status === 'completed' && (
                      <>
                        <button
                          onClick={() => openFile(file)}
                          className="p-1 text-primary-blue-light hover:text-primary-blue transition-colors"
                          title="View file"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadFile(file)}
                          className="p-1 text-primary-blue-light hover:text-primary-blue transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    
                    {file.status === 'error' && (
                      <button
                        onClick={() => retryUpload(file.id)}
                        className="px-2 py-1 text-xs bg-primary-blue-light text-black rounded hover:bg-primary-blue transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Summary */}
      {files.length > 0 && (
        <div className="flex justify-between text-sm text-off-white/70">
          <span>
            {completedFiles.length} completed, {pendingFiles.length} pending, {errorFiles.length} failed
          </span>
          {completedFiles.length > 0 && (
            <span className="text-primary-blue">
              {completedFiles.length} files uploaded to IPFS
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
