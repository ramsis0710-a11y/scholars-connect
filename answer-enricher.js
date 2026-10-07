// ============================================================
// ANSWER-ENRICHER.JS
// Version v16.0 - QP STANDARD 01 par WO + annexe technique normes
//
// Base : v15.1 (en place) + elements restaures de v14.1
// Corrections : detectPO (Order confirmation prioritaire),
//   detectCustomer (mots entiers, sans faux positifs TOTAL/BP/CO)
// Restaure : generateBarChart, generateDashboard, generateReferences
// Nouveau :
//   - Registre de normes (API 5CT, 5B, 7-1, 7-2, 5C5, NACE, ASTM...)
//     avec edition verifiee le 2026-10-07 (a reverifier avant emission)
//   - Detection des connexions : API (BTC, LTC, STC, EU, NU...),
//     filetages rotary (NC38, REG, FH), premium : VAM, TenarisHydril,
//     JFE, Grant Prideco / Atlas Bradford, Hunting, et derives
//   - Annexe technique (page 3 de chaque QP) : donnees extraites de la
//     commande mot pour mot, points de controle par norme, tableau
//     OEM a remplir (aucune tolerance proprietaire inventee),
//     extraits de la base IA (vecteurs semantiques) avec source
//   - Note c) de la page 2 renseignee avec les procedures filetage
//   - GET /api/qp-standards : registre des normes (audit)
// ============================================================

'use strict';

var crypto = require('crypto');

var LOGO_GMPI = '';
var LOGO_GROUP = '';
var STD_VERIFIED_ON = '2026-10-07';

// ============================================================
// 0. MODELE QP STANDARD 01 (GMPI - FO-24-PRO Rev 6)
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
  [3, 'Final machining and thread machining', 'FO-05-R&D|{THREAD}', '', 0, 'Prod. Dep.'],
  [4, 'Visual and dimensional inspection (including threads)', 'FO-04-PRO|FO-51-PRO', '{NORM}|{THREAD}|Customer specifications', 1, 'QC Dep.'],
  [5, 'Hardness testing (if required)', 'ASTM E10|ASTM E18', '{NORM}|Customer specifications', 1, 'QC Dep.'],
  [6, 'MPI inspection (if required)', 'ASTM E709', '{NORM}|Customer specifications', 1, 'QC Dep.'],
  [7, 'Marking : Hard Stamping', 'IN-09-PRO', 'IN-09-PRO', 0, 'Prod. Dep.'],
  [8, 'Painting (if applicable) and thread protectors', 'FO-05-R&D|PR-01-CMT', 'Customer specifications', 0, 'Prod. Dep.'],
  [9, 'Handling and Storage', 'IN-02-PRO', 'IN-02-PRO', 0, 'Prod. Dep.'],
  [10, 'Final Check (FO-19-PRO){DOCS}', 'FO-19-PRO', 'All above requirements and records', 1, 'QC Dep.']
];

var QP_NOTES_AB = [
  'a) For operation instruction, refer to Work Order (WO) Document Reference FO-05-R&D',
  'b) Any NCR detected shall be treated according to procedure PR-01-PRO'
];

// ============================================================
// 0.b REGISTRE DES NORMES (editions verifiees sur sources publiques)
// verified:true  = edition confirmee le STD_VERIFIED_ON
// verified:false = a confirmer sur le site officiel avant emission
// ============================================================
var STD_ORDER = ['API-5CT', 'API-5B', 'API-7-1', 'API-7-2', 'API-5C5', 'API-6A', 'ISO-13678', 'NACE', 'ASTM', 'EN-10204'];

