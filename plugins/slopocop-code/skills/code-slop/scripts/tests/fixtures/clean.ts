export function sum(values: unknown): number {
  // Type guard at the trust boundary: validate untrusted input before use.
  if (!Array.isArray(values)) {
    throw new TypeError("expected an array of numbers");
  }
  return values.reduce((acc, n) => acc + n, 0);
}
