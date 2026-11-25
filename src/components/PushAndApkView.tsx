import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  Download,
  ExternalLink,
  FileArchive,
  MapPin,
  Smartphone,
  Volume2,
} from 'lucide-react';
import { buildAndroidKitZip } from '../utils/androidKit';
import { PWAInstallButton } from './PWAInstallButton';
import type { PushPreference } from '../types/seismic';

interface PushAndApkViewProps {
  preferences: PushPreference;
  onUpdatePreferences: (next: PushPreference) => void;
  pushSubscribed: boolean;
  pushStatusMsg: string;
  onEnablePush: () => Promise<void>;
  onDisablePush: () => Promise<void>;
  onTestAlarm: (magnitude: number) => Promise<void>;
  onRequestLocation: () => void;
  userCoords: { lat: number; lon: number } | null;
}

export const PushAndApkView: React.FC<PushAndApkViewProps> = ({
  preferences,
  onUpdatePreferences,
  pushSubscribed,
  pushStatusMsg,
  onEnablePush,
  onDisablePush,
  onTestAlarm,
  onRequestLocation,
  userCoords,
}) => {
  const [testMag, setTestMag] = useState(4.8);
  const [busyPush, setBusyPush] = useState(false);
  const [downloadingKit, setDownloadingKit] = useState(false);

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const notifPermission =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';

  const standaloneUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?tab=alerts`
      : '/?tab=alerts';

  const handleDownloadAndroidKit = async () => {
    setDownloadingKit(true);
    try {
      let blob: Blob | null = null;
      try {
        const res = await fetch('/api/android-kit', { cache: 'no-store' });
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          // Verify PK\x03\x04 ZIP header
          if (bytes.length > 22 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
            blob = new Blob([buf], { type: 'application/zip' });
          }
        }
      } catch {
        // Fallback to client-side JSZip below
      }

      if (!blob) {
        const zip = buildAndroidKitZip(window.location.origin);
        blob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'seismalert-ro-mobile-github-kit.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    } finally {
      setDownloadingKit(false);
    }
  };

  const handleTogglePush = async () => {
    setBusyPush(true);
    try {
      if (pushSubscribed) {
        await onDisablePush();
      } else {
        await onEnablePush();
      }
    } finally {
      setBusyPush(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personalized Real-Time Push Configuration */}
        <div className="rounded-xl border border-slate-800 bg-[#0B111C] p-5 space-y-5">
          <div>
            <h2 className="text-lg font-display font-bold text-white">
              Alerte Push Personalizate în Timp Real
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Prag minim obligatoriu: 3.0 grade Richter. Alertele audio sunt active exclusiv pentru România, iar pentru cutremurele majore din România <strong>M &gt; 5.5</strong> se emite o <strong>sirenă de urgență specifică, distinctă</strong> (canal nativ de alarmă în APK + push de mare prioritate în fundal).
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="pref-mag" className="font-medium text-slate-300">
                  Magnitudine minimă alertă push (Richter)
                </label>
                <span className="font-mono tabular-nums font-bold text-red-400">
                  M ≥ {preferences.minMagnitude.toFixed(1)}
                </span>
              </div>
              <input
                id="pref-mag"
                type="range"
                min={3.0}
                max={6.5}
                step={0.1}
                value={preferences.minMagnitude}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    minMagnitude: Math.max(3.0, Number(e.target.value)),
                  })
                }
                className="w-full accent-red-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1">
                <span>3.0 (Standard)</span>
                <span>4.5 (Moderat)</span>
                <span>6.5 (Major)</span>
              </div>
            </div>

            <div>
              <label htmlFor="pref-radius" className="block text-xs font-medium text-slate-300 mb-1.5">
                Filtru distanță față de poziția GPS
              </label>
              <div className="flex flex-wrap gap-2">
                {[0, 150, 350, 800].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onUpdatePreferences({ ...preferences, radiusKm: r })}
                    className={`px-3 py-2 text-xs font-mono rounded-lg border transition-colors min-h-[38px] ${
                      preferences.radiusKm === r
                        ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300'
                        : 'border-slate-800 bg-[#070B12] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r === 0 ? 'Global (Toate)' : `< ${r} km`}
                  </button>
                ))}
              </div>
              {preferences.radiusKm > 0 && !userCoords && (
                <button
                  type="button"
                  onClick={onRequestLocation}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Activați GPS pentru a calcula distanța exactă
                </button>
              )}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  onUpdatePreferences({
                    ...preferences,
                    soundEnabled: !preferences.soundEnabled,
                  })
                }
                className={`w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs font-medium min-h-[44px] ${
                  preferences.soundEnabled
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                    : 'border-slate-800 bg-[#070B12] text-slate-400'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Sirenă Sonoră Alarmă (Exclusiv România)
                </span>
                <span className="font-mono">{preferences.soundEnabled ? 'ACTIV' : 'OPRIT'}</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-3">
            {isInIframe && !pushSubscribed && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 space-y-2">
                <p className="text-xs text-amber-200 leading-relaxed">
                  Aplicația rulează în fereastra de previzualizare (iframe), unde browserul blochează automat fereastra de acord pentru <strong>Notificări Push</strong>. Deschide aplicația direct într-o filă proprie a browserului pentru a permite notificările:
                </p>
                <a
                  href={standaloneUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors min-h-[38px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Deschide direct în browser (pentru Notificări Push)
                </a>
              </div>
            )}

            <button
              type="button"
              disabled={busyPush}
              onClick={() => void handleTogglePush()}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors min-h-[48px] ${
                pushSubscribed
                  ? 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              {pushSubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {busyPush
                ? 'Se configurează canalul push...'
                : pushSubscribed
                ? 'Dezactivează Notificările Push'
                : 'Activează Notificări Push în Timp Real'}
            </button>

            {pushStatusMsg && (
              <p className="text-xs leading-relaxed text-amber-300">{pushStatusMsg}</p>
            )}

            {!isInIframe && notifPermission === 'denied' && !pushStatusMsg && (
              <p className="text-xs leading-relaxed text-amber-300">
                Permisiunea pentru notificări este blocată în browser. Apasă pictograma lacăt/setări din bara de adresă → Permisiuni → Notificări → Permite, apoi reîncarcă pagina.
              </p>
            )}
          </div>

          {/* Test Alarm Simulator */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Verificare Completă Senzor + Alarmă + Push
                </div>
                <div className="text-xs text-slate-500">
                  Compară alarma standard România (M 3.0–5.5) cu sirena specifică majoră (M &gt; 5.5)
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={testMag}
                  onChange={(e) => setTestMag(Number(e.target.value))}
                  aria-label="Magnitudine test"
                  className="rounded-lg border border-slate-800 bg-[#070B12] px-2.5 py-2 text-xs font-mono text-slate-200 min-h-[40px]"
                >
                  <option value={3.2}>M 3.2 (Standard RO)</option>
                  <option value={4.8}>M 4.8 (Standard RO)</option>
                  <option value={5.8}>M 5.8 (Sirenă Majoră RO &gt; 5.5)</option>
                  <option value={6.4}>M 6.4 (Sirenă Majoră RO &gt; 5.5)</option>
                </select>
                <button
                  type="button"
                  onClick={() => void onTestAlarm(testMag)}
                  className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors min-h-[40px] whitespace-nowrap"
                >
                  Declanșează Test
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-red-300">Sirenă Specifică România (M &gt; 5.5):</strong> sunet civil-defense distinct (<code className="text-red-200">ro_major_quake_siren.wav</code>) + vibrație SOS intensă + prioritate maximă.
              </div>
              <button
                type="button"
                onClick={() => void onTestAlarm(5.8)}
                className="rounded-lg border border-red-500/50 bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-600/35 transition-colors whitespace-nowrap min-h-[36px]"
              >
                Testează Sirenă Majoră (M 5.8)
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Installation (PWA) + GitHub / Android APK / iOS IPA Kit */}
        <div className="rounded-xl border border-slate-800 bg-[#0B111C] p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Smartphone className="w-4 h-4" />
              <span>INSTALARE MOBIL · GITHUB · ANDROID APK &amp; iOS IPA</span>
            </div>
            <h2 className="text-lg font-display font-bold text-white">
              Instalare Directă (PWA) &amp; Kit GitHub Android + iOS
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Aplicația este configurată ca <strong>Progressive Web App (PWA)</strong> instalabilă instantaneu pe Android sau iPhone (Safari → <em>Add to Home Screen</em>), iar pentru compilare nativă include kitul complet <strong>Capacitor Android + iOS + GitHub Actions</strong>.
            </p>

            <div className="rounded-lg border border-slate-800 bg-[#070B12] p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                Opțiunea 1: Instalare directă pe telefon (Android Chrome / iPhone Safari)
              </div>
              <p className="text-xs text-slate-400">
                Funcționează în mod standalone cu acces offline la planul de siguranță și fluierul SOS.
              </p>
              <PWAInstallButton />
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#070B12] p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                Opțiunea 2: Kit Complet GitHub + Android APK &amp; iOS IPA
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Arhiva include toate fișierele pentru GitHub (<code className="text-cyan-300">.gitignore</code>, <code className="text-cyan-300">.github/workflows/build-android-apk.yml</code>, <code className="text-cyan-300">.github/workflows/build-ios-ipa.yml</code>), configurarea nativă <strong>Android</strong> (<code className="text-slate-300">MainActivity.java</code> cu canalul <code className="text-slate-300">ro_major_quake_55</code> + <code className="text-slate-300">BUILD_SIGNED_APK.sh</code>) și configurarea nativă <strong>iOS</strong> (<code className="text-slate-300">AppDelegate.swift</code>, <code className="text-slate-300">Info.plist</code>, <code className="text-slate-300">ExportOptions.plist</code>, <code className="text-slate-300">BUILD_IOS.sh</code>), ambele cu fișierul audio dedicat <code className="text-cyan-300">ro_major_quake_siren.wav</code> pentru cutremure România <strong>M &gt; 5.5</strong>.
              </p>
              <button
                type="button"
                disabled={downloadingKit}
                onClick={() => void handleDownloadAndroidKit()}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors min-h-[42px]"
              >
                <FileArchive className="w-4 h-4" />
                {downloadingKit
                  ? 'Se pregătește arhiva ZIP...'
                  : 'Descarcă Kit GitHub + Android APK & iOS IPA (.zip)'}
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 text-xs font-mono text-slate-500 flex flex-wrap justify-between gap-2">
            <span>App ID: ro.seismalert.app</span>
            <span>Android APK (Ubuntu) + iOS IPA (macOS-14)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
