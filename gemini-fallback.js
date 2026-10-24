// ============================================================
// MODULE AUTONOME : FALLBACK GEMINI (Version définitive v2.1)
// Correction de l'erreur ERR_PACKAGE_PATH_NOT_EXPORTED
// ============================================================

'use strict';

const { execSync } = require('child_process');

// --- 1. Vérification et installation du SDK ---
let GoogleGenAI = null;
try {
  const genai = require('@google/genai');
  GoogleGenAI = genai.GoogleGenAI;
} catch (e) {
  console.log('[gemini-fallback] SDK manquant. Tentative d\'installation...');
  try {
    execSync('npm install @google/genai --no-save', { stdio: 'inherit' });
    const genai = require('@google/genai');
    GoogleGenAI = genai.GoogleGenAI;
  } catch (installError) {
    console.error('[gemini-fallback] ÉCHEC CRITIQUE :', installError.message);
    module.exports = function() { return; };
    return;
  }
}

// --- 2. Export du module ---
module.exports = function(app, mongoose) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // --- 3. Auto-test au démarrage (sans bloquer le serveur) ---
  async function selfTest() {
    console.log('================================================');
    console.log('[gemini-fallback] AUTO-TEST DE DÉMARRAGE');
    console.log(`[gemini-fallback] Clé API présente : ${!!apiKey}`);
    console.log(`[gemini-fallback] Modèle configuré : ${modelName}`);
    
    if (!apiKey) {
      console.error('[gemini-fallback] ÉCHEC : GEMINI_API_KEY est absente.');
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: 'Réponds uniquement par "OK".',
      });
      
      if (response && response.text) {
        console.log(`[gemini-fallback] SUCCÈS : Connexion à Gemini établie. Réponse : "${response.text.trim()}"`);
        console.log('[gemini-fallback] Le fallback est 100% OPÉRATIONNEL.');
      } else {
        console.warn('[gemini-fallback] AVERTISSEMENT : Connexion établie mais réponse vide.');
      }
    } catch (error) {
      console.error('[gemini-fallback] ÉCHEC DE LA CONNEXION.');
      console.error(`[gemini-fallback] Message : ${error.message}`);
      if (error.message.includes('API key not valid')) {
        console.error('[gemini-fallback] La clé API est invalide.');
      } else if (error.message.includes('not found')) {
        console.error(`[gemini-fallback] Le modèle "${modelName}" n'existe pas.`);
      }
    }
    console.log('================================================');
  }

  // Lancer l'auto-test
  selfTest();

  // --- 4. Route de diagnostic (corrigée, sans accès au package.json) ---
  app.get('/api/gemini-fallback/status', function(req, res) {
    res.json({
      ok: true,
      message: 'Module Gemini chargé et prêt',
      model: modelName,
      keyConfigured: !!apiKey,
      note: 'Consultez les logs Render pour le rapport d\'auto-test.'
    });
  });

  // --- 5. Intercepteur de secours ---
  async function tryGeminiFallback(req, res, next) {
    if (req.method !== 'POST' || !req.body) return next();
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      if (!data || !data.answer || data.enriched) return originalJson(data);
      
      const isRejected = data.judgeResult && data.judgeResult.reject === true;
      const isTooShort = data.answer.length < 200;
      
      if (isRejected || isTooShort) {
        console.log(`[gemini-fallback] Rejet local (reject=${isRejected}, len=${data.answer.length}). Appel de Gemini...`);
        try {
          const ai = new GoogleGenAI({ apiKey: apiKey });
          const prompt = (req.body.question || "Analyse ce document.") + 
                         (req.body.content ? `\n\nDocument :\n${req.body.content}` : '');
          
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
              ]
            }
          });
          
          if (response && response.text) {
            data.answerRaw = data.answer;
            data.answer = response.text;
            data.fallbackUsed = 'gemini';
            data.enriched = true;
            console.log('[gemini-fallback] Réponse Gemini substituée.');
          }
        } catch (error) {
          console.error('[gemini-fallback] Erreur appel secours :', error.message);
        }
      }
      return originalJson(data);
    };
    next();
  }

  app.use('/api/ask', tryGeminiFallback);
  app.use('/api/analyze-content', tryGeminiFallback);

  console.log('[gemini-fallback] Module chargé. Auto-test lancé (voir logs).');
};
