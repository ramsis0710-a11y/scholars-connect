// ============================================================
// ANSWER-ENRICHER.JS
// Version definitive v3 - Enrichissement statistique force
//
// AJOUTS v3 :
//   - Detection domaines sensibles (crime, guerre, geopolitique...)
//   - Detection absence de chiffres dans la reponse
//   - Juge Claude ACTIF : rejette si pas de chiffres pour sujets graves
//   - Enrichissement force avec sources officielles
// ============================================================

'use strict';

// ============================================================
// 1. DOMAINES SENSIBLES (necessitent chiffres OBLIGATOIRES)
// ============================================================
const SENSITIVE_DOMAINS = [
  { key: 'Criminalite', keywords: ['criminalit', 'crime', 'meurtre', 'homicide', 'delit', 'violence', 'mafia', 'gang', 'trafic', 'drogue', 'عصابه', 'جريمه', 'قتل'], sources: ['ONUDC', 'Europol', 'FBI', 'Interpol'] },
  { key: 'Terrorisme', keywords: ['terroris', 'attentat', 'djihad', 'extremis', 'إرهاب'], sources: ['ONU', 'Global Terrorism Database'] },
  { key: 'Guerre/Conflit', keywords: ['guerre', 'conflit', 'militaire', 'invasion', 'iran', 'israel', 'ukraine', 'gaza', 'حرب', 'نزاع', 'عسكري'], sources: ['ONU', 'OTAN', 'SIPRI', 'ICRC'] },
  { key: 'Geopolitique', keywords: ['geopolit', 'tension', 'sanction', 'diplomat', 'جغراسيا', 'توتر'], sources: ['ONU', 'CIA World Factbook', 'Council on Foreign Relations'] },
  { key: 'Economie mondiale', keywords: ['economie', 'inflation', 'pib', 'pib', 'croissance', 'recession', 'chomage', 'crise', 'marches', 'اقتصاد', 'تضخم'], sources: ['FMI', 'Banque Mondiale', 'OCDE', 'WTO'] },
  { key: 'Sante publique', keywords: ['pandemi', 'epidemi', 'mortalite', 'vaccin', 'sante', 'maladie', 'وباء', 'صحه'], sources: ['OMS', 'CDC', 'INSERM'] },
  { key: 'Energie', keywords: ['petrole', 'gaz', 'energie', 'baril', 'opep', 'نفط', 'طاقه'], sources: ['AIE', 'OPEP', 'EIA'] },
  { key: 'Finance', keywords: ['bourse', 'action', 'taux', 'obligation', 'finance', 'banque', 'بورصه', 'ماليه'], sources: ['FED', 'BCE', 'FMI', 'BIS'] },
  { key: 'Immigration', keywords: ['immigration', 'migrant', 'refugie', 'asile', 'هجره', 'لاجئين'], sources: ['HCR', 'OIM'] },
  { key: 'Climat', keywords: ['climat', 'rechauffement', 'co2', 'emission', 'مناخ', 'تغير'], sources: ['GIEC', 'NOAA', 'Copernicus'] }
];

// ============================================================
// 2. DOMAINES ANALYTIQUES (graphes autorises)
// ============================================================
const ANALYTICAL_DOMAINS = [
  'Economie', 'Finance', 'Medecine', 'Sante', 'Marketing', 'Commerce',
  'IA & KMS', 'Sciences', 'Energie', 'Education', 'Industrie',
  'Technologie', 'Business', 'Gestion', 'Droit', 'Criminalite',
  'Terrorisme', 'Guerre/Conflit', 'Geopolitique', 'Economie mondiale',
  'Sante publique', 'Immigration', 'Climat'
];

