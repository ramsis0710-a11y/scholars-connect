// ============================================================
// EXTRAS-BACKEND.JS - v1.19b (SECURISE)
// - Toutes les reponses passent par un helper safeJson()
// - Try/catch global + logs detailles
// - Ne fait JAMAIS next() apres res.json()
// ============================================================
'use strict';

module.exports = function(app, mongoose) {
  console.log('[extras-backend] Module charge (v1.19b)');
  
  const RAG_THRESHOLD = 0.60;
  const AI_TIMEOUT_MS = 20000;
  const MAX_TOKENS = 2000;
  
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
  
  const FOLLOWUP_MARKERS = ['et sa ', 'et son ', 'et ses ', 'et le ', 'et la ',
    'combien', 'c\'est quoi cette', 'c\'est quoi ce', 'quelle est sa', 'quel est son'];
  
  // Helper: envoie JSON seulement si res est valide et pas deja envoye
  function safeJson(res, data, tag) {
    try {
      if (!res || typeof res.json !== 'function') {
        console.warn('[extras-backend] safeJson(' + tag + ') : res.json indisponible');
        return false;
      }
      if (res.headersSent) {
        console.warn('[extras-backend] safeJson(' + tag + ') : headers deja envoyes');
        return false;
      }
      res.json(data);
      return true;
    } catch (e) {
      console.error('[extras-backend] safeJson(' + tag + ') ERREUR :', e.message);
      return false;
    }
  }
  
  function parseBodyIfNeeded(req) {
    return new Promise(function(resolve) {
      if (req._body === true) return resolve();
      if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        req._body = true;
        return resolve();
      }
      var chunks = [];
      req.on('data', function(c) { chunks.push(c); });
      req.on('end', function() {
        try {
          var raw = Buffer.concat(chunks).toString('utf8');
          req.body = raw ? JSON.parse(raw) : {};
          req._body = true;
        } catch(e) {
          req.body = {};
          req._body = true;
        }
        resolve();
      });
      req.on('error', function() {
        req.body = {};
        req._body = true;
        resolve();
      });
    });
  }
  
  async function fetchWithTimeout(url, options, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function() { ctrl.abort(); }, timeoutMs);
    try {
      var r = await fetch(url, Object.assign({}, options, { signal: ctrl.signal }));
      clearTimeout(timer);
      return r;
    } catch(e) {
      clearTimeout(timer);
      throw e;
    }
  }
  
  function scorePetrole(question, docs) {
    var q = String(question || '').toLowerCase();
    var tokens = q.match(/[a-z0-9\u0600-\u06FF]{3,}/g) || [];
    var sig = tokens.filter(function(t) { return t.length >= 4 && !STOPWORDS.has(t); });
    if (sig.length === 0) return 0;
    var boost = 0;
    for (var i = 0; i < PETRO_BOOST.length; i++) {
      if (q.indexOf(PETRO_BOOST[i]) !== -1) boost += 0.2;
    }
    boost = Math.min(1, boost);
    var best = 0;
    for (var k = 0; k < docs.length; k++) {
      var d = docs[k];
      var title = (d.title || '').toLowerCase();
      var content = (d.content || '').toLowerCase();
      var score = 0;
      for (var j = 0; j < sig.length; j++) {
        if (title.indexOf(sig[j]) !== -1) score += 15;
        if (content.indexOf(sig[j]) !== -1) score += 2;
      }
      var norm = Math.min(1, score / Math.max(20, sig.length * 5));
      if (norm > best) best = norm;
    }
    return Math.max(best, boost);
  }
  
  function isFollowupQuestion(q) {
    var low = String(q || '').toLowerCase();
    for (var i = 0; i < FOLLOWUP_MARKERS.length; i++) {
      if (low.indexOf(FOLLOWUP_MARKERS[i]) !== -1) return true;
    }
    return false;
  }
  
  var middleware = async function(req, res, next) {
    if (req.method !== 'POST') return next();
    var url = (req.originalUrl || req.url || '').split('?')[0];
    if (url !== '/api/ask') return next();
    
    try {
      await parseBodyIfNeeded(req);
      var body = req.body || {};
      var question = String(body.question || '').trim();
      if (!question) return next();
      
      var realQ = question;
      var hm = question.match(/Nouvelle question[^:]*:\s*([\s\S]+)$/i);
      if (hm) realQ = hm[1].trim();
      realQ = realQ.replace(/^Answer\s+the\s+following\s+question[^:]*:\s*/i, '').trim();
      
      var AutoFeedDoc;
      try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch(e) {}
      var docs = [];
      if (AutoFeedDoc) {
        try { docs = await AutoFeedDoc.find().sort({createdAt: -1}).limit(300).lean(); } catch(e) {}
      }
      
      var petroScore = scorePetrole(realQ, docs);
      var isFollowup = isFollowupQuestion(realQ);
      var hasHistory = Array.isArray(body.history) && body.history.length > 0;
      
      console.log('[extras-backend] Q="' + realQ.slice(0, 50) + '" | score=' + petroScore.toFixed(2) + ' | followup=' + isFollowup + ' | history=' + (hasHistory ? body.history.length : 0));
      
      if (petroScore >= RAG_THRESHOLD && !isFollowup) {
        console.log('[extras-backend] -> answer-enricher (RAG local)');
        return next();
      }
      
      console.log('[extras-backend] -> cascade IA');
      
      var history = Array.isArray(body.history) ? body.history.slice(-4) : [];
      var messages = [];
      for (var i = 0; i < history.length; i++) {
        var h = history[i];
        var role = h.role === 'user' ? 'user' : 'assistant';
        var content = String(h.content || h.text || '').split(/Fiche technique/i)[0].replace(/Reponse detaillee/i, '').trim();
        if (content) messages.push({role: role, content: content});
      }
      messages.push({role: 'user', content: realQ});
      
      var system = 'Tu es Scholars Connect, un assistant IA expert multidisciplinaire. Reponds de maniere detaillee, structuree et factuelle en francais. Si un historique est present, utilise-le pour les questions de suivi (et sa population, et son president, combien). Ne mentionne PAS l\'historique dans ta reponse. Ne dis JAMAIS "en tant qu\'IA".';
      var fullMessages = [{role: 'system', content: system}].concat(messages);
      
      var answer = null;
      var source = null;
      
      // 1. Claude
      try {
        var key = process.env.OPENROUTER_API_KEY;
        if (key) {
          var r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://scholars-connect-app.onrender.com'},
            body: JSON.stringify({model: 'anthropic/claude-3.5-sonnet', temperature: 0.3, max_tokens: MAX_TOKENS, messages: fullMessages})
          }, AI_TIMEOUT_MS);
          if (r.ok) {
            var j = await r.json();
            answer = j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
            if (answer && answer.length > 20) source = 'claude';
          } else {
            console.warn('[extras-backend] Claude HTTP ' + r.status);
          }
        }
      } catch(e) { console.warn('[extras-backend] Claude KO: ' + e.message); }
      
      // 2. Gemini
      if (!answer) {
        try {
          var gkey = process.env.GEMINI_API_KEY;
          if (gkey) {
            var gem = require('@google/genai');
            var ai = new gem.GoogleGenAI({apiKey: gkey});
            var gemParts = [fullMessages[0].content];
            for (var k = 1; k < fullMessages.length; k++) {
              gemParts.push((fullMessages[k].role === 'user' ? 'Utilisateur: ' : 'Assistant: ') + fullMessages[k].content);
            }
            var gemPromise = ai.models.generateContent({
              model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
              contents: gemParts.join('\n\n')
            });
            var gemTimeout = new Promise(function(_, reject) { setTimeout(function() { reject(new Error('timeout')); }, AI_TIMEOUT_MS); });
            var gr = await Promise.race([gemPromise, gemTimeout]);
            answer = (gr && gr.text) || '';
            if (answer && answer.length > 20) source = 'gemini';
          }
        } catch(e) { console.warn('[extras-backend] Gemini KO: ' + e.message); }
      }
      
      // 3. OpenAI
      if (!answer) {
        try {
          var okey = process.env.OPENAI_API_KEY;
          if (okey) {
            var or = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {'Authorization': 'Bearer ' + okey, 'Content-Type': 'application/json'},
              body: JSON.stringify({model: 'gpt-4o-mini', temperature: 0.3, max_tokens: MAX_TOKENS, messages: fullMessages})
            }, AI_TIMEOUT_MS);
            if (or.ok) {
              var oj = await or.json();
              answer = oj.choices && oj.choices[0] && oj.choices[0].message ? oj.choices[0].message.content : '';
              if (answer && answer.length > 20) source = 'openai';
            }
          }
        } catch(e) { console.warn('[extras-backend] OpenAI KO: ' + e.message); }
      }
      
      if (!answer) {
        console.warn('[extras-backend] Tous agents KO -> fallback');
        safeJson(res, {answer: 'Service temporairement indisponible. Veuillez reessayer.', source: 'fallback', enriched: true}, 'fallback');
        return;
      }
      
      console.log('[extras-backend] Reponse par ' + source + ' (' + answer.length + ' chars)');
      
      try {
        var QA = mongoose.model('QA');
        var jwt = require('jsonwebtoken');
        var h = req.headers.authorization || '';
        if (h.startsWith('Bearer ')) {
          try {
            var dec = jwt.verify(h.slice(7), process.env.JWT_SECRET || 'fallback');
            if (dec && dec.id) {
              QA.create({userId: dec.id, question: realQ, answer: answer, language: 'fr', domain: petroScore >= RAG_THRESHOLD ? 'Petrole & Gaz' : 'General'}).catch(function(){});
            }
          } catch(e) {}
        }
      } catch(e) {}
      
      safeJson(res, {answer: answer, source: source, enriched: true, fallbackUsed: source}, 'success');
      
    } catch(e) {
      console.error('[extras-backend] ERREUR GLOBALE :', e.message, e.stack);
      safeJson(res, {answer: 'Erreur technique. Veuillez reessayer.', source: 'error', enriched: true}, 'error');
    }
  };
  
  try {
    var router = app._router || app.router;
    if (!router || !router.stack) return;
    var express = require('express');
    var mini = express.Router();
    mini.use(middleware);
    if (mini.stack && mini.stack[0]) {
      router.stack.unshift(mini.stack[0]);
      console.log('[extras-backend] Middleware injecte en position 0');
    }
  } catch(e) {
    console.error('[extras-backend] Erreur injection: ' + e.message);
  }
  
  console.log('[extras-backend] Pret - routage intelligent + cascade IA (v1.19b)');
};