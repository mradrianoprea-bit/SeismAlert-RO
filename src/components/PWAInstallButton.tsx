import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return (
      <span className="text-xs font-mono text-emerald-400 whitespace-nowrap shrink-0">
        Instalat pe dispozitiv
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
        {compact ? 'Instalează' : 'Instalează Aplicația'}
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
        {compact ? 'Instalare Mobil' : 'Instalează pe Telefon'}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Ghid instalare telefon"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0F172A] p-6 text-slate-100">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-white">
                {isIOS ? 'Instalare pe iPhone / iPad' : 'Instalare pe Android / Desktop'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Închide ghidul"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {isIOS ? (
              <ol className="mt-4 space-y-2 text-sm text-slate-300 list-decimal list-inside">
                <li>Apăsați butonul <strong>Share</strong> din bara Safari.</li>
                <li>Derulați și selectați <strong>Add to Home Screen</strong>.</li>
                <li>Confirmați <strong>Add</strong> pentru mod standalone și acces offline.</li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-2 text-sm text-slate-300 list-decimal list-inside">
                <li>Deschideți aplicația în <strong>Google Chrome</strong> pe telefonul Android.</li>
                <li>Apăsați meniul <strong>⋮</strong> din dreapta sus și selectați <strong>Instalează aplicația</strong> / <strong>Add to Home Screen</strong>.</li>
                <li>Pentru compilare <strong>.APK semnat nativ</strong>, descărcați pachetul Capacitor din secțiunea <strong>Alerte &amp; Telefon</strong>.</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-lg bg-slate-800 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-700 transition-colors"
            >
              Am înțeles
            </button>
          </div>
        </div>
      )}
    </>
  );
};
