/* auto-read.js - Lecteur vocal SANS répétition, ponctuation respectée */
(function () {
  'use strict';
  if (window.__mbaAutoRead) return;
  window.__mbaAutoRead = true;

  const synth = window.speechSynthesis;
  if (!synth) return;

  const origSpeak = synth.speak.bind(synth);
  const origCancel = synth.cancel.bind(synth);
  const origPause = synth.pause.bind(synth);
  const origResume = synth.resume.bind(synth);

  let historique = [];
  let currentJob = null;
  let currentChunkIndex = 0;
  let isPaused = false;
  let voixChoisie = null;
  let lectureAuto = true;
  let timeTotal = 0;
  let timerSecours = null;
  let forceAction = false;
  let lectureEnCours = false; // VERROU anti-répétition

  let ui = {};

  function nettoyerTexte(t) {
    // FILTRE STRICT : Exclusion des boutons et de la fiche technique
    t = String(t).replace(/🌐?\s*Traduire/gi, '').replace(/🔗?\s*Partager/gi, '');
    var match = String(t).match(/fiche\s+technique/i);
    if (match) t = String(t).substring(0, match.index);
    let s = String(t);
    const match = s.match(/fiche\s+technique/i);
    if (match) s = s.substring(0, match.index);
    s = s.replace(/[""«»]/g, '"')
         .replace(/[‘’]/g, "'")
         .replace(/[--]/g, " - ")
         .replace(/https?:\/\/\S+/g, ' ')
         .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ' ')
         .replace(/[*_`#>~|\[\]{}<>]+/g, ' ')
         .replace(/[ \t\u00A0]+/g, ' ')
         .replace(/ *\n */g, '\n')
         .replace(/\n{2,}/g, '\n')
         .trim();
    return s;
  }

  // Découpage par PHRASES COMPLÈTES (pas par mots), avec ponctuation conservée
  function decouperEnChunks(texte) {
    const MAX = 200; // Plus long = phrases plus naturelles
    const out = [];
    // On découpe par phrases (ponctuation forte ou fin de ligne)
    const phrases = texte.match(/[^.!?…]+[.!?…]+[\s]*|[^.!?…]+$/g) || [texte];
    for (let p of phrases) {
      p = p.trim();
      if (!p) continue;
      if (p.length <= MAX) {
        out.push(p);
      } else {
        // Phrase trop longue : on coupe aux virgules
        const morceaux = p.split(/(?<=[,;:])\s+/);
        let buf = '';
        for (const m of morceaux) {
          if ((buf + ' ' + m).trim().length > MAX) {
            if (buf) out.push(buf.trim());
            buf = m;
          } else {
            buf = buf ? buf + ' ' + m : m;
          }
        }
        if (buf.trim()) out.push(buf.trim());
      }
    }
    return out;
  }

  function choisirVoix(lang) {
    const vs = synth.getVoices() || [];
    const base = lang.slice(0, 2).toLowerCase();
    const candidates = vs.filter(v => String(v.lang || '').toLowerCase().replace('_','-').startsWith(base));
    if (!candidates.length) return null;
    const male = candidates.filter(v => /(male|homme|masculin|david|mark|paul|thomas|pierre|jean|guy|daniel|hamed)/i.test(v.name) && !/(female|femme|feminin)/i.test(v.name));
    const pool = male.length ? male : candidates.filter(v => !/(female|femme|feminin)/i.test(v.name));
    return (pool.length ? pool : candidates)[0];
  }

  function getVoix(lang) {
    if (voixChoisie && voixChoisie.lang.startsWith(lang.slice(0,2))) return voixChoisie;
    voixChoisie = choisirVoix(lang);
    return voixChoisie;
  }

  function arreterLecture() {
    if (timerSecours) clearTimeout(timerSecours);
    forceAction = true;
    try { origCancel(); } catch(e) {}
    forceAction = false;
    currentJob = null; currentChunkIndex = 0; isPaused = false;
    lectureEnCours = false;
    mettreAJourUI();
  }

  function lireChunk(i) {
    if (!currentJob) return;
    if (i >= currentJob.chunks.length) {
      arreterLecture();
      return;
    }
    currentChunkIndex = i;

    const pourcent = Math.floor((i / currentJob.chunks.length) * 100);
    if (ui.slider) ui.slider.value = pourcent;
    const ecoule = Math.floor((pourcent / 100) * timeTotal);
    if (ui.time) ui.time.textContent = formatTime(ecoule) + ' / ' + formatTime(timeTotal);

    const u = new SpeechSynthesisUtterance(currentJob.chunks[i]);
    u.__mba = true;
    u.lang = currentJob.lang;
    const voix = getVoix(currentJob.lang);
    if (voix) u.voice = voix;

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      if (timerSecours) clearTimeout(timerSecours);
      // Petit délai entre phrases pour la respiration (300ms)
      setTimeout(() => {
        if (currentJob === null) return; // a été arrêté
        lireChunk(i + 1);
      }, 300);
    };

    u.onend = go;
    u.onerror = (e) => {
      if (e.error === 'not-allowed') { arreterLecture(); return; }
      go();
    };

    // Timeout de secours large (30s minimum)
    timerSecours = setTimeout(go, Math.max(30000, currentJob.chunks[i].length * 400));
    try { origSpeak(u); } catch(e) { go(); }
  }

  function lireReponse(index) {
    if (lectureEnCours) return; // ANTI-RÉPÉTITION
    arreterLecture();
    if (index < 0 || index >= historique.length) return;
    const item = historique[index];
    const texteNettoye = nettoyerTexte(item.texte);
    if (!texteNettoye) return;
    const chunks = decouperEnChunks(texteNettoye);
    if (!chunks.length) return;

    const mots = texteNettoye.split(/\s+/).length;
    timeTotal = Math.ceil(mots / 3);

    currentJob = { texte: item.texte, chunks, lang: 'fr-FR', voice: null };
    currentChunkIndex = 0; isPaused = false;
    lectureEnCours = true;
    mettreAJourUI();
    lireChunk(0);
  }

  function ajouterReponse(html) {
    const texte = nettoyerTexte(htmlToText(html));
    if (!texte) return;
    const id = Date.now() + Math.random();
    const extrait = texte.substring(0, 50) + '...';
    historique.push({ id, texte, extrait, date: new Date() });
    majSelect();
    if (lectureAuto) {
      setTimeout(() => {
        if (lectureEnCours) return; // ANTI-RÉPÉTITION
        lireReponse(historique.length - 1);
      }, 800);
    }
  }

  function htmlToText(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('script,style,noscript').forEach(el => el.remove());
    return div.textContent || '';
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function majSelect() {
    if (!ui.select) return;
    ui.select.innerHTML = '';
    historique.forEach((item, idx) => {
      const opt = document.createElement('option');
      opt.value = idx; opt.textContent = item.extrait;
      ui.select.appendChild(opt);
    });
    if (historique.length) ui.select.value = historique.length - 1;
  }

  function mettreAJourUI() {
    if (!ui.container) return;
    ui.container.style.display = historique.length ? 'flex' : 'none';
    if (ui.playBtn) ui.playBtn.textContent = isPaused ? '▶' : '⏸';
    if (ui.status) ui.status.textContent = lectureEnCours ? 'Lecture en cours' : 'Prêt';
    const hasHistory = historique.length > 0;
    if (ui.select) ui.select.disabled = !hasHistory;
    if (ui.playBtn) ui.playBtn.disabled = !currentJob;
    if (ui.stopBtn) ui.stopBtn.disabled = !currentJob;
    if (ui.prevBtn) ui.prevBtn.disabled = !hasHistory;
    if (ui.nextBtn) ui.nextBtn.disabled = !hasHistory;
  }

  function construireUI() {
    const style = document.createElement('style');
    style.textContent = `
      #mba-player { position: fixed; right: 18px; top: 80px; z-index: 99998; background: rgba(20,20,20,0.95); color: #fff; padding: 12px; border-radius: 12px; width: 300px; box-shadow: 0 4px 16px rgba(0,0,0,0.6); font-family: system-ui, Arial, sans-serif; display: none; flex-direction: column; gap: 8px; }
      #mba-player select { width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #444; background: #222; color: #fff; font-size: 13px; }
      #mba-player .mba-row { display: flex; align-items: center; gap: 8px; }
      #mba-player input[type=range] { flex: 1; cursor: pointer; accent-color: #F5B800; height: 6px; }
      #mba-player .mba-time { font-size: 12px; color: #ccc; min-width: 70px; text-align: right; }
      #mba-player .mba-controls { display: flex; gap: 8px; justify-content: center; }
      #mba-player button { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #F5B800; background: #111; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: background 0.2s; }
      #mba-player button:hover:not(:disabled) { background: #333; }
      #mba-player button:disabled { opacity: 0.3; cursor: not-allowed; }
      #mba-player .mba-status { font-size: 11px; color: #aaa; text-align: center; }
      #mba-player label { font-size: 12px; display: flex; align-items: center; gap: 4px; cursor: pointer; }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div'); container.id = 'mba-player';

    const select = document.createElement('select');
    select.addEventListener('change', () => { const idx = parseInt(select.value, 10); if (!isNaN(idx)) lireReponse(idx); });

    const row = document.createElement('div'); row.className = 'mba-row';
    const slider = document.createElement('input'); slider.type = 'range'; slider.min = 0; slider.max = 100; slider.value = 0;
    slider.addEventListener('input', () => {
      if (!currentJob) return;
      const pourcent = parseInt(slider.value, 10);
      const idx = Math.floor((pourcent / 100) * currentJob.chunks.length);
      if (idx >= 0 && idx < currentJob.chunks.length) {
        forceAction = true; try { origCancel(); } catch(e) {} forceAction = false;
        setTimeout(() => lireChunk(idx), 100);
      }
    });
    const timeLabel = document.createElement('span'); timeLabel.className = 'mba-time'; timeLabel.textContent = '0:00 / 0:00';
    row.appendChild(slider); row.appendChild(timeLabel);

    const controls = document.createElement('div'); controls.className = 'mba-controls';
    const prevBtn = document.createElement('button'); prevBtn.textContent = '⏮';
    prevBtn.addEventListener('click', () => { const idx = parseInt(select.value, 10); if (idx > 0) { select.value = idx - 1; lectureEnCours = false; lireReponse(idx - 1); } });
    
    const playBtn = document.createElement('button'); playBtn.textContent = '⏸';
    playBtn.addEventListener('click', () => {
      if (!currentJob) return;
      forceAction = true;
      if (isPaused) { isPaused = false; origResume(); playBtn.textContent = '⏸'; }
      else { isPaused = true; origPause(); playBtn.textContent = '▶'; }
      forceAction = false;
    });

    const stopBtn = document.createElement('button'); stopBtn.textContent = '⏹';
    stopBtn.addEventListener('click', arreterLecture);

    const nextBtn = document.createElement('button'); nextBtn.textContent = '⏭';
    nextBtn.addEventListener('click', () => { const idx = parseInt(select.value, 10); if (idx < historique.length - 1) { select.value = idx + 1; lectureEnCours = false; lireReponse(idx + 1); } });

    controls.appendChild(prevBtn); controls.appendChild(playBtn); controls.appendChild(stopBtn); controls.appendChild(nextBtn);

    const status = document.createElement('div'); status.className = 'mba-status'; status.textContent = 'Prêt';

    const labelAuto = document.createElement('label');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = lectureAuto;
    checkbox.addEventListener('change', () => { lectureAuto = checkbox.checked; });
    labelAuto.appendChild(checkbox);
    labelAuto.appendChild(document.createTextNode(' Lecture auto'));

    container.appendChild(select); container.appendChild(row); container.appendChild(controls); container.appendChild(status); container.appendChild(labelAuto);
    document.body.appendChild(container);

    ui = { container, select, slider, time: timeLabel, playBtn, stopBtn, prevBtn, nextBtn, status };
    majSelect();
    mettreAJourUI();
  }

  function intercepterReponses() {
    const urlPattern = /\/api\/(ask|analyze-content)(\?|$)/;
    if (window.fetch) {
      const origFetch = window.fetch;
      window.fetch = function(input) {
        const p = origFetch.apply(this, arguments);
        try {
          const url = typeof input === 'string' ? input : (input && input.url) || '';
          if (urlPattern.test(url)) {
            p.then(res => { try { res.clone().json().then(data => { if (data && typeof data.answer === 'string') ajouterReponse(data.answer); }).catch(()=>{}); } catch(e) {} }).catch(()=>{});
          }
        } catch(e) {}
        return p;
      };
    }
    if (window.XMLHttpRequest) {
      const origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        try {
          if (urlPattern.test(String(url))) {
            this.addEventListener('load', function() {
              try { const data = JSON.parse(this.responseText); if (data && typeof data.answer === 'string') ajouterReponse(data.answer); } catch(e) {}
            });
          }
        } catch(e) {}
        return origOpen.apply(this, arguments);
      };
    }
  }

  function surchargerSynthese() {
    synth.speak = function(u) {
      try {
        if (!u || u.__mba) return origSpeak(u);
        if (lectureEnCours) return; // ANTI-RÉPÉTITION
        const texte = String(u.text || '');
        if (texte.length > 10) ajouterReponse(texte);
      } catch(e) { return origSpeak(u); }
    };
    synth.cancel = function() {
      if (forceAction) { origCancel(); return; }
      if (currentJob) arreterLecture(); else origCancel();
    };
  }

  function init() {
    construireUI();
    intercepterReponses();
    surchargerSynthese();
    document.addEventListener('pointerdown', function unlock() {
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.__mba = true; origSpeak(u); } catch(e) {}
      document.removeEventListener('pointerdown', unlock);
    }, { once: true, capture: true });
    synth.onvoiceschanged = () => { voixChoisie = null; getVoix('fr-FR'); };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();