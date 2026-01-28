export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : (result as unknown as Result<U, E>);

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> =>
  result.ok ? fn(result.value) : (result as unknown as Result<U, E>);

export const match = <T, E, R>(
  result: Result<T, E>,
  onSuccess: (value: T) => R,
  onError: (error: E) => R
): R => {
  if (result.ok) {
    return onSuccess(result.value);
  }
  return onError((result as { ok: false; error: E }).error);
};

export const pipe = <T, U, E>(
  ...fns: Array<(x: T) => Result<U, E> | Promise<Result<U, E>>>
) => {
  return async (value: T): Promise<Result<U, E>> => {
    let current: Result<T | U, E> = ok(value);
    for (const fn of fns) {
      if (!current.ok) {
        return current as Result<U, E>;
      }
      current = await fn(current.value as T);
    }
    return current as Result<U, E>;
  };
};

export const tap = <T, E>(fn: (value: T) => void | Promise<void>) => {
  return async (result: Result<T, E>): Promise<Result<T, E>> => {
    if (result.ok) {
      await fn(result.value);
    }
    return result;
  };
};

export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  return result.ok
    ? (result as unknown as Result<T, F>)
    : err(fn((result as { ok: false; error: E }).error));
};

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) {
    return result.value;
  }
  throw (result as { ok: false; error: E }).error;
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return result.ok ? result.value : defaultValue;
};
