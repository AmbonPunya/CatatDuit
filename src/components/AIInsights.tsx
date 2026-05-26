import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Clock, TrendingUp, TrendingDown, AlertCircle, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction } from '../types';

interface AIInsightsProps {
  transactions: Transaction[];
}

export function AIInsights({ transactions }: AIInsightsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const insights = useMemo(() => {
    // 1. Process dates
    const parsedTransactions = transactions.map((t) => {
      let dateObj: Date;
      if (t.date?.toDate) {
        dateObj = t.date.toDate();
      } else if (t.date instanceof Date) {
        dateObj = t.date;
      } else if (typeof t.date === 'string' || typeof t.date === 'number') {
        dateObj = new Date(t.date);
      } else {
        dateObj = new Date();
      }
      return { ...t, dateObj };
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Previous month details
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Filter to expenses only
    const expensesThisMonth = parsedTransactions.filter((t) => 
      t.type === 'expense' && 
      t.dateObj.getMonth() === currentMonth && 
      t.dateObj.getFullYear() === currentYear
    );

    const expensesPrevMonth = parsedTransactions.filter((t) => 
      t.type === 'expense' && 
      t.dateObj.getMonth() === prevMonth && 
      t.dateObj.getFullYear() === prevYear
    );

    const recommendationsList: Array<{
      type: 'spending' | 'time' | 'trend';
      badge: string;
      icon: React.ReactNode;
      text: string;
      colorClass: string;
      bgClass: string;
    }> = [];

    // --- INSIGHT 1: TOP SPENDING CATEGORY ---
    if (expensesThisMonth.length > 0) {
      const categoryTotals: Record<string, number> = {};
      let totalAmountThisMonth = 0;
      expensesThisMonth.forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        totalAmountThisMonth += t.amount;
      });

      let topCategory = '';
      let topAmount = 0;
      Object.entries(categoryTotals).forEach(([cat, amt]) => {
        if (amt > topAmount) {
          topCategory = cat;
          topAmount = amt;
        }
      });

      if (topCategory) {
        recommendationsList.push({
          type: 'spending',
          badge: 'Prioritas Belanja',
          icon: <AlertCircle className="w-4 h-4" />,
          text: `Kategori terbesar bulan ini adalah ${topCategory} dengan total Rp ${topAmount.toLocaleString('id-ID')}.`,
          colorClass: 'text-amber-600 bg-amber-50 border-amber-100',
          bgClass: 'from-amber-500/5 to-transparent',
        });
      }
    } else {
      recommendationsList.push({
        type: 'spending',
        badge: 'Status Anggaran',
        icon: <Award className="w-4 h-4" />,
        text: 'Pengeluaran kamu bulan ini masih kosong! Langkah awal yang sangat baik untuk hemat.',
        colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        bgClass: 'from-emerald-500/5 to-transparent',
      });
    }

    // --- INSIGHT 2: TIME OF DAY HABITS ---
    if (expensesThisMonth.length > 0) {
      const timeSlots = {
        pagi: { label: 'pagi hari (05:00 - 12:00)', count: 0 },
        siang: { label: 'siang hari (12:00 - 17:00)', count: 0 },
        sore: { label: 'sore hari (17:00 - 20:00)', count: 0 },
        malam: { label: 'malam hari (20:00 - 05:00)', count: 0 },
      };

      expensesThisMonth.forEach((t) => {
        const hour = t.dateObj.getHours();
        if (hour >= 5 && hour < 12) {
          timeSlots.pagi.count += 1;
        } else if (hour >= 12 && hour < 17) {
          timeSlots.siang.count += 1;
        } else if (hour >= 17 && hour < 20) {
          timeSlots.sore.count += 1;
        } else {
          timeSlots.malam.count += 1;
        }
      });

      let topSlot = timeSlots.malam;
      Object.values(timeSlots).forEach((slot) => {
        if (slot.count > topSlot.count) {
          topSlot = slot;
        }
      });

      if (topSlot.count > 0) {
        recommendationsList.push({
          type: 'time',
          badge: 'Siklus Kebiasaan',
          icon: <Clock className="w-4 h-4" />,
          text: `Kamu paling sering belanja pada ${topSlot.label}.`,
          colorClass: 'text-sky-600 bg-sky-50 border-sky-100',
          bgClass: 'from-sky-500/5 to-transparent',
        });
      }
    }

    // --- INSIGHT 3: MONTH-OVER-MONTH COMPARISON OR PERCENTAGE CONTRIBUTION ---
    let trendAdded = false;
    if (expensesThisMonth.length > 0 && expensesPrevMonth.length > 0) {
      const thisCatTotals: Record<string, number> = {};
      expensesThisMonth.forEach((t) => {
        thisCatTotals[t.category] = (thisCatTotals[t.category] || 0) + t.amount;
      });

      const prevCatTotals: Record<string, number> = {};
      expensesPrevMonth.forEach((t) => {
        prevCatTotals[t.category] = (prevCatTotals[t.category] || 0) + t.amount;
      });

      let topGrowthCat = '';
      let topGrowthPct = 0;
      let topSavingCat = '';
      let topSavingPct = 0;

      Object.entries(thisCatTotals).forEach(([cat, amt]) => {
        const prevAmt = prevCatTotals[cat];
        if (prevAmt && prevAmt > 1000) {
          const pct = ((amt - prevAmt) / prevAmt) * 100;
          if (pct > 0 && pct > topGrowthPct) {
            topGrowthPct = pct;
            topGrowthCat = cat;
          } else if (pct < 0 && Math.abs(pct) > topSavingPct) {
            topSavingPct = Math.abs(pct);
            topSavingCat = cat;
          }
        }
      });

      if (topGrowthCat && topGrowthPct >= 5) {
        recommendationsList.push({
          type: 'trend',
          badge: 'Komparasi Tren',
          icon: <TrendingUp className="w-4 h-4" />,
          text: `Pengeluaran ${topGrowthCat.toLowerCase()} naik ${topGrowthPct.toFixed(0)}% bulan ini dibanding bulan lalu.`,
          colorClass: 'text-rose-600 bg-rose-50 border-rose-100',
          bgClass: 'from-rose-500/5 to-transparent',
        });
        trendAdded = true;
      } else if (topSavingCat && topSavingPct >= 5) {
        recommendationsList.push({
          type: 'trend',
          badge: 'Komparasi Tren',
          icon: <TrendingDown className="w-4 h-4" />,
          text: `Hebat! Pengeluaran ${topSavingCat.toLowerCase()} kamu berhasil ditekan hemat ${topSavingPct.toFixed(0)}% dibanding bulan lalu.`,
          colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
          bgClass: 'from-emerald-500/5 to-transparent',
        });
        trendAdded = true;
      }
    }

    if (!trendAdded && expensesThisMonth.length > 0) {
      const categoryTotals: Record<string, number> = {};
      let totalAmountThisMonth = 0;
      expensesThisMonth.forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        totalAmountThisMonth += t.amount;
      });

      let topCategory = '';
      let topAmount = 0;
      Object.entries(categoryTotals).forEach(([cat, amt]) => {
        if (amt > topAmount) {
          topCategory = cat;
          topAmount = amt;
        }
      });

      if (totalAmountThisMonth > 0 && topCategory) {
        const pct = (topAmount / totalAmountThisMonth) * 100;
        recommendationsList.push({
          type: 'trend',
          badge: 'Komparasi Tren',
          icon: <TrendingUp className="w-4 h-4" />,
          text: `Kategori ${topCategory.toLowerCase()} melahap ${pct.toFixed(0)}% dari total pengeluaranmu bulan ini.`,
          colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-100',
          bgClass: 'from-indigo-500/5 to-transparent',
        });
      }
    }

    return recommendationsList;
  }, [transactions]);

  // Adjust if index falls out of bounds due to transaction change
  useEffect(() => {
    if (currentIndex >= insights.length) {
      setCurrentIndex(0);
    }
  }, [insights.length, currentIndex]);

  // Auto-cycle insights every 8 seconds
  useEffect(() => {
    if (insights.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [insights.length]);

  if (insights.length === 0) return null;

  const currentInsight = insights[currentIndex] || insights[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? insights.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % insights.length);
  };

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-150 shadow-md md:shadow-xl shadow-slate-100/50 p-4 md:p-6 overflow-hidden relative">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100/50">
        {/* Left: Branding & Tag */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg md:rounded-xl">
            <Sparkles className="w-3.5 h-3.5 md:w-4 h-4" />
          </div>
          <h3 className="text-[10px] md:text-xs font-black text-indigo-900/40 uppercase tracking-widest leading-none">
            Insight AI
          </h3>
        </div>

        {/* Right: Controls & Indicators */}
        {insights.length > 1 && (
          <div className="flex items-center gap-2 md:gap-3">
            {/* Dots */}
            <div className="flex items-center gap-1 md:gap-1.5">
              {insights.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    currentIndex === idx ? 'w-3 md:w-4 bg-indigo-600' : 'w-1 bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={`Insight ${idx + 1}`}
                />
              ))}
            </div>

            {/* Nav Arrows */}
            <div className="flex items-center bg-slate-50 border border-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 hover:text-indigo-600 text-slate-400 rounded-md hover:bg-white transition-all"
                title="Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 hover:text-indigo-600 text-slate-400 rounded-md hover:bg-white transition-all"
                title="Berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="mt-3 md:mt-4 relative min-h-[48px] md:min-h-[56px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex items-center gap-3 md:gap-4 w-full"
          >
            {/* Soft Icon Badge */}
            <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl shrink-0 border shadow-sm ${currentInsight.colorClass}`}>
              {currentInsight.icon}
            </div>

            {/* Dynamic Text */}
            <div className="flex-1 min-w-0">
              <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                {currentInsight.badge}
              </span>
              <p className="text-xs font-semibold text-slate-700 leading-relaxed truncate-2-lines">
                {currentInsight.text}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

