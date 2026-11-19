// Firebase-Konfiguration des Projekts "befliegungsprojekte"
// (Firebase-Konsole → Projekteinstellungen → Allgemein → „Meine Apps“ → Web-App).
// Diese Werte sind nicht geheim – sie stehen in jeder Web-App im ausgelieferten Code.
// Der Zugriff auf die Daten wird über Login + Firestore-Regeln (firestore.rules) geschützt.
// Für Tests lassen sich die Werte über .env.local (VITE_FIREBASE_...) überschreiben.
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? 'AIzaSyBg5SD92EK9Ya2RzSYV9Vcl-fqghczai1o',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? 'befliegungsprojekte.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'befliegungsprojekte',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? 'befliegungsprojekte.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '9915834277',
  appId: env.VITE_FIREBASE_APP_ID ?? '1:9915834277:web:062d241be6bb5ddae1d24c',
};

/** Demo-Build erzwingen (z. B. für die Vorschau): VITE_DEMO=1 npm run build */
export const forceDemoBuild = env.VITE_DEMO === '1';

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId) && !forceDemoBuild;
