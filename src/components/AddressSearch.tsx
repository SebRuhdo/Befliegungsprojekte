import { useEffect, useRef, useState } from 'react';
import { parseCoordinates, searchAddress, type Place } from '../geo';

/** Suchfeld für Adressen, Orte oder Koordinaten (Dezimalgrad / UTM 32/33) */
export function AddressSearch({
  onSelect,
  className = '',
  compact = false,
}: {
  onSelect: (p: Place) => void;
  className?: string;
  compact?: boolean;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const choose = (p: Place) => {
    setResults(null);
    setMsg('');
    onSelect(p);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // nicht das umgebende Formular auslösen
    const text = q.trim();
    if (!text) return;
    const coords = parseCoordinates(text);
    if (coords) return choose(coords);
    if (!navigator.onLine) {
      setStatus('error');
      setMsg('Keine Internetverbindung – die Adresssuche braucht Netz. Koordinaten funktionieren auch offline.');
      return;
    }
    abort.current?.abort();
    abort.current = new AbortController();
    setStatus('loading');
    setMsg('');
    try {
      const found = await searchAddress(text, abort.current.signal);
      setStatus('idle');
      if (found.length === 0) {
        setResults(null);
        setMsg('Nichts gefunden. Tipp: Straße, Hausnummer und Ort angeben.');
      } else if (found.length === 1) {
        choose(found[0]);
      } else {
        setResults(found);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setStatus('error');
      setMsg('Die Adresssuche ist gerade nicht erreichbar. Bitte später noch einmal versuchen.');
    }
  };

  return (
    <div className={`address-search ${compact ? 'address-search-compact' : ''} ${className}`}>
      {/* eigenes Formular, damit Enter die Suche startet */}
      <form className="address-search-row" onSubmit={submit} role="search">
        <input
          className="input"
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (results) setResults(null);
          }}
          placeholder="Adresse, Ort oder Koordinaten"
          aria-label="Adresse, Ort oder Koordinaten suchen"
        />
        <button className="btn btn-primary btn-small" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? '…' : 'Suchen'}
        </button>
      </form>
      {msg && <p className={`address-msg ${status === 'error' ? 'tone-soon' : 'muted'}`}>{msg}</p>}
      {results && (
        <ul className="address-results" role="listbox" aria-label="Suchergebnisse">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => choose(r)}>
                {r.label}
              </button>
            </li>
          ))}
          <li className="address-attrib muted">Suche: © OpenStreetMap-Mitwirkende</li>
        </ul>
      )}
    </div>
  );
}
