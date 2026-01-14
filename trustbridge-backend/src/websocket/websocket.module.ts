import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TrustBridgeWebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';

@Module({
  imports: [EventEmitterModule],
  providers: [TrustBridgeWebSocketGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
