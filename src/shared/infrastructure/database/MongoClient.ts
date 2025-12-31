import { MongoClient as MongoDB, Db, Collection } from 'mongodb';

/**
 * MongoClient - Adapter para MongoDB
 * 
 * Responsabilidades:
 * 1. Gestionar conexión a MongoDB
 * 2. Proveer acceso a collections
 * 3. Health checks
 * 
 * Usado por:
 * - Billing Context (Read Models / Proyecciones)
 *   - invoice_read_models
 *   - invoice_list_views
 * 
 * Por qué MongoDB para Read Models:
 * 1. Schema flexible (read models pueden evolucionar fácil)
 * 2. Denormalización sin culpa (optimizado para lectura)
 * 3. Queries rápidas con índices apropiados
 * 
 * IMPORTANTE: 
 * NO uses MongoDB para write side (aggregates).
 * Los aggregates van en Postgres (ACID, transacciones).
 * 
 * MongoDB es solo para proyecciones (read models).
 */
export class MongoClient {
  private client: MongoDB;
  private db?:  Db;
  private isConnected: boolean = false;

  constructor(
    private readonly config: {
      url: string;
      database: string;
    }
  ) {
    this.client = new MongoDB(config. url, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
    });
  }

  /**
   * Conectar a MongoDB
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(this.config.database);
      
      // Test de conexión
      await this.db.admin().ping();
      
      this.isConnected = true;
      console. log('✅ MongoDB connected successfully');
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to MongoDB: ${error}`);
    }
  }

  /**
   * Obtener una collection
   * 
   * Ejemplo:
   * ```typescript
   * const invoices = mongo.getCollection<InvoiceReadModel>('invoice_read_models');
   * 
   * // Insertar
   * await invoices.insertOne(readModel);
   * 
   * // Buscar
   * const invoice = await invoices.findOne({ _id: 'inv_123' });
   * 
   * // Actualizar
   * await invoices.updateOne(
   *   { _id: 'inv_123' },
   *   { $set:  { status: 'issued' } }
   * );
   * ```
   */
  getCollection<T = any>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('MongoDB not connected');
    }
    return this.db.collection<T>(name);
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Crear índices (llamar en inicialización)
   * 
   * Los índices se pueden crear desde código o desde init-mongo.js. 
   * Esto es útil para crear índices dinámicamente.
   */
  async createIndexes(
    collectionName: string,
    indexes: Array<{
      key: Record<string, 1 | -1>;
      options?: {
        unique?: boolean;
        sparse?: boolean;
        name?: string;
      };
    }>
  ): Promise<void> {
    const collection = this.getCollection(collectionName);
    
    for (const { key, options } of indexes) {
      await collection.createIndex(key, options);
      console.log(`Index created on ${collectionName}:`, key);
    }
  }

  /**
   * Cerrar conexión
   */
  async disconnect(): Promise<void> {
    await this.client.close();
    this.isConnected = false;
    console.log('MongoDB disconnected');
  }

  /**
   * Obtener instancia de DB (para operaciones avanzadas)
   */
  getDatabase(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected');
    }
    return this.db;
  }
}