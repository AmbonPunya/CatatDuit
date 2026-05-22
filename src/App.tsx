import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  setAccessToken,
  getAccessToken
} from './firebase';
import { onAuthStateChanged, User, GoogleAuthProvider } from 'firebase/auth';
import { Transaction, CustomCategory, Wallet as WalletType, Budget } from './types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Provide user feedback
  alert(`Pesan Sistem: Gagal melakukan operasi ${operationType} pada ${path || 'data'}.\n\nDetail: ${errorMessage}`);
}

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import { 
  Plus, 
  History, 
  PieChart as ChartIcon, 
  LogOut, 
  LogIn, 
  Send,
  Loader2,
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingDown,
  Pencil,
  Trash2,
  Download,
  Settings,
  X,
  Check,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Calendar,
  TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  setDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORY_COLORS: Record<string, string> = {
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

const DEFAULT_EXPENSE_CATEGORIES = ['Makanan', 'Transportasi', 'Kebutuhan Pokok', 'Cicilan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'];
const DEFAULT_INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Investasi', 'Lainnya'];
const DEFAULT_WALLETS = ['Tunai', 'Transfer Bank', 'GOPAY', 'OVO', 'DANA', 'ShopeePay'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [editingBudgetCategory, setEditingBudgetCategory] = useState('');
  const [editingBudgetAmount, setEditingBudgetAmount] = useState<number>(0);
  
  const [inputText, setInputText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'transaction' | 'category' | 'wallet' | 'budget', message: string } | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showCategoryBudgets, setShowCategoryBudgets] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'categories'>('categories');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editingWalletValue, setEditingWalletValue] = useState('');
  const [editingWalletAmount, setEditingWalletAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Effect to close transaction action dropdowns on clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.dropdown-trigger') || target.closest('.dropdown-menu')) {
        return;
      }
      setActiveDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    // Fallback: If auth state is not detected in 8 seconds, stop loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth state detection timed out.');
        setLoading(false);
        alert('Proses memuat data memakan waktu lebih lama dari biasanya. Jika aplikasi tidak merespons, silakan segarkan halaman.');
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      clearTimeout(timeout);
    }, (error) => {
      console.error('Auth state error:', error);
      alert('Gagal mendeteksi status login. Silakan segarkan halaman.');
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Separate effect to sync user profile to firestore
  useEffect(() => {
    if (!user) return;

    const syncProfile = async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: Timestamp.now()
        }, { merge: true });
      } catch (error) {
        console.error('Error syncing user profile:', error);
        // Don't alert here as it's a background task
      }
    };

    syncProfile();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setCustomCategories([]);
      return;
    }

    // Transactions query
    const tq = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const ut = onSnapshot(tq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    // Custom categories query
    const cq = query(
      collection(db, 'customCategories'),
      where('userId', '==', user.uid)
    );

    const uc = onSnapshot(cq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomCategory[];
      setCustomCategories(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customCategories');
    });

    // Wallets query
    const wq = query(
      collection(db, 'wallets'),
      where('userId', '==', user.uid)
    );

    const uw = onSnapshot(wq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WalletType[];
      setWallets(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'wallets');
    });

    // Budgets query
    const bq = query(
      collection(db, 'budgets'),
      where('userId', '==', user.uid)
    );

    const ub = onSnapshot(bq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Budget[];
      setBudgets(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'budgets');
    });

    return () => { ut(); uc(); uw(); ub(); };
  }, [user]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) return;
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const result = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      if (result.user) {
        setUser(result.user as User);
      }
      return true;
    } catch (error: any) {
      console.error("Email Login error:", error);
      if (error.code === 'auth/invalid-credential') {
        alert("Gagal masuk: Email atau password salah.");
      } else {
        alert("Gagal masuk: " + (error.message || 'Terjadi kesalahan.'));
      }
      return false;
    }
  };

  const handleTestingLogin = async (role: 'Admin' | 'Tester') => {
    try {
      const { signInAnonymously, updateProfile } = await import('firebase/auth');
      const result = await signInAnonymously(auth);
      if (result.user) {
        await updateProfile(result.user, {
           displayName: `${role} User`
        });
        setUser({ ...result.user, displayName: `${role} User` } as User);
      }
      return true;
    } catch (error: any) {
      console.error(`${role} Login error:`, error);
      if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
        alert(`Gagal masuk sebagai ${role}.\n\nSolusi: Anda harus mengaktifkan "Anonymous" sign-in provider di Firebase Console (Authentication > Sign-in method) agar login tester ini berfungsi.`);
      } else {
        alert(`Gagal masuk sebagai ${role}: ` + (error.message || 'Terjadi kesalahan.'));
      }
      return false;
    }
  };

  const handleLogin = async () => {
    try {
      const { browserPopupRedirectResolver } = await import('firebase/auth');
      const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
      return true;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.warn('Login process was cancelled or interrupted.');
      } else {
        console.error('Login error:', error);
        alert('Gagal masuk: ' + (error.message || 'Terjadi kesalahan sistem.'));
      }
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      setAccessToken(null);
      await signOut(auth);
    } catch (error: any) {
      console.error('Logout error:', error);
      alert('Gagal keluar: ' + (error.message || 'Terjadi kesalahan.'));
    }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    setIsExtracting(true);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();

      if (data.type === 'transfer' && data.source_wallet && data.destination_wallet) {
        const path = 'transactions';
        await addDoc(collection(db, path), {
          amount: data.amount,
          description: data.description,
          category: 'Transfer',
          type: 'transfer',
          wallet: 'Transfer', // placeholder for the mandatory field
          source_wallet: data.source_wallet,
          destination_wallet: data.destination_wallet,
          date: Timestamp.now(),
          userId: user.uid,
        });
        
        setInputText('');
        setIsExtracting(false);
        return;
      } else if (data.amount && data.description && data.category && data.type) {
        // We trigger the addDoc but don't strictly await it for the UI to feel responsive
        // Firestore handles the sync in the background
        const path = 'transactions';
        addDoc(collection(db, path), {
          amount: data.amount,
          description: data.description,
          category: data.category,
          type: data.type === 'transfer' ? 'expense' : data.type, // fallback
          wallet: data.wallet || data.source_wallet || 'Tunai',
          date: Timestamp.now(),
          userId: user.uid,
        }).catch(err => {
          handleFirestoreError(err, OperationType.CREATE, path);
        });
        
        // Clear UI state immediately for better UX
        setInputText('');
        setIsExtracting(false);
        return; // Prevent fallthrough to finally if we handled it here
      } else {
        alert('Maaf, AI tidak dapat mengenali data tersebut. Coba kalimat lain (misal: "gajian 5 juta" atau "beli bensin 20rb").');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      alert('Terjadi kesalahan saat memproses data.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setDeleteConfirm({ id, type: 'transaction', message: 'Hapus transaksi ini?' });
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const path = `transactions/${editingTransaction.id}`;
    try {
      const { id, ...data } = editingTransaction;
      await setDoc(doc(db, 'transactions', id), data);
      setEditingTransaction(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleAddCategory = async (name: string, type: 'expense' | 'income') => {
    if (!user) return;
    const path = 'customCategories';
    try {
      await addDoc(collection(db, path), {
        name,
        type,
        userId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingWalletValue.trim()) return;
    const path = 'wallets';
    try {
      await addDoc(collection(db, path), {
        name: editingWalletValue.trim(),
        amount: editingWalletAmount || 0,
        userId: user.uid
      });
      setEditingWalletValue('');
      setEditingWalletAmount(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDeleteCategory = (id: string) => {
    setDeleteConfirm({ id, type: 'category', message: 'Hapus kategori ini?' });
  };

  const handleUpdateCategory = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    const path = `customCategories/${id}`;
    try {
      await updateDoc(doc(db, 'customCategories', id), { name: newName.trim() });
      setEditingCategoryId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteWallet = (id: string) => {
    setDeleteConfirm({ id, type: 'wallet', message: 'Hapus dompet ini?' });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    
    let path = '';
    try {
      if (type === 'transaction') {
        path = `transactions/${id}`;
        await deleteDoc(doc(db, 'transactions', id));
      } else if (type === 'category') {
        path = `customCategories/${id}`;
        await deleteDoc(doc(db, 'customCategories', id));
      } else if (type === 'wallet') {
        path = `wallets/${id}`;
        await deleteDoc(doc(db, 'wallets', id));
      } else if (type === 'budget') {
        path = `budgets/${id}`;
        await deleteDoc(doc(db, 'budgets', id));
      }
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleUpdateWallet = async (id: string, newName: string, amount: number) => {
    if (!newName.trim() || !user) return;
    try {
      if (id.startsWith('default-')) {
        // Create new wallet with this name and amount since it's a default one being edited
        await addDoc(collection(db, 'wallets'), {
          name: newName.trim(),
          amount: amount || 0,
          userId: user.uid
        });
      } else {
        const path = `wallets/${id}`;
        await updateDoc(doc(db, 'wallets', id), { 
          name: newName.trim(),
          amount: amount || 0
        });
      }
      setEditingWalletId(null);
      setEditingWalletValue('');
      setEditingWalletAmount(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'wallets');
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingBudgetCategory || editingBudgetAmount <= 0) return;
    try {
      const path = 'budgets';
      await addDoc(collection(db, path), {
        userId: user.uid,
        categoryId: editingBudgetCategory,
        amount: editingBudgetAmount,
      });
      setEditingBudgetCategory('');
      setEditingBudgetAmount(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'budgets');
    }
  };

  const handleUpdateBudget = async (id: string, newAmount: number) => {
    if (newAmount <= 0) return;
    try {
      await setDoc(doc(db, 'budgets', id), { amount: newAmount }, { merge: true });
      setEditingBudgetId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `budgets/${id}`);
    }
  };

  const deleteBudget = (id: string) => {
    setDeleteConfirm({ id, type: 'budget', message: 'Hapus budget ini?' });
  };

  const exportToExcel = () => {
    const data = transactions.map(t => ({
      Tanggal: t.date?.toDate ? t.date.toDate().toLocaleString() : '',
      Deskripsi: t.description,
      Kategori: t.category,
      Dompet: t.type === 'transfer' ? `${t.source_wallet} -> ${t.destination_wallet}` : (t.wallet || 'Tunai'),
      Tipe: t.type === 'transfer' ? 'Transfer' : t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      Nominal: t.amount,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
    XLSX.writeFile(wb, "Data_CatatDuit.xlsx");
  };

  const exportToGoogleSheets = async () => {
    if (!user) return;
    
    let token = getAccessToken();
    if (!token) {
      const result = await handleLogin();
      token = getAccessToken();
      if (!token) return;
    }

    setIsExporting(true);
    try {
      // 1. Create Spreadsheet
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `CatatDuit Laporan - ${new Date().toLocaleDateString()}`
          }
        })
      });

      if (!createRes.ok) throw new Error('Gagal membuat spreadsheet');
      const spreadsheet = await createRes.json();
      const spreadsheetId = spreadsheet.spreadsheetId;

      // 2. Prepare Data
      const rows = [
        ['Tanggal', 'Deskripsi', 'Kategori', 'Dompet', 'Tipe', 'Nominal'],
        ...transactions.map(t => [
          t.date?.toDate ? t.date.toDate().toLocaleString() : '',
          t.description,
          t.category,
          t.type === 'transfer' ? `${t.source_wallet} -> ${t.destination_wallet}` : (t.wallet || 'Tunai'),
          t.type === 'transfer' ? 'Transfer' : t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
          t.amount
        ])
      ];

      // 3. Update Values
      const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:F${rows.length}?valueInputOption=RAW`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rows
        })
      });

      if (!updateRes.ok) throw new Error('Gagal mengisi data spreadsheet');

      window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
      alert('Berhasil mengekspor ke Google Sheets! File baru telah dibuka di tab baru.');
    } catch (error) {
      console.error('Google Sheets export error:', error);
      alert('Terjadi kesalahan saat mengekspor ke Google Sheets.');
    } finally {
      setIsExporting(false);
    }
  };

  // Summary Logic
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const combinedWallets = [
    ...DEFAULT_WALLETS.filter(dw => !wallets.some(w => w.name === dw)).map(name => ({ id: `default-${name}`, name, amount: 0, isDefault: true })),
    ...wallets.map(w => ({ ...w, isDefault: false }))
  ];

  const sumInitialBalances = combinedWallets.reduce((sum, w) => sum + (w.amount || 0), 0);
  const balance = sumInitialBalances + totalIncome - totalExpense;

  const filteredTransactions = transactions.filter(t => {
    // Tab Filter
    const matchesTab = activeTab === 'all' || t.type === activeTab;
    if (!matchesTab) return false;

    // Search Filter
    const matchesSearch = !searchQuery || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.wallet || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Date Filter
    if (startDate || endDate) {
      const tDate = t.date?.toDate ? t.date.toDate() : null;
      if (!tDate) return false;
      
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        if (tDate < sDate) return false;
      }

      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        if (tDate > eDate) return false;
      }
    }

    return true;
  });

  // Chart Data (Filtered by type if needed, or by all expenses for pie chart)
  const getPeriodDate = (period: 'week' | 'month' | 'year') => {
    const now = new Date();
    const start = new Date();
    if (period === 'week') start.setDate(now.getDate() - now.getDay());
    else if (period === 'month') start.setDate(1);
    else if (period === 'year') start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const periodFilteredTransactions = transactions.filter(t => {
    if (!t.date?.toDate) return false;
    const date = t.date.toDate();
    return date >= getPeriodDate(chartPeriod);
  });

  const comparisonData = [
    {
      name: 'Pemasukan',
      amount: periodFilteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      fill: '#10b981'
    },
    {
      name: 'Pengeluaran',
      amount: periodFilteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
      fill: '#f43f5e'
    }
  ];

  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const categoryTotals = expenseTransactions.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  
  if (totalIncome > totalExpense) {
    chartData.push({ name: 'Tersisa', value: totalIncome - totalExpense });
  }

  const expenseRatio = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : (totalExpense > 0 ? 100 : 0);

  const expenseCategories = ['Transfer', ...DEFAULT_EXPENSE_CATEGORIES, ...customCategories.filter(c => c.type === 'expense').map(c => c.name)];
  const incomeCategories = ['Transfer', ...DEFAULT_INCOME_CATEGORIES, ...customCategories.filter(c => c.type === 'income').map(c => c.name)];
  const walletOptions = [...DEFAULT_WALLETS, ...wallets.map(w => w.name)];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 flex flex-col items-center gap-6 border-8 border-white"
        >
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Menyiapkan Aplikasi</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Menghubungkan ke database Anda...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border-8 border-white">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-xl shadow-indigo-100">
              <WalletIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Catat<span className="text-indigo-600">Duit</span></h1>
            <p className="text-slate-400 font-medium mb-10 leading-relaxed uppercase text-[10px] tracking-widest">Pencatat pengeluaran bertenaga AI</p>
            <p className="text-slate-500 mb-10 text-sm font-medium leading-relaxed">
              Semua data Anda tersimpan aman secara cloud. Silakan masuk untuk melihat data transaksi Anda.
            </p>
            <div className="space-y-4">
              {!showAdminLogin ? (
                <>
                  <button 
                    onClick={handleLogin}
                    className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-xl shadow-slate-200 active:scale-95"
                  >
                    <LogIn className="w-5 h-5 text-indigo-400" />
                    Masuk dengan Google
                  </button>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setShowAdminLogin(true)}
                      className="w-full bg-emerald-50 text-emerald-700 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all shadow-sm active:scale-95 text-sm"
                    >
                      <LogIn className="w-4 h-4" />
                      Admin
                    </button>
                    <button 
                      onClick={() => handleTestingLogin('Tester')}
                      className="w-full bg-amber-50 text-amber-700 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-amber-100 transition-all shadow-sm active:scale-95 text-sm"
                    >
                      <LogIn className="w-4 h-4" />
                      Tester
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Admin</label>
                    <input 
                      type="email" 
                      required
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700 placeholder:text-slate-400 text-sm" 
                      placeholder="admin@email.com"
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Katasandi</label>
                    <input 
                      type="password" 
                      required
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700 placeholder:text-slate-400 text-sm" 
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowAdminLogin(false)}
                      className="w-1/3 bg-slate-100 text-slate-500 font-bold py-3 px-4 rounded-xl hover:bg-slate-200 transition-all text-sm"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="w-2/3 bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-95 text-sm"
                    >
                      Masuk
                    </button>
                  </div>
                </form>
              )}
            </div>
            <p className="mt-8 text-[9px] text-slate-300 font-black uppercase tracking-[0.2em]">Data Automatis Disinkronkan</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white md:bg-slate-50 text-slate-900 transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex flex-col font-sans overflow-hidden min-h-[calc(100vh-64px)] md:min-h-0 transition-all duration-500 bg-white md:bg-slate-50 md:border-white md:shadow-2xl md:border-8 rounded-[3rem]">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-10 py-6 border-b sticky top-0 z-10 transition-all backdrop-blur-sm border-slate-200 bg-white/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <WalletIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">
              Catat<span className="text-indigo-600">Duit</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 md:gap-8">
            <div className="hidden md:flex flex-col items-end">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Cloud Sync Aktif</p>
              </div>
              <p className="text-xs font-bold text-slate-800 tracking-tight">{user.displayName || user.email}</p>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all focus:outline-none"
              title="Pengaturan"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all focus:outline-none"
              title="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col p-6 md:p-10 gap-8 bg-white transition-colors">
          {/* Quick Stats */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white h-[60px] px-6 rounded-[10px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-100 transition-all">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Pemasukan</p>
                <p className="text-sm font-black text-slate-800 tracking-tight leading-tight">Rp {totalIncome.toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="bg-white h-[60px] px-6 rounded-[10px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-100 transition-all">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Pengeluaran</p>
                <p className="text-sm font-black text-slate-800 tracking-tight leading-tight">Rp {totalExpense.toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="bg-white h-[60px] px-6 rounded-[10px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-100 transition-all">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                <WalletIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Total Saldo</p>
                <p className={cn("text-sm font-black tracking-tight leading-tight", balance >= 0 ? "text-slate-800" : "text-rose-600")}>
                  Rp {balance.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </section>

          {/* Anggaran & Dompet Cards */}
          <section className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => setShowBudgetModal(true)}
              className="bg-white border border-slate-200 shadow-sm rounded-[2rem] overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all text-left p-5 md:p-6 flex flex-col justify-between h-[150px] group"
            >
              <div className="flex justify-between items-start w-full">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1 group-hover:text-indigo-600 transition-colors">Anggaran</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Pantau & Atur Pengeluaran</p>
                </div>
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              
              {(() => {
                const now = new Date();
                const globalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
                const globalSpent = transactions
                  .filter(t => t.type === 'expense' && t.date?.toDate)
                  .filter(t => {
                    const tDate = t.date.toDate();
                    return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
                  })
                  .filter(t => budgets.some(b => b.categoryId === t.category))
                  .reduce((sum, t) => sum + t.amount, 0);
                const p = globalBudget > 0 ? (globalSpent / globalBudget) * 100 : 0;
                return (
                  <div className="flex flex-col gap-2 w-full mt-auto">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
                      <div className={cn("h-full rounded-full transition-all duration-500", p >= 90 ? "bg-rose-500" : p >= 75 ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${Math.min(p, 100)}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-xs w-full">
                      <span className="text-slate-500 font-bold whitespace-nowrap">Rp {globalSpent.toLocaleString('id-ID')}</span>
                      <span className="text-slate-400 font-bold whitespace-nowrap text-right">/ Rp {globalBudget.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                );
              })()}
            </button>

            <button 
              onClick={() => setShowWalletModal(true)}
              className="bg-white border border-slate-200 shadow-sm rounded-[2rem] overflow-hidden hover:border-emerald-200 hover:shadow-md transition-all text-left p-5 md:p-6 flex flex-col justify-between h-[150px] group"
            >
              <div className="flex justify-between items-start w-full">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1 group-hover:text-emerald-600 transition-colors">Dompet</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Kelola Sumber Dana</p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                  <WalletIcon className="w-5 h-5" />
                </div>
              </div>
              
              <div className="flex flex-col w-full mt-auto">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{combinedWallets.length} Dompet Aktif</p>
              </div>
            </button>
          </section>

          {/* Natural Language Input */}
          <section className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Tambah Transaksi (AI)</h2>
              <div className="flex gap-2">
                <button 
                   onClick={exportToExcel}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold hover:bg-slate-200 transition-all border border-slate-200"
                >
                  <Download className="w-3.5 h-3.5" /> Excel
                </button>
                <button 
                  onClick={exportToGoogleSheets}
                  disabled={isExporting}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-bold transition-all border shadow-lg shadow-indigo-100",
                    isExporting 
                      ? "bg-indigo-50 text-indigo-300 border-indigo-100 cursor-not-allowed"
                      : "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700"
                  )}
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 
                  {isExporting ? 'Memproses GSheets...' : 'GSheets'}
                </button>
              </div>
            </div>
            <form onSubmit={handleExtract} className="relative group">
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Misal: 'gajian 5jt', 'bayar listrik 200rb', atau 'ambil cash ATM 1,5jt'..."
                disabled={isExtracting}
                className="w-full h-[65px] pl-6 pr-20 md:pr-48 text-lg bg-white rounded-2xl border-2 border-slate-100 shadow-xl shadow-slate-200/50 focus:border-indigo-400 focus:outline-none transition-all placeholder:text-slate-300 font-medium text-slate-800"
              />
              <button 
                type="submit"
                disabled={isExtracting || !inputText.trim()}
                className={cn(
                  "absolute right-3 top-3 bottom-3 md:px-8 px-4 font-bold rounded-xl shadow-lg transition-all flex items-center gap-2",
                  isExtracting || !inputText.trim() 
                    ? "bg-slate-100 text-slate-300 shadow-none pointer-events-none" 
                    : "bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95"
                )}
              >
                <span className="hidden md:inline">{isExtracting ? 'Memproses...' : 'Simpan'}</span>
                {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </form>
          </section>

          <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* History Table */}
            <div className="lg:col-span-8 flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Riwayat Transaksi</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Semua catatan keuanganmu</p>
                  </div>
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
                    {(['all', 'expense', 'income'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                          activeTab === tab 
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {tab === 'all' ? 'Semua' : tab === 'expense' ? 'Keluar' : 'Masuk'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Compact Filters Integrated */}
                <div className="flex flex-col md:flex-row gap-3 items-center">
                  <div className="flex-1 relative w-full">
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari deskripsi, kategori, dompet..."
                      className="w-full h-[30px] pl-9 pr-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-auto">
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-[120px] h-[30px] pl-[32px] bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-[9px] font-bold uppercase tracking-tight text-slate-800 shadow-sm -ml-[5px]"
                      />
                      <Calendar className="w-3 h-3 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2 -ml-[5px]" />
                    </div>
                    <span className="text-slate-300 font-bold -ml-[2px]">-</span>
                    <div className="relative flex-1 md:w-auto">
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-[120px] h-[30px] pl-[32px] bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-[9px] font-bold uppercase tracking-tight text-slate-800 shadow-sm"
                      />
                      <Calendar className="w-3 h-3 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    {(searchQuery || startDate || endDate) && (
                      <button 
                        onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
                        className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all border border-rose-100 shadow-sm"
                        title="Reset Filter"
                      >
                        <Filter className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto max-h-[600px]">
                <div className="flex flex-col w-full">
  {filteredTransactions.length === 0 ? (
    <div className="py-20 text-center flex flex-col items-center gap-3 opacity-20">
      <WalletIcon className="w-12 h-12" />
      <p className="text-sm font-bold uppercase tracking-widest italic">Belum ada transaksi</p>
    </div>
  ) : (
    <div className="divide-y divide-slate-100">
      <AnimatePresence mode="popLayout">
        {filteredTransactions.map((t) => (
          <motion.div 
            key={t.id} 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-start sm:items-center py-4 px-4 lg:px-8 group relative gap-2 sm:gap-3 md:gap-4 border-b border-slate-50 last:border-0"
          >
            {/* Kolom 1: Tanggal */}
            <div className="flex flex-col flex-shrink-0 min-w-[45px] sm:min-w-[50px] md:min-w-[60px] pt-1 sm:pt-0">
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                {t.date?.toDate ? t.date.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }).replace(/\//g, '-') : '--'}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
                {t.date?.toDate ? t.date.toDate().getFullYear() : '----'}
              </span>
            </div>

            {/* Kolom 2: Keterangan & Kategori */}
            <div className="flex flex-col flex-1 min-w-0 pt-0.5 sm:pt-0 pl-1 sm:pl-0 pr-1">
              <span className="text-sm md:text-base font-bold text-slate-800 break-words line-clamp-2 leading-tight sm:leading-normal">
                {t.description}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium mt-1 sm:mt-0.5">
                {t.category}
              </span>
            </div>

            {/* Kolom 3: Nominal & Dompet */}
            <div className="flex flex-col items-end flex-shrink-0 pt-0.5 sm:pt-0">
              <span className={`text-sm md:text-base font-black whitespace-nowrap ${t.type === 'transfer' ? 'text-blue-600' : t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {t.type === 'transfer' ? '' : t.type === 'income' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
              </span>
              <span className="text-[9px] sm:text-[10px] md:text-xs text-slate-400 font-bold mt-1 sm:mt-0.5 uppercase tracking-wider">
                {t.type === 'transfer' ? `${t.source_wallet || '?'} → ${t.destination_wallet || '?'}` : (t.wallet || 'Tunai')}
              </span>
            </div>

            {/* Kolom 4: Titik Tiga (Aksi) */}
            <div className="relative flex-shrink-0 pt-0.5 sm:pt-0">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDropdownId(activeDropdownId === t.id ? null : t.id);
                }}
                className="dropdown-trigger p-1 sm:p-1.5 md:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                title="Aksi"
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              {/* Dropdown Menu Edit & Hapus */}
              {activeDropdownId === t.id && (
                <div className="dropdown-menu absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setEditingTransaction(t);
                      setActiveDropdownId(null);
                    }}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <div className="h-[1px] w-full bg-slate-50"></div>
                  <button
                    onClick={() => {
                      handleDeleteTransaction(t.id);
                      setActiveDropdownId(null);
                    }}
                    className="w-full text-left px-4 py-3 text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )}
</div>
              </div>
            </div>

            {/* Summary & Charts */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Comparison Chart Card */}
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" /> Perbandingan
                  </h3>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    {(['week', 'month', 'year'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={cn(
                          "px-2 py-1 rounded text-[9px] font-bold uppercase transition-all",
                          chartPeriod === p 
                            ? "bg-white text-indigo-600 shadow-sm" 
                            : "text-slate-400"
                        )}
                      >
                        {p === 'week' ? 'Mgu' : p === 'month' ? 'Bln' : 'Thn'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff',
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                        }}
                        itemStyle={{ color: '#1e293b' }}
                        formatter={(val: number) => `Rp ${val.toLocaleString('id-ID')}`}
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart Card */}
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 flex flex-col items-center">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 text-center flex items-center gap-2">
                  <ChartIcon className="w-4 h-4 text-indigo-400" /> Alokasi Pengeluaran
                </h3>
                <div className="relative w-full aspect-square max-w-[280px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={8}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.name === 'Tersisa' 
                                ? '#f1f5f9'
                                : (CATEGORY_COLORS[entry.name] || '#CBD5E1')} 
                              className="outline-none" 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#ffffff',
                            borderRadius: '20px', 
                            border: 'none', 
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                            padding: '12px 16px' 
                          }}
                          itemStyle={{ fontWeight: '800', fontSize: '12px', color: '#1e293b' }}
                          formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full border-8 border-slate-50 border-dashed border-spacing-4 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Kosong</span>
                      </div>
                    </div>
                  )}
                  {chartData.length > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Terpakai</span>
                      <span className={cn(
                        "text-2xl font-black tracking-tight",
                        expenseRatio > 100 ? "text-rose-600" : "text-slate-800"
                      )}>
                        {expenseRatio}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 w-full p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Kesehatan Keuangan</p>
                  <p className="text-xs font-bold text-slate-700 leading-snug">
                    {totalIncome === 0 ? "Belum ada pemasukan tercatat untuk bulan ini." :
                     totalExpense > totalIncome ? "🔴 Defisit: Pengeluaran melebihi pemasukan. Segera tinjau pengeluaran Anda." :
                     totalExpense > totalIncome * 0.7 ? "🟡 Waspada: Pengeluaran sudah mencapai >70% pemasukan. Cobalah untuk berhemat." :
                     "🟢 Sehat: Rasio pengeluaran Anda terjaga dengan baik di bawah 70%."}
                  </p>
                </div>
                
                {/* Legend Grid */}
                <div className="w-full mt-8 grid grid-cols-2 gap-3">
                  {chartData.map((data) => (
                    <div key={data.name} className="flex items-center gap-2.5 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ 
                          backgroundColor: data.name === 'Tersisa' 
                            ? '#f1f5f9'
                            : (CATEGORY_COLORS[data.name] || '#64748b') 
                        }}
                      ></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-slate-700 truncate capitalize">{data.name}</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {data.name === 'Tersisa' 
                            ? `${(100 - expenseRatio).toFixed(0)}%`
                            : `${((data.value / (totalIncome > totalExpense ? totalIncome : totalExpense)) * 100).toFixed(0)}%`
                          }
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips Card */}
              <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="w-5 h-5 text-indigo-300" />
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em]">Tip Penghematan</p>
                  </div>
                  <p className="text-sm font-medium leading-relaxed opacity-95">
                    {totalExpense > totalIncome * 0.8 
                      ? "Pengeluaran harianmu hampir menyamai pemasukan. Ayo perketat anggaran!" 
                      : balance > 0 
                      ? "Saldo surplus! Pertimbangkan untuk menambah dana investasi atau tabungan darurat."
                      : "Wah, pengaturan keuanganmu sejauh ini sangat baik! Pertahankan disiplin ini."}
                  </p>
                </div>
                <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-125 transition-transform duration-700 ease-out">
                  <WalletIcon className="w-32 h-32" />
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-auto">
          <p>© 2026 CatatDuit AI Dashboard • Aktif</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-indigo-600 cursor-pointer transition-colors">Panduan</span>
            <button onClick={exportToExcel} className="hover:text-indigo-600 cursor-pointer transition-colors bg-transparent border-none p-0 uppercase font-bold tracking-widest">Ekspor</button>
            <button onClick={() => setShowSettings(true)} className="hover:text-indigo-600 cursor-pointer transition-colors bg-transparent border-none p-0 uppercase font-bold tracking-widest">Pengaturan</button>
          </div>
        </footer>

        {/* Modal-modal UI */}
        <AnimatePresence>
          {deleteConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 border hover:border-slate-100 relative overflow-hidden"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-2">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Konfirmasi Hapus</h3>
                  <p className="text-sm font-medium text-slate-500">{deleteConfirm.message}</p>
                </div>
                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={executeDelete}
                    className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-rose-200"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {editingTransaction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-24 bg-slate-900/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-10 border-8 border-white overflow-hidden relative"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Edit Transaksi</h3>
                  <button onClick={() => setEditingTransaction(null)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateTransaction} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Keterangan</label>
                    <input 
                      type="text"
                      value={editingTransaction.description}
                      onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                      <input 
                        type="number"
                        value={editingTransaction.amount}
                        onChange={(e) => setEditingTransaction({...editingTransaction, amount: parseInt(e.target.value) || 0})}
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700 placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipe</label>
                      <select 
                        value={editingTransaction.type}
                        onChange={(e) => setEditingTransaction({...editingTransaction, type: e.target.value as 'expense' | 'income' | 'transfer', category: e.target.value === 'transfer' ? 'Transfer' : (e.target.value === 'income' ? incomeCategories[0] : expenseCategories[0])})}
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-slate-700"
                      >
                        <option value="expense">Keluar</option>
                        <option value="income">Masuk</option>
                        <option value="transfer">Transfer Beda Dompet</option>
                      </select>
                    </div>
                  </div>
                  {editingTransaction.type === 'transfer' ? (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dari Dompet (Sumber)</label>
                        <select 
                          value={editingTransaction.source_wallet || ''}
                          onChange={(e) => setEditingTransaction({...editingTransaction, source_wallet: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-slate-700 text-sm"
                        >
                          <option value="">Pilih Sumber...</option>
                          {walletOptions.map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ke Dompet (Tujuan)</label>
                        <select 
                          value={editingTransaction.destination_wallet || ''}
                          onChange={(e) => setEditingTransaction({...editingTransaction, destination_wallet: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-slate-700 text-sm"
                        >
                          <option value="">Pilih Tujuan...</option>
                          {walletOptions.map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                        <select 
                          value={editingTransaction.category}
                          onChange={(e) => setEditingTransaction({...editingTransaction, category: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-slate-700 text-sm"
                        >
                          {(editingTransaction.type === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sumber Dana (Dompet)</label>
                        <select 
                          value={editingTransaction.wallet || 'Tunai'}
                          onChange={(e) => setEditingTransaction({...editingTransaction, wallet: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-slate-700 text-sm"
                        >
                          {walletOptions.map(w => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all mt-4">
                    Simpan Perubahan
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-24 bg-slate-900/50 backdrop-blur-sm overflow-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-[2rem] md:rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-4 sm:p-6 md:p-10 border-4 md:border-8 border-white relative max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Pengaturan Kategori</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4" /> Pengeluaran
                      </h4>
                      <div className="space-y-3 max-h-64 overflow-auto pr-2">
                        {DEFAULT_EXPENSE_CATEGORIES.map((cat, idx) => (
                          <div key={`def-exp-${idx}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent">
                            <span className="font-bold text-slate-700">{cat}</span>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Bawaan</span>
                          </div>
                        ))}
                        {customCategories.filter(c => c.type === 'expense').map((cat) => (
                          <div key={cat.id} className="flex items-center justify-between p-4 bg-white rounded-2xl group border border-slate-100 shadow-sm">
                            {editingCategoryId === cat.id ? (
                              <div className="flex-1 flex gap-2">
                                <input 
                                  autoFocus
                                  type="text"
                                  value={editingCategoryValue}
                                  onChange={(e) => setEditingCategoryValue(e.target.value)}
                                  className="flex-1 bg-slate-50 px-3 py-1 rounded-lg border-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateCategory(cat.id, editingCategoryValue);
                                    if (e.key === 'Escape') setEditingCategoryId(null);
                                  }}
                                />
                                <button onClick={() => handleUpdateCategory(cat.id, editingCategoryValue)} className="text-emerald-500 hover:text-emerald-600">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingCategoryId(null)} className="text-slate-400 hover:text-slate-500">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="font-bold text-slate-700">{cat.name}</span>
                                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => {
                                      setEditingCategoryId(cat.id);
                                      setEditingCategoryValue(cat.name);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const input = (e.target as any).category;
                        if (input.value.trim()) {
                          handleAddCategory(input.value.trim(), 'expense');
                          input.value = '';
                        }
                      }} className="flex gap-2">
                        <input name="category" placeholder="Kategori baru..." className="flex-1 bg-slate-50 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800" />
                        <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all">
                          <Plus className="w-4 h-4" />
                        </button>
                      </form>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <ArrowDownLeft className="w-4 h-4" /> Pemasukan
                      </h4>
                      <div className="space-y-3 max-h-64 overflow-auto pr-2">
                        {DEFAULT_INCOME_CATEGORIES.map((cat, idx) => (
                          <div key={`def-inc-${idx}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent">
                            <span className="font-bold text-slate-700">{cat}</span>
                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Bawaan</span>
                          </div>
                        ))}
                        {customCategories.filter(c => c.type === 'income').map((cat) => (
                          <div key={cat.id} className="flex items-center justify-between p-4 bg-white rounded-2xl group border border-slate-100 shadow-sm">
                            {editingCategoryId === cat.id ? (
                              <div className="flex-1 flex gap-2">
                                <input 
                                  autoFocus
                                  type="text"
                                  value={editingCategoryValue}
                                  onChange={(e) => setEditingCategoryValue(e.target.value)}
                                  className="flex-1 bg-slate-50 px-3 py-1 rounded-lg border-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateCategory(cat.id, editingCategoryValue);
                                    if (e.key === 'Escape') setEditingCategoryId(null);
                                  }}
                                />
                                <button onClick={() => handleUpdateCategory(cat.id, editingCategoryValue)} className="text-emerald-500 hover:text-emerald-600">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingCategoryId(null)} className="text-slate-400 hover:text-slate-500">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="font-bold text-slate-700">{cat.name}</span>
                                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => {
                                      setEditingCategoryId(cat.id);
                                      setEditingCategoryValue(cat.name);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const input = (e.target as any).category;
                        if (input.value.trim()) {
                          handleAddCategory(input.value.trim(), 'income');
                          input.value = '';
                        }
                      }} className="flex gap-2">
                        <input name="category" placeholder="Kategori baru..." className="flex-1 bg-slate-50 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800" />
                        <button type="submit" className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all">
                          <Plus className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
              </motion.div>
            </div>
          )}

          {showWalletModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-24 bg-slate-900/50 backdrop-blur-sm overflow-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-[2rem] md:rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-4 sm:p-6 md:p-10 border-4 md:border-8 border-white relative max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Pengaturan Dompet</h3>
                  <button onClick={() => setShowWalletModal(false)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                    <WalletIcon className="w-4 h-4" /> Daftar Dompet / Sumber Dana
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-auto pr-2">
                    {combinedWallets.map((w) => {
                          const now = new Date();
                          const incomes = transactions
                            .filter(t => t.type === 'income' && (t.wallet === w.name || (!t.wallet && w.name === 'Tunai')) && t.date?.toDate)
                            .reduce((sum, t) => sum + t.amount, 0);
                          const expenses = transactions
                            .filter(t => t.type === 'expense' && (t.wallet === w.name || (!t.wallet && w.name === 'Tunai')) && t.date?.toDate)
                            .reduce((sum, t) => sum + t.amount, 0);
                          const transfersIn = transactions
                            .filter(t => t.type === 'transfer' && t.destination_wallet === w.name && t.date?.toDate)
                            .reduce((sum, t) => sum + t.amount, 0);
                          const transfersOut = transactions
                            .filter(t => t.type === 'transfer' && t.source_wallet === w.name && t.date?.toDate)
                            .reduce((sum, t) => sum + t.amount, 0);

                          const currentBalance = (w.amount || 0) + incomes - expenses + transfersIn - transfersOut;

                          return (
                            <div key={w.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl group border border-slate-100 shadow-sm gap-2 relative">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-700 text-xs truncate max-w-[120px]">{w.name}</span>
                                {w.isDefault ? (
                                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Bawaan</span>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Custom</span>
                                )}
                              </div>
                              
                              {editingWalletId === w.id ? (
                                <form 
                                  onSubmit={(e) => { e.preventDefault(); handleUpdateWallet(w.id, editingWalletValue, editingWalletAmount); }}
                                  className="flex flex-col gap-2 mt-1"
                                >
                                  <div className="flex gap-2">
                                    <input 
                                      autoFocus
                                      type="text"
                                      value={editingWalletValue}
                                      onChange={(e) => setEditingWalletValue(e.target.value)}
                                      placeholder="Nama Dompet"
                                      className="flex-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 text-[11px] font-bold text-slate-800 shadow-sm"
                                    />
                                    <div className="flex gap-1 items-center">
                                      <span className="text-[11px] font-bold text-slate-400">Rp</span>
                                      <input 
                                        type="number"
                                        value={editingWalletAmount || ''}
                                        onChange={(e) => setEditingWalletAmount(Number(e.target.value))}
                                        placeholder="Saldo Awal"
                                        className="w-24 bg-white px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 text-[11px] font-bold text-slate-800 shadow-sm"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button type="submit" className="text-emerald-500 hover:text-emerald-600 p-1">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setEditingWalletId(null)} className="text-slate-400 hover:text-slate-500 p-1">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="flex flex-col gap-2">
                                   <div className="flex justify-between items-end border-b border-slate-200/50 pb-2">
                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Awal</span>
                                     <span className="text-xs font-black text-slate-800">Rp {(w.amount || 0).toLocaleString('id-ID')}</span>
                                   </div>
                                   <div className="flex justify-between items-end">
                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Saat Ini</span>
                                     <span className="text-xl font-black text-slate-800 tracking-tight">Rp {currentBalance.toLocaleString('id-ID')}</span>
                                   </div>
                                   <div className="flex items-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all gap-1 bg-white px-1 py-1 rounded-md shadow-sm border border-slate-100 absolute top-3 right-3">
                                     <button 
                                        onClick={() => {
                                          setEditingWalletId(w.id);
                                          setEditingWalletValue(w.name);
                                          setEditingWalletAmount(w.amount || 0);
                                        }}
                                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                      >
                                        <Pencil className="w-3 h-3" />
                                     </button>
                                     {!w.isDefault && (
                                       <button 
                                          onClick={() => deleteWallet(w.id)}
                                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                       </button>
                                     )}
                                   </div>
                                </div>
                              )}
                            </div>
                          );
                      })}
                  </div>
                  <form onSubmit={handleAddWallet} className="flex gap-2 w-full mt-4">
                    <input 
                      type="text"
                      value={editingWalletValue}
                      onChange={(e) => setEditingWalletValue(e.target.value)}
                      placeholder="Nama dompet baru..." 
                      className="flex-1 bg-white px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800 shadow-sm" 
                    />
                    <div className="relative w-1/3">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                      <input 
                        type="number"
                        value={editingWalletAmount || ''}
                        onChange={(e) => setEditingWalletAmount(Number(e.target.value))}
                        placeholder="Saldo awal" 
                        className="w-full bg-white pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800 shadow-sm" 
                      />
                    </div>
                    <button type="submit" className="px-6 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 shadow-md transition-all font-bold text-xs uppercase">
                      Tambah
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}

          {showBudgetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-24 bg-slate-900/50 backdrop-blur-sm overflow-auto">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white rounded-[2rem] md:rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-4 sm:p-6 md:p-10 border-4 md:border-8 border-white relative max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Pengaturan Anggaran</h3>
                  <button onClick={() => setShowBudgetModal(false)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {(() => {
                    const now = new Date();
                    const globalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
                    const globalSpent = transactions
                      .filter(t => t.type === 'expense' && t.date?.toDate)
                      .filter(t => {
                        const tDate = t.date.toDate();
                        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
                      })
                      .filter(t => budgets.some(b => b.categoryId === t.category))
                      .reduce((sum, t) => sum + t.amount, 0);

                    const percentage = globalBudget > 0 ? (globalSpent / globalBudget) * 100 : 0;
                    const validPercentage = Math.min(percentage, 100);
                    const isNearLimit = percentage >= 75 && percentage < 90;
                    const isOverLimit = percentage >= 90;

                    return (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 text-sm">Total Terserap (Kategori Beranggaran)</span>
                          {globalBudget === 0 ? (
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Belum diatur</span>
                          ) : isOverLimit ? (
                            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-md uppercase tracking-wider">Kritis / Melebihi Batas</span>
                          ) : isNearLimit ? (
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md uppercase tracking-wider">Hampir Habis</span>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider">Aman</span>
                          )}
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden relative">
                          <div 
                            className={cn("h-4 rounded-full transition-all duration-500", globalBudget === 0 ? "bg-slate-200" : isOverLimit ? "bg-rose-500" : isNearLimit ? "bg-amber-400" : "bg-emerald-400")} 
                            style={{ width: `${globalBudget === 0 ? 0 : validPercentage}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-slate-500 font-bold tracking-tight">Rp {globalSpent.toLocaleString('id-ID')}</span>
                          <span className="text-slate-400 font-black tracking-tight">/ Rp {globalBudget.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                       Budget Tiap Kategori
                    </h4>
                    {budgets.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {budgets.map((b) => {
                          const now = new Date();
                          const spent = transactions
                            .filter(t => t.type === 'expense' && t.category === b.categoryId && t.date?.toDate)
                            .filter(t => {
                              const tDate = t.date.toDate();
                              return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
                            })
                            .reduce((sum, t) => sum + t.amount, 0);

                          const catPercentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
                          const validCatPercentage = Math.min(catPercentage, 100);
                          const isCatNearLimit = catPercentage >= 75 && catPercentage < 90;
                          const isCatOverLimit = catPercentage >= 90;

                          return (
                            <div key={b.id} className="flex flex-col p-4 bg-slate-50 rounded-2xl group border border-slate-100 shadow-sm gap-2 relative">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-slate-700 text-xs truncate max-w-[120px]">{b.categoryId}</span>
                                {isCatOverLimit ? (
                                  <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded uppercase tracking-wider">Kritis</span>
                                ) : isCatNearLimit ? (
                                  <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wider">Hampir</span>
                                ) : (
                                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wider">Aman</span>
                                )}
                              </div>
                              <div className="w-full bg-slate-200/50 rounded-full h-1.5 mb-1.5 overflow-hidden">
                                <div 
                                  className={cn("h-1.5 rounded-full transition-all duration-500", isCatOverLimit ? "bg-rose-500" : isCatNearLimit ? "bg-amber-400" : "bg-emerald-400")} 
                                  style={{ width: `${validCatPercentage}%` }}
                                ></div>
                              </div>
                              
                              {editingBudgetId === b.id ? (
                                <form 
                                  onSubmit={(e) => { e.preventDefault(); handleUpdateBudget(b.id, editingBudgetAmount); }}
                                  className="flex items-center gap-2 mt-1"
                                >
                                  <span className="text-[11px] font-bold text-slate-400">Rp</span>
                                  <input 
                                    autoFocus
                                    type="number"
                                    value={editingBudgetAmount || ''}
                                    onChange={(e) => setEditingBudgetAmount(Number(e.target.value))}
                                    className="flex-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-indigo-500 text-[11px] font-bold text-slate-800 shadow-sm"
                                  />
                                  <button type="submit" className="text-emerald-500 hover:text-emerald-600">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button type="button" onClick={() => setEditingBudgetId(null)} className="text-slate-400 hover:text-slate-500">
                                    <X className="w-4 h-4" />
                                  </button>
                                </form>
                              ) : (
                                <div className="flex items-center justify-between text-[11px]">
                                   <div className="flex items-baseline gap-1">
                                     <span className="text-slate-500 font-bold">Rp{spent.toLocaleString('id-ID')}</span>
                                     <span className="text-slate-400 font-medium">/ Rp{b.amount.toLocaleString('id-ID')}</span>
                                   </div>
                                   <div className="flex items-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all ml-2 gap-1 bg-white px-1 py-1 rounded-md shadow-sm border border-slate-100 absolute bottom-3 right-3">
                                     <button 
                                        onClick={() => {
                                          setEditingBudgetId(b.id);
                                          setEditingBudgetAmount(b.amount);
                                        }}
                                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                      >
                                        <Pencil className="w-3 h-3" />
                                     </button>
                                     <button 
                                        onClick={() => deleteBudget(b.id)}
                                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                     </button>
                                   </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <form onSubmit={handleAddBudget} className="flex flex-col sm:flex-row gap-2 mt-4">
                        <select 
                          value={editingBudgetCategory} 
                          onChange={(e) => setEditingBudgetCategory(e.target.value)}
                          className="bg-slate-50 px-4 py-3 rounded-2xl border-none text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Pilih Kategori...</option>
                          {[...DEFAULT_EXPENSE_CATEGORIES, ...customCategories.filter(c => c.type === 'expense').map(c => c.name)].filter(c => !budgets.find(b => b.categoryId === c)).map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <div className="flex-1 relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                          <input 
                            type="number"
                            value={editingBudgetAmount || ''}
                            onChange={(e) => setEditingBudgetAmount(Number(e.target.value))}
                            placeholder="Nominal budget..." 
                            className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800" 
                          />
                        </div>
                      <button type="submit" className="px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 shadow-md transition-all font-bold text-xs uppercase shrink-0">
                        Tambah
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
