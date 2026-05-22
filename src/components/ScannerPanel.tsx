import React, { useState } from "react";
import { QrCode, Sparkles, X, Hash, Plus, ArrowRight } from "lucide-react";
import { Book } from "../types";

interface ScannerPanelProps {
  mode: "borrow" | "return" | "add" | "quick_borrow";
  onScanComplete: (scannedData: { 
    isImage: boolean; 
    base64?: string; 
    barcode?: string; 
    manualData?: any;
    isQuickBorrow?: boolean;
    quickBorrowData?: {
      barcode: string;
      title: string;
      studentName: string;
      studentClass: string;
    }
  }) => void;
  onCancel: () => void;
  catalogBooks?: Book[];
  selectedBook?: Book | null;
  activeStudent?: { name: string; class: string } | null;
}

export default function ScannerPanel({ 
  mode, 
  onScanComplete, 
  onCancel, 
  catalogBooks = [],
  selectedBook = null,
  activeStudent = null 
}: ScannerPanelProps) {
  const [barcode, setBarcode] = useState<string>(selectedBook ? selectedBook.barcode : "");
  const [title, setTitle] = useState<string>(selectedBook ? selectedBook.title : "");
  const [studentName, setStudentName] = useState<string>(activeStudent ? activeStudent.name : "");
  const [studentClass, setStudentClass] = useState<string>(activeStudent ? activeStudent.class : "9-A");
  const [error, setError] = useState<string | null>(null);

  // Form states for manual full book entry (only in add mode)
  const [showFullForm, setShowFullForm] = useState<boolean>(true);
  const [author, setAuthor] = useState<string>("");
  const [category, setCategory] = useState<string>("uzbek");
  const [publishedYear, setPublishedYear] = useState<string>(new Date().getFullYear().toString());
  const [description, setDescription] = useState<string>("");

  // Submit typed barcode for standard return
  const handleSubmitBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) {
      setError("Iltimos, kitob shtrix-kodini kiriting.");
      return;
    }

    if (cleanBarcode.length < 3) {
      setError("Shtrix-kod juda qisqa. Kamida 3 ta belgi bo'lishi kerak.");
      return;
    }

    onScanComplete({ isImage: false, barcode: cleanBarcode });
  };

  // Submit quick borrow form (The multi-step inputs matching user intent)
  const handleQuickBorrowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let cleanBarcode = barcode.trim();
    const cleanTitle = title.trim();
    const cleanStudentName = studentName.trim();
    const cleanStudentClass = studentClass.trim();

    if (!cleanTitle) {
      setError("Iltimos, kitob nomini yozing.");
      return;
    }
    if (!cleanStudentName) {
      setError("Iltimos, o'quvchi ism-familiyasini yozing.");
      return;
    }

    // Auto-generate barcode if nothing was provided
    if (!cleanBarcode) {
      const parts = Math.floor(1000000 + Math.random() * 9000000).toString();
      cleanBarcode = `978999${parts}`;
    }

    // Pass everything to active transaction creator
    onScanComplete({
      isImage: false,
      isQuickBorrow: true,
      quickBorrowData: {
        barcode: cleanBarcode,
        title: cleanTitle,
        studentName: cleanStudentName,
        studentClass: cleanStudentClass
      }
    });
  };

  // Submit full book details manual form (Only in pure Add book flow)
  const handleSubmitFullForm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    const cleanAuthor = author.trim() || "Noma'lum muallif";
    let cleanBarcode = barcode.trim();

    if (!cleanTitle) {
      setError("Kitob nomi kiritilishi shart!");
      return;
    }

    // Auto-generate barcode if blank
    if (!cleanBarcode) {
      const parts = Math.floor(1000000 + Math.random() * 9000000).toString();
      cleanBarcode = `978999${parts}`;
    }

    onScanComplete({
      isImage: false,
      manualData: {
        title: cleanTitle,
        author: cleanAuthor,
        category,
        description: description.trim() || "Tavsif belgilanmagan.",
        publishedYear: parseInt(publishedYear) || new Date().getFullYear(),
        barcode: cleanBarcode
      }
    });
  };

  // Fast select barcode helper
  const handleFastSelect = (selected: Book) => {
    setError(null);
    setBarcode(selected.barcode);
    setTitle(selected.title);
    
    if (mode === "return") {
      onScanComplete({ isImage: false, barcode: selected.barcode });
    }
  };

  // Check if we are in borrow or quick_borrow mode
  const isBorrowLayout = mode === "borrow" || mode === "quick_borrow";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl p-6 max-w-2xl mx-auto animate-fadeIn" id="main-scanner-container">
      {/* Header section */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 text-indigo-700 p-2.5 rounded-xl border border-indigo-105">
            <QrCode className="w-6 h-6 text-indigo-600 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900 leading-snug">
              {isBorrowLayout 
                ? "Kitobni Qaydnomaga Yozish (Olish)" 
                : mode === "add" 
                  ? "Yangi Kitob Qo'shish" 
                  : "Kitob topshirish (Qaytarish)"}
            </h3>
            <p className="text-xs text-slate-500 font-semibold font-sans">
              {isBorrowLayout 
                ? "Shtrix-kodni yozing, keyin kitob nomi, sinfi va o'quvchi ismini qayd eting."
                : mode === "add" 
                  ? "Katalogga yangi shtrix-kodlar kiritish" 
                  : "Qaytariladigan kitob identifikatorini tasdiqlang."}
            </p>
          </div>
        </div>
        <button 
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-lg transition-colors border border-transparent hover:border-slate-250 cursor-pointer"
          title="Yopish"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Barcode Form Action Area */}
      {mode === "add" && showFullForm ? (
        /* Full Book Details Input Form for Admins */
        <form onSubmit={handleSubmitFullForm} className="space-y-4 mb-6 animate-fadeIn font-sans">
          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-800 mb-2 font-medium">
            Ushbu formani to'liq to'ldirish orqali yangi kitobni to'g'ridan-to'g'ri katalogni kengaytirish uchun kiritishingiz mumkin.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kitob nomi (Sarlavha) *</label>
              <input
                type="text"
                placeholder="Masalan: Sariq devni minib"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Muallif</label>
              <input
                type="text"
                placeholder="Masalan: Xudoyberdi To'xtaboyev"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bo'lim / Kategoriya</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-bold"
              >
                <option value="uzbek">O'zbek adabiyoti</option>
                <option value="world">Jahon adabiyoti</option>
                <option value="new">Zamon & Rivojlanish</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nashr yili</label>
              <input
                type="number"
                placeholder="Yil"
                value={publishedYear}
                onChange={(e) => setPublishedYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shtrix-kod raqami (Ixtiyoriy)</label>
              <input
                type="text"
                placeholder="Har qanday 13 xonali son (bo'sh qolsa, o'zimiz yaratamiz)"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kitob tavsifi</label>
            <textarea
              placeholder="Kitob haqida qisqacha ma'lumot (ixtiyoriy)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium"
            />
          </div>

          {error && <p className="text-red-600 text-xs font-semibold">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Kitobni qo'shish
            </button>
          </div>
        </form>
      ) : isBorrowLayout ? (
        /* =================== REQUESTED WIZARD BORROW FORM =================== */
        <form onSubmit={handleQuickBorrowSubmit} className="space-y-4 mb-6 font-sans">
          <div className="bg-indigo-50 border border-indigo-150 p-4 rounded-xl text-xs text-indigo-900 font-medium leading-relaxed">
            Kitob olish uchun avval shtrix-kodni kiriting (yoki quyidan tayyor kitobni tanlang), so'ngra kitob nomi, sinf (A yoki B) va o'quvchi ism-familiyasini tasdiqlab oling.
          </div>

          <div className="space-y-4">
            {/* Step 1: Shtrix kodni yozilsin */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                1. Shtrix-kod raqami (Ixtiyoriy)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Yozish ixtiyoriy (bo'sh qolsa, avtomatik yaratiladi)"
                  value={barcode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBarcode(val);
                    // Autofill name if it exists in present catalog books
                    const matchedBook = catalogBooks.find(b => b.barcode === val || b.id === val);
                    if (matchedBook) {
                      setTitle(matchedBook.title);
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm font-mono font-bold text-indigo-950 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-105 transition-all text-center placeholder-slate-350"
                  autoFocus
                />
              </div>
            </div>

            {/* Step 2: kitobni nomini yozilsin */}
            <div className="animate-fadeIn">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                2. Kitob Nomi (Asar sarlavhasi) *
              </label>
              <input
                type="text"
                required
                placeholder="Masalan: O'tkan kunlar"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-105 transition-all placeholder-slate-400"
              />
            </div>

            {/* Step 3: sinifi va ismnini yozib ketsin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider font-sans">
                  3. Sinfni Tanlang *
                </label>
                <div className="space-y-2">
                  <select
                    value={studentClass.split("-")[0] || "9"}
                    onChange={(e) => {
                      const currentLetter = studentClass.split("-")[1] || "A";
                      setStudentClass(`${e.target.value}-${currentLetter}`);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 cursor-pointer font-sans"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}-sinf
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2 font-sans" id="wizard-group-toggles">
                    {["A", "B"].map((letter) => {
                      const currentGrade = studentClass.split("-")[0] || "9";
                      const isSelected = (studentClass.split("-")[1] || "A") === letter;
                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => setStudentClass(`${currentGrade}-${letter}`)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                            isSelected
                              ? letter === "A"
                                ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                                : "bg-emerald-600 border-emerald-700 text-white shadow-sm"
                              : "bg-white border-slate-250 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {letter} ({currentGrade}-{letter})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  4. O'quvchi Ism-Familiyasi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Temur Malikov"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-105 transition-all placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {error && <p className="text-red-650 text-xs font-semibold text-center mt-2">{error}</p>}

          <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-transform active:scale-95 flex items-center gap-1.5 shadow-md shadow-emerald-100 cursor-pointer"
            >
              Kitobni Olish (Qaydnoma)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        /* Standard Single Barcode Input Form (for simple returns) */
        <form onSubmit={handleSubmitBarcode} className="mb-6 font-sans">
          <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl flex flex-col items-center justify-center space-y-4 mb-4">
            <div className="bg-indigo-50/70 p-3.5 rounded-full text-indigo-600 border border-indigo-100">
              <Hash className="w-7 h-7" />
            </div>
            
            <div className="text-center max-w-sm">
              <h4 className="font-bold text-slate-800 text-sm mb-1">Kitob shtrix-kodini kiriting</h4>
              <p className="text-xs text-slate-500 leading-normal font-medium px-4">
                Ushbu kitobni qaytarish va topshirish jarayonini yakunlash uchun kitobning shtrix-kod raqamini yozing.
              </p>
            </div>

            <div className="w-full max-w-sm">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Masalan: 9781111000010"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-center font-mono text-sm tracking-wider font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 placeholder-slate-300 transition-all uppercase"
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-red-650 text-xs font-semibold text-center mt-2">{error}</p>}
            </div>

            <div className="flex w-full max-w-sm gap-2">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                Tasdiqlash & Davom etish
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Simulator quick options for easy evaluation and interactive convenience */}
      <div className="border-t border-slate-200 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-emerald-650 animate-pulse" />
          <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Tezkor Tanlash (Shtrix-kod Simulyatori)
          </h4>
        </div>
        <p className="text-xs text-slate-550 mb-4 leading-relaxed font-semibold">
          Qo'shimcha qulaylik va test qilish uchun, quyidagi tayyor kitob shtrix-kodlaridan birini bir bosishda daxshatli osonlik bilan kiritishingiz mumkin:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {mode === "add" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setBarcode("9784444555001");
                  setTitle("Badiiy Asarlarning Saylanmasi");
                }}
                className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-emerald-400 p-2.5 rounded-xl flex justify-between items-center transition-all group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">Yangi Kitob: "Badiiy Asar"</div>
                  <div className="text-[10px] text-slate-550 font-medium font-mono">9784444555001 (Yangi shtrix-kod)</div>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 rounded font-mono font-bold">Tanlash</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onScanComplete({
                    isImage: false,
                    manualData: {
                      title: "O'zbek Xalq Ertaklari",
                      author: "Xalq ijodi",
                      category: "uzbek",
                      description: "Ko'p asrlar davomida xalqimiz orasida og'izdan-og'izga o'tib, sayqallanib kelgan ibratli va sehrli ertaklar to'plami.",
                      publishedYear: 2021,
                      barcode: "9781111000058"
                    }
                  });
                }}
                className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-emerald-400 p-2.5 rounded-xl flex justify-between items-center transition-all group cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">O'zbek Ertaklari</div>
                  <div className="text-[10px] text-slate-550 font-medium font-mono">9781111000058 (Katalogga bevosita)</div>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 rounded font-mono font-bold">Tanlash</span>
              </button>
            </>
          ) : (
            catalogBooks.map(book => {
              if (isBorrowLayout && !book.available) return null;
              if (mode === "return" && book.available) return null;

              return (
                <button
                  type="button"
                  key={book.id}
                  onClick={() => handleFastSelect(book)}
                  className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-emerald-400 p-2.5 rounded-xl flex justify-between items-center transition-all group cursor-pointer"
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-750 transition-colors truncate">{book.title}</div>
                    <div className="text-[10px] text-slate-500 font-mono font-bold">{book.author} — {book.barcode}</div>
                  </div>
                  <span className={`text-[9.5px] font-mono font-bold px-2 py-1 rounded border shrink-0 ${book.available ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-red-55 text-red-700 border-red-200/60'}`}>
                    {isBorrowLayout ? "Tanlash" : "Qaytarish"}
                  </span>
                </button>
              );
            }).filter(Boolean)
          )}
          
          {!mode && catalogBooks.length === 0 && (
            <p className="text-xs text-slate-400 col-span-2 text-center py-4 font-bold">Kutubxonada hozircha mos keladigan kitob topilmadi.</p>
          )}
        </div>
      </div>
    </div>
  );
}
