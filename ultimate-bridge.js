// ============================================================
// ULTIMATE-BRIDGE.JS - Module autonome unique
//   [1] PDF avec lien cliquable (nom/email/date en en-tête)
//   [2] Historique par utilisateur (MongoDB)
//   [3] 18 domaines réintégrés au démarrage
//   [4] Fallback Claude -> Gemini si la base locale est insuffisante
// NE MODIFIE AUCUNE LIGNE existante. UNE seule ligne à ajouter dans server.js.
// ============================================================
'use strict';
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const PDF_CACHE = {};

const DOMAINES_18 = [
  'General', 'Religion', 'Education', 'Technique', 'Analyse',
  'Sante', 'Droit', 'Economie', 'Histoire', 'Philosophie',
  'Sciences', 'Litterature', 'Arts', 'Langues', 'Sport',
  'Industrie', 'Petrole & Gaz', 'Plan Qualite'
];

module.exports = function(app, mongoose) {
  console.log('[ultimate-bridge] Module unique chargé.');

  // --- Modèles existants (récupérés, jamais recréés si présents) ---
  let User = null, QA = null, AutoFeedDoc = null, Domain = null;
  try { User = mongoose.model('User'); } catch(e) {}
  try { QA = mongoose.model('QA'); } catch(e) {
    try {
      const s = new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
        question: { type: String, required: true },
        answer: { type: String, required: true },
        language: { type: String, default: 'fr' },
        domain: { type: String, default: 'General' },
        sourceDoc: { type: String, default: null },
        createdAt: { type: Date, default: Date.now }
      });
      QA = mongoose.model('QA', s);
    } catch(e2) { console.warn('[ultimate-bridge] QA indisponible:', e2.message); }
  }
  try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch(e) {}
  try { Domain = mongoose.model('Domain'); } catch(e) {
    try {
      const s = new mongoose.Schema({
        name: { type: String, required: true, unique: true, index: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isDefault: { type: Boolean, default: false },
        usage: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now }
      });
      Domain = mongoose.model('Domain', s);
    } catch(e2) { console.warn('[ultimate-bridge] Domain indisponible:', e2.message); }
  }

  // ============================================================
  // [3] 18 DOMAINES AU DEMARRAGE
  // ============================================================
  async function ensure18Domains() {
    if (!Domain) return;
    try {
      for (const name of DOMAINES_18) {
        await Domain.updateOne(
          { name },
          { $setOnInsert: { name, isDefault: true } },
          { upsert: true }
        );
      }
      const count = await Domain.countDocuments({ isDefault: true });
      console.log(`[ultimate-bridge] ${count} domaines par defaut vérifiés.`);
    } catch(e) { console.warn('[ultimate-bridge] domaines:', e.message); }
  }

  // Route /api/domains si absente
  const hasDomainsRoute = () => {
    const stack = (app._router && app._router.stack) || [];
    return stack.some(l => l.route && l.route.path === '/api/domains');
  };
  if (!hasDomainsRoute()) {
    app.get('/api/domains', async function(req, res) {
      try {
        if (!Domain) return res.json({ domains: DOMAINES_18 });
        const list = await Domain.find().sort({ usage: -1, name: 1 }).lean();
        res.json({ domains: list.map(d => d.name) });
      } catch(e) { res.json({ domains: DOMAINES_18 }); }
    });
  }

  // ============================================================
  // [4] FALLBACK CLAUDE -> GEMINI
  // ============================================================
  async function askClaude(question, content) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY absente');
    const models = ['anthropic/claude-sonnet-4.6', 'openrouter/free'];
    let lastErr = null;
    for (const model of models) {
      try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://scholars-connect-app.onrender.com' },
          body: JSON.stringify({
            model,
            max_tokens: 4000,
            messages: [
              { role: 'system', content: 'Tu es un expert senior multidisciplinaire (ingénierie pétrolière, sciences, droit, économie, religion, etc.). Réponds de façon détaillée, factuelle et structurée en français.' },
              { role: 'user', content: question + (content ? '\n\nDocument:\n' + content : '') }
            ]
          })
        });
        if (r.ok) {
          const j = await r.json();
          if (j.choices && j.choices[0] && j.choices[0].message) return j.choices[0].message.content;
        } else {
          lastErr = new Error('HTTP ' + r.status);
        }
      } catch(e) { lastErr = e; }
    }
    throw lastErr || new Error('Claude indisponible');
  }

  async function askGemini(question, content) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY absente');
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: key });
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const r = await ai.models.generateContent({
      model,
      contents: question + (content ? '\n\nDocument:\n' + content : '')
    });
    return (r && r.text) || '';
  }

  // ============================================================
  // [1] GENERATION PDF
  // ============================================================
  function cleanAnswer(answer) {
    if (!answer) return '';
    let t = String(answer);
    t = t.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/div>/gi, '\n');
    t = t.replace(/<[^>]+>/g, '');
    t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    t = t.replace(/Le rapport technique a été généré avec succès\.[\s\S]*?---\s*/i, '');
    t = t.replace(/?? Le rapport d.expertise a été généré[\s\S]*?_\)/i, '');
    t = t.replace(/https:\/\/scholars-connect-app\.onrender\.com\/api\/(?:claude-pdf|pdf-report|ultimate-pdf)\/[a-f0-9]+/gi, '');
    return t.trim();
  }

  function generatePDF(question, answer, user) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        const dateStr = new Date().toLocaleString('fr-FR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        doc.font('Helvetica-Bold').fontSize(20).fillColor('#0a2540').text('RAPPORT TECHNIQUE D\'EXPERTISE', { align: 'center' });
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(9).fillColor('#666').text(`Demandeur : ${user.name}`, { align: 'right' });
        doc.text(`Email : ${user.email}`, { align: 'right' });
        doc.text(`Date de visite : ${dateStr}`, { align: 'right' });
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
        doc.moveDown(1);
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#333').text('Sujet :');
        doc.font('Helvetica-Oblique').fontSize(10).fillColor('#555').text(question || '(non spécifié)');
        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
        doc.moveDown(1);

        const lines = cleanAnswer(answer).split('\n');
        for (let line of lines) {
          line = line.trim();
          if (!line) { doc.moveDown(0.5); continue; }
          if (line.startsWith('## ')) doc.moveDown(0.5).font('Helvetica-Bold').fontSize(14).fillColor('#1e5aa8').text(line.replace('## ', ''));
          else if (line.startsWith('### ')) doc.moveDown(0.5).font('Helvetica-Bold').fontSize(12).fillColor('#0a2540').text(line.replace('### ', ''));
          else if (line.startsWith('- ') || line.startsWith('* ')) doc.font('Helvetica').fontSize(10).fillColor('#333').text('• ' + line.substring(2), { indent: 15 });
          else doc.font('Helvetica').fontSize(10).fillColor('#333').text(line, { align: 'justify' });
        }
        const pages = doc.bufferedPageRange();
        for (let i = pages.start; i < pages.start + pages.count; i++) {
          doc.switchToPage(i);
          doc.font('Helvetica').fontSize(8).fillColor('#999').text(
            `Document confidentiel - MBA-CONSULT AI CORE - Page ${i - pages.start + 1} / ${pages.count}`,
            50, doc.page.height - 40, { align: 'center' });
        }
        doc.end();
      } catch(e) { reject(e); }
    });
  }

  // ============================================================
  // EXTRACTION UTILISATEUR (JWT)
  // ============================================================
  function getUserFromToken(req) {
    try {
      const h = req.headers.authorization || '';
      const token = h.replace('Bearer ', '').trim();
      if (!token) return { name: 'Invité', email: 'inconnu@localhost', id: null };
      const parts = token.split('.');
      if (parts.length !== 3) return { name: 'Invité', email: 'inconnu@localhost', id: null };
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return { name: payload.name || 'Utilisateur', email: payload.email || 'inconnu@localhost', id: payload.id || null };
    } catch(e) {
      return { name: 'Invité', email: 'inconnu@localhost', id: null };
    }
  }

  // ============================================================
  // MIDDLEWARE PRINCIPAL (placé EN TETE pour voir la réponse finale)
  // ============================================================
  const bridgeMiddleware = async function(req, res, next) {
    if (req.method !== 'POST' || !req.body) return next();
    const origJson = res.json.bind(res);
    let processed = false;

    res.json = async function(data) {
      if (processed) return origJson(data);
      if (data && data.qpStandard01) return origJson(data);

      const answerRaw = (data && (data.answer || data.answerRaw)) || '';
      if (!answerRaw || typeof answerRaw !== 'string') return origJson(data);

      const question = req.body.question || '(non spécifié)';
      const content = req.body.content || '';
      const user = getUserFromToken(req);

      // [4] Détection réponse insuffisante
      const cleanedText = cleanAnswer(answerRaw);
      const needsFallback = cleanedText.length < 150 ||
        /je ne (peux|sais|dispose)/i.test(cleanedText) ||
        /désolé,? (je|nous)/i.test(cleanedText) ||
        /information (non disponible|not available)/i.test(cleanedText) ||
        /n.hésitez pas à (consulter|vérifier)/i.test(cleanedText) ||
        /consultez? (les )?documents?/i.test(cleanedText) ||
        /je vous encourage à consulter/i.test(cleanedText);

      let finalAnswer = answerRaw;
      let fallbackSource = null;

      if (needsFallback) {
        console.log('[ultimate-bridge] Reponse locale insuffisante -> fallback.');
        try {
          finalAnswer = await askClaude(question, content);
          fallbackSource = 'claude';
          console.log('[ultimate-bridge] Fallback CLAUDE ok (' + finalAnswer.length + ' car.)');
        } catch(e) {
          console.warn('[ultimate-bridge] Claude échoué:', e.message);
          try {
            finalAnswer = await askGemini(question, content);
            fallbackSource = 'gemini';
            console.log('[ultimate-bridge] Fallback GEMINI ok (' + finalAnswer.length + ' car.)');
          } catch(e2) {
            console.warn('[ultimate-bridge] Gemini échoué:', e2.message);
          }
        }
      }

      // [2] Historique par utilisateur
      try {
        if (QA && user.id) {
          await QA.create({
            userId: user.id,
            question,
            answer: finalAnswer,
            language: req.body.language || 'fr',
            domain: req.body.domain || 'General',
            sourceDoc: req.body.sourceDoc || null
          });
          console.log('[ultimate-bridge] Historique sauvegardé pour', user.email);
        }
      } catch(e) { console.warn('[ultimate-bridge] historique:', e.message); }

      // [1] PDF + lien cliquable
      try {
        processed = true;
        const pdfBuffer = await generatePDF(question, finalAnswer, user);
        const token = crypto.randomBytes(16).toString('hex');
        PDF_CACHE[token] = { buffer: pdfBuffer, exp: Date.now() + 2 * 3600 * 1000 };
        const baseUrl = process.env.BASE_URL || 'https://scholars-connect-app.onrender.com';
        const link = `${baseUrl}/api/ultimate-pdf/${token}`;
        const dateStr = new Date().toLocaleString('fr-FR');
        console.log('[ultimate-bridge] PDF généré (' + pdfBuffer.length + ' octets) pour', user.email);

        return origJson({
          ok: true,
          answer: `${cleanAnswer(finalAnswer)}\n\n---\n?? Rapport PDF pour ${user.name} (${user.email}) le ${dateStr}.\n?? Télécharger : ${link}`,
          answerRaw: finalAnswer,
          pdfLink: link,
          pdfReport: true,
          fallbackUsed: fallbackSource,
          enriched: true,
          domain: req.body.domain || 'General'
        });
      } catch(e) {
        console.error('[ultimate-bridge] PDF erreur:', e.message);
        return origJson({ ...(data||{}), answer: finalAnswer, answerRaw: finalAnswer, fallbackUsed: fallbackSource, enriched: true });
      }
    };
    next();
  };

  app.use(['/api/ask', '/api/analyze-content'], bridgeMiddleware);

  // Placer EN TETE de pile pour voir la réponse finale (après tous les autres wrappers)
  (function moveToTop() {
    const stack = app._router && app._router.stack;
    if (!stack) return;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].handle === bridgeMiddleware) {
        const [layer] = stack.splice(i, 1);
        stack.unshift(layer);
        console.log('[ultimate-bridge] Middleware placé en tête de pile.');
        return;
      }
    }
  })();

  // Route PDF
  app.get('/api/ultimate-pdf/:token', function(req, res) {
    const d = PDF_CACHE[req.params.token];
    if (!d || d.exp < Date.now()) return res.status(404).send('PDF expiré ou introuvable.');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="rapport_expertise.pdf"');
    res.send(d.buffer);
  });

  // Route historique
  app.get('/api/history', async function(req, res) {
    try {
      const user = getUserFromToken(req);
      if (!QA || !user.id) return res.json({ items: [] });
      const items = await QA.find({ userId: user.id }).sort({ createdAt: -1 }).limit(200).lean();
      res.json({ items });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Init 18 domaines
  ensure18Domains();

  console.log('[ultimate-bridge] Prêt : PDF + historique + 18 domaines + fallback Claude/Gemini.');
};
