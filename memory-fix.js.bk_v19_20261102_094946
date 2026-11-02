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
      lines.push('=== HISTORIQUE DE LA CONVERSATION ===');
      recent.forEach(function(m) {
        const role = m.role === 'user' ? 'Utilisateur' : 'Assistant';
        let content = String(m.content || m.text || '');
        // Tronquer les messages trop longs (2000 chars max par message)
        if (content.length > 2000) content = content.slice(0, 2000) + '...';
        // Supprimer les fiches techniques du contexte
        content = content.split(/Fiche technique/i)[0].trim();
        if (content) lines.push(role + ' : ' + content);
      });
      lines.push('=== FIN HISTORIQUE ===');
      lines.push('');
      lines.push('INSTRUCTION OBLIGATOIRE : Tu DOIS repondre a la question ci-dessous en te basant sur l historique. Si la question contient "il", "elle", "son", "sa", "et", "donc", "cette", "ce", refere-toi au sujet de l historique. Ne demande JAMAIS de preciser le sujet si l historique le mentionne.');
      lines.push('');
      lines.push('=== REGLES STRICTES ===');
      lines.push('Utilise l historique. Si la question est courte, refere au sujet precedent.');
      lines.push('=== FIN REGLES ===');
      lines.push('=== REGLES OBLIGATOIRES ===');
      lines.push('REGLE 1 : Tu as recu un historique ci-dessus. Tu DOIS l utiliser.');
      lines.push('REGLE 2 : Si la question est courte (et sa population, et son president, combien, et apres), elle refere au SUJET de la derniere question de l historique.');
      lines.push('REGLE 3 : Ne reponds JAMAIS de quoi parlez-vous ou je n ai pas d information si le sujet est dans l historique.');
      lines.push('REGLE 4 : Reponds concretement sur le sujet de l historique, sans le mentionner.');
      lines.push('=== FIN REGLES ===');
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