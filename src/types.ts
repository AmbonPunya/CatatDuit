export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'expense' | 'income' | 'transfer';
  date: any; // Firestore Timestamp
  wallet: string;
  source_wallet?: string;
  destination_wallet?: string;
  userId: string;
}

export interface Wallet {
  id: string;
  name: string;
  amount?: number;
  userId: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  type: 'expense' | 'income';
  userId: string;
}

export interface Budget {
  id: string;
  categoryId: string; // The category name
  amount: number;
  userId: string;
}

export type Category = string;
