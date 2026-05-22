import React, { useState } from "react";
import { Search, BookOpen, Clock, CheckCircle, AlertTriangle, BookMarked, Layers, Sparkles, Trash } from "lucide-react";
import { Book } from "../types";

interface BookCatalogProps {
  books: Book[];
  onBorrowBook: (book: Book) => void;
  onReturnBook: (book: Book) => void;
  onAddBookClick: () => void;
  activeStudent?: { name: string; class: string } | null;
  onDeleteBook?: (bookId: string) => void;
  onQuickBorrowClick?: () => void;
}

export default function BookCatalog({ books, onBorrowBook, onReturnBook, onAddBookClick, activeStudent, onDeleteBook, onQuickBorrowClick }: BookCatalogProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'world' | 'uzbek' | 'new'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering books selection
  const filteredBooks = books.filter(book => {
    const matchesTab = activeTab === 'all' || book.category === activeTab;
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
          {onQuickBorrowClick && (
            <button
              onClick={onQuickBorrowClick}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-transform active:scale-95 cursor-pointer shadow-md shadow-emerald-105 w-full md:w-auto justify-center"
            >
              <BookOpen className="w-4 h-4 text-white" />
              Tezkor Kitob Olish
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
            placeholder="Kitob nomi, muallifi yoki shtrix-kodi bo'yicha qidiring (shtrix-kod yozish ixtiyoriy)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 placeholder-slate-400 transition-colors shadow-inner font-medium"
          />
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
          {filteredBooks.map((book) => (
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
                        Olib ketilgan
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
                      <button
                        onClick={() => onBorrowBook(book)}
                        className={`w-full text-xs font-bold py-2.5 rounded-xl text-center transition-all border ${
                          activeStudent 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 cursor-pointer hover:shadow-md hover:shadow-emerald-100 active:scale-95 px-2' 
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed px-2'
                        }`}
                        title={activeStudent ? 'Skanerlab kitobni olish' : 'Iltimos, avval ismingizni yozib guruhni tanlang'}
                      >
                        {activeStudent ? "Olish (Shtrix-kod)" : "Avval ro'yxatdan o'ting"}
                      </button>
                    ) : (
                      <button
                        onClick={() => onReturnBook(book)}
                        className="w-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 py-2.5 rounded-xl text-center transition-all cursor-pointer active:scale-95 px-2"
                      >
                        Topshirish (Qaytarish)
                      </button>
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
          ))}
        </div>
      )}
    </div>
  );
}
