/**
 * ICommand - Marker interface para Commands
 * 
 * Un Command representa una INTENCIÓN de cambiar el estado del sistema. 
 * 
 * Características:
 * - Nombrado en IMPERATIVO (AuthorizePayment, CreateOrder)
 * - Representa una acción que el usuario quiere ejecutar
 * - Puede FALLAR (validaciones, reglas de negocio)
 * - Solo ESCRIBE, no retorna datos de negocio
 * 
 * Diferencia con Query: 
 * - Command:  CAMBIA estado (write)
 * - Query: SOLO LEE (read)
 * 
 * Por qué marker interface:
 * - Type safety (solo Commands pueden ejecutarse en CommandBus)
 * - Documentación (es claro que es un Command)
 * - Extensibilidad (podemos agregar metadata después)
 * 
 * Ejemplo:
 * ```typescript
 * class AuthorizePaymentCommand implements ICommand {
 *   constructor(
 *     public readonly paymentId: string,
 *     public readonly authorizationCode: string
 *   ) {}
 * }
 * ```
 */
export interface ICommand {
  // Marker interface (vacía intencionalmente)
  // Todas las clases que implementen esto son Commands
}