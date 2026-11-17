import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export { L };

// Mittelpunkt, wenn noch kein Pin gesetzt ist (Bayern grob)
export const DEFAULT_CENTER: [number, number] = [48.4, 11.6];
export const DEFAULT_ZOOM = 8;

export function addBaseLayer(map: L.Map) {
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

export function pinIcon(color: string) {
  return L.divIcon({
    className: 'pin-icon',
    html: `<svg width="28" height="38" viewBox="0 0 28 38" aria-hidden="true"><path d="M14 1C7 1 1.5 6.4 1.5 13.3 1.5 22.6 14 37 14 37s12.5-14.4 12.5-23.7C26.5 6.4 21 1 14 1z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13.5" r="4.5" fill="#fff"/></svg>`,
    iconSize: [28, 38],
    iconAnchor: [14, 37],
    popupAnchor: [0, -32],
  });
}
