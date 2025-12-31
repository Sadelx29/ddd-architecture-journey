import { IEventBus } from './IEventBus';
import { IEventHandler } from './IEventHandler';

/**
 * EventSubscriber - Helper para suscribirse a múltiples eventos
 * 
 * Facilita el registro de handlers en bulk.
 * 
 * Ejemplo de uso:
 * ```typescript
 * const subscriber = new EventSubscriber(eventBus);
 * 
 * await subscriber.subscribe([
 *   {
 *     eventName: 'payment.authorized',
 *     handler: new CreateInvoiceOnPaymentAuthorized(invoiceRepo)
 *   },
 *   {
 *     eventName: 'order.confirmed',
 *     handler: new ReserveInventoryOnOrderConfirmed(inventoryRepo)
 *   }
 * ]);
 * ```
 */
export class EventSubscriber {
  constructor(private readonly eventBus: IEventBus) {}

  /**
   * Suscribirse a múltiples eventos
   */
  async subscribe(
    subscriptions: Array<{
      eventName: string;
      handler:  IEventHandler;
    }>
  ): Promise<void> {
    for (const { eventName, handler } of subscriptions) {
      await this.eventBus.subscribe(eventName, handler);
    }
  }

  /**
   * Suscribirse a un solo evento (convenience method)
   */
  async subscribeToEvent(
    eventName: string,
    handler: IEventHandler
  ): Promise<void> {
    await this.eventBus.subscribe(eventName, handler);
  }
}