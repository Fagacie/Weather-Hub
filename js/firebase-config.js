const firebaseConfig = (window.WEATHER_HUB_CONFIG && window.WEATHER_HUB_CONFIG.FIREBASE_CONFIG) || {};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
} else {
  console.warn('Firebase config is missing. Create js/config.js from js/config.example.js.');
}



