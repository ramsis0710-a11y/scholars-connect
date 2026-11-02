// ============================================================
// INTELLIGENT-ROUTER.JS - v1.16
// Logique de routage pour /api/ask :
// 1. RAG search sur AutoFeedDocument
// 2. Si score >= 0.45 (petrole fort) -> next() -> answer-enricher (RAG local)
// 3. Si score < 0.45 -> cascade Claude -> Gemini -> OpenAI
// 4. Si cascade echoue -> next() -> server.js askAI (fallback)
// ============================================================
'use strict';

module.exports = function(app, mongoose) {
  console.log('[intelligent-router] Module charge');
  
  const RAG_THRESHOLD = 0.45;
  
  const middleware = async function(req, res, next) {
    if (req.method !== 'POST') return next();
    const url = (req.originalUrl || req.url || '').split('?')[0];
    if (url !== '/api/ask') return next();
    
    try {
      const body = req.body || {};
      let question = String(body.question || '').trim();
      if (!question) return next();
      
      // Extraire la vraie question (retirer les prefixes)
      let realQ = question;
      const hm = question.match(/Nouvelle question[^:]*:\s*([\s\S]+)$/i);
      if (hm) realQ = hm[1].trim();
      realQ = realQ.replace(/^Answer\s+the\s+following\s+question[^:]*:\s*/i, '').trim();
      
      // RAG search
      let AutoFeedDoc;
      try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch(e) { return next(); }
      
      const qTokens = String(realQ).toLowerCase().match(/[a-z0-9\u0600-\u06FF]{3,}/g) || [];
      const docs = await AutoFeedDoc.find().sort({ createdAt: -1 }).limit(500).lean();
      
      let bestScore = 0, bestDoc = null;
      for (let i = 0; i < docs.length; i++) {
        const d = docs[i];
        const title = (d.title || '').toLowerCase();
        const content = (d.content || '').toLowerCase();
        let score = 0;
        for (let j = 0; j < qTokens.length; j++) {
          const tk = qTokens[j];
          if (title.indexOf(tk) !== -1) score += 15;
          if (content.indexOf(tk) !== -1) score += 2;
        }
        const normScore = Math.min(1, score / Math.max(20, qTokens.length * 5));
        if (normScore > bestScore) {
          bestScore = normScore;
          bestDoc = d;
        }
      }
      
      console.log('[intelligent-router] Q="' + realQ.slice(0, 50) + '" | score=' + bestScore.toFixed(2) + ' | doc="' + (bestDoc ? bestDoc.title.slice(0, 40) : 'none') + '"');
      
      // Si match fort -> laisser answer-enricher faire le RAG petrole
      if (bestScore >= RAG_THRESHOLD) {
        console.log('[intelligent-router] RAG FORT -> answer-enricher (petrole)');
        return next();
      }
      
      console.log('[intelligent-router] RAG FAIBLE -> cascade Claude/Gemini/OpenAI');
      
      // Construire les messages avec historique
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
      
      // 1. Claude via OpenRouter
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
      
      // Tous agents KO -> fallback
      if (!answer) {
        console.warn('[intelligent-router] Tous agents KO -> next() pour server.js askAI');
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
      return next();
    }
  };
  
  // Injection en position 0
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
  
  console.log('[intelligent-router] Pret - cascade Claude/Gemini/OpenAI');
};