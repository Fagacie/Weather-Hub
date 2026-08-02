function isFirebaseReady() {
  return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0;
}

// Register a new user with input sanitization and Promise/Callback dual support
async function registerUser(email, password, username, phone, callback) {
  if (!isFirebaseReady()) {
    const err = new Error('Firebase is not configured yet. Please add your Firebase credentials in js/config.js');
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

    await firebase.database().ref('users/' + user.uid).set({
      email: cleanEmail,
      username: cleanUsername,
      phone: cleanPhone,
      createdAt: new Date().toISOString()
    });

    if (typeof callback === 'function') callback(null);
    return user;
  } catch (error) {
    if (typeof callback === 'function') callback(error);
    throw error;
  }
}

// Login user
async function loginUser(email, password, callback) {
  if (!isFirebaseReady()) {
    const err = new Error('Firebase is not configured yet. Please add your Firebase credentials in js/config.js');
    if (typeof callback === 'function') callback(err);
    throw err;
  }

  const cleanEmail = (email || '').trim().toLowerCase();

  try {
    const userCredential = await firebase.auth().signInWithEmailAndPassword(cleanEmail, password);
    if (typeof callback === 'function') callback(null);
    return userCredential.user;
  } catch (error) {
    if (typeof callback === 'function') callback(error);
    throw error;
  }
}

// Logout user
async function logoutUser(callback) {
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

// Listen for auth state changes
function onAuthStateChanged(callback) {
  if (!isFirebaseReady()) {
    if (typeof callback === 'function') callback(null);
    return;
  }
  firebase.auth().onAuthStateChanged(callback);
}

// Get current user
function getCurrentUser() {
  if (!isFirebaseReady()) return null;
  return firebase.auth().currentUser;
}
