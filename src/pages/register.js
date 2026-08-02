import '../styles/main.css';
import { initTranslation } from '../js/translate.js';
import { registerUser, onAuthStateChanged } from '../js/auth.js';

initTranslation();

const form = document.getElementById('registerForm');
const msg = document.getElementById('registerMsg');
const submitBtn = form?.querySelector('button[type="submit"]');

let submitting = false;

onAuthStateChanged((user) => {
  if (user && !submitting) window.location.href = '/index.html';
});

function setMessage(text, type) {
  msg.textContent = text;
  msg.className = type ? `auth-msg ${type}` : 'auth-msg';
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submitting) return;

  submitting = true;
  if (submitBtn) submitBtn.disabled = true;
  setMessage('Creating your account...');

  try {
    await registerUser(
      document.getElementById('registerEmail').value,
      document.getElementById('registerPassword').value,
      document.getElementById('registerUsername').value,
      document.getElementById('registerPhone').value
    );
    setMessage('Registration successful! Redirecting...', 'success');
    window.location.href = '/index.html';
  } catch (error) {
    submitting = false;
    if (submitBtn) submitBtn.disabled = false;
    setMessage(error.message, 'error');
  }
});
