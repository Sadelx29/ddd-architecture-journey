import 'dotenv/config';  // ← Cargar . env PRIMERO

import { validateConfig, PostgresConfig, MongoConfig, EventStoreConfig, RabbitMQConfig } from '../src/shared/infrastructure/config/databaseConfig';
import { PostgresClient } from '@shared/infrastructure/database/Postgresclient';
import { MongoClient } from '@shared/infrastructure/database/MongoClient';
import { EventStoreClient } from '@shared/infrastructure/database/EventStoreClient';
import { RabbitMQEventBus } from '@shared/infrastructure/messaging/RabbitMQEventBus';

/**
 * Bootstrap - Inicialización de la aplicación
 * 
 * Orden crítico:
 * 1. Validar config (fail-fast)
 * 2. Conectar infraestructura
 * 3. Registrar handlers
 * 4. Iniciar servidor
 */
async function bootstrap() {
  console.log('🚀 Starting application.. .');
  
  try {
    // 1. Validar configuración PRIMERO
    validateConfig();
    
    // 2. Crear clients con config desde env vars
    const postgres = new PostgresClient(PostgresConfig);
    const mongo = new MongoClient(MongoConfig);
    const eventStore = new EventStoreClient(EventStoreConfig);
    const eventBus = new RabbitMQEventBus(RabbitMQConfig);
    
    // 3. Conectar (en paralelo para speed)
    console.log('🔌 Connecting to infrastructure...');
    await Promise.all([
      postgres.connect(),
      mongo.connect(),
      eventStore.connect(),
      eventBus.connect(),
    ]);
    
    console.log('✅ All infrastructure connected');
    
    // 4. TODO: Registrar Command/Query handlers
    // 5. TODO: Suscribirse a eventos
    // 6. TODO: Iniciar HTTP server
    
    console.log('🎉 Application started successfully');
    
  } catch (error) {
    console.error('💀 Failed to start application:', error);
    process.exit(1);  // Exit con error code (importante para Docker/K8s)
  }
}

// Manejar shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  // TODO: Cerrar conexiones
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️  SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Iniciar
bootstrap().catch((error) => {
  console.error('💀 Unhandled error during bootstrap:', error);
  process.exit(1);
});