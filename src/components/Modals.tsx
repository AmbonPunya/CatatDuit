import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Trash2, Pencil, Plus, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon 
} from 'lucide-react';
import { cn, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_WALLETS } from '../utils';
import { Transaction, CustomCategory, Wallet, Budget } from '../types';

// ==========================================
// 1. DELETE CONFIRM MODAL
// ==========================================
interface DeleteConfirmModalProps {
  deleteConfirm: { id: string, type: 'transaction' | 'category' | 'wallet' | 'budget', message: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ deleteConfirm, onClose, onConfirm }: DeleteConfirmModalProps) {
  if (!deleteConfirm) return null;
  return (
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
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-all"
          >
            Batal
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-rose-200"
          >
            Ya, Hapus
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// 2. EDIT TRANSACTION MODAL
// ==========================================
interface EditTransactionModalProps {
  editingTransaction: Transaction | null;
  setEditingTransaction: (t: Transaction | null) => void;
  onUpdateTransaction: (e: React.FormEvent) => void;
  expenseCategories: string[];
  incomeCategories: string[];
  walletOptions: string[];
}

export function EditTransactionModal({
  editingTransaction,
  setEditingTransaction,
  onUpdateTransaction,
  expenseCategories,
  incomeCategories,
  walletOptions,
}: EditTransactionModalProps) {
  if (!editingTransaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-24 bg-slate-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-10 border-8 border-white overflow-hidden relative"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Edit Transaksi</h3>
          <button 
            type="button" 
            onClick={() => setEditingTransaction(null)} 
            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onUpdateTransaction} className="space-y-6">
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
                onChange={(e) => {
                  const type = e.target.value as 'expense' | 'income' | 'transfer';
                  setEditingTransaction({
                    ...editingTransaction, 
                    type, 
                    category: type === 'transfer' ? 'Transfer' : (type === 'income' ? incomeCategories[0] : expenseCategories[0])
                  });
                }}
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
  );
}

// ==========================================
// 3. SETTINGS MODAL
// ==========================================
interface SettingsModalProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  settingsTab: 'income_categories' | 'expense_categories' | 'general';
  setSettingsTab: (tab: 'income_categories' | 'expense_categories' | 'general') => void;
  customCategories: CustomCategory[];
  editingCategoryId: string | null;
  setEditingCategoryId: (id: string | null) => void;
  editingCategoryValue: string;
  setEditingCategoryValue: (val: string) => void;
  payday: number;
  onSavePayday: (p: number) => void;
  onAddCategory: (name: string, type: 'expense' | 'income') => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
}

