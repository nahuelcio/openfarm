/**
 * Set con ventana temporal para deduplicación
 */
export class DeduplicationSet {
  private readonly hashes = new Map<string, number>();
  private readonly windowMs: number;

  constructor(windowMs = 5000) {
    this.windowMs = windowMs;
  }

  /**
   * Verifica si un hash existe y no ha expirado
   *
   * @param hash - Hash a verificar
   * @returns true si existe y es válido
   */
  has(hash: string): boolean {
    this.cleanup();
    return this.hashes.has(hash);
  }

  /**
   * Agrega un hash al set
   *
   * @param hash - Hash a agregar
   */
  add(hash: string): void {
    this.hashes.set(hash, Date.now());
    this.cleanup();
  }

  /**
   * Verifica y agrega en una operación atómica
   *
   * @param hash - Hash a verificar/agregar
   * @returns true si ya existía (es duplicado)
   */
  checkAndAdd(hash: string): boolean {
    const exists = this.has(hash);
    if (!exists) {
      this.add(hash);
    }
    return exists;
  }

  /**
   * Limpia entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [hash, timestamp] of this.hashes.entries()) {
      if (now - timestamp > this.windowMs) {
        this.hashes.delete(hash);
      }
    }
  }

  /**
   * Limpia todas las entradas
   */
  clear(): void {
    this.hashes.clear();
  }

  /**
   * Obtiene el tamaño actual del set
   */
  get size(): number {
    return this.hashes.size;
  }
}

/**
 * Genera un hash simple para un string
 *
 * @param data - String a hashear
 * @returns Hash hexadecimal
 */
export function simpleHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return Math.abs(hash).toString(16);
}