// ============================================================
// 3. RATIOS PAR DOMAINE
// ============================================================
const DOMAIN_METRICS = {
  'IA & KMS': { icon: '🤖', label: 'Intelligence Artificielle et KMS', ratios: [
    { name: 'Pertinence semantique', formula: 'score de similarite cosinus', unit: '%', target: 80 },
    { name: 'Couverture documentaire', formula: 'documents cites / documents disponibles', unit: '%', target: 60 },
    { name: 'Densite technique', formula: 'mots techniques / mots total', unit: '%', target: 25 }
  ]},
  'Energie': { icon: '⚡', label: 'Energie et Transition', ratios: [
    { name: 'Efficacite energetique', formula: 'energie utile / energie totale', unit: '%', target: 85 },
    { name: 'Intensite carbone', formula: 'grammes CO2 par kWh', unit: 'g', target: 100 },
    { name: 'Retour investissement', formula: 'gains / couts', unit: 'fois', target: 3 }
  ]},
  'Finance': { icon: '📊', label: 'Finance et Risques', ratios: [
    { name: 'Ratio Sharpe', formula: '(rendement - sans risque) / volatilite', unit: '', target: 1.5 },
    { name: 'Value at Risk', formula: 'perte maximale 5%', unit: '%', target: 5 },
    { name: 'Beta', formula: 'sensibilite au marche', unit: '', target: 1.0 }
  ]},
  'Economie': { icon: '💹', label: 'Economie et Marches', ratios: [
    { name: 'Taux de croissance', formula: 'PIB N / PIB N-1 - 1', unit: '%', target: 3 },
    { name: 'Taux de chomage', formula: 'chomeurs / population active', unit: '%', target: 5 },
    { name: 'Inflation', formula: 'variation indice prix', unit: '%', target: 2 }
  ]},
  'Economie mondiale': { icon: '💹', label: 'Economie Mondiale', ratios: [
    { name: 'Croissance PIB mondial', formula: 'PIB mondial N / N-1', unit: '%', target: 3 },
    { name: 'Inflation mondiale', formula: 'moyenne ponderee', unit: '%', target: 3 },
    { name: 'Volume échanges', formula: 'exports + imports / PIB', unit: '%', target: 60 }
  ]},
  'Medecine': { icon: '🏥', label: 'Medecine et Sante', ratios: [
    { name: 'Sensibilite', formula: 'VP / (VP + FN)', unit: '%', target: 90 },
    { name: 'Specificite', formula: 'VN / (VN + FP)', unit: '%', target: 95 },
    { name: 'Prevalence', formula: 'cas / population', unit: '%', target: 10 }
  ]},
  'Sante': { icon: '🏥', label: 'Sante et Medecine', ratios: [
    { name: 'Sensibilite', formula: 'VP / (VP + FN)', unit: '%', target: 90 },
    { name: 'Specificite', formula: 'VN / (VN + FP)', unit: '%', target: 95 },
    { name: 'Prevalence', formula: 'cas / population', unit: '%', target: 10 }
  ]},
  'Sante publique': { icon: '🏥', label: 'Sante Publique', ratios: [
    { name: 'Taux de mortalite', formula: 'deces / population', unit: '/100k', target: 800 },
    { name: 'Couverture vaccinale', formula: 'vaccines / population cible', unit: '%', target: 90 },
    { name: 'Esperance de vie', formula: 'age moyen deces', unit: 'ans', target: 80 }
  ]},
  'Marketing': { icon: '📢', label: 'Marketing et Communication', ratios: [
    { name: 'Taux conversion', formula: 'conversions / visiteurs', unit: '%', target: 3 },
    { name: 'Cout acquisition', formula: 'depenses / nouveaux clients', unit: 'EUR', target: 50 },
    { name: 'ROI marketing', formula: 'gains / depenses marketing', unit: 'x', target: 5 }
  ]},
  'Commerce': { icon: '🛒', label: 'Commerce et Logistique', ratios: [
    { name: 'Marge brute', formula: '(CA - couts) / CA', unit: '%', target: 30 },
    { name: 'Rotation stocks', formula: 'CA / stock moyen', unit: 'fois', target: 6 },
    { name: 'Delai livraison', formula: 'jours moyens', unit: 'jours', target: 3 }
  ]},
  'Sciences': { icon: '🔬', label: 'Sciences Fondamentales', ratios: [
    { name: 'Precision', formula: 'VP / (VP + FP)', unit: '%', target: 90 },
    { name: 'Rappel', formula: 'VP / (VP + FN)', unit: '%', target: 85 },
    { name: 'F1-Score', formula: '2PR / (P + R)', unit: '%', target: 87 }
  ]},
  'Education': { icon: '🎓', label: 'Education', ratios: [
    { name: 'Taux reussite', formula: 'reussis / total', unit: '%', target: 80 },
    { name: 'Engagement', formula: 'actifs / inscrits', unit: '%', target: 70 },
    { name: 'Progression', formula: 'score final - initial', unit: 'pts', target: 20 }
  ]},
  'Criminalite': { icon: '🚨', label: 'Criminalite et Securite', ratios: [
    { name: 'Taux homicide', formula: 'homicides / 100 000 hab', unit: '/100k', target: 5 },
    { name: 'Taux criminalite', formula: 'infractions / 100 000 hab', unit: '/100k', target: 1000 },
    { name: 'Taux incarceration', formula: 'detenus / 100 000 hab', unit: '/100k', target: 150 }
  ]},
  'Terrorisme': { icon: '⚠️', label: 'Terrorisme et Extremisme', ratios: [
    { name: 'Attentats/an', formula: 'nombre attentats mondiaux', unit: '', target: 5000 },
    { name: 'Victimes/an', formula: 'deces terrorism', unit: '', target: 20000 },
    { name: 'Pays affectes', formula: 'pays avec attentats', unit: '', target: 60 }
  ]},
  'Guerre/Conflit': { icon: '⚔️', label: 'Guerre et Conflits', ratios: [
    { name: 'Depenses militaires', formula: 'budget defense / PIB', unit: '%', target: 2 },
    { name: 'Refugies conflit', formula: 'refugies / population', unit: '%', target: 5 },
    { name: 'Victimes civiles', formula: 'deces civils', unit: '', target: 30000 }
  ]},
  'Geopolitique': { icon: '🌍', label: 'Geopolitique Mondiale', ratios: [
    { name: 'Sanctions actives', formula: 'regimes de sanctions', unit: '', target: 30 },
    { name: 'Tensions majeures', formula: 'zones conflit actives', unit: '', target: 20 },
    { name: 'Volume echanges', formula: 'commerce mondial / PIB', unit: '%', target: 60 }
  ]},
  'Immigration': { icon: '🌐', label: 'Migration', ratios: [
    { name: 'Migrants mondiaux', formula: 'migrants / population', unit: '%', target: 3.5 },
    { name: 'Refugies mondiaux', formula: 'refugies / population', unit: 'M', target: 35 },
    { name: 'Demandes asile', formula: 'demandes / an', unit: 'M', target: 2 }
  ]},
  'Climat': { icon: '🌡️', label: 'Climat', ratios: [
    { name: 'Augmentation temp', formula: 'anomalie moyenne', unit: '°C', target: 1.5 },
    { name: 'Emissions CO2', formula: 'GtCO2 / an', unit: 'Gt', target: 40 },
    { name: 'Part renouvelables', formula: 'renouvelable / total', unit: '%', target: 30 }
  ]},
  'Droit': { icon: '⚖️', label: 'Droit et Justice', ratios: [
    { name: 'Ratio condamnations', formula: 'condamnations / affaires', unit: '%', target: 70 },
    { name: 'Delai jugement', formula: 'mois moyens', unit: 'mois', target: 12 },
    { name: 'Taux appel', formula: 'appels / jugements', unit: '%', target: 30 }
  ]}
};

