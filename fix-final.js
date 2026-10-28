'use strict';
const express = require('express');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const mongoose = require('mongoose');
const PDF_CACHE = {};

const VERSION = 'V16';

const DOMAINES_18 = [
  'General','Religion','Education','Technique','Analyse',
  'Sante','Droit','Economie','Histoire','Philosophie',
  'Sciences','Litterature','Arts','Langues','Sport',
  'Industrie','Petrole & Gaz','Plan Qualite'
];

const API14L_SEED = {
  title: 'API Spec 14L:2020(R2025) - Lock Mandrels and Landing Nipples',
  domain: 'Petrole & Gaz',
  source: 'API-14L-Manual',
  url: 'https://shop.standards.ie/',
  content: 'API Spec 14L:2020(R2025). TOLERANCES SEAL BORE : Diameter tolerance +0.0020 in / -0.0000 in. Surface finish Ra 0.80 um max (32 micro-inches). Drift test : passage libre du calibreur. PRESSIONS : V3 = 1.0x rated pressure. V2 / V1 / V0 = 1.5x rated pressure. Fuite gaz max V0 : 20 sccm. VALIDATION : V3 (functional), V2 (liquid at pressure), V1 (liquid at rated T and P), V0 (nitrogen gas at rated T and P), V1-H, V0-H (temp cycling). NDT : ASTM E709. Marking : API Monogram.',
  tags: ['API','14L','seal-bore','tolerance','petrole'],
  metadata: { standard: 'API-14L', isStandard: true }
};

process.on('unhandledRejection', (r) => console.error('[fix-final] UNHANDLED:', r));
process.on('uncaughtException', (e) => console.error('[fix-final] UNCAUGHT:', e.message));

function getUserFromToken(req) {
  try {
    const h = req.headers.authorization || '';
    const token = h.replace('Bearer ', '').trim();
    if (!token) return { name: 'Invite', email: 'inconnu@localhost', id: null };
    const parts = token.split('.');
    if (parts.length !== 3) return { name: 'Invite', email: 'inconnu@localhost', id: null };
    const p = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return { name: p.name || p.email || 'Utilisateur', email: p.email || 'inconnu@localhost', id: p.id || p._id || p.userId || null };
  } catch (e) { return { name: 'Invite', email: 'inconnu@localhost', id: null }; }
}

function cleanAnswer(a) {
  if (!a) return '';
  try {
    let t = String(a);
    t = t.replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n\n').replace(/<\/div>/gi,'\n');
    t = t.replace(/<[^>]+>/g,'');
    t = t.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    t = t.replace(/Le rapport technique a ete genere avec succes\.[\s\S]*?---\s*/i,'');
    t = t.replace(/https:\/\/scholars-connect-app\.onrender\.com\/api\/(?:claude-pdf|pdf-report|ultimate-pdf)\/[a-f0-9]+/gi,'');
    return t.trim();
  } catch (e) { return String(a).slice(0,5000); }
}

function generatePDF(question, answer, user) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (e) => reject(e));
      const dateStr = new Date().toLocaleString('fr-FR', { weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit' });
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#0a2540').text('RAPPORT TECHNIQUE EXPERTISE', { align:'center' });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9).fillColor('#666')
         .text('Demandeur : ' + user.name, { align:'right' })
         .text('Email : ' + user.email, { align:'right' })
         .text('Date de visite : ' + dateStr, { align:'right' });
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#333').text('Sujet :');
      doc.font('Helvetica-Oblique').fontSize(10).fillColor('#555').text(question || '(non specifie)');
      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
      doc.moveDown(1);
      const lines = cleanAnswer(answer).split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line) { doc.moveDown(0.5); continue; }
        if (line.startsWith('## ')) doc.moveDown(0.5).font('Helvetica-Bold').fontSize(14).fillColor('#1e5aa8').text(line.replace('## ',''));
        else if (line.startsWith('### ')) doc.moveDown(0.5).font('Helvetica-Bold').fontSize(12).fillColor('#0a2540').text(line.replace('### ',''));
        else if (line.startsWith('- ') || line.startsWith('* ')) doc.font('Helvetica').fontSize(10).fillColor('#333').text('- ' + line.substring(2), { indent: 15 });
        else doc.font('Helvetica').fontSize(10).fillColor('#333').text(line, { align: 'justify' });
      }
      const pages = doc.bufferedPageRange();
      for (let i = pages.start; i < pages.start + pages.count; i++) {
        doc.switchToPage(i);
        doc.font('Helvetica').fontSize(8).fillColor('#999').text(
          'Document confidentiel - MBA-CONSULT AI CORE - Page ' + (i - pages.start + 1) + ' / ' + pages.count,
          50, doc.page.height - 40, { align: 'center' });
      }
      doc.end();
    } catch (e) { reject(e); }
  });
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label || 'timeout')), ms))
  ]);
}

