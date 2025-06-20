// Register a new user
function registerUser(email, password, username, phone, callback) {
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
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => callback(null))
    .catch(error => callback(error));
}

// Logout user
function logoutUser(callback) {
  firebase.auth().signOut()
    .then(() => callback(null))
    .catch(error => callback(error));
}

// Listen for auth state changes
function onAuthStateChanged(callback) {
  firebase.auth().onAuthStateChanged(callback);
}

// Get current user
function getCurrentUser() {
  return firebase.auth().currentUser;
}