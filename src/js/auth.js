import { firebase, initFirebase, isFirebaseReady, getInitError } from './firebase.js';

initFirebase();

const AUTH_MESSAGES = {
  'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your internet connection.',
  'auth/operation-not-allowed':
    'Email/password sign-in is disabled. Enable it in Firebase Console under Authentication > Sign-in method.',
  'auth/configuration-not-found':
    'Firebase Authentication is not set up for this project. Enable Email/Password sign-in in the Firebase Console.',
  'auth/unauthorized-domain':
    'This domain is not authorized. Add it in Firebase Console under Authentication > Settings > Authorized domains.',
  PERMISSION_DENIED:
    'Account created, but the profile could not be saved. Deploy database.rules.json to this Firebase project.'
};

function toFriendlyError(error) {
  const message = AUTH_MESSAGES[error?.code];
  return message ? new Error(message) : error;
}

function ensureReady() {
  if (isFirebaseReady() || initFirebase()) return null;
  return new Error(getInitError() || 'Firebase is not configured.');
}

function finish(callback, error) {
  if (typeof callback === 'function') callback(error);
  return error;
}

export async function registerUser(email, password, username, phone, callback) {
  const notReady = ensureReady();
  if (notReady) throw finish(callback, notReady);

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUsername = (username || '').trim();
  const cleanPhone = (phone || '').trim();

  if (!cleanEmail || !password || !cleanUsername) {
    throw finish(callback, new Error('Please fill in all required fields.'));
  }

  let user;
  try {
    const credential = await firebase.auth().createUserWithEmailAndPassword(cleanEmail, password);
    user = credential.user;
  } catch (error) {
    throw finish(callback, toFriendlyError(error));
  }

  try {
    await firebase.database().ref(`users/${user.uid}`).set({
      email: cleanEmail,
      username: cleanUsername,
      phone: cleanPhone,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    // The account exists at this point, so surface the profile failure without
    // letting the caller think sign-up itself failed.
    console.error('Failed to save user profile:', error);
    finish(callback, toFriendlyError(error));
    return user;
  }

  finish(callback, null);
  return user;
}

export async function loginUser(email, password, callback) {
  const notReady = ensureReady();
  if (notReady) throw finish(callback, notReady);

  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw finish(callback, new Error('Please enter your email and password.'));
  }

  try {
    const credential = await firebase.auth().signInWithEmailAndPassword(cleanEmail, password);
    finish(callback, null);
    return credential.user;
  } catch (error) {
    throw finish(callback, toFriendlyError(error));
  }
}

export async function logoutUser(callback) {
  const notReady = ensureReady();
  if (notReady) throw finish(callback, notReady);

  try {
    await firebase.auth().signOut();
    finish(callback, null);
  } catch (error) {
    throw finish(callback, toFriendlyError(error));
  }
}

export function onAuthStateChanged(callback) {
  if (!isFirebaseReady() && !initFirebase()) {
    if (typeof callback === 'function') callback(null);
    return;
  }
  firebase.auth().onAuthStateChanged(callback);
}

export function getCurrentUser() {
  return isFirebaseReady() ? firebase.auth().currentUser : null;
}

export { firebase };
