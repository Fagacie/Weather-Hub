import '../styles/main.css';
import { initTranslation } from '../js/translate.js';
import { registerUser, onAuthStateChanged } from '../js/auth.js';

initTranslation();

let isRegistering = false;
onAuthStateChanged((user) => {
  if (user && !isRegistering) window.location.href = '/index.html';
});

document.getElementById('registerForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  isRegistering = true;
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const username = document.getElementById('registerUsername').value.trim();
  const phone = document.getElementById('registerPhone').value.trim();
  const msg = document.getElementById('registerMsg');
  msg.className = 'auth-msg';
  msg.textContent = '';

  registerUser(email, password, username, phone, (error) => {
    if (error) {
      isRegistering = false;
      msg.textContent = error.message;
      msg.classList.add('error');
    } else {
      msg.textContent = 'Registration successful!';
      msg.classList.add('success');
      setTimeout(() => { window.location.href = '/index.html'; }, 1200);
    }
  });
});
