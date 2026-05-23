import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Filter, MoreVertical, Pencil, Search, Trash2, Wallet as WalletIcon } from 'lucide-react';
import { cn } from '../utils';
import { Transaction } from '../types';

interface TransactionHistoryProps {
  filteredTransactions: Transaction[];
  activeTab: 'all' | 'expense' | 'income';
  setActiveTab: (tab: 'all' | 'expense' | 'income') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  activeDropdownId: string | null;
  setActiveDropdownId: (id: string | null) => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export function TransactionHistory({
  filteredTransactions,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  activeDropdownId,
  setActiveDropdownId,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionHistoryProps) {
  return (
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
                type="button"
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
        <div className="flex flex-col md:flex-row gap-3 items-center justify-center w-full">
          {/* Kolom Pencarian Teks */}
          <div className="relative w-full flex-1">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari deskripsi, kategori, dompet..."
              className="w-full h-[30px] pl-9 pr-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm"
            />
            <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Grup Filter Tanggal & Reset */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
            <div className="relative">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[120px] h-[30px] pl-[32px] bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-[9px] font-bold uppercase tracking-tight text-slate-800 shadow-sm"
              />
              <Calendar className="w-3 h-3 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            
            <span className="text-slate-300 font-bold">-</span>
            
            <div className="relative">
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
                type="button"
                onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
                className="p-1.5 h-[30px] w-[30px] rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all border border-rose-100 shadow-sm flex items-center justify-center flex-shrink-0"
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
                        type="button"
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
                            type="button"
                            onClick={() => {
                              onEditTransaction(t);
                              setActiveDropdownId(null);
                            }}
                            className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <div className="h-[1px] w-full bg-slate-50"></div>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTransaction(t.id);
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
  );
}