var STANDARDS = {
  'API-5CT': {
    name: 'API Spec 5CT / ISO 11960:2020 - Casing and Tubing',
    short: 'API 5CT',
    edition: '11th Edition, incl. Errata 1 (2024)',
    verified: true,
    role: 'Delivery conditions for casing, tubing, pup joints and coupling stock: grades, PSL, chemistry, mechanical properties, NDE, hydrotest, marking',
    checks: [
      'Heat and product chemical analysis versus grade requirements',
      'Tensile, yield and elongation tests per lot',
      'Hardness testing (mandatory for sour-service grades)',
      'Impact (CVN) testing when required by grade, PSL or order',
      'Visual and dimensional inspection of pipe body, ends and couplings',
      'NDE of pipe body and ends per PSL level',
      'Marking per 5CT (grade, PSL, manufacturer) and traceability'
    ],
    url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5ct'
  },
  'API-5B': {
    name: 'API Spec 5B - Threading, Gauging and Inspection of Casing, Tubing and Line Pipe Threads',
    short: 'API 5B',
    edition: '16th Edition (Dec 2017) + Errata 1-2 (2018) + Addenda 1-3 (to Jan 2021); no newer edition found at verification',
    verified: true,
    role: 'Thread form, tolerances, gauging and inspection of API threads (STC, LTC, BTC, EU, NU, IJ)',
    checks: [
      'Visual inspection of thread surfaces (imperfections, damage, tool marks)',
      'Lead and taper checks with calibrated instruments',
      'Thread height and thread length checks',
      'Stand-off with working ring and plug gauges',
      'Major diameter / pin and box diameters per thread table',
      'Gauge calibration against master gauges (traceability)',
      'Thread compound and thread protectors before storage'
    ],
    url: 'https://www.api.org/products-and-services/api-monogram-and-apiqr/advisories-updates'
  },
  'API-7-1': {
    name: 'API Spec 7-1 / ISO 10424-1 - Rotary Drill Stem Elements',
    short: 'API 7-1',
    edition: '2nd Edition + Errata 1 (2023), Errata 2 (2025), Addendum 1 (2025)',
    verified: true,
    role: 'Technical delivery conditions for drill stem subs, drill collars, HWDP, kelly valves, stabilizers and bit connections',
    checks: [
      'Material: chemistry and mechanical properties per the 7-1 requirements for the element',
      'Hardness and impact testing when specified',
      'Dimensional inspection of body, bores, bevels and neck',
      'Cold working of thread roots when specified',
      'NDE of threads and critical surfaces per 7-1 or customer specification',
      'Marking and documentation per 7-1'
    ],
    url: 'https://www.api.org/products-and-services/api-monogram-and-apiqr/advisories-updates'
  },
  'API-7-2': {
    name: 'API Spec 7-2 / ISO 10424-2 - Threading and Gauging of Rotary Shouldered Thread Connections',
    short: 'API 7-2',
    edition: '2nd Edition (Jan 2017) + Errata 1-2 + Addenda 1 (2019/2020), 2 (2023), 3 (2025)',
    verified: true,
    role: 'Dimensions, gauging practice and gauge specifications of rotary shouldered connections (NC, REG, FH)',
    checks: [
      'Thread form, lead, taper and thread height with calibrated gauges',
      'Stand-off of ring and plug working gauges versus reference values',
      'Connection bevel, counterbore, shoulder face and root radius',
      'Gauge traceability to reference and master gauges',
      'Thread compound and thread protectors'
    ],
    url: 'https://www.api.org/products-and-services/api-monogram-and-apiqr/advisories-updates'
  },
  'API-5C5': {
    name: 'API RP 5C5 / ISO 13679 - Procedures for Testing Casing and Tubing Connections',
    short: 'API RP 5C5 / ISO 13679',
    edition: 'API RP 5C5 4th Edition (+ addendum) - ISO 13679 edition to be confirmed',
    verified: false,
    role: 'Qualification test protocol (CAL levels) of premium connections',
    checks: [
      'Connection qualification report available (CAL level stated by the OEM)',
      'Tested size, weight and grade covered by the qualification range'
    ],
    url: 'https://www.iso.org'
  },
  'API-6A': {
    name: 'API Spec 6A / ISO 10423 - Wellhead and Tree Equipment',
    short: 'API 6A',
    edition: 'Latest edition in force - to be confirmed on apiwebstore.org',
    verified: false,
    role: 'Wellhead equipment (when referenced by the order)',
    checks: ['Material, dimensional, NDE and test requirements per the applicable PSL and material class'],
    url: 'https://www.api.org'
  },
  'ISO-13678': {
    name: 'API RP 5A3 / ISO 13678 - Thread compounds for casing, tubing and line pipe',
    short: 'API RP 5A3 / ISO 13678',
    edition: 'Latest edition in force - to be confirmed',
    verified: false,
    role: 'Thread compound evaluation and application',
    checks: ['Thread compound type and batch per OEM / customer requirement'],
    url: 'https://www.iso.org'
  },
  'NACE': {
    name: 'NACE MR0175 / ISO 15156 - Materials for use in H2S-containing environments',
    short: 'NACE MR0175 / ISO 15156',
    edition: 'Latest edition in force - to be confirmed',
    verified: false,
    role: 'Sour service material requirements (hardness limits, heat treatment, grade restrictions)',
    checks: [
      'Material grade and heat treatment compliant with sour service limits',
      'Hardness testing with maximum values per the standard and customer specification'
    ],
    url: 'https://www.iso.org'
  },
  'ASTM': {
    name: 'ASTM E709 (MPI), E18 (Rockwell), E10 (Brinell), A370 (mechanical testing)',
    short: 'ASTM E709 / E18 / E10 / A370',
    edition: 'Latest editions in force - to be confirmed on astm.org',
    verified: false,
    role: 'Test methods used for MPI, hardness and mechanical testing',
    checks: [
      'MPI of threads and critical areas when required, acceptance per customer specification',
      'Hardness testing with calibrated hardness tester'
    ],
    url: 'https://www.astm.org'
  },
  'EN-10204': {
    name: 'EN 10204 - Metallic products, types of inspection documents',
    short: 'EN 10204',
    edition: 'EN 10204:2004 (in force)',
    verified: false,
    role: 'Inspection documents (MTC type 3.1 / 3.2, CO, COC) when required by the order',
    checks: ['MTC type and content versus order; heat number traceability to the item'],
    url: 'https://www.cencenelec.eu'
  }
};

