(function () {
  'use strict';
  if (window.__scContinuity) return;
  window.__scContinuity = true;

  var SILENCE_MS = 10000;
  var THREAD_KEY = 'sc_thread_start';

  function getToken() { try { return localStorage.getItem('token') || ''; } catch (e) { return ''; } }

  /* 1. Continuite : envoie le debut de discussion au serveur */
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : ((input && input.url) || '');
        var ts = localStorage.getItem(THREAD_KEY) || '';
        if (ts && url.indexOf('/api/ask') !== -1) {
          init = init || {};
          var base = init.headers || (typeof input !== 'string' && input.headers) || {};
          var h = new Headers(base);
          h.set('X-Thread-Start', ts);
          init.headers = h;
        }
      } catch (e) {}
      return origFetch.call(window, input, init);
    };
  }

  /* 2. Dictee vocale : 10 secondes de silence avant la cloture */
  var NativeSR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (NativeSR) {
    var EVENTS = ['start', 'result', 'error', 'end', 'audiostart', 'audioend', 'soundstart', 'soundend', 'speechstart', 'speechend', 'nomatch'];
    var PROPS = ['lang', 'interimResults', 'maxAlternatives', 'grammars', 'serviceURI'];
    var WrappedSR = function () {
      var self = this, r = new NativeSR();
      var handlers = {}, listeners = {}, stopped = true, timer = null, announced = false;
      r.continuous = true;
      function arm() {
        clearTimeout(timer);
        timer = setTimeout(function () { stopped = true; try { r.stop(); } catch (e) {} }, SILENCE_MS);
      }
      function fire(type, ev) {
        var f = handlers[type];
        if (typeof f === 'function') { try { f.call(self, ev); } catch (e) { console.error(e); } }
        (listeners[type] || []).slice().forEach(function (fn) { try { fn.call(self, ev); } catch (e) { console.error(e); } });
      }
      EVENTS.forEach(function (type) {
        r['on' + type] = function (ev) {
          if (type === 'start') { if (announced) return; announced = true; }
          if (type === 'result') arm();
          if (type === 'error') {
            if (ev.error === 'no-speech' || ev.error === 'aborted') { if (!stopped) return; }
            else { stopped = true; clearTimeout(timer); }
          }
          if (type === 'end') {
            if (!stopped) {
              setTimeout(function () {
                try { r.start(); } catch (e) { stopped = true; clearTimeout(timer); announced = false; fire('end', ev); }
              }, 200);
              return;
            }
            clearTimeout(timer); announced = false;
          }
          fire(type, ev);
        };
        Object.defineProperty(self, 'on' + type, {
          get: function () { return handlers[type] || null; },
          set: function (f) { handlers[type] = f; },
          configurable: true
        });
      });
      PROPS.forEach(function (p) {
        Object.defineProperty(self, p, {
          get: function () { return r[p]; },
          set: function (v) { try { r[p] = v; } catch (e) {} },
          configurable: true
        });
      });
      Object.defineProperty(self, 'continuous', { get: function () { return true; }, set: function () {}, configurable: true });
      self.start = function () {
        stopped = false; announced = false; arm();
        try { r.start(); } catch (e) { stopped = true; clearTimeout(timer); throw e; }
      };
      self.stop = function () { stopped = true; clearTimeout(timer); r.stop(); };
      self.abort = function () { stopped = true; clearTimeout(timer); r.abort(); };
      self.addEventListener = function (t, fn) { (listeners[t] = listeners[t] || []).push(fn); };
      self.removeEventListener = function (t, fn) { listeners[t] = (listeners[t] || []).filter(function (x) { return x !== fn; }); };
    };
    window.SpeechRecognition = WrappedSR;
    window.webkitSpeechRecognition = WrappedSR;
  }

  /* 3. Panneau Historique */
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function el(tag, css, text) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (text) e.textContent = text; return e; }
  function plain(s) { return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
  function fillInput(text) {
    var box = document.querySelector('textarea') || document.querySelector('input[type="text"]');
    if (!box) return false;
    box.value = text;
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.focus();
    return true;
  }

  ready(function () {
    var smallBtn = 'background:#1e5aa8;color:#fff;border:0;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;margin-right:6px';
    var btn = el('button', 'position:fixed;left:14px;bottom:14px;z-index:99998;background:#0a2540;color:#fff;border:0;border-radius:22px;padding:10px 16px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)', '\uD83D\uDD58 Historique');
    btn.type = 'button';
    var panel = el('div', 'display:none;position:fixed;left:14px;bottom:60px;z-index:99999;width:min(460px,92vw);max-height:70vh;overflow:auto;background:#fff;color:#17202a;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.3);padding:12px;font:13px Arial,sans-serif');
    var head = el('div', 'display:flex;gap:8px;align-items:center;margin-bottom:8px');
    var title = el('b', 'flex:1;color:#0a2540', 'Historique des discussions');
    var nb = el('button', smallBtn, 'Nouvelle discussion'); nb.type = 'button';
    var cb = el('button', smallBtn, 'Fermer'); cb.type = 'button';
    var note = el('div', 'color:#14532d;margin-bottom:6px');
    var list = el('div');
    head.appendChild(title); head.appendChild(nb); head.appendChild(cb);
    panel.appendChild(head); panel.appendChild(note); panel.appendChild(list);
    document.body.appendChild(btn); document.body.appendChild(panel);

    function load() {
      list.textContent = 'Chargement...';
      fetch('/api/history', { headers: { Authorization: 'Bearer ' + getToken() } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          list.textContent = '';
          var items = ((d && d.items) || []).slice(0, 60);
          if (!items.length) { list.textContent = 'Aucun historique.'; return; }
          items.forEach(function (it) {
            var q = String(it.question || '').split('[EXTRAITS]')[0].trim();
            var card = el('div', 'border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin-bottom:8px');
            card.appendChild(el('div', 'color:#6b7280;font-size:11px', new Date(it.createdAt).toLocaleString('fr-FR') + ' - ' + (it.domain || 'General')));
            card.appendChild(el('div', 'font-weight:700;margin:3px 0', q.slice(0, 300)));
            card.appendChild(el('div', 'color:#374151;margin-bottom:6px', plain(it.answer).slice(0, 300)));
            var b1 = el('button', smallBtn, 'Reposer'); b1.type = 'button';
            b1.onclick = function () { fillInput(q); panel.style.display = 'none'; };
            var b2 = el('button', smallBtn, 'Reprendre cette discussion'); b2.type = 'button';
            b2.onclick = function () {
              try { localStorage.setItem(THREAD_KEY, String(new Date(it.createdAt).getTime() - 1)); } catch (e) {}
              note.textContent = 'Discussion reprise : l\'IA retrouve les echanges a partir de celui-ci.';
            };
            card.appendChild(b1); card.appendChild(b2);
            list.appendChild(card);
          });
        })
        .catch(function () { list.textContent = 'Erreur de chargement de l\'historique.'; });
    }

    btn.onclick = function () {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      if (panel.style.display === 'block') load();
    };
    cb.onclick = function () { panel.style.display = 'none'; };
    nb.onclick = function () {
      try { localStorage.setItem(THREAD_KEY, String(Date.now())); } catch (e) {}
      note.textContent = 'Nouvelle discussion demarree : l\'IA repart sans memoire des echanges precedents.';
    };
  });
})();