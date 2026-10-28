'use strict';
const express = require('express');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const PDF_CACHE = {};

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
  content: 'API Spec 14L:2020(R2025) - Lock Mandrels and Landing Nipples. TOLERANCES SEAL BORE : Diameter tolerance +0.0020 in / -0.0000 in. Surface finish Ra 0.80 um max (32 micro-inches). Drift test : passage libre du calibreur sur toute la longueur. PRESSIONS EPREUVE : V3 = 1.0x rated pressure. V2 / V1 / V0 = 1.5x rated pressure. Fuite gaz max V0 : 20 sccm. VALIDATION GRADES lock mandrels : V3 (functional supplier), V2 (liquid at pressure), V1 (liquid at rated T and P), V0 (nitrogen gas at rated T and P), V1-H (liquid with temp cycling), V0-H (gas with temp cycling). NDT : ASTM E709. Marking : API Monogram.',
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
  console.log('[fix-final] Chargement v5 (RAG ameliore + seed API14L + histo await)...');
  const router = app._router || app.router;
  if (!router || !router.stack) { console.error('[fix-final] Router non initialise'); return; }

  function getModels() {
    let QA = null, FD = null;
    try { QA = mongoose.model('QA'); } catch (e) {}
    try { FD = mongoose.model('AutoFeedDocument'); } catch (e) {}
    return { QA, FD };
  }

  // Seed automatique d'API 14L (upsert au demarrage)
  (async () => {
    const { FD } = getModels();
    if (!FD) { console.warn('[fix-final] AutoFeedDocument absent - seed impossible'); return; }
    try {
      await withTimeout(
        FD.updateOne({ source: 'API-14L-Manual' }, { $set: API14L_SEED }, { upsert: true }),
        5000, 'seed_timeout'
      );
      console.log('[fix-final] Seed API 14L : OK (upsert)');
    } catch (e) {
      console.warn('[fix-final] Seed API 14L erreur :', e.message);
    }
  })();

  async function buildRagContext(question) {
    const { FD } = getModels();
    if (!FD) return '';
    try {
      const qLower = String(question || '').toLowerCase();
      const tokens = qLower.match(/[a-z0-9]{3,}/g) || [];

      // Recherche ciblee par mots-cles techniques prioritaires
      const patterns = [];
      if (qLower.indexOf('14l') !== -1) patterns.push({ field: 'title', regex: '14l', bonus: 50 });
      if (qLower.indexOf('seal') !== -1 || qLower.indexOf('bore') !== -1) patterns.push({ field: 'content', regex: 'seal.?bore', bonus: 30 });
      if (qLower.indexOf('tolérance') !== -1 || qLower.indexOf('tolerance') !== -1) patterns.push({ field: 'content', regex: 'tolerance', bonus: 20 });

      const docs = await withTimeout(FD.find({}).limit(500).lean(), 3000, 'rag_timeout');
      let best = null, maxScore = 0;

      docs.forEach(d => {
        const title = String(d.title || '').toLowerCase();
        const content = String(d.content || '').toLowerCase();
        let score = 0;

        tokens.forEach(t => {
          if (title.indexOf(t) !== -1) score += 10;
          if (content.indexOf(t) !== -1) score += 1;
        });

        patterns.forEach(p => {
          const target = p.field === 'title' ? title : content;
          if (target.indexOf(p.regex.replace('.?','').replace('.?','')) !== -1 || target.indexOf(p.regex) !== -1) score += p.bonus;
        });

        if (title.indexOf('api spec 14l') !== -1) score += 100;
        if (title.indexOf('vam') !== -1 && qLower.indexOf('vam') === -1) score -= 30;

        if (score > maxScore) { maxScore = score; best = d; }
      });

      if (best && maxScore > 0) {
        console.log('[fix-final] RAG: ' + best.title + ' (score=' + maxScore + ')');
        return best.content || '';
      }
      console.log('[fix-final] RAG: aucun doc pertinent (best=' + (best ? best.title : 'none') + ', score=' + maxScore + ')');
    } catch (e) { console.warn('[fix-final] RAG err:', e.message); }
    return '';
  }

  const masterMiddleware = async function(req, res, next) {
    let path = '';
    try {
      const rawUrl = req.url || req.originalUrl || '';
      const cleanUrl = rawUrl.split('?')[0].split('#')[0];
      path = cleanUrl || '/';
    } catch (e) { path = '/'; }

    const method = (req.method || 'GET').toUpperCase();

    try {
      if (method === 'GET' && path === '/api/domains') {
        return sendJson(res, { domains: DOMAINES_18 });
      }

      if (method === 'GET' && path === '/api/history') {
        const user = getUserFromToken(req);
        if (!user.id) return sendJson(res, { items: [] }, 401);
        const { QA } = getModels();
        if (!QA) return sendJson(res, { items: [] });
        try {
          const items = await withTimeout(QA.find({ userId: user.id }).sort({ createdAt: -1 }).limit(200).lean(), 3000, 'history_timeout');
          return sendJson(res, { items });
        } catch (e) {
          console.warn('[fix-final] history err:', e.message);
          return sendJson(res, { items: [] });
        }
      }

      if (method === 'GET' && path.indexOf('/api/ultimate-pdf/') === 0) {
        const token = path.replace('/api/ultimate-pdf/', '');
        const d = PDF_CACHE[token];
        if (!d || d.exp < Date.now()) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain');
          return res.end('PDF expire.');
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="rapport_expertise.pdf"');
        res.setHeader('Content-Length', d.buffer.length);
        return res.end(d.buffer);
      }

      if (method === 'POST' && (path === '/api/ask' || path === '/api/analyze-content')) {
        const user = getUserFromToken(req);
        if (!user.id) return next();

        const originalQ = (req.body && req.body.question) || '';
        const content = (req.body && req.body.content) || '';
        const domain = (req.body && req.body.domain) || 'General';
        const language = (req.body && req.body.language) || 'fr';

        const ragCtx = await buildRagContext(originalQ);
        const question = ragCtx
          ? 'INSTRUCTION CRITIQUE : Utilise EXCLUSIVEMENT les donnees techniques ci-dessous pour repondre. Cite les valeurs exactes (+0.0020 in, 0.80 um). Si une donnee manque, ecris DONNEE MANQUANTE.\n\n[CONTEXTE TECHNIQUE OFFICIEL]\n' + ragCtx + '\n[FIN CONTEXTE]\n\nQuestion : ' + originalQ
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

        if (!answer || !answer.trim()) {
          answer = 'Desole, la generation a echoue. Veuillez reessayer dans quelques instants.';
        }

        // Historique ATTENDU (max 4s) avec verification de connexion
        const { QA } = getModels();
        if (QA && user.id) {
          try {
            // ETAPE 1 : S'assurer que la connexion MongoDB est prete
            if (mongoose.connection.readyState !== 1) {
              console.log('[fix-final] Connexion Mongo pas prete (readyState=' + mongoose.connection.readyState + '), attente...');
              await withTimeout(mongoose.connection.asPromise(), 3000, 'conn_wait');
              console.log('[fix-final] Connexion Mongo prete (readyState=' + mongoose.connection.readyState + ')');
            }

            // ETAPE 2 : Ecrire avec verification explicite
            const created = await withTimeout(
              QA.create({ userId: user.id, question: originalQ, answer: answer, language: language, domain: domain }),
              3000, 'history_save_timeout'
            );
            if (created && created._id) {
              console.log('[fix-final] Historique OK - _id=' + created._id.toString() + ' pour ' + user.email);
            } else {
              console.warn('[fix-final] Historique cree mais _id absent :', JSON.stringify(created));
            }
          } catch (e) {
            console.error('[fix-final] Historique ERREUR :', e.message, '| stack:', (e.stack||'').split('\n')[0]);
          }
        } else {
          console.log('[fix-final] Historique ignore (QA=' + !!QA + ', userId=' + user.id + ')');
        }

        let pdfLink = null;
        try {
          const pdfBuffer = await withTimeout(generatePDF(originalQ, answer, user), 10000, 'pdf');
          const token = crypto.randomBytes(16).toString('hex');
          PDF_CACHE[token] = { buffer: pdfBuffer, exp: Date.now() + 2 * 3600 * 1000 };
          const baseUrl = process.env.BASE_URL || 'https://scholars-connect-app.onrender.com';
          pdfLink = baseUrl + '/api/ultimate-pdf/' + token;
          console.log('[fix-final] PDF OK (' + pdfBuffer.length + ' octets)');
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
      console.error('[fix-final] masterMiddleware err:', e.message);
    }

    return next();
  };

  try {
    const mini = express.Router();
    mini.use(masterMiddleware);
    if (mini.stack && mini.stack[0]) {
      router.stack.unshift(mini.stack[0]);
      console.log('[fix-final] Middleware maitre injecte en position 0');
    }
  } catch (e) {
    console.error('[fix-final] inject err:', e.message);
  }

  console.log('[fix-final] Pret - v5 avec seed API14L et RAG ameliore');
};