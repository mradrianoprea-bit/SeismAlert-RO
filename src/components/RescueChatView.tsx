import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Send, Shield, Users } from 'lucide-react';
import type {
  RescueChannelId,
  RescueMessage,
  RescueRole,
  RescueUser,
} from '../types/seismic';

interface RescueChatViewProps {
  messages: RescueMessage[];
  activeUsers: RescueUser[];
  userCoords: { lat: number; lon: number } | null;
  wsConnected: boolean;
  onJoinChannel: (name: string, role: RescueRole, channel: RescueChannelId) => void;
  onSendMessage: (payload: {
    channel: RescueChannelId;
    senderName: string;
    senderRole: RescueRole;
    text: string;
    urgency: 'normal' | 'urgent' | 'sos';
    coords: { lat: number; lon: number } | null;
  }) => void;
  onRequestLocation: () => void;
}

const CHANNELS: Array<{ id: RescueChannelId; label: string; desc: string }> = [
  { id: 'general', label: 'Coordonare Generală', desc: 'Alerte M ≥ 3.0 și situație națională' },
  { id: 'vrancea', label: 'Zona Vrancea / Est', desc: 'Monitorizare & intervenție sector Est' },
  { id: 'medical', label: 'Medical & Triaj', desc: 'Echipaje SMURD, ambulanță, prim ajutor' },
  { id: 'logistica', label: 'Logistică & Adăposturi', desc: 'Puncte de adunare, apă, energie' },
];

const ROLES: RescueRole[] = [
  'Cetățean',
  'Echipaj ISU',
  'Medic SMURD',
  'Voluntar',
  'Dispecerat',
];

