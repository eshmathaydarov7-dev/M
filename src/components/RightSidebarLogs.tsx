import React, { useState } from "react";
import { History, BookOpen, Search, User, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { Transaction } from "../types";

interface RightSidebarLogsProps {
  transactions: Transaction[];
  onReturnClick: (bookId: string) => void;
  activeStudent?: { name: string; class: string } | null;
}

export default function RightSidebarLogs({ transactions, onReturnClick, activeStudent }: RightSidebarLogsProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [selectedClassTab, setSelectedClassTab] = useState<'all' | 'A' | 'B'>('all');

  // Compute stats for class A and class B
  const activeTx = transactions.filter(t => t.status === "active");
  const aClassActiveCount = activeTx.filter(t => t.studentClass.toLowerCase().includes('a')).length;
  const bClassActiveCount = activeTx.filter(t => t.studentClass.toLowerCase().includes('b')).length;

  // Filter based on student name, class, or book title
  const filteredTx = transactions.filter(tx => {
    const matchesSearch = 
      tx.studentName.toLowerCase().includes(filterQuery.toLowerCase()) ||
      tx.studentClass.toLowerCase().includes(filterQuery.toLowerCase()) ||
      tx.bookTitle.toLowerCase().includes(filterQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Filter by A / B class specifically
    if (selectedClassTab === 'A') {
      const isClassA = tx.studentClass.toLowerCase().includes('a');
      if (!isClassA) return false;
    } else if (selectedClassTab === 'B') {
      const isClassB = tx.studentClass.toLowerCase().includes('b');
      if (!isClassB) return false;
    }
    
    if (showOnlyActive) {
      return tx.status === "active";
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("uz-UZ", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl h-full flex flex-col p-4 shadow-sm overflow-hidden" id="right-sidebar bg">
      {/* Header section with active user or placeholder information */}
      <div className="flex items-center gap-2 pb-3 mb-2 border-b border-slate-200">
        <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg border border-indigo-100">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-slate-900 text-sm">Elektron Qayd Daftar</h3>
          <p className="text-[11px] text-slate-500 font-medium font-sans">Olingan & qaytarilgan kitoblar</p>
        </div>
      </div>

      {/* Active student info banner */}
      {activeStudent && (
        <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl mb-3 text-xs animate-fadeIn font-sans">
          <span className="text-emerald-850 font-bold block">Hozirgi tizimdagilar:</span>
          <div className="flex justify-between items-center mt-1">
            <span className="text-slate-900 font-bold flex items-center gap-1 leading-none">
              <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {activeStudent.name}
            </span>
            <span className="bg-emerald-100 border border-emerald-250 text-emerald-950 font-sans px-2 py-0.5 rounded text-[10px] font-bold">
              {activeStudent.class}
            </span>
          </div>
        </div>
      )}

      {/* TWO SEPARATE CLASS STATS BARS FOR INTUITY */}
      <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
        <div 
          onClick={() => setSelectedClassTab('A')}
          className={`cursor-pointer text-center p-1.5 rounded-lg border transition-all ${
            selectedClassTab === 'A' 
              ? "bg-indigo-650 border-indigo-700 text-white shadow-sm" 
              : "bg-white border-slate-200 hover:border-slate-350 text-slate-800"
          }`}
        >
          <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedClassTab === 'A' ? 'text-indigo-200' : 'text-slate-500'}`}>A-Sinf</div>
          <div className="text-lg font-black font-sans leading-none mt-1">{aClassActiveCount} ta <span className="text-[10px] font-medium">kitobda</span></div>
        </div>
        
        <div 
          onClick={() => setSelectedClassTab('B')}
          className={`cursor-pointer text-center p-1.5 rounded-lg border transition-all ${
            selectedClassTab === 'B' 
              ? "bg-emerald-650 border-emerald-700 text-white shadow-sm" 
              : "bg-white border-slate-200 hover:border-slate-350 text-slate-800"
          }`}
        >
          <div className={`text-[10px] font-bold uppercase tracking-wider ${selectedClassTab === 'B' ? 'text-emerald-200' : 'text-slate-500'}`}>B-Sinf</div>
          <div className="text-lg font-black font-sans leading-none mt-1">{bClassActiveCount} ta <span className="text-[10px] font-medium">kitobda</span></div>
        </div>
      </div>

      {/* Filter switches */}
      <div className="space-y-2 mb-3 font-sans">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Qidirish (ism, sinf, kitob)..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 font-medium transition-colors"
          />
        </div>

        {/* 1. Class-wise division filter buttons */}
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          <button
            onClick={() => setSelectedClassTab('all')}
            className={`text-[10px] py-1.5 rounded-lg font-bold transition-all border ${
              selectedClassTab === 'all' 
                ? "bg-slate-800 border-slate-900 text-white" 
                : "bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 cursor-pointer"
            }`}
          >
            Hamma
          </button>
          <button
            onClick={() => setSelectedClassTab('A')}
            className={`text-[10px] py-1.5 rounded-lg font-bold transition-all border ${
              selectedClassTab === 'A' 
                ? "bg-indigo-600 border-indigo-700 text-white" 
                : "bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 cursor-pointer"
            }`}
          >
            A-Sinf ({transactions.filter(t => t.studentClass.toLowerCase().includes('a')).length})
          </button>
          <button
            onClick={() => setSelectedClassTab('B')}
            className={`text-[10px] py-1.5 rounded-lg font-bold transition-all border ${
              selectedClassTab === 'B' 
                ? "bg-emerald-600 border-emerald-700 text-white" 
                : "bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 cursor-pointer"
            }`}
          >
            B-Sinf ({transactions.filter(t => t.studentClass.toLowerCase().includes('b')).length})
          </button>
        </div>

        {/* 2. Borrowed / Returned Status filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowOnlyActive(true)}
            className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold transition-all border ${
              showOnlyActive 
                ? "bg-amber-100 border-amber-200 text-amber-800" 
                : "bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 cursor-pointer"
            }`}
          >
            Olinganlar ({transactions.filter(t => t.status === "active").length})
          </button>
          <button
            onClick={() => setShowOnlyActive(false)}
            className={`flex-1 text-[10px] py-1.5 rounded-lg font-bold transition-all border ${
              !showOnlyActive 
                ? "bg-indigo-100 border-indigo-200 text-indigo-800" 
                : "bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 cursor-pointer"
            }`}
          >
            Barchasi ({transactions.length})
          </button>
        </div>
      </div>

      {/* Transaction Records List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[450px] lg:max-h-none font-sans">
        {filteredTx.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Hech qanday ma'lumot topilmadi.
          </div>
        ) : (
          filteredTx.map(tx => (
            <div 
              key={tx.id} 
              className={`p-3 rounded-xl border transition-all ${
                tx.status === "active" 
                  ? "bg-amber-50/30 border-amber-200 hover:border-amber-300" 
                  : "bg-slate-50/50 border-slate-200 hover:border-slate-250"
              }`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-[10px] text-slate-400 font-mono tracking-wide">{tx.id}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider border ${
                  tx.status === "active" 
                    ? "bg-amber-100 text-amber-800 border-amber-200" 
                    : "bg-emerald-100 text-emerald-800 border-emerald-200"
                }`}>
                  {tx.status === "active" ? "Olingan" : "Qaytarilgan"}
                </span>
              </div>

              <div className="text-xs text-slate-900 font-bold leading-snug mb-2 flex items-start gap-1">
                <BookOpen className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                <span>{tx.bookTitle}</span>
              </div>

              {/* Student and Class identifiers */}
              <div className="bg-white border border-slate-200/60 p-2 rounded-lg space-y-1 mb-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">O'quvchi:</span>
                  <span className="text-slate-800 font-bold">{tx.studentName}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Sinf:</span>
                  <span className={`border px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                    tx.studentClass.toLowerCase().includes('a')
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}>
                    {tx.studentClass}
                  </span>
                </div>
              </div>

              {/* Status and interactive actions */}
              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                <div className="flex flex-col gap-0.5 font-medium">
                  <span>Sanasi: {formatDate(tx.borrowedAt)}</span>
                  {tx.returnedAt && (
                    <span className="text-emerald-700 font-semibold">Topshirildi: {formatDate(tx.returnedAt)}</span>
                  )}
                </div>

                {/* Return trigger action - directly scan/return by clicking this item */}
                {tx.status === "active" && (
                  <button
                    onClick={() => onReturnClick(tx.bookId)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded transition-colors text-[9px] cursor-pointer"
                    title="Kitobni topshirish"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Qaytarish
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
