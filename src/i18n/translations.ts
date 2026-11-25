export type Language = 'ro' | 'en';

export interface Translations {
  locale: string;
  nav: {
    monitor: string;
    map: string;
    list: string;
    safety: string;
    chat: string;
    alertsCta: string;
    mobileMonitor: string;
    mobileMap: string;
    mobileList: string;
    mobileSafety: string;
    mobileChat: string;
    mobileAlerts: string;
  };
  alarm: {
    majorRoBanner: string;
    standardRoBanner: string;
    externalBanner: string;
    depth: string;
    estMmi: string;
    sources: string;
    stopAudio: string;
    safetyPlan: string;
    rescueChat: string;
  };
  offline: {
    banner: string;
    openPlan: string;
  };
  ribbon: {
    liveTelemetry: string;
    reconnecting: string;
    officialSources: string;
    alertThreshold: string;
    audioArmed: string;
    armAudio: string;
    refreshing: string;
    refreshSources: string;
    testAlarm: string;
  };
  kpi: {
    monitoredEvents: string;
    monitoredSub: string;
    romaniaQuakes: string;
    romaniaSub: string;
    maxMagnitude: string;
    maxMagFallback: string;
    lastSync: string;
    pollingSub: string;
  };
  feed: {
    title: string;
    all: string;
    romania: string;
    m45Plus: string;
    empty: string;
    depth: string;
    romaniaAudio: string;
    majorSiren: string;
  };
  sourcesTable: {
    title: string;
    subtitle: string;
    agency: string;
    coverage: string;
    status: string;
    events: string;
    latency: string;
    online: string;
    degraded: string;
    offline: string;
  };
  list: {
    eyebrow: string;
    title: string;
    subtitle: string;
    all: string;
    romania: string;
    colDateTime: string;
    colRegion: string;
    colMagnitude: string;
    colDepth: string;
    colMmi: string;
    colAudio: string;
    colSources: string;
    colLocate: string;
    empty: string;
    roMajorSiren: string;
    roAudioActive: string;
    extNoAudio: string;
    mapBtn: string;
  };
  map: {
    eyebrow: string;
    title: string;
    layerDark: string;
    layerTopo: string;
    layerSat: string;
    layerOsm: string;
    myLocation: string;
    locateGps: string;
    focusRomania: string;
    worldView: string;
    selectedEpicenter: string;
    depthLabel: string;
    mmiLabel: string;
    distanceLabel: string;
    sourcesLabel: string;
    legendStrong: string;
    legendModerate: string;
    legendThreshold: string;
    mmiStrong: string;
    mmiModStrong: string;
    mmiLightMod: string;
    mmiWeak: string;
    popupDepth: string;
    popupIntensity: string;
    popupSources: string;
    popupYou: string;
  };
  seismograph: {
    title: string;
    subtitle: string;
    sensorActive: string;
    armAccelerometer: string;
    statusAlarm: string;
    statusMonitoring: string;
  };
  safety: {
    eyebrow: string;
    title: string;
    subtitle: string;
    whistleActive: string;
    whistleStart: string;
    sosActive: string;
    sosStart: string;
    sosHint: string;
    checklistTitle: string;
    checklistReset: string;
    protocolsTitle: string;
    contactsTitle: string;
    phaseBefore: string;
    phaseDuring: string;
    phaseAfter: string;
  };
  chat: {
    eyebrow: string;
    title: string;
    subtitle: string;
    connected: string;
    reconnecting: string;
    activeOperators: string;
    channelsTitle: string;
    profileTitle: string;
    namePlaceholder: string;
    roleLabel: string;
    updateProfile: string;
    attachGps: string;
    gpsAttached: string;
    urgencyNormal: string;
    urgencyUrgent: string;
    urgencySos: string;
    messagePlaceholder: string;
    send: string;
    emptyChannel: string;
  };
  alerts: {
    title: string;
    subtitle: string;
    minMagLabel: string;
    scaleStandard: string;
    scaleModerate: string;
    scaleMajor: string;
    radiusLabel: string;
    radiusGlobal: string;
    enableGpsHint: string;
    sirenToggle: string;
    on: string;
    off: string;
    iframeNotice: string;
    openInBrowser: string;
    pushConfiguring: string;
    pushDisable: string;
    pushEnable: string;
    deniedHint: string;
    testTitle: string;
    testSubtitle: string;
    testBtn: string;
    majorSirenBoxTitle: string;
    majorSirenBoxDesc: string;
    majorSirenTestBtn: string;
    mobileEyebrow: string;
    mobileTitle: string;
    mobileDesc: string;
    opt1Title: string;
    opt1Desc: string;
    opt2Title: string;
    opt2Desc: string;
    downloadingZip: string;
    downloadZipBtn: string;
    pushRegistered: string;
    pushDisabledMsg: string;
    pushNotSupportedIos: string;
    pushNotSupported: string;
    pushBlockedIframe: string;
    pushBlockedBrowser: string;
    pushError: string;
  };
  pwa: {
    installed: string;
    installBtn: string;
    iosTitle: string;
    iosSteps: string;
    genericSteps: string;
    close: string;
  };
}

