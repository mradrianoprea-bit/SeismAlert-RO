import type { SeismicEvent } from '../types/seismic';

export const MAJOR_ROMANIA_THRESHOLD_RICHTER = 5.5;

export function isRomaniaEarthquake(ev: SeismicEvent): boolean {
  const inRomaniaBbox =
    ev.lat >= 43.5 && ev.lat <= 48.5 && ev.lon >= 20.0 && ev.lon <= 30.0;
  const placeLower = ev.place.toLowerCase();
  const mentionsRomania =
    placeLower.includes('romania') ||
    placeLower.includes('românia') ||
    placeLower.includes('vrancea') ||
    placeLower.includes('buzau') ||
    placeLower.includes('buzău') ||
    placeLower.includes('banat') ||
    placeLower.includes('gorj') ||
    placeLower.includes('dobrogea') ||
    placeLower.includes('fagaras') ||
    placeLower.includes('făgăraș') ||
    placeLower.includes('maramures') ||
    placeLower.includes('maramureș') ||
    placeLower.includes('moldova') ||
    placeLower.includes('oltenia') ||
    placeLower.includes('transilvania');

  return ev.sources.includes('infp_ro') || inRomaniaBbox || mentionsRomania;
}

export function isMajorRomaniaEarthquake(ev: SeismicEvent): boolean {
  return isRomaniaEarthquake(ev) && ev.magnitude > MAJOR_ROMANIA_THRESHOLD_RICHTER;
}

