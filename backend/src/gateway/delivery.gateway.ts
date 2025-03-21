import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  
  @WebSocketGateway({
    cors: { origin: '*' },
  })
  export class DeliveryGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    handleConnection(client: Socket) {
      console.log(`Client connected: ${client.id}`);
    }
  
    handleDisconnect(client: Socket) {
      console.log(`Client disconnected: ${client.id}`);
    }
  
    @SubscribeMessage('joinOrder')
    handleJoinOrder(client: Socket, orderId: string) {
      client.join(orderId);
    }
  
    @SubscribeMessage('locationUpdate')
    handleLocationUpdate(client: Socket, payload: { orderId: string; lat: number; lng: number }) {
      this.server.to(payload.orderId).emit('locationUpdate', payload);
    }
  
    @SubscribeMessage('statusUpdate')
    handleStatusUpdate(client: Socket, payload: { orderId: string; status: string }) {
      this.server.to(payload.orderId).emit('statusUpdate', payload);
    }
  }
  