import { firebase, initFirebase, isFirebaseReady } from './firebase.js';

initFirebase();

export async function registerUser(email, password, username, phone, callback) {
  if (!isFirebaseReady()) {
    const err = new Error('Firebase is not configured. Add credentials to .env.local');
    if (typeof callback === 'function') callback(err);
    throw err;
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUsername = (username || '').trim();
  const cleanPhone = (phone || '').trim();

  if (!cleanEmail || !password || !cleanUsername) {
    const err = new Error('Please fill in all required fields.');
    if (typeof callback === 'function') callback(err);
    throw err;
  }

  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(cleanEmail, password);
    const user = userCredential.user;

    await firebase.database().ref(`users/${user.uid}`).set({
      email: cleanEmail,
      username: cleanUsername,
      phone: cleanPhone,
      createdAt: new Date().toISOString()
    });

    if (typeof callback === 'function') callback(null);
    return user;
  } catch (error) {
    const friendly = friendlyAuthError(error);
    if (typeof callback === 'function') callback(friendly);
    throw friendly;
  }
}

function friendlyAuthError(error) {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'This email is already registered. Try logging in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'PERMISSION_DENIED': 'Could not save profile. Check Realtime Database rules are deployed for this project.'
  };
  if (messages[code]) {
    return new Error(messages[code]);
  }
  return error;
}

export async function loginUser(email, password, callback) {
  if (!isFirebaseReady()) {
    const err = new Error('Firebase is not configured. Add credentials to .env.local');
    if (typeof callback === 'function') callback(err);
    throw err;
  }

  const cleanEmail = (email || '').trim().toLowerCase();

  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(cleanEmail, password);
    if (typeof callback === 'function') callback(null);
    return userCredential.user;
  } catch (error) {
    const friendly = friendlyAuthError(error);
    if (typeof callback === 'function') callback(friendly);
    throw friendly;
  }
}

export async function logoutUser(callback) {
  if (!isFirebaseReady()) {
    const err = new Error('Firebase is not initialized.');
    if (typeof callback === 'function') callback(err);
    throw err;
  }

  try {
    await firebase.auth().signOut();
    if (typeof callback === 'function') callback(null);
  } catch (error) {
    if (typeof callback === 'function') callback(error);
    throw error;
  }
}

export function onAuthStateChanged(callback) {
  if (!isFirebaseReady()) {
    if (typeof callback === 'function') callback(null);
    return;
  }
  firebase.auth().onAuthStateChanged(callback);
}

export function getCurrentUser() {
  if (!isFirebaseReady()) return null;
  return firebase.auth().currentUser;
}

export { firebase };
