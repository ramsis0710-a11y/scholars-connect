// ============================================================
// VOICE-ENHANCER.JS - v4.0
// Auto-detection AR/FR parallele + historique persistant
// NE TOUCHE PAS au backend (answer-enricher.js intact)
// ============================================================
(function() {
    console.log('[voice-enhancer] v4.0 - Auto-detection parallele AR/FR + historique');

    const API_BASE = 'https://scholars-connect-app.onrender.com';
    const STORAGE_KEY = 'scholars_chat_history';
    const LANG_STORAGE = 'scholars_last_lang';

    // ============================================================
    // UTILITAIRES
    // ============================================================
    function getToken() {
        try { return localStorage.getItem('token') || ''; } catch (e) { return ''; }
    }
    function getChatContainer() { return document.getElementById('chatMessages'); }
    function getInput() { return document.getElementById('chatInput'); }
    function getSendBtn() { return document.getElementById('btnSend'); }
    function getMicBtn() { return document.getElementById('micBtn'); }

    function addMsgToDOM(role, text) {
        const container = getChatContainer();
        if (!container) return null;
        const div = document.createElement('div');
        div.className = 'msg ' + role;
        if (text && text.indexOf('<') !== -1 && text.indexOf('>') !== -1) {
            div.innerHTML = text;
        } else {
            div.textContent = text;
        }
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    }

    // ============================================================
    // HISTORIQUE : LOCALSTORAGE + API
    // ============================================================
    function saveMessageToLocal(role, text) {
        try {
            let hist = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            hist.push({ role: role, text: text, ts: Date.now() });
            if (hist.length > 200) hist = hist.slice(-200);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
        } catch (e) { console.warn('[voice-enhancer] localStorage save err', e); }
    }

    function loadFromLocal() {
        try {
            const hist = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            if (hist.length === 0) return false;
            const container = getChatContainer();
            if (!container) return false;
            // Vider la zone sauf le message de bienvenue
            container.innerHTML = '';
            hist.forEach(m => addMsgToDOM(m.role, m.text));
            console.log('[voice-enhancer] ' + hist.length + ' messages restaurés depuis localStorage');
            return true;
        } catch (e) { return false; }
    }

    async function loadFromAPI() {
        const token = getToken();
        if (!token) return false;
        try {
            const res = await fetch(API_BASE + '/api/history', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) return false;
            const data = await res.json();
            if (!data.items || data.items.length === 0) return false;
            const container = getChatContainer();
            if (!container) return false;
            // Merge : afficher les items API (du plus ancien au plus récent)
            const items = data.items.slice().reverse();
            items.forEach(item => {
                if (item.question) {
                    addMsgToDOM('user', item.question);
                    saveMessageToLocal('user', item.question);
                }
                if (item.answer) {
                    addMsgToDOM('bot', item.answer);
                    saveMessageToLocal('bot', item.answer);
                }
            });
            console.log('[voice-enhancer] ' + items.length + ' échanges restaurés depuis /api/history');
            return true;
        } catch (e) {
            console.warn('[voice-enhancer] history API err', e);
            return false;
        }
    }

    async function initHistory() {
        const container = getChatContainer();
        if (!container) return;
        // 1. Charger local d'abord (instantané)
        const hasLocal = loadFromLocal();
        // 2. Enrichir avec l'API en arrière-plan
        if (!hasLocal) {
            await loadFromAPI();
        } else {
            loadFromAPI().catch(() => {});
        }
    }

    // Hook : sauvegarder chaque message dès qu'il est ajouté au DOM
    function hookMessageSave() {
        const container = getChatContainer();
        if (!container || container.dataset.saveHooked) return;
        container.dataset.saveHooked = 'true';
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('msg')) {
                        // Éviter de re-sauvegarder les messages chargés depuis localStorage
                        if (node.dataset.loaded) return;
                        const role = node.classList.contains('user') ? 'user' : 'bot';
                        const text = node.innerText || node.textContent || '';
                        if (text.trim()) saveMessageToLocal(role, text);
                    }
                });
            });
        });
        observer.observe(container, { childList: true, subtree: false });
    }

    // ============================================================
    // AUTO-DÉTECTION ARABE : DOUBLE RECONNAISSANCE PARALLÈLE
    // ============================================================
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        const state = {
            recording: false,
            recAr: null,
            recFr: null,
            transcriptAr: '',
            transcriptFr: '',
            silenceTimer: null,
            finalTranscript: '',
            selectedLang: 'auto'
        };

        function stopAllRecognition() {
            try { if (state.recAr) state.recAr.stop(); } catch (e) {}
            try { if (state.recFr) state.recFr.stop(); } catch (e) {}
        }

        function computeArabicScore(text) {
            const m = (text || '').match(/[\u0600-\u06FF]/g);
            return m ? m.length : 0;
        }
        function computeLatinScore(text) {
            const m = (text || '').match(/[a-zA-Z]/g);
            return m ? m.length : 0;
        }

        function finishRecognition() {
            if (!state.recording) return;
            state.recording = false;
            stopAllRecognition();

            // Comparer les deux transcriptions
            const arLen = computeArabicScore(state.transcriptAr);
            const frLen = computeLatinScore(state.transcriptFr);
            console.log('[voice-enhancer] Scores : AR=' + arLen + ' | FR=' + frLen);

            let winner = '';
            let winnerLang = '';
            if (arLen > frLen && arLen > 5) {
                winner = state.transcriptAr.trim();
                winnerLang = 'ar-SA';
            } else if (frLen > arLen && frLen > 5) {
                winner = state.transcriptFr.trim();
                winnerLang = 'fr-FR';
            } else if (state.transcriptAr.trim().length > state.transcriptFr.trim().length) {
                winner = state.transcriptAr.trim();
                winnerLang = 'ar-SA';
            } else {
                winner = state.transcriptFr.trim();
                winnerLang = 'fr-FR';
            }

            const input = getInput();
            if (input && winner) {
                input.value = winner;
                localStorage.setItem(LANG_STORAGE, winnerLang);
                console.log('[voice-enhancer] Langue gagnante : ' + winnerLang + ' | "' + winner.slice(0, 80) + '"');
            }

            const mb = getMicBtn();
            if (mb) { mb.style.background = '#dc2626'; mb.innerHTML = '🎤'; }

            if (winner && winner.length > 2) {
                const ok = confirm('📝 Dictée terminée :\n\n"' + winner + '"\n\nEnvoyer ?');
                if (ok) {
                    const btn = getSendBtn();
                    if (btn) btn.click();
                }
            }
        }

        function startSingle(lang) {
            const rec = new SpeechRecognition();
            rec.lang = lang;
            rec.continuous = true;
            rec.interimResults = true;

            rec.onresult = (event) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const t = event.results[i][0].transcript;
                    if (event.results[i].isFinal) final += t + ' ';
                    else interim += t;
                }
                if (lang === 'ar-SA') state.transcriptAr = (state.transcriptAr + ' ' + final).trim();
                else state.transcriptFr = (state.transcriptFr + ' ' + final).trim();

                // Afficher le meilleur provisoire
                const inp = getInput();
                if (inp) {
                    const arLen = computeArabicScore(state.transcriptAr);
                    const frLen = computeLatinScore(state.transcriptFr);
                    inp.value = (arLen >= frLen ? state.transcriptAr : state.transcriptFr) + ' ' + interim;
                }

                clearTimeout(state.silenceTimer);
                state.silenceTimer = setTimeout(finishRecognition, 4000); // 4 sec de silence
            };
            rec.onerror = (e) => {
                console.warn('[voice-enhancer] ' + lang + ' err :', e.error);
                // Si l'un échoue, on continue avec l'autre
            };
            return rec;
        }

        function startDual() {
            state.transcriptAr = '';
            state.transcriptFr = '';
            state.recAr = startSingle('ar-SA');
            state.recFr = startSingle('fr-FR');
            try { state.recAr.start(); } catch (e) { console.warn('recAr start', e); }
            setTimeout(() => { try { state.recFr.start(); } catch (e) { console.warn('recFr start', e); } }, 100);
            state.recording = true;
            const mb = getMicBtn();
            if (mb) { mb.style.background = '#16a34a'; mb.innerHTML = '⏹'; }
            console.log('[voice-enhancer] Double reconnaissance DÉMARRÉE (ar-SA + fr-FR)');
        }

        function startManual(lang) {
            state.transcriptAr = '';
            state.transcriptFr = '';
            const rec = startSingle(lang);
            if (lang === 'ar-SA') state.recAr = rec;
            else state.recFr = rec;
            try { rec.start(); } catch (e) { console.warn('start', e); }
            state.recording = true;
            const mb = getMicBtn();
            if (mb) { mb.style.background = '#16a34a'; mb.innerHTML = '⏹'; }
            console.log('[voice-enhancer] Reconnaissance DÉMARRÉE en ' + lang);
        }

        // Détecter le sélecteur de langue (créé par ancien script ou à créer)
        function ensureLanguageSelector() {
            if (document.getElementById('dictationLangSelect')) return;
            const mb = getMicBtn();
            if (!mb) return;
            const sel = document.createElement('select');
            sel.id = 'dictationLangSelect';
            sel.style.cssText = 'margin-left:8px;padding:6px;border-radius:6px;border:1px solid #cbd5e1;font-size:12px;background:white;cursor:pointer;';
            sel.innerHTML = '<option value="auto" selected>🌐 Auto (AR+FR)</option>' +
                            '<option value="ar-SA">🇸🇦 Arabe</option>' +
                            '<option value="fr-FR">🇫🇷 Français</option>' +
                            '<option value="en-US">🇬🇧 Anglais</option>';
            mb.parentNode.insertBefore(sel, mb.nextSibling);
            sel.addEventListener('change', () => {
                state.selectedLang = sel.value;
            });
        }
        setInterval(ensureLanguageSelector, 1000);

        // Hook du bouton micro
        function hookMic() {
            const mb = getMicBtn();
            if (!mb || mb.dataset.v4hooked) return;
            mb.dataset.v4hooked = 'true';
            mb.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (state.recording) { finishRecognition(); return; }
                const sel = document.getElementById('dictationLangSelect');
                const lang = sel ? sel.value : 'auto';
                if (lang === 'auto') startDual();
                else startManual(lang);
            });
        }
        setInterval(hookMic, 500);
    } else {
        console.warn('[voice-enhancer] SpeechRecognition non supporté');
    }

    // ============================================================
    // INITIALISATION
    // ============================================================
    // Attendre que le DOM soit prêt
    function init() {
        hookMessageSave();
        initHistory();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }

    // Retry pour être sûr (si le chat est injecté plus tard)
    setTimeout(init, 3000);

    console.log('[voice-enhancer] v4.0 prêt.');
})();