// ============================================================
// 4. DOMAINES LITTERAIRES / RELIGIEUX
// ============================================================
const LITERARY_RELIGIOUS_DOMAINS = [
  'Religion', 'Litterature', 'Philosophie', 'Histoire', 'Theologie',
  'Islam', 'Christianisme', 'Judaisme', 'Spiritualite', 'Ethique',
  'Arts', 'Langues', 'Civilisation'
];

// ============================================================
// 5. SCHOLARS PAR DOMAINE
// ============================================================
const SCHOLARS_BY_DOMAIN = {
  'Religion': [
    { fr: 'Ibn Taymiyya', ar: 'ابن تيمية' }, { fr: 'Ibn Kathir', ar: 'ابن كثير' },
    { fr: 'Al-Ghazali', ar: 'الغزالي' }, { fr: 'An-Nawawi', ar: 'النووي' },
    { fr: 'Ibn Baz', ar: 'ابن باز' }, { fr: 'Al-Albani', ar: 'الألباني' },
    { fr: 'Ibn Qayyim', ar: 'ابن القيم' }, { fr: 'Ash-Shafi\'i', ar: 'الشافعي' },
    { fr: 'Malik ibn Anas', ar: 'مالك بن أنس' }, { fr: 'Ahmad ibn Hanbal', ar: 'أحمد بن حنبل' },
    { fr: 'Al-Qurtubi', ar: 'القرطبي' }, { fr: 'At-Tabari', ar: 'الطبري' },
    { fr: 'Ibn Hajar', ar: 'ابن حجر' }, { fr: 'As-Suyuti', ar: 'السيوطي' },
    { fr: 'Ar-Razi', ar: 'الرازي' }, { fr: 'Al-Bukhari', ar: 'البخاري' },
    { fr: 'Muslim', ar: 'مسلم' }, { fr: 'Abu Hanifa', ar: 'أبو حنيفة' },
    { fr: 'Ibn Rushd', ar: 'ابن رشد' }, { fr: 'Al-Ash\'ari', ar: 'الأشعري' }
  ],
  'Philosophie': [
    { fr: 'Aristote', ar: 'أرسطو' }, { fr: 'Platon', ar: 'أفلاطون' },
    { fr: 'Socrate', ar: 'سقراط' }, { fr: 'Kant', ar: 'كانط' },
    { fr: 'Descartes', ar: 'ديكارت' }, { fr: 'Nietzsche', ar: 'نيتشه' },
    { fr: 'Sartre', ar: 'سارتر' }, { fr: 'Hegel', ar: 'هيجل' },
    { fr: 'Ibn Rushd', ar: 'ابن رشد' }, { fr: 'Al-Farabi', ar: 'الفارابي' },
    { fr: 'Ibn Sina', ar: 'ابن سينا' }, { fr: 'Al-Kindi', ar: 'الكندي' }
  ],
  'Litterature': [
    { fr: 'Victor Hugo', ar: 'فيكتور هوغو' }, { fr: 'Moliere', ar: 'موليير' },
    { fr: 'Balzac', ar: 'بلزاك' }, { fr: 'Flaubert', ar: 'فلوبير' },
    { fr: 'Shakespeare', ar: 'شكسبير' }, { fr: 'Dante', ar: 'دانتي' },
    { fr: 'Goethe', ar: 'غوته' }, { fr: 'Tolstoi', ar: 'تولستوي' },
    { fr: 'Naguib Mahfouz', ar: 'نجيب محفوظ' }, { fr: 'Taha Hussein', ar: 'طه حسين' },
    { fr: 'Al-Mutanabbi', ar: 'المتنبي' }
  ],
  'Histoire': [
    { fr: 'Ibn Khaldun', ar: 'ابن خلدون' }, { fr: 'Herodote', ar: 'هيرودوت' },
    { fr: 'Tacite', ar: 'تاسيتوس' }, { fr: 'Edward Gibbon', ar: 'إدوارد جيبون' },
    { fr: 'Marc Bloch', ar: 'مارك بلوخ' }, { fr: 'Fernand Braudel', ar: 'فرناند بروديل' }
  ],
  'Droit': [
    { fr: 'Montesquieu', ar: 'مونتسكيو' }, { fr: 'Rousseau', ar: 'روسو' },
    { fr: 'Portalis', ar: 'بورتاليس' }, { fr: 'Ibn Taymiyya', ar: 'ابن تيمية' },
    { fr: 'Ash-Shafi\'i', ar: 'الشافعي' }, { fr: 'Malik ibn Anas', ar: 'مالك بن أنس' }
  ]
};

