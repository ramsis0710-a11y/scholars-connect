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
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#0a2540').text('RAPPORT TECHNIQUE EXPERTISE',{align:'center'});
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9).fillColor('#666')
         .text('Demandeur : ' + user.name, {align:'right'})
         .text('Email : ' + user.email, {align:'right'})
         .text('Date de visite : ' + dateStr, {align:'right'});
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
          { role:'system', content:'Tu es un expert senior multidisciplinaire. Reponds de facon detaillee et structuree en francais.' },
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

module.exports = function(app, mongoose) {
  console.log('[fix-final] Chargement version anti-timeout...');
  const router = app._router || app.router;
  if (!router || !router.stack) { console.error('[fix-final] Router non initialise'); return; }

  let Domain = null, QA = null;
  try { Domain = mongoose.model('Domain'); } catch (e) {}
  try { QA = mongoose.model('QA'); } catch (e) {}
  if (!Domain) {
    try {
      Domain = mongoose.model('Domain', new mongoose.Schema({
        name:{type:String,required:true,unique:true,index:true},
        isDefault:{type:Boolean,default:false},
        usage:{type:Number,default:0},
        createdAt:{type:Date,default:Date.now}
      }));
    } catch (e2) {}
  }

  function injectRoute(method, path, handler) {
    try {
      const mini = express.Router();
      mini[method](path, handler);
      if (mini.stack && mini.stack[0]) { router.stack.unshift(mini.stack[0]); console.log('[fix-final] Route ' + method.toUpperCase() + ' ' + path); return true; }
    } catch (e) { console.error('[fix-final] injectRoute err ' + path + ':', e.message); }
    return false;
  }
  function injectMiddleware(paths, handler) {
    try {
      const mini = express.Router();
      mini.use(paths, handler);
      if (mini.stack && mini.stack[0]) { router.stack.unshift(mini.stack[0]); console.log('[fix-final] Middleware ' + JSON.stringify(paths)); return true; }
    } catch (e) { console.error('[fix-final] injectMiddleware err:', e.message); }
    return false;
  }

  // /api/domains INSTANTANE (pas de DB, on renvoie la constante)
  injectRoute('get', '/api/domains', (req, res) => {
    res.json({ domains: DOMAINES_18 });
  });

  // /api/history avec Promise.race 3s
  injectRoute('get', '/api/history', async (req, res) => {
    try {
      const user = getUserFromToken(req);
      if (!QA || !user.id) return res.json({ items: [] });
      const items = await withTimeout(
        QA.find({ userId: user.id }).sort({ createdAt: -1 }).limit(200).lean(),
        3000, 'history_timeout'
      );
      res.json({ items: items });
    } catch (e) {
      console.warn('[fix-final] /api/history timeout/err:', e.message);
      res.json({ items: [] });
    }
  });

  // PDF route
  injectRoute('get', '/api/ultimate-pdf/:token', (req, res) => {
    try {
      const d = PDF_CACHE[req.params.token];
      if (!d || d.exp < Date.now()) return res.status(404).send('PDF expire.');
      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition','inline; filename="rapport_expertise.pdf"');
      res.send(d.buffer);
    } catch (e) { res.status(500).send('Erreur PDF'); }
  });

  // Middleware principal
  const pdfMiddleware = function(req, res, next) {
    if (req.method !== 'POST' || !req.body) return next();
    const origJson = res.json.bind(res);
    let responded = false;

    // Timeout de securite : force une reponse si tout est bloque
    const safety = setTimeout(() => {
      if (responded) return;
      responded = true;
      console.log('[fix-final] TIMEOUT SECURITE 55s - force reponse');
      try {
        origJson({ ok: true, answer: 'Generation en cours, reessayez dans quelques secondes.', enriched: true });
      } catch (e) {}
    }, 55000);

    res.json = async function(data) {
      if (responded) return;
      const answerRaw = (data && (data.answer || data.answerRaw)) || '';

      // Deja traite par un autre module (pdfLink + pdfReport poses)
      if (data && data.pdfLink && data.pdfReport) {
        responded = true; clearTimeout(safety);
        return origJson(data);
      }
      if (!answerRaw) {
        responded = true; clearTimeout(safety);
        return origJson(data);
      }

      const question = req.body.question || '(non specifie)';
      const content = req.body.content || '';
      const user = getUserFromToken(req);

      let finalAnswer = answerRaw;
      let fallbackSource = (data && data.fallbackUsed) || null;

      // Fallback rapide si besoin
      try {
        const cleaned = cleanAnswer(answerRaw);
        const needsFb = cleaned.length < 150 || /je ne (peux|sais|dispose)/i.test(cleaned) || /desole,? (je|nous)/i.test(cleaned) || /je vous encourage a consulter/i.test(cleaned) || /consultez? (les )?documents?/i.test(cleaned);
        if (needsFb) {
          try {
            finalAnswer = await withTimeout(askClaude(question, content), 20000, 'claude_timeout');
            fallbackSource = 'claude';
            console.log('[fix-final] Fallback CLAUDE OK (' + finalAnswer.length + ' car.)');
          } catch (e) {
            console.warn('[fix-final] Claude KO:', e.message);
            try {
              finalAnswer = await withTimeout(askGemini(question, content), 20000, 'gemini_timeout');
              fallbackSource = 'gemini';
              console.log('[fix-final] Fallback GEMINI OK (' + finalAnswer.length + ' car.)');
            } catch (e2) { console.warn('[fix-final] Gemini KO:', e2.message); }
          }
        }
      } catch (e) { console.warn('[fix-final] Fallback err:', e.message); }

      // Historique NON bloquant (fire and forget)
      if (QA && user.id) {
        withTimeout(
          QA.create({ userId:user.id, question:question, answer:finalAnswer, language:req.body.language || 'fr', domain:req.body.domain || 'General' }),
          2000, 'qa_create_timeout'
        ).then(() => console.log('[fix-final] Historique OK pour ' + user.email))
         .catch(e => console.warn('[fix-final] Historique non bloquant:', e.message));
      }

      // PDF
      let pdfLink = (data && data.pdfLink) || null;
      if (!pdfLink) {
        try {
          const pdfBuffer = await withTimeout(generatePDF(question, finalAnswer, user), 8000, 'pdf_timeout');
          const token = crypto.randomBytes(16).toString('hex');
          PDF_CACHE[token] = { buffer: pdfBuffer, exp: Date.now() + 2*3600*1000 };
          const baseUrl = process.env.BASE_URL || 'https://scholars-connect-app.onrender.com';
          pdfLink = baseUrl + '/api/ultimate-pdf/' + token;
          console.log('[fix-final] PDF genere (' + pdfBuffer.length + ' octets)');
        } catch (e) { console.warn('[fix-final] PDF non genere:', e.message); }
      }

      responded = true; clearTimeout(safety);

      const dateStr = new Date().toLocaleString('fr-FR');
      const text = cleanAnswer(finalAnswer) + (pdfLink ? '\n\n---\nRapport PDF pour ' + user.name + ' (' + user.email + ') le ' + dateStr + '.\nTelecharger : ' + pdfLink : '');

      return origJson({
        ok: true,
        answer: text,
        answerRaw: finalAnswer,
        pdfLink: pdfLink,
        pdfReport: !!pdfLink,
        fallbackUsed: fallbackSource,
        enriched: true,
        domain: req.body.domain || 'General'
      });
    };
    next();
  };

  injectMiddleware(['/api/ask','/api/analyze-content'], pdfMiddleware);

  // Init domaines en arriere-plan non bloquant
  (async () => {
    if (!Domain) return;
    try {
      for (const n of DOMAINES_18) {
        try { await withTimeout(Domain.updateOne({name:n},{$setOnInsert:{name:n,isDefault:true}},{upsert:true}), 2000, 'upsert_timeout'); } catch (e) {}
      }
      console.log('[fix-final] 18 domaines initialises en DB (best effort).');
    } catch (e) { console.warn('[fix-final] init domaines err:', e.message); }
  })();

  console.log('[fix-final] Position 0 : ' + (router.stack[0] ? 'OK' : 'ECHEC') + ' - mode anti-timeout actif');
};