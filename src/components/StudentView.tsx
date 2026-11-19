import React, { useState, useEffect, useMemo } from 'react';
import { Language, translations } from '../i18n/translations';
import { api, Book, Loan, UserSession, UniversityStudent } from '../services/api';
import {
  Search,
  BookOpen,
  CheckCircle,
  XCircle,
  CreditCard,
  Info,
  BookDown,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Calendar,
  X,
  ExternalLink,
  Tag,
  Building,
  Check,
} from 'lucide-react';
import { StudentCardModal } from './StudentCardModal';

interface StudentViewProps {
  lang: Language;
  currentUser: UserSession;
}

// Reusable Modern Book Cover with multi-source image resolution & thematic academic fallback
export const BookCoverImage: React.FC<{
  title: string;
  author: string;
  coverUrl?: string;
  isbn?: string;
  category?: string;
  className?: string;
}> = ({ title, author, coverUrl, isbn, category = '', className = 'w-full aspect-[3/4]' }) => {
  const [imgStage, setImgStage] = useState<number>(0);
  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';

  const urlsToTry = useMemo(() => {
    const list: string[] = [];
    if (coverUrl) list.push(coverUrl);
    if (cleanIsbn) {
      const ol = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
      const gb = `https://books.google.com/books/content?vid=isbn:${cleanIsbn}&printsec=frontcover&img=1&zoom=1`;
      if (!list.includes(ol)) list.push(ol);
      if (!list.includes(gb)) list.push(gb);
    }
    return list;
  }, [coverUrl, cleanIsbn]);

  const currentUrl = urlsToTry[imgStage];

  // Dynamic thematic gradient for fallback covers by category
  const themeGradient = useMemo(() => {
    const cat = category.toLowerCase();
    if (cat.includes('ia') || cat.includes('intelligence')) {
      return 'from-slate-950 via-purple-950 to-indigo-950 border-purple-800/40 text-purple-200';
    }
    if (cat.includes('réseau') || cat.includes('sécurité')) {
      return 'from-slate-950 via-sky-950 to-blue-950 border-sky-800/40 text-sky-200';
    }
    if (cat.includes('base') || cat.includes('donnée')) {
      return 'from-slate-950 via-teal-950 to-emerald-950 border-teal-800/40 text-teal-200';
    }
    if (cat.includes('math') || cat.includes('physique')) {
      return 'from-slate-950 via-blue-950 to-cyan-950 border-blue-800/40 text-blue-200';
    }
    if (cat.includes('roman') || cat.includes('littérature')) {
      return 'from-slate-950 via-amber-950 to-stone-900 border-amber-800/40 text-amber-200';
    }
    if (cat.includes('développement') || cat.includes('science')) {
      return 'from-slate-950 via-emerald-950 to-teal-950 border-emerald-800/40 text-emerald-200';
    }
    return 'from-slate-950 via-blue-950 to-indigo-950 border-blue-800/40 text-blue-200';
  }, [category]);

  if (currentUrl) {
    return (
      <div className={`relative overflow-hidden bg-slate-900 rounded-xl ${className} shadow-sm group-hover:shadow-md transition-shadow`}>
        {/* Book spine line effect */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/40 via-black/10 to-transparent z-10 pointer-events-none" />
        <img
          src={currentUrl}
          alt={title}
          loading="lazy"
          onError={() => setImgStage((prev) => prev + 1)}
          className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>
    );
  }

  // Elegant academic fallback cover
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${themeGradient} p-4 sm:p-5 flex flex-col justify-between text-white shadow-inner select-none border ${className}`}
    >
      {/* Spine highlight */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/50 via-black/20 to-transparent z-10" />

      <div className="flex items-center justify-between text-[10px] opacity-80">
        <span className="font-mono uppercase tracking-widest font-bold">Biblio USMBA</span>
        <BookOpen className="w-4 h-4 text-white/80" />
      </div>

      <div className="my-auto py-3 space-y-2">
        <h5 className="font-bold text-sm sm:text-base line-clamp-3 text-slate-100 leading-snug drop-shadow-sm font-display">
          {title}
        </h5>
        <p className="text-xs text-white/90 line-clamp-1 italic font-medium">
          {author}
        </p>
      </div>

      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70 font-mono">
        <span>Fès · FSDM</span>
        {cleanIsbn && <span>ISBN {cleanIsbn.slice(-4)}</span>}
      </div>
    </div>
  );
};

export const StudentView: React.FC<StudentViewProps> = ({ lang, currentUser }) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'catalog' | 'loans'>('catalog');
  const [books, setBooks] = useState<Book[]>([]);
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [borrowingBookId, setBorrowingBookId] = useState<string | null>(null);
  const [returningLoanId, setReturningLoanId] = useState<string | null>(null);

  // Selected book for Details Modal
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);

  // QR Student Card Modal
  const [showMyCardModal, setShowMyCardModal] = useState(false);
  const [myUnivCard, setMyUnivCard] = useState<UniversityStudent | null>(null);

  // Notice Banner
  const [notice, setNotice] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const showNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  const fetchBooks = async () => {
    try {
      const res = await api.getBooks();
      setBooks(res.books);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyLoans = async () => {
    try {
      const res = await api.getLoans(undefined, currentUser.id);
      setMyLoans(res.loans || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBooks(), fetchMyLoans()]).finally(() => setLoading(false));

    // Look up student details to show their official QR student card
    api.getUniversityStudents(currentUser.email)
      .then((res) => {
        if (res.students && res.students.length > 0) {
          setMyUnivCard(res.students[0]);
        } else {
          setMyUnivCard({
            id: currentUser.id,
            fullName: currentUser.name,
            massarCode: 'S13' + currentUser.id.slice(-6),
            cin: 'Z' + currentUser.id.slice(-5),
            filiere: 'Études Supérieures USMBA',
            email: currentUser.email,
            cardNumber: currentUser.cardNumber || 'USMBA-CARD',
            qrPayload: `USMBA-STUDENT:${currentUser.email}`,
          });
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Handle borrowing a book
  const handleBorrow = async (book: Book) => {
    if (book.availableCopies <= 0) {
      showNotice('error', t.bookNotAvailable);
      return;
    }

    setBorrowingBookId(book.id);
    try {
      const res = await api.borrowByStudent(book.id, currentUser.id);
      showNotice(
        'success',
        `${t.borrowSuccess} ${res.loan.dueDate}`
      );
      await Promise.all([fetchBooks(), fetchMyLoans()]);
      // Update selected modal book if open
      if (selectedBookForDetails?.id === book.id) {
        setSelectedBookForDetails({
          ...book,
          availableCopies: res.availableCopies,
        });
      }
    } catch (err: any) {
      showNotice('error', err.message || (lang === 'ar' ? 'فشلت عملية الاستعارة' : 'Échec de l’emprunt'));
    } finally {
      setBorrowingBookId(null);
    }
  };

  // Handle returning a book
  const handleReturn = async (loanId: string) => {
    setReturningLoanId(loanId);
    try {
      await api.confirmReturn(loanId);
      showNotice(
        'success',
        lang === 'ar'
          ? 'تمت إعادة الكتاب بنجاح وتسوية وضعيتك!'
          : 'Livre retourné avec succès ! Le stock d’exemplaires a été mis à jour.'
      );
      await Promise.all([fetchBooks(), fetchMyLoans()]);
    } catch (err: any) {
      showNotice('error', err.message || (lang === 'ar' ? 'فشلت عملية الإرجاع' : 'Échec du retour'));
    } finally {
      setReturningLoanId(null);
    }
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [books]);

  // Search strictly by Title or Author
  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return books.filter((b) => {
      const matchesQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === 'all' || b.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
  }, [books, searchQuery, selectedCategory]);

  const activeLoans = useMemo(() => {
    return myLoans.filter((l) => l.status === 'active');
  }, [myLoans]);

  const pastLoans = useMemo(() => {
    return myLoans.filter((l) => l.status === 'returned');
  }, [myLoans]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* 1. Welcoming Student Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>{lang === 'ar' ? 'فضاء الطالب الجامعي' : 'Espace Étudiant'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t.studentWelcome}, {currentUser.name}
            </h2>
            <div className="text-xs text-blue-200/90 flex flex-wrap items-center gap-3 pt-1">
              <span className="font-mono bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/60">
                {currentUser.email}
              </span>
              {currentUser.cardNumber && (
                <span className="font-mono bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-800/60">
                  {currentUser.cardNumber}
                </span>
              )}
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                {activeLoans.length} {lang === 'ar' ? 'استعارة جارية' : 'emprunt(s) actif(s)'}
              </span>
            </div>
          </div>

          {/* Action button to view digital QR card */}
          <button
            type="button"
            onClick={() => setShowMyCardModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-white text-blue-950 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all shadow-md self-start md:self-auto shrink-0"
          >
            <CreditCard className="w-4 h-4 text-blue-700" />
            <span>{lang === 'ar' ? 'عرض بطاقتي الجامعية (QR Code)' : 'Ma Carte Étudiant (QR Code)'}</span>
          </button>
        </div>
      </div>

      {/* Banner Notice (Confirmation / Erreur) */}
      {notice && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border shadow-2xs ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-semibold'
              : notice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-950 font-semibold'
              : 'bg-blue-50 border-blue-200 text-blue-950 font-medium'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="font-bold text-slate-400 hover:text-slate-700 px-2 text-base"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Navigation Tabs (Catalogue vs Mes Emprunts) */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'catalog'
              ? 'bg-white text-blue-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>{t.tabCatalog}</span>
          <span className="text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
            {books.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'loans'
              ? 'bg-white text-blue-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookDown className="w-4 h-4 text-indigo-600" />
          <span>{t.tabMyLoans}</span>
          {activeLoans.length > 0 && (
            <span className="text-[11px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-mono font-bold">
              {activeLoans.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. CATALOG TAB                                            */}
      {/* ========================================================= */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Prominent Search Bar & Category Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-11 pr-10 rtl:pr-11 rtl:pl-10 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Category Chips */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                <span className="text-slate-400 font-semibold shrink-0">
                  {lang === 'ar' ? 'التصنيف :' : 'Filtrer par :'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lang === 'ar' ? 'الكل' : 'Tous'} ({books.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Book Catalog Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {t.bookCatalog} ({filteredBooks.length})
              </h3>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                {lang === 'ar' ? 'جاري تحميل الكتب...' : 'Chargement du catalogue...'}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">
                  {lang === 'ar' ? 'لم يتم العثور على أي كتاب' : 'Aucun livre trouvé'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {lang === 'ar'
                    ? 'يرجى تجربة كلمات بحث أخرى أو مسح الفلاتر لعرض كافة الكتب'
                    : 'Modifiez votre recherche par titre ou auteur pour explorer les autres ouvrages.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBooks.map((book) => {
                  const isAvailable = book.availableCopies > 0;
                  const alreadyBorrowedByMe = activeLoans.some((l) => l.bookId === book.id);
                  const isBorrowing = borrowingBookId === book.id;

                  return (
                    <div
                      key={book.id}
                      className="group bg-white border border-slate-200 hover:border-blue-400/90 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xl transition-all duration-300 shadow-xs relative"
                    >
                      <div>
                        {/* Prominent Book Cover Image (Portrait 3:4 aspect ratio) */}
                        <div className="mb-3.5 relative">
                          <BookCoverImage
                            title={book.title}
                            author={book.author}
                            coverUrl={book.coverUrl}
                            isbn={book.isbn}
                            category={book.category}
                            className="w-full aspect-[3/4] shadow-sm rounded-xl"
                          />

                          {/* Category Badge overlay on cover */}
                          {book.category && (
                            <span className="absolute top-2.5 left-2.5 z-10 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-100 border border-white/20 shadow-xs truncate max-w-[80%]">
                              {book.category}
                            </span>
                          )}
                        </div>

                        {/* Status Badge & Copies count */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isAvailable ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{t.available} ({book.availableCopies} ex.)</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>{t.notAvailable}</span>
                              </>
                            )}
                          </span>

                          {book.publishedYear && (
                            <span className="text-[11px] text-slate-400 font-mono font-medium">
                              {book.publishedYear}
                            </span>
                          )}
                        </div>

                        {/* Title & Author */}
                        <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 mb-1 group-hover:text-blue-700 transition-colors font-display">
                          {book.title}
                        </h4>
                        <p className="text-xs text-slate-600 font-medium mb-3 line-clamp-1">
                          {book.author}
                        </p>
                      </div>

                      {/* Action buttons: Details & Direct Borrow */}
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Details Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => setSelectedBookForDetails(book)}
                            className="py-2 px-3 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{t.viewBookDetails}</span>
                          </button>

                          {/* Direct Borrow Action */}
                          {alreadyBorrowedByMe ? (
                            <div className="py-2 px-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] font-bold text-center flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                              <span>{lang === 'ar' ? 'مستعار' : 'Emprunté'}</span>
                            </div>
                          ) : isAvailable ? (
                            <button
                              type="button"
                              onClick={() => handleBorrow(book)}
                              disabled={isBorrowing}
                              className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                            >
                              <BookDown className="w-3.5 h-3.5 shrink-0" />
                              <span>{isBorrowing ? '...' : t.borrowBookBtn}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="py-2 px-3 bg-slate-100 text-slate-400 rounded-xl text-xs font-semibold cursor-not-allowed"
                            >
                              {t.notAvailable}
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
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MES EMPRUNTS TAB                                       */}
      {/* ========================================================= */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          {/* Active Loans Card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{t.tabMyLoans} ({activeLoans.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'ar'
                    ? 'الكتب المستعارة في ذمتك وتواريخ الاستحقاق المحددة لإرجاعها'
                    : 'Consultez les livres actuellement en votre possession et leurs dates limites de retour.'}
                </p>
              </div>
            </div>

            {activeLoans.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <span>{t.noActiveLoans}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">{t.bookTitleInput}</th>
                      <th className="py-3.5 px-4 font-bold">{t.loanDate}</th>
                      <th className="py-3.5 px-4 font-bold">{t.dueDate}</th>
                      <th className="py-3.5 px-4 font-bold">Statut</th>
                      <th className="py-3.5 px-4 font-bold text-right rtl:text-left">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeLoans.map((loan) => {
                      const isOverdue = loan.dueDate < todayStr;
                      const isReturning = returningLoanId === loan.id;

                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-4 font-medium text-slate-900">
                            <div className="font-bold text-slate-900">{loan.bookTitle}</div>
                            <div className="text-[11px] text-slate-500">{loan.bookAuthor}</div>
                          </td>
                          <td className="py-4 px-4 text-slate-600 font-mono">
                            {loan.loanDate}
                          </td>
                          <td className="py-4 px-4 font-mono font-bold">
                            <span className={isOverdue ? 'text-rose-600' : 'text-slate-800'}>
                              {loan.dueDate}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-500" />
                                <span>{t.overdueLoan}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3 h-3 text-blue-500" />
                                <span>{t.activeLoan}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right rtl:text-left">
                            <button
                              type="button"
                              onClick={() => handleReturn(loan.id)}
                              disabled={isReturning}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 transition-colors inline-flex items-center gap-1 disabled:opacity-50 text-xs shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{isReturning ? '...' : t.returnBookBtn}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Past Loans History */}
          {pastLoans.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  {t.borrowHistory} ({pastLoans.length})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px]">
                    <tr>
                      <th className="py-3 px-4 font-semibold">{t.bookTitleInput}</th>
                      <th className="py-3 px-4 font-semibold">{t.loanDate}</th>
                      <th className="py-3 px-4 font-semibold">Date de restitution</th>
                      <th className="py-3 px-4 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pastLoans.map((loan) => (
                      <tr key={loan.id} className="text-slate-500">
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {loan.bookTitle}
                        </td>
                        <td className="py-3 px-4 font-mono">{loan.loanDate}</td>
                        <td className="py-3 px-4 font-mono">{loan.returnedAt?.split('T')[0] || '-'}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            <span>{t.returnedLoan}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. BOOK DETAILS MODAL                                      */}
      {/* ========================================================= */}
      {selectedBookForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {t.bookDetailsModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookForDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="flex flex-col sm:flex-row gap-5">
                {/* Cover display */}
                <div className="w-32 sm:w-36 shrink-0 mx-auto sm:mx-0">
                  <BookCoverImage
                    title={selectedBookForDetails.title}
                    author={selectedBookForDetails.author}
                    coverUrl={selectedBookForDetails.coverUrl}
                    isbn={selectedBookForDetails.isbn}
                    className="w-full h-48 shadow-sm"
                  />
                </div>

                {/* Main details */}
                <div className="flex-1 space-y-2">
                  <h4 className="font-bold text-base text-slate-900 leading-snug">
                    {selectedBookForDetails.title}
                  </h4>
                  <p className="text-xs text-blue-700 font-semibold">
                    {selectedBookForDetails.author}
                  </p>

                  <div className="space-y-1 pt-2 text-xs text-slate-600 border-t border-slate-100">
                    {selectedBookForDetails.category && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-400">{t.category} :</span>
                        <strong className="text-slate-800">{selectedBookForDetails.category}</strong>
                      </div>
                    )}
                    {selectedBookForDetails.publisher && (
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-400">{t.publisher} :</span>
                        <span className="text-slate-800">{selectedBookForDetails.publisher}</span>
                      </div>
                    )}
                    {selectedBookForDetails.publishedYear && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-400">{t.year} :</span>
                        <span className="text-slate-800">{selectedBookForDetails.publishedYear}</span>
                      </div>
                    )}
                    {selectedBookForDetails.isbn && (
                      <div className="text-[11px] font-mono text-slate-500 pt-1">
                        ISBN : {selectedBookForDetails.isbn}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Synopsis / Description */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <span className="text-xs font-bold text-slate-800 block mb-1">
                  {t.synopsis}
                </span>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {selectedBookForDetails.description || t.noSynopsis}
                </p>
              </div>

              {/* Stock availability */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {t.copiesCount} :
                </span>
                <div>
                  <strong className={selectedBookForDetails.availableCopies > 0 ? 'text-blue-700 text-sm' : 'text-rose-600'}>
                    {selectedBookForDetails.availableCopies}
                  </strong>
                  <span className="text-slate-500"> / {selectedBookForDetails.totalCopies} exemplaires</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedBookForDetails(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Fermer
              </button>

              {activeLoans.some((l) => l.bookId === selectedBookForDetails.id) ? (
                <div className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
                  {lang === 'ar' ? 'أنت تستعير هذا الكتاب حالياً' : 'Déjà emprunté'}
                </div>
              ) : selectedBookForDetails.availableCopies > 0 ? (
                <button
                  type="button"
                  onClick={() => handleBorrow(selectedBookForDetails)}
                  disabled={borrowingBookId === selectedBookForDetails.id}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <BookDown className="w-4 h-4" />
                  <span>
                    {borrowingBookId === selectedBookForDetails.id
                      ? (lang === 'ar' ? 'جاري التسجيل...' : 'En cours...')
                      : t.borrowBookBtn}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-semibold cursor-not-allowed"
                >
                  {t.notAvailable}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Card QR Modal */}
      {showMyCardModal && myUnivCard && (
        <StudentCardModal
          student={myUnivCard}
          isOpen={showMyCardModal}
          onClose={() => setShowMyCardModal(false)}
          lang={lang}
        />
      )}
    </div>
  );
};
