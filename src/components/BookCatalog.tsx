import React, { useState } from "react";
import { Search, BookOpen, Clock, CheckCircle, AlertTriangle, BookMarked, Layers, Sparkles, Trash, Mic, MicOff, Loader2, RotateCcw } from "lucide-react";
import { Book, Transaction } from "../types";

interface BookCatalogProps {
  books: Book[];
  transactions: Transaction[];
  onBorrowBook: (book: Book) => void;
  onReturnBook: (book: Book) => void;
  onAddBookClick: () => void;
  activeStudent?: { name: string; class: string } | null;
  onDeleteBook?: (bookId: string) => void;
  onQuickBorrowClick?: () => void;
  onQuickReturnClick?: () => void;
}

export default function BookCatalog({ books, transactions, onBorrowBook, onReturnBook, onAddBookClick, activeStudent, onDeleteBook, onQuickBorrowClick, onQuickReturnClick }: BookCatalogProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'world' | 'uzbek' | 'new' | 'borrowed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (e) {
          console.error("Stop error:", e);
        }
      }
      setIsListening(false);
      setVoiceStatus(null);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Kechirasiz! Sizning brauzeringizda ovozli qidiruv (Web Speech API) qo'llab-quvvatlanmaydi. Iltimos Google Chrome yoki Microsoft Edge brauzeridan foydalaning.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "uz-UZ";

      rec.onstart = () => {
        setIsListening(true);
        setVoiceStatus("Gapiring... (Kitob nomini ayting)");
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const cleanText = transcript.trim().replace(/\.$/, "");
          setSearchQuery(cleanText);
          setVoiceStatus(`Tushundim: "${cleanText}"`);
          setTimeout(() => setVoiceStatus(null), 3000);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Nutqni aniqlash xatosi:", event.error);
        if (event.error === "not-allowed") {
          setVoiceStatus("Mikrofonga ruxsat berilmadi!");
        } else if (event.error === "no-speech") {
          setVoiceStatus("Ovoz eshitilmadi.");
        } else {
          setVoiceStatus(`Xatolik: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setVoiceStatus(null), 3000);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.start();
      setRecognitionInstance(rec);
    } catch (err: any) {
      console.error(err);
      setVoiceStatus("Ovozli tizimni ishga tushirib bo'lmadi.");
      setIsListening(false);
      setTimeout(() => setVoiceStatus(null), 3000);
    }
  };

  // Filtering books selection
  const filteredBooks = books.filter(book => {
    const matchesTab = activeTab === 'all' || (activeTab === 'borrowed' ? !book.available : book.category === activeTab);
    const matchesQuery = 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.barcode.includes(searchQuery) ||
      (book.description && book.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesTab && matchesQuery;
  });

  // Category translations and styles
  const categories = [
    { id: 'all', label: 'Barcha Kitoblar', count: books.length },
    { id: 'world', label: 'Jahon Adabiyoti', count: books.filter(b => b.category === 'world').length },
    { id: 'uzbek', label: 'O\'zbek Adabiyoti', count: books.filter(b => b.category === 'uzbek').length },
    { id: 'new', label: 'Yangi Kitoblar', count: books.filter(b => b.category === 'new').length },
    { id: 'borrowed', label: 'Olingan Kitoblar', count: books.filter(b => !b.available).length },
  ];

  return (
    <div className="space-y-6" id="catalog-canvas">
      {/* Top Banner & Search Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl border border-indigo-100">
            <BookMarked className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Katalog Qirikuv Tizimi</h2>
            <p className="text-sm text-slate-550 max-w-sm">
              Kitob bor-yo'qligini bilish uchun qidiring. Ism-familiyangizni yozib sevimli asaringizni oling.
            </p>
          </div>
        </div>

        {/* Floating actions for student / admin */}
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {onQuickReturnClick && (
            <button
              onClick={onQuickReturnClick}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-100 w-full md:w-auto justify-center"
            >
              <RotateCcw className="w-4 h-4 text-white" />
              Tezkor Kitob Qaytarish
            </button>
          )}
          <button
            onClick={onAddBookClick}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-transform active:scale-95 cursor-pointer shadow-md shadow-indigo-100 w-full md:w-auto justify-center animate-pulse"
          >
            <Sparkles className="w-4 h-4" />
            Kitob qo'shish
          </button>
        </div>
      </div>

      {/* Main Search Bar & Tab Toggle Area */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center shadow-sm">
        {/* Responsive Search Box */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder={isListening ? "Ovozli qidiruv eshitilmoqda: kutilyapti..." : "Kitob nomi yoki muallifi bo'yicha qidiring..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-11 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 placeholder-slate-400 transition-colors shadow-inner font-medium ${
              isListening ? "border-red-300 ring-2 ring-red-100" : ""
            }`}
          />
          
          <div className="absolute right-3 top-2 flex items-center gap-1.5">
            {voiceStatus && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-150 border font-sans mr-1 max-w-[130px] truncate ${
                isListening ? "text-red-650 bg-red-50 border-red-150 animate-pulse" : "text-indigo-650 bg-indigo-50 border-indigo-150"
              }`}>
                {voiceStatus}
              </span>
            )}
            
            <button
              onClick={toggleListening}
              type="button"
              className={`p-1.5 rounded-lg transition-all focus:outline-none cursor-pointer ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200 scale-105"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-205 hover:text-slate-800"
              }`}
              title={isListening ? "To'xtatish" : "Ovoqli qidiruv (uz-UZ)"}
            >
              {isListening ? (
                <span className="flex items-center gap-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-100 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  <MicOff className="w-4 h-4" />
                </span>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Category Pill Buttons */}
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeTab === cat.id
                  ? 'bg-indigo-600 text-white border-indigo-650 shadow-md shadow-indigo-100'
                  : 'bg-slate-50 text-slate-605 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Grid Results */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="font-display font-semibold text-lg text-slate-700">Kitoblar topilmadi</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Qidiruv so'rovini tekshirib ko'ring yoki kutubxonaga yangi kitoblar skanerlash bo'limi orqali kitob qo'shing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBooks.map((book) => {
            const activeTx = !book.available
              ? transactions?.find(t => String(t.bookId) === String(book.id) && t.status === 'active')
              : null;

            return (
              <div
                key={book.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition-all hover:translate-y-[-2px] duration-300 ${
                  book.available 
                    ? 'border-slate-200 hover:border-indigo-300' 
                    : 'border-slate-200 bg-slate-50/60 opacity-80'
                }`}
              >
                <div>
                  {/* Header detail with status */}
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                      book.category === 'world' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/60' 
                        : book.category === 'uzbek'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                    }`}>
                      {book.category === 'world' ? 'Jahon adabiyoti' : book.category === 'uzbek' ? 'O\'zbek adabiyoti' : 'Yangi kitob'}
                    </span>

                    <span className={`text-[10px] font-bold py-0.5 px-2 rounded-full flex items-center gap-1 leading-none ${
                      book.available 
                        ? 'bg-emerald-55 bg-emerald-100 text-emerald-800 border border-emerald-200/60' 
                        : 'bg-red-50 text-red-700 border border-red-200/60'
                    }`}>
                      {book.available ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Kutubxonada bor
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-red-500" />
                          Olingan
                        </>
                      )}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 mt-2">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 tracking-wider block uppercase">Kitob nomi:</span>
                      <h4 className="font-display font-black text-lg text-slate-900 tracking-tight leading-snug line-clamp-1">{book.title}</h4>
                    </div>
                    
                    <div>
                      <span className="text-[10px] font-bold text-slate-550 block uppercase tracking-wider">Kim yozgan (Muallif):</span>
                      <p className="text-xs text-slate-800 font-bold bg-white border border-slate-200 shadow-sm inline-block px-2.5 py-1 rounded-lg mt-0.5">{book.author}</p>
                    </div>

                    {book.publishedYear && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Nashr yili:</span>
                        <p className="text-xs text-slate-600 font-bold">{book.publishedYear}-yil</p>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Asar tavsifi va mazmuni:</span>
                      <p className="text-xs text-slate-605 leading-relaxed line-clamp-3 mt-1 bg-white p-2.5 rounded-lg border border-slate-200/80">
                        {book.description || "Tavsifi kiritilmagan."}
                      </p>
                    </div>

                    {/* Active borrower user profile indicator */}
                    {!book.available && activeTx && (
                      <div className="border-t border-red-100 pt-2.5 mt-2.5 font-sans animate-fadeIn">
                        <span className="text-[10px] font-bold text-red-600 tracking-wider block uppercase">Hozir kimda (O'quvchi):</span>
                        <div className="text-xs text-slate-900 font-bold bg-slate-100 border border-slate-250 shadow-sm inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl mt-1 w-full truncate text-slate-850">
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                          <span className="truncate">👤 {activeTx.studentName} ({activeTx.studentClass})</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Utility details for barcodes */}
                <div>
                  <dl className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono mb-4 border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-slate-400 block font-bold">SHTRIX-KOD:</span>
                      <span className="text-slate-700 font-bold">{book.barcode}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block font-bold">O'QILGAN:</span>
                      <span className="text-slate-700 font-bold">{book.borrowCount || 0} marta</span>
                    </div>
                  </dl>

                  {/* Main checkout trigger & individual delete action */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      {book.available ? (
                        <div className="w-full text-xs font-bold py-2.5 bg-emerald-50 text-emerald-800 border border-emerald-250 rounded-xl text-center font-sans">
                          Javonda bor (Mavjud)
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <div className="w-full text-xs font-bold py-2.5 bg-rose-50 text-rose-800 border border-rose-250 rounded-xl text-center font-sans">
                            Kutubxonadan olindi (Oldi)
                          </div>
                          {onReturnBook && (
                            <button
                              onClick={() => onReturnBook(book)}
                              className="w-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-705 py-1.5 rounded-lg text-center transition-all cursor-pointer inline-flex items-center justify-center gap-1 border border-slate-200"
                            >
                              Topshirish / Qaytarish
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {onDeleteBook && (
                      <button
                        onClick={() => {
                          if (confirm(`Rostdan ham "${book.title}" asarini kutubxonadan butunlay o'chirib tashlamoqchimisiz?`)) {
                            onDeleteBook(book.id);
                          }
                        }}
                        className="bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-700 hover:text-red-800 p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="Katalogdan o'chirish"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
