// ============================================================
// SMART-ANSWER.JS - Correction detection domaine + RAG cible
// Intercepte /api/ask AVANT answer-enricher.js
// Si la question n'est pas technique -> force General + pas de RAG
// ============================================================
'use strict';

// Mots-cles TECHNIQUES uniquement (si absents -> General)
const TECH_KEYWORDS = [
  'api 5ct','api 5b','api 6a','api 7-1','api 7-2','api 14l','api 5c5',
  'seal bore','tubing','casing','coupling','thread','vam','tenaris','hydril',
  'petrole','pétrole','gaz','oil','gas','forage','drilling','puits','wellhead',
  'plan qualite','plan qualité','quality plan','qp standard','ndt','mpi','soudure','weld',
  'hydrostatic','pressure test','mtc','certificat','inspection','tolerance','tolérance',
  'acier','steel','grade l80','grade p110','nace','h2s','sour service','corrosion'
];

// Mots-cles qui declenchent General (geographie, histoire, etc.)
const GENERAL_KEYWORDS = [
  'capitale','pays','ville','population','géographie','geographie','histoire',
  'président','president','guerre','religion','philosophie','science','médecine',
  'santé','sante','économie','economie','politique','culture','art','littérature'
];

function isTechnical(question) {
  const q = String(question || '').toLowerCase();
  // Si contient un mot General ET aucun mot technique -> General
  const hasGeneral = GENERAL_KEYWORDS.some(k => q.includes(k));
  const hasTech = TECH_KEYWORDS.some(k => q.includes(k));
  if (hasGeneral && !hasTech) return false;
  if (hasTech) return true;
  // Par defaut : si pas de mot technique, considerer General
  return false;
}

function detectDomainSafe(question) {
  const q = String(question || '').toLowerCase();
  if (q.includes('plan qualite') || q.includes('plan qualité') || q.includes('qp standard')) return 'Plan Qualite';
  if (q.includes('api 14l') || q.includes('seal bore')) return 'Petrole & Gaz';
  if (q.includes('api 5ct') || q.includes('tubing') || q.includes('casing')) return 'Petrole & Gaz';
  if (q.includes('vam') || q.includes('tenaris') || q.includes('hydril')) return 'Petrole & Gaz';
  return 'General';
}

module.exports = function(app, mongoose) {
  console.log('[smart-answer] Module charge');
  
  const middleware = function(req, res, next) {
    if (req.method !== 'POST') return next();
    const url = (req.originalUrl || req.url || '').split('?')[0];
    if (url !== '/api/ask') return next();
    
    try {
      const body = req.body || {};
      let question = String(body.question || '').trim();
      if (!question) return next();
      
      // Si la question contient deja "=== HISTORIQUE", extraire la vraie question
      let realQuestion = question;
      const histMatch = question.match(/Nouvelle question[^:]*:\s*([\s\S]+)$/i);
      if (histMatch) realQuestion = histMatch[1].trim();
      
      const tech = isTechnical(realQuestion);
      const safeDomain = detectDomainSafe(realQuestion);
      
      console.log('[smart-answer] Q="' + realQuestion.slice(0, 60) + '" | technique=' + tech + ' | domaine=' + safeDomain);
      
      if (!tech) {
        // Question generale : forcer General et retirer le domaine force
        body.domain = 'General';
        req.body.domain = 'General';
        // Marquer pour que answer-enricher ne fasse pas de RAG
        req._skipRag = true;
        console.log('[smart-answer] Question generale -> domaine General, RAG desactive');
      } else {
        // Question technique : utiliser le domaine detecte
        body.domain = safeDomain;
        req.body.domain = safeDomain;
        console.log('[smart-answer] Question technique -> domaine ' + safeDomain);
      }
      
      return next();
    } catch (e) {
      console.warn('[smart-answer] Erreur :', e.message);
      return next();
    }
  };
  
  try {
    const router = app._router || app.router;
    if (!router || !router.stack) return;
    const express = require('express');
    const mini = express.Router();
    mini.use(middleware);
    if (mini.stack && mini.stack[0]) {
      router.stack.unshift(mini.stack[0]);
      console.log('[smart-answer] Middleware injecte en position 0');
    }
  } catch (e) {
    console.error('[smart-answer] Erreur injection :', e.message);
  }
  
  console.log('[smart-answer] Pret - detection domaine corrigee');
};