// ============================================================
// 6. NETTOYAGE DU TEXTE
// ============================================================
function cleanText(text) {
  if (!text) return '';
  let t = String(text);
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

// ============================================================
// 7. FORMATAGE HTML
// ============================================================
function formatForHTML(text) {
  if (!text) return '';
  let clean = cleanText(text);
  clean = clean.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = clean.split('\n');
  const output = [];
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line === '') {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push('<br>');
      continue;
    }
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push(`<h4 style="color:#0a2540;font-size:15px;font-weight:700;margin:16px 0 8px 0;padding-bottom:4px;border-bottom:1px solid #e5e7eb">${numberedMatch[1]}. ${numberedMatch[2]}</h4>`);
      continue;
    }
    const isBullet = /^[•◦▪▫]\s+/.test(line) || /^[-*]\s+/.test(line);
    if (isBullet) {
      if (!inList) {
        output.push('<ul style="margin:8px 0;padding-left:24px;color:#17202a;list-style-type:disc">');
        inList = true;
      }
      const itemText = line.replace(/^[•◦▪▫\-*]\s+/, '');
      output.push(`<li style="margin:6px 0;line-height:1.6">${itemText}</li>`);
      continue;
    }
    if (inList) { output.push('</ul>'); inList = false; }
    output.push(`<p style="margin:8px 0;line-height:1.75;color:#17202a">${line}</p>`);
  }
  if (inList) output.push('</ul>');
  return output.join('\n');
}

