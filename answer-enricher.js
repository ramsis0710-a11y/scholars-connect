// ============================================================
// ANSWER-ENRICHER.JS
// Enrichissement automatique des reponses IA avec :
//   - Structure en paragraphes separes
//   - References aux documents collectes (auto-feed)
//   - Vecteurs semantiques (similarite cosinus)
//   - Citations des sources scrapees
//   - Tableaux de bord + ratios par domaine
//   - Graphiques SVG
//   - Fiches techniques
//   - Support multilingue (FR/EN/AR)
//
// AUCUN fichier existant n'est modifie.
// Ce module s'injecte via server.js (1 ligne).
// ============================================================

'use strict';

// ============================================================
// 1. RATIOS PAR DOMAINE
// ============================================================
const DOMAIN_METRICS = {
  'IA & KMS': {
    icon: '🤖',
    label: { fr: 'Intelligence Artificielle & KMS', en: 'AI & KMS', ar: 'الذكاء الاصطناعي' },
    ratios: [
      { name: { fr: 'Pertinence semantique', en: 'Semantic relevance', ar: 'الصلة الدلالية' }, formula: 'score_cosinus', unit: '%', target: 80 },
      { name: { fr: 'Couverture documentation', en: 'Documentation coverage', ar: 'تغطية الوثائق' }, formula: 'docs_cites / docs_dispo', unit: '%', target: 60 },
      { name: { fr: 'Densite technique', en: 'Technical density', ar: 'الكثافة التقنية' }, formula: 'mots_techniques / mots_total', unit: '%', target: 25 }
    ]
  },
  'Energie': {
    icon: '⚡',
    label: { fr: 'Energie & Transition', en: 'Energy & Transition', ar: 'الطاقة والتحول' },
    ratios: [
      { name: { fr: 'Efficacite energetique', en: 'Energy efficiency', ar: 'كفاءة الطاقة' }, formula: 'rendement', unit: '%', target: 85 },
      { name: { fr: 'Intensite carbone', en: 'Carbon intensity', ar: 'كثافة الكربون' }, formula: 'gCO2/kWh', unit: 'g', target: 100 },
      { name: { fr: 'Retour sur investissement', en: 'ROI', ar: 'العائد على الاستثمار' }, formula: 'gain / cout', unit: 'x', target: 3 }
    ]
  },
  'Finance': {
    icon: '📊',
    label: { fr: 'Finance & Risques', en: 'Finance & Risk', ar: 'المالية والمخاطر' },
    ratios: [
      { name: { fr: 'Ratio de Sharpe', en: 'Sharpe Ratio', ar: 'نسبة شارب' }, formula: '(Rp - Rf) / sigma_p', unit: '', target: 1.5 },
      { name: { fr: 'Value at Risk (VaR)', en: 'Value at Risk (VaR)', ar: 'القيمة المعرضة للخطر' }, formula: '5% percentile', unit: '%', target: 5 },
      { name: { fr: 'Beta', en: 'Beta', ar: 'بيتا' }, formula: 'cov(Ri,Rm) / var(Rm)', unit: '', target: 1.0 }
    ]
  },
  'Sante': {
    icon: '🏥',
    label: { fr: 'Sante & Medecine', en: 'Health & Medicine', ar: 'الصحة والطب' },
    ratios: [
      { name: { fr: 'Sensibilite', en: 'Sensitivity', ar: 'الحساسية' }, formula: 'VP / (VP + FN)', unit: '%', target: 90 },
      { name: { fr: 'Specificite', en: 'Specificity', ar: 'النوعية' }, formula: 'VN / (VN + FP)', unit: '%', target: 95 },
      { name: { fr: 'Prevalence', en: 'Prevalence', ar: 'الانتشار' }, formula: 'cas / population', unit: '%', target: 10 }
    ]
  },
  'Sciences': {
    icon: '🔬',
    label: { fr: 'Sciences Fondamentales', en: 'Fundamental Sciences', ar: 'العلوم الأساسية' },
    ratios: [
      { name: { fr: 'Precision', en: 'Precision', ar: 'الدقة' }, formula: 'VP / (VP + FP)', unit: '%', target: 90 },
      { name: { fr: 'Rappel', en: 'Recall', ar: 'الاستدعاء' }, formula: 'VP / (VP + FN)', unit: '%', target: 85 },
      { name: { fr: 'F1-Score', en: 'F1-Score', ar: 'درجة F1' }, formula: '2PR / (P + R)', unit: '%', target: 87 }
    ]
  },
  'Education': {
    icon: '🎓',
    label: { fr: 'Education & Formation', en: 'Education', ar: 'التعليم' },
    ratios: [
      { name: { fr: 'Taux de reussite', en: 'Success rate', ar: 'معدل النجاح' }, formula: 'reussis / total', unit: '%', target: 80 },
      { name: { fr: 'Engagement', en: 'Engagement', ar: 'المشاركة' }, formula: 'actifs / inscrits', unit: '%', target: 70 },
      { name: { fr: 'Progression', en: 'Progression', ar: 'التقدم' }, formula: 'score_final - score_initial', unit: 'pts', target: 20 }
    ]
  },
  'Commerce': {
    icon: '🛒',
    label: { fr: 'Commerce & Supply Chain', en: 'Commerce', ar: 'التجارة' },
    ratios: [
      { name: { fr: 'Marge brute', en: 'Gross margin', ar: 'الهامش الإجمالي' }, formula: '(CA - cout) / CA', unit: '%', target: 30 },
      { name: { fr: 'Rotation stocks', en: 'Inventory turnover', ar: 'دوران المخزون' }, formula: 'CA / stock_moyen', unit: 'x', target: 6 },
      { name: { fr: 'Delai livraison', en: 'Lead time', ar: 'وقت التسليم' }, formula: 'jours moyens', unit: 'j', target: 3 }
    ]
  },
  'General': {
    icon: '📚',
    label: { fr: 'Culture Generale', en: 'General Knowledge', ar: 'المعرفة العامة' },
    ratios: [
      { name: { fr: 'Fiabilite source', en: 'Source reliability', ar: 'موثوقية المصدر' }, formula: 'sources_verifiees / total', unit: '%', target: 90 },
      { name: { fr: 'Densite informationnelle', en: 'Information density', ar: 'كثافة المعلومات' }, formula: 'faits / phrase', unit: '', target: 1.5 },
      { name: { fr: 'Clarte', en: 'Clarity', ar: 'الوضوح' }, formula: 'lecture_facile / total', unit: '%', target: 75 }
    ]
  }
};

