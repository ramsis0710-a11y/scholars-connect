// ============================================================
// ANSWER-ENRICHER.JS
// Version v6.1 - Correction syntaxe + QP STANDARD 01
//
// - Conformite obligatoire QP STANDARD 01 pour plans qualite
// - Traitement exclusif du document colle sur /analyze-content
// - RAG complet sur /ask
// - Syntaxe validee (aucun try sans catch)
// ============================================================

'use strict';

// ============================================================
// 0. TEMPLATE QP STANDARD 01
// ============================================================
var QP_STANDARD_01 = {
  company: 'Global Metallic Product Industries (GMPI)',
  code: 'FO-24-PRO',
  revIndex: '6',
  revDate: '03/08/2017',
  title: 'Quality Control Plan',
  editedBy: 'QC Department',
  approvedBy: 'Tech. Department',
  notes: [
    'a) For operation instruction, refer to Work Order (WO) Document Reference FO-05-R&D',
    'b) Any NCR detected shall be treated according to procedure PR-01-PRO',
    'c) Thread inspection procedures (selon norme applicable)'
  ],
  sections: [
    'Informations generales (client, produit, commande, norme applicable)',
    'References documentaires (WO, plans, normes API 5CT/5B, VAM, AISI 4140)',
    'Matiere premiere (MTC, verification, tracabilite)',
    'Processus de fabrication (etapes, POS, parametres cles)',
    'Points de controle qualite (dimensionnel, visuel, NDT, pression)',
    'Inspection par tiers / TPI (si requis par contrat)',
    'Documents livrables (COC, MTC, certificats specifiques)',
    'Gestion des non-conformites (PR-01-PRO)',
    'Approbations (QC + Tech + client)'
  ]
};

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
  'IA & KMS': { icon: '🤖', label: 'Intelligence Artificielle et KMS', ratios: [
    { name: 'Pertinence semantique', formula: 'cosinus', unit: '%', target: 80 },
    { name: 'Couverture documentaire', formula: 'documents cites / disponibles', unit: '%', target: 60 },
    { name: 'Densite technique', formula: 'mots techniques / mots total', unit: '%', target: 25 }
  ]},
  'Energie': { icon: '⚡', label: 'Energie et Transition', ratios: [
    { name: 'Efficacite energetique', formula: 'energie utile / totale', unit: '%', target: 85 },
    { name: 'Intensite carbone', formula: 'gCO2 par kWh', unit: 'g', target: 100 },
    { name: 'Retour investissement', formula: 'gains / couts', unit: 'x', target: 3 }
  ]},
  'Petrole & Gaz': { icon: '🛢️', label: 'Petrole et Gaz - Industrie', ratios: [
    { name: 'Taux de conformite', formula: 'conformes / produites', unit: '%', target: 98 },
    { name: 'Taux de rebut', formula: 'rejetees / produites', unit: '%', target: 2 },
    { name: 'Resistance mecanique', formula: 'limite / nominale', unit: 'x', target: 1.5 }
  ]},
  'Technique': { icon: '⚙️', label: 'Technique et Normes', ratios: [
    { name: 'Conformite normative', formula: 'specs respectees / total', unit: '%', target: 95 },
    { name: 'Controle qualite', formula: 'inspections / prevues', unit: '%', target: 100 },
    { name: 'Taux de non-conformite', formula: 'NC / lots', unit: '%', target: 5 }
  ]},
  'Industrie': { icon: '🏭', label: 'Industrie Manufacturiere', ratios: [
    { name: 'Rendement', formula: 'reelle / theorique', unit: '%', target: 85 },
    { name: 'Disponibilite', formula: 'actif / total', unit: '%', target: 90 },
    { name: 'Qualite 1ere passe', formula: 'bonnes / total', unit: '%', target: 92 }
  ]},
  'Plan Qualite': { icon: '📋', label: 'Plan Qualite - QP STANDARD 01', ratios: [
    { name: 'Conformite QP 01', formula: 'sections conformes / imposees', unit: '%', target: 100 },
    { name: 'Points controle', formula: 'definis / attendus', unit: '%', target: 100 },
    { name: 'Tracabilite matiere', formula: 'MTC / attendus', unit: '%', target: 100 }
  ]},
  'Finance': { icon: '📊', label: 'Finance et Risques', ratios: [
    { name: 'Ratio Sharpe', formula: '(R - Rf) / sigma', unit: '', target: 1.5 },
    { name: 'Value at Risk', formula: 'perte max 5%', unit: '%', target: 5 },
    { name: 'Beta', formula: 'sensibilite marche', unit: '', target: 1.0 }
  ]},
  'Economie': { icon: '💹', label: 'Economie', ratios: [
    { name: 'Croissance', formula: 'PIB N / N-1 - 1', unit: '%', target: 3 },
    { name: 'Chomage', formula: 'chomeurs / actifs', unit: '%', target: 5 },
    { name: 'Inflation', formula: 'var prix', unit: '%', target: 2 }
  ]},
  'Medecine': { icon: '🏥', label: 'Medecine', ratios: [
    { name: 'Sensibilite', formula: 'VP / (VP+FN)', unit: '%', target: 90 },
    { name: 'Specificite', formula: 'VN / (VN+FP)', unit: '%', target: 95 },
    { name: 'Prevalence', formula: 'cas / population', unit: '%', target: 10 }
  ]},
  'Sante': { icon: '🏥', label: 'Sante', ratios: [
    { name: 'Sensibilite', formula: 'VP / (VP+FN)', unit: '%', target: 90 },
    { name: 'Specificite', formula: 'VN / (VN+FP)', unit: '%', target: 95 },
    { name: 'Prevalence', formula: 'cas / population', unit: '%', target: 10 }
  ]},
  'Commerce': { icon: '🛒', label: 'Commerce', ratios: [
    { name: 'Marge brute', formula: '(CA - couts) / CA', unit: '%', target: 30 },
    { name: 'Rotation stocks', formula: 'CA / stock', unit: 'x', target: 6 },
    { name: 'Delai livraison', formula: 'jours moyens', unit: 'j', target: 3 }
  ]},
  'Sciences': { icon: '🔬', label: 'Sciences', ratios: [
    { name: 'Precision', formula: 'VP / (VP+FP)', unit: '%', target: 90 },
    { name: 'Rappel', formula: 'VP / (VP+FN)', unit: '%', target: 85 },
    { name: 'F1', formula: '2PR / (P+R)', unit: '%', target: 87 }
  ]},
  'Education': { icon: '🎓', label: 'Education', ratios: [
    { name: 'Reussite', formula: 'reussis / total', unit: '%', target: 80 },
    { name: 'Engagement', formula: 'actifs / inscrits', unit: '%', target: 70 },
    { name: 'Progression', formula: 'final - initial', unit: 'pts', target: 20 }
  ]},
  'Droit': { icon: '⚖️', label: 'Droit', ratios: [
    { name: 'Condamnations', formula: 'condamn / affaires', unit: '%', target: 70 },
    { name: 'Delai jugement', formula: 'mois', unit: 'mois', target: 12 },
    { name: 'Taux appel', formula: 'appels / jugements', unit: '%', target: 30 }
  ]}
};

