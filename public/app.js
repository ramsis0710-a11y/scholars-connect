const API = '/api';
let TOKEN = localStorage.getItem('token') || '';
let USER = JSON.parse(localStorage.getItem('user') || 'null');

function authHeader() { return TOKEN ? { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }; }

async function apiCall(path, options = {}) {
    const r = await fetch(API + path, {
        ...options,
        headers: { ...authHeader(), ...(options.headers || {}) }
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Erreur ' + r.status);
    return data;
}

function saveSession(token, user) {
    TOKEN = token; USER = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}
function clearSession() {
    TOKEN = ''; USER = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}
function requireLogin() {
    if (!TOKEN) { window.location.href = '/login'; return false; }
    return true;
}
function updateNav() {
    const el = document.getElementById('nav-user');
    if (!el) return;
    if (USER) {
        el.innerHTML = `<span class="muted">${USER.email}</span> <button onclick="logout()">Deconnexion</button>`;
    } else {
        el.innerHTML = `<a href="/login">Connexion</a> <a href="/register">Inscription</a>`;
    }
}
function logout() { clearSession(); window.location.href = '/'; }

// ========== 3. Lecture vocale (voix masculine grave) ==========
function speak(text, lang = 'fr-FR') {
    if (!('speechSynthesis' in window)) {
        alert('Votre navigateur ne supporte pas la synthese vocale.');
        return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.9;
    u.pitch = 0.6;   // Voix grave
    u.volume = 1.0;

    // Chercher une voix masculine
    const voices = speechSynthesis.getVoices();
    const maleVoice = voices.find(v =>
        (v.lang.startsWith(lang.split('-')[0])) &&
        /Thomas|Henri|Paul|Google franÃ§ais|Microsoft Paul|male|homme/i.test(v.name)
    );
    if (maleVoice) u.voice = maleVoice;

    speechSynthesis.speak(u);
}

// ========== 2. Dictee orale ==========
let recognition = null;
let dictationBuffer = '';
let silenceTimer = null;

function startDictation(onResult, onEnd) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Dictee non supportee. Utilisez Chrome ou Edge.'); return null; }
    recognition = new SR();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (ev) => {
        let interim = '', final = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const t = ev.results[i][0].transcript;
            if (ev.results[i].isFinal) final += t + ' ';
            else interim += t;
        }
        if (final) dictationBuffer += final;
        if (onResult) onResult(dictationBuffer + interim);

        // Reset du timer de silence (10 secondes)
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
            if (onEnd) onEnd(dictationBuffer.trim());
        }, 10000);
    };
    recognition.onerror = (e) => console.error('Dictation error', e);
    recognition.onend = () => { if (silenceTimer) clearTimeout(silenceTimer); };
    recognition.start();
    dictationBuffer = '';
    return recognition;
}

function stopDictation() {
    if (recognition) recognition.stop();
    if (silenceTimer) clearTimeout(silenceTimer);
}
