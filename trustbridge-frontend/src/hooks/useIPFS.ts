import { useState, useCallback } from 'react';
import { ipfsService, IPFSUploadResult, IPFSFileMetadata } from '../services/ipfs';
import { useToast } from './useToast';

interface UseIPFSOptions {
  onUploadSuccess?: (result: IPFSUploadResult) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number;
  allowedTypes?: string[];
}

export const useIPFS = (options: UseIPFSOptions = {}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = useCallback(async (
    file: File, 
    metadata?: IPFSFileMetadata
  ): Promise<IPFSUploadResult | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Validate file
      const validation = ipfsService.validateFile(file, options.maxFileSize);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Upload file
      const result = await ipfsService.uploadFile(file, metadata);
      
      setUploadProgress(100);
      options.onUploadSuccess?.(result);
      
      toast({
        variant: "success",
        title: "File Uploaded",
        description: `${file.name} uploaded successfully to IPFS`
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      options.onUploadError?.(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: errorMessage
      });

      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [options, toast]);

  const uploadFiles = useCallback(async (
    files: File[], 
    metadata?: IPFSFileMetadata
  ): Promise<IPFSUploadResult[]> => {
    const results: IPFSUploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress((i / files.length) * 100);
      
      const result = await uploadFile(file, metadata);
      if (result) {
        results.push(result);
      }
    }
    
    setUploadProgress(100);
    return results;
  }, [uploadFile]);

  const getFileUrl = useCallback((cid: string): string => {
    return ipfsService.getFileUrl(cid);
  }, []);

  const getPreviewUrl = useCallback((cid: string, fileType: string): string => {
    return ipfsService.getPreviewUrl(cid, fileType);
  }, []);

  const pinFile = useCallback(async (cid: string, metadata?: IPFSFileMetadata): Promise<boolean> => {
    try {
      const success = await ipfsService.pinFile(cid, metadata);
      if (success) {
        toast({
          variant: "success",
          title: "File Pinned",
          description: "File pinned successfully to IPFS"
        });
      }
      return success;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Pin Failed",
        description: "Failed to pin file to IPFS"
      });
      return false;
    }
  }, [toast]);

  const unpinFile = useCallback(async (cid: string): Promise<boolean> => {
    try {
      const success = await ipfsService.unpinFile(cid);
      if (success) {
        toast({
          variant: "success",
          title: "File Unpinned",
          description: "File unpinned successfully from IPFS"
        });
      }
      return success;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unpin Failed",
        description: "Failed to unpin file from IPFS"
      });
      return false;
    }
  }, [toast]);

  const getFileMetadata = useCallback(async (cid: string): Promise<IPFSFileMetadata | null> => {
    try {
      return await ipfsService.getFileMetadata(cid);
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      return null;
    }
  }, []);

  const listPinnedFiles = useCallback(async (): Promise<IPFSUploadResult[]> => {
    try {
      return await ipfsService.listPinnedFiles();
    } catch (error) {
      console.error('Failed to list pinned files:', error);
      return [];
    }
  }, []);

  return {
    uploadFile,
    uploadFiles,
    getFileUrl,
    getPreviewUrl,
    pinFile,
    unpinFile,
    getFileMetadata,
    listPinnedFiles,
    isUploading,
    uploadProgress
  };
};

export default useIPFS;
