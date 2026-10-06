// ============================================================
// ANSWER-ENRICHER.JS
// Version v15.0 - Affichage HTML correct + bouton PDF
//
// CORRECTIONS :
//   - Le HTML genere n'est plus echappe a l'affichage
//   - Le bouton "Ouvrir le PDF" apparait correctement
//   - Toutes les fonctionnalites v14.1 conservees
// ============================================================

'use strict';

var crypto = require('crypto');

var LOGO_GMPI = '';
var LOGO_GROUP = '';

// ============================================================
// 0. MODELE QP STANDARD 01
// ============================================================
var QP_OPS_REPAIR = [
  [1, 'Control at reception', 'FO-02-PRO', 'Customer specifications', 1, 'QC Dep.'],
  [2, 'Disassembly, Cleaning and sandblasting', 'FO-05-R&D', '', 0, 'Prod. Dep.'],
  [3, 'Visual and dimensional inspection of body, union connections and Flanges', 'FO-04-PRO|FO-51-PRO', 'API 6A|ASME B16.5|ASME B31.3', 1, 'QC Dep.'],
  [4, 'Hummer union connections repair (if applicable)', 'FO-05-R&D', '', 0, 'Prod. Dep.'],
  [5, 'Flange repair (if applicable)', 'FO-05-R&D', '', 0, 'Prod. Dep.'],
  [6, 'Visual and dimensional inspection after repair (if applicable)', 'FO-04-PRO|FO-51-PRO', 'API 6A|ASME B16.5|ASME B31.3', 1, 'QC Dep.'],
  [7, 'MPI Weld joints inspection', 'ASTM E709', 'API 6A|ASME B16.5|ASME B31.3', 1, 'QC Dep.'],
  [8, 'Wall thickness measurement + UT for weld joints', 'ASME B31.3', 'ASME B31.3|API 570', 1, 'QC Dep.'],
  [9, 'Hardness testing of body', 'ASTM E10|ASTM E18', 'API 6A|ASME B31.3', 1, 'QC Dep.'],
  [10, 'Hardness testing of weld joints', 'ASTM E10|ASTM E18', 'API 6A|ASME B31.3', 1, 'QC Dep.'],
  [11, 'Assembly', 'FO-05-R&D', '', 0, 'Maint. Dep'],
  [12, 'Hydrostatic Pressure Test', 'FO-29-PRO|API 6A|ASME B31.3', 'FO-29-PRO|API 6A|ASME B31.3', 1, 'Maint. Dep'],
  [13, 'Painting', 'FO-05-R&D|PR-01-CMT', 'Customer specifications', 0, 'Prod. Dep.'],
  [14, 'Painting control', 'PR-01-CMT|FO-02-CMT', 'PR-01-CMT|Customer specifications', 1, 'QC Dep.'],
  [15, 'Marking : Hard Stamping (NEW TAG)', 'IN-09-PRO', 'IN-09-PRO', 0, 'Prod. Dep.'],
  [16, 'Storage Compound and Protection', 'IN-02-PRO|API 6A|ASME B16.5', 'IN-02-PRO|API 6A|ASME B16.5', 0, 'Prod. Dep.'],
  [17, 'Handling and Storage', 'IN-02-PRO', 'IN-02-PRO', 0, 'Prod. Dep.'],
  [18, 'Final Check (FO-19-PRO)', 'FO-19-PRO', 'All above requirements and records', 1, 'QC Dep.']
];

var QP_OPS_MANUF = [
  [1, 'Control at reception (raw material and MTC)', 'FO-02-PRO', 'Customer specifications|{GRADE}', 1, 'QC Dep.'],
  [2, 'Cutting and rough machining', 'FO-05-R&D', '', 0, 'Prod. Dep.'],
  [3, 'Final machining and thread machining', 'FO-05-R&D', '', 0, 'Prod. Dep.'],
  [4, 'Visual and dimensional inspection (including threads)', 'FO-04-PRO|FO-51-PRO', '{NORM}|Customer specifications', 1, 'QC Dep.'],
  [5, 'Hardness testing (if required)', 'ASTM E10|ASTM E18', '{NORM}|Customer specifications', 1, 'QC Dep.'],
  [6, 'MPI inspection (if required)', 'ASTM E709', '{NORM}|Customer specifications', 1, 'QC Dep.'],
  [7, 'Marking : Hard Stamping', 'IN-09-PRO', 'IN-09-PRO', 0, 'Prod. Dep.'],
  [8, 'Painting (if applicable) and thread protectors', 'FO-05-R&D|PR-01-CMT', 'Customer specifications', 0, 'Prod. Dep.'],
  [9, 'Handling and Storage', 'IN-02-PRO', 'IN-02-PRO', 0, 'Prod. Dep.'],
  [10, 'Final Check (FO-19-PRO){DOCS}', 'FO-19-PRO', 'All above requirements and records', 1, 'QC Dep.']
];

var QP_NOTES = [
  'a) For operation instruction, refer to Work Order (WO) Document Reference FO-05-R&D',
  'b) Any NCR detected shall be treated according to procedure PR-01-PRO',
  'c) Thread inspection procedures :'
];

// ============================================================
// 1. DOMAINES SENSIBLES
// ============================================================
var SENSITIVE_DOMAINS = [
  { key: 'Criminalite', keywords: ['criminalit', 'crime', 'meurtre', 'homicide', 'violence', 'trafic'], sources: ['ONUDC', 'Europol', 'FBI', 'Interpol'] },
  { key: 'Terrorisme', keywords: ['terroris', 'attentat', 'djihad'], sources: ['ONU', 'GTD'] },
  { key: 'Guerre/Conflit', keywords: ['guerre', 'conflit', 'militaire'], sources: ['ONU', 'OTAN', 'SIPRI'] },
  { key: 'Geopolitique', keywords: ['geopolit', 'sanction'], sources: ['ONU', 'CIA'] },
  { key: 'Economie mondiale', keywords: ['pib mondial', 'crise mondiale'], sources: ['FMI', 'BM', 'OCDE'] },
  { key: 'Sante publique', keywords: ['pandemi', 'epidemi', 'mortalite'], sources: ['OMS', 'CDC'] },
  { key: 'Immigration', keywords: ['immigration', 'migrant', 'refugie'], sources: ['HCR', 'OIM'] },
  { key: 'Climat', keywords: ['climat', 'rechauffement', 'co2'], sources: ['GIEC', 'NOAA'] }
];

