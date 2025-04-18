import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets'
  import { Server, Socket } from 'socket.io'
  import { Logger } from '@nestjs/common'
  
  @WebSocketGateway({ cors: true })
  export class LiveOrdersGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
  {
    @WebSocketServer()
    server: Server
  
    private logger = new Logger('LiveOrdersGateway')
  
    afterInit(server: Server) {
      this.logger.log('Gateway initialisé 🚀')
    }
  
    handleConnection(client: Socket) {
      this.logger.log(`Client connecté: ${client.id}`)
    }
  
    handleDisconnect(client: Socket) {
      this.logger.log(`Client déconnecté: ${client.id}`)
    }
  
    sendUpdate() {
      this.server.emit('live-orders:update')
    }
  }
  