(function() {
  'use strict';

  // ============================================================
  // 1. DETECTION AUTO LANGUE
  // ============================================================
  function detectLanguageFromText(text) {
    if (!text) return 'fr-FR';
    var t = String(text).trim();
    if (/[\u0600-\u06FF]/.test(t)) return 'ar-SA';
    if (/[\u0590-\u05FF]/.test(t)) return 'he-IL';
    if (/[\u4E00-\u9FFF]/.test(t)) return 'zh-CN';
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t)) return 'ja-JP';
    if (/[\uAC00-\uD7AF]/.test(t)) return 'ko-KR';
    if (/[\u0400-\u04FF]/.test(t)) return 'ru-RU';
    if (/[\u0900-\u097F]/.test(t)) return 'hi-IN';
    if (/[\u0E00-\u0E7F]/.test(t)) return 'th-TH';
    if (/[\u0370-\u03FF]/.test(t)) return 'el-GR';
    if (/\b(le|la|les|de|du|des|un|une|et|est|pour|dans|avec|sur|que|qui|pas|ce|cette)\b/i.test(t)) return 'fr-FR';
    if (/\b(the|is|are|and|of|to|in|that|for|with|on|this|it|as|be|by|from)\b/i.test(t)) return 'en-US';
    if (/\b(el|la|los|las|de|del|y|es|para|con|por|que|como|no|si)\b/i.test(t)) return 'es-ES';
    if (/\b(der|die|das|und|ist|fur|mit|auf|von|zu|den|dem|des)\b/i.test(t)) return 'de-DE';
    return 'fr-FR';
  }

  // ============================================================
  // 2. VOIX NATIVE PAR LANGUE
  // ============================================================
  function getNativeVoiceForLanguage(langCode) {
    var voices = speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    var prefix = langCode.split('-')[0];

    var maleVoiceNames = {
      'fr': /Thomas|Henri|Paul|Guillaume|Yannick|Google francais/i,
      'ar': /Majed|Maged|Naayf/i,
      'en': /David|Mark|James|George|Daniel|Google US English/i,
      'es': /Diego|Jorge|Juan|Carlos/i,
      'de': /Hans|Stefan|Klaus|Google Deutsch/i,
      'it': /Luca|Marco|Giovanni/i,
      'pt': /Felipe|Ricardo/i,
      'ru': /Yuri|Dmitri/i,
      'zh': /Yunyang|Liang/i,
      'ja': /Keita|Hattori/i,
      'ko': /Yuna/i,
      'tr': /Cem|Emre/i,
      'fa': /Amir|Reza/i,
      'ur': /Asad/i,
      'hi': /Ravi|Amit/i,
      'he': /Asaf/i,
      'nl': /Xander/i,
      'pl': /Krzysztof/i,
      'sv': /Oskar/i,
      'el': /Nikos/i,
      'vi': /Google Tieng Viet/i,
      'th': /Google ไทย/i,
      'id': /Google Bahasa/i
    };

    var exactMatch = voices.find(function(v) { return v.lang === langCode; });
    if (exactMatch) return exactMatch;

    var prefixMatches = voices.filter(function(v) { return v.lang.indexOf(prefix) === 0; });
    if (prefixMatches.length > 0) {
      var maleRegex = maleVoiceNames[prefix];
      if (maleRegex) {
        var maleVoice = prefixMatches.find(function(v) { return maleRegex.test(v.name); });
        if (maleVoice) return maleVoice;
      }
      return prefixMatches[0];
    }
    return null;
  }

  // ============================================================
  // 3. DICTEE VOCALE
  // ============================================================
  window.startDictation = function(onResult, onEnd, langCode) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Dictee non supportee. Utilisez Chrome ou Edge.');
      return null;
    }
    var rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = langCode || navigator.language || 'fr-FR';

    var buffer = '';
    var silenceTimer = null;
    var detectedLang = rec.lang;

    rec.onresult = function(ev) {
      var interim = '', final = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final) {
        buffer += final;
        var autoLang = detectLanguageFromText(buffer);
        if (autoLang !== detectedLang) detectedLang = autoLang;
      }
      if (onResult) onResult((buffer + interim).trim());
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(function() {
        if (onEnd) onEnd(buffer.trim(), detectedLang);
      }, 10000);
    };
    rec.onerror = function(e) { console.error('Erreur dictee :', e.error); };
    rec.onend = function() { if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; } };
    try { rec.start(); } catch (e) { return null; }
    window._currentRecognition = rec;
    return rec;
  };

  window.stopDictation = function() {
    if (window._currentRecognition) {
      try { window._currentRecognition.stop(); } catch(e) {}
      window._currentRecognition = null;
    }
  };

  // ============================================================
  // 4. LECTURE VOCALE SIMPLE
  // ============================================================
  window.speak = function(text, lang) {
    if (!('speechSynthesis' in window)) { alert('Synthese vocale non supportee.'); return; }
    if (!text) return;
    var targetLang = lang || detectLanguageFromText(text);

    var clean = String(text)
      .replace(/\*\*/g, '').replace(/\*/g, '')
      .replace(/^#+\s*/gm, '').replace(/_/g, ' ')
      .replace(/=/g, ' egale ').replace(/\+/g, ' plus ')
      .replace(/\s+/g, ' ').trim();

    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(clean);
    u.lang = targetLang;
    u.rate = 0.9;
    u.pitch = 0.85;
    u.volume = 1.0;

    var nativeVoice = getNativeVoiceForLanguage(targetLang);
    if (nativeVoice) u.voice = nativeVoice;

    speechSynthesis.speak(u);
  };

  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = function() { speechSynthesis.getVoices(); };
  }

  // ============================================================
  // 5. BOUTON MIC
  // ============================================================
  var micToggleActive = false;
  var micRecognition = null;

  function injectMicButton() {
    var existing = document.getElementById('mic');
    if (existing) {
      var clone = existing.cloneNode(true);
      existing.parentNode.replaceChild(clone, existing);
      clone.onclick = function(e) { e.preventDefault(); e.stopPropagation(); handleMicClick(); };
      clone.style.background = '#dc2626';
      clone.style.color = 'white';
      clone.style.border = 'none';
      clone.style.padding = '14px';
      clone.style.borderRadius = '12px';
      clone.style.cursor = 'pointer';
      clone.style.fontWeight = 'bold';
      clone.textContent = 'MIC';
      return;
    }
    var inputArea = document.querySelector('.input-area') ||
                    document.querySelector('.row-input') ||
                    (document.getElementById('input') ? document.getElementById('input').parentElement : null);
    if (!inputArea) return;
    var micBtn = document.createElement('button');
    micBtn.id = 'mic';
    micBtn.className = 'btn-mic';
    micBtn.type = 'button';
    micBtn.textContent = 'MIC';
    micBtn.style.cssText = 'background:#dc2626;color:white;border:none;padding:14px;border-radius:12px;cursor:pointer;font-weight:bold;';
    micBtn.onclick = function(e) { e.preventDefault(); handleMicClick(); };
    var sendBtn = document.getElementById('send');
    if (sendBtn && sendBtn.parentElement) sendBtn.parentElement.insertBefore(micBtn, sendBtn);
    else inputArea.appendChild(micBtn);
  }

  function handleMicClick() {
    var micBtn = document.getElementById('mic');
    var dictStatus = document.getElementById('dict-status');
    var confirmBtn = document.getElementById('confirm-dict');
    if (micToggleActive && micRecognition) {
      try { micRecognition.stop(); } catch(e) {}
      micRecognition = null;
      micToggleActive = false;
      if (micBtn) micBtn.style.background = '#dc2626';
      if (dictStatus) dictStatus.style.display = 'none';
      if (confirmBtn) confirmBtn.style.display = 'none';
      return;
    }
    if (!window.startDictation) { alert('Dictee non disponible.'); return; }
    var langSel = document.getElementById('lang');
    var selected = langSel ? langSel.value : 'fr';
    var dictLang = 'fr-FR';
    if (selected === 'ar') dictLang = 'ar-SA';
    else if (selected === 'en') dictLang = 'en-US';
    else if (selected === 'es') dictLang = 'es-ES';

    micRecognition = window.startDictation(
      function(text) { var input = document.getElementById('input'); if (input) input.value = text; },
      function(finalText) {
        var input = document.getElementById('input');
        if (input) input.value = finalText;
        if (confirmBtn) {
          confirmBtn.style.display = 'inline-block';
          confirmBtn.style.background = '#16a34a';
          confirmBtn.style.color = 'white';
          confirmBtn.style.border = 'none';
          confirmBtn.style.padding = '10px 20px';
          confirmBtn.style.borderRadius = '10px';
          confirmBtn.style.fontWeight = '600';
          confirmBtn.style.cursor = 'pointer';
          confirmBtn.textContent = 'Terminer';
          confirmBtn.onclick = function() {
            if (micRecognition) { try { micRecognition.stop(); } catch(e) {} }
            micRecognition = null; micToggleActive = false;
            if (micBtn) micBtn.style.background = '#dc2626';
            if (dictStatus) dictStatus.style.display = 'none';
            confirmBtn.style.display = 'none';
            if (window.send) window.send();
          };
        }
      },
      dictLang
    );
    if (micRecognition) {
      micToggleActive = true;
      if (micBtn) micBtn.style.background = '#16a34a';
      if (dictStatus) {
        dictStatus.style.display = 'block';
        dictStatus.style.background = '#fef3c7';
        dictStatus.style.border = '2px solid #f59e0b';
        dictStatus.style.padding = '8px 14px';
        dictStatus.style.borderRadius = '10px';
        dictStatus.style.fontSize = '.85rem';
        dictStatus.style.color = '#92400e';
        dictStatus.style.marginBottom = '8px';
        dictStatus.textContent = 'Dictee en cours... Parlez puis attendez 10 secondes.';
      }
    }
  }

  // ============================================================
  // 6. ENVOI QUESTION IA
  // ============================================================
  window.send = function() {
    var input = document.getElementById('input');
    var sendBtn = document.getElementById('send');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    if (sendBtn && sendBtn.disabled) return;

    var langSel = document.getElementById('lang');
    var lang = langSel ? langSel.value : 'fr';
    var domainSel = document.getElementById('domain');
    var domain = domainSel ? domainSel.value : 'General';
    var selectedScholar = null;
    var chip = document.querySelector('.scholar-chip.selected');
    if (chip) selectedScholar = chip.textContent;

    var token = localStorage.getItem('token');
    if (!token) { alert('Session expiree.'); window.location.href = '/login'; return; }

    var messages = document.getElementById('messages');
    if (messages) {
      var userMsg = document.createElement('div');
      userMsg.className = 'msg user';
      userMsg.textContent = text;
      messages.appendChild(userMsg);
      messages.scrollTop = messages.scrollHeight;
    }

    input.value = '';
    if (sendBtn) sendBtn.disabled = true;

    var loadingMsg = null;
    if (messages) {
      loadingMsg = document.createElement('div');
      loadingMsg.className = 'msg bot loading';
      loadingMsg.textContent = 'Reflexion...';
      messages.appendChild(loadingMsg);
      messages.scrollTop = messages.scrollHeight;
    }

    fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ question: text, language: lang, domain: domain, scholar: selectedScholar })
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || ('HTTP ' + r.status)); });
      return r.json();
    })
    .then(function(data) {
      if (loadingMsg) loadingMsg.remove();
      if (messages && data.answer) {
        var botMsg = document.createElement('div');
        botMsg.className = 'msg bot';
        botMsg.textContent = data.answer;
        messages.appendChild(botMsg);
        messages.scrollTop = messages.scrollHeight;
      }
    })
    .catch(function(err) {
      if (loadingMsg) loadingMsg.remove();
      if (messages) {
        var errMsg = document.createElement('div');
        errMsg.className = 'msg bot';
        errMsg.style.color = '#b91c1c';
        errMsg.textContent = 'Erreur : ' + err.message;
        messages.appendChild(errMsg);
      }
    })
    .finally(function() { if (sendBtn) sendBtn.disabled = false; if (input) input.focus(); });
  };

  // ============================================================
  // 7. TRADUCTION
  // ============================================================
  var TRANSLATION_LANGS = [
    { code: 'ar', name: 'العربية' },
    { code: 'fr', name: 'Francais' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Espanol' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Portugues' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'tr', name: 'Turkce' },
    { code: 'fa', name: 'فارسی' },
    { code: 'ur', name: 'اردو' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'he', name: 'עברית' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'pl', name: 'Polski' },
    { code: 'el', name: 'Ελληνικά' },
    { code: 'vi', name: 'Tieng Viet' },
    { code: 'th', name: 'ไทย' },
    { code: 'id', name: 'Bahasa' }
  ];

  function openTranslateDialog(text) {
    var old = document.getElementById('translate-dialog');
    if (old) old.remove();
    var dialog = document.createElement('div');
    dialog.id = 'translate-dialog';
    dialog.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:9999;';
    var box = document.createElement('div');
    box.style.cssText = 'background:white;border-radius:16px;padding:30px;max-width:600px;width:90%;max-height:85vh;overflow-y:auto;';
    var html = '<h3 style="color:#0a2540;margin-bottom:20px">Traduire en...</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:20px">';
    for (var i = 0; i < TRANSLATION_LANGS.length; i++) {
      var l = TRANSLATION_LANGS[i];
      html += '<button type="button" data-lang="' + l.code + '" style="padding:10px;border:2px solid #e5e7eb;background:white;border-radius:10px;cursor:pointer;font-weight:600;color:#0a2540">' + l.name + '</button>';
    }
    html += '</div>';
    html += '<div id="translate-result" style="margin-top:15px;padding:15px;background:#f5f7fa;border-radius:10px;min-height:60px;display:none"></div>';
    html += '<div style="display:flex;justify-content:flex-end;margin-top:15px"><button type="button" id="translate-close" style="background:#f5f7fa;border:2px solid #e5e7eb;color:#0a2540;padding:10px 20px;border-radius:10px;font-weight:600;cursor:pointer">Fermer</button></div>';
    box.innerHTML = html;
    dialog.appendChild(box);
    document.body.appendChild(dialog);
    document.getElementById('translate-close').onclick = function() { dialog.remove(); };
    dialog.onclick = function(e) { if (e.target === dialog) dialog.remove(); };
    var buttons = box.querySelectorAll('button[data-lang]');
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].onclick = (function(langCode) {
        return function() { doTranslate(text, langCode); };
      })(buttons[j].getAttribute('data-lang'));
    }
  }

  function doTranslate(text, targetLang) {
    var resultBox = document.getElementById('translate-result');
    if (!resultBox) return;
    resultBox.style.display = 'block';
    resultBox.innerHTML = '<em>Traduction...</em>';
    var token = localStorage.getItem('token');
    if (!token) { resultBox.innerHTML = '<span style="color:#b91c1c">Session expiree.</span>'; return; }
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ text: text, targetLanguage: targetLang })
    })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || ('HTTP ' + r.status)); });
      return r.json();
    })
    .then(function(data) {
      resultBox.innerHTML =
        '<div style="color:#6b7280;font-size:.8rem;margin-bottom:8px">Traduction en ' + targetLang + ' :</div>' +
        '<div style="color:#17202a;font-size:1rem;line-height:1.6">' + (data.translation || 'Aucune traduction') + '</div>' +
        '<div style="margin-top:12px"><button type="button" id="translate-speak" style="background:#1e5aa8;color:white;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-weight:600">Ecouter</button></div>';
      document.getElementById('translate-speak').onclick = function() {
        if (window.speak) window.speak(data.translation, targetLang);
      };
    })
    .catch(function(err) { resultBox.innerHTML = '<span style="color:#b91c1c">Erreur : ' + err.message + '</span>'; });
  }

  window.translateMessage = function(el) {
    var text = typeof el === 'string' ? el : (el && el.textContent ? el.textContent : '');
    if (!text) {
      var bots = document.querySelectorAll('.msg.bot');
      if (bots.length > 0) text = bots[bots.length - 1].textContent;
    }
    if (!text) { alert('Aucun texte'); return; }
    openTranslateDialog(text);
  };
  window.openTranslateDialog = openTranslateDialog;
  window.doTranslate = doTranslate;

  // ============================================================
  // 8. PARTAGE
  // ============================================================
  function shareMessage(text) {
    var shareData = { title: 'Scholars Connect', text: text };
    if (navigator.share) {
      navigator.share(shareData).catch(function(err) {
        if (err.name !== 'AbortError') fallbackShare(text);
      });
    } else fallbackShare(text);
  }

  function fallbackShare(text) {
    var old = document.getElementById('share-dialog');
    if (old) old.remove();
    var dialog = document.createElement('div');
    dialog.id = 'share-dialog';
    dialog.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:9999;';
    var box = document.createElement('div');
    box.style.cssText = 'background:white;border-radius:16px;padding:30px;max-width:500px;width:90%;';
    var encodedText = encodeURIComponent(text);
    var pageUrl = encodeURIComponent(window.location.origin);
    var html = '<h3 style="color:#0a2540;margin-bottom:20px">Partager</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:20px">';
    html += '<a href="https://wa.me/?text=' + encodedText + '" target="_blank" style="padding:12px;background:#25D366;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600">WhatsApp</a>';
    html += '<a href="https://t.me/share/url?url=' + pageUrl + '&text=' + encodedText + '" target="_blank" style="padding:12px;background:#0088cc;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600">Telegram</a>';
    html += '<a href="https://twitter.com/intent/tweet?text=' + encodedText + '" target="_blank" style="padding:12px;background:#000;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600">X</a>';
    html += '<a href="https://www.facebook.com/sharer/sharer.php?u=' + pageUrl + '" target="_blank" style="padding:12px;background:#1877f2;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600">Facebook</a>';
    html += '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' + pageUrl + '" target="_blank" style="padding:12px;background:#0077b5;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600">LinkedIn</a>';
    html += '<a href="mailto:?subject=Scholars%20Connect&body=' + encodedText + '" style="padding:12px;background:#6b7280;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600">Email</a>';
    html += '</div>';
    html += '<button type="button" id="share-copy" style="width:100%;padding:12px;background:#1e5aa8;color:white;border:none;border-radius:10px;font-weight:600;cursor:pointer;margin-bottom:10px">Copier</button>';
    html += '<button type="button" id="share-close" style="width:100%;padding:10px;background:#f5f7fa;border:2px solid #e5e7eb;color:#0a2540;border-radius:10px;font-weight:600;cursor:pointer">Fermer</button>';
    box.innerHTML = html;
    dialog.appendChild(box);
    document.body.appendChild(dialog);
    document.getElementById('share-close').onclick = function() { dialog.remove(); };
    document.getElementById('share-copy').onclick = function() {
      navigator.clipboard.writeText(text);
      this.textContent = 'Copie !';
      var btn = this;
      setTimeout(function() { btn.textContent = 'Copier'; }, 1500);
    };
    dialog.onclick = function(e) { if (e.target === dialog) dialog.remove(); };
  }
  window.shareMessage = shareMessage;

  // ============================================================
  // 9. BOUTON LECTURE 3 ETATS
  // ============================================================
  var currentSpeechBtn = null;

  function updateSpeechBtn(btn, state) {
    if (!btn) return;
    if (state === 'playing') {
      btn.style.background = '#16a34a';
      btn.innerHTML = '\u23F8 Pause';
    } else if (state === 'paused') {
      btn.style.background = '#f59e0b';
      btn.innerHTML = '\u25B6 Reprendre';
    } else {
      btn.style.background = '#dc2626';
      btn.innerHTML = '\u23F9 Arrete';
    }
    btn.style.color = 'white';
  }

  window.toggleSpeech = function(btn, text, langOverride) {
    var lang = langOverride || detectLanguageFromText(text);

    if (currentSpeechBtn && currentSpeechBtn !== btn) {
      updateSpeechBtn(currentSpeechBtn, 'stopped');
    }

    if (currentSpeechBtn === btn && 'speechSynthesis' in window) {
      if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        updateSpeechBtn(btn, 'paused');
        return;
      } else if (speechSynthesis.paused) {
        speechSynthesis.resume();
        updateSpeechBtn(btn, 'playing');
        return;
      } else {
        currentSpeechBtn = null;
      }
    }

    if (!('speechSynthesis' in window)) { alert('Non supporte'); return; }

    var clean = String(text)
      .replace(/\*\*/g, '').replace(/\*/g, '')
      .replace(/^#+\s*/gm, '').replace(/_/g, ' ')
      .replace(/=/g, ' egale ').replace(/\+/g, ' plus ')
      .replace(/\s+/g, ' ').trim();

    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(clean);
    u.lang = lang;
    u.rate = 0.9;
    u.pitch = 0.85;
    u.volume = 1.0;

    var nativeVoice = getNativeVoiceForLanguage(lang);
    if (nativeVoice) u.voice = nativeVoice;

    u.onstart = function() { updateSpeechBtn(btn, 'playing'); };
    u.onend = function() { updateSpeechBtn(btn, 'stopped'); currentSpeechBtn = null; };
    u.onerror = function() { updateSpeechBtn(btn, 'stopped'); currentSpeechBtn = null; };

    currentSpeechBtn = btn;
    speechSynthesis.speak(u);
  };

  window.pauseSpeech = function() {
    if ('speechSynthesis' in window && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      updateSpeechBtn(currentSpeechBtn, 'paused');
    }
  };

  window.stopSpeech = function() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    updateSpeechBtn(currentSpeechBtn, 'stopped');
    currentSpeechBtn = null;
  };

  // ============================================================
  // 10. DECORATEUR (boutons Traduire + Partager + Lire)
  // ============================================================
  function decorateMessages() {
    var bots = document.querySelectorAll('.msg.bot');
    for (var i = 0; i < bots.length; i++) {
      var bot = bots[i];
      if (bot.getAttribute('data-decorated') === '1') continue;
      if (bot.classList.contains('loading')) continue;

      var clone = bot.cloneNode(true);
      var actions = clone.querySelector('.msg-actions');
      if (actions) actions.remove();
      var meta = clone.querySelector('.meta');
      if (meta) meta.remove();
      var text = clone.textContent.trim();
      if (!text) continue;

      bot.setAttribute('data-decorated', '1');
      var oldActions = bot.querySelector('.msg-actions');
      if (oldActions) oldActions.remove();

      var bar = document.createElement('div');
      bar.className = 'msg-actions';
      bar.style.cssText = 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;';

      var btnTranslate = document.createElement('button');
      btnTranslate.type = 'button';
      btnTranslate.textContent = '\uD83C\uDF10 Traduire';
      btnTranslate.style.cssText = 'background:white;border:1px solid #e5e7eb;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.85rem;color:#0a2540;font-weight:600;';
      btnTranslate.onclick = (function(txt) {
        return function(e) {
          e.preventDefault(); e.stopPropagation();
          if (window.openTranslateDialog) window.openTranslateDialog(txt);
        };
      })(text);
      bar.appendChild(btnTranslate);

      var btnShare = document.createElement('button');
      btnShare.type = 'button';
      btnShare.textContent = '\uD83D\uDD17 Partager';
      btnShare.style.cssText = 'background:white;border:1px solid #e5e7eb;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.85rem;color:#0a2540;font-weight:600;';
      btnShare.onclick = (function(txt) {
        return function(e) {
          e.preventDefault(); e.stopPropagation();
          shareMessage(txt);
        };
      })(text);
      bar.appendChild(btnShare);

      var btnSpeak = document.createElement('button');
      btnSpeak.type = 'button';
      btnSpeak.textContent = '\uD83D\uDD0A Lire';
      btnSpeak.style.cssText = 'background:#dc2626;color:white;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600;';
      btnSpeak.onclick = (function(txt) {
        return function(e) {
          e.preventDefault(); e.stopPropagation();
          window.toggleSpeech(btnSpeak, txt);
        };
      })(text);
      bar.appendChild(btnSpeak);

      bot.appendChild(bar);
    }
  }
  window.decorateMessages = decorateMessages;

  // ============================================================
  // 11. LANCEMENT
  // ============================================================
  function startDecorator() {
    setTimeout(decorateMessages, 1000);
    var container = document.getElementById('messages');
    if (container) {
      var observer = new MutationObserver(function() {
        setTimeout(decorateMessages, 100);
      });
      observer.observe(container, { childList: true, subtree: true });
    }
    setInterval(decorateMessages, 2000);
  }

  function bootstrap() {
    setTimeout(injectMicButton, 500);
    startDecorator();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  window.toggleDictation = function() {
    var micBtn = document.getElementById('mic');
    if (micBtn) micBtn.click();
  };

  
  // ============================================================
  // CORRECTION : EXPOSER LES FONCTIONS ANALYSE SUR window
  // Sans ces lignes, les boutons HTML onclick="analyzeContent()" et
  // onclick="switchDialogTab(...)" ne fonctionnent PAS.
  // ============================================================
  try {
    if (typeof analyzeContent === 'function') {
      window.analyzeContent = analyzeContent;
    }
    if (typeof switchDialogTab === 'function') {
      window.switchDialogTab = switchDialogTab;
    }
    if (typeof openAnalyzeDialog === 'function') {
      window.openAnalyzeDialog = openAnalyzeDialog;
    }
    if (typeof closeAnalyzeDialog === 'function') {
      window.closeAnalyzeDialog = closeAnalyzeDialog;
    }
    console.log('[voice-fix] Fonctions analyse exposees sur window');
  } catch (e) {
    console.warn('[voice-fix] Erreur exposition analyse :', e.message);
  }

/* ===== SC-VOICE-NATIVE v1 : voix native masculine (30 langues), dictee >= 10 s ===== */
(function () {
  var SC_LANGS = { ar: 'ar-SA', fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', tr: 'tr-TR', fa: 'fa-IR', ur: 'ur-PK', hi: 'hi-IN', he: 'he-IL', nl: 'nl-NL', pl: 'pl-PL', el: 'el-GR', vi: 'vi-VN', th: 'th-TH', id: 'id-ID', sv: 'sv-SE', uk: 'uk-UA', ro: 'ro-RO', cs: 'cs-CZ', hu: 'hu-HU', bn: 'bn-BD', ms: 'ms-MY', sw: 'sw-KE' };
  var SC_NAMES = { ar: 'Arabe', fr: 'Francais', en: 'English', es: 'Espanol', de: 'Deutsch', it: 'Italiano', pt: 'Portugues', ru: 'Russe', zh: 'Chinois', ja: 'Japonais', ko: 'Coreen', tr: 'Turc', fa: 'Persan', ur: 'Ourdou', hi: 'Hindi', he: 'Hebreu', nl: 'Neerlandais', pl: 'Polonais', el: 'Grec', vi: 'Vietnamien', th: 'Thai', id: 'Indonesien', sv: 'Suedois', uk: 'Ukrainien', ro: 'Roumain', cs: 'Tcheque', hu: 'Hongrois', bn: 'Bengali', ms: 'Malais', sw: 'Swahili' };
  var SILENCE = Math.max(10000, window.SC_SILENCE_MS || 10000);
  var scSession = 0;

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

  function scResolveLang(override, text) {
    if (override) {
      var o = String(override);
      if (o.indexOf('-') > 0 || o.indexOf('_') > 0) return o.replace('_', '-');
      if (SC_LANGS[o.toLowerCase()]) return SC_LANGS[o.toLowerCase()];
    }
    var d = scDetect(text);
    if (d) return d;
    var sel = document.getElementById('lang');
    if (sel && SC_LANGS[sel.value]) return SC_LANGS[sel.value];
    return 'fr-FR';
  }

  var MALE = /\b(Thomas|Henri|Paul|Guillaume|Yannick|Antoine|Remy|Mathieu|Nicolas|Bernard|Hamed|Naayf|Majed|Maged|Shakir|Salem|Fahed|Hamdan|Taim|Omar|Tarik|David|Mark|James|George|Daniel|Guy|Christopher|Eric|Davis|Jason|Tony|Andrew|Brian|Ryan|Roger|Alvaro|Pablo|Jorge|Raul|Alonso|Diego|Juan|Carlos|Stefan|Conrad|Killian|Florian|Jonas|Hans|Klaus|Cosimo|Luca|Marco|Giuseppe|Benigno|Antonio|Fabio|Donato|Felipe|Ricardo|Valerio|Pavel|Dmitry|Dmitri|Yuri|Kangkang|Yunyang|Yunxi|Yunjian|Liang|Wanlung|Ichiro|Keita|Hattori|Naoki|Takumi|InJoon|Bongjin|Gookmin|Tolga|Emre|Ahmet|Hemant|Ravi|Amit|Madhur|Prabhat|Asaf|Avri|Frank|Maarten|Xander|Marek|Krzysztof|Stefanos|Nikos|Nestoras|Pattara|Niwat|Andika|Ardi|Farid|Reza|Amir|Asad|Salman|Gul|Mattias|Oskar|Emil|Antonin|Tamas|Alexandru|Male|Masculin|Hombre|Maschio)\b/i;
  var FEMALE = /\b(Female|Femme|Mujer|Hortense|Julie|Denise|Eloise|Elsa|Zira|Hazel|Susan|Aria|Jenny|Michelle|Salma|Zariyah|Hoda|Laura|Helena|Katja|Hedda|Elvira|Dalia|Heami|Sunhi|Nanami|Ayumi|Haruka|Yaoyao|Huihui|Xiaoxiao|Xiaoyi|Hanhan|Paulina|Zofia|Hila|Helia|Maria|Sabina|Irina|Svetlana|Ekaterina|Yelda|Filiz|Kalpana|Heera|Hanna|Amelie|Lucia|Elena|Alice|Samantha|Victoria|Fiona|Karen|Moira|Tessa|Veena|Zosia|Colette|Fatima|Amira|Leila|Mouna|Nora)\b/i;

  function normLang(l) { return String(l || '').toLowerCase().replace('_', '-'); }
  function langPre(l) { var p = normLang(l).split('-')[0]; if (p === 'iw') p = 'he'; if (p === 'in') p = 'id'; return p; }

  function pickVoice(lang) {
    var voices = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
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

  function withVoices(cb) {
    var ss = window.speechSynthesis;
    if (ss.getVoices().length) return cb();
    var done = false;
    function go() { if (done) return; done = true; try { ss.removeEventListener('voiceschanged', go); } catch (e) {} cb(); }
    try { ss.addEventListener('voiceschanged', go); } catch (e) {}
    setTimeout(go, 1200);
  }

  function scSpeak(text, override, btn) {
    if (!('speechSynthesis' in window)) { alert('Synthese vocale non supportee par ce navigateur.'); return; }
    var base = scClean(text);
    if (!base) return;
    var sid = ++scSession;
    speechSynthesis.cancel();
    withVoices(function () {
      setTimeout(function () {
        if (sid !== scSession) return;
        var lang = scResolveLang(override, base);
        var pick = pickVoice(lang);
        var chunks = chunkText(scSym(base, lang), 170);
        if (!pick) console.warn('[sc-voice] Aucune voix installee pour ' + lang + ' : voix par defaut du navigateur');
        chunks.forEach(function (c, i) {
          var u = new SpeechSynthesisUtterance(c);
          u.lang = pick ? pick.voice.lang : lang;
          if (pick) u.voice = pick.voice;
          u.rate = 0.95;
          u.pitch = (pick && pick.male) ? 1 : 0.75;
          u.volume = 1;
          if (i === 0) u.onstart = function () { if (sid === scSession && btn) updateSpeechBtn(btn, 'playing'); };
          if (i === chunks.length - 1) {
            u.onend = u.onerror = function () {
              if (sid !== scSession) return;
              if (btn) updateSpeechBtn(btn, 'stopped');
              if (currentSpeechBtn === btn) currentSpeechBtn = null;
            };
          }
          speechSynthesis.speak(u);
        });
      }, 120);
    });
  }

  window.speak = function (text, lang) { scSpeak(text, lang, null); };

  window.toggleSpeech = function (btn, text, langOverride) {
    if (!('speechSynthesis' in window)) { alert('Synthese vocale non supportee.'); return; }
    if (currentSpeechBtn && currentSpeechBtn !== btn) updateSpeechBtn(currentSpeechBtn, 'stopped');
    if (currentSpeechBtn === btn) {
      if (speechSynthesis.speaking && !speechSynthesis.paused) { speechSynthesis.pause(); updateSpeechBtn(btn, 'paused'); return; }
      if (speechSynthesis.paused) { speechSynthesis.resume(); updateSpeechBtn(btn, 'playing'); return; }
    }
    currentSpeechBtn = btn;
    scSpeak(text, langOverride, btn);
  };

  window.stopSpeech = function () {
    scSession++;
    try { speechSynthesis.cancel(); } catch (e) {}
    updateSpeechBtn(currentSpeechBtn, 'stopped');
    currentSpeechBtn = null;
  };

  /* ---- Dictee : toutes langues, silence >= 10 s, relance automatique ---- */
  window.startDictation = function (onResult, onEnd, langCode) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Dictee non supportee. Utilisez Chrome ou Edge.'); return null; }
    var sel = document.getElementById('lang');
    var code = sel ? sel.value : '';
    var lang = SC_LANGS[code] || langCode || navigator.language || 'fr-FR';
    var rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = lang;
    var buffer = '', timer = null, userStopped = false, last = Date.now(), detected = lang, timerFired = false;

    function arm() {
      clearTimeout(timer);
      timerFired = false;
      timer = setTimeout(function () { timerFired = true; if (onEnd) onEnd(buffer.trim(), detected); }, SILENCE);
    }
    function finish() {
      clearTimeout(timer);
      if (!userStopped && !timerFired && onEnd) { timerFired = true; onEnd(buffer.trim(), detected); }
    }
    rec.onresult = function (ev) {
      last = Date.now();
      var interim = '', fin = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) fin += t + ' '; else interim += t;
      }
      if (fin) { buffer += fin; var d = scDetect(buffer); if (d) detected = d; }
      if (onResult) onResult((buffer + interim).trim());
      arm();
    };
    rec.onerror = function (e) {
      console.warn('[sc-voice] Erreur dictee :', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { userStopped = true; alert('Acces au micro refuse : autorisez le micro pour ce site.'); }
    };
    rec.onend = function () {
      if (!userStopped && Date.now() - last < SILENCE) {
        setTimeout(function () { try { rec.start(); } catch (e) { finish(); } }, 200);
        return;
      }
      finish();
    };
    var proxy = {
      stop: function () { userStopped = true; clearTimeout(timer); try { rec.stop(); } catch (e) {} },
      abort: function () { userStopped = true; clearTimeout(timer); try { rec.abort(); } catch (e) {} }
    };
    try { rec.start(); } catch (e) { return null; }
    window._currentRecognition = proxy;
    return proxy;
  };

  /* ---- Langues du selecteur #lang ---- */
  function ensureLangOptions() {
    var sel = document.getElementById('lang');
    if (!sel || sel.getAttribute('data-sc-langs')) return;
    var have = {};
    for (var i = 0; i < sel.options.length; i++) have[sel.options[i].value] = 1;
    Object.keys(SC_LANGS).forEach(function (c) {
      if (!have[c]) { var o = document.createElement('option'); o.value = c; o.textContent = SC_NAMES[c]; sel.appendChild(o); }
    });
    sel.setAttribute('data-sc-langs', '1');
  }

  /* ---- Case Lecture vocale auto : activee par defaut ---- */
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

  /* ---- Rapport des voix installees (bouton Voix) ---- */
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
      h.textContent = 'Voix installees sur cet appareil : ' + ((speechSynthesis.getVoices() || []).length);
      bx.appendChild(h);
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
  try { speechSynthesis.getVoices(); } catch (e) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  [600, 1500, 3000, 6000].forEach(function (ms) { setTimeout(boot, ms); });
  console.log('[sc-voice] SC-VOICE-NATIVE v1 actif : ' + Object.keys(SC_LANGS).length + ' langues, silence dictee ' + (SILENCE / 1000) + ' s');
})();

console.log('[voice-fix.js] V2 charge - tous les modules actifs');
})();