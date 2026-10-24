// ============================================================
// MODULE AUTONOME : FALLBACK GEMINI (Auto-test au démarrage)
// Version : v2.0 - Définitif
// Ce module teste sa connexion et écrit un rapport clair dans les logs.
// Il ne modifie AUCUNE ligne du code principal.
// ============================================================

'use strict';

const { execSync } = require('child_process');

// --- 1. Vérification et installation du SDK ---
let GoogleGenAI = null;
try {
  const genai = require('@google/genai');
  GoogleGenAI = genai.GoogleGenAI;
} catch (e) {
  console.log('[gemini-fallback] SDK @google/genai manquant. Tentative d\'installation...');
  try {
    execSync('npm install @google/genai --no-save', { stdio: 'inherit' });
    const genai = require('@google/genai');
    GoogleGenAI = genai.GoogleGenAI;
    console.log('[gemini-fallback] SDK installé et chargé.');
  } catch (installError) {
    console.error('[gemini-fallback] ÉCHEC CRITIQUE : Impossible d\'installer le SDK.', installError.message);
    module.exports = function() { return; };
    return;
  }
}

// --- 2. Export du module ---
module.exports = function(app, mongoose) {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // --- 3. VÉRIFICATION IMMÉDIATE AU DÉMARRAGE ---
  async function selfTest() {
    console.log('================================================');
    console.log('[gemini-fallback] AUTO-TEST DE DÉMARRAGE');
    console.log(`[gemini-fallback] Clé API présente : ${!!apiKey}`);
    console.log(`[gemini-fallback] Modèle configuré : ${modelName}`);
    
    if (!apiKey) {
      console.error('[gemini-fallback] ÉCHEC : GEMINI_API_KEY est absente. Le fallback est DÉSACTIVÉ.');
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      // Test réel : on demande une réponse très courte
      const response = await ai.models.generateContent({
        model: modelName,
        contents: 'Réponds uniquement par "OK".',
      });
      
      if (response && response.text) {
        console.log(`[gemini-fallback] SUCCÈS : Connexion à Gemini établie. Réponse reçue : "${response.text.trim()}"`);
        console.log('[gemini-fallback] Le fallback est 100% OPÉRATIONNEL.');
      } else {
        console.warn('[gemini-fallback] AVERTISSEMENT : Connexion établie mais réponse vide ou bloquée.');
      }
    } catch (error) {
      console.error('[gemini-fallback] ÉCHEC DE LA CONNEXION À GEMINI.');
      console.error(`[gemini-fallback] Message d'erreur : ${error.message}`);
      if (error.message.includes('API key not valid')) {
        console.error('[gemini-fallback] La clé API est invalide. Vérifiez-la sur Google AI Studio.');
      } else if (error.message.includes('model not found')) {
        console.error(`[gemini-fallback] Le modèle "${modelName}" n'existe pas ou n'est pas accessible.`);
      }
    }
    console.log('================================================');
  }

  // Lancer l'auto-test immédiatement (sans bloquer le démarrage du serveur)
  selfTest();

  // --- 4. Route de diagnostic (inchangée) ---
  app.get('/api/gemini-fallback/status', function(req, res) {
    res.json({
      ok: true,
      message: 'Module Gemini chargé',
      model: modelName,
      keyConfigured: !!apiKey,
      note: 'Consultez les logs Render pour le rapport d\'auto-test.'
    });
  });

  // --- 5. Intercepteur de secours (inchangé) ---
  async function tryGeminiFallback(req, res, next) {
    if (req.method !== 'POST' || !req.body) return next();
    const originalJson = res.json.bind(res);
    res.json = async function(data) {
      if (!data || !data.answer || data.enriched) return originalJson(data);
      const isRejected = data.judgeResult && data.judgeResult.reject === true;
      const isTooShort = data.answer.length < 200;
      if (isRejected || isTooShort) {
        console.log(`[gemini-fallback] Rejet local détecté. Appel de Gemini...`);
        try {
          const ai = new GoogleGenAI({ apiKey: apiKey });
          const prompt = (req.body.question || "Analyse ce document.") + (req.body.content ? `\n\nDocument :\n${req.body.content}` : '');
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
            console.log('[gemini-fallback] Réponse Gemini substituée avec succès.');
          }
        } catch (error) {
          console.error('[gemini-fallback] Erreur lors de l\'appel de secours :', error.message);
        }
      }
      return originalJson(data);
    };
    next();
  }

  app.use('/api/ask', tryGeminiFallback);
  app.use('/api/analyze-content', tryGeminiFallback);

  console.log('[gemini-fallback] Module chargé. L\'auto-test a été lancé (voir ci-dessus).');
};
