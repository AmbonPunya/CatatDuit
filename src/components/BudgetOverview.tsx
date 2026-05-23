import React from 'react';
import { TrendingUp } from 'lucide-react';
import { cn } from '../utils';
import { Budget, Transaction } from '../types';

interface BudgetOverviewProps {
  budgets: Budget[];
  transactions: Transaction[];
  isSameMonthPeriod: (date: Date) => boolean;
  onBudgetClick: () => void;
}

export function BudgetOverview({
  budgets,
  transactions,
  isSameMonthPeriod,
  onBudgetClick,
}: BudgetOverviewProps) {
  const globalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const globalSpent = transactions
    .filter((t) => t.type === 'expense' && t.date?.toDate)
    .filter((t) => {
      const tDate = t.date.toDate();
      return isSameMonthPeriod(tDate);
    })
    .filter((t) => budgets.some((b) => b.categoryId === t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const percentage = globalBudget > 0 ? (globalSpent / globalBudget) * 100 : 0;

  return (
    <section className="w-full">
      <button 
        onClick={onBudgetClick}
        className="w-full bg-white border border-slate-200 shadow-sm rounded-[2rem] overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all text-left p-5 md:p-6 flex flex-col justify-between h-[150px] group"
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
        
        <div className="flex flex-col gap-2 w-full mt-auto">
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500", 
                percentage >= 90 ? "bg-rose-500" : percentage >= 75 ? "bg-amber-400" : "bg-emerald-400"
              )} 
              style={{ width: `${Math.min(percentage, 100)}%` }} 
            />
          </div>
          <div className="flex justify-between items-center text-xs w-full">
            <span className="text-slate-500 font-bold whitespace-nowrap">Rp {globalSpent.toLocaleString('id-ID')}</span>
            <span className="text-slate-400 font-bold whitespace-nowrap text-right">/ Rp {globalBudget.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </button>
    </section>
  );
}