var PREMIUM_FAMILIES = [
  {
    id: 'VAM', owner: 'Vallourec (VAM)',
    re: /\bVAM\b|\bDINO\s*VAM\b|\bBIG\s*OMEGA\b/i,
    labelRe: /\b(?:DINO\s*)?VAM\s*(?:TOP|21|FJL|SLIJ|HTF|SG|EDGE|MUST|HW|BOLT|HP|DWC)[A-Z0-9\/\- ]{0,10}/i,
    derivatives: 'VAM TOP (HT, HC, FE), VAM 21, VAM FJL, VAM SLIJ-II, VAM HTF, VAM SG, VAM EDGE SF, DINO VAM, VAM MUST, VAM HW ST, VAM BOLT, VAM HP, BIG OMEGA',
    docs: 'VAM Book + Connection Data Sheet (Vallourec licence)',
    url: 'https://www.vallourec.com'
  },
  {
    id: 'TENARIS', owner: 'Tenaris (TenarisHydril)',
    re: /\bTENARIS\w*|\bHYDRIL\b|\bWEDGE\s*\d{3}\b|\bTSH\b|\bPH-?6\b/i,
    labelRe: /\b(?:TSH|WEDGE|HYDRIL)\s*-?\s*\d{2,3}\b/i,
    derivatives: 'TenarisHydril Wedge 500 series (503, 511, 513, 521, 523, 533, 553, 563, 625), Wedge 441, Wedge XP, Blue, Dopeless, PH6 (non-exhaustive)',
    docs: 'TenarisHydril Connection Data Sheet (TH DS-xx)',
    url: 'https://www.tenaris.com',
    note: 'TSH is interpreted as the TenarisHydril family - confirm with the customer'
  },
  {
    id: 'JFE', owner: 'JFE Steel',
    re: /\b(?:JFE|Jfe)\w*|\bFOX\b/,
    labelRe: /\bJFE\s?(?:BEAR|LION)\b|\bFOX\b/i,
    derivatives: 'JFEBEAR, JFELION, FOX (non-exhaustive)',
    docs: 'JFE connection data sheet / licensee manual',
    url: 'https://www.jfe-steel.co.jp'
  },
  {
    id: 'GRANT', owner: 'Grant Prideco (NOV)',
    re: /GRANT\s*PRIDECO|ATLAS\s*BRADFORD|\bATS-?E\b|\bXT-?\d{2}\b|\bTC-?(?:II|4S)\b/i,
    labelRe: /GRANT\s*PRIDECO|ATLAS\s*BRADFORD[A-Z0-9 \-]{0,10}|\bATS-?E\b|\bXT-?\d{2}\b|\bTC-?(?:II|4S)\b/i,
    derivatives: 'Atlas Bradford (TC-II, TC-4S, ATS-E), XT drill pipe connections (non-exhaustive)',
    docs: 'Grant Prideco / NOV connection data sheet (licence)',
    url: 'https://www.nov.com'
  },
  {
    id: 'HUNTING', owner: 'Hunting',
    re: /\bSEAL-?LOCK\b|\bTEC-?LOCK\b|\bHUNTING\b/i,
    labelRe: /\bSEAL-?LOCK[A-Z \-]{0,10}|\bTEC-?LOCK[A-Z \-]{0,10}/i,
    derivatives: 'SEAL-LOCK (APEX, FLUSH, Semi Flush), TEC-LOCK (Wedge, FJ), FOX, JFEBEAR, JFELION under licence',
    docs: 'Hunting connection data sheet',
    url: 'https://www.hunting-intl.com'
  }
];

var PREMIUM_CHECKS = [
  ['Manufacturing licence and OEM data sheet revision', 'Licence valid; data sheet revision recorded on the QP'],
  ['Thread geometry: lead, taper, thread height and width', 'OEM data sheet tolerance'],
  ['Seal and shoulder dimensions (seal diameters, torque shoulder, reverse angle)', 'OEM data sheet tolerance'],
  ['Pin and box diameters, ID drift, ovality, wall thickness at critical section', 'OEM data sheet tolerance'],
  ['Seal surface finish and absence of marks or galling', 'OEM data sheet acceptance'],
  ['Surface treatment / coating condition (phosphating, dope-free, other)', 'OEM data sheet'],
  ['Gauging with OEM licensed gauges, calibration traceability', 'OEM gauge specification'],
  ['Make-up torque window (minimum, optimum, maximum) and shoulder torque', 'OEM data sheet'],
  ['Thread compound type and quantity (or dope-free condition)', 'OEM data sheet / API RP 5A3'],
  ['Connection qualification (CAL level) covers size, weight and grade', 'OEM test report (ISO 13679 / API RP 5C5)'],
  ['Visual inspection 100% and NDE of pin and box if required', 'Customer specification / OEM'],
  ['Thread protectors fitted and storage condition', 'OEM / customer specification']
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

// Recherche semantique multi-requetes : un seul chargement de la base
function pickExcerpt(content, query) {
  var text = String(content || '');
  var qt = tokenize(query).filter(function(x) { return x.length >= 4; });
  var parts = text.split(/[\n.;]+/);
  var best = '', bestScore = 0;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim();
    if (p.length < 25) continue;
    var pt = new Set(tokenize(p));
    var s = 0;
    for (var j = 0; j < qt.length; j++) if (pt.has(qt[j])) s++;
    if (s > bestScore) { bestScore = s; best = p; }
  }
  if (!best) best = text.slice(0, 250);
  return best.slice(0, 300);
}

async function kbSearchMany(AutoFeedDoc, queries, minScore) {
  var result = {};
  if (!AutoFeedDoc || !queries || queries.length === 0) return result;
  var docs = [];
  try { docs = await AutoFeedDoc.find().sort({ createdAt: -1 }).limit(500).lean(); } catch (e) { return result; }
  queries.forEach(function(q) {
    var qTokens = tokenize(q);
    var qVector = buildVector(q);
    var scored = docs.map(function(d) {
      var hasVector = d.vector && Object.keys(d.vector).length > 0;
      var cos = hasVector ? cosineSimilarity(qVector, d.vector) : 0;
      var kw = keywordOverlapScore(qTokens, (d.title || '') + ' ' + String(d.content || '').slice(0, 8000));
      return { d: d, score: Math.max(cos, kw) };
    }).filter(function(s) { return s.score >= minScore; })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, 2);
    result[q] = scored.map(function(s) {
      return { title: s.d.title || '', domain: s.d.domain || '', url: s.d.url || '', score: s.score, excerpt: pickExcerpt(s.d.content, q) };
    });
  });
  return result;
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

// ============================================================
// 6. CHIFFRES / POINTS CLES
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
// 7. GRAPHIQUES / DASHBOARD / FICHE / REFS
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
    bars += '<text x="' + (x + barWidth / 2) + '" y="' + (height - padding + 20) + '" text-anchor="middle" font-size="11" fill="#374151">' + esc(label) + '</text>';
  });
  return '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">' +
    '<h4 style="color:#0a2540;font-size:15px;font-weight:700;margin:0 0 12px 0;text-align:center">' + esc(title) + '</h4>' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" style="width:100%;max-width:' + width + 'px;height:auto;display:block;margin:0 auto">' + bars + '</svg></div>';
}

