// ============================================================
// MODULE AUTONOME : CLAUDE 3 OPUS + FORMATAGE LIVRABLE PDF
// Version : v4.0 - Expert & Formateur PDF
// NE MODIFIE AUCUNE LIGNE DE answer-enricher.js
// ============================================================

'use strict';

module.exports = function(app, mongoose) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const modelName = 'anthropic/claude-3-opus'; // Le modèle le plus intelligent

  if (!openRouterKey) {
    console.warn('[claude-max] OPENROUTER_API_KEY absente. Module désactivé.');
    return;
  }

  // Fonction pour extraire le nom de l'utilisateur depuis le token JWT
  function extractUserName(req) {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      if (!token) return 'Utilisateur';
      
      const parts = token.split('.');
      if (parts.length !== 3) return 'Utilisateur';
      
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return payload.name || payload.email || payload.username || 'Utilisateur';
    } catch (e) {
      return 'Utilisateur';
    }
  }

  // Convertisseur Markdown robuste vers HTML (pour gérer les tableaux et la structure)
  function markdownToHtml(markdown) {
    let html = markdown;
    
    // Échappement basique
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Titres
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Gras et Italique
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
    
    // Code inline
    html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
    
    // Blocs de code
    html = html.replace(/```(\w*)\n([\s\S]*?)```/gim, '<pre><code class="language-$1">$2</code></pre>');
    
    // Listes à puces
    html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');
    
    // Tableaux (simplifiés)
    html = html.replace(/^\|(.+)\|$/gim, function(match, content) {
      if (/^[\s\-:|]+$/.test(content)) return ''; // Ignorer les séparateurs
      const cells = content.split('|').map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    });
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)/gim, '<table class="table">$1</table>');
    
    // Paragraphes (lignes vides)
    html = html.replace(/^\s*$/gim, '<br>');
    
    return html;
  }

  async function claudeExpertInterceptor(req, res, next) {
    if (req.method !== 'POST' || !req.body) return next();

    const originalJson = res.json.bind(res);
    const userName = extractUserName(req);

    res.json = async function(data) {
      if (!data || !data.answer || data.claudeMaxUsed) {
        return originalJson(data);
      }

      const question = req.body.question || "Analyse ce document.";
      const content = req.body.content ? `\n\nDocument :\n${req.body.content}` : '';

      console.log(`[claude-max] Appel de Claude 3 Opus pour un rapport structuré...`);

      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://scholars-connect-app.onrender.com",
            "X-Title": "Scholars Connect - Claude Max"
          },
          body: JSON.stringify({
            model: modelName,
            temperature: 0.1,
            messages: [
              {
                role: "system",
                content: "Tu es un expert senior. Tu dois rédiger un rapport technique formel, structuré avec des titres clairs (#, ##, ###), des listes à puces et des tableaux. Sépare distinctement les chapitres. Ne fais aucune hallucination."
              },
              {
                role: "user",
                content: question + content
              }
            ]
          })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const resData = await response.json();
        
        if (resData.choices && resData.choices[0] && resData.choices[0].message) {
          console.log('[claude-max] Réponse reçue. Formatage en livrable PDF...');
          
          const rawMarkdown = resData.choices[0].message.content;
          const bodyHtml = markdownToHtml(rawMarkdown);
          const dateStr = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

          // Construction du document livrable structuré
          const formattedHtml = `
<div class="pdf-report-container" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 900px; margin: 0 auto; background: #fff; padding: 40px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
  <!-- En-tête du document -->
  <div style="border-bottom: 2px solid #0a2540; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div>
      <h1 style="margin: 0; color: #0a2540; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Rapport Technique</h1>
      <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Généré par MBA-CONSULT AI CORE</p>
    </div>
    <div style="text-align: right; font-size: 13px; color: #444;">
      <p style="margin: 0;"><strong>Demandeur :</strong> ${userName}</p>
      <p style="margin: 5px 0 0 0;"><strong>Date :</strong> ${dateStr}</p>
    </div>
  </div>

  <!-- Corps du rapport -->
  <div class="report-content" style="font-size: 15px; line-height: 1.6; text-align: justify;">
    <style>
      .report-content h1 { color: #1e5aa8; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-top: 30px; font-size: 20px; }
      .report-content h2 { color: #0a2540; margin-top: 25px; font-size: 18px; }
      .report-content h3 { color: #374151; margin-top: 20px; font-size: 16px; }
      .report-content ul { padding-left: 20px; margin-bottom: 15px; }
      .report-content li { margin-bottom: 8px; }
      .report-content table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
      .report-content th, .report-content td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
      .report-content th { background-color: #f1f5f9; font-weight: bold; }
      .report-content pre { background: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; border: 1px solid #e2e8f0; }
      .report-content code { font-family: 'Courier New', Courier, monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-size: 13px; }
    </style>
    ${bodyHtml}
  </div>

  <!-- Pied de page -->
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>Ce document est strictement confidentiel et destiné à l'usage exclusif de ${userName}.</p>
  </div>
</div>
          `;
          
          data.answerRaw = data.answer; 
          data.answer = formattedHtml;
          data.claudeMaxUsed = true;
          data.enriched = true; 
        }
      } catch (error) {
        console.error(`[claude-max] Erreur :`, error.message);
      }

      return originalJson(data);
    };

    next();
  }

  app.use('/api/ask', claudeExpertInterceptor);
  app.use('/api/analyze-content', claudeExpertInterceptor);

  console.log(`[claude-max] Agent Expert Claude 3 Opus + Générateur PDF activé.`);
};
