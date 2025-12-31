import amqp, {  Channel, ConsumeMessage, ChannelModel } from 'amqplib';
import { IEventBus } from '@shared/application/Events/IEventBus';
import { IEventHandler } from '@shared/application/Events/IEventHandler';
import { IntegrationEvent } from '@shared/domain/IntegrationEvent';

/**
 * RabbitMQEventBus - Implementación real de IEventBus
 * 
 * Arquitectura: 
 * 
 * 1. UN exchange:  "domain-events" (topic)
 * 2. Múltiples queues: una por (context + event)
 * 3. Bindings: conectan exchange → queues
 * 
 * Flujo de publicación:
 * 1. Evento publicado → Exchange
 * 2. Exchange rutea por routing key → Queues
 * 3. Consumers procesan desde queues
 * 
 * Garantías:
 * - At-least-once delivery (puede duplicarse)
 * - Orden FIFO por queue (no global)
 * - Persistencia (mensajes sobreviven crashes)
 * 
 * Trade-offs:
 * - ✅ Ventaja:  Desacoplamiento total entre contexts
 * - ✅ Ventaja: Escalabilidad (múltiples consumers)
 * - ❌ Desventaja:  Eventual consistency (no inmediato)
 * - ❌ Desventaja: Debugging más complejo (mensajes en vuelo)
 */
export class RabbitMQEventBus implements IEventBus {
  private connection?:  ChannelModel;
  private channel?: Channel;
  private isConnected:  boolean = false;

  /**
   * Configuración
   */
  private readonly EXCHANGE_NAME = 'domain-events';
  private readonly EXCHANGE_TYPE = 'topic';
  private readonly DEAD_LETTER_EXCHANGE = 'domain-events-dlx';

  constructor(
    private readonly config: {
      url: string;  // amqp://user:pass@localhost:5672
      prefetch?: number;  // Cuántos mensajes procesar concurrentemente
      retryAttempts?: number;  // Reintentos antes de DLQ
    }
  ) {}

  /**
   * Conectar a RabbitMQ
   * 
   * Crea: 
   * 1. Conexión al servidor
   * 2. Canal (donde se hacen operaciones)
   * 3. Exchange principal
   * 4. Dead Letter Exchange (para mensajes fallidos)
   */
  async connect(): Promise<void> {
    try {
      // 1. Crear conexión
      this.connection = await amqp.connect(this.config.url);

      // Handlers para eventos de conexión
      this.connection.on('error', (err) => {
        console.error('❌ RabbitMQ connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        console.warn('⚠️  RabbitMQ connection closed');
        this.isConnected = false;
      });

      // 2. Crear canal
      this.channel = await this.connection.createChannel();

      // Prefetch:  cuántos mensajes no-acked puede tener un consumer
      // Esto previene que un consumer acapare todos los mensajes
      await this. channel.prefetch(this.config.prefetch || 10);

      // 3. Declarar exchange principal (topic)
      await this.channel. assertExchange(this.EXCHANGE_NAME, this. EXCHANGE_TYPE, {
        durable: true,  // Sobrevive a reinicios
      });

      // 4. Declarar Dead Letter Exchange
      await this.channel.assertExchange(this. DEAD_LETTER_EXCHANGE, 'topic', {
        durable: true,
      });

      // 5. Declarar Dead Letter Queue (donde van mensajes fallidos)
      await this.channel.assertQueue('dead-letter-queue', {
        durable:  true,
      });

      // 6. Bind DLQ al DLX
      await this.channel.bindQueue(
        'dead-letter-queue',
        this.DEAD_LETTER_EXCHANGE,
        '#'  // Todos los eventos fallidos
      );

      this.isConnected = true;
      console.log('✅ RabbitMQ connected successfully');
      console.log(`   Exchange: ${this.EXCHANGE_NAME} (${this.EXCHANGE_TYPE})`);
      console.log(`   Prefetch: ${this.config.prefetch || 10}`);
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to RabbitMQ: ${error}`);
    }
  }

  /**
   * Publicar Integration Event
   * 
   * Flujo:
   * 1. Serializar evento a JSON
   * 2. Publicar a exchange con routing key
   * 3. RabbitMQ rutea a queues correspondientes
   * 
   * Ejemplo:
   * ```typescript
   * const event = new PaymentAuthorizedIntegrationEvent(
   *   "pay_123",
   *   100,
   *   "USD"
   * );
   * 
   * await eventBus.publish(event);
   * // → RabbitMQ rutea a todas las queues con binding "payment.authorized"
   * ```
   * 
   * IMPORTANTE: 
   * - Fire and forget (no esperamos confirmación de procesamiento)
   * - El evento se persiste en RabbitMQ antes de retornar
   * - Si RabbitMQ está caído, lanza error (caller debe manejar)
   */
  async publish(event: IntegrationEvent): Promise<void> {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ is not connected');
    }

    try {
      const routingKey = event.eventName();
      const message = JSON.stringify(event.toJSON());

      // Publicar a exchange
      const published = this.channel.publish(
        this.EXCHANGE_NAME,
        routingKey,
        Buffer.from(message),
        {
          persistent: true,  // Mensaje se escribe a disco
          contentType: 'application/json',
          timestamp: Date.now(),
          messageId: event.eventId,
        }
      );

      if (!published) {
        throw new Error('Failed to publish message (channel buffer full)');
      }

      console.log(`📤 Published event:  ${routingKey} (${event.eventId})`);
    } catch (error) {
      console.error(`❌ Failed to publish event:  ${event.eventName()}`, error);
      throw error;
    }
  }

  /**
   * Suscribirse a un evento
   * 
   * Flujo:
   * 1. Crear queue específica para este consumidor
   * 2. Bind queue al exchange con routing key (patrón)
   * 3. Consumir mensajes de la queue
   * 4. Por cada mensaje: 
   *    - Deserializar
   *    - Ejecutar handler
   *    - ACK si éxito, NACK si fallo
   * 
   * Ejemplo:
   * ```typescript
   * await eventBus.subscribe(
   *   'payment.authorized',
   *   new CreateInvoiceOnPaymentAuthorizedHandler(invoiceRepo)
   * );
   * ```
   * 
   * IMPORTANTE: 
   * - Cada context tiene su propia queue (aislamiento)
   * - Si handler falla, mensaje se reintenta (con límite)
   * - Handlers DEBEN ser idempotentes (mismo evento 2 veces = mismo resultado)
   */
  async subscribe(eventName: string, handler: IEventHandler): Promise<void> {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ is not connected');
    }

    try {
      // Nombre de queue:  {eventName}-queue
      // Ejemplo: "payment.authorized-queue"
      const queueName = `${eventName}-queue`;

      // 1. Declarar queue
      await this.channel.assertQueue(queueName, {
        durable: true,  // Sobrevive a reinicios
        deadLetterExchange: this. DEAD_LETTER_EXCHANGE,  // A dónde van mensajes fallidos
        deadLetterRoutingKey: eventName,  // Routing key para DLQ
      });

      // 2. Bind queue al exchange
      // Pattern matching: "payment.*" captura "payment.authorized", "payment.captured", etc.
      await this. channel.bindQueue(queueName, this.EXCHANGE_NAME, eventName);

      console.log(`📥 Subscribed to:  ${eventName} → ${queueName}`);

      // 3. Consumir mensajes
      await this.channel.consume(
        queueName,
        async (msg:  ConsumeMessage | null) => {
          if (! msg) return;

          await this.handleMessage(msg, handler, eventName);
        },
        {
          noAck: false,  // Requerimos ACK manual (para reintentos)
        }
      );
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${eventName}: `, error);
      throw error;
    }
  }

