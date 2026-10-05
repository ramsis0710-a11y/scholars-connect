// VOICE-FIX.JS - Version 3 - PDF multi-QP
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
    if (/\b(le|la|les|de|du|des|un|une|et|est|pour|dans|avec|sur|que|qui|pas|ce|cette)\b/i.test(t)) return 'fr-FR';
    if (/\b(the|is|are|and|of|to|in|that|for|with|on|this|it|as|be|by|from)\b/i.test(t)) return 'en-US';
    return 'fr-FR';
  }

  // ============================================================
  // 2. VOIX
  // ============================================================
  function getArabicMaleVoice() {
    var voices = speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    var majed = voices.find(function(v) { return /^Majed$/i.test(v.name.trim()); });
    if (majed) return majed;
    var naayf = voices.find(function(v) { return /^Naayf/i.test(v.name.trim()); });
    if (naayf) return naayf;
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
      'en': /David|Mark|James|George|Daniel/i
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
    var clean = String(text).replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '').replace(/_/g, ' ').replace(/=/g, ' egale ').replace(/\+/g, ' plus ').replace(/\s+/g, ' ').trim();
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
    micRecognition = window.startDictation(
      function(text) { var input = document.getElementById('input'); if (input) input.value = text; },
      function(finalText) {
        var input = document.getElementById('input');
        if (input) input.value = finalText;
        if (confirmBtn) {
          confirmBtn.style.display = 'inline-block';
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
      body: JSON.stringify({ question: text, language: lang, domain: domain })
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
  // 7. TRADUCTION (simplifie)
  // ============================================================
  window.translateMessage = function(el) {
    var text = typeof el === 'string' ? el : (el && el.textContent ? el.textContent : '');
    if (!text) return;
    var targetLang = prompt('Traduire en quelle langue ? (fr, en, ar, es, de...)', 'en');
    if (!targetLang) return;
    var token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ text: text, targetLanguage: targetLang })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) { alert('Traduction :\n\n' + (data.translation || 'Aucune')); })
    .catch(function(err) { alert('Erreur : ' + err.message); });
  };

  // ============================================================
  // 8. PARTAGE
  // ============================================================
  function shareMessage(text) {
    if (navigator.share) {
      navigator.share({ title: 'Scholars Connect', text: text }).catch(function(){});
    } else {
      navigator.clipboard.writeText(text);
      alert('Texte copie dans le presse-papiers.');
    }
  }
  window.shareMessage = shareMessage;

  // ============================================================
  // 9. LECTURE 3 ETATS
  // ============================================================
  var currentSpeechBtn = null;
  window.toggleSpeech = function(btn, text) {
    if (!('speechSynthesis' in window)) { alert('Non supporte'); return; }
    var lang = detectLanguageFromText(text);
    if (currentSpeechBtn === btn && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      btn.innerHTML = 'Reprendre';
      return;
    }
    if (currentSpeechBtn === btn && speechSynthesis.paused) {
      speechSynthesis.resume();
      btn.innerHTML = 'Pause';
      return;
    }
    var clean = String(text).replace(/\*\*/g, '').replace(/\*/g, '').replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').trim();
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(clean);
    u.lang = lang;
    u.rate = 0.9;
    u.pitch = 0.85;
    var nativeVoice = getNativeVoiceForLanguage(lang);
    if (nativeVoice) u.voice = nativeVoice;
    u.onend = function() { btn.innerHTML = 'Lire'; currentSpeechBtn = null; };
    currentSpeechBtn = btn;
    btn.innerHTML = 'Pause';
    speechSynthesis.speak(u);
  };

  // ============================================================
  // 10. TELECHARGER PDF (v3 - capture TOUS les QP)
  // ============================================================
  function downloadAsPDF(element) {
    // === v3 : chercher TOUS les .qp-document du message ===
    var allQPDocs = element.querySelectorAll('.qp-document');
    var contentHTML = '';

    if (allQPDocs && allQPDocs.length > 0) {
      // Mode multi-QP : on capture chaque .qp-document avec saut de page
      for (var i = 0; i < allQPDocs.length; i++) {
        contentHTML += allQPDocs[i].outerHTML;
      }
    } else {
      // Mode standard : on capture tout le message
      var clone = element.cloneNode(true);
      var actions = clone.querySelector('.msg-actions');
      if (actions) actions.remove();
      contentHTML = clone.innerHTML;
    }

    // Recuperer la question
    var prev = element.previousElementSibling;
    var question = '';
    while (prev) {
      if (prev.classList && prev.classList.contains('msg') && prev.classList.contains('user')) {
        var qClone = prev.cloneNode(true);
        var qActions = qClone.querySelector('.msg-actions');
        if (qActions) qActions.remove();
        question = qClone.textContent.trim();
        break;
      }
      prev = prev.previousElementSibling;
    }

    var docHtml = '<!doctype html><html lang="fr"><head><meta charset="utf-8">';
    docHtml += '<title>MBA-CONSULT - Rapport QP</title>';
    docHtml += '<style>';
    docHtml += '@page { size: A4; margin: 15mm; }';
    docHtml += 'body { font-family: Arial, sans-serif; color: #17202a; line-height: 1.6; padding: 0; margin: 0; background: #fff; }';
    docHtml += '.header { background: linear-gradient(135deg, #0a2540, #1e5aa8); color: white; padding: 24px; margin: -15mm -15mm 20px -15mm; text-align: center; }';
    docHtml += '.header h1 { margin: 0; font-size: 24px; letter-spacing: 3px; }';
    docHtml += '.header p { margin: 4px 0 0 0; opacity: 0.9; font-size: 13px; }';
    docHtml += '.enonce { background: #f5f7fa; border-left: 5px solid #0a2540; padding: 16px 18px; margin: 20px 0; border-radius: 4px; }';
    docHtml += '.enonce p { margin: 0; font-size: 14px; color: #0a2540; font-weight: 600; line-height: 1.6; }';
    docHtml += '.content { padding: 0; }';
    docHtml += '.qp-document { page-break-before: always; page-break-inside: avoid; page-break-after: always; padding: 0; margin: 0; }';
    docHtml += '.qp-document:first-child { page-break-before: auto; }';
    docHtml += '.content h3 { color: #0a2540; border-bottom: 2px solid #1e5aa8; padding-bottom: 8px; margin: 20px 0 14px 0; font-size: 17px; }';
    docHtml += '.content h4 { color: #0a2540; font-size: 15px; font-weight: 700; margin: 16px 0 10px 0; }';
    docHtml += '.content p { margin: 10px 0; font-size: 13px; text-align: justify; }';
    docHtml += '.content ul { margin: 10px 0; padding-left: 24px; }';
    docHtml += '.content li { margin: 6px 0; font-size: 13px; }';
    docHtml += '.content table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; page-break-inside: avoid; }';
    docHtml += '.content table th { background: #0a2540; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }';
    docHtml += '.content table td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }';
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

    if (question) {
      docHtml += '<div class="enonce"><p>' + question.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></div>';
    }

    docHtml += '<div class="content">' + contentHTML + '</div>';

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
  // 11. DECORATEUR
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
        return function(e) { e.preventDefault(); e.stopPropagation(); window.translateMessage(txt); };
      })(text);
      bar.appendChild(btnTranslate);

      var btnShare = document.createElement('button');
      btnShare.type = 'button';
      btnShare.textContent = 'Partager';
      btnShare.style.cssText = 'background:white;border:1px solid #e5e7eb;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.85rem;color:#0a2540;font-weight:600;';
      btnShare.onclick = (function(txt) {
        return function(e) { e.preventDefault(); e.stopPropagation(); shareMessage(txt); };
      })(text);
      bar.appendChild(btnShare);

      var btnSpeak = document.createElement('button');
      btnSpeak.type = 'button';
      btnSpeak.textContent = 'Lire';
      btnSpeak.style.cssText = 'background:#dc2626;color:white;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600;';
      btnSpeak.onclick = (function(txt) {
        return function(e) { e.preventDefault(); e.stopPropagation(); window.toggleSpeech(btnSpeak, txt); };
      })(text);
      bar.appendChild(btnSpeak);

      var btnPDF = document.createElement('button');
      btnPDF.type = 'button';
      btnPDF.textContent = 'Telecharger PDF';
      btnPDF.style.cssText = 'background:#0a2540;color:white;border:none;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:700;';
      btnPDF.onclick = (function(el) {
        return function(e) { e.preventDefault(); e.stopPropagation(); window.downloadAsPDF(el); };
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
      var observer = new MutationObserver(function() { setTimeout(decorateMessages, 100); });
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

  console.log('[voice-fix.js] v3 charge - PDF multi-QP');
})();
