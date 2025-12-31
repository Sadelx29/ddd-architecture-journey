import { 
  GenericContainer, 
  StartedTestContainer, 
  Wait 
} from 'testcontainers';

/**
 * TestContainers - Helpers para levantar infraestructura en tests
 * 
 * Por qué TestContainers:
 * - Tests con infraestructura REAL (no mocks)
 * - Aislamiento total (cada test suite su container)
 * - Se destruyen automáticamente al terminar
 * - Reproducibilidad (misma imagen Docker = mismo comportamiento)
 * 
 * Trade-offs:
 * - ✅ Ventaja:   Confianza total (no mocks de BD)
 * - ✅ Ventaja: Detecta bugs de integración
 * - ❌ Desventaja: Más lentos que unit tests
 * - ❌ Desventaja:  Requieren Docker corriendo
 * 
 * Decisión: Vale la pena para infrastructure layer
 */
export class TestContainers {
  /**
   * PostgreSQL Container
   * 
   * Se usa para:
   * - PostgresClient tests
   * - Repository tests (Payment, Orders, Inventory)
   */
  static async startPostgres(): Promise<{
    container: StartedTestContainer;
    connectionString: string;
    config: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    };
  }> {
    const container = await new GenericContainer('postgres: 15-alpine')
      .withEnvironment({
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_pass',
        POSTGRES_DB:  'test_db',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
      .withStartupTimeout(30000)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(5432);

    return {
      container,
      connectionString: `postgresql://test_user:test_pass@${host}:${port}/test_db`,
      config: {
        host,
        port,
        database: 'test_db',
        user: 'test_user',
        password:  'test_pass',
      },
    };
  }

  /**
   * MongoDB Container
   */
  static async startMongoDB(): Promise<{
    container:  StartedTestContainer;
    connectionString: string;
  }> {
    const container = await new GenericContainer('mongo: 7')
      .withEnvironment({
        MONGO_INITDB_ROOT_USERNAME: 'test_user',
        MONGO_INITDB_ROOT_PASSWORD:  'test_pass',
      })
      .withExposedPorts(27017)
      .withWaitStrategy(Wait. forLogMessage(/Waiting for connections/))
      .withStartupTimeout(30000)
      .start();

    const host = container. getHost();
    const port = container.getMappedPort(27017);

    return {
      container,
      connectionString: `mongodb://test_user:test_pass@${host}:${port}/test_db? authSource=admin`,
    };
  }

  /**
   * RabbitMQ Container
   */
  static async startRabbitMQ(): Promise<{
    container: StartedTestContainer;
    connectionString: string;
    managementUrl: string;
  }> {
    const container = await new GenericContainer('rabbitmq:3. 13-management-alpine')
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: 'test_user',
        RABBITMQ_DEFAULT_PASS: 'test_pass',
      })
      .withExposedPorts(5672, 15672)
      .withWaitStrategy(Wait.forLogMessage(/Server startup complete/))
      .withStartupTimeout(60000)  // RabbitMQ tarda más
      .start();

    const host = container.getHost();
    const amqpPort = container.getMappedPort(5672);
    const managementPort = container.getMappedPort(15672);

    return {
      container,
      connectionString: `amqp://test_user:test_pass@${host}:${amqpPort}`,
      managementUrl: `http://${host}:${managementPort}`,
    };
  }

  /**
   * EventStoreDB Container
   * 
   * Nota: EventStore tarda más en iniciar (proyecciones, etc.)
   */
  static async startEventStore(): Promise<{
    container:  StartedTestContainer;
    connectionString: string;
  }> {
    const container = await new GenericContainer('eventstore/eventstore:23.10.0-bookworm-slim')
      .withEnvironment({
        EVENTSTORE_CLUSTER_SIZE: '1',
        EVENTSTORE_INSECURE:  'true',
        EVENTSTORE_ENABLE_ATOM_PUB_OVER_HTTP: 'true',
      })
      .withExposedPorts(2113, 1113)
      .withWaitStrategy(Wait.forHttp('/health/live', 2113))
      .withStartupTimeout(60000)
      .start();

    const host = container. getHost();
    const httpPort = container.getMappedPort(2113);

    return {
      container,
      connectionString: `esdb://${host}:${httpPort}? tls=false`,
    };
  }
}