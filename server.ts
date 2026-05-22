import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "library.json");

// Middleware to parse JSON payload (up to 50MB for camera captures)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper function to load the library database
const defaultData = {
  books: [
    {
      id: "9781111000101",
      title: "Zulmat ichra nur",
      author: "Mirkarim Osim",
      category: "uzbek",
      barcode: "9781111000101",
      publishedYear: 1956,
      description: "Alisher Navoiy va uning davridagi murakkab ijtimoiy-madaniy hayot haqidagi tarixiy qissa.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000102",
      title: "Qasoskorning oltin boshi",
      author: "Xudoyberdi To'xtaboyev",
      category: "uzbek",
      barcode: "9781111000102",
      publishedYear: 1985,
      description: "Muallifning o'zbek o'g'lonlari jasorati va vatanparvarlik tuhfasi haqidagi sarguzasht asari.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000103",
      title: "Bir mikrob kundaligi",
      author: "Sara Gurbuz O'zeren",
      category: "world",
      barcode: "9781111000103",
      publishedYear: 2018,
      description: "Bolalarga gigiyena va sog'lom hayot kechirish ko'nikmalarini tushuntiruvchi qiziqarli va ibratli hikoya.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000104",
      title: "Abdulfayz",
      author: "Abdurauf Fitrat",
      category: "uzbek",
      barcode: "9781111000104",
      publishedYear: 1924,
      description: "Buxoro amirligi inqirozi, saroy o'yinlari va xiyonatlar haqidagi tarixiy drama janridagi asar.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000105",
      title: "Quyoshli nur",
      author: "Raim Farhodiy",
      category: "uzbek",
      barcode: "9781111000105",
      publishedYear: 1978,
      description: "Samimiy, iliq, va bolalar dunyosining beg'uborligini madh etuvchi diltortar she'riy va nasriy to'plam.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000106",
      title: "Quyonlar saltanati",
      author: "Xudoyberdi To'xtaboyev",
      category: "uzbek",
      barcode: "9781111000106",
      publishedYear: 1971,
      description: "Ezgulik va yomonlik kurashi, adolat va mustaqillik g'oyalari quyonlar dunyosi misolida satirik tasvirlangan.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000107",
      title: "Oydinda yurgan odamlar",
      author: "Tog'ay Murod",
      category: "uzbek",
      barcode: "9781111000107",
      publishedYear: 1993,
      description: "O'zbek xalqining sodda, samimiy va fidoyi insonlari, er-xotin sevgi sadoqati hamda hayot sinovlari haqidegi sarguzasht asar.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000108",
      title: "Ruhlar isyoni",
      author: "Erkin Vohidov",
      category: "uzbek",
      barcode: "9781111000108",
      publishedYear: 1979,
      description: "Mashhur hind shoiri va mutafakkiri daxshatli taqdiri, inson erkinligi va hurriyat uchun bo'lgan qizg'in kurashlar falsafiy dostonidir.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000109",
      title: "Ezop masallari",
      author: "Aesop's fables",
      category: "world",
      barcode: "9781111000109",
      publishedYear: 2000,
      description: "Asrlar osha yashab kelayotgan, hayvonlar obrazi orqali insoniy munosabatlar, axloq va dono o'gitlarni o'rgatuvchi mashhur klassik to'plam.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000110",
      title: "Dono elze",
      author: "Aka-Uka grimlar",
      category: "world",
      barcode: "9781111000110",
      publishedYear: 1812,
      description: "Donolik va zukkolik haqidagi nemis xalq ertaklari namunalari.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000111",
      title: "Bo'ron kampir",
      author: "Aka-Uka grimlar",
      category: "world",
      barcode: "9781111000111",
      publishedYear: 1812,
      description: "Mehnatsevarlik, halollik va yomonlarga berilgan adolatli jazo haqidagi qiziqarli sehrli ertak.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000112",
      title: "Sariq devning o'limi",
      author: "Xudoyberdi To'xtaboyev",
      category: "uzbek",
      barcode: "9781111000112",
      publishedYear: 1973,
      description: "\"Sariq devni minib\" asarining mantiqiy davomi. Sarguzashtlar, ezgu hayot, va halol mehnatning g'alabasi ssenariysi.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000113",
      title: "Mungli ko'zlar",
      author: "Xudoyberdi To'xtaboyev",
      category: "uzbek",
      barcode: "9781111000113",
      publishedYear: 1989,
      description: "Tadbirkorlikka qiziqqan bolalar va oilaviy munosabatlar, mehnat va sabr haqidagi tarbiyaviy asar.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000114",
      title: "Jannati odamlar",
      author: "Xudoyberdi To'xtaboyev",
      category: "uzbek",
      barcode: "9781111000114",
      publishedYear: 1996,
      description: "Sofidillik, halollik va haqiqiy iymonli insonlar hayoti sarguzashtlar elementlari bilan bezatilgan tarbiyaviy asar.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000115",
      title: "Sariq devni minib",
      author: "Xudoyberdi To'xtaboyev",
      category: "uzbek",
      barcode: "9781111000115",
      publishedYear: 1968,
      description: "Hoshimjon ismli dangasa bo'lsa-da qalbband o'quvchining sehrli qalpoqcha va sariq dev ko'magidagi sarguzashtlari.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000116",
      title: "Yosh Xonim uchun odobnoma",
      author: "Key Vest, Jon Brijes, Brayan Ketris",
      category: "world",
      barcode: "9781111000116",
      publishedYear: 2012,
      description: "Yosh qizlar va yosh xonimlar uchun jamiyatda o'zini tutish, muomala madaniyati va odob-ahloq qoidalari qo'llanmasi.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000117",
      title: "Masnaviy",
      author: "Jaloliddin Rumiy",
      category: "world",
      barcode: "9781111000117",
      publishedYear: 1273,
      description: "Qalb dunyosi, panteizm va tasavvuf falsafasining eng buyuk she'riy durdonasi.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000118",
      title: "Ulug'bek xazinasi",
      author: "Odil Yoqubov",
      category: "uzbek",
      barcode: "9781111000118",
      publishedYear: 1973,
      description: "Mirzo Ulug'bek va uning shogirdlari, ilm yo'lidagi fojialar va buyuk madaniy merosimiz uchun kurash haqidagi tarixiy roman.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000119",
      title: "Koinot oqimlari",
      author: "Ayzek Azimov",
      category: "world",
      barcode: "9781111000119",
      publishedYear: 1952,
      description: "Ilmiy-fantastika sarguzasht asari. Koinot sirlari, sayyoralararo muloqotlar va kelajak texnologiyalari haqica qiziqarli roman.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000120",
      title: "Peshonasiga televizor yopishgan bola",
      author: "Xudoyberdi To'xtaboyev",
      category: "uzbek",
      barcode: "9781111000120",
      publishedYear: 1991,
      description: "Texnika taraqqiyoti, o'quvchilar hayoti va ularning mas'uliyati haqidagi satirik va sarguzasht asar.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000121",
      title: "Asrni qaritgan kun",
      author: "Chingiz Aytmatov",
      category: "world",
      barcode: "9781111000121",
      publishedYear: 1980,
      description: "Mankurtizm va xotirasini yo'qotgan jamiyat fojiasi hamda ota-bobolar an'anasi, insoniy qadr-qimmat himoyasidagi kurash.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    },
    {
      id: "9781111000122",
      title: "Yulduzlar mangu yonadi",
      author: "Tog'ay Murod",
      category: "uzbek",
      barcode: "9781111000122",
      publishedYear: 1974,
      description: "O'zbek polvonlari, kurash madaniyati, va qishloq ahlining milliy qadriyatlari haqidagi go'zal, samimiy qissa.",
      available: true,
      borrowCount: 0,
      addedAt: new Date().toISOString()
    }
  ],
  transactions: []
};

function getLibraryData() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.books)) {
        // If the array is empty, re-seed with custom default books permanently
        if (parsed.books.length === 0) {
          parsed.books = defaultData.books;
          saveLibraryData(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error("Ma'lumotlar bazasini o'qishda xatolik:", err);
  }
  // Only write default seed data on the very first start if library.json does not exist at all
  saveLibraryData(defaultData);
  return defaultData;
}

function saveLibraryData(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Ma'lumotlar bazasini saqlashda xatolik:", err);
  }
}

