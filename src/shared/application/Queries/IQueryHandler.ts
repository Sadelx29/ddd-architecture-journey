import { Result } from '@shared/domain/Result';
import { IQuery } from './IQuery';

/**
 * IQueryHandler - Interfaz para handlers de Queries
 * 
 * Un QueryHandler:
 * 1. Recibe una Query
 * 2. Lee datos (de Read Model, BD, cache, etc.)
 * 3. Transforma a DTO
 * 4. Retorna Result<DTO>
 * 
 * IMPORTANTE:
 * - NO toca Aggregates (esos son para write)
 * - Puede leer directamente de tablas/colecciones
 * - Puede hacer JOINs (prohibido en aggregates)
 * - Retorna DTOs planos (no objetos de dominio)
 * 
 * Por qué separado de CommandHandler:
 * - Diferentes responsabilidades (CQS)
 * - Diferentes optimizaciones (lectura vs escritura)
 * - Diferentes fuentes de datos (read models vs aggregates)
 * 
 * @template Q Tipo de Query
 * @template R Tipo de DTO que retorna
 */
export interface IQueryHandler<Q extends IQuery<R>, R> {
  /**
   * Ejecutar la query
   * 
   * @param query Instancia de la query
   * @returns Result con el DTO o error
   */
  handle(query: Q): Promise<Result<R>>;
}