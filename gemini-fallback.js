'use strict';
module.exports = function(app, mongoose) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) return console.warn('[gemini] Désactivé (clé absente).');
  const fallback = (req, res, next) => {
    if (req.method !== 'POST' || !req.body) return next();
    const origJson = res.json.bind(res);
    res.json = async (data) => {
      if (!data || !data.answer || data.enriched) return origJson(data);
      if (data.answer.length < 200) {
        try {
          const { GoogleGenAI } = require('@google/genai');
          const ai = new GoogleGenAI({ apiKey });
          const r = await ai.models.generateContent({ model: modelName, contents: (req.body.question || '') + (req.body.content || '') });
          if (r && r.text) { data.answer = r.text; data.fallbackUsed = 'gemini'; data.enriched = true; }
        } catch(e) {}
      }
      return origJson(data);
    };
    next();
  };
  app.use('/api/ask', fallback);
  app.use('/api/analyze-content', fallback);
  console.log('[gemini-fallback] Module chargé.');
};
