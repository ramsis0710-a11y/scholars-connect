// ============================================================
// MODULE AUTONOME : AGENT PRIORITAIRE GEMINI (v3.0 - Expert API)
// Ce module intercepte les questions techniques (API, normes, tolérances)
// et force la réponse de Gemini pour garantir l'exactitude.
// NE MODIFIE AUCUNE LIGNE DE answer-enricher.js
// ============================================================

'use strict';

const { execSync } = require('child_process');

// --- 1. Vérification du SDK ---
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

  if (!apiKey) {
    console.warn('[gemini-fallback] GEMINI_API_KEY absente. Le module expert est désactivé.');
    return;
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // --- 3. Intercepteur de réponses ---
  async function geminiExpertInterceptor(req, res, next) {
    if (req.method !== 'POST' || !req.body) return next();

    // Sauvegarde de la fonction d'envoi originale
    const originalJson = res.json.bind(res);

    // Surcharge de res.json
    res.json = async function(data) {
      if (!data || !data.answer) return originalJson(data);

      // Récupération de la question posée par l'utilisateur
      const question = req.body.question || req.body.content || "";
      const lowerQ = question.toLowerCase();

      // Détection des questions techniques critiques (API, Normes, Plans Qualité)
      const isTechnicalExpertQuery = 
        /api|monogramme|tolérance|dimension|14l|5ct|6a|7-1|7-2|qualité|quality plan|qp|standard|petroleum/i.test(lowerQ) ||
        data.judgeResult?.reject === true ||
        data.answer.length < 200;

      if (isTechnicalExpertQuery) {
        console.log(`[gemini-fallback] Requête technique détectée. Gemini prend le relais pour une réponse d'expert...`);
        
        try {
          // Prompt système pour forcer Gemini à adopter le ton et la structure exacte demandée
          const systemPrompt = `Tu es un expert senior en ingénierie pétrolière et en normes API. 
Tu dois répondre de manière exhaustive, structurée et technique aux questions posées.
Si on te pose une question sur une norme (ex: API 14L), structure ta réponse ainsi :
1. Domaine d'application
2. Dimensions et Interchangeabilité
3. Tolérances et Critères d'acceptation
4. Critères de Validation de Performance et Monogramme API
5. Exigences de test de validation (Grades V1, V2, V3)
6. Impact sur la rédaction de plans de qualité (ITP)
7. Modèle de données (Code Python si pertinent)
Sois extrêmement précis, ne fais pas d'hallucinations, utilise tes connaissances techniques les plus pointues.`;

          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              { role: 'user', parts: [{ text: systemPrompt + "\n\nQuestion : " + question }] }
            ],
            config: {
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
              ],
              temperature: 0.2 // Très faible pour garantir la rigueur technique
            }
          });

          if (response && response.text) {
            console.log('[gemini-fallback] Réponse d\'expert générée par Gemini avec succès.');
            
            // Remplacement de la réponse locale (erronée) par celle de Gemini
            data.answerRaw = data.answer; // On garde l'ancienne au cas où
            data.answer = response.text;
            data.fallbackUsed = 'gemini-expert';
            data.enriched = true;
          }
        } catch (error) {
          console.error('[gemini-fallback] Erreur appel Gemini :', error.message);
          // En cas d'erreur, on renvoie la réponse locale d'origine
        }
      }

      // On renvoie la réponse finale (Gemini ou locale)
      return originalJson(data);
    };

    next();
  }

  // On attache l'intercepteur sur les routes d'analyse
  app.use('/api/ask', geminiExpertInterceptor);
  app.use('/api/analyze-content', geminiExpertInterceptor);

  console.log('[gemini-fallback] Agent Expert Gemini activé (Priorité sur les questions API/Techniques).');
};
