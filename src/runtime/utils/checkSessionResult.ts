export function isNonEmptyObject(obj: unknown) {
  return typeof obj === 'object' && obj !== null && Object.keys(obj).length > 0
}
