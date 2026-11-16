/* auto-read.js - Lecteur natif, Timeline, Boutons, Export PDF individuel (Fix) */
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
  let lectureEnCours = false;

  if (!localStorage.getItem('sc_login_time')) {
      localStorage.setItem('sc_login_time', new Date().toISOString());
  }
  let sessionStartTime = localStorage.getItem('sc_login_time');
  let ui = {};

  if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      document.head.appendChild(script);
  }

  function detecterLangue(texte) {
      if (/[\u0600-\u06FF]/.test(texte)) return 'ar-SA';
      if (/[\u4E00-\u9FFF]/.test(texte)) return 'zh-CN';
      if (/[\u0400-\u04FF]/.test(texte)) return 'ru-RU';
      if (/[\u3040-\u30FF]/.test(texte)) return 'ja-JP';
      if (/[\uAC00-\uD7AF]/.test(texte)) return 'ko-KR';
      if (/[\u0900-\u097F]/.test(texte)) return 'hi-IN';
      if (/[\u0590-\u05FF]/.test(texte)) return 'he-IL';
      if (/[\u0370-\u03FF]/.test(texte)) return 'el-GR';
      if (/[\u0E00-\u0E7F]/.test(texte)) return 'th-TH';
      return 'fr-FR';
  }

  function nettoyerTexte(t) {
    let s = String(t);
    s = s.replace(/🌐?\s*Traduire/gi, '').replace(/🔗?\s*Partager/gi, '');
    const match = s.match(/fiche\s+technique/i);
    if (match) s = s.substring(0, match.index);
    s = s.replace(/[“”«»]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, " - ")
         .replace(/https?:\/\/\S+/g, ' ').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ' ')
         .replace(/[*_`#>~|\[\]{}<>]+/g, ' ').replace(/[ \t\u00A0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
    return s;
  }

  function decouperEnChunks(texte) {
    const MAX = 200;
    const out = [];
    const phrases = texte.match(/[^.!?…]+[.!?…]+[\s]*|[^.!?…]+$/g) || [texte];
    for (let p of phrases) {
      p = p.trim(); if (!p) continue;
      if (p.length <= MAX) { out.push(p); } 
      else {
        const morceaux = p.split(/(?<=[,;:])\s+/);
        let buf = '';
        for (const m of morceaux) {
          if ((buf + ' ' + m).trim().length > MAX) { if (buf) out.push(buf.trim()); buf = m; } 
          else { buf = buf ? buf + ' ' + m : m; }
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
    return candidates[0];
  }

  function getVoix(lang) {
    if (voixChoisie && voixChoisie.lang.startsWith(lang.slice(0,2))) return voixChoisie;
    voixChoisie = choisirVoix(lang);
    return voixChoisie;
  }

  function arreterLecture() {
    if (timerSecours) clearTimeout(timerSecours);
    forceAction = true; try { origCancel(); } catch(e) {} forceAction = false;
    currentJob = null; currentChunkIndex = 0; isPaused = false; lectureEnCours = false;
    mettreAJourUI();
  }

  function lireChunk(i) {
    if (!currentJob) return;
    if (i >= currentJob.chunks.length) { arreterLecture(); return; }
    currentChunkIndex = i;

    const pourcent = Math.floor((i / currentJob.chunks.length) * 100);
    if (ui.slider) ui.slider.value = pourcent;
    const ecoule = Math.floor((pourcent / 100) * timeTotal);
    if (ui.time) ui.time.textContent = formatTime(ecoule) + ' / ' + formatTime(timeTotal);

    const u = new SpeechSynthesisUtterance(currentJob.chunks[i]);
    u.__mba = true; u.lang = currentJob.lang;
    const voix = getVoix(currentJob.lang);
    if (voix) u.voice = voix;

    let done = false;
    const go = () => {
      if (done) return; done = true;
      if (timerSecours) clearTimeout(timerSecours);
      setTimeout(() => { if (currentJob === null) return; lireChunk(i + 1); }, 300);
    };

    u.onend = go;
    u.onerror = (e) => { if (e.error !== 'not-allowed') go(); };
    timerSecours = setTimeout(go, Math.max(30000, currentJob.chunks[i].length * 400));
    try { origSpeak(u); } catch(e) { go(); }
  }

  function lireReponse(index) {
    arreterLecture();
    if (index < 0 || index >= historique.length) return;
    const item = historique[index];
    const texteNettoye = nettoyerTexte(item.texte);
    if (!texteNettoye) return;
    const chunks = decouperEnChunks(texteNettoye);
    if (!chunks.length) return;

    timeTotal = Math.ceil(texteNettoye.split(/\s+/).length / 3);
    const langueDetectee = detecterLangue(texteNettoye);
    currentJob = { texte: item.texte, chunks, lang: langueDetectee, voice: null };
    currentChunkIndex = 0; isPaused = false; lectureEnCours = true;
    mettreAJourUI();
    lireChunk(0);
  }

  function lireTexteDirect(txt) {
    arreterLecture();
    const texteNettoye = nettoyerTexte(txt);
    if (!texteNettoye) return;
    const chunks = decouperEnChunks(texteNettoye);
    if (!chunks.length) return;

    timeTotal = Math.ceil(texteNettoye.split(/\s+/).length / 3);
    const langueDetectee = detecterLangue(texteNettoye);
    currentJob = { texte: txt, chunks, lang: langueDetectee, voice: null };
    currentChunkIndex = 0; isPaused = false; lectureEnCours = true;
    mettreAJourUI();
    lireChunk(0);
  }

  function ajouterReponse(html) {
    const texte = nettoyerTexte(htmlToText(html));
    if (!texte) return;
    historique.push({ id: Date.now() + Math.random(), texte, extrait: texte.substring(0, 50) + '...', date: new Date() });
    majSelect();
    if (lectureAuto) setTimeout(() => { if (!lectureEnCours) lireReponse(historique.length - 1); }, 800);
  }

  function htmlToText(html) {
    const div = document.createElement('div'); div.innerHTML = html;
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
    ui.container.style.display = 'flex';
    if (ui.playBtn) ui.playBtn.textContent = isPaused ? '▶' : '⏸';
    if (ui.status) ui.status.textContent = lectureEnCours ? 'Lecture' : 'Prêt';
    const hasHistory = historique.length > 0;
    if (ui.select) ui.select.disabled = !hasHistory;
    if (ui.playBtn) ui.playBtn.disabled = !currentJob;
    if (ui.stopBtn) ui.stopBtn.disabled = !currentJob;
    if (ui.prevBtn) ui.prevBtn.disabled = !hasHistory;
    if (ui.nextBtn) ui.nextBtn.disabled = !hasHistory;
  }

  // --- GENERATION PDF POUR UNE SEULE REPONSE ---
  function genererPDFQuestion(botNode) {
      if (!window.html2pdf) { alert("Chargement du PDF..."); return; }

      let userNode = botNode.previousElementSibling;
      while (userNode && !userNode.classList.contains('user')) { userNode = userNode.previousElementSibling; }
      
      const userClone = userNode ? userNode.cloneNode(true) : null;
      const botClone = botNode.cloneNode(true);
      
      const ctrls = botClone.querySelector('.mba-bubble-controls');
      if (ctrls) ctrls.remove();

      const userText = userClone ? userClone.innerHTML : "Question non trouvée";
      const botText = botClone.innerHTML;

      let email = "Utilisateur inconnu";
      try {
          const token = localStorage.getItem('token');
          if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              email = payload.email || payload.name || email;
          }
      } catch(e) {}
      
      const dateAcces = new Date(sessionStartTime).toLocaleString('fr-FR');
      const dateSortie = new Date().toLocaleString('fr-FR');

      // 1. Écran de chargement
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 9999999; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-family: sans-serif; font-weight: bold;';
      overlay.textContent = 'Génération du PDF en cours...';
      document.body.appendChild(overlay);

      // 2. Conteneur PDF (visible dans le DOM, mais caché par l'overlay)
      const container = document.createElement('div');
      container.style.cssText = 'position: absolute; top: 0; left: 0; width: 800px; background: white; padding: 40px; font-family: Arial, sans-serif; z-index: 9999998;';
      
      container.innerHTML = `
            <div style="page-break-after: always; text-align: center; padding-top: 100px; min-height: 1000px;">
                <h1 style="color: #0a2540; font-size: 32px; margin-bottom: 10px;">Scholars Connect</h1>
                <h2 style="color: #1e5aa8; font-size: 24px; margin-bottom: 40px;">Rapport de Session</h2>
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 30px; display: inline-block; text-align: left; width: 80%;">
                    <p><strong>Utilisateur :</strong> ${email}</p>
                    <p><strong>Date d'accès :</strong> ${dateAcces}</p>
                    <p><strong>Date d'extraction :</strong> ${dateSortie}</p>
                </div>
            </div>
            
            <div style="padding-top: 20px;">
                <h2 style="color: #0a2540; border-bottom: 2px solid #1e5aa8; padding-bottom: 10px; margin-bottom: 20px;">Détail de l'échange</h2>
                
                <div style="margin-bottom: 30px;">
                    <h4 style="margin: 0 0 10px 0; color: #1e5aa8; font-size: 16px;">Question (Utilisateur) :</h4>
                    <div style="background: #e0f2fe; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.5;">
                        ${userText}
                    </div>
                </div>

                <div style="margin-bottom: 30px;">
                    <h4 style="margin: 0 0 10px 0; color: #1e5aa8; font-size: 16px;">Réponse (Scholars Connect IA) :</h4>
                    <div style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.5;">
                        ${botText}
                    </div>
                </div>
            </div>
      `;
      
      document.body.appendChild(container);

      const opt = {
          margin:       10,
          filename:     `Scholars_Connect_${new Date().toISOString().slice(0,10)}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      window.html2pdf().set(opt).from(container).save().then(() => {
          document.body.removeChild(container);
          document.body.removeChild(overlay);
      }).catch(err => {
          console.error(err);
          document.body.removeChild(container);
          document.body.removeChild(overlay);
          alert("Erreur lors de la génération du PDF.");
      });
  }

  function injecterBoutonsMessage(node) {
    if (node.querySelector('.mba-bubble-controls')) return;
    if (node.textContent.includes("Bonjour ! Posez-moi n'importe quelle question")) return;

    const div = document.createElement('div');
    div.className = 'mba-bubble-controls';
    div.style.cssText = 'margin-top: 10px; display: flex; gap: 8px; align-items: center; border-top: 1px solid #e5e7eb; padding-top: 8px; flex-wrap: wrap;';
    
    const btnPlay = document.createElement('button');
    btnPlay.innerHTML = '▶ Lire';
    btnPlay.style.cssText = 'background: transparent; color: #0a2540; border: 1px solid #0a2540; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;';
    btnPlay.onclick = (e) => {
        e.stopPropagation();
        const clone = node.cloneNode(true);
        const ctrls = clone.querySelector('.mba-bubble-controls');
        if (ctrls) ctrls.remove();
        lireTexteDirect(clone.textContent.trim());
    };
    
    const btnPause = document.createElement('button');
    btnPause.innerHTML = '⏸ Pause';
    btnPause.style.cssText = 'background: transparent; color: #d97706; border: 1px solid #d97706; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;';
    btnPause.onclick = (e) => {
        e.stopPropagation();
        if (!currentJob) return;
        forceAction = true;
        if (isPaused) { isPaused = false; origResume(); } else { isPaused = true; origPause(); }
        forceAction = false;
        mettreAJourUI();
    };

    const btnStop = document.createElement('button');
    btnStop.innerHTML = '⏹ Arrêter';
    btnStop.style.cssText = 'background: transparent; color: #dc2626; border: 1px solid #dc2626; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;';
    btnStop.onclick = (e) => {
        e.stopPropagation();
        arreterLecture();
    };

    const btnPDF = document.createElement('button');
    btnPDF.innerHTML = '📄 PDF';
    btnPDF.style.cssText = 'background: transparent; color: #4f46e5; border: 1px solid #4f46e5; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;';
    btnPDF.onclick = (e) => {
        e.stopPropagation();
        genererPDFQuestion(node);
    };
    
    div.appendChild(btnPlay); div.appendChild(btnPause); div.appendChild(btnStop); div.appendChild(btnPDF);
    node.appendChild(div);
  }

  function observerMessages() {
    const c = document.getElementById('chatMessages');
    if (!c) { setTimeout(observerMessages, 1000); return; }
    new MutationObserver(muts => {
        muts.forEach(m => m.addedNodes.forEach(n => {
            if (n.nodeType === 1 && n.classList.contains('msg') && n.classList.contains('bot')) {
                injecterBoutonsMessage(n);
            }
        }));
    }).observe(c, { childList: true, subtree: true });
  }

  // --- UI FLOTTANTE (TIMELINE) ---
  function construireUI() {
    const style = document.createElement('style');
    style.textContent = `
      #mba-player { position: fixed; right: 18px; top: 80px; z-index: 99998; background: rgba(20,20,20,0.95); color: #fff; padding: 12px; border-radius: 12px; width: 300px; box-shadow: 0 4px 16px rgba(0,0,0,0.6); font-family: system-ui, Arial, sans-serif; display: flex; flex-direction: column; gap: 8px; }
      #mba-player select { width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #444; background: #222; color: #fff; font-size: 13px; }
      #mba-player .mba-row { display: flex; align-items: center; gap: 8px; }
      #mba-player input[type=range] { flex: 1; cursor: pointer; accent-color: #F5B800; height: 6px; }
      #mba-player .mba-time { font-size: 12px; color: #ccc; min-width: 70px; text-align: right; }
      #mba-player .mba-controls { display: flex; gap: 8px; justify-content: center; }
      #mba-player button { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #F5B800; background: #111; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
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
    prevBtn.addEventListener('click', () => { const idx = parseInt(select.value, 10); if (idx > 0) { select.value = idx - 1; lireReponse(idx - 1); } });
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
    nextBtn.addEventListener('click', () => { const idx = parseInt(select.value, 10); if (idx < historique.length - 1) { select.value = idx + 1; lireReponse(idx + 1); } });
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
    majSelect(); mettreAJourUI();
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
  }

  function init() {
    construireUI();
    intercepterReponses();
    observerMessages();
    document.addEventListener('pointerdown', function unlock() {
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.__mba = true; origSpeak(u); } catch(e) {}
      document.removeEventListener('pointerdown', unlock);
    }, { once: true, capture: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();