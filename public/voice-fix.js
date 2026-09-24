// ============================================================
// VOICE-FIX.JS - V2 avec DETECTION AUTOMATIQUE DES LANGUES
// - Detection auto pour dictee (via navigateur)
// - Detection auto pour lecture (via contenu texte)
// - Aucune intervention manuelle necessaire
// ============================================================

(function() {
  'use strict';

  // ============================================================
  // 1. DETECTION AUTOMATIQUE DE LA LANGUE
  // ============================================================
  function detectLanguageFromText(text) {
    if (!text) return 'fr-FR';
    var t = String(text).trim();

    // Detection par plage de caracteres Unicode
    if (/[\u0600-\u06FF]/.test(t)) return 'ar-SA';   // Arabe
    if (/[\u0590-\u05FF]/.test(t)) return 'he-IL';   // Hebreu
    if (/[\u4E00-\u9FFF]/.test(t)) return 'zh-CN';   // Chinois
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t)) return 'ja-JP'; // Japonais
    if (/[\uAC00-\uD7AF]/.test(t)) return 'ko-KR';   // Coreen
    if (/[\u0400-\u04FF]/.test(t)) return 'ru-RU';   // Russe
    if (/[\u0900-\u097F]/.test(t)) return 'hi-IN';   // Hindi
    if (/[\u0E00-\u0E7F]/.test(t)) return 'th-TH';   // Thai
    if (/[\u0370-\u03FF]/.test(t)) return 'el-GR';   // Grec

    // Detection par mots courants francais
    if (/\b(le|la|les|de|du|des|un|une|et|est|pour|dans|avec|sur|que|qui|pas|ce|cette)\b/i.test(t)) {
      return 'fr-FR';
    }
    // Detection anglais
    if (/\b(the|is|are|and|of|to|in|that|for|with|on|this|it|as|be|by|from)\b/i.test(t)) {
      return 'en-US';
    }
    // Detection espagnol
    if (/\b(el|la|los|las|de|del|y|es|para|con|por|que|como|no|si)\b/i.test(t)) {
      return 'es-ES';
    }
    // Detection allemand
    if (/\b(der|die|das|und|ist|fÃƒÂ¼r|mit|auf|von|zu|den|dem|des)\b/i.test(t)) {
      return 'de-DE';
    }

    return 'fr-FR';
  }

  // ============================================================
  // 2. DICTEE VOCALE AVEC DETECTION AUTO
  // ============================================================
  window.startDictation = function(onResult, onEnd, langCode) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Dictee non supportee. Utilisez Chrome ou Edge sur PC/Android.');
      return null;
    }

    var rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // Priorite : langue explicite > detection navigateur > fr par defaut
    if (langCode) {
      rec.lang = langCode;
    } else if (navigator.language) {
      rec.lang = navigator.language;
    } else {
      rec.lang = 'fr-FR';
    }

    var buffer = '';
    var silenceTimer = null;
    var detectedLang = rec.lang;

    rec.onresult = function(ev) {
      var interim = '', final = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) { final += t + ' '; }
        else { interim += t; }
      }
      if (final) {
        buffer += final;
        // Detection auto apres reception du texte
        var autoLang = detectLanguageFromText(buffer);
        if (autoLang !== detectedLang) {
          detectedLang = autoLang;
          console.log('[voice-fix] Langue detectee :', autoLang);
        }
      }
      if (onResult) onResult((buffer + interim).trim());

      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(function() {
        if (onEnd) onEnd(buffer.trim(), detectedLang);
      }, 10000);
    };

    rec.onerror = function(e) {
      console.error('Erreur dictee :', e.error);
      if (e.error === 'language-not-supported') {
        console.warn('Langue ' + rec.lang + ' non supportee, fallback fr-FR');
        rec.lang = 'fr-FR';
      }
    };

    rec.onend = function() {
      if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    };

    try { rec.start(); } catch (e) {
      console.error('Erreur demarrage dictee :', e.message);
      return null;
    }

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
  // 3. LECTURE VOCALE AVEC DETECTION AUTO
  // ============================================================
  window.speak = function(text, lang) {
    if (!('speechSynthesis' in window)) {
      alert('Synthese vocale non supportee.');
      return;
    }
    if (!text) return;

    // Detection auto si pas de langue specifiee
    var targetLang = lang || detectLanguageFromText(text);

    // Nettoyage lecture
    var clean = String(text)
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^#+\s*/gm, '')
      .replace(/_/g, ' ')
      .replace(/->/g, ' vers ')
      .replace(/=>/g, ' donne ')
      .replace(/=/g, ' egale ')
      .replace(/\+/g, ' plus ')
      .replace(/(\d)\s*-\s*(\d)/g, '$1 moins $2')
      .replace(/(\d)\s*\*\s*(\d)/g, '$1 fois $2')
      .replace(/(\d)\s*\/\s*(\d)/g, '$1 divise par $2')
      .replace(/Ã‚Â²/g, ' au carre ')
      .replace(/Ã‚Â³/g, ' au cube ')
      .replace(/Ã¢Ë†Å¡/g, ' racine carree de ')
      .replace(/Ãâ‚¬/g, ' pi ')
      .replace(/Ã‚Â°/g, ' degres ')
      .replace(/%/g, ' pour cent ')
      .replace(/^[-Ã¢â‚¬Â¢Ã‚Â·]\s*/gm, '')
      .replace(/^\d+\.\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(clean);
    u.lang = targetLang;
    u.rate = 0.9;
    u.pitch = 0.85;
    u.volume = 1.0;

    var voices = speechSynthesis.getVoices();
    var prefix = targetLang.split('-')[0];
    var chosen = null;

    // Voix arabe : chercher Majed en priorite
    if (prefix === 'ar') {
      chosen = voices.find(function(v) { return v.lang.indexOf('ar') === 0 && /Majed/i.test(v.name); })
            || voices.find(function(v) { return v.lang === 'ar-001'; })
            || voices.find(function(v) { return v.lang.indexOf('ar-SA') === 0; })
            || voices.find(function(v) { return v.lang.indexOf('ar') === 0; });
    } else {
      chosen = voices.find(function(v) { return v.lang.indexOf(prefix) === 0 && /Thomas|Henri|Paul|Guillaume|Yannick/i.test(v.name); })
            || voices.find(function(v) { return v.lang.indexOf(prefix) === 0 && /male|homme/i.test(v.name); })
            || voices.find(function(v) { return v.lang.indexOf(prefix) === 0; });
    }

    if (chosen) u.voice = chosen;
    console.log('[voice-fix] Lecture en', targetLang, chosen ? '(' + chosen.name + ')' : '');
    speechSynthesis.speak(u);
  };

  // Recharger les voix
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = function() { speechSynthesis.getVoices(); };
  }

  // ============================================================
  // 4. BOUTON MICRO (toggle)
  // ============================================================
  var activeRec = null;

  document.addEventListener('DOMContentLoaded', function() {
    var micBtn = document.getElementById('mic');
    if (!micBtn) {
      console.warn('[voice-fix] Bouton MIC introuvable');
      return;
    }

    micBtn.addEventListener('click', function() {
      var langSel = document.getElementById('lang');
      var selected = langSel ? langSel.value : null;
      var dictLang = selected ? (selected === 'ar' ? 'ar-SA' : (selected === 'en' ? 'en-US' : (selected === 'fr' ? 'fr-FR' : selected))) : navigator.language;

      var dictStatus = document.getElementById('dict-status');
      var confirmBtn = document.getElementById('confirm-dict');

      if (activeRec) {
        window.stopDictation();
        activeRec = null;
        micBtn.classList.remove('active');
        if (dictStatus) dictStatus.classList.remove('active');
        if (confirmBtn) confirmBtn.classList.remove('active');
      } else {
        activeRec = window.startDictation(
          function(text) {
            var input = document.getElementById('input');
            if (input) input.value = text;
          },
          function(finalText, detectedLang) {
            var input = document.getElementById('input');
            if (input) input.value = finalText;
            if (confirmBtn) confirmBtn.classList.add('active');
            // Mettre a jour le menu langue automatiquement
            if (detectedLang && langSel) {
              var code = detectedLang.split('-')[0];
              langSel.value = code;
            }
          },
          dictLang
        );
        if (activeRec) {
          micBtn.classList.add('active');
          if (dictStatus) dictStatus.classList.add('active');
        }
      }
    });
  });

  // Exposer toggleDictation globalement
  window.toggleDictation = function() {
    var micBtn = document.getElementById('mic');
    if (micBtn) micBtn.click();
  };

  
  // ============================================================
  // FONCTION send() - ENVOI QUESTION A L'IA
  // Ajoutee pour remplacer celle qui a ete supprimee
  // ============================================================
  window.send = function() {
    var input = document.getElementById('input');
    var sendBtn = document.getElementById('send');
    if (!input) { console.error('[voice-fix] input introuvable'); return; }

    var text = input.value.trim();
    if (!text) { console.warn('[voice-fix] Message vide'); return; }
    if (sendBtn && sendBtn.disabled) return;

    // Langue selectionnee
    var langSel = document.getElementById('lang');
    var lang = langSel ? langSel.value : 'fr';

    // Domaine
    var domainSel = document.getElementById('domain');
    var domain = domainSel ? domainSel.value : 'General';

    // Scholar
    var selectedScholar = null;
    var selectedChip = document.querySelector('.scholar-chip.selected');
    if (selectedChip) selectedScholar = selectedChip.textContent;

    // Token
    var token = localStorage.getItem('token');
    if (!token) {
      alert('Session expiree. Reconnecte-toi.');
      window.location.href = '/login';
      return;
    }

    // UI : afficher la question
    var messages = document.getElementById('messages');
    if (messages) {
      var userMsg = document.createElement('div');
      userMsg.className = 'msg user';
      userMsg.textContent = text;
      messages.appendChild(userMsg);
      messages.scrollTop = messages.scrollHeight;
    }

    input.value = '';
    input.style.height = 'auto';
    if (sendBtn) sendBtn.disabled = true;

    // Loading
    var loadingMsg = null;
    if (messages) {
      loadingMsg = document.createElement('div');
      loadingMsg.className = 'msg bot loading';
      loadingMsg.textContent = 'Reflexion en cours...';
      messages.appendChild(loadingMsg);
      messages.scrollTop = messages.scrollHeight;
    }

    // Envoi API
    fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        question: text,
        language: lang,
        domain: domain,
        scholar: selectedScholar
      })
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

        // Boutons d'action
        var actions = document.createElement('div');
        actions.className = 'msg-actions';
        actions.innerHTML =
          '<button onclick="window.speak(this.parentElement.parentElement.textContent, \'' + (lang === 'ar' ? 'ar-SA' : (lang === 'en' ? 'en-US' : 'fr-FR')) + '\')">&#128266; Lire</button>' +
          '<button onclick="navigator.clipboard.writeText(this.parentElement.parentElement.textContent); alert(\'Copie !\')">Copier</button>';
        botMsg.appendChild(actions);
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
    .finally(function() {
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();
    });
  };

  // Exposer aussi en global pur (pour onclick="send()")
  send = window.send;


  // ============================================================
  // INJECTION AUTOMATIQUE DU BOUTON MIC SI ABSENT
  // ============================================================
  function injectMicButton() {
    if (document.getElementById('mic')) {
      console.log('[voice-fix] Bouton MIC deja present');
      return;
    }

    // Trouver la zone de saisie
    var inputArea = document.querySelector('.input-area') ||
                    document.querySelector('.row-input') ||
                    (document.getElementById('input') ? document.getElementById('input').parentElement : null);

    if (!inputArea) {
      console.warn('[voice-fix] Zone de saisie introuvable');
      return;
    }

    // Creer le bouton MIC
    var micBtn = document.createElement('button');
    micBtn.id = 'mic';
    micBtn.className = 'btn-mic';
    micBtn.type = 'button';
    micBtn.title = 'Dictee vocale';
    micBtn.textContent = 'MIC';
    micBtn.style.cssText = 'background:#dc2626;color:white;border:none;padding:14px;border-radius:12px;cursor:pointer;font-size:.95rem;font-weight:bold;letter-spacing:1px;';

    // Inserer AVANT le bouton Envoyer si possible
    var sendBtn = document.getElementById('send');
    if (sendBtn && sendBtn.parentElement) {
      sendBtn.parentElement.insertBefore(micBtn, sendBtn);
    } else {
      inputArea.appendChild(micBtn);
    }

    // Attacher l'evenement
    micBtn.addEventListener('click', function() {
      var langSel = document.getElementById('lang');
      var selected = langSel ? langSel.value : 'fr';
      var dictLang = 'fr-FR';
      if (selected === 'ar') dictLang = 'ar-SA';
      else if (selected === 'en') dictLang = 'en-US';
      else if (selected === 'es') dictLang = 'es-ES';
      else if (selected === 'tr') dictLang = 'tr-TR';
      else if (selected === 'fa') dictLang = 'fa-IR';
      else if (selected === 'ur') dictLang = 'ur-PK';

      var dictStatus = document.getElementById('dict-status');
      var confirmBtn = document.getElementById('confirm-dict');
      var rec = null;

      if (micBtn._activeRec) {
        // Arreter
        if (window.stopDictation) window.stopDictation();
        micBtn._activeRec = null;
        micBtn.style.background = '#dc2626';
        if (dictStatus) dictStatus.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'none';
      } else {
        // Demarrer
        if (!window.startDictation) {
          alert('La dictee vocale n est pas disponible.');
          return;
        }
        rec = window.startDictation(
          function(text) {
            var input = document.getElementById('input');
            if (input) input.value = text;
          },
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
              confirmBtn.style.marginTop = '8px';
              confirmBtn.textContent = 'Terminer la question';
              confirmBtn.onclick = function() {
                if (window.stopDictation) window.stopDictation();
                micBtn._activeRec = null;
                micBtn.style.background = '#dc2626';
                if (dictStatus) dictStatus.style.display = 'none';
                confirmBtn.style.display = 'none';
                if (window.send) window.send();
              };
            }
          },
          dictLang
        );

        if (rec) {
          micBtn._activeRec = rec;
          micBtn.style.background = '#16a34a';
          if (dictStatus) {
            dictStatus.style.display = 'block';
            dictStatus.style.background = '#fef3c7';
            dictStatus.style.border = '2px solid #f59e0b';
            dictStatus.style.padding = '8px 14px';
            dictStatus.style.borderRadius = '10px';
            dictStatus.style.fontSize = '.85rem';
            dictStatus.style.color = '#92400e';
            dictStatus.style.marginBottom = '8px';
            dictStatus.textContent = 'Dictee en cours... Parlez puis faites une pause de 10 secondes.';
          }
        }
      }
    });

    console.log('[voice-fix] Bouton MIC injecte');
  }

  // Lancer l injection au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectMicButton);
  } else {
    injectMicButton();
  }

  // Reinjecter si le DOM change (SPA)
  var observer = new MutationObserver(function() {
    if (!document.getElementById('mic')) injectMicButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });

console.log('[voice-fix.js] V2 charge - detection auto langues active');
})();