// ---------------- API ENDPOINTS -----------------

// 1. Get entire catalog & transaction logs
app.get("/api/library", (req, res) => {
  const data = getLibraryData();
  res.json(data);
});

// 2. Add or scan a new book
app.post("/api/library/add-book", (req, res) => {
  const { title, author, category, description, barcode, publishedYear } = req.body;

  if (!title || !author || !barcode) {
    return res.status(400).json({ error: "Sarlavha, muallif va shtrix-kod kiritilishi shart." });
  }

  const data = getLibraryData();
  const existingIndex = data.books.findIndex((b: any) => b.barcode === barcode || b.id === barcode);

  const newBook = {
    id: barcode,
    title,
    author,
    category: category || "new",
    barcode,
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
      borrowCount: data.books[existingIndex].borrowCount, // Keep borrow count
      available: data.books[existingIndex].available // Keep availability
    };
  } else {
    data.books.unshift(newBook);
  }

  saveLibraryData(data);
  res.json({ success: true, book: newBook, isNew: existingIndex === -1 });
});

// 3. Borrow a book (Scan and Log Student)
app.post("/api/library/borrow", (req, res) => {
  const { bookId, studentName, studentClass } = req.body;

  if (!bookId || !studentName || !studentClass) {
    return res.status(400).json({ error: "Kitob Id si, ism-familiya va sinf kiritilishi shart." });
  }

  const data = getLibraryData();
  const bookIndex = data.books.findIndex((b: any) => b.id === bookId || b.barcode === bookId);

  if (bookIndex === -1) {
    return res.status(404).json({ error: "Kechirasiz, ushbu id bilan kitob topilmadi." });
  }

  const book = data.books[bookIndex];
  if (!book.available) {
    return res.status(400).json({ error: `Kechirasiz, "${book.title}" kitobi hozirda band qilingan.` });
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

  data.transactions.unshift(newTx);
  saveLibraryData(data);

  res.json({ success: true, transaction: newTx, book });
});

// 4. Return a book (Scan and check back in)
app.post("/api/library/return", (req, res) => {
  const { bookId } = req.body;

  if (!bookId) {
    return res.status(400).json({ error: "Kitob Id si yoki shtrix-kodi talab qilinadi." });
  }

  const data = getLibraryData();
  const bookIndex = data.books.findIndex((b: any) => b.id === bookId || b.barcode === bookId);

  if (bookIndex === -1) {
    return res.status(404).json({ error: "Kechirasiz, ushbu kitob bazada topilmadi." });
  }

  const book = data.books[bookIndex];
  
  // Find active transaction for this book
  const txIndex = data.transactions.findIndex((t: any) => t.bookId === book.id && t.status === "active");

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
  res.json({ success: true, transaction: tx, book });
});

// 5. Delete/clear records (Admin controls)
app.post("/api/library/reset", (req, res) => {
  const { password } = req.body;
  if (password !== "najot123") {
    return res.status(403).json({ error: "Ruxsat berilmadi! Parol noto'g'ri." });
  }
  saveLibraryData(defaultData);
  res.json({ success: true, message: "Kutubxona ma'lumotlari boshlang'ich holatga qaytarildi!" });
});

// 6. Delete a single book
app.delete("/api/library/book/:id", (req, res) => {
  const bookId = req.params.id;
  const data = getLibraryData();
  const initialCount = data.books.length;
  data.books = data.books.filter((b: any) => b.id !== bookId && b.barcode !== bookId);
  
  if (data.books.length === initialCount) {
    return res.status(404).json({ error: "Kitob topilmadi." });
  }

  // Also clean up active transactions
  data.transactions = data.transactions.filter((t: any) => !(t.bookId === bookId && t.status === "active"));

  saveLibraryData(data);
  res.json({ success: true, message: "Kitob muvaffaqiyatli o'chirildi." });
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
