import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { FileUploadService, UploadedFile as UploadedFileType } from './file-upload.service';

@ApiTags('File Upload')
@Controller('files')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('upload/:assetId/:fileType')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a single file for an asset' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or upload failed' })
  async uploadFile(
    @Param('assetId') assetId: string,
    @Param('fileType') fileType: 'document' | 'photo' | 'evidence',
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ success: boolean; data: UploadedFileType; message: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const uploadedFile = await this.fileUploadService.uploadFile(file, assetId, fileType);
    
    return {
      success: true,
      data: uploadedFile,
      message: 'File uploaded successfully',
    };
  }

  @Post('upload-multiple/:assetId/:fileType')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiOperation({ summary: 'Upload multiple files for an asset' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid files or upload failed' })
  async uploadMultipleFiles(
    @Param('assetId') assetId: string,
    @Param('fileType') fileType: 'documents' | 'photos' | 'evidence',
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{ success: boolean; data: UploadedFileType[]; message: string }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadedFiles = await this.fileUploadService.uploadMultipleFiles(files, assetId, fileType);
    
    return {
      success: true,
      data: uploadedFiles,
      message: `${uploadedFiles.length} files uploaded successfully`,
    };
  }

  @Get('analyze/:fileId')
  @ApiOperation({ summary: 'Analyze uploaded file' })
  @ApiResponse({ status: 200, description: 'File analysis completed' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async analyzeFile(@Param('fileId') fileId: string) {
    const analysis = await this.fileUploadService.analyzeFile(fileId);
    
    return {
      success: true,
      data: analysis,
      message: 'File analysis completed',
    };
  }

  @Get('download/:fileId')
  @ApiOperation({ summary: 'Download file by ID' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const fileBuffer = await this.fileUploadService.getFile(fileId);
      
      // Set appropriate headers
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileId}"`,
        'Content-Length': fileBuffer.length.toString(),
      });
      
      res.send(fileBuffer);
    } catch (error) {
      throw new BadRequestException('File not found');
    }
  }

  @Get('view/:fileId')
  @ApiOperation({ summary: 'View file in browser' })
  @ApiResponse({ status: 200, description: 'File displayed successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async viewFile(@Param('fileId') fileId: string, @Res() res: Response) {
    try {
      const fileBuffer = await this.fileUploadService.getFile(fileId);
      
      // Determine content type based on file extension
      const contentType = this.getContentType(fileId);
      
      res.set({
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
      });
      
      res.send(fileBuffer);
    } catch (error) {
      throw new BadRequestException('File not found');
    }
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete uploaded file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('fileId') fileId: string) {
    await this.fileUploadService.deleteFile(fileId);
    
    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get file upload statistics' })
  @ApiResponse({ status: 200, description: 'Upload statistics retrieved' })
  async getUploadStats() {
    const stats = this.fileUploadService.getUploadStats();
    
    return {
      success: true,
      data: stats,
      message: 'Upload statistics retrieved',
    };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old files' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupOldFiles() {
    this.fileUploadService.cleanupOldFiles();
    
    return {
      success: true,
      message: 'File cleanup completed',
    };
  }

  private getContentType(fileId: string): string {
    const extension = fileId.split('.').pop()?.toLowerCase();
    
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}
