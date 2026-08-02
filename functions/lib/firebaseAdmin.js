const admin = require('firebase-admin');

function getAdminApp() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin;
}

function getDatabase() {
  return getAdminApp().database();
}

module.exports = { getAdminApp, getDatabase };
