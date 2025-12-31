import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * PostgresClient - Adapter para PostgreSQL
 * 
 * Responsabilidades:
 * 1. Gestionar connection pool
 * 2. Proveer API para queries
 * 3. Gestionar transacciones
 * 4. Health checks
 * 
 * Usado por:
 * - Payment Context (payments, payment_transactions)
 * - Orders Context (orders, order_items)
 * - Inventory Context (stock_items, reservations)
 * - Sagas (order_process_sagas)
 * 
 * Decisión de diseño:
 * - Pool de conexiones (no conexión por request)
 * - Transacciones explícitas
 * - Queries parametrizadas (SQL injection safe)
 * 
 * Trade-offs:
 * - ✅ Ventaja: Performance (pool reutiliza conexiones)
 * - ✅ Ventaja: Seguro (prepared statements)
 * - ❌ Desventaja:  Necesitas cerrar conexiones explícitamente
 */
export class PostgresClient {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(
    config: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
      max?: number;  // Max connections en pool (default 10)
      idleTimeoutMillis?: number;  // Timeout para conexiones idle
      connectionTimeoutMillis?: number;  // Timeout para obtener conexión
    }
  ) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 10,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    });

    // Event handlers para el pool
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle Postgres client', err);
    });

    this.pool.on('connect', () => {
      console.log('New Postgres client connected to pool');
    });

    this.pool.on('remove', () => {
      console.log('Postgres client removed from pool');
    });
  }

  /**
   * Conectar y verificar
   */
  async connect(): Promise<void> {
    try {
      // Test de conexión
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      console.log('✅ PostgreSQL connected successfully');
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }

  /**
   * Ejecutar query simple
   * 
   * Ejemplo:
   * ```typescript
   * const result = await postgres.query(
   *   'SELECT * FROM payment. payments WHERE id = $1',
   *   ['pay_123']
   * );
   * ```
   * 
   * IMPORTANTE: Siempre usa parámetros ($1, $2) para prevenir SQL injection
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.isConnected) {
      throw new Error('PostgreSQL client is not connected');
    }

    try {
      const result = await this.pool.query(text, params);
      return result;

    } catch (error) {
      console.error('PostgreSQL query error:', error);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Ejecutar dentro de una transacción
   * 
   * Garantiza atomicidad:  TODO o NADA. 
   * 
   * Ejemplo:
   * ```typescript
   * await postgres.transaction(async (client) => {
   *   // Todas estas queries son atómicas
   *   await client.query('INSERT INTO orders .. .');
   *   await client. query('INSERT INTO order_items ...');
   *   await client.query('UPDATE inventory ...');
   *   
   *   // Si cualquiera falla, se hace ROLLBACK automático
   *   // Si todas tienen éxito, se hace COMMIT
   * });
   * ```
   * 
   * CRÍTICO para Aggregates: 
   * El aggregate completo (root + entidades internas) 
   * debe guardarse en UNA transacción.
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.isConnected) {
      throw new Error('PostgreSQL client is not connected');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Obtener estadísticas del pool
   * Útil para monitoring
   */
  getPoolStats(): {
    total: number;
    idle: number;
    waiting: number;
  } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Cerrar conexiones (graceful shutdown)
   */
  async disconnect(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    console.log('PostgreSQL disconnected');
  }
}