'use strict';
const ADMIN_URL = 'https://scholars-connect-app.onrender.com/admin';
module.exports = function (app, mongoose) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const ARABIC_RANGE = /[\u0600-\u06FF]/;
  function isArabicText(text) { return text && (String(text).match(ARABIC_RANGE) || []).length >= 3; }
  function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function hasMojibake(text) { return false; }
  function isFakeAnswer(text) { return !text || text.trim().length < 80; }
  function buildAdminRedirectHtml(q) { return '<div style="padding:20px;background:#fee2e2;color:#991b1b;">Erreur de génération. <a href="' + ADMIN_URL + '">Aller sur Admin</a></div>'; }
  async function callGemini(q, c) {
    if (!GEMINI_API_KEY) throw new Error('No key');
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const r = await ai.models.generateContent({ model: GEMINI_MODEL, contents: q + (c||'') });
    return (r && r.text) || '';
  }
  const guardian = async (req, res, next) => {
    if (req.method !== 'POST' || !req.body) return next();
    const orig = res.json.bind(res);
    let done = false;
    res.json = async (data) => {
      if (done) return orig(data);
      if (data && data.qpStandard01) { done = true; return orig(data); }
      const q = req.body.question || '';
      const ans = (data && data.answer) || '';
      if (isArabicText(q) || isFakeAnswer(ans)) {
        done = true;
        try {
          const txt = await callGemini(q, req.body.content);
          if (txt && !isFakeAnswer(txt)) return orig({ ok: true, answer: txt, enriched: true, guardianFallback: 'gemini' });
        } catch(e) {}
        return orig({ ok: false, answer: buildAdminRedirectHtml(q), enriched: true, guardianFallback: 'admin' });
      }
      done = true; return orig(data);
    };
    next();
  };
  app.use(['/api/ask', '/api/analyze-content'], guardian);
  const stack = app._router && app._router.stack;
  if (stack) { for (let i = stack.length - 1; i >= 0; i--) { if (stack[i].handle === guardian) { const [l] = stack.splice(i, 1); stack.unshift(l); break; } } }
  console.log('[answer-guardian] v2.0 chargé.');
};
