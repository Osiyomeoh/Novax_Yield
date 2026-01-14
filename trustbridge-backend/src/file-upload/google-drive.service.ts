import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  webContentLink: string;
  createdTime: string;
  modifiedTime: string;
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: any;
  private folderId: string;

  constructor(private configService: ConfigService) {
    this.initializeDrive();
  }

  private async initializeDrive() {
    try {
      const clientId = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_SECRET');
      const refreshToken = this.configService.get<string>('GOOGLE_DRIVE_REFRESH_TOKEN');
      this.folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');

      if (!clientId || !clientSecret || !refreshToken) {
        this.logger.warn('Google Drive credentials not configured, using local storage');
        return;
      }

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      this.drive = google.drive({ version: 'v3', auth: oauth2Client });
      this.logger.log('Google Drive service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Google Drive service:', error);
    }
  }

  async uploadFile(
    filePath: string,
    fileName: string,
    mimeType: string,
    metadata?: any
  ): Promise<GoogleDriveFile> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      const fileMetadata = {
        name: fileName,
        parents: this.folderId ? [this.folderId] : undefined,
        ...metadata,
      };

      const media = {
        mimeType,
        body: fs.createReadStream(filePath),
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime',
      });

      const file = response.data;
      this.logger.log(`File uploaded to Google Drive: ${file.name} (ID: ${file.id})`);

      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size) || 0,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
      };
    } catch (error) {
      this.logger.error('Failed to upload file to Google Drive:', error);
      throw new Error(`Google Drive upload failed: ${error.message}`);
    }
  }

  async downloadFile(fileId: string, outputPath: string): Promise<void> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      const response = await this.drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'stream' });

      const writeStream = fs.createWriteStream(outputPath);
      response.data.pipe(writeStream);

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          this.logger.log(`File downloaded from Google Drive: ${outputPath}`);
          resolve();
        });
        writeStream.on('error', reject);
      });
    } catch (error) {
      this.logger.error('Failed to download file from Google Drive:', error);
      throw new Error(`Google Drive download failed: ${error.message}`);
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      await this.drive.files.delete({ fileId });
      this.logger.log(`File deleted from Google Drive: ${fileId}`);
    } catch (error) {
      this.logger.error('Failed to delete file from Google Drive:', error);
      throw new Error(`Google Drive delete failed: ${error.message}`);
    }
  }

  async getFileInfo(fileId: string): Promise<GoogleDriveFile> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      const response = await this.drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime',
      });

      const file = response.data;
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size) || 0,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
      };
    } catch (error) {
      this.logger.error('Failed to get file info from Google Drive:', error);
      throw new Error(`Google Drive get file info failed: ${error.message}`);
    }
  }

  async listFiles(query?: string): Promise<GoogleDriveFile[]> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      const q = query || `'${this.folderId}' in parents`;
      const response = await this.drive.files.list({
        q,
        fields: 'files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime)',
      });

      return response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: parseInt(file.size) || 0,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
      }));
    } catch (error) {
      this.logger.error('Failed to list files from Google Drive:', error);
      throw new Error(`Google Drive list files failed: ${error.message}`);
    }
  }

  async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
    try {
      if (!this.drive) {
        throw new Error('Google Drive service not initialized');
      }

      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : this.folderId ? [this.folderId] : undefined,
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });

      this.logger.log(`Folder created in Google Drive: ${folderName} (ID: ${response.data.id})`);
      return response.data.id;
    } catch (error) {
      this.logger.error('Failed to create folder in Google Drive:', error);
      throw new Error(`Google Drive create folder failed: ${error.message}`);
    }
  }

  isAvailable(): boolean {
    return !!this.drive;
  }
}
