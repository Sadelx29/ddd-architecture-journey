import { IntegrationEvent } from '@shared/domain/IntegrationEvent';

/**
 * IEventHandler - Interfaz para handlers de eventos
 * 
 * Un EventHandler:
 * 1. Recibe un Integration Event
 * 2. Procesa (ej: crear factura cuando pago confirmado)
 * 3. Retorna (éxito o error)
 * 
 * CRÍTICO:
 * - DEBE ser IDEMPOTENTE (mismo evento 2 veces = mismo resultado)
 * - PUEDE fallar (se reintentará automáticamente)
 * - NO debe lanzar excepciones no manejadas
 * 
 * Por qué idempotente:
 * RabbitMQ garantiza "at-least-once delivery". 
 * Puedes recibir el mismo evento múltiples veces.
 * 
 * Ejemplo:
 * ```typescript
 * class CreateInvoiceOnPaymentAuthorized implements IEventHandler {
 *   async handle(event: IntegrationEvent): Promise<void> {
 *     const paymentEvent = event as PaymentAuthorizedIntegrationEvent;
 *     
 *     // Verificar si ya procesamos (idempotencia)
 *     const exists = await invoiceRepo.findByPaymentId(paymentEvent.paymentId);
 *     if (exists) {
 *       return; // Ya procesado, skip
 *     }
 *     
 *     // Procesar... 
 *   }
 * }
 * ```
 */
export interface IEventHandler {
  /**
   * Manejar un evento
   * 
   * @param event Integration Event recibido
   */
  handle(event: IntegrationEvent): Promise<void>;
}