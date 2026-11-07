/* ==========================================================
   TRANSLATE-SHARE.JS
   Ajoute les boutons "Traduire" et "Partager" sous chaque message
   100% autonome - Ne touche pas au fonctionnement du chat
   ========================================================== */
(function () {
  'use strict';
  if (window.__scTranslateShare) return;
  window.__scTranslateShare = true;

  // Langues disponibles pour la traduction
  var LANGS = {
    'fr': 'Français', 'en': 'Anglais', 'ar': 'Arabe', 'es': 'Espagnol',
    'de': 'Allemand', 'it': 'Italien', 'pt': 'Portugais', 'ru': 'Russe',
    'zh': 'Chinois', 'ja': 'Japonais', 'ko': 'Coréen', 'tr': 'Turc',
    'fa': 'Persan', 'hi': 'Hindi', 'he': 'Hébreu', 'nl': 'Néerlandais',
    'pl': 'Polonais', 'el': 'Grec', 'vi': 'Vietnamien', 'th': 'Thaï',
    'id': 'Indonésien', 'sv': 'Suédois', 'uk': 'Ukrainien', 'ro': 'Roumain',
    'cs': 'Tchèque', 'hu': 'Hongrois', 'bn': 'Bengali', 'ms': 'Malais', 'sw': 'Swahili'
  };

  // Fonction de traduction gratuite (Google Translate non officiel)
  function translateText(text, targetLang) {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + targetLang + '&dt=t&q=' + encodeURIComponent(text);
    return fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data[0]) {
          return data[0].map(function(item) { return item[0]; }).join('');
        }
        return text;
      })
      .catch(function(e) {
        console.error('[translate-share] Erreur traduction :', e);
        return text;
      });
  }

  // Fonction de partage
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
        .catch(function(e) { console.warn('[share] Partage annulé'); });
      return;
    }

    if (platform === 'copy') {
      navigator.clipboard.writeText(text).then(function() {
        alert('Texte copié dans le presse-papiers !');
      }).catch(function() {
        alert('Impossible de copier le texte.');
      });
      return;
    }

    if (shareLinks[platform]) {
      window.open(shareLinks[platform], '_blank', 'width=600,height=500');
    }
  }

  // Création du menu de partage
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
      { id: 'native', label: '📱 Partage natif (Mobile)', bg: '#0a2540' },
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
      btn.onclick = function() {
        shareContent(text, p.id);
        menu.remove();
      };
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

  // Injection des boutons sous chaque message
  function addButtonsToMessage(msgNode) {
    if (!msgNode || msgNode.getAttribute('data-sc-added')) return;
    
    // Ignorer les messages système (loading, etc.)
    if (msgNode.classList.contains('loading')) return;

    msgNode.setAttribute('data-sc-added', '1');

    // Trouver le conteneur de texte
    var textNode = msgNode.querySelector('.msg-text') || msgNode;
    if (!textNode) return;

    var actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.style.cssText = 'margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;';

    // Bouton Traduire
    var btnTranslate = document.createElement('button');
    btnTranslate.innerHTML = '🌐 Traduire';
    btnTranslate.style.cssText = 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:4px 10px;border-radius:14px;font-size:11px;cursor:pointer;font-weight:bold;';
    btnTranslate.onclick = function() {
      // Demander la langue
      var langCode = prompt(
        'Traduire en quelle langue ? (Code : fr, en, ar, es, de, it, pt, ru, zh, ja, ko, tr, fa, hi, he, nl, pl, el, vi, th, id, sv, uk, ro, cs, hu, bn, ms, sw)\n\n' +
        'Langues : ' + Object.keys(LANGS).join(', '),
        'fr'
      );
      
      if (!langCode || !LANGS[langCode]) {
        if (langCode) alert('Langue non supportée. Veuillez utiliser un code valide.');
        return;
      }

      var originalText = textNode.innerText || textNode.textContent;
      btnTranslate.innerHTML = '⏳ Traduction...';
      
      translateText(originalText, langCode).then(function(translated) {
        // Afficher la traduction sous le message original
        var existingTrans = msgNode.querySelector('.sc-translation');
        if (existingTrans) existingTrans.remove();

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
    btnShare.innerHTML = '🔗 Partager';
    btnShare.style.cssText = 'background:#fef3c7;color:#b45309;border:1px solid #fde68a;padding:4px 10px;border-radius:14px;font-size:11px;cursor:pointer;font-weight:bold;';
    btnShare.onclick = function() {
      var text = textNode.innerText || textNode.textContent;
      showShareMenu(text);
    };
    actions.appendChild(btnShare);

    msgNode.appendChild(actions);
  }

  // Observateur pour ajouter les boutons aux nouveaux messages
  function watchMessages() {
    var box = document.getElementById('messages');
    if (!box) {
      setTimeout(watchMessages, 500);
      return;
    }
    if (box.getAttribute('data-sc-translate-watch')) return;
    box.setAttribute('data-sc-translate-watch', '1');

    // Ajouter aux messages existants
    box.querySelectorAll('.msg, .message, .bot, .user').forEach(addButtonsToMessage);

    // Observer les nouveaux
    new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType === 1) {
            if (n.classList.contains('msg') || n.classList.contains('message') || n.classList.contains('bot') || n.classList.contains('user')) {
              addButtonsToMessage(n);
            } else {
              n.querySelectorAll('.msg, .message, .bot, .user').forEach(addButtonsToMessage);
            }
          }
        });
      });
    }).observe(box, { childList: true, subtree: true });
  }

  // Démarrage
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchMessages);
  } else {
    watchMessages();
  }
  [1000, 3000, 6000].forEach(function(ms) { setTimeout(watchMessages, ms); });
  
  console.log('[translate-share] Module actif (traduction + partage sur chaque message).');
})();