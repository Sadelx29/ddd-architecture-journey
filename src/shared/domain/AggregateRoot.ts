import { Entity } from './Entity';
import { DomainEvent } from './DomainEvent';

/**
 * AggregateRoot - DDD Building Block
 * 
 * Un Aggregate es un cluster de objetos relacionados
 * que se tratan como UNIDAD para cambios de datos.
 * 
 * El AggregateRoot es la única entrada al aggregate.
 * 
 * Responsabilidades:
 * 1. Mantener INVARIANTES del aggregate
 * 2. Generar DOMAIN EVENTS cuando algo importante ocurre
 * 3. Definir FRONTERA TRANSACCIONAL
 * 4. Controlar acceso a entidades internas
 * 
 * Reglas de oro:
 * - Solo el AggregateRoot tiene repositorio
 * - Entidades internas NO se exponen (solo read-only)
 * - Cambios externos pasan por el Root
 * - Domain Events se publican DESPUÉS de persistir
 * 
 * Decisión arquitectónica:
 * Los events se ACUMULAN aquí, pero se PUBLICAN en el repositorio. 
 * Esto garantiza que no publicas eventos si falla la persistencia.
 * 
 * @see https://martinfowler.com/bliki/DDD_Aggregate.html
 */
export abstract class AggregateRoot<ID> extends Entity<ID> {
  /**
   * Domain Events generados por operaciones del aggregate
   * Se acumulan y se limpian después de publicar
   */
  private _domainEvents: DomainEvent[] = [];

  /**
   * Versión para optimistic locking
   * Detecta modificaciones concurrentes
   */
  private _version: number = 0;

  constructor(id: ID) {
    super(id);
  }

  /**
   * Obtener domain events (read-only)
   * 
   * El repository usa esto para saber qué eventos publicar
   */
  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  /**
   * Versión actual (para optimistic locking)
   */
  get version(): number {
    return this._version;
  }

  /**
   * Agregar domain event
   * 
   * Llamado por métodos del aggregate cuando algo importante pasa. 
   * 
   * Ejemplo:
   * ```typescript
   * authorize(): Result<void> {
   *   this.status = PaymentStatus. Authorized;
   *   this. addDomainEvent(new PaymentAuthorizedEvent(this. id));
   *   return Result.ok();
   * }
   * ```
   * 
   * Los events se publican DESPUÉS de guardar exitosamente. 
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Limpiar events después de publicar
   * 
   * Flujo típico en repository:
   * 1. save(aggregate) → persiste en BD
   * 2. publishEvents(aggregate. domainEvents) → publica a RabbitMQ
   * 3. aggregate.clearEvents() → limpia
   */
  clearEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Incrementar versión
   * 
   * Llamado por el repository al guardar. 
   * Usado para optimistic locking (detectar concurrencia).
   */
  protected incrementVersion(): void {
    this._version++;
  }

  /**
   * Establecer versión (para reconstitución desde BD)
   */
  protected setVersion(version:  number): void {
    this._version = version;
  }
}