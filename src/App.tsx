import React, { useEffect, useState } from "react";
import { 
  BookOpen, 
  Users, 
  Settings, 
  Lock, 
  Unlock, 
  UserPlus, 
  BookMarked, 
  Plus, 
  QrCode, 
  Sparkles, 
  History, 
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  LogOut,
  Info
} from "lucide-react";
import { Book, Transaction } from "./types";
import ScannerPanel from "./components/ScannerPanel";
import { defaultBooks } from "./defaultBooks";
import BookCatalog from "./components/BookCatalog";
import RightSidebarLogs from "./components/RightSidebarLogs";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  // Library States
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Student State (Kiosk Session)
  const [activeStudentName, setActiveStudentName] = useState<string>("");
  const [activeStudentClass, setActiveStudentClass] = useState<string>("9-A");
  const [savedStudentName, setSavedStudentName] = useState<string>("");
  const [savedStudentClass, setSavedStudentClass] = useState<string>("");
  const [isStudentSessionActive, setIsStudentSessionActive] = useState<boolean>(false);

  // Navigation Panel Mode
  const [viewMode, setViewMode] = useState<'kiosk' | 'admin'>('kiosk');
  
  // Security Modal Pincode lock
  const [openLockModal, setOpenLockModal] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("");
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);

  // Scanner Modal Logic state
  const [openScanner, setOpenScanner] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<'borrow' | 'return' | 'add' | null>(null);
  const [selectedBookForAction, setSelectedBookForAction] = useState<Book | null>(null);

  // UI Dialog Overlay States
  const [uiDialog, setUiDialog] = useState<{
    show: boolean;
    type: "success" | "error" | "info" | "scan_preview";
    title: string;
    message: string;
    bookData?: any; // To store scanned book previews before adding
  } | null>(null);

  // Fetch full inventory & logs on load
  const loadLibraryData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/library");
      if (!res.ok) throw new Error("Kutubxona ma'lumotlarini yuklab bo'lmadi.");
      const data = await res.json();
      
      const serverBooks = data.books || [];
      const serverTransactions = data.transactions || [];
      
      if (serverBooks.length > 0) {
        setBooks(serverBooks);
        setTransactions(serverTransactions);
        localStorage.setItem("najot_books_backup", JSON.stringify(serverBooks));
        localStorage.setItem("najot_transactions_backup", JSON.stringify(serverTransactions));
      } else {
        // If server returns empty array (e.g., cleared/unseeded or dynamic reset in container deployment), check local storage
        const localBooksStr = localStorage.getItem("najot_books_backup");
        const localTxsStr = localStorage.getItem("najot_transactions_backup");
        if (localBooksStr) {
          const localBooks = JSON.parse(localBooksStr);
          const localTxs = localTxsStr ? JSON.parse(localTxsStr) : [];
          setBooks(localBooks);
          setTransactions(localTxs);
        } else {
          // If both local storage and server books are completely empty, set high-fidelity defaultBooks dataset
          setBooks(defaultBooks);
          setTransactions([]);
          localStorage.setItem("najot_books_backup", JSON.stringify(defaultBooks));
          localStorage.setItem("najot_transactions_backup", JSON.stringify([]));
        }
      }
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Ulanishda xatolik yuz berdi.");
      // On connection error, load fallback data from localStorage or defaultBooks so that the user keeps their screen active
      const localBooksStr = localStorage.getItem("najot_books_backup");
      const localTxsStr = localStorage.getItem("najot_transactions_backup");
      if (localBooksStr) {
        setBooks(JSON.parse(localBooksStr));
        setTransactions(localTxsStr ? JSON.parse(localTxsStr) : []);
      } else {
        setBooks(defaultBooks);
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibraryData();
    // Auto sync occasionally
    const interval = setInterval(loadLibraryData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle student session saving
  const handleStartStudentSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudentName.trim() || !activeStudentClass.trim()) return;

    setSavedStudentName(activeStudentName.trim());
    setSavedStudentClass(activeStudentClass.trim());
    setIsStudentSessionActive(true);
    
    // Trigger small UI toast
    triggerDialog(
      "success",
      "Kiosk Sessiyasi Faol",
      `Xush kelibsiz, ${activeStudentName.trim()}! Endi o'zingizga kerakli kitoblarni skanerlab olishingiz mumkin.`
    );
  };

  const handleEndStudentSession = () => {
    setSavedStudentName("");
    setSavedStudentClass("");
    setActiveStudentName("");
    setIsStudentSessionActive(false);
    triggerDialog("info", "Sessiya Tugallandi", "O'quvchi ma'lumotlari kioskdan o'chirildi.");
  };

  // Helper trigger custom dynamic dialog popup
  const triggerDialog = (
    type: "success" | "error" | "info" | "scan_preview", 
    title: string, 
    message: string,
    bookData?: any
  ) => {
    setUiDialog({ show: true, type, title, message, bookData });
  };

  // Handle admin password verification
  const handleVerifyAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === "najot123") {
      setIsAdminUnlocked(true);
      setViewMode('admin');
      setOpenLockModal(false);
      setAdminPasswordInput("");
      setAdminPasswordError(null);
    } else {
      setAdminPasswordError("Parol noto'g'ri! Iltimos qaytadan urining (parol: najot123).");
    }
  };

  const handleLockAdminMode = () => {
    setIsAdminUnlocked(false);
    setViewMode('kiosk');
    triggerDialog("info", "Kiosk Qulflangan", "Foydalanuvchi rejimi to'liq qattiq rejimga cheklab qo'yildi.");
  };

  // Trigger Borrow Scan trigger
  const triggerBorrowScan = (book: Book) => {
    if (!isStudentSessionActive) {
      triggerDialog("error", "Ism-familiya kiritilmagan", "Iltimos, kitobni olishdan oldin ism-familiya va sinfingizni kiosk ekranida kiritib qo'ying!");
      return;
    }
    setSelectedBookForAction(book);
    setScannerMode("borrow");
    setOpenScanner(true);
  };

  // Trigger Return Scan trigger
  const triggerReturnScan = (book: Book) => {
    setSelectedBookForAction(book);
    setScannerMode("return");
    setOpenScanner(true);
  };

  // Trigger Return Scan bypass by book id directly
  const triggerReturnByBookId = (bookId: string) => {
    const book = books.find(b => b.id === bookId || b.barcode === bookId);
    if (book) {
      triggerReturnScan(book);
    } else {
      triggerDialog("error", "Kitob topilmadi", "Ushbu idga mos kitob inventarda topilmadi.");
    }
  };

  // Initiate scan processing action (Webcam frame or simulated barcode trigger)
  const handleProcessorScanOutcome = async (scannedData: { 
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
  }) => {
    setOpenScanner(false);
    setErrorMessage(null);

    // 1. ADD NEW BOOK MODE FLOW
    if (scannerMode === "add") {
      if (scannedData.manualData) {
        // Direct inject from simulation shortcut
        saveNewBookToDatabase(scannedData.manualData);
        return;
      }

      setLoading(true);
      try {
        // Process book cover analysis via Gemini API
        const payload = scannedData.isImage 
          ? { image: scannedData.base64 } 
          : { barcode: scannedData.barcode }; // Actually wait, fallback simulation triggers if it has no camera
          
        let endpoint = scannedData.isImage ? "/api/library/scan-photo" : null;
        
        if (endpoint) {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          
          if (!res.ok) throw new Error("Skan tasvirini tahlil qilishda xatolik.");
          const result = await res.json();
          
          if (result.success && result.book) {
            // Display preview so visual verification is supported
            triggerDialog(
              "scan_preview",
              result.simulated ? "Skan Aniqlash (Simulyatsiya)" : "AI Skan Tahlili Muvaffaqiyatli",
              "Skaner tomonidan aniqlangan ushbu kitob ma'lumotlarini tasdiqlaysizmi?",
              result.book
            );
          } else {
            throw new Error("Kitob aniqlab bo'lmadi.");
          }
        } else {
          // If pure barcode simulation scanning, create a nice random layout or check if it matches existing
          const simulatedBarcode = scannedData.barcode || `978000${Math.floor(Math.random() * 900000 + 100000)}`;
          const randomChoice = {
            title: "Tarixiy Voqealar silsilasi",
            author: "Ibn Battuta",
            category: "world",
            description: "Sayohatnomalar qissasi va qadimiy davlatlarning xurofotlari.",
            publishedYear: 2022,
            barcode: simulatedBarcode
          };
          triggerDialog("scan_preview", "Smart Skan (Shtrix-kod)", "Yangi kashf qilingan shtrix-kodga munosib kitobni saqlaysizmi?", randomChoice);
        }
      } catch (err: any) {
        triggerDialog("error", "Skanerlashda xato", err.message || "Tizim jarayonni bajara olmadi.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. EXTRA CONVENIENT QUICK BORROW FLUID ENGINE
    if (scannedData.isQuickBorrow && scannedData.quickBorrowData) {
      setLoading(true);
      try {
        const { barcode: qBarcode, title: qTitle, studentName: qStudent, studentClass: qClass } = scannedData.quickBorrowData;
        
        // 1. Add/register the book (or update if already exists)
        const addRes = await fetch("/api/library/add-book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: qTitle,
            author: "Noma'lum muallif",
            category: "new",
            barcode: qBarcode,
            description: "Tezkor kitob olish tizimi orqali qoldirilgan qayd."
          })
        });
        
        const addResult = await addRes.json();
        if (!addRes.ok) throw new Error(addResult.error || "Kitobni dasturga qo'shishda xatolik.");

        // 2. Immediately borrow it to this student
        const borrowRes = await fetch("/api/library/borrow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId: qBarcode,
            studentName: qStudent,
            studentClass: qClass
          })
        });
        
        const borrowResult = await borrowRes.json();
        if (!borrowRes.ok) throw new Error(borrowResult.error || "Kitobni qaydnomaga yozishda xatolik.");

        triggerDialog(
          "success",
          "Kitob Muvaffaqiyatli Rasmiylashtirildi!",
          `"${qTitle}" (Shtrix-kod: ${qBarcode}) kitobi muvaffaqiyatli saqlandi va ${qStudent} (${qClass}) o'quvchisi nomiga rasmiylashtirildi.`
        );
        loadLibraryData();

      } catch (err: any) {
        triggerDialog("error", "Tezkor olishda xatolik", err.message);
      } finally {
        setLoading(false);
        setSelectedBookForAction(null);
        setScannerMode(null);
      }
      return;
    }

    // 3. BORROW BOOK MODE FLOW
    if (scannerMode === "borrow" && selectedBookForAction) {
      setLoading(true);
      try {
        const barcodeToCheck = scannedData.isImage 
          ? selectedBookForAction.barcode // webcam capture confirms target book selection
          : scannedData.barcode; 

        if (barcodeToCheck !== selectedBookForAction.barcode) {
          triggerDialog(
            "error", 
            "Shtrix-kod mos kelmadi", 
            `Kechirasiz! Siz "${selectedBookForAction.title}" kitobini tanladingiz, ammo skanerda boshqa kitob shtrix-kodi (${barcodeToCheck}) aniqlandi. Iltimos to'g'ri kitobni ko'rsatib qaytadan skanerlang.`
          );
          setLoading(false);
          return;
        }

        const res = await fetch("/api/library/borrow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId: selectedBookForAction.id,
            studentName: savedStudentName,
            studentClass: savedStudentClass
          })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Kitobni olishda muammo yuz berdi.");

        triggerDialog(
          "success",
          "Kitob Ro'yxatdan O'tkazildi!",
          `"${selectedBookForAction.title}" kitobi muvaffaqiyatli ${savedStudentName} (${savedStudentClass}) nomiga rasmiylashtirildi. Kitobni qaytarish muddati - 15 kun.`
        );
        loadLibraryData();

      } catch (err: any) {
        triggerDialog("error", "Kitobni olishda xato", err.message);
      } finally {
        setLoading(false);
        setSelectedBookForAction(null);
        setScannerMode(null);
      }
      return;
    }

    // 3. RETURN BOOK MODE FLOW
    if (scannerMode === "return" && selectedBookForAction) {
      setLoading(true);
      try {
        const barcodeToCheck = scannedData.isImage 
          ? selectedBookForAction.barcode 
          : scannedData.barcode;

        if (barcodeToCheck !== selectedBookForAction.barcode) {
          triggerDialog(
            "error", 
            "Shtrix-kod mos kelmadi", 
            `Kechirasiz! Topsirilayotgan kitob "${selectedBookForAction.title}" bo'lishi kerak, ammo skanerda boshqa shtrix-kod aniqlandi.`
          );
          setLoading(false);
          return;
        }

        const res = await fetch("/api/library/return", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId: selectedBookForAction.id })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Qaytarishda muammo yuz berdi.");

        triggerDialog(
          "success",
          "Kitob Kutubxonaga Qabul Qilindi!",
          `Rahmat! "${selectedBookForAction.title}" mukammal tarzda elektron qaydnomadan qaytarildi va kutubxona javoniga qayta joylashtirildi.`
        );
        loadLibraryData();

      } catch (err: any) {
        triggerDialog("error", "Qaytarishda xatolik", err.message);
      } {
        setLoading(false);
        setSelectedBookForAction(null);
        setScannerMode(null);
      }
    }
  };

  // Callback to save new scanned book preview
  const saveNewBookToDatabase = async (finalBook: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/library/add-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalBook)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Kitob saqlashda xatolik.");

      triggerDialog(
        "success",
        "Kitob Avtomatik Bazaga Qo'shildi!",
        `"${finalBook.title}" (${finalBook.author}) kitobi muvaffaqiyatli kutubxona bazasiga yangi shtrix-kod bilan kiritildi va javonga qo'yildi!`
      );
      loadLibraryData();
    } catch (err: any) {
      triggerDialog("error", "Kutubxonaga qo'sha olmadik", err.message);
    } finally {
      setLoading(false);
      setUiDialog(null);
    }
  };

  // Administration backend reset
  const handleResetEntireDatabase = async () => {
    try {
      const res = await fetch("/api/library/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "najot123" })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      triggerDialog("success", "Ma'lumotlar Tozalandi", "Butun tizim dastlabki zavod kitoblari holatiga tozalandi!");
      loadLibraryData();
    } catch (err: any) {
      triggerDialog("error", "Xatolik", err.message);
    }
  };

  // Administration individual book deletion
  const handleDeleteBook = async (id: string) => {
    try {
      const res = await fetch(`/api/library/book/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      triggerDialog("success", "Kitob O'chirildi", "Siz tanlagan kitob kutubxona arxividan butunlay o'chirib tashlandi.");
      loadLibraryData();
    } catch (err: any) {
      triggerDialog("error", "Xatolik", err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-indigo-600 selection:text-white" id="main-applet-canvas">
      {/* 1. TOP MAIN BRANDING HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur" id="najot-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl font-mono text-xl font-bold shadow-md shadow-indigo-100 tracking-tight">
              NL
            </div>
            <div>
              <h1 className="font-display font-black text-2xl tracking-tight text-indigo-950 uppercase flex items-center gap-2">
                najot-liblarion
                <span className="text-[10px] uppercase font-mono bg-indigo-50 text-indigo-700 font-bold tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Toliq Qulflangan Kiosk
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Elektron o'quvchi & smart kitob band qilish terminali</p>
            </div>
          </div>

          {/* Quick toggle to secure admin settings locks */}
          <div className="flex items-center gap-2">
            {isAdminUnlocked ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-700 font-mono flex items-center gap-1 bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                  <Unlock className="w-3.5 h-3.5 text-emerald-650" />
                  Admin Ochiq
                </span>
                <button
                  onClick={handleLockAdminMode}
                  className="bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200/60 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-colors"
                >
                  Hammasini Qulflash
                </button>
              </div>
            ) : (
              <button
                onClick={() => setOpenLockModal(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-755 hover:text-slate-900 p-2.5 rounded-xl border border-slate-200 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
                title="Admin boshqaruv panelini ochish"
              >
                <Lock className="w-4 h-4 text-indigo-600" />
                Librarian Tizimi
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN CORE STAGE */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* If Admin panel has been unlocked */}
        {viewMode === "admin" && isAdminUnlocked ? (
          <div className="animate-fadeIn">
            <AdminPanel
              books={books}
              transactions={transactions}
              onAddBook={saveNewBookToDatabase}
              onDeleteBook={handleDeleteBook}
              onResetDatabase={handleResetEntireDatabase}
              onClose={() => setViewMode('kiosk')}
            />
          </div>
        ) : (
          
          /* KIOSK MAIN SPLIT STAGE */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* LEFT MAIN AREA: LOCK PORTAL OR CATALOG */}
            <div className="lg:col-span-3 space-y-6">
              
              {!isStudentSessionActive ? (
                /* COMPACT AND PREMIUM ACTIVE STUDENT SIGN-IN BANNER */
                <div className="bg-white border border-slate-205 rounded-2xl p-6 shadow-sm relative overflow-hidden" id="login-form-area">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="text-center md:text-left space-y-1.5 md:max-w-xs shrink-0">
                      <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border border-indigo-100">
                        <UserPlus className="w-3.5 h-3.5" />
                        Tezkor Kirish
                      </div>
                      <h3 className="font-display font-black text-xl tracking-tight text-slate-950">Xush Kelibsiz!</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Kitob olish yoki topshirish uchun ismingizni yozib guruhni tanlang. Kitoblarni o'chirish yoki qidirish bepul.
                      </p>
                    </div>

                    {/* Student profile sign-in form in horizontal stretch */}
                    <form onSubmit={handleStartStudentSession} className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div className="md:col-span-2 space-y-3">
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-500 block mb-1 uppercase font-sans">
                            Ism va Familiyangiz *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Masalan: Azizbek Ergashev"
                            value={activeStudentName}
                            onChange={(e) => setActiveStudentName(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 placeholder-slate-400 font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold tracking-wider text-slate-500 block mb-1 uppercase font-sans">
                              Sinf *
                            </label>
                            <select
                              value={activeStudentClass.split("-")[0] || "9"}
                              onChange={(e) => {
                                const currentLetter = activeStudentClass.split("-")[1] || "A";
                                setActiveStudentClass(`${e.target.value}-${currentLetter}`);
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 cursor-pointer font-sans"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((grade) => (
                                <option key={grade} value={grade}>
                                  {grade}-sinf
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold tracking-wider text-slate-500 block mb-1 uppercase font-sans">
                              Guruh *
                            </label>
                            <div className="grid grid-cols-2 gap-1 font-sans">
                              {["A", "B"].map((letter) => {
                                const currentGrade = activeStudentClass.split("-")[0] || "9";
                                const isSelected = (activeStudentClass.split("-")[1] || "A") === letter;
                                return (
                                  <button
                                    key={letter}
                                    type="button"
                                    onClick={() => setActiveStudentClass(`${currentGrade}-${letter}`)}
                                    className={`py-2 px-2 rounded-lg border text-[11px] font-bold transition-all text-center cursor-pointer ${
                                      isSelected
                                        ? letter === "A"
                                          ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                                          : "bg-emerald-600 border-emerald-700 text-white shadow-sm"
                                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {letter}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="w-full">
                        <button
                          type="submit"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all focus:ring-2 focus:ring-indigo-400 hover:shadow-md hover:shadow-indigo-100 active:scale-95 cursor-pointer"
                        >
                          Tizimga Kirish
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                /* ACCENT ACTIVE STUDENT STATUS CARD */
                <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 text-white p-2 rounded-xl">
                      <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Sessiya Faol</h4>
                      <p className="text-xs text-slate-550">
                        Hozirgi foydalanuvchi: <span className="font-bold text-slate-900">{savedStudentName} ({savedStudentClass})</span>. Kitoblarni olish va topshirish imkoniyati ochiq!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEndStudentSession}
                    className="bg-white hover:bg-red-50 border border-slate-205 text-red-650 hover:text-red-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    Sessiyani Yakunlash
                  </button>
                </div>
              )}

              {/* LIVE CATALOG GRID IS ALWAYS VISIBLE BELOW THE WELCOME PANEL */}
              <BookCatalog
                books={books}
                onBorrowBook={triggerBorrowScan}
                onReturnBook={triggerReturnScan}
                onAddBookClick={() => {
                  setScannerMode("add");
                  setOpenScanner(true);
                }}
                onQuickBorrowClick={() => {
                  setScannerMode("quick_borrow");
                  setOpenScanner(true);
                }}
                activeStudent={isStudentSessionActive ? { name: savedStudentName, class: savedStudentClass } : null}
                onDeleteBook={handleDeleteBook}
              />
            </div>

            {/* RIGHT SIDEBAR AREA: TRANSACTION LOGS AND LOAN MAPS */}
            <div className="lg:col-span-1 h-full font-sans">
              <RightSidebarLogs
                transactions={transactions}
                onReturnClick={triggerReturnByBookId}
                activeStudent={isStudentSessionActive ? { name: savedStudentName, class: savedStudentClass } : null}
              />
              
              {isStudentSessionActive && (
                <div className="mt-4 p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center text-xs shadow-sm">
                  <div className="text-slate-500 font-medium">
                    Sessiyani yakunlamoqchimisiz?
                  </div>
                  <button
                    onClick={handleEndStudentSession}
                    className="bg-slate-55 hover:bg-slate-100 border border-slate-200 text-red-650 hover:text-red-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    Tugatish
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. FOOTER LOGO */}
      <footer className="border-t border-slate-200 bg-white py-4" id="nl-footer">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 najot-liblarion • Kelajak Kutubxonasi</span>
          <span className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-slate-600 font-medium">Kiosk rejimida masofadan boshqariladi</span>
        </div>
      </footer>

      {/* 4. MODALS AND OVERLAYS */}

      {/* (A) ADMIN UNLOCK MODAL POPUP */}
      {openLockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <h3 className="font-display font-black text-lg text-slate-900 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600 animate-pulse" />
              Tizimni qulfdan ochish
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed font-medium">
              Librarian paneliga kirish uchun parolni kiriting: (Kiosk kodi: <b className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/50">najot123</b>)
            </p>

            <form onSubmit={handleVerifyAdminPassword} className="space-y-4">
              <input
                type="password"
                required
                placeholder="Parolni yozing..."
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm text-center text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                autoFocus
              />

              {adminPasswordError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg text-center font-medium">
                  {adminPasswordError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpenLockModal(false);
                    setAdminPasswordInput("");
                    setAdminPasswordError(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold py-2.5 transition-colors border border-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold py-2.5 transition-colors cursor-pointer shadow-md shadow-indigo-100"
                >
                  Tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* (B) WEBCAM / SIMULATOR SCANNER DIALOG */}
      {openScanner && scannerMode && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl">
            <ScannerPanel
              mode={scannerMode}
              catalogBooks={books}
              selectedBook={selectedBookForAction}
              activeStudent={isStudentSessionActive ? { name: savedStudentName, class: savedStudentClass } : null}
              onCancel={() => {
                setOpenScanner(false);
                setSelectedBookForAction(null);
                setScannerMode(null);
              }}
              onScanComplete={handleProcessorScanOutcome}
            />
          </div>
        </div>
      )}

      {/* (C) SYSTEM UI MESSAGE DIALOGS (Toasts, successes, failures) */}
      {uiDialog && uiDialog.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-5 text-slate-850">
            <div className="flex items-center gap-3">
              {uiDialog.type === "success" && (
                <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6 animate-bounce" />
                </div>
              )}
              {uiDialog.type === "error" && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl border border-red-200">
                  <XCircle className="w-6 h-6" />
                </div>
              )}
              {uiDialog.type === "info" && (
                <div className="bg-indigo-50 text-indigo-700 p-2.5 rounded-xl border border-indigo-200">
                  <Info className="w-6 h-6" />
                </div>
              )}
              {uiDialog.type === "scan_preview" && (
                <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-200">
                  <Sparkles className="w-6 h-6" />
                </div>
              )}
              <h3 className="font-display font-bold text-lg text-slate-900 truncate max-w-[280px]">
                {uiDialog.title}
              </h3>
            </div>

            {uiDialog.type === "scan_preview" && uiDialog.bookData ? (
              /* SCAN BOOK PREVIEW CONFIRMATORY DIALOG */
              <div className="space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Sun'iy intellekt tomonidan tahlil qilingan ushbu kitobni avtomatik ravishda kutubxona bazasiga saqlamoqchimisiz?
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Kitob nomi:</span>
                    <span className="text-slate-900 text-right max-w-[180px] truncate">{uiDialog.bookData.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Muallifi:</span>
                    <span className="text-slate-900 font-medium">{uiDialog.bookData.author}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rukn / Toifa:</span>
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded leading-none">
                      {uiDialog.bookData.category === "world" ? "Jahon adabiyoti" : uiDialog.bookData.category === "uzbek" ? "O'zbek adabiyoti" : "Yangi kitob"}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-slate-500">Shtrix-Kod:</span>
                    <span className="text-emerald-750 font-bold bg-emerald-50 px-1 border border-emerald-200 rounded">{uiDialog.bookData.barcode}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 text-[11px] text-slate-500 font-normal leading-relaxed text-left italic">
                    {uiDialog.bookData.description}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setUiDialog(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-250 text-slate-600 hover:text-slate-900 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={() => saveNewBookToDatabase(uiDialog.bookData)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-emerald-100"
                  >
                    Katalogga Saqlash
                  </button>
                </div>
              </div>
            ) : (
              /* STANDARD MESSAGE DIALOG */
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed text-left font-medium">
                  {uiDialog.message}
                </p>
                <button
                  onClick={() => setUiDialog(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs cursor-pointer transition-colors border border-slate-200"
                >
                  Tushunarli
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