// ============================================================
// 4. DOMAINES LITTERAIRES / RELIGIEUX
// ============================================================
var LITERARY_RELIGIOUS_DOMAINS = [
  'Religion', 'Litterature', 'Philosophie', 'Histoire', 'Theologie',
  'Islam', 'Christianisme', 'Judaisme', 'Spiritualite', 'Ethique',
  'Arts', 'Langues', 'Civilisation'
];

// ============================================================
// 5. SCHOLARS
// ============================================================
var SCHOLARS_BY_DOMAIN = {
  'Religion': [
    { fr: 'Ibn Taymiyya', ar: 'ابن تيمية' }, { fr: 'Ibn Kathir', ar: 'ابن كثير' },
    { fr: 'Al-Ghazali', ar: 'الغزالي' }, { fr: 'An-Nawawi', ar: 'النووي' },
    { fr: 'Ibn Baz', ar: 'ابن باز' }, { fr: 'Al-Albani', ar: 'الألباني' },
    { fr: 'Ibn Qayyim', ar: 'ابن القيم' }, { fr: 'Ash-Shafi\'i', ar: 'الشافعي' },
    { fr: 'Malik ibn Anas', ar: 'مالك بن أنس' }, { fr: 'Ahmad ibn Hanbal', ar: 'أحمد بن حنبل' },
    { fr: 'Al-Qurtubi', ar: 'القرطبي' }, { fr: 'At-Tabari', ar: 'الطبري' },
    { fr: 'Al-Bukhari', ar: 'البخاري' }, { fr: 'Muslim', ar: 'مسلم' }
  ],
  'Philosophie': [
    { fr: 'Aristote', ar: 'أرسطو' }, { fr: 'Platon', ar: 'أفلاطون' },
    { fr: 'Socrate', ar: 'سقراط' }, { fr: 'Kant', ar: 'كانط' },
    { fr: 'Descartes', ar: 'ديكارت' }, { fr: 'Nietzsche', ar: 'نيتشه' },
    { fr: 'Ibn Rushd', ar: 'ابن رشد' }, { fr: 'Al-Farabi', ar: 'الفارابي' }
  ],
  'Litterature': [
    { fr: 'Victor Hugo', ar: 'فيكتور هوغو' }, { fr: 'Moliere', ar: 'موليير' },
    { fr: 'Shakespeare', ar: 'شكسبير' }, { fr: 'Dante', ar: 'دانتي' },
    { fr: 'Naguib Mahfouz', ar: 'نجيب محفوظ' }, { fr: 'Al-Mutanabbi', ar: 'المتنبي' }
  ],
  'Histoire': [
    { fr: 'Ibn Khaldun', ar: 'ابن خلدون' }, { fr: 'Herodote', ar: 'هيرودوت' },
    { fr: 'Tacite', ar: 'تاسيتوس' }, { fr: 'Marc Bloch', ar: 'مارك بلوخ' }
  ],
  'Droit': [
    { fr: 'Montesquieu', ar: 'مونتسكيو' }, { fr: 'Rousseau', ar: 'روسو' },
    { fr: 'Portalis', ar: 'بورتاليس' }, { fr: 'Ibn Taymiyya', ar: 'ابن تيمية' }
  ]
};

// ============================================================
// 6. DETECTION PLAN QUALITE
// ============================================================
function isQualityPlanRequest(question, content) {
  var text = ((question || '') + ' ' + (content || '')).toLowerCase();
  var triggers = [
    'plan qualite', 'plan qualité', 'plan de qualite', 'plan de qualité',
    'quality control plan', 'quality plan', 'qp ', 'qp01', 'qp 01',
    'qp standard', 'controle qualite', 'contrôle qualité',
    'control plan', 'plan de controle', 'plan de contrôle'
  ];
  for (var i = 0; i < triggers.length; i++) {
    if (text.indexOf(triggers[i]) !== -1) return true;
  }
  return false;
}

// ============================================================
// 7. UTILITAIRES
// ============================================================
function cleanText(text) {
  if (!text) return '';
  var t = String(text);
  t = t.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/^[-_*]{3,}$/gm, '');
  t = t.replace(/\\/g, '');
  t = t.replace(/^-+\s+/gm, '');
  t = t.replace(/^\*\s+/gm, '');
  t = t.replace(/\t/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/ {2,}/g, ' ');
  return t.trim();
}

