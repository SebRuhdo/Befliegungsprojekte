// Einzelnen Termin als .ics-Datei erzeugen und an den Kalender übergeben (iPhone-Kalender, Outlook …)

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
}

function nextDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10).replace(/-/g, '');
}

export interface CalendarEvent {
  uid: string;
  date: string; // YYYY-MM-DD, ganztägig
  title: string;
  description?: string;
  location?: { lat: number; lng: number } | null;
  url?: string;
}

export function buildIcs(ev: CalendarEvent): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Befliegungsprojekte//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.uid}@befliegungsprojekte`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ev.date.replace(/-/g, '')}`,
    `DTEND;VALUE=DATE:${nextDay(ev.date)}`,
    `SUMMARY:${esc(ev.title)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${esc(ev.description)}`);
  if (ev.location) {
    lines.push(`GEO:${ev.location.lat.toFixed(6)};${ev.location.lng.toFixed(6)}`);
    lines.push(`LOCATION:${esc(`${ev.location.lat.toFixed(5)}, ${ev.location.lng.toFixed(5)}`)}`);
  }
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function addToCalendar(ev: CalendarEvent) {
  const ics = buildIcs(ev);
  const filename = `${ev.title.replace(/[^\wäöüÄÖÜß -]+/g, '').trim() || 'termin'}.ics`;
  if (isIOS()) {
    // iOS öffnet text/calendar direkt mit „Zum Kalender hinzufügen“
    window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    return;
  }
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
