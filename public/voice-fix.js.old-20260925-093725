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
    if (/\b(der|die|das|und|ist|fÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¼r|mit|auf|von|zu|den|dem|des)\b/i.test(t)) {
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
      .replace(/ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â²/g, ' au carre ')
      .replace(/ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³/g, ' au cube ')
      .replace(/ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡/g, ' racine carree de ')
      .replace(/ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬/g, ' pi ')
      .replace(/ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°/g, ' degres ')
      .replace(/%/g, ' pour cent ')
      .replace(/^[-ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·]\s*/gm, '')
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
  // INJECTION DU BOUTON MIC - VERSION CORRIGEE (pas de double clic)
  // ============================================================
  var micToggleActive = false;
  var micRecognition = null;

  function injectMicButton() {
    var existing = document.getElementById('mic');
    if (existing) {
      // Le bouton existe deja (dans le HTML). On lui attache UNIQUEMENT onclick.
      // Effacer tout autre listener en clonant le bouton
      var clone = existing.cloneNode(true);
      existing.parentNode.replaceChild(clone, existing);
      existing = clone;

      // Attacher UN seul gestionnaire via onclick
      existing.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        handleMicClick();
      };

      // Style
      existing.style.background = '#dc2626';
      existing.style.color = 'white';
      existing.style.border = 'none';
      existing.style.padding = '14px';
      existing.style.borderRadius = '12px';
      existing.style.cursor = 'pointer';
      existing.style.fontSize = '.95rem';
      existing.style.fontWeight = 'bold';
      existing.style.letterSpacing = '1px';
      existing.textContent = 'MIC';

      console.log('[voice-fix] Bouton MIC configure (onclick unique)');
      return;
    }

    // Le bouton n'existe pas : le creer
    var inputArea = document.querySelector('.input-area') ||
                    document.querySelector('.row-input') ||
                    (document.getElementById('input') ? document.getElementById('input').parentElement : null);

    if (!inputArea) {
      console.warn('[voice-fix] Zone de saisie introuvable');
      return;
    }

    var micBtn = document.createElement('button');
    micBtn.id = 'mic';
    micBtn.className = 'btn-mic';
    micBtn.type = 'button';
    micBtn.title = 'Dictee vocale';
    micBtn.textContent = 'MIC';
    micBtn.style.cssText = 'background:#dc2626;color:white;border:none;padding:14px;border-radius:12px;cursor:pointer;font-size:.95rem;font-weight:bold;letter-spacing:1px;';
    micBtn.onclick = function(e) { e.preventDefault(); handleMicClick(); };

    var sendBtn = document.getElementById('send');
    if (sendBtn && sendBtn.parentElement) {
      sendBtn.parentElement.insertBefore(micBtn, sendBtn);
    } else {
      inputArea.appendChild(micBtn);
    }

    console.log('[voice-fix] Bouton MIC cree (onclick unique)');
  }

  // ============================================================
  // GESTIONNAIRE UNIQUE DU CLIC MIC
  // ============================================================
  function handleMicClick() {
    var micBtn = document.getElementById('mic');
    var dictStatus = document.getElementById('dict-status');
    var confirmBtn = document.getElementById('confirm-dict');

    if (micToggleActive && micRecognition) {
      // ARRETER
      try { micRecognition.stop(); } catch(e) {}
      micRecognition = null;
      micToggleActive = false;
      if (micBtn) micBtn.style.background = '#dc2626';
      if (dictStatus) dictStatus.style.display = 'none';
      if (confirmBtn) confirmBtn.style.display = 'none';
      console.log('[voice-fix] Dictee arretee');
      return;
    }

    // DEMARRER
    if (!window.startDictation) {
      alert('La dictee vocale n est pas disponible.');
      return;
    }

    var langSel = document.getElementById('lang');
    var selected = langSel ? langSel.value : 'fr';
    var dictLang = 'fr-FR';
    if (selected === 'ar') dictLang = 'ar-SA';
    else if (selected === 'en') dictLang = 'en-US';
    else if (selected === 'es') dictLang = 'es-ES';
    else if (selected === 'tr') dictLang = 'tr-TR';
    else if (selected === 'fa') dictLang = 'fa-IR';
    else if (selected === 'ur') dictLang = 'ur-PK';

    micRecognition = window.startDictation(
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
            if (micRecognition) { try { micRecognition.stop(); } catch(e) {} }
            micRecognition = null;
            micToggleActive = false;
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
        dictStatus.textContent = 'Dictee en cours... Parlez puis faites une pause de 10 secondes.';
      }
      console.log('[voice-fix] Dictee demarree en ' + dictLang);
    } else {
      console.warn('[voice-fix] startDictation a retourne null');
    }
  }

  // Lancer l injection au chargement
  function bootstrap() {
    setTimeout(injectMicButton, 500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  // Reinjecter si le DOM change
  var observer = new MutationObserver(function() {
    if (!document.getElementById('mic')) {
      setTimeout(injectMicButton, 300);
    }
  });
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });



  // ============================================================
  // MODULE TRADUCTION MULTILINGUE (23 langues)
  // ============================================================
  var TRANSLATION_LANGS = [
    { code: 'ar', name: 'ÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±ÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©' },
    { code: 'fr', name: 'Francais' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Espanol' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Portugues' },
    { code: 'ru', name: 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‹Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹' },
    { code: 'zh', name: 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¡' },
    { code: 'ja', name: 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¾' },
    { code: 'ko', name: 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚ÂªÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂµÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â´' },
    { code: 'tr', name: 'Turkce' },
    { code: 'fa', name: 'ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±ÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢' },
    { code: 'ur', name: 'ÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â±ÃƒÆ’Ã†â€™Ãƒâ€¹Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã¢â‚¬Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ' },
    { code: 'hi', name: 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¤ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬' },
    { code: 'he', name: 'ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¹Ã…â€œÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¨ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬ÂÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âª' },
    { code: 'nl', name: 'Nederlands' },
    { code: 'pl', name: 'Polski' },
    { code: 'sv', name: 'Svenska' },
    { code: 'el', name: 'ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â½ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â»ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂºÃƒÆ’Ã†â€™Ãƒâ€¦Ã‚Â½ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬' },
    { code: 'vi', name: 'Tieng Viet' },
    { code: 'th', name: 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢' },
    { code: 'id', name: 'Bahasa' }
  ];

  function openTranslateDialog(text) {
    // Retirer un eventuel dialog deja ouvert
    var old = document.getElementById('translate-dialog');
    if (old) old.remove();

    // Construire le dialog
    var dialog = document.createElement('div');
    dialog.id = 'translate-dialog';
    dialog.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:9999;';

    var box = document.createElement('div');
    box.style.cssText = 'background:white;border-radius:16px;padding:30px;max-width:600px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 25px 70px rgba(0,0,0,0.4);';

    var html = '<h3 style="color:#0a2540;margin-bottom:20px;font-size:1.2rem">ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â Traduire en...</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:20px">';

    for (var i = 0; i < TRANSLATION_LANGS.length; i++) {
      var l = TRANSLATION_LANGS[i];
      html += '<button type="button" data-lang="' + l.code + '" style="padding:10px;border:2px solid #e5e7eb;background:white;border-radius:10px;cursor:pointer;font-size:.9rem;font-weight:600;color:#0a2540;transition:all .2s" onmouseover="this.style.background=\'#1e5aa8\';this.style.color=\'white\'" onmouseout="this.style.background=\'white\';this.style.color=\'#0a2540\'">' + l.name + '</button>';
    }

    html += '</div>';
    html += '<div id="translate-result" style="margin-top:15px;padding:15px;background:#f5f7fa;border-radius:10px;min-height:60px;display:none"></div>';
    html += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:15px">';
    html += '<button type="button" id="translate-close" style="background:#f5f7fa;border:2px solid #e5e7eb;color:#0a2540;padding:10px 20px;border-radius:10px;font-weight:600;cursor:pointer">Fermer</button>';
    html += '</div>';

    box.innerHTML = html;
    dialog.appendChild(box);
    document.body.appendChild(dialog);

    // Fermer
    document.getElementById('translate-close').onclick = function() { dialog.remove(); };
    dialog.onclick = function(e) { if (e.target === dialog) dialog.remove(); };

    // Attacher les clics sur les langues
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
    resultBox.innerHTML = '<em>Traduction en cours...</em>';

    var token = localStorage.getItem('token');
    if (!token) {
      resultBox.innerHTML = '<span style="color:#b91c1c">Session expiree. Reconnecte-toi.</span>';
      return;
    }

    fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': 'Bearer ' + token
      },
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
        '<div style="margin-top:12px;display:flex;gap:8px">' +
        '<button type="button" id="translate-speak" style="background:#1e5aa8;color:white;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600">&#128266; Ecouter</button>' +
        '<button type="button" id="translate-copy" style="background:#f5f7fa;color:#0a2540;border:1px solid #e5e7eb;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600">Copier</button>' +
        '</div>';

      document.getElementById('translate-speak').onclick = function() {
        if (window.speak) {
          var langMap = { 'ar': 'ar-SA', 'fr': 'fr-FR', 'en': 'en-US', 'es': 'es-ES', 'de': 'de-DE', 'it': 'it-IT', 'pt': 'pt-PT', 'ru': 'ru-RU', 'zh': 'zh-CN', 'ja': 'ja-JP', 'ko': 'ko-KR', 'tr': 'tr-TR', 'fa': 'fa-IR', 'ur': 'ur-PK', 'hi': 'hi-IN', 'he': 'he-IL', 'nl': 'nl-NL', 'pl': 'pl-PL', 'sv': 'sv-SE', 'el': 'el-GR', 'vi': 'vi-VN', 'th': 'th-TH', 'id': 'id-ID' };
          window.speak(data.translation, langMap[targetLang] || 'fr-FR');
        }
      };

      document.getElementById('translate-copy').onclick = function() {
        navigator.clipboard.writeText(data.translation);
        this.textContent = 'Copie !';
        var btn = this;
        setTimeout(function() { btn.textContent = 'Copier'; }, 1500);
      };
    })
    .catch(function(err) {
      resultBox.innerHTML = '<span style="color:#b91c1c">Erreur : ' + err.message + '</span>';
    });
  }

  // Fonction principale appelee par les boutons
  window.translateMessage = function(elementOrText) {
    var text = '';
    if (typeof elementOrText === 'string') {
      text = elementOrText;
    } else if (elementOrText && elementOrText.textContent) {
      text = elementOrText.textContent;
    } else {
      // Chercher la derniere reponse bot
      var bots = document.querySelectorAll('.msg.bot');
      if (bots.length > 0) text = bots[bots.length - 1].textContent;
    }
    if (!text) { alert('Aucun texte a traduire'); return; }
    openTranslateDialog(text);
  };


  // ============================================================
  // EXPOSER LES FONCTIONS DE TRADUCTION GLOBALEMENT
  // ============================================================
  window.openTranslateDialog = openTranslateDialog;
  window.doTranslate = doTranslate;


  // ============================================================
  // DECORATEUR AUTOMATIQUE DES MESSAGES BOT
  // Ajoute les boutons TRADUIRE + PARTAGER sur chaque reponse
  // ============================================================
  function decorateMessages() {
    var bots = document.querySelectorAll('.msg.bot');
    for (var i = 0; i < bots.length; i++) {
      var bot = bots[i];
      if (bot.getAttribute('data-decorated') === '1') continue;
      if (bot.classList.contains('loading')) continue;

      // Recuperer le texte brut (sans les boutons deja presents)
      var clone = bot.cloneNode(true);
      var actions = clone.querySelector('.msg-actions');
      if (actions) actions.remove();
      var meta = clone.querySelector('.meta');
      if (meta) meta.remove();
      var text = clone.textContent.trim();
      if (!text) continue;

      bot.setAttribute('data-decorated', '1');

      // Retirer les anciens boutons s'il y en a
      var oldActions = bot.querySelector('.msg-actions');
      if (oldActions) oldActions.remove();

      // Creer la barre d'actions
      var bar = document.createElement('div');
      bar.className = 'msg-actions';
      bar.style.cssText = 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;';

      // Bouton TRADUIRE
      var btnTranslate = document.createElement('button');
      btnTranslate.type = 'button';
      btnTranslate.innerHTML = '&#127760; Traduire';
      btnTranslate.style.cssText = 'background:white;border:1px solid #e5e7eb;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.85rem;color:#0a2540;font-weight:600;';
      btnTranslate.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.openTranslateDialog) {
          window.openTranslateDialog(text);
        } else {
          alert('Module traduction non disponible');
        }
      };
      bar.appendChild(btnTranslate);

      // Bouton PARTAGER
      var btnShare = document.createElement('button');
      btnShare.type = 'button';
      btnShare.innerHTML = '&#128279; Partager';
      btnShare.style.cssText = 'background:white;border:1px solid #e5e7eb;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.85rem;color:#0a2540;font-weight:600;';
      btnShare.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        shareMessage(text);
      };
      bar.appendChild(btnShare);

      // Bouton LIRE
      var btnSpeak = document.createElement('button');
      btnSpeak.type = 'button';
      btnSpeak.innerHTML = '&#128266; Lire';
      btnSpeak.style.cssText = 'background:#dc2626;color:white;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600;';
      btnSpeak.onclick = (function(txt) {
        return function(e) {
          e.preventDefault();
          e.stopPropagation();
          if (window.toggleSpeech) {
            window.toggleSpeech(btnSpeak, txt);
          } else if (window.speak) {
            window.speak(txt);
          }
        };
      })(text);
      bar.appendChild(btnSpeak);
      bar.appendChild(btnSpeak);

      bot.appendChild(bar);
    }
  }

  // ============================================================
  // FONCTION PARTAGER (Web Share API + fallback)
  // ============================================================
  function shareMessage(text) {
    var shareData = {
      title: 'Scholars Connect',
      text: text
    };

    if (navigator.share) {
      navigator.share(shareData).catch(function(err) {
        if (err.name !== 'AbortError') {
          fallbackShare(text);
        }
      });
    } else {
      fallbackShare(text);
    }
  }

  function fallbackShare(text) {
    // Popup avec options de partage
    var old = document.getElementById('share-dialog');
    if (old) old.remove();

    var dialog = document.createElement('div');
    dialog.id = 'share-dialog';
    dialog.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:9999;';

    var box = document.createElement('div');
    box.style.cssText = 'background:white;border-radius:16px;padding:30px;max-width:500px;width:90%;box-shadow:0 25px 70px rgba(0,0,0,0.4);';

    var encodedText = encodeURIComponent(text);
    var pageUrl = encodeURIComponent(window.location.origin);

    var html = '<h3 style="color:#0a2540;margin-bottom:20px;font-size:1.2rem">&#128279; Partager</h3>';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:20px">';
    html += '<a href="https://wa.me/?text=' + encodedText + '" target="_blank" style="padding:12px;background:#25D366;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600;font-size:.9rem">WhatsApp</a>';
    html += '<a href="https://t.me/share/url?url=' + pageUrl + '&text=' + encodedText + '" target="_blank" style="padding:12px;background:#0088cc;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600;font-size:.9rem">Telegram</a>';
    html += '<a href="https://twitter.com/intent/tweet?text=' + encodedText + '" target="_blank" style="padding:12px;background:#000;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600;font-size:.9rem">X (Twitter)</a>';
    html += '<a href="https://www.facebook.com/sharer/sharer.php?u=' + pageUrl + '&quote=' + encodedText + '" target="_blank" style="padding:12px;background:#1877f2;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600;font-size:.9rem">Facebook</a>';
    html += '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' + pageUrl + '" target="_blank" style="padding:12px;background:#0077b5;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600;font-size:.9rem">LinkedIn</a>';
    html += '<a href="mailto:?subject=Scholars%20Connect&body=' + encodedText + '" style="padding:12px;background:#6b7280;color:white;border-radius:10px;text-decoration:none;text-align:center;font-weight:600;font-size:.9rem">Email</a>';
    html += '</div>';
    html += '<button type="button" id="share-copy" style="width:100%;padding:12px;background:#1e5aa8;color:white;border:none;border-radius:10px;font-weight:600;cursor:pointer;margin-bottom:10px">Copier le texte</button>';
    html += '<button type="button" id="share-close" style="width:100%;padding:10px;background:#f5f7fa;border:2px solid #e5e7eb;color:#0a2540;border-radius:10px;font-weight:600;cursor:pointer">Fermer</button>';

    box.innerHTML = html;
    dialog.appendChild(box);
    document.body.appendChild(dialog);

    document.getElementById('share-close').onclick = function() { dialog.remove(); };
    document.getElementById('share-copy').onclick = function() {
      navigator.clipboard.writeText(text);
      this.textContent = 'Copie !';
      var btn = this;
      setTimeout(function() { btn.textContent = 'Copier le texte'; }, 1500);
    };
    dialog.onclick = function(e) { if (e.target === dialog) dialog.remove(); };
  }

  // Exposer les fonctions
  window.shareMessage = shareMessage;
  window.decorateMessages = decorateMessages;

  // ============================================================
  // LANCEMENT AUTOMATIQUE DU DECORATEUR
  // ============================================================
  function startDecorator() {
    // Premier passage apres 1 seconde
    setTimeout(decorateMessages, 1000);

    // Observer les changements dans #messages
    var messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
      var observer = new MutationObserver(function() {
        setTimeout(decorateMessages, 100);
      });
      observer.observe(messagesContainer, { childList: true, subtree: true });
      console.log('[voice-fix] Decorateur actif sur #messages');
    }

    // Repetition periodique (au cas ou)
    setInterval(decorateMessages, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startDecorator);
  } else {
    startDecorator();
  }


  // ============================================================
  // MODULE CONTROLE LECTURE VOCALE (pause / reprise / arret)
  // ============================================================
    // ============================================================
  // VOIX NATIVE PAR LANGUE
  // ============================================================
  function getNativeVoiceForLanguage(langCode) {
    var voices = speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    var prefix = langCode.split('-')[0];

    // Voix masculines connues par langue
    var maleVoiceNames = {
      'fr': /Thomas|Henri|Paul|Guillaume|Yannick|Google français/i,
      'ar': /Majed|Maged|Naayf/i,
      'en': /David|Mark|James|George|Daniel|Google US English|Microsoft David/i,
      'es': /Diego|Jorge|Juan|Carlos/i,
      'de': /Hans|Stefan|Klaus|Google Deutsch/i,
      'it': /Luca|Marco|Giovanni|Google italiano/i,
      'pt': /Felipe|Ricardo|Google português/i,
      'ru': /Yuri|Dmitri|Google русский/i,
      'zh': /Yunyang|Liang|Kangkang/i,
      'ja': /Keita|Hattori/i,
      'ko': /Yuna|Google 한국의/i,
      'tr': /Cem|Emre|Yelda/i,
      'fa': /Amir|Reza/i,
      'ur': /Asad|Uzma/i,
      'hi': /Ravi|Amit|Lekha/i,
      'he': /Asaf|Google עברית/i,
      'nl': /Xander|Google Nederlands/i,
      'pl': /Krzysztof|Google polski/i,
      'sv': /Oskar|Google svenska/i,
      'el': /Nikos|Google Ελληνικά/i,
      'vi': /Google Tiếng Việt/i,
      'th': /Google ไทย/i,
      'id': /Google Bahasa Indonesia/i
    };

    // 1. Chercher une voix qui correspond exactement au code langue
    var exactMatch = voices.find(function(v) { return v.lang === langCode; });
    if (exactMatch) return exactMatch;

    // 2. Chercher par préfixe de langue (fr, ar, en...)
    var prefixMatches = voices.filter(function(v) { return v.lang.indexOf(prefix) === 0; });

    if (prefixMatches.length > 0) {
      // 3. Preferer une voix masculine connue
      var maleRegex = maleVoiceNames[prefix];
      if (maleRegex) {
        var maleVoice = prefixMatches.find(function(v) { return maleRegex.test(v.name); });
        if (maleVoice) return maleVoice;
      }
      // 4. Sinon, prendre la première voix du préfixe
      return prefixMatches[0];
    }

    return null;
  }

  var currentSpeechBtn = null;
  var currentSpeechText = '';

  function updateSpeechBtn(btn, state) {
    if (!btn) return;
    if (state === 'playing') {
      btn.style.background = '#16a34a';
      btn.style.color = 'white';
      btn.innerHTML = '&#9208; Pause';
      btn.title = 'Lecture en cours - cliquer pour mettre en pause';
    } else if (state === 'paused') {
      btn.style.background = '#f59e0b';
      btn.style.color = 'white';
      btn.innerHTML = '&#9654; Reprendre';
      btn.title = 'En pause - cliquer pour reprendre';
    } else {
      btn.style.background = '#dc2626';
      btn.style.color = 'white';
      btn.innerHTML = '&#9209; Arrete';
      btn.title = 'Lecture arretee - cliquer pour relire';
    }
  }

  window.pauseSpeech = function() {
    if ('speechSynthesis' in window) {
      if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        updateSpeechBtn(currentSpeechBtn, 'paused');
        return 'paused';
      } else if (speechSynthesis.paused) {
        speechSynthesis.resume();
        updateSpeechBtn(currentSpeechBtn, 'playing');
        return 'resumed';
      }
    }
    return 'none';
  };

  window.stopSpeech = function() {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      updateSpeechBtn(currentSpeechBtn, 'stopped');
    }
    currentSpeechBtn = null;
    currentSpeechText = '';
  };

  window.toggleSpeech = function(btn, text) {
    if (currentSpeechBtn && currentSpeechBtn !== btn) {
      updateSpeechBtn(currentSpeechBtn, 'stopped');
    }

    if (currentSpeechBtn === btn) {
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

    if (!('speechSynthesis' in window)) {
      alert('Synthese vocale non supportee.');
      return;
    }

    var lang = 'fr-FR';
    if (/[\u0600-\u06FF]/.test(text)) lang = 'ar-SA';
    else if (/[\u0400-\u04FF]/.test(text)) lang = 'ru-RU';
    else if (/[\u4E00-\u9FFF]/.test(text)) lang = 'zh-CN';
    else if (/[a-zA-Z]/.test(text) && !/[ÃƒÂ©ÃƒÂ¨ÃƒÂ ÃƒÂ§ÃƒÂ¹ÃƒÂ¢ÃƒÂªÃƒÂ®ÃƒÂ´ÃƒÂ»]/i.test(text)) lang = 'en-US';

    var clean = String(text)
      .replace(/\*\*/g, '').replace(/\*/g, '')
      .replace(/^#+\s*/gm, '').replace(/_/g, ' ')
      .replace(/->/g, ' vers ').replace(/=>/g, ' donne ')
      .replace(/=/g, ' egale ').replace(/\+/g, ' plus ')
      .replace(/(\d)\s*-\s*(\d)/g, '$1 moins $2')
      .replace(/(\d)\s*\*\s*(\d)/g, '$1 fois $2')
      .replace(/(\d)\s*\/\s*(\d)/g, '$1 divise par $2')
      .replace(/Ã‚Â²/g, ' au carre ').replace(/Ã‚Â³/g, ' au cube ')
      .replace(/Ã¢Ë†Å¡/g, ' racine carree de ').replace(/Ãâ‚¬/g, ' pi ')
      .replace(/Ã‚Â°/g, ' degres ').replace(/%/g, ' pour cent ')
      .replace(/^[-Ã¢â‚¬Â¢Ã‚Â·]\s*/gm, '').replace(/^\d+\.\s*/gm, '')
      .replace(/\s+/g, ' ').trim();

    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(clean);
    u.lang = lang;
    u.rate = 0.9;
    u.pitch = 0.85;
    u.volume = 1.0;

    var voices = speechSynthesis.getVoices();
    var prefix = lang.split('-')[0];
    var chosen = null;

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

    u.onstart = function() { updateSpeechBtn(btn, 'playing'); };
    u.onend   = function() { updateSpeechBtn(btn, 'stopped'); currentSpeechBtn = null; };
    u.onerror = function() { updateSpeechBtn(btn, 'stopped'); currentSpeechBtn = null; };

    currentSpeechBtn = btn;
    currentSpeechText = text;

    speechSynthesis.speak(u);
  };

console.log('[voice-fix.js] V2 charge - detection auto langues active');
})();