var ANALYTICAL_DOMAINS = [
  'Economie', 'Finance', 'Medecine', 'Sante', 'Marketing', 'Commerce',
  'IA & KMS', 'Sciences', 'Energie', 'Education', 'Industrie',
  'Technologie', 'Business', 'Gestion', 'Droit', 'Criminalite',
  'Terrorisme', 'Guerre/Conflit', 'Geopolitique', 'Economie mondiale',
  'Sante publique', 'Immigration', 'Climat', 'Technique', 'Petrole & Gaz',
  'Plan Qualite'
];

var DOMAIN_METRICS = {
  'Plan Qualite': { icon: '📋', label: 'Plan Qualite - QP STANDARD 01', ratios: [
    { name: 'Conformite QP 01', formula: 'sections conformes / imposees', unit: '%', target: 100 },
    { name: 'Points controle', formula: 'definis / attendus', unit: '%', target: 100 },
    { name: 'Tracabilite matiere', formula: 'MTC / attendus', unit: '%', target: 100 }
  ]},
  'Petrole & Gaz': { icon: '🛢️', label: 'Petrole et Gaz', ratios: [
    { name: 'Conformite', formula: 'conformes / produites', unit: '%', target: 98 },
    { name: 'Rebut', formula: 'rejetees / produites', unit: '%', target: 2 },
    { name: 'Resistance', formula: 'limite / nominale', unit: 'x', target: 1.5 }
  ]},
  'Technique': { icon: '⚙️', label: 'Technique', ratios: [
    { name: 'Conformite normative', formula: 'specs respectees / total', unit: '%', target: 95 },
    { name: 'Controle qualite', formula: 'inspections / prevues', unit: '%', target: 100 },
    { name: 'Non-conformite', formula: 'NC / lots', unit: '%', target: 5 }
  ]},
  'Industrie': { icon: '🏭', label: 'Industrie', ratios: [
    { name: 'Rendement', formula: 'reelle / theorique', unit: '%', target: 85 },
    { name: 'Disponibilite', formula: 'actif / total', unit: '%', target: 90 },
    { name: 'Qualite 1ere passe', formula: 'bonnes / total', unit: '%', target: 92 }
  ]},
  'Finance': { icon: '📊', label: 'Finance', ratios: [
    { name: 'Sharpe', formula: '(R-Rf)/sigma', unit: '', target: 1.5 },
    { name: 'VaR', formula: 'perte max 5%', unit: '%', target: 5 },
    { name: 'Beta', formula: 'sensibilite', unit: '', target: 1.0 }
  ]},
  'Sante': { icon: '🏥', label: 'Sante', ratios: [
    { name: 'Sensibilite', formula: 'VP/(VP+FN)', unit: '%', target: 90 },
    { name: 'Specificite', formula: 'VN/(VN+FP)', unit: '%', target: 95 },
    { name: 'Prevalence', formula: 'cas/pop', unit: '%', target: 10 }
  ]},
  'Sciences': { icon: '🔬', label: 'Sciences', ratios: [
    { name: 'Precision', formula: 'VP/(VP+FP)', unit: '%', target: 90 },
    { name: 'Rappel', formula: 'VP/(VP+FN)', unit: '%', target: 85 },
    { name: 'F1', formula: '2PR/(P+R)', unit: '%', target: 87 }
  ]},
  'IA & KMS': { icon: '🤖', label: 'IA & KMS', ratios: [
    { name: 'Pertinence', formula: 'cosinus', unit: '%', target: 80 },
    { name: 'Couverture', formula: 'docs cites / dispo', unit: '%', target: 60 },
    { name: 'Densite', formula: 'tech / total', unit: '%', target: 25 }
  ]}
};

var LITERARY_RELIGIOUS_DOMAINS = ['Religion', 'Litterature', 'Philosophie', 'Histoire', 'Theologie', 'Islam', 'Arts', 'Langues', 'Droit'];

var SCHOLARS_BY_DOMAIN = {
  'Religion': [
    { fr: 'Ibn Taymiyya', ar: 'ابن تيمية' }, { fr: 'Ibn Kathir', ar: 'ابن كثير' },
    { fr: 'Al-Ghazali', ar: 'الغزالي' }, { fr: 'An-Nawawi', ar: 'النووي' },
    { fr: 'Al-Bukhari', ar: 'البخاري' }, { fr: 'Muslim', ar: 'مسلم' }
  ],
  'Philosophie': [
    { fr: 'Aristote', ar: 'أرسطو' }, { fr: 'Platon', ar: 'أفلاطون' },
    { fr: 'Kant', ar: 'كانط' }, { fr: 'Descartes', ar: 'ديكارت' }
  ],
  'Litterature': [
    { fr: 'Victor Hugo', ar: 'فيكتور هوغو' }, { fr: 'Shakespeare', ar: 'شكسبير' },
    { fr: 'Naguib Mahfouz', ar: 'نجيب محفوظ' }
  ]
};

// ============================================================
// 2. DETECTION QP
// ============================================================
function isQualityPlanRequest(question, content) {
  var text = ((question || '') + ' ' + (content || '')).toLowerCase();
  var triggers = [
    'plan qualite', 'plan qualité', 'plan de qualite', 'plan de qualité',
    'quality control plan', 'quality plan', 'qp ', 'qp-', 'qp_', 'qp+',
    'qp01', 'qp 01', 'qp standard', 'controle qualite', 'contrôle qualite',
    'control plan', 'plan de controle', 'plan de contrôle'
  ];
  for (var i = 0; i < triggers.length; i++) {
    if (text.indexOf(triggers[i]) !== -1) return true;
  }
  return false;
}

