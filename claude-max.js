Claude
Nouvelle conversation
Claude travaille directement avec votre base de code
Claude travaille directement avec votre base de code Démarrer dans Claude Code.

MODULE~1.JS
MODULE~1.JS
275 lignes
JS



MODULE~1.JS
10,11 Ko •275 lignes
•
Le formatage peut être différent de la source

// ============================================================
// MODULE AUTONOME : CLAUDE OPUS / SONNET (via OpenRouter) + PDF
// Version : v9.0 - Correction définitive des Slugs & Auto-Fallback
// ============================================================

'use strict';

const PDFDocument = require('pdfkit');
const crypto = require('crypto');

// Cache temporaire pour stocker les PDF en mémoire (Expiration: 2 heures)
const PDF_CACHE = {};

module.exports = function(app, mongoose) {

  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) {
    console.warn('[claude-max] OPENROUTER_API_KEY absente. Module désactivé.');
    return;
  }

  // ============================================================
  // MODÈLES CANDIDATS CERTIFIÉS OPENROUTER
  // Utilisation des identifiants officiels valides pour éviter le HTTP 404.
  // ============================================================
  const MODEL_CANDIDATES = [
    'anthropic/claude-3-opus',       // Claude 3 Opus (Top performance analytique)
    'anthropic/claude-3.5-sonnet',   // Claude 3.5 Sonnet (Haute précision & rapidité)
    'anthropic/claude-3-haiku'       // Fallback ultra-rapide
  ];

  console.log('[claude-max] Initialisé avec succès. Modèle prioritaire :', MODEL_CANDIDATES[0]);

  // ============================================================
  // FONCTION DE GÉNÉRATION DU PDF D'EXPERTISE
  // ============================================================
  function generatePDF(markdown, userName, question) {

    return new Promise((resolve, reject) => {

      try {

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // --- EN-TÊTE DU RAPPORT ---
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#0a2540').text('RAPPORT TECHNIQUE D\'EXPERTISE', { align: 'center' });
        doc.moveDown(0.5);

        doc.font('Helvetica').fontSize(10).fillColor('#666666').text(`Demandeur : ${userName}`, { align: 'right' });
        doc.text(`Date : ${new Date().toLocaleString('fr-FR')}`, { align: 'right' });
        doc.moveDown(1);

        // Ligne de séparation
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(1);

        // --- SUJET DE LA DEMANDE ---
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#333333').text('Sujet de la demande :');
        doc.font('Helvetica-Oblique').fontSize(11).fillColor('#555555').text(question);
        doc.moveDown(1.5);

        // --- CORPS DU RAPPORT (Traitement Markdown) ---
        const lines = markdown.split('\n');
        let inCodeBlock = false;

        for (let line of lines) {

          line = line.trim();
          if (line === '') continue;

          // Gestion des blocs de code
          if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            doc.moveDown(0.5);
            continue;
          }

          if (inCodeBlock) {
            doc.font('Courier').fontSize(9).fillColor('#0055aa').text(line, { lineGap: 2 });
            continue;
          }

          // Gestion des Titres
          if (line.startsWith('### ')) {
            doc.moveDown(0.8).font('Helvetica-Bold').fontSize(12).fillColor('#1e5aa8').text(line.replace('### ', ''));
            doc.moveDown(0.3);
          } else if (line.startsWith('## ')) {
            doc.moveDown(1.1).font('Helvetica-Bold').fontSize(14).fillColor('#0a2540').text(line.replace('## ', ''));
            doc.moveDown(0.4);
          } else if (line.startsWith('# ')) {
            doc.moveDown(1.4).font('Helvetica-Bold').fontSize(16).fillColor('#0a2540').text(line.replace('# ', ''));
            doc.moveDown(0.5);
          }
          // Puces
          else if (line.startsWith('- ') || line.startsWith('* ')) {
            doc.font('Helvetica').fontSize(10.5).fillColor('#333333').text('• ' + line.substring(2), { indent: 15, lineGap: 3 });
          }
          // Lignes de tableau simplifiées
          else if (line.startsWith('|')) {
            if (line.includes('---')) continue;
            const cells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim()).join('  |  ');
            doc.font('Courier').fontSize(8.5).fillColor('#333333').text(cells, { indent: 5 });
          }
          // Paragraphes normaux
          else {
            let cleanLine = line.replace(/\*\*(.*?)\*\*/g, '$1');
            doc.font('Helvetica').fontSize(10.5).fillColor('#333333').text(cleanLine, { align: 'justify', lineGap: 3.5 });
          }

        }

        // --- PIED DE PAGE ---
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.font('Helvetica').fontSize(8.5).fillColor('#999999').text(
            `Document confidentiel généré par MBA-CONSULT AI CORE - Page ${i + 1} sur ${pages.count}`,
            50, doc.page.height - 40, { align: 'center' }
          );
        }

        doc.end();

      } catch (err) {
        reject(err);
      }

    });

  }

  // ============================================================
  // ROUTE D'ACCÈS AUX FICHIERS PDF SERVIS
  // ============================================================
  app.get('/api/claude-pdf/:token', (req, res) => {

    const pdfData = PDF_CACHE[req.params.token];

    if (!pdfData || pdfData.exp < Date.now()) {
      return res.status(404).send('Document PDF expiré ou introuvable.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="rapport.pdf"');
    res.send(pdfData.buffer);

  });

  // ============================================================
  // MIDDLEWARE AUTOMATIQUE DE TRAITEMENT
  // ============================================================
  async function claudeExpertInterceptor(req, res, next) {

    if (req.method !== 'POST' || !req.body) return next();

    const originalJson = res.json.bind(res);

    // Extraction sécurisée du nom de l'utilisateur depuis le JWT
    let userName = 'Utilisateur';
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          userName = payload.name || payload.email || payload.username || 'Utilisateur';
        }
      }
    } catch (e) {}

    res.json = async function(data) {

      if (!data || !data.answer || data.claudeMaxUsed) {
        return originalJson(data);
      }

      const question = req.body.question || "Analyse ce document.";
      const content = req.body.content ? `\n\nDocument :\n${req.body.content}` : '';
      const prompt = question + content;

      let success = false;
      let lastError = null;

      // Parcours séquentiel des modèles certifiés
      for (const model of MODEL_CANDIDATES) {

        if (success) break;

        console.log(`[claude-max] Tentative d'appel du modèle : ${model}...`);

        try {

          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://scholars-connect-app.onrender.com"
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: "system", content: "Tu es un expert senior certifié en ingénierie pétrolière et normes API. Rédige un rapport technique exhaustif, très bien structuré avec des titres (#, ##, ###), des listes à puces et des tableaux. Sépare distinctement les chapitres." },
                { role: "user", content: prompt }
              ]
            })
          });

          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`HTTP ${response.status} - ${errBody}`);
          }

          const resData = await response.json();

          if (resData.choices && resData.choices[0] && resData.choices[0].message) {

            console.log(`[claude-max] Succès de la génération avec le modèle : ${model}`);

            const rawMarkdown = resData.choices[0].message.content;
            const pdfBuffer = await generatePDF(rawMarkdown, userName, question);

            const token = crypto.randomBytes(16).toString('hex');
            PDF_CACHE[token] = { buffer: pdfBuffer, exp: Date.now() + (2 * 60 * 60 * 1000) };

            data.answerRaw = data.answer;
            data.answer = `
              <div style="width: 100%; height: 800px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; margin-top: 15px; background: #525659;">
                <iframe src="/api/claude-pdf/${token}" width="100%" height="100%" style="border: none;"></iframe>
              </div>
              <div style="text-align: center; margin-top: 12px;">
                <a href="/api/claude-pdf/${token}" download="Rapport_${userName.replace(/\s+/g, '_')}.pdf" style="display: inline-block; background: #0a2540; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif;">
                  ⬇ Télécharger le Rapport PDF
                </a>
              </div>
            `;
            data.claudeMaxUsed = true;
            data.enriched = true;
            success = true;

          }

        } catch (error) {

          console.warn(`[claude-max] Échec avec le modèle ${model} : ${error.message}`);
          lastError = error;

        }

      }

      if (!success) {
        console.error(`[claude-max] Tous les modèles OpenRouter ont échoué. Dernière erreur : ${lastError?.message}`);
      }

      return originalJson(data);

    };

    next();

  }

  app.use('/api/ask', claudeExpertInterceptor);
  app.use('/api/analyze-content', claudeExpertInterceptor);

  console.log('[claude-max] Middleware d\'expertise autonome complètement configuré et actif.');

};
