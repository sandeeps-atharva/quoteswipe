/**
 * Common helper functions used across the application
 */

/**
 * Check if a quote is public - handles both boolean and number formats
 * (boolean from new quotes, number from MySQL migration)
 */
export function isQuotePublic(isPublic: boolean | number | undefined | null): boolean {
  return isPublic === true || isPublic === 1;
}

/**
 * Normalize is_public value to boolean
 */
export function normalizeIsPublic(value: boolean | number | undefined | null): boolean {
  return value === true || value === 1;
}

