function isFirebaseReady() {
  return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0;
}

// Register a new user
function registerUser(email, password, username, phone, callback) {
  if (!isFirebaseReady()) {
    callback(new Error('Firebase config is not configured.'));
    return;
  }
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      const user = userCredential.user;
      // Save extra info to database
      return firebase.database().ref('users/' + user.uid).set({
        email: email,
        username: username,
        phone: phone,
        createdAt: new Date().toISOString() // <-- this line is important
      });
    })
    .then(() => callback(null))
    .catch(error => callback(error));
}

// Login user
function loginUser(email, password, callback) {
  if (!isFirebaseReady()) {
    callback(new Error('Firebase config is not configured.'));
    return;
  }
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => callback(null))
    .catch(error => callback(error));
}

// Logout user
function logoutUser(callback) {
  if (!isFirebaseReady()) {
    callback(new Error('Firebase config is not configured.'));
    return;
  }
  firebase.auth().signOut()
    .then(() => callback(null))
    .catch(error => callback(error));
}

// Listen for auth state changes
function onAuthStateChanged(callback) {
  if (!isFirebaseReady()) {
    callback(null);
    return;
  }
  firebase.auth().onAuthStateChanged(callback);
}

// Get current user
function getCurrentUser() {
  if (!isFirebaseReady()) return null;
  return firebase.auth().currentUser;
}
