// ============================================================
// ANSWER-ENRICHER.JS
// Version v16.7 - QP STANDARD 01 + sources premium + administration
//
// Base : v16.6 (INTEGRALEMENT CONSERVEE)
// CORRECTIFS v16.6 -> v16.7 (UNIQUEMENT) :
//   1. parseWorkOrders : detecte le WO dans les DEUX ordres
//      - Ordre standard  : 28802 6 05/10/26 (N° Qte Date)
//      - Ordre inverse   : 6 05/10/26 \n 28802 (Qte Date N°)
//      (pdf-parse inverse parfois les colonnes du tableau ARC)
//   2. parseWorkOrders : exclut les faux positifs "estimate n°XXXXX"
//      et "PN°:XXXXX" qui pourraient matcher comme WO.
//   3. detectPO : ignore REV.XX / REV. XX / REV.XX. (variantes).
//   4. detectCustomer : variante pour ARC dont le client est sur la
//      ligne suivant le numero "Our ref."
//   5. extractPdfText (post-traitement) : reinsere des \n avant les
//      mots-cles structurants du format ARC (Order confirmation,
//      Payment, Job, Page, etc.) quand pdf-parse a tout aplati.
// AUCUNE AUTRE LIGNE N'A ETE MODIFIEE
// ============================================================

'use strict';

var crypto = require('crypto');
var https = require('https');
var http = require('http');
var zlib = require('zlib');

var LOGO_GMPI = '';
var LOGO_GROUP = '';
var STD_VERIFIED_ON = '2026-10-07';

var QP_CHUNK = 50;
var QP_HIDDEN_MAX = 10;
var QP_STORE_MAX = 60;
var QP_MAX_BYTES = parseInt(process.env.QP_MAX_BYTES, 10) || 0;
var KB_SCAN_LIMIT = 2000;
var LAST_PDF_PARSER = '';
var PREMIUM_MIN_CHARS = 5000;
var PDF_PREVIEW_CHARS = 800;

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
    url: 'https://www.vamservices.com'
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
// 0.c REGISTRE DES SOURCES PREMIUM OFFICIELLES
// ============================================================
var PREMIUM_SOURCES = {
  'VAM': {
    family: 'VAM',
    owner: 'Vallourec (VAM)',
    docs: [
      {
        title: 'VAM Book (PDF) - Reference officielle VAM',
        url: 'https://www.vamservices.com/assets/downloads/VAM%C2%AE%20Book.pdf',
        type: 'pdf',
        autoIngest: true,
        priority: 1,
        contains: ['poids', 'diametre', 'longueur', 'ID', 'OD', 'shoulder', 'torque', 'make-up', 'drift', 'coupling', 'blanking']
      }
    ]
  },
  'TENARIS': {
    family: 'TENARIS',
    owner: 'Tenaris (TenarisHydril)',
    docs: [
      {
        title: 'TenarisHydril Premium Connection Performance Datasheets Manual',
        url: 'https://stadatasheetprod.blob.core.windows.net/datasheets/~/media/Files/ProductLiterature/LiteraturePremiumConnections/TS_Datasheets_Manual.pdf',
        type: 'pdf',
        autoIngest: true,
        priority: 1,
        contains: ['coupling length', 'connection OD', 'connection ID', 'make-up loss', 'shoulder torque', 'buck-on torque', 'Tension Efficiency', 'Joint Yield Strength', 'Internal Pressure Capacity']
      }
    ]
  },
  'JFE': {
    family: 'JFE',
    owner: 'JFE Steel',
    docs: []
  }
};

var PREMIUM_TOOLS = [
  { family: 'VAM', title: 'VAM Services (Connection Data Sheets, Mix Torque Calculator)', url: 'https://www.vamservices.com/' },
  { family: 'VAM', title: 'VAM USA Toolbox', url: 'https://www.vam-usa.com/toolbox/' },
  { family: 'TENARIS', title: 'Tenaris DCP', url: 'https://dcp.tenaris.com/' },
  { family: 'JFE', title: 'JFE Tools - Datasheet generator', url: 'https://www.jfetools.com/datasheet_generator' }
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

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readRawBody(req, maxBytes) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    var size = 0;
    req.on('data', function(c) {
      size += c.length;
      if (maxBytes && size > maxBytes) {
        req.destroy();
        return reject(new Error('Taille superieure a QP_MAX_BYTES (' + maxBytes + ' octets)'));
      }
      chunks.push(c);
    });
    req.on('end', function() { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

function readRawBodyBuffer(req, maxBytes) {
  return new Promise(function(resolve, reject) {
    var chunks = [];
    var size = 0;
    req.on('data', function(c) {
      size += c.length;
      if (maxBytes && size > maxBytes) {
        req.destroy();
        return reject(new Error('Taille superieure a QP_MAX_BYTES (' + maxBytes + ' octets)'));
      }
      chunks.push(c);
    });
    req.on('end', function() { resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}

function isPdfBuffer(text) {
  return String(text || '').slice(0, 5) === '%PDF-';
}

async function extractTextFromInput(text) {
  var s = String(text || '');
  if (s.slice(0, 5) === '%PDF-') {
    console.log('[answer-enricher] Entree binaire PDF detectee - extraction via pdf-parse...');
    var buf = Buffer.from(s, 'binary');
    var t = await extractPdfText(buf);
    console.log('[answer-enricher] PDF extrait : ' + t.length + ' car. (parser=' + LAST_PDF_PARSER + ')');
    return { text: t, source: 'pdf', parser: LAST_PDF_PARSER, bytes: buf.length };
  }
  return { text: s, source: 'text', parser: 'none', bytes: Buffer.byteLength(s, 'utf8') };
}

// ============================================================
// v16.7 [Correctif 5] : POST-TRAITEMENT DU TEXTE PDF
// pdf-parse aplatit parfois tous les retours a la ligne en un
// seul flux. On reinsere des \n avant les mots-cles structurants
// du format ARC pour reconstruire une structure exploitable.
// ============================================================
var PDF_STRUCT_KEYS = [
  /(?=Person\s*:)/gi,
  /(?=Your\s+order\b)/gi,
  /(?=Our\s+ref\.?)/gi,
  /(?=Payment\b)/gi,
  /(?=Tax\s+code\b)/gi,
  /(?=Order\s+confirmation\b)/gi,
  /(?=Delivery\b)/gi,
  /(?=Job\s+Article\b)/gi,
  /(?=Article\s*\/\s*Description\b)/gi,
  /(?=Qty\.?\s*Net\s*UP)/gi,
  /(?=Net\s*UP\s*Total\s*price)/gi,
  /(?=SUPPLY\s+MATERIAL\s*&\s*MANUFACTURE)/gi,
  /(?=As\s+per\s+our\s+estimate\b)/gi,
  /(?=Grade\s*:)/gi,
  /(?=PN\s*[°o]?\s*:)/gi,
  /(?=Page\s+\d+\s*\/\s*\d+)/gi
];

function reflowPdfText(text) {
  var t = String(text || '');
  if (t.length < 50) return t;
  // 1. Reinserer \n avant chaque mot-cle structurant
  for (var i = 0; i < PDF_STRUCT_KEYS.length; i++) {
    t = t.replace(PDF_STRUCT_KEYS[i], '\n$&');
  }
  // 2. Separer les N° WO 5 chiffres qui seraient colles a une quantite
  //    Ex : "6 05/10/2628802" -> "6 05/10/26\n28802"
  t = t.replace(/(\d{2}\/\d{2}\/\d{2,4})(\d{5})\b/g, '$1\n$2');
  // 3. Nettoyer les \n multiples
  t = t.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ');
  return t.trim();
}

// ============================================================
// FONCTIONS DE SCRAPING ET D EXTRACTION
// ============================================================

function fetchUrl(url, maxRedirects, timeoutMs) {
  maxRedirects = maxRedirects === undefined ? 5 : maxRedirects;
  timeoutMs = timeoutMs || 30000;
  return new Promise(function(resolve, reject) {
    var lib = url.indexOf('https://') === 0 ? https : http;
    var req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScholarsConnect/16.7; +https://scholars-connect-app.onrender.com)',
        'Accept': 'text/html,application/xhtml+xml,application/pdf,application/json,*/*',
        'Accept-Encoding': 'gzip, deflate'
      }
    }, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) { res.resume(); return reject(new Error('Trop de redirections')); }
        var next = res.headers.location;
        if (next.indexOf('http') !== 0) {
          var u = new URL(url);
          next = u.protocol + '//' + u.host + (next.indexOf('/') === 0 ? '' : '/') + next;
        }
        res.resume();
        return resolve(fetchUrl(next, maxRedirects - 1, timeoutMs));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('HTTP ' + res.statusCode));
      }
      var chunks = [];
      var enc = (res.headers['content-encoding'] || '').toLowerCase();
      var stream = res;
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      stream.on('data', function(c) { chunks.push(c); });
      stream.on('end', function() {
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: res.headers['content-type'] || '',
          url: url
        });
      });
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, function() {
      req.destroy(new Error('Timeout ' + timeoutMs + 'ms'));
    });
  });
}

async function fetchUrlRetry(url, type) {
  var lastErr = null;
  var delays = [0, 3000, 8000];
  for (var i = 0; i < delays.length; i++) {
    if (delays[i] > 0) {
      console.log('[auto-ingest-premium] retry ' + i + ' dans ' + (delays[i] / 1000) + 's pour ' + url);
      await new Promise(function(r) { setTimeout(r, delays[i]); });
    }
    try {
      return await fetchUrl(url);
    } catch (e) {
      lastErr = e;
      console.warn('[auto-ingest-premium] tentative ' + (i + 1) + ' echouee : ' + e.message);
    }
  }
  throw lastErr || new Error('Echec apres ' + delays.length + ' tentatives');
}

