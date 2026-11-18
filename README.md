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
- **Ortssuche** (Projekt-Standort und Karte): Adresse/Ort über OpenStreetMap-Nominatim (nur Deutschland, Suche per Knopf – keine Suche beim Tippen gemäß Nutzungsregeln) oder Koordinaten: Dezimalgrad (`48.1374, 11.5755`) bzw. UTM ETRS89 Zone 32/33 (`32 691234 5334567`, `32691234 5334567`; ohne Zone → 32)
- **Unterpunkte**: Checklisten-Vorlagen je Arbeitsschritt (⚙ Einstellungen), in jedem Projekt abhakbar
- **Kommentare & Verlauf** pro Projekt: Kommentare mit Name und Zeit; Abhaken, Verschieben und Terminänderungen werden automatisch protokolliert
- **Wetter am Außendienst-Tag** (7–18 Uhr): Wind und Böen in m/s, Regen, Temperatur, stündliche Tabelle; eigene Böen-Warnschwelle einstellbar.
  Quelle: Deutscher Wetterdienst (CC BY 4.0) über [Bright Sky](https://brightsky.dev), ca. 10 Tage im Voraus
- **Geozonen**: Knopf öffnet die amtliche dipul-Karte und kopiert die Pin-Koordinaten
- **Kalender**: Termine als Liste oder Monatsansicht
- **Geräte & Drohnen**: Geräteliste in den Einstellungen, Zuordnung im Projekt, Hinweis bei gleichem Gerät am selben Außendienst-Tag
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

## Automatisch veröffentlichen (GitHub Actions)

Der Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) baut die App und lädt sie zu Firebase Hosting:

- **Pull Request** → eigene Vorschau-Adresse (7 Tage gültig), der Link erscheint als Kommentar im Pull Request.
  Achtung: Die Vorschau arbeitet mit den echten Daten.
- **Änderung auf `main`** (z. B. Pull Request zusammengeführt) → Live-Version unter <https://befliegungsprojekte.web.app>
- **Manuell**: GitHub → Reiter *Actions* → *Deploy* → *Run workflow*

Einmalige Einrichtung (legt den Zugangsschlüssel als GitHub-Secret `FIREBASE_SERVICE_ACCOUNT_BEFLIEGUNGSPROJEKTE` an):

```bash
npm install
npx firebase init hosting:github
```

Fragen des Assistenten: Repository `SebRuhdo/Befliegungsprojekte` · Build-Skript vor jedem Deploy: **Ja**, `npm ci && npm run build` ·
automatisch bei Merge veröffentlichen: **Ja**, Branch `main`. Die dabei lokal erzeugten Workflow-Dateien werden nicht gebraucht
(der Workflow liegt schon im Repository) – wichtig ist nur das angelegte Secret.

## Manuell veröffentlichen (Firebase Hosting, kostenlos)

Einmalig vorbereiten:

1. **Node.js** in der LTS-Version von <https://nodejs.org> installieren (Standard-Installer, alles bestätigen).
2. Code herunterladen: auf GitHub den Branch auswählen → grüner Knopf **Code** → **Download ZIP** → ZIP entpacken.
3. Eine Kommandozeile **im entpackten Ordner** öffnen:
   - **Windows:** Ordner im Explorer öffnen → oben in die Adresszeile `cmd` tippen → Enter
     (die *Eingabeaufforderung* verwenden, nicht PowerShell).
   - **Mac:** Programm *Terminal* öffnen → `cd ` tippen (mit Leerzeichen) → Ordner ins Fenster ziehen → Enter.
4. Befehle nacheinander ausführen:

```bash
npm install          # lädt alle Bausteine (dauert einige Minuten)
npm run login        # öffnet den Browser: mit dem Google-Konto des Firebase-Projekts anmelden
npm run deploy       # baut die App und lädt sie hoch
```

Danach ist die App unter <https://befliegungsprojekte.web.app> erreichbar.

**Bei späteren Änderungen:** neuen Stand als ZIP herunterladen und entpacken, dort `npm install` und `npm run deploy`
(die Anmeldung aus `npm run login` bleibt auf dem PC gespeichert).

Die Firestore-Regeln werden in der Firebase-Konsole gepflegt (Inhalt von [`firestore.rules`](firestore.rules)).

**iPhone**: Adresse in Safari öffnen → Teilen → *Zum Home-Bildschirm*.
**PC**: im Browser öffnen (Chrome/Edge bieten zusätzlich *App installieren* an).
