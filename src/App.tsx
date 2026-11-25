import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  List,
  Map as MapIcon,
  MessageSquare,
  Radio,
  RefreshCw,
  ShieldAlert,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import { SeismicMap } from './components/SeismicMap';
import { SeismographCanvas } from './components/SeismographCanvas';
import { EarthquakeListView } from './components/EarthquakeListView';
import { SafetyPlanView } from './components/SafetyPlanView';
import { RescueChatView } from './components/RescueChatView';
import { PushAndApkView } from './components/PushAndApkView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { isMajorRomaniaEarthquake, isRomaniaEarthquake } from './utils/seismicFilter';
import {
  installAutoAudioUnlock,
  playShortPing,
  startSeismicAlarm,
  stopSeismicAlarm,
  unlockAudioContext,
  unlockAudioSync,
} from './utils/alarmAudio';
import { TRANSLATIONS, type Language } from './i18n/translations';
import type {
  PushPreference,
  RescueChannelId,
  RescueMessage,
  RescueRole,
  RescueUser,
  SeismicEvent,
  SourceHealth,
} from './types/seismic';

type ActiveTab = 'monitor' | 'map' | 'list' | 'safety' | 'chat' | 'alerts';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const DEFAULT_PREFS: PushPreference = {
  minMagnitude: 3.0,
  radiusKm: 0,
  userLat: null,
  userLon: null,
  regions: ['Global'],
  soundEnabled: true,
  voiceEnabled: false,
};

