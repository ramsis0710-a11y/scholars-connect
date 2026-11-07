/* ==========================================================
   TRANSLATE-SHARE.JS v4 (PANNEAU HISTORIQUE FONCTIONNEL)
   - Crée un panneau "📚 Historique Pro" avec boutons fonctionnels
   - 🔁 Reposer cette question (fonctionne vraiment)
   - 💬 Continuer la discussion (pré-remplit le champ)
   - 🌐 Traduire et 🔗 Partager sur chaque message
   - Ajoute aussi Traduire/Partager sur les messages du chat
   100% autonome - Ne touche pas au backend
   ========================================================== */
(function () {
  'use strict';
  if (window.__scHistoryProV1) return;
  window.__scHistoryProV1 = true;

  var HIST_KEY = 'scholars_hist_v3';
  var LANGS = {
    'fr': 'Français', 'en': 'Anglais', 'ar': 'Arabe', 'es': 'Espagnol',
    'de': 'Allemand', 'it': 'Italien', 'pt': 'Portugais', 'ru': 'Russe',
    'zh': 'Chinois', 'ja': 'Japonais', 'ko': 'Coréen', 'tr': 'Turc',
    'fa': 'Persan', 'hi': 'Hindi', 'he': 'Hébreu', 'nl': 'Néerlandais',
    'pl': 'Polonais', 'el': 'Grec', 'vi': 'Vietnamien', 'th': 'Thaï',
    'id': 'Indonésien', 'sv': 'Suédois', 'uk': 'Ukrainien', 'ro': 'Roumain',
    'cs': 'Tchèque', 'hu': 'Hongrois', 'bn': 'Bengali', 'ms': 'Malais', 'sw': 'Swahili'
  };

  // ---------- Helpers ----------
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function translateText(text, targetLang) {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + targetLang + '&dt=t&q=' + encodeURIComponent(text);
    return fetch(url).then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data[0]) return data[0].map(function(item) { return item[0]; }).join('');
        return text;
      }).catch(function() { return text; });
  }

  function showShareMenu(text) {
    var old = document.getElementById('sc-share-menu');
    if (old) old.remove();
    var menu = document.createElement('div');
    menu.id = 'sc-share-menu';
    menu.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100001;display:flex;justify-content:center;align-items:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;padding:20px;border-radius:12px;max-width:400px;width:90%;font-family:Arial,sans-serif;';
    box.innerHTML = '<h4 style="margin:0 0 15px;color:#0a2540;text-align:center;">Partager</h4>';
    var platforms = [
      { id: 'copy', label: '📋 Copier le texte', bg: '#475569' },
      { id: 'whatsapp', label: '🟢 WhatsApp', bg: '#25D366' },
      { id: 'facebook', label: '🔵 Facebook', bg: '#1877F2' },
      { id: 'twitter', label: '⚫ X (Twitter)', bg: '#000000' },
      { id: 'linkedin', label: '🔷 LinkedIn', bg: '#0A66C2' },
      { id: 'telegram', label: '🔵 Telegram', bg: '#0088cc' },
      { id: 'email', label: '✉️ Email', bg: '#EA4335' }
    ];
    platforms.forEach(function(p) {
      var b = document.createElement('button');
      b.textContent = p.label;
      b.style.cssText = 'display:block;width:100%;margin:5px 0;padding:10px;border:none;border-radius:6px;color:#fff;background:' + p.bg + ';font-weight:bold;cursor:pointer;';
      b.onclick = function() {
        var enc = encodeURIComponent(text);
        var url = encodeURIComponent(window.location.href);
        if (p.id === 'copy') {
          navigator.clipboard.writeText(text).then(function() { alert('Copié !'); });
        } else if (p.id === 'whatsapp') window.open('https://api.whatsapp.com/send?text=' + enc, '_blank');
        else if (p.id === 'facebook') window.open('https://www.facebook.com/sharer/sharer.php?u=' + url + '&quote=' + enc, '_blank');
        else if (p.id === 'twitter') window.open('https://twitter.com/intent/tweet?text=' + enc, '_blank');
        else if (p.id === 'linkedin') window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + url, '_blank');
        else if (p.id === 'telegram') window.open('https://t.me/share/url?url=' + url + '&text=' + enc, '_blank');
        else if (p.id === 'email') window.location.href = 'mailto:?body=' + enc;
        menu.remove();
      };
      box.appendChild(b);
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

  // ---------- Panneau historique fonctionnel ----------
  function openHistoryPanel() {
    var history = [];
    try { history = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch(e) {}

    var old = document.getElementById('sc-history-pro-overlay');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'sc-history-pro-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:100000;display:flex;justify-content:center;align-items:center;';

    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:12px;padding:20px;max-width:800px;width:94%;max-height:86vh;overflow-y:auto;font-family:Arial,sans-serif;';

    var header = document.createElement('h3');
    header.style.cssText = 'margin:0 0 15px;color:#0a2540;';
    header.textContent = '📚 Historique (' + history.length + ' messages)';
    box.appendChild(header);

    if (history.length === 0) {
      var empty = document.createElement('p');
      empty.style.cssText = 'color:#6b7280;text-align:center;padding:40px;';
      empty.textContent = 'Aucun historique disponible. Posez une question pour commencer.';
      box.appendChild(empty);
    } else {
      history.slice().reverse().forEach(function(item) {
        var card = document.createElement('div');
        card.style.cssText = 'border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:10px;background:#fafbfc;';

        var roleBadge = item.role === 'user' ? '👤 Vous' : '🤖 Assistant';
        var roleColor = item.role === 'user' ? '#0369a1' : '#16a34a';
        var time = item.ts ? new Date(item.ts).toLocaleString('fr-FR') : '';

        var info = document.createElement('div');
        info.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:6px;';
        info.innerHTML = '<span style="color:' + roleColor + ';font-weight:700;font-size:12px;">' + roleBadge + '</span>' +
                         '<span style="color:#9ca3af;font-size:11px;">' + escapeHtml(time) + '</span>';
        card.appendChild(info);

        var txt = document.createElement('div');
        txt.style.cssText = 'font-size:13px;color:#17202a;line-height:1.5;margin-bottom:10px;white-space:pre-wrap;';
        txt.textContent = item.text || '';
        card.appendChild(txt);

        var actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

        if (item.role === 'user') {
          // 🔁 Reposer cette question
          var btnRepose = document.createElement('button');
          btnRepose.type = 'button';
          btnRepose.innerHTML = '🔁 Reposer cette question';
          btnRepose.style.cssText = 'background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;padding:6px 12px;border-radius:14px;font-size:11px;cursor:pointer;font-weight:bold;';
          btnRepose.onclick = function() {
            var input = document.getElementById('chatInput');
            if (input) {
              input.value = item.text;
              input.focus();
              var send = document.getElementById('btnSend');
              if (send) send.click();
              overlay.remove();
            }
          };
          actions.appendChild(btnRepose);

          // 💬 Continuer la discussion
          var btnContinue = document.createElement('button');
          btnContinue.type = 'button';
          btnContinue.innerHTML = '💬 Continuer la discussion';
          btnContinue.style.cssText = 'background:#dcfce7;color:#166534;border:1px solid #86efac;padding:6px 12px;border-radius:14px;font-size:11px;cursor:pointer;font-weight:bold;';
          btnContinue.onclick = function() {
            var input = document.getElementById('chatInput');
            if (input) {
              input.value = item.text + ' ';
              input.focus();
              overlay.remove();
            }
          };
          actions.appendChild(btnContinue);
        }

        // 🌐 Traduire
        var btnTrans = document.createElement('button');
        btnTrans.type = 'button';
        btnTrans.innerHTML = '🌐 Traduire';
        btnTrans.style.cssText = 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:6px 12px;border-radius:14px;font-size:11px;cursor:pointer;font-weight:bold;';
        btnTrans.onclick = function() {
          var langCode = prompt('Code langue (fr, en, ar, es, de, it, pt, ru, zh, ja, ko, tr, fa, hi, he, nl, pl, el, vi, th, id, sv, uk, ro, cs, hu, bn, ms, sw) :', 'en');
          if (!langCode || !LANGS[langCode]) { if (langCode) alert('Langue non supportée.'); return; }
          btnTrans.innerHTML = '⏳...';
          translateText(item.text, langCode).then(function(t) {
            var tr = document.createElement('div');
            tr.style.cssText = 'margin-top:10px;padding:10px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;font-size:12px;color:#166534;';
            tr.innerHTML = '<strong>Traduction (' + LANGS[langCode] + ') :</strong><br>' + escapeHtml(t);
            card.appendChild(tr);
            btnTrans.innerHTML = '🌐 Traduire';
          });
        };
        actions.appendChild(btnTrans);

        // 🔗 Partager
        var btnShare = document.createElement('button');
        btnShare.type = 'button';
        btnShare.innerHTML = '🔗 Partager';
        btnShare.style.cssText = 'background:#fef3c7;color:#b45309;border:1px solid #fde68a;padding:6px 12px;border-radius:14px;font-size:11px;cursor:pointer;font-weight:bold;';
        btnShare.onclick = function() { showShareMenu(item.text); };
        actions.appendChild(btnShare);

        card.appendChild(actions);
        box.appendChild(card);
      });
    }

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '✕ Fermer';
    closeBtn.style.cssText = 'display:block;width:100%;margin-top:15px;padding:12px;border:1px solid #ccc;border-radius:6px;background:#f1f5f9;cursor:pointer;font-weight:bold;';
    closeBtn.onclick = function() { overlay.remove(); };
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  // ---------- Bouton 📚 Historique Pro flottant ----------
  function createHistoryButton() {
    if (document.getElementById('sc-history-pro-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'sc-history-pro-btn';
    btn.type = 'button';
    btn.innerHTML = '📚 Historique Pro';
    btn.style.cssText = 'position:fixed;bottom:60px;left:150px;z-index:99999;background:#16a34a;color:#fff;border:0;border-radius:22px;padding:10px 16px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);font-family:Arial,sans-serif;';
    btn.onclick = openHistoryPanel;
    document.body.appendChild(btn);
  }

  // ---------- Ajouter Traduire/Partager sur les messages du chat ----------
  function addButtonsToMessage(msgNode) {
    if (!msgNode || msgNode.getAttribute('data-sc-trad-added')) return;
    if (msgNode.classList.contains('loading')) return;
    if (!msgNode.classList.contains('msg') && !msgNode.classList.contains('message')) return;

    var textNode = msgNode.querySelector('.msg-text') || msgNode;
    if (!textNode) return;
    msgNode.setAttribute('data-sc-trad-added', '1');

    var actions = document.createElement('div');
    actions.className = 'msg-actions sc-trad';
    actions.style.cssText = 'margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;';

    // 🌐 Traduire
    var btnT = document.createElement('button');
    btnT.type = 'button';
    btnT.innerHTML = '🌐 Traduire';
    btnT.style.cssText = 'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;padding:4px 10px;border-radius:14px;font-size:11px;cursor:pointer;font-weight:bold;';
    btnT.onclick = function() {
      var lc = prompt('Code langue:', 'en');
      if (!lc || !LANGS[lc]) return;
      var orig = textNode.innerText || textNode.textContent;
      btnT.innerHTML = '⏳...';
      translateText(orig, lc).then(function(t) {
        var old = msgNode.querySelector('.sc-translation');
        if (old) old.remove();
        var d = document.createElement('div');
        d.className = 'sc-translation';
        d.style.cssText = 'margin-top:10px;padding:10px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;font-size:13px;color:#166534;';
        d.innerHTML = '<strong>Traduction (' + LANGS[lc] + ') :</strong><br>' + escapeHtml(t);
        textNode.appendChild(d);
        btnT.innerHTML = '🌐 Traduire';
      });
    };
    actions.appendChild(btnT);

    // 🔗 Partager
    var btnS = document.createElement('button');
    btnS.type = 'button';
    btnS.innerHTML = '🔗 Partager';
    btnS.style.cssText = 'background:#fef3c7;color:#b45309;border:1px solid #fde68a;padding:4px 10px;border-radius:14px;font-size:11px;cursor:pointer;font-weight:bold;';
    btnS.onclick = function() { showShareMenu(textNode.innerText || textNode.textContent); };
    actions.appendChild(btnS);

    msgNode.appendChild(actions);
  }

  function scanMessages() {
    document.querySelectorAll('.msg, .message').forEach(function(n) {
      if (n.id === 'chatMessages') return;
      addButtonsToMessage(n);
    });
  }

  // ---------- Observateur global ----------
  function start() {
    createHistoryButton();
    scanMessages();
    // Observer les nouveaux messages
    if (document.body) {
      new MutationObserver(function() {
        clearTimeout(window.__scScanTimer);
        window.__scScanTimer = setTimeout(scanMessages, 300);
      }).observe(document.body, { childList: true, subtree: true });
    }
    [1000, 3000, 6000, 10000].forEach(function(ms) { setTimeout(scanMessages, ms); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  console.log('[history-pro] v4 active : panneau historique fonctionnel + boutons Traduire/Partager.');
})();