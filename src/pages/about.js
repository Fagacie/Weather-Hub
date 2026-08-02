import '../styles/main.css';
import { mountNav } from '../js/components/nav.js';
import { initNav } from '../js/nav.js';
import { initTranslation } from '../js/translate.js';
import { initNavScroll } from '../js/ui.js';
import { submitContact } from '../js/api.js';

mountNav({ active: 'about' });
initNav();
initTranslation();
initNavScroll();

document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('contactFormMsg');
  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const message = document.getElementById('contactMsg').value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (!name || !email || !message) {
    msg.textContent = 'Please fill in all fields.';
    msg.className = 'auth-msg error';
    return;
  }

  // Mirrors the database rule, which would otherwise fail with an opaque
  // permission error.
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    msg.textContent = 'Please enter a valid email address.';
    msg.className = 'auth-msg error';
    return;
  }

  msg.textContent = 'Sending...';
  msg.className = 'auth-msg';
  if (submitBtn) submitBtn.disabled = true;

  try {
    await submitContact({ name, email, message });
    msg.textContent = `Thank you, ${name}! Your message has been received. We'll get back to you soon.`;
    msg.className = 'auth-msg success';
    document.getElementById('contactForm').reset();
  } catch (err) {
    const denied = err.code === 'PERMISSION_DENIED' || /permission/i.test(err.message || '');
    msg.textContent = denied
      ? 'Your message was rejected. Please check the fields and try again.'
      : err.message || 'Failed to send message. Please try again.';
    msg.className = 'auth-msg error';
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
