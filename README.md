# Befliegungsprojekte

Gemeinsame Verwaltung unserer Drohnenbefliegungsprojekte – als Web-App (PWA) für iPhone und PC.

## Funktionen

- **Kanban-Board** nach Arbeitsschritten (Vorbereitung → Genehmigung/Polizei → Außendienst → Datensicherung → Stationierung → Auswertung → Abgabe → Fertig) oder nach Status (Neu / In Bearbeitung / Fertig)
- **Projekt**: Nummer, Name, Priorität (! / !! / !!!), Abgabefrist, Kumoplan-Link, Standort-Pin, Notizen
- **7 feste Arbeitsschritte** zum Abhaken, jeweils mit Zuständigkeit; Außendienst mit Datum
- **Status automatisch**: Neu (nichts abgehakt) → In Bearbeitung → Fertig („Abgabe“ abgehakt)
- **Termine**: Außendienste und Abgabefristen chronologisch, überfällige rot; „In Kalender“ erzeugt einen Termin (.ics) für iPhone-Kalender/Outlook
- **Karte**: alle Projekte mit Pin, Navigation per Apple Karten / Google Maps
- **Offline**: Daten werden lokal zwischengespeichert, Änderungen ohne Netz werden später synchronisiert
- **Live-Abgleich** zwischen allen Geräten, Archiv für abgeschlossene Projekte

## Technik

React + TypeScript (Vite), Firebase (Authentication + Firestore, Serverstandort EU), Leaflet/OpenStreetMap, PWA (vite-plugin-pwa).

Ohne Firebase-Konfiguration startet die App im **Demo-Modus** (Beispieldaten, nur lokal im Browser).
Mit `?demo` an der URL lässt sich der Demo-Modus auch erzwingen.

## Lokal starten

```bash
npm install
npm run dev        # Entwicklungsserver
npm run build      # Produktions-Build nach dist/
```

## Firebase einrichten (einmalig)

1. <https://console.firebase.google.com> → **Projekt hinzufügen** (Google Analytics wird nicht benötigt).
2. **Firestore Database** → *Datenbank erstellen* → Standort **europe-west3 (Frankfurt)** → Produktionsmodus.
3. **Authentication** → *Jetzt starten* → Anmeldemethode **E-Mail/Passwort** aktivieren →
   Reiter *Nutzer* → beide Nutzer mit E-Mail und Passwort anlegen.
4. **Firestore** → *Sammlung starten* → Sammlungs-ID `members` →
   je Person ein Dokument: **Dokument-ID = E-Mail-Adresse in Kleinbuchstaben**, Feld `name` (string) mit dem **Vornamen** – der wird in der App angezeigt.
   Nur wer hier eingetragen ist, sieht und bearbeitet Projekte.
5. **Firestore → Regeln**: Inhalt von [`firestore.rules`](firestore.rules) einfügen → *Veröffentlichen*.
6. **Projekteinstellungen** (Zahnrad) → *Meine Apps* → Web-App (`</>`) registrieren →
   die angezeigten Werte (`apiKey`, `authDomain`, `projectId`, …) in `.env.local` eintragen (Vorlage: [`.env.example`](.env.example)).
   Diese Werte sind nicht geheim; geschützt wird über Login + Regeln.

Weitere Kolleginnen/Kollegen: in Authentication als Nutzer anlegen **und** in `members` eintragen.

## Veröffentlichen (Firebase Hosting, kostenlos)

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # Firebase-Projekt auswählen
npm run build
firebase deploy --only hosting,firestore:rules
```

Danach ist die App unter `https://<projekt-id>.web.app` erreichbar.

**iPhone**: Adresse in Safari öffnen → Teilen → *Zum Home-Bildschirm*.
**PC**: im Browser öffnen (Chrome/Edge bieten zusätzlich *App installieren* an).
