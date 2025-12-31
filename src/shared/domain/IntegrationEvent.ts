import { v4 as uuid } from 'uuid';

/**
 * IntegrationEvent - Evento entre Bounded Contexts
 * 
 * Diferencia con DomainEvent:
 * 
 * DomainEvent: 
 * - Interno al Bounded Context
 * - Lenguaje del dominio interno
 * - Puede contener objetos del dominio
 * 
 * IntegrationEvent: 
 * - Entre Bounded Contexts
 * - Lenguaje neutral/público
 * - Solo primitivos y DTOs (no objetos de dominio)
 * 
 * Ejemplo de conversión:
 * ```typescript
 * // Domain Event (interno)
 * class PaymentAuthorizedEvent {
 *   constructor(
 *     public paymentId: PaymentId,  // Value Object
 *     public amount:  Money           // Value Object
 *   ) {}
 * }
 * 
 * // Integration Event (publicado a RabbitMQ)
 * class PaymentAuthorizedIntegrationEvent {
 *   constructor(
 *     public paymentId: string,      // Primitivo
 *     public amount:  number,          // Primitivo
 *     public currency: string         // Primitivo
 *   ) {}
 * }
 * ```
 * 
 * Por qué esta separación:
 * - Los contexts no comparten código de dominio
 * - Cambios internos no rompen contratos
 * - Fácil serialización (JSON)
 */
export interface IntegrationEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  eventName(): string;
  toJSON(): Record<string, any>;

}

/**
 * BaseIntegrationEvent - Clase base
 */
export abstract class BaseIntegrationEvent implements IntegrationEvent {
  public readonly eventId: string;
  public readonly occurredOn:  Date;

  constructor() {
    this.eventId = uuid();
    this.occurredOn = new Date();
  }

  abstract eventName(): string;

  /**
   * Serializar a JSON (para RabbitMQ)
   */
  toJSON(): Record<string, any> {
    return {
      eventId: this.eventId,
      eventName: this.eventName(),
      occurredOn: this. occurredOn.toISOString(),
      ... this.getPayload()
    };
  }

  /**
   * Override en clases concretas con datos del evento
   */
  protected abstract getPayload(): Record<string, any>;
}