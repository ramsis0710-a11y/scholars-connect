// ============================================================
// CHAT-EXTRAS-V21.JS - version minimale
// Auto-auth + history-loader + memory-inject + domain API + mic patience
// NE TOUCHE PAS aux boutons TTS (v1.0 en a deja dans chat.html)
// ============================================================
(function() {
    console.log('[v21] Module charge');
    var API = window.location.origin;
    var HIST_KEY = 'scholars_hist_v3';
    var CREDS_KEY = 'scholars_credentials';
    var DEFAULT_EMAIL = 'mba@mba-consult.tn';

    function checkAuth() {
        var token = localStorage.getItem('token');
        if (token && token.length > 20) {
            try {
                var payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp && payload.exp * 1000 > Date.now()) {
                    console.log('[v21] Token OK (' + (payload.email || '?') + ')');
                    return true;
                }
            } catch(e) {}
        }
        console.log('[v21] Reconnexion requise');
        setTimeout(showReconnectPrompt, 800);
        return false;
    }

    function showReconnectPrompt(err) {
        if (document.getElementById('v21Overlay')) return;
        var ov = document.createElement('div');
        ov.id = 'v21Overlay';
        ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(10,37,64,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;';
        ov.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">'
            + '<h2 style="color:#0a2540;margin:0 0 8px 0;font-size:20px;">Reconnexion</h2>'
            + '<p style="color:#6b7280;margin:0 0 20px 0;font-size:14px;">Votre session a expire. Reconnectez-vous.</p>'
            + (err ? '<div style="background:#fee2e2;color:#991b1b;padding:10px;border-radius:6px;margin-bottom:16px;font-size:13px;">' + err + '</div>' : '')
            + '<label style="display:block;color:#374151;font-weight:600;font-size:13px;margin-bottom:6px;">Email</label>'
            + '<input type="email" id="v21Email" value="' + DEFAULT_EMAIL + '" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:14px;font-size:14px;box-sizing:border-box;">'
            + '<label style="display:block;color:#374151;font-weight:600;font-size:13px;margin-bottom:6px;">Mot de passe</label>'
            + '<input type="password" id="v21Pass" placeholder="Mot de passe" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:20px;font-size:14px;box-sizing:border-box;">'
            + '<button id="v21Submit" style="width:100%;padding:12px;background:#0a2540;color:#fff;border:0;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;">Se connecter</button>'
            + '<div id="v21Status" style="margin-top:12px;color:#dc2626;font-size:13px;text-align:center;"></div>'
            + '</div>';
        document.body.appendChild(ov);
        document.getElementById('v21Submit').onclick = function() {
            var e = document.getElementById('v21Email').value.trim();
            var p = document.getElementById('v21Pass').value;
            if (!e || !p) { document.getElementById('v21Status').textContent = 'Champs requis'; return; }
            document.getElementById('v21Status').textContent = 'Connexion...';
            document.getElementById('v21Status').style.color = '#1e5aa8';
            fetch(API + '/api/auth/login', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: e, password: p})
            }).then(function(r) { return r.ok ? r.json() : null; })
            .then(function(d) {
                if (d && d.token) {
                    localStorage.setItem('token', d.token);
                    localStorage.setItem(CREDS_KEY, JSON.stringify({email: e, password: p}));
                    console.log('[v21] Connexion OK');
                    location.reload();
                } else {
                    document.getElementById('v21Status').textContent = 'Identifiants incorrects';
                    document.getElementById('v21Status').style.color = '#dc2626';
                }
            }).catch(function() {
                document.getElementById('v21Status').textContent = 'Erreur reseau';
            });
        };
    }

    function loadHistory() {
        var token = localStorage.getItem('token');
        if (!token || token.length < 20) return;
        var container = document.getElementById('chatMessages');
        if (!container) { setTimeout(loadHistory, 1000); return; }
        fetch(API + '/api/history', { headers: {'Authorization': 'Bearer ' + token} })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
            if (!data || !data.items || data.items.length === 0) return;
            var welcome = container.querySelector('.msg.bot');
            var wt = welcome ? welcome.textContent : '';
            container.innerHTML = '';
            if (wt) { var w = document.createElement('div'); w.className = 'msg bot'; w.textContent = wt; container.appendChild(w); }
            var items = data.items.slice().reverse();
            items.forEach(function(it) {
                if (it.question) { var u = document.createElement('div'); u.className = 'msg user'; u.textContent = it.question; u.dataset.restored = '1'; container.appendChild(u); }
                if (it.answer) { var b = document.createElement('div'); b.className = 'msg bot'; b.textContent = it.answer; b.dataset.restored = '1'; container.appendChild(b); }
            });
            container.scrollTop = container.scrollHeight;
            console.log('[v21] ' + items.length + ' echanges restaures');
        }).catch(function(e) {});
    }

    var API_KEYWORDS = ['api 5ct', 'api 5b', 'api 6a', 'api 5l', 'api 7-1', 'api 7-2',
        'api 5c5', 'api 14l', 'tubing', 'casing', 'coupling', 'vam', 'tenaris',
        'hydril', 'nace', 'h2s', 'sour service', 'ndt', 'mpi', 'hydrostatic',
        'wellhead', 'norme api', 'petrole', 'gaz', 'forage', 'drilling', 'puits'];

    function isApiQuestion(q) {
        var low = String(q || '').toLowerCase();
        for (var i = 0; i < API_KEYWORDS.length; i++) { if (low.indexOf(API_KEYWORDS[i]) !== -1) return true; }
        return false;
    }

    var origFetch = window.fetch;
    window.fetch = function(url, opts) {
        if (typeof url === 'string' && url.indexOf('/api/ask') !== -1 && opts && opts.body) {
            try {
                var body = JSON.parse(opts.body);
                var h = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
                var history = h.slice(-6).map(function(m) { return {role: m.role, content: m.text}; });
                if (history.length > 0) { body.history = history; console.log('[v21] history: ' + history.length); }
                if (isApiQuestion(body.question)) { body.domain = 'Petrole & Gaz'; console.log('[v21] domaine force: Petrole & Gaz'); }
                opts.body = JSON.stringify(body);
            } catch(e) {}
        }
        return origFetch.apply(this, arguments);
    };

    function patchMic() {
        var OrigSR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!OrigSR || OrigSR._v21) return;
        function PatchedSR() {
            var inst = new OrigSR();
            var userStopped = false;
            var restarts = 0;
            try { inst.continuous = true; } catch(e) {}
            try { inst.interimResults = true; } catch(e) {}
            var origStop = inst.stop.bind(inst);
            var origAbort = inst.abort ? inst.abort.bind(inst) : null;
            inst.stop = function() { userStopped = true; return origStop(); };
            if (origAbort) inst.abort = function() { userStopped = true; return origAbort(); };
            inst.addEventListener('result', function() { restarts = 0; });
            inst.addEventListener('end', function() {
                if (!userStopped && restarts < 5) { restarts++; setTimeout(function() { try { inst.start(); } catch(e) {} }, 250); }
            });
            return inst;
        }
        PatchedSR._v21 = true;
        window.SpeechRecognition = PatchedSR;
        window.webkitSpeechRecognition = PatchedSR;
        console.log('[v21] Mic patche');
    }

    setTimeout(function() {
        if (checkAuth()) { setTimeout(loadHistory, 1200); }
        patchMic();
        console.log('[v21] Pret.');
    }, 400);
})();