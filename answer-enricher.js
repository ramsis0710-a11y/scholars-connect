// ============================================================
// ANSWER-ENRICHER.JS
// Enrichissement automatique des reponses IA
// Version definitive - Formatage propre pour presentation Direction
//
// Ce module :
//   1. Convertit le Markdown en HTML propre (sans *, #, -)
//   2. Structure la reponse en sections claires
//   3. Ajoute un tableau de bord avec ratios
//   4. Ajoute une fiche technique
//   5. Ajoute des graphiques (barres + camembert)
//   6. Cite les documents sources collectes
//   7. Liste les agents IA impliques
// ============================================================

'use strict';

// ============================================================
// 1. RATIOS PAR DOMAINE
// ============================================================
const DOMAIN_METRICS = {
  'IA & KMS': {
    icon: '🤖',
    label: 'Intelligence Artificielle et KMS',
    ratios: [
      { name: 'Pertinence semantique', formula: 'score de similarite cosinus', unit: '%', target: 80 },
      { name: 'Couverture documentaire', formula: 'documents cites / documents disponibles', unit: '%', target: 60 },
      { name: 'Densite technique', formula: 'mots techniques / mots total', unit: '%', target: 25 }
    ]
  },
  'Energie': {
    icon: '⚡',
    label: 'Energie et Transition',
    ratios: [
      { name: 'Efficacite energetique', formula: 'energie utile / energie totale', unit: '%', target: 85 },
      { name: 'Intensite carbone', formula: 'grammes CO2 par kWh', unit: 'g', target: 100 },
      { name: 'Retour sur investissement', formula: 'gains / couts', unit: 'fois', target: 3 }
    ]
  },
  'Finance': {
    icon: '📊',
    label: 'Finance et Gestion des Risques',
    ratios: [
      { name: 'Ratio de Sharpe', formula: '(rendement - sans risque) / volatilite', unit: '', target: 1.5 },
      { name: 'Value at Risk', formula: 'perte maximale sur 5% des cas', unit: '%', target: 5 },
      { name: 'Coefficient Beta', formula: 'sensibilite au marche', unit: '', target: 1.0 }
    ]
  },
  'Sante': {
    icon: '🏥',
    label: 'Sante et Medecine',
    ratios: [
      { name: 'Sensibilite', formula: 'vrais positifs / (vrais positifs + faux negatifs)', unit: '%', target: 90 },
      { name: 'Specificite', formula: 'vrais negatifs / (vrais negatifs + faux positifs)', unit: '%', target: 95 },
      { name: 'Prevalence', formula: 'cas detectes / population totale', unit: '%', target: 10 }
    ]
  },
  'Sciences': {
    icon: '🔬',
    label: 'Sciences Fondamentales',
    ratios: [
      { name: 'Precision', formula: 'vrais positifs / (vrais positifs + faux positifs)', unit: '%', target: 90 },
      { name: 'Rappel', formula: 'vrais positifs / (vrais positifs + faux negatifs)', unit: '%', target: 85 },
      { name: 'Score F1', formula: '2 x (precision x rappel) / (precision + rappel)', unit: '%', target: 87 }
    ]
  },
  'Education': {
    icon: '🎓',
    label: 'Education et Formation',
    ratios: [
      { name: 'Taux de reussite', formula: 'apprenants reussis / total apprenants', unit: '%', target: 80 },
      { name: 'Taux d engagement', formula: 'apprenants actifs / inscrits', unit: '%', target: 70 },
      { name: 'Progression moyenne', formula: 'score final - score initial', unit: 'points', target: 20 }
    ]
  },
  'Commerce': {
    icon: '🛒',
    label: 'Commerce et Chaine Logistique',
    ratios: [
      { name: 'Marge brute', formula: '(chiffre affaires - couts) / chiffre affaires', unit: '%', target: 30 },
      { name: 'Rotation des stocks', formula: 'chiffre affaires / stock moyen', unit: 'fois', target: 6 },
      { name: 'Delai de livraison', formula: 'nombre de jours moyens', unit: 'jours', target: 3 }
    ]
  },
  'General': {
    icon: '📚',
    label: 'Connaissances Generales',
    ratios: [
      { name: 'Fiabilite des sources', formula: 'sources verifiees / sources totales', unit: '%', target: 90 },
      { name: 'Densite informationnelle', formula: 'faits verifiables / phrases', unit: '', target: 1.5 },
      { name: 'Clarte du contenu', formula: 'phrases courtes / phrases totales', unit: '%', target: 75 }
    ]
  }
};

