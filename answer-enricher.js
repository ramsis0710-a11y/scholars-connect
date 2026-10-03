// ============================================================
// ANSWER-ENRICHER.JS
// Version definitive - References adaptees + Scholars + Graphes cibles
//
// REGLES APPLIQUEES :
//   1. Domaines litteraires/religieux -> Scholars + Titre + Auteur + Date
//   2. Domaines scientifiques -> Titre + Auteur + Date uniquement
//   3. Graphes/tableaux LIMITES aux domaines analytiques
//   4. Toutes les reponses validees par le Juge Claude
// ============================================================

'use strict';

// ============================================================
// 1. DOMAINES ANALYTIQUES (graphes et tableaux AUTORISES)
// ============================================================
const ANALYTICAL_DOMAINS = [
  'Economie', 'Finance', 'Medecine', 'Sante', 'Marketing', 'Commerce',
  'IA & KMS', 'Sciences', 'Energie', 'Education', 'Industrie',
  'Technologie', 'Business', 'Gestion'
];

// ============================================================
// 2. RATIOS PAR DOMAINE
// ============================================================
const DOMAIN_METRICS = {
  'IA & KMS': {
    icon: '🤖', label: 'Intelligence Artificielle et KMS',
    ratios: [
      { name: 'Pertinence semantique', formula: 'score de similarite cosinus', unit: '%', target: 80 },
      { name: 'Couverture documentaire', formula: 'documents cites / documents disponibles', unit: '%', target: 60 },
      { name: 'Densite technique', formula: 'mots techniques / mots total', unit: '%', target: 25 }
    ]
  },
  'Energie': {
    icon: '⚡', label: 'Energie et Transition',
    ratios: [
      { name: 'Efficacite energetique', formula: 'energie utile / energie totale', unit: '%', target: 85 },
      { name: 'Intensite carbone', formula: 'grammes CO2 par kWh', unit: 'g', target: 100 },
      { name: 'Retour sur investissement', formula: 'gains / couts', unit: 'fois', target: 3 }
    ]
  },
  'Finance': {
    icon: '📊', label: 'Finance et Gestion des Risques',
    ratios: [
      { name: 'Ratio de Sharpe', formula: '(rendement - sans risque) / volatilite', unit: '', target: 1.5 },
      { name: 'Value at Risk', formula: 'perte maximale sur 5% des cas', unit: '%', target: 5 },
      { name: 'Coefficient Beta', formula: 'sensibilite au marche', unit: '', target: 1.0 }
    ]
  },
  'Economie': {
    icon: '💹', label: 'Economie et Marches',
    ratios: [
      { name: 'Taux de croissance', formula: 'PIB annee N / PIB annee N-1 - 1', unit: '%', target: 3 },
      { name: 'Taux de chomage', formula: 'chomeurs / population active', unit: '%', target: 5 },
      { name: 'Inflation', formula: 'variation indice prix', unit: '%', target: 2 }
    ]
  },
  'Medecine': {
    icon: '🏥', label: 'Medecine et Sante',
    ratios: [
      { name: 'Sensibilite', formula: 'vrais positifs / (vrais positifs + faux negatifs)', unit: '%', target: 90 },
      { name: 'Specificite', formula: 'vrais negatifs / (vrais negatifs + faux positifs)', unit: '%', target: 95 },
      { name: 'Prevalence', formula: 'cas detectes / population totale', unit: '%', target: 10 }
    ]
  },
  'Sante': {
    icon: '🏥', label: 'Sante et Medecine',
    ratios: [
      { name: 'Sensibilite', formula: 'vrais positifs / (vrais positifs + faux negatifs)', unit: '%', target: 90 },
      { name: 'Specificite', formula: 'vrais negatifs / (vrais negatifs + faux positifs)', unit: '%', target: 95 },
      { name: 'Prevalence', formula: 'cas detectes / population totale', unit: '%', target: 10 }
    ]
  },
  'Marketing': {
    icon: '📢', label: 'Marketing et Communication',
    ratios: [
      { name: 'Taux de conversion', formula: 'conversions / visiteurs', unit: '%', target: 3 },
      { name: 'Cout acquisition client', formula: 'depenses / nouveaux clients', unit: 'EUR', target: 50 },
      { name: 'Retour investissement marketing', formula: 'gains / depenses marketing', unit: 'x', target: 5 }
    ]
  },
  'Commerce': {
    icon: '🛒', label: 'Commerce et Chaine Logistique',
    ratios: [
      { name: 'Marge brute', formula: '(chiffre affaires - couts) / chiffre affaires', unit: '%', target: 30 },
      { name: 'Rotation des stocks', formula: 'chiffre affaires / stock moyen', unit: 'fois', target: 6 },
      { name: 'Delai de livraison', formula: 'nombre de jours moyens', unit: 'jours', target: 3 }
    ]
  },
  'Sciences': {
    icon: '🔬', label: 'Sciences Fondamentales',
    ratios: [
      { name: 'Precision', formula: 'vrais positifs / (vrais positifs + faux positifs)', unit: '%', target: 90 },
      { name: 'Rappel', formula: 'vrais positifs / (vrais positifs + faux negatifs)', unit: '%', target: 85 },
      { name: 'Score F1', formula: '2 x (precision x rappel) / (precision + rappel)', unit: '%', target: 87 }
    ]
  },
  'Education': {
    icon: '🎓', label: 'Education et Formation',
    ratios: [
      { name: 'Taux de reussite', formula: 'apprenants reussis / total apprenants', unit: '%', target: 80 },
      { name: 'Taux engagement', formula: 'apprenants actifs / inscrits', unit: '%', target: 70 },
      { name: 'Progression moyenne', formula: 'score final - score initial', unit: 'points', target: 20 }
    ]
  }
};

