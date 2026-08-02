const NAV_ITEMS = [
  { id: 'home', href: '/index.html', label: 'Home' },
  { id: 'map', href: '/map.html', label: 'Map' },
  { id: 'login', href: '/login.html', label: 'Login', loginOnly: true },
  { id: 'about', href: '/about.html', label: 'About' }
];

export function mountNav({ active = 'home', showTheme = false } = {}) {
  const mount = document.getElementById('nav-mount');
  if (!mount) return;

  const links = NAV_ITEMS.map((item) => {
    const cls = item.id === active ? 'active translatable' : 'translatable';
    const liId = item.loginOnly ? ' id="loginNavItem"' : '';
    return `<li${liId}><a class="${cls}" href="${item.href}">${item.label}</a></li>`;
  }).join('');

  const themeBtn = showTheme
    ? `<button id="themeToggle" class="nav-icon-btn" title="Toggle dark/light mode" aria-label="Toggle theme">
         <i class="bi bi-moon-stars-fill" id="themeIcon"></i>
       </button>`
    : '';

  mount.innerHTML = `
    <nav class="nav-glass" id="mainNav">
      <div class="nav-inner">
        <a class="nav-brand" href="/index.html">
          <span class="nav-brand-icon"><i class="bi bi-cloud-sun-fill"></i></span>
          <span class="translatable">WeatherHub</span>
        </a>
        <ul class="nav-links" id="navLinks">${links}</ul>
        <div class="nav-right">
          <select id="languageSelect" class="nav-select" aria-label="Language">
            <option value="en" selected>English</option>
          </select>
          ${themeBtn}
          <div class="profile-dropdown" id="profileNavItem" style="display:none;">
            <div class="profile-avatar" id="profileDropdown" tabindex="0" role="button" aria-label="Profile menu" aria-expanded="false">
              <i class="bi bi-person"></i>
            </div>
            <div class="profile-menu" id="profileMenu">
              <a class="translatable" href="/profile.html">Profile</a>
              <div class="profile-menu-divider"></div>
              <a class="translatable" href="#" id="logoutMenuBtn">Logout</a>
            </div>
          </div>
          <button class="nav-hamburger" id="navHamburger" aria-label="Toggle menu">
            <i class="bi bi-list"></i>
          </button>
        </div>
      </div>
    </nav>`;
}
