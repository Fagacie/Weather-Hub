import '../styles/main.css';
import { initTranslation } from '../js/translate.js';
import { firebase, logoutUser, onAuthStateChanged, getCurrentUser } from '../js/auth.js';
import { initModal } from '../js/ui.js';
import { randomFunFact } from '../js/utils.js';

initTranslation();

const nameEl = document.getElementById('profileName');
const emailEl = document.getElementById('profileEmail');
const phoneEl = document.getElementById('profilePhone');
const editModal = initModal('editProfileModal', 'editModalClose');

document.getElementById('editModalCancel')?.addEventListener('click', editModal.close);

onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  firebase.database().ref(`users/${user.uid}`).once('value')
    .then((snapshot) => {
      const data = snapshot.val() || {};
      nameEl.textContent = data.username || user.displayName || user.email?.split('@')[0] || 'User';
      emailEl.textContent = data.email || user.email || '';
      const phoneValue = data.phone || data.phoneno || '';
      phoneEl.textContent = phoneValue ? `Phone: ${phoneValue}` : '';
      document.getElementById('editUsername').value = data.username || '';
      document.getElementById('editPhone').value = phoneValue;
    })
    .catch(() => {
      nameEl.textContent = user.displayName || user.email?.split('@')[0] || 'User';
      emailEl.textContent = user.email || '';
      phoneEl.textContent = '';
    });
});

document.getElementById('editProfileBtn')?.addEventListener('click', editModal.open);

document.getElementById('editProfileForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const username = document.getElementById('editUsername').value.trim();
  const phone = document.getElementById('editPhone').value.trim();
  const msg = document.getElementById('editProfileMsg');
  msg.className = 'auth-msg';
  msg.textContent = 'Saving...';

  firebase.database().ref(`users/${user.uid}`).update({ username, phone, phoneno: null })
    .then(() => {
      msg.textContent = 'Profile updated!';
      msg.classList.add('success');
      nameEl.textContent = username;
      phoneEl.textContent = phone ? `Phone: ${phone}` : '';
      setTimeout(() => {
        editModal.close();
        msg.textContent = '';
        msg.className = 'auth-msg';
      }, 1000);
    })
    .catch(() => {
      msg.textContent = 'Failed to update profile.';
      msg.classList.add('error');
    });
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  logoutUser()
    .then(() => { window.location.href = '/login.html'; })
    .catch((err) => console.error('Logout failed:', err));
});

document.getElementById('weatherFact').textContent = randomFunFact();
