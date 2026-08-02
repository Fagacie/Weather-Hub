import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';
import { getConfig } from './config.js';

let initialized = false;
let initError = null;

export function initFirebase() {
  if (initialized) return true;

  const firebaseConfig = getConfig().FIREBASE_CONFIG;
  const missing = ['apiKey', 'projectId', 'authDomain', 'databaseURL']
    .filter((key) => !firebaseConfig[key]);

  if (missing.length > 0) {
    initError = `Firebase config is missing: ${missing.join(', ')}`;
    console.error(initError, firebaseConfig);
    return false;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    initialized = true;
    initError = null;
    return true;
  } catch (error) {
    initError = error.message;
    console.error('Firebase failed to initialize:', error);
    return false;
  }
}

export function isFirebaseReady() {
  return initialized && firebase.apps.length > 0;
}

export function getInitError() {
  return initError;
}

export { firebase };