  /**
   * Manejar mensaje individual
   * 
   * Lógica de reintentos:
   * 1. Intenta procesar
   * 2. Si falla: 
   *    - Si aún hay reintentos → NACK con requeue
   *    - Si se agotaron reintentos → NACK sin requeue (va a DLQ)
   * 3. Si éxito → ACK
   * 
   * CRÍTICO:
   * El handler NO debe lanzar excepciones no manejadas.  
   * Debe retornar Promise que se resuelve o rechaza limpiamente.
   */
  private async handleMessage(
    msg:  ConsumeMessage,
    handler: IEventHandler,
    eventName: string
  ): Promise<void> {
    if (!this.channel) return;

    try {
      // Deserializar evento
      const eventData = JSON.parse(msg. content.toString());
      
      console.log(`📨 Received event: ${eventName} (${eventData.eventId})`);

      // Ejecutar handler
      await handler.handle(eventData);

      // ✅ Éxito → ACK
      this.channel.ack(msg);
      console.log(`✅ Processed event: ${eventName} (${eventData.eventId})`);
    } catch (error) {
      console.error(`❌ Error processing event ${eventName}:`, error);

      // Obtener número de reintentos
      const retryCount = this.getRetryCount(msg);
      const maxRetries = this.config.retryAttempts || 3;

      if (retryCount < maxRetries) {
        // Aún hay reintentos → NACK con requeue
        console.log(`🔄 Retry ${retryCount + 1}/${maxRetries} for event ${eventName}`);
        this.channel.nack(msg, false, true);  // requeue = true
      } else {
        // Se agotaron reintentos → DLQ
        console.error(`💀 Max retries exceeded for event ${eventName}, sending to DLQ`);
        this.channel.nack(msg, false, false);  // requeue = false → DLQ
      }
    }
  }

  /**
   * Obtener contador de reintentos desde headers
   */
  private getRetryCount(msg: ConsumeMessage): number {
    const headers = msg. properties.headers || {};
    return headers['x-retry-count'] || 0;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.channel) return false;
      
      // Verificar que el channel esté activo
      await this.channel.checkQueue('amq.gen-test');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cerrar conexión (graceful shutdown)
   */
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      console.log('RabbitMQ disconnected');
    } catch (error) {
      console.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  /**
   * Purgar una queue (útil para tests)
   */
  async purgeQueue(queueName: string): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ is not connected');
    }
    await this.channel.purgeQueue(queueName);
    console.log(`🗑️  Purged queue: ${queueName}`);
  }

  /**
   * Obtener estadísticas de una queue
   */
  async getQueueStats(queueName:  string): Promise<{
    messageCount: number;
    consumerCount: number;
  }> {
    if (!this.channel) {
      throw new Error('RabbitMQ is not connected');
    }

    const info = await this.channel.checkQueue(queueName);
    return {
      messageCount: info. messageCount,
      consumerCount: info.consumerCount,
    };
  }
}