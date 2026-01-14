# IPFS Integration with Pinata

This document describes the IPFS integration using Pinata for decentralized file storage in the TrustBridge platform.

## Overview

The IPFS integration provides:
- Decentralized file storage using IPFS
- Pinata gateway for reliable file access
- Presigned URL uploads for security
- File preview and management capabilities
- Support for various file types (documents, images, etc.)

## Setup

### 1. Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Pinata Configuration
VITE_PINATA_JWT=your_pinata_jwt_token_here
VITE_PINATA_GATEWAY_URL=your_gateway_domain.mypinata.cloud

# Server URL for presigned URLs
VITE_SERVER_URL=http://localhost:4001
```

### 2. Pinata Account Setup

1. Sign up for a Pinata account at [pinata.cloud](https://pinata.cloud)
2. Create a new API key in your dashboard
3. Get your dedicated gateway domain
4. Add the JWT token and gateway URL to your environment variables

## Architecture

### Components

#### IPFSService (`src/services/ipfs.ts`)
- Main service for IPFS operations
- Handles file uploads using presigned URLs
- Provides file URL generation and management
- Includes file validation and metadata handling

#### FileUpload Component (`src/components/UI/FileUpload.tsx`)
- Drag-and-drop file upload interface
- Progress tracking and status management
- File validation and error handling
- Support for multiple file types

#### FilePreview Component (`src/components/UI/FilePreview.tsx`)
- File preview modal with fullscreen support
- Support for images, PDFs, and other file types
- Download and external link functionality
- IPFS CID display

#### useIPFS Hook (`src/hooks/useIPFS.ts`)
- React hook for IPFS operations
- Upload progress tracking
- Error handling and toast notifications
- File management utilities

## Usage

### Basic File Upload

```typescript
import { useIPFS } from '../hooks/useIPFS';

const MyComponent = () => {
  const { uploadFile, isUploading, uploadProgress } = useIPFS({
    onUploadSuccess: (result) => {
      console.log('File uploaded:', result.cid);
    },
    onUploadError: (error) => {
      console.error('Upload failed:', error);
    }
  });

  const handleFileUpload = async (file: File) => {
    const result = await uploadFile(file, {
      name: file.name,
      type: file.type,
      size: file.size,
      category: 'verification_document',
      description: 'Asset verification document'
    });
  };
};
```

### Using FileUpload Component

```typescript
import FileUpload from '../components/UI/FileUpload';

const VerificationForm = () => {
  const handleFilesChange = (files) => {
    console.log('Files selected:', files);
  };

  const handleFileUpload = (result) => {
    console.log('File uploaded to IPFS:', result.cid);
  };

  return (
    <FileUpload
      onFilesChange={handleFilesChange}
      onFileUpload={handleFileUpload}
      maxFiles={10}
      maxSize={50 * 1024 * 1024} // 50MB
      acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.png']}
      category="verification_document"
      description="Upload verification documents"
    />
  );
};
```

### File Preview

```typescript
import FilePreview from '../components/UI/FilePreview';

const FileViewer = () => {
  const [previewFile, setPreviewFile] = useState(null);

  return (
    <>
      <button onClick={() => setPreviewFile({
        cid: 'QmYourFileHash',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000
      })}>
        Preview File
      </button>

      {previewFile && (
        <FilePreview
          cid={previewFile.cid}
          fileName={previewFile.fileName}
          fileType={previewFile.fileType}
          fileSize={previewFile.fileSize}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
};
```

## File Types Supported

### Documents
- PDF files (`.pdf`)
- Word documents (`.doc`, `.docx`)
- Text files (`.txt`)
- Images (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`)

### Images
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)

## Configuration

### File Size Limits
- Default maximum: 50MB for documents
- Images: 10MB maximum
- Configurable per component

### Upload Limits
- Maximum files per upload: 10 (configurable)
- Concurrent uploads: Supported
- Retry mechanism: Built-in

## Security

### Presigned URLs
- All uploads use presigned URLs for security
- Server-side validation of file types and sizes
- Authentication required for all operations

### File Validation
- Client-side file type validation
- File size checking
- MIME type verification

## Error Handling

The integration includes comprehensive error handling:

- Network errors
- File validation errors
- Upload failures
- Server errors

All errors are displayed via toast notifications and component state.

## Performance

### Optimizations
- Parallel file uploads
- Progress tracking
- Lazy loading of file previews
- Efficient file validation

### Caching
- File URLs are cached for performance
- Metadata is cached locally
- Preview images are cached

## Troubleshooting

### Common Issues

1. **Upload fails with 401 error**
   - Check your Pinata JWT token
   - Ensure the token has proper permissions

2. **Files not accessible after upload**
   - Verify your gateway URL is correct
   - Check if the file was pinned successfully

3. **Large files fail to upload**
   - Check file size limits
   - Verify network connection stability

### Debug Mode

Enable debug logging by setting:
```typescript
localStorage.setItem('debug', 'ipfs');
```

## API Reference

### IPFSService Methods

- `uploadFile(file, metadata)` - Upload a single file
- `uploadFiles(files, metadata)` - Upload multiple files
- `getFileUrl(cid)` - Get file URL from CID
- `getPreviewUrl(cid, fileType)` - Get preview URL
- `pinFile(cid, metadata)` - Pin file to IPFS
- `unpinFile(cid)` - Unpin file from IPFS
- `getFileMetadata(cid)` - Get file metadata
- `listPinnedFiles()` - List all pinned files

### FileUpload Props

- `onFilesChange` - Callback when files change
- `onFileUpload` - Callback when file uploads
- `maxFiles` - Maximum number of files
- `maxSize` - Maximum file size in bytes
- `acceptedTypes` - Array of accepted file types
- `allowMultiple` - Allow multiple file selection
- `category` - File category for metadata
- `description` - Upload area description

## Future Enhancements

- [ ] Batch upload optimization
- [ ] File compression before upload
- [ ] Advanced file preview (video, audio)
- [ ] File versioning support
- [ ] Automatic file organization
- [ ] Integration with blockchain metadata
