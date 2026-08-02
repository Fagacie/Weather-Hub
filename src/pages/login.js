import '../styles/main.css';
import { initTranslation } from '../js/translate.js';
import { loginUser, onAuthStateChanged } from '../js/auth.js';

initTranslation();

let isLoggingIn = false;
onAuthStateChanged((user) => {
  if (user && !isLoggingIn) window.location.href = '/index.html';
});

document.getElementById('loginForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  isLoggingIn = true;
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msg = document.getElementById('loginMsg');
  msg.className = 'auth-msg';
  msg.textContent = '';

  loginUser(email, password, (error) => {
    if (error) {
      isLoggingIn = false;
      msg.textContent = error.message;
      msg.classList.add('error');
    } else {
      msg.textContent = 'Login successful!';
      msg.classList.add('success');
      setTimeout(() => { window.location.href = '/index.html'; }, 1200);
    }
  });
});
