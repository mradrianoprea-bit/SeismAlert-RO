import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import * as webpush from 'web-push';
import { createServer as createViteServer } from 'vite';
import { buildAndroidKitZip } from './src/utils/androidKit.ts';
import {
  isMajorRomaniaEarthquake,
  isRomaniaEarthquake,
} from './src/utils/seismicFilter.ts';
import type {
  AlertLevel,
  PushPreference,
  RescueChannelId,
  RescueMessage,
  RescueRole,
  RescueUser,
  SeismicEvent,
  SeismicSourceId,
  SourceHealth,
} from './src/types/seismic.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const portFlagIdx = process.argv.indexOf('--port');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const cliPort = Number(process.argv[portFlagIdx + 1]);
    if (!Number.isNaN(cliPort) && cliPort > 0) return cliPort;
  }
  return Number(process.env.PORT || 3000);
}

const PORT = resolvePort();
const ALERT_THRESHOLD_RICHTER = 3.0;
const POLL_INTERVAL_MS = 25_000;

const VAPID_FILE = path.join(__dirname, '.vapid.json');
const CHAT_FILE = path.join(__dirname, '.rescue-chat.json');

interface StoredVapid {
  publicKey: string;
  privateKey: string;
}

function loadOrCreateVapid(): StoredVapid {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }
  try {
    if (fs.existsSync(VAPID_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8')) as StoredVapid;
      if (parsed.publicKey && parsed.privateKey) return parsed;
    }
  } catch {
    // regenerate below
  }
  const generated = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(generated, null, 2));
  } catch {
    // ignore read-only fs errors
  }
  return generated;
}

