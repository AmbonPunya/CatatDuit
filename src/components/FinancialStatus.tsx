import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { History, PieChart as ChartIcon, TrendingDown, Wallet as WalletIcon } from 'lucide-react';
import { cn, CATEGORY_COLORS } from '../utils';

interface FinancialStatusProps {
  chartPeriod: 'week' | 'month' | 'year';
  setChartPeriod: (period: 'week' | 'month' | 'year') => void;
  comparisonData: Array<{ name: string; amount: number; fill: string }>;
  chartData: Array<{ name: string; value: number }>;
  expenseRatio: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export function FinancialStatus({
  chartPeriod,
  setChartPeriod,
  comparisonData,
  chartData,
  expenseRatio,
  totalIncome,
  totalExpense,
  balance,
}: FinancialStatusProps) {
  return (
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
                type="button"
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
          {chartData.map((data, idx) => (
            <div key={`legend-${data.name}-${idx}`} className="flex items-center gap-2.5 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
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
  );
}
