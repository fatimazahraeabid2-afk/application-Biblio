import React, { useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import {
  api,
  Book,
  Loan,
  StudentItem,
  UniversityStudent,
  OverdueSummary,
  EmailLogItem,
} from '../services/api';
import {
  LayoutDashboard,
  Clock,
  UserPlus,
  BookDown,
  RotateCcw,
  BookOpen,
  Users,
  Database,
  Search,
  CheckSquare,
  Square,
  Send,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Sparkles,
  Info,
  Camera,
  CreditCard,
  QrCode,
  Mail,
  FileText,
  X,
  Shield,
  ArrowRight,
  Check,
  Smartphone,
  Eye,
} from 'lucide-react';
import { QrCodeScannerModal } from './QrCodeScannerModal';
import { StudentCardModal } from './StudentCardModal';
import { BookCoverImage } from './StudentView';

interface AdminViewProps {
  lang: Language;
}

export const AdminView: React.FC<AdminViewProps> = ({ lang }) => {
  const t = translations[lang];

  // Active Tab: 7 core requested rubriques + 1 complementary (univ_db)
  type AdminTab =
    | 'dashboard'
    | 'register_student'
    | 'students_list'
    | 'books'
    | 'loans'
    | 'returns'
    | 'retards_warnings'
    | 'univ_db';

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'register' | 'loan' | 'return' | null>(null);

  // Student Card Modal
  const [cardModalStudent, setCardModalStudent] = useState<UniversityStudent | null>(null);

  // Common notification banner
  const [bannerNotice, setBannerNotice] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const showBanner = (type: 'success' | 'error' | 'info', text: string) => {
    setBannerNotice({ type, text });
    setTimeout(() => {
      setBannerNotice((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  // ----------------------------------------------------
  // 1. DASHBOARD OVERDUE STATE (Section 11 & 12)
  // ----------------------------------------------------
  const [overdueSummary, setOverdueSummary] = useState<OverdueSummary | null>(null);
  const [selectedList1Ids, setSelectedList1Ids] = useState<string[]>([]);
  const [selectedList2Ids, setSelectedList2Ids] = useState<string[]>([]);
  const [emailSending, setEmailSending] = useState(false);

  const loadDashboard = async () => {
    try {
      const summary = await api.getOverdueSummary();
      setOverdueSummary(summary);
    } catch (err) {
      console.error(err);
    }
  };

  // Email Logs State
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [selectedPreviewLog, setSelectedPreviewLog] = useState<EmailLogItem | null>(null);

  const loadEmailLogs = async () => {
    try {
      const res = await api.getEmailLogs();
      setEmailLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // 2. INSCRIRE UN ÉTUDIANT (Section 5)
  // ----------------------------------------------------
  const [regFullName, setRegFullName] = useState('');
  const [regMassarCode, setRegMassarCode] = useState('');
  const [regCin, setRegCin] = useState('');
  const [regFiliere, setRegFiliere] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCardNumber, setRegCardNumber] = useState('');
  const [regQrPayload, setRegQrPayload] = useState('');
  const [regPassword, setRegPassword] = useState('etudiant123');
  const [regManualSearch, setRegManualSearch] = useState('');

  // ----------------------------------------------------
  // 3. ENREGISTRER UN EMPRUNT (Section 9)
  // ----------------------------------------------------
  const [loanIdentifiedStudent, setLoanIdentifiedStudent] = useState<any | null>(null);
  const [loanSelectedBookId, setLoanSelectedBookId] = useState('');
  const [loanDurationDays, setLoanDurationDays] = useState<number>(14);

  // ----------------------------------------------------
  // 5. ENREGISTRER UN RETOUR (Section 10)
  // ----------------------------------------------------
  const [returnIdentifiedStudent, setReturnIdentifiedStudent] = useState<any | null>(null);
  const [returnActiveLoans, setReturnActiveLoans] = useState<Loan[]>([]);

  // ----------------------------------------------------
  // 6. GESTION DES LIVRES (Section 7)
  // ----------------------------------------------------
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTitleQuery, setSearchTitleQuery] = useState('');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchResultMsg, setOnlineSearchResultMsg] = useState<string | null>(null);

  // Book Add/Edit Form State
  const [formBookId, setFormBookId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formIsbn, setFormIsbn] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formPublisher, setFormPublisher] = useState('');
  const [formCopies, setFormCopies] = useState<number>(3);
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const loadBooks = async () => {
    try {
      const res = await api.getBooks();
      setBooks(res.books);
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // 7. LISTE DES ÉTUDIANTS (Section 6)
  // ----------------------------------------------------
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const loadStudents = async () => {
    try {
      const res = await api.getStudents();
      setStudents(res.students);
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // 8. BASE UNIVERSITAIRE FICTIVE (Section 4)
  // ----------------------------------------------------
  const [univStudents, setUnivStudents] = useState<UniversityStudent[]>([]);
  const [univSearchQuery, setUnivSearchQuery] = useState('');

  const loadUnivStudents = async () => {
    try {
      const res = await api.getUniversityStudents(univSearchQuery);
      setUnivStudents(res.students);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadBooks();
    loadStudents();
    loadUnivStudents();
    loadEmailLogs();
  }, []);

  useEffect(() => {
    loadUnivStudents();
  }, [univSearchQuery]);

  // QR SCAN SUCCESS DISPATCHER
  const handleQrScanSuccess = async (qrPayload: string) => {
    if (scannerTarget === 'register') {
      try {
        const res = await api.lookupUniversityStudentByQr(qrPayload);
        if (res.found && res.student) {
          if (res.isRegisteredInBiblio) {
            showBanner('error', t.studentAlreadyRegistered);
          } else {
            showBanner('info', t.studentFoundInUniv);
          }
          setRegFullName(res.student.fullName);
          setRegMassarCode(res.student.massarCode);
          setRegCin(res.student.cin);
          setRegFiliere(res.student.filiere);
          setRegEmail(res.student.email);
          setRegCardNumber(res.student.cardNumber);
          setRegQrPayload(res.student.qrPayload);
        }
      } catch (err: any) {
        showBanner('error', err.message || (lang === 'ar' ? 'رمز QR غير معروف.' : 'Code QR inconnu.'));
      }
    } else if (scannerTarget === 'loan') {
      try {
        const res = await api.lookupBiblioStudentByQr(qrPayload);
        if (res.found && res.student) {
          setLoanIdentifiedStudent(res.student);
          showBanner(
            'success',
            `${lang === 'ar' ? 'تم التعرف على الطالب بنجاح :' : 'Étudiant identifié :'} ${res.student.name} (${res.student.cardNumber})`
          );
        }
      } catch (err: any) {
        showBanner('error', err.message || (lang === 'ar' ? 'الطالب غير مسجل في مكتبة Biblio.' : 'Étudiant non inscrit à Biblio.'));
      }
    } else if (scannerTarget === 'return') {
      try {
        const res = await api.lookupBiblioStudentByQr(qrPayload);
        if (res.found && res.student) {
          setReturnIdentifiedStudent(res.student);
          setReturnActiveLoans(res.activeLoans || []);
          showBanner(
            'info',
            `${lang === 'ar' ? 'تم استرجاع الإعارات الجارية للطالب :' : 'Emprunts actifs récupérés pour :'} ${res.student.name}`
          );
        }
      } catch (err: any) {
        showBanner('error', err.message || (lang === 'ar' ? 'لم يتم العثور على الطالب.' : 'Étudiant introuvable.'));
      }
    }
  };

  // ----------------------------------------------------
  // REGISTRATION ACTIONS (Section 5)
  // ----------------------------------------------------
  const handleConfirmRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regEmail.trim()) {
      showBanner('error', lang === 'ar' ? 'الاسم الكامل والبريد الإلكتروني مطلوبان.' : 'Le nom complet et l’email sont requis.');
      return;
    }
    if (!regEmail.trim().toLowerCase().endsWith('@usmba.ac.ma')) {
      showBanner('error', t.mustEndWithUsmba);
      return;
    }

    try {
      await api.registerStudentByAdmin({
        fullName: regFullName.trim(),
        massarCode: regMassarCode.trim() || undefined,
        cin: regCin.trim() || undefined,
        filiere: regFiliere.trim() || undefined,
        email: regEmail.trim().toLowerCase(),
        cardNumber: regCardNumber.trim() || undefined,
        qrPayload: regQrPayload.trim() || undefined,
        password: regPassword,
      });

      showBanner(
        'success',
        lang === 'ar'
          ? `تم تسجيل الطالب ${regFullName} بنجاح في مكتبة Biblio!`
          : `L'étudiant(e) ${regFullName} a été inscrit(e) avec succès à la bibliothèque !`
      );

      // Reset form
      setRegFullName('');
      setRegMassarCode('');
      setRegCin('');
      setRegFiliere('');
      setRegEmail('');
      setRegCardNumber('');
      setRegQrPayload('');

      loadStudents();
      loadUnivStudents();
    } catch (err: any) {
      showBanner('error', err.message || (lang === 'ar' ? 'فشل تسجيل الطالب.' : 'Erreur lors de l’inscription.'));
    }
  };

  const handleSelectUnivStudentManual = (s: UniversityStudent) => {
    setRegFullName(s.fullName);
    setRegMassarCode(s.massarCode);
    setRegCin(s.cin);
    setRegFiliere(s.filiere);
    setRegEmail(s.email);
    setRegCardNumber(s.cardNumber);
    setRegQrPayload(s.qrPayload);

    if (s.isRegisteredInBiblio) {
      showBanner('error', t.studentAlreadyRegistered);
    } else {
      showBanner('info', t.studentFoundInUniv);
    }
  };

  // ----------------------------------------------------
  // LOAN RECORDING ACTIONS (Section 9)
  // ----------------------------------------------------
  const handleConfirmPhysicalLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanIdentifiedStudent) {
      showBanner('error', t.studentNotIdentified);
      return;
    }
    if (!loanSelectedBookId) {
      showBanner('error', lang === 'ar' ? 'يرجى تحديد كتاب من القائمة.' : 'Veuillez sélectionner un livre dans la liste.');
      return;
    }

    try {
      const res = await api.recordLoanByAdmin({
        bookId: loanSelectedBookId,
        studentId: loanIdentifiedStudent.id,
        durationDays: loanDurationDays,
      });

      showBanner('success', `${t.loanSuccess} ${res.loan.dueDate}`);
      setLoanSelectedBookId('');
      loadBooks();
      loadDashboard();
    } catch (err: any) {
      showBanner('error', err.message || (lang === 'ar' ? 'حدث خطأ أثناء تسجيل الإعارة.' : 'Erreur lors de l’enregistrement de l’emprunt.'));
    }
  };

  // ----------------------------------------------------
  // RETURN RECORDING ACTIONS (Section 10)
  // ----------------------------------------------------
  const handleConfirmReturnLoan = async (loanId: string) => {
    try {
      await api.confirmReturn(loanId);
      showBanner('success', t.returnSuccess);

      // Refresh student's active loans
      if (returnIdentifiedStudent) {
        const refreshed = await api.lookupBiblioStudentByQr(returnIdentifiedStudent.id);
        setReturnActiveLoans(refreshed.activeLoans || []);
      }
      loadBooks();
      loadDashboard();
    } catch (err: any) {
      showBanner('error', err.message || (lang === 'ar' ? 'حدث خطأ أثناء تأكيد الإرجاع.' : 'Erreur lors de la confirmation du retour.'));
    }
  };

  // ----------------------------------------------------
  // DASHBOARD EMAIL DISPATCH (Section 11)
  // ----------------------------------------------------
  const handleCheckAllList1 = () => {
    if (!overdueSummary) return;
    if (selectedList1Ids.length === overdueSummary.list1.length) {
      setSelectedList1Ids([]);
    } else {
      setSelectedList1Ids(overdueSummary.list1.map((s) => s.studentId));
    }
  };

  const handleCheckAllList2 = () => {
    if (!overdueSummary) return;
    if (selectedList2Ids.length === overdueSummary.list2.length) {
      setSelectedList2Ids([]);
    } else {
      setSelectedList2Ids(overdueSummary.list2.map((s) => s.studentId));
    }
  };

  const handleAnnounceList1 = async () => {
    if (selectedList1Ids.length === 0) {
      showBanner('error', t.noStudentSelected);
      return;
    }

    setEmailSending(true);
    try {
      const res = await api.announceOverdue(selectedList1Ids, lang);
      if (res.sentCount > 0) {
        showBanner(
          'success',
          `${t.emailsSentSuccess} ${res.sentCount} étudiant(s). ${
            res.failedCount > 0 ? `(${res.failedCount} ${t.emailsFailed})` : ''
          }`
        );
      } else if (res.failedCount > 0) {
        showBanner('error', `${res.failedCount} ${t.emailsFailed} : ${res.errors.join('; ')}`);
      }
      setSelectedList1Ids([]);
      loadDashboard();
      loadEmailLogs();
    } catch (err: any) {
      showBanner('error', err.message || (lang === 'ar' ? 'حدث خطأ أثناء إرسال البريد.' : 'Erreur lors de l’envoi des emails.'));
    } finally {
      setEmailSending(false);
    }
  };

  const handleWarnList2 = async () => {
    if (selectedList2Ids.length === 0) {
      showBanner('error', t.noStudentSelected);
      return;
    }

    setEmailSending(true);
    try {
      const res = await api.warnOverdue(selectedList2Ids, lang);
      if (res.sentCount > 0) {
        showBanner(
          'success',
          `${t.emailsSentSuccess} ${res.sentCount} ${lang === 'ar' ? 'طالب' : 'étudiant(s)'}. ${
            res.failedCount > 0 ? `(${res.failedCount} ${t.emailsFailed})` : ''
          }`
        );
      } else if (res.failedCount > 0) {
        showBanner('error', `${res.failedCount} ${t.emailsFailed} : ${res.errors.join('; ')}`);
      }
      setSelectedList2Ids([]);
      loadDashboard();
      loadEmailLogs();
    } catch (err: any) {
      showBanner('error', err.message || (lang === 'ar' ? 'حدث خطأ أثناء إرسال الإنذارات.' : 'Erreur lors de l’envoi des avertissements.'));
    } finally {
      setEmailSending(false);
    }
  };

  // ----------------------------------------------------
  // BOOKS MANAGEMENT HANDLERS (Section 7)
  // ----------------------------------------------------
  const handleSearchGoogleBooks = async () => {
    if (!searchTitleQuery.trim()) return;
    setIsSearchingOnline(true);
    setOnlineSearchResultMsg(null);

    try {
      const res = await api.searchOnline(searchTitleQuery.trim());
      if (res.found && res.book) {
        setFormTitle(res.book.title || searchTitleQuery.trim());
        setFormAuthor(res.book.author || '');
        setFormCategory(res.book.category || '');
        setFormIsbn(res.book.isbn || '');
        setFormYear(res.book.publishedYear || '');
        setFormPublisher(res.book.publisher || '');
        setFormCoverUrl(res.book.coverUrl || '');
        setFormDescription(res.book.description || '');
        setOnlineSearchResultMsg(t.bookFoundAutoFilled);
      } else {
        setFormTitle(searchTitleQuery.trim());
        setOnlineSearchResultMsg(t.bookNotFoundManual);
      }
    } catch (err) {
      setFormTitle(searchTitleQuery.trim());
      setOnlineSearchResultMsg(t.bookNotFoundManual);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAuthor.trim()) {
      showBanner('error', lang === 'ar' ? 'العنوان والمؤلف حقلان إجباريان.' : 'Le titre et l’auteur sont obligatoires.');
      return;
    }
    if (formCopies < 1) {
      showBanner('error', lang === 'ar' ? 'يجب أن يكون عدد النسخ 1 على الأقل.' : 'Le nombre d’exemplaires doit être au moins de 1.');
      return;
    }

    try {
      if (formBookId) {
        await api.updateBook(formBookId, {
          title: formTitle.trim(),
          author: formAuthor.trim(),
          category: formCategory.trim() || undefined,
          isbn: formIsbn.trim() || undefined,
          publishedYear: formYear.trim() || undefined,
          publisher: formPublisher.trim() || undefined,
          totalCopies: Number(formCopies),
          coverUrl: formCoverUrl.trim() || undefined,
          description: formDescription.trim() || undefined,
        });
        showBanner('success', t.bookUpdatedSuccess);
      } else {
        await api.addBook({
          title: formTitle.trim(),
          author: formAuthor.trim(),
          category: formCategory.trim() || undefined,
          isbn: formIsbn.trim() || undefined,
          publishedYear: formYear.trim() || undefined,
          publisher: formPublisher.trim() || undefined,
          totalCopies: Number(formCopies),
          coverUrl: formCoverUrl.trim() || undefined,
          description: formDescription.trim() || undefined,
        });
        showBanner('success', t.bookAddedSuccess);
      }

      setFormBookId(null);
      setFormTitle('');
      setFormAuthor('');
      setFormCategory('');
      setFormIsbn('');
      setFormYear('');
      setFormPublisher('');
      setFormCopies(3);
      setFormCoverUrl('');
      setFormDescription('');
      setSearchTitleQuery('');
      setOnlineSearchResultMsg(null);

      loadBooks();
    } catch (err: any) {
      showBanner('error', err.message || (lang === 'ar' ? 'فشل حفظ الكتاب.' : 'Erreur lors de l’enregistrement du livre.'));
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm(t.confirmDeleteBook)) return;
    try {
      await api.deleteBook(id);
      showBanner('success', t.bookDeletedSuccess);
      loadBooks();
    } catch (err: any) {
      showBanner('error', err.message || (lang === 'ar' ? 'فشل حذف الكتاب.' : 'Erreur lors de la suppression.'));
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm(t.confirmDeleteStudent)) return;
    try {
      await api.deleteStudent(id);
      showBanner('success', t.studentDeletedSuccess);
      loadStudents();
      loadUnivStudents();
    } catch (err: any) {
      showBanner('error', err.message || (lang === 'ar' ? 'فشل حذف الطالب.' : 'Erreur lors de la suppression.'));
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      s.cardNumber.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  // Sidebar navigation item definition
  const sidebarItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'dashboard',
      label: t.navDashboard,
      icon: <Clock className="w-4 h-4 shrink-0" />,
      badge:
        (overdueSummary?.list1.length || 0) + (overdueSummary?.list2.length || 0) > 0
          ? (overdueSummary?.list1.length || 0) + (overdueSummary?.list2.length || 0)
          : undefined,
    },
    {
      id: 'register_student',
      label: t.navRegisterStudent,
      icon: <UserPlus className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'students_list',
      label: t.navStudentsList,
      icon: <Users className="w-4 h-4 shrink-0" />,
      badge: students.length,
    },
    {
      id: 'books',
      label: t.navBooks,
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
      badge: books.length,
    },
    {
      id: 'loans',
      label: t.navLoans,
      icon: <BookDown className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'returns',
      label: t.navReturns,
      icon: <RotateCcw className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'retards_warnings',
      label: t.navOverdueWarnings,
      icon: <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />,
      badge: emailLogs.length > 0 ? emailLogs.length : undefined,
    },
    {
      id: 'univ_db',
      label: t.navUnivDb,
      icon: <Database className="w-4 h-4 shrink-0 text-indigo-400" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Admin Upper Header Bar (Section 3 requirement) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center font-bold shadow-xs">
            <Shield className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Biblio — {lang === 'ar' ? 'فضاء الإدارة الجامعية' : 'Espace Administratrice'}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                USMBA FÈS
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'المسؤولة الإدارية : فاطمة الزهراء عبيد (Fatimazahrae Abid)'
                : 'Session active : Fatimazahrae Abid (Administratrice principale)'}
            </p>
          </div>
        </div>

        {/* Admin profile chip & status */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* SMTP Mode Badge */}
          {overdueSummary?.smtpConfigured ? (
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t.smtpConfiguredBadge}</span>
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{t.smtpModeDemo}</span>
            </span>
          )}
        </div>
      </div>

      {/* Banner Notice (Confirmation & Error) */}
      {bannerNotice && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border shadow-2xs ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-bold'
              : bannerNotice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-950 font-bold'
              : 'bg-blue-50 border-blue-200 text-blue-950 font-medium'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerNotice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : bannerNotice.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{bannerNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="font-bold text-slate-400 hover:text-slate-700 px-2 text-base"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Main Admin Layout: Sidebar on Left, Content on Right (Section 3 requirement) */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Sidebar */}
        <aside className="w-full md:w-64 shrink-0 bg-white border border-slate-200 rounded-2xl p-3 shadow-xs md:sticky md:top-20 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {lang === 'ar' ? 'أقسام الإدارة' : 'Rubriques de gestion'}
          </div>

          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id === 'dashboard') loadDashboard();
                    if (item.id === 'books') loadBooks();
                    if (item.id === 'students_list') loadStudents();
                    if (item.id === 'univ_db') loadUnivStudents();
                    if (item.id === 'retards_warnings') {
                      loadDashboard();
                      loadEmailLogs();
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-white' : 'text-slate-500'}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Main Work Area */}
        <section className="flex-1 w-full min-w-0">
          {/* ==================================================== */}
          {/* 1. TABLEAU DE BORD (Section 3 & 11)                   */}
          {/* Affiche uniquement les deux listes de retards         */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {t.dashboardTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'ar'
                      ? 'متابعة حية للكتب المتأخرة، وتصنيف المستعيرين في قائمتين وإرسال الإشعارات والإنذارات الرسمية'
                      : 'Suivi automatisé des retards d’emprunts, segmentation en deux listes et envoi des rappels / avertissements.'}
                  </p>
                </div>
              </div>

              {/* LISTE 1 : PREMIERS RETARDS (1 À 7 JOURS) */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>{t.list1Title}</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {lang === 'ar'
                        ? 'تاريخ الاستحقاق منقضٍ منذ 1 إلى 7 أيام ولم يتم إرسال أي تذكير سابق'
                        : 'Date limite dépassée entre 1 et 7 jours, aucun e-mail encore envoyé.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCheckAllList1}
                      disabled={!overdueSummary || overdueSummary.list1.length === 0}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors bg-white disabled:opacity-40 shadow-2xs"
                    >
                      {selectedList1Ids.length === overdueSummary?.list1.length &&
                      (overdueSummary?.list1.length || 0) > 0
                        ? t.uncheckAll
                        : t.checkAll}
                    </button>

                    <button
                      type="button"
                      onClick={handleAnnounceList1}
                      disabled={emailSending || selectedList1Ids.length === 0}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {t.announce} {selectedList1Ids.length > 0 ? `(${selectedList1Ids.length})` : ''}
                      </span>
                    </button>
                  </div>
                </div>

                {!overdueSummary || overdueSummary.list1.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-400">
                    {t.noOverdueStudents}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left rtl:text-right text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">
                            <button
                              type="button"
                              onClick={handleCheckAllList1}
                              className="hover:text-slate-900"
                            >
                              {selectedList1Ids.length === overdueSummary.list1.length ? (
                                <CheckSquare className="w-4 h-4 text-blue-600 mx-auto" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 mx-auto" />
                              )}
                            </button>
                          </th>
                          <th className="py-3.5 px-4">{t.studentName}</th>
                          <th className="py-3.5 px-4 text-right rtl:text-left">{t.daysOverdue}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overdueSummary.list1.map((item) => {
                          const isSelected = selectedList1Ids.includes(item.studentId);
                          return (
                            <tr
                              key={item.studentId}
                              onClick={() =>
                                setSelectedList1Ids((prev) =>
                                  prev.includes(item.studentId)
                                    ? prev.filter((i) => i !== item.studentId)
                                    : [...prev, item.studentId]
                                )
                              }
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-3.5 px-4 text-center">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 mx-auto" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 mx-auto" />
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-slate-900 block">
                                  {item.studentName}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {item.studentEmail}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right rtl:text-left font-mono font-bold text-amber-700 tabular-nums">
                                {item.maxDaysOverdue} {t.days}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* LISTE 2 : AVERTISSEMENTS (EN ROUGE) */}
              <div className="bg-rose-50/30 border-2 border-rose-300 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 border-b border-rose-200 bg-rose-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-rose-950 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{t.list2Title}</span>
                    </h4>
                    <p className="text-xs text-rose-800 mt-0.5">
                      {lang === 'ar'
                        ? 'الطلبة الذين استلموا تذكيرًا أولياً ومضت عليه 7 أيام دون تسليم الكتب'
                        : 'Premier e-mail envoyé + 7 jours supplémentaires écoulés + livres toujours non retournés.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleCheckAllList2}
                      disabled={!overdueSummary || overdueSummary.list2.length === 0}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-300 hover:bg-rose-50 text-rose-900 transition-colors bg-white disabled:opacity-40 shadow-2xs"
                    >
                      {selectedList2Ids.length === overdueSummary?.list2.length &&
                      (overdueSummary?.list2.length || 0) > 0
                        ? t.uncheckAll
                        : t.checkAll}
                    </button>

                    <button
                      type="button"
                      onClick={handleWarnList2}
                      disabled={emailSending || selectedList2Ids.length === 0}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {t.sendWarning} {selectedList2Ids.length > 0 ? `(${selectedList2Ids.length})` : ''}
                      </span>
                    </button>
                  </div>
                </div>

                {!overdueSummary || overdueSummary.list2.length === 0 ? (
                  <div className="p-10 text-center text-xs text-rose-500">
                    {t.noWarningStudents}
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full text-left rtl:text-right text-xs">
                      <thead className="bg-rose-50/70 border-b border-rose-200 text-rose-900 uppercase tracking-wider text-[11px] font-bold">
                        <tr>
                          <th className="py-3 px-4 w-12 text-center">
                            <button
                              type="button"
                              onClick={handleCheckAllList2}
                              className="hover:text-rose-950"
                            >
                              {selectedList2Ids.length === overdueSummary.list2.length ? (
                                <CheckSquare className="w-4 h-4 text-rose-600 mx-auto" />
                              ) : (
                                <Square className="w-4 h-4 text-rose-300 mx-auto" />
                              )}
                            </button>
                          </th>
                          <th className="py-3.5 px-4">{t.studentName}</th>
                          <th className="py-3.5 px-4 text-right rtl:text-left">{t.daysOverdue}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {overdueSummary.list2.map((item) => {
                          const isSelected = selectedList2Ids.includes(item.studentId);
                          return (
                            <tr
                              key={item.studentId}
                              onClick={() =>
                                setSelectedList2Ids((prev) =>
                                  prev.includes(item.studentId)
                                    ? prev.filter((i) => i !== item.studentId)
                                    : [...prev, item.studentId]
                                )
                              }
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-rose-100/70' : 'hover:bg-rose-50/50'
                              }`}
                            >
                              <td className="py-3.5 px-4 text-center">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-rose-600 mx-auto" />
                                ) : (
                                  <Square className="w-4 h-4 text-rose-300 mx-auto" />
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-rose-950 block">
                                  {item.studentName}
                                </span>
                                <span className="text-[11px] text-rose-400 font-mono">
                                  {item.studentEmail}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right rtl:text-left font-mono font-bold text-rose-700 tabular-nums">
                                {item.maxDaysOverdue} {t.days}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 2. INSCRIRE UN ÉTUDIANT (Section 5)                  */}
          {/* Méthode A (manuelle) et Méthode B (scan de carte)     */}
          {/* ==================================================== */}
          {activeTab === 'register_student' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {t.registerStudentTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'ar'
                      ? 'تسجيل طالب في Biblio عبر البحث في قاعدة بيانات الجامعة أو مسح رمز QR لبطاقته'
                      : 'Inscrivez un étudiant à Biblio via recherche dans la base universitaire ou scan QR.'}
                  </p>
                </div>

                {/* Method B Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setScannerTarget('register');
                    setScannerOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs self-start sm:self-auto"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t.scanStudentCard}</span>
                </button>
              </div>

              {/* Method A: Search in University Database */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-blue-600" />
                  <span>{t.methodA}</span>
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={regManualSearch}
                    onChange={(e) => setRegManualSearch(e.target.value)}
                    placeholder="Rechercher par nom (ex: BENYAMINA WISSAL), Massar ou CIN..."
                    className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                  />
                </div>

                {regManualSearch.trim() && (
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white text-xs">
                    {univStudents
                      .filter(
                        (s) =>
                          s.fullName.toLowerCase().includes(regManualSearch.toLowerCase()) ||
                          s.massarCode.toLowerCase().includes(regManualSearch.toLowerCase()) ||
                          s.cin.toLowerCase().includes(regManualSearch.toLowerCase())
                      )
                      .slice(0, 5)
                      .map((s) => (
                        <div
                          key={s.id}
                          className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{s.fullName}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {s.massarCode} · {s.cin} · {s.filiere}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectUnivStudentManual(s)}
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs border border-blue-200"
                          >
                            Sélectionner
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Registration Form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <form onSubmit={handleConfirmRegisterStudent} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.fullName} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder={t.namePlaceholder}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.email} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder={t.emailPlaceholder}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.massarCode}
                      </label>
                      <input
                        type="text"
                        value={regMassarCode}
                        onChange={(e) => setRegMassarCode(e.target.value)}
                        placeholder="Ex: S136377425"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.cin}
                      </label>
                      <input
                        type="text"
                        value={regCin}
                        onChange={(e) => setRegCin(e.target.value)}
                        placeholder="Ex: Z719781"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.cardNumber}
                      </label>
                      <input
                        type="text"
                        value={regCardNumber}
                        onChange={(e) => setRegCardNumber(e.target.value)}
                        placeholder="Ex: USMBA-2024-8841"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.filiere}
                      </label>
                      <input
                        type="text"
                        value={regFiliere}
                        onChange={(e) => setRegFiliere(e.target.value)}
                        placeholder="Ex: Ingénierie Logicielle"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mot de passe initial pour l’étudiant
                      </label>
                      <input
                        type="text"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                    >
                      {t.confirmRegistration}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 3. LISTE DES ÉTUDIANTS (Section 6)                  */}
          {/* ==================================================== */}
          {activeTab === 'students_list' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {t.studentsListTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'ar'
                      ? 'الطلبة الحاصلين على حسابات مسجلة ومفعلة بمكتبة Biblio'
                      : 'Étudiants inscrits à Biblio avec suivi de leurs emprunts actifs.'}
                  </p>
                </div>
              </div>

              {/* Search bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    placeholder={t.searchStudentPlaceholder}
                    className="w-full pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* Modern Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left rtl:text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                      <tr>
                        <th className="py-3.5 px-4">{t.fullName}</th>
                        <th className="py-3.5 px-4">{t.cardNumber}</th>
                        <th className="py-3.5 px-4">{t.email}</th>
                        <th className="py-3.5 px-4 text-center">{t.activeLoansCount}</th>
                        <th className="py-3.5 px-4 text-right rtl:text-left">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            {t.noStudentsFound}
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-900">
                              {s.name}
                              {s.filiere && s.filiere !== '—' && (
                                <span className="text-[11px] text-blue-700 font-normal block">
                                  {s.filiere}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-slate-800">
                              {s.cardNumber}
                            </td>
                            <td className="py-4 px-4 font-mono text-slate-600">{s.email}</td>
                            <td className="py-4 px-4 text-center font-mono font-bold text-blue-700">
                              {s.activeLoansCount}
                            </td>
                            <td className="py-4 px-4 text-right rtl:text-left">
                              <div className="flex items-center justify-end rtl:justify-start gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCardModalStudent({
                                      id: s.id,
                                      fullName: s.name,
                                      massarCode: s.massarCode || 'S136377425',
                                      cin: s.cin || 'Z719781',
                                      filiere: s.filiere || 'Étudiant USMBA',
                                      email: s.email,
                                      cardNumber: s.cardNumber,
                                      qrPayload: s.qrPayload || `USMBA-STUDENT:${s.email}`,
                                    });
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                                  title={t.viewCard}
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">{t.viewCard}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStudent(s.id)}
                                  className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg"
                                  title={t.deleteStudent}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 5. GESTION DES LIVRES (Section 7)                    */}
          {/* ==================================================== */}
          {activeTab === 'books' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="font-bold text-base text-slate-900">
                    {formBookId ? t.edit : t.addBookTitle}
                  </h3>
                  {formBookId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormBookId(null);
                        setFormTitle('');
                        setFormAuthor('');
                        setFormCategory('');
                        setFormIsbn('');
                        setFormYear('');
                        setFormPublisher('');
                        setFormCopies(3);
                        setFormCoverUrl('');
                        setFormDescription('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      {t.cancel}
                    </button>
                  )}
                </div>

                {/* Google Books Search */}
                {!formBookId && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      {t.bookTitleInput}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchTitleQuery}
                        onChange={(e) => setSearchTitleQuery(e.target.value)}
                        placeholder="Ex: Algorithmique, Intelligence Artificielle, Réseaux Tanenbaum..."
                        className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleSearchGoogleBooks}
                        disabled={isSearchingOnline || !searchTitleQuery.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-40 shrink-0 shadow-2xs"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{isSearchingOnline ? t.searchingGoogleBooks : t.searchOnline}</span>
                      </button>
                    </div>

                    {onlineSearchResultMsg && (
                      <p className="text-xs text-blue-900 mt-1 flex items-center gap-1.5 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{onlineSearchResultMsg}</span>
                      </p>
                    )}
                  </div>
                )}

                <form onSubmit={handleSaveBook} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Titre du livre <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.author} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formAuthor}
                        onChange={(e) => setFormAuthor(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.category}
                      </label>
                      <input
                        type="text"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.isbn}
                      </label>
                      <input
                        type="text"
                        value={formIsbn}
                        onChange={(e) => setFormIsbn(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.year}
                      </label>
                      <input
                        type="text"
                        value={formYear}
                        onChange={(e) => setFormYear(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.publisher}
                      </label>
                      <input
                        type="text"
                        value={formPublisher}
                        onChange={(e) => setFormPublisher(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {t.physicalCopiesCount} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formCopies}
                        onChange={(e) => setFormCopies(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Optional Description / Synopsis */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.synopsis} (optionnel)
                    </label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Résumé ou présentation de l'ouvrage..."
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      {t.saveBook}
                    </button>
                  </div>
                </form>
              </div>

              {/* Books List Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">
                    {t.booksList} ({books.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left rtl:text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                      <tr>
                        <th className="py-3 px-4 w-16">Couverture</th>
                        <th className="py-3 px-4">Titre</th>
                        <th className="py-3 px-4">{t.author}</th>
                        <th className="py-3 px-4 text-center">{t.totalCopies}</th>
                        <th className="py-3 px-4 text-center">{t.copiesCount}</th>
                        <th className="py-3 px-4 text-right rtl:text-left">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {books.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <BookCoverImage
                              title={b.title}
                              author={b.author}
                              coverUrl={b.coverUrl}
                              isbn={b.isbn}
                              className="w-10 h-14 rounded-md shadow-2xs"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{b.title}</span>
                            {b.isbn && (
                              <span className="text-[11px] text-slate-400 font-mono">
                                ISBN: {b.isbn}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{b.author}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium">{b.totalCopies}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                            {b.availableCopies}
                          </td>
                          <td className="py-3 px-4 text-right rtl:text-left">
                            <div className="flex items-center justify-end rtl:justify-start gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormBookId(b.id);
                                  setFormTitle(b.title);
                                  setFormAuthor(b.author);
                                  setFormCategory(b.category || '');
                                  setFormIsbn(b.isbn || '');
                                  setFormYear(b.publishedYear ? String(b.publishedYear) : '');
                                  setFormPublisher(b.publisher || '');
                                  setFormCopies(b.totalCopies);
                                  setFormCoverUrl(b.coverUrl || '');
                                  setFormDescription(b.description || '');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                title={t.edit}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBook(b.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg"
                                title={t.delete}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 6. ENREGISTRER UN EMPRUNT (Section 9)                */}
          {/* ==================================================== */}
          {activeTab === 'loans' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {t.recordLoanTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'ar'
                      ? 'تسجيل إعارة كتاب ورقي لطالب بالمكتبة بعد مسح بطاقته وتحديد مدة الإعارة'
                      : 'Enregistrement d’un prêt physique au guichet avec identification de l’étudiant.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScannerTarget('loan');
                    setScannerOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs self-start sm:self-auto"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t.scanStudentCard}</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-2xl">
                <form onSubmit={handleConfirmPhysicalLoan} className="space-y-5 text-xs">
                  {/* Step 1: Student Identification */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-2">
                      {t.step1ScanStudent}
                    </label>

                    {loanIdentifiedStudent ? (
                      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            {loanIdentifiedStudent.name}
                          </div>
                          <div className="text-slate-500 text-[11px] font-mono mt-0.5">
                            {loanIdentifiedStudent.email} · Carte : {loanIdentifiedStudent.cardNumber}
                          </div>
                          {loanIdentifiedStudent.filiere && (
                            <div className="text-blue-900 font-semibold text-[11px]">
                              {loanIdentifiedStudent.filiere}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setLoanIdentifiedStudent(null)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                        >
                          Changer
                        </button>
                      </div>
                    ) : (
                      <div className="p-5 border-2 border-dashed border-slate-300 rounded-xl text-center space-y-2">
                        <p className="text-slate-500">
                          Aucun étudiant identifié pour l’emprunt en cours.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setScannerTarget('loan');
                            setScannerOpen(true);
                          }}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold inline-flex items-center gap-1.5 shadow-xs text-xs"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Scanner la carte pour identifier</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Book Selection */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-2">
                      {t.step2SelectBook}
                    </label>
                    <select
                      value={loanSelectedBookId}
                      onChange={(e) => setLoanSelectedBookId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                    >
                      <option value="">{t.selectBookPlaceholder}</option>
                      {books.map((b) => (
                        <option
                          key={b.id}
                          value={b.id}
                          disabled={b.availableCopies <= 0}
                        >
                          {b.title} — {b.author} ({b.availableCopies} ex. disponible(s) sur {b.totalCopies})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 3: Duration */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      {t.loanDurationDays}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={loanDurationDays}
                      onChange={(e) => setLoanDurationDays(Number(e.target.value))}
                      className="w-32 px-3.5 py-2 border border-slate-300 rounded-xl text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={!loanIdentifiedStudent || !loanSelectedBookId}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-40"
                    >
                      {t.confirmLoan}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* 7. ENREGISTRER UN RETOUR (Section 10)                */}
          {/* ==================================================== */}
          {activeTab === 'returns' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {t.recordReturnTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'ar'
                      ? 'مسح بطاقة الطالب لعرض كتبه المستعارة وتأكيد الإرجاع الفعلي'
                      : 'Scan de la carte étudiant pour afficher ses emprunts actifs et valider la restitution.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScannerTarget('return');
                    setScannerOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs self-start sm:self-auto"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t.scanStudentCard}</span>
                </button>
              </div>

              {returnIdentifiedStudent ? (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {returnIdentifiedStudent.name}
                      </h4>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {returnIdentifiedStudent.email} · Carte : {returnIdentifiedStudent.cardNumber}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReturnIdentifiedStudent(null)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                    >
                      Réinitialiser
                    </button>
                  </div>

                  {returnActiveLoans.length === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-400">
                      {t.noActiveLoansForStudent}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left rtl:text-right text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                          <tr>
                            <th className="py-3 px-4">Livre</th>
                            <th className="py-3 px-4">Date d’emprunt</th>
                            <th className="py-3 px-4">Date de retour prévue</th>
                            <th className="py-3 px-4 text-right rtl:text-left">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {returnActiveLoans.map((loan) => {
                            const today = new Date().toISOString().split('T')[0];
                            const isOverdue = loan.dueDate < today;

                            return (
                              <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3.5 px-4">
                                  <span className="font-bold text-slate-900 block">{loan.bookTitle}</span>
                                  <span className="text-[11px] text-slate-500">{loan.bookAuthor}</span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-slate-600">{loan.loanDate}</td>
                                <td className="py-3.5 px-4 font-mono">
                                  <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                                    {loan.dueDate}
                                  </span>
                                  {isOverdue && (
                                    <span className="text-[10px] text-rose-600 block font-semibold">(En retard)</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right rtl:text-left">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmReturnLoan(loan.id)}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                                  >
                                    {t.confirmReturn}
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
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-xs">
                  <Camera className="w-12 h-12 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-800">
                    Scannez la carte étudiante pour enregistrer une restitution
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    La caméra identifiera automatiquement l’étudiant et affichera ses emprunts en cours.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTarget('return');
                      setScannerOpen(true);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{t.scanStudentCard}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* 8. RETARDS ET AVERTISSEMENTS (Section 11 & 12)       */}
          {/* ==================================================== */}
          {activeTab === 'retards_warnings' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {t.navOverdueWarnings}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.emailLogsSubtitle}
                  </p>
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  {emailLogs.length} {lang === 'ar' ? 'رسالة مسجلة' : 'message(s) archivé(s)'}
                </div>
              </div>

              {/* Email Logs Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                {emailLogs.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400">
                    <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <span>{t.noEmailLogs}</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left rtl:text-right text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                        <tr>
                          <th className="py-3.5 px-4">{t.sentAt}</th>
                          <th className="py-3.5 px-4">{t.recipient}</th>
                          <th className="py-3.5 px-4">{t.emailType}</th>
                          <th className="py-3.5 px-4">{lang === 'ar' ? 'اللغة' : 'Langue'}</th>
                          <th className="py-3.5 px-4">{lang === 'ar' ? 'الوضعية' : 'Statut'}</th>
                          <th className="py-3.5 px-4 text-right rtl:text-left">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {emailLogs.map((log) => {
                          const isWarning = log.type === 'warning';
                          const formattedDate = new Date(log.sentAt).toLocaleString(
                            lang === 'ar' ? 'ar-MA' : 'fr-FR',
                            { dateStyle: 'short', timeStyle: 'short' }
                          );

                          return (
                            <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-4 font-mono text-slate-600">
                                {formattedDate}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-slate-900 block">
                                  {log.studentName}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {log.studentEmail}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                    isWarning
                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  {isWarning ? t.warningType : t.announcementType}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-semibold uppercase text-slate-600">
                                {log.lang === 'ar' ? 'العربية' : 'Français'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                    log.status === 'sent' ? 'text-emerald-700' : 'text-rose-700'
                                  }`}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>{log.status === 'sent' ? (lang === 'ar' ? 'مرسل' : 'Envoyé') : (lang === 'ar' ? 'فشل' : 'Échec')}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right rtl:text-left">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPreviewLog(log)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 border border-blue-200 transition-colors shadow-2xs"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>{t.previewEmail}</span>
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
            </div>
          )}

          {/* ==================================================== */}
          {/* 9. BASE UNIVERSITAIRE FICTIVE (Section 4)            */}
          {/* ==================================================== */}
          {activeTab === 'univ_db' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {t.univDbTitle}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{t.univDbSubtitle}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={univSearchQuery}
                    onChange={(e) => setUnivSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom (BENYAMINA WISSAL), Massar (S136377425), CIN (Z719781)..."
                    className="w-full pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {univStudents.map((us) => (
                  <div
                    key={us.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-blue-300 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-sm text-slate-900">{us.fullName}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            us.isRegisteredInBiblio
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {us.isRegisteredInBiblio ? t.registeredInBiblio : t.notRegisteredInBiblio}
                        </span>
                      </div>

                      <div className="text-xs text-blue-700 font-semibold mb-3">
                        {us.filiere}
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 font-mono">
                        <div>
                          <span className="text-slate-400 font-sans">{t.massarCode} :</span>{' '}
                          <strong>{us.massarCode}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-sans">{t.cin} :</span>{' '}
                          <strong>{us.cin}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-sans">{t.cardNumber} :</span>{' '}
                          <strong>{us.cardNumber}</strong>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {us.email}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setCardModalStudent(us)}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-600" />
                        <span>{t.viewCard}</span>
                      </button>

                      {!us.isRegisteredInBiblio && (
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectUnivStudentManual(us);
                            setActiveTab('register_student');
                          }}
                          className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors text-center shadow-2xs"
                        >
                          {t.quickRegister}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Email Preview Modal */}
      {selectedPreviewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-blue-700" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedPreviewLog.type === 'warning' ? t.warningType : t.announcementType}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {lang === 'ar' ? 'إلى :' : 'À :'} {selectedPreviewLog.studentName} &lt;{selectedPreviewLog.studentEmail}&gt;
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPreviewLog(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedPreviewLog.subject && (
                <div className="p-3 bg-slate-100 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <span className="font-bold text-slate-500">{t.emailSubject}</span>
                  <span>{selectedPreviewLog.subject}</span>
                </div>
              )}

              {selectedPreviewLog.htmlBody ? (
                <div
                  className="border border-slate-200 rounded-xl p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: selectedPreviewLog.htmlBody }}
                />
              ) : (
                <div className="text-xs text-slate-500 p-4 text-center">
                  {lang === 'ar' ? 'محتوى الرسالة مسجل في قاعدة البيانات' : 'Contenu archivé dans la base de données.'}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedPreviewLog.sentAt}
              </span>

              <button
                type="button"
                onClick={() => setSelectedPreviewLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                {t.closePreview}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Scanner Modal */}
      <QrCodeScannerModal
        isOpen={scannerOpen}
        onClose={() => {
          setScannerOpen(false);
          setScannerTarget(null);
        }}
        onScanSuccess={handleQrScanSuccess}
        title={
          scannerTarget === 'register'
            ? t.scanStudentCard
            : scannerTarget === 'loan'
            ? 'Scanner la carte pour emprunter'
            : 'Scanner la carte pour retourner'
        }
        description={t.scanCardPrompt}
        lang={lang}
      />

      {/* Student Card Badge Modal */}
      {cardModalStudent && (
        <StudentCardModal
          student={cardModalStudent}
          onClose={() => setCardModalStudent(null)}
          lang={lang}
        />
      )}
    </div>
  );
};
