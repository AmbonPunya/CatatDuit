import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
  Timestamp,
  setAccessToken,
  getAccessToken
} from './firebase';
import { onAuthStateChanged, User, GoogleAuthProvider } from 'firebase/auth';
import { Transaction, CustomCategory, Wallet as WalletType, Budget } from './types';
import { setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Plus, LogIn, LogOut, Loader2, Wallet as WalletIcon, Settings, X
} from 'lucide-react';

import { useToast } from './components/Toast';
import { 
  cn, CATEGORY_COLORS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_WALLETS 
} from './utils';

// Component imports
import { QuickStats } from './components/QuickStats';
import { BudgetOverview } from './components/BudgetOverview';
import { AIForm } from './components/AIForm';
import { TransactionHistory } from './components/TransactionHistory';
import { FinancialStatus } from './components/FinancialStatus';
import { 
  DeleteConfirmModal, EditTransactionModal, SettingsModal, WalletModal, BudgetModal 
} from './components/Modals';
import { Onboarding } from './components/Onboarding';

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

export default function App() {
  const { toast, success, error: toastError, info, warning } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [payday, setPayday] = useState<number>(1);
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
  const [settingsTab, setSettingsTab] = useState<'income_categories' | 'expense_categories' | 'general'>('general');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editingWalletValue, setEditingWalletValue] = useState('');
  const [editingWalletAmount, setEditingWalletAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Firestore error helper
  const handleFirestoreError = (err: unknown, operationType: OperationType, path: string | null) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
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
    toastError(`Gagal melakukan operasi ${operationType} pada ${path || 'data'}.\nDetail: ${errorMessage}`);
  };

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
        warning('Proses memuat data memakan waktu lebih lama dari biasanya. Jika aplikasi tidak merespons, silakan segarkan halaman.');
      }
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (user) {
      const completed = localStorage.getItem(`catatduit_onboarding_${user.uid}`);
      if (!completed) {
        setShowOnboarding(true);
      }
    } else {
      setShowOnboarding(false);
    }
  }, [user]);

  // Listeners for data synchronization
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setCustomCategories([]);
      setWallets([]);
      setBudgets([]);
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

    // CustomCategories query
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

    // Settings query
    const sq = query(
      collection(db, 'settings'),
      where('userId', '==', user.uid)
    );

    const us = onSnapshot(sq, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        if (data.payday) setPayday(data.payday);
      } else {
        setPayday(1); // default
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'settings');
    });

    return () => { ut(); uc(); uw(); ub(); us(); };
  }, [user]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) return;
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const result = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      if (result.user) {
        setUser(result.user as User);
        success("Berhasil masuk sebagai Admin!");
      }
      return true;
    } catch (error: any) {
      console.error("Email Login error:", error);
      if (error.code === 'auth/invalid-credential') {
        toastError("Gagal masuk: Email atau password salah.");
      } else {
        toastError("Gagal masuk: " + (error.message || 'Terjadi kesalahan.'));
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
        success(`Berhasil masuk sebagai ${role}!`);
      }
      return true;
    } catch (error: any) {
      console.error(`${role} Login error:`, error);
      if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
        toastError(`Gagal masuk sebagai ${role}.\n\nSolusi: Anda harus mengaktifkan "Anonymous" sign-in provider di Firebase Console (Authentication > Sign-in method) agar login tester ini berfungsi.`);
      } else {
        toastError(`Gagal masuk sebagai ${role}: ` + (error.message || 'Terjadi kesalahan.'));
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
      success("Selamat datang! Anda berhasil masuk.");
      return true;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.warn('Login process was cancelled or interrupted.');
      } else {
        console.error('Login error:', error);
        toastError('Gagal masuk: ' + (error.message || 'Terjadi kesalahan sistem.'));
      }
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      setAccessToken(null);
      await signOut(auth);
      success("Berhasil keluar dari aplikasi.");
    } catch (error: any) {
      console.error('Logout error:', error);
      toastError('Gagal keluar: ' + (error.message || 'Terjadi kesalahan.'));
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
        success("AI berhasil mendeteksi dan menyimpan operasi transfer!");
        setIsExtracting(false);
        return;
      } else if (data.amount && data.description && data.category && data.type) {
        const path = 'transactions';
        await addDoc(collection(db, path), {
          amount: data.amount,
          description: data.description,
          category: data.category,
          type: data.type === 'transfer' ? 'expense' : data.type, // fallback
          wallet: data.wallet || data.source_wallet || 'Tunai',
          date: Timestamp.now(),
          userId: user.uid,
        });
        
        setInputText('');
        success("AI berhasil mendeteksi dan mencatat transaksi!");
        setIsExtracting(false);
        return;
      } else {
        warning('Maaf, AI tidak dapat mengenali data tersebut. Coba kalimat lain (misal: "gajian 5 juta" atau "beli bensin 20rb").');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toastError('Terjadi kesalahan saat memproses data transaksi.');
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
      success("Transaksi berhasil diperbarui!");
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
      success(`Kategori "${name}" berhasil ditambahkan!`);
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
      success(`Dompet "${editingWalletValue.trim()}" berhasil dibuat!`);
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
      success("Kategori berhasil diubah!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleSavePayday = async (newPayday: number) => {
    if (!user) return;
    try {
      const sq = query(collection(db, 'settings'), where('userId', '==', user.uid));
      const snapshot = await getDocs(sq);
      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, 'settings', docId), { payday: newPayday });
      } else {
        await addDoc(collection(db, 'settings'), { userId: user.uid, payday: newPayday });
      }
      setPayday(newPayday);
      success("Tanggal gajian berhasil diubah!");
    } catch (error) {
       console.error("Error saving payday:", error);
       toastError("Gagal menyimpan siklus payday.");
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
        success("Transaksi berhasil dihapus.");
      } else if (type === 'category') {
        path = `customCategories/${id}`;
        await deleteDoc(doc(db, 'customCategories', id));
        success("Kategori berhasil dihapus.");
      } else if (type === 'wallet') {
        path = `wallets/${id}`;
        await deleteDoc(doc(db, 'wallets', id));
        success("Dompet berhasil dihapus.");
      } else if (type === 'budget') {
        path = `budgets/${id}`;
        await deleteDoc(doc(db, 'budgets', id));
        success("Budget alokasi berhasil dihapus.");
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
      success("Dompet berhasil diperbarui!");
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
      success("Target anggaran berhasil ditambahkan!");
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
      success("Budget nominal berhasil diupdate.");
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
    success("Laporan Excel berhasil diunduh.");
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
      success('Berhasil mengekspor ke Google Sheets! File baru telah dibuka di tab baru.');
    } catch (error) {
      console.error('Google Sheets export error:', error);
      toastError('Terjadi kesalahan saat mengekspor ke Google Sheets.');
    } finally {
      setIsExporting(false);
    }
  };

  // Summary and Calculations
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

  const isSameMonthPeriod = (date: Date) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (now.getDate() < payday) {
      currentMonthStart.setMonth(currentMonthStart.getMonth() - 1);
    }
    const maxDaysInStartMonth = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 0).getDate();
    currentMonthStart.setDate(Math.min(payday, maxDaysInStartMonth));
    currentMonthStart.setHours(0, 0, 0, 0);

    const currentMonthEnd = new Date(currentMonthStart);
    currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1);
    const maxDaysInEndMonth = new Date(currentMonthEnd.getFullYear(), currentMonthEnd.getMonth() + 1, 0).getDate();
    currentMonthEnd.setDate(Math.min(payday, maxDaysInEndMonth));
    currentMonthEnd.setHours(0, 0, 0, 0);

    return date >= currentMonthStart && date < currentMonthEnd;
  };

  const getPeriodStartDate = (period: 'week' | 'month' | 'year') => {
    const now = new Date();
    let start: Date;
    if (period === 'week') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start.setDate(now.getDate() - now.getDay());
    }
    else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      if (now.getDate() < payday) start.setMonth(start.getMonth() - 1);
      const maxDays = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      start.setDate(Math.min(payday, maxDays));
    }
    else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      start = new Date();
    }
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const periodFilteredTransactions = transactions.filter(t => {
    if (!t.date?.toDate) return false;
    const date = t.date.toDate();
    if (chartPeriod === 'month') {
      return isSameMonthPeriod(date);
    }
    return date >= getPeriodStartDate(chartPeriod);
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

  const expenseCategories = Array.from(new Set([
    'Transfer', 
    ...DEFAULT_EXPENSE_CATEGORIES, 
    ...customCategories.filter(c => c.type === 'expense').map(c => c.name?.trim())
  ].filter(Boolean)));
  const incomeCategories = Array.from(new Set([
    'Transfer', 
    ...DEFAULT_INCOME_CATEGORIES, 
    ...customCategories.filter(c => c.type === 'income').map(c => c.name?.trim())
  ].filter(Boolean)));
  const walletOptions = Array.from(new Set([
    ...DEFAULT_WALLETS, 
    ...wallets.map(w => w.name?.trim())
  ].filter(Boolean)));

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
              type="button"
              onClick={() => { setSettingsTab('general'); setShowSettings(true); }}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all focus:outline-none"
              title="Pengaturan"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              type="button"
              onClick={handleLogout}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all focus:outline-none"
              title="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col p-6 md:p-10 gap-8 bg-white transition-colors">
          {/* 3 Summary Cards */}
          <QuickStats 
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            balance={balance}
            onIncomeClick={() => { setSettingsTab('income_categories'); setShowSettings(true); }}
            onExpenseClick={() => { setSettingsTab('expense_categories'); setShowSettings(true); }}
            onBalanceClick={() => setShowWalletModal(true)}
          />

          {/* Anggaran Card */}
          <BudgetOverview 
            budgets={budgets}
            transactions={transactions}
            isSameMonthPeriod={isSameMonthPeriod}
            onBudgetClick={() => setShowBudgetModal(true)}
          />

          {/* Natural Language Input */}
          <AIForm 
            inputText={inputText}
            setInputText={setInputText}
            isExtracting={isExtracting}
            isExporting={isExporting}
            onExtractSubmit={handleExtract}
            onExportToExcel={exportToExcel}
            onExportToGoogleSheets={exportToGoogleSheets}
          />

          <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* History Table */}
            <TransactionHistory 
              filteredTransactions={filteredTransactions}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              activeDropdownId={activeDropdownId}
              setActiveDropdownId={setActiveDropdownId}
              onEditTransaction={setEditingTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />

            {/* Summary & Charts */}
            <FinancialStatus 
              chartPeriod={chartPeriod}
              setChartPeriod={setChartPeriod}
              comparisonData={comparisonData}
              chartData={chartData}
              expenseRatio={expenseRatio}
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              balance={balance}
            />
          </section>
        </main>

        <footer className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-auto">
          <p>© 2026 CatatDuit AI Dashboard • Aktif</p>
          <div className="flex items-center gap-6">
            <span onClick={() => setShowOnboarding(true)} className="hover:text-indigo-600 cursor-pointer transition-colors">Panduan</span>
            <button type="button" onClick={exportToExcel} className="hover:text-indigo-600 cursor-pointer transition-colors bg-transparent border-none p-0 uppercase font-bold tracking-widest">Ekspor</button>
            <button type="button" onClick={() => { setSettingsTab('general'); setShowSettings(true); }} className="hover:text-indigo-600 cursor-pointer transition-colors bg-transparent border-none p-0 uppercase font-bold tracking-widest">Pengaturan</button>
          </div>
        </footer>

        {/* Modal-modal UI */}
        <AnimatePresence>
          {deleteConfirm && (
            <DeleteConfirmModal 
              deleteConfirm={deleteConfirm}
              onClose={() => setDeleteConfirm(null)}
              onConfirm={executeDelete}
            />
          )}

          {editingTransaction && (
            <EditTransactionModal 
              editingTransaction={editingTransaction}
              setEditingTransaction={setEditingTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              expenseCategories={expenseCategories}
              incomeCategories={incomeCategories}
              walletOptions={walletOptions}
            />
          )}

          {showSettings && (
            <SettingsModal 
              showSettings={showSettings}
              setShowSettings={setShowSettings}
              settingsTab={settingsTab}
              setSettingsTab={setSettingsTab}
              customCategories={customCategories}
              editingCategoryId={editingCategoryId}
              setEditingCategoryId={setEditingCategoryId}
              editingCategoryValue={editingCategoryValue}
              setEditingCategoryValue={setEditingCategoryValue}
              payday={payday}
              onSavePayday={handleSavePayday}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {showWalletModal && (
            <WalletModal 
              showWalletModal={showWalletModal}
              setShowWalletModal={setShowWalletModal}
              combinedWallets={combinedWallets}
              editingWalletId={editingWalletId}
              setEditingWalletId={setEditingWalletId}
              editingWalletValue={editingWalletValue}
              setEditingWalletValue={setEditingWalletValue}
              editingWalletAmount={editingWalletAmount}
              setEditingWalletAmount={setEditingWalletAmount}
              onAddWallet={handleAddWallet}
              onUpdateWallet={handleUpdateWallet}
              onDeleteWallet={deleteWallet}
              transactions={transactions}
            />
          )}

          {showBudgetModal && (
            <BudgetModal 
              showBudgetModal={showBudgetModal}
              setShowBudgetModal={setShowBudgetModal}
              budgets={budgets}
              transactions={transactions}
              isSameMonthPeriod={isSameMonthPeriod}
              editingBudgetId={editingBudgetId}
              setEditingBudgetId={setEditingBudgetId}
              editingBudgetAmount={editingBudgetAmount}
              setEditingBudgetAmount={setEditingBudgetAmount}
              editingBudgetCategory={editingBudgetCategory}
              setEditingBudgetCategory={setEditingBudgetCategory}
              onAddBudget={handleAddBudget}
              onUpdateBudget={handleUpdateBudget}
              onDeleteBudget={deleteBudget}
              customCategories={customCategories}
            />
          )}

          {showOnboarding && user && (
            <Onboarding
              userId={user.uid}
              onClose={() => setShowOnboarding(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
