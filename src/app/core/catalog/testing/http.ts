/**
 * A minimal `Response` stand-in for the loader and store specs.
 *
 * jsdom has no real transport, and the loader only uses `ok`, `status`, `statusText` and
 * `json()`, so a four-property object is enough. Cast once here instead of in every spec.
 */

/** Options that decide whether the stand-in looks like a success or a failure. */
export interface JsonResponseOptions {
  readonly ok?: boolean;
  readonly status?: number;
  readonly statusText?: string;
}

/** Builds a `Response`-shaped object whose `json()` resolves to `body`. */
export function jsonResponse(body: unknown, options: JsonResponseOptions = {}): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    statusText: options.statusText ?? 'OK',
    json: async () => body,
  } as unknown as Response;
}

/** Builds a `Response`-shaped object whose `json()` rejects, as a truncated body would. */
export function brokenJsonResponse(): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input');
    },
  } as unknown as Response;
}
