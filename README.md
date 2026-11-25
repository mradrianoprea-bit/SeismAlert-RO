# SeismAlert RO — Monitorizare Seismică, Alerte Push, Android APK & iOS IPA

Sistem de monitorizare și avertizare seismică în timp real pentru evenimente **M ≥ 3.0 Richter**, cu surse geologice oficiale multiple (USGS, EMSC, Rețeaua Seismică România / INFP via EMSC, GFZ Potsdam, INGV Italia, GeoNet NZ), hartă interactivă fără API key, plan de siguranță offline, chat în timp real pentru echipele de salvare și suport complet mobil (PWA, Android APK și iOS IPA).

## Funcționalități principale
- **Alertare exclusivă România**: alarmă sonoră standard pentru `M 3.0–5.5` și **sirenă civil-defense distinctă (`ro_major_quake_siren.wav`)** pentru cutremure majore din România **`M > 5.5`**.
- **Hartă interactivă fără API key**: straturi Esri ArcGIS Dark Gray / Topo / Satelit + OpenStreetMap prin proxy.
- **Listă completă cutremure (`M ≥ 3.0`)**: ordonată descrescător în timp, cu data și ora separate pe două rânduri.
- **Plan de siguranță offline** + fluier SOS `3.1 kHz` + semnalizare vizuală Morse.
- **Chat coordonare echipe salvare** în timp real prin WebSocket.

## Rulare locală (Web / Server)
```bash
npm install
npm run dev
```
Serverul pornește pe `http://localhost:3000`.

## Compilare automată pe GitHub (Android APK + iOS IPA)
Acest repository include workflow-ul **`.github/workflows/build-mobile.yml`**:
1. Încarcă proiectul pe GitHub (sau folosește kitul descărcabil din aplicație din secțiunea **Alerte & APK**).
2. Deschide tab-ul **Actions** → **SeismAlert RO — Web CI, Android APK & iOS IPA** → **Run workflow**.
3. La final poți descărca direct din secțiunea **Artifacts**:
   - **`SeismAlert-RO-signed-apk`** — `SeismAlert-RO-signed.apk` (cu canal nativ `ro_major_quake_55` și `res/raw/ro_major_quake_siren.wav` pentru alertă sonoră în fundal la M > 5.5 România).
   - **`SeismAlert-RO-ios-ipa`** — `SeismAlert-RO-unsigned.ipa` (cu `AppDelegate.swift`, permisiuni `Info.plist` și `ro_major_quake_siren.wav` în bundle, instalabil pe iPhone prin AltStore / Sideloadly sau Xcode; pentru TestFlight/App Store semnează cu cont Apple Developer).

## Instalare directă pe iPhone / Android fără compilare (PWA)
- **iPhone (Safari)**: Deschide URL-ul aplicației → butonul **Share** → **Add to Home Screen**.
- **Android (Chrome)**: Deschide URL-ul aplicației → **Instalează Aplicația**.

---

## English Overview
**SeismAlert RO** is a bilingual (RO / EN) real-time earthquake monitoring and early-warning platform for **M ≥ 3.0 Richter** events aggregating 6 official geological feeds (USGS, EMSC, Romania / INFP via EMSC, GFZ Potsdam, INGV Italy, GeoNet NZ), with Romania-only sound alarms (distinct civil-defense siren `ro_major_quake_siren.wav` for Romania **M > 5.5**), keyless Esri/OSM epicenter map, offline 72h safety plan + 3.1 kHz SOS whistle, WebSocket rescue chat, and automated GitHub Actions builds (`.github/workflows/build-mobile.yml`) for **Android APK** and **iOS IPA** without requiring a committed `package-lock.json`.

