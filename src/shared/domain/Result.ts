/**
 * Result<T> - Railway-Oriented Programming
 * 
 * Hace explícito que una operación puede FALLAR.
 * 
 * Por qué NO excepciones:
 * 1. Las excepciones rompen el flujo (goto disfrazado)
 * 2. No aparecen en el signature del método
 * 3. Difícil de testear
 * 4. No fuerzan al caller a manejar errores
 * 
 * Con Result<T>:
 * 1. El tipo declara que puede fallar
 * 2. El compilador te obliga a checkear isSuccess
 * 3. Fácil composición (railway pattern)
 * 
 * Trade-off:
 * - ✅ Ventaja:  Explícito, seguro, componible
 * - ❌ Desventaja: Más verboso que excepciones
 * - ✅ Decisión: En dominio enterprise, claridad > brevedad
 * 
 * Uso:
 * ```typescript
 * // Método que puede fallar
 * authorize(): Result<void> {
 *   if (this.status !== PaymentStatus.Pending) {
 *     return Result.fail("Cannot authorize non-pending payment");
 *   }
 *   
 *   this.status = PaymentStatus.Authorized;
 *   return Result.ok();
 * }
 * 
 * // Caller DEBE manejar fallo
 * const result = payment.authorize();
 * if (result.isFailure) {
 *   console.error(result.error);
 *   return;
 * }
 * // Aquí sabes que fue exitoso
 * ```
 * 
 * @see https://fsharpforfunandprofit. com/rop/
 */
export class Result<T> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: string
  ) {}

  /**
   * Crear resultado exitoso
   */
  static ok<U>(value?:  U): Result<U> {
    return new Result<U>(true, value);
  }

  /**
   * Crear resultado fallido
   */
  static fail<U>(error: string): Result<U> {
    return new Result<U>(false, undefined, error);
  }

  /**
   * Combinar múltiples results
   * Si alguno falla, retorna el primer fallo
   */
  static combine(results: Result<any>[]): Result<void> {
    for (const result of results) {
      if (result.isFailure) {
        return result;
      }
    }
    return Result.ok();
  }

  /**
   * ¿Fue exitoso?
   */
  get isSuccess(): boolean {
    return this._isSuccess;
  }

  /**
   * ¿Falló?
   */
  get isFailure(): boolean {
    return !this._isSuccess;
  }

  /**
   * Obtener valor (solo si fue exitoso)
   * 
   * Si intentas acceder al value de un Result fallido,
   * lanza error (fail-fast, bugs evidentes en dev).
   */
  get value(): T {
    if (! this._isSuccess) {
      throw new Error(
        `Can't get value from failed Result.  Error: ${this._error}`
      );
    }
    return this._value!;
  }

  /**
   * Obtener error (solo si falló)
   */
  get error(): string {
    if (this._isSuccess) {
      throw new Error("Can't get error from successful Result");
    }
    return this._error!;
  }

  /**
   * Map sobre el valor (solo si fue exitoso)
   * Útil para transformaciones
   */
  map<U>(fn: (value: T) => U): Result<U> {
    if (this. isFailure) {
      return Result.fail(this._error!);
    }
    return Result.ok(fn(this._value!));
  }

  /**
   * FlatMap (bind) para encadenar operaciones que retornan Result
   */
  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this. isFailure) {
      return Result.fail(this._error! );
    }
    return fn(this._value! );
  }
}