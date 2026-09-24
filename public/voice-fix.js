// ============================================================
// VOICE-FIX.JS - Correction microphone + dictÃ©e multilingue
// Fichier SÃ‰PARÃ‰ - NE TOUCHE PAS Ã  chat.html
// ============================================================

(function() {
  'use strict';

  // ---------- 1. DICTEE VOCALE MULTILINGUE ----------
  window.startDictation = function(onResult, onEnd, langCode) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('La dictÃ©e vocale n\'est pas supportÃ©e par ce navigateur. Utilisez Chrome ou Edge.');
      return null;
    }

    var rec = new SR();
    rec.lang = langCode || 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    var buffer = '';
    var silenceTimer = null;

    rec.onresult = function(ev) {
      var interim = '', final = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) { final += t + ' '; }
        else { interim += t; }
      }
      if (final) buffer += final;
      if (onResult) onResult((buffer + interim).trim());

      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(function() {
        if (onEnd) onEnd(buffer.trim());
      }, 10000);
    };

    rec.onerror = function(e) {
      console.error('Erreur dictÃ©e :', e.error);
      if (e.error === 'language-not-supported') {
        alert('La langue ' + rec.lang + ' n\'est pas supportÃ©e.');
      } else if (e.error === 'not-allowed') {
        alert('Autorisez l\'accÃ¨s au microphone dans les paramÃ¨tres du navigateur.');
      } else if (e.error === 'no-speech') {
        console.warn('Aucune parole dÃ©tectÃ©e.');
      }
    };

    rec.onend = function() {
      if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    };

    try { rec.start(); } catch (e) {
      console.error('Erreur dÃ©marrage dictÃ©e :', e.message);
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

  // ---------- 2. LECTURE VOCALE ARABE (voix Majed grave) ----------
  window.speak = function(text, lang) {
    if (!('speechSynthesis' in window)) {
      alert('La synthÃ¨se vocale n\'est pas supportÃ©e.');
      return;
    }
    if (!text) return;
    lang = lang || 'fr-FR';

    // Nettoyage pour lecture naturelle
    var clean = String(text)
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^#+\s*/gm, '')
      .replace(/_/g, ' ')
      .replace(/->/g, ' vers ')
      .replace(/=>/g, ' donne ')
      .replace(/=/g, ' Ã©gale ')
      .replace(/\+/g, ' plus ')
      .replace(/(\d)\s*-\s*(\d)/g, '$1 moins $2')
      .replace(/(\d)\s*\*\s*(\d)/g, '$1 fois $2')
      .replace(/(\d)\s*\/\s*(\d)/g, '$1 divisÃ© par $2')
      .replace(/Â²/g, ' au carrÃ© ')
      .replace(/Â³/g, ' au cube ')
      .replace(/âˆš/g, ' racine carrÃ©e de ')
      .replace(/Ï€/g, ' pi ')
      .replace(/Â°/g, ' degrÃ©s ')
      .replace(/%/g, ' pour cent ')
      .replace(/^[-â€¢Â·]\s*/gm, '')
      .replace(/^\d+\.\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(clean);
    u.lang = lang;
    u.rate = 0.9;
    u.pitch = 0.85;   // voix grave
    u.volume = 1.0;

    var voices = speechSynthesis.getVoices();
    var prefix = lang.split('-')[0];
    var chosen = null;

    if (prefix === 'ar') {
      // Voix arabe masculine originale "Majed" (ar-001 ou ar-SA)
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
    speechSynthesis.speak(u);
  };

  // Recharge les voix si nÃ©cessaire (iOS)
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = function() { speechSynthesis.getVoices(); };
  }

  // ---------- 3. BOUTON MICRO (remplace l'ancien) ----------
  document.addEventListener('DOMContentLoaded', function() {
    var micBtn = document.getElementById('mic');
    if (!micBtn) return;

    var activeRec = null;

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
          function(finalText) {
            var input = document.getElementById('input');
            if (input) input.value = finalText;
            if (confirmBtn) confirmBtn.classList.add('active');
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

  
  // ---------- 4. EXPOSER toggleDictation GLOBALEMENT ----------
  // Le bouton HTML utilise onclick="toggleDictation()" qui a besoin
  // d'une fonction GLOBALE. Sans cette ligne, le bouton ne marche pas.

  window.toggleDictation = function() {
    var micBtn = document.getElementById('mic');
    if (!micBtn) {
      console.warn('[voice-fix] Bouton MIC introuvable');
      return;
    }
    // Simuler un clic sur le bouton pour declencher le listener
    micBtn.click();
  };

console.log('[voice-fix.js] ChargÃ© - dictÃ©e + lecture vocale + micro');
})();