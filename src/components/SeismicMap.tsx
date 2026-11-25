import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Globe, Layers, Navigation } from 'lucide-react';
import { TRANSLATIONS, type Language } from '../i18n/translations';
import type { SeismicEvent } from '../types/seismic';

interface SeismicMapProps {
  events: SeismicEvent[];
  selectedEvent: SeismicEvent | null;
  onSelectEvent: (ev: SeismicEvent) => void;
  userCoords: { lat: number; lon: number } | null;
  onRequestLocation: () => void;
  lang?: Language;
}

type MapStyle = 'dark' | 'topo' | 'satellite' | 'osm';

function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const SeismicMap: React.FC<SeismicMapProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  userCoords,
  onRequestLocation,
  lang = 'ro',
}) => {
  const t = TRANSLATIONS[lang];
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const ringsLayerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const [showIntensityRings, setShowIntensityRings] = useState(true);
  const [regionPreset, setRegionPreset] = useState<'romania' | 'europe' | 'global'>('romania');
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');

  const getMmiLabel = (mmi: number): string => {
    if (mmi >= 7) return t.map.mmiStrong;
    if (mmi >= 5) return t.map.mmiModStrong;
    if (mmi >= 3.5) return t.map.mmiLightMod;
    return t.map.mmiWeak;
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [45.75, 25.5],
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    });

    baseLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    ringsLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Keyless public map tile layers (zero API key required)
  useEffect(() => {
    const baseGroup = baseLayerRef.current;
    if (!baseGroup) return;
    baseGroup.clearLayers();

    if (mapStyle === 'dark') {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri, HERE, Garmin, OpenStreetMap',
          maxZoom: 16,
        }
      ).addTo(baseGroup);

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
        }
      ).addTo(baseGroup);
    } else if (mapStyle === 'topo') {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri, USGS, NOAA',
          maxZoom: 18,
        }
      ).addTo(baseGroup);
    } else if (mapStyle === 'satellite') {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Imagery &copy; Esri, Earthstar Geographics',
          maxZoom: 18,
        }
      ).addTo(baseGroup);
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
        }
      ).addTo(baseGroup);
    } else {
      L.tileLayer('/api/tiles/osm/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(baseGroup);
    }
  }, [mapStyle]);

  const focusRegion = (preset: 'romania' | 'europe' | 'global') => {
    setRegionPreset(preset);
    const map = mapRef.current;
    if (!map) return;
    if (preset === 'romania') {
      map.setView([45.8, 25.2], 6, { animate: true });
    } else if (preset === 'europe') {
      map.setView([43.5, 18.0], 4, { animate: true });
    } else {
      map.setView([20.0, 10.0], 2, { animate: true });
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    for (const ev of events) {
      if (ev.magnitude < 3.0) continue;
      const color =
        ev.magnitude >= 5.0
          ? '#EF4444'
          : ev.magnitude >= 4.0
          ? '#F59E0B'
          : '#06B6D4';
      const radius = Math.max(6, Math.min(24, ev.magnitude * 3.2));
      const isSelected = selectedEvent?.id === ev.id;

      const marker = L.circleMarker([ev.lat, ev.lon], {
        radius: isSelected ? radius + 3 : radius,
        color: isSelected ? '#FFFFFF' : color,
        weight: isSelected ? 2.5 : 1.5,
        fillColor: color,
        fillOpacity: ev.magnitude >= 5.0 ? 0.72 : 0.55,
      });

      const timeStr = new Date(ev.timestamp).toLocaleTimeString(t.locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      marker.bindTooltip(
        `<div style="font-family: 'JetBrains Mono', monospace; font-size: 11px;">
          <strong>M ${ev.magnitude.toFixed(1)}</strong> · ${ev.place}<br/>
          ${t.map.popupDepth}: ${ev.depthKm} km · MMI ${ev.mmi.toFixed(1)} · ${timeStr}
        </div>`,
        { direction: 'top', opacity: 0.95 }
      );

      marker.on('click', () => {
        onSelectEvent(ev);
      });

      marker.addTo(markersLayer);
    }
  }, [events, selectedEvent, onSelectEvent, t.locale, t.map.popupDepth]);

  useEffect(() => {
    const map = mapRef.current;
    const ringsLayer = ringsLayerRef.current;
    if (!map || !ringsLayer) return;

    ringsLayer.clearLayers();
    if (!selectedEvent) return;

    if (showIntensityRings) {
      const baseKm = Math.max(25, Math.pow(10, 0.42 * selectedEvent.magnitude) * 1.4);
      const zones = [
        { radiusM: baseKm * 350, color: '#EF4444', opacity: 0.2 },
        { radiusM: baseKm * 900, color: '#F59E0B', opacity: 0.12 },
        { radiusM: baseKm * 1650, color: '#06B6D4', opacity: 0.08 },
      ];

      for (const z of zones) {
        L.circle([selectedEvent.lat, selectedEvent.lon], {
          radius: z.radiusM,
          color: z.color,
          weight: 1.2,
          dashArray: '4 4',
          fillColor: z.color,
          fillOpacity: z.opacity,
          interactive: false,
        }).addTo(ringsLayer);
      }
    }

    map.panTo([selectedEvent.lat, selectedEvent.lon], { animate: true });
  }, [selectedEvent, showIntensityRings]);

  useEffect(() => {
    const userLayer = userLayerRef.current;
    if (!userLayer) return;
    userLayer.clearLayers();
    if (!userCoords) return;

    L.circleMarker([userCoords.lat, userCoords.lon], {
      radius: 7,
      color: '#FFFFFF',
      weight: 2,
      fillColor: '#10B981',
      fillOpacity: 0.9,
    })
      .bindTooltip(t.map.popupYou, { direction: 'top' })
      .addTo(userLayer);
  }, [userCoords, t.map.popupYou]);

  const distanceToSelected = useMemo(() => {
    if (!selectedEvent || !userCoords) return null;
    return calcDistanceKm(userCoords.lat, userCoords.lon, selectedEvent.lat, selectedEvent.lon);
  }, [selectedEvent, userCoords]);

  const isEn = lang === 'en';

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-[#0B111C] overflow-hidden">
      {/* Map Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-[#070B12] p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => focusRegion('romania')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                regionPreset === 'romania'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEn ? 'Romania / Vrancea' : 'România / Vrancea'}
            </button>
            <button
              type="button"
              onClick={() => focusRegion('europe')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                regionPreset === 'europe'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEn ? 'Europe' : 'Europa'}
            </button>
            <button
              type="button"
              onClick={() => focusRegion('global')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                regionPreset === 'global'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
              Global
            </button>
          </div>

          {/* Keyless Basemap Style Selector */}
          <div className="flex items-center gap-1 rounded-lg bg-[#070B12] p-1 border border-slate-800">
            {(
              [
                { id: 'dark', label: t.map.layerDark },
                { id: 'topo', label: t.map.layerTopo },
                { id: 'satellite', label: t.map.layerSat },
                { id: 'osm', label: 'OSM' },
              ] as const
            ).map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setMapStyle(style.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mapStyle === style.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowIntensityRings((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] whitespace-nowrap ${
              showIntensityRings
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                : 'border-slate-800 bg-[#070B12] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {isEn ? 'Intensity Rings & P/S Waves' : 'Inele Intensitate & Unde P/S'}
          </button>

          <button
            type="button"
            onClick={onRequestLocation}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#070B12] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors min-h-[36px] whitespace-nowrap"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            {userCoords ? (isEn ? 'GPS Active' : 'GPS Activ') : t.map.locateGps}
          </button>
        </div>
      </div>

      {/* Interactive Map Stage */}
      <div className="relative h-[420px] lg:h-[500px] w-full">
        <div ref={mapContainerRef} className="h-full w-full z-10" />

        {/* Selected Epicenter Telemetry Overlay */}
        {selectedEvent && (
          <div className="pointer-events-auto absolute bottom-3 left-3 right-3 sm:right-auto sm:w-88 z-20 rounded-xl border border-slate-800 bg-[#070B12]/92 p-3.5 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="tabular-nums">
                    {selectedEvent.lat.toFixed(3)}°N, {selectedEvent.lon.toFixed(3)}°E
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white truncate">
                  {selectedEvent.place}
                </p>
              </div>
              <div
                className={`text-right font-mono tabular-nums shrink-0 ${
                  selectedEvent.magnitude >= 5.0
                    ? 'text-red-400'
                    : selectedEvent.magnitude >= 4.0
                    ? 'text-amber-400'
                    : 'text-cyan-400'
                }`}
              >
                <div className="text-lg font-bold leading-none">
                  M {selectedEvent.magnitude.toFixed(1)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {selectedEvent.magType}
                </div>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-2.5 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-500">{t.map.depthLabel}</div>
                <div className="text-slate-200 font-semibold">{selectedEvent.depthKm} km</div>
              </div>
              <div>
                <div className="text-slate-500">{t.map.mmiLabel}</div>
                <div className="text-slate-200 font-semibold">
                  MMI {selectedEvent.mmi.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">
                  {distanceToSelected !== null ? t.map.distanceLabel : isEn ? 'Level' : 'Regim'}
                </div>
                <div className="text-slate-200 font-semibold">
                  {distanceToSelected !== null
                    ? `${Math.round(distanceToSelected)} km`
                    : getMmiLabel(selectedEvent.mmi).split(' ')[0]}
                </div>
              </div>
            </div>

            {distanceToSelected !== null && (
              <div className="mt-2 border-t border-slate-800/80 pt-2 flex items-center justify-between text-[11px] font-mono text-slate-300 tabular-nums">
                <span>
                  {isEn ? 'P-Wave (~6 km/s)' : 'Undă P (~6 km/s)'}: ~{Math.round(distanceToSelected / 6)}s
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {isEn ? 'S-Wave (~3.5 km/s)' : 'Undă S (~3.5 km/s)'}: ~{Math.round(distanceToSelected / 3.5)}s
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map Scale & Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span>{t.map.legendStrong}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>{t.map.legendModerate}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
            <span>{t.map.legendThreshold}</span>
          </span>
        </div>
        <span className="font-mono tabular-nums text-slate-500">
          {events.filter((e) => e.magnitude >= 3.0).length}{' '}
          {isEn ? 'epicenters M ≥ 3.0 · Keyless Map' : 'epicentre M ≥ 3.0 · Hartă fără API Key'}
        </span>
      </div>
    </div>
  );
};