const vapidKeys = loadOrCreateVapid();
webpush.setVapidDetails(
  'mailto:alerte@seismalert.ro',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

interface PushSubscriptionRecord {
  endpoint: string;
  subscription: webpush.PushSubscription;
  preferences: PushPreference;
  createdAt: number;
}

const pushSubscriptions = new Map<string, PushSubscriptionRecord>();

function loadInitialChat(): RescueMessage[] {
  try {
    if (fs.existsSync(CHAT_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf-8')) as RescueMessage[];
      if (Array.isArray(raw) && raw.length > 0) return raw.slice(-200);
    }
  } catch {
    // fallback to initial channel notice
  }
  return [
    {
      id: 'init-general-1',
      channel: 'general',
      senderId: 'system-dispatch',
      senderName: 'Centru Operațional SeismAlert',
      senderRole: 'Dispecerat',
      text: 'Canal activ pentru coordonarea echipelor de intervenție și a cetățenilor. Orice eveniment M ≥ 3.0 Richter este transmis automat aici.',
      timestamp: Date.now() - 120_000,
      urgency: 'normal',
      coords: null,
      eventRef: null,
    },
  ];
}

let rescueMessages: RescueMessage[] = loadInitialChat();

function persistChat() {
  try {
    fs.writeFileSync(CHAT_FILE, JSON.stringify(rescueMessages.slice(-200), null, 2));
  } catch {
    // ignore if fs unavailable
  }
}

function estimateMmi(mag: number, depthKm: number): number {
  const safeDepth = Math.max(depthKm || 10, 5);
  const raw = 1.5 * mag - 1.25 * Math.log10(safeDepth) + 1.8;
  return Number(Math.max(1, Math.min(12, raw)).toFixed(1));
}

function classifyAlert(mag: number): AlertLevel {
  if (mag >= ALERT_THRESHOLD_RICHTER) return 'alert';
  if (mag >= 2.2) return 'advisory';
  return 'normal';
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SeismAlert-RO/1.0 (seismic-monitoring)',
        Accept: 'application/json, text/plain;q=0.9',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseFdsnText(
  text: string,
  sourceId: SeismicSourceId
): SeismicEvent[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const events: SeismicEvent[] = [];
  for (const line of lines) {
    if (line.startsWith('#')) continue;
    const cols = line.split('|');
    if (cols.length < 13) continue;
    const eventId = cols[0]?.trim();
    const timeStr = cols[1]?.trim();
    const lat = Number(cols[2]);
    const lon = Number(cols[3]);
    const depthKm = Number(cols[4]) || 10;
    const magType = (cols[9] || 'M').trim();
    const mag = Number(cols[10]);
    const place = (cols[12] || 'Regiune Seismică').trim();
    const timestamp = Date.parse(timeStr.endsWith('Z') ? timeStr : `${timeStr}Z`);
    if (
      !eventId ||
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      Number.isNaN(mag) ||
      Number.isNaN(timestamp) ||
      mag < ALERT_THRESHOLD_RICHTER
    ) {
      continue;
    }
    events.push({
      id: `${sourceId}-${eventId}`,
      title: `M ${mag.toFixed(1)} - ${place}`,
      place,
      magnitude: Number(mag.toFixed(2)),
      magType,
      depthKm: Number(depthKm.toFixed(1)),
      lat,
      lon,
      timestamp,
      source: sourceId,
      sources: [sourceId],
      mmi: estimateMmi(mag, depthKm),
      tsunami: false,
      alertLevel: classifyAlert(mag),
      url: undefined,
    });
  }
  return events;
}

async function fetchUsgs(): Promise<{ events: SeismicEvent[]; health: SourceHealth }> {
  const start = Date.now();
  const endpoint = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';
  try {
    const res = await fetchWithTimeout(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      features?: Array<{
        id: string;
        properties: {
          mag: number | null;
          magType?: string;
          place?: string;
          time: number;
          title?: string;
          mmi?: number | null;
          tsunami?: number;
          url?: string;
        };
        geometry: { coordinates: [number, number, number] };
      }>;
    };
    const events: SeismicEvent[] = [];
    for (const f of data.features || []) {
      const mag = f.properties.mag;
      if (mag === null || mag === undefined || Number.isNaN(mag) || mag < ALERT_THRESHOLD_RICHTER) {
        continue;
      }
      const [lon, lat, depth] = f.geometry.coordinates;
      const depthKm = Number((depth || 10).toFixed(1));
      const place = f.properties.place || 'Global';
      events.push({
        id: `usgs-${f.id}`,
        title: f.properties.title || `M ${mag.toFixed(1)} - ${place}`,
        place,
        magnitude: Number(mag.toFixed(2)),
        magType: f.properties.magType || 'ML',
        depthKm,
        lat,
        lon,
        timestamp: f.properties.time,
        source: 'usgs',
        sources: ['usgs'],
        mmi: f.properties.mmi ? Number(f.properties.mmi.toFixed(1)) : estimateMmi(mag, depthKm),
        tsunami: Boolean(f.properties.tsunami),
        alertLevel: classifyAlert(mag),
        url: f.properties.url,
      });
    }
    return {
      events,
      health: {
        id: 'usgs',
        name: 'USGS Hazards Program',
        region: 'Global (API Oficial GeoJSON)',
        endpoint,
        status: 'online',
        lastSyncAt: Date.now(),
        eventCount: events.length,
        latencyMs: Date.now() - start,
      },
    };
  } catch (err) {
    return {
      events: [],
      health: {
        id: 'usgs',
        name: 'USGS Hazards Program',
        region: 'Global (API Oficial GeoJSON)',
        endpoint,
        status: 'offline',
        lastSyncAt: Date.now(),
        eventCount: 0,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Eroare conexiune',
      },
    };
  }
}

async function fetchEmsc(romaniaOnly = false): Promise<{ events: SeismicEvent[]; health: SourceHealth }> {
  const start = Date.now();
  const sourceId: SeismicSourceId = romaniaOnly ? 'infp_ro' : 'emsc';
  const endpoint = romaniaOnly
    ? 'https://www.seismicportal.eu/fdsnws/event/1/query?limit=35&format=json&minmag=3.0&minlat=43.5&maxlat=48.5&minlon=20.0&maxlon=30.0'
    : 'https://www.seismicportal.eu/fdsnws/event/1/query?limit=60&format=json&minmag=3.0';
  const name = romaniaOnly
    ? 'Rețeaua Seismică România (INFP / Vrancea via EMSC)'
    : 'EMSC / CSEM SeismicPortal';
  const region = romaniaOnly ? 'România & Zona Vrancea' : 'Europa & Mediterana';

  try {
    const res = await fetchWithTimeout(endpoint);
    if (res.status === 204) {
      return {
        events: [],
        health: {
          id: sourceId,
          name,
          region,
          endpoint,
          status: 'online',
          lastSyncAt: Date.now(),
          eventCount: 0,
          latencyMs: Date.now() - start,
        },
      };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      features?: Array<{
        id: string;
        properties: {
          mag: number;
          magtype?: string;
          flynn_region?: string;
          time: string;
          depth?: number;
          lat: number;
          lon: number;
          source_id?: string;
          auth?: string;
        };
      }>;
    };
    const events: SeismicEvent[] = [];
    for (const f of data.features || []) {
      const p = f.properties;
      const mag = Number(p.mag);
      if (Number.isNaN(mag) || mag < ALERT_THRESHOLD_RICHTER) continue;
      const depthKm = Number((Math.abs(p.depth || 10)).toFixed(1));
      const timestamp = Date.parse(p.time);
      if (Number.isNaN(timestamp)) continue;
      const place = p.flynn_region || (romaniaOnly ? 'România' : 'Euro-Mediterana');
      events.push({
        id: `${sourceId}-${f.id}`,
        title: `M ${mag.toFixed(1)} - ${place}`,
        place,
        magnitude: Number(mag.toFixed(2)),
        magType: p.magtype || 'ML',
        depthKm,
        lat: p.lat,
        lon: p.lon,
        timestamp,
        source: sourceId,
        sources: [sourceId],
        mmi: estimateMmi(mag, depthKm),
        tsunami: false,
        alertLevel: classifyAlert(mag),
        url: `https://www.seismicportal.eu/eventdetails.html?unid=${encodeURIComponent(f.id)}`,
      });
    }
    return {
      events,
      health: {
        id: sourceId,
        name,
        region,
        endpoint,
        status: 'online',
        lastSyncAt: Date.now(),
        eventCount: events.length,
        latencyMs: Date.now() - start,
      },
    };
  } catch (err) {
    return {
      events: [],
      health: {
        id: sourceId,
        name,
        region,
        endpoint,
        status: 'offline',
        lastSyncAt: Date.now(),
        eventCount: 0,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Eroare conexiune',
      },
    };
  }
}

async function fetchFdsnAgency(
  id: SeismicSourceId,
  name: string,
  region: string,
  endpoint: string
): Promise<{ events: SeismicEvent[]; health: SourceHealth }> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(endpoint);
    if (res.status === 204) {
      return {
        events: [],
        health: {
          id,
          name,
          region,
          endpoint,
          status: 'online',
          lastSyncAt: Date.now(),
          eventCount: 0,
          latencyMs: Date.now() - start,
        },
      };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const events = parseFdsnText(text, id);
    return {
      events,
      health: {
        id,
        name,
        region,
        endpoint,
        status: 'online',
        lastSyncAt: Date.now(),
        eventCount: events.length,
        latencyMs: Date.now() - start,
      },
    };
  } catch (err) {
    return {
      events: [],
      health: {
        id,
        name,
        region,
        endpoint,
        status: 'offline',
        lastSyncAt: Date.now(),
        eventCount: 0,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Eroare conexiune',
      },
    };
  }
}

async function fetchGeonet(): Promise<{ events: SeismicEvent[]; health: SourceHealth }> {
  const start = Date.now();
  const endpoint = 'https://api.geonet.org.nz/quake?MMI=2';
  try {
    const res = await fetchWithTimeout(endpoint, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      features?: Array<{
        geometry: { coordinates: [number, number] };
        properties: {
          publicID: string;
          time: string;
          depth: number;
          magnitude: number;
          mmi: number;
          locality?: string;
        };
      }>;
    };
    const events: SeismicEvent[] = [];
    for (const f of data.features || []) {
      const p = f.properties;
      const mag = Number(p.magnitude);
      if (Number.isNaN(mag) || mag < ALERT_THRESHOLD_RICHTER) continue;
      const [lon, lat] = f.geometry.coordinates;
      const depthKm = Number((p.depth || 10).toFixed(1));
      const timestamp = Date.parse(p.time);
      if (Number.isNaN(timestamp)) continue;
      const place = p.locality ? `${p.locality}, New Zealand` : 'New Zealand (GeoNet)';
      events.push({
        id: `geonet-${p.publicID}`,
        title: `M ${mag.toFixed(1)} - ${place}`,
        place,
        magnitude: Number(mag.toFixed(2)),
        magType: 'ML',
        depthKm,
        lat,
        lon,
        timestamp,
        source: 'geonet',
        sources: ['geonet'],
        mmi: p.mmi > 0 ? p.mmi : estimateMmi(mag, depthKm),
        tsunami: false,
        alertLevel: classifyAlert(mag),
        url: `https://www.geonet.org.nz/earthquake/${encodeURIComponent(p.publicID)}`,
      });
    }
    return {
      events,
      health: {
        id: 'geonet',
        name: 'GeoNet GNS Science',
        region: 'Pacific / Noua Zeelandă',
        endpoint,
        status: 'online',
        lastSyncAt: Date.now(),
        eventCount: events.length,
        latencyMs: Date.now() - start,
      },
    };
  } catch (err) {
    return {
      events: [],
      health: {
        id: 'geonet',
        name: 'GeoNet GNS Science',
        region: 'Pacific / Noua Zeelandă',
        endpoint,
        status: 'offline',
        lastSyncAt: Date.now(),
        eventCount: 0,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Eroare conexiune',
      },
    };
  }
}

function deduplicateAndMerge(allEvents: SeismicEvent[]): SeismicEvent[] {
  const sorted = [...allEvents].sort((a, b) => b.timestamp - a.timestamp);
  const merged: SeismicEvent[] = [];

  for (const ev of sorted) {
    const existing = merged.find((m) => {
      const timeDiff = Math.abs(m.timestamp - ev.timestamp);
      const dist = haversineKm(m.lat, m.lon, ev.lat, ev.lon);
      return timeDiff <= 60_000 && dist <= 65;
    });

    if (existing) {
      for (const s of ev.sources) {
        if (!existing.sources.includes(s)) existing.sources.push(s);
      }
      if (ev.magnitude > existing.magnitude) {
        existing.magnitude = ev.magnitude;
        existing.alertLevel = classifyAlert(ev.magnitude);
        existing.mmi = Math.max(existing.mmi, ev.mmi);
        existing.title = `M ${ev.magnitude.toFixed(1)} - ${existing.place}`;
      }
      if (!existing.url && ev.url) existing.url = ev.url;
    } else {
      merged.push({ ...ev, sources: [...ev.sources] });
    }
  }

  return merged
    .filter((ev) => ev.magnitude >= ALERT_THRESHOLD_RICHTER)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 160);
}

let cachedEvents: SeismicEvent[] = [];
let cachedSources: SourceHealth[] = [];
let lastPollTime = 0;
let initialBaselineLoaded = false;
const alertedEventKeys = new Set<string>();

function eventFingerprint(ev: SeismicEvent): string {
  const bucketTime = Math.round(ev.timestamp / 60_000);
  const latB = ev.lat.toFixed(1);
  const lonB = ev.lon.toFixed(1);
  return `${bucketTime}_${latB}_${lonB}`;
}

async function sendWebPushForEvent(ev: SeismicEvent) {
  const isRo = isRomaniaEarthquake(ev);
  const isMajorRo = isMajorRomaniaEarthquake(ev);

  const payload = JSON.stringify({
    title: isMajorRo
      ? `ALERTĂ MAJORĂ ROMÂNIA · M ${ev.magnitude.toFixed(1)} Richter`
      : `ALERTĂ SEISMICĂ M ${ev.magnitude.toFixed(1)} Richter`,
    body: isMajorRo
      ? `CUTREMUR MAJOR (> 5.5) ÎN ROMÂNIA: ${ev.place} · Adâncime ${ev.depthKm} km · MMI ${ev.mmi.toFixed(1)}. Adăpostiți-vă imediat!`
      : `${ev.place} · Adâncime ${ev.depthKm} km · Intensitate estimată MMI ${ev.mmi.toFixed(1)}`,
    magnitude: ev.magnitude,
    place: ev.place,
    depthKm: ev.depthKm,
    mmi: ev.mmi,
    eventId: ev.id,
    alertTier: isMajorRo ? 'ro_major_55' : isRo ? 'ro_standard' : 'global',
    isMajorRomania: isMajorRo,
    channelId: isMajorRo ? 'ro_major_quake_55' : 'seismic_standard_30',
    sound: isMajorRo ? '/sounds/ro-major-quake-55.wav' : undefined,
    vibrate: isMajorRo
      ? [500, 120, 500, 120, 500, 120, 900, 150, 900]
      : [400, 150, 400, 150, 700],
    url: isMajorRo
      ? `/?tab=map&majorAlarm=1&mag=${encodeURIComponent(ev.magnitude.toFixed(1))}&place=${encodeURIComponent(ev.place)}`
      : '/?tab=map',
    tag: isMajorRo ? `ro-major-55-${ev.id}` : `quake-${ev.id}`,
  });

  const staleEndpoints: string[] = [];
  for (const [endpoint, record] of pushSubscriptions.entries()) {
    const threshold = Math.max(ALERT_THRESHOLD_RICHTER, record.preferences.minMagnitude || 3.0);
    if (!isMajorRo && ev.magnitude < threshold) continue;

    if (
      !isMajorRo &&
      record.preferences.userLat !== null &&
      record.preferences.userLon !== null &&
      record.preferences.radiusKm > 0 &&
      !ev.isSimulated
    ) {
      const dist = haversineKm(
        record.preferences.userLat,
        record.preferences.userLon,
        ev.lat,
        ev.lon
      );
      if (dist > record.preferences.radiusKm) continue;
    }

    try {
      await webpush.sendNotification(record.subscription, payload, {
        urgency: isMajorRo ? 'high' : 'normal',
        TTL: isMajorRo ? 180 : 60,
      });
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        staleEndpoints.push(endpoint);
      }
    }
  }
  for (const ep of staleEndpoints) {
    pushSubscriptions.delete(ep);
  }
}

