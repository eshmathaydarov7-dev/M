import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { defaultBooks } from "./src/defaultBooks";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "library.json");

// Middleware to parse JSON payload (up to 50MB for camera captures)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper function to load the library database
const defaultData = {
  books: defaultBooks,
  transactions: []
};

// In-memory cache to guarantee fast reads and prevent read/write conflicts under concurrency
let cachedLibraryData: any = null;

// Real-time online visitor session tracking
const activeVisitors = new Map<string, number>();

// Periodic session cleanup
setInterval(() => {
  const now = Date.now();
  for (const [clientId, lastSeen] of activeVisitors.entries()) {
    if (now - lastSeen > 20000) { // 20 seconds timeout
      activeVisitors.delete(clientId);
    }
  }
}, 10000);

function getLibraryData() {
  if (cachedLibraryData) {
    return cachedLibraryData;
  }
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      if (content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.books)) {
          if (parsed.books.length === 0) {
            parsed.books = defaultData.books;
            saveLibraryData(parsed);
          }
          cachedLibraryData = parsed;
          return cachedLibraryData;
        }
      }
    }
  } catch (err) {
    console.error("Ma'lumotlar bazasini o'qishda xatolik:", err);
  }
  // Initialize with seed data on failure or if empty / doesn't exist
  cachedLibraryData = defaultData;
  saveLibraryData(defaultData);
  return defaultData;
}

function saveLibraryData(data: any) {
  cachedLibraryData = data;
  try {
    // Write atomically to prevent corrupted or empty reads due to simultaneous hits
    const tempPath = DB_PATH + ".tmp";
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempPath, DB_PATH);
  } catch (err) {
    console.error("Ma'lumotlar bazasini saqlashda xatolik:", err);
  }
}

// ---------------- API ENDPOINTS -----------------

// 1. Get entire catalog & transaction logs
app.get("/api/library", (req, res) => {
  try {
    const clientId = (req.query.clientId as string) || "unknown";
    if (clientId !== "unknown" && clientId.trim() !== "") {
      activeVisitors.set(clientId, Date.now());
    }
    
    const data = getLibraryData();
    res.json({
      ...data,
      onlineCount: Math.max(1, activeVisitors.size)
    });
  } catch (err: any) {
    res.status(500).json({ error: "Kutubxona kutishda muammo yuz berdi: " + err.message });
  }
});

// 1.5. Synchronize local client storage with server library data to recover any lost customized entries on container restarts
app.post("/api/library/sync", (req, res) => {
  try {
    const { clientBooks, clientTransactions } = req.body;
    const data = getLibraryData();
    
    if (!data || !Array.isArray(data.books)) {
      return res.status(500).json({ error: "Kutubxona ma'lumotlari yuklanmadi." });
    }
    
    let updated = false;

    // A. Merge Custom Books
    if (Array.isArray(clientBooks)) {
      clientBooks.forEach((cb: any) => {
        if (!cb.title || !cb.barcode) return;
        const exists = data.books.some((b: any) => String(b.barcode) === String(cb.barcode) || String(b.id) === String(cb.barcode));
        if (!exists) {
          data.books.unshift({
            id: String(cb.id || cb.barcode),
            title: cb.title,
            author: cb.author || "Noma'lum muallif",
            category: cb.category || "new",
            barcode: String(cb.barcode),
            publishedYear: cb.publishedYear ? parseInt(cb.publishedYear) : new Date().getFullYear(),
            description: cb.description || "Tavsif berilmagan.",
            available: cb.available !== undefined ? cb.available : true,
            borrowCount: cb.borrowCount || 0,
            addedAt: cb.addedAt || new Date().toISOString()
          });
          updated = true;
        } else {
          // Sync book availability if client has newer state
          const index = data.books.findIndex((b: any) => String(b.barcode) === String(cb.barcode) || String(b.id) === String(cb.barcode));
          if (index !== -1 && cb.available !== undefined && data.books[index].available !== cb.available) {
            data.books[index].available = cb.available;
            updated = true;
          }
        }
      });
    }

    // B. Merge Transactions
    if (Array.isArray(clientTransactions)) {
      if (!Array.isArray(data.transactions)) {
        data.transactions = [];
      }
      clientTransactions.forEach((ctx: any) => {
        if (!ctx.id || !ctx.bookId) return;
        const index = data.transactions.findIndex((t: any) => t.id === ctx.id);
        if (index === -1) {
          data.transactions.unshift(ctx);
          updated = true;
        } else {
          // Sync transaction status
          if (ctx.status !== data.transactions[index].status) {
            data.transactions[index].status = ctx.status;
            if (ctx.returnedAt) data.transactions[index].returnedAt = ctx.returnedAt;
            updated = true;
          }
        }
      });
    }

    if (updated) {
      saveLibraryData(data);
    }

    return res.json({
      success: true,
      books: data.books,
      transactions: data.transactions,
      onlineCount: Math.max(1, activeVisitors.size)
    });
  } catch (err: any) {
    console.error("Sync endpoint error:", err);
    return res.status(500).json({ error: "Sinxronizatsiya yuklanishida xatolik: " + err.message });
  }
});

