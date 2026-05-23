import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wallet, Download, ChevronRight, X, ArrowLeft } from 'lucide-react';

interface OnboardingProps {
  userId: string;
  onClose: () => void;
}

export function Onboarding({ userId, onClose }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: (
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner relative overflow-hidden">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Sparkles className="w-8 h-8" />
          </motion.div>
          <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-indigo-100 rounded-full blur-sm opacity-60"></div>
        </div>
      ),
      title: "Catat Otomatis dengan AI",
      description: "Tidak perlu repot memasukkan angka dan kategori satu per satu. Cukup ketik kalimat alami seperti 'beli bakso 25rb' atau 'gajian 5jt', dan AI pintar kami akan otomatis memproses dan menyimpannya untuk Anda!"
    },
    {
      icon: (
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner relative overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          >
            <Wallet className="w-8 h-8" />
          </motion.div>
          <div className="absolute -left-2 -bottom-2 w-8 h-8 bg-emerald-100 rounded-full blur-sm opacity-60"></div>
        </div>
      ),
      title: "Pisahkan Berbagai Dompet Anda",
      description: "Kelola dana Anda secara terorganisir. Anda bisa memisahkan saldo antara Tunai, Rekening Transfer Bank, GOPAY, OVO, DANA, ShopeePay, atau membuat dompet kustom baru untuk memantau saldo tiap sumber dana secara akurat."
    },
    {
      icon: (
        <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200 relative overflow-hidden">
          <motion.div
            animate={{ y: [0, -3, 3, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Download className="w-8 h-8" />
          </motion.div>
          <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-indigo-700 rounded-full blur-sm opacity-40"></div>
        </div>
      ),
      title: "Ringkasan Bulanan & Ekspor Data",
      description: "Pantau kesehatan keuangan Anda melalui alokasi diagram warna-warni yang estetik dan komparasi bulanan gajian. Ekspor seluruh riwayat transaksi Anda ke file Excel secara luring atau sinkronisasikan langsung ke Google Sheets!"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`catatduit_onboarding_${userId}`, 'completed');
    onClose();
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-950/20 border border-slate-100 overflow-hidden relative flex flex-col p-8 md:p-10"
      >
        {/* Close (X) button on top right */}
        <button
          type="button"
          onClick={handleComplete}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          title="Tutup & Lewati"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content with slide animation */}
        <div className="flex-1 flex flex-col items-center text-center mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="mb-8">{steps[currentStep].icon}</div>
              
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight mb-4">
                {steps[currentStep].title}
              </h3>
              
              <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-sm mb-8">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer controls */}
        <div className="flex flex-col gap-6 mt-auto">
          {/* Progress indicators (Dots) */}
          <div className="flex justify-center gap-2">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentStep === idx ? 'w-8 bg-indigo-600' : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Langkah ${idx + 1}`}
              />
            ))}
          </div>

          {/* Centered actions area */}
          <div className="flex flex-col items-center justify-center gap-3 w-full">
            <button
              onClick={handleNext}
              className="w-full sm:w-80 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <span>{currentStep === steps.length - 1 ? 'Mulai Sekarang' : 'Lanjut'}</span>
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>

            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="text-xs font-extrabold text-slate-400 hover:text-slate-600 uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
              >
                Kembali
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
