export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'expense' | 'income';
  date: any; // Firestore Timestamp
  wallet: string;
  userId: string;
}

export interface Wallet {
  id: string;
  name: string;
  userId: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  type: 'expense' | 'income';
  userId: string;
}

export type Category = string;
