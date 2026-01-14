import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebSocketMessage } from './websocket.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/ws',
})
export class TrustBridgeWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrustBridgeWebSocketGateway.name);
  private readonly connectedUsers: Map<string, Socket> = new Map();
  private readonly userRooms: Map<string, Set<string>> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for WebSocket events from the service
    this.eventEmitter.on('websocket.broadcastToRoom', ({ roomId, message }) => {
      this.broadcastToRoom(roomId, message);
    });

    this.eventEmitter.on('websocket.sendToUser', ({ userId, message }) => {
      this.sendToUser(userId, message);
    });

    this.eventEmitter.on('websocket.broadcastToAll', ({ message }) => {
      this.broadcastToAll(message);
    });

    this.eventEmitter.on('websocket.joinRoom', ({ userId, roomId }) => {
      this.joinRoom(userId, roomId);
    });

    this.eventEmitter.on('websocket.leaveRoom', ({ userId, roomId }) => {
      this.leaveRoom(userId, roomId);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Send welcome message
    client.emit('connected', {
      type: 'connection.established',
      data: { clientId: client.id, timestamp: new Date() },
      timestamp: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove from connected users
    for (const [userId, socket] of this.connectedUsers.entries()) {
      if (socket.id === client.id) {
        this.connectedUsers.delete(userId);
        
        // Leave all rooms
        const userRooms = this.userRooms.get(userId);
        if (userRooms) {
          for (const roomId of userRooms) {
            this.leaveRoom(userId, roomId);
          }
          this.userRooms.delete(userId);
        }
        break;
      }
    }
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @MessageBody() data: { userId: string; token?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // TODO: Implement proper authentication
      const { userId } = data;
      
      this.connectedUsers.set(userId, client);
      this.userRooms.set(userId, new Set());
      
      client.emit('authenticated', {
        type: 'authentication.success',
        data: { userId, timestamp: new Date() },
        timestamp: new Date(),
      });

      this.logger.log(`User authenticated: ${userId}`);
    } catch (error) {
      this.logger.error('Authentication failed:', error);
      client.emit('error', {
        type: 'authentication.failed',
        data: { error: error.message },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.getUserIdFromClient(client);
      if (!userId) {
        client.emit('error', {
          type: 'authentication.required',
          data: { message: 'User must be authenticated to join rooms' },
          timestamp: new Date(),
        });
        return;
      }

      const { roomId } = data;
      this.joinRoom(userId, roomId);
      
      client.emit('room_joined', {
        type: 'room.joined',
        data: { roomId, userId },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to join room:', error);
      client.emit('error', {
        type: 'room.join.failed',
        data: { error: error.message },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.getUserIdFromClient(client);
      if (!userId) {
        client.emit('error', {
          type: 'authentication.required',
          data: { message: 'User must be authenticated to leave rooms' },
          timestamp: new Date(),
        });
        return;
      }

      const { roomId } = data;
      this.leaveRoom(userId, roomId);
      
      client.emit('room_left', {
        type: 'room.left',
        data: { roomId, userId },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to leave room:', error);
      client.emit('error', {
        type: 'room.leave.failed',
        data: { error: error.message },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('subscribe_asset')
  handleSubscribeAsset(
    @MessageBody() data: { assetId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.getUserIdFromClient(client);
      if (!userId) {
        client.emit('error', {
          type: 'authentication.required',
          data: { message: 'User must be authenticated to subscribe to assets' },
          timestamp: new Date(),
        });
        return;
      }

      const { assetId } = data;
      const roomId = `asset_${assetId}`;
      this.joinRoom(userId, roomId);
      
      client.emit('asset_subscribed', {
        type: 'asset.subscribed',
        data: { assetId, userId },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to subscribe to asset:', error);
      client.emit('error', {
        type: 'asset.subscribe.failed',
        data: { error: error.message },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('subscribe_investment')
  handleSubscribeInvestment(
    @MessageBody() data: { investmentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = this.getUserIdFromClient(client);
      if (!userId) {
        client.emit('error', {
          type: 'authentication.required',
          data: { message: 'User must be authenticated to subscribe to investments' },
          timestamp: new Date(),
        });
        return;
      }

      const { investmentId } = data;
      const roomId = `investment_${investmentId}`;
      this.joinRoom(userId, roomId);
      
      client.emit('investment_subscribed', {
        type: 'investment.subscribed',
        data: { investmentId, userId },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to subscribe to investment:', error);
      client.emit('error', {
        type: 'investment.subscribe.failed',
        data: { error: error.message },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('get_rooms')
  handleGetRooms(@ConnectedSocket() client: Socket) {
    try {
      const rooms = Array.from(this.userRooms.values())
        .flatMap(roomSet => Array.from(roomSet))
        .filter((roomId, index, array) => array.indexOf(roomId) === index);

      client.emit('rooms_list', {
        type: 'rooms.list',
        data: { rooms },
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Failed to get rooms:', error);
      client.emit('error', {
        type: 'rooms.get.failed',
        data: { error: error.message },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      type: 'pong',
      data: { timestamp: new Date() },
      timestamp: new Date(),
    });
  }

  // Public methods for WebSocketService
  broadcastToAll(message: WebSocketMessage): void {
    this.server.emit('broadcast', message);
  }

  broadcastToRoom(roomId: string, message: WebSocketMessage): void {
    this.server.to(roomId).emit('room_broadcast', message);
  }

  sendToUser(userId: string, message: WebSocketMessage): void {
    const client = this.connectedUsers.get(userId);
    if (client) {
      client.emit('user_message', message);
    }
  }

  joinRoom(userId: string, roomId: string): void {
    const client = this.connectedUsers.get(userId);
    if (client) {
      client.join(roomId);
      
      const userRooms = this.userRooms.get(userId);
      if (userRooms) {
        userRooms.add(roomId);
      }
    }
  }

  leaveRoom(userId: string, roomId: string): void {
    const client = this.connectedUsers.get(userId);
    if (client) {
      client.leave(roomId);
      
      const userRooms = this.userRooms.get(userId);
      if (userRooms) {
        userRooms.delete(roomId);
      }
    }
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }



  // Private helper methods
  private getUserIdFromClient(client: Socket): string | null {
    for (const [userId, socket] of this.connectedUsers.entries()) {
      if (socket.id === client.id) {
        return userId;
      }
    }
    return null;
  }

  // Health check
  getHealthStatus(): {
    connected: boolean;
    connectedUsers: number;
    activeRooms: number;
  } {
    const activeRooms = new Set();
    for (const roomSet of this.userRooms.values()) {
      for (const roomId of roomSet) {
        activeRooms.add(roomId);
      }
    }

    return {
      connected: true,
      connectedUsers: this.connectedUsers.size,
      activeRooms: activeRooms.size,
    };
  }
}
