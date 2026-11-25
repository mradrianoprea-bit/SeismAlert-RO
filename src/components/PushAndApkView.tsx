import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Smartphone,
  Volume2,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { TRANSLATIONS, type Language } from '../i18n/translations';
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
  lang?: Language;
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
  lang = 'ro',
}) => {
  const t = TRANSLATIONS[lang];
  const isEn = lang === 'en';
  const [testMag, setTestMag] = useState(4.8);
  const [busyPush, setBusyPush] = useState(false);

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
      ? `${window.location.origin}/?tab=alerts&lang=${lang}`
      : `/?tab=alerts&lang=${lang}`;

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
            <h2 className="text-lg font-display font-bold text-white">{t.alerts.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{t.alerts.subtitle}</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="pref-mag" className="font-medium text-slate-300">
                  {t.alerts.minMagLabel}
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
                <span>{t.alerts.scaleStandard}</span>
                <span>{t.alerts.scaleModerate}</span>
                <span>{t.alerts.scaleMajor}</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="pref-radius"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                {t.alerts.radiusLabel}
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
                    {r === 0 ? t.alerts.radiusGlobal : `< ${r} km`}
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
                  {t.alerts.enableGpsHint}
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
                  {t.alerts.sirenToggle}
                </span>
                <span className="font-mono">
                  {preferences.soundEnabled ? t.alerts.on : t.alerts.off}
                </span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-3">
            {isInIframe && !pushSubscribed && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 space-y-2">
                <p className="text-xs text-amber-200 leading-relaxed">{t.alerts.iframeNotice}</p>
                <a
                  href={standaloneUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors min-h-[38px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t.alerts.openInBrowser}
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
                ? t.alerts.pushConfiguring
                : pushSubscribed
                ? t.alerts.pushDisable
                : t.alerts.pushEnable}
            </button>

            {pushStatusMsg && (
              <p className="text-xs leading-relaxed text-amber-300">{pushStatusMsg}</p>
            )}

            {!isInIframe && notifPermission === 'denied' && !pushStatusMsg && (
              <p className="text-xs leading-relaxed text-amber-300">{t.alerts.deniedHint}</p>
            )}
          </div>

          {/* Test Alarm Simulator */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-200">{t.alerts.testTitle}</div>
                <div className="text-xs text-slate-500">{t.alerts.testSubtitle}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={testMag}
                  onChange={(e) => setTestMag(Number(e.target.value))}
                  aria-label={isEn ? 'Test magnitude' : 'Magnitudine test'}
                  className="rounded-lg border border-slate-800 bg-[#070B12] px-2.5 py-2 text-xs font-mono text-slate-200 min-h-[40px]"
                >
                  <option value={3.2}>M 3.2 (Standard RO)</option>
                  <option value={4.8}>M 4.8 (Standard RO)</option>
                  <option value={5.8}>
                    {isEn ? 'M 5.8 (Major RO Siren > 5.5)' : 'M 5.8 (Sirenă Majoră RO > 5.5)'}
                  </option>
                  <option value={6.4}>
                    {isEn ? 'M 6.4 (Major RO Siren > 5.5)' : 'M 6.4 (Sirenă Majoră RO > 5.5)'}
                  </option>
                </select>
                <button
                  type="button"
                  onClick={() => void onTestAlarm(testMag)}
                  className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-500 transition-colors min-h-[40px] whitespace-nowrap"
                >
                  {t.alerts.testBtn}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-red-300">{t.alerts.majorSirenBoxTitle}</strong>{' '}
                {t.alerts.majorSirenBoxDesc}
              </div>
              <button
                type="button"
                onClick={() => void onTestAlarm(5.8)}
                className="rounded-lg border border-red-500/50 bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-600/35 transition-colors whitespace-nowrap min-h-[36px]"
              >
                {t.alerts.majorSirenTestBtn}
              </button>
            </div>
          </div>
        </div>

        {/* Direct Mobile Installation (PWA) & Background Alert Info */}
        <div className="rounded-xl border border-slate-800 bg-[#0B111C] p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Smartphone className="w-4 h-4" />
              <span>{t.alerts.mobileEyebrow}</span>
            </div>
            <h2 className="text-lg font-display font-bold text-white">{t.alerts.mobileTitle}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{t.alerts.mobileDesc}</p>

            <div className="rounded-lg border border-slate-800 bg-[#070B12] p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-200">{t.alerts.opt1Title}</div>
              <p className="text-xs text-slate-400">{t.alerts.opt1Desc}</p>
              <PWAInstallButton lang={lang} />
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#070B12] p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.alerts.opt2Title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{t.alerts.opt2Desc}</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 text-xs font-mono text-slate-500 flex flex-wrap justify-between gap-2">
            <span>App ID: ro.seismalert.app</span>
            <span>PWA · Android &amp; iOS Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
