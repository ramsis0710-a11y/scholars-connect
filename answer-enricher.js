// ============================================================
// ANSWER-ENRICHER.JS
// Version v9.0 - Multi-WO robuste + HTML masque + PDF propre
// ============================================================

'use strict';

// ============================================================
// 0. MODELE QP STANDARD 01
// ============================================================
var QP_STANDARD_01 = {
  company: 'Global Metallic Product Industries (GMPI)',
  code: 'FO-24-PRO',
  revIndex: '6',
  revDate: '03/08/2017',
  title: 'Quality Control Plan',
  editedBy: 'QC Department',
  approvedBy: 'Tech. Department',
  signatureFields: ['Edited by (QC Dep.)', 'Approved by (Tech. Dep.)', 'Signature client', 'Stamp'],
  notes: [
    'a) For operation instruction, refer to Work Order (WO) Document Reference FO-05-R&D',
    'b) Any NCR detected shall be treated according to procedure PR-01-PRO',
    'c) Thread inspection procedures according to applicable standard'
  ],
  sections: [
    { num: 1, title: 'Informations generales', fields: ['Client', 'Commande ARC', 'N° WO', 'Produit', 'Quantite', 'Norme applicable', 'Date de commande'] },
    { num: 2, title: 'References documentaires', fields: ['Work Order (WO)', 'JOB', 'Plans', 'Normes API 5CT/5B', 'VAM', 'AISI 4140', 'Procedure FO-05-R&D'] },
    { num: 3, title: 'Matiere premiere', fields: ['MTC (Material Test Certificate)', 'Verification', 'Tracabilite', 'Specification matiere'] },
    { num: 4, title: 'Processus de fabrication', fields: ['Etapes', 'POS', 'Parametres cles', 'Usinage', 'Decoupe', 'Assemblage'] },
    { num: 5, title: 'Points de controle qualite', fields: ['Dimensionnel', 'Visuel', 'NDT', 'Test pression', 'Thread inspection'] },
    { num: 6, title: 'Inspection par tiers (TPI)', fields: ['Requis par contrat', 'Organisme', 'Frequence', 'Rapport'] },
    { num: 7, title: 'Documents livrables', fields: ['COC', 'MTC', 'Certificats specifiques', 'Dossier qualite'] },
    { num: 8, title: 'Gestion des non-conformites', fields: ['Procedure PR-01-PRO', 'Enregistrement', 'Actions correctives'] },
    { num: 9, title: 'Approbations', fields: ['QC Department', 'Tech. Department', 'Client', 'Signature', 'Stamp', 'Date'] }
  ]
};

