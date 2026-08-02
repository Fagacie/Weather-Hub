export function showLoader(show) {
  const loader = document.getElementById('loaderOverlay');
  if (!loader) return;
  loader.classList.toggle('active', show);
}

export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') toast.classList.add('toast-error');
  if (type === 'success') toast.classList.add('toast-success');
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-12px)';
  }, 2500);
  setTimeout(() => toast.remove(), 3000);
}

export function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  if (!toggle || !icon) return;

  if (localStorage.getItem('weatherhub-theme') === 'dark') {
    document.body.classList.add('dark-mode');
    icon.classList.remove('bi-moon-stars-fill');
    icon.classList.add('bi-brightness-high-fill');
  }

  toggle.onclick = function () {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
      icon.classList.remove('bi-moon-stars-fill');
      icon.classList.add('bi-brightness-high-fill');
    } else {
      icon.classList.remove('bi-brightness-high-fill');
      icon.classList.add('bi-moon-stars-fill');
    }
    localStorage.setItem('weatherhub-theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  };
}

export function initNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });
}

export function initForecastTabs() {
  const tabs = document.querySelectorAll('.forecast-tab');
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-pane').forEach((pane) => {
        pane.classList.toggle('active', pane.id === target);
      });
    });
  });
}

export function initModal(modalId, closeBtnId) {
  const modal = document.getElementById(modalId);
  const closeBtn = document.getElementById(closeBtnId);
  if (!modal) return { open: () => {}, close: () => {} };

  const close = () => modal.classList.remove('open');
  const open = () => modal.classList.add('open');

  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  return { open, close };
}
