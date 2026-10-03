// VOICE-FIX.JS - Version complete avec bouton Telecharger PDF
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
  function getArabicMaleVoice() {
    var voices = speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    var majed = voices.find(function(v) { return /^Majed$/i.test(v.name.trim()); });
    if (majed) return majed;
    var majedVariant = voices.find(function(v) { return /^Majed\s*\(/i.test(v.name.trim()); });
    if (majedVariant) return majedVariant;
    var maged = voices.find(function(v) { return /^Maged/i.test(v.name.trim()); });
    if (maged) return maged;
    var naayf = voices.find(function(v) { return /^Naayf/i.test(v.name.trim()); });
    if (naayf) return naayf;
    var arabicMale = voices.find(function(v) {
      return v.lang.indexOf('ar') === 0 && /Majed|Maged|Naayf|Tarik|Karim|Hamza|Youssef/i.test(v.name);
    });
    if (arabicMale) return arabicMale;
    var anyArabic = voices.find(function(v) { return v.lang.indexOf('ar') === 0; });
    if (anyArabic) return anyArabic;
    return null;
  }

  function getNativeVoiceForLanguage(langCode) {
    var voices = speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    var prefix = langCode.split('-')[0];
    if (prefix === 'ar') {
      var arabicVoice = getArabicMaleVoice();
      if (arabicVoice) return arabicVoice;
    }
    var maleVoiceNames = {
      'fr': /Thomas|Henri|Paul|Guillaume|Yannick/i,
      'en': /David|Mark|James|George|Daniel/i,
      'es': /Diego|Jorge|Juan|Carlos/i,
      'de': /Hans|Stefan|Klaus/i,
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
  // 4. LECTURE VOCALE
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
        botMsg.innerHTML = data.answer;
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
      btn.innerHTML = 'Pause';
    } else if (state === 'paused') {
      btn.style.background = '#f59e0b';
      btn.innerHTML = 'Reprendre';
    } else {
      btn.style.background = '#dc2626';
      btn.innerHTML = 'Arrete';
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
  // 10. TELECHARGER PDF
  // ============================================================
  function downloadAsPDF(element) {
    var clone = element.cloneNode(true);
    var actions = clone.querySelector('.msg-actions');
    if (actions) actions.remove();

    // Recuperer uniquement le texte de la question (sans les boutons)
    var prev = element.previousElementSibling;
    var question = '';
    while (prev) {
      if (prev.classList && prev.classList.contains('msg') && prev.classList.contains('user')) {
        // Cloner pour retirer d'eventuels boutons
        var qClone = prev.cloneNode(true);
        var qActions = qClone.querySelector('.msg-actions');
        if (qActions) qActions.remove();
        question = qClone.textContent.trim();
        break;
      }
      prev = prev.previousElementSibling;
    }

    var docHtml = '<!doctype html><html lang="fr"><head><meta charset="utf-8">';
    docHtml += '<title>MBA-CONSULT - Rapport</title>';
    docHtml += '<style>';
    docHtml += '@page { size: A4; margin: 15mm; }';
    docHtml += 'body { font-family: Arial, sans-serif; color: #17202a; line-height: 1.6; padding: 0; margin: 0; background: #fff; }';
    docHtml += '.header { background: linear-gradient(135deg, #0a2540, #1e5aa8); color: white; padding: 24px; margin: -15mm -15mm 20px -15mm; text-align: center; }';
    docHtml += '.header h1 { margin: 0; font-size: 24px; letter-spacing: 3px; }';
    docHtml += '.header p { margin: 4px 0 0 0; opacity: 0.9; font-size: 13px; }';
    docHtml += '.enonce { background: #f5f7fa; border-left: 5px solid #0a2540; padding: 16px 18px; margin: 20px 0; border-radius: 4px; }';
    docHtml += '.enonce p { margin: 0; font-size: 14px; color: #0a2540; font-weight: 600; line-height: 1.6; }';
    docHtml += '.content { padding: 0; }';
    docHtml += '.content h3 { color: #0a2540; border-bottom: 2px solid #1e5aa8; padding-bottom: 8px; margin: 20px 0 14px 0; font-size: 17px; }';
    docHtml += '.content h4 { color: #0a2540; font-size: 15px; font-weight: 700; margin: 16px 0 10px 0; }';
    docHtml += '.content p { margin: 10px 0; font-size: 13px; text-align: justify; }';
    docHtml += '.content ul { margin: 10px 0; padding-left: 24px; }';
    docHtml += '.content li { margin: 6px 0; font-size: 13px; }';
    docHtml += '.content table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12px; page-break-inside: avoid; }';
    docHtml += '.content table th { background: #0a2540; color: white; padding: 8px 10px; text-align: left; }';
    docHtml += '.content table td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }';
    docHtml += '.content svg { max-width: 100%; height: auto; page-break-inside: avoid; display: block; margin: 10px auto; }';
    docHtml += '.content div[style*="background"] { page-break-inside: avoid; }';
    docHtml += '.footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #0a2540; text-align: center; font-size: 11px; color: #6b7280; }';
    docHtml += '.footer strong { color: #0a2540; font-size: 13px; }';
    docHtml += '.print-btn { position: fixed; top: 20px; right: 20px; background: #0a2540; color: white; border: none; padding: 14px 28px; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 700; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 9999; }';
    docHtml += '.print-btn:hover { background: #1e5aa8; }';
    docHtml += '@media print { .print-btn { display: none; } }';
    docHtml += '</style></head><body>';

    docHtml += '<button class="print-btn" onclick="window.print()">Imprimer ou Sauvegarder en PDF</button>';

    docHtml += '<div class="header">';
    docHtml += '<h1>MBA-CONSULT</h1>';
    docHtml += '<p>Intelligence Commerciale et Global Business Development</p>';
    docHtml += '<p style="font-size:11px;margin-top:8px">Rapport genere le ' + new Date().toLocaleString('fr-FR') + '</p>';
    docHtml += '</div>';

    // Enonce de la question (SANS titre "Question posee")
    if (question) {
      docHtml += '<div class="enonce">';
      docHtml += '<p>' + question.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
      docHtml += '</div>';
    }

    docHtml += '<div class="content">' + clone.innerHTML + '</div>';

    docHtml += '<div class="footer">';
    docHtml += '<p><strong>MBA-CONSULT TUNISIA</strong></p>';
    docHtml += '<p>Sfax et Tunis | +216 29.205.260 | contact@mba.consult.tn</p>';
    docHtml += '<p style="margin-top:10px">Document confidentiel - Usage interne</p>';
    docHtml += '</div>';

    docHtml += '</body></html>';

    var win = window.open('', '_blank');
    if (!win) {
      alert('Veuillez autoriser les popups dans votre navigateur.');
      return;
    }
    win.document.write(docHtml);
    win.document.close();
    setTimeout(function() {
      win.focus();
      win.print();
    }, 800);
  }
  window.downloadAsPDF = downloadAsPDF;

  // ============================================================
  // 11. DECORATEUR (boutons Traduire + Partager + Lire + PDF)
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
      btnTranslate.textContent = 'Traduire';
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
      btnShare.textContent = 'Partager';
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
      btnSpeak.textContent = 'Lire';
      btnSpeak.style.cssText = 'background:#dc2626;color:white;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600;';
      btnSpeak.onclick = (function(txt) {
        return function(e) {
          e.preventDefault(); e.stopPropagation();
          window.toggleSpeech(btnSpeak, txt);
        };
      })(text);
      bar.appendChild(btnSpeak);

      var btnPDF = document.createElement('button');
      btnPDF.type = 'button';
      btnPDF.textContent = 'Telecharger PDF';
      btnPDF.style.cssText = 'background:#0a2540;color:white;border:none;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:700;';
      btnPDF.onclick = (function(el) {
        return function(e) {
          e.preventDefault(); e.stopPropagation();
          window.downloadAsPDF(el);
        };
      })(bot);
      bar.appendChild(btnPDF);

      bot.appendChild(bar);
    }
  }
  window.decorateMessages = decorateMessages;

  // ============================================================
  // 12. LANCEMENT
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
  // 13. EXPOSER LES FONCTIONS ANALYSE
  // ============================================================
  try {
    if (typeof analyzeContent === 'function') window.analyzeContent = analyzeContent;
    if (typeof switchDialogTab === 'function') window.switchDialogTab = switchDialogTab;
    if (typeof openAnalyzeDialog === 'function') window.openAnalyzeDialog = openAnalyzeDialog;
    if (typeof closeAnalyzeDialog === 'function') window.closeAnalyzeDialog = closeAnalyzeDialog;
  } catch (e) {
    console.warn('[voice-fix] Erreur exposition analyse :', e.message);
  }

  console.log('[voice-fix.js] V2 charge - tous les modules actifs + PDF');
})();