// ============================================================
// 0.b EXIGENCES API 6A
// ============================================================
var API_6A_REQUIREMENTS = [
  { num: 1,  req: 'Commande / Work Order documente',                ref: 'FO-05-R&D' },
  { num: 2,  req: 'Instruction de travail (Operation Instruction)',  ref: 'FO-05-R&D' },
  { num: 3,  req: 'Traitement des NCR',                             ref: 'PR-01-PRO' },
  { num: 4,  req: "Procedure d'inspection des filetages",           ref: 'API 6A' },
  { num: 5,  req: 'Certificat matiere (MTR)',                       ref: 'API 6A / EN 10204 3.1' },
  { num: 6,  req: 'Controle chimique matiere',                      ref: 'API 6A' },
  { num: 7,  req: 'Controle mecanique matiere',                     ref: 'API 6A' },
  { num: 8,  req: 'Traitement thermique',                           ref: 'API 6A' },
  { num: 9,  req: 'Controle de durete',                             ref: 'API 6A' },
  { num: 10, req: 'Controle dimensionnel',                          ref: 'API 6A' },
  { num: 11, req: 'Controle visuel',                                ref: 'API 6A' },
  { num: 12, req: 'Controle non destructif (NDT) - PT',             ref: 'API 6A' },
  { num: 13, req: 'Controle non destructif (NDT) - MT',             ref: 'API 6A' },
  { num: 14, req: 'Controle non destructif (NDT) - UT',             ref: 'API 6A' },
  { num: 15, req: 'Controle non destructif (NDT) - RT',             ref: 'API 6A' },
  { num: 16, req: 'Test de pression hydrostatique',                 ref: 'API 6A' },
  { num: 17, req: 'Test de pression gaz',                           ref: 'API 6A' },
  { num: 18, req: 'Test de fonctionnement (Function Test)',         ref: 'API 6A' },
  { num: 19, req: 'Inspection des filetages',                       ref: 'API 6A' },
  { num: 20, req: 'Controle de revetement / peinture',              ref: 'API 6A' },
  { num: 21, req: 'Marquage produit',                               ref: 'API 6A' },
  { num: 22, req: 'Tracabilite matiere',                            ref: 'API 6A' },
  { num: 23, req: 'PSL (Product Specification Level)',              ref: 'API 6A' },
  { num: 24, req: 'Classe de materiau',                             ref: 'API 6A' },
  { num: 25, req: 'Conditions de service H2S',                      ref: 'API 6A / NACE MR0175' },
  { num: 26, req: 'Inspection tierce (TPI)',                        ref: 'API 6A' },
  { num: 27, req: 'Certificat de conformite',                       ref: 'API 6A' },
  { num: 28, req: 'Rapport de test final',                          ref: 'API 6A' },
  { num: 29, req: 'Emballage et preservation',                      ref: 'API 6A' },
  { num: 30, req: "Document d'approbation QC",                      ref: 'FO-24-PRO' }
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

// ============================================================
// 2. DOMAINES ANALYTIQUES
// ============================================================
var ANALYTICAL_DOMAINS = [
  'Economie', 'Finance', 'Medecine', 'Sante', 'Marketing', 'Commerce',
  'IA & KMS', 'Sciences', 'Energie', 'Education', 'Industrie',
  'Technologie', 'Business', 'Gestion', 'Droit', 'Criminalite',
  'Terrorisme', 'Guerre/Conflit', 'Geopolitique', 'Economie mondiale',
  'Sante publique', 'Immigration', 'Climat', 'Technique', 'Petrole & Gaz',
  'Plan Qualite'
];

// ============================================================
// 3. RATIOS PAR DOMAINE
// ============================================================
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

// ============================================================
// 4. SCHOLARS
// ============================================================
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
// 5. DETECTION QP + EXTRACTION WO (v9.0 - robuste)
// ============================================================
function isQualityPlanRequest(question, content) {
  var text = ((question || '') + ' ' + (content || '')).toLowerCase();
  var triggers = [
    'plan qualite', 'plan qualité', 'plan de qualite', 'plan de qualité',
    'quality control plan', 'quality plan', 'qp ', 'qp-', 'qp_', 'qp+',
    'qp01', 'qp 01', 'qp standard', 'controle qualite', 'contrôle qualité',
    'control plan', 'plan de controle', 'plan de contrôle'
  ];
  for (var i = 0; i < triggers.length; i++) {
    if (text.indexOf(triggers[i]) !== -1) return true;
  }
  return false;
}

function extractWorkOrders(question, content) {
  var text = ((question || '') + '\n' + (content || ''));
  var wos = [];
  var seen = {};

  // v9.0 : accepte 2 formats :
  //  1) WO + numero pur (WO 28836, WO-28836, Work Order 28836)  -> priorite
  //  2) WO + code alphanumerique (WO 0113XO6F1002M4F602F602)    -> fallback
  // On garde le "raw" pour identifier la zone, mais on normalise l'id sans prefixe WO-
  var patterns = [
    { rx: /\bWO[\s_:#-]+(\d{4,8})\b/gi,                             type: 'num' },
    { rx: /\bWork\s+Order[\s_:#-]*(\d{4,8})\b/gi,                   type: 'num' },
    { rx: /\bW\/O[\s_:#-]*(\d{4,8})\b/gi,                           type: 'num' },
    { rx: /\bWO[\s_:#-]+([A-Z0-9][A-Z0-9\-_.\/]{5,40})\b/gi,        type: 'alpha' },
    { rx: /\bWork\s+Order[\s_:#-]*([A-Z0-9][A-Z0-9\-_.\/]{5,40})\b/gi, type: 'alpha' }
  ];

  for (var p = 0; p < patterns.length; p++) {
    var rx = patterns[p].rx;
    var m;
    while ((m = rx.exec(text)) !== null) {
      var raw = (m[1] || '').trim();
      if (raw.length < 4) continue;
      // Normaliser : on enleve WO- du debut si present, on garde le code
      var key = raw.toUpperCase();
      if (seen[key]) continue;
      seen[key] = true;
      wos.push({
        id: raw,          // ex: "28836" ou "0113XO6F1002M4F602F602"
        raw: raw,
        type: patterns[p].type
      });
    }
  }

  return wos;
}

function extractWoBlock(content, wo, allWos) {
  if (!content || !wo) return content || '';
  var idx = content.toUpperCase().indexOf(String(wo.raw).toUpperCase());
  if (idx === -1) return content.slice(0, 6000);

  var nextIdx = content.length;
  for (var i = 0; i < allWos.length; i++) {
    var other = allWos[i];
    if (other.raw === wo.raw) continue;
    var oIdx = content.toUpperCase().indexOf(String(other.raw).toUpperCase(), idx + 1);
    if (oIdx !== -1 && oIdx < nextIdx) nextIdx = oIdx;
  }
  return content.slice(idx, Math.min(nextIdx, idx + 8000));
}

// ============================================================
// 6. UTILITAIRES
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

// v9.0 : formatForHTML ne sert plus a afficher le QP dans le chat
// On garde uniquement une version texte minimaliste pour les reponses non-QP
function formatForHTML(text) {
  if (!text) return '';
  var clean = cleanText(text);
  var lines = clean.split('\n');
  var output = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line === '') { output.push('<br>'); continue; }
    output.push('<p style="margin:8px 0;line-height:1.75;color:#17202a">' + esc(line) + '</p>');
  }
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
// 7. RECHERCHE DOCS
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
// 8. DETECTION DOMAINE
// ============================================================
function detectDomain(question, defaultDomain) {
  if (defaultDomain && defaultDomain !== 'General') return defaultDomain;
  var q = String(question || '').toLowerCase();
  if (isQualityPlanRequest(question, '')) return 'Plan Qualite';

  var petro = ['api 5ct', 'api 5b', 'api 5l', 'api 6a', 'api 16a', 'vam', 'tubage', 'casing', 'tubing', 'petrole', 'gaz', 'aisi 4140', '80ksi', '110ksi', 'nace', 'h2s', 'raccord', 'filetage', 'thread', 'coupling', 'manchon'];
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

// ============================================================
// 9. CHIFFRES / POINTS CLES / SCHOLARS
// ============================================================
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

// ============================================================
// 10. FICHE TECHNIQUE (sans dashboard pour QP)
// ============================================================
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
  if (scholars && scholars.length > 0) {
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Scholars</td><td style="padding:8px 0;font-weight:700;color:#fbbf24">' + esc(scholars.join(', ')) + '</td></tr>';
  }
  html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Moteur IA</td><td style="padding:8px 0;font-weight:700">MBA-CONSULT AI CORE</td></tr>';
  html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Validation</td><td style="padding:8px 0;font-weight:700;color:#4ade80">✓ Juge Claude</td></tr>';
  html += '<tr><td style="padding:8px 0;opacity:0.75">Date</td><td style="padding:8px 0;font-weight:700">' + new Date().toLocaleString('fr-FR') + '</td></tr>';
  html += '</table></div>';
  return html;
}

// ============================================================
// 11. EXTRACTION QP PAR WO
// ============================================================
function extractFieldFromBlock(block, patterns) {
  if (!block) return '';
  for (var i = 0; i < patterns.length; i++) {
    var m = block.match(patterns[i]);
    if (m && m[1]) return m[1].trim();
  }
  return '';
}

function buildQPSectionsForWO(wo, block, globalContent) {
  var client = extractFieldFromBlock(block, [/(?:client|customer|destinataire)\s*[:#\-]\s*([^\n\r]{2,120})/i])
            || extractFieldFromBlock(globalContent, [/(?:client|customer)\s*[:#\-]\s*([^\n\r]{2,120})/i]);
  var produit = extractFieldFromBlock(block, [/(?:produit|product|article|item|designation|description)\s*[:#\-]\s*([^\n\r]{3,120})/i]);
  var qte = extractFieldFromBlock(block, [/(?:qte|qté|quantite|quantité|qty|quantity)\s*[:#\-]?\s*(\d[\d\s.,]*)/i]);
  if (!qte) {
    var mQty = block.match(/(\d+)\s*(?:pcs|pieces|pièces|units|unités)/i);
    if (mQty) qte = mQty[1];
  }
  var estimation = extractFieldFromBlock(block, [/(?:estimation)\s*[:#\-]?\s*([A-Z0-9\-_\/]{3,40})/i]);
  var arc = extractFieldFromBlock(block, [/(?:ARC|commande|order)\s*[:#\-]?\s*([A-Z0-9\-_\/]{3,40})/i]);
  var norme = extractFieldFromBlock(block, [/(?:norme|standard|spec|specification)\s*[:#\-]?\s*((?:API|ISO|ASTM|AISI|VAM|NACE|ASME)[A-Z0-9\s\-\.\/]{2,40})/i])
            || 'API 6A Latest Edition';
  var matiere = extractFieldFromBlock(block, [/(?:matiere|matière|material|acier|steel)\s*[:#\-]?\s*([A-Z0-9\s\-\.\/]{3,60})/i])
              || (block.match(/(AISI\s*\d{4}[-\s]?\d*\s*KSI)/i) || [])[1] || '';
  var classeMat = extractFieldFromBlock(block, [/(?:classe de materiau|classe de matériau|material class|classe)\s*[:#\-]?\s*([A-Z0-9\-_\/]{2,40})/i]);
  var psl = extractFieldFromBlock(block, [/(?:PSL)\s*[:#\-]?\s*(\d+)/i]);
  var service = extractFieldFromBlock(block, [/(?:conditions de service|service)\s*[:#\-]?\s*([^\n\r]{2,60})/i])
             || (/H2S/i.test(block) ? 'H2S Services' : '');
  var testPression = (block.match(/Test de pression[^\n\r]*/i) || [''])[0].replace(/^Test de pression\s*[:#-]?\s*/i, '');

  return {
    client: client,
    produit: produit,
    qte: qte,
    estimation: estimation,
    arc: arc,
    norme: norme,
    matiere: matiere,
    classeMat: classeMat,
    psl: psl,
    service: service,
    testPression: testPression
  };
}

// ============================================================
// 12. RENDU HTML QP (dans le PDF uniquement)
// ============================================================
function renderQPHeader(wo) {
  var h = QP_STANDARD_01;
  return '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;margin-bottom:0">' +
    '<tr>' +
    '<td rowspan="3" style="border:1px solid #0a2540;padding:8px;width:45%;vertical-align:middle">' +
    '<div style="font-weight:700;font-size:13px;color:#0a2540">' + esc(h.company) + '</div>' +
    '<div style="font-size:10px;color:#374151;margin-top:2px">Code : ' + esc(h.code) + '</div>' +
    '<div style="font-size:10px;color:#374151">Indice de Rev : ' + esc(h.revIndex) + '</div>' +
    '<div style="font-size:10px;color:#374151">Date de Rev : ' + esc(h.revDate) + '</div>' +
    '</td>' +
    '<td rowspan="2" style="border:1px solid #0a2540;padding:8px;width:45%;text-align:center;vertical-align:middle">' +
    '<div style="font-weight:800;font-size:14px;color:#0a2540">' + esc(h.title) + '</div>' +
    '<div style="font-size:12px;color:#991b1b;margin-top:6px;font-weight:700">QP-' + esc(wo.id) + '</div>' +
    '</td>' +
    '<td style="border:1px solid #0a2540;padding:6px;width:10%;text-align:center;font-size:10px;font-weight:700">N° page</td>' +
    '</tr>' +
    '<tr><td style="border:1px solid #0a2540;padding:6px;text-align:center;font-size:11px">1/1</td></tr>' +
    '<tr>' +
    '<td style="border:1px solid #0a2540;padding:6px;font-size:10px;text-align:center">Edited by : QC Dep.</td>' +
    '<td style="border:1px solid #0a2540;padding:6px;font-size:10px;text-align:center">Approved by : Tech. Dep.</td>' +
    '</tr>' +
    '<tr>' +
    '<td style="border:1px solid #0a2540;padding:6px;font-size:10px;text-align:center">Signature : ____________</td>' +
    '<td style="border:1px solid #0a2540;padding:6px;font-size:10px;text-align:center">Signature : ____________</td>' +
    '<td style="border:1px solid #0a2540;padding:6px;font-size:10px;text-align:center">Stamp</td>' +
    '</tr>' +
    '</table>';
}

function renderQPNotes() {
  var notes = QP_STANDARD_01.notes;
  var html = '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:10px;margin-top:0">';
  html += '<tr><td style="border:1px solid #0a2540;padding:6px;background:#f5f7fa;font-weight:700;color:#0a2540">Notes :</td></tr>';
  notes.forEach(function(n) {
    html += '<tr><td style="border:1px solid #0a2540;padding:6px;color:#17202a">' + esc(n) + '</td></tr>';
  });
  html += '</table>';
  return html;
}

function renderQPSection(num, title, rows) {
  var html = '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:10px;margin-top:0">';
  html += '<tr><td colspan="3" style="border:1px solid #0a2540;padding:6px;background:#0a2540;color:#ffffff;font-weight:700">' + num + '. ' + esc(title) + '</td></tr>';
  if (rows && rows.length > 0) {
    rows.forEach(function(r) {
      html += '<tr>' +
        '<td style="border:1px solid #0a2540;padding:6px;width:30%;background:#f9fafb;font-weight:600;color:#0a2540">' + esc(r.label) + '</td>' +
        '<td style="border:1px solid #0a2540;padding:6px;width:70%;color:#17202a">' + esc(r.value || 'Non mentionne dans le document') + '</td>' +
        '</tr>';
    });
  } else {
    html += '<tr><td colspan="3" style="border:1px solid #0a2540;padding:6px;color:#6b7280;font-style:italic">Non mentionne dans le document</td></tr>';
  }
  html += '</table>';
  return html;
}

function renderQPApprovals() {
  return '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:10px;margin-top:0">' +
    '<tr><td colspan="3" style="border:1px solid #0a2540;padding:6px;background:#0a2540;color:#ffffff;font-weight:700">9. Approbations</td></tr>' +
    '<tr>' +
    '<td style="border:1px solid #0a2540;padding:8px;width:33%;text-align:center">QC Department<br><span style="font-size:9px;color:#6b7280">Name : ______________</span><br><span style="font-size:9px;color:#6b7280">Signature : __________</span><br><span style="font-size:9px;color:#6b7280">Date : ____ / ____ / ________</span></td>' +
    '<td style="border:1px solid #0a2540;padding:8px;width:33%;text-align:center">Tech. Department<br><span style="font-size:9px;color:#6b7280">Name : ______________</span><br><span style="font-size:9px;color:#6b7280">Signature : __________</span><br><span style="font-size:9px;color:#6b7280">Date : ____ / ____ / ________</span></td>' +
    '<td style="border:1px solid #0a2540;padding:8px;width:34%;text-align:center">Client<br><span style="font-size:9px;color:#6b7280">Name : ______________</span><br><span style="font-size:9px;color:#6b7280">Signature : __________</span><br><span style="font-size:9px;color:#6b7280">Stamp : ____________</span></td>' +
    '</tr></table>';
}

function renderCrossTableAPI6A(data, wo) {
  var html = '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:9px;margin-top:10px">';
  html += '<tr><td colspan="8" style="border:1px solid #0a2540;padding:6px;background:#0a2540;color:#ffffff;font-weight:700;font-size:11px">Tableau Croise des Exigences - QP-' + esc(wo.id) + '</td></tr>';
  html += '<tr style="background:#f5f7fa;font-weight:700">' +
    '<td style="border:1px solid #0a2540;padding:4px;width:4%">N°</td>' +
    '<td style="border:1px solid #0a2540;padding:4px;width:36%">Exigence</td>' +
    '<td style="border:1px solid #0a2540;padding:4px;width:14%">Ref. Norme</td>' +
    '<td style="border:1px solid #0a2540;padding:4px;width:7%;text-align:center">Applic.</td>' +
    '<td style="border:1px solid #0a2540;padding:4px;width:7%;text-align:center">Conforme</td>' +
    '<td style="border:1px solid #0a2540;padding:4px;width:8%;text-align:center">Non Conf.</td>' +
    '<td style="border:1px solid #0a2540;padding:4px;width:8%;text-align:center">Non Ment.</td>' +
    '<td style="border:1px solid #0a2540;padding:4px;width:16%">Observation</td>' +
    '</tr>';

  for (var i = 0; i < API_6A_REQUIREMENTS.length; i++) {
    var r = API_6A_REQUIREMENTS[i];
    var conforme = 'X';
    var nonMentionne = '';
    var nonConforme = '';
    var observation = '';

    if (r.num === 4 || r.num === 9 || (r.num >= 12 && r.num <= 15) || r.num === 17 || r.num === 18 || r.num === 19 || r.num === 20 || r.num === 26) {
      conforme = ''; nonMentionne = 'X'; observation = 'Non mentionne';
    } else if (r.num === 1) { observation = 'WO-' + wo.id; }
    else if (r.num === 2) { observation = 'Ref. note a'; }
    else if (r.num === 3) { observation = 'Ref. note b'; }
    else if (r.num === 5) { observation = data.matiere || 'Non mentionne'; }
    else if (r.num === 6) { observation = data.matiere || ''; }
    else if (r.num === 7) {
      var k = (data.matiere || '').match(/(\d+)\s*KSI/i);
      observation = k ? k[1] + ' KSI' : 'Non mentionne';
    } else if (r.num === 8) { observation = 'Non mentionne'; }
    else if (r.num === 10) { observation = 'Selon plan'; }
    else if (r.num === 11) { observation = 'Selon procedure'; }
    else if (r.num === 16) { observation = data.testPression || 'Test de pression'; }
    else if (r.num === 21) { observation = 'Selon norme'; }
    else if (r.num === 22) { observation = 'Selon procedure'; }
    else if (r.num === 23) { observation = data.psl ? 'PSL ' + data.psl : 'Non mentionne'; }
    else if (r.num === 24) { observation = data.classeMat || 'Non mentionne'; }
    else if (r.num === 25) { observation = data.service || 'H2S Services'; }
    else if (r.num === 27) { observation = 'Selon norme'; }
    else if (r.num === 28) { observation = 'Selon norme'; }
    else if (r.num === 29) { observation = 'Selon norme'; }
    else if (r.num === 30) { observation = 'Section 9'; }

    html += '<tr>' +
      '<td style="border:1px solid #0a2540;padding:4px;text-align:center">' + r.num + '</td>' +
      '<td style="border:1px solid #0a2540;padding:4px">' + esc(r.req) + '</td>' +
      '<td style="border:1px solid #0a2540;padding:4px">' + esc(r.ref) + '</td>' +
      '<td style="border:1px solid #0a2540;padding:4px;text-align:center;font-weight:700">X</td>' +
      '<td style="border:1px solid #0a2540;padding:4px;text-align:center;font-weight:700;color:#16a34a">' + conforme + '</td>' +
      '<td style="border:1px solid #0a2540;padding:4px;text-align:center;font-weight:700;color:#dc2626">' + nonConforme + '</td>' +
      '<td style="border:1px solid #0a2540;padding:4px;text-align:center;font-weight:700;color:#f59e0b">' + nonMentionne + '</td>' +
      '<td style="border:1px solid #0a2540;padding:4px">' + esc(observation) + '</td>' +
      '</tr>';
  }
  html += '</table>';
  return html;
}

function renderSingleQP(wo, block, globalContent) {
  var s = buildQPSectionsForWO(wo, block, globalContent);
  var html = '<div class="qp-document" data-wo="' + esc(wo.id) + '" style="page-break-after:always;margin:0 0 40px 0;background:#ffffff;border:2px solid #0a2540;border-radius:4px;padding:0">';
  html += renderQPHeader(wo);
  html += renderQPNotes();
  html += renderQPSection(1, QP_STANDARD_01.sections[0].title, [
    { label: 'Client', value: s.client },
    { label: 'Commande ARC', value: s.arc },
    { label: 'N° WO', value: wo.id },
    { label: 'Produit', value: s.produit },
    { label: 'Quantite', value: s.qte },
    { label: 'Norme applicable', value: s.norme }
  ]);
  html += renderQPSection(2, QP_STANDARD_01.sections[1].title, [
    { label: 'Work Order', value: 'WO-' + wo.id + ' - Document Reference FO-05-R&D' },
    { label: 'JOB', value: wo.id },
    { label: 'Norme principale', value: s.norme },
    { label: 'Procedure', value: 'FO-24-PRO Rev. 6' }
  ]);
  html += renderQPSection(3, QP_STANDARD_01.sections[2].title, [
    { label: 'MTC', value: s.matiere ? 'MTC requis pour ' + s.matiere : 'MTC requis' },
    { label: 'Tracabilite', value: 'Tracabilite complete exigee' },
    { label: 'Specification matiere', value: s.matiere }
  ]);
  html += renderQPSection(4, QP_STANDARD_01.sections[3].title, [
    { label: 'Etapes', value: 'Decoupe - Usinage - Assemblage - Controle final' },
    { label: 'POS', value: 'POS par etape selon FO-05-R&D' },
    { label: 'Parametres cles', value: 'Selon norme applicable' }
  ]);
  html += renderQPSection(5, QP_STANDARD_01.sections[4].title, [
    { label: 'Dimensionnel', value: 'Inspection dimensionnelle a chaque etape' },
    { label: 'Visuel', value: 'Inspection visuelle 100%' },
    { label: 'NDT', value: 'Si requis par norme' },
    { label: 'Test pression', value: s.testPression || 'Si applicable selon norme' }
  ]);
  html += renderQPSection(6, QP_STANDARD_01.sections[5].title, [
    { label: 'TPI', value: 'Selon contrat client' },
    { label: 'Organisme', value: 'A designer par le client' }
  ]);
  html += renderQPSection(7, QP_STANDARD_01.sections[6].title, [
    { label: 'COC', value: 'Certificat de conformite requis' },
    { label: 'MTC', value: 'Material Test Certificate requis' },
    { label: 'Autres', value: 'Documents supplementaires factures' }
  ]);
  html += renderQPSection(8, QP_STANDARD_01.sections[7].title, [
    { label: 'Procedure NCR', value: 'PR-01-PRO' },
    { label: 'Enregistrement', value: 'Registre NCR obligatoire' },
    { label: 'Actions correctives', value: 'Definies selon PR-01-PRO' }
  ]);
  html += renderQPApprovals();
  html += renderCrossTableAPI6A(s, wo);
  html += '</div>';
  return html;
}

function renderAllQPs(wos, content) {
  if (!wos || wos.length === 0) return '';
  var html = '<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:14px;margin:0 0 20px 0">' +
    '<div style="color:#1e40af;font-weight:800;font-size:14px">📄 ' + wos.length + ' Work Order(s) detecte(s)</div>' +
    '<div style="font-size:12px;color:#1e3a8a;margin-top:4px">Un QP specifique conforme QP STANDARD 01 est genere pour chacun. Cliquez sur "Telecharger PDF" pour obtenir le document complet.</div>' +
    '<div style="margin-top:8px;font-size:12px;color:#1e3a8a">' + wos.map(function(w) { return '<span style="display:inline-block;background:#ffffff;border:1px solid #1e5aa8;color:#1e5aa8;padding:3px 10px;border-radius:12px;margin:2px 4px 2px 0;font-weight:700">QP-' + esc(w.id) + '</span>'; }).join('') + '</div>' +
    '</div>';

  wos.forEach(function(wo) {
    var block = extractWoBlock(content, wo, wos);
    html += renderSingleQP(wo, block, content);
  });

  return html;
}

// ============================================================
// 13. ENRICHISSEMENT
// ============================================================
async function enrichAnswer(answer, question, domain, lang, mongoose, mode, originalContent) {
  try {
    mode = mode || 'ask';
    var contentSource = originalContent || '';
    var isQP = isQualityPlanRequest(question, contentSource);
    var realDomain = isQP ? 'Plan Qualite' : detectDomain(question, domain);
    var isLitRel = isLiteraryOrReligious(realDomain);
    var isAnalytical = isAnalyticalDomain(realDomain);
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

    var keyPoints = extractKeyPoints(answer);
    var enriched = '';

    // v9.0 : QP complet cache (invisible dans le chat, utilise uniquement par le PDF)
    if (isQP) {
      var wos = extractWorkOrders(question, contentSource);
      if (wos.length > 0) {
        var qpHtml = renderAllQPs(wos, contentSource);
        // Enveloppe dans un div cache : visible uniquement par le bouton PDF
        enriched += '<div class="qp-hidden" style="display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;position:absolute!important;left:-99999px!important" aria-hidden="true">' + qpHtml + '</div>';

        // Message utilisateur : nombre de QP + instruction PDF
        enriched += '<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:18px;margin:0 0 20px 0">';
        enriched += '<div style="color:#1e40af;font-weight:800;font-size:15px">📄 ' + wos.length + ' Work Order(s) detecte(s)</div>';
        enriched += '<div style="font-size:13px;color:#1e3a8a;margin-top:6px">Un QP specifique conforme QP STANDARD 01 a ete genere pour chacun. Cliquez sur <strong>Telecharger PDF</strong> sous ce message pour obtenir les ' + wos.length + ' QP dans un document A4 formate.</div>';
        enriched += '<div style="margin-top:10px;font-size:13px;color:#1e3a8a">' + wos.map(function(w) { return '<span style="display:inline-block;background:#ffffff;border:1px solid #1e5aa8;color:#1e5aa8;padding:4px 12px;border-radius:14px;margin:3px 5px 3px 0;font-weight:700">QP-' + esc(w.id) + '</span>'; }).join('') + '</div>';
        enriched += '</div>';
      } else {
        enriched += '<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:14px;margin:0 0 20px 0">' +
          '<div style="color:#991b1b;font-weight:700">⚠️ Aucun WO detecte dans le document</div>' +
          '<div style="font-size:12px;color:#7f1d1d;margin-top:4px">Verifiez que le document contient des Work Orders (WO 28836, WO-28836, Work Order 28836...).</div></div>';
      }
    } else {
      // SECTION : Reponse detaillee pour questions normales
      enriched += '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:0 0 20px 0">';
      enriched += '<h3 style="color:#0a2540;font-size:17px;font-weight:700;margin:0 0 16px 0;padding-bottom:10px;border-bottom:2px solid #1e5aa8">Reponse detaillee</h3>';
      enriched += '<div style="font-size:14px;color:#17202a">' + formatForHTML(answer) + '</div>';
      enriched += '</div>';

      if (keyPoints.length > 0) {
        enriched += '<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:18px;margin:0 0 20px 0">';
        enriched += '<h4 style="margin:0 0 12px 0;color:#1e40af;font-size:15px;font-weight:700">Points cles a retenir</h4>';
        enriched += '<ul style="margin:0;padding-left:24px;color:#1e3a8a;font-size:14px;line-height:1.7">';
        keyPoints.forEach(function(p) { enriched += '<li style="margin-bottom:8px">' + esc(p) + '</li>'; });
        enriched += '</ul></div>';
      }
    }

    // Fiche technique
    enriched += generateTechSheet(realDomain, docs.length, semanticScore, scholars, judgeResult, mode);

    // Agents
    enriched += '<div style="background:#f5f7fa;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:20px 0;font-size:12px;color:#6b7280;text-align:center">';
    enriched += '<strong style="color:#0a2540">Agents IA impliques :</strong> MBA-CONSULT AI CORE - OpenRouter - Semantic Engine - Language Fix - Voice Engine - <strong style="color:#16a34a">Juge Claude (validation active)</strong>';
    if (isQP) enriched += ' - <strong style="color:#f59e0b">QP STANDARD 01 par WO + Tableau croise API 6A</strong>';
    if (mode === 'document') enriched += ' - <strong style="color:#1e5aa8">Traitement exclusif du document colle</strong>';
    enriched += '</div>';

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

  var AutoFeedDoc = null;
  try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { AutoFeedDoc = null; }

  async function ragPreprocessAsk(req, res, next) {
    if (!req.body || !req.body.question) return next();
    if (!AutoFeedDoc) {
      try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { return next(); }
    }
    try {
      var questionOriginale = req.body.question;
      var isQP = isQualityPlanRequest(questionOriginale, '');
      var prefix = '';
      if (isQP) {
        prefix = '[INSTRUCTION SYSTEME - QP STANDARD 01 PAR WO]\n' +
          'Si la question contient des Work Orders, genere UN QP SPECIFIQUE PAR WO.\n' +
          'Reference : QP-<N° WO>.\n\n';
      }
      var rag = await buildRagContext(AutoFeedDoc, questionOriginale, 3, 3500);
      if (rag.context && rag.context.length > 200) {
        req.body.question = prefix + questionOriginale +
          '\n\n[EXTRAITS DOCUMENTAIRES]\n' + rag.context + '\n[FIN EXTRAITS]\n\nQuestion : ' + questionOriginale;
        req._ragDocs = rag.docs;
      } else if (isQP) {
        req.body.question = prefix + questionOriginale;
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

      var isQP = isQualityPlanRequest(questionUser, content);
      var prefix = '';

      if (isQP) {
        prefix =
          '[INSTRUCTION SYSTEME OBLIGATOIRE - QP STANDARD 01 PAR WO]\n' +
          'Genere UN QP SPECIFIQUE POUR CHAQUE WO present dans le document.\n' +
          'Chaque QP doit contenir : en-tete GMPI FO-24-PRO Rev 6, notes a/b/c, 9 sections, ligne JOB, tableau croise API 6A, approbations.\n' +
          'Reference : QP-<N° WO>.\n' +
          'Si une donnee manque, ecrire "Non mentionne dans le document".\n' +
          '[FIN INSTRUCTION]\n\n';
      }

      req.body.question = prefix + (questionUser || 'Genere le QP pour chaque WO present dans le document.');

      req.body.content =
        '[INSTRUCTION SYSTEME - DOCUMENT DE REFERENCE STRICT]\n' +
        'Reponds EXCLUSIVEMENT a partir du contenu ci-dessous.\n\n' +
        '=== DEBUT DU DOCUMENT ===\n' + content + '\n=== FIN DU DOCUMENT ===\n';

      console.log('[answer-enricher] v9.0 - Mode DOCUMENT ' + (isQP ? '+ QP par WO (cache HTML)' : '') + ' - ' + content.length + ' car.');
    }
    next();
  }

  function postprocess(mode) {
    return function(req, res, next) {
      var originalJson = res.json.bind(res);
      res.json = function(data) {
        if (!data || !data.answer) return originalJson(data);

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
            if (isQualityPlanRequest(questionPourDetection, contenuPourDetection)) {
              var wos = extractWorkOrders(questionPourDetection, contenuPourDetection);
              data.qpStandard01 = true;
              data.workOrdersDetected = wos.map(function(w) { return 'QP-' + w.id; });
            }
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

  console.log('[answer-enricher] v9.0 charge - multi-WO robuste + HTML masque + PDF propre');
};