var QP_RE = /plan\s*(de\s*)?qualit|quality\s*(control\s*)?plan|\bqp\b|\bqp[-_ ]?\d|contr.le\s*qualit|control\s*plan/i;

// ============================================================
// 3. UTILITAIRES
// ============================================================
function cleanText(text) {
  if (!text) return '';
  var t = String(text);
  t = t.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/^[-_*]{3,}$/gm, '');
  t = t.replace(/\\/g, '');
  t = t.replace(/\t/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/ {2,}/g, ' ');
  return t.trim();
}

function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatForHTML(text) {
  if (!text) return '';
  var clean = cleanText(text);
  var lines = clean.split('\n');
  var output = [];
  var inList = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line === '') {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push('<br>');
      continue;
    }
    var numM = line.match(/^(\d+)\.\s+(.+)$/);
    if (numM) {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push('<h4 style="color:#0a2540;font-size:15px;font-weight:700;margin:16px 0 8px 0;padding-bottom:4px;border-bottom:1px solid #e5e7eb">' + numM[1] + '. ' + esc(numM[2]) + '</h4>');
      continue;
    }
    var isBullet = /^[•◦▪▫]\s+/.test(line) || /^[-*]\s+/.test(line);
    if (isBullet) {
      if (!inList) {
        output.push('<ul style="margin:8px 0;padding-left:24px;color:#17202a;list-style-type:disc">');
        inList = true;
      }
      output.push('<li style="margin:6px 0;line-height:1.6">' + esc(line.replace(/^[•◦▪▫\-*]\s+/, '')) + '</li>');
      continue;
    }
    if (inList) { output.push('</ul>'); inList = false; }
    output.push('<p style="margin:8px 0;line-height:1.75;color:#17202a">' + esc(line) + '</p>');
  }
  if (inList) output.push('</ul>');
  return output.join('\n');
}

function tokenize(text) {
  return String(text || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/).filter(function(x) { return x.length >= 3; });
}

function buildVector(text) {
  var tokens = tokenize(text);
  var freq = {};
  for (var i = 0; i < tokens.length; i++) freq[tokens[i]] = (freq[tokens[i]] || 0) + 1;
  return freq;
}

function cosineSimilarity(v1, v2) {
  var dot = 0, n1 = 0, n2 = 0;
  for (var k in v1) { n1 += v1[k] * v1[k]; if (v2[k]) dot += v1[k] * v2[k]; }
  for (var k2 in v2) n2 += v2[k2] * v2[k2];
  if (n1 === 0 || n2 === 0) return 0;
  return dot / (Math.sqrt(n1) * Math.sqrt(n2));
}

function keywordOverlapScore(qTokens, docText) {
  if (!qTokens || qTokens.length === 0) return 0;
  var docTokens = new Set(tokenize(docText));
  var hits = 0;
  for (var i = 0; i < qTokens.length; i++) if (docTokens.has(qTokens[i])) hits++;
  return hits / qTokens.length;
}

// ============================================================
// 4. RECHERCHE DOCS (RAG)
// ============================================================
async function findRelevantDocuments(AutoFeedDoc, query, limit, minScore) {
  limit = limit || 5;
  minScore = minScore || 0.15;
  try {
    var qTokens = tokenize(query);
    var qVector = buildVector(query);
    var docs = await AutoFeedDoc.find().sort({ createdAt: -1 }).limit(500).lean();
    return docs.map(function(d) {
      var hasVector = d.vector && Object.keys(d.vector).length > 0;
      var cosScore = hasVector ? cosineSimilarity(qVector, d.vector) : 0;
      var kwScore = keywordOverlapScore(qTokens, (d.title || '') + ' ' + (d.content || '').slice(0, 8000));
      var score = Math.max(cosScore, kwScore);
      return {
        title: d.title, domain: d.domain, source: d.source, url: d.url,
        createdAt: d.createdAt, content: d.content, score: score
      };
    }).filter(function(d) { return d.score >= minScore; })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, limit);
  } catch (e) { return []; }
}

async function buildRagContext(AutoFeedDoc, question, maxDocs, maxChars) {
  maxDocs = maxDocs || 3;
  maxChars = maxChars || 3500;
  try {
    var docs = await findRelevantDocuments(AutoFeedDoc, question, maxDocs, 0.15);
    if (docs.length === 0) return { context: '', docs: [], topScore: 0 };
    var context = '';
    docs.forEach(function(d, i) {
      var excerpt = String(d.content || '').slice(0, maxChars).trim();
      if (excerpt.length > 100) {
        context += '\n\n=== DOCUMENT SOURCE ' + (i + 1) + ' : ' + d.title + ' ===\nDomaine : ' + d.domain + '\nExtrait :\n' + excerpt + '\n=== FIN DOCUMENT ' + (i + 1) + ' ===';
      }
    });
    return { context: context, docs: docs, topScore: docs[0].score };
  } catch (e) { return { context: '', docs: [], topScore: 0 }; }
}