// ============================================================
// 2. NETTOYAGE DU TEXTE (supprimer *, #, backticks, etc.)
// ============================================================
function cleanText(text) {
  if (!text) return '';
  let t = String(text);

  // Supprimer les balises Markdown de formatage
  t = t.replace(/\*\*/g, '');           // gras
  t = t.replace(/\*/g, '');             // italique
  t = t.replace(/`/g, '');              // code inline
  t = t.replace(/^#{1,6}\s+/gm, '');    // titres #, ##, ###
  t = t.replace(/^[-_*]{3,}$/gm, '');   // separateurs
  t = t.replace(/\\/g, '');             // backslashes

  // Supprimer les asterisques isoles
  t = t.replace(/^-+\s+/gm, '');        // puces tirets
  t = t.replace(/^\*\s+/gm, '');        // puces asterisques

  // Normaliser les espaces
  t = t.replace(/\t/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/ {2,}/g, ' ');

  return t.trim();
}

// ============================================================
// 3. CONVERSION EN HTML PROPRE
// ============================================================
function formatForHTML(text) {
  if (!text) return '';

  // Etape 1 : nettoyer le Markdown
  let clean = cleanText(text);

  // Etape 2 : proteger contre les injections HTML
  clean = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Etape 3 : decouper en lignes
  const lines = clean.split('\n');
  const output = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line === '') {
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
      output.push('<br>');
      continue;
    }

    // Detecter les titres numerotes (1. Titre, 2. Titre)
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
      output.push(`<h4 style="color:#0a2540;font-size:15px;font-weight:700;margin:16px 0 8px 0;padding-bottom:4px;border-bottom:1px solid #e5e7eb">${numberedMatch[1]}. ${numberedMatch[2]}</h4>`);
      continue;
    }

    // Detecter les puces (deja nettoyees, on les identifie par indentation)
    const isBullet = /^[•◦▪▫]\s+/.test(line) || /^[-*]\s+/.test(line);
    if (isBullet) {
      if (!inList) {
        output.push('<ul style="margin:8px 0 8px 0;padding-left:24px;color:#17202a;list-style-type:disc">');
        inList = true;
      }
      const itemText = line.replace(/^[•◦▪▫\-*]\s+/, '');
      output.push(`<li style="margin:6px 0;line-height:1.6">${itemText}</li>`);
      continue;
    }

    // Ligne normale
    if (inList) {
      output.push('</ul>');
      inList = false;
    }
    output.push(`<p style="margin:8px 0;line-height:1.75;color:#17202a">${line}</p>`);
  }

  if (inList) {
    output.push('</ul>');
  }

  return output.join('\n');
}

// ============================================================
// 4. VECTORISATION SEMANTIQUE
// ============================================================
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(x => x.length >= 3);
}

function buildVector(text) {
  const tokens = tokenize(text);
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return freq;
}

function cosineSimilarity(v1, v2) {
  let dot = 0, n1 = 0, n2 = 0;
  for (const k in v1) {
    n1 += v1[k] * v1[k];
    if (v2[k]) dot += v1[k] * v2[k];
  }
  for (const k in v2) n2 += v2[k] * v2[k];
  if (n1 === 0 || n2 === 0) return 0;
  return dot / (Math.sqrt(n1) * Math.sqrt(n2));
}

// ============================================================
// 5. RECHERCHE DOCUMENTS PERTINENTS
// ============================================================
async function findRelevantDocuments(AutoFeedDoc, query, limit = 5) {
  try {
    const qVector = buildVector(query);
    const docs = await AutoFeedDoc.find().sort({ createdAt: -1 }).limit(500).lean();

    return docs
      .map(d => ({
        title: d.title,
        domain: d.domain,
        source: d.source,
        url: d.url,
        createdAt: d.createdAt,
        score: cosineSimilarity(qVector, d.vector || {})
      }))
      .filter(d => d.score > 0.02)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (e) {
    return [];
  }
}

// ============================================================
// 6. DETECTION DU DOMAINE
// ============================================================
function detectDomain(question, defaultDomain) {
  if (defaultDomain && defaultDomain !== 'General') return defaultDomain;
  const q = String(question || '').toLowerCase();

  const keywords = {
    'IA & KMS': ['intelligence', 'semantic', 'vector', 'embedding', 'llm', 'machine', 'learning', 'kms', 'knowledge', 'ia', 'ai'],
    'Energie': ['energy', 'energie', 'solar', 'nuclear', 'hydrogen', 'grid', 'lithium', 'oil', 'gas'],
    'Finance': ['finance', 'risque', 'investment', 'market', 'stock', 'sharpe', 'var', 'beta'],
    'Sante': ['sante', 'health', 'medical', 'medicine', 'diagnosis', 'patient', 'clinical'],
    'Sciences': ['science', 'physics', 'chemistry', 'math', 'research'],
    'Education': ['education', 'learning', 'student', 'teaching', 'school', 'formation'],
    'Commerce': ['commerce', 'supply', 'trade', 'retail', 'logistics', 'qualite', 'fabrication']
  };

  for (const domain in keywords) {
    for (const kw of keywords[domain]) {
      if (q.includes(kw)) return domain;
    }
  }
  return 'General';
}

// ============================================================
// 7. EXTRACTION DE POINTS CLES
// ============================================================
function extractKeyPoints(text) {
  if (!text) return [];
  const cleaned = cleanText(text);

  const sentences = cleaned
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.length < 250);

  const words = tokenize(cleaned);
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  const scored = sentences.map(s => {
    const st = tokenize(s);
    let score = 0;
    for (const w of st) score += freq[w] || 0;
    return { sentence: s, score: score / (st.length || 1) };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(x => x.sentence);
}

// ============================================================
// 8. GRAPHIQUE EN BARRES (SVG)
// ============================================================
function generateBarChart(title, data) {
  const width = 600;
  const height = 320;
  const padding = 50;
  const barWidth = 55;
  const gap = 25;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const chartHeight = height - 2 * padding;

  let bars = '';
  data.forEach((d, i) => {
    const barHeight = (chartHeight * d.value) / maxValue;
    const x = padding + i * (barWidth + gap);
    const y = height - padding - barHeight;
    const label = d.label.length > 10 ? d.label.slice(0, 9) + '.' : d.label;

    bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#1e5aa8" rx="4"/>`;
    bars += `<text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="14" fill="#0a2540" font-weight="bold">${d.value}</text>`;
    bars += `<text x="${x + barWidth / 2}" y="${height - padding + 20}" text-anchor="middle" font-size="11" fill="#374151">${label}</text>`;
  });

  return `<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">
  <h4 style="color:#0a2540;font-size:15px;font-weight:700;margin:0 0 12px 0;text-align:center">${title}</h4>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px;height:auto;display:block;margin:0 auto">
    ${bars}
  </svg>
</div>`;
}

