import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => addToast(message, type), [addToast]);
  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast]);
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);
  const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full md:w-auto pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            let icon = <Info className="w-5 h-5 text-indigo-500" />;
            let bgColor = 'bg-white border-slate-100 shadow-slate-200/50';
            
            if (t.type === 'success') {
              icon = <Check className="w-5 h-5 text-emerald-600" />;
              bgColor = 'bg-emerald-50/90 border-emerald-100/80 shadow-emerald-100/40 text-emerald-900';
            } else if (t.type === 'error') {
              icon = <X className="w-5 h-5 text-rose-600" />;
              bgColor = 'bg-rose-50/90 border-rose-100/80 shadow-rose-100/40 text-rose-900';
            } else if (t.type === 'warning') {
              icon = <AlertTriangle className="w-5 h-5 text-amber-600" />;
              bgColor = 'bg-amber-50/90 border-amber-100/80 shadow-amber-100/40 text-amber-900';
            } else {
              icon = <Info className="w-5 h-5 text-indigo-600" />;
              bgColor = 'bg-indigo-50/90 border-indigo-100/80 shadow-indigo-100/40 text-indigo-900';
            }

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md ${bgColor} transition-shadow`}
              >
                <div className="shrink-0 pt-0.5">
                  {icon}
                </div>
                <div className="flex-1 text-xs font-semibold leading-relaxed break-words">
                  {t.message}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
