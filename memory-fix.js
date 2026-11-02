// ============================================================
// MEMORY-FIX.JS - Memoire conversationnelle
// Intercepte /api/ask AVANT answer-enricher.js
// Enrichit la question avec l'historique conversationnel
// NE MODIFIE PAS answer-enricher.js
// ============================================================
'use strict';

module.exports = function(app, mongoose) {
  console.log('[memory-fix] Module charge');
  
  // Middleware a inserer en tete de pile pour /api/ask
  const middleware = function(req, res, next) {
    if (req.method !== 'POST') return next();
    const url = (req.originalUrl || req.url || '').split('?')[0];
    if (url !== '/api/ask') return next();
    
    try {
      const body = req.body || {};
      const question = String(body.question || '').trim();
      if (!question) return next();
      
      const history = Array.isArray(body.history) ? body.history : [];
      if (history.length === 0) {
        console.log('[memory-fix] Pas d historique, question envoyee telle quelle');
        return next();
      }
      
      // Construire le prompt avec historique (max 8 messages = 4 echanges)
      const recent = history.slice(-4);
            const lines = [];
      // v1.9 : regles AVANT l historique
      lines.push('=== INSTRUCTIONS DE MEMOIRE (PRIORITAIRES) ===');
      lines.push('1. Tu as recu un historique de conversation ci-dessous.');
      lines.push('2. Tu DOIS utiliser cet historique pour repondre.');
      lines.push('3. Si la question est COURTE (et sa population, et son president, combien, et apres), elle refere au SUJET de la derniere question de l historique.');
      lines.push('4. Ne reponds JAMAIS de quoi parlez-vous ou je n ai pas d information si le sujet est dans l historique.');
      lines.push('5. Reponds concretement en utilisant tes connaissances sur le sujet.');
      lines.push('6. Ne mentionne PAS l historique dans ta reponse.');
      lines.push('=== FIN INSTRUCTIONS ===');
      lines.push('');
      lines.push('=== HISTORIQUE DE LA CONVERSATION ===');
      recent.forEach(function(m) {
        const role = m.role === 'user' ? 'Utilisateur' : 'Assistant';
        let content = String(m.content || m.text || '');
        if (content.length > 2000) content = content.slice(0, 2000) + '...';
        content = content.split(/Fiche technique/i)[0].trim();
        if (content) lines.push(role + ' : ' + content);
      });
      lines.push('=== FIN HISTORIQUE ===');
      lines.push('');
      lines.push('Nouvelle question :');
      lines.push(question);
      
      const enrichedQuestion = lines.join('\n');
      
      // Ne pas doubler si deja enrichi
      if (body.question && body.question.indexOf('=== HISTORIQUE') !== -1) {
        return next();
      }
      
      req.body.question = enrichedQuestion;
      req._memoryEnriched = true;
      console.log('[memory-fix] Question enrichie avec ' + recent.length + ' messages d historique');
      
      return next();
    } catch (e) {
      console.warn('[memory-fix] Erreur :', e.message);
      return next();
    }
  };
  
  // Injection en tete de pile (avant answer-enricher)
  try {
    const router = app._router || app.router;
    if (!router || !router.stack) {
      console.warn('[memory-fix] Router introuvable');
      return;
    }
    
    const express = require('express');
    const mini = express.Router();
    mini.use(middleware);
    if (mini.stack && mini.stack[0]) {
      router.stack.unshift(mini.stack[0]);
      console.log('[memory-fix] Middleware injecte en position 0');
    }
  } catch (e) {
    console.error('[memory-fix] Erreur injection :', e.message);
  }
  
  console.log('[memory-fix] Pret - memoire conversationnelle active');
};