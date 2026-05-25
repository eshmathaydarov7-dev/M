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

// Extremely robust, crash-proof fetch wrapper that handles non-JSON, empty, or error responses gracefully.
async function safeFetchJson(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    
    let resultData: any = null;
    let text = "";
    try {
      text = await res.text();
    } catch {
      // ignore
    }

    if (contentType && contentType.includes("application/json") && text.trim() !== "") {
      try {
        resultData = JSON.parse(text);
      } catch (jsonErr) {
        console.error("JSON parsing error:", jsonErr);
      }
    }

    if (!res.ok) {
      const errorMessage = (resultData && resultData.error) || (resultData && resultData.message) || `Xatolik yuz berdi (Satus: ${res.status})`;
      throw new Error(errorMessage);
    }

    if (resultData !== null) {
      return resultData;
    }

    if (text.trim() === "") {
      return { success: true };
    }
    
    return { success: true, text };
  } catch (err: any) {
    console.error("Fetch request failed:", err);
    throw new Error(err.message || "Tarmoq ulanishida kutilmagan xatolik yuz berdi.");
  }
}

export default function App() {
  // Library States
  const [books, setBooks] = useState<Book[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Online Visitor & Multi-Computer Sync
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [clientId] = useState<string>(() => {
    let id = localStorage.getItem("library_visitor_client_id");
    if (!id || id.trim() === "") {
      id = "cl_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("library_visitor_client_id", id);
    }
    return id;
  });

  // Active Student State (Kiosk Session)
  const [activeStudentName, setActiveStudentName] = useState<string>("");
  const [activeStudentClass, setActiveStudentClass] = useState<string>("9-A");
  const [savedStudentName, setSavedStudentName] = useState<string>(() => {
    try {
      return localStorage.getItem("najot_saved_student_name") || "";
    } catch (e) {
      return "";
    }
  });
  const [savedStudentClass, setSavedStudentClass] = useState<string>(() => {
    try {
      return localStorage.getItem("najot_saved_student_class") || "9-A";
    } catch (e) {
      return "9-A";
    }
  });
  const [isStudentSessionActive, setIsStudentSessionActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem("najot_saved_student_active") === "true";
    } catch (e) {
      return false;
    }
  });

  // Google student authentication pop-up simulator states
  const [openGoogleAuthModal, setOpenGoogleAuthModal] = useState<boolean>(false);
  const [showGoogleManualInput, setShowGoogleManualInput] = useState<boolean>(false);
  const [googleEmailInput, setGoogleEmailInput] = useState<string>("");
  const [googleNameInput, setGoogleNameInput] = useState<string>("");
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  // Navigation Panel Mode
  const [viewMode, setViewMode] = useState<'kiosk' | 'admin'>('kiosk');
  
  // Security Modal Pincode lock
  const [openLockModal, setOpenLockModal] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("");
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);

  // Teacher password lock for adding books
  const [openTeacherModal, setOpenTeacherModal] = useState<boolean>(false);
  const [teacherPasswordInput, setTeacherPasswordInput] = useState<string>("");
  const [teacherPasswordError, setTeacherPasswordError] = useState<string | null>(null);

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

  // Local Custom Backup Registries to guarantee that user-added books/transactions are never lost on container resets
  const registerCustomBook = (book: any) => {
    try {
      const stored = localStorage.getItem("najot_custom_books");
      const currentList = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(currentList)) return;
      
      const exists = currentList.some((b: any) => String(b.barcode) === String(book.barcode));
      if (!exists) {
        currentList.push({
          id: String(book.barcode),
          title: book.title,
          author: book.author || "Noma'lum muallif",
          category: book.category || "new",
          barcode: String(book.barcode),
          publishedYear: book.publishedYear || new Date().getFullYear(),
          description: book.description || "Tavsif berilmagan.",
          available: book.available !== undefined ? book.available : true,
          borrowCount: book.borrowCount || 0,
          addedAt: book.addedAt || new Date().toISOString()
        });
        localStorage.setItem("najot_custom_books", JSON.stringify(currentList));
      }
    } catch (e) {
      console.error("Local register error:", e);
    }
  };

  const unregisterCustomBook = (id: string) => {
    try {
      const stored = localStorage.getItem("najot_custom_books");
      if (!stored) return;
      const currentList = JSON.parse(stored);
      if (!Array.isArray(currentList)) return;
      
      const updatedList = currentList.filter((b: any) => String(b.id) !== String(id) && String(b.barcode) !== String(id));
      localStorage.setItem("najot_custom_books", JSON.stringify(updatedList));
    } catch (e) {
      console.error("Local unregister error:", e);
    }
  };

  const registerCustomTransaction = (tx: any) => {
    try {
      const stored = localStorage.getItem("najot_custom_transactions");
      const currentList = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(currentList)) return;
      
      const idx = currentList.findIndex((t: any) => t.id === tx.id);
      if (idx > -1) {
        currentList[idx] = tx;
      } else {
        currentList.unshift(tx);
      }
      localStorage.setItem("najot_custom_transactions", JSON.stringify(currentList));
    } catch (e) {
      console.error("Local tx register error:", e);
    }
  };

  // Fetch full inventory & logs on load
  const loadLibraryData = async () => {
    try {
      setLoading(true);
      
      // Load custom user added books & transactions from client's localStorage backup
      let clientBooks: any[] = [];
      let clientTransactions: any[] = [];
      try {
        const storedBooks = localStorage.getItem("najot_custom_books");
        if (storedBooks) clientBooks = JSON.parse(storedBooks);
        const storedTxs = localStorage.getItem("najot_custom_transactions");
        if (storedTxs) clientTransactions = JSON.parse(storedTxs);
      } catch (err) {
        console.error("Local storage sync read error:", err);
      }

      // Automatically sync and recover data with the server database (POST sync payload)
      const data = await safeFetchJson(`/api/library/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientBooks, clientTransactions })
      });
      
      const serverBooks = data.books || [];
      const serverTransactions = data.transactions || [];
      if (typeof data.onlineCount === "number") {
        setOnlineCount(data.onlineCount);
      }
      
      if (serverBooks.length > 0) {
        setBooks(serverBooks);
        setTransactions(serverTransactions);
        localStorage.setItem("najot_books_backup", JSON.stringify(serverBooks));
        localStorage.setItem("najot_transactions_backup", JSON.stringify(serverTransactions));

        // Keep najot_custom_books in sync with server's actual availability
        try {
          const stored = localStorage.getItem("najot_custom_books");
          if (stored) {
            const list = JSON.parse(stored);
            if (Array.isArray(list)) {
              let customUpdated = false;
              list.forEach((b: any) => {
                const serverBook = serverBooks.find((sb: any) => String(sb.barcode) === String(b.barcode) || String(sb.id) === String(b.barcode));
                if (serverBook && b.available !== serverBook.available) {
                  b.available = serverBook.available;
                  customUpdated = true;
                }
              });
              if (customUpdated) {
                localStorage.setItem("najot_custom_books", JSON.stringify(list));
              }
            }
          }
        } catch (e) {
          console.error("Failed to sync custom books local availability:", e);
        }
      } else {
        // Fallback
        const localBooksStr = localStorage.getItem("najot_books_backup");
        const localTxsStr = localStorage.getItem("najot_transactions_backup");
        if (localBooksStr) {
          setBooks(JSON.parse(localBooksStr));
          setTransactions(localTxsStr ? JSON.parse(localTxsStr) : []);
        } else {
          setBooks(defaultBooks);
          setTransactions([]);
        }
      }
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || "Ulanishda xatolik yuz berdi.");
      // On connection error, load fallback data from localStorage
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
    // Auto sync frequently to guarantee real-time multi-device collaboration
    const interval = setInterval(loadLibraryData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle Google OAuth and Profile verification
  const handleGoogleSignIn = (name: string, email: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanName || !cleanEmail) return;
    if (!cleanEmail.includes("@")) {
      setGoogleAuthError("Iltimos, to'g'ri Google email (Gmail) manzili kiriting!");
      return;
    }

    setSavedStudentName(cleanName);
    setSavedStudentClass(activeStudentClass);
    setIsStudentSessionActive(true);
    setOpenGoogleAuthModal(false);

    try {
      localStorage.setItem("najot_saved_student_name", cleanName);
      localStorage.setItem("najot_saved_student_class", activeStudentClass);
      localStorage.setItem("najot_saved_student_active", "true");
    } catch (e) {}
    
    // Clear inputs
    setGoogleEmailInput("");
    setGoogleNameInput("");
    setShowGoogleManualInput(false);
    setGoogleAuthError(null);

    triggerDialog(
      "success",
      "Google Akkaunt Faol",
      `Tizimga muvaffaqiyatli kirdingiz! Foydalanuvchi: ${cleanName} (${cleanEmail}).`
    );
  };

  const handleEndStudentSession = () => {
    setSavedStudentName("");
    setSavedStudentClass("9-A");
    setActiveStudentName("");
    setIsStudentSessionActive(false);

    try {
      localStorage.removeItem("najot_saved_student_name");
      localStorage.removeItem("najot_saved_student_class");
      localStorage.removeItem("najot_saved_student_active");
    } catch (e) {}

    triggerDialog("info", "Sessiya Tugallandi", "O'quvchi Google hisobi kioskdan o'chirildi.");
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
    const input = adminPasswordInput.trim();
    if (input === "najot123" || input === "najot-ustozlar") {
      setIsAdminUnlocked(true);
      setViewMode('admin');
      setOpenLockModal(false);
      setAdminPasswordInput("");
      setAdminPasswordError(null);
    } else {
      setAdminPasswordError("Parol noto'g'ri! Iltimos, ma'muriy boshqaruv parolini qaytadan kiriting.");
    }
  };

  // Handle teacher password verification for adding books
  const handleVerifyTeacherPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const input = teacherPasswordInput.trim();
    if (input === "najot-ustozlar" || input === "najot123") {
      setOpenTeacherModal(false);
      setTeacherPasswordInput("");
      setTeacherPasswordError(null);
      
      // Let them add a book
      setScannerMode("add");
      setOpenScanner(true);
    } else {
      setTeacherPasswordError("Kiritilgan parol xato! Kitob qo'shish huquqi faqat ruxsat berilgan ustozlarga tegishli.");
    }
  };

  const handleLockAdminMode = () => {
    setIsAdminUnlocked(false);
    setViewMode('kiosk');
    triggerDialog("info", "Kiosk Qulflangan", "Foydalanuvchi rejimi to'liq qattiq rejimga cheklab qo'yildi.");
  };

  // Trigger Borrow Scan trigger
  const triggerBorrowScan = (book: Book) => {
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
          const result = await safeFetchJson(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          
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
        const addResult = await safeFetchJson("/api/library/add-book", {
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

        // Register custom-added book locally so it is permanently cached across container sessions
        registerCustomBook({
          title: qTitle,
          author: "Noma'lum muallif",
          category: "new",
          barcode: qBarcode,
          description: "Tezkor kitob olish tizimi orqali qoldirilgan qayd."
        });

        // 2. Immediately borrow it to this student
        const borrowResult = await safeFetchJson("/api/library/borrow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId: qBarcode,
            studentName: qStudent,
            studentClass: qClass
          })
        });

        if (borrowResult && borrowResult.transaction) {
          registerCustomTransaction(borrowResult.transaction);
        }

        triggerDialog(
          "success",
          "Kitob Muvaffaqiyatli Rasmiylashtirildi!",
          `"${qTitle}" (Shtrix-kod: ${qBarcode}) kitobi muvaffaqiyatli saqlandi va ${qStudent} (${qClass}) o'quvchisi nomiga rasmiylashtirildi.`
        );
        loadLibraryData();

      } catch (err: any) {
        const msg = String(err.message || "").toLowerCase();
        if (!msg.includes("qolmagan") && !msg.includes("band-qilingan") && !msg.includes("band qilingan") && !msg.includes("available")) {
          triggerDialog("error", "Tezkor olishda xatolik", err.message);
        }
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
        // Retrieve student name and class either from wizard form submission or fallback to active pre-saved session
        const sName = scannedData.quickBorrowData?.studentName || savedStudentName;
        const sClass = scannedData.quickBorrowData?.studentClass || savedStudentClass;

        if (!sName || !sName.trim()) {
          throw new Error("Iltimos, o'quvchi ism-familiyasini kiriting.");
        }

        const result = await safeFetchJson("/api/library/borrow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId: selectedBookForAction.id,
            studentName: sName,
            studentClass: sClass
          })
        });

        if (result && result.transaction) {
          registerCustomTransaction(result.transaction);
        }

        // Keep availability sync in custom storage
        try {
          const stored = localStorage.getItem("najot_custom_books");
          if (stored) {
            const list = JSON.parse(stored);
            const idx = list.findIndex((b: any) => String(b.id) === String(selectedBookForAction.id) || String(b.barcode) === String(selectedBookForAction.id));
            if (idx > -1) {
              list[idx].available = false;
              localStorage.setItem("najot_custom_books", JSON.stringify(list));
            }
          }
        } catch (e) {}

        // Synchronize and auto-save state for fluid kiosk experience
         if (!savedStudentName) {
           setSavedStudentName(sName);
           setSavedStudentClass(sClass);
           setIsStudentSessionActive(true);
           try {
             localStorage.setItem("najot_saved_student_name", sName);
             localStorage.setItem("najot_saved_student_class", sClass);
             localStorage.setItem("najot_saved_student_active", "true");
           } catch (e) {}
         }

        triggerDialog(
          "success",
          "Kitob Ro'yxatdan O'tkazildi!",
          `"${selectedBookForAction.title}" kitobi muvaffaqiyatli ${sName} (${sClass}) nomiga rasmiylashtirildi. Kitobni qaytarish muddati - 15 kun.`
        );
        loadLibraryData();

      } catch (err: any) {
        const msg = String(err.message || "").toLowerCase();
        if (!msg.includes("qolmagan") && !msg.includes("band-qilingan") && !msg.includes("band qilingan") && !msg.includes("available")) {
          triggerDialog("error", "Kitobni olishda xato", err.message);
        }
      } finally {
        setLoading(false);
        setSelectedBookForAction(null);
        setScannerMode(null);
      }
      return;
    }

    // 3. RETURN BOOK MODE FLOW (Handles both selected book return and general scanner/simulated returns)
    if (scannerMode === "return") {
      setLoading(true);
      try {
        const inputBarcode = scannedData.barcode?.trim();
        if (!inputBarcode) {
          throw new Error("Shtrix-kod aniqlanmadi.");
        }

        // 1. Identify which book is being returned
        let targetBook = selectedBookForAction;
        
        if (!targetBook) {
          // If no pre-selected book, find the book in catalog using barcode
          const found = books.find(b => String(b.barcode) === String(inputBarcode) || String(b.id) === String(inputBarcode));
          if (!found) {
            throw new Error(`Shtrix-kodi "${inputBarcode}" bo'lgan kitob kutubxona bazasida topilmadi. Iltimos, shtrix-kodni tekshiring yoki kitobni avval bazaga qo'shing.`);
          }
          targetBook = found;
        } else {
          // If a specific book was chosen for action, we enforce barcode matching
          const barcodeToCheck = scannedData.isImage 
            ? targetBook.barcode 
            : scannedData.barcode;

          if (barcodeToCheck !== targetBook.barcode) {
            triggerDialog(
              "error", 
              "Shtrix-kod mos kelmadi", 
              `Kechirasiz! Topshirilayotgan kitob "${targetBook.title}" bo'lishi kerak, ammo skanerda boshqa shtrix-kod aniqlandi.`
            );
            setLoading(false);
            return;
          }
        }

        // 2. Perform the server return API call
        const result = await safeFetchJson("/api/library/return", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId: targetBook.id })
        });

        if (result && result.transaction) {
          registerCustomTransaction(result.transaction);
        }

        // Keep availability sync in custom storage
        try {
          const stored = localStorage.getItem("najot_custom_books");
          if (stored) {
            const list = JSON.parse(stored);
            const idx = list.findIndex((b: any) => String(b.id) === String(targetBook.id) || String(b.barcode) === String(targetBook.id));
            if (idx > -1) {
              list[idx].available = true;
              localStorage.setItem("najot_custom_books", JSON.stringify(list));
            }
          }
        } catch (e) {}

        triggerDialog(
          "success",
          "Kitob Kutubxonaga Qabul Qilindi!",
          `Rahmat! "${targetBook.title}" kitobi muvaffaqiyatli elektron qaydnomadan qaytarildi va kutubxona javoniga joylandi.`
        );
        loadLibraryData();

      } catch (err: any) {
        triggerDialog("error", "Qaytarishda xatolik", err.message);
      } finally {
        setLoading(false);
        setSelectedBookForAction(null);
        setScannerMode(null);
      }
      return;
    }
  };

  // Callback to save new scanned book preview
  const saveNewBookToDatabase = async (finalBook: any) => {
    setLoading(true);
    try {
      const result = await safeFetchJson("/api/library/add-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalBook)
      });

      // Register custom-added book locally so it is permanently cached across container sessions
      registerCustomBook(finalBook);

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

  // Administration record manual book borrow loan
  const handleRecordLoan = async (loanData: { title: string; author: string; studentName: string; studentClass: string }) => {
    setLoading(true);
    try {
      const result = await safeFetchJson("/api/library/admin-record-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loanData)
      });
      
      if (result.success && result.transaction && result.book) {
        // Safe check and preserve locally so it is robust
        registerCustomBook(result.book);
        
        // Also add to custom local transactions backup
        try {
          const storedTxs = localStorage.getItem("najot_custom_transactions");
          let currentTxs = storedTxs ? JSON.parse(storedTxs) : [];
          currentTxs.unshift(result.transaction);
          localStorage.setItem("najot_custom_transactions", JSON.stringify(currentTxs));
        } catch (e) {}

        triggerDialog(
          "success",
          "Muvaffaqiyatli!",
          `"${loanData.title}" kitobini topshirish muvaffaqiyatli qayd qilindi!`
        );
        loadLibraryData();
        return { success: true, message: "Muvaffaqiyatli!" };
      }
      return { success: false, error: "Noma'lum xatolik yuz berdi." };
    } catch (err: any) {
      triggerDialog("error", "Kitob berishda xatolik yuz berdi", err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Administration backend reset
  const handleResetEntireDatabase = async () => {
    try {
      const result = await safeFetchJson("/api/library/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "najot123" })
      });
      
      // Reset local registries on global reset
      localStorage.removeItem("najot_custom_books");
      localStorage.removeItem("najot_custom_transactions");
      localStorage.removeItem("najot_books_backup");
      localStorage.removeItem("najot_transactions_backup");

      triggerDialog("success", "Ma'lumotlar Tozalandi", "Butun tizim dastlabki zavod kitoblari holatiga tozalandi!");
      loadLibraryData();
    } catch (err: any) {
      triggerDialog("error", "Xatolik", err.message);
    }
  };

  // Administration individual book deletion
  const handleDeleteBook = async (id: string) => {
    try {
      const result = await safeFetchJson(`/api/library/book/${id}`, { method: "DELETE" });
      
      // Unregister custom book locally to avoid re-syncing deleted entries
      unregisterCustomBook(id);

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
              <h1 className="font-display font-black text-2xl tracking-tight text-indigo-950 uppercase flex items-center sm:flex-row flex-wrap gap-2">
                najot-liblarion
                <span className="text-[10px] uppercase font-mono bg-indigo-50 text-indigo-700 font-bold tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-200 select-none">
                  Toliq Qulflangan Kiosk
                </span>
                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-bold font-mono text-[10px] tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-250 shadow-sm shrink-0 select-none">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {onlineCount} Kishim Onlayn
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
              onRecordLoan={handleRecordLoan}
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

                    {/* Student profile Google login form */}
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div className="md:col-span-2 space-y-3">
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
                            <label className="text-[10px] font-bold tracking-wider text-slate-555 block mb-1 uppercase font-sans">
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
                          type="button"
                          onClick={() => setOpenGoogleAuthModal(true)}
                          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs border border-slate-250 transition-all focus:ring-2 focus:ring-indigo-200 hover:shadow-md cursor-pointer active:scale-95 shadow-sm"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63y"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          Google Akkaunt orqali Kirish
                        </button>
                      </div>
                    </div>
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
                transactions={transactions}
                onBorrowBook={triggerBorrowScan}
                onReturnBook={triggerReturnScan}
                onAddBookClick={() => {
                  setOpenTeacherModal(true);
                }}
                onQuickBorrowClick={() => {
                  setScannerMode("quick_borrow");
                  setOpenScanner(true);
                }}
                onQuickReturnClick={() => {
                  setScannerMode("return");
                  setSelectedBookForAction(null);
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

      {/* (G) GOOGLE SIGN-IN MODAL POPUP (REAL OAUTH INTEGRATION SIMULATOR) */}
      {openGoogleAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-fadeIn">
            
            {/* Google Brand Logo Constructed with CSS */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1 font-display font-black text-2xl tracking-tight mb-1 select-none">
                <span className="text-blue-600">G</span>
                <span className="text-red-500">o</span>
                <span className="text-amber-500">o</span>
                <span className="text-blue-600">g</span>
                <span className="text-emerald-500">l</span>
                <span className="text-red-500">e</span>
              </div>
              <h3 className="font-display font-semibold text-lg text-slate-800">
                Hisobingizni tanlang
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Kutubxonadan kitob olish uchun faol Google akkauntdan foydalaning
              </p>
            </div>

            {/* Google error message if any */}
            {googleAuthError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs py-2 px-3 rounded-xl font-medium text-center">
                ⚠️ {googleAuthError}
              </div>
            )}

            {!showGoogleManualInput ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {/* 1. Default matching active developer/user email from metadata */}
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn("Eshmat Haydarov", "eshmathaydarov7@gmail.com")}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-indigo-300 p-3.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer active:scale-98"
                >
                  <div className="bg-indigo-600 text-white w-9 h-9 font-bold rounded-full flex items-center justify-center text-sm shadow-sm">
                    EH
                  </div>
                  <div className="flex-1 truncate">
                    <span className="font-bold text-xs text-slate-900 block leading-tight">Eshmat Haydarov (Siz)</span>
                    <span className="text-[10px] text-slate-500 block leading-none mt-0.5">eshmathaydarov7@gmail.com</span>
                  </div>
                  <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-250 px-2 py-0.5 rounded">
                    Tizim Ustasi
                  </span>
                </button>

                {/* 2. Pre-defined real student/school accounts */}
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn("Asilbek Mamatov", "asilbek.mamatov@gmail.com")}
                  className="w-full text-left bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-emerald-300 p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer active:scale-98"
                >
                  <div className="bg-emerald-600 text-white w-8 h-8 font-bold rounded-full flex items-center justify-center text-xs shadow-sm">
                    AM
                  </div>
                  <div className="flex-1 truncate">
                    <span className="font-bold text-xs text-slate-800 block">Asilbek Mamatov</span>
                    <span className="text-[10px] text-slate-500 block">asilbek.mamatov@gmail.com</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGoogleSignIn("Madina Qodirova", "madina.kodirova@gmail.com")}
                  className="w-full text-left bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-purple-300 p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer active:scale-98"
                >
                  <div className="bg-purple-600 text-white w-8 h-8 font-bold rounded-full flex items-center justify-center text-xs shadow-sm">
                    MQ
                  </div>
                  <div className="flex-1 truncate">
                    <span className="font-bold text-xs text-slate-800 block">Madina Qodirova</span>
                    <span className="text-[10px] text-slate-500 block">madina.kodirova@gmail.com</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGoogleSignIn("Nodir Alimov", "nodir.alimov@gmail.com")}
                  className="w-full text-left bg-slate-50/50 hover:bg-slate-50 border border-slate-200 hover:border-blue-300 p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer active:scale-98"
                >
                  <div className="bg-blue-600 text-white w-8 h-8 font-bold rounded-full flex items-center justify-center text-xs shadow-sm">
                    NA
                  </div>
                  <div className="flex-1 truncate">
                    <span className="font-bold text-xs text-slate-800 block">Nodir Alimov</span>
                    <span className="text-[10px] text-slate-500 block">nodir.alimov@gmail.com</span>
                  </div>
                </button>

                {/* 3. Add custom Google account input */}
                <button
                  type="button"
                  onClick={() => {
                    setShowGoogleManualInput(true);
                    setGoogleAuthError(null);
                  }}
                  className="w-full text-center border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 text-indigo-650 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  ➕ Boshqa Google hisobidan kirish...
                </button>
              </div>
            ) : (
              /* Custom Gmail validation form to add any Google account */
              <div className="space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-slate-600 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                      Google Akkaunt Emaili (Gmail) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="masalan: asror.ismat@gmail.com"
                      value={googleEmailInput}
                      onChange={(e) => setGoogleEmailInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                      Ism va Familiyangiz *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="masalan: Asror Ismatov"
                      value={googleNameInput}
                      onChange={(e) => setGoogleNameInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGoogleManualInput(false);
                      setGoogleAuthError(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors border border-slate-200"
                  >
                    Orqaga qaytish
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const email = googleEmailInput.trim();
                      const name = googleNameInput.trim();
                      if (!email || !name) {
                        setGoogleAuthError("Iltimos, email va ismingizni to'liq kiriting!");
                        return;
                      }
                      if (!email.toLowerCase().endsWith("@gmail.0com") && !email.includes("@")) {
                        setGoogleAuthError("Ushbu email Google hisobi emas (Gmail bo'lishi shart)!");
                        return;
                      }
                      handleGoogleSignIn(name, email);
                    }}
                    className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm shadow-indigo-100 cursor-pointer"
                  >
                    Akkauntni Tasdiqlash
                  </button>
                </div>
              </div>
            )}

            {/* Cancel/Close authentication modal buttons */}
            <div className="mt-4 border-t border-slate-150 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpenGoogleAuthModal(false);
                  setShowGoogleManualInput(false);
                  setGoogleAuthError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* (A) ADMIN UNLOCK MODAL POPUP */}
      {openLockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <h3 className="font-display font-black text-lg text-slate-900 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600 animate-pulse" />
              Tizimni qulfdan ochish
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed font-semibold">
              Boshqaruv boshqaruv paneliga va ma'muriyat bo'limiga kirish uchun parolni kiriting:
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

      {/* (A2) TEACHER AUTHENTICATION MODAL */}
      {openTeacherModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-fadeIn" id="teacher-auth-modal">
            <h3 className="font-display font-black text-lg text-slate-900 mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600 animate-pulse" />
              Ustoz paroli
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed font-semibold">
              Katalogga yangi kitoblar qo'shish huquqi faqat ustozlar uchun himoyalangan. Davom etish uchun maxsus parolingizni kiriting:
            </p>

            <form onSubmit={handleVerifyTeacherPassword} className="space-y-4">
              <input
                type="password"
                required
                placeholder="Parolni yozing..."
                value={teacherPasswordInput}
                onChange={(e) => setTeacherPasswordInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm text-center text-slate-800 font-semibold focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                autoFocus
              />

              {teacherPasswordError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg text-center font-medium">
                  {teacherPasswordError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpenTeacherModal(false);
                    setTeacherPasswordInput("");
                    setTeacherPasswordError(null);
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
              activeStudent={isStudentSessionActive ? { name: savedStudentName, class: savedStudentClass } : { name: savedStudentName || "", class: savedStudentClass || "9-A" }}
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
