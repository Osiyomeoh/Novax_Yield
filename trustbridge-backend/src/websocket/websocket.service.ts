import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrustBridgeWebSocketGateway } from './websocket.gateway';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  room?: string;
}

export interface WebSocketRoom {
  id: string;
  name: string;
  users: Set<string>;
  createdAt: Date;
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private readonly rooms: Map<string, WebSocketRoom> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
  ) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for verification events
    this.eventEmitter.on('verification.submitted', (data) => {
      this.broadcastToRoom('verification', {
        type: 'verification.submitted',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('verification.assigned', (data) => {
      this.broadcastToRoom('verification', {
        type: 'verification.assigned',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('verification.completed', (data) => {
      this.broadcastToRoom('verification', {
        type: 'verification.completed',
        data,
        timestamp: new Date(),
      });
    });

    // Listen for investment events
    this.eventEmitter.on('investment.created', (data) => {
      this.broadcastToRoom('investments', {
        type: 'investment.created',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('investment.matured', (data) => {
      this.broadcastToRoom('investments', {
        type: 'investment.matured',
        data,
        timestamp: new Date(),
      });
    });

    // Listen for asset events
    this.eventEmitter.on('asset.created', (data) => {
      this.broadcastToRoom('assets', {
        type: 'asset.created',
        data,
        timestamp: new Date(),
      });
    });

    this.eventEmitter.on('asset.verified', (data) => {
      this.broadcastToRoom('assets', {
        type: 'asset.verified',
        data,
        timestamp: new Date(),
      });
    });

    // Listen for system events
    this.eventEmitter.on('system.alert', (data) => {
      this.broadcastToAll({
        type: 'system.alert',
        data,
        timestamp: new Date(),
      });
    });

    // Listen for blockchain events
    this.eventEmitter.on('blockchain.transaction', (data) => {
      this.broadcastToRoom('blockchain', {
        type: 'blockchain.transaction',
        data,
        timestamp: new Date(),
      });
    });
  }

  async broadcastToAll(message: WebSocketMessage): Promise<void> {
    try {
      this.eventEmitter.emit('websocket.broadcastToAll', { message });
      this.logger.log(`Broadcasted message to all clients: ${message.type}`);
    } catch (error) {
      this.logger.error('Failed to broadcast to all clients:', error);
    }
  }

  async broadcastToRoom(roomId: string, message: WebSocketMessage): Promise<void> {
    try {
      this.eventEmitter.emit('websocket.broadcastToRoom', { roomId, message });
      this.logger.log(`Broadcasted message to room ${roomId}: ${message.type}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast to room ${roomId}:`, error);
    }
  }

  async sendToUser(userId: string, message: WebSocketMessage): Promise<void> {
    try {
      this.eventEmitter.emit('websocket.sendToUser', { userId, message });
      this.logger.log(`Sent message to user ${userId}: ${message.type}`);
    } catch (error) {
      this.logger.error(`Failed to send message to user ${userId}:`, error);
    }
  }

  async joinRoom(userId: string, roomId: string): Promise<void> {
    try {
      this.eventEmitter.emit('websocket.joinRoom', { userId, roomId });
      
      // Create room if it doesn't exist
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, {
          id: roomId,
          name: this.getRoomDisplayName(roomId),
          users: new Set(),
          createdAt: new Date(),
        });
      }

      const room = this.rooms.get(roomId)!;
      room.users.add(userId);

      // Notify room about new user
      this.broadcastToRoom(roomId, {
        type: 'user.joined',
        data: { userId, roomId },
        timestamp: new Date(),
      });

      this.logger.log(`User ${userId} joined room ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to join room ${roomId} for user ${userId}:`, error);
    }
  }

  async leaveRoom(userId: string, roomId: string): Promise<void> {
    try {
      this.eventEmitter.emit('websocket.leaveRoom', { userId, roomId });
      
      const room = this.rooms.get(roomId);
      if (room) {
        room.users.delete(userId);
        
        // Remove room if empty
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
        } else {
          // Notify room about user leaving
          this.broadcastToRoom(roomId, {
            type: 'user.left',
            data: { userId, roomId },
            timestamp: new Date(),
          });
        }
      }

      this.logger.log(`User ${userId} left room ${roomId}`);
    } catch (error) {
      this.logger.error(`Failed to leave room ${roomId} for user ${userId}:`, error);
    }
  }

  async getConnectedUsers(): Promise<string[]> {
    return Array.from(this.rooms.values()).flatMap(room => Array.from(room.users));
  }

  async getRoomUsers(roomId: string): Promise<string[]> {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users) : [];
  }

  async getRooms(): Promise<WebSocketRoom[]> {
    return Array.from(this.rooms.values());
  }

  async getRoomStats(): Promise<{
    totalRooms: number;
    totalUsers: number;
    roomDetails: Array<{
      id: string;
      name: string;
      userCount: number;
      createdAt: Date;
    }>;
  }> {
    const rooms = Array.from(this.rooms.values());
    const totalUsers = new Set(rooms.flatMap(room => Array.from(room.users))).size;

    return {
      totalRooms: rooms.length,
      totalUsers,
      roomDetails: rooms.map(room => ({
        id: room.id,
        name: room.name,
        userCount: room.users.size,
        createdAt: room.createdAt,
      })),
    };
  }

  // Specific event broadcasting methods
  async broadcastVerificationUpdate(assetId: string, status: string, score?: number): Promise<void> {
    await this.broadcastToRoom('verification', {
      type: 'verification.update',
      data: { assetId, status, score },
      timestamp: new Date(),
    });
  }

  async broadcastInvestmentUpdate(investmentId: string, status: string, returns?: number): Promise<void> {
    await this.broadcastToRoom('investments', {
      type: 'investment.update',
      data: { investmentId, status, returns },
      timestamp: new Date(),
    });
  }

  async broadcastAssetUpdate(assetId: string, status: string, verificationScore?: number): Promise<void> {
    await this.broadcastToRoom('assets', {
      type: 'asset.update',
      data: { assetId, status, verificationScore },
      timestamp: new Date(),
    });
  }

  async broadcastMarketUpdate(assetType: string, price: number, change: number): Promise<void> {
    await this.broadcastToRoom('market', {
      type: 'market.update',
      data: { assetType, price, change },
      timestamp: new Date(),
    });
  }

  async broadcastBlockchainUpdate(transactionId: string, status: string, gasUsed?: number): Promise<void> {
    await this.broadcastToRoom('blockchain', {
      type: 'blockchain.update',
      data: { transactionId, status, gasUsed },
      timestamp: new Date(),
    });
  }

  async broadcastSystemAlert(alertType: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    await this.broadcastToAll({
      type: 'system.alert',
      data: { alertType, message, severity },
      timestamp: new Date(),
    });
  }

  // User-specific notifications
  async notifyUserAssetUpdate(userId: string, assetId: string, status: string): Promise<void> {
    await this.sendToUser(userId, {
      type: 'user.asset.update',
      data: { assetId, status },
      timestamp: new Date(),
      userId,
    });
  }

  async notifyUserInvestmentUpdate(userId: string, investmentId: string, status: string, returns?: number): Promise<void> {
    await this.sendToUser(userId, {
      type: 'user.investment.update',
      data: { investmentId, status, returns },
      timestamp: new Date(),
      userId,
    });
  }

  async notifyUserVerificationUpdate(userId: string, assetId: string, status: string, score?: number): Promise<void> {
    await this.sendToUser(userId, {
      type: 'user.verification.update',
      data: { assetId, status, score },
      timestamp: new Date(),
      userId,
    });
  }

  // Utility methods
  private getRoomDisplayName(roomId: string): string {
    const roomNames: { [key: string]: string } = {
      'verification': 'Verification Updates',
      'investments': 'Investment Updates',
      'assets': 'Asset Updates',
      'market': 'Market Updates',
      'blockchain': 'Blockchain Updates',
      'admin': 'Admin Panel',
      'attestors': 'Attestor Updates',
    };

    return roomNames[roomId] || `Room ${roomId}`;
  }

  // Health check
  async getHealthStatus(): Promise<{
    connected: boolean;
    connectedUsers: number;
    activeRooms: number;
    uptime: number;
  }> {
    const connectedUsers = await this.getConnectedUsers();
    const rooms = await this.getRooms();

    return {
      connected: true,
      connectedUsers: connectedUsers.length,
      activeRooms: rooms.length,
      uptime: process.uptime(),
    };
  }
}
