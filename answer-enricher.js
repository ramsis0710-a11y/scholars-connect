'use strict';

module.exports = function(app, mongoose) {
  console.log('[answer-enricher] Initialisation complète avec injection de base de données.');

  // ============================================================
  // 1. CHARGEMENT DES BASES DE CONNAISSANCES (API 14L, OEM, BCT)
  // ============================================================
  try { require('./api14l-kb')(app, mongoose); console.log('[api14l-kb] OK'); } catch (e) { console.warn('api14l', e.message); }
  try { require('./oem-chemical-injection-kb')(app, mongoose); console.log('[oem-kb] OK'); } catch (e) { console.warn('oem', e.message); }
  try { require('./bct-kb')(app, mongoose); console.log('[bct-kb] OK'); } catch (e) { console.warn('bct', e.message); }

  // ============================================================
  // 2. REACTIVATION DES MODULES EXPERTS (PDF, Gemini, Guardian)
  // ============================================================
  try { require('./claude-max')(app, mongoose); } catch (e) { console.warn('claude-max', e.message); }
  try { require('./gemini-fallback')(app, mongoose); } catch (e) { console.warn('gemini', e.message); }
  try { require('./answer-guardian')(app, mongoose); } catch (e) { console.warn('guardian', e.message); }

  // ============================================================
  // 3. INTERCEPTION : INJECTION DES DONNEES DE LA BASE DANS LE PROMPT
  //    (Ceci force l'IA à lire vos fichiers API 14L avant de répondre)
  // ============================================================
  app.use(['/api/ask', '/api/analyze-content'], async function(req, res, next) {
    if (!req.body || !req.body.question) return next();
    
    try {
      const AutoFeedDoc = mongoose.model('AutoFeedDocument');
      const q = req.body.question;
      // On récupère les mots-clés de la question (ex: "tolérances", "seal bore", "api 14l")
      const tokens = q.toLowerCase().match(/\b\w{3,}\b/g) || [];
      
      // On cherche le document le plus pertinent dans la base
      const docs = await AutoFeedDoc.find({}).limit(500).lean();
      let bestDoc = null;
      let maxScore = 0;
      
      docs.forEach(d => {
        const content = (d.title + ' ' + d.content).toLowerCase();
        let score = 0;
        tokens.forEach(t => { if (content.includes(t)) score++; });
        if (score > maxScore) { maxScore = score; bestDoc = d; }
      });

      // Si on a trouvé une correspondance, on l'ajoute à la question posée à l'IA
      if (bestDoc && maxScore > 1) {
        console.log('[RAG] Injection du document :', bestDoc.title);
        req.body.question = `INSTRUCTION : Tu dois répondre en utilisant OBLIGATOIREMENT les extraits techniques fournis ci-dessous. Si tu ne trouves pas l'information dedans, dis-le. Ne réponds pas avec des généralités.\n\n[EXTRAIT DE LA BASE DE CONNAISSANCES]\nTitre : ${bestDoc.title}\nContenu : ${bestDoc.content}\n[FIN DE L'EXTRAIT]\n\nQuestion de l'utilisateur : ${q}`;
      }
    } catch (e) {
      console.warn('[RAG] Erreur:', e.message);
    }
    
    next();
  });
};
