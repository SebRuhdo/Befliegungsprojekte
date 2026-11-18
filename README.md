# Befliegungsprojekte

Gemeinsame Verwaltung unserer Drohnenbefliegungsprojekte – als Web-App (PWA) für iPhone und PC.

## Funktionen

- **Kanban-Board** nach Arbeitsschritten (Vorbereitung → Genehmigung/Polizei → Außendienst → Datensicherung → Stationierung → Auswertung → Abgabe → Fertig) oder nach Status (Neu / In Bearbeitung / Fertig)
- **Drag & Drop**: Karte auf eine Spalte ziehen (iPhone: kurz gedrückt halten, dann ziehen – auch auf die Spalten-Leiste oben). Vorherige Schritte werden abgehakt, spätere wieder geöffnet; „Rückgängig“ macht es ungeschehen
- **Projekt**: Nummer, Name, Priorität (! / !! / !!!), Abgabefrist, Kumoplan-Link, Standort-Pin, Notizen
- **7 feste Arbeitsschritte** zum Abhaken, jeweils mit Zuständigkeit; Außendienst mit Datum
- **Status automatisch**: Neu (nichts abgehakt) → In Bearbeitung → Fertig („Abgabe“ abgehakt)
- **Termine**: Außendienste und Abgabefristen chronologisch, überfällige rot; „In Kalender“ erzeugt einen Termin (.ics) für iPhone-Kalender/Outlook
- **Karte**: alle Projekte mit Pin, Navigation per Apple Karten / Google Maps
- **Offline**: Daten werden lokal zwischengespeichert, Änderungen ohne Netz werden später synchronisiert
- **Live-Abgleich** zwischen allen Geräten, Archiv für abgeschlossene Projekte

## Technik

React + TypeScript (Vite), Firebase (Authentication + Firestore, Serverstandort EU), Leaflet/OpenStreetMap, PWA (vite-plugin-pwa).

Die Firebase-Konfiguration steht in [`src/firebase-config.ts`](src/firebase-config.ts).
Mit `?demo` an der URL startet die App im **Demo-Modus** (Beispieldaten, nur lokal im Browser);
`VITE_DEMO=1 npm run build` erzeugt einen reinen Demo-Build.

## Lokal starten

```bash
npm install
npm run dev        # Entwicklungsserver
npm run build      # Produktions-Build nach dist/
```

## Firebase einrichten (einmalig)

1. <https://console.firebase.google.com> → **Projekt erstellen** (Google Analytics wird nicht benötigt).
2. **Datenbanken & Speicher → Firestore** → *Datenbank hinzufügen* → **Standard edition** →
   Standort **europe-west3 (Frankfurt)** (lässt sich später nicht ändern) → **Produktionsmodus** → *Erstellen*.
3. **Sicherheit → Authentication** → *Jetzt starten* → *Anmeldemethode* → **E-Mail/Passwort** aktivieren (nicht „E-Mail-Link“) →
   Reiter *Nutzer* → *Nutzer hinzufügen* → beide Personen mit E-Mail und Passwort anlegen.
4. **Firestore → Daten** → *Sammlung starten* → Sammlungs-ID `members` →
   je Person ein Dokument: **Dokument-ID = E-Mail-Adresse in Kleinbuchstaben**, Feld `name` (string) mit dem **Vornamen** – der wird in der App angezeigt.
   Nur wer hier eingetragen ist, sieht und bearbeitet Projekte.
5. **Firestore → Regeln**: Inhalt von [`firestore.rules`](firestore.rules) einfügen → *Veröffentlichen*.
6. **Projekteinstellungen** (Zahnrad) → *Allgemein* → *Meine Apps* → Web-App (`</>`) registrieren
   (Firebase Hosting hier nicht ankreuzen) → die angezeigten Werte (`apiKey`, `authDomain`, `projectId`, …)
   stehen in [`src/firebase-config.ts`](src/firebase-config.ts) (✔ bereits eingetragen).
   Diese Werte sind nicht geheim; geschützt wird über Login + Regeln.

Die Menünamen der Firebase-Konsole ändern sich gelegentlich; im Zweifel nach „Firestore“ bzw. „Authentication“ suchen.

Weitere Kolleginnen/Kollegen: in Authentication als Nutzer anlegen **und** in `members` eintragen.

## Veröffentlichen (Firebase Hosting, kostenlos)

```bash
npm install -g firebase-tools
firebase login
npm run build
firebase deploy --only hosting,firestore:rules
```

Danach ist die App unter `https://<projekt-id>.web.app` erreichbar.

**iPhone**: Adresse in Safari öffnen → Teilen → *Zum Home-Bildschirm*.
**PC**: im Browser öffnen (Chrome/Edge bieten zusätzlich *App installieren* an).
