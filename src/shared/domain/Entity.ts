/**
 * Entity - DDD Building Block
 * 
 * Una Entity tiene IDENTIDAD única. 
 * Dos entities con el mismo ID son la misma, 
 * aunque sus atributos difieran.
 * 
 * Características: 
 * - Identidad única e inmutable
 * - Igualdad basada en ID
 * - Tiene ciclo de vida
 * - Puede mutar (cambiar atributos)
 * 
 * Ejemplos:
 * - Payment (tiene ID, cambia de status)
 * - Order (tiene ID, pasa por estados)
 * - Invoice (tiene número único, se emite/cancela)
 * 
 * @see https://martinfowler.com/bliki/EvansClassification.html
 */
export abstract class Entity<ID> {
  protected readonly _id: ID;

  constructor(id: ID) {
    this._id = id;
  }

  /**
   * ID es público para lectura pero inmutable
   */
  get id(): ID {
    return this._id;
  }

  /**
   * Igualdad por IDENTIDAD
   * 
   * Dos entities son iguales si comparten el mismo ID,
   * independientemente de sus otros atributos.
   * 
   * Ejemplo:
   * Payment(id=1, status=pending) === Payment(id=1, status=captured)
   */
  equals(other: Entity<ID>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    // Optimización: misma referencia
    if (this === other) {
      return true;
    }

    // Comparación por ID
    return this._id === other._id;
  }

  /**
   * Type guard para verificar si es una Entity
   */
  static isEntity(v: any): v is Entity<any> {
    return v instanceof Entity;
  }
}