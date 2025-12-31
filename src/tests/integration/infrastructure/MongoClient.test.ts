import { MongoClient } from '@shared/infrastructure/database/MongoClient';
import { TestContainers } from '../../helpers/TestContainers';
import { StartedTestContainer } from 'testcontainers';

describe('MongoClient Integration Tests', () => {
  let container: StartedTestContainer;
  let client: MongoClient;

  beforeAll(async () => {
    const { container: mongoContainer, connectionString } = 
      await TestContainers. startMongoDB();
    
    container = mongoContainer;

    client = new MongoClient({
      url: connectionString,
      database: 'test_db',
    });

    await client.connect();
  }, 60000);

  afterAll(async () => {
    await client.disconnect();
    await container.stop();
  });

  afterEach(async () => {
    // Limpiar collection entre tests
    const collection = client.getCollection('test_collection');
    await collection.deleteMany({});
  });

  /**
   * TEST 1: Insert y find
   */
  it('should insert and find documents', async () => {
    const collection = client.getCollection<{ name: string; value: number }>('test_collection');

    await collection.insertOne({ name: 'test', value: 42 });

    const doc = await collection.findOne({ name: 'test' });

    expect(doc).not.toBeNull();
    expect(doc?. name).toBe('test');
    expect(doc?.value).toBe(42);
  });

  /**
   * TEST 2: Update
   */
  it('should update documents', async () => {
    const collection = client.getCollection('test_collection');

    await collection.insertOne({ _id: 'test-1', name: 'original', value: 10 });

    await collection.updateOne(
      { _id: 'test-1' },
      { $set:  { name: 'updated', value: 20 } }
    );

    const doc = await collection.findOne({ _id: 'test-1' });

    expect(doc?.name).toBe('updated');
    expect(doc?.value).toBe(20);
  });

  /**
   * TEST 3: Queries con índices
   */
  it('should query with indexes', async () => {
    const collection = client.getCollection('test_collection');

    // Crear índice
    await client.createIndexes('test_collection', [
      {
        key: { name: 1 },
        options: { unique: true },
      },
    ]);

    // Insert con índice único
    await collection.insertOne({ name: 'unique-1', value: 1 });

    // Intentar duplicado debe fallar
    await expect(
      collection.insertOne({ name: 'unique-1', value: 2 })
    ).rejects.toThrow();
  });

  /**
   * TEST 4: Aggregation (denormalización típica de read models)
   */
  it('should perform aggregations', async () => {
    const collection = client. getCollection('test_collection');

    await collection.insertMany([
      { category: 'A', value: 10 },
      { category: 'A', value: 20 },
      { category: 'B', value: 30 },
    ]);

    const results = await collection
      .aggregate([
        {
          $group: {
            _id: '$category',
            total: { $sum: '$value' },
          },
        },
      ])
      .toArray();

    expect(results).toHaveLength(2);
    
    const categoryA = results. find((r) => r._id === 'A');
    expect(categoryA?.total).toBe(30);
  });

  /**
   * TEST 5: Health check
   */
  it('should return healthy status', async () => {
    const healthy = await client.isHealthy();
    expect(healthy).toBe(true);
  });
});