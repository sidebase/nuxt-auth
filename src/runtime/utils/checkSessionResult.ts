export const isNonEmptyObject = (obj: any) => typeof obj === 'object' && obj !== null && Object.keys(obj).length > 0