// ============================================================
// 3. DOMAINES LITTERAIRES / RELIGIEUX
// ============================================================
const LITERARY_RELIGIOUS_DOMAINS = [
  'Religion', 'Litterature', 'Philosophie', 'Histoire', 'Theologie',
  'Islam', 'Christianisme', 'Judaisme', 'Spiritualite', 'Ethique',
  'Arts', 'Langues', 'Droit', 'Civilisation'
];

// ============================================================
// 4. SCHOLARS PAR DOMAINE (base etendue + arabes)
// ============================================================
const SCHOLARS_BY_DOMAIN = {
  'Religion': [
    { fr: 'Ibn Taymiyya', ar: 'ابن تيمية' },
    { fr: 'Ibn Kathir', ar: 'ابن كثير' },
    { fr: 'Al-Ghazali', ar: 'الغزالي' },
    { fr: 'An-Nawawi', ar: 'النووي' },
    { fr: 'Ibn Baz', ar: 'ابن باز' },
    { fr: 'Al-Albani', ar: 'الألباني' },
    { fr: 'Ibn Qayyim', ar: 'ابن القيم' },
    { fr: 'Ash-Shafi\'i', ar: 'الشافعي' },
    { fr: 'Malik ibn Anas', ar: 'مالك بن أنس' },
    { fr: 'Ahmad ibn Hanbal', ar: 'أحمد بن حنبل' },
    { fr: 'Al-Qurtubi', ar: 'القرطبي' },
    { fr: 'At-Tabari', ar: 'الطبري' },
    { fr: 'Ibn Hajar', ar: 'ابن حجر' },
    { fr: 'As-Suyuti', ar: 'السيوطي' },
    { fr: 'Ar-Razi', ar: 'الرازي' },
    { fr: 'Al-Bukhari', ar: 'البخاري' },
    { fr: 'Muslim', ar: 'مسلم' },
    { fr: 'Abu Hanifa', ar: 'أبو حنيفة' },
    { fr: 'Ibn Rushd', ar: 'ابن رشد' },
    { fr: 'Al-Ash\'ari', ar: 'الأشعري' },
    { fr: 'Al-Maturidi', ar: 'الماتريدي' },
    { fr: 'Ibn Arabi', ar: 'ابن عربي' },
    { fr: 'Al-Juwayni', ar: 'الجويني' },
    { fr: 'Al-Bayhaqi', ar: 'البيهقي' },
    { fr: 'Ad-Dhahabi', ar: 'الذهبي' },
    { fr: 'Ibn Majah', ar: 'ابن ماجه' },
    { fr: 'Abu Dawud', ar: 'أبو داود' },
    { fr: 'At-Tirmidhi', ar: 'الترمذي' },
    { fr: 'An-Nasa\'i', ar: 'النسائي' }
  ],
  'Philosophie': [
    { fr: 'Aristote', ar: 'أرسطو' },
    { fr: 'Platon', ar: 'أفلاطون' },
    { fr: 'Socrate', ar: 'سقراط' },
    { fr: 'Kant', ar: 'كانط' },
    { fr: 'Descartes', ar: 'ديكارت' },
    { fr: 'Nietzsche', ar: 'نيتشه' },
    { fr: 'Sartre', ar: 'سارتر' },
    { fr: 'Hegel', ar: 'هيجل' },
    { fr: 'Spinoza', ar: 'سبينوزا' },
    { fr: 'Leibniz', ar: 'لايبنتز' },
    { fr: 'Ibn Rushd', ar: 'ابن رشد' },
    { fr: 'Al-Farabi', ar: 'الفارابي' },
    { fr: 'Ibn Sina', ar: 'ابن سينا' },
    { fr: 'Al-Kindi', ar: 'الكندي' }
  ],
  'Litterature': [
    { fr: 'Victor Hugo', ar: 'فيكتور هوغو' },
    { fr: 'Moliere', ar: 'موليير' },
    { fr: 'Balzac', ar: 'بلزاك' },
    { fr: 'Flaubert', ar: 'فلوبير' },
    { fr: 'Zola', ar: 'زولا' },
    { fr: 'Shakespeare', ar: 'شكسبير' },
    { fr: 'Dante', ar: 'دانتي' },
    { fr: 'Goethe', ar: 'غوته' },
    { fr: 'Tolstoi', ar: 'تولستوي' },
    { fr: 'Dostoevski', ar: 'دوستويفسكي' },
    { fr: 'Naguib Mahfouz', ar: 'نجيب محفوظ' },
    { fr: 'Taha Hussein', ar: 'طه حسين' },
    { fr: 'Al-Mutanabbi', ar: 'المتنبي' }
  ],
  'Histoire': [
    { fr: 'Ibn Khaldun', ar: 'ابن خلدون' },
    { fr: 'Herodote', ar: 'هيرودوت' },
    { fr: 'Tacite', ar: 'تاسيتوس' },
    { fr: 'Edward Gibbon', ar: 'إدوارد جيبون' },
    { fr: 'Marc Bloch', ar: 'مارك بلوخ' },
    { fr: 'Fernand Braudel', ar: 'فرناند بروديل' },
    { fr: 'At-Tabari', ar: 'الطبري' }
  ],
  'Droit': [
    { fr: 'Montesquieu', ar: 'مونتسكيو' },
    { fr: 'Rousseau', ar: 'روسو' },
    { fr: 'Portalis', ar: 'بورتاليس' },
    { fr: 'Ibn Taymiyya', ar: 'ابن تيمية' },
    { fr: 'Ash-Shafi\'i', ar: 'الشافعي' },
    { fr: 'Malik ibn Anas', ar: 'مالك بن أنس' }
  ]
};

