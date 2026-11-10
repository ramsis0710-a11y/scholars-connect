/* brand.js - bouton rond MBA-CONSULT : logo public / mode admin (verifie cote serveur) */
(function () {
  if (window.__mbaBrand) return;
  window.__mbaBrand = true;

  function findToken() {
    var stores = [window.localStorage, window.sessionStorage];
    for (var s = 0; s < stores.length; s++) {
      try {
        var st = stores[s];
        for (var i = 0; i < st.length; i++) {
          var v = st.getItem(st.key(i)) || '';
          var m = v.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/);
          if (m) return m[0];
        }
      } catch (e) {}
    }
    return '';
  }

  function getInfo() {
    var t = findToken();
    var opts = t ? { headers: { Authorization: 'Bearer ' + t }, cache: 'no-store' } : { cache: 'no-store' };
    return fetch('/api/brand/role', opts)
      .then(function (r) { return r.json(); })
      .catch(function () { return { role: 'public' }; });
  }

  var css =
    '#mba-brand{position:fixed;left:18px;bottom:18px;z-index:99999;font-family:system-ui,"Segoe UI",Arial,sans-serif}' +
    '#mba-brand .mba-btn{width:56px;height:56px;border-radius:50%;border:2px solid #F5B800;padding:0;cursor:pointer;' +
    'background:#000 url(/logo-mba.png) center/cover no-repeat;box-shadow:0 2px 10px rgba(0,0,0,.45);position:relative}' +
    '#mba-brand .mba-admin{box-shadow:0 0 0 3px #F5B800,0 2px 12px rgba(245,184,0,.6)}' +
    '#mba-brand .mba-tag{position:absolute;left:50%;bottom:-9px;transform:translateX(-50%);background:#F5B800;color:#000;' +
    'font:700 9px/1 system-ui,Arial,sans-serif;padding:3px 6px;border-radius:8px;letter-spacing:.5px}' +
    '#mba-brand .mba-menu{display:none;position:absolute;left:0;bottom:70px;min-width:220px;background:#111;' +
    'border:1px solid #F5B800;border-radius:12px;padding:6px;box-shadow:0 6px 20px rgba(0,0,0,.5)}' +
    '#mba-brand.open .mba-menu{display:block}' +
    '#mba-brand .mba-menu a{display:block;color:#fff;text-decoration:none;padding:9px 12px;border-radius:8px;font-size:14px}' +
    '#mba-brand .mba-menu a:hover{background:#2a2a2a;color:#F5B800}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function safeHref(h) { return /^(\/|https:\/\/)/.test(String(h || '')) ? h : '/'; }

  function build(info) {
    var old = document.getElementById('mba-brand');
    if (old) old.parentNode.removeChild(old);
    var admin = info && info.role === 'admin';
    var logged = info && (info.role === 'admin' || info.role === 'user');

    var links;
    if (admin) links = (info.links || []).concat([{ label: 'Chat', href: '/chat' }, { label: 'Accueil', href: '/' }]);
    else if (logged) links = [{ label: 'Chat', href: '/chat' }, { label: 'Accueil', href: '/' }];
    else links = [{ label: 'Connexion', href: '/login' }, { label: 'Inscription', href: '/register' }, { label: 'Accueil', href: '/' }];

    var box = document.createElement('div');
    box.id = 'mba-brand';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mba-btn' + (admin ? ' mba-admin' : '');
    btn.setAttribute('aria-label', admin ? 'Menu administrateur MBA-CONSULT' : 'Menu MBA-CONSULT');
    if (admin) {
      var tag = document.createElement('span');
      tag.className = 'mba-tag';
      tag.textContent = 'ADMIN';
      btn.appendChild(tag);
    }

    var menu = document.createElement('div');
    menu.className = 'mba-menu';
    links.forEach(function (l) {
      var a = document.createElement('a');
      a.href = safeHref(l.href);
      a.textContent = l.label;
      if (/^https:/.test(a.href) && a.host !== location.host) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      menu.appendChild(a);
    });

    btn.addEventListener('click', function (e) { e.stopPropagation(); box.classList.toggle('open'); });
    document.addEventListener('click', function () { box.classList.remove('open'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') box.classList.remove('open'); });

    box.appendChild(btn);
    box.appendChild(menu);
    document.body.appendChild(box);
  }

  function refresh() { getInfo().then(build); }
  refresh();
  window.addEventListener('focus', refresh);
  window.addEventListener('storage', refresh);
})();