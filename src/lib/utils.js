import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

/**
 * Safe cross-browser date formatter.
 * Replaces .toLocaleDateString() calls that crash on Safari with ISO strings.
 * @param {string|Date|null} value - Date value to format
 * @param {string} fallback - Fallback string if date is invalid
 * @returns {string} Formatted date "MM/DD/YYYY"
 */
export function formatDate(value, fallback = 'N/A') {
  if (!value) return fallback;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return fallback;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  } catch {
    return fallback;
  }
}

/**
 * Safe cross-browser date+time formatter.
 * @param {string|Date|null} value
 * @param {string} fallback
 * @returns {string} "MM/DD/YYYY HH:MM"
 */
export function formatDateTime(value, fallback = 'N/A') {
  if (!value) return fallback;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return fallback;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
  } catch {
    return fallback;
  }
}
