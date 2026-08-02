import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import { getConfig } from './config.js';

let initialized = false;

export function initFirebase() {
  if (initialized) return true;

  const firebaseConfig = getConfig().FIREBASE_CONFIG;
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Firebase config is missing. Copy .env.example to .env.local and fill in your values.');
    return false;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  initialized = true;
  return true;
}

export function isFirebaseReady() {
  return initialized && typeof firebase !== 'undefined' && firebase.apps.length > 0;
}

export { firebase };
