/**
 * `noUncheckedIndexedAccess` hace que TS trate `rows[0]` (y la desestructuración
 * `const [x] = rows`) como posiblemente `undefined`, incluso justo después de un
 * INSERT ... RETURNING que sabemos no puede venir vacío. Este helper documenta
 * esa garantía en un solo lugar en vez de silenciarla con `!` desperdigados.
 */
export function firstOrThrow<T>(rows: T[], message = "Operación de base de datos inesperada."): T {
  const row = rows[0];
  if (row === undefined) throw new Error(message);
  return row;
}
