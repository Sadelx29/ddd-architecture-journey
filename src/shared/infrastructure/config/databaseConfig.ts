/**
 * DatabaseConfig - Configuración centralizada desde env vars
 * 
 * Por qué existe:
 * - Separación de config del código (12 Factor App)
 * - Secrets NO en código fuente
 * - Fácil cambio entre ambientes (dev/staging/prod)
 * - Validación centralizada de config
 * 
 * Decisión arquitectónica:
 * - Config se carga AL INICIO (fail-fast si falta algo)
 * - Config es INMUTABLE (readonly)
 * - Validación explícita (errores claros)
 */

/**
 * Cargar variable de entorno con validación
 */
function getEnvVar(key: string, defaultValue?:  string): string {
  const value = process.env[key] || defaultValue;
  
  if (value === undefined) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please set it in your .env file or environment. `
    );
  }
  
  return value;
}

/**
 * Cargar variable numérica
 */
function getEnvNumber(key: string, defaultValue?:  number): number {
  const value = process.env[key];
  
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }
  
  const num = parseInt(value, 10);
  
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
  }
  
  return num;
}

/**
 * PostgreSQL Configuration
 */
export const PostgresConfig = {
  host: getEnvVar('POSTGRES_HOST', 'localhost'),
  port: getEnvNumber('POSTGRES_PORT', 5432),
  database: getEnvVar('POSTGRES_DB', 'ecommerce'),
  user: getEnvVar('POSTGRES_USER', 'admin'),
  password: getEnvVar('POSTGRES_PASSWORD'),  // ← SIN default (DEBE estar en .env)
  max: getEnvNumber('POSTGRES_POOL_MAX', 10),
  idleTimeoutMillis: getEnvNumber('POSTGRES_IDLE_TIMEOUT', 30000),
  connectionTimeoutMillis: getEnvNumber('POSTGRES_CONNECTION_TIMEOUT', 2000),
} as const;  // ← 'as const' = readonly profundo

/**
 * MongoDB Configuration
 */
export const MongoConfig = {
  url: getEnvVar('MONGODB_URL'),
  database: getEnvVar('MONGODB_DATABASE', 'billing'),
} as const;

/**
 * EventStoreDB Configuration
 */
export const EventStoreConfig = {
  connectionString: getEnvVar('EVENTSTORE_URL'),
} as const;

/**
 * RabbitMQ Configuration
 */
export const RabbitMQConfig = {
  url: getEnvVar('RABBITMQ_URL'),
  prefetch: getEnvNumber('RABBITMQ_PREFETCH', 10),
  retryAttempts: getEnvNumber('RABBITMQ_RETRY_ATTEMPTS', 3),
} as const;

/**
 * Application Configuration
 */
export const AppConfig = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3000),
  logLevel: getEnvVar('LOG_LEVEL', 'info'),
} as const;

/**
 * Validar TODA la configuración al inicio
 * 
 * Llamar en bootstrap ANTES de iniciar servicios. 
 * Fail-fast si falta algo crítico.
 */
export function validateConfig(): void {
  console.log('🔍 Validating configuration...');
  
  // Esto fuerza la evaluación de todos los getEnvVar
  const configs = [
    PostgresConfig,
    MongoConfig,
    EventStoreConfig,
    RabbitMQConfig,
    AppConfig,
  ];

  // validar cada config (no hace nada, solo fuerza evaluación)
  configs.forEach(cfg => JSON.stringify(cfg));
  
  console.log('✅ Configuration validated successfully');
  console.log(`   Environment: ${AppConfig.nodeEnv}`);
  console.log(`   PostgreSQL: ${PostgresConfig.host}:${PostgresConfig.port}`);
  console.log(`   MongoDB: ${MongoConfig.database}`);
}