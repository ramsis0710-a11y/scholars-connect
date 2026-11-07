/* ==========================================================
   TRANSLATE-SHARE.JS v2
   - Boutons "Traduire" et "Partager" sur TOUS les messages
   - Corrige les messages déjà présents (historique, rechargement)
   - Corrige les boutons "Reposer cette question" / "Continuer"
   100% autonome - Ne touche pas au backend
   ========================================================== */
(function () {
  'use strict';
  if (window.__scTranslateShareV2) return;
  window.__scTranslateShareV2 = true;

  // ---------- Langues ----------
  var LANGS = {
    'fr': 'Français', 'en': 'Anglais', 'ar': 'Arabe', 'es': 'Espagnol',
    'de': 'Allemand', 'it': 'Italien', 'pt': 'Portugais', 'ru': 'Russe',
    'zh': 'Chinois', 'ja': 'Japonais', 'ko': 'Coréen', 'tr': 'Turc',
    'fa': 'Persan', 'hi': 'Hindi', 'he': 'Hébreu', 'nl': 'Néerlandais',
    'pl': 'Polonais', 'el': 'Grec', 'vi': 'Vietnamien', 'th': 'Thaï',
    'id': 'Indonésien', 'sv': 'Suédois', 'uk': 'Ukrainien', 'ro': 'Roumain',
    'cs': 'Tchèque', 'hu': 'Hongrois', 'bn': 'Bengali', 'ms': 'Malais', 'sw': 'Swahili'
  };

  // ---------- Traduction ----------
  function translateText(text, targetLang) {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + targetLang + '&dt=t&q=' + encodeURIComponent(text);
    return fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data[0]) return data[0].map(function(item) { return item[0]; }).join('');
        return text;
      })
      .catch(function(e) { console.error('[translate-share] Erreur traduction :', e); return text; });
  }

  // ---------- Partage ----------
  function shareContent(text, platform) {
    var encoded = encodeURIComponent(text);
    var url = encodeURIComponent(window.location.href);
    var shareLinks = {
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + url + '&quote=' + encoded,
      twitter: 'https://twitter.com/intent/tweet?text=' + encoded,
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + url,
      whatsapp: 'https://api.whatsapp.com/send?text=' + encoded,
      telegram: 'https://t.me/share/url?url=' + url + '&text=' + encoded,
      email: 'mailto:?subject=Partage%20Scholars%20Connect&body=' + encoded
    };
    if (platform === 'native' && navigator.share) {
      navigator.share({ title: 'Scholars Connect', text: text, url: window.location.href })
        .catch(function() {});
      return;
    }
    if (platform === 'copy') {
      navigator.clipboard.writeText(text).then(function() { alert('Texte copié !'); }).catch(function() { alert('Impossible de copier.'); });
      return;
    }
    if (shareLinks[platform]) window.open(shareLinks[platform], '_blank', 'width=600,height=500');
  }

  function showShareMenu(text) {
    var old = document.getElementById('sc-share-menu');
    if (old) old.remove();
    var menu = document.createElement('div');
    menu.id = 'sc-share-menu';
    menu.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100000;display:flex;justify-content:center;align-items:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;padding:20px;border-radius:12px;max-width:400px;width:90%;font-family:Arial,sans-serif;';
    box.innerHTML = '<h4 style="margin:0 0 15px;color:#0a2540;text-align:center;">Partager ce message</h4>';
    var platforms = [
      { id: 'native', label: '📱 Partage natif', bg: '#0a2540' },
      { id: 'copy', label: '📋 Copier le texte', bg: '#475569' },
      { id: 'whatsapp', label: '🟢 WhatsApp', bg: '#25D366' },
      { id: 'facebook', label: '🔵 Facebook', bg: '#1877F2' },
      { id: 'twitter', label: '⚫ X (Twitter)', bg: '#000000' },
      { id: 'linkedin', label: '🔷 LinkedIn', bg: '#0A66C2' },
      { id: 'telegram', label: '🔵 Telegram', bg: '#0088cc' },
      { id: 'email', label: '✉️ Email', bg: '#EA4335' }
    ];
    platforms.forEach(function(p) {
      var btn = document.createElement('button');
      btn.textContent = p.label;
      btn.style.cssText = 'display:block;width:100%;margin:5px 0;padding:10px;border:none;border-radius:6px;color:#fff;background:' + p.bg + ';font-weight:bold;cursor:pointer;';
      btn.onclick = function() { shareContent(text, p.id); menu.remove(); };
      box.appendChild(btn);
    });
    var cancel = document.createElement('button');
    cancel.textContent = 'Annuler';
    cancel.style.cssText = 'display:block;width:100%;margin-top:10px;padding:10px;border:1px solid #ccc;border-radius:6px;background:#f1f5f9;cursor:pointer;';
    cancel.onclick = function() { menu.remove(); };
    box.appendChild(cancel);
    menu.appendChild(box);
    menu.onclick = function(e) { if (e.target === menu) menu.remove(); };
    document.body.appendChild(menu);
  }

  // ---------- Injection sur un message ----------
  function addButtonsToMessage(msgNode) {
    if (!msgNode || msgNode.getAttribute('data-sc-trad-added')) return;
    if (msgNode.classList.contains('loading')) return;

    // Trouver le texte : on cherche la bulle de message
    var textNode = msgNode.querySelector('.msg-text') || msgNode.querySelector('.message-text') || msgNode;
    if (!textNode) return;

    msgNode.setAttribute('data-sc-trad-added', '1');

    // Eviter les doublons : retirer un ancien .msg-actions si présent
    var oldActions = msgNode.querySelector('.msg-actions.sc-trad');
    if (oldActions) oldActions.remove();

    var actions = document.createElement('div');
    actions.className = 'msg-actions sc-trad';
    actions.style.cssText = 'margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;';

    // Bouton Traduire
    var btnTranslate = document.createElement('button');
    btnTranslate.type = 'button';
    btnTranslate.innerHTML = '🌐 Traduire';
    btnTranslate.style.cssText = 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:4px 10px;border-radius:14px;font-size:11px;cursor:pointer;font-weight:bold;';
    btnTranslate.onclick = function() {
      var langCode = prompt('Code langue (fr, en, ar, es, de, it, pt, ru, zh, ja, ko, tr, fa, hi, he, nl, pl, el, vi, th, id, sv, uk, ro, cs, hu, bn, ms, sw) :', 'en');
      if (!langCode || !LANGS[langCode]) { if (langCode) alert('Langue non supportée.'); return; }
      var originalText = textNode.innerText || textNode.textContent;
      btnTranslate.innerHTML = '⏳...';
      translateText(originalText, langCode).then(function(translated) {
        var old = msgNode.querySelector('.sc-translation');
        if (old) old.remove();
        var transDiv = document.createElement('div');
        transDiv.className = 'sc-translation';
        transDiv.style.cssText = 'margin-top:10px;padding:10px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;font-size:13px;color:#166534;';
        transDiv.innerHTML = '<strong>Traduction (' + LANGS[langCode] + ') :</strong><br>' + translated;
        textNode.appendChild(transDiv);
        btnTranslate.innerHTML = '🌐 Traduire';
      });
    };
    actions.appendChild(btnTranslate);

    // Bouton Partager
    var btnShare = document.createElement('button');
    btnShare.type = 'button';
    btnShare.innerHTML = '🔗 Partager';
    btnShare.style.cssText = 'background:#fef3c7;color:#b45309;border:1px solid #fde68a;padding:4px 10px;border-radius:14px;font-size:11px;cursor:pointer;font-weight:bold;';
    btnShare.onclick = function() {
      var text = textNode.innerText || textNode.textContent;
      showShareMenu(text);
    };
    actions.appendChild(btnShare);

    msgNode.appendChild(actions);
  }

  // ---------- Scanner TOUS les messages (existants + nouveaux) ----------
  function scanAllMessages() {
    var selectors = '.msg, .message, .bot, .user, .chat-message, .message-row, .bubble';
    document.querySelectorAll(selectors).forEach(function(n) {
      // Ne pas ajouter au conteneur global, seulement aux bulles
      if (n.id === 'messages') return;
      addButtonsToMessage(n);
    });
  }

  // ---------- Activer les boutons d'historique ----------
  function fixHistoryButtons() {
    // Cherche les boutons "Reposer cette question", "Continuer la discussion", etc.
    var buttons = document.querySelectorAll('button, a');
    buttons.forEach(function(b) {
      var txt = (b.textContent || '').toLowerCase();
      if (/reposer|continuer la discussion|reprendre|continuer/.test(txt)) {
        if (!b.getAttribute('data-sc-fixed')) {
          b.setAttribute('data-sc-fixed', '1');
          // Si le bouton est disabled, on le réactive
          if (b.disabled) b.disabled = false;
          // Si le bouton n'a pas de style "pointer", on l'ajoute
          b.style.cursor = 'pointer';
          b.style.opacity = '1';
          // Si le bouton n'a pas de gestionnaire, on en ajoute un : il ouvre la question
          b.addEventListener('click', function(e) {
            // Remonter à la question associée (chercher dans la même carte)
            var card = b.closest('.history-item, .history-card, .qa-item, .history-entry');
            if (card) {
              var question = card.querySelector('.question, .history-question, .user-text');
              if (question) {
                var input = document.getElementById('input') || document.querySelector('textarea');
                if (input) { input.value = question.innerText || question.textContent; input.focus(); }
              }
            }
          });
        }
      }
    });
  }

  // ---------- Observateur global ----------
  function watchMessages() {
    var box = document.getElementById('messages');
    if (!box) { setTimeout(watchMessages, 500); return; }
    if (box.getAttribute('data-sc-trad-watch')) {
      // Déjà surveillé, mais on rescanne les nouveaux éléments
      scanAllMessages();
      fixHistoryButtons();
      return;
    }
    box.setAttribute('data-sc-trad-watch', '1');

    // Scan initial
    scanAllMessages();
    fixHistoryButtons();

    // Observer les nouveaux messages
    new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType !== 1) return;
          // Si c'est une bulle, l'ajouter ; sinon, chercher dedans
          if (n.matches && n.matches('.msg, .message, .bot, .user, .chat-message, .message-row, .bubble')) {
            addButtonsToMessage(n);
          } else {
            n.querySelectorAll && n.querySelectorAll('.msg, .message, .bot, .user, .chat-message, .message-row, .bubble').forEach(addButtonsToMessage);
          }
        });
      });
      // À chaque mutation, revérifier les boutons d'historique
      fixHistoryButtons();
    }).observe(box, { childList: true, subtree: true });

    // Observer aussi les changements dans le panneau d'historique
    var histPanel = document.querySelector('.history-panel, #history, .history-list');
    if (histPanel) {
      new MutationObserver(fixHistoryButtons).observe(histPanel, { childList: true, subtree: true });
    }
  }

  // ---------- Démarrage ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { watchMessages(); });
  } else {
    watchMessages();
  }
  // Re-scan régulier pour les messages ajoutés après rechargement de l'historique
  [500, 1500, 3000, 6000, 10000, 15000].forEach(function(ms) {
    setTimeout(function() {
      scanAllMessages();
      fixHistoryButtons();
    }, ms);
  });

  // Bouton global "Tout traduire"
  window.scTranslateAll = function(langCode) {
    if (!LANGS[langCode]) { alert('Langue non supportée.'); return; }
    var bots = document.querySelectorAll('.bot, .message.bot, .chat-message.bot');
    bots.forEach(function(b) {
      var textNode = b.querySelector('.msg-text') || b;
      var originalText = textNode.innerText || textNode.textContent;
      translateText(originalText, langCode).then(function(translated) {
        var old = b.querySelector('.sc-translation');
        if (old) old.remove();
        var transDiv = document.createElement('div');
        transDiv.className = 'sc-translation';
        transDiv.style.cssText = 'margin-top:10px;padding:10px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;font-size:13px;color:#166534;';
        transDiv.innerHTML = '<strong>Traduction (' + LANGS[langCode] + ') :</strong><br>' + translated;
        textNode.appendChild(transDiv);
      });
    });
  };

  console.log('[translate-share] v2 actif : boutons sur TOUS les messages + historique.');
})();