import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // En producción debería estar restringido al dominio de la PWA
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Evento que se dispara desde el servicio de reservas cuando un administrador aprueba una
  broadcastReservationApproved(reservationId: string, courtId: string) {
    this.server.emit('reservation_approved', {
      reservationId,
      courtId,
      message: 'Una reserva ha sido aprobada. El calendario debe actualizarse.',
    });
  }

  // Evento para notificar al administrador en tiempo real que un comprobante ha sido subido
  broadcastPaymentUploaded(reservationId: string, uploaderRole?: string, uploaderName?: string) {
    this.server.emit('payment_uploaded', {
      reservationId,
      uploaderRole,
      uploaderName,
      message: 'Un comprobante ha sido subido. Refrescar bandeja de entrada.',
    });
  }

  // Evento para notificar al jugador que su comprobante fue rechazado
  broadcastReservationRejected(reservationId: string) {
    this.server.emit('reservation_rejected', {
      reservationId,
      message: 'Tu comprobante ha sido rechazado. Por favor sube uno nuevo.',
    });
  }

  // Evento para notificar apertura de nueva clase de academia
  broadcastAcademyClassCreated(classData: any) {
    this.server.emit('academy_class_created', {
      ...classData,
      message: `Nueva clase de academia disponible: ${classData.title}`,
    });
  }
}