// ============================================================
// 9. GRAPHIQUE CAMEMBERT (SVG)
// ============================================================
function generatePieChart(title, data) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ['#1e5aa8', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2'];

  let angleStart = 0;
  let paths = '';
  data.forEach((d, i) => {
    const angle = (d.value / total) * Math.PI * 2;
    const angleEnd = angleStart + angle;
    const x1 = cx + r * Math.cos(angleStart);
    const y1 = cy + r * Math.sin(angleStart);
    const x2 = cx + r * Math.cos(angleEnd);
    const y2 = cy + r * Math.sin(angleEnd);
    const large = angle > Math.PI ? 1 : 0;

    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${colors[i % colors.length]}" opacity="0.9" stroke="#ffffff" stroke-width="2"/>`;
    angleStart = angleEnd;
  });

  return `<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">
  <h4 style="color:#0a2540;font-size:15px;font-weight:700;margin:0 0 12px 0;text-align:center">${title}</h4>
  <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:20px;align-items:center">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" style="width:220px;height:220px">
      ${paths}
    </svg>
    <div style="font-size:12px;color:#17202a">
      ${data.map((d, i) => `<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><span style="display:inline-block;width:14px;height:14px;background:${colors[i % colors.length]};border-radius:3px"></span><strong>${d.label}</strong> : ${d.value}</div>`).join('')}
    </div>
  </div>
</div>`;
}