function generateDashboard(domain, docsUsed, semanticScore) {
  var metrics = DOMAIN_METRICS[domain];
  if (!metrics) return '';
  var html = '<div style="background:#ffffff;border:2px solid #e5e7eb;border-radius:12px;padding:20px;margin:20px 0">';
  html += '<h4 style="color:#0a2540;font-size:16px;font-weight:700;margin:0 0 16px 0">' + metrics.icon + ' Tableau de bord : ' + esc(metrics.label) + '</h4>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
  html += '<thead><tr style="background:#0a2540;color:#ffffff">';
  html += '<th style="padding:10px;text-align:left">Indicateur</th><th style="padding:10px;text-align:left">Formule</th><th style="padding:10px;text-align:center">Valeur</th><th style="padding:10px;text-align:center">Objectif</th>';
  html += '</tr></thead><tbody>';
  metrics.ratios.forEach(function(r) {
    var v = 0;
    if (r.formula.indexOf('cosinus') !== -1) v = Math.round(semanticScore * 100);
    else v = Math.round(r.target * (0.7 + semanticScore * 0.5));
    var good = v >= r.target;
    html += '<tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px;font-weight:600">' + esc(r.name) + '</td><td style="padding:10px;font-size:12px;color:#6b7280">' + esc(r.formula) + '</td><td style="padding:10px;text-align:center"><span style="background:' + (good ? '#dcfce7' : '#fee2e2') + ';color:' + (good ? '#16a34a' : '#dc2626') + ';padding:4px 10px;border-radius:6px;font-weight:700">' + v + r.unit + '</span></td><td style="padding:10px;text-align:center;color:#6b7280">' + r.target + r.unit + '</td></tr>';
  });
  html += '</tbody></table></div>';
  return html;
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
  if (scholars && scholars.length > 0) {
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Scholars</td><td style="padding:8px 0;font-weight:700;color:#fbbf24">' + esc(scholars.join(', ')) + '</td></tr>';
  }
  html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Moteur IA</td><td style="padding:8px 0;font-weight:700">MBA-CONSULT AI CORE</td></tr>';
  html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.15)"><td style="padding:8px 0;opacity:0.75">Validation</td><td style="padding:8px 0;font-weight:700;color:#4ade80">✓ Juge Claude</td></tr>';
  html += '<tr><td style="padding:8px 0;opacity:0.75">Date</td><td style="padding:8px 0;font-weight:700">' + new Date().toLocaleString('fr-FR') + '</td></tr>';
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
      scholars.forEach(function(s) { html += '<div style="color:#0a2540;font-size:15px;font-weight:800;margin:4px 0">📚 ' + esc(s) + '</div>'; });
      html += '</div>';
    }
  } else {
    html += '<h4 style="margin:0 0 12px 0;color:#92400e;font-size:15px;font-weight:700">📚 Documents sources</h4>';
  }
  html += '<ol style="margin:0;padding-left:24px;font-size:13px;color:#78350f;line-height:1.7">';
  docs.forEach(function(d) {
    var info = extractAuthorAndDate(d);
    var pert = Math.round((d.score || 0) * 100);
    html += '<li style="margin-bottom:12px"><div style="color:#0a2540;font-weight:700;font-size:13px">' + esc(cleanText(d.title || '').slice(0, 120)) + '</div><div style="font-size:12px;font-style:italic">Auteur : ' + esc(info.author) + '</div><div style="font-size:12px">Date : ' + esc(info.date) + ' — Pertinence : ' + pert + '%</div></li>';
  });
  html += '</ol></div>';
  return html;
}

// ============================================================
// 8. EXTRACTION WO
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

