// Ortssuche: Koordinaten erkennen (Dezimalgrad oder UTM/ETRS89) und Adressen über Nominatim (OpenStreetMap) suchen.

export interface Place {
  lat: number;
  lng: number;
  label: string;
}

// ---------- UTM → geographische Koordinaten (ETRS89/GRS80, Krüger-Reihe) ----------

export function utmToLatLng(zone: number, easting: number, northing: number, north = true): { lat: number; lng: number } {
  const a = 6378137;
  const f = 1 / 298.257222101; // GRS80
  const n = f / (2 - f);
  const A = (a / (1 + n)) * (1 + (n * n) / 4 + n ** 4 / 64);
  const beta = [n / 2 - (2 / 3) * n * n + (37 / 96) * n ** 3, (1 / 48) * n * n + (1 / 15) * n ** 3, (17 / 480) * n ** 3];
  const delta = [2 * n - (2 / 3) * n * n - 2 * n ** 3, (7 / 3) * n * n - (8 / 5) * n ** 3, (56 / 15) * n ** 3];
  const k0 = 0.9996;
  const xi = (northing - (north ? 0 : 10000000)) / (k0 * A);
  const eta = (easting - 500000) / (k0 * A);
  let xiP = xi;
  let etaP = eta;
  for (let j = 1; j <= 3; j++) {
    xiP -= beta[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaP -= beta[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }
  const chi = Math.asin(Math.sin(xiP) / Math.cosh(etaP));
  let phi = chi;
  for (let j = 1; j <= 3; j++) phi += delta[j - 1] * Math.sin(2 * j * chi);
  const lambda0 = ((zone * 6 - 183) * Math.PI) / 180;
  const lambda = lambda0 + Math.atan2(Math.sinh(etaP), Math.cos(xiP));
  return { lat: (phi * 180) / Math.PI, lng: (lambda * 180) / Math.PI };
}

const num = (s: string) => Number(s.replace(',', '.'));

/**
 * Erkennt Koordinaten in der Eingabe:
 * - Dezimalgrad: „48.1374, 11.5755“ · „48,1374 11,5755“
 * - UTM (Zone 32/33, ETRS89): „32U 691234 5334567“ · „32 691234.5 5334567.8“ · „32691234 5334567“ (Zone vorangestellt)
 *   · „691234 5334567“ (ohne Zone → Zone 32)
 */
export function parseCoordinates(input: string): Place | null {
  const s = input.trim();
  if (!s) return null;

  // Tokens: bei „a, b“ / „a;b“ am Komma/Semikolon trennen, sonst an Leerzeichen
  let tokens: string[];
  if (/^[^\s,;]+\s*[;]\s*[^\s,;]+$/.test(s) || /^[-\d.]+\s*,\s*[-\d.]+$/.test(s)) tokens = s.split(/\s*[,;]\s*/);
  else tokens = s.split(/[\s;]+/).filter(Boolean);

  // UTM mit Zonen-Token (z. B. „32U“, „32N“, „32“)
  let zone: number | null = null;
  if (tokens.length === 3) {
    const m = tokens[0].match(/^(\d{1,2})\s*[A-Za-z]?$/);
    if (!m) return null;
    zone = Number(m[1]);
    tokens = tokens.slice(1);
  }
  if (tokens.length !== 2 || !tokens.every((t) => /^-?\d+([.,]\d+)?$/.test(t))) return null;
  let [x, y] = tokens.map(num);

  // Dezimalgrad
  if (zone === null && Math.abs(x) <= 90 && Math.abs(y) <= 180 && tokens.every((t) => /[.,]/.test(t))) {
    return { lat: x, lng: y, label: `${x.toFixed(6)}, ${y.toFixed(6)}` };
  }

  // UTM: Ostwert mit vorangestellter Zone (8 Stellen vor dem Komma, z. B. 32691234)
  const eInt = Math.trunc(Math.abs(x)).toString();
  if (zone === null && eInt.length === 8) {
    zone = Number(eInt.slice(0, 2));
    x = x - zone * 1000000;
  }
  if (zone === null) zone = 32;
  if (zone < 1 || zone > 60) return null;
  if (x < 100000 || x > 900000 || y < 0 || y > 10000000) return null;
  const ll = utmToLatLng(zone, x, y);
  return {
    ...ll,
    label: `UTM ${zone}: E ${x.toFixed(2).replace(/\.00$/, '')} · N ${y.toFixed(2).replace(/\.00$/, '')}`,
  };
}

// ---------- Adresssuche (Nominatim) ----------
// Nutzungsregeln von Nominatim: höchstens 1 Anfrage pro Sekunde, keine Suche beim Tippen (Autocomplete).

let lastRequest = 0;

export async function searchAddress(query: string, signal?: AbortSignal): Promise<Place[]> {
  const wait = lastRequest + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      format: 'jsonv2',
      q: query,
      countrycodes: 'de',
      limit: '6',
      'accept-language': 'de',
    });
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Suche fehlgeschlagen (${res.status})`);
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return data.map((d) => ({ lat: Number(d.lat), lng: Number(d.lon), label: d.display_name }));
}
