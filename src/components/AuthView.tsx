import React, { useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { api, UserSession } from '../services/api';
import {
  GraduationCap,
  Shield,
  UserPlus,
  LogIn,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Library,
  BookMarked,
  ArrowRight,
} from 'lucide-react';

interface AuthViewProps {
  lang: Language;
  onLoginSuccess: (user: UserSession) => void;
  onLanguageChange?: (lang: Language) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  lang,
  onLoginSuccess,
}) => {
  const t = translations[lang];

  // Active view: 'student' | 'admin'
  const [activeSpace, setActiveSpace] = useState<'student' | 'admin'>('student');

  // Student sub-mode: 'login' | 'signup'
  const [studentMode, setStudentMode] = useState<'login' | 'signup'>('login');

  // Student form inputs
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentCardNumber, setStudentCardNumber] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Admin form inputs
  const [adminEmail, setAdminEmail] = useState('fatimazahrae.abid2@usmba.ac.ma');
  const [adminPassword, setAdminPassword] = useState('');

  // Message & loading status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailTrimmed = studentEmail.trim().toLowerCase();

    if (studentMode === 'signup') {
      if (!emailTrimmed.endsWith('@usmba.ac.ma')) {
        setErrorMsg(t.mustEndWithUsmba);
        return;
      }
      if (!studentName.trim() || !studentPassword || !studentCardNumber.trim()) {
        setErrorMsg(
          lang === 'ar'
            ? 'يرجى ملء جميع الحقول المطلوبة بما في ذلك رقم بطاقة الطالب.'
            : 'Veuillez renseigner tous les champs obligatoires (nom, email, mot de passe et carte étudiant).'
        );
        return;
      }

      setLoading(true);
      try {
        const res = await api.registerStudent(
          studentName.trim(),
          emailTrimmed,
          studentPassword,
          studentCardNumber.trim()
        );
        setSuccessMsg(t.signupSuccess);
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 500);
      } catch (err: any) {
        setErrorMsg(err.message || (lang === 'ar' ? 'فشل التسجيل' : 'Erreur lors de l’inscription'));
      } finally {
        setLoading(false);
      }
    } else {
      // Student login
      setLoading(true);
      try {
        const res = await api.loginStudent(emailTrimmed, studentPassword);
        onLoginSuccess(res.user);
      } catch (err: any) {
        setErrorMsg(err.message || (lang === 'ar' ? 'بيانات الاعتماد غير صحيحة' : 'Identifiants étudiant incorrects'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await api.loginAdmin(adminEmail.trim(), adminPassword);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'ar' ? 'بيانات اعتماد الإدارة غير صحيحة' : 'Identifiants administrateur incorrects'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-1 sm:py-3 max-w-5xl mx-auto">
      {/* Main Grid: Welcome & Illustration on Left, Auth Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-center">
        {/* Left Editorial & Compact Illustration Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-blue-900 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3 text-blue-700" />
              <span>{lang === 'ar' ? 'بوابة المكتبة الجامعية الرقمية' : 'Portail Universitaire de Prêt & Recherche'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {t.welcomeBiblio}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.welcomeSubtitle}.{' '}
              {lang === 'ar'
                ? 'استعارة مباشرة، فحص فوري عبر البطاقة الجامعية ورمز QR، ومتابعة دقيقة للمخزون.'
                : 'Consultez le catalogue, empruntez vos ouvrages et accédez à votre carte d’étudiant numérique.'}
            </p>
          </div>

          {/* Compact & Minimalist Library Illustration Block */}
          <div className="rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 px-5 py-4 text-white shadow-xs border border-blue-900/50">
            <div className="flex flex-col items-center justify-center">
              <svg
                viewBox="0 0 280 112"
                className="w-full max-w-[220px] h-auto mb-3"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Clean bookshelf base */}
                <rect x="24" y="96" width="232" height="5" rx="2.5" fill="#334155" />

                {/* Left books */}
                <rect x="38" y="42" width="16" height="54" rx="2" fill="#1D4ED8" />
                <rect x="42" y="50" width="8" height="2.5" rx="1.25" fill="#93C5FD" />
                <rect x="57" y="34" width="18" height="62" rx="2" fill="#1E40AF" />
                <rect x="61" y="44" width="10" height="3" rx="1.5" fill="#BFDBFE" />
                <rect x="78" y="48" width="15" height="48" rx="2" fill="#0284C7" />

                {/* Central Open Book */}
                <path
                  d="M140 58 C124 50 102 52 96 60 L96 89 C102 81 124 79 140 87 C156 79 178 81 184 89 L184 60 C178 52 156 50 140 58 Z"
                  fill="#F8FAFC"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                />
                <line x1="140" y1="58" x2="140" y2="87" stroke="#64748B" strokeWidth="1.5" />
                <line x1="104" y1="67" x2="132" y2="64" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="104" y1="74" x2="132" y2="71" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="148" y1="64" x2="176" y2="67" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="148" y1="71" x2="176" y2="74" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />

                {/* Right books */}
                <rect x="190" y="38" width="17" height="58" rx="2" fill="#2563EB" />
                <rect x="194" y="48" width="9" height="2.5" rx="1.25" fill="#DBEAFE" />
                <rect x="210" y="46" width="18" height="50" rx="2" fill="#1E3A8A" />
                <rect x="231" y="52" width="13" height="44" rx="2" fill="#3B82F6" />

                {/* Subtle Graduation Cap */}
                <path d="M140 12 L114 24 L140 33 L166 24 Z" fill="#60A5FA" />
                <path d="M124 28 L124 38 C124 42 156 42 156 38 L156 28" fill="#3B82F6" />
                <path d="M166 24 L171 36" stroke="#93C5FD" strokeWidth="1.75" strokeLinecap="round" />
                <circle cx="171" cy="38.5" r="2" fill="#93C5FD" />
              </svg>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-blue-800/60 w-full text-[11px] text-blue-100/90 font-medium">
                <div className="flex items-center justify-center gap-1.5 text-center">
                  <Library className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span className="truncate">{lang === 'ar' ? 'فهرس متجدد' : 'Catalogue enrichi'}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-center">
                  <CreditCard className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span className="truncate">{lang === 'ar' ? 'بطاقة برمز QR' : 'Carte QR sécurisée'}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-center">
                  <BookMarked className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span className="truncate">{lang === 'ar' ? 'إعارة فورية' : 'Prêts automatisés'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Authentication Box */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            {/* Primary Access Buttons: Connexion Étudiant vs Connexion Admin */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg mb-4 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setActiveSpace('student');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                  activeSpace === 'student'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>{t.studentSpace}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSpace('admin');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${
                  activeSpace === 'admin'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>{t.adminSpace}</span>
              </button>
            </div>

            {/* Error & Success Notification Boxes */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ---------------- STUDENT SPACE ---------------- */}
            {activeSpace === 'student' && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-4">
                  <div className="flex gap-4 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setStudentMode('login');
                        setErrorMsg(null);
                      }}
                      className={`pb-1.5 transition-colors relative ${
                        studentMode === 'login'
                          ? 'text-blue-700 border-b-2 border-blue-700 font-bold'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {t.login}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentMode('signup');
                        setErrorMsg(null);
                      }}
                      className={`pb-1.5 transition-colors relative ${
                        studentMode === 'signup'
                          ? 'text-blue-700 border-b-2 border-blue-700 font-bold'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {t.signup}
                    </button>
                  </div>

                  <span className="text-[11px] font-mono font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    @usmba.ac.ma
                  </span>
                </div>

                <form onSubmit={handleStudentSubmit} className="space-y-3 text-xs">
                  {studentMode === 'signup' && (
                    <>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          {t.fullName} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder={t.namePlaceholder}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs bg-white text-slate-800 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          {t.cardNumber} <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={studentCardNumber}
                            onChange={(e) => setStudentCardNumber(e.target.value)}
                            placeholder={t.cardNumberPlaceholder}
                            className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs font-mono bg-white text-slate-800 transition-all"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.email} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs font-mono bg-white text-slate-800 transition-all"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {lang === 'ar'
                        ? 'يجب أن ينتهي العنوان حصراً بـ @usmba.ac.ma'
                        : 'Doit impérativement se terminer par @usmba.ac.ma'}
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.password} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      placeholder={t.passwordPlaceholder}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs bg-white text-slate-800 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
                  >
                    {studentMode === 'signup' ? (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>{t.signup}</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>{t.login}</span>
                      </>
                    )}
                  </button>

                  {/* Switch Link: "Créer un compte" vs "Se connecter" */}
                  <div className="pt-1 text-center text-xs">
                    {studentMode === 'login' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentMode('signup');
                          setErrorMsg(null);
                        }}
                        className="text-blue-700 hover:text-blue-900 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <span>{t.createAccountLink}</span>
                        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentMode('login');
                          setErrorMsg(null);
                        }}
                        className="text-blue-700 hover:text-blue-900 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <span>{t.haveAccountLink}</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Test Demo Account Pre-fill */}
                  <div className="mt-2 p-2.5 bg-blue-50/70 rounded-lg border border-blue-200/80 text-[11px] text-slate-600 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-blue-950 block">
                        {lang === 'ar' ? 'حساب طالب تجريبي للاختبار (TP) :' : 'Compte étudiant de test (TP) :'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        amine.elamrani@usmba.ac.ma (etudiant123)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentEmail('amine.elamrani@usmba.ac.ma');
                        setStudentPassword('etudiant123');
                        if (studentMode === 'signup') {
                          setStudentName('EL AMRANI AMINE');
                          setStudentCardNumber('USMBA-2024-1042');
                        }
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-blue-300 rounded-md text-blue-800 font-bold text-[11px] shrink-0 transition-colors"
                    >
                      {t.autoFillStudent}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ---------------- ADMIN SPACE ---------------- */}
            {activeSpace === 'admin' && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      {t.adminSpace}
                    </h3>
                    <span className="text-[11px] text-blue-800 font-semibold block">
                      Fatimazahrae Abid ({lang === 'ar' ? 'المسؤولة الإدارية الرئيسية' : 'Administratrice principale'})
                    </span>
                  </div>
                  <Shield className="w-5 h-5 text-slate-800" />
                </div>

                <form onSubmit={handleAdminSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {lang === 'ar' ? 'البريد الإلكتروني للإدارة' : 'Adresse e-mail administratrice'}
                    </label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="fatimazahrae.abid2@usmba.ac.ma"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-900 text-xs font-mono bg-white text-slate-800 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {t.password}
                    </label>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder={t.passwordPlaceholder}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-slate-900 text-xs bg-white text-slate-800 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{t.login}</span>
                  </button>

                  {/* Demonstration Admin Credentials Box */}
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 block">
                        {t.demoCredentialsTitle}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminEmail('fatimazahrae.abid2@usmba.ac.ma');
                          setAdminPassword('Admin@Usmba2026');
                        }}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-slate-800 font-bold text-[11px] transition-colors"
                      >
                        {t.autoFillAdmin}
                      </button>
                    </div>
                    <div>
                      {lang === 'ar' ? 'البريد الإلكتروني :' : 'Email :'} <code className="font-mono text-slate-900 font-bold">fatimazahrae.abid2@usmba.ac.ma</code>
                    </div>
                    <div>
                      {lang === 'ar' ? 'كلمة المرور :' : 'Mot de passe :'} <code className="font-mono text-slate-900 font-bold">Admin@Usmba2026</code>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
