import { IEventBus } from '@shared/application/Events/IEventBus';
import { IEventHandler } from '@shared/application/Events/IEventHandler';
import { IntegrationEvent } from '@shared/domain/IntegrationEvent';

/**
 * InMemoryEventBus - Implementación para tests
 * 
 * Por qué existe:
 * - Tests unitarios NO deben depender de RabbitMQ
 * - Necesitas verificar QUÉ eventos se publicaron
 * - Necesitas simular handlers sin infraestructura
 * 
 * Diferencias con RabbitMQEventBus:
 * - ✅ Síncrono (ejecuta handlers inmediatamente)
 * - ✅ En memoria (no persistencia)
 * - ✅ Sin reintentos (falla inmediato)
 * - ✅ Acceso a eventos publicados (para asserts)
 * 
 * Uso:
 * ```typescript
 * // En tests
 * const eventBus = new InMemoryEventBus();
 * const handler = new AuthorizePaymentHandler(repo, eventBus);
 * 
 * await handler.handle(command);
 * 
 * // Verificar que se publicó el evento
 * expect(eventBus.publishedEvents).toHaveLength(1);
 * expect(eventBus.publishedEvents[0]. eventName()).toBe('payment.authorized');
 * ```
 */
export class InMemoryEventBus implements IEventBus {
  /**
   * Eventos publicados (para verificación en tests)
   */
  public publishedEvents: IntegrationEvent[] = [];

  /**
   * Handlers registrados
   * Key: eventName
   * Value: Array de handlers
   */
  private handlers: Map<string, IEventHandler[]> = new Map();

  /**
   * Publicar evento (síncrono)
   * 
   * 1. Guarda evento en publishedEvents
   * 2. Ejecuta todos los handlers registrados para ese eventName
   */
  async publish(event: IntegrationEvent): Promise<void> {
    // Guardar para verificación
    this.publishedEvents.push(event);

    // Ejecutar handlers
    const eventName = event.eventName();
    const handlersForEvent = this.handlers.get(eventName) || [];

    for (const handler of handlersForEvent) {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Handler failed for event ${eventName}: `, error);
        // En memoria, no reintentamos (tests deben ser determinísticos)
        throw error;
      }
    }
  }

  /**
   * Suscribir handler
   */
  async subscribe(eventName:  string, handler: IEventHandler): Promise<void> {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }

    this.handlers.get(eventName)!.push(handler);
  }

  /**
   * Limpiar (útil entre tests)
   */
  clear(): void {
    this.publishedEvents = [];
    this. handlers.clear();
  }

  /**
   * Verificar si se publicó un evento específico
   */
  wasEventPublished(eventName: string): boolean {
    return this.publishedEvents.some((e) => e.eventName() === eventName);
  }

  /**
   * Obtener todos los eventos de un tipo
   */
  getEventsOfType<T extends IntegrationEvent>(eventName: string): T[] {
    return this.publishedEvents.filter((e) => e.eventName() === eventName) as T[];
  }

  /**
   * Contar eventos publicados
   */
  getEventCount(): number {
    return this.publishedEvents.length;
  }
}