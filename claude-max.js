// ============================================================
// MODULE AUTONOME : CLAUDE 3 OPUS (Intelligence Maximale)
// Ce module utilise OpenRouter pour intercepter TOUTES les réponses
// et les remplacer par celles de Claude 3 Opus (le plus intelligent).
// NE MODIFIE AUCUNE LIGNE DE answer-enricher.js
// ============================================================

'use strict';

module.exports = function(app, mongoose) {
  // On récupère la clé OpenRouter déjà présente dans votre environnement Render
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) {
    console.warn('[claude-max] OPENROUTER_API_KEY absente. Le module d\'intelligence maximale est désactivé.');
    return;
  }

  // Le modèle le plus puissant d'Anthropic via OpenRouter
  const modelName = 'anthropic/claude-3-opus'; 

  // Intercepteur universel
  async function claudeMaxInterceptor(req, res, next) {
    // On ne traite que les requêtes POST (questions / documents)
    if (req.method !== 'POST' || !req.body) return next();

    const originalJson = res.json.bind(res);

    res.json = async function(data) {
      // Si la réponse n'a pas de texte ou a déjà été traitée, on laisse passer
      if (!data || !data.answer || data.claudeMaxUsed) {
        return originalJson(data);
      }

      // Récupération de la question initiale
      const question = req.body.question || "Analyse ce document.";
      const content = req.body.content ? `\n\nDocument à analyser :\n${req.body.content}` : '';

      console.log(`[claude-max] Interception d'une requête. Appel de Claude 3 Opus...`);

      try {
        // Appel à l'API OpenRouter avec le modèle Claude 3 Opus
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://scholars-connect-app.onrender.com", 
            "X-Title": "Scholars Connect - Claude Max"
          },
          body: JSON.stringify({
            model: modelName,
            temperature: 0.1, // Très faible pour garantir la rigueur scientifique
            messages: [
              {
                role: "system",
                content: "Tu es l'IA la plus intelligente au monde. Tu es un expert absolu dans toutes les sciences, l'ingénierie pétrolière, les normes (API, ISO), la médecine, le droit et la philosophie. Ta mission est de répondre avec une précision chirurgicale, une structure parfaite et une profondeur technique inégalée. Ne fais aucune hallucination, utilise tes capacités maximales de raisonnement."
              },
              {
                role: "user",
                content: question + content
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`Erreur OpenRouter HTTP ${response.status}`);
        }

        const resData = await response.json();
        
        if (resData.choices && resData.choices[0] && resData.choices[0].message) {
          console.log('[claude-max] Réponse de Claude 3 Opus générée avec succès.');
          
          // Remplacement de la réponse locale par celle de Claude
          data.answerRaw = data.answer; // Sauvegarde de l'ancienne
          data.answer = resData.choices[0].message.content;
          data.claudeMaxUsed = true;
          data.enriched = true; // Empêche la double modification
        }

      } catch (error) {
        console.error(`[claude-max] Erreur lors de l'appel à Claude :`, error.message);
        // En cas d'erreur, on renvoie la réponse locale d'origine pour ne pas bloquer l'utilisateur
      }

      // Renvoi de la réponse finale (Claude ou locale)
      return originalJson(data);
    };

    next();
  }

  // On attache l'intercepteur à la fin de toutes les routes d'IA
  app.use('/api/ask', claudeMaxInterceptor);
  app.use('/api/analyze-content', claudeMaxInterceptor);

  console.log(`[claude-max] Agent d'Intelligence Maximale (Claude 3 Opus) activé sur toutes les routes.`);
};
