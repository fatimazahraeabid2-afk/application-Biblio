import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Printer, ShieldCheck, GraduationCap, Download } from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { UniversityStudent } from '../services/api';

interface StudentCardModalProps {
  student: UniversityStudent | null;
  isOpen?: boolean;
  onClose: () => void;
  lang: Language;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  student,
  isOpen = true,
  onClose,
  lang,
}) => {
  const t = translations[lang];
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (student && isOpen) {
      QRCode.toDataURL(student.qrPayload, {
        width: 200,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [student, isOpen]);

  if (!student || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-800" />
            <h3 className="font-bold text-sm text-neutral-900">
              {lang === 'ar' ? 'بطاقة الطالب الجامعية الرسمية' : 'Carte d’Étudiant Universitaire USMBA'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Body - Printable & Scannable Badge */}
        <div className="p-6 bg-slate-50 flex justify-center">
          <div className="w-full bg-white border-2 border-blue-900 rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden text-xs">
            {/* Top Ribbon */}
            <div className="border-b-2 border-blue-900 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider block">
                  Université Sidi Mohamed Ben Abdellah
                </span>
                <span className="text-base font-bold text-slate-900 font-display">
                  CARTE ÉTUDIANT 2024–2026
                </span>
              </div>
              <ShieldCheck className="w-6 h-6 text-blue-800 shrink-0" />
            </div>

            {/* Student Info & QR Code */}
            <div className="my-4 flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <div className="font-bold text-sm text-slate-900 leading-snug">
                  {student.fullName}
                </div>
                <div className="text-[11px] text-blue-900 font-semibold">
                  {student.filiere}
                </div>
                <div className="pt-2 space-y-0.5 text-[11px] text-slate-600 font-mono">
                  <div>
                    <span className="text-slate-400 font-sans">Code Massar :</span>{' '}
                    <strong>{student.massarCode}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans">CIN :</span>{' '}
                    <strong>{student.cin}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-sans">N° Carte :</span>{' '}
                    <strong>{student.cardNumber}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {student.email}
                  </div>
                </div>
              </div>

              {/* Rendered QR Code */}
              <div className="w-28 h-28 bg-white border border-slate-200 rounded-xl p-1 shadow-xs shrink-0 flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code ${student.fullName}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-[10px] text-slate-400 text-center">Génération QR...</div>
                )}
              </div>
            </div>

            {/* Bottom Barcode / Identifier */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>USMBA / Service des Bibliothèques</span>
              <span className="text-blue-700 font-semibold">BIBLIO VERIFIED</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between no-print">
          <span className="text-[11px] text-neutral-500">
            {lang === 'ar'
              ? 'يمكنك مسح رمز QR من الشاشة مباشرة'
              : 'Vous pouvez scanner ce QR code directement sur l’écran.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-100 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
