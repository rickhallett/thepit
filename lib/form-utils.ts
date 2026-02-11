/**
 * Extract a trimmed string value from FormData.
 * Returns '' if the key is missing, not a string, or empty after trimming.
 */
export function getFormString(fd: FormData | undefined | null, key: string): string {
  if (!fd) return '';
  const val = fd.get(key);
  return typeof val === 'string' ? val.trim() : '';
}