let wssRef: WebSocketServer | null = null;
const connectedUsers = new Map<WebSocket, RescueUser>();

function broadcastWs(type: string, data: unknown) {
  if (!wssRef) return;
  const msg = JSON.stringify({ type, data });
  for (const client of wssRef.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

function broadcastPresence() {
  const users = Array.from(connectedUsers.values());
  broadcastWs('chat:presence', users);
}

async function pollAllGeologicalSources(triggerAlarms = true): Promise<void> {
  const results = await Promise.all([
    fetchUsgs(),
    fetchEmsc(false),
    fetchEmsc(true),
    fetchFdsnAgency(
      'gfz',
      'GFZ GEOFON Potsdam',
      'Europa & Rețea Globală',
      'https://geofon.gfz-potsdam.de/fdsnws/event/1/query?format=text&limit=25&minmag=3.0'
    ),
    fetchFdsnAgency(
      'ingv',
      'INGV Italia / Mediterana',
      'Mediterana & Balcani',
      'https://webservices.ingv.it/fdsnws/event/1/query?format=text&limit=30&minmag=3.0'
    ),
    fetchGeonet(),
  ]);

  const rawEvents = results.flatMap((r) => r.events);
  const sources = results.map((r) => r.health);
  const merged = deduplicateAndMerge(rawEvents);

  if (!initialBaselineLoaded) {
    for (const ev of merged) {
      alertedEventKeys.add(eventFingerprint(ev));
    }
    initialBaselineLoaded = true;
  } else if (triggerAlarms) {
    const now = Date.now();
    for (const ev of merged) {
      const fp = eventFingerprint(ev);
      if (!alertedEventKeys.has(fp)) {
        alertedEventKeys.add(fp);
        // Trigger immediate alert for fresh events >= 3.0 Richter (within last 30 mins)
        if (ev.magnitude >= ALERT_THRESHOLD_RICHTER && now - ev.timestamp < 30 * 60_000) {
          ev.pWaveDetectedAt = now;
          broadcastWs('seismic:alarm', ev);
          void sendWebPushForEvent(ev);
          const dispatchNotice: RescueMessage = {
            id: `alert-msg-${ev.id}-${now}`,
            channel: 'general',
            senderId: 'system-sensor',
            senderName: 'Senzor Seismic & API Geologic',
            senderRole: 'Dispecerat',
            text: `ALERTĂ AUTOMATĂ: Cutremur M ${ev.magnitude.toFixed(1)} Richter în ${ev.place} (Adâncime ${ev.depthKm} km, MMI ${ev.mmi.toFixed(1)}). Surse: ${ev.sources.join(', ').toUpperCase()}.`,
            timestamp: now,
            urgency: 'sos',
            coords: { lat: ev.lat, lon: ev.lon },
            eventRef: ev.id,
          };
          rescueMessages = [...rescueMessages.slice(-199), dispatchNotice];
          persistChat();
          broadcastWs('chat:message', dispatchNotice);
        }
      }
    }
  }

  cachedEvents = merged;
  cachedSources = sources;
  lastPollTime = Date.now();

  broadcastWs('seismic:snapshot', {
    events: cachedEvents,
    sources: cachedSources,
    lastPollTime,
    threshold: ALERT_THRESHOLD_RICHTER,
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      lastPollTime,
      eventCount: cachedEvents.length,
      sourcesOnline: cachedSources.filter((s) => s.status === 'online').length,
      totalSources: cachedSources.length,
      alertThreshold: ALERT_THRESHOLD_RICHTER,
    });
  });

  app.get('/api/earthquakes', (_req, res) => {
    res.json({
      events: cachedEvents,
      sources: cachedSources,
      lastPollTime,
      threshold: ALERT_THRESHOLD_RICHTER,
    });
  });

  app.post('/api/earthquakes/refresh', async (_req, res) => {
    await pollAllGeologicalSources(true);
    res.json({
      events: cachedEvents,
      sources: cachedSources,
      lastPollTime,
      threshold: ALERT_THRESHOLD_RICHTER,
    });
  });

  // Trigger real sensor P-wave early warning test (M >= 3.0)
  app.post('/api/earthquakes/simulate-pwave', async (req, res) => {
    const magnitude = Math.max(3.0, Math.min(8.5, Number(req.body?.magnitude) || 4.8));
    const lat = Number(req.body?.lat) || 45.77;
    const lon = Number(req.body?.lon) || 26.64;
    const place = String(req.body?.place || 'Zona Seismică Vrancea, România (Test Senzor P-Wave)');
    const depthKm = Number(req.body?.depthKm) || 112;
    const now = Date.now();

    const simulatedEvent: SeismicEvent = {
      id: `sensor_local-${now}`,
      title: `M ${magnitude.toFixed(1)} - ${place}`,
      place,
      magnitude: Number(magnitude.toFixed(1)),
      magType: 'ML',
      depthKm,
      lat,
      lon,
      timestamp: now,
      source: 'sensor_local',
      sources: ['sensor_local', 'infp_ro'],
      mmi: estimateMmi(magnitude, depthKm),
      tsunami: false,
      alertLevel: classifyAlert(magnitude),
      pWaveDetectedAt: now,
      isSimulated: true,
    };

    cachedEvents = [simulatedEvent, ...cachedEvents].slice(0, 160);
    broadcastWs('seismic:alarm', simulatedEvent);
    broadcastWs('seismic:snapshot', {
      events: cachedEvents,
      sources: cachedSources,
      lastPollTime: now,
      threshold: ALERT_THRESHOLD_RICHTER,
    });

    await sendWebPushForEvent(simulatedEvent);

    const dispatchNotice: RescueMessage = {
      id: `test-alert-${now}`,
      channel: 'general',
      senderId: 'system-sensor',
      senderName: 'Senzor P-Wave (Test)',
      senderRole: 'Dispecerat',
      text: `TEST ALARMĂ M ${simulatedEvent.magnitude.toFixed(1)} Richter detectată în ${place}. Verificați notificările push și procedurile de siguranță.`,
      timestamp: now,
      urgency: 'urgent',
      coords: { lat, lon },
      eventRef: simulatedEvent.id,
    };
    rescueMessages = [...rescueMessages.slice(-199), dispatchNotice];
    persistChat();
    broadcastWs('chat:message', dispatchNotice);

    res.json({ ok: true, event: simulatedEvent });
  });

  app.get('/api/push/vapid-public-key', (_req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/push/subscribe', (req, res) => {
    const subscription = req.body?.subscription as webpush.PushSubscription | undefined;
    const preferences = req.body?.preferences as PushPreference | undefined;
    if (!subscription?.endpoint) {
      res.status(400).json({ error: 'Subscripție push invalidă.' });
      return;
    }
    pushSubscriptions.set(subscription.endpoint, {
      endpoint: subscription.endpoint,
      subscription,
      preferences: {
        minMagnitude: Math.max(3.0, Number(preferences?.minMagnitude) || 3.0),
        radiusKm: Number(preferences?.radiusKm) || 0,
        userLat: preferences?.userLat ?? null,
        userLon: preferences?.userLon ?? null,
        regions: Array.isArray(preferences?.regions) ? preferences.regions : ['Global'],
        soundEnabled: preferences?.soundEnabled ?? true,
        voiceEnabled: preferences?.voiceEnabled ?? true,
      },
      createdAt: Date.now(),
    });
    res.json({ ok: true, subscribers: pushSubscriptions.size });
  });

  app.post('/api/push/unsubscribe', (req, res) => {
    const endpoint = req.body?.endpoint as string | undefined;
    if (endpoint) pushSubscriptions.delete(endpoint);
    res.json({ ok: true });
  });

  app.get('/api/tiles/osm/:z/:x/:y.png', async (req, res) => {
    const z = Number(req.params.z);
    const x = Number(req.params.x);
    const y = Number(req.params.y);
    if (
      !Number.isInteger(z) ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      z < 0 ||
      z > 18 ||
      x < 0 ||
      y < 0
    ) {
      res.status(400).end();
      return;
    }
    try {
      const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      const upstream = await fetch(tileUrl, {
        headers: {
          'User-Agent': 'SeismAlertRO/1.0 (seismic-monitoring-map)',
        },
      });
      if (!upstream.ok) {
        res.status(upstream.status).end();
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buf);
    } catch {
      res.status(502).end();
    }
  });

  app.get('/api/chat/history', (req, res) => {
    const channel = (req.query.channel as RescueChannelId) || 'general';
    const filtered = rescueMessages.filter((m) => m.channel === channel);
    res.json({ messages: filtered });
  });

  // Downloadable Capacitor Android + iOS + GitHub Actions Project Kit (.zip)
  const serveMobileKit = async (req: express.Request, res: express.Response) => {
    const hostUrl =
      process.env.APP_URL ||
      `${req.protocol}://${req.get('host')}`;

    const zip = buildAndroidKitZip(hostUrl);

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="seismalert-ro-mobile-github-kit.zip"');
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'no-store');
    res.end(buffer);
  };

  app.get('/api/android-kit', serveMobileKit);
  app.get('/api/mobile-kit', serveMobileKit);

  const server = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Self-unregister any stale Workbox sw.js / dev-sw.js in dev preview so browsers never serve stale HTML/asset hashes
    const clearStaleSwScript = [
      "self.addEventListener('install', () => self.skipWaiting());",
      "self.addEventListener('activate', (event) => {",
      '  event.waitUntil(',
      '    caches.keys()',
      '      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))',
      '      .then(() => self.registration.unregister())',
      '      .then(() => self.clients.matchAll({ type: "window" }))',
      '      .then((clients) => clients.forEach((c) => { try { c.navigate(c.url); } catch {} }))',
      '  );',
      '});',
    ].join('\n');

    app.get(['/sw.js', '/dev-sw.js'], (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send(clearStaleSwScript);
    });

    app.get('/manifest.webmanifest', (_req, res) => {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.json({
        id: '/',
        name: 'SeismAlert RO — Avertizare Seismică',
        short_name: 'SeismAlert',
        description:
          'Avertizare seismică timpurie (M ≥ 3.0 Richter), hărți epicentru, alerte push și plan de siguranță offline.',
        theme_color: '#070B12',
        background_color: '#070B12',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      });
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: {
          server,
          path: '/__vite_hmr',
        },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use((req, res, next) => {
      if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
      next();
    });
    app.use(vite.middlewares);
  }

  const wss = new WebSocketServer({ noServer: true });
  wssRef = wss;

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    const defaultUser: RescueUser = {
      id: `user-${Math.random().toString(36).slice(2, 9)}`,
      name: `Operator ${Math.floor(100 + Math.random() * 899)}`,
      role: 'Cetățean',
      channel: 'general',
      connectedAt: Date.now(),
    };
    connectedUsers.set(ws, defaultUser);

    ws.send(
      JSON.stringify({
        type: 'seismic:snapshot',
        data: {
          events: cachedEvents,
          sources: cachedSources,
          lastPollTime,
          threshold: ALERT_THRESHOLD_RICHTER,
        },
      })
    );

    ws.send(
      JSON.stringify({
        type: 'chat:history',
        data: rescueMessages,
      })
    );

    broadcastPresence();

    ws.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString()) as {
          type: string;
          data?: Record<string, unknown>;
        };

        if (parsed.type === 'chat:join' && parsed.data) {
          const current = connectedUsers.get(ws) || defaultUser;
          const updated: RescueUser = {
            ...current,
            name: String(parsed.data.name || current.name).slice(0, 40),
            role: (parsed.data.role as RescueRole) || current.role,
            channel: (parsed.data.channel as RescueChannelId) || current.channel,
          };
          connectedUsers.set(ws, updated);
          broadcastPresence();
        }

        if (parsed.type === 'chat:send' && parsed.data) {
          const current = connectedUsers.get(ws) || defaultUser;
          const msgId = String(parsed.data.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
          if (rescueMessages.some((m) => m.id === msgId)) return;

          const text = String(parsed.data.text || '').trim().slice(0, 1000);
          if (!text) return;

          const message: RescueMessage = {
            id: msgId,
            channel: (parsed.data.channel as RescueChannelId) || current.channel,
            senderId: current.id,
            senderName: String(parsed.data.senderName || current.name).slice(0, 40),
            senderRole: (parsed.data.senderRole as RescueRole) || current.role,
            text,
            timestamp: Date.now(),
            urgency: (parsed.data.urgency as 'normal' | 'urgent' | 'sos') || 'normal',
            coords:
              parsed.data.coords &&
              typeof (parsed.data.coords as { lat?: number }).lat === 'number' &&
              typeof (parsed.data.coords as { lon?: number }).lon === 'number'
                ? (parsed.data.coords as { lat: number; lon: number })
                : null,
            eventRef: parsed.data.eventRef ? String(parsed.data.eventRef) : null,
          };

          rescueMessages = [...rescueMessages.slice(-199), message];
          persistChat();
          broadcastWs('chat:message', message);
        }
      } catch {
        // ignore malformed frames
      }
    });

    ws.on('close', () => {
      connectedUsers.delete(ws);
      broadcastPresence();
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SeismAlert RO server running on http://0.0.0.0:${PORT}`);
    void pollAllGeologicalSources(false);
    setInterval(() => {
      void pollAllGeologicalSources(true);
    }, POLL_INTERVAL_MS);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
