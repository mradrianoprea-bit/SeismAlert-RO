export type SeismicSourceId =
  | 'usgs'
  | 'emsc'
  | 'gfz'
  | 'ingv'
  | 'geonet'
  | 'infp_ro'
  | 'sensor_local';

export type AlertLevel = 'normal' | 'advisory' | 'alert';

export interface SeismicEvent {
  id: string;
  title: string;
  place: string;
  magnitude: number;
  magType: string;
  depthKm: number;
  lat: number;
  lon: number;
  timestamp: number;
  source: SeismicSourceId;
  sources: SeismicSourceId[];
  mmi: number;
  tsunami: boolean;
  alertLevel: AlertLevel;
  pWaveDetectedAt?: number;
  isSimulated?: boolean;
  url?: string;
}

export interface SourceHealth {
  id: SeismicSourceId;
  name: string;
  region: string;
  endpoint: string;
  status: 'online' | 'degraded' | 'offline';
  lastSyncAt: number;
  eventCount: number;
  latencyMs: number;
  error?: string;
}

export interface PushPreference {
  minMagnitude: number;
  radiusKm: number;
  userLat: number | null;
  userLon: number | null;
  regions: string[];
  soundEnabled: boolean;
  voiceEnabled: boolean;
}

export type RescueChannelId = 'general' | 'vrancea' | 'medical' | 'logistica';

export type RescueRole =
  | 'Cetățean'
  | 'Echipaj ISU'
  | 'Medic SMURD'
  | 'Voluntar'
  | 'Dispecerat';

export interface RescueMessage {
  id: string;
  channel: RescueChannelId;
  senderId: string;
  senderName: string;
  senderRole: RescueRole;
  text: string;
  timestamp: number;
  urgency: 'normal' | 'urgent' | 'sos';
  coords: { lat: number; lon: number } | null;
  eventRef: string | null;
}

export interface RescueUser {
  id: string;
  name: string;
  role: RescueRole;
  channel: RescueChannelId;
  connectedAt: number;
}

export interface SafetyChecklistItem {
  id: string;
  category: 'rucsac' | 'locuinta' | 'documente';
  label: string;
  checked: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}
