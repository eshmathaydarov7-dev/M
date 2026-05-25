import React, { useState } from "react";
import { Plus, Trash, RotateCcw, Database, ShieldAlert, Sparkles, BookOpen, AlertTriangle, Check, Users, Mail, UserCheck } from "lucide-react";
import { Book, Transaction } from "../types";

interface AdminPanelProps {
  books: Book[];
  transactions: Transaction[];
  onAddBook: (bookData: { title: string; author: string; category: 'world' | 'uzbek' | 'new'; description: string; barcode: string; publishedYear?: number }) => void;
  onDeleteBook: (bookId: string) => void;
  onResetDatabase: () => void;
  onClose: () => void;
}

export default function AdminPanel({ books, transactions, onAddBook, onDeleteBook, onResetDatabase, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'users'>('inventory');

  // Google accounts / Authorized users list loaded from localStorage
  const [authorizedEmails, setAuthorizedEmails] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("najot_authorized_emails");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return ["eshmathaydarov7@gmail.com", "kutubxonachi@najot.uz"];
  });

  const [newEmail, setNewEmail] = useState("");
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Manual add state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState<'world' | 'uzbek' | 'new'>("new");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [publishedYear, setPublishedYear] = useState("");
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);

  // Statistics calculations
  const totalBooks = books.length;
  const borrowedBooksCount = books.filter(b => !b.available).length;
  const availableBooksCount = totalBooks - borrowedBooksCount;
  const activeTxCount = transactions.filter(t => t.status === "active").length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !barcode) return;

    onAddBook({
      title,
      author,
      category,
      description,
      barcode,
      publishedYear: publishedYear ? parseInt(publishedYear) : undefined
    });

    setTitle("");
    setAuthor("");
    setBarcode("");
    setDescription("");
    setPublishedYear("");
    setAddSuccessMessage("Kitob muvaffaqiyatli qo'shildi!");
    setTimeout(() => setAddSuccessMessage(null), 3000);
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) return;
    
    // Strict domain check for real user email validation
    const hasValidGoogleDomain = cleanEmail.endsWith("@gmail.com") || cleanEmail.endsWith("@najot.uz");
    if (!cleanEmail.includes("@") || !hasValidGoogleDomain) {
      alert("Xatolik: Tizimga faqat tasdiqlangan haqiqiy insonlarning Google (@gmail.com) yoki Najot Talim (@najot.uz) akkauntlarini qo'shish ruxsat etiladi!");
      return;
    }
    
    if (authorizedEmails.includes(cleanEmail)) {
      alert("Ushbu email allaqachon ro'yxatda mavjud!");
      return;
    }

    const updated = [...authorizedEmails, cleanEmail];
    setAuthorizedEmails(updated);
    localStorage.setItem("najot_authorized_emails", JSON.stringify(updated));
    setNewEmail("");
    setEmailSuccess("Yangi Google hisobi muvaffaqiyatli qo'shildi!");
    setTimeout(() => setEmailSuccess(null), 3000);
  };

  const handleDeleteEmail = (email: string) => {
    if (confirm(`Rostdan ham "${email}" hisobining vakolatlarini bekor qilmoqchimisiz?`)) {
      const updated = authorizedEmails.filter(e => e !== email);
      setAuthorizedEmails(updated);
      localStorage.setItem("najot_authorized_emails", JSON.stringify(updated));
    }
  };

  const generateRandomBarcode = () => {
    const randomSuffix = Math.floor(Math.random() * 9000000000 + 1000000000);
    setBarcode(`978${randomSuffix}`);
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl max-w-5xl mx-auto space-y-6" id="admin-panel-container">
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/20 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-white">Librarian Ma'muriyat Tizimi</h3>
            <p className="text-xs text-slate-400">Elektron kutubxona inventarizatsiyasi va foydalanuvchilar boshqaruvi</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
        >
          Kiosk Rejimiga Qaytish
        </button>
      </div>

      {/* Modern Tabs Navigation Switcher */}
      <div className="flex border-b border-slate-800/80 gap-1 overflow-x-auto pb-1" id="admin-panel-tabs">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'inventory'
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50"
              : "text-slate-400 hover:text-white bg-slate-8s00/40 hover:bg-slate-800"
          }`}
        >
          📚 Kitoblar va Inventar
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'users'
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50"
              : "text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800"
          }`}
        >
          👤 Google Akkauntlar & Ruxsatnomalar
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Numerical Quick Analytics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-xs text-slate-400 block mb-1">Jami Kitoblar</span>
              <span className="text-3xl font-display font-extrabold text-white">{totalBooks}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-xs text-slate-400 block mb-1">Mavjud Kitoblar</span>
              <span className="text-3xl font-display font-extrabold text-emerald-400">{availableBooksCount}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-xs text-slate-400 block mb-1">Band Kitoblar</span>
              <span className="text-3xl font-display font-extrabold text-amber-400">{borrowedBooksCount}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl text-center">
              <span className="text-xs text-slate-400 block mb-1">Faol Bandliklar</span>
              <span className="text-3xl font-display font-extrabold text-indigo-400">{activeTxCount}</span>
            </div>
          </div>

          {/* Main Two-Column split tools layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Manual Add Form Column */}
            <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-xl h-fit space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Plus className="w-4 h-4 text-emerald-400" />
                <h4 className="font-semibold text-sm text-white">Yangi Kitob Qo'shish (Qo'lda)</h4>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono uppercase">Kitob Nomi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: O'tkan kunlar"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono uppercase">Muallif *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Abdulla Qodiriy"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono uppercase">Toifa</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="world">Jahon Adabiyoti</option>
                      <option value="uzbek">O'zbek Adabiyoti</option>
                      <option value="new">Yangi Kitoblar</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono uppercase">Nashr Yili</label>
                    <input
                      type="number"
                      placeholder="Masalan: 1925"
                      value={publishedYear}
                      onChange={e => setPublishedYear(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono uppercase">Shtrix-Kod (ISBN) *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="13-xonali raqamlar"
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={generateRandomBarcode}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 rounded-lg text-xs border border-slate-700 shrink-0"
                      title="Tasodifiy shtrix kod"
                    >
                      Generatsiya
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-mono uppercase">Tavsif / Rezyume</label>
                  <textarea
                    placeholder="Asar haqida qisqacha ma'lumot qoldiring..."
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Katalogga kiritish
                </button>

                {addSuccessMessage && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-[11px] rounded-lg text-center flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {addSuccessMessage}
                  </div>
                )}
              </form>
            </div>

            {/* Inventory Lookup and Delete List Table Column */}
            <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-xl lg:col-span-2 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-semibold text-sm text-white">Inventar Ro'yxati ({books.length})</h4>
                  </div>
                </div>

                {/* List scrollbox */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Kitob nomi & Muallifi</th>
                        <th className="py-2.5 px-3">Shtrix-Kod</th>
                        <th className="py-2.5 px-3 text-center">Xolati</th>
                        <th className="py-2.5 px-3 text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {books.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-slate-500">Kutubxona bo'sh.</td>
                        </tr>
                      ) : (
                        books.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-900/30">
                            <td className="py-3 px-3">
                              <div className="font-semibold text-white truncate max-w-[150px] lg:max-w-[220px]">{b.title}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{b.author}</div>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-300">{b.barcode}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                b.available ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              }`}>
                                {b.available ? "Mavjud" : "Olingan"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => {
                                  if (confirm(`Rostdan ham "${b.title}" asarini butunlay o'chirmoqchimisiz?`)) {
                                    onDeleteBook(b.id);
                                  }
                                }}
                                className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white p-1.5 rounded-lg transition-colors border border-red-500/10"
                                title="Inventardan o'chirish"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reset database risk controls */}
              <div className="bg-red-950/20 border border-red-900/35 p-3.5 rounded-xl space-y-2 mt-4">
                <div className="flex gap-2 text-xs font-semibold text-red-400 items-center">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Xavfli Hudud (Tizimni Tozalash)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Agar inventar ma'lumoti buzilgan bo'lsa yoki mashg'ulot tugatilgan bo'lsa, butun tizimli kitoblar ro'yxati va bandlash doirasini zavod parametrlariga qaytaring.
                </p>
                <button
                  onClick={() => {
                    if (confirm("Butun kutubxona bazasini tozalab dastlabki kitoblarga qaytarsinmi? Ushbu amal ortga qaytmaydi!")) {
                      onResetDatabase();
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Barcha ma'lumotlarni tozalash (Zavod holati)
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* GOOGLE ACCOUNTS AND PERMISSIONS MANAGEMENT TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Add Google Account form space */}
          <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-xl h-fit space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Plus className="w-4 h-4 text-indigo-400" />
              <h4 className="font-semibold text-sm text-white">Google Hisobi Qo'shish</h4>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Tizimga yangi Google hisobini kiritish orqali unga ma'murlik yoki ustozlik vakolatlarini bering. Ushbu foydalanuvchilar maxsus huquqlarga ega bo'ladi.
            </p>

            <form onSubmit={handleAddEmail} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono uppercase">Google Emaili (Gmail)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                Odam qo'shish
              </button>

              {emailSuccess && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-950/50 text-emerald-400 text-[11px] rounded-lg text-center flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {emailSuccess}
                </div>
              )}
            </form>

            {/* Real Staff Template Recommendations */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 space-y-3 font-sans">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Tasdiqlangan Shaxslarni qo'shish:</span>
              <div className="space-y-2">
                {[
                  { email: "shaxlo.salimova@najot.uz", name: "Shahlo Salimova (Kutubxonachi)" },
                  { email: "sherzod.mamatov@najot.uz", name: "Sherzod Mamatov (O'qituvchi)" },
                  { email: "k.yordamchi@najot.uz", name: "Ilyosbek Nozimiv (Yordamchi)" }
                ].map(staff => {
                  const isAdded = authorizedEmails.includes(staff.email);
                  return (
                    <div key={staff.email} className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/55 text-[11px]">
                      <div className="truncate pr-1">
                        <span className="text-white font-bold block leading-tight text-xs">{staff.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{staff.email}</span>
                      </div>
                      {!isAdded ? (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...authorizedEmails, staff.email];
                            setAuthorizedEmails(updated);
                            localStorage.setItem("najot_authorized_emails", JSON.stringify(updated));
                            setEmailSuccess(`"${staff.name}" Google hisobi ro'yxatga muvaffaqiyatli qo'shildi!`);
                            setTimeout(() => setEmailSuccess(null), 3000);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95"
                        >
                          Qo'shish
                        </button>
                      ) : (
                        <span className="text-emerald-500 font-bold text-[10px] whitespace-nowrap">Faol ✔</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Authorized Users List Column */}
          <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-xl lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="font-semibold text-sm text-white">Vakolatli Foydalanuvchilar ({authorizedEmails.length})</h4>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed md:max-w-xl pb-1">
              Quyidagi ro'yxatda keltirilgan har bir vakolatli Google akkaunti tizim doirasida boshqaruv, tozalash va inventarlarni tahrirlash imkoniyatlaridan to'liq foydalana oladi.
            </p>

            <div className="divide-y divide-slate-800/50">
              {authorizedEmails.map((email) => (
                <div key={email} className="flex items-center justify-between py-3 hover:bg-slate-900/25 px-2.5 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-xs font-black text-white uppercase shadow-sm">
                      {email.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white font-mono">{email}</div>
                      <div className="text-[10px] text-indigo-400 font-semibold mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full inline-block animate-ping"></span>
                        Boshqaruvchi Ma'mur
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEmail(email)}
                    className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/10"
                    title="Vakolatni bekor qilish"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
