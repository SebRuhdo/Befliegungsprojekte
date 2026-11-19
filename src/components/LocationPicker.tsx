import { useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '../model';
import { AddressSearch } from './AddressSearch';
import { DEFAULT_CENTER, DEFAULT_ZOOM, L, addBaseLayer, pinIcon } from './leaflet';

export function LocationPicker({
  value,
  onChange,
}: {
  value: GeoPoint | null;
  onChange: (v: GeoPoint | null) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [locating, setLocating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Geozonen-Karte (dipul) öffnen und Koordinaten in die Zwischenablage kopieren
  // (ein direkter Link auf eine Position ist bei dipul nicht dokumentiert)
  const openDipul = () => {
    if (!value) return;
    const text = `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`;
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 4000);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true });
    addBaseLayer(m);
    m.on('click', (e: L.LeafletMouseEvent) =>
      onChangeRef.current({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }),
    );
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (value) {
      const ll: L.LatLngExpression = [value.lat, value.lng];
      if (!marker.current) {
        marker.current = L.marker(ll, { icon: pinIcon('#0ea5e9'), draggable: true }).addTo(m);
        marker.current.on('dragend', () => {
          const p = marker.current!.getLatLng();
          onChangeRef.current({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) });
        });
        m.setView(ll, 15);
      } else {
        marker.current.setLatLng(ll);
      }
    } else {
      marker.current?.remove();
      marker.current = null;
      m.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [value]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return alert('Standortbestimmung wird nicht unterstützt.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const v = { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) };
        onChange(v);
        map.current?.setView([v.lat, v.lng], 16);
      },
      (err) => {
        setLocating(false);
        alert(`Standort konnte nicht bestimmt werden: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="location">
      <AddressSearch
        onSelect={(pl) => {
          const v = { lat: +pl.lat.toFixed(6), lng: +pl.lng.toFixed(6) };
          onChange(v);
          map.current?.setView([v.lat, v.lng], 17);
        }}
      />
      <div ref={el} className="mini-map" />
      <p className="muted small">
        {value
          ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} · Pin verschieben oder in die Karte tippen`
          : 'Adresse suchen oder in die Karte tippen, um den Pin zu setzen.'}
      </p>
      <div className="button-row">
        <button className="btn btn-small" onClick={useMyLocation} disabled={locating}>
          {locating ? 'Suche …' : 'Mein Standort'}
        </button>
        {value && (
          <>
            <a
              className="btn btn-small"
              href={`https://maps.apple.com/?daddr=${value.lat},${value.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Apple Karten
            </a>
            <a
              className="btn btn-small"
              href={`https://www.google.com/maps/dir/?api=1&destination=${value.lat},${value.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Google Maps
            </a>
            <a
              className="btn btn-small"
              href="https://maptool-dipul.dfs.de/"
              target="_blank"
              rel="noreferrer"
              onClick={openDipul}
              title="Amtliche Karte der Drohnen-Geozonen öffnen (Koordinaten werden kopiert)"
            >
              Geozonen (dipul)
            </a>
            <button className="btn btn-small btn-danger-text" onClick={() => onChange(null)}>
              Pin entfernen
            </button>
          </>
        )}
      </div>
      {copied && <p className="muted small">Koordinaten des Pins in die Zwischenablage kopiert.</p>}
    </div>
  );
}
