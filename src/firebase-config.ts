// Firebase-Konfiguration (Firebase-Konsole → Projekteinstellungen → Allgemein → „Meine Apps“ → Web-App).
// Diese Werte sind nicht geheim – der Zugriff wird über Login + Firestore-Regeln geschützt.
// Solange apiKey leer ist, läuft die App im Demo-Modus (Daten nur lokal im Browser).
// Alternativ über .env.local (VITE_FIREBASE_API_KEY=...) setzen.
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
