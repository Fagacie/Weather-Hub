import '../styles/main.css';
import { initTranslation } from '../js/translate.js';
import { loginUser, onAuthStateChanged } from '../js/auth.js';

initTranslation();

const form = document.getElementById('loginForm');
const msg = document.getElementById('loginMsg');
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
  setMessage('Signing in...');

  try {
    await loginUser(
      document.getElementById('loginEmail').value,
      document.getElementById('loginPassword').value
    );
    setMessage('Login successful! Redirecting...', 'success');
    window.location.href = '/index.html';
  } catch (error) {
    submitting = false;
    if (submitBtn) submitBtn.disabled = false;
    setMessage(error.message, 'error');
  }
});
