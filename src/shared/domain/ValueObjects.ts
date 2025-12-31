/**
 * ValueObject - DDD Building Block
 * 
 * Un Value Object NO tiene identidad. 
 * Se define completamente por sus atributos.
 * 
 * Características:
 * - INMUTABLE (no tiene setters)
 * - Igualdad estructural (por atributos)
 * - Reemplazable (si cambias algo, creas uno nuevo)
 * - Sin efectos secundarios
 * - Compartible entre aggregates
 * 
 * Ejemplos:
 * - Money(100, "USD") === Money(100, "USD")
 * - Email("john@example.com")
 * - Address("Calle 1", "CDMX")
 * 
 * Trade-off: 
 * - ✅ Ventaja:  Garantiza inmutabilidad, evita bugs
 * - ❌ Desventaja: Más objetos en memoria (no problema en práctica)
 * 
 * @see https://martinfowler.com/bliki/ValueObject.html
 */
export abstract class ValueObject<T> {
  /**
   * Props son inmutables (readonly + Object.freeze)
   */
  protected readonly props: T;

  constructor(props: T) {
    // Congelar objeto para prevenir mutación accidental
    this.props = Object.freeze(props);
  }

  /**
   * Igualdad por ESTRUCTURA
   * 
   * Dos Value Objects son iguales si todos sus atributos son iguales.
   * 
   * Nota: Usamos JSON.stringify por simplicidad. 
   * Para Value Objects grandes o con performance crítica,
   * override este método con comparación manual.
   */
  equals(other: ValueObject<T>): boolean {
    if (other === null || other === undefined) {
      return false;
    }

    // Optimización: misma referencia
    if (this === other) {
      return true;
    }

    // Comparación profunda
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  /**
   * Type guard
   */
  static isValueObject(v: any): v is ValueObject<any> {
    return v instanceof ValueObject;
  }
}