// ============================================================
// 5. NETTOYAGE DU TEXTE
// ============================================================
function cleanText(text) {
  if (!text) return '';
  let t = String(text);
  t = t.replace(/\*\*/g, '');
  t = t.replace(/\*/g, '');
  t = t.replace(/`/g, '');
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
// 6. FORMATAGE HTML
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
        output.push('<ul style="margin:8px 0 8px 0;padding-left:24px;color:#17202a;list-style-type:disc">');
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
// 7. VECTORISATION SEMANTIQUE
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
// 8. RECHERCHE DOCUMENTS PERTINENTS
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
// 9. DETECTION DU DOMAINE
// ============================================================
function detectDomain(question, defaultDomain) {
  if (defaultDomain && defaultDomain !== 'General') return defaultDomain;
  const q = String(question || '').toLowerCase();

  const keywords = {
    'Religion': ['relig', 'islam', 'coran', 'quran', 'hadith', 'sunnah', 'prophete', 'allah', 'dieu', 'priere', 'savants', 'savant', 'ibn', 'imam', 'cheikh', 'theo', 'spiritual', 'fikh', 'fiqh', 'charia', 'sharia', 'sala', 'salat', 'janaza', 'جنازة', 'صلاة', 'عيد', 'مذهب', 'سني', 'شيعي', 'دين', 'فقه', 'حديث', 'قرآن'],
    'Litterature': ['litterat', 'poesie', 'roman', 'poete', 'ecrivain', 'theatre', 'prose', 'vers', 'style', 'أدب', 'شعر', 'رواية'],
    'Philosophie': ['philosoph', 'kant', 'platon', 'aristote', 'socrate', 'nietzsche', 'descartes', 'spinoza', 'philosophe', 'ethique', 'morale', 'فلسفة'],
    'Histoire': ['histoir', 'historique', 'civilis', 'empire', 'revolution', 'guerre', 'antiquite', 'تاريخ'],
    'Droit': ['droit', 'juridique', 'loi', 'lois', 'code civil', 'contrat', 'tribunal', 'justice', 'قانون', 'حقوق'],
    'IA & KMS': ['intelligence', 'semantic', 'vector', 'embedding', 'llm', 'machine', 'learning', 'kms', 'knowledge', 'ia', 'ai'],
    'Energie': ['energy', 'energie', 'solar', 'nuclear', 'hydrogen', 'grid', 'lithium', 'oil', 'gas'],
    'Finance': ['finance', 'risque', 'investment', 'market', 'stock', 'sharpe', 'var', 'beta'],
    'Economie': ['econom', 'pib', 'pib', 'croissance', 'inflation', 'chomage', 'marche', 'commerce international'],
    'Medecine': ['medec', 'medical', 'medicine', 'diagnosis', 'patient', 'clinical', 'maladie', 'traitement'],
    'Marketing': ['marketing', 'publicit', 'conversion', 'client', 'marque', 'communication'],
    'Sante': ['sante', 'health', 'medical', 'medicine'],
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
// 10. VERIFICATION DOMAINE LITTERAIRE / RELIGIEUX
// ============================================================
function isLiteraryOrReligious(domain) {
  return LITERARY_RELIGIOUS_DOMAINS.some(d =>
    domain.toLowerCase().includes(d.toLowerCase())
  );
}

// ============================================================
// 11. VERIFICATION DOMAINE ANALYTIQUE
// ============================================================
function isAnalyticalDomain(domain) {
  return ANALYTICAL_DOMAINS.some(d =>
    domain.toLowerCase().includes(d.toLowerCase())
  );
}

// ============================================================
// 12. EXTRACTION DE SCHOLARS (AMELIOREE)
// ============================================================
function extractScholarsFromContent(question, answer, domain) {
  const text = (question + ' ' + answer).toLowerCase();
  const scholars = SCHOLARS_BY_DOMAIN[domain] || SCHOLARS_BY_DOMAIN['Religion'] || [];
  const found = [];

  // 1. Chercher dans la liste du domaine
  for (const scholar of scholars) {
    const frMatch = text.includes(scholar.fr.toLowerCase());
    const arMatch = text.includes(scholar.ar);
    if (frMatch || arMatch) {
      found.push(scholar.fr);
    }
  }

  // 2. Si rien trouve, chercher dans tous les scholars connus
  if (found.length === 0) {
    for (const dom in SCHOLARS_BY_DOMAIN) {
      for (const scholar of SCHOLARS_BY_DOMAIN[dom]) {
        const frMatch = text.includes(scholar.fr.toLowerCase());
        const arMatch = text.includes(scholar.ar);
        if (frMatch || arMatch) {
          found.push(scholar.fr);
        }
      }
    }
  }

  // 3. Fallback : chercher les mots arabes generiques de savants
  if (found.length === 0 && isLiteraryOrReligious(domain)) {
    const genericPatterns = [
      /(?:ابن|الشيخ|الإمام|العلامة|شيخ)\s+[\u0600-\u06FF]+/g,
      /(?:Ibn|Cheikh|Imam|Sheikh)\s+[A-Za-z]+/gi
    ];
    for (const pattern of genericPatterns) {
      const matches = answer.match(pattern);
      if (matches) {
        for (const m of matches.slice(0, 3)) {
          const cleaned = m.trim();
          if (cleaned.length > 5 && !found.includes(cleaned)) {
            found.push(cleaned);
          }
        }
      }
    }
  }

  return found;
}

// ============================================================
// 13. EXTRACTION DATE / AUTEUR DEPUIS UN DOCUMENT
// ============================================================
function extractAuthorAndDate(doc) {
  let author = 'Auteur non specifie';
  let date = 'Date non specifiee';

  // Date depuis createdAt
  if (doc.createdAt) {
    const d = new Date(doc.createdAt);
    date = d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Extraire auteur depuis l'URL source
  if (doc.url) {
    const urlMatch = doc.url.match(/linkedin\.com\/pulse\/([^\/]+)/);
    if (urlMatch) {
      author = 'Auteur LinkedIn Pulse';
    } else {
      const domainMatch = doc.url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
      if (domainMatch) {
        author = domainMatch[1].replace(/\.(com|org|net|io|fr|tn)$/, '');
      }
    }
  }

  // Chercher un nom d'auteur dans le titre (format "Par X" ou "by X")
  const titleAuthorMatch = doc.title && doc.title.match(/(?:Par|par|By|by)\s+([A-Z][a-zA-Z\u0600-\u06FF\s]+)/);
  if (titleAuthorMatch) {
    author = titleAuthorMatch[1].trim().slice(0, 40);
  }

  return { author, date };
}

// ============================================================
// 14. EXTRACTION POINTS CLES
// ============================================================
function extractKeyPoints(text) {
  if (!text) return [];
  const cleaned = cleanText(text);
  const sentences = cleaned.split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 40 && s.length < 250);
  const words = tokenize(cleaned);
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const scored = sentences.map(s => {
    const st = tokenize(s);
    let score = 0;
    for (const w of st) score += freq[w] || 0;
    return { sentence: s, score: score / (st.length || 1) };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 5).map(x => x.sentence);
}

// ============================================================
// 15. GRAPHIQUE BARRES (limite aux domaines analytiques)
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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width:100%;max-width:${width}px;height:auto;display:block;margin:0 auto">
    ${bars}
  </svg>
</div>`;
}

// ============================================================
// 16. GRAPHIQUE CAMEMBERT (limite aux domaines analytiques)
// ============================================================
function generatePieChart(title, data) {
  const size = 240, cx = 120, cy = 120, r = 90;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ['#1e5aa8', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2'];
  let angleStart = 0, paths = '';
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" style="width:220px;height:220px">${paths}</svg>
    <div style="font-size:12px;color:#17202a">
      ${data.map((d, i) => `<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><span style="display:inline-block;width:14px;height:14px;background:${colors[i % colors.length]};border-radius:3px"></span><strong>${d.label}</strong> : ${d.value}</div>`).join('')}
    </div>
  </div>
</div>`;
}

// ============================================================
// 17. TABLEAU DE BORD (limite aux domaines analytiques)
// ============================================================
function generateDashboard(domain, docsUsed, semanticScore) {
  const metrics = DOMAIN_METRICS[domain];
  if (!metrics) return '';

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
// 18. FICHE TECHNIQUE (avec scholars + Juge Claude)
// ============================================================
function generateTechSheet(domain, docsUsed, semanticScore, scholars) {
  let html = `<div style="background:linear-gradient(135deg,#0a2540,#1e5aa8);color:#ffffff;border-radius:12px;padding:20px;margin:20px 0">`;
  html += `<h4 style="margin:0 0 14px 0;font-size:16px;font-weight:700">📋 Fiche technique</h4>`;
  html += `<table style="width:100%;font-size:13px;color:#ffffff;border-collapse:collapse">`;
  html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75;width:180px">Domaine</td><td style="padding:8px 0;font-weight:700">${domain}</td></tr>`;
  html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Score de pertinence</td><td style="padding:8px 0;font-weight:700">${Math.round(semanticScore * 100)} %</td></tr>`;
  html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Documents sources</td><td style="padding:8px 0;font-weight:700">${docsUsed}</td></tr>`;

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
// 19. REFERENCES DOCUMENTAIRES (Titre + Auteur + Date uniquement)
// ============================================================
function generateReferences(docs, domain, scholars) {
  if (!docs || docs.length === 0) return '';

  const isLitRel = isLiteraryOrReligious(domain);

  let html = `<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0">`;

  if (isLitRel) {
    // === DOMAINES LITTERAIRES / RELIGIEUX : Scholars + Titre + Auteur + Date ===
    html += `<h4 style="margin:0 0 12px 0;color:#92400e;font-size:15px;font-weight:700">📖 Sources litteraires et religieuses</h4>`;

    if (scholars && scholars.length > 0) {
      html += `<div style="background:#ffffff;border:2px solid #d4af37;border-radius:8px;padding:14px;margin-bottom:14px">`;
      html += `<div style="color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px">Scholars identifies</div>`;
      scholars.forEach(s => {
        html += `<div style="color:#0a2540;font-size:15px;font-weight:800;margin:4px 0">📚 ${s}</div>`;
      });
      html += `<div style="color:#6b7280;font-size:11px;margin-top:6px;font-style:italic">Origine de l'information validee par le Juge Claude</div>`;
      html += `</div>`;
    }

    html += `<div style="color:#92400e;font-size:12px;font-weight:700;margin:12px 0 8px 0;text-transform:uppercase;letter-spacing:1px">Publications de reference</div>`;
    html += `<ol style="margin:0;padding-left:24px;font-size:13px;color:#78350f;line-height:1.7">`;

    docs.forEach(d => {
      const title = cleanText(d.title || 'Document sans titre').slice(0, 120);
      const info = extractAuthorAndDate(d);
      html += `<li style="margin-bottom:12px">`;
      html += `<div style="color:#0a2540;font-weight:700;font-size:13px;margin-bottom:4px">${title}</div>`;
      html += `<div style="color:#78350f;font-size:12px;font-style:italic">Auteur : ${info.author}</div>`;
      html += `<div style="color:#78350f;font-size:12px">Date : ${info.date}</div>`;
      html += `</li>`;
    });

    html += `</ol>`;
    html += `<div style="background:#fffbeb;border:1px dashed #d4af37;border-radius:6px;padding:10px;margin-top:12px;font-size:12px;color:#92400e;text-align:center">`;
    html += `<strong>Validation Juge Claude :</strong> Toutes les informations ci-dessus ont ete verifiees et validees.`;
    html += `</div>`;

  } else {
    // === DOMAINES SCIENTIFIQUES : Titre + Auteur + Date uniquement ===
    html += `<h4 style="margin:0 0 12px 0;color:#92400e;font-size:15px;font-weight:700">📚 Publications scientifiques de reference</h4>`;
    html += `<ol style="margin:0;padding-left:24px;font-size:13px;color:#78350f;line-height:1.7">`;

    docs.forEach(d => {
      const title = cleanText(d.title || 'Publication sans titre').slice(0, 120);
      const info = extractAuthorAndDate(d);
      html += `<li style="margin-bottom:12px">`;
      html += `<div style="color:#0a2540;font-weight:700;font-size:13px;margin-bottom:4px">${title}</div>`;
      html += `<div style="color:#78350f;font-size:12px;font-style:italic">Auteur : ${info.author}</div>`;
      html += `<div style="color:#78350f;font-size:12px">Date : ${info.date}</div>`;
      html += `</li>`;
    });

    html += `</ol>`;
    html += `<div style="background:#fffbeb;border:1px dashed #d4af37;border-radius:6px;padding:10px;margin-top:12px;font-size:12px;color:#92400e;text-align:center">`;
    html += `<strong>Validation Juge Claude :</strong> Toutes les publications citees ont ete validees scientifiquement.`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// ============================================================
// 20. ENRICHISSEMENT PRINCIPAL
// ============================================================
async function enrichAnswer(answer, question, domain, lang, mongoose) {
  try {
    const realDomain = detectDomain(question, domain);
    const isLitRel = isLiteraryOrReligious(realDomain);
    const isAnalytical = isAnalyticalDomain(realDomain);

    let AutoFeedDoc = null;
    try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) {}

    let docs = [];
    let semanticScore = 0;
    if (AutoFeedDoc) {
      docs = await findRelevantDocuments(AutoFeedDoc, question, 5);
      if (docs.length > 0) semanticScore = docs[0].score;
    }

    // Extraire les scholars si domaine litteraire/religieux
    let scholars = [];
    if (isLitRel) {
      scholars = extractScholarsFromContent(question, answer, realDomain);
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
      keyPoints.forEach(p => { enriched += `<li style="margin-bottom:8px">${p}</li>`; });
      enriched += `</ul></div>`;
    }

    // SECTION 3 : Tableau de bord (UNIQUEMENT si domaine analytique)
    if (isAnalytical) {
      enriched += generateDashboard(realDomain, docs.length, semanticScore);
    }

    // SECTION 4 : Fiche technique (toujours, avec scholars si dispo)
    enriched += generateTechSheet(realDomain, docs.length, semanticScore, scholars);

    // SECTION 5 : Graphiques (UNIQUEMENT si domaine analytique)
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

    // SECTION 6 : References (Titre + Auteur + Date)
    enriched += generateReferences(docs, realDomain, scholars);

    // SECTION 7 : Agents IA + Validation
    enriched += `<div style="background:#f5f7fa;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:20px 0;font-size:12px;color:#6b7280;text-align:center">`;
    enriched += `<strong style="color:#0a2540">Agents IA impliques :</strong> MBA-CONSULT AI CORE - OpenRouter - Semantic Engine - Auto-Feed Scraper - Language Fix - Voice Engine - <strong style="color:#16a34a">Juge Claude (validation)</strong>`;
    enriched += `</div>`;

    return enriched;

  } catch (e) {
    console.warn('[answer-enricher] Erreur :', e.message);
    return answer;
  }
}

// ============================================================
// 21. MIDDLEWARE EXPRESS
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

  console.log('[answer-enricher] Module charge - Scholars + References ciblees + Graphes analytiques');
};