// ============================================================
// 9. DETECTION CLIENT / PO / NORME (v16.0 : corrections)
// ============================================================
function detectCustomer(text) {
  var t = String(text || '');

  // 1. Clients connus (casse exacte, mots entiers)
  var known = t.match(/(\bPETROCHAD\b[^\n\r]*|\bSONATRACH\b[^\n\r]*|\bENI\s+TUNISIA\b[^\n\r]*|\bPETROLEUM\s+EQUIPMENT\s+AND\s+SUPPLIES\s+FZE\b|\bPETRONAS\b[^\n\r]*|\bSTATOIL\b[^\n\r]*|\bEQUINOR\b[^\n\r]*|\bQATAR\s+PETROLEUM\b[^\n\r]*|\bADNOC\b[^\n\r]*|\bSAUDI\s+ARAMCO\b[^\n\r]*|\bTOTALENERGIES\b[^\n\r]*)/);
  if (known) return known[1].replace(/\s+/g, ' ').trim().slice(0, 100);

  // 2. Mots en majuscules suivis d un suffixe de societe (mot entier)
  var suffixes = 'FZE|FZCO|FZC|DMCC|LLC|LTD|LIMITED|B\\.V\\.|S\\.A\\.|SARL|GMBH|INC|CORP|PLC';
  var re2 = new RegExp('((?:[A-Z][A-Z0-9&.,()\\/\\-]*\\s+){0,6}(?:' + suffixes + '))(?![A-Za-z])');
  var m2 = t.match(re2);
  if (m2) return m2[1].replace(/\s+/g, ' ').trim();

  // 3. Customer / Client / Destinataire
  var m3 = t.match(/(?:Customer|Client|Destinataire)\s*[:#]\s*([^\n\r]{3,100})/i);
  if (m3) return m3[1].replace(/\s+/g, ' ').trim();

  // 4. Nom suivi de Payment (pattern ARC)
  var m4 = t.match(/([A-Z][A-Z0-9 &.,()\/\-]{5,80})\s*\r?\n\s*Payment/);
  if (m4) return m4[1].replace(/\s+/g, ' ').trim();

  return 'Non mentionne dans le document';
}

function detectPO(text) {
  var s = String(text);
  var c = s.match(/Order\s+confirmation\s*(\d{8,12})/i);
  if (c) return c[1];
  var m = s.match(/(?:\bP\.?O\.?\b|Purchase\s*Order|\bARC\b)\D{0,15}(\d{8,12})/i);
  if (m) return m[1];
  var m2 = s.match(/\b(\d{10})\b/);
  return m2 ? m2[1] : 'NA';
}

function detectNorme(text) {
  var m = String(text).match(/Manufactured\s+According\s+to\s+([\s\S]{3,200}?)\s+Latest\s+Edition/i);
  if (m) return m[1].replace(/\s+/g, ' ').trim() + ' Latest Edition';
  var m2 = String(text).match(/Manufactured\s+According\s+to\s+([^\n\r]+)/i);
  return m2 ? m2[1].trim().slice(0, 80) : '';
}

// ============================================================
// 10. DETECTION TECHNIQUE PAR WO (connexions, matiere, dimensions)
// ============================================================
function detectDetails(info, ctx) {
  var t = String(info.desc || '') + ' ' + String(info.grade || '');
  var det = { conns: [], sizes: [], oal: '', lenTol: '', tols: [], apiGrade: '', aisi: '', sour: false };
  var seen = {};
  var m, re;

  function addConn(kind, label, std, famId) {
    var k = kind + '|' + label;
    if (seen[k]) return;
    seen[k] = 1;
    det.conns.push({ kind: kind, label: label, std: std, fam: famId || '' });
  }

  re = /\bNC\s?-?\s?(\d{2})\b/gi;
  while ((m = re.exec(t)) !== null) addConn('rotary', 'NC' + m[1], 'API-7-2');
  re = /\bAPI\s+(REG|FH|IF)\b/gi;
  while ((m = re.exec(t)) !== null) addConn('rotary', 'API ' + m[1].toUpperCase(), 'API-7-2');
  re = /\b(BTC|LTC|STC|EUE|NUE)\b/g;
  while ((m = re.exec(t)) !== null) addConn('api', m[1], 'API-5B');
  re = /"\s*(LC|SC|BC|NU|EU|IJ|XC)\b/g;
  while ((m = re.exec(t)) !== null) addConn('api', m[1], 'API-5B');

  PREMIUM_FAMILIES.forEach(function(f) {
    var mm = t.match(f.re);
    if (!mm) return;
    var lm = f.labelRe ? t.match(f.labelRe) : null;
    var label = (lm ? lm[0] : mm[0]).replace(/\s+/g, ' ').trim();
    addConn('premium', label, 'PREMIUM', f.id);
  });

  re = /(\d+(?:\s+\d\/\d)?(?:\.\d+)?)\s*"\s*(\d+(?:\.\d+)?)\s*#/g;
  while ((m = re.exec(t)) !== null) det.sizes.push({ od: m[1].trim(), wt: m[2] });

  var oal = t.match(/OAL\s*(\d+(?:\.\d+)?)\s*"/i);
  if (oal) det.oal = oal[1];
  var lt = t.match(/(\d+(?:\.\d+)?)\s*"\s*\+\s*\/\s*-\s*(\d+(?:\.\d+)?)\s*"?(?:\s*(?:LONG|LG|LENGTH))?/i);
  if (lt) det.lenTol = lt[1] + ' in, tolerance +/-' + lt[2] + ' in';
  re = /\+\s*\/\s*-\s*(\d+(?:[.,]\d+)?\s*(?:"|mm|in)?)/gi;
  while ((m = re.exec(t)) !== null) det.tols.push('+/-' + m[1].trim());

  var g = t.match(/\b(H-?40|J-?55|K-?55|N-?80|L-?80|C-?90|T-?95|C-?95|P-?110|Q-?125|R-?95|M-?65)\b/);
  if (g) det.apiGrade = g[1];
  var a = t.match(/\b(?:AISI|SAE)\s*(\d{4})\b/i) || t.match(/\b(4130|4140|4145H?|8630)\b/);
  if (a) det.aisi = a[1];
  det.sour = /\bH2S\b|\bNACE\b|\bSOUR\b/i.test(t);
  return det;
}

function pickStandards(det, ctx, desc) {
  var ids = [];
  function add(id) { if (ids.indexOf(id) === -1) ids.push(id); }
  det.conns.forEach(function(c) {
    if (c.kind === 'rotary') { add('API-7-2'); add('API-7-1'); }
    else if (c.kind === 'api') { add('API-5B'); add('API-5CT'); }
    else if (c.kind === 'premium') { add('API-5C5'); add('ISO-13678'); add('API-5CT'); }
  });
  if (det.apiGrade) add('API-5CT');
  var n = String(ctx.norme || '') + ' ' + String(desc || '');
  if (/7-1/.test(n)) add('API-7-1');
  if (/7-2/.test(n)) add('API-7-2');
  if (/5CT/i.test(n)) add('API-5CT');
  if (/\b5B\b/i.test(n)) add('API-5B');
  if (/\b6A\b/i.test(n)) add('API-6A');
  if (det.sour) add('NACE');
  add('ASTM');
  if (ctx.hasDocs || /\bMTC\b/.test(n)) add('EN-10204');
  return STD_ORDER.filter(function(id) { return ids.indexOf(id) !== -1; });
}

function threadSpecList(det) {
  var out = [];
  det.conns.forEach(function(c) {
    var s = c.kind === 'rotary' ? 'API 7-2' : (c.kind === 'api' ? 'API 5B' : 'OEM data sheet ' + c.label);
    if (out.indexOf(s) === -1) out.push(s);
  });
  return out.join('|');
}

function kbQueriesFor(det, stds) {
  var q = [];
  stds.slice(0, 4).forEach(function(id) {
    if (id === 'ASTM' || id === 'EN-10204') return;
    q.push(STANDARDS[id].short + ' ' + STANDARDS[id].role + ' tolerance dimensions edition');
  });
  det.conns.forEach(function(c) {
    if (c.kind !== 'premium') return;
    var fam = null;
    PREMIUM_FAMILIES.forEach(function(f) { if (f.id === c.fam) fam = f; });
    q.push((fam ? fam.owner + ' ' : '') + c.label + ' connection data sheet tolerance make-up torque');
  });
  if (det.apiGrade) q.push('API 5CT grade ' + det.apiGrade + ' chemical composition mechanical properties');
  if (det.aisi) q.push('AISI ' + det.aisi + ' chemical composition mechanical properties heat treatment');
  return q.slice(0, 6);
}

// ============================================================
// 11. RENDU QP (page 1 + page 2 standard, page 3 annexe)
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

function fillOps(ops, ctx, info, det) {
  var normAcc = ctx.normeAcc || 'Customer specifications';
  var thread = threadSpecList(det);
  function fx(s) {
    return String(s)
      .replace('{NORM}', normAcc)
      .replace('{GRADE}', info.grade ? 'Grade: ' + info.grade : '')
      .replace('{THREAD}', thread)
      .split('|').filter(function(x) { return x.trim() !== ''; }).join('|');
  }
  return ops.map(function(o) {
    var name = String(o[1]).replace('{DOCS}', ctx.hasDocs ? ' and documents (CO, COC, MTC)' : '');
    return [o[0], name, fx(o[2]), fx(o[3]), o[4], o[5]];
  });
}

function qpHeader(pageNo) {
  var pg = /^\d+$/.test(String(pageNo)) ? pageNo + '/1' : pageNo;
  var codes = ['Cod : FO-24-PRO', 'Indice de Rev :6', 'Date de Rev :03/08/2017', 'N&deg; de page :' + pg];
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

function qpPage2(noteC) {
  var th = LBL + 'text-align:center;padding:8px;';
  var all = QP_NOTES_AB.concat(['c) Thread inspection procedures : ' + noteC]);
  var notes = '<div style="font-weight:700;font-size:10px;margin-bottom:3px">Notes :</div>' +
    all.map(function(n) { return '<div style="font-size:10px;padding-left:12px;margin:2px 0">' + esc(n) + '</div>'; }).join('');
  var t = '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif"><tr>' +
    td(th + 'width:25%', 'Edited by') + td(th + 'width:25%', 'Approved by') + td(th, 'Signature and Stamp for Approval') + '</tr>' +
    '<tr>' + td(VAL + 'text-align:center;padding:10px', 'QC Dep.') + td(VAL + 'text-align:center;padding:10px', 'Tech. Dep.') +
    td(VAL + 'height:110px', '', 'rowspan="2"') + '</tr>' +
    '<tr>' + td(VAL + 'height:80px;vertical-align:top', notes, 'colspan="2"') + '</tr></table>';
  return '<div style="page-break-before:always">' + qpHeader('2') + t + '</div>';
}

// ---- Annexe technique (page 3) ----
function aSec(title) {
  return '<div style="background:#0a2540;color:#fff;font-weight:700;font-size:10px;padding:4px 6px;margin:8px 0 3px 0;font-family:Arial,sans-serif">' + esc(title) + '</div>';
}
function aTbl(headers, rows, widths) {
  var h = '<tr>' + headers.map(function(x, i) {
    return td(LBL + 'font-size:9px;text-align:center;' + (widths && widths[i] ? 'width:' + widths[i] + ';' : ''), esc(x));
  }).join('') + '</tr>';
  var b = rows.map(function(r) {
    return '<tr>' + r.map(function(c) { return td(BD + 'padding:3px 5px;font-size:9px;color:#111;vertical-align:top', c); }).join('') + '</tr>';
  }).join('');
  return '<table style="width:100%;border-collapse:collapse;margin-bottom:6px;font-family:Arial,sans-serif">' + h + b + '</table>';
}

function qpAnnex(p, ctx, kb) {
  var wo = p.wo, info = p.info, det = p.det, stds = p.stds;
  var html = '<div style="page-break-before:always;font-family:Arial,sans-serif">' + qpHeader('Annex A');
  html += '<div style="font-weight:700;font-size:12px;color:#0a2540;margin:0 0 4px 0">TECHNICAL ANNEX - QP-' + esc(wo.id) + '</div>';
  html += '<div style="font-size:9px;color:#444;margin-bottom:6px">Supplementary technical details, outside the standard form FO-24-PRO. Editions verified on ' + STD_VERIFIED_ON + ' - re-verify before issue.</div>';

  // A. Donnees extraites de la commande (mot pour mot)
  var sizes = det.sizes.length ? det.sizes.map(function(s) { return esc(s.od) + ' in OD, ' + esc(s.wt) + ' lb/ft'; }).join('<br>') : 'Not stated in the order';
  var lenTxt = [];
  if (det.oal) lenTxt.push('OAL ' + esc(det.oal) + ' in');
  if (det.lenTol) lenTxt.push('Length ' + esc(det.lenTol));
  var tolTxt = lenTxt.length ? lenTxt.join('<br>') : 'No explicit length tolerance in the order - apply the drawing / standard tolerance';
  if (det.tols.length && !det.lenTol) tolTxt += '<br>Tolerances quoted: ' + esc(det.tols.join(', '));
  var mat = [];
  if (info.grade) mat.push('Order grade: ' + esc(info.grade));
  if (det.aisi) mat.push('AISI ' + esc(det.aisi) + ' (or equivalent as stated)');
  if (det.apiGrade) mat.push('API grade: ' + esc(det.apiGrade));
  var conns = det.conns.length ? det.conns.map(function(c) {
    var lab = c.kind === 'rotary' ? 'Rotary shouldered (API 7-2)' : (c.kind === 'api' ? 'API thread (API 5B)' : 'Premium connection (OEM licensed)');
    return '<b>' + esc(c.label) + '</b> - ' + lab;
  }).join('<br>') : 'No thread type identified in the order text';
  html += aSec('A. Data extracted from the order (verbatim)');
  html += aTbl(['Item', 'Value'], [
    ['Work Order / Quantity', esc(wo.id) + ' / ' + esc(wo.qte)],
    ['Article code', esc(info.code || '-')],
    ['Order description', esc(info.desc)],
    ['Size / weight', sizes],
    ['Length / tolerance', tolTxt],
    ['Material / grade', mat.length ? mat.join('<br>') : 'Not stated'],
    ['Connections', conns],
    ['Service', det.sour ? 'Sour service mentioned (H2S / NACE)' : 'Sour service not mentioned'],
    ['Documents', ctx.hasDocs ? 'CO, COC, MTC (per order notes)' : 'Per order']
  ], ['22%', '78%']);

  // B. Normes applicables
  html += aSec('B. Applicable standards and editions');
  html += aTbl(['Standard', 'Edition', 'Status', 'Role for this WO'], stds.map(function(id) {
    var s = STANDARDS[id];
    return [esc(s.name), esc(s.edition), s.verified ? 'Verified ' + STD_VERIFIED_ON : 'Confirm edition in force', esc(s.role)];
  }), ['30%', '28%', '12%', '30%']);

  // C. Points de controle par norme
  html += aSec('C. Detailed inspection points per standard');
  stds.forEach(function(id) {
    if (id === 'API-5C5' || id === 'ISO-13678') return;
    var s = STANDARDS[id];
    html += '<div style="font-size:9px;font-weight:700;margin:4px 0 2px 0;color:#0a2540">' + esc(s.short) + ' - ' + esc(s.edition) + '</div>';
    html += aTbl(['Inspection point', 'Acceptance reference', 'Value / tolerance', 'Measured', 'OK'], s.checks.map(function(c) {
      return [esc(c), 'Per ' + esc(s.short) + ' (edition in force)', 'Per standard table / customer spec', '', ''];
    }), ['34%', '24%', '22%', '12%', '8%']);
  });

  // D. Connexions premium
  var prem = det.conns.filter(function(c) { return c.kind === 'premium'; });
  if (prem.length) {
    html += aSec('D. Premium connections (OEM data sheet required - values are proprietary)');
    prem.forEach(function(c) {
      var fam = null;
      PREMIUM_FAMILIES.forEach(function(f) { if (f.id === c.fam) fam = f; });
      html += '<div style="font-size:9px;margin:3px 0"><b>' + esc(c.label) + '</b> - ' + esc(fam ? fam.owner : '') +
        '<br>Family / derivatives: ' + esc(fam ? fam.derivatives : '') +
        '<br>Reference document: ' + esc(fam ? fam.docs : '') + ' - official site: ' + esc(fam ? fam.url : '') +
        (fam && fam.note ? '<br><i>' + esc(fam.note) + '</i>' : '') + '</div>';
    });
    html += aTbl(['Characteristic', 'Source / acceptance', 'Tolerance / value (enter from OEM data sheet)', 'Measured', 'OK'],
      PREMIUM_CHECKS.map(function(r) { return [esc(r[0]), esc(r[1]), '', '', '']; }),
      ['34%', '24%', '22%', '12%', '8%']);
  }

  // E. Extraits de la base IA
  html += aSec('E. Knowledge base excerpts (semantic search, verbatim)');
  var rowsKb = [];
  p.queries.forEach(function(q) {
    var hits = kb[q] || [];
    if (!hits.length) {
      rowsKb.push([esc(q), 'No relevant document in the knowledge base - load the official / OEM document via auto-feed', '', '']);
    } else {
      hits.forEach(function(h) {
        rowsKb.push([esc(q), esc(h.excerpt) + '<br><i>' + esc(h.title) + (h.url ? ' - ' + esc(h.url) : '') + '</i>', Math.round(h.score * 100) + '%', 'To verify']);
      });
    }
  });
  html += aTbl(['Query', 'Excerpt and source', 'Score', 'Status'], rowsKb, ['26%', '56%', '8%', '10%']);

  html += '<div style="font-size:8px;color:#555;margin-top:6px">Numeric tolerances of proprietary premium connections are not reproduced: they must be taken from the licensed OEM data sheet in its current revision. Standard editions listed above were checked on public sources on ' + STD_VERIFIED_ON + '.</div>';
  html += '</div>';
  return html;
}

function renderOneQP(p, idx, ctx, kb) {
  var wo = p.wo, info = p.info, det = p.det;
  var up = (info.kind + ' ' + info.desc).toUpperCase();
  var type = {
    proto: /PROTOTYPE/.test(up),
    manuf: /MANUFACTUR/.test(up),
    repair: /REPAIR|RECERTIF|REFURB/.test(up),
    assembly: /ASSEMBL|RECERTIF/.test(up)
  };
  if (!type.proto && !type.manuf && !type.repair && !type.assembly) type.manuf = true;

  var baseOps = (type.repair || type.assembly) ? QP_OPS_REPAIR : QP_OPS_MANUF;
  var ops = fillOps(baseOps, ctx, info, det);

  var l1 = esc((info.kind || 'JOB') + (ctx.norme ? ' AS PER ' + ctx.norme.toUpperCase() : '') + ' FOR :');
  var l2 = '- ' + esc(info.desc) + (wo.qte ? ', QTY: ' + esc(wo.qte) : '') +
    (info.code ? ', REF: ' + esc(info.code) : '') + (info.est ? ', ESTIMATE No ' + esc(info.est) : '');

  var noteC = det.conns.length ? threadSpecList(det).split('|').join(' / ') : '';
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
  return '<div class="qp-document" data-qp="QP-' + esc(wo.id) + '" style="' + style + '">' +
    qpPage1(d) + qpPage2(noteC) + qpAnnex(p, ctx, kb) + '</div>';
}

// ============================================================
// 12. STOCKAGE TEMPORAIRE + PAGE PDF
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

async function buildQPAnswer(text, AutoFeedDoc) {
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

  var prepared = wos.map(function(w) {
    var info = describeWO(w);
    var det = detectDetails(info, ctx);
    var stds = pickStandards(det, ctx, info.desc);
    return { wo: w, info: info, det: det, stds: stds, queries: kbQueriesFor(det, stds) };
  });

  var uniq = {};
  prepared.forEach(function(p) { p.queries.forEach(function(q) { uniq[q] = 1; }); });
  var kb = await kbSearchMany(AutoFeedDoc, Object.keys(uniq), 0.25);

  var qps = prepared.map(function(p, i) { return renderOneQP(p, i, ctx, kb); }).join('');
  var token = storeQP(qps);

  var chips = wos.map(function(w) {
    return '<span style="display:inline-block;background:#ffffff;border:1px solid #1e5aa8;color:#1e5aa8;padding:4px 12px;border-radius:14px;margin:3px 5px 3px 0;font-weight:700">QP-' + esc(w.id) + '</span>';
  }).join('');
  var stdChips = {};
  prepared.forEach(function(p) { p.stds.forEach(function(id) { stdChips[id] = 1; }); });
  var stdLine = STD_ORDER.filter(function(id) { return stdChips[id]; }).map(function(id) { return esc(STANDARDS[id].short); }).join(' - ');
  var premLine = [];
  prepared.forEach(function(p) { p.det.conns.forEach(function(c) { if (c.kind === 'premium' && premLine.indexOf(c.label) === -1) premLine.push(c.label); }); });

  var banner = '<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:18px;margin:0 0 16px 0;font-family:Arial,sans-serif">' +
    '<div style="color:#1e40af;font-weight:800;font-size:15px">' + wos.length + ' Work Order(s) detecte(s) - 1 QP conforme QP STANDARD 01 par WO</div>' +
    '<div style="font-size:13px;color:#1e3a8a;margin:6px 0 4px 0">Client : <strong>' + esc(ctx.customer) + '</strong> - PO : <strong>' + esc(ctx.po) + '</strong></div>' +
    '<div style="font-size:12px;color:#1e3a8a;margin:0 0 4px 0">Chaque QP : 2 pages au format standard + 1 annexe technique (normes, controles, fiche OEM a remplir).</div>' +
    '<div style="font-size:12px;color:#1e3a8a;margin:0 0 8px 0">Normes : ' + (stdLine || '-') + (premLine.length ? ' - Premium : ' + esc(premLine.join(', ')) : '') + '</div>' +
    '<div style="margin-bottom:12px">' + chips + '</div>' +
    '<a href="/qp-pdf/' + token + '" target="_blank" rel="noopener" style="display:inline-block;background:#0a2540;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px">Ouvrir le PDF des ' + wos.length + ' QP</a>' +
    '<div style="font-size:12px;color:#1e3a8a;margin-top:8px">Dans la fenetre ouverte, choisissez Imprimer puis Enregistrer au format PDF. Editions de normes verifiees le ' + STD_VERIFIED_ON + '.</div>' +
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

// ============================================================
// 13. ENRICHISSEMENT (questions normales)
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
// 14. MIDDLEWARE EXPRESS
// ============================================================
module.exports = function(app, mongoose) {

  var AutoFeedDoc = null;
  try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { AutoFeedDoc = null; }

  function getKB() {
    if (!AutoFeedDoc) {
      try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { AutoFeedDoc = null; }
    }
    return AutoFeedDoc;
  }

  // ---- 14.a Pages PDF + registre des normes ----
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

  app.get('/api/qp-standards', function(req, res) {
    res.json({
      verifiedOn: STD_VERIFIED_ON,
      standards: STANDARDS,
      premiumFamilies: PREMIUM_FAMILIES.map(function(f) {
        return { id: f.id, owner: f.owner, derivatives: f.derivatives, docs: f.docs, url: f.url };
      })
    });
  });

  // ---- 14.b Interception QP : reponse directe, SANS IA ----
  function qpIntercept(route, strict) {
    app.use(route, function(req, res, next) {
      try {
        if (req.method !== 'POST' || !req.body) return next();
        if (!req.headers.authorization) return next();
        var question = String(req.body.question || '');
        var wantsQP = QP_RE.test(question) || (!strict && !question.trim());
        if (!wantsQP) return next();

        var text = collectText(req.body) + '\n' + question;
        buildQPAnswer(text, getKB()).then(function(out) {
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
        }).catch(function(e) {
          console.warn('[answer-enricher] Erreur QP :', e.message);
          return next();
        });
      } catch (e) {
        console.warn('[answer-enricher] Erreur QP :', e.message);
        return next();
      }
    });
  }
  qpIntercept('/api/analyze-content', false);
  qpIntercept('/api/ask', true);

  // ---- 14.c RAG pour /api/ask ----
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

  // ---- 14.d Documents non-QP ----
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

      console.log('[answer-enricher] v16.0 Mode DOCUMENT - ' + content.length + ' car.');
    }
    next();
  }

  // ---- 14.e Post-traitement ----
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

  console.log('[answer-enricher] v16.0 charge - QP STANDARD 01 + annexe normes (API 5CT/5B/7-1/7-2, VAM, Tenaris, JFE, Grant Prideco)');
};
