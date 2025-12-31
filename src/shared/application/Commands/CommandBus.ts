import { Result } from '@shared/domain/Result';
import { ICommand } from './ICommand';
import { ICommandHandler } from './ICommandHandler';

/**
 * CommandBus - Mediator entre callers y handlers
 * 
 * Por qué existe:
 * En vez de que el controller llame directamente al handler: 
 * 
 * ❌ Controller → AuthorizePaymentHandler (acoplamiento)
 * ✅ Controller → CommandBus → AuthorizePaymentHandler (desacoplado)
 * 
 * Beneficios:
 * 1. Desacoplamiento:  Controller no conoce al handler concreto
 * 2. Single point of control:  Puedes agregar cross-cutting concerns
 * 3. Testeable: Puedes mockear el bus completo
 * 4. Type-safe: TypeScript garantiza que el Command tiene handler
 * 
 * Decisión de diseño:
 * - Registro manual (no auto-discovery)
 * - Un handler por Command (no múltiples)
 * - Síncrono (async pero esperamos resultado)
 * 
 * Trade-offs:
 * - ✅ Ventaja: Control total, explícito
 * - ❌ Desventaja:  Debes registrar manualmente cada handler
 * - Decisión: Explícito > mágico
 */
export class CommandBus {
  /**
   * Registry de handlers
   * Key: Nombre del Command (class name)
   * Value: Handler instance
   */
  private handlers = new Map<string, ICommandHandler<any, any>>();

  /**
   * Registrar un handler para un Command específico
   * 
   * Ejemplo:
   * ```typescript
   * const bus = new CommandBus();
   * bus.register(
   *   'AuthorizePaymentCommand',
   *   new AuthorizePaymentHandler(paymentRepo)
   * );
   * ```
   * 
   * @param commandName Nombre del Command (usar constructor.name)
   * @param handler Instancia del handler
   */
  register<C extends ICommand, R>(
    commandName: string,
    handler: ICommandHandler<C, R>
  ): void {
    if (this.handlers.has(commandName)) {
      throw new Error(`Handler already registered for command: ${commandName}`);
    }

    this.handlers.set(commandName, handler);
  }

  /**
   * Ejecutar un Command
   * 
   * Flujo: 
   * 1. Buscar handler por nombre del Command
   * 2. Si no existe → Error
   * 3. Si existe → Ejecutar handler. handle(command)
   * 4. Retornar resultado
   * 
   * Ejemplo:
   * ```typescript
   * const command = new AuthorizePaymentCommand("pay_123", "auth_code");
   * const result = await commandBus.execute(command);
   * 
   * if (result.isFailure) {
   *   console.error(result.error);
   * }
   * ```
   * 
   * @param command Instancia del Command
   * @returns Result con éxito/fallo
   */
  async execute<C extends ICommand, R>(command: C): Promise<Result<R>> {
    const commandName = command.constructor.name;
    const handler = this.handlers.get(commandName);

    if (!handler) {
      return Result.fail(`No handler registered for command: ${commandName}`);
    }

    try {
      return await handler.handle(command);
    } catch (error) {
      // Catch de errores no manejados (bugs)
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Command execution failed: ${errorMessage}`);
    }
  }

  /**
   * Verificar si existe handler para un Command
   */
  hasHandler(commandName: string): boolean {
    return this.handlers.has(commandName);
  }

  /**
   * Obtener nombres de todos los Commands registrados
   * (útil para debugging/monitoring)
   */
  getRegisteredCommands(): string[] {
    return Array.from(this.handlers. keys());
  }
}