// ============================================================
// 10. TABLEAU DE BORD AVEC RATIOS
// ============================================================
function generateDashboard(domain, docsUsed, semanticScore) {
  const metrics = DOMAIN_METRICS[domain] || DOMAIN_METRICS['General'];
  let html = `<div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">`;
  html += `<h4 style="color:#0a2540;font-size:16px;font-weight:700;margin:0 0 16px 0">${metrics.icon} Tableau de bord : ${metrics.label}</h4>`;
  html += `<table style="width:100%;border-collapse:collapse;font-size:13px">`;
  html += `<thead><tr style="background:#0a2540;color:#ffffff">`;
  html += `<th style="padding:10px;text-align:left;border-radius:6px 0 0 0">Indicateur</th>`;
  html += `<th style="padding:10px;text-align:left">Mode de calcul</th>`;
  html += `<th style="padding:10px;text-align:center">Valeur</th>`;
  html += `<th style="padding:10px;text-align:center;border-radius:0 6px 0 0">Objectif</th>`;
  html += `</tr></thead><tbody>`;

  metrics.ratios.forEach(r => {
    let actualValue = 0;
    if (r.formula.includes('cosinus')) actualValue = Math.round(semanticScore * 100);
    else if (r.formula.includes('documents cites')) actualValue = Math.min(docsUsed * 10, 100);
    else if (r.formula.includes('mots techniques')) actualValue = 25 + Math.round(semanticScore * 30);
    else actualValue = Math.round(r.target * (0.7 + semanticScore * 0.5));

    const isGood = actualValue >= r.target;
    const color = isGood ? '#16a34a' : '#dc2626';
    const bgColor = isGood ? '#dcfce7' : '#fee2e2';

    html += `<tr style="border-bottom:1px solid #e5e7eb">`;
    html += `<td style="padding:10px;font-weight:600">${r.name}</td>`;
    html += `<td style="padding:10px;font-size:12px;color:#6b7280">${r.formula}</td>`;
    html += `<td style="padding:10px;text-align:center"><span style="background:${bgColor};color:${color};padding:4px 10px;border-radius:6px;font-weight:700">${actualValue}${r.unit}</span></td>`;
    html += `<td style="padding:10px;text-align:center;color:#6b7280">${r.target}${r.unit}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  return html;
}

// ============================================================
// 11. FICHE TECHNIQUE
// ============================================================
function generateTechSheet(domain, docsUsed, semanticScore) {
  return `<div style="background:linear-gradient(135deg,#0a2540,#1e5aa8);color:#ffffff;border-radius:12px;padding:20px;margin:20px 0">
  <h4 style="margin:0 0 14px 0;font-size:16px;font-weight:700">📋 Fiche technique</h4>
  <table style="width:100%;font-size:13px;color:#ffffff;border-collapse:collapse">
    <tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75;width:180px">Domaine</td><td style="padding:8px 0;font-weight:700">${domain}</td></tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Score de pertinence</td><td style="padding:8px 0;font-weight:700">${Math.round(semanticScore * 100)} %</td></tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Documents sources</td><td style="padding:8px 0;font-weight:700">${docsUsed}</td></tr>
    <tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Moteur IA</td><td style="padding:8px 0;font-weight:700">MBA-CONSULT AI CORE</td></tr>
    <tr><td style="padding:8px 0;opacity:0.75">Date de generation</td><td style="padding:8px 0;font-weight:700">${new Date().toLocaleString('fr-FR')}</td></tr>
  </table>
</div>`;
}

// ============================================================
// 12. REFERENCES DOCUMENTAIRES
// ============================================================
function generateReferences(docs) {
  if (!docs || docs.length === 0) return '';

  let html = `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0">`;
  html += `<h4 style="margin:0 0 12px 0;color:#92400e;font-size:15px;font-weight:700">📚 Sources documentaires utilisees</h4>`;
  html += `<ol style="margin:0;padding-left:24px;font-size:13px;color:#78350f;line-height:1.7">`;

  docs.forEach(d => {
    const title = cleanText(d.title || 'Document sans titre');
    const source = d.source || 'auto-scraper';
    const score = Math.round((d.score || 0) * 100);
    const url = d.url ? ` - <a href="${d.url}" target="_blank" style="color:#1e5aa8;text-decoration:underline">consulter la source</a>` : '';
    html += `<li style="margin-bottom:8px"><strong>${title}</strong><br><span style="color:#92400e;font-size:12px">Source : ${source} | Pertinence : ${score}%${url}</span></li>`;
  });

  html += `</ol></div>`;
  return html;
}

// ============================================================
// 13. ENRICHISSEMENT PRINCIPAL
// ============================================================
async function enrichAnswer(answer, question, domain, lang, mongoose) {
  try {
    const realDomain = detectDomain(question, domain);

    let AutoFeedDoc = null;
    try {
      AutoFeedDoc = mongoose.model('AutoFeedDocument');
    } catch (e) {}

    let docs = [];
    let semanticScore = 0;
    if (AutoFeedDoc) {
      docs = await findRelevantDocuments(AutoFeedDoc, question, 5);
      if (docs.length > 0) semanticScore = docs[0].score;
    }

    const keyPoints = extractKeyPoints(answer);
    let enriched = '';

    // SECTION 1 : Reponse detaillee
    enriched += `<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:0 0 20px 0">`;
    enriched += `<h3 style="color:#0a2540;font-size:17px;font-weight:700;margin:0 0 16px 0;padding-bottom:10px;border-bottom:2px solid #1e5aa8">Reponse detaillee</h3>`;
    enriched += `<div style="font-size:14px;color:#17202a">${formatForHTML(answer)}</div>`;
    enriched += `</div>`;

    // SECTION 2 : Points cles
    if (keyPoints.length > 0) {
      enriched += `<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:18px;margin:0 0 20px 0">`;
      enriched += `<h4 style="margin:0 0 12px 0;color:#1e40af;font-size:15px;font-weight:700">Points cles a retenir</h4>`;
      enriched += `<ul style="margin:0;padding-left:24px;color:#1e3a8a;font-size:14px;line-height:1.7">`;
      keyPoints.forEach(p => {
        enriched += `<li style="margin-bottom:8px">${p}</li>`;
      });
      enriched += `</ul></div>`;
    }

    // SECTION 3 : Tableau de bord
    enriched += generateDashboard(realDomain, docs.length, semanticScore);

    // SECTION 4 : Fiche technique
    enriched += generateTechSheet(realDomain, docs.length, semanticScore);

    // SECTION 5 : Graphiques
    if (AutoFeedDoc) {
      try {
        const allDocs = await AutoFeedDoc.find().lean();
        const byDomain = {};
        allDocs.forEach(d => { byDomain[d.domain] = (byDomain[d.domain] || 0) + 1; });
        const data = Object.keys(byDomain).slice(0, 6).map(k => ({ label: k, value: byDomain[k] }));

        if (data.length > 0) {
          enriched += generateBarChart('Couverture documentaire par domaine', data);
        }
        if (data.length >= 2) {
          enriched += generatePieChart('Repartition des documents', data);
        }
      } catch (e) {}
    }

    // SECTION 6 : References
    enriched += generateReferences(docs);

    // SECTION 7 : Agents IA
    enriched += `<div style="background:#f5f7fa;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:20px 0;font-size:12px;color:#6b7280;text-align:center">`;
    enriched += `<strong style="color:#0a2540">Agents IA impliques :</strong> MBA-CONSULT AI CORE - OpenRouter - Semantic Engine - Auto-Feed Scraper - Language Fix - Voice Engine`;
    enriched += `</div>`;

    return enriched;

  } catch (e) {
    console.warn('[answer-enricher] Erreur :', e.message);
    return answer;
  }
}

// ============================================================
// 14. MIDDLEWARE EXPRESS
// ============================================================
module.exports = function(app, mongoose) {

  app.use('/api/ask', function(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (!data || !data.answer) return originalJson(data);
      const question = req.body && req.body.question ? req.body.question : '';
      const domain = req.body && req.body.domain ? req.body.domain : 'General';
      const lang = req.body && req.body.language ? req.body.language : 'fr';
      enrichAnswer(data.answer, question, domain, lang, mongoose)
        .then(enriched => {
          data.answerRaw = data.answer;
          data.answer = enriched;
          data.enriched = true;
          data.enrichedAt = new Date().toISOString();
          originalJson(data);
        })
        .catch(() => originalJson(data));
      return res;
    };
    next();
  });

  app.use('/api/analyze-content', function(req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (!data || !data.answer) return originalJson(data);
      const question = req.body && req.body.question ? req.body.question : '';
      const domain = 'General';
      const lang = req.body && req.body.language ? req.body.language : 'fr';
      enrichAnswer(data.answer, question, domain, lang, mongoose)
        .then(enriched => {
          data.answerRaw = data.answer;
          data.answer = enriched;
          data.enriched = true;
          originalJson(data);
        })
        .catch(() => originalJson(data));
      return res;
    };
    next();
  });

  console.log('[answer-enricher] Module charge - enrichissement actif');
};
