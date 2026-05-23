import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_COLORS: Record<string, string> = {
  // Expenses
  'Makanan': '#f59e0b',
  'Transportasi': '#3b82f6',
  'Kebutuhan Pokok': '#10b981',
  'Cicilan': '#e11d48',
  'Hiburan': '#4f46e5',
  'Kesehatan': '#ef4444',
  'Pendidikan': '#8b5cf6',
  'Lainnya': '#64748b',
  // Income
  'Gaji': '#10b981',
  'Bonus': '#f59e0b',
  'Investasi': '#3b82f6',
  // Special
  'Tersisa': '#f1f5f9',
};

export const DEFAULT_EXPENSE_CATEGORIES = ['Makanan', 'Transportasi', 'Kebutuhan Pokok', 'Cicilan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'];
export const DEFAULT_INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Investasi', 'Lainnya'];
export const DEFAULT_WALLETS = ['Tunai', 'Transfer Bank', 'GOPAY', 'OVO', 'DANA', 'ShopeePay'];