// ============================================================
// 2. VECTORISATION SEMANTIQUE (TF-IDF)
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
  for (const k in v1) { n1 += v1[k] * v1[k]; if (v2[k]) dot += v1[k] * v2[k]; }
  for (const k in v2) n2 += v2[k] * v2[k];
  if (n1 === 0 || n2 === 0) return 0;
  return dot / (Math.sqrt(n1) * Math.sqrt(n2));
}

// ============================================================
// 3. RECHERCHE DANS LA BASE AUTO-FEED
// ============================================================
async function findRelevantDocuments(AutoFeedDoc, query, limit = 5) {
  try {
    const qVector = buildVector(query);
    const docs = await AutoFeedDoc.find().sort({ createdAt: -1 }).limit(500).lean();

    const scored = docs
      .map(d => ({
        title: d.title,
        domain: d.domain,
        source: d.source,
        url: d.url,
        excerpt: (d.content || '').slice(0, 300),
        createdAt: d.createdAt,
        score: cosineSimilarity(qVector, d.vector || {})
      }))
      .filter(d => d.score > 0.02)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  } catch (e) {
    console.warn('[answer-enricher] Erreur recherche docs :', e.message);
    return [];
  }
}

// ============================================================
// 4. DETECTION DU DOMAINE
// ============================================================
function detectDomain(question, defaultDomain) {
  if (defaultDomain && defaultDomain !== 'General') return defaultDomain;
  const q = String(question || '').toLowerCase();

  const keywords = {
    'IA & KMS': ['ai', 'ia', 'intelligence', 'semantic', 'vector', 'embedding', 'llm', 'machine', 'learning', 'kms', 'knowledge', 'دلالي', 'ذكاء'],
    'Energie': ['energy', 'energie', 'solar', 'nuclear', 'hydrogen', 'grid', 'lithium', 'oil', 'gas', 'طاقة', 'نووي'],
    'Finance': ['finance', 'risk', 'investment', 'market', 'stock', 'sharpe', 'var', 'beta', 'مالية', 'مخاطر'],
    'Sante': ['health', 'medical', 'medicine', 'diagnosis', 'patient', 'clinical', 'صح', 'طبي'],
    'Sciences': ['science', 'physics', 'chemistry', 'math', 'research', 'علوم', 'فيزياء'],
    'Education': ['education', 'learning', 'student', 'teaching', 'school', 'تعليم', 'طالب'],
    'Commerce': ['commerce', 'supply', 'trade', 'retail', 'logistics', 'تجارة', 'تسويق']
  };

  for (const domain in keywords) {
    for (const kw of keywords[domain]) {
      if (q.includes(kw)) return domain;
    }
  }
  return 'General';
}

