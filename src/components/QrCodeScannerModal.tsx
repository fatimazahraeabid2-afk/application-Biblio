import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  X,
  AlertCircle,
  Upload,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Video,
  UserCheck,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { api, Loan, UniversityStudent } from '../services/api';

interface QrCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (qrPayload: string) => void;
  title: string;
  description?: string;
  lang: Language;
}

interface CameraDeviceOption {
  deviceId: string;
  label: string;
}

interface BiblioStudentRecord {
  id: string;
  name: string;
  email: string;
  cardNumber: string;
  filiere?: string;
  massarCode?: string;
  cin?: string;
}

interface ScannedLookupResult {
  rawPayload: string;
  resolvedPayload: string;
  universityStudent: UniversityStudent | null;
  biblioStudent: BiblioStudentRecord | null;
  activeLoans: Loan[];
  isRegisteredInBiblio: boolean;
  source: 'camera' | 'image' | 'manual';
}

const VALID_BIBLIO_QR_REGEX =
  /^(USMBA-[A-Z0-9:._@-]+|[A-Z]\d{6,12}|[^\s@]+@usmba\.ac\.ma|(usr|univ)-[a-z0-9-]+)$/i;

export const QrCodeScannerModal: React.FC<QrCodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title,
  description,
  lang,
}) => {
  const t = translations[lang];
  const isRegisterMode = title === t.scanStudentCard;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isOpenRef = useRef(isOpen);
  const isStartingRef = useRef(false);
  const isScanningRef = useRef(false);
  const lastDecodeAttemptRef = useRef(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [manualInput, setManualInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScannedLookupResult | null>(null);

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors during cleanup
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Ignore pause errors
      }
      videoRef.current.srcObject = null;
    }

    if (isMountedRef.current) {
      setCameraActive(false);
      setCameraStarting(false);
    }
  }, []);

  const refreshCameraList = useCallback(
    async (activeTrack?: MediaStreamTrack) => {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
        return;
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter((d) => d.kind === 'videoinput')
          .map((d, idx) => ({
            deviceId: d.deviceId,
            label:
              d.label ||
              (lang === 'ar' ? `كاميرا ${idx + 1}` : `Caméra ${idx + 1}`),
          }));

        if (!isMountedRef.current) return;
        setCameras(videoDevices);

        const activeDeviceId = activeTrack?.getSettings?.().deviceId;
        if (activeDeviceId) {
          setSelectedDeviceId(activeDeviceId);
        } else if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch {
        // Ignore enumeration errors if device labels aren't exposed
      }
    },
    [lang, selectedDeviceId]
  );

  const validateAndLookupPayload = useCallback(
    async (rawText: string, source: 'camera' | 'image' | 'manual') => {
      const payload = rawText.trim();

      if (!payload) {
        setLookupError(
          lang === 'ar' ? 'رمز QR فارغ أو غير صالح.' : 'Le contenu du QR Code est vide.'
        );
        return;
      }

      if (
        payload.length > 300 ||
        /^https?:\/\//i.test(payload) ||
        !VALID_BIBLIO_QR_REGEX.test(payload)
      ) {
        setLookupError(
          lang === 'ar'
            ? `تنسيق رمز QR غير معروف لنظام Biblio (${payload.slice(0, 60)}).`
            : `Format de QR Code non reconnu par Biblio USMBA (« ${payload.slice(0, 60)}${
                payload.length > 60 ? '…' : ''
              } »).`
        );
        return;
      }

      setIsLookingUp(true);
      setLookupError(null);

      try {
        const [univSettled, biblioSettled] = await Promise.allSettled([
          api.lookupUniversityStudentByQr(payload),
          api.lookupBiblioStudentByQr(payload),
        ]);

        const univRes =
          univSettled.status === 'fulfilled' && univSettled.value.found
            ? univSettled.value
            : null;

        let biblioRes =
          biblioSettled.status === 'fulfilled' && biblioSettled.value.found
            ? biblioSettled.value
            : null;

        let resolvedForBiblioLookup = payload;

        // Fallback for seeded students whose user entry matches by email when scanned via USMBA-STUDENT:...
        if (!biblioRes) {
          const fallbackEmail =
            univRes?.isRegisteredInBiblio && univRes.student?.email
              ? univRes.student.email
              : payload.toLowerCase().startsWith('usmba-student:') && payload.includes('@')
              ? payload.slice('usmba-student:'.length).trim()
              : null;

          if (fallbackEmail) {
            try {
              const fallbackBiblio = await api.lookupBiblioStudentByQr(fallbackEmail);
              if (fallbackBiblio.found && fallbackBiblio.student) {
                biblioRes = fallbackBiblio;
                resolvedForBiblioLookup = fallbackEmail;
              }
            } catch {
              // Keep null if email lookup also fails
            }
          }
        }

        if (!univRes && !biblioRes) {
          setLookupError(
            lang === 'ar'
              ? `لم يتم العثور على أي طالب مطابق لهذا الرمز (${payload}) في قاعدة البيانات.`
              : `Aucun étudiant correspondant au code « ${payload} » n’a été trouvé dans la base de données.`
          );
          return;
        }

        if (!isRegisterMode && !biblioRes) {
          const studentName = univRes?.student?.fullName || payload;
          setLookupError(
            lang === 'ar'
              ? `الطالب ${studentName} موجود في قاعدة الجامعة لكنه غير مسجل بعد في مكتبة Biblio.`
              : `${studentName} existe dans la base universitaire, mais n’est pas encore inscrit(e) à la bibliothèque Biblio.`
          );
          return;
        }

        if (!isMountedRef.current) return;

        setScanResult({
          rawPayload: payload,
          resolvedPayload: isRegisterMode ? payload : resolvedForBiblioLookup,
          universityStudent: univRes?.student || null,
          biblioStudent: biblioRes?.student || null,
          activeLoans: biblioRes?.activeLoans || [],
          isRegisteredInBiblio: Boolean(univRes?.isRegisteredInBiblio || biblioRes),
          source,
        });
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setLookupError(
          err?.message ||
            (lang === 'ar'
              ? 'حدث خطأ أثناء البحث في قاعدة البيانات.'
              : 'Erreur lors de la vérification du QR Code dans la base de données.')
        );
      } finally {
        if (isMountedRef.current) {
          setIsLookingUp(false);
        }
      }
    },
    [isRegisterMode, lang]
  );

  const scanFrame = useCallback(() => {
    if (!isScanningRef.current || !isOpenRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
      const now = performance.now();
      if (now - lastDecodeAttemptRef.current >= 85) {
        lastDecodeAttemptRef.current = now;

        const maxDim = 720;
        const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
        const targetWidth = Math.max(1, Math.round(video.videoWidth * scale));
        const targetHeight = Math.max(1, Math.round(video.videoHeight * scale));

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, targetWidth, targetHeight);
          const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (code && code.data && code.data.trim()) {
            stopCamera();
            void validateAndLookupPayload(code.data, 'camera');
            return;
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera, validateAndLookupPayload]);

  const mapCameraError = useCallback(
    (err: unknown): string => {
      const name = err instanceof DOMException ? err.name : (err as any)?.name || '';

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return lang === 'ar'
          ? 'تم رفض إذن الكاميرا. يرجى السماح بالوصول إلى الكاميرا في إعدادات المتصفح ثم المحاولة مجدداً.'
          : 'Permission d’accès à la caméra refusée. Veuillez autoriser la caméra dans votre navigateur puis réessayer.';
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return lang === 'ar'
          ? 'لم يتم العثور على أي كاميرا متصلة بهذا الجهاز.'
          : 'Aucune caméra détectée sur cet appareil.';
      }
      if (name === 'NotReadableError' || name === 'TrackStartError') {
        return lang === 'ar'
          ? 'الكاميرا قيد الاستخدام حالياً من طرف تطبيق آخر أو يتعذر تشغيلها.'
          : 'La caméra est déjà utilisée par une autre application ou est temporairement inaccessible.';
      }
      if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
        return lang === 'ar'
          ? 'الكاميرا المحددة لا تدعم الإعدادات المطلوبة. جرب اختيار كاميرا أخرى.'
          : 'La caméra sélectionnée ne supporte pas la résolution demandée. Essayez une autre caméra.';
      }
      if (name === 'SecurityError') {
        return lang === 'ar'
          ? 'يتطلب الوصول إلى الكاميرا اتصالاً آمناً (HTTPS).'
          : 'L’accès à la caméra nécessite une connexion sécurisée (HTTPS ou localhost).';
      }

      return lang === 'ar'
        ? 'تعذر تشغيل الكاميرا. تحقق من أذونات المتصفح أو قم بتحميل صورة QR.'
        : 'Impossible de démarrer la caméra. Vérifiez les permissions du navigateur ou chargez une image QR.';
    },
    [lang]
  );

  const startCamera = useCallback(
    async (deviceIdOverride?: string) => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      setCameraError(null);
      setLookupError(null);
      setScanResult(null);
      setCameraStarting(true);

      try {
        if (!window.isSecureContext) {
          setCameraError(
            lang === 'ar'
              ? 'الوصول إلى الكاميرا غير مسموح في سياق غير آمن. يرجى فتح التطبيق عبر HTTPS أو localhost.'
              : 'Contexte non sécurisé détecté : la caméra nécessite HTTPS ou localhost pour fonctionner.'
          );
          return;
        }

        if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
          setCameraError(
            lang === 'ar'
              ? 'هذا المتصفح لا يدعم واجهة الكاميرا getUserMedia.'
              : 'Votre navigateur ne prend pas en charge l’accès caméra (navigator.mediaDevices.getUserMedia).'
          );
          return;
        }

        // Stop any existing stream cleanly before starting a new one
        stopCamera();
        setCameraStarting(true);

        const targetDeviceId = deviceIdOverride ?? selectedDeviceId;
        let stream: MediaStream;

        try {
          const videoConstraints: MediaTrackConstraints = targetDeviceId
            ? {
                deviceId: { exact: targetDeviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              };

          stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
        } catch (constraintErr: any) {
          // Fallback to generic video stream when specific facingMode/resolution is rejected
          if (
            !targetDeviceId &&
            (constraintErr?.name === 'OverconstrainedError' ||
              constraintErr?.name === 'ConstraintNotSatisfiedError')
          ) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } else {
            throw constraintErr;
          }
        }

        // If modal was closed or unmounted while waiting for permission, release tracks immediately
        if (!isMountedRef.current || !isOpenRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          return;
        }

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        await video.play();

        if (!isMountedRef.current || !isOpenRef.current) {
          stopCamera();
          return;
        }

        const primaryTrack = stream.getVideoTracks()[0];
        await refreshCameraList(primaryTrack);

        setCameraActive(true);
        isScanningRef.current = true;
        lastDecodeAttemptRef.current = 0;
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        stopCamera();
        if (isMountedRef.current) {
          setCameraError(mapCameraError(err));
        }
      } finally {
        isStartingRef.current = false;
        if (isMountedRef.current) {
          setCameraStarting(false);
        }
      }
    },
    [lang, mapCameraError, refreshCameraList, scanFrame, selectedDeviceId, stopCamera]
  );

  // Sync open state without auto-starting the camera (requires explicit user click)
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (!isOpen) {
      stopCamera();
      setCameraError(null);
      setLookupError(null);
      setScanResult(null);
      setManualInput('');
      setIsLookingUp(false);
    } else {
      setCameraError(null);
      setLookupError(null);
      setScanResult(null);
      setManualInput('');
      setIsLookingUp(false);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  // Ensure tracks always stop on unmount or page navigation
  useEffect(() => {
    isMountedRef.current = true;
    const handlePageHide = () => stopCamera();
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('pagehide', handlePageHide);
      stopCamera();
    };
  }, [stopCamera]);

  const handleCloseModal = () => {
    stopCamera();
    onClose();
  };

  const handleCameraChange = (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    if (cameraActive) {
      void startCamera(newDeviceId);
    }
  };

  // Decode QR code from an uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCameraError(null);
    setLookupError(null);
    setScanResult(null);

    const reader = new FileReader();
    reader.onerror = () => {
      setCameraError(
        lang === 'ar'
          ? 'تعذر قراءة ملف الصورة المحدد.'
          : 'Impossible de lire le fichier image sélectionné.'
      );
    };
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        setCameraError(
          lang === 'ar'
            ? 'الملف المحدد ليس صورة صالحة.'
            : 'Le fichier sélectionné n’est pas une image valide.'
        );
      };
      img.onload = () => {
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data && code.data.trim()) {
          stopCamera();
          void validateAndLookupPayload(code.data, 'image');
        } else {
          setCameraError(
            lang === 'ar'
              ? 'لم يتم العثور على رمز QR صالح في الصورة المرفوعة.'
              : 'Aucun QR code valide détecté dans l’image sélectionnée.'
          );
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmResult = () => {
    if (!scanResult) return;
    const payload = scanResult.resolvedPayload;
    stopCamera();
    onScanSuccess(payload);
    onClose();
  };

  const handleResetScan = () => {
    setScanResult(null);
    setLookupError(null);
    setCameraError(null);
  };

  if (!isOpen) return null;

  const displayStudentName =
    scanResult?.biblioStudent?.name || scanResult?.universityStudent?.fullName || '';
  const displayFiliere =
    scanResult?.biblioStudent?.filiere || scanResult?.universityStudent?.filiere || '';
  const displayCardNumber =
    scanResult?.biblioStudent?.cardNumber || scanResult?.universityStudent?.cardNumber || '';
  const displayMassar =
    scanResult?.biblioStudent?.massarCode || scanResult?.universityStudent?.massarCode || '';
  const displayCin =
    scanResult?.biblioStudent?.cin || scanResult?.universityStudent?.cin || '';
  const displayEmail =
    scanResult?.biblioStudent?.email || scanResult?.universityStudent?.email || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{title}</h3>
              {description && <p className="text-[11px] text-slate-500">{description}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Fermer'}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Camera Selector (visible when multiple cameras exist) */}
          {cameras.length > 1 && (
            <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <label
                htmlFor="biblio-camera-select"
                className="flex items-center gap-1.5 font-semibold text-slate-700 shrink-0"
              >
                <Video className="w-3.5 h-3.5 text-blue-600" />
                <span>{lang === 'ar' ? 'اختيار الكاميرا :' : 'Caméra :'}</span>
              </label>
              <select
                id="biblio-camera-select"
                value={selectedDeviceId}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {cameras.map((cam) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Video Scanner View */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 flex items-center justify-center border border-slate-300 shadow-inner">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Target Reticle / Scanner Overlay */}
            {cameraActive && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 border-2 border-blue-400 rounded-2xl relative shadow-[0_0_0_9999px_rgba(2,6,23,0.35)]">
                    <div className="absolute inset-0 border-2 border-dashed border-white/70 rounded-2xl animate-pulse" />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-blue-300 font-mono text-[10px] px-2.5 py-0.5 rounded-full border border-blue-500/40">
                      {lang === 'ar' ? 'ضع رمز QR هنا' : 'Placer le QR code ici'}
                    </div>
                  </div>
                </div>

                {/* Live Stop Camera Control */}
                <div className="absolute bottom-3 inset-x-0 flex justify-center">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3.5 py-1.5 bg-red-600/95 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إيقاف الكاميرا' : 'Arrêter la caméra'}</span>
                  </button>
                </div>
              </>
            )}

            {/* Idle / Activation Prompt Overlay */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-300 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center">
                  {cameraStarting || isLookingUp ? (
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-blue-400" />
                  )}
                </div>

                <div className="space-y-1 max-w-xs">
                  <p className="text-xs font-medium text-slate-200">
                    {cameraStarting
                      ? lang === 'ar'
                        ? 'جاري تشغيل الكاميرا وطلب الإذن...'
                        : 'Activation de la caméra et demande d’autorisation...'
                      : isLookingUp
                      ? lang === 'ar'
                        ? 'جاري التحقق من رمز QR في قاعدة البيانات...'
                        : 'Vérification du QR Code dans la base Biblio...'
                      : lang === 'ar'
                      ? 'اضغط على الزر أدناه لتفعيل الكاميرا ومسح بطاقة الطالب.'
                      : 'Cliquez ci-dessous pour activer la caméra et scanner le QR code.'}
                  </p>
                </div>

                {!cameraStarting && !isLookingUp && (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-md transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تفعيل الكاميرا' : 'Activer la caméra'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Camera / Validation Errors */}
          {(cameraError || lookupError) && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <div className="flex-1 space-y-1">
                <p className="font-medium leading-relaxed">{lookupError || cameraError}</p>
                {!cameraActive && (
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="text-[11px] font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{lang === 'ar' ? 'إعادة المحاولة بالكاميرا' : 'Réessayer avec la caméra'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Real Scan Result Display */}
          {scanResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      {lang === 'ar' ? 'تم مسح رمز QR بنجاح' : 'QR Code détecté et vérifié'}
                    </h4>
                    <p className="text-[11px] text-emerald-800 font-mono break-all">
                      {scanResult.rawPayload}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-emerald-200 text-[10px] font-semibold text-emerald-700 shrink-0">
                  {scanResult.isRegisteredInBiblio
                    ? lang === 'ar'
                      ? 'مسجل في Biblio'
                      : 'Inscrit Biblio'
                    : lang === 'ar'
                    ? 'قاعدة الجامعة'
                    : 'Base USMBA'}
                </span>
              </div>

              <div className="bg-white rounded-xl border border-emerald-100 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>{displayStudentName}</span>
                  </span>
                  {displayCardNumber && (
                    <span className="font-mono text-[11px] text-blue-700 font-semibold">
                      {displayCardNumber}
                    </span>
                  )}
                </div>

                {displayFiliere && (
                  <p className="text-[11px] text-slate-600">{displayFiliere}</p>
                )}

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-600 font-mono">
                  {displayMassar && (
                    <div>
                      <span className="text-slate-400 font-sans">Massar : </span>
                      <span className="font-semibold text-slate-800">{displayMassar}</span>
                    </div>
                  )}
                  {displayCin && (
                    <div>
                      <span className="text-slate-400 font-sans">CIN : </span>
                      <span className="font-semibold text-slate-800">{displayCin}</span>
                    </div>
                  )}
                </div>

                {displayEmail && (
                  <p className="text-[11px] text-slate-500 font-mono truncate">{displayEmail}</p>
                )}

                {scanResult.biblioStudent && (
                  <div className="pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-700">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      {lang === 'ar'
                        ? `الإعارات الجارية : ${scanResult.activeLoans.length}`
                        : `Emprunts en cours : ${scanResult.activeLoans.length}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResetScan}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'مسح رمز آخر' : 'Scanner à nouveau'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResult}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تأكيد واستخدام' : 'Confirmer et utiliser'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Upload QR Image Option */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-blue-700 font-medium">
              <Upload className="w-4 h-4 text-neutral-500" />
              <span>
                {lang === 'ar'
                  ? 'أو قم بتحميل صورة QR من جهازك'
                  : 'Ou charger une photo / image QR code'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Manual Identifier Input */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualInput.trim() && !isLookingUp) {
                  e.preventDefault();
                  stopCamera();
                  void validateAndLookupPayload(manualInput.trim(), 'manual');
                }
              }}
              placeholder={
                lang === 'ar'
                  ? 'أدخل رمز البطاقة يدوياً (مثال: USMBA-2024-8841)...'
                  : 'Saisir identifiant QR / Carte (ex: USMBA-2024-8841)...'
              }
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
            />
            <button
              type="button"
              onClick={() => {
                if (manualInput.trim()) {
                  stopCamera();
                  void validateAndLookupPayload(manualInput.trim(), 'manual');
                }
              }}
              disabled={!manualInput.trim() || isLookingUp}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-40 transition-colors shadow-xs"
            >
              {lang === 'ar' ? 'تحقق' : 'Valider'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div>
            {cameraActive && (
              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-1.5 text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <CameraOff className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'إيقاف الكاميرا' : 'Arrêter la caméra'}</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-1.5 text-neutral-600 hover:text-neutral-900 text-xs font-semibold"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