export const TRANSLATIONS: Record<Language, Translations> = {
  ro: {
    locale: 'ro-RO',
    nav: {
      monitor: 'Monitorizare',
      map: 'Hartă & Epicentru',
      list: 'Listă Cutremure',
      safety: 'Plan Offline',
      chat: 'Echipe Salvare',
      alertsCta: 'Alerte & APK',
      mobileMonitor: 'Monitor',
      mobileMap: 'Hartă',
      mobileList: 'Listă',
      mobileSafety: 'Offline',
      mobileChat: 'Salvare',
      mobileAlerts: 'Push/APK',
    },
    alarm: {
      majorRoBanner: 'ALERTĂ MAJORĂ ROMÂNIA · M > 5.5 RICHTER · SIRENĂ SPECIFICĂ DE URGENȚĂ ACTIVĂ',
      standardRoBanner: 'ALARMĂ SEISMICĂ ACTIVĂ · PRAG ≥ 3.0 RICHTER · ROMÂNIA (SONOR ACTIV)',
      externalBanner: 'ALARMĂ SEISMICĂ ACTIVĂ · PRAG ≥ 3.0 RICHTER · EXTERN (DOAR VIZUAL, FĂRĂ SUNET)',
      depth: 'Adâncime',
      estMmi: 'Intensitate estimată MMI',
      sources: 'Surse',
      stopAudio: 'Oprește Alarma Sonoră',
      safetyPlan: 'Plan Siguranță',
      rescueChat: 'Chat Salvare',
    },
    offline: {
      banner: 'Mod Offline activ — Datele seismice anterioare și Planul de Siguranță Offline rămân disponibile.',
      openPlan: 'Deschide Plan Offline',
    },
    ribbon: {
      liveTelemetry: 'Flux Telemetrie Live',
      reconnecting: 'Reconectare Server',
      officialSources: 'Surse Oficiale',
      alertThreshold: 'Prag Alertă',
      audioArmed: 'Sunet Alarmă Armat',
      armAudio: 'Armează Sunet Alarmă',
      refreshing: 'Se actualizează...',
      refreshSources: 'Actualizează Surse',
      testAlarm: 'Test Alarmă',
    },
    kpi: {
      monitoredEvents: 'Evenimente Monitorizate',
      monitoredSub: 'Agregat din 6 fluxuri FDSN/GeoJSON',
      romaniaQuakes: 'Seisme ≥ 3.0 Richter (România)',
      romaniaSub: 'Alertă sonoră activă exclusiv RO',
      maxMagnitude: 'Magnitudine Maximă Recentă',
      maxMagFallback: 'Scara Richter / Mw',
      lastSync: 'Ultima Sincronizare API',
      pollingSub: 'Polling automat la 25 secunde',
    },
    feed: {
      title: 'Flux Evenimente (M ≥ 3.0)',
      all: 'Toate',
      romania: 'România',
      m45Plus: 'M ≥ 4.5',
      empty: 'Nu există evenimente M ≥ 3.0 pentru filtrul selectat.',
      depth: 'Adâncime',
      romaniaAudio: 'RO · Sonor',
      majorSiren: 'RO · Major >5.5',
    },
    sourcesTable: {
      title: 'Surse Oficiale de Monitorizare Geologică Integrate',
      subtitle: 'Deduplicare multi-agenție și coroborare automată în timp real',
      agency: 'Agenție / Rețea',
      coverage: 'Acoperire',
      status: 'Stare',
      events: 'Evenimente',
      latency: 'Latență',
      online: '● Activ',
      degraded: '▲ Parțial',
      offline: '✖ Indisponibil',
    },
    list: {
      eyebrow: 'CRONOLOGIE DESCENDENTĂ ÎN TIMP · EXCLUSIV M ≥ 3.0 RICHTER',
      title: 'Lista Cutremurelor M ≥ 3.0',
      subtitle: 'Sunt afișate doar cutremurele cu magnitudine ≥ 3.0 grade Richter. Alertele sonore sunt active exclusiv pentru România (sirenă majoră distinctă pentru M > 5.5).',
      all: 'Toate',
      romania: 'România',
      colDateTime: 'Data / Ora',
      colRegion: 'Regiune / Epicentru',
      colMagnitude: 'Magnitudine',
      colDepth: 'Adâncime',
      colMmi: 'MMI',
      colAudio: 'Regim Sonor',
      colSources: 'Surse',
      colLocate: 'Localizare',
      empty: 'Nu există cutremure M ≥ 3.0 pentru filtrul selectat.',
      roMajorSiren: 'RO · Sirenă Majoră (>5.5)',
      roAudioActive: 'România · Sonor Activ',
      extNoAudio: 'Extern · Fără Sunet',
      mapBtn: 'Hartă',
    },
    map: {
      eyebrow: 'HARTĂ INTERACTIVĂ FĂRĂ API KEY · EPICENTRE & INTENSITATE',
      title: 'Localizare Epicentru & Undă Seismică',
      layerDark: 'Întunecat',
      layerTopo: 'Topografic',
      layerSat: 'Satelit',
      layerOsm: 'OSM Străzi',
      myLocation: 'Locația Mea',
      locateGps: 'Poziție GPS',
      focusRomania: 'Focus România',
      worldView: 'Vedere Globală',
      selectedEpicenter: 'Epicentru Selectat',
      depthLabel: 'Adâncime',
      mmiLabel: 'Intensitate MMI',
      distanceLabel: 'Distanță GPS',
      sourcesLabel: 'Surse',
      legendStrong: 'M ≥ 5.0 Richter (Puternic)',
      legendModerate: 'M 4.0–4.9 (Moderat)',
      legendThreshold: 'M 3.0–3.9 (Prag Alarmă)',
      mmiStrong: 'Puternic / Distrugător',
      mmiModStrong: 'Moderat-Puternic',
      mmiLightMod: 'Ușor-Moderat',
      mmiWeak: 'Slab / Instrumental',
      popupDepth: 'Adâncime',
      popupIntensity: 'Intensitate estimată',
      popupSources: 'Surse',
      popupYou: 'Poziția ta GPS',
    },
    seismograph: {
      title: 'Seismograf Live & Senzor Accelerometru P-Wave',
      subtitle: 'Monitorizare continuă a undelor seismice și detecție locală de vibrații pe telefon',
      sensorActive: 'Senzor Accelerometru Activ',
      armAccelerometer: 'Activează Senzor Telefon',
      statusAlarm: 'UNDĂ SEISMICĂ DETECTATĂ',
      statusMonitoring: 'MONITORIZARE ACTIVĂ',
    },
    safety: {
      eyebrow: 'MOD OFFLINE GARANTAT · ACCES FĂRĂ INTERNET',
      title: 'Plan de Siguranță Offline & Kit Supraviețuire 72h',
      subtitle: 'Salvat local pe dispozitiv. Include fluier acustic SOS (3.1 kHz), semnalizare vizuală Morse, proceduri de urgență și lista rucsacului de 72 de ore.',
      whistleActive: 'Oprește Fluier SOS (3.1 kHz)',
      whistleStart: 'Pornește Fluier SOS (3.1 kHz)',
      sosActive: 'Oprește Semnal Vizual SOS',
      sosStart: 'Semnal Vizual Morse SOS',
      sosHint: 'Semnalizare continuă • • • — — — • • • pentru localizare sub dărâmături',
      checklistTitle: 'Rucsac de Urgență 72 Ore (salvat offline)',
      checklistReset: 'Resetează lista',
      protocolsTitle: 'Protocoale Critice de Acțiune',
      contactsTitle: 'Numere & Frecvențe de Urgență',
      phaseBefore: 'Înainte de Cutremur',
      phaseDuring: 'În Timpul Cutremurului',
      phaseAfter: 'După Cutremur',
    },
    chat: {
      eyebrow: 'COMUNICAȚII REAL-TIME · COORDONARE INTERVENȚIE',
      title: 'Chat Coordonare Echipe Salvare & Cetățeni',
      subtitle: 'Transmitere instantanee prin WebSocket cu etichete de urgență SOS și coordonate GPS atașate.',
      connected: 'Conectat WebSocket',
      reconnecting: 'Reconectare...',
      activeOperators: 'operatori activi',
      channelsTitle: 'Canale Operaționale',
      profileTitle: 'Identificare Operator',
      namePlaceholder: 'Nume sau indicativ...',
      roleLabel: 'Rol',
      updateProfile: 'Actualizează Profil',
      attachGps: 'Atașează GPS',
      gpsAttached: 'GPS Atașat',
      urgencyNormal: 'Normal',
      urgencyUrgent: 'Urgent',
      urgencySos: 'SOS Critic',
      messagePlaceholder: 'Scrie raport de situație, locație sau solicitare de intervenție...',
      send: 'Trimite',
      emptyChannel: 'Niciun mesaj pe acest canal. Scrie primul raport operațional.',
    },
    alerts: {
      title: 'Alerte Push Personalizate în Timp Real',
      subtitle: 'Prag minim obligatoriu: 3.0 grade Richter. Alertele sonore sunt active exclusiv pentru România, iar pentru cutremurele majore din România M > 5.5 se emite o sirenă de urgență specifică, distinctă (canal nativ de alarmă în APK/iOS + push prioritar).',
      minMagLabel: 'Magnitudine minimă alertă push (Richter)',
      scaleStandard: '3.0 (Standard)',
      scaleModerate: '4.5 (Moderat)',
      scaleMajor: '6.5 (Major)',
      radiusLabel: 'Filtru distanță față de poziția GPS',
      radiusGlobal: 'Global (Toate)',
      enableGpsHint: 'Activați GPS pentru a calcula distanța exactă',
      sirenToggle: 'Sirenă Sonoră Alarmă (Exclusiv România)',
      on: 'ACTIV',
      off: 'OPRIT',
      iframeNotice: 'Aplicația rulează în fereastra de previzualizare (iframe), unde browserul blochează automat fereastra de acord pentru Notificări Push. Deschide aplicația direct într-o filă proprie a browserului pentru a permite notificările:',
      openInBrowser: 'Deschide direct în browser (pentru Notificări Push)',
      pushConfiguring: 'Se configurează canalul push...',
      pushDisable: 'Dezactivează Notificările Push',
      pushEnable: 'Activează Notificări Push în Timp Real',
      deniedHint: 'Permisiunea pentru notificări este blocată în browser. Apasă pictograma lacăt/setări din bara de adresă → Permisiuni → Notificări → Permite, apoi reîncarcă pagina.',
      testTitle: 'Verificare Completă Senzor + Alarmă + Push',
      testSubtitle: 'Compară alarma standard România (M 3.0–5.5) cu sirena specifică majoră (M > 5.5)',
      testBtn: 'Declanșează Test',
      majorSirenBoxTitle: 'Sirenă Specifică România (M > 5.5):',
      majorSirenBoxDesc: 'sunet civil-defense distinct (ro_major_quake_siren.wav) + vibrație SOS intensă + prioritate maximă.',
      majorSirenTestBtn: 'Testează Sirenă Majoră (M 5.8)',
      mobileEyebrow: 'INSTALARE MOBIL · GITHUB · ANDROID APK & iOS IPA',
      mobileTitle: 'Instalare Directă (PWA) & Kit GitHub Android + iOS',
      mobileDesc: 'Aplicația este configurată ca Progressive Web App (PWA) instalabilă instantaneu pe Android sau iPhone (Safari → Add to Home Screen), iar pentru compilare nativă include kitul complet Capacitor Android + iOS + GitHub Actions.',
      opt1Title: 'Opțiunea 1: Instalare directă pe telefon (Android Chrome / iPhone Safari)',
      opt1Desc: 'Funcționează în mod standalone cu acces offline la planul de siguranță și fluierul SOS.',
      opt2Title: 'Opțiunea 2: Kit Complet GitHub + Android APK & iOS IPA',
      opt2Desc: 'Arhiva include toate fișierele pentru GitHub (.gitignore, workflow-uri Android APK și iOS IPA), configurarea nativă Android (MainActivity.java cu canalul ro_major_quake_55 + BUILD_SIGNED_APK.sh) și configurarea nativă iOS (AppDelegate.swift, Info.plist, ExportOptions.plist, BUILD_IOS.sh), ambele cu fișierul audio dedicat ro_major_quake_siren.wav pentru cutremure România M > 5.5.',
      downloadingZip: 'Se pregătește arhiva ZIP...',
      downloadZipBtn: 'Descarcă Kit GitHub + Android APK & iOS IPA (.zip)',
      pushRegistered: 'Dispozitiv înregistrat pentru alerte push în timp real.',
      pushDisabledMsg: 'Notificările push au fost dezactivate pe acest dispozitiv.',
      pushNotSupportedIos: 'Pe iOS Safari, notificările Push funcționează doar după instalarea pe ecranul principal (Share → Add to Home Screen).',
      pushNotSupported: 'Browserul curent nu suportă API-ul de notificări Push.',
      pushBlockedIframe: 'Browserul blochează automat permisiunea Push în fereastra de previzualizare (iframe). Apasă butonul „Deschide direct în browser” de mai sus pentru a activa notificările Push.',
      pushBlockedBrowser: 'Notificările sunt blocate în setările browserului pentru acest site. Apasă pe pictograma lacăt/setări din bara de adresă → Permisiuni → Notificări → Permite, apoi reîncarcă pagina.',
      pushError: 'Nu s-a putut activa canalul Push pe acest browser.',
    },
    pwa: {
      installed: 'Aplicație Instalată',
      installBtn: 'Instalează Aplicația',
      iosTitle: 'Instalare pe iPhone / iPad',
      iosSteps: 'Apasă butonul Share (Partajare) din bara Safari, apoi selectează „Add to Home Screen” (Adaugă pe ecranul principal).',
      genericSteps: 'Deschide meniul browserului (⋮) și selectează „Install app” / „Add to Home screen” pentru instalare standalone cu suport offline.',
      close: 'Închide',
    },
  },
  en: {
    locale: 'en-GB',
    nav: {
      monitor: 'Monitor',
      map: 'Map & Epicenter',
      list: 'Earthquakes',
      safety: 'Offline Plan',
      chat: 'Rescue Teams',
      alertsCta: 'Alerts & APK',
      mobileMonitor: 'Monitor',
      mobileMap: 'Map',
      mobileList: 'List',
      mobileSafety: 'Offline',
      mobileChat: 'Rescue',
      mobileAlerts: 'Push/APK',
    },
    alarm: {
      majorRoBanner: 'MAJOR ROMANIA ALERT · M > 5.5 RICHTER · DEDICATED EMERGENCY SIREN ACTIVE',
      standardRoBanner: 'SEISMIC ALARM ACTIVE · THRESHOLD ≥ 3.0 RICHTER · ROMANIA (SOUND ACTIVE)',
      externalBanner: 'SEISMIC ALARM ACTIVE · THRESHOLD ≥ 3.0 RICHTER · EXTERNAL (VISUAL ONLY, NO SOUND)',
      depth: 'Depth',
      estMmi: 'Estimated MMI Intensity',
      sources: 'Sources',
      stopAudio: 'Stop Alarm Sound',
      safetyPlan: 'Safety Plan',
      rescueChat: 'Rescue Chat',
    },
    offline: {
      banner: 'Offline Mode active — Cached seismic events and the Offline Safety Plan remain available.',
      openPlan: 'Open Offline Plan',
    },
    ribbon: {
      liveTelemetry: 'Live Telemetry Feed',
      reconnecting: 'Reconnecting Server',
      officialSources: 'Official Sources',
      alertThreshold: 'Alert Threshold',
      audioArmed: 'Alarm Sound Armed',
      armAudio: 'Arm Alarm Sound',
      refreshing: 'Refreshing...',
      refreshSources: 'Refresh Sources',
      testAlarm: 'Test Alarm',
    },
    kpi: {
      monitoredEvents: 'Monitored Events',
      monitoredSub: 'Aggregated from 6 FDSN/GeoJSON feeds',
      romaniaQuakes: 'Quakes ≥ 3.0 Richter (Romania)',
      romaniaSub: 'Sound alarm active exclusively for RO',
      maxMagnitude: 'Recent Max Magnitude',
      maxMagFallback: 'Richter / Mw Scale',
      lastSync: 'Last API Sync',
      pollingSub: 'Auto-polling every 25 seconds',
    },
    feed: {
      title: 'Event Feed (M ≥ 3.0)',
      all: 'All',
      romania: 'Romania',
      m45Plus: 'M ≥ 4.5',
      empty: 'No M ≥ 3.0 earthquakes match the selected filter.',
      depth: 'Depth',
      romaniaAudio: 'RO · Sound',
      majorSiren: 'RO · Major >5.5',
    },
    sourcesTable: {
      title: 'Integrated Official Geological Monitoring Sources',
      subtitle: 'Multi-agency deduplication and real-time corroboration',
      agency: 'Agency / Network',
      coverage: 'Coverage',
      status: 'Status',
      events: 'Events',
      latency: 'Latency',
      online: '● Online',
      degraded: '▲ Partial',
      offline: '✖ Offline',
    },
    list: {
      eyebrow: 'DESCENDING CHRONOLOGY · EXCLUSIVELY M ≥ 3.0 RICHTER',
      title: 'Earthquake List M ≥ 3.0',
      subtitle: 'Only earthquakes with magnitude ≥ 3.0 Richter are shown. Sound alarms are enabled exclusively for Romania (distinct major siren for M > 5.5).',
      all: 'All',
      romania: 'Romania',
      colDateTime: 'Date / Time',
      colRegion: 'Region / Epicenter',
      colMagnitude: 'Magnitude',
      colDepth: 'Depth',
      colMmi: 'MMI',
      colAudio: 'Sound Mode',
      colSources: 'Sources',
      colLocate: 'Locate',
      empty: 'No M ≥ 3.0 earthquakes for the selected filter.',
      roMajorSiren: 'RO · Major Siren (>5.5)',
      roAudioActive: 'Romania · Sound Active',
      extNoAudio: 'External · Silent',
      mapBtn: 'Map',
    },
    map: {
      eyebrow: 'KEYLESS INTERACTIVE MAP · EPICENTERS & INTENSITY',
      title: 'Epicenter Location & Seismic Intensity',
      layerDark: 'Dark',
      layerTopo: 'Topo',
      layerSat: 'Satellite',
      layerOsm: 'OSM Streets',
      myLocation: 'My Location',
      locateGps: 'GPS Location',
      focusRomania: 'Focus Romania',
      worldView: 'World View',
      selectedEpicenter: 'Selected Epicenter',
      depthLabel: 'Depth',
      mmiLabel: 'MMI Intensity',
      distanceLabel: 'GPS Distance',
      sourcesLabel: 'Sources',
      legendStrong: 'M ≥ 5.0 Richter (Strong)',
      legendModerate: 'M 4.0–4.9 (Moderate)',
      legendThreshold: 'M 3.0–3.9 (Alert Threshold)',
      mmiStrong: 'Strong / Damaging',
      mmiModStrong: 'Moderate-Strong',
      mmiLightMod: 'Light-Moderate',
      mmiWeak: 'Weak / Instrumental',
      popupDepth: 'Depth',
      popupIntensity: 'Estimated intensity',
      popupSources: 'Sources',
      popupYou: 'Your GPS Location',
    },
    seismograph: {
      title: 'Live Seismograph & P-Wave Accelerometer Sensor',
      subtitle: 'Continuous seismic waveform telemetry and local phone tremor detection',
      sensorActive: 'Accelerometer Active',
      armAccelerometer: 'Enable Phone Sensor',
      statusAlarm: 'SEISMIC WAVE DETECTED',
      statusMonitoring: 'ACTIVE MONITORING',
    },
    safety: {
      eyebrow: 'GUARANTEED OFFLINE MODE · WORKS WITHOUT INTERNET',
      title: 'Offline Safety Plan & 72h Survival Kit',
      subtitle: 'Stored locally on your device. Includes 3.1 kHz SOS acoustic whistle, Morse visual beacon, emergency protocols, and 72-hour go-bag checklist.',
      whistleActive: 'Stop SOS Whistle (3.1 kHz)',
      whistleStart: 'Start SOS Whistle (3.1 kHz)',
      sosActive: 'Stop Visual SOS Beacon',
      sosStart: 'Visual Morse SOS Beacon',
      sosHint: 'Continuous • • • — — — • • • beacon for rescue localization',
      checklistTitle: '72-Hour Emergency Go-Bag (saved offline)',
      checklistReset: 'Reset checklist',
      protocolsTitle: 'Critical Action Protocols',
      contactsTitle: 'Emergency Numbers & Frequencies',
      phaseBefore: 'Before Earthquake',
      phaseDuring: 'During Earthquake',
      phaseAfter: 'After Earthquake',
    },
    chat: {
      eyebrow: 'REAL-TIME COMMUNICATIONS · RESCUE COORDINATION',
      title: 'Rescue Teams & Citizen Coordination Chat',
      subtitle: 'Instant WebSocket dispatch with SOS urgency tagging and GPS coordinate sharing.',
      connected: 'WebSocket Connected',
      reconnecting: 'Reconnecting...',
      activeOperators: 'active operators',
      channelsTitle: 'Operational Channels',
      profileTitle: 'Operator Identity',
      namePlaceholder: 'Name or callsign...',
      roleLabel: 'Role',
      updateProfile: 'Update Profile',
      attachGps: 'Attach GPS',
      gpsAttached: 'GPS Attached',
      urgencyNormal: 'Normal',
      urgencyUrgent: 'Urgent',
      urgencySos: 'Critical SOS',
      messagePlaceholder: 'Write situation report, location, or rescue request...',
      send: 'Send',
      emptyChannel: 'No messages in this channel yet. Post the first operational report.',
    },
    alerts: {
      title: 'Personalized Real-Time Push Alerts',
      subtitle: 'Minimum threshold: 3.0 Richter. Sound alarms are enabled exclusively for Romania, with a distinct civil-defense emergency siren for major Romania earthquakes M > 5.5 (native alarm channel in Android APK / iOS + high-priority push).',
      minMagLabel: 'Minimum push alert magnitude (Richter)',
      scaleStandard: '3.0 (Standard)',
      scaleModerate: '4.5 (Moderate)',
      scaleMajor: '6.5 (Major)',
      radiusLabel: 'Distance filter from GPS location',
      radiusGlobal: 'Global (All)',
      enableGpsHint: 'Enable GPS to compute exact distance',
      sirenToggle: 'Alarm Sound Siren (Romania Only)',
      on: 'ON',
      off: 'OFF',
      iframeNotice: 'The app is running inside a preview iframe, where browsers automatically block the Push Notification permission prompt. Open the app directly in its own browser tab to allow notifications:',
      openInBrowser: 'Open directly in browser (for Push Notifications)',
      pushConfiguring: 'Configuring push channel...',
      pushDisable: 'Disable Push Notifications',
      pushEnable: 'Enable Real-Time Push Notifications',
      deniedHint: 'Notifications are blocked in your browser settings for this site. Tap the lock/settings icon in the address bar → Permissions → Notifications → Allow, then reload.',
      testTitle: 'Full Sensor + Alarm + Push Verification',
      testSubtitle: 'Compare the standard Romania alarm (M 3.0–5.5) with the major emergency siren (M > 5.5)',
      testBtn: 'Trigger Test',
      majorSirenBoxTitle: 'Dedicated Romania Major Siren (M > 5.5):',
      majorSirenBoxDesc: 'distinct civil-defense sound (ro_major_quake_siren.wav) + intense SOS vibration + highest priority.',
      majorSirenTestBtn: 'Test Major Siren (M 5.8)',
      mobileEyebrow: 'MOBILE INSTALL · GITHUB · ANDROID APK & iOS IPA',
      mobileTitle: 'Direct Install (PWA) & GitHub Android + iOS Kit',
      mobileDesc: 'Configured as an installable Progressive Web App (PWA) for Android and iPhone (Safari → Add to Home Screen), plus a complete Capacitor Android + iOS + GitHub Actions build kit.',
      opt1Title: 'Option 1: Direct phone install (Android Chrome / iPhone Safari)',
      opt1Desc: 'Runs standalone with offline access to the safety plan and 3.1 kHz SOS whistle.',
      opt2Title: 'Option 2: Complete GitHub + Android APK & iOS IPA Kit',
      opt2Desc: 'Includes all GitHub files (.gitignore, Android APK & iOS IPA workflows), native Android setup (MainActivity.java with ro_major_quake_55 channel + BUILD_SIGNED_APK.sh), and native iOS setup (AppDelegate.swift, Info.plist, ExportOptions.plist, BUILD_IOS.sh) — both bundled with ro_major_quake_siren.wav for Romania M > 5.5 quakes.',
      downloadingZip: 'Building ZIP archive...',
      downloadZipBtn: 'Download GitHub + Android APK & iOS IPA Kit (.zip)',
      pushRegistered: 'Device registered for real-time push alerts.',
      pushDisabledMsg: 'Push notifications disabled on this device.',
      pushNotSupportedIos: 'On iOS Safari, Web Push only works after installing to Home Screen (Share → Add to Home Screen).',
      pushNotSupported: 'This browser does not support Push Notifications.',
      pushBlockedIframe: 'Your browser automatically blocks Push permission inside preview iframes. Tap "Open directly in browser" above to enable Push Notifications.',
      pushBlockedBrowser: 'Notifications are blocked in browser settings for this site. Tap the lock/settings icon in the address bar → Permissions → Notifications → Allow, then reload.',
      pushError: 'Could not enable Push channel in this browser.',
    },
    pwa: {
      installed: 'App Installed',
      installBtn: 'Install App',
      iosTitle: 'Install on iPhone / iPad',
      iosSteps: 'Tap the Share button in Safari, then choose "Add to Home Screen".',
      genericSteps: 'Open the browser menu (⋮) and choose "Install app" or "Add to Home screen" for standalone offline access.',
      close: 'Close',
    },
  },
};