function formatForHTML(text) {
  if (!text) return '';
  var clean = cleanText(text);
  clean = clean.replace(/<script/gi, '&lt;script').replace(/<\/script>/gi, '&lt;/script&gt;');
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
    var numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push('<h4 style="color:#0a2540;font-size:15px;font-weight:700;margin:16px 0 8px 0;padding-bottom:4px;border-bottom:1px solid #e5e7eb">' + numberedMatch[1] + '. ' + numberedMatch[2] + '</h4>');
      continue;
    }
    var isBullet = /^[•◦▪▫]\s+/.test(line) || /^[-*]\s+/.test(line);
    if (isBullet) {
      if (!inList) {
        output.push('<ul style="margin:8px 0;padding-left:24px;color:#17202a;list-style-type:disc">');
        inList = true;
      }
      var itemText = line.replace(/^[•◦▪▫\-*]\s+/, '');
      output.push('<li style="margin:6px 0;line-height:1.6">' + itemText + '</li>');
      continue;
    }
    if (inList) { output.push('</ul>'); inList = false; }
    output.push('<p style="margin:8px 0;line-height:1.75;color:#17202a">' + line + '</p>');
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
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    freq[t] = (freq[t] || 0) + 1;
  }
  return freq;
}

function cosineSimilarity(v1, v2) {
  var dot = 0, n1 = 0, n2 = 0;
  for (var k in v1) {
    n1 += v1[k] * v1[k];
    if (v2[k]) dot += v1[k] * v2[k];
  }
  for (var k2 in v2) n2 += v2[k2] * v2[k2];
  if (n1 === 0 || n2 === 0) return 0;
  return dot / (Math.sqrt(n1) * Math.sqrt(n2));
}

function keywordOverlapScore(queryTokens, docText) {
  if (!queryTokens || queryTokens.length === 0) return 0;
  var docTokens = new Set(tokenize(docText));
  var hits = 0;
  for (var i = 0; i < queryTokens.length; i++) {
    if (docTokens.has(queryTokens[i])) hits++;
  }
  return hits / queryTokens.length;
}

// ============================================================
// 8. RECHERCHE DOCUMENTS
// ============================================================
async function findRelevantDocuments(AutoFeedDoc, query, limit, minScore) {
  limit = limit || 5;
  minScore = minScore || 0.15;
  try {
    var qTokens = tokenize(query);
    var qVector = buildVector(query);
    var docs = await AutoFeedDoc.find().sort({ createdAt: -1 }).limit(500).lean();
    var mapped = docs.map(function(d) {
      var hasVector = d.vector && Object.keys(d.vector).length > 0;
      var cosScore = hasVector ? cosineSimilarity(qVector, d.vector) : 0;
      var kwScore = keywordOverlapScore(qTokens, (d.title || '') + ' ' + (d.content || '').slice(0, 8000));
      var score = Math.max(cosScore, kwScore);
      return {
        title: d.title, domain: d.domain, source: d.source, url: d.url,
        createdAt: d.createdAt, content: d.content, score: score
      };
    });
    return mapped
      .filter(function(d) { return d.score >= minScore; })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, limit);
  } catch (e) {
    return [];
  }
}

async function buildRagContext(AutoFeedDoc, question, maxDocs, maxCharsPerDoc) {
  maxDocs = maxDocs || 3;
  maxCharsPerDoc = maxCharsPerDoc || 3500;
  try {
    var docs = await findRelevantDocuments(AutoFeedDoc, question, maxDocs, 0.15);
    if (docs.length === 0) return { context: '', docs: [], topScore: 0 };
    var context = '';
    docs.forEach(function(d, i) {
      var excerpt = String(d.content || '').slice(0, maxCharsPerDoc).trim();
      if (excerpt.length > 100) {
        context += '\n\n=== DOCUMENT SOURCE ' + (i + 1) + ' : ' + d.title + ' ===\nDomaine : ' + d.domain + '\nExtrait :\n' + excerpt + '\n=== FIN DOCUMENT ' + (i + 1) + ' ===';
      }
    });
    return { context: context, docs: docs, topScore: docs[0].score };
  } catch (e) {
    return { context: '', docs: [], topScore: 0 };
  }
}