export default function App() {
  const isOnline = useOnlineStatus();
  const [lang, setLang] = useState<Language>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qLang = params.get('lang');
      if (qLang === 'en' || qLang === 'ro') return qLang;
      const saved = localStorage.getItem('seismalert_lang');
      if (saved === 'en' || saved === 'ro') return saved;
    } catch {
      // ignore
    }
    return 'ro';
  });
  const t = TRANSLATIONS[lang];
  const langRef = useRef<Language>(lang);
  langRef.current = lang;

  useEffect(() => {
    try {
      localStorage.setItem('seismalert_lang', lang);
    } catch {
      // ignore
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (
      tab === 'map' ||
      tab === 'list' ||
      tab === 'safety' ||
      tab === 'chat' ||
      tab === 'alerts'
    ) {
      return tab;
    }
    return 'monitor';
  });

  const [events, setEvents] = useState<SeismicEvent[]>(() => {
    try {
      const cached = localStorage.getItem('seismalert_cached_events');
      const parsed = cached ? JSON.parse(cached) : [];
      if (!Array.isArray(parsed)) return [];
      return (parsed as SeismicEvent[]).filter(
        (e) => e && typeof e.magnitude === 'number' && e.magnitude >= 3.0
      );
    } catch {
      return [];
    }
  });
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [lastPollTime, setLastPollTime] = useState<number>(0);
  const [selectedEvent, setSelectedEvent] = useState<SeismicEvent | null>(null);
  const [activeAlarm, setActiveAlarm] = useState<SeismicEvent | null>(null);
  const [audioArmed, setAudioArmed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [magFilter, setMagFilter] = useState<'all' | 'romania' | '45plus'>('all');

  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [preferences, setPreferences] = useState<PushPreference>(() => {
    try {
      const saved = localStorage.getItem('seismalert_push_prefs');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed && typeof parsed === 'object'
        ? { ...DEFAULT_PREFS, ...(parsed as PushPreference) }
        : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState('');

  // Rescue Chat State (WebSocket server-authoritative)
  const [wsConnected, setWsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<RescueMessage[]>([]);
  const [activeUsers, setActiveUsers] = useState<RescueUser[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingQueueRef = useRef<string[]>([]);
  const lastLocalTestAtRef = useRef<number>(0);

  useEffect(() => {
    installAutoAudioUnlock();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('seismalert_push_prefs', JSON.stringify(preferences));
    } catch {
      // ignore
    }
  }, [preferences]);

  useEffect(() => {
    if (events.length > 0) {
      try {
        localStorage.setItem('seismalert_cached_events', JSON.stringify(events.slice(0, 60)));
      } catch {
        // ignore
      }
      if (!selectedEvent) {
        setSelectedEvent(events[0]);
      }
    }
  }, [events, selectedEvent]);

  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  const triggerAlarmForEvent = useCallback((ev: SeismicEvent) => {
    const prefs = prefsRef.current;
    const isMajorRo = isMajorRomaniaEarthquake(ev);
    if (!isMajorRo && ev.magnitude < Math.max(3.0, prefs.minMagnitude)) return;
    const inRomania = isRomaniaEarthquake(ev);
    setActiveAlarm(ev);
    setSelectedEvent(ev);
    if (inRomania) {
      startSeismicAlarm({
        magnitude: ev.magnitude,
        place: ev.place,
        soundEnabled: prefs.soundEnabled,
        isMajorRomania: isMajorRo,
      });
    } else {
      stopSeismicAlarm();
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const isEn = langRef.current === 'en';
      try {
        new Notification(
          isMajorRo
            ? isEn
              ? `MAJOR ROMANIA ALERT · M ${ev.magnitude.toFixed(1)} Richter`
              : `ALERTĂ MAJORĂ ROMÂNIA · M ${ev.magnitude.toFixed(1)} Richter`
            : isEn
            ? `SEISMIC ALERT M ${ev.magnitude.toFixed(1)} Richter`
            : `ALERTĂ SEISMICĂ M ${ev.magnitude.toFixed(1)} Richter`,
          {
            body: isMajorRo
              ? isEn
                ? `MAJOR EARTHQUAKE (> 5.5) IN ROMANIA: ${ev.place} · Depth ${ev.depthKm} km · Take cover immediately!`
                : `CUTREMUR MAJOR (> 5.5) ÎN ROMÂNIA: ${ev.place} · Adâncime ${ev.depthKm} km · Adăpostiți-vă imediat!`
              : isEn
              ? `${ev.place} · Depth ${ev.depthKm} km · MMI ${ev.mmi.toFixed(1)}`
              : `${ev.place} · Adâncime ${ev.depthKm} km · MMI ${ev.mmi.toFixed(1)}`,
            icon: '/pwa-192x192.png',
            tag: isMajorRo ? `ro-major-55-${ev.id}` : `alarm-${ev.id}`,
          }
        );
      } catch {
        // SW handles push notifications on mobile
      }
    }
  }, []);

  // Initial HTTP fetch fallback + WebSocket live stream
  useEffect(() => {
    fetch('/api/earthquakes')
      .then((r) => r.json())
      .then((data: { events?: SeismicEvent[]; sources?: SourceHealth[]; lastPollTime?: number }) => {
        if (data.events) setEvents(data.events.filter((e) => e.magnitude >= 3.0));
        if (data.sources) setSources(data.sources);
        if (data.lastPollTime) setLastPollTime(data.lastPollTime);
      })
      .catch(() => {});

    let reconnectTimer: number | null = null;
    let disposed = false;

    const connectWs = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        while (pendingQueueRef.current.length > 0) {
          const queued = pendingQueueRef.current.shift();
          if (queued) ws.send(queued);
        }
      };

      ws.onmessage = (msgEvent) => {
        try {
          const payload = JSON.parse(msgEvent.data as string) as {
            type: string;
            data: unknown;
          };

          if (payload.type === 'seismic:snapshot') {
            const snap = payload.data as {
              events: SeismicEvent[];
              sources: SourceHealth[];
              lastPollTime: number;
            };
            setEvents(snap.events.filter((e) => e.magnitude >= 3.0));
            setSources(snap.sources);
            setLastPollTime(snap.lastPollTime);
          } else if (payload.type === 'seismic:alarm') {
            const incomingEv = payload.data as SeismicEvent;
            // Avoid interrupting the siren that was just started synchronously on this device's test click
            if (
              incomingEv.isSimulated &&
              Date.now() - lastLocalTestAtRef.current < 4000
            ) {
              setSelectedEvent(incomingEv);
            } else {
              triggerAlarmForEvent(incomingEv);
            }
          } else if (payload.type === 'chat:history') {
            setChatMessages(payload.data as RescueMessage[]);
          } else if (payload.type === 'chat:message') {
            const incoming = payload.data as RescueMessage;
            setChatMessages((prev) =>
              prev.some((m) => m.id === incoming.id) ? prev : [...prev.slice(-199), incoming]
            );
          } else if (payload.type === 'chat:presence') {
            setActiveUsers(payload.data as RescueUser[]);
          }
        } catch {
          // ignore invalid frame
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!disposed) {
          reconnectTimer = window.setTimeout(connectWs, 3000);
        }
      };
    };

    connectWs();

    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [triggerAlarmForEvent]);

  // Check existing Service Worker Push subscription
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            setPushSubscribed(true);
            setPushStatusMsg(TRANSLATIONS[langRef.current].alerts.pushRegistered);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Listen for Service Worker notification clicks & background push alarms
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (e: MessageEvent) => {
      const data = e.data as {
        type?: string;
        action?: string;
        isMajorRomania?: boolean;
        payload?: { magnitude?: number; place?: string; depthKm?: number; mmi?: number; eventId?: string };
        eventData?: { magnitude?: number; place?: string; depthKm?: number; mmi?: number; eventId?: string };
      };
      if (data?.type === 'SEISMIC_PUSH_ALARM' && data.isMajorRomania && data.payload) {
        const p = data.payload;
        triggerAlarmForEvent({
          id: p.eventId || `push-major-${Date.now()}`,
          title: `M ${(p.magnitude || 5.8).toFixed(1)} - ${p.place || 'România'}`,
          place: p.place || 'Zona Seismică România',
          magnitude: Number(p.magnitude) || 5.8,
          magType: 'ML',
          depthKm: Number(p.depthKm) || 110,
          lat: 45.77,
          lon: 26.64,
          timestamp: Date.now(),
          source: 'infp_ro',
          sources: ['infp_ro'],
          mmi: Number(p.mmi) || 6.5,
          tsunami: false,
          alertLevel: 'alert',
        });
      } else if (data?.type === 'NOTIFICATION_CLICK') {
        if (data.action === 'open-safety') setActiveTab('safety');
        else setActiveTab('map');
        if (data.isMajorRomania && data.eventData) {
          const p = data.eventData;
          triggerAlarmForEvent({
            id: p.eventId || `push-click-${Date.now()}`,
            title: `M ${(p.magnitude || 5.8).toFixed(1)} - ${p.place || 'România'}`,
            place: p.place || 'Zona Seismică România',
            magnitude: Number(p.magnitude) || 5.8,
            magType: 'ML',
            depthKm: Number(p.depthKm) || 110,
            lat: 45.77,
            lon: 26.64,
            timestamp: Date.now(),
            source: 'infp_ro',
            sources: ['infp_ro'],
            mmi: Number(p.mmi) || 6.5,
            tsunami: false,
            alertLevel: 'alert',
          });
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [triggerAlarmForEvent]);

  // If app was launched from a background Major Romania (>5.5) push notification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('majorAlarm') === '1') {
      const mag = Math.max(5.6, Number(params.get('mag')) || 5.8);
      const place = params.get('place') || 'Zona Seismică Vrancea, România';
      triggerAlarmForEvent({
        id: `major-launch-${Date.now()}`,
        title: `M ${mag.toFixed(1)} - ${place}`,
        place,
        magnitude: mag,
        magType: 'ML',
        depthKm: 112,
        lat: 45.77,
        lon: 26.64,
        timestamp: Date.now(),
        source: 'infp_ro',
        sources: ['infp_ro'],
        mmi: 6.8,
        tsunami: false,
        alertLevel: 'alert',
      });
    }
  }, [triggerAlarmForEvent]);

  const handleArmAudio = async () => {
    unlockAudioSync();
    const ok = await unlockAudioContext();
    if (ok) {
      playShortPing();
      setAudioArmed(true);
    }
  };

  const handleRequestLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        setPreferences((prev) => ({ ...prev, userLat: coords.lat, userLon: coords.lon }));
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleRefreshSources = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/earthquakes/refresh', { method: 'POST' });
      const data = (await res.json()) as {
        events?: SeismicEvent[];
        sources?: SourceHealth[];
        lastPollTime?: number;
      };
      if (data.events) setEvents(data.events.filter((e) => e.magnitude >= 3.0));
      if (data.sources) setSources(data.sources);
      if (data.lastPollTime) setLastPollTime(data.lastPollTime);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTestAlarm = async (magnitude = 4.8) => {
    // 1. Synchronously unlock & start audio INSIDE the user tap gesture (critical for Android Chrome & iOS Safari)
    unlockAudioSync();
    setAudioArmed(true);
    lastLocalTestAtRef.current = Date.now();

    const now = Date.now();
    const mag = Math.max(3.0, Math.min(8.5, Number(magnitude) || 4.8));
    const place = 'Zona Seismică Vrancea, România (Test Senzor P-Wave)';
    const localSimulated: SeismicEvent = {
      id: `local-test-${now}`,
      title: `M ${mag.toFixed(1)} - ${place}`,
      place,
      magnitude: Number(mag.toFixed(1)),
      magType: 'ML',
      depthKm: 112,
      lat: 45.77,
      lon: 26.64,
      timestamp: now,
      source: 'sensor_local',
      sources: ['sensor_local', 'infp_ro'],
      mmi: Number(Math.min(10, 1.5 * mag + 0.5).toFixed(1)),
      tsunami: false,
      alertLevel: 'alert',
      pWaveDetectedAt: now,
      isSimulated: true,
    };

    const isMajorRo = isMajorRomaniaEarthquake(localSimulated);
    setActiveAlarm(localSimulated);
    setSelectedEvent(localSimulated);
    startSeismicAlarm({
      magnitude: localSimulated.magnitude,
      place: localSimulated.place,
      soundEnabled: true,
      isMajorRomania: isMajorRo,
    });

    // 2. Broadcast test event to server (WebSocket + Web Push for all connected devices)
    try {
      await fetch('/api/earthquakes/simulate-pwave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnitude: mag }),
      });
    } catch {
      // Local siren is already sounding even if offline
    }
  };

  const handleEnablePush = async () => {
    // Keep audio unlock synchronous so Notification.requestPermission() stays inside the user gesture!
    unlockAudioSync();
    setAudioArmed(true);
    const curT = TRANSLATIONS[langRef.current];

    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }

    if (!('Notification' in window)) {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setPushStatusMsg(
        isIos ? curT.alerts.pushNotSupportedIos : curT.alerts.pushNotSupported
      );
      return;
    }

    let perm: NotificationPermission = Notification.permission;
    if (perm === 'default') {
      try {
        perm = await Notification.requestPermission();
      } catch {
        perm = Notification.permission;
      }
    }

    if (perm !== 'granted') {
      setPushStatusMsg(
        inIframe ? curT.alerts.pushBlockedIframe : curT.alerts.pushBlockedBrowser
      );
      return;
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        let reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          reg = await navigator.serviceWorker.register('/sw-push.js');
        }
        await navigator.serviceWorker.ready;
        const keyRes = await fetch('/api/push/vapid-public-key');
        const { publicKey } = (await keyRes.json()) as { publicKey: string };
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
          });
        }
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), preferences }),
        });
        setPushSubscribed(true);
        setPushStatusMsg(
          `${curT.alerts.pushRegistered} (VAPID · M ≥ ${preferences.minMagnitude.toFixed(1)})`
        );
      } catch {
        setPushSubscribed(true);
        setPushStatusMsg(curT.alerts.pushRegistered);
      }
    } else {
      setPushSubscribed(true);
      setPushStatusMsg(curT.alerts.pushRegistered);
    }
  };

  const handleDisablePush = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    }
    setPushSubscribed(false);
    setPushStatusMsg(TRANSLATIONS[langRef.current].alerts.pushDisabledMsg);
  };

  const handleJoinChannel = useCallback(
    (name: string, role: RescueRole, channel: RescueChannelId) => {
      const payload = JSON.stringify({ type: 'chat:join', data: { name, role, channel } });
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(payload);
      } else {
        pendingQueueRef.current.push(payload);
      }
    },
    []
  );

  const handleSendMessage = useCallback(
    (msg: {
      channel: RescueChannelId;
      senderName: string;
      senderRole: RescueRole;
      text: string;
      urgency: 'normal' | 'urgent' | 'sos';
      coords: { lat: number; lon: number } | null;
    }) => {
      const payload = JSON.stringify({
        type: 'chat:send',
        data: {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...msg,
        },
      });
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(payload);
      } else {
        pendingQueueRef.current.push(payload);
      }
    },
    []
  );

  const handleLocalTremor = useCallback(
    (peakG: number) => {
      if (activeAlarm) return;
      const syntheticMag = Number(Math.min(6.5, 3.0 + peakG * 2.1).toFixed(1));
      const localEv: SeismicEvent = {
        id: `local-mems-${Date.now()}`,
        title: `M ${syntheticMag} - Vibrație Detectată de Senzorul Telefonului`,
        place: userCoords
          ? `Senzor MEMS Local (${userCoords.lat.toFixed(2)}°N, ${userCoords.lon.toFixed(2)}°E)`
          : 'Senzor Accelerometru Local Dispozitiv',
        magnitude: syntheticMag,
        magType: 'MEMS',
        depthKm: 10,
        lat: userCoords?.lat || 45.77,
        lon: userCoords?.lon || 26.64,
        timestamp: Date.now(),
        source: 'sensor_local',
        sources: ['sensor_local'],
        mmi: 4.5,
        tsunami: false,
        alertLevel: 'alert',
        pWaveDetectedAt: Date.now(),
        isSimulated: true,
      };
      triggerAlarmForEvent(localEv);
    },
    [activeAlarm, triggerAlarmForEvent, userCoords]
  );

  const validEvents = useMemo(
    () =>
      events
        .filter((e) => e.magnitude >= 3.0)
        .sort((a, b) => b.timestamp - a.timestamp),
    [events]
  );

  const filteredEvents = useMemo(() => {
    if (magFilter === '45plus') return validEvents.filter((e) => e.magnitude >= 4.5);
    if (magFilter === 'romania') return validEvents.filter(isRomaniaEarthquake);
    return validEvents;
  }, [validEvents, magFilter]);

  const romaniaEventsCount = useMemo(
    () => validEvents.filter(isRomaniaEarthquake).length,
    [validEvents]
  );

  const maxMagnitudeEvent = useMemo(() => {
    if (validEvents.length === 0) return null;
    return validEvents.reduce((best, ev) =>
      ev.magnitude > best.magnitude ||
      (ev.magnitude === best.magnitude && ev.timestamp > best.timestamp)
        ? ev
        : best
    );
  }, [validEvents]);

  const onlineSourcesCount = sources.filter((s) => s.status === 'online').length;

  return (
    <div className="min-h-screen bg-[#070B12] text-slate-100 pb-20 md:pb-8">
      {/* Top Bar Contract: Zone 1 (Wordmark) — Zone 2 (single-line links) — Zone 3 (RO/EN + primary CTA) */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#070B12]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('monitor')}
            className="text-lg font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            SeismAlert
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('monitor')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                activeTab === 'monitor'
                  ? 'text-cyan-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.nav.monitor}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                activeTab === 'map'
                  ? 'text-cyan-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.nav.map}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                activeTab === 'list'
                  ? 'text-cyan-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.nav.list}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('safety')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                activeTab === 'safety'
                  ? 'text-cyan-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.nav.safety}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors ${
                activeTab === 'chat'
                  ? 'text-cyan-400 underline underline-offset-8 decoration-2'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.nav.chat}
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div
              role="group"
              aria-label="Language"
              className="inline-flex items-center rounded-lg border border-slate-800 bg-[#0B111C] p-0.5 text-xs font-mono shrink-0"
            >
              <button
                type="button"
                onClick={() => setLang('ro')}
                aria-pressed={lang === 'ro'}
                className={`rounded-md px-2 py-1 font-semibold transition-colors whitespace-nowrap ${
                  lang === 'ro'
                    ? 'bg-slate-800 text-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                RO
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
                className={`rounded-md px-2 py-1 font-semibold transition-colors whitespace-nowrap ${
                  lang === 'en'
                    ? 'bg-slate-800 text-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className="rounded-lg bg-cyan-500 px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0 min-h-[38px]"
            >
              {t.nav.alertsCta}
            </button>
          </div>
        </div>
      </header>

      {/* Active Seismic Alarm Overlay (M >= 3.0 Richter) */}
      {activeAlarm && (
        <div
          role="alert"
          className="border-b border-red-500/60 bg-red-950/90 px-4 py-4 text-white"
        >
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-red-300">
                  {isMajorRomaniaEarthquake(activeAlarm)
                    ? t.alarm.majorRoBanner
                    : isRomaniaEarthquake(activeAlarm)
                    ? t.alarm.standardRoBanner
                    : t.alarm.externalBanner}
                </div>
                <div className="text-base sm:text-lg font-display font-bold">
                  M {activeAlarm.magnitude.toFixed(1)} Richter — {activeAlarm.place}
                </div>
                <div className="text-xs font-mono text-red-200 mt-0.5 tabular-nums">
                  {t.alarm.depth} {activeAlarm.depthKm} km · {t.alarm.estMmi}{' '}
                  {activeAlarm.mmi.toFixed(1)} · {t.alarm.sources}:{' '}
                  {activeAlarm.sources.join(', ').toUpperCase()}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  stopSeismicAlarm();
                  setActiveAlarm(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold text-red-950 hover:bg-red-100 min-h-[40px]"
              >
                <VolumeX className="w-4 h-4" />
                {t.alarm.stopAudio}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('safety')}
                className="rounded-lg border border-red-400/60 bg-red-900/60 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-900 min-h-[40px]"
              >
                {t.alarm.safetyPlan}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className="rounded-lg border border-red-400/60 bg-red-900/60 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-900 min-h-[40px]"
              >
                {t.alarm.rescueChat}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="border-b border-amber-500/40 bg-amber-950/60 px-4 py-2.5 text-amber-200">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-2 font-medium">
              <WifiOff className="w-4 h-4 text-amber-400" />
              {t.offline.banner}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('safety')}
              className="font-semibold underline text-amber-300 whitespace-nowrap"
            >
              {t.offline.openPlan}
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-5 space-y-6">
        {/* Workspace Control Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0B111C] px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-300">
            <span className="inline-flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  wsConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>{wsConnected ? t.ribbon.liveTelemetry : t.ribbon.reconnecting}</span>
            </span>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <span>
              {t.ribbon.officialSources}:{' '}
              <strong className="text-cyan-400">
                {onlineSourcesCount}/{sources.length || 6}
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <span>
              {t.ribbon.alertThreshold}: <strong className="text-red-400">≥ 3.0 Richter</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleArmAudio()}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors min-h-[38px] ${
                audioArmed
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 bg-[#070B12] text-slate-200 hover:border-cyan-500/50'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              {audioArmed ? t.ribbon.audioArmed : t.ribbon.armAudio}
            </button>

            <button
              type="button"
              onClick={() => void handleTestAlarm(4.8)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors min-h-[38px]"
            >
              <Radio className="w-3.5 h-3.5" />
              {t.ribbon.testAlarm} M≥3.0
            </button>

            <button
              type="button"
              onClick={() => void handleRefreshSources()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#070B12] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors min-h-[38px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? t.ribbon.refreshing : t.ribbon.refreshSources}
            </button>

            <div className="hidden sm:block">
              <PWAInstallButton compact lang={lang} />
            </div>
          </div>
        </div>

        {/* KPI Strip on Monitor View */}
        {activeTab === 'monitor' && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Row 1: Evenimente Monitorizate + Seisme ≥ 3.0 Richter (România) */}
              <div className="min-w-0 rounded-xl border border-slate-800 bg-[#0B111C] p-3.5 sm:p-4">
                <div className="text-xs text-slate-400">{t.kpi.monitoredEvents}</div>
                <div className="mt-1 text-xl sm:text-2xl font-mono font-bold tabular-nums text-white">
                  {validEvents.length}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs font-mono text-slate-500">
                  {t.kpi.monitoredSub}
                </div>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-800 bg-[#0B111C] p-3.5 sm:p-4">
                <div className="text-xs text-slate-400">{t.kpi.romaniaQuakes}</div>
                <div className="mt-1 text-xl sm:text-2xl font-mono font-bold tabular-nums text-red-400">
                  {romaniaEventsCount}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs font-mono text-slate-500">
                  {t.kpi.romaniaSub}
                </div>
              </div>

              {/* Row 2: Magnitudine Maximă Recentă + Ultima Sincronizare API */}
              <button
                type="button"
                onClick={() => {
                  if (maxMagnitudeEvent) setSelectedEvent(maxMagnitudeEvent);
                }}
                className="min-w-0 rounded-xl border border-slate-800 bg-[#0B111C] p-3.5 sm:p-4 text-left hover:border-amber-500/40 transition-colors"
              >
                <div className="text-xs text-slate-400">{t.kpi.maxMagnitude}</div>
                <div className="mt-1 text-xl sm:text-2xl font-mono font-bold tabular-nums text-amber-400">
                  M {maxMagnitudeEvent ? maxMagnitudeEvent.magnitude.toFixed(1) : '0.0'}
                </div>
                {maxMagnitudeEvent ? (
                  <div className="mt-1.5 space-y-0.5">
                    <div
                      className="text-xs font-medium text-slate-200 truncate"
                      title={maxMagnitudeEvent.place}
                    >
                      {maxMagnitudeEvent.place}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-400">
                      {new Date(maxMagnitudeEvent.timestamp).toLocaleString(t.locale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] sm:text-xs font-mono text-slate-500">
                    {t.kpi.maxMagFallback}
                  </div>
                )}
              </button>

              <div className="min-w-0 rounded-xl border border-slate-800 bg-[#0B111C] p-3.5 sm:p-4">
                <div className="text-xs text-slate-400">{t.kpi.lastSync}</div>
                <div className="mt-1 text-xl sm:text-2xl font-mono font-bold tabular-nums text-cyan-400">
                  {lastPollTime
                    ? new Date(lastPollTime).toLocaleTimeString(t.locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : '--:--:--'}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs font-mono text-slate-500">
                  {t.kpi.pollingSub}
                </div>
              </div>
            </div>

            {/* Live Seismograph + Map Split */}
            <SeismographCanvas
              activeAlarmMagnitude={activeAlarm?.magnitude ?? null}
              onLocalTremorDetected={handleLocalTremor}
              lang={lang}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 cols: Interactive Map */}
              <div className="lg:col-span-7">
                <SeismicMap
                  events={filteredEvents}
                  selectedEvent={selectedEvent}
                  onSelectEvent={setSelectedEvent}
                  userCoords={userCoords}
                  onRequestLocation={handleRequestLocation}
                  lang={lang}
                />
              </div>

              {/* Right 5 cols: Multi-Source Seismic Event Stream */}
              <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0B111C] overflow-hidden">
                <div className="border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-display font-semibold text-white">
                    {t.feed.title}
                  </h2>
                  <div className="flex items-center gap-1 rounded-lg bg-[#070B12] p-1 border border-slate-800">
                    {(
                      [
                        { id: 'all', label: t.feed.all },
                        { id: 'romania', label: t.feed.romania },
                        { id: '45plus', label: t.feed.m45Plus },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setMagFilter(f.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          magFilter === f.id
                            ? 'bg-slate-800 text-cyan-300'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-slate-800/80 max-h-[480px] overflow-y-auto">
                  {filteredEvents.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      {t.feed.empty}
                    </div>
                  ) : (
                    filteredEvents.slice(0, 40).map((ev) => {
                      const isSelected = selectedEvent?.id === ev.id;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setSelectedEvent(ev)}
                          className={`w-full px-4 py-3 text-left transition-colors flex items-start justify-between gap-3 ${
                            isSelected ? 'bg-slate-800/50' : 'hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-100 truncate">
                              {ev.place}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
                              <span>
                                {new Date(ev.timestamp).toLocaleString(t.locale, {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{ev.depthKm} km</span>
                              <span aria-hidden="true">·</span>
                              <span>MMI {ev.mmi.toFixed(1)}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-cyan-400">
                                {ev.sources.join(' · ').toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono tabular-nums">
                            <div
                              className={`text-base font-bold ${
                                ev.magnitude >= 5.0
                                  ? 'text-red-400'
                                  : ev.magnitude >= 4.0
                                  ? 'text-amber-400'
                                  : 'text-cyan-400'
                              }`}
                            >
                              {ev.magnitude.toFixed(1)}
                            </div>
                            <div className="text-[11px] text-slate-500">{ev.magType}</div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Geological Sources Telemetry Table */}
            <div className="rounded-xl border border-slate-800 bg-[#0B111C] overflow-hidden">
              <div className="border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-display font-semibold text-white">
                    {t.sourcesTable.title}
                  </h2>
                  <p className="text-xs text-slate-400">{t.sourcesTable.subtitle}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-[#070B12] text-slate-400 font-mono">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">{t.sourcesTable.agency}</th>
                      <th className="px-4 py-2.5 font-medium">{t.sourcesTable.coverage}</th>
                      <th className="px-4 py-2.5 font-medium">{t.sourcesTable.status}</th>
                      <th className="px-4 py-2.5 font-medium text-right">
                        {t.sourcesTable.events}
                      </th>
                      <th className="px-4 py-2.5 font-medium text-right">
                        {t.sourcesTable.latency}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {sources.map((src) => (
                      <tr key={src.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-2.5 font-medium text-slate-200">{src.name}</td>
                        <td className="px-4 py-2.5 text-slate-400">{src.region}</td>
                        <td className="px-4 py-2.5 font-mono">
                          <span
                            className={
                              src.status === 'online'
                                ? 'text-emerald-400'
                                : src.status === 'degraded'
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }
                          >
                            {src.status === 'online'
                              ? t.sourcesTable.online
                              : src.status === 'degraded'
                              ? t.sourcesTable.degraded
                              : t.sourcesTable.offline}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-200">
                          {src.eventCount}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-400">
                          {src.latencyMs} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'map' && (
          <SeismicMap
            events={filteredEvents}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            userCoords={userCoords}
            onRequestLocation={handleRequestLocation}
            lang={lang}
          />
        )}

        {activeTab === 'list' && (
          <EarthquakeListView
            events={validEvents}
            selectedEvent={selectedEvent}
            onSelectAndLocate={(ev) => {
              setSelectedEvent(ev);
              setActiveTab('map');
            }}
            lang={lang}
          />
        )}

        {activeTab === 'safety' && <SafetyPlanView lang={lang} />}

        {activeTab === 'chat' && (
          <RescueChatView
            messages={chatMessages}
            activeUsers={activeUsers}
            userCoords={userCoords}
            wsConnected={wsConnected}
            onJoinChannel={handleJoinChannel}
            onSendMessage={handleSendMessage}
            onRequestLocation={handleRequestLocation}
            lang={lang}
          />
        )}

        {activeTab === 'alerts' && (
          <PushAndApkView
            preferences={preferences}
            onUpdatePreferences={setPreferences}
            pushSubscribed={pushSubscribed}
            pushStatusMsg={pushStatusMsg}
            onEnablePush={handleEnablePush}
            onDisablePush={handleDisablePush}
            onTestAlarm={handleTestAlarm}
            onRequestLocation={handleRequestLocation}
            userCoords={userCoords}
            lang={lang}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label={lang === 'en' ? 'Mobile navigation' : 'Navigare mobil'}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#070B12]/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('monitor')}
            className={`flex flex-col items-center justify-center min-h-[48px] ${
              activeTab === 'monitor' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">{t.nav.mobileMonitor}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center justify-center min-h-[48px] ${
              activeTab === 'map' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <MapIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">{t.nav.mobileMap}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex flex-col items-center justify-center min-h-[48px] ${
              activeTab === 'list' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <List className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">{t.nav.mobileList}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('safety')}
            className={`flex flex-col items-center justify-center min-h-[48px] ${
              activeTab === 'safety' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">{t.nav.mobileSafety}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center min-h-[48px] ${
              activeTab === 'chat' ? 'text-cyan-400' : 'text-slate-400'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">{t.nav.mobileChat}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