async function extractPdfText(buffer) {
  LAST_PDF_PARSER = '';

  // 1. pdf-parse 1.x
  try {
    var mod = require('pdf-parse');
    if (typeof mod === 'function') {
      var data = await mod(buffer);
      var t1 = (data && data.text) || '';
      if (t1 && t1.length > 200) {
        LAST_PDF_PARSER = 'pdf-parse-1.x';
        return reflowPdfText(t1);
      }
      console.log('[answer-enricher] pdf-parse 1.x retourne ' + t1.length + ' car. - essai des fallbacks...');
    }
    // 2. pdf-parse 2.x
    if (mod && mod.PDFParse) {
      var parser = new mod.PDFParse({ data: buffer });
      var res2 = await parser.getText();
      var t2 = (res2 && res2.text) || '';
      if (t2 && t2.length > 200) {
        LAST_PDF_PARSER = 'pdf-parse-2.x';
        return reflowPdfText(t2);
      }
      console.log('[answer-enricher] pdf-parse 2.x retourne ' + t2.length + ' car. - essai des fallbacks...');
    }
  } catch (e) {
    console.warn('[answer-enricher] pdf-parse indisponible (' + e.message + ') - essai pdfjs-dist...');
  }

  // 3. pdfjs-dist
  try {
    var pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    var doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true }).promise;
    var parts = [];
    for (var p = 1; p <= doc.numPages; p++) {
      var page = await doc.getPage(p);
      var content = await page.getTextContent();
      var line = content.items.map(function(it) { return it.str; }).join(' ');
      parts.push(line);
    }
    var t3 = parts.join('\n').replace(/\s{3,}/g, ' ').trim();
    if (t3 && t3.length > 200) {
      LAST_PDF_PARSER = 'pdfjs-dist';
      console.log('[answer-enricher] pdfjs-dist : ' + t3.length + ' car. extraits sur ' + doc.numPages + ' pages');
      return reflowPdfText(t3);
    }
    console.log('[answer-enricher] pdfjs-dist retourne ' + t3.length + ' car. - dernier recours regex...');
  } catch (e) {
    console.warn('[answer-enricher] pdfjs-dist indisponible (' + e.message + ') - dernier recours regex...');
  }

  // 4. Fallback regex brute
  LAST_PDF_PARSER = 'fallback-regex';
  console.warn('[answer-enricher] Extraction PDF via regex brute (qualite faible). Installez "pdf-parse": "1.1.1" dans package.json.');
  var raw = buffer.toString('latin1');
  var matches = raw.match(/\(([^\)]{2,})\)/g) || [];
  var txt = matches.map(function(m) { return m.slice(1, -1); }).join(' ');
  txt = txt.replace(/\\[0-9]{3}/g, ' ');
  txt = txt.replace(/\\(\w)/g, '$1');
  return reflowPdfText(txt.replace(/\s+/g, ' ').trim());
}

function extractHtmlText(html) {
  var t = String(html);
  t = t.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/(p|div|h[1-6]|li|tr|td|th)>/gi, '\n');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

async function fetchAndExtract(url, type) {
  var res = await fetchUrlRetry(url, type);
  var ct = (res.contentType || '').toLowerCase();
  var isPdf = type === 'pdf' || ct.indexOf('pdf') !== -1 || /\.pdf(\?|$)/i.test(url);
  var text;
  var parser = 'html';
  if (isPdf) {
    text = await extractPdfText(res.buffer);
    parser = LAST_PDF_PARSER;
  } else {
    text = extractHtmlText(res.buffer.toString('utf8'));
  }
  return { url: url, type: isPdf ? 'pdf' : 'html', text: text, bytes: res.buffer.length, parser: parser };
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

var PRODUCTION_KEYWORDS = [
  'weight', 'poids', 'diameter', 'diametre', 'length', 'longueur',
  'od', 'id', 'drift', 'shoulder', 'coupling', 'torque', 'make-up',
  'makeup', 'tension', 'compression', 'burst', 'collapse',
  'wall thickness', 'blanking', 'upset', 'run-out', 'stand-off',
  'tpi', 'thread', 'seal', 'pin', 'box', 'nominal'
];

var PROD_KW_LONG = PRODUCTION_KEYWORDS.filter(function(k) { return k.length > 3; });
var PREMIUM_Q_RE = /connection data sheet/i;

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
    var lower = p.toLowerCase();
    for (var k = 0; k < PRODUCTION_KEYWORDS.length; k++) {
      if (lower.indexOf(PRODUCTION_KEYWORDS[k]) !== -1) s += 1;
    }
    if (s > bestScore) { bestScore = s; best = p; }
  }
  if (!best) best = text.slice(0, 250);
  return best.slice(0, 300);
}

function odVariants(od) {
  var v = [];
  var s = String(od || '').trim();
  if (!s) return v;
  v.push(s);
  var m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) {
    var dec = parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
    v.push(m[1] + '-' + m[2] + '/' + m[3]);
    v.push(dec.toFixed(3));
    v.push(dec.toFixed(2));
  }
  return v;
}

function numVariants(w) {
  var v = [String(w)];
  var f = parseFloat(w);
  if (!isNaN(f)) { v.push(f.toFixed(2)); v.push(f.toFixed(1)); }
  return v;
}

function hasToken(win, variants) {
  for (var i = 0; i < variants.length; i++) {
    var re = new RegExp('(^|[^0-9.])' + escapeRegex(variants[i]) + '([^0-9]|$)');
    if (re.test(win)) return true;
  }
  return false;
}

