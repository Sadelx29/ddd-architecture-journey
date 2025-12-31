/**
 * EventStoreClient - Adapter para EventStoreDB
 * 
 * Responsabilidades:
 * 1. Append events a streams
 * 2. Leer events desde streams
 * 3. Subscripciones a eventos
 * 4.  Proyecciones
 * 
 * Usado por:
 * - Billing Context (Event Sourcing)
 *   - Streams:  invoice-{invoiceId}
 * 
 * Conceptos clave:
 * 
 * Stream = Secuencia de eventos para un aggregate
 * Ejemplo: "invoice-inv_123" contiene todos los eventos de esa factura
 * 
 * Append = Agregar evento al final del stream (append-only)
 * 
 * Read = Leer todos los eventos de un stream para reconstruir el aggregate
 * 
 * Subscription = Escuchar eventos nuevos (para proyecciones)
 * 
 * IMPORTANTE: 
 * EventStoreDB usa gRPC (no HTTP).
 * Necesitarás el cliente oficial:  @eventstore/db-client
 * 
 * Para este ejemplo, muestro la interfaz. 
 * La implementación real requiere instalar el paquete. 
 */

/**
 * Evento almacenado en EventStore
 */
export interface StoredEvent {
  eventId:  string;
  eventType: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  streamId: string;
  streamPosition: number;
  timestamp: Date;
}

/**
 * Opciones para append
 */
export interface AppendOptions {
  /**
   * Expected version (para optimistic concurrency)
   * 
   * Si el stream tiene versión diferente a la esperada,
   * el append falla (alguien más modificó el aggregate).
   */
  expectedVersion?: number;
}

/**
 * EventStoreClient (interfaz)
 * 
 * Nota: La implementación real usaría @eventstore/db-client
 * Aquí muestro la API que necesitamos.
 */
export class EventStoreClient {
  private isConnected: boolean = false;

  constructor(
     config: {
      connectionString: string;  // esdb://localhost:2113? tls=false
    }
  ) {}

  /**
   * Conectar a EventStoreDB
   */
  async connect(): Promise<void> {
    try {
      // TODO: Implementar con @eventstore/db-client
      // const client = EventStoreDBClient.connectionString(this.config.connectionString);
      
      this.isConnected = true;
      console.log('✅ EventStoreDB connected successfully');
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to EventStoreDB:  ${error}`);
    }
  }

  /**
   * Append events a un stream
   * 
   * Ejemplo:
   * ```typescript
   * await eventStore.appendToStream(
   *   'invoice-inv_123',
   *   [
   *     {
   *       eventType: 'InvoiceCreated',
   *       data: { invoiceId:  'inv_123', amount:  100 }
   *     },
   *     {
   *       eventType: 'TaxCalculated',
   *       data: { taxAmount: 16 }
   *     }
   *   ],
   *   { expectedVersion: 0 }  // Espera que sea el primer evento
   * );
   * ```
   * 
   * Si expectedVersion no coincide → WrongExpectedVersionError
   * Esto detecta concurrencia (dos procesos modificando el mismo aggregate).
   */
  async appendToStream(
    streamName: string,
    events: Array<{
      eventType: string;
      data: Record<string, any>;
      metadata?: Record<string, any>;
    }>,
    options?:  AppendOptions
  ): Promise<void> {
    if (! this.isConnected) {
      throw new Error('EventStoreDB not connected');
    }

    // TODO: Implementación real con @eventstore/db-client
    console.log(`Appending ${events.length} events to stream: ${streamName}`);
  }

  /**
   * Leer todos los eventos de un stream
   * 
   * Usado para reconstruir el aggregate desde eventos.
   * 
   * Ejemplo: 
   * ```typescript
   * const events = await eventStore.readStream('invoice-inv_123');
   * 
   * // Reconstruir aggregate
   * const invoice = new Invoice(invoiceId);
   * for (const event of events) {
   *   invoice.apply(event);  // Método del aggregate que aplica eventos
   * }
   * ```
   */
  async readStream(
    streamName: string,
    options?: {
      fromRevision?: number;  // Leer desde versión específica
      maxCount?: number;       // Limitar cantidad de eventos
    }
  ): Promise<StoredEvent[]> {
    if (!this.isConnected) {
      throw new Error('EventStoreDB not connected');
    }

    // TODO: Implementación real
    console.log(`Reading stream: ${streamName}`);
    return [];
  }

  /**
   * Suscribirse a un stream
   * 
   * Usado para proyecciones:  cada vez que se agrega un evento,
   * se ejecuta el handler (para actualizar read model).
   * 
   * Ejemplo:
   * ```typescript
   * await eventStore. subscribeToStream(
   *   'invoice-inv_123',
   *   async (event) => {
   *     // Actualizar read model en MongoDB
   *     await updateInvoiceReadModel(event);
   *   }
   * );
   * ```
   */
  async subscribeToStream(
    streamName: string,
    onEvent: (event: StoredEvent) => Promise<void>
  ): Promise<void> {
    if (! this.isConnected) {
      throw new Error('EventStoreDB not connected');
    }

    // TODO: Implementación real
    console.log(`Subscribed to stream: ${streamName}`);
  }

  /**
   * Suscribirse a TODOS los eventos (para proyecciones globales)
   */
  async subscribeToAll(
    onEvent: (event: StoredEvent) => Promise<void>,
    options?: {
      filter?: string;  // Filtro de eventos (ej: solo "Invoice*")
    }
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('EventStoreDB not connected');
    }

    // TODO: Implementación real
    console.log('Subscribed to $all stream');
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      // TODO: Ping a EventStore
      return this.isConnected;
    } catch {
      return false;
    }
  }

  /**
   * Cerrar conexión
   */
  async disconnect(): Promise<void> {
    // TODO: Cerrar cliente
    this.isConnected = false;
    console.log('EventStoreDB disconnected');
  }
}