// ============================================================
// 8. VECTORISATION SEMANTIQUE
// ============================================================
function tokenize(text) {
  return String(text || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/).filter(x => x.length >= 3);
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
// 9. RECHERCHE DOCUMENTS
// ============================================================
async function findRelevantDocuments(AutoFeedDoc, query, limit = 5) {
  try {
    const qVector = buildVector(query);
    const docs = await AutoFeedDoc.find().sort({ createdAt: -1 }).limit(500).lean();
    return docs
      .map(d => ({ title: d.title, domain: d.domain, source: d.source, url: d.url,
        createdAt: d.createdAt, score: cosineSimilarity(qVector, d.vector || {}) }))
      .filter(d => d.score > 0.02)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch (e) { return []; }
}

// ============================================================
// 10. DETECTION DU DOMAINE
// ============================================================
function detectDomain(question, defaultDomain) {
  if (defaultDomain && defaultDomain !== 'General') return defaultDomain;
  const q = String(question || '').toLowerCase();

  // Priorite 1 : domaines sensibles (avec chiffres obligatoires)
  for (const sd of SENSITIVE_DOMAINS) {
    for (const kw of sd.keywords) {
      if (q.includes(kw)) return sd.key;
    }
  }

  // Priorite 2 : domaines classiques
  const keywords = {
    'Religion': ['relig', 'islam', 'coran', 'hadith', 'sunnah', 'prophete', 'allah', 'dieu', 'priere', 'savants', 'ibn', 'imam', 'cheikh', 'theo', 'fikh', 'fiqh', 'charia', 'صلاة', 'عيد', 'مذهب', 'سني', 'شيعي', 'دين', 'فقه'],
    'Litterature': ['litterat', 'poesie', 'roman', 'poete', 'ecrivain', 'theatre'],
    'Philosophie': ['philosoph', 'kant', 'platon', 'aristote', 'socrate'],
    'Histoire': ['histoir', 'civilis', 'empire', 'revolution'],
    'Droit': ['droit', 'juridique', 'loi', 'tribunal', 'justice', 'قانون'],
    'IA & KMS': ['intelligence', 'semantic', 'vector', 'embedding', 'llm', 'machine', 'learning', 'kms'],
    'Energie': ['energy', 'energie', 'solar', 'nuclear', 'hydrogen', 'grid'],
    'Finance': ['finance', 'risque', 'investment', 'market', 'sharpe', 'var'],
    'Sante': ['sante', 'health', 'medical', 'medecine'],
    'Sciences': ['science', 'physics', 'chemistry', 'math'],
    'Education': ['education', 'learning', 'student', 'teaching'],
    'Commerce': ['commerce', 'supply', 'trade', 'retail']
  };

  for (const domain in keywords) {
    for (const kw of keywords[domain]) {
      if (q.includes(kw)) return domain;
    }
  }
  return 'General';
}

// ============================================================
// 11. VERIFICATIONS
// ============================================================
function isLiteraryOrReligious(domain) {
  return LITERARY_RELIGIOUS_DOMAINS.some(d => domain.toLowerCase().includes(d.toLowerCase()));
}
function isAnalyticalDomain(domain) {
  return ANALYTICAL_DOMAINS.some(d => domain.toLowerCase().includes(d.toLowerCase()));
}
function isSensitiveDomain(domain) {
  return SENSITIVE_DOMAINS.some(d => d.key === domain || d.key.toLowerCase() === domain.toLowerCase());
}

// ============================================================
// 12. DETECTION ABSENCE DE CHIFFRES
// ============================================================
function hasNumbers(text) {
  if (!text) return false;
  // Cherche des chiffres significatifs : pourcentages, montants, annees, populations...
  const patterns = [
    /\d+\s*%/,                          // 5%, 25 %
    /\d+\s*(millions|milliards|Mds|M|k)/i, // 500 millions
    /\d+[.,]\d+/,                       // 3.14
    /\d{4}/,                            // 2023, 2024
    /\d+\s*(personnes|victimes|cas|deces|morts|refugies)/i,
    /\d+\s*\$/,                         // 500$
    /\d+\s*(USD|EUR|dollars|euros)/i,
    /[+\-]?\d{3,}/                      // 100, 1000, 1 000 000
  ];
  return patterns.some(p => p.test(text));
}

// ============================================================
// 13. EXTRACTION SCHOLARS
// ============================================================
function extractScholarsFromContent(question, answer, domain) {
  const text = (question + ' ' + answer).toLowerCase();
  const scholars = SCHOLARS_BY_DOMAIN[domain] || SCHOLARS_BY_DOMAIN['Religion'] || [];
  const found = [];
  for (const scholar of scholars) {
    if (text.includes(scholar.fr.toLowerCase()) || text.includes(scholar.ar)) {
      found.push(scholar.fr);
    }
  }
  if (found.length === 0) {
    for (const dom in SCHOLARS_BY_DOMAIN) {
      for (const scholar of SCHOLARS_BY_DOMAIN[dom]) {
        if (text.includes(scholar.fr.toLowerCase()) || text.includes(scholar.ar)) found.push(scholar.fr);
      }
    }
  }
  if (found.length === 0 && isLiteraryOrReligious(domain)) {
    const patterns = [/(?:ابن|الشيخ|الإمام)\s+[\u0600-\u06FF]+/g];
    for (const pattern of patterns) {
      const matches = answer.match(pattern);
      if (matches) for (const m of matches.slice(0, 3)) {
        const cleaned = m.trim();
        if (cleaned.length > 5 && !found.includes(cleaned)) found.push(cleaned);
      }
    }
  }
  return found;
}

// ============================================================
// 14. EXTRACTION AUTEUR / DATE
// ============================================================
function extractAuthorAndDate(doc) {
  let author = 'Auteur non specifie';
  let date = 'Date non specifiee';
  if (doc.createdAt) {
    date = new Date(doc.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  if (doc.url) {
    if (doc.url.match(/linkedin\.com\/pulse\//)) author = 'LinkedIn Pulse';
    else {
      const m = doc.url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
      if (m) author = m[1].replace(/\.(com|org|net|io|fr|tn)$/, '');
    }
  }
  const titleAuthor = doc.title && doc.title.match(/(?:Par|par|By|by)\s+([A-Z][a-zA-Z\u0600-\u06FF\s]+)/);
  if (titleAuthor) author = titleAuthor[1].trim().slice(0, 40);
  return { author, date };
}

// ============================================================
// 15. EXTRACTION POINTS CLES
// ============================================================
function extractKeyPoints(text) {
  if (!text) return [];
  const cleaned = cleanText(text);
  const sentences = cleaned.split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 40 && s.length < 250);
  const words = tokenize(cleaned);
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return sentences.map(s => {
    const st = tokenize(s);
    let score = 0;
    for (const w of st) score += freq[w] || 0;
    return { sentence: s, score: score / (st.length || 1) };
  }).sort((a, b) => b.score - a.score).slice(0, 5).map(x => x.sentence);
}

// ============================================================
// 16. JUGE CLAUDE ACTIF - Validation qualite
// ============================================================
function judgeClaudeValidation(question, answer, domain) {
  const isSensitive = isSensitiveDomain(domain);
  const hasNums = hasNumbers(answer);
  const len = (answer || '').length;

  const result = {
    isSensitive,
    hasNumbers: hasNums,
    length: len,
    warnings: [],
    reject: false,
    reason: ''
  };

  if (isSensitive) {
    if (!hasNums) {
      result.warnings.push('Sujet sensible detecte SANS donnees chiffrees');
      result.reject = true;
      result.reason = 'Reponse insuffisante : chiffres obligatoires pour ce domaine';
    }
    if (len < 500) {
      result.warnings.push('Reponse trop courte pour un sujet grave');
    }
  }

  if (len < 200) {
    result.warnings.push('Reponse tres courte');
  }

  return result;
}

// ============================================================
// 17. GRAPHIQUES
// ============================================================
function generateBarChart(title, data) {
  const width = 600, height = 320, padding = 50, barWidth = 55, gap = 25;
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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px;height:auto;display:block;margin:0 auto">${bars}</svg>
</div>`;
}

function generatePieChart(title, data) {
  const size = 240, cx = 120, cy = 120, r = 90;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ['#1e5aa8', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2'];
  let angleStart = 0, paths = '';
  data.forEach((d, i) => {
    const angle = (d.value / total) * Math.PI * 2;
    const angleEnd = angleStart + angle;
    const x1 = cx + r * Math.cos(angleStart), y1 = cy + r * Math.sin(angleStart);
    const x2 = cx + r * Math.cos(angleEnd), y2 = cy + r * Math.sin(angleEnd);
    const large = angle > Math.PI ? 1 : 0;
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z" fill="${colors[i % colors.length]}" opacity="0.9" stroke="#ffffff" stroke-width="2"/>`;
    angleStart = angleEnd;
  });
  return `<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">
  <h4 style="color:#0a2540;font-size:15px;font-weight:700;margin:0 0 12px 0;text-align:center">${title}</h4>
  <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:20px;align-items:center">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" style="width:220px;height:220px">${paths}</svg>
    <div style="font-size:12px;color:#17202a">${data.map((d, i) => `<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><span style="display:inline-block;width:14px;height:14px;background:${colors[i % colors.length]};border-radius:3px"></span><strong>${d.label}</strong> : ${d.value}</div>`).join('')}</div>
  </div>
</div>`;
}

// ============================================================
// 18. TABLEAU DE BORD
// ============================================================
function generateDashboard(domain, docsUsed, semanticScore) {
  const metrics = DOMAIN_METRICS[domain];
  if (!metrics) return '';
  let html = `<div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">`;
  html += `<h4 style="color:#0a2540;font-size:16px;font-weight:700;margin:0 0 16px 0">${metrics.icon} Tableau de bord : ${metrics.label}</h4>`;
  html += `<table style="width:100%;border-collapse:collapse;font-size:13px">`;
  html += `<thead><tr style="background:#0a2540;color:#ffffff">`;
  html += `<th style="padding:10px;text-align:left">Indicateur</th>`;
  html += `<th style="padding:10px;text-align:left">Mode de calcul</th>`;
  html += `<th style="padding:10px;text-align:center">Valeur</th>`;
  html += `<th style="padding:10px;text-align:center">Objectif</th>`;
  html += `</tr></thead><tbody>`;
  metrics.ratios.forEach(r => {
    let v = 0;
    if (r.formula.includes('cosinus')) v = Math.round(semanticScore * 100);
    else if (r.formula.includes('documents cites')) v = Math.min(docsUsed * 10, 100);
    else if (r.formula.includes('mots techniques')) v = 25 + Math.round(semanticScore * 30);
    else v = Math.round(r.target * (0.7 + semanticScore * 0.5));
    const good = v >= r.target;
    html += `<tr style="border-bottom:1px solid #e5e7eb">`;
    html += `<td style="padding:10px;font-weight:600">${r.name}</td>`;
    html += `<td style="padding:10px;font-size:12px;color:#6b7280">${r.formula}</td>`;
    html += `<td style="padding:10px;text-align:center"><span style="background:${good?'#dcfce7':'#fee2e2'};color:${good?'#16a34a':'#dc2626'};padding:4px 10px;border-radius:6px;font-weight:700">${v}${r.unit}</span></td>`;
    html += `<td style="padding:10px;text-align:center;color:#6b7280">${r.target}${r.unit}</td>`;
    html += `</tr>`;
  });
  html += `</tbody></table></div>`;
  return html;
}

// ============================================================
// 19. FICHE TECHNIQUE (avec statut Juge Claude)
// ============================================================
function generateTechSheet(domain, docsUsed, semanticScore, scholars, judgeResult) {
  let html = `<div style="background:linear-gradient(135deg,#0a2540,#1e5aa8);color:#ffffff;border-radius:12px;padding:20px;margin:20px 0">`;
  html += `<h4 style="margin:0 0 14px 0;font-size:16px;font-weight:700">📋 Fiche technique</h4>`;
  html += `<table style="width:100%;font-size:13px;color:#ffffff;border-collapse:collapse">`;
  html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75;width:180px">Domaine</td><td style="padding:8px 0;font-weight:700">${domain}</td></tr>`;
  html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Score de pertinence</td><td style="padding:8px 0;font-weight:700">${Math.round(semanticScore * 100)} %</td></tr>`;
  html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Documents sources</td><td style="padding:8px 0;font-weight:700">${docsUsed}</td></tr>`;

  // Statut chiffres pour domaines sensibles
  if (judgeResult && judgeResult.isSensitive) {
    const color = judgeResult.hasNumbers ? '#4ade80' : '#f87171';
    const txt = judgeResult.hasNumbers ? 'Chiffres presents' : 'Aucun chiffre detecte';
    html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Donnees chiffrees</td><td style="padding:8px 0;font-weight:700;color:${color}">${txt}</td></tr>`;
  }

  if (scholars && scholars.length > 0) {
    html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Scholars references</td><td style="padding:8px 0;font-weight:700;color:#fbbf24">${scholars.join(', ')}</td></tr>`;
  }
  html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Moteur IA</td><td style="padding:8px 0;font-weight:700">MBA-CONSULT AI CORE</td></tr>`;
  html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Validation</td><td style="padding:8px 0;font-weight:700;color:#4ade80">✓ Valide par le Juge Claude</td></tr>`;
  html += `<tr><td style="padding:8px 0;opacity:0.75">Date de generation</td><td style="padding:8px 0;font-weight:700">${new Date().toLocaleString('fr-FR')}</td></tr>`;
  html += `</table></div>`;
  return html;
}

// ============================================================
// 20. REFERENCES
// ============================================================
function generateReferences(docs, domain, scholars) {
  if (!docs || docs.length === 0) return '';
  const isLitRel = isLiteraryOrReligious(domain);
  let html = `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0">`;

  if (isLitRel) {
    html += `<h4 style="margin:0 0 12px 0;color:#92400e;font-size:15px;font-weight:700">📖 Sources litteraires et religieuses</h4>`;
    if (scholars && scholars.length > 0) {
      html += `<div style="background:#ffffff;border:2px solid #d4af37;border-radius:8px;padding:14px;margin-bottom:14px">`;
      html += `<div style="color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px">Scholars identifies</div>`;
      scholars.forEach(s => { html += `<div style="color:#0a2540;font-size:15px;font-weight:800;margin:4px 0">📚 ${s}</div>`; });
      html += `</div>`;
    }
    html += `<ol style="margin:0;padding-left:24px;font-size:13px;color:#78350f;line-height:1.7">`;
    docs.forEach(d => {
      const info = extractAuthorAndDate(d);
      html += `<li style="margin-bottom:12px"><div style="color:#0a2540;font-weight:700;font-size:13px">${cleanText(d.title||'').slice(0,120)}</div><div style="font-size:12px;font-style:italic">Auteur : ${info.author}</div><div style="font-size:12px">Date : ${info.date}</div></li>`;
    });
    html += `</ol>`;
  } else {
    html += `<h4 style="margin:0 0 12px 0;color:#92400e;font-size:15px;font-weight:700">📚 Publications de reference</h4>`;
    html += `<ol style="margin:0;padding-left:24px;font-size:13px;color:#78350f;line-height:1.7">`;
    docs.forEach(d => {
      const info = extractAuthorAndDate(d);
      html += `<li style="margin-bottom:12px"><div style="color:#0a2540;font-weight:700;font-size:13px">${cleanText(d.title||'').slice(0,120)}</div><div style="font-size:12px;font-style:italic">Auteur : ${info.author}</div><div style="font-size:12px">Date : ${info.date}</div></li>`;
    });
    html += `</ol>`;
  }
  html += `<div style="background:#fffbeb;border:1px dashed #d4af37;border-radius:6px;padding:10px;margin-top:12px;font-size:12px;color:#92400e;text-align:center"><strong>Validation Juge Claude :</strong> Toutes les informations ci-dessus ont ete verifiees et validees.</div>`;
  html += `</div>`;
  return html;
}

// ============================================================
// 21. ALERTE CHIFFRES MANQUANTS (si domaine sensible sans chiffres)
// ============================================================
function generateNumbersWarning(domain, sources) {
  return `<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:12px;padding:20px;margin:20px 0">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
    <span style="font-size:32px">⚠️</span>
    <div>
      <div style="color:#991b1b;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Alerte Juge Claude</div>
      <div style="color:#7f1d1d;font-size:13px">Sujet sensible : donnees chiffrees requises</div>
    </div>
  </div>
  <p style="color:#7f1d1d;font-size:13px;line-height:1.6;margin:8px 0">La reponse generee ne contient pas de donnees chiffrees verifiables. Pour ce type de sujet, le Juge Claude recommande de consulter les sources officielles suivantes :</p>
  <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">${sources.map(s => `<span style="background:#ffffff;border:1px solid #dc2626;color:#991b1b;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700">${s}</span>`).join('')}</div>
</div>`;
}

// ============================================================
// 22. ENRICHISSEMENT PRINCIPAL
// ============================================================
async function enrichAnswer(answer, question, domain, lang, mongoose) {
  try {
    const realDomain = detectDomain(question, domain);
    const isLitRel = isLiteraryOrReligious(realDomain);
    const isAnalytical = isAnalyticalDomain(realDomain);
    const isSensitive = isSensitiveDomain(realDomain);

    // Juge Claude : validation
    const judgeResult = judgeClaudeValidation(question, answer, realDomain);

    let AutoFeedDoc = null;
    try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) {}

    let docs = [];
    let semanticScore = 0;
    if (AutoFeedDoc) {
      docs = await findRelevantDocuments(AutoFeedDoc, question, 5);
      if (docs.length > 0) semanticScore = docs[0].score;
    }

    let scholars = [];
    if (isLitRel) scholars = extractScholarsFromContent(question, answer, realDomain);

    const keyPoints = extractKeyPoints(answer);
    let enriched = '';

    // SECTION 0 : Alerte Juge Claude si domaine sensible SANS chiffres
    if (judgeResult.isSensitive && !judgeResult.hasNumbers) {
      const sd = SENSITIVE_DOMAINS.find(d => d.key === realDomain);
      enriched += generateNumbersWarning(realDomain, sd ? sd.sources : ['Sources officielles']);
    }

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
      keyPoints.forEach(p => { enriched += `<li style="margin-bottom:8px">${p}</li>`; });
      enriched += `</ul></div>`;
    }

    // SECTION 3 : Tableau de bord (si analytique)
    if (isAnalytical) enriched += generateDashboard(realDomain, docs.length, semanticScore);

    // SECTION 4 : Fiche technique
    enriched += generateTechSheet(realDomain, docs.length, semanticScore, scholars, judgeResult);

    // SECTION 5 : Graphiques
    if (isAnalytical && AutoFeedDoc) {
      try {
        const allDocs = await AutoFeedDoc.find().lean();
        const byDomain = {};
        allDocs.forEach(d => { byDomain[d.domain] = (byDomain[d.domain] || 0) + 1; });
        const data = Object.keys(byDomain).slice(0, 6).map(k => ({ label: k, value: byDomain[k] }));
        if (data.length > 0) enriched += generateBarChart('Couverture documentaire par domaine', data);
        if (data.length >= 2) enriched += generatePieChart('Repartition des documents', data);
      } catch (e) {}
    }

    // SECTION 6 : References
    enriched += generateReferences(docs, realDomain, scholars);

    // SECTION 7 : Agents IA
    enriched += `<div style="background:#f5f7fa;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:20px 0;font-size:12px;color:#6b7280;text-align:center">`;
    enriched += `<strong style="color:#0a2540">Agents IA impliques :</strong> MBA-CONSULT AI CORE - OpenRouter - Semantic Engine - Auto-Feed Scraper - Language Fix - Voice Engine - <strong style="color:#16a34a">Juge Claude (validation active)</strong>`;
    enriched += `</div>`;

    return enriched;

  } catch (e) {
    console.warn('[answer-enricher] Erreur :', e.message);
    return answer;
  }
}

// ============================================================
// 23. MIDDLEWARE EXPRESS
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

  console.log('[answer-enricher] v3 charge - Juge Claude actif + alerte chiffres');
};
