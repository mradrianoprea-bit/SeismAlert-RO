import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Flashlight,
  PhoneCall,
  Plus,
  ShieldAlert,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { startOfflineWhistle, stopOfflineWhistle } from '../utils/alarmAudio';
import type { Language } from '../i18n/translations';
import type { EmergencyContact, SafetyChecklistItem } from '../types/seismic';

interface SafetyPlanViewProps {
  lang?: Language;
}

const DEFAULT_CHECKLIST_EN: Record<string, string> = {
  c1: 'Drinking water (at least 2L/person/day for 3 days)',
  c2: 'Non-perishable food and high-energy bars',
  c3: 'First-aid kit and essential prescription medications',
  c4: 'LED flashlight + spare batteries + power bank',
  c5: 'Emergency whistle and battery-powered FM radio',
  c6: 'Copies of ID, passport, property documents, and cash',
  c7: 'Locate main gas shutoff valve and electrical breaker panel',
  c8: 'Anchor tall furniture and water heater to structural walls',
};

const DEFAULT_CHECKLIST: SafetyChecklistItem[] = [
  { id: 'c1', category: 'rucsac', label: 'Apă potabilă (minimum 2L/persoană/zi pentru 3 zile)', checked: false },
  { id: 'c2', category: 'rucsac', label: 'Alimente neperisabile și batoane energetice', checked: false },
  { id: 'c3', category: 'rucsac', label: 'Trusă de prim ajutor și medicamente esențiale', checked: false },
  { id: 'c4', category: 'rucsac', label: 'Lanternă LED + baterii de rezervă + acumulator extern', checked: false },
  { id: 'c5', category: 'rucsac', label: 'Fluier de semnalizare și radio FM cu baterii', checked: false },
  { id: 'c6', category: 'documente', label: 'Copii CI, pașaport, acte proprietate și bani cash', checked: false },
  { id: 'c7', category: 'locuinta', label: 'Identificarea robinetului principal de gaze și tablou electric', checked: false },
  { id: 'c8', category: 'locuinta', label: 'Ancorarea mobilierului înalt și a boilerului', checked: false },
];

const DEFAULT_CONTACTS: EmergencyContact[] = [
  { id: 'e1', name: 'Număr Unic Urgență', phone: '112', relation: 'Servicii Urgență / ISU / SMURD' },
  { id: 'e2', name: 'Punct Întâlnire Familie', phone: 'Local', relation: 'Parc / Spațiu deschis fără clădiri înalte' },
];

const DEFAULT_MEETING_RO = 'Parc deschis la min. 50m de clădiri și stâlpi electrici';
const DEFAULT_MEETING_EN = 'Open park at least 50m away from buildings and power poles';

