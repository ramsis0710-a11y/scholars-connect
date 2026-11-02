// ============================================================
// INTELLIGENT-ROUTER.JS - v1.16e
// Fix : layer.match is not a function (retrait du jsonLayer buggé)
// Nouveau : parse son propre body si req.body est vide
// Logique : stoplist generiques + boost petrole + seuil 0.60
// ============================================================
'use strict';

module.exports = function(app, mongoose) {
  console.log('[intelligent-router] Module charge');
  
  const RAG_THRESHOLD = 0.60;
  
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
  // Parseur manuel du body (car on est en position 0, avant express.json)
  // ============================================================
  function parseBodyIfNeeded(req) {
    return new Promise(function(resolve) {
      // Deja parse par un autre middleware ?
      if (req._body === true) return resolve();
      if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        req._body = true;
        return resolve();
      }
      // Parser manuellement
      const chunks = [];
      req.on('data', function(c) { chunks.push(c); });
      req.on('end', function() {
        try {
          const raw = Buffer.concat(chunks).toString('utf8');
          req.body = raw ? JSON.parse(raw) : {};
          req._body = true;
        } catch(e) {
          console.error('[intelligent-router] Erreur parse body:', e.message);
          req.body = {};
          req._body = true;
        }
        resolve();
      });
      req.on('error', function(e) {
        console.error('[intelligent-router] Erreur stream:', e.message);
        req.body = {};
        req._body = true;
        resolve();
      });
    });
  }
  
  // ============================================================
  // Scoring petrole
  // ============================================================
  function scorePetrole(question, docs) {
    const qLower = String(question || '').toLowerCase();
    const tokens = qLower.match(/[a-z0-9\u0600-\u06FF]{3,}/g) || [];
    
    const sigTokens = tokens.filter(function(t) {
      return t.length >= 4 && !STOPWORDS.has(t);
    });
    
    if (sigTokens.length === 0) {
      return { score: 0, doc: null, sigTokens: [], boost: 0, matchedKw: [] };
    }
    
    let boost = 0;
    const matchedKw = [];
    for (let i = 0; i < PETRO_BOOST.length; i++) {
      if (qLower.indexOf(PETRO_BOOST[i]) !== -1) {
        boost += 0.2;
        matchedKw.push(PETRO_BOOST[i]);
      }
    }
    boost = Math.min(1, boost);
    
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
  // Middleware principal
  // ============================================================
  const middleware = async function(req, res, next) {
    if (req.method !== 'POST') return next();
    const url = (req.originalUrl || req.url || '').split('?')[0];
    if (url !== '/api/ask') return next();
    
    try {
      // Parser le body si necessaire
      await parseBodyIfNeeded(req);
      
      const body = req.body || {};
      let question = String(body.question || '').trim();
      if (!question) {
        console.log('[intelligent-router] Question vide, next()');
        return next();
      }
      
      let realQ = question;
      const hm = question.match(/Nouvelle question[^:]*:\s*([\s\S]+)$/i);
      if (hm) realQ = hm[1].trim();
      realQ = realQ.replace(/^Answer\s+the\s+following\s+question[^:]*:\s*/i, '').trim();
      
      let AutoFeedDoc;
      try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch(e) {
        console.log('[intelligent-router] AutoFeedDocument introuvable, next()');
        return next();
      }
      const docs = await AutoFeedDoc.find().sort({ createdAt: -1 }).limit(500).lean();
      
      const s = scorePetrole(realQ, docs);
      
      console.log('[intelligent-router] Q="' + realQ.slice(0, 50) + '" | score petrole=' + s.score.toFixed(2) + ' | sigTokens=[' + s.sigTokens.join(',') + '] | boost=' + s.boost.toFixed(1) + (s.matchedKw.length ? ' | kw=[' + s.matchedKw.slice(0,3).join(',') + ']' : ''));
      
      if (s.score >= RAG_THRESHOLD) {
        console.log('[intelligent-router] EN RELATION avec le domaine petrolier -> answer-enricher (RAG local)');
        return next();
      }
      
      console.log('[intelligent-router] PAS en relation avec le domaine petrolier -> cascade Claude/Gemini/OpenAI');
      
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
      
      if (!answer) {
        console.warn('[intelligent-router] Tous agents KO -> next() avec _skipRag');
        req._skipRag = true;
        return next();
      }
      
      console.log('[intelligent-router] Reponse par ' + source + ' (' + answer.length + ' chars)');
      
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
  
  // ============================================================
  // Injection en position 0 (methode propre, SANS toucher router.stack manuellement)
  // ============================================================
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