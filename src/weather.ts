// Wetterprognose für den Außendienst-Tag.
// Quelle: Deutscher Wetterdienst (DWD, Lizenz CC BY 4.0) über die kostenlose Bright-Sky-API (https://brightsky.dev).
// Bright Sky liefert stündliche Werte; mit units=dwd: Wind in km/h, Niederschlag in mm, Temperatur in °C.

export interface HourWeather {
  time: Date;
  wind: number | null; // m/s
  gust: number | null; // m/s
  precip: number | null; // mm
  precipProb: number | null; // %
  temp: number | null; // °C
  condition: string | null;
}

export interface DayWeather {
  hours: HourWeather[]; // nur Arbeitszeit (FROM_HOUR–TO_HOUR)
  windMax: number | null;
  gustMax: number | null;
  precipSum: number | null;
  precipProbMax: number | null;
  tMin: number | null;
  tMax: number | null;
}

export const FROM_HOUR = 7;
export const TO_HOUR = 18;
/** Bright Sky/DWD-MOSMIX reicht ca. 10 Tage in die Zukunft */
export const FORECAST_DAYS = 10;

const CACHE_KEY = 'befliegungen-weather-v1';
const TTL = 60 * 60 * 1000; // 1 Stunde
const memory = new Map<string, { at: number; data: DayWeather | null }>();

function readCache(key: string) {
  const m = memory.get(key);
  if (m && Date.now() - m.at < TTL) return m;
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, { at: number; data: DayWeather | null }>;
    const e = all[key];
    if (e && Date.now() - e.at < TTL) {
      if (e.data) e.data.hours = e.data.hours.map((h) => ({ ...h, time: new Date(h.time) }));
      memory.set(key, e);
      return e;
    }
  } catch {
    /* ignorieren */
  }
  return null;
}

function writeCache(key: string, data: DayWeather | null) {
  const entry = { at: Date.now(), data };
  memory.set(key, entry);
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, { at: number }>;
    for (const k of Object.keys(all)) if (Date.now() - all[k].at > TTL) delete all[k];
    all[key] = entry;
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {
    /* ignorieren */
  }
}

const kmhToMs = (v: unknown) => (typeof v === 'number' ? v / 3.6 : null);
const numOrNull = (v: unknown) => (typeof v === 'number' ? v : null);
const max = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.max(...v) : null;
};
const min = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.min(...v) : null;
};

function localIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return localIso(new Date(y, m - 1, d + n));
}

/** Liefert null, wenn für den Tag (noch) keine Daten vorliegen */
export async function fetchDayWeather(lat: number, lng: number, date: string): Promise<DayWeather | null> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${date}`;
  const cached = readCache(key);
  if (cached) return cached.data;

  const url =
    'https://api.brightsky.dev/weather?' +
    new URLSearchParams({
      lat: lat.toFixed(4),
      lon: lng.toFixed(4),
      date: addDays(date, -1),
      last_date: addDays(date, 1),
      units: 'dwd',
    });
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Wetterdienst antwortet nicht (${res.status})`);
  const json = (await res.json()) as { weather?: Record<string, unknown>[] };

  const hours: HourWeather[] = (json.weather ?? [])
    .map((w) => ({
      time: new Date(String(w.timestamp)),
      wind: kmhToMs(w.wind_speed),
      gust: kmhToMs(w.wind_gust_speed),
      precip: numOrNull(w.precipitation),
      precipProb: numOrNull(w.precipitation_probability),
      temp: numOrNull(w.temperature),
      condition: typeof w.condition === 'string' ? w.condition : null,
    }))
    .filter((h) => localIso(h.time) === date && h.time.getHours() >= FROM_HOUR && h.time.getHours() <= TO_HOUR);

  if (hours.length === 0) {
    writeCache(key, null);
    return null;
  }
  const precipVals = hours.map((h) => h.precip).filter((x): x is number => x !== null);
  const data: DayWeather = {
    hours,
    windMax: max(hours.map((h) => h.wind)),
    gustMax: max(hours.map((h) => h.gust)),
    precipSum: precipVals.length ? precipVals.reduce((a, b) => a + b, 0) : null,
    precipProbMax: max(hours.map((h) => h.precipProb)),
    tMin: min(hours.map((h) => h.temp)),
    tMax: max(hours.map((h) => h.temp)),
  };
  writeCache(key, data);
  return data;
}

export const CONDITION_LABEL: Record<string, string> = {
  dry: 'trocken',
  fog: 'Nebel',
  rain: 'Regen',
  sleet: 'Schneeregen',
  snow: 'Schnee',
  hail: 'Hagel',
  thunderstorm: 'Gewitter',
};

export function fmt(n: number | null, digits = 0) {
  return n === null ? '–' : n.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
