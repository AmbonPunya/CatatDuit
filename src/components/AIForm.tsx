import React from 'react';
import { Download, Loader2, Plus } from 'lucide-react';
import { cn } from '../utils';

interface AIFormProps {
  inputText: string;
  setInputText: (val: string) => void;
  isExtracting: boolean;
  isExporting: boolean;
  onExtractSubmit: (e: React.FormEvent) => void;
  onExportToExcel: () => void;
  onExportToGoogleSheets: () => void;
}

export function AIForm({
  inputText,
  setInputText,
  isExtracting,
  isExporting,
  onExtractSubmit,
  onExportToExcel,
  onExportToGoogleSheets,
}: AIFormProps) {
  return (
    <section className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Tambah Transaksi (AI)</h2>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={onExportToExcel}
            className="flex items-center gap-2 px-6 py-2 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold hover:bg-slate-200 transition-all border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button 
            type="button"
            onClick={onExportToGoogleSheets}
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
      
      <form onSubmit={onExtractSubmit} className="relative group">
        <input 
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Misal: 'gajian 5jt', 'bayar listrik 200rb', atau 'ambil cash ATM 1,5jt'..."
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
  );
}
