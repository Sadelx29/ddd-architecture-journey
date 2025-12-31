import { Result } from '@shared/domain/Result';
import { ICommand } from './ICommand';

/**
 * ICommandHandler - Interfaz para handlers de Commands
 * 
 * Un CommandHandler: 
 * 1. Recibe un Command
 * 2. Carga el Aggregate (si existe)
 * 3. Ejecuta la operación en el Aggregate
 * 4. Persiste el Aggregate
 * 5. Retorna Result (éxito o fallo)
 * 
 * IMPORTANTE: 
 * - Un handler por Command (Single Responsibility)
 * - NO retorna datos de negocio (solo Result<void> o Result<ID>)
 * - Si necesitas datos después, usa una Query
 * 
 * Patrón: 
 * Esto es el patrón "Command Handler" de CQRS. 
 * Separa la intención (Command) de la ejecución (Handler).
 * 
 * Beneficios:
 * - Testeable (mock del handler)
 * - Desacoplado (controller no conoce implementación)
 * - Intercambiable (puedes cambiar handler sin cambiar caller)
 * - Interceptable (puedes agregar logging, transacciones, etc.)
 * 
 * @template C Tipo del Command
 * @template R Tipo del resultado (void por defecto)
 */
export interface ICommandHandler<C extends ICommand, R = void> {
  /**
   * Ejecutar el command
   * 
   * @param command Instancia del command con los datos
   * @returns Result con éxito/fallo y opcionalmente el valor de retorno
   */
  handle(command: C): Promise<Result<R>>;
}