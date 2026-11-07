/* VOICE-NATIVE.JS v2 - voix native masculine, interception de speechSynthesis, 30 langues */
(function () {
  'use strict';
  if (window.__scVoiceNative) return;
  window.__scVoiceNative = true;
  if (!('speechSynthesis' in window)) { console.warn('[sc-voice] synthese vocale non supportee'); return; }
  var ss = window.speechSynthesis;

  var SC_LANGS = { ar: 'ar-SA', fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', tr: 'tr-TR', fa: 'fa-IR', ur: 'ur-PK', hi: 'hi-IN', he: 'he-IL', nl: 'nl-NL', pl: 'pl-PL', el: 'el-GR', vi: 'vi-VN', th: 'th-TH', id: 'id-ID', sv: 'sv-SE', uk: 'uk-UA', ro: 'ro-RO', cs: 'cs-CZ', hu: 'hu-HU', bn: 'bn-BD', ms: 'ms-MY', sw: 'sw-KE' };
  var SC_NAMES = { ar: 'Arabe', fr: 'Francais', en: 'English', es: 'Espanol', de: 'Deutsch', it: 'Italiano', pt: 'Portugues', ru: 'Russe', zh: 'Chinois', ja: 'Japonais', ko: 'Coreen', tr: 'Turc', fa: 'Persan', ur: 'Ourdou', hi: 'Hindi', he: 'Hebreu', nl: 'Neerlandais', pl: 'Polonais', el: 'Grec', vi: 'Vietnamien', th: 'Thai', id: 'Indonesien', sv: 'Suedois', uk: 'Ukrainien', ro: 'Roumain', cs: 'Tcheque', hu: 'Hongrois', bn: 'Bengali', ms: 'Malais', sw: 'Swahili' };
  window.SC_LANGS_MAP = SC_LANGS;

  var STOP = {
    fr: 'le la les des du une est pour dans avec sur que qui pas cette sont nous vous il elle au aux et ou mais ce ces ne se son sa ses',
    en: 'the is are and of to in that for with on this it as be by from was were have has not you your will can',
    es: 'el los las del que para con por una como esta son pero mas muy su sus se al es lo un',
    de: 'der die das und ist nicht mit auf von zu den dem ein eine fur sich auch wie sind wird',
    it: 'il lo gli che per con una non sono della delle degli nel nella piu come anche di e un',
    pt: 'os as uma para com nao sao mais como seu sua dos das nos pelo pela voce em um',
    nl: 'de het een en van is dat niet met voor zijn op te ook maar als dit er',
    pl: 'nie jest sie na do ze to jak czy ale oraz przez dla tak',
    tr: 've bir bu icin ile de da ne olarak daha cok gibi ama veya mi',
    id: 'yang dan di ini itu untuk dengan tidak dari pada adalah akan atau ke',
    ro: 'si este sunt pentru cu nu mai din care ca la un o ce',
    sv: 'och att det som en ar av for med inte pa den',
    cs: 'je se na to ze si jsou pro ale jako byl',
    hu: 'hogy nem egy az is van meg de volt',
    vi: 'va la cua cho mot nhung duoc trong khong cac'
  };
  var STOPSET = {};
  Object.keys(STOP).forEach(function (k) { var o = {}; STOP[k].split(' ').forEach(function (w) { o[w] = 1; }); STOPSET[k] = o; });

  function scDetect(text) {
    var t = String(text || '').trim();
    if (!t) return '';
    if (/[\u0600-\u06FF]/.test(t)) {
      if (/[\u067E\u0686\u0698\u06AF]/.test(t)) return 'fa-IR';
      if (/[\u0679\u0688\u0691\u06BA\u06D2\u06BE]/.test(t)) return 'ur-PK';
      return 'ar-SA';
    }
    if (/[\u0590-\u05FF]/.test(t)) return 'he-IL';
    if (/[\u3040-\u30FF]/.test(t)) return 'ja-JP';
    if (/[\uAC00-\uD7AF]/.test(t)) return 'ko-KR';
    if (/[\u4E00-\u9FFF]/.test(t)) return 'zh-CN';
    if (/[\u0400-\u04FF]/.test(t)) return /[\u0456\u0457\u0454\u0491]/.test(t) ? 'uk-UA' : 'ru-RU';
    if (/[\u0900-\u097F]/.test(t)) return 'hi-IN';
    if (/[\u0980-\u09FF]/.test(t)) return 'bn-BD';
    if (/[\u0E00-\u0E7F]/.test(t)) return 'th-TH';
    if (/[\u0370-\u03FF]/.test(t)) return 'el-GR';
    var words = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, ' ').split(/\s+/);
    var best = '', bestN = 0;
    Object.keys(STOPSET).forEach(function (k) {
      var n = 0;
      for (var i = 0; i < words.length; i++) if (STOPSET[k][words[i]]) n++;
      if (n > bestN) { bestN = n; best = k; }
    });
    if (bestN >= 1) return SC_LANGS[best];
    if (/[\u1EA0-\u1EF9\u01A1\u01B0\u0111]/.test(t)) return 'vi-VN';
    return '';
  }

  var MALE = /\b(Thomas|Henri|Paul|Guillaume|Yannick|Antoine|Remy|Mathieu|Nicolas|Bernard|Hamed|Naayf|Majed|Maged|Shakir|Salem|Fahed|Hamdan|Taim|Omar|Tarik|David|Mark|James|George|Daniel|Guy|Christopher|Eric|Davis|Jason|Tony|Andrew|Brian|Ryan|Roger|Alvaro|Pablo|Jorge|Raul|Alonso|Diego|Juan|Carlos|Stefan|Conrad|Killian|Florian|Jonas|Hans|Klaus|Cosimo|Luca|Marco|Giuseppe|Benigno|Antonio|Fabio|Donato|Felipe|Ricardo|Valerio|Pavel|Dmitry|Dmitri|Yuri|Kangkang|Yunyang|Yunxi|Yunjian|Liang|Wanlung|Ichiro|Keita|Hattori|Naoki|Takumi|InJoon|Bongjin|Gookmin|Tolga|Emre|Ahmet|Hemant|Ravi|Amit|Madhur|Prabhat|Asaf|Avri|Frank|Maarten|Xander|Marek|Krzysztof|Stefanos|Nikos|Nestoras|Pattara|Niwat|Andika|Ardi|Farid|Reza|Amir|Asad|Salman|Gul|Mattias|Oskar|Emil|Antonin|Tamas|Alexandru|Male|Masculin|Hombre|Maschio)\b/i;
  var FEMALE = /\b(Female|Femme|Mujer|Hortense|Julie|Denise|Eloise|Elsa|Zira|Hazel|Susan|Aria|Jenny|Michelle|Salma|Zariyah|Hoda|Laura|Helena|Katja|Hedda|Elvira|Dalia|Heami|Sunhi|Nanami|Ayumi|Haruka|Yaoyao|Huihui|Xiaoxiao|Xiaoyi|Hanhan|Paulina|Zofia|Hila|Helia|Maria|Sabina|Irina|Svetlana|Ekaterina|Yelda|Filiz|Kalpana|Heera|Hanna|Amelie|Lucia|Elena|Alice|Samantha|Victoria|Fiona|Karen|Moira|Tessa|Veena|Zosia|Colette|Fatima|Amira|Leila|Mouna|Nora)\b/i;

  function normLang(l) { return String(l || '').toLowerCase().replace('_', '-'); }
  function langPre(l) { var p = normLang(l).split('-')[0]; if (p === 'iw') p = 'he'; if (p === 'in') p = 'id'; return p; }

  function pickVoice(lang) {
    var voices = ss.getVoices() || [];
    var want = normLang(lang), pre = langPre(lang);
    var best = null, bestScore = -99;
    voices.forEach(function (v) {
      if (langPre(v.lang) !== pre) return;
      var male = MALE.test(v.name), fem = FEMALE.test(v.name) && !male;
      var s = (normLang(v.lang) === want ? 2 : 0) + (male ? 4 : 0) - (fem ? 4 : 0) + (v.localService ? 1 : 0);
      if (s > bestScore) { bestScore = s; best = { voice: v, male: male }; }
    });
    return best;
  }

  var SYM = { fr: ['egale', 'plus'], en: ['equals', 'plus'], es: ['igual', 'mas'], de: ['gleich', 'plus'], it: ['uguale', 'piu'], pt: ['igual', 'mais'], ar: ['\u064A\u0633\u0627\u0648\u064A', '\u0632\u0627\u0626\u062F'] };

  function scClean(t) {
    var s = String(t || '');
    var k = s.search(/Fiche technique/i);
    if (k > 20) s = s.slice(0, k);
    s = s.replace(/^\s*Reponse detaillee\s*/i, '');
    s = s.replace(/<[^>]*>/g, ' ')
         .replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF\uFE0F]/gu, ' ')
         .replace(/https?:\/\/\S+/g, ' ')
         .replace(/\*\*|\*|`|#+\s*/g, ' ')
         .replace(/_/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  }
  function scSym(s, lang) {
    var sym = SYM[langPre(lang)];
    return s.replace(/=/g, sym ? ' ' + sym[0] + ' ' : ' ').replace(/\+/g, sym ? ' ' + sym[1] + ' ' : ' ').replace(/\s+/g, ' ').trim();
  }

  function chunkText(t, max) {
    var parts = t.match(/[^.!?\u061F\u06D4\u3002\uFF01\uFF1F\n]+[.!?\u061F\u06D4\u3002\uFF01\uFF1F]*/g) || [t];
    var out = [], cur = '';
    parts.forEach(function (p) {
      p = p.trim();
      if (!p) return;
      while (p.length > max) {
        var i = p.lastIndexOf(' ', max);
        if (i < 40) i = max;
        if (cur) { out.push(cur); cur = ''; }
        out.push(p.slice(0, i).trim());
        p = p.slice(i).trim();
      }
      if (!p) return;
      if (cur && (cur + ' ' + p).length > max) { out.push(cur); cur = p; }
      else cur = cur ? cur + ' ' + p : p;
    });
    if (cur) out.push(cur);
    return out.length ? out : [t];
  }

  function uiLang() {
    var sel = document.getElementById('langSelect') || document.getElementById('lang');
    if (sel && SC_LANGS[sel.value]) return SC_LANGS[sel.value];
    return 'fr-FR';
  }

  function fwd(u, type, err) {
    try { var ev = new Event(type); if (err) ev.error = err; u.dispatchEvent(ev); } catch (e) {}
  }

  /* ---- Interception de toute lecture vocale de la page ---- */
  var origSpeak = ss.speak.bind(ss);
  ss.speak = function (u) {
    try {
      if (!u || u.__scChunk || typeof u.text !== 'string') return origSpeak(u);
      var base = scClean(u.text);
      if (!base) return origSpeak(u);
      var lang = scDetect(base) || u.lang || uiLang();
      var pick = pickVoice(lang);
      var chunks = chunkText(scSym(base, lang), 170);
      chunks.forEach(function (c, i) {
        var n = new SpeechSynthesisUtterance(c);
        n.__scChunk = true;
        n.lang = pick ? pick.voice.lang : lang;
        if (pick) n.voice = pick.voice;
        n.rate = 0.95;
        n.pitch = (pick && pick.male) ? 1 : 0.75;
        n.volume = (typeof u.volume === 'number') ? u.volume : 1;
        if (i === 0) n.addEventListener('start', function () { fwd(u, 'start'); });
        if (i === chunks.length - 1) n.addEventListener('end', function () { fwd(u, 'end'); });
        n.addEventListener('pause', function () { fwd(u, 'pause'); });
        n.addEventListener('resume', function () { fwd(u, 'resume'); });
        n.addEventListener('error', function (e) {
          if (e.error !== 'interrupted' && e.error !== 'canceled') console.warn('[sc-voice] ERREUR synthese vocale : ' + e.error);
          fwd(u, 'error', e.error);
        });
        origSpeak(n);
      });
      console.log('[sc-voice] lecture : ' + lang + ' | voix : ' + (pick ? pick.voice.name + (pick.male ? ' (masculine)' : ' (ton abaisse)') : 'AUCUNE VOIX INSTALLEE (voix par defaut)') + ' | blocs : ' + chunks.length);
      return;
    } catch (err) { console.warn('[sc-voice] interception impossible :', err); }
    return origSpeak(u);
  };

  /* ---- Langues du selecteur ---- */
  function ensureLangOptions() {
    ['langSelect', 'lang'].forEach(function (id) {
      var sel = document.getElementById(id);
      if (!sel || sel.getAttribute('data-sc-langs')) return;
      var have = {};
      for (var i = 0; i < sel.options.length; i++) have[langPre(sel.options[i].value)] = 1;
      Object.keys(SC_LANGS).forEach(function (c) {
        if (!have[c]) { var o = document.createElement('option'); o.value = c; o.textContent = SC_NAMES[c]; sel.appendChild(o); }
      });
      sel.setAttribute('data-sc-langs', '1');
    });
  }

  /* ---- Case Lecture vocale auto ---- */
  function findAutoBox() {
    var boxes = document.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      var lab = (b.id && document.querySelector('label[for="' + b.id + '"]')) || (b.closest && b.closest('label')) || b.parentElement;
      var tx = lab ? lab.textContent : '';
      if (/vocale\s*auto|auto.*vocal|lecture\s*auto/i.test(tx) || /auto/i.test(b.id || '')) return b;
    }
    return null;
  }
  function setupAutoBox() {
    var b = findAutoBox();
    if (!b || b.getAttribute('data-sc-auto')) return;
    b.setAttribute('data-sc-auto', '1');
    var saved = null;
    try { saved = localStorage.getItem('sc_auto_voice'); } catch (e) {}
    if (saved === null) { b.checked = true; try { localStorage.setItem('sc_auto_voice', '1'); } catch (e) {} }
    else b.checked = (saved === '1');
    try { b.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    b.addEventListener('change', function () {
      try { localStorage.setItem('sc_auto_voice', b.checked ? '1' : '0'); } catch (e) {}
      if (!b.checked && window.stopSpeech) window.stopSpeech();
    });
  }

  /* ---- Lecture automatique de la reponse apres envoi ---- */
  var armedAt = 0;
  function armSend() { armedAt = Date.now(); }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && (t.closest('#send') || t.closest('#confirm-dict'))) armSend();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'input') armSend();
  }, true);
  var origSend = window.send;
  if (typeof origSend === 'function') window.send = function () { armSend(); return origSend.apply(this, arguments); };

  function watchMessages() {
    var box = document.getElementById('messages');
    if (!box || box.getAttribute('data-sc-watch')) return;
    box.setAttribute('data-sc-watch', '1');
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1 || !n.classList || !n.classList.contains('bot') || n.classList.contains('loading')) return;
          if (!armedAt || Date.now() - armedAt > 180000) return;
          var ab = findAutoBox();
          if (!ab || !ab.checked) return;
          armedAt = 0;
          setTimeout(function () {
            var c = n.cloneNode(true);
            var a = c.querySelector('.msg-actions'); if (a) a.remove();
            var mt = c.querySelector('.meta'); if (mt) mt.remove();
            scSpeak(c.textContent, null, null);
          }, 500);
        });
      });
    }).observe(box, { childList: true });
  }

  /* ---- Rapport des voix ---- */
  window.scVoiceReport = function (show) {
    var rows = Object.keys(SC_LANGS).map(function (c) {
      var p = pickVoice(SC_LANGS[c]);
      return { code: c, langue: SC_NAMES[c], voix: p ? p.voice.name : '-', masculine: p ? (p.male ? 'OUI' : 'NON (ton abaisse)') : 'AUCUNE VOIX' };
    });
    try { console.table(rows); } catch (e) {}
    if (show) {
      var old = document.getElementById('sc-voice-report'); if (old) old.remove();
      var ov = document.createElement('div');
      ov.id = 'sc-voice-report';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;justify-content:center;align-items:center';
      var bx = document.createElement('div');
      bx.style.cssText = 'background:#fff;color:#17202a;border-radius:12px;padding:16px;max-width:760px;width:94%;max-height:86vh;overflow:auto;font:13px Arial,sans-serif';
      var h = document.createElement('div');
      h.style.cssText = 'font-weight:700;color:#0a2540;margin-bottom:8px';
      h.textContent = 'Voix installees sur cet appareil : ' + ((ss.getVoices() || []).length);
      bx.appendChild(h);
      var ab = findAutoBox();
      var st = document.createElement('div');
      st.style.cssText = 'margin-bottom:8px';
      st.textContent = 'Lecture vocale auto : ' + (ab ? (ab.checked ? 'ACTIVEE' : 'DESACTIVEE') : 'case introuvable') + '  ';
      if (ab) {
        var tg = document.createElement('button');
        tg.type = 'button';
        tg.textContent = ab.checked ? 'Desactiver' : 'Activer';
        tg.onclick = function () { ab.click(); window.scVoiceReport(true); };
        st.appendChild(tg);
      }
      bx.appendChild(st);
      var tb = document.createElement('table');
      tb.style.cssText = 'border-collapse:collapse;width:100%';
      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        [r.langue, r.voix, r.masculine].forEach(function (v) {
          var td = document.createElement('td');
          td.style.cssText = 'border:1px solid #cbd5e1;padding:4px 6px';
          td.textContent = v;
          if (v === 'AUCUNE VOIX') td.style.color = '#b91c1c';
          tr.appendChild(td);
        });
        var tdb = document.createElement('td');
        tdb.style.cssText = 'border:1px solid #cbd5e1;padding:4px 6px';
        var tbn = document.createElement('button');
        tbn.type = 'button';
        tbn.textContent = 'Test';
        tbn.onclick = function () { scSpeak('1, 2, 3, 4, 5', r.code, null); };
        tdb.appendChild(tbn);
        tr.appendChild(tdb);
        tb.appendChild(tr);
      });
      bx.appendChild(tb);
      var cl = document.createElement('button');
      cl.type = 'button';
      cl.textContent = 'Fermer';
      cl.style.cssText = 'margin-top:10px;padding:8px 16px';
      cl.onclick = function () { ov.remove(); };
      bx.appendChild(cl);
      ov.appendChild(bx);
      ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
      document.body.appendChild(ov);
    }
    return rows;
  };

  function addVoiceButton() {
    if (document.getElementById('sc-voice-btn') || !document.getElementById('messages')) return;
    var b = document.createElement('button');
    b.id = 'sc-voice-btn';
    b.type = 'button';
    b.textContent = '\uD83D\uDD0A Voix';
    b.style.cssText = 'position:fixed;left:150px;bottom:14px;z-index:99998;background:#1e5aa8;color:#fff;border:0;border-radius:22px;padding:10px 16px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    b.onclick = function () { window.scVoiceReport(true); };
    document.body.appendChild(b);
  }

  function boot() { ensureLangOptions(); setupAutoBox(); watchMessages(); addVoiceButton(); }
  try { ss.getVoices(); } catch (e) {}
  try { ss.addEventListener('voiceschanged', function () { console.log('[sc-voice] voix disponibles : ' + (ss.getVoices() || []).length); }); } catch (e) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  [600, 1500, 3000, 6000].forEach(function (ms) { setTimeout(boot, ms); });
  console.log('[sc-voice] voice-native v2 actif : interception de la lecture vocale, ' + Object.keys(SC_LANGS).length + ' langues');
})();