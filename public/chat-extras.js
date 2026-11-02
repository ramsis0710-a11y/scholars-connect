// ============================================================
// CHAT-EXTRAS.JS - v1.19
// Ajoute : history-loader + auto-auth + TTS-clean + boutons TTS + memory-inject
// NE MODIFIE AUCUNE LIGNE de chat.html existant
// ============================================================
(function() {
    console.log('[chat-extras] Module charge');
    var API = 'https://scholars-connect-app.onrender.com';
    var HIST_KEY = 'scholars_hist_v3';
    var CREDS_KEY = 'scholars_credentials';
    var DEFAULT_EMAIL = 'mba@mba-consult.tn';

    // ========================================================
    // 1. AUTO-AUTH (token valide ?)
    // ========================================================
    function checkAuth() {
        var token = localStorage.getItem('token');
        if (token && token.length > 20) {
            try {
                var payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp && payload.exp * 1000 > Date.now()) {
                    console.log('[extras-auth] Token OK (' + (payload.email || '?') + ')');
                    return true;
                }
                console.log('[extras-auth] Token expire');
            } catch(e) {
                console.log('[extras-auth] Token invalide');
            }
        }
        console.log('[extras-auth] Reconnexion requise');
        setTimeout(showReconnectPrompt, 1000);
        return false;
    }

    function showReconnectPrompt(err) {
        if (document.getElementById('extrasOverlay')) return;
        var ov = document.createElement('div');
        ov.id = 'extrasOverlay';
        ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(10,37,64,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;';
        ov.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">'
            + '<h2 style="color:#0a2540;margin:0 0 8px 0;font-size:20px;">🔐 Reconnexion</h2>'
            + '<p style="color:#6b7280;margin:0 0 20px 0;font-size:14px;">Votre session a expire. Reconnectez-vous.</p>'
            + (err ? '<div style="background:#fee2e2;color:#991b1b;padding:10px;border-radius:6px;margin-bottom:16px;font-size:13px;">' + err + '</div>' : '')
            + '<label style="display:block;color:#374151;font-weight:600;font-size:13px;margin-bottom:6px;">Email</label>'
            + '<input type="email" id="extrasEmail" value="' + DEFAULT_EMAIL + '" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:14px;font-size:14px;box-sizing:border-box;">'
            + '<label style="display:block;color:#374151;font-weight:600;font-size:13px;margin-bottom:6px;">Mot de passe</label>'
            + '<input type="password" id="extrasPassword" placeholder="Votre mot de passe" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:20px;font-size:14px;box-sizing:border-box;">'
            + '<button id="extrasSubmit" style="width:100%;padding:12px;background:#0a2540;color:#fff;border:0;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;">Se connecter</button>'
            + '<div id="extrasStatus" style="margin-top:12px;color:#dc2626;font-size:13px;text-align:center;"></div>'
            + '</div>';
        document.body.appendChild(ov);
        document.getElementById('extrasSubmit').onclick = function() {
            var e = document.getElementById('extrasEmail').value.trim();
            var p = document.getElementById('extrasPassword').value;
            if (!e || !p) { document.getElementById('extrasStatus').textContent = 'Champs requis'; return; }
            document.getElementById('extrasStatus').textContent = 'Connexion...';
            document.getElementById('extrasStatus').style.color = '#1e5aa8';
            fetch(API + '/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: e, password: p})
            }).then(function(r) { return r.ok ? r.json() : null; })
            .then(function(d) {
                if (d && d.token) {
                    localStorage.setItem('token', d.token);
                    localStorage.setItem(CREDS_KEY, JSON.stringify({email: e, password: p}));
                    console.log('[extras-auth] Connexion OK');
                    ov.remove();
                    location.reload();
                } else {
                    document.getElementById('extrasStatus').textContent = 'Identifiants incorrects';
                    document.getElementById('extrasStatus').style.color = '#dc2626';
                }
            }).catch(function() {
                document.getElementById('extrasStatus').textContent = 'Erreur reseau';
            });
        };
    }

    // ========================================================
    // 2. HISTORY-LOADER (charge /api/history)
    // ========================================================
    function loadHistory() {
        var token = localStorage.getItem('token');
        if (!token || token.length < 20) return;
        var container = document.getElementById('chatMessages');
        if (!container) { setTimeout(loadHistory, 1000); return; }
        fetch(API + '/api/history', {
            headers: {'Authorization': 'Bearer ' + token}
        }).then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
            if (!data || !data.items || data.items.length === 0) {
                console.log('[extras-history] Aucun historique serveur');
                return;
            }
            var welcome = container.querySelector('.msg.bot');
            var welcomeText = welcome ? welcome.textContent : '';
            container.innerHTML = '';
            if (welcomeText) {
                var w = document.createElement('div');
                w.className = 'msg bot';
                w.textContent = welcomeText;
                container.appendChild(w);
            }
            var items = data.items.slice().reverse();
            items.forEach(function(it) {
                if (it.question) {
                    var u = document.createElement('div');
                    u.className = 'msg user';
                    u.textContent = it.question;
                    u.dataset.restored = '1';
                    container.appendChild(u);
                }
                if (it.answer) {
                    var b = document.createElement('div');
                    b.className = 'msg bot';
                    b.textContent = it.answer;
                    b.dataset.restored = '1';
                    container.appendChild(b);
                }
            });
            container.scrollTop = container.scrollHeight;
            console.log('[extras-history] ' + items.length + ' echanges restaures');
        }).catch(function(e) {
            console.warn('[extras-history] Erreur:', e);
        });
    }

    // ========================================================
    // 3. MEMORY-INJECT (envoie history avec /api/ask)
    // ========================================================
    var origFetch = window.fetch;
    window.fetch = function(url, opts) {
        if (typeof url === 'string' && url.indexOf('/api/ask') !== -1 && opts && opts.body) {
            try {
                var body = JSON.parse(opts.body);
                var h = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
                var history = h.slice(-6).map(function(m) {
                    return {role: m.role, content: m.text};
                });
                if (history.length > 0) {
                    body.history = history;
                    opts.body = JSON.stringify(body);
                    console.log('[extras-memory] Historique envoye: ' + history.length + ' messages');
                }
            } catch(e) {}
        }
        return origFetch.apply(this, arguments);
    };

    // Hook sauvegarde
    function hookSave() {
        var c = document.getElementById('chatMessages');
        if (!c || c.dataset.extrasHooked) return;
        c.dataset.extrasHooked = '1';
        new MutationObserver(function(muts) {
            muts.forEach(function(m) {
                m.addedNodes.forEach(function(n) {
                    if (n.nodeType === 1 && n.classList.contains('msg') && !n.dataset.restored) {
                        var role = n.classList.contains('user') ? 'user' : 'bot';
                        var txt = (n.textContent || '').trim();
                        if (txt) {
                            try {
                                var h = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
                                h.push({role: role, text: txt, ts: Date.now()});
                                if (h.length > 60) h = h.slice(-60);
                                localStorage.setItem(HIST_KEY, JSON.stringify(h));
                            } catch(e) {}
                        }
                    }
                });
            });
        }).observe(c, {childList: true});
    }

    // ========================================================
    // 4. TTS-CLEAN (ne pas lire la fiche technique)
    // ========================================================
    function cleanForTTS(text) {
        if (!text) return '';
        var c = String(text);
        c = c.split(/\uD83D\uDCCB\s*Fiche technique/i)[0];
        c = c.split(/📋\s*Fiche technique/i)[0];
        c = c.replace(/R[ée]ponse\s+d[ée]taill[ée]e\s*/gi, '');
        c = c.replace(/^[📋\s]+/, '');
        return c.trim();
    }

    if (window.speechSynthesis) {
        var origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
        window.speechSynthesis.speak = function(utt) {
            if (utt && utt.text) {
                var cleaned = cleanForTTS(utt.text);
                if (cleaned && cleaned.length > 2) {
                    console.log('[extras-tts] Lecture nettoyee (' + cleaned.length + ' chars)');
                    utt.text = cleaned;
                }
            }
            return origSpeak(utt);
        };
    }

    // ========================================================
    // 5. BOUTONS TTS (▶ ⏸ ⏹)
    // ========================================================
    function addTTSButtons() {
        var voiceAuto = document.getElementById('voiceAuto');
        if (!voiceAuto && document.querySelectorAll) {
            document.querySelectorAll('label').forEach(function(l) {
                if (l.textContent && l.textContent.indexOf('Lecture vocale') !== -1) {
                    voiceAuto = l.querySelector('input');
                }
            });
        }
        if (!voiceAuto || document.getElementById('extrasTTS')) return;
        var ctrl = document.createElement('div');
        ctrl.id = 'extrasTTS';
        ctrl.style.cssText = 'display:inline-flex;gap:4px;margin-left:8px;vertical-align:middle;';
        ctrl.innerHTML = '<button id="extrasPlay" title="Demarrer" style="background:#16a34a;color:#fff;border:0;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:14px;">▶</button>'
            + '<button id="extrasPause" title="Pause" style="background:#f59e0b;color:#fff;border:0;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:14px;">⏸</button>'
            + '<button id="extrasStop" title="Arreter" style="background:#dc2626;color:#fff;border:0;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:14px;">⏹</button>';
        voiceAuto.parentNode.insertBefore(ctrl, voiceAuto.nextSibling);
        document.getElementById('extrasPlay').onclick = function() {
            var bots = document.querySelectorAll('.msg.bot');
            if (bots.length === 0) { alert('Aucune reponse a lire.'); return; }
            var text = cleanForTTS(bots[bots.length-1].textContent);
            if (!text) return;
            speechSynthesis.cancel();
            var lang = /[\u0600-\u06FF]/.test(text) ? 'ar-SA' : 'fr-FR';
            var utt = new SpeechSynthesisUtterance(text.substring(0, 3000));
            utt.lang = lang;
            var voices = speechSynthesis.getVoices();
            var v = voices.find(function(x) { return x.lang === lang; });
            if (v) utt.voice = v;
            speechSynthesis.speak(utt);
        };
        document.getElementById('extrasPause').onclick = function() {
            if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.pause();
            else if (speechSynthesis.paused) speechSynthesis.resume();
        };
        document.getElementById('extrasStop').onclick = function() { speechSynthesis.cancel(); };
        console.log('[extras-tts] Boutons ajoutes');
    }

    // ========================================================
    // INIT
    // ========================================================
    setTimeout(function() {
        if (checkAuth()) {
            setTimeout(loadHistory, 1000);
        }
        hookSave();
        addTTSButtons();
        setInterval(addTTSButtons, 2000);
        console.log('[chat-extras] Pret.');
    }, 500);

})();