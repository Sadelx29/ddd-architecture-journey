import { v4 as uuid } from 'uuid';

/**
 * DomainEvent - DDD Building Block
 * 
 * Un Domain Event representa un HECHO que ocurrió en el dominio.
 * 
 * Características:
 * - INMUTABLE (pasado no cambia)
 * - Nombrado en PASADO (PaymentAuthorized, OrderConfirmed)
 * - Contiene datos relevantes del momento
 * - Incluye timestamp
 * - Tiene ID único (para idempotencia)
 * 
 * Diferencia crítica:
 * - DomainEvent:  Interno al Bounded Context
 * - IntegrationEvent: Entre Bounded Contexts (veremos después)
 * 
 * Uso:
 * Los aggregates generan Domain Events. 
 * El repository los convierte en Integration Events y publica.
 * 
 * Ejemplo:
 * ```typescript
 * class PaymentAuthorizedEvent implements DomainEvent {
 *   constructor(
 *     public readonly paymentId: PaymentId,
 *     public readonly amount: Money,
 *     occurredOn: Date
 *   ) {
 *     this.occurredOn = occurredOn;
 *     this.eventId = uuid();
 *   }
 *   
 *   eventName(): string {
 *     return 'payment. authorized';
 *   }
 * }
 * ```
 */
export interface DomainEvent {
  /**
   * ID único del evento (para deduplicación)
   */
  readonly eventId: string;

  /**
   * ID del aggregate que generó el evento
   */
  readonly aggregateId: string;

  /**
   * Timestamp de cuando ocurrió
   */
  readonly occurredOn: Date;

  /**
   * Nombre del evento (usado para routing)
   * Convención: "context.entity.action"
   * Ejemplos: "payment.authorized", "order.confirmed"
   */
  eventName(): string;
}

/**
 * BaseDomainEvent - Clase base para facilitar creación
 * 
 * Genera automáticamente eventId y timestamp.
 */
export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;

  constructor(public readonly aggregateId: string) {
    this.eventId = uuid();
    this.occurredOn = new Date();
  }

  abstract eventName(): string;
}