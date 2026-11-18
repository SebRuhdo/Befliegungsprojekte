import { useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { STATUS_LABEL, phaseOf, statusOf, stepLabel, type Status } from '../model';
import { AddressSearch } from './AddressSearch';
import { DEFAULT_CENTER, DEFAULT_ZOOM, L, addBaseLayer, pinIcon } from './leaflet';

const COLORS: Record<Status, string> = {
  neu: '#8b5cf6',
  inBearbeitung: '#f59e0b',
  fertig: '#10b981',
};

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function MapView() {
  const { projects, openProject } = useApp();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  const searchMarker = useRef<L.CircleMarker | null>(null);
  const openRef = useRef(openProject);
  openRef.current = openProject;

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    addBaseLayer(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  const located = projects.filter((p) => p.location && !p.archived);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const p of located) {
      const st = statusOf(p);
      const ph = phaseOf(p);
      const mk = L.marker([p.location!.lat, p.location!.lng], { icon: pinIcon(COLORS[st]) });
      const btn = document.createElement('div');
      btn.innerHTML = `<strong>${esc(p.number)}</strong> ${esc(p.name)}<br><span>${STATUS_LABEL[st]}${
        ph !== 'fertig' ? ` · ${esc(stepLabel(ph))}` : ''
      }</span><br><button class="popup-open">Öffnen</button>`;
      btn.querySelector('button')!.addEventListener('click', () => openRef.current(p.id));
      mk.bindPopup(btn);
      g.addLayer(mk);
    }
    if (!fitted.current && located.length > 0) {
      fitted.current = true;
      m.fitBounds(L.latLngBounds(located.map((p) => [p.location!.lat, p.location!.lng])), {
        padding: [40, 40],
        maxZoom: 13,
      });
    }
  }, [located]);

  return (
    <div className="map-view">
      <div ref={el} className="big-map" />
      <AddressSearch
        compact
        className="map-search"
        onSelect={(pl) => {
          const m = map.current;
          if (!m) return;
          searchMarker.current?.remove();
          searchMarker.current = L.circleMarker([pl.lat, pl.lng], {
            radius: 9,
            color: '#fff',
            weight: 3,
            fillColor: '#0a84ff',
            fillOpacity: 1,
          })
            .addTo(m)
            .bindPopup(esc(pl.label))
            .openPopup();
          m.setView([pl.lat, pl.lng], 16);
        }}
      />
      <div className="map-legend">
        {(Object.keys(COLORS) as Status[]).map((s) => (
          <span key={s}>
            <i style={{ background: COLORS[s] }} /> {STATUS_LABEL[s]}
          </span>
        ))}
        {located.length === 0 && <span className="muted">Noch keine Projekte mit Pin.</span>}
      </div>
    </div>
  );
}