// ============================================================
// 5. DETECTION DOMAINE
// ============================================================
function detectDomain(question, defaultDomain) {
  if (defaultDomain && defaultDomain !== 'General') return defaultDomain;
  var q = String(question || '').toLowerCase();
  if (isQualityPlanRequest(question, '')) return 'Plan Qualite';

  var petro = ['api 5ct', 'api 5b', 'api 5l', 'api 6a', 'api 16a', 'vam', 'tubage', 'casing', 'tubing', 'petrole', 'gaz', 'aisi 4130', 'aisi 4140', '75ksi', '80ksi', '110ksi', 'nace', 'h2s', 'raccord', 'filetage', 'thread', 'coupling', 'manchon'];
  for (var i = 0; i < petro.length; i++) if (q.indexOf(petro[i]) !== -1) return 'Petrole & Gaz';

  var tech = ['norme', 'iso', 'qualite', 'fabrication', 'controle qualite', 'certificat', 'coc', 'mtc', 'inspection', 'essai', 'test pression', 'ndt', 'soudure', 'welding', 'metal', 'acier', 'steel', 'alliage', 'tolerance'];
  for (var j = 0; j < tech.length; j++) if (q.indexOf(tech[j]) !== -1) return 'Technique';

  for (var s = 0; s < SENSITIVE_DOMAINS.length; s++) {
    for (var k = 0; k < SENSITIVE_DOMAINS[s].keywords.length; k++) {
      if (q.indexOf(SENSITIVE_DOMAINS[s].keywords[k]) !== -1) return SENSITIVE_DOMAINS[s].key;
    }
  }

  var kw = {
    'Religion': ['relig', 'islam', 'coran', 'hadith', 'sunnah', 'prophete'],
    'Litterature': ['litterat', 'poesie', 'roman', 'poete'],
    'Philosophie': ['philosoph', 'kant', 'platon'],
    'Histoire': ['histoir', 'civilis'],
    'Droit': ['droit', 'juridique', 'loi'],
    'IA & KMS': ['intelligence', 'semantic', 'vector', 'llm'],
    'Sante': ['sante', 'health', 'medical'],
    'Sciences': ['science', 'physics', 'chemistry'],
    'Commerce': ['commerce', 'supply', 'trade']
  };
  for (var dom in kw) {
    for (var ki = 0; ki < kw[dom].length; ki++) {
      if (q.indexOf(kw[dom][ki]) !== -1) return dom;
    }
  }
  return 'General';
}

function isLiteraryOrReligious(domain) {
  return LITERARY_RELIGIOUS_DOMAINS.some(function(d) { return domain.toLowerCase().indexOf(d.toLowerCase()) !== -1; });
}
function isAnalyticalDomain(domain) {
  return ANALYTICAL_DOMAINS.some(function(d) { return domain.toLowerCase().indexOf(d.toLowerCase()) !== -1; });
}
function isSensitiveDomain(domain) {
  return SENSITIVE_DOMAINS.some(function(d) { return d.key === domain; });
}

function hasNumbers(text) {
  if (!text) return false;
  return [/\d+\s*%/, /\d+\s*(millions|milliards)/i, /\d+[.,]\d+/, /\d{4}/, /[+\-]?\d{3,}/]
    .some(function(p) { return p.test(text); });
}

function extractScholars(question, answer, domain) {
  var text = (question + ' ' + answer).toLowerCase();
  var scholars = SCHOLARS_BY_DOMAIN[domain] || [];
  var found = [];
  for (var i = 0; i < scholars.length; i++) {
    if (text.indexOf(scholars[i].fr.toLowerCase()) !== -1 || text.indexOf(scholars[i].ar) !== -1) {
      found.push(scholars[i].fr);
    }
  }
  return found;
}

