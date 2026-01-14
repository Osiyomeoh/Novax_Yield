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
  Trash2,
  FolderOpen,
  Plus
} from 'lucide-react';
import { ipfsService, IPFSUploadResult, IPFSFileMetadata } from '../../services/ipfs';
import { useToast } from '../../hooks/useToast';

export interface CategorizedFile {
  id: string;
  file: File;
  category: string;
  cid?: string;
  ipfsUrl?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  metadata?: IPFSFileMetadata;
}

interface FileCategory {
  id: string;
  name: string;
  description: string;
  acceptedTypes: string[];
  required: boolean;
  maxFiles?: number;
}

interface UnifiedFileUploadProps {
  onFilesChange: (files: CategorizedFile[]) => void;
  onFileUpload?: (result: IPFSUploadResult) => void;
  maxTotalFiles?: number;
  maxSize?: number; // in bytes
  className?: string;
  categories: FileCategory[];
}

const UnifiedFileUpload: React.FC<UnifiedFileUploadProps> = ({
  onFilesChange,
  onFileUpload,
  maxTotalFiles = 50,
  maxSize = 10 * 1024 * 1024, // 10MB
  className = '',
  categories
}) => {
  const [files, setFiles] = useState<CategorizedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File, categoryId: string): { valid: boolean; error?: string } => {
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`
      };
    }

    const category = categories.find(c => c.id === categoryId);
    if (!category) {
      return { valid: false, error: 'Invalid category' };
    }

    const isValidType = category.acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type.match(type.replace('*', '.*'));
    });

    if (!isValidType) {
      return {
        valid: false,
        error: `File type not supported for ${category.name}`
      };
    }

    return { valid: true };
  };

  const addFiles = useCallback((newFiles: FileList | File[], categoryId: string) => {
    const fileArray = Array.from(newFiles);
    const validFiles: CategorizedFile[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const validation = validateFile(file, categoryId);
      
      if (validation.valid) {
        const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}_${categoryId}`;
        validFiles.push({
          id: fileId,
          file,
          category: categoryId,
          status: 'pending',
          metadata: {
            name: file.name,
            type: file.type,
            size: file.size,
            category: categoryId,
            description: `File for ${categories.find(c => c.id === categoryId)?.name}`
          }
        });
        console.log(`🔍 Created file with ID: ${fileId} for category: ${categoryId}`);
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
        console.log('🔍 Adding files to category:', categoryId, validFiles);
        console.log('🔍 Updated files array:', updated);
        setTimeout(() => onFilesChange(updated), 0);
        return updated;
      });
    }
  }, [categories, maxSize, toast, onFilesChange]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    if (!selectedCategory) {
      toast({
        variant: "destructive",
        title: "Select Category First",
        description: "Please select a file category before dropping files"
      });
      return;
    }

    const droppedFiles = event.dataTransfer.files;
    addFiles(droppedFiles, selectedCategory);
  }, [selectedCategory, addFiles, toast]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    console.log('🔍 File select triggered for category:', selectedCategory);
    console.log('🔍 Selected files:', selectedFiles);
    if (selectedFiles && selectedCategory) {
      addFiles(selectedFiles, selectedCategory);
    } else {
      console.log('❌ No category selected or no files selected');
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedCategory, addFiles]);

  const uploadFile = async (uploadedFile: CategorizedFile) => {
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

      if (onFileUpload) {
        onFileUpload(result);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      setFiles(prev => prev.map(f => 
        f.id === uploadedFile.id 
          ? { 
              ...f, 
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'Upload failed'
            }
          : f
      ));
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      await Promise.all(pendingFiles.map(uploadFile));
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${pendingFiles.length} files to IPFS`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Some files failed to upload. Please try again."
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
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

  const getFilesByCategory = (categoryId: string) => {
    const categoryFiles = files.filter(f => f.category === categoryId);
    console.log(`🔍 Files for category ${categoryId}:`, categoryFiles);
    return categoryFiles;
  };

  const getFileIcon = (file: CategorizedFile) => {
    if (file.file.type.startsWith('image/')) return Image;
    if (file.file.type.includes('pdf')) return FileText;
    return File;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'error': return AlertCircle;
      case 'uploading': return Loader2;
      default: return Upload;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-primary-blue';
      case 'error': return 'text-red-400';
      case 'uploading': return 'text-blue-400 animate-spin';
      default: return 'text-gray-400';
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Category Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-off-white">Select File Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => (
            <motion.button
              key={category.id}
              onClick={() => {
                console.log('🔍 Category selected:', category.id);
                setSelectedCategory(category.id);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedCategory === category.id
                  ? 'border-primary-blue bg-primary-blue/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="w-5 h-5 text-primary-blue" />
                  <span className="font-medium text-off-white">{category.name}</span>
                  {category.required && <span className="text-red-400 text-sm">*</span>}
                </div>
                <p className="text-sm text-gray-400">{category.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {category.acceptedTypes.join(', ')}
                  {category.maxFiles && ` • Max ${category.maxFiles} files`}
                </p>
                {category.required && (
                  <div className="mt-2">
                    {(() => {
                      const categoryFiles = getFilesByCategory(category.id);
                      const completedFiles = categoryFiles.filter(f => f.status === 'completed');
                      const isComplete = completedFiles.length > 0;
                      
                      return (
                        <div className={`text-xs px-2 py-1 rounded ${
                          isComplete 
                            ? 'bg-primary-blue/30 text-primary-blue border border-primary-blue/30' 
                            : 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          {isComplete 
                            ? `✅ ${completedFiles.length} file(s) uploaded to IPFS` 
                            : '⚠️ Upload required to proceed'
                          }
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

          {/* Upload Area */}
      {selectedCategory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-sm text-blue-300">
              📁 <strong>Selected Category:</strong> {categories.find(c => c.id === selectedCategory)?.name}
            </p>
          </div>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragOver
                ? 'border-primary-blue bg-primary-blue/5'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-off-white mb-2">
              Upload Files for {categories.find(c => c.id === selectedCategory)?.name}
            </h3>
            <p className="text-gray-400 mb-4">
              Drag and drop files here, or click to select files
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-primary-blue text-black rounded-lg hover:bg-primary-blue/90 transition-colors"
              >
                Select Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={categories.find(c => c.id === selectedCategory)?.acceptedTypes.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Upload All Button */}
          {pendingCount > 0 && (
            <div className="flex justify-center gap-4">
              <button
                onClick={uploadAllFiles}
                disabled={isUploading}
                className="px-8 py-3 bg-gradient-to-r from-primary-blue to-primary-blue-light text-black rounded-lg font-medium hover:from-primary-blue/90 hover:to-primary-blue-light/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                    Uploading {pendingCount} files...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2 inline" />
                    Upload All {pendingCount} Files to IPFS
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setFiles([]);
                  onFilesChange([]);
                  console.log('🔍 Cleared all files');
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
              >
                <Trash2 className="w-4 h-4 mr-2 inline" />
                Clear All Files
              </button>
            </div>
          )}

          {/* Required Categories Status */}
          {(() => {
            const requiredCategories = categories.filter(c => c.required);
            const completedRequired = requiredCategories.filter(cat => {
              const categoryFiles = getFilesByCategory(cat.id);
              return categoryFiles.filter(f => f.status === 'completed').length > 0;
            });
            
            if (requiredCategories.length > 0) {
              return (
                <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-medium text-off-white mb-3">Required Categories Status</h4>
                  <div className="space-y-2">
                    {requiredCategories.map(cat => {
                      const categoryFiles = getFilesByCategory(cat.id);
                      const completedFiles = categoryFiles.filter(f => f.status === 'completed');
                      const isComplete = completedFiles.length > 0;
                      
                      return (
                        <div key={cat.id} className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">{cat.name}</span>
                          <div className={`text-xs px-2 py-1 rounded ${
                            isComplete 
                              ? 'bg-primary-blue/30 text-primary-blue border border-primary-blue/30' 
                              : 'bg-red-900/30 text-red-400 border border-red-500/30'
                          }`}>
                            {isComplete 
                              ? `✅ ${completedFiles.length} uploaded` 
                              : '❌ Not uploaded'
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {completedRequired.length === requiredCategories.length && (
                    <div className="mt-3 text-center">
                      <span className="text-primary-blue text-sm font-medium">
                        🎉 All required files uploaded! You can now proceed to the next step.
                      </span>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </motion.div>
      )}

      {/* Files by Category */}
      <div className="space-y-6">
        {categories.map(category => {
          const categoryFiles = getFilesByCategory(category.id);
          if (categoryFiles.length === 0) return null;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-off-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary-blue" />
                  {category.name} ({categoryFiles.length} files)
                </h4>
                <div className="flex gap-2 text-sm">
                  <span className="text-primary-blue">
                    {categoryFiles.filter(f => f.status === 'completed').length} completed
                  </span>
                  {categoryFiles.filter(f => f.status === 'error').length > 0 && (
                    <span className="text-red-400">
                      {categoryFiles.filter(f => f.status === 'error').length} failed
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {categoryFiles.map(file => {
                  const FileIcon = getFileIcon(file);
                  const StatusIcon = getStatusIcon(file.status);
                  
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-off-white">{file.file.name}</p>
                          <p className="text-xs text-gray-400">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${getStatusColor(file.status)}`} />
                        
                        {file.status === 'completed' && file.ipfsUrl && (
                          <button
                            onClick={() => window.open(file.ipfsUrl, '_blank')}
                            className="p-1 text-gray-400 hover:text-primary-blue transition-colors"
                            title="View on IPFS"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {file.status === 'error' && (
                          <button
                            onClick={() => retryUpload(file.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Retry upload"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gray-800 rounded-lg"
        >
          <h4 className="text-md font-medium text-off-white mb-2">Upload Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-400">Total Files:</span>
              <span className="text-off-white ml-2">{files.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Completed:</span>
              <span className="text-primary-blue ml-2">{completedCount}</span>
            </div>
            <div>
              <span className="text-gray-400">Pending:</span>
              <span className="text-yellow-400 ml-2">{pendingCount}</span>
            </div>
            <div>
              <span className="text-gray-400">Failed:</span>
              <span className="text-red-400 ml-2">{errorCount}</span>
            </div>
          </div>
          
          {/* Debug: Show all files by category */}
          <div className="mt-4 p-3 bg-gray-700 rounded text-xs">
            <h5 className="text-gray-300 mb-2">Debug - Files by Category:</h5>
            {categories.map(cat => {
              const catFiles = getFilesByCategory(cat.id);
              if (catFiles.length === 0) return null;
              return (
                <div key={cat.id} className="mb-1">
                  <span className="text-blue-400">{cat.name}:</span>
                  <span className="text-gray-300 ml-2">
                    {catFiles.map(f => f.file.name).join(', ')}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default UnifiedFileUpload;
