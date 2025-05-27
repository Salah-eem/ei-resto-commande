import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { OrderService } from 'src/order/order.service';

@WebSocketGateway({ cors: true })
export class LiveOrdersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('LiveOrdersGateway');
  private connectedClients = new Set<string>();

  constructor(
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Gateway initialisé 🚀');
    // On stoppe d’emblée le cron jusqu’à ce qu’un client se connecte
    //this.orderService.stopPromoteScheduledCron();
  }

  handleConnection(client: Socket) {
    this.connectedClients.add(client.id);
    this.logger.log(`Client connecté: ${client.id}`);

    if (this.connectedClients.size === 1) {
      // Premier client → démarrage du cron
      this.logger.log('Démarrage du cron promoteScheduledOrders');
      this.orderService.startPromoteScheduledCron();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client déconnecté: ${client.id}`);

    if (this.connectedClients.size === 0) {
      // Plus aucun client → arrêt du cron
      this.logger.log('Arrêt du cron promoteScheduledOrders');
      this.orderService.stopPromoteScheduledCron();
    }
  }

  hasClients(): boolean {
    return this.connectedClients.size > 0;
  }

  sendUpdate() {
    this.server.emit('live-orders:update');
  }
}