// 2. Add or scan a new book
app.post("/api/library/add-book", (req, res) => {
  try {
    const { title, author, category, description, barcode, publishedYear } = req.body;

    if (!title || !author || !barcode) {
      return res.status(400).json({ error: "Sarlavha, muallif va shtrix-kod kiritilishi shart." });
    }

    const data = getLibraryData();
    if (!data || !Array.isArray(data.books)) {
      return res.status(500).json({ error: "Serverda ma'lumotlar yuklanmadi." });
    }

    const existingIndex = data.books.findIndex((b: any) => String(b.barcode) === String(barcode) || String(b.id) === String(barcode));

    const newBook = {
      id: String(barcode),
      title,
      author,
      category: category || "new",
      barcode: String(barcode),
      publishedYear: publishedYear ? parseInt(publishedYear) : new Date().getFullYear(),
      description: description || "Tavsif berilmagan.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // Update existing book
      data.books[existingIndex] = {
        ...data.books[existingIndex],
        ...newBook,
        borrowCount: data.books[existingIndex].borrowCount || 0, // Keep borrow count
        available: data.books[existingIndex].available !== undefined ? data.books[existingIndex].available : true // Keep availability
      };
    } else {
      data.books.unshift(newBook);
    }

    saveLibraryData(data);
    return res.json({ success: true, book: data.books[existingIndex >= 0 ? existingIndex : 0], isNew: existingIndex === -1 });
  } catch (err: any) {
    console.error("Add book error:", err);
    return res.status(500).json({ error: "Kitob qo'shish jarayonida ichki xatolik yuz berdi: " + err.message });
  }
});

