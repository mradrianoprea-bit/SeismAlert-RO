import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { TRANSLATIONS, type Language } from '../i18n/translations';

interface PWAInstallButtonProps {
  compact?: boolean;
  lang?: Language;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  lang = 'ro',
}) => {
  const t = TRANSLATIONS[lang];
  const isEn = lang === 'en';
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return (
      <span className="text-xs font-mono text-emerald-400 whitespace-nowrap shrink-0">
        {t.pwa.installed}
      </span>
    );
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Download className="w-4 h-4" />
        {compact ? (isEn ? 'Install' : 'Instalează') : t.pwa.installBtn}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 hover:border-cyan-500/60 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Smartphone className="w-4 h-4 text-cyan-400" />
        {compact
          ? isEn
            ? 'Mobile Install'
            : 'Instalare Mobil'
          : isEn
          ? 'Install on Phone'
          : 'Instalează pe Telefon'}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={isEn ? 'Phone installation guide' : 'Ghid instalare telefon'}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0F172A] p-6 text-slate-100">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-white">
                {isIOS
                  ? t.pwa.iosTitle
                  : isEn
                  ? 'Install on Android / Desktop'
                  : 'Instalare pe Android / Desktop'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label={t.pwa.close}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {isIOS ? (
              <ol className="mt-4 space-y-2 text-sm text-slate-300 list-decimal list-inside">
                {isEn ? (
                  <>
                    <li>
                      Tap the <strong>Share</strong> button in the Safari toolbar.
                    </li>
                    <li>
                      Scroll down and select <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                      Confirm <strong>Add</strong> for standalone mode and offline access.
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      Apăsați butonul <strong>Share</strong> din bara Safari.
                    </li>
                    <li>
                      Derulați și selectați <strong>Add to Home Screen</strong>.
                    </li>
                    <li>
                      Confirmați <strong>Add</strong> pentru mod standalone și acces offline.
                    </li>
                  </>
                )}
              </ol>
            ) : (
              <ol className="mt-4 space-y-2 text-sm text-slate-300 list-decimal list-inside">
                {isEn ? (
                  <>
                    <li>
                      Open the app in <strong>Google Chrome</strong> on your Android phone.
                    </li>
                    <li>
                      Tap the top-right menu <strong>⋮</strong> and select{' '}
                      <strong>Install app</strong> / <strong>Add to Home screen</strong>.
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      Deschideți aplicația în <strong>Google Chrome</strong> pe telefonul Android.
                    </li>
                    <li>
                      Apăsați meniul <strong>⋮</strong> din dreapta sus și selectați{' '}
                      <strong>Instalează aplicația</strong> / <strong>Add to Home Screen</strong>.
                    </li>
                  </>
                )}
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-700 transition-colors"
            >
              {isEn ? 'Got it' : 'Am înțeles'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
