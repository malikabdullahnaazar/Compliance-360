import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind classes safely
 * @param {...string} inputs - Class names
 * @returns {string} - Merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency
 * @param {number} value 
 * @returns {string}
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

/**
 * Format date
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

/** Pull a display string from DRF error values (strings, lists, ErrorDetail-like objects). */
function pickFirstMessage(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = pickFirstMessage(item);
      if (msg) {
        return msg;
      }
    }
    return null;
  }
  if (typeof value === 'object') {
    if (typeof value.string === 'string') {
      return value.string;
    }
    if (typeof value.message === 'string') {
      return value.message;
    }
  }
  return null;
}

/**
 * First human-readable message from a Django REST framework error body.
 * @param {object|null|undefined} data
 * @param {string} fallback
 * @returns {string}
 */
export function formatApiError(data, fallback = 'Something went wrong') {
  if (data == null) {
    return fallback;
  }
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return formatApiError(JSON.parse(trimmed), fallback);
      } catch {
        return trimmed || fallback;
      }
    }
    return trimmed || fallback;
  }
  if (typeof data !== 'object') {
    return fallback;
  }
  if (typeof data.detail === 'string') {
    return data.detail;
  }
  const detailMsg = pickFirstMessage(data.detail);
  if (detailMsg) {
    return detailMsg;
  }
  const fieldKeys = ['email', 'username', 'agency', 'role', 'password', 'non_field_errors'];
  for (const key of fieldKeys) {
    if (data[key] == null) {
      continue;
    }
    const msg = pickFirstMessage(data[key]);
    if (msg) {
      return msg;
    }
  }
  const keys = Object.keys(data);
  for (const key of keys) {
    const msg = pickFirstMessage(data[key]);
    if (msg) {
      return msg;
    }
  }
  return fallback;
}
