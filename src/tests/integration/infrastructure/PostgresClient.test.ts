import { PostgresClient } from '@shared/infrastructure/database/Postgresclient';
import { TestContainers } from '../../helpers/TestContainers';
import { StartedTestContainer } from 'testcontainers';

/**
 * PostgresClient Integration Tests
 * 
 * Validan: 
 * 1. Conexión exitosa
 * 2. Queries simples
 * 3. Transacciones (commit)
 * 4. Transacciones (rollback)
 * 5. Manejo de errores
 * 6. Pool de conexiones
 */
describe('PostgresClient Integration Tests', () => {
  let container: StartedTestContainer;
  let client: PostgresClient;

  /**
   * Setup:  Levantar container ANTES de todos los tests
   */
  beforeAll(async () => {
    const { container: pgContainer, config } = await TestContainers. startPostgres();
    container = pgContainer;

    client = new PostgresClient(config);
    await client.connect();

    // Crear tabla de prueba
    await client.query(`
      CREATE TABLE test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        value INTEGER
      )
    `);
  }, 60000);  // Timeout extendido (container puede tardar)

  /**
   * Cleanup: Cerrar conexión y destruir container
   */
  afterAll(async () => {
    await client.disconnect();
    await container.stop();
  });

  /**
   * Limpiar tabla entre tests
   */
  afterEach(async () => {
    await client.query('TRUNCATE test_table RESTART IDENTITY');
  });

  /**
   * TEST 1: Conexión exitosa
   */
  it('should connect successfully', async () => {
    const result = await client.query('SELECT 1 as value');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].value).toBe(1);
  });

  /**
   * TEST 2: Query con parámetros (SQL injection safe)
   */
  it('should execute parameterized queries', async () => {
    await client.query(
      'INSERT INTO test_table (name, value) VALUES ($1, $2)',
      ['test', 42]
    );

    const result = await client.query(
      'SELECT * FROM test_table WHERE name = $1',
      ['test']
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('test');
    expect(result.rows[0]. value).toBe(42);
  });

  /**
   * TEST 3: Transacción exitosa (COMMIT)
   */
  it('should commit transaction on success', async () => {
    await client.transaction(async (txClient) => {
      await txClient.query(
        'INSERT INTO test_table (name, value) VALUES ($1, $2)',
        ['tx1', 10]
      );
      await txClient.query(
        'INSERT INTO test_table (name, value) VALUES ($1, $2)',
        ['tx2', 20]
      );
    });

    // Verificar que ambos inserts se guardaron
    const result = await client.query('SELECT COUNT(*) as count FROM test_table');
    expect(parseInt(result.rows[0].count)).toBe(2);
  });

  /**
   * TEST 4: Transacción fallida (ROLLBACK)
   */
  it('should rollback transaction on error', async () => {
    try {
      await client.transaction(async (txClient) => {
        await txClient.query(
          'INSERT INTO test_table (name, value) VALUES ($1, $2)',
          ['tx1', 10]
        );

        // Simular error
        throw new Error('Simulated failure');
      });
    } catch (error) {
      // Esperamos que falle
    }

    // Verificar que NO se guardó nada (rollback automático)
    const result = await client.query('SELECT COUNT(*) as count FROM test_table');
    expect(parseInt(result.rows[0].count)).toBe(0);
  });

  /**
   * TEST 5: Health check
   */
  it('should return healthy status', async () => {
    const healthy = await client.isHealthy();
    expect(healthy).toBe(true);
  });

  /**
   * TEST 6: Pool stats
   */
  it('should provide pool statistics', () => {
    const stats = client.getPoolStats();
    
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('idle');
    expect(stats).toHaveProperty('waiting');
    
    expect(stats.total).toBeGreaterThan(0);
  });

  /**
   * TEST 7: Optimistic locking (versioning)
   * 
   * Simula el patrón que usaremos en Aggregates
   */
  it('should detect concurrent modifications with versioning', async () => {
    // Setup: Insertar registro con versión
    await client.query(`
      INSERT INTO test_table (name, value) 
      VALUES ('versioned', 0)
    `);

    // Thread 1: Lee versión 0
    const row1 = await client.query(
      'SELECT * FROM test_table WHERE name = $1',
      ['versioned']
    );
    const version1 = row1.rows[0].id;  // Usamos ID como versión en este test

    // Thread 2: Lee versión 0 y actualiza primero
    await client.query(
      'UPDATE test_table SET value = value + 1 WHERE id = $1',
      [version1]
    );

    // Thread 1: Intenta actualizar con versión desactualizada
    const result = await client.query(
      'UPDATE test_table SET value = value + 1 WHERE id = $1 AND value = 0',
      [version1]
    );

    // Thread 1 no debe haber actualizado nada (versión cambió)
    expect(result.rowCount).toBe(0);
  });
});