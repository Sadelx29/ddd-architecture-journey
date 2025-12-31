import { IntegrationEvent } from '@shared/domain/IntegrationEvent';
import { IEventHandler } from './IEventHandler';

/**
 * IEventBus - Interfaz para publicar/suscribirse a eventos
 * 
 * Responsabilidades:
 * 1. Publicar Integration Events a un broker (RabbitMQ)
 * 2. Suscribirse a eventos de otros contextos
 * 3. Routear eventos a handlers correspondientes
 * 
 * Por qué interfaz:
 * - En tests:  InMemoryEventBus (sin RabbitMQ real)
 * - En producción: RabbitMQEventBus (con RabbitMQ)
 * - Hexagonal Architecture: Domain no depende de infraestructura
 * 
 * Decisión: 
 * - Asíncrono (fire and forget para publish)
 * - At-least-once delivery (RabbitMQ garantiza entrega)
 * - Handlers deben ser idempotentes
 */
export interface IEventBus {
  /**
   * Publicar un Integration Event
   * 
   * El evento se serializa y envía a RabbitMQ. 
   * No esperamos respuesta (fire and forget).
   * 
   * @param event Integration Event a publicar
   */
  publish(event: IntegrationEvent): Promise<void>;

  /**
   * Suscribirse a un tipo de evento
   * 
   * El handler se ejecuta cada vez que llega un evento
   * con el eventName especificado.
   * 
   * @param eventName Nombre del evento (ej: "payment.authorized")
   * @param handler Handler que procesa el evento
   */
  subscribe(eventName: string, handler: IEventHandler): Promise<void>;
}