export function SettingsModal({
  showSettings,
  setShowSettings,
  settingsTab,
  setSettingsTab,
  customCategories,
  editingCategoryId,
  setEditingCategoryId,
  editingCategoryValue,
  setEditingCategoryValue,
  payday,
  onSavePayday,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: SettingsModalProps) {
  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-24 bg-slate-900/50 backdrop-blur-sm overflow-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-[20px] w-full max-w-2xl shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col overflow-hidden"
        style={{ borderStyle: 'outset' }}
      >
        <div className="flex justify-between items-center px-6 md:px-10 pt-6 md:pt-10 pb-4">
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            {settingsTab === 'expense_categories' ? 'Kategori Pengeluaran' :
             settingsTab === 'income_categories' ? 'Kategori Pemasukan' :
             'Pengaturan Aplikasi'}
          </h3>
          <button 
            type="button" 
            onClick={() => setShowSettings(false)} 
            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-6 md:pb-10 space-y-6">
          {settingsTab === 'expense_categories' && (
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
                {customCategories.filter(c => c.type === 'expense').map((cat, idx) => (
                  <div key={`cust-exp-${cat.id || idx}-${idx}`} className="flex items-center justify-between p-4 bg-white rounded-2xl group border border-slate-100 shadow-sm">
                    {editingCategoryId === cat.id ? (
                      <div className="flex-1 flex gap-2">
                        <input 
                          autoFocus
                          type="text"
                          value={editingCategoryValue}
                          onChange={(e) => setEditingCategoryValue(e.target.value)}
                          className="flex-1 bg-slate-50 px-3 py-1 rounded-lg border-none focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onUpdateCategory(cat.id, editingCategoryValue);
                            if (e.key === 'Escape') setEditingCategoryId(null);
                          }}
                        />
                        <button type="button" onClick={() => onUpdateCategory(cat.id, editingCategoryValue)} className="text-emerald-500 hover:text-emerald-600">
                          <Check className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setEditingCategoryId(null)} className="text-slate-400 hover:text-slate-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-slate-700">{cat.name}</span>
                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryValue(cat.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteCategory(cat.id)}
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
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('category') as HTMLInputElement;
                if (input && input.value.trim()) {
                  onAddCategory(input.value.trim(), 'expense');
                  input.value = '';
                }
              }} className="flex gap-2">
                <input name="category" placeholder="Kategori baru..." className="flex-1 bg-slate-50 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800" />
                <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {settingsTab === 'income_categories' && (
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
                {customCategories.filter(c => c.type === 'income').map((cat, idx) => (
                  <div key={`cust-inc-${cat.id || idx}-${idx}`} className="flex items-center justify-between p-4 bg-white rounded-2xl group border border-slate-100 shadow-sm">
                    {editingCategoryId === cat.id ? (
                      <div className="flex-1 flex gap-2">
                        <input 
                          autoFocus
                          type="text"
                          value={editingCategoryValue}
                          onChange={(e) => setEditingCategoryValue(e.target.value)}
                          className="flex-1 bg-slate-50 px-3 py-1 rounded-lg border-none focus:ring-1 focus:ring-emerald-500 text-sm font-bold text-slate-800"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onUpdateCategory(cat.id, editingCategoryValue);
                            if (e.key === 'Escape') setEditingCategoryId(null);
                          }}
                        />
                        <button type="button" onClick={() => onUpdateCategory(cat.id, editingCategoryValue)} className="text-emerald-500 hover:text-emerald-600">
                          <Check className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setEditingCategoryId(null)} className="text-slate-400 hover:text-slate-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-slate-700">{cat.name}</span>
                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryValue(cat.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteCategory(cat.id)}
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
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('category') as HTMLInputElement;
                if (input && input.value.trim()) {
                  onAddCategory(input.value.trim(), 'income');
                  input.value = '';
                }
              }} className="flex gap-2">
                <input name="category" placeholder="Kategori pemasukan baru..." className="flex-1 bg-slate-50 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-800" />
                <button type="submit" className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {settingsTab === 'general' && (
            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                Siklus Bulanan
              </h4>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <p className="text-sm font-medium text-slate-600">
                  Atur tanggal dimulainya perhitungan bulan (misal tanggal gajian).
                  Perhitungan "bulan ini" akan dimulai dari tanggal tersebut.
                </p>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2">
                  <div className="flex-1 w-full relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 absolute -top-5">Tanggal Awal / Gajian</label>
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      value={payday}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        if (val >= 1 && val <= 31) onSavePayday(val);
                      }}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// 4. WALLET MODAL
// ==========================================
interface WalletModalProps {
  showWalletModal: boolean;
  setShowWalletModal: (show: boolean) => void;
  combinedWallets: Array<{ id: string; name: string; amount?: number; isDefault: boolean; userId?: string }>;
  editingWalletId: string | null;
  setEditingWalletId: (id: string | null) => void;
  editingWalletValue: string;
  setEditingWalletValue: (val: string) => void;
  editingWalletAmount: number;
  setEditingWalletAmount: (amount: number) => void;
  onAddWallet: (e: React.FormEvent) => void;
  onUpdateWallet: (id: string, name: string, amount: number) => void;
  onDeleteWallet: (id: string) => void;
  transactions: Transaction[];
}

export function WalletModal({
  showWalletModal,
  setShowWalletModal,
  combinedWallets,
  editingWalletId,
  setEditingWalletId,
  editingWalletValue,
  setEditingWalletValue,
  editingWalletAmount,
  setEditingWalletAmount,
  onAddWallet,
  onUpdateWallet,
  onDeleteWallet,
  transactions,
}: WalletModalProps) {
  if (!showWalletModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-24 bg-slate-900/50 backdrop-blur-sm overflow-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-[20px] w-full max-w-2xl shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col overflow-hidden"
        style={{ borderStyle: 'outset' }}
      >
        <div className="flex justify-between items-center px-6 md:px-10 pt-6 md:pt-10 pb-4">
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Pengaturan Dompet</h3>
          <button 
            type="button" 
            onClick={() => setShowWalletModal(false)} 
            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-6 md:pb-10 space-y-6">
          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
            <WalletIcon className="w-4 h-4" /> Daftar Dompet / Sumber Dana
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {combinedWallets.map((w, idx) => {
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
                <div key={`wallet-${w.id || idx}-${idx}`} className="flex flex-col p-4 bg-slate-50 rounded-2xl group border border-slate-100 shadow-sm gap-2 relative">
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
                      onSubmit={(e) => { e.preventDefault(); onUpdateWallet(w.id, editingWalletValue, editingWalletAmount); }}
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
                            type="button"
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
                              type="button"
                              onClick={() => onDeleteWallet(w.id)}
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
          <form onSubmit={onAddWallet} className="flex gap-2 w-full mt-4">
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
  );
}

// ==========================================
// 5. BUDGET MODAL
// ==========================================
interface BudgetModalProps {
  showBudgetModal: boolean;
  setShowBudgetModal: (show: boolean) => void;
  budgets: Budget[];
  transactions: Transaction[];
  isSameMonthPeriod: (date: Date) => boolean;
  editingBudgetId: string | null;
  setEditingBudgetId: (id: string | null) => void;
  editingBudgetAmount: number;
  setEditingBudgetAmount: (amount: number) => void;
  editingBudgetCategory: string;
  setEditingBudgetCategory: (cat: string) => void;
  onAddBudget: (e: React.FormEvent) => void;
  onUpdateBudget: (id: string, amount: number) => void;
  onDeleteBudget: (id: string) => void;
  customCategories: CustomCategory[];
}

export function BudgetModal({
  showBudgetModal,
  setShowBudgetModal,
  budgets,
  transactions,
  isSameMonthPeriod,
  editingBudgetId,
  setEditingBudgetId,
  editingBudgetAmount,
  setEditingBudgetAmount,
  editingBudgetCategory,
  setEditingBudgetCategory,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  customCategories,
}: BudgetModalProps) {
  if (!showBudgetModal) return null;

  const globalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const globalSpent = transactions
    .filter(t => t.type === 'expense' && t.date?.toDate)
    .filter(t => {
      const tDate = t.date.toDate();
      return isSameMonthPeriod(tDate);
    })
    .filter(t => budgets.some(b => b.categoryId === t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const percentage = globalBudget > 0 ? (globalSpent / globalBudget) * 100 : 0;
  const validPercentage = Math.min(percentage, 100);
  const isNearLimit = percentage >= 75 && percentage < 90;
  const isOverLimit = percentage >= 90;

  const categoryOptions = Array.from(new Set([
    ...DEFAULT_EXPENSE_CATEGORIES, 
    ...customCategories.filter(c => c.type === 'expense').map(c => c.name)
  ].filter(Boolean) as string[]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-24 bg-slate-900/50 backdrop-blur-sm overflow-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-[20px] w-full max-w-2xl shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col overflow-hidden"
        style={{ borderStyle: 'outset' }}
      >
        <div className="flex justify-between items-center px-6 md:px-10 pt-6 md:pt-10 pb-4">
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Pengaturan Anggaran</h3>
          <button 
            type="button" 
            onClick={() => setShowBudgetModal(false)} 
            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-6 md:pb-10 space-y-6">
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
                className={cn(
                  "h-4 rounded-full transition-all duration-500", 
                  globalBudget === 0 ? "bg-slate-200" : isOverLimit ? "bg-rose-500" : isNearLimit ? "bg-amber-400" : "bg-emerald-400"
                )} 
                style={{ width: `${globalBudget === 0 ? 0 : validPercentage}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-slate-500 font-bold tracking-tight">Rp {globalSpent.toLocaleString('id-ID')}</span>
              <span className="text-slate-400 font-black tracking-tight">/ Rp {globalBudget.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
               Budget Tiap Kategori
            </h4>
            {budgets.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {budgets.map((b, idx) => {
                  const spent = transactions
                    .filter(t => t.type === 'expense' && t.category === b.categoryId && t.date?.toDate)
                    .filter(t => {
                      const tDate = t.date.toDate();
                      return isSameMonthPeriod(tDate);
                    })
                    .reduce((sum, t) => sum + t.amount, 0);

                  const catPercentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
                  const validCatPercentage = Math.min(catPercentage, 100);
                  const isCatNearLimit = catPercentage >= 75 && catPercentage < 90;
                  const isCatOverLimit = catPercentage >= 90;

                  return (
                    <div key={`budget-${b.id || idx}-${idx}`} className="flex flex-col p-4 bg-slate-50 rounded-2xl group border border-slate-100 shadow-sm gap-2 relative">
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
                          onSubmit={(e) => { e.preventDefault(); onUpdateBudget(b.id, editingBudgetAmount); }}
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
                                type="button"
                                onClick={() => {
                                  setEditingBudgetId(b.id);
                                  setEditingBudgetAmount(b.amount);
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                             </button>
                             <button 
                                type="button"
                                onClick={() => onDeleteBudget(b.id)}
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
            
            <form onSubmit={onAddBudget} className="flex flex-col sm:flex-row gap-2 mt-4">
              <select 
                value={editingBudgetCategory} 
                onChange={(e) => setEditingBudgetCategory(e.target.value)}
                className="bg-slate-50 px-4 py-3 rounded-2xl border-none text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Pilih Kategori...</option>
                {categoryOptions.filter(c => !budgets.find(b => b.categoryId === c)).map((cat) => (
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
  );
}
