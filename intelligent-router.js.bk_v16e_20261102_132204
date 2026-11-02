// ============================================================
// INTELLIGENT-ROUTER.JS - v1.16d
// - Force express.json en position 0
// - Stoplist de mots generiques (population, capitale, version, norme...)
// - Boost pour termes petrole specifiques (API 5CT, VAM, tubing...)
// - Seuil 0.60 (au lieu de 0.45)
// ============================================================
'use strict';

module.exports = function(app, mongoose) {
  console.log('[intelligent-router] Module charge');
  
  const RAG_THRESHOLD = 0.60;
  
  // Mots generiques (ne declenchent PAS la route petrole)
  const STOPWORDS = new Set([
    'population','capitale','pays','ville','region','histoire','geographie',
    'qui','est','quel','quelle','quels','quelles','version','derniere',
    'dernier','cette','cet','son','sa','ses','leur','leurs','dans',
    'avec','pour','par','sur','que','quoi','comment','pourquoi','quand',
    'ou','combien','tunisie','tunisien','francais','arabe','anglais',
    'bonjour','salut','merci','relation','domaine','application',
    'definir','definition','expliquer','signifie','mosaique','information',
    'info','detail','detaille','reponse','question','connu','connais',
    'connaissance','base','actuelle','officiel','document','consulter',
    'sources','fiables','etudes','demographiques','president','guerre',
    'religion','science','medecine','sante','economie','politique',
    'culture','art','litterature','philosophie','theologie'
  ]);
  
  // Termes petrole specifiques (boost)
  const PETRO_BOOST = [
    'api 5ct','api 5b','api 6a','api 5l','api 7-1','api 7-2','api 5c5','api 14l',
    'tubing','casing','coupling','thread','threading',
    'vam','tenaris','hydril','jfe','seal-lock','tec-lock',
    'nace','mr0175','h2s','sour service',
    'ndt','mpi','hydrostatic','pressure test',
    'mtc','certificat','inspection','tolerance','grade l80',
    'grade p110','corrosion','forage','drilling',
    'wellhead','christmas tree','psl',
    'norme api','specification api','edition api','addendum','errata',
    'petrole','gaz','oil','gas','puits'
  ];
  
  // ============================================================
  // ETAPE 1 : Force express.json en position 0
  // ============================================================
  try {
    const express = require('express');
    const router = app._router || app.router;
    if (router && router.stack) {
      let oldJsonLayer = null;
      for (let i = router.stack.length - 1; i >= 0; i--) {
        const layer = router.stack[i];
        if (layer && layer.handle && layer.handle.name === 'jsonParser') {
          oldJsonLayer = router.stack.splice(i, 1)[0];
          break;
        }
      }
      const jsonParser = express.json({ limit: '20mb' });
      const jsonLayer = {
        handle: jsonParser,
        name: 'jsonParserForced',
        params: undefined,
        path: '/',
        keys: [],
        regexp: /^\/?$/i,
        route: undefined
      };
      router.stack.unshift(jsonLayer);
      console.log('[intelligent-router] express.json force en position 0 (ancien retire : ' + (oldJsonLayer ? 'oui' : 'non') + ')');
    }
  } catch (e) {
    console.error('[intelligent-router] Erreur force express.json :', e.message);
  }
  
  // ============================================================
  // Fonction de scoring petrole
  // ============================================================
  function scorePetrole(question, docs) {
    const qLower = String(question || '').toLowerCase();
    const tokens = qLower.match(/[a-z0-9\u0600-\u06FF]{3,}/g) || [];
    
    // Filtrer les tokens significatifs (pas stopwords, longueur >= 4)
    const sigTokens = tokens.filter(function(t) {
      return t.length >= 4 && !STOPWORDS.has(t);
    });
    
    // Si aucun token significatif -> PAS petrole
    if (sigTokens.length === 0) {
      return { score: 0, doc: null, sigTokens: [], boost: 0, reason: 'aucun token significatif' };
    }
    
    // Boost petrole
    let boost = 0;
    const matchedKw = [];
    for (let i = 0; i < PETRO_BOOST.length; i++) {
      if (qLower.indexOf(PETRO_BOOST[i]) !== -1) {
        boost += 0.2;
        matchedKw.push(PETRO_BOOST[i]);
      }
    }
    boost = Math.min(1, boost);
    
    // Score RAG sur les docs
    let bestScore = 0, bestDoc = null;
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const title = (d.title || '').toLowerCase();
      const content = (d.content || '').toLowerCase();
      let score = 0;
      for (let j = 0; j < sigTokens.length; j++) {
        const tk = sigTokens[j];
        if (title.indexOf(tk) !== -1) score += 15;
        if (content.indexOf(tk) !== -1) score += 2;
      }
      const normScore = Math.min(1, score / Math.max(20, sigTokens.length * 5));
      if (normScore > bestScore) {
        bestScore = normScore;
        bestDoc = d;
      }
    }
    
    const finalScore = Math.max(bestScore, boost);
    return { score: finalScore, doc: bestDoc, sigTokens: sigTokens, boost: boost, matchedKw: matchedKw };
  }
  
  // ============================================================
  // ETAPE 2 : Middleware de routage
  // ============================================================
  const middleware = async function(req, res, next) {
    if (req.method !== 'POST') return next();
    const url = (req.originalUrl || req.url || '').split('?')[0];
    if (url !== '/api/ask') return next();
    
    try {
      const body = req.body || {};
      let question = String(body.question || '').trim();
      if (!question) return next();
      
      // Extraire la vraie question
      let realQ = question;
      const hm = question.match(/Nouvelle question[^:]*:\s*([\s\S]+)$/i);
      if (hm) realQ = hm[1].trim();
      realQ = realQ.replace(/^Answer\s+the\s+following\s+question[^:]*:\s*/i, '').trim();
      
      // Charger les docs
      let AutoFeedDoc;
      try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch(e) { return next(); }
      const docs = await AutoFeedDoc.find().sort({ createdAt: -1 }).limit(500).lean();
      
      // Calculer le score
      const s = scorePetrole(realQ, docs);
      
      console.log('[intelligent-router] Q="' + realQ.slice(0, 50) + '" | score petrole=' + s.score.toFixed(2) + ' | sigTokens=[' + s.sigTokens.join(',') + '] | boost=' + s.boost.toFixed(1) + (s.matchedKw && s.matchedKw.length ? ' | kw=[' + s.matchedKw.slice(0,3).join(',') + ']' : ''));
      
      // Si en relation avec le petrole -> answer-enricher (RAG local)
      if (s.score >= RAG_THRESHOLD) {
        console.log('[intelligent-router] EN RELATION avec le domaine petrolier -> answer-enricher (RAG local)');
        return next();
      }
      
      // Sinon -> cascade IA
      console.log('[intelligent-router] PAS en relation avec le domaine petrolier -> cascade Claude/Gemini/OpenAI');
      
      // Construire messages avec historique
      const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
      const messages = [];
      for (let i = 0; i < history.length; i++) {
        const h = history[i];
        const role = h.role === 'user' ? 'user' : 'assistant';
        let content = String(h.content || h.text || '').split(/Fiche technique/i)[0].replace(/Reponse detaillee/i, '').trim();
        if (content) messages.push({ role: role, content: content });
      }
      messages.push({ role: 'user', content: realQ });
      
      const systemPrompt = 'Tu es Scholars Connect, un assistant IA expert multidisciplinaire (sciences, histoire, geographie, culture, religion, economie, droit, philosophie, sante, technologie, etc.). Reponds de maniere detaillee, structuree et factuelle en francais. Si un historique de conversation est present, utilise-le pour comprendre les questions de suivi (et sa population, et son president, combien, etc.). Ne mentionne PAS l\'historique dans ta reponse. Ne dis JAMAIS "en tant qu\'IA".';
      
      const fullMessages = [{ role: 'system', content: systemPrompt }].concat(messages);
      
      let answer = null;
      let source = null;
      
      // 1. Claude
      try {
        const key = process.env.OPENROUTER_API_KEY;
        if (key) {
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + key,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://scholars-connect-app.onrender.com'
            },
            body: JSON.stringify({
              model: 'anthropic/claude-sonnet-4.6',
              temperature: 0.3,
              max_tokens: 4000,
              messages: fullMessages
            })
          });
          if (r.ok) {
            const j = await r.json();
            answer = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
            if (answer && answer.length > 20) source = 'claude';
          } else {
            console.warn('[intelligent-router] Claude HTTP ' + r.status);
          }
        }
      } catch (e) { console.warn('[intelligent-router] Claude KO: ' + e.message); }
      
      // 2. Gemini
      if (!answer) {
        try {
          const key = process.env.GEMINI_API_KEY;
          if (key) {
            const { GoogleGenAI } = require('@google/genai');
            const ai = new GoogleGenAI({ apiKey: key });
            const system = fullMessages[0].content;
            const userParts = [];
            for (let i = 1; i < fullMessages.length; i++) {
              userParts.push((fullMessages[i].role === 'user' ? 'Utilisateur: ' : 'Assistant: ') + fullMessages[i].content);
            }
            const r = await ai.models.generateContent({
              model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
              contents: system + '\n\n' + userParts.join('\n\n')
            });
            answer = (r && r.text) || '';
            if (answer && answer.length > 20) source = 'gemini';
          }
        } catch (e) { console.warn('[intelligent-router] Gemini KO: ' + e.message); }
      }
      
      // 3. OpenAI
      if (!answer) {
        try {
          const key = process.env.OPENAI_API_KEY;
          if (key) {
            const r = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.3,
                max_tokens: 4000,
                messages: fullMessages
              })
            });
            if (r.ok) {
              const j = await r.json();
              answer = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
              if (answer && answer.length > 20) source = 'openai';
            }
          }
        } catch (e) { console.warn('[intelligent-router] OpenAI KO: ' + e.message); }
      }
      
      // Tous KO -> fallback (marquer _skipRag pour empecher answer-enricher de faire du RAG petrole)
      if (!answer) {
        console.warn('[intelligent-router] Tous agents KO -> fallback server.js askAI (sans RAG)');
        req._skipRag = true;  // Empeche answer-enricher de faire du RAG
        return next();
      }
      
      console.log('[intelligent-router] Reponse par ' + source + ' (' + answer.length + ' chars)');
      
      // Sauvegarder dans QA
      try {
        const QA = mongoose.model('QA');
        const jwt = require('jsonwebtoken');
        const h = req.headers.authorization || '';
        if (h.startsWith('Bearer ')) {
          try {
            const decoded = jwt.verify(h.slice(7), process.env.JWT_SECRET || 'fallback');
            if (decoded && decoded.id) {
              QA.create({ userId: decoded.id, question: realQ, answer: answer, language: 'fr', domain: 'General' }).catch(function(){});
            }
          } catch(e) {}
        }
      } catch(e) {}
      
      return res.json({ answer: answer, source: source, enriched: true, fallbackUsed: source });
      
    } catch (e) {
      console.warn('[intelligent-router] Erreur: ' + e.message);
      req._skipRag = true;
      return next();
    }
  };
  
  // Inserer le middleware en position 0
  try {
    const router = app._router || app.router;
    if (!router || !router.stack) return;
    const express = require('express');
    const mini = express.Router();
    mini.use(middleware);
    if (mini.stack && mini.stack[0]) {
      router.stack.unshift(mini.stack[0]);
      console.log('[intelligent-router] Middleware injecte en position 0');
    }
  } catch (e) {
    console.error('[intelligent-router] Erreur injection: ' + e.message);
  }
  
  console.log('[intelligent-router] Pret - cascade Claude/Gemini/OpenAI pour questions hors petrole');
};