function initNav() {
  if (typeof firebase === 'undefined' || typeof onAuthStateChanged !== 'function') return;

  onAuthStateChanged(function(user) {
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
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logoutUser(function(err) {
        if (!err) window.location.href = 'login.html';
      });
    });
  }
}
