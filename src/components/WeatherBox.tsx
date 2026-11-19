import { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { daysUntil, type GeoPoint } from '../model';
import { CONDITION_LABEL, FORECAST_DAYS, FROM_HOUR, TO_HOUR, fetchDayWeather, fmt, type DayWeather } from '../weather';

/** Wetter am Außendienst-Tag (Arbeitszeit 7–18 Uhr) */
export function WeatherBox({ location, date, compact = false }: { location: GeoPoint | null; date: string | null | undefined; compact?: boolean }) {
  const { settings } = useApp();
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'none' | 'error'; data?: DayWeather | null }>({ status: 'loading' });

  const d = date ? daysUntil(date) : null;
  const inRange = d !== null && d >= -1 && d <= FORECAST_DAYS;

  useEffect(() => {
    if (!location || !date || !inRange) return;
    let alive = true;
    setState({ status: 'loading' });
    fetchDayWeather(location.lat, location.lng, date)
      .then((data) => alive && setState({ status: data ? 'ok' : 'none', data }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [location?.lat, location?.lng, date, inRange]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!date) return null;
  if (!location) return compact ? null : <p className="weather-note muted">Für die Wetterprognose bitte den Standort setzen.</p>;
  if (!inRange)
    return compact ? null : (
      <p className="weather-note muted">
        {d !== null && d < -1 ? 'Termin liegt in der Vergangenheit.' : `Wetterprognose gibt es ab ca. ${FORECAST_DAYS} Tage vorher.`}
      </p>
    );
  if (state.status === 'loading') return <p className="weather-note muted">Wetter wird geladen …</p>;
  if (state.status === 'error')
    return <p className="weather-note muted">{navigator.onLine ? 'Wetterdienst gerade nicht erreichbar.' : 'Wetter braucht eine Internetverbindung.'}</p>;
  if (state.status === 'none' || !state.data) return compact ? null : <p className="weather-note muted">Für diesen Tag liegt noch keine Prognose vor.</p>;

  const w = state.data;
  const limit = settings.windGustLimit ?? null;
  const tooWindy = limit !== null && w.gustMax !== null && w.gustMax >= limit;
  const conditions = [...new Set(w.hours.map((h) => h.condition).filter((c): c is string => !!c && c !== 'dry'))];

  const summary = (
    <span className="weather-summary">
      <span className={tooWindy ? 'tone-overdue' : ''}>
        Wind {fmt(w.windMax)} m/s · Böen {fmt(w.gustMax)} m/s{tooWindy ? ' ⚠' : ''}
      </span>
      <span>
        Regen {fmt(w.precipSum, 1)} mm{w.precipProbMax !== null ? ` (bis ${fmt(w.precipProbMax)} %)` : ''}
      </span>
      <span>
        {fmt(w.tMin)}–{fmt(w.tMax)} °C
      </span>
      {conditions.length > 0 && <span>zeitweise {conditions.map((c) => CONDITION_LABEL[c] ?? c).join(', ')}</span>}
    </span>
  );

  if (compact) return <div className="weather-compact">{summary}</div>;

  return (
    <div className={`weather ${tooWindy ? 'weather-warn' : ''}`}>
      <div className="weather-head">
        <strong>Wetter {FROM_HOUR}–{TO_HOUR} Uhr</strong>
        {tooWindy && <span className="tone-overdue small">Böen über eurer Grenze von {fmt(limit)} m/s</span>}
      </div>
      {summary}
      <details>
        <summary>Stündlich</summary>
        <div className="weather-table-wrap">
          <table className="weather-table">
            <thead>
              <tr>
                <th>Uhr</th>
                <th>Wind</th>
                <th>Böen</th>
                <th>Regen</th>
                <th>°C</th>
              </tr>
            </thead>
            <tbody>
              {w.hours.map((h) => (
                <tr key={h.time.toISOString()} className={limit !== null && h.gust !== null && h.gust >= limit ? 'tone-overdue' : ''}>
                  <td>{String(h.time.getHours()).padStart(2, '0')}</td>
                  <td>{fmt(h.wind)}</td>
                  <td>{fmt(h.gust)}</td>
                  <td>
                    {fmt(h.precip, 1)}
                    {h.precipProb !== null ? ` · ${fmt(h.precipProb)} %` : ''}
                  </td>
                  <td>{fmt(h.temp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Wind und Böen in m/s, Regen in mm/h.</p>
      </details>
      <p className="weather-source muted">Prognose ohne Gewähr · Quelle: Deutscher Wetterdienst (über Bright Sky)</p>
    </div>
  );
}
