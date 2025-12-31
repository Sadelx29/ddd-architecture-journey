/**
 * IQuery<R> - Marker interface para Queries
 * 
 * Un Query representa una PETICIÓN de datos (solo lectura).
 * 
 * Características:
 * - Nombrado como pregunta (GetPaymentStatus, ListOrders)
 * - NO modifica estado (idempotente)
 * - Retorna DTOs (Data Transfer Objects), NO entidades de dominio
 * - Puede leer de Read Models optimizados
 * 
 * Diferencia crítica con Command:
 * - Query:  SOLO LEE (no side effects)
 * - Command: ESCRIBE (cambia estado)
 * 
 * Por qué generic <R>:
 * Especifica el tipo de dato que retorna. 
 * 
 * Ejemplo:
 * ```typescript
 * class GetPaymentStatusQuery implements IQuery<PaymentStatusDTO> {
 *   constructor(public readonly paymentId: string) {}
 * }
 * 
 * // El handler retorna PaymentStatusDTO
 * ```
 * 
 * CQRS puro:
 * En CQRS estricto, queries leen de Read Models (proyecciones),
 * NO del modelo de escritura (aggregates).
 * 
 * @template R Tipo de dato que retorna la query
 */
export interface IQuery<R> {
  // Marker interface
  // El tipo genérico R especifica qué retorna
  _brand?: R;
}