function extractAuthorAndDate(doc) {
  var author = 'Auteur non specifie';
  var date = 'Date non specifiee';
  if (doc.createdAt) date = new Date(doc.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  if (doc.url) {
    var m = doc.url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
    if (m) author = m[1].replace(/\.(com|org|net|io|fr|tn)$/, '');
  }
  return { author: author, date: date };
}

function extractKeyPoints(text) {
  if (!text) return [];
  var cleaned = cleanText(text);
  var sentences = cleaned.split(/[.!?]\s+/).map(function(s) { return s.trim(); })
    .filter(function(s) { return s.length > 40 && s.length < 250; });
  var words = tokenize(cleaned);
  var freq = {};
  for (var w = 0; w < words.length; w++) freq[words[w]] = (freq[words[w]] || 0) + 1;
  var scored = sentences.map(function(s) {
    var st = tokenize(s);
    var score = 0;
    for (var i = 0; i < st.length; i++) score += freq[st[i]] || 0;
    return { sentence: s, score: score / (st.length || 1) };
  });
  return scored.sort(function(a, b) { return b.score - a.score; }).slice(0, 5).map(function(x) { return x.sentence; });
}

function judgeClaudeValidation(question, answer, domain) {
  var isSensitive = isSensitiveDomain(domain);
  var hasNums = hasNumbers(answer);
  var len = (answer || '').length;
  var result = { isSensitive: isSensitive, hasNumbers: hasNums, length: len, warnings: [], reject: false, reason: '' };
  if (isSensitive && !hasNums) {
    result.warnings.push('Sujet sensible SANS donnees chiffrees');
    result.reject = true;
    result.reason = 'Chiffres obligatoires';
  }
  if (len < 200) result.warnings.push('Reponse tres courte');
  return result;
}

function generateTechSheet(domain, docsUsed, semanticScore, scholars, judgeResult, mode) {
  var html = '<div style="background:linear-gradient(135deg,#0a2540,#1e5aa8);color:#ffffff;border-radius:12px;padding:20px;margin:20px 0">';
  html += '<h4 style="margin:0 0 14px 0;font-size:16px;font-weight:700">📋 Fiche technique</h4>';
  html += '<table style="width:100%;font-size:13px;color:#ffffff;border-collapse:collapse">';
  html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75;width:200px">Domaine</td><td style="padding:8px 0;font-weight:700">' + esc(domain) + '</td></tr>';
  if (mode === 'document') {
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Source</td><td style="padding:8px 0;font-weight:700">Document colle</td></tr>';
  } else {
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Score</td><td style="padding:8px 0;font-weight:700">' + Math.round(semanticScore * 100) + ' %</td></tr>';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Docs sources</td><td style="padding:8px 0;font-weight:700">' + docsUsed + '</td></tr>';
  }
  html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Moteur IA</td><td style="padding:8px 0;font-weight:700">MBA-CONSULT AI CORE</td></tr>';
  html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Validation</td><td style="padding:8px 0;font-weight:700;color:#4ade80">✓ Juge Claude</td></tr>';
  html += '<tr><td style="padding:8px 0;opacity:0.75">Date</td><td style="padding:8px 0;font-weight:700">' + new Date().toLocaleString('fr-FR') + '</td></tr>';
  html += '</table></div>';
  return html;
}

// ============================================================
// 6. EXTRACTION WO
// ============================================================
function parseWorkOrders(text) {
  text = String(text || '').replace(/\r/g, '');
  var re = /(^|[^0-9A-Za-z])(\d{5})\s+(\d{1,3})\s+(\d{2}\/\d{2}\/\d{2,4})(?![0-9])/g;
  var hits = [], seen = {}, m;
  while ((m = re.exec(text)) !== null) {
    var id = m[2];
    if (seen[id]) continue;
    seen[id] = 1;
    hits.push({
      id: id, qte: m[3], date: m[4],
      start: m.index + m[1].length,
      end: m.index + m[0].length
    });
  }

  var codes = [];
  var codeRe = /^[ \t]*(\d{4}[A-Z][A-Z0-9]{6,})[ \t]*$/gm;
  var cm;
  while ((cm = codeRe.exec(text)) !== null) codes.push({ code: cm[1], idx: cm.index });

  var pages = [];
  var pageRe = /^[ \t]*Page\s+\d+\s*\/\s*\d+/gmi;
  var pm;
  while ((pm = pageRe.exec(text)) !== null) pages.push(pm.index);

  for (var i = 0; i < hits.length; i++) {
    var h = hits[i];
    var c = null;
    for (var j = 0; j < codes.length; j++) { if (codes[j].idx < h.start) c = codes[j]; }
    var blockStart = c ? c.idx : (i > 0 ? hits[i - 1].end : 0);

    var blockEnd = text.length;
    for (var j2 = 0; j2 < codes.length; j2++) {
      if (codes[j2].idx > h.end) { blockEnd = Math.min(blockEnd, codes[j2].idx); break; }
    }
    for (var p = 0; p < pages.length; p++) {
      if (pages[p] > h.end) { blockEnd = Math.min(blockEnd, pages[p]); break; }
    }
    if (i + 1 < hits.length && !codes.length) blockEnd = Math.min(blockEnd, hits[i + 1].start);

    h.code = c ? c.code : '';
    h.before = text.slice(blockStart, h.start);
    h.after = text.slice(h.end, blockEnd);
  }
  return hits;
}

function describeWO(h) {
  var b = h.before;
  var code = h.code || (b.match(/\b\d{4}[A-Z][A-Z0-9]{6,}\b/) || [''])[0];
  var est = (b.match(/estimate\s*n[^\d\s]*\s*(\d+)/i) || ['', ''])[1];
  var kind = '';
  var k = b.toUpperCase().lastIndexOf('MANUFACTURE');
  if (k !== -1) { kind = 'SUPPLY MATERIAL & MANUFACTURE'; b = b.slice(k + 11); }
  b = b.replace(/As\s+per\s+our\s+estimate[^\n]*/i, ' ');
  if (code) b = b.split(code).join(' ');
  var cont = String(h.after || '').replace(/\s+/g, ' ').trim();
  var gm = String(h.after || '').match(/GRADE\s*:\s*([^\n\r]+)/i);
  var grade = gm ? gm[1].replace(/\.\s*$/, '').trim() : '';
  var desc = (b.replace(/\s+/g, ' ').trim() + ' ' + cont).trim().slice(0, 350);
  return { code: code, est: est, kind: kind, desc: desc, grade: grade };
}

function detectCustomer(text) {
  var m = String(text).match(/([A-Z][A-Z0-9 &.,'-]{3,60}?\s(?:FZE|FZCO|FZC|LLC|LTD|LIMITED|B\.V\.|S\.A\.|SARL|GMBH|INC|CORP))\b/);
  return m ? m[1].replace(/\s+/g, ' ').trim() : 'XXXXXXX';
}

function detectPO(text) {
  var m = String(text).match(/(?:P\.?O\.?|Purchase\s*Order|Order|ARC)\D{0,15}(\d{8,12})/i);
  if (m) return m[1];
  var m2 = String(text).match(/\b(\d{10})\b/);
  return m2 ? m2[1] : 'NA';
}

function detectNorme(text) {
  var m = String(text).match(/Manufactured\s+According\s+to\s+([\s\S]{3,200}?)\s+Latest\s+Edition/i);
  if (m) return m[1].replace(/\s+/g, ' ').trim() + ' Latest Edition';
  var m2 = String(text).match(/Manufactured\s+According\s+to\s+([^\n\r]+)/i);
  return m2 ? m2[1].trim().slice(0, 80) : '';
}

// ============================================================
// 7. RENDU QP
// ============================================================
var BD = 'border:1px solid #444;';
var LBL = BD + 'background:#dce6f1;padding:4px 6px;font-size:11px;color:#1f2d3d;';
var VAL = BD + 'padding:4px 6px;font-size:11px;color:#111;';

function td(style, content, attrs) {
  return '<td' + (attrs ? ' ' + attrs : '') + ' style="' + style + '">' + content + '</td>';
}
function lines(s) {
  if (!s) return '';
  return String(s).split('|').map(esc).join('<br>');
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function todayFR() {
  var d = new Date();
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
}
function logoBox(src, alt, fallback) {
  if (src) return '<img src="' + src + '" alt="' + alt + '" style="max-width:100%;max-height:48px">';
  return fallback;
}

function fillOps(ops, ctx, grade) {
  var normAcc = ctx.normeAcc || 'Customer specifications';
  function fx(s) {
    return String(s).replace('{NORM}', normAcc).replace('{GRADE}', grade ? 'Grade: ' + grade : '')
      .split('|').filter(function(x) { return x.trim() !== ''; }).join('|');
  }
  return ops.map(function(o) {
    var name = String(o[1]).replace('{DOCS}', ctx.hasDocs ? ' and documents (CO, COC, MTC)' : '');
    return [o[0], name, fx(o[2]), fx(o[3]), o[4], o[5]];
  });
}

function qpHeader(pageNo) {
  var codes = ['Cod : FO-24-PRO', 'Indice de Rev :6', 'Date de Rev :03/08/2017', 'N&deg; de page :' + pageNo + '/1'];
  var c = codes.map(function(t, i) {
    return '<div style="padding:2px 6px;font-size:9px;' + (i < 3 ? 'border-bottom:1px solid #444;' : '') + '">' + t + '</div>';
  }).join('');
  var gmpi = logoBox(LOGO_GMPI, 'GMPI', '<span style="display:inline-block;background:#0b3d91;color:#fff;font-weight:800;font-size:18px;padding:4px 10px;border-radius:4px">GMPI</span>');
  var grp = logoBox(LOGO_GROUP, 'GLOBAL GROUP', '<span style="font-weight:800;font-size:12px;letter-spacing:1px">GLOBAL GROUP</span>');
  return '<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-family:Arial,sans-serif"><tr>' +
    td(BD + 'width:20%;padding:6px;text-align:center', gmpi, 'rowspan="2"') +
    td(BD + 'text-align:center;padding:8px;font-size:13px;color:#111', 'Global Metallic Product Industries (GMPI)') +
    td(BD + 'width:22%;padding:0;vertical-align:top', c, 'rowspan="2"') +
    td(BD + 'width:18%;padding:6px;text-align:center', grp, 'rowspan="2"') +
    '</tr><tr>' +
    td(BD + 'text-align:center;padding:10px;font-size:12px;color:#111', 'Quality control plan') +
    '</tr></table>';
}

function qpChk(v) { return td(VAL + 'width:4%;text-align:center;font-weight:700;', v ? 'X' : ''); }
function qpTyp(label) { return td(VAL + 'text-align:center;font-size:10px;', label); }

function qpPage1(d) {
  var info = '<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-family:Arial,sans-serif">' +
    '<tr>' + td(LBL + 'width:20%', 'Quality Control Plan N&deg;') + td(VAL + 'width:20%', esc(d.qpNo)) +
    td(LBL + 'width:16%', 'Customer Name') + td(VAL + 'width:22%;font-weight:700', esc(d.customer)) +
    td(LBL + 'width:8%', 'Part') + td(VAL + 'text-align:center', '1 OF 1') + '</tr>' +
    '<tr>' + td(LBL, 'Work Order N&deg;') + td(VAL, esc(d.wo)) +
    td(LBL, 'Purchase Order N&deg;') + td(VAL, esc(d.po)) +
    td(LBL, 'Dated') + td(VAL + 'font-weight:700;text-align:center', esc(d.dated)) + '</tr>' +
    '<tr>' + td(LBL, 'In Brief Job') + td(VAL + 'height:55px;vertical-align:top', d.brief, 'colspan="5"') + '</tr>' +
    '</table>';

  var type = '<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-family:Arial,sans-serif"><tr>' +
    td(LBL + 'width:16%', 'Type of Job (X)') +
    qpTyp('PROTOTYPE') + qpChk(d.type.proto) +
    qpTyp('PRODUCT MANUFACTURE') + qpChk(d.type.manuf) +
    qpTyp('OVERALL REPAIR') + qpChk(d.type.repair) +
    qpTyp('ASSEMBLY DESASSEMBLY') + qpChk(d.type.assembly) +
    '</tr></table>';

  var th = LBL + 'text-align:center;font-size:9px;';
  var ops = '<table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-family:Arial,sans-serif"><tr>' +
    td(th + 'width:30px', '&nbsp;') +
    td(th + 'width:32%', 'Manufacture and Checking Operations') +
    td(th + 'width:7%', 'Third Party') +
    td(th + 'width:15%', 'Applicable Specification') +
    td(th + 'width:15%', 'Acceptance Criteria') +
    td(th + 'width:8%', 'Record Required') +
    td(th + 'width:9%', 'Followed by') +
    td(th + 'width:14%', 'Signature') +
    '</tr>';
  d.ops.forEach(function(o) {
    var opHtml = esc(o[1]).replace('+ UT for weld joints', '<span style="color:#d00000">+ UT for weld joints</span>');
    var c = BD + 'padding:3px 5px;font-size:9px;color:#111;';
    ops += '<tr>' +
      td(c + 'text-align:center;font-weight:700', o[0]) +
      td(c, opHtml) +
      td(c, '') +
      td(c + 'text-align:center', lines(o[2])) +
      td(c + 'text-align:center', lines(o[3])) +
      td(c + 'text-align:center;font-weight:700;font-size:11px', o[4] ? 'X' : '') +
      td(c + 'text-align:center', esc(o[5])) +
      td(c, '') +
      '</tr>';
  });
  ops += '</table>';

  var comments = '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif"><tr>' +
    td(LBL + 'width:20%;height:60px;vertical-align:top', 'Comments') + td(VAL, '') + '</tr></table>';

  return '<div>' + qpHeader('1') + info + type + ops + comments + '</div>';
}

function qpPage2() {
  var th = LBL + 'text-align:center;padding:8px;';
  var notes = '<div style="font-weight:700;font-size:10px;margin-bottom:3px">Notes :</div>' +
    QP_NOTES.map(function(n) { return '<div style="font-size:10px;padding-left:12px;margin:2px 0">' + esc(n) + '</div>'; }).join('');
  var t = '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif"><tr>' +
    td(th + 'width:25%', 'Edited by') + td(th + 'width:25%', 'Approved by') + td(th, 'Signature and Stamp for Approval') + '</tr>' +
    '<tr>' + td(VAL + 'text-align:center;padding:10px', 'QC Dep.') + td(VAL + 'text-align:center;padding:10px', 'Tech. Dep.') +
    td(VAL + 'height:110px', '', 'rowspan="2"') + '</tr>' +
    '<tr>' + td(VAL + 'height:80px;vertical-align:top', notes, 'colspan="2"') + '</tr></table>';
  return '<div style="page-break-before:always">' + qpHeader('2') + t + '</div>';
}

function renderOneQP(wo, idx, ctx) {
  var info = describeWO(wo);
  var up = (info.kind + ' ' + info.desc).toUpperCase();
  var type = {
    proto: /PROTOTYPE/.test(up),
    manuf: /MANUFACTUR/.test(up),
    repair: /REPAIR|RECERTIF|REFURB/.test(up),
    assembly: /ASSEMBL|RECERTIF/.test(up)
  };
  if (!type.proto && !type.manuf && !type.repair && !type.assembly) type.manuf = true;

  var baseOps = (type.repair || type.assembly) ? QP_OPS_REPAIR : QP_OPS_MANUF;
  var ops = fillOps(baseOps, ctx, info.grade);

  var l1 = esc((info.kind || 'JOB') + (ctx.norme ? ' AS PER ' + ctx.norme.toUpperCase() : '') + ' FOR :');
  var l2 = '- ' + esc(info.desc) + (wo.qte ? ', QTY: ' + esc(wo.qte) : '') +
    (info.code ? ', REF: ' + esc(info.code) : '') + (info.est ? ', ESTIMATE No ' + esc(info.est) : '');
  var d = {
    qpNo: 'QP-' + wo.id,
    wo: wo.id,
    customer: ctx.customer,
    po: ctx.po,
    dated: todayFR(),
    brief: l1 + '<br>' + l2,
    type: type,
    ops: ops
  };
  var style = 'background:#fff;padding:0;margin:0;' + (idx > 0 ? 'page-break-before:always;' : '');
  return '<div class="qp-document" data-qp="QP-' + esc(wo.id) + '" style="' + style + '">' + qpPage1(d) + qpPage2() + '</div>';
}

// ============================================================
// 8. STOCKAGE + PAGE PDF
// ============================================================
var QP_STORE = {};

function storeQP(html) {
  var now = Date.now();
  Object.keys(QP_STORE).forEach(function(k) { if (QP_STORE[k].exp < now) delete QP_STORE[k]; });
  var token = crypto.randomBytes(16).toString('hex');
  QP_STORE[token] = { html: html, exp: now + 2 * 60 * 60 * 1000 };
  return token;
}

function printPage(qpsHtml) {
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Quality Control Plan</title>' +
    '<style>@page{size:A4;margin:8mm}body{font-family:Arial,sans-serif;margin:0;background:#fff;color:#111}' +
    '.pb{position:fixed;top:12px;right:12px;background:#0a2540;color:#fff;border:0;padding:12px 22px;border-radius:8px;font-weight:700;cursor:pointer;z-index:9}' +
    '@media print{.pb{display:none}}</style></head><body>' +
    '<button id="pb" class="pb" type="button">Imprimer / Enregistrer en PDF</button>' +
    qpsHtml + '<script src="/qp-pdf.js"></script></body></html>';
}

var QP_PRINT_JS = "window.addEventListener('load',function(){var b=document.getElementById('pb');if(b){b.addEventListener('click',function(){window.print();});}setTimeout(function(){window.print();},700);});";

function buildQPAnswer(text) {
  var wos = parseWorkOrders(text);
  if (wos.length === 0) return { wos: wos, html: '' };
  var norme = detectNorme(text);
  var normeAcc = norme.replace(/\s*Latest\s+Edition\s*$/i, '').split(/\s*[,&]\s*/).filter(function(x) { return x.trim() !== ''; }).join('|');
  var ctx = {
    customer: detectCustomer(text),
    po: detectPO(text),
    norme: norme,
    normeAcc: normeAcc,
    hasDocs: /\bCOC\b/i.test(text) && /\bMTC\b/i.test(text)
  };
  var qps = wos.map(function(w, i) { return renderOneQP(w, i, ctx); }).join('');
  var token = storeQP(qps);
  var chips = wos.map(function(w) {
    return '<span style="display:inline-block;background:#ffffff;border:1px solid #1e5aa8;color:#1e5aa8;padding:4px 12px;border-radius:14px;margin:3px 5px 3px 0;font-weight:700">QP-' + esc(w.id) + '</span>';
  }).join('');
  var banner = '<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:18px;margin:0 0 16px 0;font-family:Arial,sans-serif">' +
    '<div style="color:#1e40af;font-weight:800;font-size:15px">' + wos.length + ' Work Order(s) detecte(s) - 1 QP conforme QP STANDARD 01 par WO</div>' +
    '<div style="font-size:13px;color:#1e3a8a;margin:6px 0 10px 0">Chaque QP occupe 2 pages A4, comme le document standard (FO-24-PRO Rev 6).</div>' +
    '<div style="margin-bottom:12px">' + chips + '</div>' +
    '<a href="/qp-pdf/' + token + '" target="_blank" rel="noopener" style="display:inline-block;background:#0a2540;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px">Ouvrir le PDF des ' + wos.length + ' QP</a>' +
    '<div style="font-size:12px;color:#1e3a8a;margin-top:8px">Dans la fenetre ouverte, choisissez Imprimer puis Enregistrer au format PDF.</div>' +
    '</div>';
  var hidden = '<div class="qp-print-container" style="display:none">' + qps + '</div>';
  return { wos: wos, html: banner + hidden };
}

function collectText(body) {
  var parts = [];
  Object.keys(body || {}).forEach(function(k) {
    if (typeof body[k] === 'string') parts.push(body[k]);
  });
  return parts.join('\n');
}

async function enrichAnswer(answer, question, domain, lang, mongoose, mode, originalContent) {
  try {
    mode = mode || 'ask';
    var contentSource = originalContent || '';
    var isQP = isQualityPlanRequest(question, contentSource);
    var realDomain = isQP ? 'Plan Qualite' : detectDomain(question, domain);
    var isLitRel = isLiteraryOrReligious(realDomain);
    var judgeResult = judgeClaudeValidation(question, answer, realDomain);

    var AutoFeedDoc = null;
    try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { AutoFeedDoc = null; }

    var docs = [];
    var semanticScore = 0;
    if (mode === 'ask' && AutoFeedDoc) {
      docs = await findRelevantDocuments(AutoFeedDoc, question, 5, 0.15);
      if (docs.length > 0) semanticScore = docs[0].score;
    }

    var scholars = [];
    if (isLitRel) scholars = extractScholars(question, answer, realDomain);

    var enriched = '';
    enriched += '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:0 0 20px 0">';
    enriched += '<h3 style="color:#0a2540;font-size:17px;font-weight:700;margin:0 0 16px 0;padding-bottom:10px;border-bottom:2px solid #1e5aa8">Reponse detaillee</h3>';
    enriched += '<div style="font-size:14px;color:#17202a">' + formatForHTML(answer) + '</div>';
    enriched += '</div>';

    enriched += generateTechSheet(realDomain, docs.length, semanticScore, scholars, judgeResult, mode);

    enriched += '<div style="background:#f5f7fa;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:20px 0;font-size:12px;color:#6b7280;text-align:center">';
    enriched += '<strong style="color:#0a2540">Agents IA impliques :</strong> MBA-CONSULT AI CORE - OpenRouter - Semantic Engine - Language Fix - Voice Engine - <strong style="color:#16a34a">Juge Claude (validation active)</strong>';
    if (mode === 'document') enriched += ' - <strong style="color:#1e5aa8">Traitement exclusif du document colle</strong>';
    enriched += '</div>';

    return enriched;
  } catch (e) {
    console.warn('[answer-enricher] Erreur :', e.message);
    return answer;
  }
}

// ============================================================
// 9. MIDDLEWARE EXPRESS
// ============================================================
module.exports = function(app, mongoose) {

  var AutoFeedDoc = null;
  try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { AutoFeedDoc = null; }

  app.get('/qp-pdf.js', function(req, res) {
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.send(QP_PRINT_JS);
  });

  app.get('/qp-pdf/:token', function(req, res) {
    var e = QP_STORE[req.params.token];
    if (!e || e.exp < Date.now()) {
      return res.status(404).send('QP expire. Regenerez le plan qualite depuis le chat.');
    }
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('X-Robots-Tag', 'noindex');
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data: 'self'; script-src 'self'");
    res.send(printPage(e.html));
  });

  function qpIntercept(route, strict) {
    app.use(route, function(req, res, next) {
      try {
        if (req.method !== 'POST' || !req.body) return next();
        if (!req.headers.authorization) return next();
        var question = String(req.body.question || '');
        var wantsQP = QP_RE.test(question) || (!strict && !question.trim());
        if (!wantsQP) return next();

        var text = collectText(req.body) + '\n' + question;
        var out = buildQPAnswer(text);

        if (out.wos.length === 0) {
          if (strict) return next();
          var fields = Object.keys(req.body).map(function(k) {
            return k + ' (' + (typeof req.body[k] === 'string' ? req.body[k].length + ' car.' : typeof req.body[k]) + ')';
          }).join(', ');
          console.log('[answer-enricher] Aucun WO detecte. Champs recus : ' + fields);
          return res.json({
            answer: '<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:14px">' +
              '<div style="color:#991b1b;font-weight:700">Aucun WO detecte dans le document</div>' +
              '<div style="font-size:12px;color:#7f1d1d;margin-top:4px">Le document doit contenir des lignes du type : 28225 6 10/03/26 (N&deg; WO, quantite, date). Champs recus : ' + esc(fields) + '</div></div>',
            enriched: true
          });
        }

        console.log('[answer-enricher] QP direct (sans IA) - ' + out.wos.length + ' WO : ' + out.wos.map(function(w) { return w.id; }).join(', '));
        return res.json({
          answer: out.html,
          enriched: true,
          qpStandard01: true,
          treatmentMode: 'parsing-direct',
          workOrdersDetected: out.wos.map(function(w) { return 'QP-' + w.id; })
        });
      } catch (e) {
        console.warn('[answer-enricher] Erreur QP :', e.message);
        return next();
      }
    });
  }
  qpIntercept('/api/analyze-content', false);
  qpIntercept('/api/ask', true);

  async function ragPreprocessAsk(req, res, next) {
    if (!req.body || !req.body.question) return next();
    if (!AutoFeedDoc) {
      try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { return next(); }
    }
    try {
      var questionOriginale = req.body.question;
      var rag = await buildRagContext(AutoFeedDoc, questionOriginale, 3, 3500);
      if (rag.context && rag.context.length > 200) {
        req.body.question = questionOriginale + '\n\n[EXTRAITS]\n' + rag.context + '\n[FIN EXTRAITS]\n\nQuestion : ' + questionOriginale;
        req._ragDocs = rag.docs;
      }
    } catch (e) {}
    next();
  }

  function documentPreprocess(req, res, next) {
    if (!req.body) return next();
    var content = req.body.content ? String(req.body.content) : '';
    var questionUser = req.body.question ? String(req.body.question) : '';

    if (content && content.trim().length > 20) {
      req._documentContent = content;
      req._documentQuestion = questionUser;
      req._documentMode = true;

      req.body.question = (questionUser || 'Analyse ce document.');
      req.body.content = 'Voici le contenu du document a analyser :\n\n' + content;

      console.log('[answer-enricher] v15.0 Mode DOCUMENT - ' + content.length + ' car.');
    }
    next();
  }

  function postprocess(mode) {
    return function(req, res, next) {
      var originalJson = res.json.bind(res);
      res.json = function(data) {
        if (!data || !data.answer || data.enriched) return originalJson(data);

        var questionPourDetection = '';
        var contenuPourDetection = '';
        if (mode === 'document') {
          contenuPourDetection = req._documentContent || '';
          questionPourDetection = req._documentQuestion || '';
        } else {
          questionPourDetection = req.body && req.body.question ? req.body.question : '';
        }

        var domain = req.body && req.body.domain ? req.body.domain : 'General';
        var lang = req.body && req.body.language ? req.body.language : 'fr';

        enrichAnswer(data.answer, questionPourDetection, domain, lang, mongoose, mode, contenuPourDetection)
          .then(function(enriched) {
            data.answerRaw = data.answer;
            data.answer = enriched;
            data.enriched = true;
            data.enrichedAt = new Date().toISOString();
            if (mode === 'document') data.treatmentMode = 'exclusive-document';
            originalJson(data);
          })
          .catch(function() { originalJson(data); });
        return res;
      };
      next();
    };
  }

  app.use('/api/ask', ragPreprocessAsk, postprocess('ask'));
  app.use('/api/analyze-content', documentPreprocess, postprocess('document'));

  console.log('[answer-enricher] v15.0 charge - Affichage HTML correct + bouton PDF');
};
