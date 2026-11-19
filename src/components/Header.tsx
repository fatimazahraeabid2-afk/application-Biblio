import React from 'react';
import { Language, translations } from '../i18n/translations';
import { UserSession } from '../services/api';
import { BookOpen, LogOut, Globe, Shield, User } from 'lucide-react';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  currentUser: UserSession | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLanguageChange,
  currentUser,
  onLogout,
}) => {
  const t = translations[lang];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center font-bold shadow-sm ring-1 ring-blue-500/20">
            <BookOpen className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight tracking-tight">
                Biblio
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                USMBA
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Right controls: Language selector & User status */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-200">
            <Globe className="w-3.5 h-3.5 text-slate-500 mx-1.5" />
            <button
              type="button"
              onClick={() => onLanguageChange('fr')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                lang === 'fr'
                  ? 'bg-white text-blue-950 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Français
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('ar')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all font-arabic ${
                lang === 'ar'
                  ? 'bg-white text-blue-950 shadow-xs ring-1 ring-slate-200/50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              العربية
            </button>
          </div>

          {/* Current User & Logout */}
          {currentUser && (
            <div className="flex items-center gap-3 pl-3 rtl:pl-0 rtl:pr-3 border-slate-200 rtl:border-r rtl:border-l-0 ltr:border-l">
              <div className="hidden md:flex flex-col text-right rtl:text-left text-xs">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5 justify-end rtl:justify-start">
                  {currentUser.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                      <Shield className="w-3 h-3 text-indigo-600" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                      <User className="w-3 h-3 text-blue-600" />
                      Étudiant
                    </span>
                  )}
                  <span>{currentUser.name}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentUser.email}
                </span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200 shadow-xs"
                title={t.logout}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
