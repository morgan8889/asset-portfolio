import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Decimal } from 'decimal.js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export currency formatting from centralized module
export {
  formatCurrency,
  formatPercentage,
  formatCompactCurrency,
} from '@/lib/utils/currency';

// Number formatting with abbreviations
export function formatNumber(
  value: number | string | Decimal,
  decimals: number = 2
): string {
  const num = value instanceof Decimal ? value.toNumber() : Number(value);

  if (Math.abs(num) >= 1e9) {
    return (num / 1e9).toFixed(decimals) + 'B';
  }
  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(decimals) + 'M';
  }
  if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(decimals) + 'K';
  }
  return num.toFixed(decimals);
}

// Date formatting
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

// Relative time formatting
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDate(dateObj);
}

// Generate random ID
export function generateId(): string {
  return crypto.randomUUID();
}
