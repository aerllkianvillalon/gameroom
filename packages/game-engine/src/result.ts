/** Explicit success/failure value. Engines never throw for player mistakes. */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (code: string, message: string): Result<never> => ({ ok: false, code, message });