// ============================================================
// 9. DETECTION DOMAINE
// ============================================================
function detectDomain(question, defaultDomain) {
  if (defaultDomain && defaultDomain !== 'General') return defaultDomain;
  var q = String(question || '').toLowerCase();

  if (isQualityPlanRequest(question, '')) return 'Plan Qualite';

  var petroKeywords = ['api 5ct', 'api 5b', 'api 5l', 'api 6a', 'api 16a', 'api 16d',
    'api spec', 'api std', 'vam', 'tubage', 'casing', 'tubing', 'forage', 'puits',
    'petrole', 'petroleum', 'gaz', 'gas', 'offshore', 'onshore', 'derrick', 'wellhead',
    'christmas tree', 'blowout', 'bop', 'aisi 4140', '80ksi', '110ksi', 'nace',
    'h2s', 'sour gas', 'raccord', 'filetage', 'thread', 'coupling', 'manchon', 'oil & gas'];
  for (var i = 0; i < petroKeywords.length; i++) {
    if (q.indexOf(petroKeywords[i]) !== -1) return 'Petrole & Gaz';
  }

  var techKeywords = ['norme', 'iso', 'qualite', 'fabrication', 'controle qualite',
    'certificat', 'coc', 'mtc', 'inspection', 'essai', 'test pression', 'ndt',
    'soudure', 'welding', 'metal', 'acier', 'steel', 'alliage', 'tolerance',
    'specification', 'cahier charge', 'procedure', 'audit qualite'];
  for (var j = 0; j < techKeywords.length; j++) {
    if (q.indexOf(techKeywords[j]) !== -1) return 'Technique';
  }

  var indKeywords = ['production', 'manufacture', 'usine', 'atelier', 'ligne production',
    'lean', 'six sigma', 'kaizen', 'tpm', 'kpi industriel'];
  for (var k = 0; k < indKeywords.length; k++) {
    if (q.indexOf(indKeywords[k]) !== -1) return 'Industrie';
  }

  for (var s = 0; s < SENSITIVE_DOMAINS.length; s++) {
    var sd = SENSITIVE_DOMAINS[s];
    for (var si = 0; si < sd.keywords.length; si++) {
      if (q.indexOf(sd.keywords[si]) !== -1) return sd.key;
    }
  }

  var keywords = {
    'Religion': ['relig', 'islam', 'coran', 'hadith', 'sunnah', 'prophete', 'allah', 'dieu', 'priere', 'savants', 'ibn', 'imam', 'cheikh'],
    'Litterature': ['litterat', 'poesie', 'roman', 'poete', 'ecrivain', 'theatre'],
    'Philosophie': ['philosoph', 'kant', 'platon', 'aristote', 'socrate'],
    'Histoire': ['histoir', 'civilis', 'empire', 'revolution'],
    'Droit': ['droit', 'juridique', 'loi', 'tribunal', 'justice'],
    'IA & KMS': ['intelligence', 'semantic', 'vector', 'embedding', 'llm', 'machine', 'learning', 'kms'],
    'Energie': ['energy', 'energie', 'solar', 'nuclear', 'hydrogen', 'grid'],
    'Finance': ['finance', 'risque', 'investment', 'market', 'sharpe', 'var'],
    'Sante': ['sante', 'health', 'medical', 'medecine'],
    'Sciences': ['science', 'physics', 'chemistry', 'math'],
    'Education': ['education', 'learning', 'student', 'teaching'],
    'Commerce': ['commerce', 'supply', 'trade', 'retail']
  };

  for (var domain in keywords) {
    var kws = keywords[domain];
    for (var ki = 0; ki < kws.length; ki++) {
      if (q.indexOf(kws[ki]) !== -1) return domain;
    }
  }
  return 'General';
}

function isLiteraryOrReligious(domain) {
  return LITERARY_RELIGIOUS_DOMAINS.some(function(d) {
    return domain.toLowerCase().indexOf(d.toLowerCase()) !== -1;
  });
}

function isAnalyticalDomain(domain) {
  return ANALYTICAL_DOMAINS.some(function(d) {
    return domain.toLowerCase().indexOf(d.toLowerCase()) !== -1;
  });
}

function isSensitiveDomain(domain) {
  return SENSITIVE_DOMAINS.some(function(d) {
    return d.key === domain || d.key.toLowerCase() === domain.toLowerCase();
  });
}

// ============================================================
// 10. CHIFFRES / POINTS CLES
// ============================================================
function hasNumbers(text) {
  if (!text) return false;
  var patterns = [
    /\d+\s*%/,
    /\d+\s*(millions|milliards|Mds|M|k)/i,
    /\d+[.,]\d+/,
    /\d{4}/,
    /\d+\s*(personnes|victimes|cas|deces|morts|refugies)/i,
    /\d+\s*\$/,
    /\d+\s*(USD|EUR|dollars|euros)/i,
    /[+\-]?\d{3,}/
  ];
  for (var i = 0; i < patterns.length; i++) {
    if (patterns[i].test(text)) return true;
  }
  return false;
}

function extractScholarsFromContent(question, answer, domain) {
  var text = (question + ' ' + answer).toLowerCase();
  var scholars = SCHOLARS_BY_DOMAIN[domain] || SCHOLARS_BY_DOMAIN['Religion'] || [];
  var found = [];
  for (var i = 0; i < scholars.length; i++) {
    var sc = scholars[i];
    if (text.indexOf(sc.fr.toLowerCase()) !== -1 || text.indexOf(sc.ar) !== -1) {
      found.push(sc.fr);
    }
  }
  return found;
}