// 3. Borrow a book (Scan and Log Student)
app.post("/api/library/borrow", (req, res) => {
  try {
    const { bookId, studentName, studentClass } = req.body;

    if (!bookId || !studentName || !studentClass) {
      return res.status(400).json({ error: "Kitob shtrix-kodi, o'quvchi ismi va sinfi kiritilishi shart." });
    }

    const data = getLibraryData();
    if (!data || !Array.isArray(data.books)) {
      return res.status(500).json({ error: "Kutubxona ma'lumotlari yuklanmadi." });
    }

    const bookIndex = data.books.findIndex((b: any) => String(b.id) === String(bookId) || String(b.barcode) === String(bookId));

    if (bookIndex === -1) {
      return res.status(404).json({ error: "Ushbu shtrix-kod yoki ID bilan kitob kutubxonamizda topilmadi." });
    }

    const book = data.books[bookIndex];
    if (!book.available) {
      return res.status(400).json({ error: `Kechirasiz! "${book.title}" kitobi hozirda band qilingan.` });
    }

    // Update book availability
    book.available = false;
    book.borrowCount = (book.borrowCount || 0) + 1;

    // Create active transaction
    const newTx = {
      id: `TX-${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      studentName,
      studentClass,
      borrowedAt: new Date().toISOString(),
      status: "active" as const
    };

    if (!Array.isArray(data.transactions)) {
      data.transactions = [];
    }
    data.transactions.unshift(newTx);
    saveLibraryData(data);

    return res.json({ success: true, transaction: newTx, book });
  } catch (err: any) {
    console.error("Borrow error:", err);
    return res.status(500).json({ error: "Kitob olishda ichki xatolik yuz berdi: " + err.message });
  }
});

// 4. Return a book (Scan and check back in)
app.post("/api/library/return", (req, res) => {
  try {
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: "Kitob shtrix-kodi shart." });
    }

    const data = getLibraryData();
    if (!data || !Array.isArray(data.books)) {
      return res.status(500).json({ error: "Kutubxona ma'lumotlari yuklanmadi." });
    }

    const bookIndex = data.books.findIndex((b: any) => String(b.id) === String(bookId) || String(b.barcode) === String(bookId));

    if (bookIndex === -1) {
      return res.status(404).json({ error: "Kechirasiz, ushbu kitob bazada topilmadi." });
    }

    const book = data.books[bookIndex];
    if (!Array.isArray(data.transactions)) {
      data.transactions = [];
    }
    
    // Find active transaction for this book
    const txIndex = data.transactions.findIndex((t: any) => String(t.bookId) === String(book.id) && t.status === "active");

    if (txIndex === -1) {
      // If no active transaction, just force make it available
      book.available = true;
      saveLibraryData(data);
      return res.json({ success: true, message: `"${book.title}" kitobi qaytarildi (active transaction bo'lmagani uchun to'g'ridan-to'g'ri qaytarildi).`, book });
    }

    const tx = data.transactions[txIndex];
    tx.status = "returned";
    tx.returnedAt = new Date().toISOString();
    
    book.available = true;

    saveLibraryData(data);
    return res.json({ success: true, transaction: tx, book });
  } catch (err: any) {
    console.error("Return error:", err);
    return res.status(500).json({ error: "Kitob qaytarishda ichki xatolik yuz berdi: " + err.message });
  }
});

// 5. Delete/clear records (Admin controls)
app.post("/api/library/reset", (req, res) => {
  try {
    const { password } = req.body;
    if (password !== "najot123") {
      return res.status(403).json({ error: "Ruxsat berilmadi! Parol noto'g'ri." });
    }
    saveLibraryData(defaultData);
    return res.json({ success: true, message: "Kutubxona ma'lumotlari boshlang'ich holatga qaytarildi!" });
  } catch (err: any) {
    return res.status(500).json({ error: "Kutubxonani tozalashda xatolik yuz berdi: " + err.message });
  }
});

// 6. Delete a single book
app.delete("/api/library/book/:id", (req, res) => {
  try {
    const bookId = req.params.id;
    const data = getLibraryData();
    if (!data || !Array.isArray(data.books)) {
      return res.status(500).json({ error: "Kutubxona ma'lumotlari yuklanmadi." });
    }

    const initialCount = data.books.length;
    data.books = data.books.filter((b: any) => String(b.id) !== String(bookId) && String(b.barcode) !== String(bookId));
    
    if (data.books.length === initialCount) {
      return res.status(404).json({ error: "Kitob topilmadi." });
    }

    if (Array.isArray(data.transactions)) {
      data.transactions = data.transactions.filter((t: any) => !(String(t.bookId) === String(bookId) && t.status === "active"));
    }

    saveLibraryData(data);
    return res.json({ success: true, message: "Kitob muvaffaqiyatli o'chirildi." });
  } catch (err: any) {
    return res.status(500).json({ error: "Kitobni o'chirishda xatolik yuz berdi: " + err.message });
  }
});

// 7. Core Intelligent Book Photo Scanner using Gemini API
app.post("/api/library/scan-photo", async (req, res) => {
  const { image } = req.body; // Expects base64 encoded picture from webcam

  if (!image) {
    return res.status(400).json({ error: "Skanerlash sharti sifatida rasm ma'lumoti yuborilishi shart." });
  }

  // Fallback Simulation Books in case Gemini API key is not present or errors out
  const fallbackSimulateBooks = [
    {
      title: "Dunyoning ishlari",
      author: "O'tkir Hoshimov",
      category: "uzbek",
      publishedYear: 1982,
      description: "Inson qalbi, onaning muqaddas siymosi va urushdan keyingi hayotning turli tashvishlari haqidagi taasurotli hikoyalar to'plami.",
      barcode: `978000${Math.floor(Math.random() * 900000 + 100000)}`
    },
    {
      title: "Sariq devni minib",
      author: "Xudoyberdi To'xtaboyev",
      category: "uzbek",
      publishedYear: 1968,
      description: "Hoshimjon ismli dangasa bo'lsa-da samimiy bolaning mo'jizaviy shlyapa va sariq dev yordamidagi qiziqarli va ibratli sarguzashtlari.",
      barcode: `978000${Math.floor(Math.random() * 900000 + 100000)}`
    },
    {
      title: "Alkimyogar",
      author: "Paulo Coelho",
      category: "world",
      publishedYear: 1988,
      description: "Andalusiyalik cho'pon Santyagoning o'z orzulari ortidan borib, hayotning asl mohiyati va qalb xazinasi haqida bilib olish hikoyasi.",
      barcode: `978000${Math.floor(Math.random() * 900000 + 100000)}`
    },
    {
      title: "Uch og'ayni",
      author: "Erich Maria Remarque",
      category: "world",
      publishedYear: 1936,
      description: "Birinchi jahon urushidan keyingi og'ir sharoitda taqdir yo'llari birlashgan uchta do'stning mustahkam aloqasi va sevgisi tasviri.",
      barcode: `978000${Math.floor(Math.random() * 900000 + 100000)}`
    },
    {
      title: "Amir Temur saltanati",
      author: "Yunus O'g'uz",
      category: "uzbek",
      publishedYear: 2012,
      description: "Sohibqiron Amir Temurning buyuk saltanat yaratish yo'lidagi mardligi, harbiy strategiyasi va tarixiy donishmandligi.",
      barcode: `978000${Math.floor(Math.random() * 900000 + 100000)}`
    },
    {
      title: "Raqamli odamlar",
      author: "James Clear & Mark Manson",
      category: "new",
      publishedYear: 2024,
      description: "Yangi avlod uchun mo'ljallangan axborot asrida diqqatni jamlash, stresslarni boshqarish hamda raqamli odatlarni boshqarish kitobi.",
      barcode: `978000${Math.floor(Math.random() * 900000 + 100000)}`
    }
  ];

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // If no key configured, simulate AI detection
    console.log("GEMINI_API_KEY mavjud emas. Simulyator orqali kitob aniqlanmoqda.");
    const randomBook = fallbackSimulateBooks[Math.floor(Math.random() * fallbackSimulateBooks.length)];
    return res.json({
      success: true,
      simulated: true,
      book: randomBook,
      note: "Eslatma: Server-side Gemini API kaliti ulanmaganligi sababli simulyator rejimi ishladi."
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // We clean the base64 prefix if it exists (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = image.includes("base64,") ? image.split("base64,")[1] : image;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: "image/jpeg",
            },
          },
          {
            text: `Ushbu kitob muqovasi (rasm)ni tahlil qiling va undagi kitob ma'lumotlarini aniqlang. 
Natijani quyidagi JSON sxemasiga qat'iy munosib ravishda o'zbek tilida qaytaring:
{
  "title": "Kitobning asl nomi",
  "author": "Muallif ismi",
  "category": "Kitob turiga qarab uchta Qiymatdan birini tanlang va faqat buni yozing: 'world' (agar jahon adabiyoti bo'lsa), 'uzbek' (agar o'zbek yozuvchilari asari bo'lsa), yoki 'new' (shun xorijiy, zamonaviy, o'zini o'zi rivojlantirish yoki yangi chiqqan asar bo'lsa)",
  "publishedYear": 2020, // nashr qilingan taxminiy yili
  "description": "Kitob haqida o'zbek tilida 1-2 jumlali qisqa qiziqarli sharh va uning mazmuni.",
  "barcode": "Xonlikda takrorlanmaydigan 13 xonali shtrix-kod, masalan, uning haqiqiy ISBN raqami yoki 978 bilan boshlanadigan tasodifiy raqam"
}
Diqqat: rasm sifatsiz yoki kitob ko'rinmagan bo'lsa ham hech qachon xato qaytarmasdan, rasmga mos kelishi mumkin bo'lgan tasodifiy qiziqarli, taniqli jahon yoki o'zbek asarlaridan birini o'ylab topib qaytaring, ammo JSON shaklini sira buzmang. Har doim to'liq to'g'ri JSON formatida javob bering.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            category: { type: Type.STRING, description: "Must be 'world', 'uzbek', or 'new'" },
            publishedYear: { type: Type.INTEGER },
            description: { type: Type.STRING },
            barcode: { type: Type.STRING, description: "13-digit barcode string" }
          },
          required: ["title", "author", "category", "description", "barcode"]
        }
      }
    });

    if (!response || !response.text) {
      throw new Error("Gemini hech qanday ma'lumot qaytarmadi.");
    }

    const bookData = JSON.parse(response.text.trim());
    return res.json({
      success: true,
      simulated: false,
      book: bookData
    });

  } catch (error: any) {
    console.error("Gemini scanning API error:", error);
    // Silent failover to random simulation book to secure best UX
    const randomBook = fallbackSimulateBooks[Math.floor(Math.random() * fallbackSimulateBooks.length)];
    return res.json({
      success: true,
      simulated: true,
      book: randomBook,
      note: "Gemini jarayonida xatolik yuz berdi, simulyatordan asar olindi: " + error.message
    });
  }
});

// Global error-handling middleware to guarantee we ALWAYS return clean JSON on API failures, never HTML code!
app.use("/api", (err: any, req: any, res: any, next: any) => {
  console.error("Express API error handler captured error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Tizim ichki xatoligi yuz berdi."
  });
});

// -------------- FRONTEND ROUTING & VITE MIDDLEWARE --------------

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Najot-Liblarion server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
