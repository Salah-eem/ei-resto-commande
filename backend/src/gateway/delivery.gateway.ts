import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { OrderService } from 'src/order/order.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Adapte selon tes besoins
  },
})
export class DeliveryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly orderService: OrderService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // 📌 Rejoindre une room spécifique à l'order
  @SubscribeMessage('joinOrder')
  handleJoinOrder(@MessageBody() orderId: string, @ConnectedSocket() client: Socket) {
    client.join(orderId);
    console.log(`Client ${client.id} joined room ${orderId}`);
  }

  // 📌 Mettre à jour la position du livreur (émise par livreur)
  @SubscribeMessage('updatePosition')
  async handleUpdatePosition(
    @MessageBody() data: { orderId: string; lat: number; lng: number },
    @ConnectedSocket() client: Socket,
  ) {
    // 1. Mise à jour en DB
    await this.orderService.updatePosition(data.orderId, { lat: data.lat, lng: data.lng });

    // 2. Broadcast vers tous les clients de cette commande
    client.to(data.orderId).emit('locationUpdate', { lat: data.lat, lng: data.lng });
  }

  // 📌 Mettre à jour statut (livreur ou backend peut envoyer)
  @SubscribeMessage('updateStatus')
  async handleUpdateStatus(
    @MessageBody() data: { orderId: string; status: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.orderService.updateOrderStatus(data.orderId, data.status as any);

    // Notifier les clients
    client.to(data.orderId).emit('statusUpdate', { status: data.status });
  }
}
