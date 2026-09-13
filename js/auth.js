// auth.js — Firebase Authentication guard for the main simulator page.
// Only relevant when hosted online (e.g. GitHub Pages) — loads Firebase dynamically
// so this file is safely skipped when bundling the offline single-file version.

(function(){
  function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function initAuth(){
    try{
      await loadScript('firebase-config.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
    }catch(err){
      // Firebase unreachable (e.g. offline/local file use) — skip the auth gate silently.
      return;
    }
    if(typeof firebase === 'undefined' || !window.FIREBASE_CONFIG) return;

    firebase.initializeApp(window.FIREBASE_CONFIG);
    const auth = firebase.auth();

    auth.onAuthStateChanged(user => {
      if(!user){
        window.location.href = 'login.html';
        return;
      }
      const emailEl = document.getElementById('csimUserEmail');
      if(emailEl) emailEl.textContent = user.email;
    });

    const logoutBtn = document.getElementById('csimLogout');
    if(logoutBtn){
      logoutBtn.onclick = () => {
        auth.signOut().then(() => { window.location.href = 'login.html'; });
      };
    }
  }

  initAuth();
})();
