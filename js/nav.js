function initNav() {
  if (typeof firebase === 'undefined' || typeof onAuthStateChanged !== 'function') return;

  onAuthStateChanged(function(user) {
    var loginNav = document.getElementById('loginNavItem');
    var profileNav = document.getElementById('profileNavItem');

    if (user) {
      if (loginNav) loginNav.style.display = 'none';
      if (profileNav) profileNav.style.display = '';
    } else {
      if (loginNav) loginNav.style.display = '';
      if (profileNav) profileNav.style.display = 'none';
    }
  });

  // Logout button in dropdown
  var logoutBtn = document.getElementById('logoutMenuBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logoutUser(function(err) {
        if (!err) window.location.href = 'login.html';
      });
    });
  }

  // Mobile hamburger toggle
  var hamburger = document.getElementById('navHamburger');
  var navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function() {
      navLinks.classList.toggle('open');
    });
    // Close mobile menu on link click
    navLinks.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        navLinks.classList.remove('open');
      });
    });
  }

  // Profile dropdown toggle (custom, no Bootstrap)
  var profileDropdown = document.getElementById('profileDropdown');
  var profileMenu = document.getElementById('profileMenu');
  if (profileDropdown && profileMenu) {
    profileDropdown.addEventListener('click', function(e) {
      e.stopPropagation();
      profileMenu.classList.toggle('open');
      profileDropdown.setAttribute('aria-expanded', profileMenu.classList.contains('open'));
    });
    document.addEventListener('click', function() {
      profileMenu.classList.remove('open');
      if (profileDropdown) profileDropdown.setAttribute('aria-expanded', 'false');
    });
  }
}