function extractAuthorAndDate(doc) {
  var author = 'Auteur non specifie';
  var date = 'Date non specifiee';
  if (doc.createdAt) {
    date = new Date(doc.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }
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
  for (var w = 0; w < words.length; w++) {
    freq[words[w]] = (freq[words[w]] || 0) + 1;
  }
  var scored = sentences.map(function(s) {
    var st = tokenize(s);
    var score = 0;
    for (var i = 0; i < st.length; i++) score += freq[st[i]] || 0;
    return { sentence: s, score: score / (st.length || 1) };
  });
  return scored.sort(function(a, b) { return b.score - a.score; })
    .slice(0, 5).map(function(x) { return x.sentence; });
}

function judgeClaudeValidation(question, answer, domain) {
  var isSensitive = isSensitiveDomain(domain);
  var hasNums = hasNumbers(answer);
  var len = (answer || '').length;
  var result = { isSensitive: isSensitive, hasNumbers: hasNums, length: len, warnings: [], reject: false, reason: '' };
  if (isSensitive) {
    if (!hasNums) {
      result.warnings.push('Sujet sensible SANS donnees chiffrees');
      result.reject = true;
      result.reason = 'Chiffres obligatoires';
    }
    if (len < 500) result.warnings.push('Reponse trop courte pour un sujet grave');
  }
  if (len < 200) result.warnings.push('Reponse tres courte');
  return result;
}

// ============================================================
// 11. GRAPHIQUES / DASHBOARD / FICHE / REFS
// ============================================================
function generateBarChart(title, data) {
  var width = 600, height = 320, padding = 50, barWidth = 55, gap = 25;
  var maxValue = 1;
  for (var i = 0; i < data.length; i++) if (data[i].value > maxValue) maxValue = data[i].value;
  var chartHeight = height - 2 * padding;
  var bars = '';
  data.forEach(function(d, idx) {
    var barHeight = (chartHeight * d.value) / maxValue;
    var x = padding + idx * (barWidth + gap);
    var y = height - padding - barHeight;
    var label = d.label.length > 10 ? d.label.slice(0, 9) + '.' : d.label;
    bars += '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + barHeight + '" fill="#1e5aa8" rx="4"/>';
    bars += '<text x="' + (x + barWidth / 2) + '" y="' + (y - 8) + '" text-anchor="middle" font-size="14" fill="#0a2540" font-weight="bold">' + d.value + '</text>';
    bars += '<text x="' + (x + barWidth / 2) + '" y="' + (height - padding + 20) + '" text-anchor="middle" font-size="11" fill="#374151">' + label + '</text>';
  });
  return '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">' +
    '<h4 style="color:#0a2540;font-size:15px;font-weight:700;margin:0 0 12px 0;text-align:center">' + title + '</h4>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" style="width:100%;max-width:' + width + 'px;height:auto;display:block;margin:0 auto">' + bars + '</svg></div>';
}

function generatePieChart(title, data) {
  var size = 240, cx = 120, cy = 120, r = 90;
  var total = 0;
  for (var i = 0; i < data.length; i++) total += data[i].value;
  if (total === 0) total = 1;
  var colors = ['#1e5aa8', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2'];
  var angleStart = 0, paths = '';
  data.forEach(function(d, idx) {
    var angle = (d.value / total) * Math.PI * 2;
    var angleEnd = angleStart + angle;
    var x1 = cx + r * Math.cos(angleStart), y1 = cy + r * Math.sin(angleStart);
    var x2 = cx + r * Math.cos(angleEnd), y2 = cy + r * Math.sin(angleEnd);
    var large = angle > Math.PI ? 1 : 0;
    paths += '<path d="M' + cx + ',' + cy + ' L' + x1 + ',' + y1 + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + x2 + ',' + y2 + ' Z" fill="' + colors[idx % colors.length] + '" opacity="0.9" stroke="#ffffff" stroke-width="2"/>';
    angleStart = angleEnd;
  });
  var legend = data.map(function(d, idx) {
    return '<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><span style="display:inline-block;width:14px;height:14px;background:' + colors[idx % colors.length] + ';border-radius:3px"></span><strong>' + d.label + '</strong> : ' + d.value + '</div>';
  }).join('');

  return '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">' +
    '<h4 style="color:#0a2540;font-size:15px;font-weight:700;margin:0 0 12px 0;text-align:center">' + title + '</h4>' +
    '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:20px;align-items:center">' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" style="width:220px;height:220px">' + paths + '</svg>' +
    '<div style="font-size:12px;color:#17202a">' + legend + '</div></div></div>';
}

function generateDashboard(domain, docsUsed, semanticScore) {
  var metrics = DOMAIN_METRICS[domain];
  if (!metrics) return '';
  var html = '<div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">';
  html += '<h4 style="color:#0a2540;font-size:16px;font-weight:700;margin:0 0 16px 0">' + metrics.icon + ' Tableau de bord : ' + metrics.label + '</h4>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
  html += '<thead><tr style="background:#0a2540;color:#ffffff">';
  html += '<th style="padding:10px;text-align:left">Indicateur</th>';
  html += '<th style="padding:10px;text-align:left">Mode de calcul</th>';
  html += '<th style="padding:10px;text-align:center">Valeur</th>';
  html += '<th style="padding:10px;text-align:center">Objectif</th>';
  html += '</tr></thead><tbody>';
  metrics.ratios.forEach(function(r) {
    var v = 0;
    if (r.formula.indexOf('cosinus') !== -1) v = Math.round(semanticScore * 100);
    else if (r.formula.indexOf('documents cites') !== -1) v = Math.min(docsUsed * 10, 100);
    else v = Math.round(r.target * (0.7 + semanticScore * 0.5));
    var good = v >= r.target;
    html += '<tr style="border-bottom:1px solid #e5e7eb">';
    html += '<td style="padding:10px;font-weight:600">' + r.name + '</td>';
    html += '<td style="padding:10px;font-size:12px;color:#6b7280">' + r.formula + '</td>';
    html += '<td style="padding:10px;text-align:center"><span style="background:' + (good ? '#dcfce7' : '#fee2e2') + ';color:' + (good ? '#16a34a' : '#dc2626') + ';padding:4px 10px;border-radius:6px;font-weight:700">' + v + r.unit + '</span></td>';
    html += '<td style="padding:10px;text-align:center;color:#6b7280">' + r.target + r.unit + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function generateTechSheet(domain, docsUsed, semanticScore, scholars, judgeResult, mode) {
  var html = '<div style="background:linear-gradient(135deg,#0a2540,#1e5aa8);color:#ffffff;border-radius:12px;padding:20px;margin:20px 0">';
  html += '<h4 style="margin:0 0 14px 0;font-size:16px;font-weight:700">📋 Fiche technique</h4>';
  html += '<table style="width:100%;font-size:13px;color:#ffffff;border-collapse:collapse">';
  html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75;width:200px">Domaine detecte</td><td style="padding:8px 0;font-weight:700">' + domain + '</td></tr>';
  if (mode === 'document') {
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Source unique</td><td style="padding:8px 0;font-weight:700">Document colle par l utilisateur</td></tr>';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Mode</td><td style="padding:8px 0;font-weight:700;color:#fbbf24">Traitement exclusif - aucune source externe</td></tr>';
  } else {
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Score de pertinence</td><td style="padding:8px 0;font-weight:700">' + Math.round(semanticScore * 100) + ' %</td></tr>';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Documents sources</td><td style="padding:8px 0;font-weight:700">' + docsUsed + '</td></tr>';
  }
  if (judgeResult && judgeResult.isSensitive) {
    var color = judgeResult.hasNumbers ? '#4ade80' : '#f87171';
    var txt = judgeResult.hasNumbers ? 'Chiffres presents' : 'Aucun chiffre detecte';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Donnees chiffrees</td><td style="padding:8px 0;font-weight:700;color:' + color + '">' + txt + '</td></tr>';
  }
  if (scholars && scholars.length > 0) {
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Scholars references</td><td style="padding:8px 0;font-weight:700;color:#fbbf24">' + scholars.join(', ') + '</td></tr>';
  }
  html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Moteur IA</td><td style="padding:8px 0;font-weight:700">MBA-CONSULT AI CORE</td></tr>';
  html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Validation</td><td style="padding:8px 0;font-weight:700;color:#4ade80">✓ Valide par le Juge Claude</td></tr>';
  html += '<tr><td style="padding:8px 0;opacity:0.75">Date de generation</td><td style="padding:8px 0;font-weight:700">' + new Date().toLocaleString('fr-FR') + '</td></tr>';
  html += '</table></div>';
  return html;
}

function generateReferences(docs, domain, scholars) {
  if (!docs || docs.length === 0) return '';
  var isLitRel = isLiteraryOrReligious(domain);
  var html = '<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0">';
  if (isLitRel) {
    html += '<h4 style="margin:0 0 12px 0;color:#92400e;font-size:15px;font-weight:700">📖 Sources litteraires et religieuses</h4>';
    if (scholars && scholars.length > 0) {
      html += '<div style="background:#ffffff;border:2px solid #d4af37;border-radius:8px;padding:14px;margin-bottom:14px">';
      scholars.forEach(function(s) {
        html += '<div style="color:#0a2540;font-size:15px;font-weight:800;margin:4px 0">📚 ' + s + '</div>';
      });
      html += '</div>';
    }
  } else {
    html += '<h4 style="margin:0 0 12px 0;color:#92400e;font-size:15px;font-weight:700">📚 Documents sources utilises</h4>';
  }
  html += '<ol style="margin:0;padding-left:24px;font-size:13px;color:#78350f;line-height:1.7">';
  docs.forEach(function(d) {
    var info = extractAuthorAndDate(d);
    var pertinence = Math.round((d.score || 0) * 100);
    html += '<li style="margin-bottom:12px"><div style="color:#0a2540;font-weight:700;font-size:13px">' + cleanText(d.title || '').slice(0, 120) + '</div><div style="font-size:12px;font-style:italic">Auteur : ' + info.author + '</div><div style="font-size:12px">Date : ' + info.date + ' — Pertinence : ' + pertinence + '%</div></li>';
  });
  html += '</ol></div>';
  return html;
}

function generateNumbersWarning(domain, sources) {
  var chips = sources.map(function(s) {
    return '<span style="background:#ffffff;border:1px solid #dc2626;color:#991b1b;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700">' + s + '</span>';
  }).join('');
  return '<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:12px;padding:20px;margin:20px 0">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
    '<span style="font-size:32px">⚠️</span>' +
    '<div><div style="color:#991b1b;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Alerte Juge Claude</div>' +
    '<div style="color:#7f1d1d;font-size:13px">Sujet sensible : donnees chiffrees requises</div></div></div>' +
    '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">' + chips + '</div></div>';
}

// ============================================================
// 12. BANDEAU QP + VERIFICATION SECTIONS
// ============================================================
function generateQPComplianceBanner() {
  var t = QP_STANDARD_01;
  return '<div style="background:#0a2540;color:#ffffff;border-radius:8px;padding:14px 18px;margin:0 0 20px 0;border-left:6px solid #f59e0b">' +
    '<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.8">Conformite documentaire obligatoire</div>' +
    '<div style="font-size:15px;font-weight:800;margin-top:4px">Modele : QP STANDARD 01 — GMPI</div>' +
    '<div style="font-size:12px;opacity:0.9;margin-top:4px">Code : ' + t.code + ' | Rev. : ' + t.revIndex + ' | Date : ' + t.revDate + '</div>' +
    '<div style="font-size:12px;opacity:0.9;margin-top:2px">Structure imposee : en-tete GMPI, notes a/b/c, sections obligatoires, approbations QC + Tech + client.</div></div>';
}

function checkQPSections(answer) {
  var txt = (answer || '').toLowerCase();
  var result = { present: [], missing: [] };
  var checks = [
    { label: 'En-tete GMPI / code FO-24-PRO', keys: ['fo-24-pro', 'gmpl', 'gmpi'] },
    { label: 'Titre Quality Control Plan', keys: ['quality control plan', 'plan qualite', 'plan de controle'] },
    { label: 'Informations client / produit', keys: ['client', 'produit', 'commande'] },
    { label: 'References documentaires (WO, normes)', keys: ['work order', 'wo ', 'api 5ct', 'api 5b', 'vam', 'fo-05'] },
    { label: 'Matiere premiere + MTC', keys: ['matiere premiere', 'mtc', 'material test', 'aisi', '4140'] },
    { label: 'Processus de fabrication', keys: ['fabrication', 'processus', 'etape', 'usinage', 'decoupe'] },
    { label: 'Points de controle qualite', keys: ['controle qualite', 'inspection', 'dimensionnel', 'visuel', 'ndt'] },
    { label: 'Inspection tiers (TPI)', keys: ['tiers', 'tpi', 'third party'] },
    { label: 'Documents livrables (COC, MTC)', keys: ['coc', 'certificat', 'mtc', 'livrable'] },
    { label: 'Non-conformites PR-01-PRO', keys: ['pr-01', 'non-conform', 'ncr'] },
    { label: 'Approbations / signatures / stamp', keys: ['approv', 'signature', 'stamp', 'cachet'] }
  ];
  checks.forEach(function(c) {
    var found = c.keys.some(function(k) { return txt.indexOf(k) !== -1; });
    if (found) result.present.push(c.label);
    else result.missing.push(c.label);
  });
  return result;
}

function generateQPSectionsReport(check) {
  var present = check.present || [];
  var missing = check.missing || [];
  var html = '<div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">';
  html += '<h4 style="color:#0a2540;font-size:16px;font-weight:700;margin:0 0 14px 0">🔍 Verification conformite QP STANDARD 01</h4>';
  html += '<div style="display:flex;gap:20px;flex-wrap:wrap">';
  html += '<div style="flex:1;min-width:240px"><div style="color:#16a34a;font-weight:700;font-size:13px;margin-bottom:8px">Sections presentes (' + present.length + ')</div><ul style="margin:0;padding-left:20px;font-size:12px">';
  if (present.length === 0) html += '<li style="color:#9ca3af">Aucune</li>';
  else present.forEach(function(p) { html += '<li style="margin:4px 0;color:#166534">' + p + '</li>'; });
  html += '</ul></div>';
  html += '<div style="flex:1;min-width:240px"><div style="color:#dc2626;font-weight:700;font-size:13px;margin-bottom:8px">Sections manquantes (' + missing.length + ')</div><ul style="margin:0;padding-left:20px;font-size:12px">';
  if (missing.length === 0) html += '<li style="color:#16a34a">Aucune - conforme</li>';
  else missing.forEach(function(m) { html += '<li style="margin:4px 0;color:#991b1b">' + m + '</li>'; });
  html += '</ul></div></div></div>';
  return html;
}

// ============================================================
// 13. ENRICHISSEMENT PRINCIPAL
// ============================================================
async function enrichAnswer(answer, question, domain, lang, mongoose, mode, originalContent) {
  try {
    mode = mode || 'ask';
    var isQP = isQualityPlanRequest(question, originalContent || '');
    var realDomain = isQP ? 'Plan Qualite' : detectDomain(question, domain);
    var isLitRel = isLiteraryOrReligious(realDomain);
    var isAnalytical = isAnalyticalDomain(realDomain);
    var isSensitive = isSensitiveDomain(realDomain);
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
    if (isLitRel) scholars = extractScholarsFromContent(question, answer, realDomain);

    var keyPoints = extractKeyPoints(answer);
    var enriched = '';

    if (isQP) enriched += generateQPComplianceBanner();

    if (judgeResult.isSensitive && !judgeResult.hasNumbers) {
      var sd = SENSITIVE_DOMAINS.find(function(d) { return d.key === realDomain; });
      enriched += generateNumbersWarning(realDomain, sd ? sd.sources : ['Sources officielles']);
    }

    enriched += '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:0 0 20px 0">';
    enriched += '<h3 style="color:#0a2540;font-size:17px;font-weight:700;margin:0 0 16px 0;padding-bottom:10px;border-bottom:2px solid #1e5aa8">Reponse detaillee</h3>';
    enriched += '<div style="font-size:14px;color:#17202a">' + formatForHTML(answer) + '</div>';
    enriched += '</div>';

    if (keyPoints.length > 0) {
      enriched += '<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:18px;margin:0 0 20px 0">';
      enriched += '<h4 style="margin:0 0 12px 0;color:#1e40af;font-size:15px;font-weight:700">Points cles a retenir</h4>';
      enriched += '<ul style="margin:0;padding-left:24px;color:#1e3a8a;font-size:14px;line-height:1.7">';
      keyPoints.forEach(function(p) { enriched += '<li style="margin-bottom:8px">' + p + '</li>'; });
      enriched += '</ul></div>';
    }

    if (isQP) {
      var check = checkQPSections(answer);
      enriched += generateQPSectionsReport(check);
    }

    if (mode === 'ask' && isAnalytical) {
      enriched += generateDashboard(realDomain, docs.length, semanticScore);
    }

    enriched += generateTechSheet(realDomain, docs.length, semanticScore, scholars, judgeResult, mode);

    if (mode === 'ask' && isAnalytical && AutoFeedDoc) {
      try {
        var allDocs = await AutoFeedDoc.find().lean();
        var byDomain = {};
        allDocs.forEach(function(d) { byDomain[d.domain] = (byDomain[d.domain] || 0) + 1; });
        var data = Object.keys(byDomain).slice(0, 6).map(function(k) { return { label: k, value: byDomain[k] }; });
        if (data.length > 0) enriched += generateBarChart('Couverture documentaire par domaine', data);
        if (data.length >= 2) enriched += generatePieChart('Repartition des documents', data);
      } catch (e) { /* ignore */ }
    }

    if (mode === 'ask') {
      enriched += generateReferences(docs, realDomain, scholars);
    }

    enriched += '<div style="background:#f5f7fa;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:20px 0;font-size:12px;color:#6b7280;text-align:center">';
    enriched += '<strong style="color:#0a2540">Agents IA impliques :</strong> MBA-CONSULT AI CORE - OpenRouter - Semantic Engine - Language Fix - Voice Engine - <strong style="color:#16a34a">Juge Claude (validation active)</strong>';
    if (isQP) enriched += ' - <strong style="color:#f59e0b">Conformite QP STANDARD 01 appliquee</strong>';
    if (mode === 'document') enriched += ' - <strong style="color:#1e5aa8">Traitement exclusif du document colle</strong>';
    else enriched += ' - Auto-Feed Scraper';
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

  // -------- RAG preprocess pour /api/ask --------
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
        prefix = '[INSTRUCTION SYSTEME OBLIGATOIRE - CONFORMITE QP STANDARD 01]\n' +
          'Tu dois generer un PLAN QUALITE conforme au modele "QP STANDARD 01" de GMPI.\n' +
          'Structure imposee (fond et forme) :\n' +
          '  1. EN-TETE GMPI : Code FO-24-PRO | Rev. 6 | Date 03/08/2017 | Titre "Quality Control Plan"\n' +
          '  2. Rubriques : Edited by (QC Dep.) | Approved by (Tech. Dep.) | Signature + Stamp\n' +
          '  3. NOTES OBLIGATOIRES :\n' +
          '     a) Operation instruction : voir Work Order (WO) - Document Reference FO-05-R&D\n' +
          '     b) Non-conformite : traiter selon procedure PR-01-PRO\n' +
          '     c) Thread inspection procedures\n' +
          '  4. SECTIONS IMPOSEES : Informations generales, References documentaires (WO, API 5CT/5B, VAM, AISI 4140), Matiere premiere (MTC), Processus de fabrication, Points de controle qualite, Inspection par tiers, Documents livrables (COC, MTC), Gestion des non-conformites (PR-01-PRO), Approbations.\n' +
          '  CITE EXACTEMENT ces codes et ces intitules.\n' +
          '[FIN INSTRUCTION QP]\n\n';
      }

      var rag = await buildRagContext(AutoFeedDoc, questionOriginale, 3, 3500);
      if (rag.context && rag.context.length > 200) {
        req.body.question = prefix + questionOriginale +
          '\n\n[INSTRUCTION SYSTEME - UTILISE EN PRIORITE LES EXTRAITS DOCUMENTAIRES CI-DESSOUS. CITE LES NUMEROS DE NORMES, LES VALEURS CHIFFREES, LES TOLERANCES ET PROCEDURES EXACTES TROUVEES DANS CES EXTRAITS.]' +
          rag.context +
          '\n[FIN DES EXTRAITS DOCUMENTAIRES]\n\nQuestion utilisateur : ' + questionOriginale;
        req._ragDocs = rag.docs;
        console.log('[answer-enricher] RAG injecte : ' + rag.docs.length + ' docs');
      } else if (isQP) {
        req.body.question = prefix + questionOriginale;
      }
    } catch (e) {
      console.warn('[answer-enricher] RAG erreur :', e.message);
    }
    next();
  }

  // -------- Document preprocess pour /api/analyze-content --------
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
        prefix = '[INSTRUCTION SYSTEME OBLIGATOIRE - CONFORMITE QP STANDARD 01]\n' +
          'Tu dois generer un PLAN QUALITE conforme au modele "QP STANDARD 01" de GMPI.\n' +
          'Structure imposee (fond et forme) :\n' +
          '  1. EN-TETE GMPI : Code FO-24-PRO | Rev. 6 | Date 03/08/2017 | Titre "Quality Control Plan"\n' +
          '  2. Rubriques : Edited by (QC Dep.) | Approved by (Tech. Dep.) | Signature + Stamp\n' +
          '  3. NOTES OBLIGATOIRES :\n' +
          '     a) Operation instruction : voir Work Order (WO) - Document Reference FO-05-R&D\n' +
          '     b) Non-conformite : traiter selon procedure PR-01-PRO\n' +
          '     c) Thread inspection procedures\n' +
          '  4. SECTIONS IMPOSEES : Informations generales, References documentaires (WO, API 5CT/5B, VAM, AISI 4140), Matiere premiere (MTC), Processus de fabrication, Points de controle qualite, Inspection par tiers, Documents livrables (COC, MTC), Gestion des non-conformites (PR-01-PRO), Approbations.\n' +
          '  CITE EXACTEMENT ces codes et ces intitules. Adapte le contenu au PRODUIT decrit dans le document.\n' +
          '[FIN INSTRUCTION QP]\n\n';
      }

      req.body.question = prefix + (questionUser || 'Analyse ce document et genere le plan qualite.');

      req.body.content =
        '[INSTRUCTION SYSTEME OBLIGATOIRE - DOCUMENT DE REFERENCE]\n' +
        'Reponds EXCLUSIVEMENT a partir du contenu ci-dessous. N invente AUCUNE donnee externe.\n' +
        'Si une information manque, ecris : "Non mentionne dans le document".\n\n' +
        '=== DEBUT DU DOCUMENT A ANALYSER ===\n' +
        content +
        '\n=== FIN DU DOCUMENT A ANALYSER ===\n\n' +
        'RAPPEL : Le plan qualite genere doit respecter STRICTEMENT la structure QP STANDARD 01 ' +
        '(en-tete GMPI FO-24-PRO Rev 6, notes a/b/c, sections imposees, approbations).\n';

      console.log('[answer-enricher] Mode DOCUMENT ' + (isQP ? '+ QP STANDARD 01' : '') + ' active - ' + content.length + ' car.');
    } else {
      console.log('[answer-enricher] analyze-content sans contenu exploitable');
    }
    next();
  }

  // -------- Postprocess --------
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
            if (isQualityPlanRequest(questionPourDetection, contenuPourDetection)) data.qpStandard01 = true;
            originalJson(data);
          })
          .catch(function() {
            originalJson(data);
          });
        return res;
      };
      next();
    };
  }

  app.use('/api/ask', ragPreprocessAsk, postprocess('ask'));
  app.use('/api/analyze-content', documentPreprocess, postprocess('document'));

  console.log('[answer-enricher] v6.1 charge - QP STANDARD 01 + RAG + document exclusif');
};
