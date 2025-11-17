import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'text-green-600 dark:text-green-400';
    case 'RUNNING':
      return 'text-blue-600 dark:text-blue-400';
    case 'FAILED':
      return 'text-red-600 dark:text-red-400';
    case 'CANCELLED':
      return 'text-gray-600 dark:text-gray-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
    case 'HIGH':
      return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950';
    case 'MEDIUM':
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950';
    case 'LOW':
      return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950';
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950';
  }
}