export const SafetyPlanView: React.FC<SafetyPlanViewProps> = ({ lang = 'ro' }) => {
  const isEn = lang === 'en';

  const [checklist, setChecklist] = useState<SafetyChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem('seismalert_safety_checklist');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? (parsed as SafetyChecklistItem[]) : DEFAULT_CHECKLIST;
    } catch {
      return DEFAULT_CHECKLIST;
    }
  });

  const [contacts, setContacts] = useState<EmergencyContact[]>(() => {
    try {
      const saved = localStorage.getItem('seismalert_safety_contacts');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? (parsed as EmergencyContact[]) : DEFAULT_CONTACTS;
    } catch {
      return DEFAULT_CONTACTS;
    }
  });

  const [meetingPoint, setMeetingPoint] = useState<string>(() => {
    try {
      return localStorage.getItem('seismalert_meeting_point') || DEFAULT_MEETING_RO;
    } catch {
      return DEFAULT_MEETING_RO;
    }
  });

  const [protocolTab, setProtocolTab] = useState<'during' | 'after' | 'trapped'>('during');
  const [newItemText, setNewItemText] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [whistleActive, setWhistleActive] = useState(false);
  const [sosFlashActive, setSosFlashActive] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('seismalert_safety_checklist', JSON.stringify(checklist));
    } catch {
      // ignore storage quota errors
    }
  }, [checklist]);

  useEffect(() => {
    try {
      localStorage.setItem('seismalert_safety_contacts', JSON.stringify(contacts));
    } catch {
      // ignore
    }
  }, [contacts]);

  useEffect(() => {
    try {
      localStorage.setItem('seismalert_meeting_point', meetingPoint);
    } catch {
      // ignore
    }
  }, [meetingPoint]);

  useEffect(() => {
    return () => {
      stopOfflineWhistle();
    };
  }, []);

  // Visual Morse SOS beacon loop (... --- ...)
  useEffect(() => {
    if (!sosFlashActive) {
      setFlashOn(false);
      return;
    }
    const pattern = [
      200, 150, 200, 150, 200, 350, // S
      550, 150, 550, 150, 550, 350, // O
      200, 150, 200, 150, 200, 900, // S
    ];
    let step = 0;
    let timer: number;
    const tick = () => {
      setFlashOn(step % 2 === 0);
      const duration = pattern[step % pattern.length];
      step++;
      timer = window.setTimeout(tick, duration);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [sosFlashActive]);

  const toggleWhistle = () => {
    if (whistleActive) {
      stopOfflineWhistle();
      setWhistleActive(false);
    } else {
      startOfflineWhistle();
      setWhistleActive(true);
    }
  };

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const addChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    setChecklist((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, category: 'rucsac', label: trimmed, checked: false },
    ]);
    setNewItemText('');
  };

  const addContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    setContacts((prev) => [
      ...prev,
      {
        id: `contact-${Date.now()}`,
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        relation: isEn ? 'Family / Rescue Contact' : 'Contact Familie / Salvare',
      },
    ]);
    setNewContactName('');
    setNewContactPhone('');
  };

  const getItemLabel = (item: SafetyChecklistItem) =>
    isEn && DEFAULT_CHECKLIST_EN[item.id] ? DEFAULT_CHECKLIST_EN[item.id] : item.label;

  const getContactDisplay = (c: EmergencyContact) => {
    if (!isEn) return { name: c.name, relation: c.relation };
    if (c.id === 'e1') return { name: 'Single Emergency Number', relation: 'Emergency Services / Fire / Ambulance' };
    if (c.id === 'e2') return { name: 'Family Meeting Point', relation: 'Park / Open space away from tall buildings' };
    return { name: c.name, relation: c.relation };
  };

  const displayMeetingPoint =
    isEn && meetingPoint === DEFAULT_MEETING_RO ? DEFAULT_MEETING_EN : meetingPoint;

  const completedCount = checklist.filter((i) => i.checked).length;
  const readinessPct = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Full-screen SOS visual strobe when activated */}
      {sosFlashActive && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 transition-colors ${
            flashOn ? 'bg-white text-slate-950' : 'bg-[#070B12] text-white'
          }`}
        >
          <p className="text-2xl font-display font-bold tracking-tight">
            {isEn ? 'SOS BEACON ACTIVE (MORSE)' : 'SEMNAL SOS ACTIV (MORSE)'}
          </p>
          <p className="mt-2 text-sm opacity-80">
            {isEn
              ? 'Screen emits · · · — — — · · · without internet connection'
              : 'Ecranul emite semnalul · · · — — — · · · fără conexiune internet'}
          </p>
          <button
            type="button"
            onClick={() => setSosFlashActive(false)}
            className="mt-8 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-red-500 min-h-[48px]"
          >
            {isEn ? 'Stop SOS Beacon' : 'Oprește Semnalul SOS'}
          </button>
        </div>
      )}

      {/* Offline Guarantee Header & Emergency Acoustic/Visual Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0B111C] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-bold text-white">
                {isEn
                  ? 'Offline Safety Plan for Critical Situations'
                  : 'Plan de Siguranță Offline pentru Situații Critice'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {isEn
                  ? 'All protocols, checklists, contacts, and SOS tools are stored locally on your device and work completely without internet.'
                  : 'Toate protocoalele, listele de verificare, contactele și semnalele SOS sunt salvate local în dispozitiv și funcționează fără internet.'}
              </p>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-xs text-slate-500">
                {isEn ? 'Kit Readiness' : 'Pregătire Rucsac'}
              </div>
              <div className="text-2xl font-bold text-cyan-400">{readinessPct}%</div>
            </div>
          </div>

          {/* Offline Protocol Tabs */}
          <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setProtocolTab('during')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] ${
                protocolTab === 'during'
                  ? 'bg-red-500/15 text-red-300 border border-red-500/40'
                  : 'bg-[#070B12] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {isEn ? '1. During Earthquake' : '1. În Timpul Cutremurului'}
            </button>
            <button
              type="button"
              onClick={() => setProtocolTab('after')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] ${
                protocolTab === 'after'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                  : 'bg-[#070B12] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {isEn ? '2. Immediately After' : '2. Imediat După Seism'}
            </button>
            <button
              type="button"
              onClick={() => setProtocolTab('trapped')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[40px] ${
                protocolTab === 'trapped'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                  : 'bg-[#070B12] text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {isEn ? '3. Trapped Under Debris' : '3. Blocaj sub Dărâmături'}
            </button>
          </div>

          <div className="mt-4 space-y-2.5 text-sm text-slate-200">
            {protocolTab === 'during' &&
              (isEn ? (
                <ol className="space-y-2.5 list-decimal list-inside">
                  <li>
                    <strong>Take cover immediately</strong> under a sturdy table, heavy desk, or
                    against an interior load-bearing wall.
                  </li>
                  <li>
                    <strong>Protect your head and neck</strong> with your arms or a pillow; stay
                    away from windows, mirrors, and overhead fixtures.
                  </li>
                  <li>
                    <strong>DO NOT use elevators</strong> and do not run down staircases while the
                    ground is shaking.
                  </li>
                  <li>
                    If outdoors, move at least 30–50m away from buildings, balconies, and power
                    lines.
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2.5 list-decimal list-inside">
                  <li>
                    <strong>Adăpostiți-vă imediat</strong> sub o masă solidă, un birou rezistent sau
                    lângă un perete de rezistență interior.
                  </li>
                  <li>
                    <strong>Protejați-vă capul și gâtul</strong> cu brațele sau cu o pernă;
                    depărtați-vă de ferestre, oglinzi și corpuri suspendate.
                  </li>
                  <li>
                    <strong>NU folosiți liftul</strong> și nu alergați pe scări în timpul mișcării
                    seismice.
                  </li>
                  <li>
                    Dacă sunteți în exterior, îndepărtați-vă la cel puțin 30–50m de clădiri,
                    balcoane și cabluri electrice.
                  </li>
                </ol>
              ))}
            {protocolTab === 'after' &&
              (isEn ? (
                <ol className="space-y-2.5 list-decimal list-inside">
                  <li>
                    <strong>Shut off gas and electricity</strong> if you smell gas or notice
                    structural damage; never light an open flame.
                  </li>
                  <li>
                    <strong>Evacuate via stairs</strong> calmly, taking your emergency go-bag and
                    sturdy footwear.
                  </li>
                  <li>
                    <strong>Prepare for aftershocks</strong> and move to your designated open-space
                    meeting point.
                  </li>
                  <li>
                    Reserve 112 emergency calls strictly for medical emergencies or trapped people;
                    prefer SMS/chat to keep voice lines open.
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2.5 list-decimal list-inside">
                  <li>
                    <strong>Opriți alimentarea cu gaze și energie electrică</strong> dacă simțiți
                    miros de gaz sau observați avarii; nu aprindeți flacără deschisă.
                  </li>
                  <li>
                    <strong>Evacuați pe scări</strong> cu calm, luând rucsacul de urgență și
                    încălțăminte rezistentă.
                  </li>
                  <li>
                    <strong>Pregătiți-vă pentru replici seismice</strong> și deplasați-vă către
                    punctul de întâlnire stabilit.
                  </li>
                  <li>
                    Folosiți apelurile 112 exclusiv pentru urgențe medicale sau persoane blocate;
                    preferați SMS/chat pentru a nu bloca rețeaua.
                  </li>
                </ol>
              ))}
            {protocolTab === 'trapped' &&
              (isEn ? (
                <ol className="space-y-2.5 list-decimal list-inside">
                  <li>
                    <strong>Stay calm and conserve oxygen</strong>: cover your mouth and nose with
                    fabric to avoid inhaling dust.
                  </li>
                  <li>
                    <strong>Never light matches or lighters</strong> (high risk of gas leaks).
                  </li>
                  <li>
                    <strong>Signal periodically</strong> by tapping rhythmically (3 knocks) on pipes
                    or walls, or activate the <strong>3.1 kHz Acoustic Whistle</strong> on the right.
                  </li>
                  <li>
                    Use the <strong>Morse Screen SOS Beacon</strong> to help rescue teams spot you in
                    the dark.
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2.5 list-decimal list-inside">
                  <li>
                    <strong>Păstrați-vă calmul și economisiți oxigenul</strong>: acoperiți-vă gura
                    și nasul cu o haină pentru a evita inhalarea prafului.
                  </li>
                  <li>
                    <strong>Nu aprindeți brichete sau chibrituri</strong> (risc major de acumulare
                    de gaze).
                  </li>
                  <li>
                    <strong>Semnalizați periodic</strong> bătând ritmic (3 lovituri) în țevi sau
                    pereți ori activați <strong>Fluierul Acustic 3.1 kHz</strong> din dreapta.
                  </li>
                  <li>
                    Utilizați <strong>Semnalul SOS Lanternă Ecran</strong> pentru a fi detectat în
                    întuneric de echipele de salvare.
                  </li>
                </ol>
              ))}
          </div>
        </div>

        {/* Offline Survival Tools */}
        <div className="rounded-xl border border-slate-800 bg-[#0B111C] p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <ShieldAlert className="w-4 h-4" />
              <span>{isEn ? 'OFFLINE RESCUE TOOLS' : 'INSTRUMENTE OFFLINE DE SALVARE'}</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              {isEn
                ? 'Works completely offline using the built-in audio synthesizer and phone display.'
                : 'Funcționează complet offline folosind sintetizatorul audio și ecranul telefonului.'}
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={toggleWhistle}
              className={`w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors min-h-[48px] ${
                whistleActive
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              }`}
            >
              {whistleActive ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
              {whistleActive
                ? isEn
                  ? 'Stop 3.1 kHz Whistle'
                  : 'Oprește Fluierul 3.1 kHz'
                : isEn
                ? 'Start 3.1 kHz Acoustic Whistle'
                : 'Activează Fluier Acustic 3.1 kHz'}
            </button>

            <button
              type="button"
              onClick={() => setSosFlashActive(true)}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors min-h-[48px]"
            >
              <Flashlight className="w-4 h-4" />
              {isEn ? 'Emit Screen SOS Beacon (Morse)' : 'Emitere Semnal SOS Ecran (Morse)'}
            </button>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <label
              htmlFor="meeting-point"
              className="block text-xs font-medium text-slate-400 mb-1.5"
            >
              {isEn ? 'Saved Offline Meeting Point' : 'Punct de Întâlnire Salvat Offline'}
            </label>
            <input
              id="meeting-point"
              type="text"
              value={displayMeetingPoint}
              onChange={(e) => setMeetingPoint(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-[#070B12] px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Checklist + Emergency Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rucsac & Checklist */}
        <div className="rounded-xl border border-slate-800 bg-[#0B111C] p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-display font-semibold text-white">
              {isEn ? '72h Emergency Kit & Home Check' : 'Kit Urgență 72h & Verificare Locuință'}
            </h3>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {completedCount} / {checklist.length} {isEn ? 'checked' : 'bifate'}
            </span>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {checklist.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-start gap-3 rounded-lg border border-slate-800/80 bg-[#070B12] px-3.5 py-2.5 text-left hover:border-slate-700 transition-colors min-h-[44px]"
              >
                {item.checked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <span
                  className={`text-sm ${
                    item.checked ? 'line-through text-slate-500' : 'text-slate-200'
                  }`}
                >
                  {getItemLabel(item)}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={addChecklistItem} className="mt-4 flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder={
                isEn
                  ? 'Add required item (e.g. insulin, pet food)...'
                  : 'Adaugă element necesar (ex. insulină, hrană animale)...'
              }
              className="flex-1 rounded-lg border border-slate-800 bg-[#070B12] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none min-h-[42px]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              {isEn ? 'Add' : 'Adaugă'}
            </button>
          </form>
        </div>

        {/* Emergency Contacts */}
        <div className="rounded-xl border border-slate-800 bg-[#0B111C] p-5">
          <h3 className="text-base font-display font-semibold text-white mb-4">
            {isEn ? 'Quick Rescue & Family Contacts' : 'Contacte Rapide Salvare & Familie'}
          </h3>

          <div className="space-y-2.5">
            {contacts.map((c) => {
              const disp = getContactDisplay(c);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-[#070B12] px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-100 truncate">
                      {disp.name}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{disp.relation}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={c.phone !== 'Local' ? `tel:${c.phone}` : undefined}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-300 hover:bg-emerald-500/20 min-h-[38px]"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      {c.phone}
                    </a>
                    {c.id.startsWith('contact-') && (
                      <button
                        type="button"
                        onClick={() =>
                          setContacts((prev) => prev.filter((item) => item.id !== c.id))
                        }
                        aria-label={`${isEn ? 'Delete' : 'Șterge'} ${disp.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={addContact} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder={isEn ? 'Contact name' : 'Nume contact'}
              className="rounded-lg border border-slate-800 bg-[#070B12] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none min-h-[42px]"
            />
            <input
              type="tel"
              value={newContactPhone}
              onChange={(e) => setNewContactPhone(e.target.value)}
              placeholder={isEn ? 'Phone (e.g. +40...)' : 'Telefon (ex. 07xx...)'}
              className="rounded-lg border border-slate-800 bg-[#070B12] px-3 py-2 text-sm font-mono text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none min-h-[42px]"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition-colors min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              {isEn ? 'Save Contact' : 'Salvează Contact'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
