import React, { useMemo, useState } from 'react';
import { ArrowDownWideNarrow, MapPin, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import { isMajorRomaniaEarthquake, isRomaniaEarthquake } from '../utils/seismicFilter';
import type { SeismicEvent } from '../types/seismic';

interface EarthquakeListViewProps {
  events: SeismicEvent[];
  selectedEvent: SeismicEvent | null;
  onSelectAndLocate: (ev: SeismicEvent) => void;
}

export const EarthquakeListView: React.FC<EarthquakeListViewProps> = ({
  events,
  selectedEvent,
  onSelectAndLocate,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'romania' | '45plus'>('all');

  const eligibleEvents = useMemo(
    () =>
      events
        .filter((e) => e.magnitude >= 3.0)
        .sort((a, b) => b.timestamp - a.timestamp),
    [events]
  );

  const sortedEvents = useMemo(() => {
    if (filterMode === 'romania') return eligibleEvents.filter(isRomaniaEarthquake);
    if (filterMode === '45plus') return eligibleEvents.filter((e) => e.magnitude >= 4.5);
    return eligibleEvents;
  }, [eligibleEvents, filterMode]);

  const romaniaCount = useMemo(
    () => eligibleEvents.filter(isRomaniaEarthquake).length,
    [eligibleEvents]
  );

  const strongCount = useMemo(
    () => eligibleEvents.filter((e) => e.magnitude >= 4.5).length,
    [eligibleEvents]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-[#0B111C] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <ArrowDownWideNarrow className="w-4 h-4" />
            <span>CRONOLOGIE DESCENDENTĂ ÎN TIMP · EXCLUSIV M ≥ 3.0 RICHTER</span>
          </div>
          <h2 className="mt-1 text-lg font-display font-bold text-white">
            Lista Cutremurelor M ≥ 3.0 ({sortedEvents.length})
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Sunt afișate doar cutremurele cu magnitudine ≥ 3.0 grade Richter. Alertele audio sunt active exclusiv pentru România (sirenă majoră distinctă pentru M &gt; 5.5).
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#070B12] p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterMode === 'all'
                ? 'bg-slate-800 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Toate ({eligibleEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('romania')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterMode === 'romania'
                ? 'bg-slate-800 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            România ({romaniaCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('45plus')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filterMode === '45plus'
                ? 'bg-slate-800 text-red-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            M ≥ 4.5 ({strongCount})
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0B111C] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-[#070B12] text-slate-400 font-mono">
              <tr>
                <th className="px-4 py-3 font-medium">Data &amp; Ora</th>
                <th className="px-4 py-3 font-medium">Regiune / Epicentru</th>
                <th className="px-4 py-3 font-medium text-right">Magnitudine</th>
                <th className="px-4 py-3 font-medium text-right">Adâncime</th>
                <th className="px-4 py-3 font-medium text-right">MMI</th>
                <th className="px-4 py-3 font-medium">Regim Audio</th>
                <th className="px-4 py-3 font-medium">Surse</th>
                <th className="px-4 py-3 font-medium text-right">Localizare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sortedEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nu există cutremure M ≥ 3.0 pentru filtrul selectat.
                  </td>
                </tr>
              ) : (
                sortedEvents.map((ev) => {
                  const inRomania = isRomaniaEarthquake(ev);
                  const isMajorRo = isMajorRomaniaEarthquake(ev);
                  const isSelected = selectedEvent?.id === ev.id;
                  const dt = new Date(ev.timestamp);
                  const dateStr = dt.toLocaleDateString('ro-RO', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });
                  const timeStr = dt.toLocaleTimeString('ro-RO', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  return (
                    <tr
                      key={ev.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-slate-800/60' : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-medium text-slate-200">{dateStr}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{timeStr}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{ev.place}</div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-500">
                          {ev.lat.toFixed(3)}°N, {ev.lon.toFixed(3)}°E
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={`text-sm font-bold ${
                            ev.magnitude >= 5.0
                              ? 'text-red-400'
                              : ev.magnitude >= 4.0
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          M {ev.magnitude.toFixed(1)}
                        </span>
                        <span className="text-slate-500 ml-1">{ev.magType}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {ev.depthKm} km
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {ev.mmi.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isMajorRo ? (
                          <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-red-400">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            RO · Sirenă Majoră (&gt;5.5)
                          </span>
                        ) : inRomania ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-emerald-400">
                            <Volume2 className="w-3.5 h-3.5" />
                            România · Audio Activ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-mono text-slate-500">
                            <VolumeX className="w-3.5 h-3.5" />
                            Extern · Fără Audio
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-cyan-400 whitespace-nowrap">
                        {ev.sources.join(' · ').toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectAndLocate(ev)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#070B12] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors min-h-[34px]"
                        >
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          Hartă
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