export const RescueChatView: React.FC<RescueChatViewProps> = ({
  messages,
  activeUsers,
  userCoords,
  wsConnected,
  onJoinChannel,
  onSendMessage,
  onRequestLocation,
}) => {
  const [channel, setChannel] = useState<RescueChannelId>('general');
  const [senderName, setSenderName] = useState<string>(() => {
    try {
      return localStorage.getItem('seismalert_chat_name') || 'Operator Mobil';
    } catch {
      return 'Operator Mobil';
    }
  });
  const [senderRole, setSenderRole] = useState<RescueRole>('Cetățean');
  const [text, setText] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'sos'>('normal');
  const [includeCoords, setIncludeCoords] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('seismalert_chat_name', senderName);
    } catch {
      // ignore
    }
    onJoinChannel(senderName, senderRole, channel);
  }, [channel, senderName, senderRole, onJoinChannel]);

  const channelMessages = messages.filter((m) => m.channel === channel);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length, channel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage({
      channel,
      senderName: senderName.trim() || 'Operator',
      senderRole,
      text: text.trim(),
      urgency,
      coords: includeCoords ? userCoords : null,
    });
    setText('');
  };

  const sendQuickStatus = (quickText: string, quickUrgency: 'normal' | 'urgent' | 'sos') => {
    onSendMessage({
      channel,
      senderName: senderName.trim() || 'Operator',
      senderRole,
      text: quickText,
      urgency: quickUrgency,
      coords: userCoords,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left: Channels & Responder Profile */}
      <div className="lg:col-span-4 space-y-4">
        <div className="rounded-xl border border-slate-800 bg-[#0B111C] p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-display font-semibold text-white">
              Canale Coordonare Salvare
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono">
              <span
                className={`h-2 w-2 rounded-full ${
                  wsConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className={wsConnected ? 'text-emerald-400' : 'text-amber-400'}>
                {wsConnected ? 'Conectat Live' : 'Reconectare'}
              </span>
            </span>
          </div>

          <div className="space-y-1.5">
            {CHANNELS.map((c) => {
              const count = messages.filter((m) => m.channel === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChannel(c.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors min-h-[48px] ${
                    channel === c.id
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
                      : 'border-slate-800/70 bg-[#070B12] text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    <span className="text-xs font-mono tabular-nums text-slate-400">{count}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{c.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Responder Identity */}
        <div className="rounded-xl border border-slate-800 bg-[#0B111C] p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>IDENTITATE OPERATOR / CETĂȚEAN</span>
          </div>
          <div>
            <label htmlFor="chat-name" className="block text-xs text-slate-400 mb-1">
              Nume afișat
            </label>
            <input
              id="chat-name"
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-[#070B12] px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none min-h-[40px]"
            />
          </div>
          <div>
            <label htmlFor="chat-role" className="block text-xs text-slate-400 mb-1">
              Rol operațional
            </label>
            <select
              id="chat-role"
              value={senderRole}
              onChange={(e) => setSenderRole(e.target.value as RescueRole)}
              className="w-full rounded-lg border border-slate-800 bg-[#070B12] px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none min-h-[40px]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Echipaje conectate acum
            </span>
            <span className="font-mono tabular-nums text-slate-200 font-semibold">
              {activeUsers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Live Chat Stream */}
      <div className="lg:col-span-8 flex flex-col rounded-xl border border-slate-800 bg-[#0B111C] overflow-hidden min-h-[540px]">
        <div className="border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">
              {CHANNELS.find((c) => c.id === channel)?.label}
            </h3>
            <p className="text-xs text-slate-400">
              Sincronizare WebSocket în timp real cu toate terminalele conectate
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => sendQuickStatus('Sunt în siguranță — zonă verificată.', 'normal')}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 min-h-[34px]"
            >
              Sunt în siguranță
            </button>
            <button
              type="button"
              onClick={() => sendQuickStatus('NECESIT ASISTENȚĂ / EVACUARE URGENTĂ!', 'sos')}
              className="rounded-lg border border-red-500/50 bg-red-500/15 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/25 min-h-[34px]"
            >
              SOS Asistență
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px]">
          {channelMessages.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Niciun mesaj în acest canal. Transmiteți primul raport de stare.
            </div>
          ) : (
            channelMessages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border p-3.5 ${
                  m.urgency === 'sos'
                    ? 'border-red-500/50 bg-red-950/25'
                    : m.urgency === 'urgent'
                    ? 'border-amber-500/40 bg-amber-950/20'
                    : 'border-slate-800 bg-[#070B12]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{m.senderName}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-cyan-400">{m.senderRole}</span>
                    {m.urgency !== 'normal' && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span
                          className={`font-mono font-semibold uppercase ${
                            m.urgency === 'sos' ? 'text-red-400' : 'text-amber-400'
                          }`}
                        >
                          {m.urgency === 'sos' ? 'SOS CRITIC' : 'URGENT'}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="font-mono tabular-nums text-slate-500">
                    {new Date(m.timestamp).toLocaleTimeString('ro-RO', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-200 leading-relaxed">{m.text}</p>
                {m.coords && (
                  <div className="mt-2 text-xs font-mono tabular-nums text-emerald-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      GPS: {m.coords.lat.toFixed(5)}°N, {m.coords.lon.toFixed(5)}°E
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="border-t border-slate-800 p-3.5 bg-[#070B12] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(['normal', 'urgent', 'sos'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setUrgency(lvl)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors min-h-[32px] ${
                    urgency === lvl
                      ? lvl === 'sos'
                        ? 'bg-red-600 text-white'
                        : lvl === 'urgent'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-700 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl === 'normal' ? 'Normal' : lvl === 'urgent' ? 'Urgent' : 'SOS'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!userCoords) onRequestLocation();
                setIncludeCoords((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors min-h-[32px] ${
                includeCoords && userCoords
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {includeCoords && userCoords ? 'Coordonate GPS Atașate' : 'Atașează GPS'}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Transmite mesaj către echipajele de salvare..."
              className="flex-1 rounded-lg border border-slate-800 bg-[#0B111C] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none min-h-[44px]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition-colors min-h-[44px] whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              Trimite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