async function askClaude(question, content) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY absente');
  const models = ['anthropic/claude-sonnet-4.6','openrouter/free'];
  let lastErr = null;
  for (const model of models) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization':'Bearer ' + key, 'Content-Type':'application/json', 'HTTP-Referer':'https://scholars-connect-app.onrender.com' },
        body: JSON.stringify({ model, max_tokens: 4000, messages: [
          { role:'system', content:'Tu es un expert senior multidisciplinaire. Reponds de facon detaillee et structuree en francais. Si un contexte technique est fourni, tu DOIS le citer textuellement et ne pas inventer.' },
          { role:'user', content: question + (content ? '\n\nDocument:\n' + content : '') }
        ]})
      });
      if (r.ok) { const j = await r.json(); if (j.choices && j.choices[0] && j.choices[0].message) return j.choices[0].message.content; }
      else lastErr = new Error('HTTP ' + r.status);
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Claude indisponible');
}

async function askGemini(question, content) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY absente');
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const r = await ai.models.generateContent({ model, contents: question + (content ? '\n\nDocument:\n' + content : '') });
  return (r && r.text) || '';
}

function sendJson(res, data, status) {
  if (res.headersSent) return;
  const body = JSON.stringify(data);
  res.statusCode = status || 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

module.exports = function(app, mongoose) {
  console.log('[fix-final] ========================================');
  console.log('[fix-final] CHARGEMENT ' + VERSION + ' - capture ULTRA-IMMEDIATE');
  console.log('[fix-final] ========================================');

  const router = app._router || app.router;
  if (!router || !router.stack) { console.error('[fix-final] Router non initialise'); return; }

  let FixQA = null, FixFD = null;
  try { FixQA = mongoose.model('FixQA'); } catch (e) {
    try {
      FixQA = mongoose.model('FixQA', new mongoose.Schema({
        userId: { type: String, index: true },
        question: { type: String, required: true },
        answer: { type: String, required: true },
        language: { type: String, default: 'fr' },
        domain: { type: String, default: 'General' },
        sourceDoc: { type: String, default: null },
        createdAt: { type: Date, default: Date.now }
      }), 'qas');
      console.log('[fix-final] Modele FixQA CREE');
    } catch (e2) { console.warn('[fix-final] FixQA err:', e2.message); }
  }
  try { FixFD = mongoose.model('FixFD'); } catch (e) {
    try {
      FixFD = mongoose.model('FixFD', new mongoose.Schema({
        title: String, content: String, domain: String, source: String,
        url: String, vector: mongoose.Schema.Types.Mixed, tags: [String],
        metadata: mongoose.Schema.Types.Mixed, createdAt: { type: Date, default: Date.now }
      }), 'autofeeddocuments');
      console.log('[fix-final] Modele FixFD CREE');
    } catch (e2) { console.warn('[fix-final] FixFD err:', e2.message); }
  }

  (async () => {
    if (!FixFD) return;
    try {
      await withTimeout(FixFD.updateOne({ source: 'API-14L-Manual' }, { $set: API14L_SEED }, { upsert: true }), 5000, 'seed');
      console.log('[fix-final] Seed API 14L : OK');
    } catch (e) { console.warn('[fix-final] Seed err:', e.message); }
  })();

  async function buildRagContext(question) {
    if (!FixFD) return '';
    try {
      const qLower = String(question || '').toLowerCase();
      const tokens = qLower.match(/[a-z0-9]{3,}/g) || [];
      const docs = await withTimeout(FixFD.find({}).limit(500).lean(), 3000, 'rag_timeout');
      let best = null, maxScore = 0;
      docs.forEach(d => {
        const title = String(d.title || '').toLowerCase();
        const content = String(d.content || '').toLowerCase();
        let score = 0;
        tokens.forEach(t => {
          if (title.indexOf(t) !== -1) score += 10;
          if (content.indexOf(t) !== -1) score += 1;
        });
        if (qLower.indexOf('14l') !== -1 && title.indexOf('14l') !== -1) score += 50;
        if ((qLower.indexOf('seal') !== -1 || qLower.indexOf('bore') !== -1) && content.indexOf('seal bore') !== -1) score += 30;
        if ((qLower.indexOf('tolérance') !== -1 || qLower.indexOf('tolerance') !== -1) && content.indexOf('tolerance') !== -1) score += 20;
        if (title.indexOf('api spec 14l') !== -1) score += 100;
        if (title.indexOf('vam') !== -1 && qLower.indexOf('vam') === -1) score -= 30;
        if (score > maxScore) { maxScore = score; best = d; }
      });
      if (best && maxScore > 5) {
        console.log('[fix-final] RAG: ' + best.title.substring(0,60) + ' (score=' + maxScore + ')');
        return best.content || '';
      }
    } catch (e) { console.warn('[fix-final] RAG err:', e.message); }
    return '';
  }

  // === HELPER : parser le body brut si pas encore parse par express.json ===
  function ensureBodyParsed(req) {
    return new Promise((resolve) => {
      // Si express.json a deja parse, req.body est un objet avec les cles
      if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        return resolve(req.body);
      }
      // Si le body est deja parse mais vide, ou pas parse : on lit le stream
      if (req._bodyParsedByFix) {
        return resolve(req.body || {});
      }
      req._bodyParsedByFix = true;

      const chunks = [];
      let finished = false;
      const done = (data) => {
        if (finished) return;
        finished = true;
        try {
          req.body = data;
        } catch (e) {}
        resolve(data);
      };

      // Timeout 2s pour ne pas bloquer
      const timer = setTimeout(() => {
        done(req.body || {});
      }, 2000);

      try {
        req.on('data', (chunk) => { chunks.push(chunk); });
        req.on('end', () => {
          clearTimeout(timer);
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!raw) return done({});
            const parsed = JSON.parse(raw);
            done(parsed || {});
          } catch (e) {
            done({});
          }
        });
        req.on('error', () => { clearTimeout(timer); done({}); });
      } catch (e) {
        clearTimeout(timer);
        done(req.body || {});
      }
    });
  }

  const masterMiddleware = async function(req, res, next) {
    // ============ EARLY RETURN : ne pas toucher aux routes non-ask ============
    let earlyPath = '';
    try { earlyPath = (req.url || '').split('?')[0].split('#')[0] || '/'; } catch (e) { earlyPath = '/'; }
    const earlyMethod = (req.method || 'GET').toUpperCase();
    const isAskRoute = (earlyMethod === 'POST' && (earlyPath === '/api/ask' || earlyPath === '/api/analyze-content'));
    const isDebugOrHistory = (earlyMethod === 'GET' && (earlyPath === '/api/domains' || earlyPath === '/api/history' || earlyPath.indexOf('/api/ultimate-pdf/') === 0 || earlyPath === '/api/debug/db'));

    // Si ce n'est NI une route ask NI une route que fix-final gere : next() IMMEDIATEMENT
    if (!isAskRoute && !isDebugOrHistory) {
      return next();
    }

    // ============ PARSE MANUEL SI BESOIN (uniquement pour ask) ============
    if (isAskRoute) {
      try {
        await ensureBodyParsed(req);
      } catch (e) {
        console.warn('[fix-final] ensureBodyParsed err:', e.message);
      }
    }

    // ============ CAPTURE APRES PARSE ============
    let Q = '';
    try {
      if (req.body && typeof req.body === 'object') {
        Q = req.body.question || req.body.q || req.body.query || req.body.prompt || '';
      }
      if (!Q && req.query && req.query.question) Q = String(req.query.question);
      Q = String(Q || '').trim();
    } catch (e) { Q = ''; }
    if (!Q) {
      Q = '(question vide - body non parse)';
    }
    req._Q_v15 = Q;
    console.log('[fix-final] ' + VERSION + ' CAPTURE: "' + Q.substring(0,80) + '" (len=' + Q.length + ')');

    let path = '';
    try {
      path = (req.url || '').split('?')[0].split('#')[0] || '/';
    } catch (e) { path = '/'; }
    const method = (req.method || 'GET').toUpperCase();

    try {
      // Diagnostic
      if (method === 'GET' && path === '/api/debug/db') {
        const state = mongoose.connection.readyState;
        let counts = {};
        try {
          if (FixQA) counts.fixQA = await withTimeout(FixQA.countDocuments(), 2000, 'c1');
          if (FixFD) counts.fixFD = await withTimeout(FixFD.countDocuments(), 2000, 'c2');
        } catch (e) {}
        return sendJson(res, { version: VERSION, readyState: state, models: { FixQA: !!FixQA, FixFD: !!FixFD }, counts });
      }

      if (method === 'GET' && path === '/api/domains') {
        return sendJson(res, { domains: DOMAINES_18 });
      }

      if (method === 'GET' && path === '/api/history') {
        const user = getUserFromToken(req);
        if (!user.id) return sendJson(res, { items: [] }, 401);
        if (!FixQA) return sendJson(res, { items: [] });
        try {
          const items = await withTimeout(FixQA.find({ userId: String(user.id || '') }).sort({ createdAt: -1 }).limit(200).lean(), 3000, 'hist');
          console.log('[fix-final] ' + VERSION + ' HISTORY: ' + items.length + ' pour ' + user.email);
          return sendJson(res, { items });
        } catch (e) { return sendJson(res, { items: [] }); }
      }

      if (method === 'GET' && path.indexOf('/api/ultimate-pdf/') === 0) {
        const token = path.replace('/api/ultimate-pdf/', '');
        const d = PDF_CACHE[token];
        if (!d || d.exp < Date.now()) { res.statusCode = 404; return res.end('PDF expire.'); }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="rapport.pdf"');
        res.setHeader('Content-Length', d.buffer.length);
        return res.end(d.buffer);
      }

      if (method === 'POST' && (path === '/api/ask' || path === '/api/analyze-content')) {
        const user = getUserFromToken(req);
        console.log('[fix-final] ' + VERSION + ' POST ' + path + ' user=' + (user.email || 'anon') + ' Q_v14="' + req._Q_v15.substring(0,60) + '"');

        if (!user.id) { return next(); }

        // UTILISER LA CAPTURE ULTRA-IMMEDIATE
        const originalQ = String(req._Q_v15 || '').trim();
        const domain = (req.body && req.body.domain) || 'General';
        const language = (req.body && req.body.language) || 'fr';
        const content = (req.body && req.body.content) || '';

        const ragCtx = await buildRagContext(originalQ);
        const question = ragCtx
          ? 'INSTRUCTION : Utilise EXCLUSIVEMENT les donnees techniques ci-dessous. Cite les valeurs exactes.\n\n[CONTEXTE]\n' + ragCtx + '\n[FIN]\n\nQuestion : ' + originalQ
          : originalQ;

        let answer = '';
        let fallbackSource = null;

        try {
          answer = await withTimeout(askClaude(question, content), 25000, 'claude');
          if (answer && answer.trim().length > 0) fallbackSource = 'claude';
        } catch (e) { console.warn('[fix-final] Claude KO:', e.message); }

        if (!answer || !answer.trim()) {
          try {
            answer = await withTimeout(askGemini(question, content), 25000, 'gemini');
            if (answer && answer.trim().length > 0) fallbackSource = 'gemini';
          } catch (e) { console.warn('[fix-final] Gemini KO:', e.message); }
        }

        if (!answer || !answer.trim()) answer = 'Erreur generation.';

        // ============ ECRITURE QA - LOG UNIQUE V14 ============
        if (FixQA && user.id) {
          try {
            if (mongoose.connection.readyState !== 1) {
              await withTimeout(mongoose.connection.asPromise(), 3000, 'conn');
            }
            console.log('[fix-final] ' + VERSION + ' WRITE_QA question="' + originalQ.substring(0,80) + '" (len=' + originalQ.length + ') pour ' + user.email);
            const created = await withTimeout(
              FixQA.create({
                userId: String(user.id || ''),
                question: originalQ || '(empty)',
                answer: answer,
                language: language,
                domain: domain
              }),
              3000, 'write'
            );
            if (created && created._id) {
              console.log('[fix-final] ' + VERSION + ' WRITE_QA OK _id=' + created._id);
            }
          } catch (e) {
            console.error('[fix-final] ' + VERSION + ' WRITE_QA ERREUR:', e.message);
          }
        }

        // PDF
        let pdfLink = null;
        try {
          const pdfBuffer = await withTimeout(generatePDF(originalQ, answer, user), 10000, 'pdf');
          const token = crypto.randomBytes(16).toString('hex');
          PDF_CACHE[token] = { buffer: pdfBuffer, exp: Date.now() + 2 * 3600 * 1000 };
          const baseUrl = process.env.BASE_URL || 'https://scholars-connect-app.onrender.com';
          pdfLink = baseUrl + '/api/ultimate-pdf/' + token;
          console.log('[fix-final] ' + VERSION + ' PDF OK ' + pdfBuffer.length + 'o');
        } catch (e) { console.warn('[fix-final] PDF err:', e.message); }

        const dateStr = new Date().toLocaleString('fr-FR');
        const answerText = cleanAnswer(answer) + (pdfLink ? '\n\n---\nRapport PDF pour ' + user.name + ' (' + user.email + ') le ' + dateStr + '.\nTelecharger : ' + pdfLink : '');

        return sendJson(res, {
          ok: true,
          answer: answerText,
          answerRaw: answer,
          pdfLink: pdfLink,
          pdfReport: !!pdfLink,
          fallbackUsed: fallbackSource,
          enriched: true,
          domain: domain
        });
      }
    } catch (e) {
      console.error('[fix-final] ' + VERSION + ' err:', e.message);
    }

    return next();
  };

  try {
    const mini = express.Router();
    mini.use(masterMiddleware);
    if (mini.stack && mini.stack[0]) {
      router.stack.unshift(mini.stack[0]);
      console.log('[fix-final] ' + VERSION + ' Middleware injecte en position 0');
    }
  } catch (e) {
    console.error('[fix-final] inject err:', e.message);
  }

  console.log('[fix-final] ========================================');
  console.log('[fix-final] ' + VERSION + ' PRET');
  console.log('[fix-final] ========================================');
};