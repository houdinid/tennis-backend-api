import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    /**
     * Simula el envío de un email de aprobación de reserva.
     * En producción, conectar con SendGrid, Resend, o un SMTP real.
     */
    async sendApprovalEmail(playerEmail: string, playerName: string, courtName: string, dateTime: string): Promise<void> {
        const subject = '✅ ¡Tu reserva ha sido aprobada!';
        const body = `
            Hola ${playerName},

            Tu reserva en ${courtName} para el ${dateTime} ha sido APROBADA.
            ¡Te esperamos en la cancha!

            Atentamente,
            Club de Tenis LTDA
        `;

        // LOG SIMULADO - Reemplazar con servicio real de email
        this.logger.log(`📧 EMAIL ENVIADO (simulado)`);
        this.logger.log(`   Para: ${playerEmail}`);
        this.logger.log(`   Asunto: ${subject}`);
        this.logger.log(`   Cuerpo: ${body.trim()}`);
    }

    /**
     * Simula el envío de un email de rechazo de comprobante.
     */
    async sendRejectionEmail(playerEmail: string, playerName: string, courtName: string, dateTime: string): Promise<void> {
        const subject = '❌ Tu comprobante necesita corrección';
        const body = `
            Hola ${playerName},

            El comprobante que subiste para tu reserva en ${courtName} (${dateTime})
            ha sido RECHAZADO por el administrador.

            Por favor, sube un nuevo comprobante válido para no perder tu reserva.

            Atentamente,
            Club de Tenis LTDA
        `;

        this.logger.log(`📧 EMAIL ENVIADO (simulado)`);
        this.logger.log(`   Para: ${playerEmail}`);
        this.logger.log(`   Asunto: ${subject}`);
        this.logger.log(`   Cuerpo: ${body.trim()}`);
    }

    async sendMatchNotification(creator: any, opponent: any, details: string): Promise<void> {
        const subject = '🎾 ¡Tienes un nuevo compañero de juego!';
        const body = (name: string, otherName: string) => `
            Hola ${name},

            ¡Buenas noticias! ${otherName} se ha unido a tu plan de juego.
            Detalles: ${details}

            La reserva ha sido creada automáticamente en el sistema.
            ¡Nos vemos en la cancha!

            Atentamente,
            Club de Tenis LTDA
        `;

        this.logger.log('---------------------------------------------------------');
        this.logger.log(`📢 MATCHMAKING NOTIFICATION: ${details}`);
        
        // Send to creator
        this.logger.log(`📧 EMAIL (SIM) -> CREADOR [${creator.email}]: ¡Compañero encontrado!`);
        this.logger.log(`📧 EMAIL (SIM) -> OPONENTE [${opponent.email}]: ¡Te has unido al juego!`);
        this.logger.log('---------------------------------------------------------');
    }

    async sendAcademyClassNotification(user: any, academyClass: any): Promise<void> {
        const subject = '🎓 ¡Nueva clase de academia disponible para ti!';
        const body = `
            Hola ${user.name},

            Se ha abierto una nueva clase de academia que coincide con tu perfil.

            Clase: ${academyClass.title}
            Profesor: ${academyClass.teacher?.name || 'Por definir'}
            Fecha y Hora: ${new Date(academyClass.reservation?.start_time || new Date()).toLocaleString()}
            Precio: $${academyClass.price_per_person}

            ¡Inscríbete ahora desde la App antes de que se agoten los cupos!

            Atentamente,
            Club de Tenis LTDA
        `;

        this.logger.log(`📧 EMAIL ENVIADO (simulado) para Clase Academia`);
        this.logger.log(`   Para: ${user.email}`);
        this.logger.log(`   Asunto: ${subject}`);
    }
}
