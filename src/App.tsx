import React, { useState, useEffect } from 'react';
import { Language } from './i18n/translations';
import { UserSession } from './services/api';
import { Header } from './components/Header';
import { AuthView } from './components/AuthView';
import { StudentView } from './components/StudentView';
import { AdminView } from './components/AdminView';

const STORAGE_KEY_LANG = 'usmba_biblio_lang';
const STORAGE_KEY_USER = 'usmba_biblio_user';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG);
      return saved === 'ar' ? 'ar' : 'fr';
    } catch {
      return 'fr';
    }
  });

  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Apply HTML direction and lang attribute for RTL/LTR
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch (e) {
      console.error(e);
    }
  }, [lang]);

  // Persist current session
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
  };

  const handleLoginSuccess = (user: UserSession) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <div
      className={`min-h-screen bg-[#F8F9FA] text-[#1E293B] flex flex-col ${
        lang === 'ar' ? 'font-arabic' : ''
      }`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header with Title & Language Switcher */}
      <Header
        lang={lang}
        onLanguageChange={handleLanguageChange}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!currentUser ? (
          <AuthView
            lang={lang}
            onLoginSuccess={handleLoginSuccess}
            onLanguageChange={handleLanguageChange}
          />
        ) : currentUser.role === 'student' ? (
          <StudentView lang={lang} currentUser={currentUser} />
        ) : (
          <AdminView lang={lang} />
        )}
      </main>

      {/* Understated Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left rtl:sm:text-right">
          <div>
            <span className="font-semibold text-slate-800">
              {lang === 'ar'
                ? 'جامعة سيدي محمد بن عبد الله - فاس'
                : 'Université Sidi Mohamed Ben Abdellah - Fès'}
            </span>{' '}
            ·{' '}
            <span>
              {lang === 'ar'
                ? 'مصلحة تدبير وتسيير المكتبة الجامعية'
                : 'Système de Gestion de Bibliothèque Universitaire'}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            USMBA Biblio © {new Date().getFullYear()}
          </div>
        </div>
      </footer>
    </div>
  );
}