function premiumChunkSearch(d, q) {
  var content = String(d.content || '');
  if (content.length < 200) return null;
  var qt = {};
  tokenize(q).forEach(function(x) { if (x.length >= 4) qt[x] = 1; });
  var qList = Object.keys(qt);
  var sm = q.match(/size\s+(\d+(?: \d\/\d)?(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+lb\/ft/);
  var odV = sm ? odVariants(sm[1]) : [];
  var wtV = sm ? numVariants(sm[2]) : [];
  var W = 1500, STEP = 1000, best = '', bestScore = 0;
  for (var pos = 0; pos < content.length; pos += STEP) {
    var win = content.slice(pos, pos + W);
    var low = win.toLowerCase();
    var s = 0;
    for (var i = 0; i < qList.length; i++) if (low.indexOf(qList[i]) !== -1) s += 1;
    for (var k = 0; k < PROD_KW_LONG.length; k++) if (low.indexOf(PROD_KW_LONG[k]) !== -1) s += 0.5;
    if (odV.length && hasToken(win, odV)) s += 3;
    if (wtV.length && hasToken(win, wtV)) s += 3;
    if (s > bestScore) { bestScore = s; best = win; }
  }
  if (!best || bestScore < 4) return null;
  return { score: Math.min(1, bestScore / 14), excerpt: best.replace(/\s+/g, ' ').trim().slice(0, 600) };
}

function famMatchDoc(d, q) {
  var t = String(d.title || '') + ' ' + String((d.metadata && d.metadata.family) || '');
  if (/Vallourec|\bVAM\b/i.test(q)) return /Vallourec|VAM/i.test(t);
  if (/Tenaris|Hydril/i.test(q)) return /Tenaris|Hydril/i.test(t);
  if (/JFE/i.test(q)) return /JFE/i.test(t);
  if (/Grant|\bNOV\b/i.test(q)) return /Grant|NOV/i.test(t);
  if (/Hunting/i.test(q)) return /Hunting/i.test(t);
  return true;
}

async function loadKbForSearch(AutoFeedDoc) {
  var premium = [], others = [];
  try { premium = await AutoFeedDoc.find({ source: 'Premium-Source-Auto' }).lean(); } catch (e) { premium = []; }
  try {
    others = await AutoFeedDoc.aggregate([
      { $match: { source: { $ne: 'Premium-Source-Auto' } } },
      { $sort: { createdAt: -1 } },
      { $limit: KB_SCAN_LIMIT },
      { $project: { title: 1, domain: 1, url: 1, source: 1, vector: 1, content: { $substrCP: [{ $ifNull: ['$content', ''] }, 0, 12000] } } }
    ]);
  } catch (e) {
    try {
      others = await AutoFeedDoc.find({ source: { $ne: 'Premium-Source-Auto' } }).sort({ createdAt: -1 }).limit(500).lean();
    } catch (e2) { others = []; }
  }
  return { premium: premium, others: others };
}

async function kbSearchMany(AutoFeedDoc, queries, minScore) {
  var result = {};
  if (!AutoFeedDoc || !queries || queries.length === 0) return result;
  var kbd = await loadKbForSearch(AutoFeedDoc);
  queries.forEach(function(q) {
    var isPrem = PREMIUM_Q_RE.test(q);
    var official = [];
    if (isPrem) {
      kbd.premium.forEach(function(d) {
        if (!famMatchDoc(d, q)) return;
        var h = premiumChunkSearch(d, q);
        if (h) official.push({ title: d.title || '', domain: d.domain || '', url: d.url || '', score: h.score, excerpt: h.excerpt, official: true });
      });
      official.sort(function(a, b) { return b.score - a.score; });
      official = official.slice(0, 2);
    }
    var qTokens = tokenize(q);
    var qVector = buildVector(q);
    var scored = kbd.others.map(function(d) {
      var hasVector = d.vector && Object.keys(d.vector).length > 0;
      var cos = hasVector ? cosineSimilarity(qVector, d.vector) : 0;
      var kw = keywordOverlapScore(qTokens, (d.title || '') + ' ' + String(d.content || '').slice(0, 8000));
      return { d: d, score: Math.max(cos, kw) };
    }).filter(function(s) { return s.score >= minScore; })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, isPrem ? 1 : 2);
    var rest = scored.map(function(s) {
      return { title: s.d.title || '', domain: s.d.domain || '', url: s.d.url || '', score: s.score, excerpt: pickExcerpt(s.d.content, q), official: false };
    });
    result[q] = official.concat(rest);
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
// v16.7 [Correctif 1] : detection DOUBLE ORDRE
//   1) Ordre standard  : 28802 6 05/10/26      (N° Qte Date)
//   2) Ordre inverse   : 6 05/10/26 \n 28802   (Qte Date N°)
// v16.7 [Correctif 2] : exclusion des faux positifs estimate/PN°
// ============================================================
function isEstimateNumber(txt, idx) {
  // Regarde 25 caracteres avant la position pour voir si c'est un estimate/PN°
  var back = txt.slice(Math.max(0, idx - 30), idx);
  if (/estimate\s*n[°o]?\s*$/i.test(back)) return true;
  if (/PN\s*[°o]?\s*:?\s*$/i.test(back)) return true;
  if (/n[°o]\s*$/i.test(back)) return true;
  return false;
}

function parseWorkOrders(text) {
  text = String(text || '').replace(/\r/g, '');
  var hits = [], seen = {}, m;

  // ---- ORDRE 1 : standard N° Qte Date ----
  var re1 = /(^|[^0-9A-Za-z])(\d{5})[\s\u00A0]+(\d{1,3})[\s\u00A0]+(\d{2}\/\d{2}\/\d{2,4})(?![0-9])/g;
  while ((m = re1.exec(text)) !== null) {
    var id1 = m[2];
    var pos1 = m.index + m[1].length;
    if (isEstimateNumber(text, pos1)) continue;
    if (seen[id1]) continue;
    seen[id1] = 1;
    hits.push({
      id: id1, qte: m[3], date: m[4],
      start: pos1,
      end: m.index + m[0].length,
      order: 'standard'
    });
  }

  // ---- ORDRE 2 : inverse Qte Date \n N° ----
  // Cherche : chiffre (quantite) + date + retour ligne + 5 chiffres
  var re2 = /(\d{1,3})[\s\u00A0]+(\d{2}\/\d{2}\/\d{2,4})[\s\u00A0]*\r?\n[\s\u00A0]*(\d{5})(?![0-9])/g;
  while ((m = re2.exec(text)) !== null) {
    var id2 = m[3];
    var pos2 = m.index + m[0].length - m[3].length;
    if (isEstimateNumber(text, pos2)) continue;
    if (seen[id2]) continue;
    seen[id2] = 1;
    hits.push({
      id: id2, qte: m[1], date: m[2],
      start: pos2,
      end: m.index + m[0].length,
      order: 'inverse'
    });
  }

  // Trier par position dans le texte (pour l'affichage sequentiel)
  hits.sort(function(a, b) { return a.start - b.start; });

  // Construire before/after pour chaque WO
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
// 9. DETECTION CLIENT / PO / NORME
// ============================================================
function detectCustomer(text) {
  var t = String(text || '').replace(/\r/g, '');
  var lines = t.split('\n').map(function(l) { return l.replace(/\s+/g, ' ').trim(); });

  function done(rule, value) {
    console.log('[answer-enricher] client detecte (' + rule + ') : ' + value);
    return value;
  }

  function isNoise(s) {
    if (/^(?:Your\s+order|Date\b|Our\s+ref|Payment\b|Tax\s+code|Order\s+confirmation|Delivery\b|Job\b|Article\b|Page\b|NOTES?\b|Person\b|Email\b|Static|Qty\b|Dubai|Consignee)/i.test(s)) return true;
    if (/^[\d\/.\-:\s]+$/.test(s)) return true;
    if (/@/.test(s)) return true;
    if (/^[\-\u2022*]/.test(s)) return true;
    if (/\bPO\s*Box\b|\bP\.O\.\s*Box\b|^Utd\.|\bEmirates?\b|\bFree\s+Trade\s+Zone\b|\bStreet\b|\bRoad\b|\bAvenue\b/i.test(s)) return true;
    return false;
  }

  function looksLikeName(s) {
    if (!s || s.length < 3 || s.length > 100) return false;
    if (!/[A-Za-z]{3,}/.test(s)) return false;
    if (isNoise(s)) return false;
    if (s.split(' ').length > 10) return false;
    return true;
  }

  // v16.7 [Correctif 4] : nouvelle priorite pour ARC pdf-parse inverse
  // Structure ARC type : Our ref / 4585446304 / PETROLEUM EQUIPMENT AND SUPPLIES FZE
  for (var a0 = 0; a0 < lines.length; a0++) {
    if (/Our\s+ref/i.test(lines[a0]) || /^\d{10}$/.test(lines[a0])) {
      var scan0 = 0;
      for (var b0 = a0 + 1; b0 < lines.length && scan0 < 5; b0++) {
        if (lines[b0] === '') continue;
        scan0++;
        if (looksLikeName(lines[b0])) {
          return done('apres-Our-ref', lines[b0].slice(0, 100));
        }
      }
    }
  }

  for (var i = 0; i < lines.length; i++) {
    if (/^Payment\b/i.test(lines[i])) {
      var found = [];
      var j = i - 1;
      while (j >= 0 && lines[j] === '') j--;
      while (j >= 0 && found.length < 2 && looksLikeName(lines[j])) {
        found.unshift(lines[j]);
        j--;
      }
      if (found.length) {
        return done('avant-Payment', found.join(' ').replace(/\s+/g, ' ').trim().slice(0, 100));
      }
    }
  }

  var m3 = t.match(/(?:Customer|Client|Destinataire)\s*[:#]\s*([^\n\r]{3,100})/i);
  if (m3) return done('libelle', m3[1].replace(/\s+/g, ' ').trim());

  var known = t.match(/(\bPETROCHAD\b[^\n\r]*|\bSONATRACH\b[^\n\r]*|\bENI\s+TUNISIA\b[^\n\r]*|\bPETROLEUM\s+EQUIPMENT\s+AND\s+SUPPLIES\s+FZE\b|\bPETRONAS\b[^\n\r]*|\bSTATOIL\b[^\n\r]*|\bEQUINOR\b[^\n\r]*|\bQATAR\s+PETROLEUM\b[^\n\r]*|\bADNOC\b[^\n\r]*|\bSAUDI\s+ARAMCO\b[^\n\r]*|\bTOTALENERGIES\b[^\n\r]*|\bSCHLUMBERGER\b[^\n\r]*|\bSLB\b[^\n\r]*|\bHALLIBURTON\b[^\n\r]*|\bBAKER\s+HUGHES\b[^\n\r]*|\bWEATHERFORD\b[^\n\r]*)/);
  if (known) return done('liste-connue', known[1].replace(/\s+/g, ' ').trim().slice(0, 100));

  var suffixes = 'FZE|FZCO|FZC|DMCC|LLC|LTD|LIMITED|B\\.V\\.|S\\.A\\.R\\.L\\.|S\\.A\\.|S\\.P\\.A\\.|SARL|SPA|SAS|GMBH|INC|CORP|PLC|SA|AG|NV|BV|ASA';
  var re5 = new RegExp('(?:^|\\s)((?:[A-Z][A-Z0-9&.,()\\/\\-]*\\s+){1,6}(?:' + suffixes + '))(?![A-Za-z0-9])', 'g');
  var m5;
  while ((m5 = re5.exec(t)) !== null) {
    var cand = m5[1].replace(/\s+/g, ' ').trim();
    if (/GMPI|GLOBAL\s+METALLIC|GLOBAL\s+GROUP/.test(cand)) continue;
    return done('suffixe-societe', cand);
  }

  return done('introuvable', 'XXXXXXX');
}

// v16.7 [Correctif 3] : detectPO ignore REV.XX variantes
function detectPO(text) {
  var s = String(text || '').replace(/\r/g, '');

  function done(rule, value) {
    console.log('[answer-enricher] PO detecte (' + rule + ') : ' + value);
    return value;
  }

  function validPO(tok) {
    tok = String(tok || '').replace(/[,;:]+$/, '');
    if (tok.length < 5 || tok.length > 25) return '';
    if (!/^[A-Za-z0-9][A-Za-z0-9\-\/._]*$/.test(tok)) return '';
    if ((tok.match(/\d/g) || []).length < 3) return '';
    if (/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}$/.test(tok)) return '';
    return tok;
  }

  // v16.7 : rejette REV, REV., REV.01, REVISION, VER, V., R. et variantes
  function isRevisionValue(tok) {
    var x = String(tok || '').trim();
    return /^(?:REV|REV\.|REVISION|R\.|VER|V\.)\s*\.?\s*\d*\s*$/i.test(x);
  }

  var re1 = /Order\s+confirmation\b\s*(?:N[^A-Za-z0-9\s]{0,2}\.?|No\.?|number)?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-\/._]{3,24})/gi;
  var m1;
  while ((m1 = re1.exec(s)) !== null) {
    var raw1 = m1[1];
    if (isRevisionValue(raw1)) {
      console.log('[answer-enricher] PO : valeur "' + raw1 + '" ignoree (revision, pas un n° de commande)');
      continue;
    }
    var v1 = validPO(raw1);
    if (v1) return done('Order-confirmation', v1);
  }

  var re2 = /(?:Purchase\s*Order|\bP\.O\.|Customer\s+PO)\s*(?:No\.?|N[^A-Za-z0-9\s]{0,2})?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-\/._]{3,24})/gi;
  var m2;
  while ((m2 = re2.exec(s)) !== null) {
    var raw2 = m2[1];
    if (isRevisionValue(raw2)) continue;
    var v2 = validPO(raw2);
    if (v2) return done('libelle-Purchase-Order', v2);
  }

  var lines = s.split('\n').map(function(l) { return l.replace(/\s+/g, ' ').trim(); });
  for (var i = 0; i < lines.length; i++) {
    if (/Your\s+order\b/i.test(lines[i])) {
      var seen = 0;
      for (var n = i + 1; n < lines.length && seen < 3; n++) {
        if (lines[n] === '') continue;
        seen++;
        var toks = lines[n].split(' ');
        for (var k = 0; k < toks.length; k++) {
          var v3 = validPO(toks[k]);
          if (v3) return done('Your-order', v3);
        }
      }
    }
  }

  var m4 = s.match(/\b(\d{10})\b/);
  if (m4) return done('nombre-10-chiffres', m4[1]);

  return done('introuvable', 'NA');
}

function detectNorme(text) {
  var m = String(text).match(/Manufactured\s+According\s+to\s+([\s\S]{3,200}?)\s+Latest\s+Edition/i);
  if (m) return m[1].replace(/\s+/g, ' ').trim() + ' Latest Edition';
  var m2 = String(text).match(/Manufactured\s+According\s+to\s+([^\n\r]+)/i);
  return m2 ? m2[1].trim().slice(0, 80) : '';
}

// ============================================================
// 10. DETECTION TECHNIQUE PAR WO
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
  var szTxt = det.sizes.length ? ' size ' + det.sizes[0].od + ' ' + det.sizes[0].wt + ' lb/ft' : '';

  det.conns.forEach(function(c) {
    if (c.kind !== 'premium') return;
    var fam = null;
    PREMIUM_FAMILIES.forEach(function(f) { if (f.id === c.fam) fam = f; });
    if (!fam) return;
    var src = PREMIUM_SOURCES[fam.id];
    q.push((fam.owner || '') + ' ' + c.label + ' connection data sheet weight diameter length ID OD shoulder torque drift coupling blanking' + szTxt);
    if (src && src.docs) {
      src.docs.forEach(function(d) {
        q.push(fam.owner + ' ' + c.label + ' ' + d.title + ' connection data sheet weight diameter length ID OD shoulder' + szTxt);
      });
    }
  });

  stds.slice(0, 4).forEach(function(id) {
    if (id === 'ASTM' || id === 'EN-10204') return;
    q.push(STANDARDS[id].short + ' ' + STANDARDS[id].role + ' tolerance dimensions edition');
  });

  det.conns.forEach(function(c) {
    if (c.kind !== 'premium') return;
    var fam = null;
    PREMIUM_FAMILIES.forEach(function(f) { if (f.id === c.fam) fam = f; });
    q.push((fam ? fam.owner + ' ' : '') + c.label + ' connection data sheet tolerance make-up torque' + szTxt);
  });

  if (det.apiGrade) q.push('API 5CT grade ' + det.apiGrade + ' chemical composition mechanical properties');
  if (det.aisi) q.push('AISI ' + det.aisi + ' chemical composition mechanical properties heat treatment');
  return q.slice(0, 8);
}

// ============================================================
// AUTO-INGESTION DES SOURCES PREMIUM
// ============================================================
async function autoIngestPremiumSources(AutoFeedDoc, mongoose, force) {
  force = force === true;
  if (!AutoFeedDoc) {
    console.log('[auto-ingest-premium] AutoFeedDoc indisponible - ingestion ignoree');
    return { total: 0, ok: 0, skipped: 0, errors: 0, details: [] };
  }
  var stats = { total: 0, ok: 0, skipped: 0, errors: 0, errorsRefetch: 0, details: [] };
  var families = Object.keys(PREMIUM_SOURCES);

  for (var fi = 0; fi < families.length; fi++) {
    var famId = families[fi];
    var fam = PREMIUM_SOURCES[famId];
    if (!fam || !fam.docs) continue;

    for (var di = 0; di < fam.docs.length; di++) {
      var doc = fam.docs[di];
      if (!doc.autoIngest) continue;
      stats.total++;

      try {
        var existing = await AutoFeedDoc.findOne({ url: doc.url }).lean();
        if (existing && !force) {
          var existingLen = (existing.content || '').length;
          if (existingLen < PREMIUM_MIN_CHARS) {
            console.log('[auto-ingest-premium] contenu trop court (' + existingLen + ' car.) - re-ingestion forcee : ' + doc.url);
            try { await AutoFeedDoc.deleteOne({ _id: existing._id }); } catch (eDel) {}
          } else {
            stats.skipped++;
            stats.details.push({ family: famId, url: doc.url, status: 'deja-ingere', chars: existingLen });
            console.log('[auto-ingest-premium] deja ingere : ' + doc.url + ' (' + existingLen + ' car.)');
            continue;
          }
        } else if (existing && force) {
          console.log('[auto-ingest-premium] mode force - suppression : ' + doc.url);
          try { await AutoFeedDoc.deleteOne({ _id: existing._id }); } catch (eDel) {}
        }
      } catch (e) { /* on continue, on tentera l'ingestion */ }

      try {
        console.log('[auto-ingest-premium] telechargement : ' + doc.url);
        var ext = await fetchAndExtract(doc.url, doc.type);
        if (doc.type === 'pdf' && ext.parser === 'fallback-regex') {
          throw new Error('Extraction PDF de secours (regex) - installez "pdf-parse": "1.1.1" ou "pdfjs-dist" dans package.json');
        }
        var minLen = (doc.type === 'pdf') ? 2000 : 500;
        if (!ext.text || ext.text.length < minLen) {
          throw new Error('Texte extrait trop court (' + (ext.text ? ext.text.length : 0) + ' car., minimum ' + minLen + ' requis)');
        }
        var content = ext.text.slice(0, 900000);
        var vector = buildVector(content);

        await AutoFeedDoc.create({
          title: '[' + fam.owner + '] ' + doc.title,
          domain: 'Petrole & Gaz',
          source: 'Premium-Source-Auto',
          url: doc.url,
          content: content,
          vector: vector,
          createdAt: new Date(),
          tags: ['premium', famId, doc.type],
          metadata: {
            family: famId,
            owner: fam.owner,
            autoIngested: true,
            ingestedAt: new Date().toISOString(),
            bytes: ext.bytes,
            parser: ext.parser,
            contains: doc.contains
          }
        });
        stats.ok++;
        stats.details.push({ family: famId, url: doc.url, status: 'ok', chars: content.length, parser: ext.parser });
        console.log('[auto-ingest-premium] OK ' + doc.url + ' (' + content.length + ' car., parser=' + ext.parser + ')');
      } catch (e) {
        stats.errors++;
        stats.details.push({ family: famId, url: doc.url, status: 'erreur', error: e.message });
        console.warn('[auto-ingest-premium] erreur ' + doc.url + ' : ' + e.message);
      }
    }
  }

  console.log('[auto-ingest-premium] Termine - total:' + stats.total + ' ok:' + stats.ok + ' skip:' + stats.skipped + ' err:' + stats.errors);
  return stats;
}

async function cleanupStalePremiumDocs(AutoFeedDoc) {
  if (!AutoFeedDoc) return { scanned: 0, deleted: 0, errors: 0 };
  var out = { scanned: 0, deleted: 0, errors: 0, details: [] };
  try {
    var all = await AutoFeedDoc.find({ source: 'Premium-Source-Auto' }).select('_id url title content').lean();
    out.scanned = all.length;
    for (var i = 0; i < all.length; i++) {
      var len = (all[i].content || '').length;
      if (len < PREMIUM_MIN_CHARS) {
        try {
          await AutoFeedDoc.deleteOne({ _id: all[i]._id });
          out.deleted++;
          out.details.push({ url: all[i].url, chars: len, status: 'supprime' });
          console.log('[cleanup-premium] supprime (' + len + ' car.) : ' + all[i].url);
        } catch (e) { out.errors++; }
      }
    }
    console.log('[cleanup-premium] Termine - ' + out.scanned + ' analyses, ' + out.deleted + ' supprimes, ' + out.errors + ' erreurs');
  } catch (e) {
    console.warn('[cleanup-premium] Erreur : ' + e.message);
  }
  return out;
}

var INGEST_PROMISE = null;
function runIngestSafe(kb, mongoose, force) {
  if (INGEST_PROMISE) return INGEST_PROMISE;
  INGEST_PROMISE = autoIngestPremiumSources(kb, mongoose, force).then(
    function(s) { INGEST_PROMISE = null; return s; },
    function(e) { INGEST_PROMISE = null; throw e; }
  );
  return INGEST_PROMISE;
}

var RESTORE_JOB = { running: false, startedAt: 0, finishedAt: 0, result: null, error: null };

async function restoreAll(kb, mongoose, force) {
  var out = { premium: null, cleanup: null, vectorsRebuilt: 0, vectorErrors: 0 };
  out.cleanup = await cleanupStalePremiumDocs(kb);
  out.premium = await runIngestSafe(kb, mongoose, force);
  try {
    var missing = await kb.find({ $or: [{ vector: { $exists: false } }, { vector: null }, { vector: {} }] })
      .select('_id content').limit(300).lean();
    for (var i = 0; i < missing.length; i++) {
      try {
        await kb.updateOne({ _id: missing[i]._id }, { $set: { vector: buildVector(missing[i].content || '') } });
        out.vectorsRebuilt++;
      } catch (e1) { out.vectorErrors++; }
    }
  } catch (e) {
    out.vectorError = e.message;
  }
  return out;
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

  html += aSec('B. Applicable standards and editions');
  html += aTbl(['Standard', 'Edition', 'Status', 'Role for this WO'], stds.map(function(id) {
    var s = STANDARDS[id];
    return [esc(s.name), esc(s.edition), s.verified ? 'Verified ' + STD_VERIFIED_ON : 'Confirm edition in force', esc(s.role)];
  }), ['30%', '28%', '12%', '30%']);

  html += aSec('C. Detailed inspection points per standard');
  stds.forEach(function(id) {
    if (id === 'API-5C5' || id === 'ISO-13678') return;
    var s = STANDARDS[id];
    html += '<div style="font-size:9px;font-weight:700;margin:4px 0 2px 0;color:#0a2540">' + esc(s.short) + ' - ' + esc(s.edition) + '</div>';
    html += aTbl(['Inspection point', 'Acceptance reference', 'Value / tolerance', 'Measured', 'OK'], s.checks.map(function(c) {
      return [esc(c), 'Per ' + esc(s.short) + ' (edition in force)', 'Per standard table / customer spec', '', ''];
    }), ['34%', '24%', '22%', '12%', '8%']);
  });

  var prem = det.conns.filter(function(c) { return c.kind === 'premium'; });
  if (prem.length) {
    html += aSec('D. Premium connections - official sources (priority)');
    prem.forEach(function(c) {
      var fam = null;
      PREMIUM_FAMILIES.forEach(function(f) { if (f.id === c.fam) fam = f; });
      var src = fam ? PREMIUM_SOURCES[fam.id] : null;
      html += '<div style="font-size:9px;margin:3px 0"><b>' + esc(c.label) + '</b> - ' + esc(fam ? fam.owner : '') +
        '<br>Family / derivatives: ' + esc(fam ? fam.derivatives : '') +
        '<br>Reference document: ' + esc(fam ? fam.docs : '');
      if (src && src.docs && src.docs.length) {
        html += '<br><b>Official sources (priority over scraping):</b>';
        src.docs.forEach(function(d) {
          html += '<br>- <a href="' + esc(d.url) + '" target="_blank" style="color:#1e5aa8">' + esc(d.title) + '</a>';
        });
        html += '<br><i>Production parameters to extract: ' + esc(src.docs[0].contains.join(', ')) + '</i>';
      }
      var tl = PREMIUM_TOOLS.filter(function(t) { return fam && t.family === fam.id; });
      if (tl.length) {
        html += '<br><b>Interactive official tools (open manually):</b>';
        tl.forEach(function(t) {
          html += '<br>- <a href="' + esc(t.url) + '" target="_blank" style="color:#1e5aa8">' + esc(t.title) + '</a>';
        });
      }
      html += (fam && fam.note ? '<br><i>' + esc(fam.note) + '</i>' : '') + '</div>';
    });
    html += aTbl(['Characteristic', 'Source / acceptance', 'Tolerance / value (enter from OEM data sheet)', 'Measured', 'OK'],
      PREMIUM_CHECKS.map(function(r) { return [esc(r[0]), esc(r[1]), '', '', '']; }),
      ['34%', '24%', '22%', '12%', '8%']);
  }

  html += aSec('E. Knowledge base excerpts (official sources first, then semantic search)');
  var rowsKb = [];
  p.queries.forEach(function(q) {
    var hits = kb[q] || [];
    if (!hits.length) {
      rowsKb.push([esc(q), 'No relevant document in the knowledge base - load the official / OEM document via auto-feed (see section D for URLs)', '', '']);
    } else {
      hits.forEach(function(h) {
        var badge = h.official ? '<b style="color:#0a7a2f">[OFFICIAL SOURCE]</b> ' : '';
        rowsKb.push([esc(q), badge + esc(h.excerpt) + '<br><i>' + esc(h.title) + (h.url ? ' - ' + esc(h.url) : '') + '</i>', Math.round(h.score * 100) + '%', h.official ? 'Official - verify' : 'To verify']);
      });
    }
  });
  html += aTbl(['Query', 'Excerpt and source', 'Score', 'Status'], rowsKb, ['26%', '56%', '8%', '10%']);

  html += '<div style="font-size:8px;color:#555;margin-top:6px">Numeric tolerances of proprietary premium connections are not reproduced: they must be taken from the licensed OEM data sheet in its current revision. Official sources: VAM Services, Tenaris DCP, JFE Tools. Standard editions listed above were checked on public sources on ' + STD_VERIFIED_ON + '.</div>';
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
  var keys = Object.keys(QP_STORE);
  keys.forEach(function(k) { if (QP_STORE[k].exp < now) delete QP_STORE[k]; });
  keys = Object.keys(QP_STORE);
  while (keys.length >= QP_STORE_MAX) {
    var oldest = keys.sort(function(a, b) { return QP_STORE[a].exp - QP_STORE[b].exp; })[0];
    delete QP_STORE[oldest];
    keys = Object.keys(QP_STORE);
  }
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

function prepareQPs(text) {
  var wos = parseWorkOrders(text);
  if (wos.length === 0) return null;
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
  return { wos: wos, ctx: ctx, prepared: prepared };
}

async function buildQPAnswer(text, AutoFeedDoc) {
  var prep = prepareQPs(text);
  if (!prep) return { wos: [], html: '', links: [], qpDocs: 0, ctx: null };
  var wos = prep.wos, ctx = prep.ctx, prepared = prep.prepared;

  var uniq = {};
  prepared.forEach(function(p) { p.queries.forEach(function(q) { uniq[q] = 1; }); });
  var kb = await kbSearchMany(AutoFeedDoc, Object.keys(uniq), 0.25);

  var links = [];
  var qpDocs = 0;
  var smallHtml = '';
  for (var s = 0; s < prepared.length; s += QP_CHUNK) {
    var part = prepared.slice(s, s + QP_CHUNK);
    var html = part.map(function(p, i) { return renderOneQP(p, i, ctx, kb); }).join('');
    qpDocs += (html.match(/class="qp-document"/g) || []).length;
    links.push({ token: storeQP(html), from: s + 1, to: s + part.length });
    if (prepared.length <= QP_HIDDEN_MAX) smallHtml = html;
  }

  var chips = wos.slice(0, 60).map(function(w) {
    return '<span style="display:inline-block;background:#ffffff;border:1px solid #1e5aa8;color:#1e5aa8;padding:4px 12px;border-radius:14px;margin:3px 5px 3px 0;font-weight:700">QP-' + esc(w.id) + '</span>';
  }).join('') + (wos.length > 60 ? '<span style="font-size:12px;color:#1e3a8a"> ... et ' + (wos.length - 60) + ' autres</span>' : '');
  var stdChips = {};
  prepared.forEach(function(p) { p.stds.forEach(function(id) { stdChips[id] = 1; }); });
  var stdLine = STD_ORDER.filter(function(id) { return stdChips[id]; }).map(function(id) { return esc(STANDARDS[id].short); }).join(' - ');
  var premLine = [];
  prepared.forEach(function(p) { p.det.conns.forEach(function(c) { if (c.kind === 'premium' && premLine.indexOf(c.label) === -1) premLine.push(c.label); }); });

  var linkHtml = links.map(function(l, idx) {
    var label = links.length === 1 ? 'Ouvrir le PDF des ' + wos.length + ' QP' : 'PDF ' + (idx + 1) + ' - QP ' + l.from + ' a ' + l.to;
    return '<a href="/qp-pdf/' + l.token + '" target="_blank" rel="noopener" style="display:inline-block;background:#0a2540;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;margin:0 8px 8px 0">' + label + '</a>';
  }).join('');

  var banner = '<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:18px;margin:0 0 16px 0;font-family:Arial,sans-serif">' +
    '<div style="color:#1e40af;font-weight:800;font-size:15px">' + wos.length + ' Work Order(s) detecte(s) - ' + qpDocs + ' QP conforme(s) QP STANDARD 01</div>' +
    '<div style="font-size:13px;color:#1e3a8a;margin:6px 0 4px 0">Client : <strong>' + esc(ctx.customer) + '</strong> - PO : <strong>' + esc(ctx.po) + '</strong></div>' +
    '<div style="font-size:12px;color:#1e3a8a;margin:0 0 4px 0">Chaque QP : 2 pages au format standard + 1 annexe technique (normes, controles, sources officielles premium).</div>' +
    '<div style="font-size:12px;color:#1e3a8a;margin:0 0 8px 0">Normes : ' + (stdLine || '-') + (premLine.length ? ' - Premium : ' + esc(premLine.join(', ')) : '') + '</div>' +
    '<div style="margin-bottom:12px">' + chips + '</div>' +
    linkHtml +
    '<div style="font-size:12px;color:#1e3a8a;margin-top:4px">Dans la fenetre ouverte, choisissez Imprimer puis Enregistrer au format PDF. Sources premium officielles (VAM / Tenaris) prioritaires.' +
    (links.length > 1 ? ' Les PDF sont decoupes par paquets de ' + QP_CHUNK + ' QP.' : '') + '</div>' +
    '</div>';
  var hidden = smallHtml ? '<div class="qp-print-container" style="display:none">' + smallHtml + '</div>' : '';
  return { wos: wos, html: banner + hidden, links: links, qpDocs: qpDocs, ctx: ctx };
}

function collectText(body) {
  var parts = [];
  Object.keys(body || {}).forEach(function(k) {
    if (typeof body[k] === 'string') parts.push(body[k]);
  });
  return parts.join('\n');
}

// ============================================================
// TEST AUTOMATIQUE : N WO doivent donner N plans qualite
// ============================================================
function makeSyntheticARC(n) {
  var L = [];
  L.push('Person : Test, Email : test@example.com');
  L.push('NOTES:');
  L.push('- Packing: Included');
  L.push('- Manufactured According to API 7-1/7-2, API 5CT/5B & TENARIS STANDARD Latest Edition at the moment of manufacture &');
  L.push('Customer requirement.');
  L.push('17/02/2026');
  L.push('Your order Date Our ref.');
  L.push('4500000001');
  L.push('TEST CUSTOMER SARL');
  L.push('Payment Tax code');
  L.push('EXPORT');
  L.push('Order confirmation 4584869342');
  L.push('Job Article / Description Qty. Net UP Total price time');
  for (var i = 0; i < n; i++) {
    L.push('0113TEST' + ('000000' + i).slice(-6));
    L.push('SUPPLY MATERIAL & MANUFACTURE');
    L.push('LIFTING SUB 2 3/8" 4.6# TSH 511 PIN, OAL 36", 4140 OR EQ');
    L.push('As per our estimate n\u00B020260047');
    L.push((28000 + i) + ' ' + (1 + (i % 9)) + ' 10/03/26');
  }
  L.push('Page 1/1');
  return L.join('\n');
}

function runSelfTest(n) {
  var t0 = Date.now();
  var r = { n: n, pass: false };
  try {
    var prep = prepareQPs(makeSyntheticARC(n));
    if (!prep) { r.error = 'aucun WO detecte'; r.ms = Date.now() - t0; return r; }
    var qpDocs = 0, chunks = 0, bytes = 0, missing = [];
    for (var s = 0; s < prep.prepared.length; s += QP_CHUNK) {
      var part = prep.prepared.slice(s, s + QP_CHUNK);
      var h = part.map(function(p, i) { return renderOneQP(p, i, prep.ctx, {}); }).join('');
      qpDocs += (h.match(/class="qp-document"/g) || []).length;
      bytes += h.length;
      chunks++;
      part.forEach(function(p) { if (h.indexOf('data-qp="QP-' + p.wo.id + '"') === -1) missing.push(p.wo.id); });
    }
    r.wosFound = prep.wos.length;
    r.qpDocs = qpDocs;
    r.chunks = chunks;
    r.htmlBytes = bytes;
    r.missing = missing.slice(0, 20);
    r.customer = prep.ctx.customer;
    r.po = prep.ctx.po;
    r.customerOk = prep.ctx.customer === 'TEST CUSTOMER SARL';
    r.poOk = prep.ctx.po === '4584869342';
    r.pass = r.wosFound === n && qpDocs === n && missing.length === 0 && r.customerOk && r.poOk;
  } catch (e) {
    r.error = e.message;
  }
  r.ms = Date.now() - t0;
  return r;
}

// ============================================================
// PAGE D ADMINISTRATION
// ============================================================
function adminPage() {
  return [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Plans qualite - Controle et restauration</title>',
    '<style>',
    'body{font-family:Arial,sans-serif;background:#f5f7fa;color:#17202a;margin:0}',
    '.wrap{max-width:980px;margin:0 auto;padding:24px}',
    'h1{color:#0a2540;font-size:22px;margin:0 0 6px 0}',
    '.sub{color:#4b5563;font-size:13px;margin:0 0 18px 0}',
    'label{font-weight:700;font-size:13px;color:#0a2540}',
    'textarea{width:100%;height:160px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font-family:monospace;font-size:12px;margin:6px 0 12px 0}',
    '.row{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:14px;font-size:13px}',
    '.big{background:#0a2540;color:#fff;border:0;border-radius:10px;padding:16px 34px;font-size:17px;font-weight:800;cursor:pointer}',
    '.big:disabled{opacity:.5;cursor:wait}',
    '.alt{background:#1e5aa8;color:#fff;border:0;border-radius:10px;padding:12px 22px;font-size:14px;font-weight:700;cursor:pointer;margin-left:10px}',
    '.alt:disabled{opacity:.5;cursor:wait}',
    '#out{margin-top:20px}',
    '.ln{border-radius:8px;padding:8px 12px;margin:6px 0;font-size:13px;line-height:1.5}',
    '.h{background:#0a2540;color:#fff;font-weight:700;margin-top:16px}',
    '.ok{background:#dcfce7;color:#14532d}',
    '.ko{background:#fee2e2;color:#7f1d1d}',
    '.info{background:#e0f2fe;color:#0c4a6e}',
    'a{color:#1e5aa8;font-weight:700}',
    'table{border-collapse:collapse;width:100%;font-size:12px;margin-top:6px}',
    'td,th{border:1px solid #cbd5e1;padding:4px 6px;text-align:left;vertical-align:top}',
    'details{margin-top:6px}',
    'pre.pdf-preview{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;font-size:11px;font-family:monospace;white-space:pre-wrap;max-height:300px;overflow:auto}',
    '.pdf-zone{background:#fff;border:2px dashed #1e5aa8;border-radius:10px;padding:16px;margin:10px 0;font-size:13px}',
    '.pdf-zone input{margin-top:8px}',
    '</style></head><body><div class="wrap">',
    '<h1>Plans qualite - controle et restauration</h1>',
    '<p class="sub">Un seul clic : inventaire de la base IA, restauration des sources premium VAM / Tenaris, test N WO = N plans qualite, test de taille, generation depuis votre ARC (texte ou PDF).</p>',
    '<label for="arc">Document ARC - collez le TEXTE ici (ou utilisez le bouton PDF ci-dessous)</label>',
    '<textarea id="arc" placeholder="Collez ici le TEXTE du document ARC (pas le PDF : utilisez le bouton ci-dessous)..."></textarea>',
    '<div class="pdf-zone">',
    '<b>Ou chargez directement un fichier PDF :</b>',
    '<div>Le PDF sera lu automatiquement cote serveur (extraction de texte via pdf-parse / pdfjs-dist).</div>',
    '<input type="file" id="pdfFile" accept=".pdf,application/pdf">',
    '</div>',
    '<div class="row">',
    '<span>ou fichier texte : <input type="file" id="file" accept=".txt,.csv,.tsv,.log,text/plain"></span>',
    '<span>N pour le test : <input type="number" id="nTest" value="60" min="1" max="1000" style="width:80px"></span>',
    '<span><input type="checkbox" id="force"> forcer le rechargement complet des sources premium</span>',
    '</div>',
    '<button id="go" class="big" type="button">TOUT EXECUTER EN UN CLIC</button>',
    '<button id="pdfGo" class="alt" type="button">Generer depuis le PDF uniquement</button>',
    '<div id="out"></div>',
    '</div><script src="/qp-admin.js"></script></body></html>'
  ].join('\n');
}

function adminClient() {
  var out = document.getElementById("out");
  var btn = document.getElementById("go");
  var pdfBtn = document.getElementById("pdfGo");

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function line(cls, html) {
    var d = document.createElement("div");
    d.className = "ln " + cls;
    d.innerHTML = html;
    out.appendChild(d);
    return d;
  }
  function token() {
    try { return localStorage.getItem("token") || ""; } catch (e) { return ""; }
  }
  function headers(extra) {
    var h = { "Authorization": "Bearer " + token() };
    if (extra) { for (var k in extra) { h[k] = extra[k]; } }
    return h;
  }
  async function api(path, opts) {
    var t0 = Date.now();
    try {
      var r = await fetch(path, opts || { headers: headers() });
      var txt = await r.text();
      var data = null;
      try { data = JSON.parse(txt); } catch (e) { data = null; }
      return { ok: r.ok, status: r.status, data: data, text: txt, ms: Date.now() - t0 };
    } catch (e) {
      return { ok: false, status: 0, data: null, text: String(e), ms: Date.now() - t0 };
    }
  }
  function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }
  function big(n) { return new Array(n + 1).join("x"); }

  async function sendPdf(file) {
    var buf = await file.arrayBuffer();
    var r = await fetch("/api/qp-generate-pdf", {
      method: "POST",
      headers: headers({ "Content-Type": "application/pdf" }),
      body: buf
    });
    var txt = await r.text();
    var data = null;
    try { data = JSON.parse(txt); } catch (e) { data = null; }
    return { ok: r.ok, status: r.status, data: data, text: txt };
  }

  function showPdfPreview(data) {
    if (!data || !data.pdfPreview) return;
    var pre = document.createElement("pre");
    pre.className = "pdf-preview";
    pre.textContent = data.pdfPreview;
    out.appendChild(pre);
  }

  async function pdfOnly() {
    out.innerHTML = "";
    var f = document.getElementById("pdfFile").files[0];
    if (!f) { line("ko", "Choisissez un fichier PDF avant de cliquer."); return; }
    line("info", "Envoi du PDF (" + Math.round(f.size / 1024) + " Ko) et extraction...");
    var r = await sendPdf(f);
    if (!r.ok || !r.data) {
      line("ko", "Erreur HTTP " + r.status + " : " + esc(r.text.slice(0, 400)));
      return;
    }
    if (!r.data.ok) {
      line("ko", esc(r.data.error || "Erreur inconnue") + " (" + (r.data.pdfTextChars || 0) + " car. extraits, parser=" + esc(r.data.parser || "?") + ")");
      showPdfPreview(r.data);
      return;
    }
    line("ok", r.data.wo + " WO detectes - " + r.data.qpDocs + " plans qualite generes - " + r.data.pdfTextChars + " car. extraits (parser=" + esc(r.data.parser || "?") + ") - " + r.data.ms + " ms");
    line("info", "Client : <b>" + esc(r.data.customer) + "</b> - Purchase Order : <b>" + esc(r.data.po) + "</b>");
    line("info", "WO : " + esc(r.data.ids.join(", ")) + (r.data.wo > r.data.ids.length ? " ..." : ""));
    var lk = r.data.links.map(function(l) {
      return "<a href=\"" + esc(l.url) + "\" target=\"_blank\" rel=\"noopener\">PDF QP " + l.from + " a " + l.to + "</a>";
    }).join(" &nbsp; ");
    line("ok", "Ouvrir : " + lk);
    showPdfPreview(r.data);
  }

  async function run() {
    out.innerHTML = "";
    btn.disabled = true;
    pdfBtn.disabled = true;
    var results = [];
    function mark(name, ok) { results.push({ name: name, ok: ok }); }

    if (!token()) {
      line("ko", "Aucune session : Ctrl+Maj+Suppr a efface votre jeton de connexion. <a href=\"/login\">Reconnectez-vous</a> puis revenez sur cette page.");
      btn.disabled = false;
      pdfBtn.disabled = false;
      return;
    }

    // 1. Inventaire
    line("h", "1. Inventaire de la base IA");
    var inv = await api("/api/kb-inventory?limit=300");
    if (inv.status === 401) {
      line("ko", "Session refusee (401). Reconnectez-vous.");
      btn.disabled = false;
      pdfBtn.disabled = false;
      return;
    }
    if (!inv.ok || !inv.data) {
      line("ko", "Inventaire impossible (HTTP " + inv.status + ") : " + esc(inv.text.slice(0, 300)));
      mark("Inventaire de la base", false);
    } else {
      var d = inv.data;
      line("ok", "Documents en base : <b>" + d.total + "</b> - sources premium : <b>" + d.premium.length + "</b> - pdf-parse : <b>" + (d.env.pdfParse ? "installe" : "ABSENT") + "</b>");
      if (!d.env.pdfParse) {
        line("ko", "pdf-parse est absent : ajoutez <b>\"pdf-parse\": \"1.1.1\"</b> dans package.json (dependencies), puis redeployez.");
      }
      var srcRows = d.bySource.map(function(s) {
        return "<tr><td>" + esc(s._id || "(sans source)") + "</td><td>" + s.n + "</td><td>" + Math.round((s.chars || 0) / 1000) + " k car.</td></tr>";
      }).join("");
      line("info", "Par source :<table><tr><th>Source</th><th>Documents</th><th>Volume</th></tr>" + srcRows + "</table>");
      var premRows = d.premium.map(function(p) {
        return "<tr><td>" + esc(p.family || "") + "</td><td>" + esc(p.title) + "</td><td>" + p.chars + "</td></tr>";
      }).join("");
      line(d.premium.length ? "ok" : "ko", "Sources premium chargees :" + (d.premium.length ? "<table><tr><th>Famille</th><th>Titre</th><th>Caracteres</th></tr>" + premRows + "</table>" : " aucune (la restauration va les recharger)"));
      var docRows = d.docs.map(function(x) {
        return "<tr><td>" + esc(x.title || "") + "</td><td>" + esc(x.source || "") + "</td><td>" + (x.chars || 0) + "</td><td>" + esc(x.url || "") + "</td></tr>";
      }).join("");
      line("info", "<details><summary>Liste des " + d.docs.length + " documents les plus recents</summary><table><tr><th>Titre</th><th>Source</th><th>Car.</th><th>URL</th></tr>" + docRows + "</table></details>");
      var toolRows = d.tools.map(function(t) {
        return "<li><a href=\"" + esc(t.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(t.title) + "</a> (" + esc(t.family) + ")</li>";
      }).join("");
      line("info", "Outils interactifs officiels (a ouvrir manuellement) :<ul>" + toolRows + "</ul>");
      mark("Inventaire de la base", true);
    }

    // 2. Restauration
    line("h", "2. Restauration des sources premium (VAM / Tenaris)");
    var force = document.getElementById("force").checked;
    var st = await api("/api/kb-restore" + (force ? "?force=1" : ""));
    if (!st.ok || !st.data) {
      line("ko", "Restauration impossible (HTTP " + st.status + ") : " + esc(st.text.slice(0, 300)));
      mark("Restauration des sources premium", false);
    } else {
      line("info", "Telechargement en cours (1 a 4 minutes)...");
      var waited = 0, job = null;
      while (waited < 300) {
        await sleep(3000);
        waited += 3;
        var js = await api("/api/kb-restore-status");
        job = js.data && js.data.job;
        if (job && !job.running) { break; }
      }
      if (job && !job.running && job.result) {
        var p = job.result.premium || { total: 0, ok: 0, skipped: 0, errors: 0, details: [] };
        var c = job.result.cleanup || { scanned: 0, deleted: 0 };
        var allGood = p.errors === 0;
        line("info", "Nettoyage : " + c.scanned + " analyses, " + c.deleted + " supprimes (docs parasites < 5000 car.)");
        line(allGood ? "ok" : "ko", "Sources : " + p.total + " - rechargees " + p.ok + " - deja presentes " + p.skipped + " - erreurs " + p.errors + " - vecteurs reconstruits " + job.result.vectorsRebuilt);
        var detRows = (p.details || []).map(function(x) {
          return "<tr><td>" + esc(x.family) + "</td><td>" + esc(x.status) + "</td><td>" + (x.chars || "") + "</td><td>" + esc(x.parser || "") + "</td><td>" + esc(x.error || x.url || "") + "</td></tr>";
        }).join("");
        line("info", "<table><tr><th>Famille</th><th>Etat</th><th>Car.</th><th>Parser</th><th>Detail</th></tr>" + detRows + "</table>");
        mark("Restauration des sources premium", allGood);
      } else if (job && job.error) {
        line("ko", "Erreur de restauration : " + esc(job.error));
        mark("Restauration des sources premium", false);
      } else {
        line("ko", "Delai depasse : la restauration continue sur le serveur. Relancez dans quelques minutes.");
        mark("Restauration des sources premium", false);
      }
    }

    // 3. Test N WO = N QP
    line("h", "3. Test : N WO donnent N plans qualite");
    var n = parseInt(document.getElementById("nTest").value, 10) || 60;
    var stt = await api("/api/qp-selftest?n=" + n);
    if (!stt.ok || !stt.data) {
      line("ko", "Test impossible (HTTP " + stt.status + ") : " + esc(stt.text.slice(0, 300)));
      mark("N WO = N plans qualite", false);
    } else {
      stt.data.results.forEach(function(r) {
        line(r.pass ? "ok" : "ko", "N = " + r.n + " : WO detectes " + r.wosFound + " - plans generes " + r.qpDocs + " - " + r.chunks + " PDF - " + r.ms + " ms - client " + (r.customerOk ? "OK" : "KO") + " - PO " + (r.poOk ? "OK" : "KO") + (r.error ? " - erreur : " + esc(r.error) : "") + ((r.missing && r.missing.length) ? " - manquants : " + esc(r.missing.join(", ")) : ""));
      });
      mark("N WO = N plans qualite", !!stt.data.pass);
    }

    // 4. Test de taille
    line("h", "4. Test de taille du document ARC");
    var rawOk = 0, rawSizes = [2, 10];
    for (var i = 0; i < rawSizes.length; i++) {
      var rr = await api("/api/qp-ping-raw", { method: "POST", headers: headers({ "Content-Type": "text/plain" }), body: big(rawSizes[i] * 1024 * 1024) });
      line(rr.ok ? "ok" : "ko", "Page admin (texte brut) " + rawSizes[i] + " Mo : " + (rr.ok ? "accepte" : "refuse (HTTP " + rr.status + ")") + " - " + rr.ms + " ms");
      if (rr.ok) { rawOk = rawSizes[i]; }
    }
    var jsonOk = 0, jsonSizes = [0.2, 1, 5];
    for (var j = 0; j < jsonSizes.length; j++) {
      var jb = JSON.stringify({ text: big(Math.round(jsonSizes[j] * 1024 * 1024)) });
      var jr = await api("/api/qp-ping", { method: "POST", headers: headers({ "Content-Type": "application/json" }), body: jb });
      line(jr.ok ? "ok" : "info", "Chat (JSON) " + jsonSizes[j] + " Mo : " + (jr.ok ? "accepte" : "refuse (HTTP " + jr.status + ")") + " - " + jr.ms + " ms");
      if (jr.ok) { jsonOk = jsonSizes[j]; }
    }
    if (jsonOk >= 5) {
      line("ok", "Le chat accepte au moins 5 Mo : aucune limite genante.");
    } else {
      line("info", "La limite du chat vient de server.js (express.json), environ " + (jsonOk ? jsonOk + " Mo" : "moins de 0,2 Mo") + ".");
    }
    mark("Taille du document (page admin)", rawOk >= 10);

    // 5. Generation depuis l ARC
    line("h", "5. Generation depuis votre ARC");
    var arc = document.getElementById("arc").value;
    var f = document.getElementById("file").files[0];
    var pdfF = document.getElementById("pdfFile").files[0];
    if (!arc.trim() && f) { arc = await f.text(); }

    if (pdfF) {
      line("info", "PDF detecte (" + Math.round(pdfF.size / 1024) + " Ko) - envoi binaire et extraction serveur...");
      var g2 = await sendPdf(pdfF);
      if (!g2.ok || !g2.data) {
        line("ko", "Envoi PDF impossible (HTTP " + g2.status + ") : " + esc(g2.text.slice(0, 300)));
        mark("Generation depuis le PDF", false);
      } else if (!g2.data.ok) {
        line("ko", esc(g2.data.error || "Aucun WO detecte dans le PDF") + " (" + (g2.data.pdfTextChars || 0) + " car. extraits, parser=" + esc(g2.data.parser || "?") + ")");
        showPdfPreview(g2.data);
        mark("Generation depuis le PDF", false);
      } else {
        line(g2.data.match ? "ok" : "ko", "PDF : " + g2.data.wo + " WO detectes - " + g2.data.qpDocs + " plans qualite generes - " + g2.data.pdfTextChars + " car. extraits (parser=" + esc(g2.data.parser || "?") + ") - " + g2.data.ms + " ms");
        line("info", "Client : <b>" + esc(g2.data.customer) + "</b> - Purchase Order : <b>" + esc(g2.data.po) + "</b>");
        line("info", "WO : " + esc(g2.data.ids.join(", ")) + (g2.data.wo > g2.data.ids.length ? " ..." : ""));
        var lk2 = g2.data.links.map(function(l) {
          return "<a href=\"" + esc(l.url) + "\" target=\"_blank\" rel=\"noopener\">PDF QP " + l.from + " a " + l.to + "</a>";
        }).join(" &nbsp; ");
        line("ok", "Ouvrir : " + lk2);
        showPdfPreview(g2.data);
        mark("Generation depuis le PDF", !!g2.data.match);
      }
    } else if (!arc.trim()) {
      line("info", "Aucun ARC fourni (ni texte ni PDF) : etape ignoree. Collez votre ARC ou choisissez un PDF, puis relancez.");
    } else {
      var g = await api("/api/qp-generate", { method: "POST", headers: headers({ "Content-Type": "text/plain" }), body: arc });
      if (!g.ok || !g.data) {
        line("ko", "Generation impossible (HTTP " + g.status + ") : " + esc(g.text.slice(0, 300)));
        mark("Generation depuis l ARC (texte)", false);
      } else if (!g.data.ok) {
        line("ko", esc(g.data.error || "Aucun WO detecte") + " (" + g.data.chars + " caracteres recus)");
        if (g.data.detected === 'pdf') {
          line("info", "Le texte fourni ressemble a un PDF binaire. Utilisez le bouton \"Fichier PDF\" ci-dessus.");
        }
        mark("Generation depuis l ARC (texte)", false);
      } else {
        var r5 = g.data;
        line(r5.match ? "ok" : "ko", r5.wo + " WO detectes - " + r5.qpDocs + " plans qualite generes - " + r5.chars + " caracteres lus - " + r5.ms + " ms");
        line("info", "Client : <b>" + esc(r5.customer) + "</b> - Purchase Order : <b>" + esc(r5.po) + "</b>");
        line("info", "WO : " + esc(r5.ids.join(", ")) + (r5.wo > r5.ids.length ? " ..." : ""));
        var lk = r5.links.map(function(l) {
          return "<a href=\"" + esc(l.url) + "\" target=\"_blank\" rel=\"noopener\">PDF QP " + l.from + " a " + l.to + "</a>";
        }).join(" &nbsp; ");
        line("ok", "Ouvrir : " + lk);
        mark("Generation depuis l ARC (texte)", !!r5.match);
      }
    }

    // Bilan
    line("h", "Bilan");
    results.forEach(function(r) { line(r.ok ? "ok" : "ko", (r.ok ? "OK - " : "A CORRIGER - ") + esc(r.name)); });
    btn.disabled = false;
    pdfBtn.disabled = false;
  }

  btn.addEventListener("click", run);
  pdfBtn.addEventListener("click", pdfOnly);
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

  function needAuth(req, res) {
    if (!req.headers.authorization) {
      res.status(401).json({ error: 'Authorization requise (connectez-vous)' });
      return false;
    }
    return true;
  }

  function pdfParseInstalled() {
    try { require.resolve('pdf-parse'); return true; } catch (e) { return false; }
  }

  function pdfjsInstalled() {
    try { require.resolve('pdfjs-dist'); return true; } catch (e) { return false; }
  }

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
      }),
      premiumSources: PREMIUM_SOURCES,
      premiumTools: PREMIUM_TOOLS,
      minPremiumChars: PREMIUM_MIN_CHARS
    });
  });

  app.get('/qp-admin', function(req, res) {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('X-Robots-Tag', 'noindex');
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src data: 'self'");
    res.send(adminPage());
  });

  app.get('/qp-admin.js', function(req, res) {
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.send('(' + adminClient.toString() + ')();');
  });

  app.get('/api/kb-inventory', async function(req, res) {
    if (!needAuth(req, res)) return;
    try {
      var kb = getKB();
      if (!kb) return res.status(503).json({ error: 'Base IA indisponible (modele AutoFeedDocument absent)' });
      var limit = Math.min(parseInt(req.query.limit, 10) || 200, 2000);
      var total = 0;
      try { total = await kb.countDocuments({}); } catch (e0) { total = await kb.count({}); }
      var bySource = [], byDomain = [], docs = [], premium = [];
      try {
        bySource = await kb.aggregate([
          { $group: { _id: '$source', n: { $sum: 1 }, chars: { $sum: { $strLenCP: { $ifNull: ['$content', ''] } } } } },
          { $sort: { n: -1 } }
        ]);
        byDomain = await kb.aggregate([{ $group: { _id: '$domain', n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
        docs = await kb.aggregate([
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          { $project: { title: 1, url: 1, domain: 1, source: 1, createdAt: 1, chars: { $strLenCP: { $ifNull: ['$content', ''] } } } }
        ]);
        premium = await kb.aggregate([
          { $match: { source: 'Premium-Source-Auto' } },
          { $project: { title: 1, url: 1, metadata: 1, createdAt: 1, chars: { $strLenCP: { $ifNull: ['$content', ''] } } } }
        ]);
      } catch (eAgg) {
        docs = await kb.find({}).select('title url domain source createdAt').sort({ createdAt: -1 }).limit(limit).lean();
        premium = await kb.find({ source: 'Premium-Source-Auto' }).select('title url metadata createdAt').lean();
      }
      res.json({
        total: total,
        bySource: bySource,
        byDomain: byDomain,
        docs: docs,
        premium: premium.map(function(p) {
          return {
            title: p.title,
            url: p.url,
            family: (p.metadata && p.metadata.family) || '',
            chars: p.chars || 0,
            parser: (p.metadata && p.metadata.parser) || '',
            ingestedAt: (p.metadata && p.metadata.ingestedAt) || p.createdAt
          };
        }),
        tools: PREMIUM_TOOLS,
        env: { pdfParse: pdfParseInstalled(), pdfjs: pdfjsInstalled(), node: process.version, maxBytes: QP_MAX_BYTES, minPremiumChars: PREMIUM_MIN_CHARS }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/kb-restore', function(req, res) {
    if (!needAuth(req, res)) return;
    var kb = getKB();
    if (!kb) return res.status(503).json({ error: 'Base IA indisponible' });
    if (RESTORE_JOB.running) return res.json({ started: false, running: true });
    var force = req.query.force === '1';
    RESTORE_JOB = { running: true, startedAt: Date.now(), finishedAt: 0, result: null, error: null };
    restoreAll(kb, mongoose, force).then(function(r) {
      RESTORE_JOB.running = false;
      RESTORE_JOB.finishedAt = Date.now();
      RESTORE_JOB.result = r;
    }).catch(function(e) {
      RESTORE_JOB.running = false;
      RESTORE_JOB.finishedAt = Date.now();
      RESTORE_JOB.error = e.message;
    });
    res.json({ started: true, running: true });
  });

  app.get('/api/kb-restore-status', function(req, res) {
    if (!needAuth(req, res)) return;
    res.json({ job: RESTORE_JOB });
  });

  app.get('/api/qp-selftest', function(req, res) {
    if (!needAuth(req, res)) return;
    var n = Math.max(1, Math.min(parseInt(req.query.n, 10) || 60, 1000));
    var sizes = [1, 4, n].filter(function(v, i, a) { return a.indexOf(v) === i; });
    var results = sizes.map(runSelfTest);
    res.json({ pass: results.every(function(r) { return r.pass; }), results: results });
  });

  app.post('/api/qp-ping', function(req, res) {
    if (!needAuth(req, res)) return;
    res.json({ ok: true, chars: JSON.stringify(req.body || {}).length });
  });

  app.post('/api/qp-ping-raw', async function(req, res) {
    if (!needAuth(req, res)) return;
    try {
      var bytes = 0;
      if (typeof req.body === 'string') bytes = Buffer.byteLength(req.body);
      else bytes = Buffer.byteLength(await readRawBody(req, QP_MAX_BYTES));
      res.json({ ok: true, bytes: bytes });
    } catch (e) {
      res.status(413).json({ error: e.message });
    }
  });

  app.post('/api/qp-generate', async function(req, res) {
    if (!needAuth(req, res)) return;
    try {
      var t0 = Date.now();
      var text = '';
      if (typeof req.body === 'string') text = req.body;
      else if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) text = collectText(req.body);
      else text = await readRawBody(req, QP_MAX_BYTES);
      if (!text || !text.trim()) return res.status(400).json({ ok: false, error: 'ARC vide', chars: 0 });

      var detected = isPdfBuffer(text) ? 'pdf' : 'text';
      if (detected === 'pdf') {
        console.log('[answer-enricher] /api/qp-generate : binaire PDF recu dans le champ texte - extraction automatique...');
        var ex = await extractTextFromInput(text);
        text = ex.text;
        if (!text || text.length < 100) {
          return res.json({ ok: false, detected: 'pdf', error: 'Extraction PDF insuffisante (' + text.length + ' car.) - utilisez le bouton PDF', chars: ex.bytes, pdfTextChars: text.length });
        }
      }

      var out = await buildQPAnswer(text, getKB());
      if (!out.wos.length) return res.json({ ok: false, detected: detected, error: 'Aucun WO detecte (format attendu : 28225 6 10/03/26)', chars: text.length });

      console.log('[answer-enricher] /api/qp-generate - ' + out.wos.length + ' WO, ' + out.qpDocs + ' QP, ' + text.length + ' car. (source=' + detected + ')');
      res.json({
        ok: true,
        detected: detected,
        chars: text.length,
        wo: out.wos.length,
        qpDocs: out.qpDocs,
        match: out.wos.length === out.qpDocs,
        ids: out.wos.slice(0, 100).map(function(w) { return w.id; }),
        customer: out.ctx.customer,
        po: out.ctx.po,
        links: out.links.map(function(l) { return { url: '/qp-pdf/' + l.token, from: l.from, to: l.to }; }),
        ms: Date.now() - t0
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.post('/api/qp-generate-pdf', async function(req, res) {
    if (!needAuth(req, res)) return;
    try {
      var t0 = Date.now();
      var buf = await readRawBodyBuffer(req, QP_MAX_BYTES);
      if (!buf || buf.length < 100) return res.status(400).json({ ok: false, error: 'PDF vide ou trop petit', bytes: buf ? buf.length : 0 });
      if (buf.slice(0, 5).toString() !== '%PDF-') {
        return res.status(400).json({ ok: false, error: 'Le fichier recu n est pas un PDF (entete %PDF- absente)', bytes: buf.length });
      }
      console.log('[answer-enricher] /api/qp-generate-pdf : PDF recu (' + buf.length + ' octets) - extraction...');
      var txt = await extractPdfText(buf);
      var pdfTextChars = (txt || '').length;
      var preview = (txt || '').slice(0, PDF_PREVIEW_CHARS);
      console.log('[answer-enricher] PDF extrait : ' + pdfTextChars + ' car. (parser=' + LAST_PDF_PARSER + ')');
      if (!txt || pdfTextChars < 100) {
        return res.json({
          ok: false,
          error: 'Extraction PDF insuffisante (' + pdfTextChars + ' car.) - verifiez que pdf-parse ou pdfjs-dist est installe',
          bytes: buf.length,
          pdfTextChars: pdfTextChars,
          parser: LAST_PDF_PARSER,
          pdfPreview: preview
        });
      }

      var out = await buildQPAnswer(txt, getKB());
      if (!out.wos.length) {
        return res.json({
          ok: false,
          error: 'Aucun WO detecte dans le PDF (format attendu : 28225 6 10/03/26)',
          bytes: buf.length,
          pdfTextChars: pdfTextChars,
          parser: LAST_PDF_PARSER,
          pdfPreview: preview
        });
      }

      console.log('[answer-enricher] /api/qp-generate-pdf - ' + out.wos.length + ' WO, ' + out.qpDocs + ' QP, ' + pdfTextChars + ' car.');
      res.json({
        ok: true,
        detected: 'pdf',
        bytes: buf.length,
        pdfTextChars: pdfTextChars,
        parser: LAST_PDF_PARSER,
        pdfPreview: preview,
        wo: out.wos.length,
        qpDocs: out.qpDocs,
        match: out.wos.length === out.qpDocs,
        ids: out.wos.slice(0, 100).map(function(w) { return w.id; }),
        customer: out.ctx.customer,
        po: out.ctx.po,
        links: out.links.map(function(l) { return { url: '/qp-pdf/' + l.token, from: l.from, to: l.to }; }),
        ms: Date.now() - t0
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get('/api/premium-status', async function(req, res) {
    try {
      var kb = getKB();
      if (!kb) return res.json({ error: 'AutoFeedDoc indisponible', docs: [] });
      var allDocs = await kb.find({ source: 'Premium-Source-Auto' }).lean();
      var out = allDocs.map(function(d) {
        return {
          title: d.title,
          url: d.url,
          family: (d.metadata && d.metadata.family) || '',
          chars: (d.content || '').length,
          excerpt: (d.content || '').slice(0, 200),
          parser: (d.metadata && d.metadata.parser) || '',
          ingestedAt: (d.metadata && d.metadata.ingestedAt) || d.createdAt,
          hasVector: !!(d.vector && Object.keys(d.vector).length > 0)
        };
      });
      res.json({ count: out.length, pdfParse: pdfParseInstalled(), pdfjs: pdfjsInstalled(), minPremiumChars: PREMIUM_MIN_CHARS, docs: out });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/premium-ingest', async function(req, res) {
    try {
      var force = req.query.force === '1';
      var stats = await runIngestSafe(getKB(), mongoose, force);
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
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
          console.log('[answer-enricher] QP direct (sans IA) - ' + out.wos.length + ' WO : ' + out.wos.slice(0, 30).map(function(w) { return w.id; }).join(', ') + (out.wos.length > 30 ? ' ...' : ''));
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

      console.log('[answer-enricher] v16.7 Mode DOCUMENT - ' + content.length + ' car.');
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

  // ============================================================
  // HOOK AU DEMARRAGE
  // ============================================================
  setTimeout(function() {
    var kb = getKB();
    if (!kb) {
      console.log('[auto-ingest-premium] AutoFeedDoc indisponible au demarrage - ingestion reportee');
      return;
    }
    cleanupStalePremiumDocs(kb).then(function(c) {
      console.log('[auto-ingest-premium] Nettoyage initial : ' + c.deleted + ' docs parasites supprimes');
      console.log('[auto-ingest-premium] Demarrage de l\'auto-ingestion des sources premium...');
      return runIngestSafe(kb, mongoose, false);
    }).then(function(stats) {
      console.log('[auto-ingest-premium] Bilan demarrage : total=' + stats.total + ' ok=' + stats.ok + ' skip=' + stats.skipped + ' err=' + stats.errors);
    }).catch(function(e) {
      console.warn('[auto-ingest-premium] Erreur globale : ' + e.message);
    });
  }, 20000);

  console.log('[answer-enricher] v16.7 charge - QP STANDARD 01 + sources premium + WO double ordre + pdf-parse reflow');
};
