/**
 * Equivalent to JSON.parse but returns fallback instead of throwing errors
 */
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters
export function safeJSONParse<R, F>(json: string, fallback: F): R | F {
  try {
    return JSON.parse(json) as R;
  } catch {
    return fallback;
  }
}
