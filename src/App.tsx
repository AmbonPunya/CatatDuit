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
import { onAuthStateChanged, User, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { Transaction, CustomCategory, Wallet as WalletType } from './types';

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
  Search,
  Filter,
  Calendar
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
  
  const [inputText, setInputText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<boolean>(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'categories' | 'wallets'>('categories');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editingWalletValue, setEditingWalletValue] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

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

    return () => { ut(); uc(); uw(); };
  }, [user]);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
      setUnauthorizedDomain(false);
      return true;
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.warn('Login process was cancelled or interrupted.');
      } else if (error.code === 'auth/unauthorized-domain' || (error.message && error.message.includes('auth/unauthorized-domain'))) {
        console.error('Login error (unauthorized domain):', error);
        setUnauthorizedDomain(true);
      } else {
        console.error('Login error:', error);
        alert('Gagal masuk: ' + (error.message || 'Terjadi kesalahan sistem.'));
      }
      return false;
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInAnonymously(auth);
      setUnauthorizedDomain(false);
      return true;
    } catch (error: any) {
      console.error('Guest login error:', error);
      alert('Gagal masuk sebagai tamu: ' + (error.message || 'Harap aktifkan "Anonymous Sign-in" di Firebase Console Anda jika ingin menggunakan mode tamu.'));
      return false;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(text);
    setTimeout(() => setCopiedDomain(null), 2000);
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

      if (data.amount && data.description && data.category && data.type) {
        // We trigger the addDoc but don't strictly await it for the UI to feel responsive
        // Firestore handles the sync in the background
        const path = 'transactions';
        addDoc(collection(db, path), {
          amount: data.amount,
          description: data.description,
          category: data.category,
          type: data.type,
          wallet: data.wallet || 'Tunai',
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

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return;
    const path = `transactions/${id}`;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
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

  const handleAddWallet = async (name: string) => {
    if (!user) return;
    const path = 'wallets';
    try {
      await addDoc(collection(db, path), {
        name,
        userId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    const path = `customCategories/${id}`;
    try {
      await deleteDoc(doc(db, 'customCategories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
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

  const deleteWallet = async (id: string) => {
    if (!confirm('Hapus dompet ini?')) return;
    const path = `wallets/${id}`;
    try {
      await deleteDoc(doc(db, 'wallets', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleUpdateWallet = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    const path = `wallets/${id}`;
    try {
      await updateDoc(doc(db, 'wallets', id), { name: newName.trim() });
      setEditingWalletId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const exportToExcel = () => {
    const data = transactions.map(t => ({
      Tanggal: t.date?.toDate ? t.date.toDate().toLocaleString() : '',
      Deskripsi: t.description,
      Kategori: t.category,
      Dompet: t.wallet || 'Tunai',
      Tipe: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
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
          t.wallet || 'Tunai',
          t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
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

  const balance = totalIncome - totalExpense;

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

  const expenseCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...customCategories.filter(c => c.type === 'expense').map(c => c.name)];
  const incomeCategories = [...DEFAULT_INCOME_CATEGORIES, ...customCategories.filter(c => c.type === 'income').map(c => c.name)];
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
    if (unauthorizedDomain) {
      const currentHost = window.location.hostname;
      const pairedHost = currentHost.startsWith('ais-dev-') 
        ? currentHost.replace('ais-dev-', 'ais-pre-') 
        : currentHost.replace('ais-pre-', 'ais-dev-');
      const domainsToAuthorize = Array.from(new Set([
        'localhost',
        currentHost,
        pairedHost
      ])).filter(Boolean);

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 md:p-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl w-full"
          >
            <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border-8 border-white text-left">
              <div className="w-16 h-16 bg-rose-50 rounded-[1.5rem] flex items-center justify-center mb-6 text-rose-600 border border-rose-100">
                <X className="w-8 h-8" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-2">
                Domain <span className="text-rose-600">Belum Diizinkan</span>
              </h1>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
                Firebase mendeteksi upaya login dari domain yang belum didaftarkan di proyek Firebase baru Anda (<span className="font-semibold text-slate-700">catatduit-f4943</span>). Ikuti langkah mudah di bawah ini untuk memperbaikinya:
              </p>

              <div className="space-y-4 mb-8 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Buka Firebase Console</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Akses menu <span className="font-semibold text-slate-700">Build &gt; Authentication &gt; tab Settings</span>.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <div className="w-full">
                    <p className="text-sm font-bold text-slate-800 font-sans font-medium">Tambahkan Authorized Domains</p>
                    <p className="text-xs text-slate-500 mt-0.5 mb-2 font-medium">Scroll ke panel <span className="font-semibold text-slate-700">Authorized domains</span>, klik "Add domain" dan salin domain di bawah ini:</p>
                    
                    <div className="space-y-2 mt-2">
                      {domainsToAuthorize.map((domain) => (
                        <div key={domain} className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                          <code className="text-xs font-mono text-indigo-600 break-all">{domain}</code>
                          <button
                            onClick={() => copyToClipboard(domain)}
                            className="text-[10px] font-bold px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white rounded-lg transition-all shrink-0 active:scale-95"
                          >
                            {copiedDomain === domain ? 'Tersalin ✓' : 'Salin'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={handleLogin}
                  className="flex-1 bg-slate-900 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 hover:-translate-y-0.5 transition-all shadow-lg active:scale-95 text-sm cursor-pointer"
                >
                  <LogIn className="w-5 h-5 text-indigo-400" />
                  Coba Masuk Lagi
                </button>
                <button 
                  onClick={handleGuestLogin}
                  className="flex-1 bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 transition-all active:scale-95 text-sm cursor-pointer"
                >
                  Masuk Sebagai Tamu
                </button>
              </div>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => setUnauthorizedDomain(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold underline transition-colors"
                >
                  Kembali ke Halaman Utama
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

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
            <button 
              onClick={handleLogin}
              className="w-full bg-slate-900 text-white font-bold py-5 px-8 rounded-2xl flex items-center justify-center gap-4 hover:bg-slate-800 hover:-translate-y-1 transition-all shadow-xl shadow-slate-200 active:scale-95"
            >
              <LogIn className="w-6 h-6 text-indigo-400" />
              Mulai Sekarang
            </button>
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
            <div className="bg-white h-[60px] px-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-100 transition-all">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Pemasukan</p>
                <p className="text-sm font-black text-slate-800 tracking-tight leading-tight">Rp {totalIncome.toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="bg-white h-[60px] px-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-100 transition-all">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Pengeluaran</p>
                <p className="text-sm font-black text-slate-800 tracking-tight leading-tight">Rp {totalExpense.toLocaleString('id-ID')}</p>
              </div>
            </div>
            <div className="bg-white h-[60px] px-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-100 transition-all">
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
                placeholder="Misal: 'gajian 5jt', 'bayar listrik 200rb', atau 'beli boba 25rb'..."
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
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-32">
                      <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-8 pr-2 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-[10px] font-bold uppercase tracking-tight text-slate-800 shadow-sm"
                      />
                      <Calendar className="w-3 h-3 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-slate-300 font-bold">-</span>
                    <div className="relative flex-1 md:w-32">
                      <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-8 pr-2 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-[10px] font-bold uppercase tracking-tight text-slate-800 shadow-sm"
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
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_0_rgba(0,0,0,0.05)] z-10">
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-4">Tanggal</th>
                      <th className="px-4 py-4">Keterangan</th>
                      <th className="px-4 py-4 text-center">Dompet / Kategori</th>
                      <th className="px-4 py-4 text-right">Nominal</th>
                      <th className="px-8 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                      {filteredTransactions.map((t) => (
                        <motion.tr 
                          key={t.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-8 py-5 text-xs text-slate-400 font-medium whitespace-nowrap">
                            {t.date?.toDate ? t.date.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '...'}
                          </td>
                          <td className="px-4 py-5">
                            <p className="font-bold text-slate-700">{t.description}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">{t.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</p>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t.wallet || 'Tunai'}</span>
                              <span 
                                className="px-3 py-0.5 rounded-full text-[9px] font-bold border" 
                                style={{ 
                                  color: CATEGORY_COLORS[t.category] || '#64748b', 
                                  backgroundColor: `${CATEGORY_COLORS[t.category] || '#64748b'}15`,
                                  borderColor: `${CATEGORY_COLORS[t.category] || '#64748b'}30`
                                }}
                              >
                                {t.category}
                              </span>
                            </div>
                          </td>
                          <td className={cn("px-4 py-5 text-right font-black", t.type === 'income' ? "text-emerald-600" : "text-slate-800")}>
                            {t.type === 'income' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="relative inline-block text-left">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === t.id ? null : t.id);
                                }}
                                className="dropdown-trigger p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-all active:scale-95 flex items-center justify-center mx-auto"
                                title="Aksi"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>

                              {activeDropdownId === t.id && (
                                <div 
                                  className="dropdown-menu absolute right-0 mt-2 w-48 rounded-2xl bg-white shadow-2xl border border-slate-100 py-2 z-50 transform origin-top-right transition-all text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => {
                                      setEditingTransaction(t);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                                  >
                                    <Pencil className="w-4 h-4 text-indigo-500" />
                                    Edit Transaksi
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteTransaction(t.id);
                                      setActiveDropdownId(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-500" />
                                    Hapus Transaksi
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 opacity-20">
                            <WalletIcon className="w-12 h-12" />
                            <p className="text-sm font-bold uppercase tracking-widest italic">Belum ada transaksi</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
                        onChange={(e) => setEditingTransaction({...editingTransaction, type: e.target.value as 'expense' | 'income', category: e.target.value === 'income' ? incomeCategories[0] : expenseCategories[0]})}
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 appearance-none font-bold text-slate-700"
                      >
                        <option value="expense">Keluar</option>
                        <option value="income">Masuk</option>
                      </select>
                    </div>
                  </div>
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
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setSettingsTab('categories')}
                      className={cn(
                        "text-2xl font-black tracking-tight transition-all",
                        settingsTab === 'categories' ? "text-slate-800" : "text-slate-300 hover:text-slate-400"
                      )}
                    >
                      Kategori
                    </button>
                    <button 
                      onClick={() => setSettingsTab('wallets')}
                      className={cn(
                        "text-2xl font-black tracking-tight transition-all",
                        settingsTab === 'wallets' ? "text-slate-800" : "text-slate-300 hover:text-slate-400"
                      )}
                    >
                      Dompet
                    </button>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {settingsTab === 'categories' ? (
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
                ) : (
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                      <WalletIcon className="w-4 h-4" /> Daftar Dompet / Sumber Dana
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-auto pr-2">
                      {DEFAULT_WALLETS.map((w, idx) => (
                        <div key={`def-wal-${idx}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent">
                          <span className="font-bold text-slate-700">{w}</span>
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Bawaan</span>
                        </div>
                      ))}
                      {wallets.map((w) => (
                        <div key={w.id} className="flex items-center justify-between p-4 bg-white rounded-2xl group border border-slate-100 shadow-sm">
                          {editingWalletId === w.id ? (
                            <div className="flex-1 flex gap-2">
                              <input 
                                autoFocus
                                type="text"
                                value={editingWalletValue}
                                onChange={(e) => setEditingWalletValue(e.target.value)}
                                className="flex-1 bg-slate-50 px-3 py-1 rounded-lg border-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateWallet(w.id, editingWalletValue);
                                  if (e.key === 'Escape') setEditingWalletId(null);
                                }}
                              />
                              <button onClick={() => handleUpdateWallet(w.id, editingWalletValue)} className="text-emerald-500 hover:text-emerald-600">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingWalletId(null)} className="text-slate-400 hover:text-slate-500">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="font-bold text-slate-700">{w.name}</span>
                              <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => {
                                    setEditingWalletId(w.id);
                                    setEditingWalletValue(w.name);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => deleteWallet(w.id)}
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
                      const input = (e.target as any).walletName;
                      if (input.value.trim()) {
                        handleAddWallet(input.value.trim());
                        input.value = '';
                      }
                    }} className="flex gap-2 max-w-sm">
                      <input name="walletName" placeholder="Nama dompet baru..." className="flex-1 bg-slate-50 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800" />
                      <button type="submit" className="px-6 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-md transition-all font-bold text-xs uppercase">
                        Tambah
                      </button>
                    </form>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
