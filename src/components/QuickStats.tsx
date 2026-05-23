import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon } from 'lucide-react';
import { cn } from '../utils';

interface QuickStatsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  onIncomeClick: () => void;
  onExpenseClick: () => void;
  onBalanceClick: () => void;
}

export function QuickStats({
  totalIncome,
  totalExpense,
  balance,
  onIncomeClick,
  onExpenseClick,
  onBalanceClick,
}: QuickStatsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <button 
        onClick={onIncomeClick} 
        className="bg-white h-[68px] px-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 group hover:border-emerald-200 hover:bg-emerald-50/5 transition-all text-left active:scale-98"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
            <ArrowDownLeft className="w-4.5 h-4.5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Pemasukan</p>
            <p className="text-xs sm:text-sm font-black text-slate-800 tracking-tight leading-none truncate">Rp {totalIncome.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <span className="text-[8px] sm:text-[9px] text-slate-400/80 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all uppercase tracking-wider font-extrabold whitespace-nowrap shrink-0">Detail →</span>
      </button>

      <button 
        onClick={onExpenseClick} 
        className="bg-white h-[68px] px-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 group hover:border-rose-200 hover:bg-rose-50/5 transition-all text-left active:scale-98"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="w-4.5 h-4.5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Pengeluaran</p>
            <p className="text-xs sm:text-sm font-black text-slate-800 tracking-tight leading-none truncate">Rp {totalExpense.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <span className="text-[8px] sm:text-[9px] text-slate-400/80 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all uppercase tracking-wider font-extrabold whitespace-nowrap shrink-0">Detail →</span>
      </button>

      <button 
        onClick={onBalanceClick} 
        className="bg-white h-[68px] px-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3 group hover:border-indigo-200 hover:bg-indigo-50/5 transition-all text-left active:scale-98"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
            <WalletIcon className="w-4.5 h-4.5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Total Saldo</p>
            <p className={cn("text-xs sm:text-sm font-black tracking-tight leading-none truncate", balance >= 0 ? "text-slate-800" : "text-rose-600")}>
              Rp {balance.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
        <span className="text-[8px] sm:text-[9px] text-slate-400/80 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all uppercase tracking-wider font-extrabold whitespace-nowrap shrink-0">Detail →</span>
      </button>
    </section>
  );
}
