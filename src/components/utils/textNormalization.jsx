/**
 * Centralized text normalization utility
 * Removes extra whitespace, newlines, tabs
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};