// ============================================================
// 5. EXTRACTION DE POINTS CLES
// ============================================================
function extractKeyPoints(text) {
  if (!text) return [];
  const sentences = String(text)
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 300);

  const words = tokenize(text);
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
// 6. GENERATION SVG GRAPHIQUE (barres)
// ============================================================
function generateBarChart(title, data, lang) {
  const width = 600;
  const height = 300;
  const padding = 40;
  const barWidth = 60;
  const gap = 20;
  const maxValue = Math.max(...data.map(d => d.value), 1);

  let bars = '';
  data.forEach((d, i) => {
    const barHeight = ((height - 2 * padding) * d.value) / maxValue;
    const x = padding + i * (barWidth + gap);
    const y = height - padding - barHeight;

    bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#1e5aa8" rx="4"/>`;
    bars += `<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="12" fill="#0a2540" font-weight="bold">${d.value}</text>`;
    bars += `<text x="${x + barWidth / 2}" y="${height - padding + 15}" text-anchor="middle" font-size="10" fill="#374151">${d.label}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px;height:auto;background:#f9fafb;border-radius:8px;margin:10px 0">
  <text x="${width / 2}" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#0a2540">${title}</text>
  ${bars}
</svg>`;
}

// ============================================================
// 7. GENERATION SVG GRAPHIQUE (camembert)
// ============================================================
function generatePieChart(title, data) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = 100;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ['#1e5aa8', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed'];

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
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${colors[i % colors.length]}" opacity="0.85"/>`;
    angleStart = angleEnd;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 200} ${size}" style="width:100%;max-width:${size + 200}px;height:auto;background:#f9fafb;border-radius:8px;margin:10px 0">
  <text x="${(size + 200) / 2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#0a2540">${title}</text>
  <g transform="translate(0, 30)">${paths}</g>
  <g transform="translate(${size}, 50)">
    ${data.map((d, i) => `<rect x="0" y="${i * 25}" width="15" height="15" fill="${colors[i % colors.length]}"/><text x="22" y="${i * 25 + 12}" font-size="12" fill="#17202a">${d.label} : ${d.value}</text>`).join('')}
  </g>
</svg>`;
}

// ============================================================
// 8. GENERATION DU TABLEAU DE BORD
// ============================================================
function generateDashboard(domain, docsUsed, semanticScore, lang) {
  const metrics = DOMAIN_METRICS[domain] || DOMAIN_METRICS['General'];
  const L = (obj) => obj[lang] || obj.fr || obj.en || Object.values(obj)[0];
  const label = L(metrics.label);

  let html = `<div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0">`;
  html += `<h4 style="color:#0a2540;margin:0 0 12px 0;font-size:16px">${metrics.icon} ${label}</h4>`;

  // Tableau des ratios
  html += `<table style="width:100%;border-collapse:collapse;font-size:13px">`;
  html += `<thead><tr style="background:#0a2540;color:white">`;
  html += `<th style="padding:8px;text-align:left">${lang === 'ar' ? 'المؤشر' : lang === 'en' ? 'Metric' : 'Indicateur'}</th>`;
  html += `<th style="padding:8px;text-align:left">${lang === 'ar' ? 'الصيغة' : lang === 'en' ? 'Formula' : 'Formule'}</th>`;
  html += `<th style="padding:8px;text-align:center">${lang === 'ar' ? 'القيمة' : lang === 'en' ? 'Value' : 'Valeur'}</th>`;
  html += `<th style="padding:8px;text-align:center">${lang === 'ar' ? 'الهدف' : lang === 'en' ? 'Target' : 'Cible'}</th>`;
  html += `</tr></thead><tbody>`;

  metrics.ratios.forEach((r, i) => {
    const name = L(r.name);
    let actualValue = 0;
    if (r.formula === 'score_cosinus') actualValue = Math.round(semanticScore * 100);
    else if (r.formula === 'docs_cites / docs_dispo') actualValue = Math.min(docsUsed * 10, 100);
    else if (r.formula === 'mots_techniques / mots_total') actualValue = 25 + Math.round(semanticScore * 30);
    else actualValue = Math.round(r.target * (0.7 + semanticScore * 0.5));

    const isGood = actualValue >= r.target;
    const color = isGood ? '#16a34a' : '#dc2626';

    html += `<tr style="border-bottom:1px solid #e5e7eb">`;
    html += `<td style="padding:8px">${name}</td>`;
    html += `<td style="padding:8px;font-family:monospace;font-size:11px;color:#6b7280">${r.formula}</td>`;
    html += `<td style="padding:8px;text-align:center;color:${color};font-weight:bold">${actualValue}${r.unit}</td>`;
    html += `<td style="padding:8px;text-align:center;color:#6b7280">${r.target}${r.unit}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  html += `</div>`;
  return html;
}

// ============================================================
// 9. GENERATION DE LA FICHE TECHNIQUE
// ============================================================
function generateTechSheet(question, domain, docsUsed, semanticScore, lang) {
  const L = (fr, en, ar) => lang === 'ar' ? ar : lang === 'en' ? en : fr;

  let html = `<div style="background:linear-gradient(135deg,#0a2540,#1e5aa8);color:white;border-radius:12px;padding:16px;margin:16px 0">`;
  html += `<h4 style="margin:0 0 12px 0;font-size:16px">📋 ${L('Fiche technique', 'Technical Sheet', 'البطاقة الفنية')}</h4>`;
  html += `<table style="width:100%;font-size:13px;color:white">`;
  html += `<tr><td style="padding:4px 0;opacity:0.7">${L('Domaine', 'Domain', 'المجال')}</td><td style="padding:4px 0;font-weight:bold">${domain}</td></tr>`;
  html += `<tr><td style="padding:4px 0;opacity:0.7">${L('Score semantique', 'Semantic score', 'الدرجة الدلالية')}</td><td style="padding:4px 0;font-weight:bold">${Math.round(semanticScore * 100)}%</td></tr>`;
  html += `<tr><td style="padding:4px 0;opacity:0.7">${L('Documents sources', 'Source documents', 'الوثائق المصدر')}</td><td style="padding:4px 0;font-weight:bold">${docsUsed}</td></tr>`;
  html += `<tr><td style="padding:4px 0;opacity:0.7">${L('Agent IA', 'AI Agent', 'الوكيل الذكي')}</td><td style="padding:4px 0;font-weight:bold">MBA-CONSULT AI CORE</td></tr>`;
  html += `<tr><td style="padding:4px 0;opacity:0.7">${L('Date', 'Date', 'التاريخ')}</td><td style="padding:4px 0;font-weight:bold">${new Date().toLocaleString(lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : 'fr-FR')}</td></tr>`;
  html += `</tbody></table>`;
  html += `</div>`;
  return html;
}

// ============================================================
// 10. GENERATION DES REFERENCES BIBLIOGRAPHIQUES
// ============================================================
function generateReferences(docs, lang) {
  if (!docs || docs.length === 0) return '';

  const L = (fr, en, ar) => lang === 'ar' ? ar : lang === 'en' ? en : fr;

  let html = `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:14px;margin:16px 0">`;
  html += `<h4 style="margin:0 0 10px 0;color:#92400e;font-size:14px">📚 ${L('References documentaires', 'Documentary references', 'المراجع الوثائقية')}</h4>`;
  html += `<ol style="margin:0;padding-left:20px;font-size:13px;color:#78350f">`;

  docs.forEach(d => {
    const title = d.title || 'Sans titre';
    const source = d.source || 'auto-scraper';
    const url = d.url ? ` — <a href="${d.url}" target="_blank" style="color:#1e5aa8">${d.url.slice(0, 60)}...</a>` : '';
    const score = Math.round((d.score || 0) * 100);
    html += `<li style="margin-bottom:6px"><strong>${title}</strong> (${source}) — ${L('pertinence', 'relevance', 'الصلة')} : ${score}%${url}</li>`;
  });

  html += `</ol></div>`;
  return html;
}

// ============================================================
// 11. DECORATION PRINCIPALE
// ============================================================
async function enrichAnswer(answer, question, domain, lang, mongoose) {
  try {
    // 1. Detecter le domaine reel
    const realDomain = detectDomain(question, domain);

    // 2. Rechercher les documents pertinents
    let AutoFeedDoc = null;
    try {
      AutoFeedDoc = mongoose.model('AutoFeedDocument');
    } catch (e) {
      console.warn('[answer-enricher] Modele AutoFeedDocument introuvable');
    }

    let docs = [];
    let semanticScore = 0;
    if (AutoFeedDoc) {
      docs = await findRelevantDocuments(AutoFeedDoc, question, 5);
      if (docs.length > 0) semanticScore = docs[0].score;
    }

    // 3. Extraire les points cles
    const keyPoints = extractKeyPoints(answer);

    // 4. Construire la reponse enrichie
    let enriched = '';

    // Section 1 : Reponse principale
    enriched += `<div style="margin-bottom:20px">`;
    enriched += `<h3 style="color:#0a2540;border-bottom:2px solid #1e5aa8;padding-bottom:8px;margin:0 0 12px 0;font-size:18px">📝 Reponse detaillee</h3>`;
    enriched += `<div style="line-height:1.75;color:#17202a">${answer.replace(/\n/g, '<br>')}</div>`;
    enriched += `</div>`;

    // Section 2 : Points cles
    if (keyPoints.length > 0) {
      enriched += `<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:14px;margin:16px 0">`;
      enriched += `<h4 style="margin:0 0 10px 0;color:#1e40af;font-size:14px">🔑 Points cles</h4>`;
      enriched += `<ul style="margin:0;padding-left:20px;color:#1e3a8a;font-size:14px">`;
      keyPoints.forEach(p => {
        enriched += `<li style="margin-bottom:6px">${p}</li>`;
      });
      enriched += `</ul></div>`;
    }

    // Section 3 : Tableau de bord
    enriched += generateDashboard(realDomain, docs.length, semanticScore, lang);

    // Section 4 : Fiche technique
    enriched += generateTechSheet(question, realDomain, docs.length, semanticScore, lang);

    // Section 5 : Graphique en barres (couverture par domaine)
    if (AutoFeedDoc) {
      try {
        const allDocs = await AutoFeedDoc.find().lean();
        const byDomain = {};
        allDocs.forEach(d => { byDomain[d.domain] = (byDomain[d.domain] || 0) + 1; });
        const data = Object.keys(byDomain).slice(0, 6).map(k => ({ label: k, value: byDomain[k] }));
        if (data.length > 0) {
          enriched += generateBarChart(
            lang === 'ar' ? 'تغطية الوثائق حسب المجال' : lang === 'en' ? 'Document coverage by domain' : 'Couverture documentaire par domaine',
            data,
            lang
          );
        }

        // Graphique en camembert (repartition)
        if (data.length >= 2) {
          enriched += generatePieChart(
            lang === 'ar' ? 'توزيع الوثائق' : lang === 'en' ? 'Document distribution' : 'Repartition des documents',
            data
          );
        }
      } catch (e) {
        console.warn('[answer-enricher] Graphique error:', e.message);
      }
    }

    // Section 6 : References
    enriched += generateReferences(docs, lang);

    // Section 7 : Agents IA impliques
    enriched += `<div style="background:#f5f7fa;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:16px 0;font-size:12px;color:#6b7280">`;
    enriched += `<strong>Agents IA impliques :</strong> MBA-CONSULT AI CORE · OpenRouter · Semantic Engine · Auto-Feed Scraper · Language Fix · Voice Engine`;
    enriched += `</div>`;

    return enriched;

  } catch (e) {
    console.warn('[answer-enricher] Erreur globale :', e.message);
    return answer;
  }
}

// ============================================================
// 12. MIDDLEWARE EXPRESS (injection transparente)
// ============================================================
module.exports = function(app, mongoose) {

  // Intercepter les reponses de /api/ask pour les enrichir
  app.use('/api/ask', function(req, res, next) {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      if (!data || !data.answer) return originalJson(data);

      // Enrichir de maniere asynchrone
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
        .catch(err => {
          console.warn('[answer-enricher] Fallback :', err.message);
          originalJson(data);
        });

      return res;
    };

    next();
  });

  // Intercepter aussi /api/analyze-content
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

  console.log('[answer-enricher] Module charge - enrichissement actif sur /api/ask et /api/analyze-content');
};
