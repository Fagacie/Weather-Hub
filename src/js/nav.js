import { logoutUser, onAuthStateChanged } from './auth.js';

export function initNav() {
  onAuthStateChanged((user) => {
    const loginNav = document.getElementById('loginNavItem');
    const profileNav = document.getElementById('profileNavItem');

    if (user) {
      if (loginNav) loginNav.style.display = 'none';
      if (profileNav) profileNav.style.display = '';
    } else {
      if (loginNav) loginNav.style.display = '';
      if (profileNav) profileNav.style.display = 'none';
    }
  });

  const logoutBtn = document.getElementById('logoutMenuBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutUser()
        .then(() => { window.location.href = '/login.html'; })
        .catch((err) => console.error('Logout failed:', err));
    });
  }

  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  const profileDropdown = document.getElementById('profileDropdown');
  const profileMenu = document.getElementById('profileMenu');
  if (profileDropdown && profileMenu) {
    profileDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('open');
      profileDropdown.setAttribute('aria-expanded', profileMenu.classList.contains('open'));
    });
    document.addEventListener('click', () => {
      profileMenu.classList.remove('open');
      profileDropdown.setAttribute('aria-expanded', 'false');
    });
  }
}
