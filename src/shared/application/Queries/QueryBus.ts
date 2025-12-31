import { Result } from '@shared/domain/Result';
import { IQuery } from './IQuery';
import { IQueryHandler } from './IQueryHandler';

/**
 * QueryBus - Mediator para Queries (análogo a CommandBus)
 * 
 * Mismos principios que CommandBus: 
 * - Desacoplamiento
 * - Single point of control
 * - Type safety
 * 
 * Diferencia con CommandBus:
 * - QueryBus es para LECTURA (idempotente)
 * - CommandBus es para ESCRITURA (side effects)
 * 
 * Por qué buses separados:
 * 1. Claridad:  Es obvio si estás leyendo o escribiendo
 * 2. Optimización: Puedes cachear queries, no commands
 * 3. Escalabilidad: Read y write pueden escalar diferente
 * 
 * Futuro: 
 * Puedes agregar caching aquí (queries se cachean, commands no).
 */
export class QueryBus {
  private handlers = new Map<string, IQueryHandler<any, any>>();

  /**
   * Registrar handler para una Query
   */
  register<Q extends IQuery<R>, R>(
    queryName:  string,
    handler: IQueryHandler<Q, R>
  ): void {
    if (this.handlers.has(queryName)) {
      throw new Error(`Handler already registered for query: ${queryName}`);
    }

    this.handlers.set(queryName, handler);
  }

  /**
   * Ejecutar una Query
   * 
   * Ejemplo:
   * ```typescript
   * const query = new GetPaymentStatusQuery("pay_123");
   * const result = await queryBus.execute(query);
   * 
   * if (result.isSuccess) {
   *   const dto:  PaymentStatusDTO = result.value;
   *   console.log(dto. status);
   * }
   * ```
   */
  async execute<Q extends IQuery<R>, R>(query:  Q): Promise<Result<R>> {
    const queryName = query.constructor.name;
    const handler = this.handlers.get(queryName);

    if (!handler) {
      return Result.fail(`No handler registered for query: ${queryName}`);
    }

    try {
      return await handler.handle(query);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Query execution failed: ${errorMessage}`);
    }
  }

  hasHandler(queryName: string): boolean {
    return this.handlers. has(queryName);
  }

  getRegisteredQueries(): string[] {
    return Array. from(this.handlers.keys());
  }
}