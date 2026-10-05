// ============================================================
// ANSWER-ENRICHER.JS
// Version v13.1 - Detection JOB pattern ARC + PDF propre
// ============================================================

'use strict';

// ============================================================
// 0. MODELE QP STANDARD 01 (GMPI - FO-24-PRO Rev 6)
// ============================================================
var QP_STANDARD_01 = {
  company: 'Global Metallic Product Industries (GMPI)',
  code: 'FO-24-PRO',
  revIndex: '6',
  revDate: '03/08/2017',
  title: 'Quality Control Plan',
  notes: [
    'a) For operation instruction, refer to Work Order (WO) Document Reference FO-05-R&D',
    'b) Any NCR detected shall be treated according to procedure PR-01-PRO',
    'c) Thread inspection procedures according to applicable standard'
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
// 5. DETECTION QP + EXTRACTION JOB (v13.1)
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

  // Pattern 1 : "As per our estimate" suivi d'un N° 5 chiffres + qte + date
  var arcRegex = /As\s+per\s+our\s+estimate[\s\S]{0,50}?(\d{5})\s+(\d{1,3})\s+(\d{2}\/\d{2}\/\d{2,4})/gi;
  var m;
  while ((m = arcRegex.exec(text)) !== null) {
    var num = m[1];
    if (seen[num]) continue;
    seen[num] = true;
    wos.push({ id: num, raw: num, qte: m[2], date: m[3], matchIndex: m.index, source: 'ARC-estimate' });
  }

  // Pattern 2 (fallback) : "estimate" puis N° 5 chiffres apres
  if (wos.length === 0) {
    var estimateRegex = /estimate/gi;
    var em;
    while ((em = estimateRegex.exec(text)) !== null) {
      var after = text.slice(em.index, em.index + 500);
      var numMatch = after.match(/(\d{5})\s+(\d{1,3})\s+(\d{2}\/\d{2}\/\d{2,4})/);
      if (numMatch) {
        var n1 = numMatch[1];
        if (seen[n1]) continue;
        seen[n1] = true;
        wos.push({ id: n1, raw: n1, qte: numMatch[2], date: numMatch[3], matchIndex: em.index, source: 'ARC-fallback' });
      }
    }
  }

  // Pattern 3 (fallback ultime) : "NNNNN Qte Date" partout
  if (wos.length === 0) {
    var genRegex = /\b(\d{5})\s+(\d{1,3})\s+(\d{2}\/\d{2}\/\d{2,4})\b/g;
    var gm;
    while ((gm = genRegex.exec(text)) !== null) {
      var n2 = gm[1];
      var nInt = parseInt(n2, 10);
      if (nInt < 20000 || nInt > 40000) continue;
      if (seen[n2]) continue;
      seen[n2] = true;
      wos.push({ id: n2, raw: n2, qte: gm[2], date: gm[3], matchIndex: gm.index, source: 'generic' });
    }
  }

  return wos;
}

function extractWoBlock(content, wo, allWos) {
  if (!content || !wo) return content || '';
  var numStr = String(wo.raw);

  // Chercher "estimate ... numStr"
  var re = new RegExp('estimate[\\s\\S]{0,50}?' + numStr, 'i');
  var match = content.match(re);
  var idx = match ? match.index : content.indexOf(numStr);
  if (idx === -1) return content.slice(0, 8000);

  var nextIdx = content.length;
  for (var i = 0; i < allWos.length; i++) {
    var other = allWos[i];
    if (other.raw === wo.raw) continue;
    var otherRe = new RegExp('estimate[\\s\\S]{0,50}?' + other.raw, 'i');
    var otherMatch = content.match(otherRe);
    if (otherMatch && otherMatch.index > idx && otherMatch.index < nextIdx) {
      nextIdx = otherMatch.index;
    }
  }

  var start = Math.max(0, idx - 1500);
  return content.slice(start, Math.min(nextIdx, idx + 6000));
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

// ============================================================
// 9. CHIFFRES / SCHOLARS
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
// 10. EXTRACTION DONNEES ARC
// ============================================================
function extractARCData(block, globalContent, wo) {
  var client = 'Non mentionne dans le document';
  var mClient = globalContent.match(/(PETROLEUM\s+EQUIPMENT\s+AND\s+SUPPLIES\s+FZE|ENI\s+TUNISIA[^\n\r]*|[A-Z][A-Z\s&\.]{5,50}(?:FZE|LLC|LTD|B\.V\.|SA|SARL|GMBH))/);
  if (mClient) client = mClient[1].trim();

  var produit = '';
  var mProd = block.match(/MANUFACTURE\s+([\s\S]{5,300}?)(?=As\s+per\s+our\s+estimate)/i);
  if (mProd) {
    produit = mProd[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/SUPPLY MATERIAL & MANUFACTURE/i, '').replace(/As per our estimate[^\n]*/i, '').trim();
  }
  if (!produit) {
    var mProd2 = block.match(/MANUFACTURE\s+([\s\S]{5,300}?)\d{5}\s+\d/i);
    if (mProd2) produit = mProd2[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (!produit) {
    var mProd3 = block.match(/((?:INTEGRAL|FLANGE|WECO)[\s\S]{5,150}?)(?=\d{5}\s+\d|As per|Page|$)/i);
    if (mProd3) produit = mProd3[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (!produit) produit = 'Non mentionne dans le document';
  produit = produit.slice(0, 250);

  var qte = wo.qte || '';
  if (!qte) {
    var mQty = block.match(/\b(\d{1,3})\s+\d{2}\/\d{2}\/\d{2}/);
    if (mQty) qte = mQty[1];
  }

  var norme = 'API 6A Latest Edition';
  var mNorme = globalContent.match(/Manufactured According to\s+([^\n\r]+)/i);
  if (mNorme) norme = mNorme[1].trim();

  var matiere = '';
  var mMatiere = block.match(/Material Grade:\s*([^\n\r]+)/i);
  if (mMatiere) matiere = mMatiere[1].trim();
  if (!matiere) {
    var mAISI = block.match(/(AISI\s*\d{4}[-\s]?\d*\s*KSI?)/i);
    if (mAISI) matiere = mAISI[1];
  }

  var classeMat = '';
  var mClasse = block.match(/Material Class:\s*([A-Z0-9\-_]+)/i);
  if (mClasse) classeMat = mClasse[1];

  var psl = '';
  var mPSL = block.match(/PSL\s*-?\s*(\d)/i);
  if (mPSL) psl = mPSL[1];

  var testPression = '';
  var mPression = block.match(/(?:Working pressure|Working Pressure):\s*([^\n\r]+)/i);
  if (mPression) testPression = mPression[1].trim();
  if (!testPression) {
    var mPSI = block.match(/(\d{3,5}\s*(?:psi|PSI|K))/);
    if (mPSI) testPression = 'Test de pression a ' + mPSI[1];
  }

  var service = '';
  if (/H2S/i.test(block)) service = 'H2S Services';

  var estimation = '';
  var mEstim = block.match(/estimate n[°º]?\s*(\d+)/i) || globalContent.match(/estimate n[°º]?\s*(\d+)/i);
  if (mEstim) estimation = mEstim[1];

  var arc = '';
  var mARC = globalContent.match(/\b(\d{10})\b/);
  if (mARC) arc = mARC[1];

  return {
    client: client,
    produit: produit,
    qte: qte,
    norme: norme,
    matiere: matiere,
    classeMat: classeMat,
    psl: psl,
    testPression: testPression,
    service: service,
    estimation: estimation,
    arc: arc
  };
}

// ============================================================
// 11. RENDU HTML QP
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
    '<td style="border:1px solid #0a2540;padding:6px;width:10%;text-align:center;font-size:10px;font-weight:700">N. page</td>' +
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
  html += '<tr><td colspan="2" style="border:1px solid #0a2540;padding:6px;background:#0a2540;color:#ffffff;font-weight:700">' + num + '. ' + esc(title) + '</td></tr>';
  if (rows && rows.length > 0) {
    rows.forEach(function(r) {
      html += '<tr>' +
        '<td style="border:1px solid #0a2540;padding:6px;width:30%;background:#f9fafb;font-weight:600;color:#0a2540">' + esc(r.label) + '</td>' +
        '<td style="border:1px solid #0a2540;padding:6px;width:70%;color:#17202a">' + esc(r.value || 'Non mentionne dans le document') + '</td>' +
        '</tr>';
    });
  } else {
    html += '<tr><td colspan="2" style="border:1px solid #0a2540;padding:6px;color:#6b7280;font-style:italic">Non mentionne dans le document</td></tr>';
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
    '<td style="border:1px solid #0a2540;padding:4px;width:4%">N.</td>' +
    '<td style="border:1px solid #0a2540;padding:4px;width:36%">Exigence (QC STANDARD 01 / API 6A)</td>' +
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
  var data = extractARCData(block, globalContent, wo);

  var html = '<div class="qp-document" data-qp="QP-' + esc(wo.id) + '" style="page-break-before:always;page-break-after:always;background:#ffffff;border:2px solid #0a2540;border-radius:4px;padding:0;margin:0 0 30px 0">';
  html += renderQPHeader(wo);
  html += renderQPNotes();
  html += renderQPSection(1, 'Informations generales', [
    { label: 'Client', value: data.client },
    { label: 'Commande ARC', value: data.arc },
    { label: 'N. WO', value: wo.id },
    { label: 'Produit', value: data.produit },
    { label: 'Quantite', value: data.qte },
    { label: 'Norme applicable', value: data.norme }
  ]);
  html += renderQPSection(2, 'References documentaires', [
    { label: 'Work Order', value: 'WO-' + wo.id + ' - Document Reference FO-05-R&D' },
    { label: 'JOB', value: wo.id },
    { label: 'Estimation', value: data.estimation ? 'n.' + data.estimation : '' },
    { label: 'Norme principale', value: data.norme },
    { label: 'Procedure', value: 'FO-24-PRO Rev. 6' }
  ]);
  html += renderQPSection(3, 'Matiere premiere', [
    { label: 'MTC', value: data.matiere ? 'MTC requis pour ' + data.matiere : 'MTC requis (AISI 4130-75KSI ou equivalent)' },
    { label: 'Tracabilite', value: 'Tracabilite complete exigee' },
    { label: 'Specification matiere', value: data.matiere },
    { label: 'Classe de materiau', value: data.classeMat },
    { label: 'PSL', value: data.psl ? 'PSL ' + data.psl : '' }
  ]);
  html += renderQPSection(4, 'Processus de fabrication', [
    { label: 'Etapes', value: 'Decoupe - Usinage - Assemblage - Controle final' },
    { label: 'POS', value: 'POS par etape selon FO-05-R&D' },
    { label: 'Parametres cles', value: 'Selon norme applicable' }
  ]);
  html += renderQPSection(5, 'Points de controle qualite', [
    { label: 'Dimensionnel', value: 'Inspection dimensionnelle a chaque etape' },
    { label: 'Visuel', value: 'Inspection visuelle 100%' },
    { label: 'NDT', value: 'Si requis par norme' },
    { label: 'Test pression', value: data.testPression || 'Si applicable selon norme' }
  ]);
  html += renderQPSection(6, 'Inspection par tiers (TPI)', [
    { label: 'TPI', value: 'Selon contrat client' },
    { label: 'Organisme', value: 'A designer par le client' }
  ]);
  html += renderQPSection(7, 'Documents livrables', [
    { label: 'COC', value: 'Certificat de conformite requis' },
    { label: 'MTC', value: 'Material Test Certificate requis' },
    { label: 'Autres', value: 'Documents supplementaires factures' }
  ]);
  html += renderQPSection(8, 'Gestion des non-conformites', [
    { label: 'Procedure NCR', value: 'PR-01-PRO' },
    { label: 'Enregistrement', value: 'Registre NCR obligatoire' },
    { label: 'Actions correctives', value: 'Definies selon PR-01-PRO' }
  ]);
  html += renderQPApprovals();
  html += renderCrossTableAPI6A(data, wo);
  html += '</div>';
  return html;
}

function renderAllQPs(wos, content) {
  if (!wos || wos.length === 0) return '';
  var html = '';
  wos.forEach(function(wo) {
    var block = extractWoBlock(content, wo, wos);
    html += renderSingleQP(wo, block, content);
  });
  return html;
}

// ============================================================
// 12. ENRICHISSEMENT
// ============================================================
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

    if (isQP) {
      var wos = extractWorkOrders(question, contentSource);
      if (wos.length > 0) {
        enriched += '<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:18px;margin:0 0 20px 0">';
        enriched += '<div style="color:#1e40af;font-weight:800;font-size:15px">' + wos.length + ' Work Order(s) detecte(s)</div>';
        enriched += '<div style="font-size:13px;color:#1e3a8a;margin-top:6px">' + wos.length + ' QP conforme(s) QP STANDARD 01 genere(s). Cliquez sur Telecharger PDF pour obtenir le document A4 formate.</div>';
        enriched += '<div style="margin-top:10px;font-size:13px;color:#1e3a8a">' + wos.map(function(w) { return '<span style="display:inline-block;background:#ffffff;border:1px solid #1e5aa8;color:#1e5aa8;padding:4px 12px;border-radius:14px;margin:3px 5px 3px 0;font-weight:700">QP-' + esc(w.id) + '</span>'; }).join('') + '</div>';
        enriched += '</div>';
        enriched += '<div class="qp-print-container" style="background:#ffffff;margin:0 0 20px 0">' + renderAllQPs(wos, contentSource) + '</div>';
      } else {
        enriched += '<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:14px;margin:0 0 20px 0">' +
          '<div style="color:#991b1b;font-weight:700">Aucun JOB detecte dans le document</div>' +
          '<div style="font-size:12px;color:#7f1d1d;margin-top:4px">Verifiez que le document contient des lignes avec le mot estimate suivies d un numero de JOB a 5 chiffres.</div></div>';
      }
    } else {
      enriched += '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:0 0 20px 0">';
      enriched += '<h3 style="color:#0a2540;font-size:17px;font-weight:700;margin:0 0 16px 0;padding-bottom:10px;border-bottom:2px solid #1e5aa8">Reponse detaillee</h3>';
      enriched += '<div style="font-size:14px;color:#17202a;white-space:pre-wrap">' + esc(answer) + '</div>';
      enriched += '</div>';
    }

    return enriched;

  } catch (e) {
    console.warn('[answer-enricher] Erreur :', e.message);
    return answer;
  }
}

// ============================================================
// 13. MIDDLEWARE EXPRESS
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
      console.log('[answer-enricher] v13.1 Mode DOCUMENT - ' + content.length + ' car.');
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

  console.log('[answer-enricher] v13.1 charge - detection JOB pattern ARC');
};
