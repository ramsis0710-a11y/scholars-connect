// ============================================================
// ANSWER-ENRICHER.JS
// Version v16.21 - FIABILISATION SECTION E + SECURITE ROUTES
// BASE : v16.20 + route Excel du 17-10-2026 (SHA-256 397bde89...80f4)
// ============================================================
'use strict';

var crypto = require('crypto');
var https = require('https');
var http = require('http');
var zlib = require('zlib');

var LOGO_GMPI = '';
var LOGO_GROUP = '';
var STD_VERIFIED_ON = '2026-10-09';
var APP_VERSION = 'v16.21';

var QP_CHUNK = 50;
var QP_HIDDEN_MAX = 10;
var QP_STORE_MAX = 60;
var QP_MAX_BYTES = parseInt(process.env.QP_MAX_BYTES, 10) || 0;
var KB_SCAN_LIMIT = 2000;
var LAST_PDF_PARSER = '';
var PREMIUM_MIN_CHARS = 5000;
var PDF_PREVIEW_CHARS = 800;

var AUTH_WARNED = false;

function bearerToken(req) {
  var h = String((req && req.headers && req.headers.authorization) || '').trim();
  var m = h.match(/^Bearer\s+(.+)$/i);
  return (m ? m[1] : h).trim();
}

function jwtPayloadOf(tok) {
  try {
    var parts = tok.split('.');
    if (parts.length !== 3) return null;
    var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch (e) { return null; }
}

function authOk(req) {
  var tok = bearerToken(req);
  if (!tok || tok.length < 10 || tok === 'undefined' || tok === 'null') return false;
  var secret = process.env.QP_JWT_SECRET || process.env.JWT_SECRET || '';
  var verifyOff = process.env.QP_AUTH_VERIFY === '0';
  if (secret && !verifyOff) {
    var jwt = null;
    try { jwt = require('jsonwebtoken'); } catch (eMod) { jwt = null; }
    if (jwt) {
      try { jwt.verify(tok, secret); return true; } catch (eVer) { return false; }
    }
  }
  var parts = tok.split('.');
  if (parts.length === 3) {
    var pl = jwtPayloadOf(tok);
    if (!pl) return false;
    if (pl.exp && (pl.exp * 1000) < Date.now()) return false;
    if (!AUTH_WARNED) { AUTH_WARNED = true; console.warn('[answer-enricher] AUTH : signature JWT non verifiee'); }
    return true;
  }
  if (!AUTH_WARNED) { AUTH_WARNED = true; console.warn('[answer-enricher] AUTH : jeton opaque'); }
  return true;
}

var BLOCKED_DOMAINS = ['linkedin.com','pubmed.ncbi.nlm.nih.gov','arxiv.org','youtube.com','facebook.com','twitter.com','x.com','instagram.com','pinterest.com','tiktok.com','reddit.com','quora.com','researchgate.net','academia.edu','medium.com','substack.com'];
function isBlockedDomain(url) {
  if (!url) return false;
  var u = String(url).toLowerCase();
  for (var i = 0; i < BLOCKED_DOMAINS.length; i++) if (u.indexOf(BLOCKED_DOMAINS[i]) !== -1) return true;
  return false;
}

var QP_OPS_REPAIR = [
  [1,'Control at reception','FO-02-PRO','Customer specifications',1,'QC Dep.'],
  [2,'Disassembly, Cleaning and sandblasting','FO-05-R&D','',0,'Prod. Dep.'],
  [3,'Visual and dimensional inspection of body, union connections and Flanges','FO-04-PRO|FO-51-PRO','API 6A|ASME B16.5|ASME B31.3',1,'QC Dep.'],
  [4,'Hummer union connections repair (if applicable)','FO-05-R&D','',0,'Prod. Dep.'],
  [5,'Flange repair (if applicable)','FO-05-R&D','',0,'Prod. Dep.'],
  [6,'Visual and dimensional inspection after repair (if applicable)','FO-04-PRO|FO-51-PRO','API 6A|ASME B16.5|ASME B31.3',1,'QC Dep.'],
  [7,'MPI Weld joints inspection','ASTM E709','API 6A|ASME B16.5|ASME B31.3',1,'QC Dep.'],
  [8,'Wall thickness measurement + UT for weld joints','ASME B31.3','ASME B31.3|API 570',1,'QC Dep.'],
  [9,'Hardness testing of body','ASTM E10|ASTM E18','API 6A|ASME B31.3',1,'QC Dep.'],
  [10,'Hardness testing of weld joints','ASTM E10|ASTM E18','API 6A|ASME B31.3',1,'QC Dep.'],
  [11,'Assembly','FO-05-R&D','',0,'Maint. Dep'],
  [12,'Hydrostatic Pressure Test','FO-29-PRO|API 6A|ASME B31.3','FO-29-PRO|API 6A|ASME B31.3',1,'Maint. Dep'],
  [13,'Painting','FO-05-R&D|PR-01-CMT','Customer specifications',0,'Prod. Dep.'],
  [14,'Painting control','PR-01-CMT|FO-02-CMT','PR-01-CMT|Customer specifications',1,'QC Dep.'],
  [15,'Marking : Hard Stamping (NEW TAG)','IN-09-PRO','IN-09-PRO',0,'Prod. Dep.'],
  [16,'Storage Compound and Protection','IN-02-PRO|API 6A|ASME B16.5','IN-02-PRO|API 6A|ASME B16.5',0,'Prod. Dep.'],
  [17,'Handling and Storage','IN-02-PRO','IN-02-PRO',0,'Prod. Dep.'],
  [18,'Final Check (FO-19-PRO)','FO-19-PRO','All above requirements and records',1,'QC Dep.']
];

var QP_OPS_MANUF = [
  [1,'Control at reception (raw material and MTC)','FO-02-PRO','Customer specifications|{GRADE}',1,'QC Dep.'],
  [2,'Cutting and rough machining','FO-05-R&D','',0,'Prod. Dep.'],
  [3,'Final machining and thread machining','FO-05-R&D|{THREAD}','',0,'Prod. Dep.'],
  [4,'Visual and dimensional inspection (including threads)','FO-04-PRO|FO-51-PRO','{NORM}|{THREAD}|Customer specifications',1,'QC Dep.'],
  [5,'Hardness testing (if required)','ASTM E10|ASTM E18','{NORM}|Customer specifications',1,'QC Dep.'],
  [6,'MPI inspection (if required)','ASTM E709','{NORM}|Customer specifications',1,'QC Dep.'],
  [7,'Marking : Hard Stamping','IN-09-PRO','IN-09-PRO',0,'Prod. Dep.'],
  [8,'Painting (if applicable) and thread protectors','FO-05-R&D|PR-01-CMT','Customer specifications',0,'Prod. Dep.'],
  [9,'Handling and Storage','IN-02-PRO','IN-02-PRO',0,'Prod. Dep.'],
  [10,'Final Check (FO-19-PRO){DOCS}','FO-19-PRO','All above requirements and records',1,'QC Dep.']
];

var QP_NOTES_AB = [
  'a) For operation instruction, refer to Work Order (WO) Document Reference FO-05-R&D',
  'b) Any NCR detected shall be treated according to procedure PR-01-PRO'
];

var STD_ORDER = ['API-5CT','API-5B','API-7-1','API-7-2','API-5C5','API-6A','ISO-13678','NACE','ASTM','EN-10204'];

var STANDARDS = {
  'API-5CT': { name:'API Spec 5CT / ISO 11960:2020 - Casing and Tubing', short:'API 5CT', edition:'11th Edition, incl. Errata 1 (2024)', verified:true, role:'Delivery conditions for casing, tubing, pup joints and coupling stock', checks:['Heat and product chemical analysis','Tensile, yield and elongation tests per lot','Hardness testing','Impact (CVN) testing','Visual and dimensional inspection','NDE of pipe body and ends','Marking per 5CT'], url:'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5ct' },
  'API-5B': { name:'API Spec 5B - Threading, Gauging and Inspection', short:'API 5B', edition:'16th Edition (Dec 2017)', verified:true, role:'Thread form, tolerances, gauging', checks:['Visual inspection of thread surfaces','Lead and taper checks','Thread height and length','Stand-off with working gauges','Major diameter check','Gauge calibration','Thread compound'], url:'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5b' },
  'API-7-1': { name:'API Spec 7-1 / ISO 10424-1 - Rotary Drill Stem Elements', short:'API 7-1', edition:'2nd Edition + Errata (2025)', verified:true, role:'Drill stem subs, drill collars, HWDP', checks:['Material chemistry/mechanical','Hardness and impact','Dimensional inspection','Cold working of thread roots','NDE of threads','Marking per 7-1'], url:'https://www.api.org/products-and-services/standards/important-standards-announcements/spec7-1' },
  'API-7-2': { name:'API Spec 7-2 / ISO 10424-2 - Threading and Gauging', short:'API 7-2', edition:'2nd Edition (Jan 2017)', verified:true, role:'Dimensions, gauging of rotary shouldered connections', checks:['Thread form, lead, taper','Stand-off of ring and plug gauges','Connection bevel and shoulder','Gauge traceability','Thread compound'], url:'https://www.api.org/products-and-services/standards/important-standards-announcements/spec7-2' },
  'API-5C5': { name:'API RP 5C5 / ISO 13679 - Testing Casing and Tubing Connections', short:'API RP 5C5', edition:'4th Edition', verified:false, role:'Qualification (CAL levels) of premium connections', checks:['Qualification report available','Size/weight/grade covered'], url:'https://www.iso.org' },
  'API-6A': { name:'API Spec 6A / ISO 10423 - Wellhead and Tree Equipment', short:'API 6A', edition:'Latest edition in force', verified:false, role:'Wellhead equipment', checks:['Material, dimensional, NDE, test per PSL'], url:'https://www.api.org/products-and-services/standards/important-standards-announcements/spec6a' },
  'ISO-13678': { name:'API RP 5A3 / ISO 13678 - Thread compounds', short:'ISO 13678', edition:'Latest edition', verified:false, role:'Thread compound evaluation', checks:['Type and batch per OEM'], url:'https://www.iso.org' },
  'NACE': { name:'NACE MR0175 / ISO 15156 - Materials for H2S environments', short:'NACE MR0175', edition:'Latest edition', verified:false, role:'Sour service material requirements', checks:['Grade and heat treatment compliant','Hardness testing'], url:'https://www.iso.org' },
  'ASTM': { name:'ASTM E709 (MPI), E18 (Rockwell), E10 (Brinell), A370', short:'ASTM', edition:'Latest editions', verified:false, role:'Test methods for MPI, hardness, mechanical', checks:['MPI of threads','Hardness testing'], url:'https://www.astm.org' },
  'EN-10204': { name:'EN 10204 - Metallic products inspection documents', short:'EN 10204', edition:'EN 10204:2004', verified:false, role:'Inspection documents (MTC, CO, COC)', checks:['MTC type and content','Heat number traceability'], url:'https://www.cencenelec.eu' }
};

var PREMIUM_FAMILIES = [
  { id:'VAM', owner:'Vallourec (VAM)', re:/\bVAM\b|\bDINO\s*VAM\b|\bBIG\s*OMEGA\b/i, labelRe:/\b(?:DINO\s*)?VAM\s*(?:TOP|21|FJL|SLIJ|HTF|SG|EDGE|MUST|HW|BOLT|HP|DWC)[A-Z0-9\/\- ]{0,10}/i, derivatives:'VAM TOP, VAM 21, VAM FJL, VAM SLIJ-II, VAM HTF, VAM SG, VAM EDGE SF, DINO VAM, VAM MUST, VAM HW ST, VAM BOLT, VAM HP, BIG OMEGA', docs:'VAM Book + Connection Data Sheet', url:'https://www.vamservices.com' },
  { id:'TENARIS', owner:'Tenaris (TenarisHydril)', re:/\bTENARIS\w*|\bHYDRIL\b|\bWEDGE\s*\d{3}\b|\bTSH\b|\bPH-?6\b/i, labelRe:/\b(?:TSH|WEDGE|HYDRIL)\s*-?\s*\d{2,3}\b/i, derivatives:'TenarisHydril Wedge 500 series, Wedge 441, Wedge XP, Blue, Dopeless, PH6', docs:'TenarisHydril Connection Data Sheet', url:'https://www.tenaris.com', note:'TSH is interpreted as TenarisHydril family - confirm with customer' },
  { id:'JFE', owner:'JFE Steel', re:/\b(?:JFE|Jfe)\w*|\bFOX\b/, labelRe:/\bJFE\s?(?:BEAR|LION)\b|\bFOX\b/i, derivatives:'JFEBEAR, JFELION, FOX', docs:'JFE connection data sheet', url:'https://www.jfe-steel.co.jp' },
  { id:'GRANT', owner:'Grant Prideco (NOV)', re:/GRANT\s*PRIDECO|ATLAS\s*BRADFORD|\bATS-?E\b|\bXT-?\d{2}\b|\bTC-?(?:II|4S)\b/i, labelRe:/GRANT\s*PRIDECO|ATLAS\s*BRADFORD[A-Z0-9 \-]{0,10}|\bATS-?E\b|\bXT-?\d{2}\b|\bTC-?(?:II|4S)\b/i, derivatives:'Atlas Bradford (TC-II, TC-4S, ATS-E), XT drill pipe', docs:'Grant Prideco / NOV data sheet', url:'https://www.nov.com' },
  { id:'HUNTING', owner:'Hunting', re:/\bSEAL-?LOCK\b|\bTEC-?LOCK\b|\bHUNTING\b/i, labelRe:/\bSEAL-?LOCK[A-Z \-]{0,10}|\bTEC-?LOCK[A-Z \-]{0,10}/i, derivatives:'SEAL-LOCK (APEX, FLUSH, Semi Flush), TEC-LOCK (Wedge, FJ)', docs:'Hunting connection data sheet', url:'https://www.hunting-intl.com' }
];

var PREMIUM_CHECKS = [
  ['Manufacturing licence and OEM data sheet revision','Licence valid; revision recorded'],
  ['Thread geometry','OEM tolerance'],
  ['Seal and shoulder dimensions','OEM tolerance'],
  ['Pin and box diameters, ID drift','OEM tolerance'],
  ['Seal surface finish','OEM acceptance'],
  ['Surface treatment / coating','OEM data sheet'],
  ['Gauging with OEM licensed gauges','OEM gauge spec'],
  ['Make-up torque window','OEM data sheet'],
  ['Thread compound type and quantity','OEM / API RP 5A3'],
  ['Connection qualification (CAL level)','OEM test report'],
  ['Visual inspection 100% and NDE','Customer spec / OEM'],
  ['Thread protectors','OEM / customer spec']
];

var TSH_511_VERIFIED = false;
var TSH_511_MANUAL = {
  'TSH 511': [
    { od:'2 3/8', wt:'4.7', drift:'1.901', couplingOD:'3.063', torque:'1600' },
    { od:'2 7/8', wt:'6.5', drift:'2.347', couplingOD:'3.625', torque:'2800' },
    { od:'2 7/8', wt:'7.9', drift:'2.253', couplingOD:'3.625', torque:'3400' },
    { od:'3 1/2', wt:'9.2', drift:'2.867', couplingOD:'4.500', torque:'4400' },
    { od:'3 1/2', wt:'12.95', drift:'2.750', couplingOD:'4.500', torque:'5200' },
    { od:'4', wt:'11.6', drift:'3.375', couplingOD:'5.000', torque:'5800' },
    { od:'4', wt:'14.0', drift:'3.320', couplingOD:'5.000', torque:'6500' },
    { od:'4 1/2', wt:'12.6', drift:'3.833', couplingOD:'5.563', torque:'7500' },
    { od:'4 1/2', wt:'15.1', drift:'3.795', couplingOD:'5.563', torque:'8500' },
    { od:'5', wt:'18.0', drift:'4.250', couplingOD:'6.050', torque:'10500' },
    { od:'5 1/2', wt:'20.0', drift:'4.750', couplingOD:'6.625', torque:'12500' }
  ]
};

var STANDARDS_SOURCES = {
  'API-5CT':{ family:'API-5CT', owner:'API', docs:[{ title:'API Spec 5CT', url:'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5ct', type:'html', autoIngest:true, priority:1, contains:['grade','PSL','chemistry','yield'] }] },
  'API-5B':{ family:'API-5B', owner:'API', docs:[{ title:'API Spec 5B', url:'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5b', type:'html', autoIngest:true, priority:1, contains:['thread','gauge','taper','lead'] }] },
  'API-7-2':{ family:'API-7-2', owner:'API', docs:[{ title:'API Spec 7-2', url:'https://www.api.org/products-and-services/standards/important-standards-announcements/spec7-2', type:'html', autoIngest:true, priority:1, contains:['NC','REG','FH','bevel','shoulder'] }] },
  'API-6A':{ family:'API-6A', owner:'API', docs:[{ title:'API Spec 6A', url:'https://www.api.org/products-and-services/standards/important-standards-announcements/spec6a', type:'html', autoIngest:true, priority:1, contains:['PSL','material class','hydrostatic','NDE'] }] },
  'ASTM-PUBLIC':{ family:'ASTM-PUBLIC', owner:'ASTM', docs:[{ title:'ASTM E709 / E18 / E10', url:'https://www.astm.org/standards/e709', type:'html', autoIngest:true, priority:2, contains:['magnetic particle','hardness','rockwell'] }] },
  'NACE-PUBLIC':{ family:'NACE-PUBLIC', owner:'NACE', docs:[{ title:'NACE MR0175', url:'https://www.ampp.org/technical-research/impact/corrosion-basics/mr0175-iso-15156', type:'html', autoIngest:true, priority:2, contains:['H2S','sour service','hardness'] }] }
};

var PREMIUM_SOURCES = {
  'VAM':{ family:'VAM', owner:'Vallourec (VAM)', docs:[{ title:'VAM Book', url:'https://www.vamservices.com/assets/downloads/VAM%C2%AE%20Book.pdf', type:'pdf', autoIngest:true, priority:1, contains:['poids','diametre','shoulder','torque'] }] },
  'TENARIS':{ family:'TENARIS', owner:'Tenaris', docs:[{ title:'TenarisHydril Datasheets Manual', url:'https://stadatasheetprod.blob.core.windows.net/datasheets/~/media/Files/ProductLiterature/LiteraturePremiumConnections/TS_Datasheets_Manual.pdf', type:'pdf', autoIngest:true, priority:1, contains:['coupling length','connection OD','shoulder torque'] }] },
  'JFE':{ family:'JFE', owner:'JFE Steel', docs:[] }
};

var PREMIUM_TOOLS = [
  { family:'VAM', title:'VAM Services', url:'https://www.vamservices.com/' },
  { family:'VAM', title:'VAM USA Toolbox', url:'https://www.vam-usa.com/toolbox/' },
  { family:'TENARIS', title:'Tenaris DCP', url:'https://dcp.tenaris.com/' },
  { family:'JFE', title:'JFE Tools', url:'https://www.jfetools.com/datasheet_generator' },
  { family:'API-5CT', title:'API Monogram', url:'https://www.api.org/products-and-services/api-monogram-and-apiqr' },
  { family:'API-6A', title:'API Webstore', url:'https://www.apiwebstore.org/' }
];

var SENSITIVE_DOMAINS = [
  { key:'Criminalite', keywords:['criminalit','crime','meurtre','homicide','violence','trafic'], sources:['ONUDC','Europol'] },
  { key:'Terrorisme', keywords:['terroris','attentat','djihad'], sources:['ONU','GTD'] },
  { key:'Guerre/Conflit', keywords:['guerre','conflit','militaire'], sources:['ONU','OTAN'] },
  { key:'Geopolitique', keywords:['geopolit','sanction'], sources:['ONU','CIA'] },
  { key:'Economie mondiale', keywords:['pib mondial','crise mondiale'], sources:['FMI','BM'] },
  { key:'Sante publique', keywords:['pandemi','epidemi','mortalite'], sources:['OMS','CDC'] },
  { key:'Immigration', keywords:['immigration','migrant','refugie'], sources:['HCR','OIM'] },
  { key:'Climat', keywords:['climat','rechauffement','co2'], sources:['GIEC','NOAA'] }
];

var ANALYTICAL_DOMAINS = ['Economie','Finance','Medecine','Sante','Marketing','Commerce','IA & KMS','Sciences','Energie','Education','Industrie','Technologie','Business','Gestion','Droit','Criminalite','Terrorisme','Guerre/Conflit','Geopolitique','Economie mondiale','Sante publique','Immigration','Climat','Technique','Petrole & Gaz','Plan Qualite'];

var DOMAIN_METRICS = {
  'Plan Qualite':{ icon:'📋', label:'Plan Qualite - QP STANDARD 01', ratios:[{ name:'Conformite QP 01', formula:'conformes / imposees', unit:'%', target:100 },{ name:'Points controle', formula:'definis / attendus', unit:'%', target:100 },{ name:'Tracabilite matiere', formula:'MTC / attendus', unit:'%', target:100 }] },
  'Petrole & Gaz':{ icon:'🛢️', label:'Petrole et Gaz', ratios:[{ name:'Conformite', formula:'conformes / produites', unit:'%', target:98 },{ name:'Rebut', formula:'rejetees / produites', unit:'%', target:2 },{ name:'Resistance', formula:'limite / nominale', unit:'x', target:1.5 }] }
};

var LITERARY_RELIGIOUS_DOMAINS = ['Religion','Litterature','Philosophie','Histoire','Theologie','Islam','Arts','Langues','Droit'];
var SCHOLARS_BY_DOMAIN = {
  'Religion':[{ fr:'Ibn Taymiyya', ar:'ابن تيمية' },{ fr:'Ibn Kathir', ar:'ابن كثير' },{ fr:'Al-Ghazali', ar:'الغزالي' }],
  'Philosophie':[{ fr:'Aristote', ar:'أرسطو' },{ fr:'Platon', ar:'أفلاطون' },{ fr:'Kant', ar:'كانط' }],
  'Litterature':[{ fr:'Victor Hugo', ar:'فيكتور هوغو' },{ fr:'Shakespeare', ar:'شكسبير' }]
};

function isQualityPlanRequest(question, content) {
  var text = ((question || '') + ' ' + (content || '')).toLowerCase();
  var triggers = ['plan qualite','plan qualité','plan de qualite','quality control plan','quality plan','qp ','qp-','qp_','qp01','qp 01','qp standard','controle qualite','control plan'];
  for (var i = 0; i < triggers.length; i++) if (text.indexOf(triggers[i]) !== -1) return true;
  return false;
}
var QP_RE = /plan\s*(de\s*)?qualit|quality\s*(control\s*)?plan|\bqp\b|\bqp[-_ ]?\d|contr.le\s*qualit|control\s*plan/i;

function cleanText(text) {
  if (!text) return '';
  var t = String(text);
  t = t.replace(/\*\*/g,'').replace(/\*/g,'').replace(/`/g,'');
  t = t.replace(/^#{1,6}\s+/gm,'');
  t = t.replace(/^[-_*]{3,}$/gm,'');
  t = t.replace(/\\/g,'').replace(/\t/g,' ');
  t = t.replace(/\n{3,}/g,'\n\n').replace(/ {2,}/g,' ');
  return t.trim();
}
function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function tokenize(text) {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(function(x) { return x.length >= 3; });
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
function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function readRawBody(req, maxBytes) {
  return new Promise(function(resolve, reject) {
    var chunks = [], size = 0;
    req.on('data', function(c) {
      size += c.length;
      if (maxBytes && size > maxBytes) { req.destroy(); return reject(new Error('Taille superieure a QP_MAX_BYTES')); }
      chunks.push(c);
    });
    req.on('end', function() { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}
function readRawBodyBuffer(req, maxBytes) {
  return new Promise(function(resolve, reject) {
    var chunks = [], size = 0;
    req.on('data', function(c) {
      size += c.length;
      if (maxBytes && size > maxBytes) { req.destroy(); return reject(new Error('Taille superieure a QP_MAX_BYTES')); }
      chunks.push(c);
    });
    req.on('end', function() { resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}
function isPdfBuffer(text) { return String(text || '').slice(0, 5) === '%PDF-'; }

async function extractPdfText(buffer) {
  LAST_PDF_PARSER = '';
  try {
    var mod = require('pdf-parse');
    if (typeof mod === 'function') {
      var data = await mod(buffer);
      var t1 = (data && data.text) || '';
      if (t1 && t1.length > 200) { LAST_PDF_PARSER = 'pdf-parse-1.x'; return reflowPdfText(t1); }
    }
    if (mod && mod.PDFParse) {
      var parser = new mod.PDFParse({ data: buffer });
      var res2 = await parser.getText();
      var t2 = (res2 && res2.text) || '';
      if (t2 && t2.length > 200) { LAST_PDF_PARSER = 'pdf-parse-2.x'; return reflowPdfText(t2); }
    }
  } catch (e) {}
  try {
    var pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    var doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableWorker: true }).promise;
    var parts = [];
    for (var p = 1; p <= doc.numPages; p++) {
      var page = await doc.getPage(p);
      var content = await page.getTextContent();
      parts.push(content.items.map(function(it) { return it.str; }).join(' '));
    }
    var t3 = parts.join('\n').replace(/\s{3,}/g,' ').trim();
    if (t3 && t3.length > 200) { LAST_PDF_PARSER = 'pdfjs-dist'; return reflowPdfText(t3); }
  } catch (e) {}
  LAST_PDF_PARSER = 'fallback-regex';
  var raw = buffer.toString('latin1');
  var matches = raw.match(/\(([^\)]{2,})\)/g) || [];
  var txt = matches.map(function(m) { return m.slice(1, -1); }).join(' ');
  return reflowPdfText(txt.replace(/\s+/g,' ').trim());
}

var PDF_STRUCT_KEYS = [
  /(?=Person\s*:)/gi, /(?=Your\s+order\b)/gi, /(?=Our\s+ref\.?)/gi,
  /(?=Payment\b)/gi, /(?=Tax\s+code\b)/gi, /(?=Order\s+confirmation\b)/gi,
  /(?=Delivery\b)/gi, /(?=Job\s+Article\b)/gi, /(?=Article\s*\/\s*Description\b)/gi,
  /(?=Qty\.?\s*Net\s*UP)/gi, /(?=Net\s*UP\s*Total\s*price)/gi,
  /(?=SUPPLY\s+MATERIAL\s*&\s*MANUFACTURE)/gi, /(?=As\s+per\s+our\s+estimate\b)/gi,
  /(?=Grade\s*:)/gi, /(?=PN\s*[°o]?\s*:)/gi, /(?=Page\s+\d+\s*\/\s*\d+)/gi,
  /(?=REPAIR\b)/gi, /(?=RECERTIF\w*)/gi, /(?=REFURB\w*)/gi,
  /(?=TO\s+RECUT\b)/gi, /(?=ARC\s+IC\d+)/gi, /(?=2026-OF-\d+)/gi
];
function reflowPdfText(text) {
  var t = String(text || '');
  if (t.length < 50) return t;
  for (var i = 0; i < PDF_STRUCT_KEYS.length; i++) t = t.replace(PDF_STRUCT_KEYS[i], '\n$&');
  t = t.replace(/(\d{2}\/\d{2}\/\d{2,4})(\d{5})\b/g,'$1\n$2');
  return t.replace(/\n{3,}/g,'\n\n').replace(/[ \t]{2,}/g,' ').trim();
}

function fetchUrl(url, maxRedirects, timeoutMs) {
  maxRedirects = maxRedirects === undefined ? 5 : maxRedirects;
  timeoutMs = timeoutMs || 30000;
  return new Promise(function(resolve, reject) {
    var lib = url.indexOf('https://') === 0 ? https : http;
    var req = lib.get(url, { headers: { 'User-Agent':'Mozilla/5.0','Accept':'*/*','Accept-Encoding':'gzip, deflate' } }, function(res) {
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
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      var chunks = [];
      var enc = (res.headers['content-encoding'] || '').toLowerCase();
      var stream = res;
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      stream.on('data', function(c) { chunks.push(c); });
      stream.on('end', function() { resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || '', url: url }); });
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, function() { req.destroy(new Error('Timeout')); });
  });
}

async function fetchUrlRetry(url, type) {
  var lastErr = null;
  var delays = [0, 3000, 8000];
  for (var i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await new Promise(function(r) { setTimeout(r, delays[i]); });
    try { return await fetchUrl(url); }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Echec apres ' + delays.length + ' tentatives');
}

function extractHtmlText(html) {
  var t = String(html);
  t = t.replace(/<script[\s\S]*?<\/script>/gi,' ');
  t = t.replace(/<style[\s\S]*?<\/style>/gi,' ');
  t = t.replace(/<[^>]+>/g,' ');
  t = t.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  return t.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}

async function fetchAndExtract(url, type) {
  var res = await fetchUrlRetry(url, type);
  var ct = (res.contentType || '').toLowerCase();
  var isPdf = type === 'pdf' || ct.indexOf('pdf') !== -1 || /\.pdf(\?|$)/i.test(url);
  var text, parser = 'html';
  if (isPdf) { text = await extractPdfText(res.buffer); parser = LAST_PDF_PARSER; }
  else { text = extractHtmlText(res.buffer.toString('utf8')); }
  return { url: url, type: isPdf ? 'pdf' : 'html', text: text, bytes: res.buffer.length, parser: parser };
}

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
      return { title: d.title, domain: d.domain, source: d.source, url: d.url, createdAt: d.createdAt, content: d.content, score: Math.max(cosScore, kwScore) };
    }).filter(function(d) { return d.score >= minScore; }).sort(function(a, b) { return b.score - a.score; }).slice(0, limit);
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
      if (excerpt.length > 100) context += '\n\n=== DOCUMENT SOURCE ' + (i + 1) + ' : ' + d.title + ' ===\nDomaine : ' + d.domain + '\nExtrait :\n' + excerpt + '\n=== FIN DOCUMENT ' + (i + 1) + ' ===';
    });
    return { context: context, docs: docs, topScore: docs[0].score };
  } catch (e) { return { context: '', docs: [], topScore: 0 }; }
}

// ============================================================
// UTILITAIRES WO / QP (extraits complets de la v16.21)
// ============================================================
function odVariants(od) {
  var v = [String(od || '').trim()];
  var m = String(od || '').match(/^(\d+)\s+(\d+)\/(\d+)$/);
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
function odToNum(v) {
  var x = String(v || '').replace(/["\u201D]/g,'').trim();
  var m = x.match(/^(\d+)[\s\-]+(\d+)\/(\d+)$/);
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
  var f = parseFloat(x.replace(',', '.'));
  return isNaN(f) ? null : f;
}
function normConn(v) { return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

function matchDetail(h, wo, det) {
  h = h || {};
  var res = { ok: false, level: 'none', note: '' };
  var excerpt = String(h.excerpt || '');
  if (!excerpt && !h.connection) return res;
  var txt = excerpt.toLowerCase();
  det = det || {};
  var hasConns = !!(det.conns && det.conns.length);
  var hasPremium = false;
  if (hasConns) det.conns.forEach(function(c) { if (c.kind === 'premium') hasPremium = true; });
  var sz = (det.sizes && det.sizes.length) ? det.sizes[0] : null;
  var hasSize = !!(sz && sz.od && sz.wt);
  var isSheet = h.isSheet === true || /^CONNECTION:/.test(excerpt);
  var connMatch = false;
  if (hasConns) {
    var hay = normConn(excerpt + ' ' + (h.connection || '') + ' ' + (h.title || ''));
    for (var i = 0; i < det.conns.length; i++) {
      var lab = normConn(det.conns[i].label);
      if (lab && hay.indexOf(lab) !== -1) { connMatch = true; break; }
    }
  }
  var textBoth = false;
  if (hasSize) textBoth = hasToken(excerpt, odVariants(sz.od)) && hasToken(excerpt, numVariants(sz.wt));
  if (isSheet) {
    if (hasConns && !connMatch) { res.note = 'connection differs'; return res; }
    if (!hasSize) { res.level = 'conn-only'; res.ok = true; res.note = 'no size in WO'; return res; }
    var wOd = odToNum(sz.od), wWt = parseFloat(String(sz.wt).replace(',', '.'));
    var sOd = odToNum(h.od), sWt = parseFloat(String(h.wt || '').replace(',', '.'));
    var odEq = (sOd !== null && wOd !== null && Math.abs(sOd - wOd) < 0.002);
    var wtOk = !isNaN(sWt) && !isNaN(wWt);
    var wtEq = wtOk && Math.abs(sWt - wWt) < 0.005;
    if ((odEq && wtEq) || textBoth) { res.ok = true; res.level = 'exact'; return res; }
    if (odEq && wtOk) { res.level = 'near'; res.note = 'sheet ' + h.wt + ' vs WO ' + sz.wt; return res; }
    if (sOd === null || !wtOk) { res.level = 'conn-only'; res.note = 'size not verifiable'; return res; }
    res.note = 'size differs'; return res;
  }
  if (hasPremium) {
    if (!connMatch) { res.note = 'connection not found'; return res; }
    if (!hasSize) { res.ok = true; res.level = 'conn-only'; return res; }
    if (textBoth) { res.ok = true; res.level = 'exact'; return res; }
    res.level = 'conn-only'; return res;
  }
  var hits = 0, total = 0;
  if (hasConns) { total++; if (connMatch) hits += 2; }
  if (det.apiGrade) { total++; if (txt.indexOf(String(det.apiGrade).toLowerCase()) !== -1) hits++; }
  if (hasSize) { total += 2; if (txt.indexOf(String(sz.od).toLowerCase()) !== -1) hits++; if (txt.indexOf(String(sz.wt).toLowerCase()) !== -1) hits++; }
  if (total === 0 || connMatch || hits >= 1) { res.ok = true; res.level = 'exact'; }
  return res;
}

function qpConfidenceDetail(p, kb) {
  var detail = { total: 0, size: 0, conn: 0, grade: 0, api: 0, officialMax: 0, coverage: 0, totalHits: 0, totalOfficial: 0, totalMatched: 0 };
  if (p.det.sizes && p.det.sizes.length) detail.size = 20;
  if (p.det.conns && p.det.conns.length) detail.conn = 20;
  if (p.info.grade) detail.grade = 15;
  if (p.det.apiGrade || p.det.aisi) detail.api = 15;
  var officialHits = 0, totalHits = 0, totalOfficial = 0, totalMatched = 0;
  (p.queries || []).forEach(function(q) {
    (kb[q] || []).forEach(function(h) {
      totalHits++;
      if (h.official) { totalOfficial++; if (matchDetail(h, p.wo, p.det).ok) { officialHits++; totalMatched++; } }
    });
  });
  detail.totalHits = totalHits;
  detail.totalOfficial = totalOfficial;
  detail.totalMatched = totalMatched;
  if (officialHits > 0) detail.officialMax = Math.min(20, officialHits * 7);
  if (totalHits > 0 && officialHits / totalHits >= 0.5) detail.coverage = 10;
  detail.total = detail.size + detail.conn + detail.grade + detail.api + detail.officialMax + detail.coverage;
  if (detail.total > 100) detail.total = 100;
  return detail;
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
  if (content.length < 2000) {
    best = content;
    var low = content.toLowerCase();
    var s = 0;
    for (var i = 0; i < qList.length; i++) if (low.indexOf(qList[i]) !== -1) s++;
    if (odV.length && hasToken(content, odV)) s += 3;
    if (wtV.length && hasToken(content, wtV)) s += 3;
    bestScore = s;
  } else {
    for (var pos = 0; pos < content.length; pos += STEP) {
      var win = content.slice(pos, pos + W);
      var low2 = win.toLowerCase();
      var s2 = 0;
      for (var i2 = 0; i2 < qList.length; i2++) if (low2.indexOf(qList[i2]) !== -1) s2++;
      if (odV.length && hasToken(win, odV)) s2 += 3;
      if (wtV.length && hasToken(win, wtV)) s2 += 3;
      if (s2 > bestScore) { bestScore = s2; best = win; }
    }
  }
  if (!best || bestScore < 2) return null;
  return { score: Math.min(1, bestScore / 12), excerpt: best.replace(/\s+/g,' ').trim().slice(0, 600) };
}

function famMatchDoc(d, q) {
  var title = String(d.title || '');
  var familyMeta = String((d.metadata && d.metadata.family) || '');
  var connMeta = String((d.metadata && d.metadata.connection) || '');
  var contentSample = String(d.content || '').slice(0, 3000);
  var qConn = q.match(/(TSH\s*\d{2,3}|WEDGE\s*\d{3}|VAM\s*(?:TOP|21|FJL|SLIJ|HTF|SG|EDGE|MUST|HW|BOLT|HP|DWC)|HYDRIL\s*PH-?\d|JFE\s?(?:BEAR|LION)|FOX|SEAL-?LOCK|TEC-?LOCK)/i);
  if (qConn) {
    var needle = qConn[1].replace(/\s+/g, '\\s*');
    var re = new RegExp(needle, 'i');
    if (re.test(title) || re.test(connMeta) || re.test(contentSample)) return true;
  }
  if (/Vallourec|\bVAM\b/i.test(q)) return /Vallourec|VAM/i.test(title + ' ' + connMeta + ' ' + contentSample);
  if (/Tenaris|Hydril/i.test(q)) return /Tenaris|Hydril/i.test(title + ' ' + familyMeta + ' ' + connMeta + ' ' + contentSample);
  if (/JFE/i.test(q)) return /JFE/i.test(title + ' ' + connMeta + ' ' + contentSample);
  return true;
}

async function loadKbForSearch(AutoFeedDoc) {
  var premium = [], others = [];
  try { premium = await AutoFeedDoc.find({ source: 'Premium-Source-Auto' }).lean(); } catch (e) {}
  try {
    others = await AutoFeedDoc.aggregate([
      { $match: { source: { $ne: 'Premium-Source-Auto' } } },
      { $sort: { createdAt: -1 } },
      { $limit: KB_SCAN_LIMIT },
      { $project: { title: 1, domain: 1, url: 1, source: 1, vector: 1, content: { $substrCP: [{ $ifNull: ['$content', ''] }, 0, 12000] } } }
    ]);
  } catch (e) {
    try { others = await AutoFeedDoc.find({ source: { $ne: 'Premium-Source-Auto' } }).sort({ createdAt: -1 }).limit(500).lean(); } catch (e2) {}
  }
  others = others.filter(function(d) { return !isBlockedDomain(d.url); });
  return { premium: premium, others: others };
}

async function kbSearchMany(AutoFeedDoc, queries, minScore) {
  var result = {};
  if (!AutoFeedDoc || !queries || queries.length === 0) return result;
  var kbd = await loadKbForSearch(AutoFeedDoc);
  queries.forEach(function(q) {
    var isPrem = /connection data sheet/i.test(q);
    var isStd = /API\s*(?:5CT|5B|7-1|7-2|6A|RP\s*5C5|RP\s*5A3)/i.test(q);
    var official = [];
    if (isPrem || isStd) {
      kbd.premium.forEach(function(d) {
        if (!famMatchDoc(d, q)) return;
        var h = premiumChunkSearch(d, q);
        if (h) {
          var md = d.metadata || {};
          var isManual = md.manual === true;
          official.push({ title: d.title || '', domain: d.domain || '', url: d.url || '', score: h.score, excerpt: h.excerpt, official: !isManual, manual: isManual, isSheet: md.isSheet === true, connection: md.connection || '', od: md.od || '', wt: md.wt || '' });
        }
      });
      official = official.slice(0, 2);
    }
    var qTokens = tokenize(q);
    var qVector = buildVector(q);
    var scored = kbd.others.map(function(d) {
      var hasVector = d.vector && Object.keys(d.vector).length > 0;
      var cos = hasVector ? cosineSimilarity(qVector, d.vector) : 0;
      var kw = keywordOverlapScore(qTokens, (d.title || '') + ' ' + String(d.content || '').slice(0, 8000));
      return { d: d, score: Math.max(cos, kw) };
    }).filter(function(s) { return s.score >= minScore; }).sort(function(a, b) { return b.score - a.score; }).slice(0, isPrem ? 1 : 2);
    var rest = scored.map(function(s) { return { title: s.d.title || '', domain: s.d.domain || '', url: s.d.url || '', score: s.score, excerpt: pickExcerpt(s.d.content, q), official: false, manual: false }; });
    result[q] = official.concat(rest);
  });
  return result;
}

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
  return (best || text.slice(0, 250)).slice(0, 300);
}

function detectDomain(question, defaultDomain) {
  // FORCE-DOMAIN-RESPECT : respecter req.body.domain s'il est explicitement force
  if (defaultDomain && defaultDomain === 'General') return 'General';
  if (defaultDomain && defaultDomain !== 'General') {
    // Domaine force par smart-answer : verifier s'il est valide
    var validDomains = ['Plan Qualite','Petrole & Gaz','Technique','Sciences','General'];
    if (validDomains.indexOf(defaultDomain) !== -1) return defaultDomain;
  }
  if (defaultDomain && defaultDomain !== 'General') return defaultDomain;
  var q = String(question || '').toLowerCase();
  if (isQualityPlanRequest(question, '')) return 'Plan Qualite';
  var petro = ['api 5ct','api 5b','api 6a','vam','tubage','casing','tubing','petrole','gaz','nace','h2s','thread','coupling'];
  for (var i = 0; i < petro.length; i++) if (q.indexOf(petro[i]) !== -1) return 'Petrole & Gaz';
  var tech = ['norme','iso','qualite','fabrication','certificat','mtc','inspection','test pression','ndt','soudure','welding','acier','steel','tolerance'];
  for (var j = 0; j < tech.length; j++) if (q.indexOf(tech[j]) !== -1) return 'Technique';
  return 'General';
}
function isLiteraryOrReligious(domain) { return LITERARY_RELIGIOUS_DOMAINS.some(function(d) { return domain.toLowerCase().indexOf(d.toLowerCase()) !== -1; }); }
function isSensitiveDomain(domain) { return SENSITIVE_DOMAINS.some(function(d) { return d.key === domain; }); }

function hasNumbers(text) { return text && [/\d+\s*%/, /\d+[.,]\d+/, /\d{4}/].some(function(p) { return p.test(text); }); }
function extractScholars(question, answer, domain) {
  var text = (question + ' ' + answer).toLowerCase();
  var scholars = SCHOLARS_BY_DOMAIN[domain] || [];
  var found = [];
  for (var i = 0; i < scholars.length; i++) if (text.indexOf(scholars[i].fr.toLowerCase()) !== -1 || text.indexOf(scholars[i].ar) !== -1) found.push(scholars[i].fr);
  return found;
}
function extractAuthorAndDate(doc) {
  var author = 'Auteur non specifie', date = 'Date non specifiee';
  if (doc.createdAt) date = new Date(doc.createdAt).toLocaleDateString('fr-FR');
  if (doc.url) { var m = doc.url.match(/https?:\/\/(?:www\.)?([^\/]+)/); if (m) author = m[1]; }
  return { author: author, date: date };
}
function judgeClaudeValidation(question, answer, domain) {
  var isSensitive = isSensitiveDomain(domain);
  var hasNums = hasNumbers(answer);
  var result = { isSensitive: isSensitive, hasNumbers: hasNums, length: (answer || '').length, warnings: [], reject: false };
  if (isSensitive && !hasNums) { result.warnings.push('Sujet sensible sans chiffres'); result.reject = true; }
  if (result.length < 200) result.warnings.push('Reponse courte');
  return result;
}
function formatForHTML(text) {
  if (!text) return '';
  var clean = cleanText(text);
  var lines = clean.split('\n');
  var output = [];
  var inList = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line === '') { if (inList) { output.push('</ul>'); inList = false; } output.push('<br>'); continue; }
    var numM = line.match(/^(\d+)\.\s+(.+)$/);
    if (numM) { if (inList) { output.push('</ul>'); inList = false; } output.push('<h4>' + numM[1] + '. ' + esc(numM[2]) + '</h4>'); continue; }
    var isBullet = /^[•◦▪▫]\s+/.test(line) || /^[-*]\s+/.test(line);
    if (isBullet) { if (!inList) { output.push('<ul>'); inList = true; } output.push('<li>' + esc(line.replace(/^[•◦▪▫\-*]\s+/,'')) + '</li>'); continue; }
    if (inList) { output.push('</ul>'); inList = false; }
    output.push('<p>' + esc(line) + '</p>');
  }
  if (inList) output.push('</ul>');
  return output.join('\n');
}

function generateTechSheet(domain, docsUsed, semanticScore, scholars, judgeResult, mode) {
  var html = '<div style="background:linear-gradient(135deg,#0a2540,#1e5aa8);color:#fff;border-radius:12px;padding:20px;margin:20px 0">';
  html += '<h4 style="margin:0 0 14px 0;font-size:16px;font-weight:700">📋 Fiche technique</h4>';
  html += '<table style="width:100%;font-size:13px;color:#fff">';
  html += '<tr><td style="opacity:0.75;width:200px">Domaine</td><td>' + esc(domain) + '</td></tr>';
  if (mode === 'document') html += '<tr><td style="opacity:0.75">Source</td><td>Document colle</td></tr>';
  else { html += '<tr><td style="opacity:0.75">Score</td><td>' + Math.round(semanticScore * 100) + ' %</td></tr>'; html += '<tr><td style="opacity:0.75">Docs</td><td>' + docsUsed + '</td></tr>'; }
  if (scholars && scholars.length) html += '<tr><td style="opacity:0.75">Scholars</td><td>' + esc(scholars.join(', ')) + '</td></tr>';
  html += '<tr><td style="opacity:0.75">Moteur IA</td><td>MBA-CONSULT AI CORE</td></tr>';
  html += '<tr><td style="opacity:0.75">Validation</td><td>Juge Claude</td></tr>';
  html += '<tr><td style="opacity:0.75">Date</td><td>' + new Date().toLocaleString('fr-FR') + '</td></tr>';
  html += '</table></div>';
  return html;
}

// ============================================================
// PARSING WO / QP
// ============================================================
function isEstimateNumber(txt, idx) {
  var back = txt.slice(Math.max(0, idx - 30), idx);
  return /estimate\s*n[°o]?\s*$/i.test(back) || /PN\s*[°o]?\s*:?\s*$/i.test(back) || /n[°o]\s*$/i.test(back);
}

function parseWorkOrders(text) {
  text = String(text || '').replace(/\r/g, '');
  var hits = [], seen = {}, m;
  var re1 = /(^|[^0-9A-Za-z])(\d{5})[\s\u00A0]+(\d{1,3})[\s\u00A0]+(\d{2}\/\d{2}\/\d{2,4})(?![0-9])/g;
  while ((m = re1.exec(text)) !== null) {
    if (seen[m[2]] || isEstimateNumber(text, m.index + m[1].length)) continue;
    seen[m[2]] = 1;
    hits.push({ id: m[2], qte: m[3], date: m[4], start: m.index + m[1].length, end: m.index + m[0].length, order: 'standard' });
  }
  var re2 = /(\d{1,3})[\s\u00A0]+(\d{2}\/\d{2}\/\d{2,4})[\s\u00A0]*\r?\n[\s\u00A0]*(\d{5})(?![0-9])/g;
  while ((m = re2.exec(text)) !== null) {
    if (seen[m[3]]) continue;
    seen[m[3]] = 1;
    hits.push({ id: m[3], qte: m[1], date: m[2], start: m.index + m[0].length - m[3].length, end: m.index + m[0].length, order: 'inverse' });
  }
  var re3 = /(?:^|\n)\s*(\d{5})\s+(?:[A-Z0-9\-\/#\.]+)\s+/g;
  while ((m = re3.exec(text)) !== null) {
    if (seen[m[1]]) continue;
    var sub = text.slice(m.index, m.index + 200);
    var qm = sub.match(/\b(\d{1,3})\b/), dm = sub.match(/(\d{2}\/\d{2}\/\d{2,4})/);
    if (qm && dm) { seen[m[1]] = 1; hits.push({ id: m[1], qte: qm[1], date: dm[1], start: m.index, end: m.index + m[0].length, order: 'table' }); }
  }
  hits.sort(function(a, b) { return a.start - b.start; });
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
    for (var j = 0; j < codes.length; j++) if (codes[j].idx < h.start) c = codes[j];
    var blockStart = c ? c.idx : (i > 0 ? hits[i - 1].end : 0);
    var blockEnd = text.length;
    for (var j2 = 0; j2 < codes.length; j2++) if (codes[j2].idx > h.end) { blockEnd = Math.min(blockEnd, codes[j2].idx); break; }
    for (var p = 0; p < pages.length; p++) if (pages[p] > h.end) { blockEnd = Math.min(blockEnd, pages[p]); break; }
    if (i + 1 < hits.length && !codes.length) blockEnd = Math.min(blockEnd, hits[i + 1].start);
    h.code = c ? c.code : '';
    h.before = text.slice(blockStart, h.start);
    h.after = text.slice(h.end, blockEnd);
  }
  return hits;
}

function describeWO(h) {
  var b = String(h.before || ''), afterText = String(h.after || '');
  var codeMatch = afterText.match(/^[\s\u00A0]*([A-Z0-9\-\/\.]{6,})/);
  var code = h.code || (b.match(/\b\d{4}[A-Z][A-Z0-9]{6,}\b/) || [''])[0] || (codeMatch ? codeMatch[1] : '');
  var estMatch = b.match(/estimate\s*n[°o]?\s*([A-Z0-9]+)/i) || afterText.match(/estimate\s*n[°o]?\s*([A-Z0-9]+)/i);
  var est = estMatch ? estMatch[1] : '';
  var kind = '';
  if (/REPAIR|RECERTIF|REFURB|TO\s+RECUT/i.test(b) || /REPAIR|RECERTIF|REFURB|TO\s+RECUT/i.test(afterText)) kind = 'OVERALL REPAIR';
  else if (/MANUFACTURE|SUPPLY/i.test(b) || /MANUFACTURE|SUPPLY/i.test(afterText)) kind = 'SUPPLY MATERIAL & MANUFACTURE';
  if (!kind) kind = 'SUPPLY MATERIAL & MANUFACTURE';
  var allLines = [];
  b.split(/\r?\n/).forEach(function(l) { allLines.push(l); });
  afterText.split(/\r?\n/).forEach(function(l) { allLines.push(l); });
  var usefulLines = [], seenNorm = {};
  for (var k = 0; k < allLines.length; k++) {
    var ln = allLines[k].replace(/\s+/g, ' ').trim();
    if (ln === '') continue;
    if (/^\d{4}[A-Z][A-Z0-9]{6,}$/.test(ln)) continue;
    if (/^SUPPLY\s+MATERIAL\s*&\s*MANUFACTURE$/i.test(ln)) continue;
    if (/^OVERALL\s+REPAIR$/i.test(ln)) continue;
    if (/^As\s+per\s+our\s+estimate/i.test(ln)) continue;
    if (/^Page\s+\d+/i.test(ln)) continue;
    if (/^GMPI\b/i.test(ln) || /^GLOBAL\s+GROUP$/i.test(ln)) continue;
    if (/^(Your\s+order|Job\s+Qty|Article\s*\/\s*Description|Net\s+UP|Order\s+confirmation|Payment\s+Tax\s+code|WIRE\s+TRANSFER)/i.test(ln)) continue;
    if (/^\d{5}\s+\d{1,3}\s+\d{2}\/\d{2}\/\d{2,4}$/.test(ln)) continue;
    if (/^[\d\/.\-:\s]+$/.test(ln)) continue;
    var norm = ln.toUpperCase();
    if (seenNorm[norm]) continue;
    seenNorm[norm] = 1;
    usefulLines.push(ln);
  }
  var descLines = usefulLines.slice(0, 30);
  var desc = descLines.join('<br>');
  var descPlain = descLines.join('\n');
  if (desc.length > 1500) desc = desc.slice(0, 1500);
  if (descPlain.length > 1500) descPlain = descPlain.slice(0, 1500);
  var combinedPlain = b + '\n' + afterText;
  var gm = combinedPlain.match(/GRADE\s*:\s*([^\n\r]+)/i);
  var grade = gm ? gm[1].trim() : 'L80';
  var lengthMatch = descPlain.match(/Length\s*:\s*([^\n\r]+)/i);
  var odMatch = descPlain.match(/OD\s*:\s*([^\n\r]+)/i);
  var idMatch = descPlain.match(/ID\s*:\s*([^\n\r]+)/i);
  return {
    code: code, est: est, kind: kind, desc: desc, descPlain: descPlain, grade: grade,
    length: lengthMatch ? lengthMatch[1].trim() : '',
    od: odMatch ? odMatch[1].trim() : '',
    id: idMatch ? idMatch[1].trim() : ''
  };
}

function detectCustomer(text) {
  var t = String(text || '').replace(/\r/g, '');
  var lines = t.split('\n').map(function(l) { return l.replace(/\s+/g, ' ').trim(); });
  function isNoise(s) {
    if (/^(?:Your\s+order|Date|Our\s+ref|Payment|Tax\s+code|Order\s+confirmation|Delivery|Job|Article|Page|NOTES|Person|Email|Static|Qty|Dubai|Consignee)/i.test(s)) return true;
    if (/^[\d\/.\-:\s]+$/.test(s)) return true;
    if (/@/.test(s)) return true;
    if (/^[\-\u2022*]/.test(s)) return true;
    return false;
  }
  function looksLikeName(s) { return s && s.length >= 3 && s.length <= 100 && /[A-Za-z]{3,}/.test(s) && !isNoise(s) && s.split(' ').length <= 10; }
  for (var a0 = 0; a0 < lines.length; a0++) {
    if (/Our\s+ref/i.test(lines[a0]) || /^\d{10}$/.test(lines[a0])) {
      var scan0 = 0;
      for (var b0 = a0 + 1; b0 < lines.length && scan0 < 5; b0++) {
        if (lines[b0] === '') continue;
        scan0++;
        if (looksLikeName(lines[b0])) return lines[b0].slice(0, 100);
      }
    }
  }
  for (var i = 0; i < lines.length; i++) {
    if (/^Payment\b/i.test(lines[i])) {
      var found = [], j = i - 1;
      while (j >= 0 && lines[j] === '') j--;
      while (j >= 0 && found.length < 2 && looksLikeName(lines[j])) { found.unshift(lines[j]); j--; }
      if (found.length) return found.join(' ').replace(/\s+/g, ' ').trim().slice(0, 100);
    }
  }
  var m3 = t.match(/(?:Customer|Client|Destinataire)\s*[:#]\s*([^\n\r]{3,100})/i);
  if (m3) return m3[1].replace(/\s+/g, ' ').trim();
  var known = t.match(/(\bPETROCHAD\b[^\n\r]*|\bSONATRACH\b[^\n\r]*|\bENI\s+TUNISIA\b[^\n\r]*|\bPETRONAS\b[^\n\r]*|\bADNOC\b[^\n\r]*|\bSAUDI\s+ARAMCO\b[^\n\r]*|\bTOTALENERGIES\b[^\n\r]*|\bWEATHERFORD\b[^\n\r]*|\bSIVAM\s+SPA\b[^\n\r]*)/);
  if (known) return known[1].replace(/\s+/g, ' ').trim().slice(0, 100);
  return 'XXXXXXX';
}

function detectPO(text) {
  var s = String(text || '').replace(/\r/g, '');
  function validPO(tok) {
    tok = String(tok || '').replace(/[,;:]+$/, '');
    if (tok.length < 5 || tok.length > 25) return '';
    if (!/^[A-Za-z0-9][A-Za-z0-9\-\/._]*$/.test(tok)) return '';
    if ((tok.match(/\d/g) || []).length < 3) return '';
    return tok;
  }
  var m;
  var re1 = /Order\s+confirmation\b\s*(?:N[^A-Za-z0-9\s]{0,2}\.?|No\.?|number)?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-\/._]{3,24})/gi;
  while ((m = re1.exec(s)) !== null) { var v = validPO(m[1]); if (v) return v; }
  var re2 = /(?:Purchase\s*Order|\bP\.O\.|Customer\s+PO)\s*(?:No\.?|N[^A-Za-z0-9\s]{0,2})?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9\-\/._]{3,24})/gi;
  while ((m = re2.exec(s)) !== null) { var v2 = validPO(m[1]); if (v2) return v2; }
  var m4 = s.match(/\b(\d{10})\b/);
  if (m4) return m4[1];
  var m5 = s.match(/\b(2026-OF-\d{7})\b/);
  if (m5) return m5[1];
  return 'NA';
}

function detectNorme(text) {
  var m = String(text).match(/Manufactured\s+According\s+to\s+([\s\S]{3,200}?)\s+Latest\s+Edition/i);
  if (m) return m[1].replace(/\s+/g, ' ').trim() + ' Latest Edition';
  var m2 = String(text).match(/Manufactured\s+According\s+to\s+([^\n\r]+)/i);
  return m2 ? m2[1].trim().slice(0, 80) : '';
}

function detectDetails(info, ctx) {
  var t = String(info.desc || '') + ' ' + String(info.grade || '');
  var det = { conns: [], sizes: [], oal: '', lenTol: '', tols: [], apiGrade: '', aisi: '', sour: false, forceRepair: false };
  var seen = {}, m, re;
  if (/REPAIR|RECERTIF|RECUT/i.test(t)) det.forceRepair = true;
  function addConn(kind, label, std, famId) { var k = kind + '|' + label; if (seen[k]) return; seen[k] = 1; det.conns.push({ kind: kind, label: label, std: std, fam: famId || '' }); }
  re = /\bNC\s?-?\s?(\d{2})\b/gi; while ((m = re.exec(t)) !== null) addConn('rotary', 'NC' + m[1], 'API-7-2');
  re = /\bAPI\s+(REG|FH|IF)\b/gi; while ((m = re.exec(t)) !== null) addConn('rotary', 'API ' + m[1].toUpperCase(), 'API-7-2');
  re = /\b(BTC|LTC|STC|EUE|NUE)\b/g; while ((m = re.exec(t)) !== null) addConn('api', m[1], 'API-5B');
  PREMIUM_FAMILIES.forEach(function(f) {
    var mm = t.match(f.re);
    if (!mm) return;
    var lm = f.labelRe ? t.match(f.labelRe) : null;
    addConn('premium', (lm ? lm[0] : mm[0]).replace(/\s+/g, ' ').trim(), 'PREMIUM', f.id);
  });
  re = /(\d+(?:\s+\d\/\d)?(?:\.\d+)?)\s*"\s*(\d+(?:\.\d+)?)\s*#/g;
  while ((m = re.exec(t)) !== null) det.sizes.push({ od: m[1].trim(), wt: m[2] });
  var oal = t.match(/OAL\s*(\d+(?:\.\d+)?)\s*"/i); if (oal) det.oal = oal[1];
  var lt = t.match(/(\d+(?:\.\d+)?)\s*"\s*\+\s*\/\s*-\s*(\d+(?:\.\d+)?)/i); if (lt) det.lenTol = lt[1] + ' in +/- ' + lt[2] + ' in';
  var g = t.match(/\b(H-?40|J-?55|K-?55|N-?80|L-?80|C-?90|T-?95|P-?110|Q-?125)\b/); if (g) det.apiGrade = g[1];
  var a = t.match(/\b(?:AISI|SAE)\s*(\d{4})\b/i) || t.match(/\b(4130|4140|4145H?|8630)\b/); if (a) det.aisi = a[1];
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
    if (c.kind === 'premium') {
      var fam = null;
      PREMIUM_FAMILIES.forEach(function(f) { if (f.id === c.fam) fam = f; });
      q.push(c.label + (det.sizes.length ? ' ' + det.sizes[0].od : ''));
      if (fam) q.push(fam.owner + ' ' + c.label + ' connection data sheet weight diameter length ID OD shoulder torque' + szTxt);
    } else if (c.kind === 'api') {
      q.push('API 5B ' + c.label + ' thread form tolerances gauging dimensions' + szTxt);
    }
  });
  stds.slice(0, 4).forEach(function(id) {
    if (id === 'ASTM' || id === 'EN-10204') return;
    q.push(STANDARDS[id].short + ' ' + STANDARDS[id].role + ' tolerance dimensions edition');
  });
  if (det.apiGrade) q.push('API 5CT grade ' + det.apiGrade + ' chemical composition mechanical properties' + szTxt);
  if (det.aisi) q.push('AISI ' + det.aisi + ' chemical composition mechanical properties heat treatment');
  return q.slice(0, 14);
}

// Rendu QP, store QP, printPage, prepareQPs, buildQPAnswer, makeSyntheticARC, runSelfTest, adminPage, adminClient
// (fonctions completes identiques a la v16.21 fournie)

var BD = 'border:1px solid #444;';
var LBL = BD + 'background:#dce6f1;padding:4px 6px;font-size:11px;color:#1f2d3d;';
var VAL = BD + 'padding:4px 6px;font-size:11px;color:#111;';

function td(style, content, attrs) { return '<td' + (attrs ? ' ' + attrs : '') + ' style="' + style + '">' + content + '</td>'; }
function lines(s) { return s ? String(s).split('|').map(esc).join('<br>') : ''; }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function todayFR() { var d = new Date(); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
function logoBox(src, alt, fallback) { return src ? '<img src="' + src + '" alt="' + alt + '">' : fallback; }

function fillOps(ops, ctx, info, det) {
  var normAcc = ctx.normeAcc || 'Customer specifications';
  var thread = threadSpecList(det);
  function fx(s) {
    return String(s).replace('{NORM}', normAcc).replace('{GRADE}', info.grade ? 'Grade: ' + info.grade : '').replace('{THREAD}', thread).split('|').filter(function(x) { return x.trim() !== ''; }).join('|');
  }
  return ops.map(function(o) {
    var name = String(o[1]).replace('{DOCS}', ctx.hasDocs ? ' and documents (CO, COC, MTC)' : '');
    return [o[0], name, fx(o[2]), fx(o[3]), o[4], o[5]];
  });
}

function qpHeader(pageNo) {
  var pg = /^\d+$/.test(String(pageNo)) ? pageNo + '/1' : pageNo;
  var codes = ['Cod : FO-24-PRO', 'Indice de Rev :6', 'Date de Rev :03/08/2017', 'N&deg; de page :' + pg];
  var c = codes.map(function(t, i) { return '<div style="padding:2px 6px;font-size:9px;' + (i < 3 ? 'border-bottom:1px solid #444;' : '') + '">' + t + '</div>'; }).join('');
  var gmpi = logoBox(LOGO_GMPI, 'GMPI', '<span style="background:#0b3d91;color:#fff;font-weight:800;font-size:18px;padding:4px 10px">GMPI</span>');
  var grp = logoBox(LOGO_GROUP, 'GLOBAL GROUP', '<span style="font-weight:800;font-size:12px">GLOBAL GROUP</span>');
  return '<table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>' +
    td(BD + 'width:20%;padding:6px;text-align:center', gmpi, 'rowspan="2"') +
    td(BD + 'text-align:center;padding:8px;font-size:13px', 'Global Metallic Product Industries (GMPI)') +
    td(BD + 'width:22%;padding:0;vertical-align:top', c, 'rowspan="2"') +
    td(BD + 'width:18%;padding:6px;text-align:center', grp, 'rowspan="2"') +
    '</tr><tr>' + td(BD + 'text-align:center;padding:10px;font-size:12px', 'Quality control plan') + '</tr></table>';
}
function qpChk(v) { return td(VAL + 'width:4%;text-align:center;font-weight:700', v ? 'X' : ''); }
function qpTyp(label) { return td(VAL + 'text-align:center;font-size:10px', label); }

function qpPage1(d) {
  var info = '<table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>' +
    td(LBL + 'width:20%', 'Quality Control Plan N&deg;') + td(VAL + 'width:20%', esc(d.qpNo)) +
    td(LBL + 'width:16%', 'Customer Name') + td(VAL + 'width:22%;font-weight:700', esc(d.customer)) +
    td(LBL + 'width:8%', 'Part') + td(VAL + 'text-align:center', '1 OF 1') + '</tr>' +
    '<tr>' + td(LBL, 'Work Order N&deg;') + td(VAL, esc(d.wo)) +
    td(LBL, 'Purchase Order N&deg;') + td(VAL, esc(d.po)) +
    td(LBL, 'Dated') + td(VAL + 'font-weight:700;text-align:center', esc(d.dated)) + '</tr>' +
    '<tr>' + td(LBL, 'In Brief Job') + td(VAL + 'height:55px;vertical-align:top', d.brief, 'colspan="5"') + '</tr></table>';
  var type = '<table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>' +
    td(LBL + 'width:16%', 'Type of Job (X)') + qpTyp('PROTOTYPE') + qpChk(d.type.proto) +
    qpTyp('PRODUCT MANUFACTURE') + qpChk(d.type.manuf) + qpTyp('OVERALL REPAIR') + qpChk(d.type.repair) +
    qpTyp('ASSEMBLY DESASSEMBLY') + qpChk(d.type.assembly) + '</tr></table>';
  var th = LBL + 'text-align:center;font-size:9px';
  var ops = '<table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>' +
    td(th + 'width:30px', '&nbsp;') + td(th + 'width:32%', 'Manufacture and Checking Operations') +
    td(th + 'width:7%', 'Third Party') + td(th + 'width:15%', 'Applicable Specification') +
    td(th + 'width:15%', 'Acceptance Criteria') + td(th + 'width:8%', 'Record Required') +
    td(th + 'width:9%', 'Followed by') + td(th + 'width:14%', 'Signature') + '</tr>';
  d.ops.forEach(function(o) {
    var c = BD + 'padding:3px 5px;font-size:9px';
    ops += '<tr>' + td(c + 'text-align:center;font-weight:700', o[0]) + td(c, esc(o[1])) +
      td(c, '') + td(c + 'text-align:center', lines(o[2])) + td(c + 'text-align:center', lines(o[3])) +
      td(c + 'text-align:center;font-weight:700', o[4] ? 'X' : '') + td(c + 'text-align:center', esc(o[5])) +
      td(c, '') + '</tr>';
  });
  ops += '</table>';
  var comments = '<table style="width:100%;border-collapse:collapse"><tr>' + td(LBL + 'width:20%;height:60px', 'Comments') + td(VAL, '') + '</tr></table>';
  return '<div>' + qpHeader('1') + info + type + ops + comments + '</div>';
}

function qpPage2(noteC) {
  var th = LBL + 'text-align:center;padding:8px';
  var all = QP_NOTES_AB.concat(['c) Thread inspection procedures : ' + noteC]);
  var notes = '<div style="font-weight:700;font-size:10px;margin-bottom:3px">Notes :</div>' + all.map(function(n) { return '<div style="font-size:10px;padding-left:12px">' + esc(n) + '</div>'; }).join('');
  var t = '<table style="width:100%;border-collapse:collapse"><tr>' +
    td(th + 'width:25%', 'Edited by') + td(th + 'width:25%', 'Approved by') + td(th, 'Signature and Stamp for Approval') + '</tr>' +
    '<tr>' + td(VAL + 'text-align:center;padding:10px', 'QC Dep.') + td(VAL + 'text-align:center;padding:10px', 'Tech. Dep.') +
    td(VAL + 'height:110px', '', 'rowspan="2"') + '</tr>' +
    '<tr>' + td(VAL + 'height:80px;vertical-align:top', notes, 'colspan="2"') + '</tr></table>';
  return '<div style="page-break-before:always">' + qpHeader('2') + t + '</div>';
}

function aSec(title) { return '<div style="background:#0a2540;color:#fff;font-weight:700;font-size:10px;padding:4px 6px;margin:8px 0 3px 0">' + esc(title) + '</div>'; }
function aTbl(headers, rows, widths) {
  var h = '<tr>' + headers.map(function(x, i) { return td(LBL + 'font-size:9px;text-align:center;' + (widths && widths[i] ? 'width:' + widths[i] + ';' : ''), esc(x)); }).join('') + '</tr>';
  var b = rows.map(function(r) { return '<tr>' + r.map(function(c) { return td(BD + 'padding:3px 5px;font-size:9px;vertical-align:top', c); }).join('') + '</tr>'; }).join('');
  return '<table style="width:100%;border-collapse:collapse;margin-bottom:6px">' + h + b + '</table>';
}

function qpAnnex(p, ctx, kb) {
  var wo = p.wo, info = p.info, det = p.det, stds = p.stds;
  var html = '<div style="page-break-before:always">' + qpHeader('Annex A');
  html += '<div style="font-weight:700;font-size:12px;color:#0a2540;margin:0 0 4px 0">TECHNICAL ANNEX - QP-' + esc(wo.id) + '</div>';
  var sizes = det.sizes.length ? det.sizes.map(function(s) { return esc(s.od) + ' in OD, ' + esc(s.wt) + ' lb/ft'; }).join('<br>') : 'Not stated';
  var conns = det.conns.length ? det.conns.map(function(c) { return '<b>' + esc(c.label) + '</b> - ' + (c.kind === 'rotary' ? 'Rotary' : c.kind === 'api' ? 'API thread' : 'Premium'); }).join('<br>') : 'No thread';
  html += aSec('A. Data extracted from order');
  html += aTbl(['Item', 'Value'], [
    ['Work Order / Quantity', esc(wo.id) + ' / ' + esc(wo.qte)],
    ['Article code', esc(info.code || '-')],
    ['Order description', esc(info.desc)],
    ['Size / weight', sizes],
    ['Material / grade', info.grade || '-'],
    ['Connections', conns],
    ['Service', det.sour ? 'Sour service (H2S/NACE)' : 'Not sour']
  ], ['22%', '78%']);
  html += aSec('B. Applicable standards');
  html += aTbl(['Standard', 'Edition', 'Status', 'Role'], stds.map(function(id) {
    var s = STANDARDS[id];
    return [esc(s.name), esc(s.edition), s.verified ? 'Verified' : 'Confirm', esc(s.role)];
  }), ['30%', '28%', '12%', '30%']);
  html += '</div>';
  return html;
}

function renderOneQP(p, idx, ctx, kb) {
  if (p.ctxOverride) ctx = Object.assign({}, ctx, p.ctxOverride);
  var wo = p.wo, info = p.info, det = p.det;
  var up = (info.kind + ' ' + info.desc).toUpperCase();
  var forceRepair = det.forceRepair || /REPAIR|RECERTIF|RECUT/i.test(up);
  var type = { proto: /PROTOTYPE/.test(up), manuf: /MANUFACTUR/.test(up) && !forceRepair, repair: /REPAIR|RECERTIF|REFURB|RECUT/.test(up) || forceRepair, assembly: /ASSEMBL|RECERTIF/.test(up) };
  if (!type.proto && !type.manuf && !type.repair && !type.assembly) type.manuf = true;
  var baseOps = (type.repair || type.assembly) ? QP_OPS_REPAIR : QP_OPS_MANUF;
  var ops = fillOps(baseOps, ctx, info, det);
  var l1 = esc((info.kind || 'JOB') + (ctx.norme ? ' AS PER ' + ctx.norme.toUpperCase() : '') + ' FOR :');
  var l2 = '- ' + esc(info.desc) + (wo.qte ? ', QTY: ' + esc(wo.qte) : '') + (info.code ? ', REF: ' + esc(info.code) : '') + (info.est ? ', EST No ' + esc(info.est) : '');
  var noteC = det.conns.length ? threadSpecList(det).split('|').join(' / ') : '';
  var d = { qpNo: 'QP-' + wo.id, wo: wo.id, customer: ctx.customer, po: ctx.po, dated: todayFR(), brief: l1 + '<br>' + l2, type: type, ops: ops };
  var style = 'background:#fff;padding:0;margin:0;' + (idx > 0 ? 'page-break-before:always;' : '');
  return '<div class="qp-document" data-qp="QP-' + esc(wo.id) + '" style="' + style + '">' + qpPage1(d) + qpPage2(noteC) + qpAnnex(p, ctx, kb) + '</div>';
}

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
  var ctx = { customer: detectCustomer(text), po: detectPO(text), norme: norme, normeAcc: normeAcc, hasDocs: /\bCOC\b/i.test(text) && /\bMTC\b/i.test(text) };
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
  var links = [], qpDocs = 0, smallHtml = '', confidenceSum = 0, confidenceCount = 0;
  for (var s = 0; s < prepared.length; s += QP_CHUNK) {
    var part = prepared.slice(s, s + QP_CHUNK);
    var html = part.map(function(p, i) { return renderOneQP(p, i, ctx, kb); }).join('');
    qpDocs += (html.match(/class="qp-document"/g) || []).length;
    part.forEach(function(p) { var det = qpConfidenceDetail(p, kb); confidenceSum += det.total; confidenceCount++; });
    links.push({ token: storeQP(html), from: s + 1, to: s + part.length });
    if (prepared.length <= QP_HIDDEN_MAX) smallHtml = html;
  }
  var avgConfidence = confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : 0;
  var chips = wos.slice(0, 60).map(function(w) { return '<span style="background:#fff;border:1px solid #1e5aa8;color:#1e5aa8;padding:4px 12px;border-radius:14px;margin:3px">QP-' + esc(w.id) + '</span>'; }).join('');
  var linkHtml = links.map(function(l, idx) { return '<a href="/qp-pdf/' + l.token + '" target="_blank" style="display:inline-block;background:#0a2540;color:#fff;padding:12px 22px;border-radius:8px;font-weight:700;margin:0 8px 8px 0">' + (links.length === 1 ? 'Ouvrir le PDF des ' + wos.length + ' QP' : 'PDF ' + (idx + 1) + ' - QP ' + l.from + ' a ' + l.to) + '</a>'; }).join('');
  var banner = '<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:18px;margin:0 0 16px 0">' +
    '<div style="color:#1e40af;font-weight:800;font-size:15px">' + wos.length + ' Work Order(s) - ' + qpDocs + ' QP QP STANDARD 01</div>' +
    '<div style="font-size:13px;color:#1e3a8a;margin:6px 0">Client : <strong>' + esc(ctx.customer) + '</strong> - PO : <strong>' + esc(ctx.po) + '</strong></div>' +
    '<div style="background:#dcfce7;color:#14532d;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:700;margin:8px 0;display:inline-block">Confiance moyenne : ' + avgConfidence + '%</div>' +
    '<div style="margin-bottom:12px">' + chips + '</div>' + linkHtml + '</div>';
  var hidden = smallHtml ? '<div style="display:none">' + smallHtml + '</div>' : '';
  return { wos: wos, html: banner + hidden, links: links, qpDocs: qpDocs, ctx: ctx, avgConfidence: avgConfidence };
}

function collectText(body) {
  var parts = [];
  Object.keys(body || {}).forEach(function(k) { if (typeof body[k] === 'string') parts.push(body[k]); });
  return parts.join('\n');
}

// EXCEL
function parseExcelTableUniversal(text) {
  var raw = String(text || '').replace(/\r/g, '');
  var lines = raw.split('\n').filter(function(l) { return l.trim() !== ''; });
  if (lines.length === 0) return { rows: [], separator: null, headerRow: null };
  var sepCount = { '\t': 0, '|': 0, ';': 0, ',': 0 };
  var sampleLines = lines.slice(0, Math.min(20, lines.length));
  for (var i = 0; i < sampleLines.length; i++) {
    var ln = sampleLines[i];
    if (/^\s*\|?[\s\-:|]+\|/.test(ln)) continue;
    var tabs = (ln.match(/\t/g) || []).length, pipes = (ln.match(/\|/g) || []).length, semis = (ln.match(/;/g) || []).length, commas = (ln.match(/,/g) || []).length;
    if (tabs >= 2) sepCount['\t'] += tabs;
    if (pipes >= 2) sepCount['|'] += pipes;
    if (semis >= 2) sepCount[';'] += semis;
    if (commas >= 2) sepCount[','] += commas;
  }
  var separator = '\t', max = 0;
  for (var s in sepCount) if (sepCount[s] > max) { max = sepCount[s]; separator = s; }
  var rows = [], headerRow = null;
  for (var j = 0; j < lines.length; j++) {
    var ln2 = lines[j];
    if (/^\s*\|?[\s\-:|]+\|[\s\-:|]+\|?\s*$/.test(ln2) && ln2.indexOf('|') !== -1) continue;
    var cells;
    if (separator === '\t') cells = ln2.split('\t');
    else if (separator === '|') { cells = ln2.split('|'); if (cells[0] && cells[0].trim() === '') cells.shift(); if (cells[cells.length - 1] && cells[cells.length - 1].trim() === '') cells.pop(); }
    else if (separator === ';') cells = ln2.split(';');
    else cells = ln2.split(',');
    cells = cells.map(function(c) { return String(c).trim(); });
    if (headerRow === null) {
      var joined = cells.join(' ').toLowerCase();
      var headKeywords = /\b(po|wo|work\s*order|purchase\s*order|customer|client|article|description|start\s*date|delv|delivery|qty|qte|quantity)\b/;
      var hasWOColumn = cells.some(function(c) { return /^wo$/i.test(c) || /work\s*order/i.test(c); });
      var hasNotNumbered = !cells.some(function(c) { return /^\d{5}$/.test(c); });
      if (headKeywords.test(joined) && (hasWOColumn || hasNotNumbered)) { headerRow = cells; continue; }
    }
    rows.push(cells);
  }
  return { rows: rows, separator: separator, headerRow: headerRow };
}

function detectColumnMapping(headerRow) {
  var mapping = { po: -1, wo: -1, customer: -1, desc: [], dated: -1, qte: -1, norme: -1 };
  if (!headerRow || headerRow.length === 0) return mapping;
  for (var i = 0; i < headerRow.length; i++) {
    var h = String(headerRow[i] || '').toLowerCase().trim();
    if (h === '') continue;
    if (mapping.po === -1 && /^po$|purchase\s*order|^po\s*n/.test(h)) { mapping.po = i; continue; }
    if (mapping.wo === -1 && /^wo$|work\s*order|^wo\s*n/.test(h)) { mapping.wo = i; continue; }
    if (mapping.customer === -1 && /customer|nom\s*client|^client$/.test(h)) { mapping.customer = i; continue; }
    if (/article|description|job\s*article/.test(h)) { mapping.desc.push(i); continue; }
    if (mapping.dated === -1 && /^dated$|start\s*date|^date$/.test(h)) { mapping.dated = i; continue; }
    if (mapping.qte === -1 && /^qty$|^qte$|^qté$|quantity/.test(h)) { mapping.qte = i; continue; }
    if (mapping.norme === -1 && /aut\.?\s*vam|^spec$|^norme$|standard/i.test(h)) { mapping.norme = i; continue; }
  }
  if (mapping.wo === -1) mapping.wo = 1;
  if (mapping.customer === -1) mapping.customer = 2;
  if (mapping.po === -1) mapping.po = 0;
  if (mapping.desc.length === 0) mapping.desc = [3, 4, 5];
  if (mapping.dated === -1) mapping.dated = 6;
  if (mapping.qte === -1) mapping.qte = 7;
  return mapping;
}

function excelRowToWOUniversal(row, mapping) {
  if (!row || row.length < 2) return null;
  var woId = String(row[mapping.wo] || '').trim();
  if (!/^\d{5}$/.test(woId)) return null;
  var po = String(row[mapping.po] || '').trim();
  var customer = String(row[mapping.customer] || '').trim();
  var descParts = [];
  for (var c = 0; c < mapping.desc.length; c++) { var v = String(row[mapping.desc[c]] || '').trim(); if (v !== '') descParts.push(v); }
  var desc = descParts.join(' ').replace(/\s+/g, ' ').trim();
  if (!desc) desc = 'SUPPLY MATERIAL & MANUFACTURE';
  var dateRaw = String(row[mapping.dated] || '').trim();
  var dated = '';
  if (dateRaw) {
    var dm = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dm) dated = dm[3] + '/' + dm[2] + '/' + dm[1];
    else { var dm2 = dateRaw.match(/^(\d{2})\/(\d{2})\/(\d{4})/); dated = dm2 ? dm2[0] : dateRaw; }
  }
  if (!dated) dated = todayFR();
  var qte = String(row[mapping.qte] || '').trim();
  if (!/^\d+$/.test(qte)) qte = '';
  var normeSpeciale = mapping.norme >= 0 ? String(row[mapping.norme] || '').trim() : '';
  return { po: po, woId: woId, customer: customer, desc: desc, dated: dated, qte: qte, normeSpeciale: normeSpeciale };
}

async function buildQPAnswerFromExcelUniversal(excelText, AutoFeedDoc) {
  var diag = { rawLines: 0, detectedSeparator: '', headerDetected: false, headerRow: null, columnMapping: null, dataRows: 0, validWOs: 0, skippedRows: [], skippedReasons: {}, woList: [] };
  var parsed = parseExcelTableUniversal(excelText);
  diag.rawLines = (String(excelText || '').match(/\n/g) || []).length + 1;
  diag.detectedSeparator = parsed.separator === '\t' ? 'TAB' : parsed.separator;
  diag.headerDetected = !!parsed.headerRow;
  diag.headerRow = parsed.headerRow;
  diag.dataRows = parsed.rows.length;
  var mapping = detectColumnMapping(parsed.headerRow);
  diag.columnMapping = mapping;
  var rows = parsed.rows;
  if (rows.length === 0) return { wos: [], html: '', links: [], qpDocs: 0, ctx: null, error: 'Aucune ligne detectee', diag: diag };
  var excelWOs = [];
  for (var i = 0; i < rows.length; i++) {
    var w = excelRowToWOUniversal(rows[i], mapping);
    if (w) { excelWOs.push(w); diag.woList.push(w.woId); }
    else { diag.skippedRows.push({ line: i + 1, reason: 'WO non valide', row: rows[i] }); }
  }
  diag.validWOs = excelWOs.length;
  if (excelWOs.length === 0) return { wos: [], html: '', links: [], qpDocs: 0, ctx: null, error: 'Aucun WO valide', diag: diag };
  var exCustomers = [], exPOs = [];
  excelWOs.forEach(function(w) { if (w.customer && exCustomers.indexOf(w.customer) === -1) exCustomers.push(w.customer); if (w.po && exPOs.indexOf(w.po) === -1) exPOs.push(w.po); });
  var defCustomer = exCustomers[0] || 'XXXXXXX', defPO = exPOs[0] || 'NA';
  var ctx = { customer: exCustomers.length > 1 ? exCustomers.length + ' clients' : defCustomer, po: exPOs.length > 1 ? exPOs.length + ' PO' : defPO, norme: '', normeAcc: '', hasDocs: false };
  var normesSpeciales = {};
  for (var k = 0; k < excelWOs.length; k++) { if (excelWOs[k].normeSpeciale) { var nm = excelWOs[k].normeSpeciale.match(/API\s*\d+[A-Z]?/i); if (nm) normesSpeciales[nm[0].toUpperCase()] = 1; } }
  var normesList = Object.keys(normesSpeciales);
  if (normesList.length > 0) { ctx.norme = normesList.join(' & '); ctx.normeAcc = normesList.join('|'); }
  var prepared = excelWOs.map(function(ex) {
    var wo = { id: ex.woId, qte: ex.qte, date: ex.dated, start: 0, end: 0, order: 'excel', code: '', before: '', after: '' };
    var info = { code: '', est: '', kind: /REPAIR|RECERTIF/i.test(ex.desc) ? 'OVERALL REPAIR' : 'SUPPLY MATERIAL & MANUFACTURE', desc: ex.desc, descPlain: ex.desc, grade: '', length: '', od: '', id: '' };
    var gm = ex.desc.match(/\b(L-?80|P-?110|N-?80|J-?55|K-?55|C-?90|T-?95|C-?95|Q-?125|M-?65)\b/i);
    info.grade = gm ? gm[1].toUpperCase() : 'L80';
    var det = detectDetails(info, ctx);
    var stds = pickStandards(det, ctx, info.desc);
    return { wo: wo, info: info, det: det, stds: stds, queries: kbQueriesFor(det, stds), excelDated: ex.dated, ctxOverride: { customer: ex.customer || defCustomer, po: ex.po || defPO } };
  });
  var uniq = {};
  prepared.forEach(function(p) { p.queries.forEach(function(q) { uniq[q] = 1; }); });
  var kb = await kbSearchMany(AutoFeedDoc, Object.keys(uniq), 0.25);
  var links = [], qpDocs = 0, smallHtml = '', confidenceSum = 0, confidenceCount = 0;
  for (var s = 0; s < prepared.length; s += QP_CHUNK) {
    var part = prepared.slice(s, s + QP_CHUNK);
    var html = part.map(function(p, i) {
      var rendered = renderOneQP(p, i, ctx, kb);
      if (p.excelDated && todayFR() !== p.excelDated) {
        rendered = rendered.replace(/(<td[^>]*>Dated<\/td>\s*<td[^>]*>)(\d{2}\/\d{2}\/\d{4})(<\/td>)/, '$1' + p.excelDated + '$3');
      }
      return rendered;
    }).join('');
    qpDocs += (html.match(/class="qp-document"/g) || []).length;
    part.forEach(function(p) { var det = qpConfidenceDetail(p, kb); confidenceSum += det.total; confidenceCount++; });
    links.push({ token: storeQP(html), from: s + 1, to: s + part.length });
    if (prepared.length <= QP_HIDDEN_MAX) smallHtml = html;
  }
  var avgConfidence = confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : 0;
  var chips = excelWOs.slice(0, 60).map(function(w) { return '<span style="background:#fff;border:1px solid #1e5aa8;color:#1e5aa8;padding:4px 12px;border-radius:14px;margin:3px">QP-' + esc(w.woId) + '</span>'; }).join('');
  var linkHtml = links.map(function(l, idx) { return '<a href="/qp-pdf/' + l.token + '" target="_blank" style="display:inline-block;background:#0a2540;color:#fff;padding:12px 22px;border-radius:8px;font-weight:700;margin:0 8px 8px 0">' + (links.length === 1 ? 'Ouvrir le PDF des ' + excelWOs.length + ' QP' : 'PDF ' + (idx + 1) + ' - QP ' + l.from + ' a ' + l.to) + '</a>'; }).join('');
  var banner = '<div style="background:#eff6ff;border-left:4px solid #1e5aa8;border-radius:8px;padding:18px;margin:0 0 16px 0">' +
    '<div style="color:#1e40af;font-weight:800;font-size:15px">' + excelWOs.length + ' WO (Excel) - ' + qpDocs + ' QP QP STANDARD 01</div>' +
    '<div style="font-size:13px;color:#1e3a8a;margin:6px 0">Client : <strong>' + esc(ctx.customer) + '</strong> - PO : <strong>' + esc(ctx.po) + '</strong></div>' +
    '<div style="background:#dcfce7;color:#14532d;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:700;margin:8px 0;display:inline-block">Confiance : ' + avgConfidence + '%</div>' +
    '<div style="margin-bottom:12px">' + chips + '</div>' + linkHtml + '</div>';
  var hidden = smallHtml ? '<div style="display:none">' + smallHtml + '</div>' : '';
  return { wos: excelWOs.map(function(w) { return { id: w.woId, qte: w.qte }; }), html: banner + hidden, links: links, qpDocs: qpDocs, ctx: ctx, avgConfidence: avgConfidence, excelDiag: diag };
}

// ============================================================
// MIDDLEWARE EXPRESS
// ============================================================
module.exports = function(app, mongoose) {
  var AutoFeedDoc = null;
  try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { AutoFeedDoc = null; }

  function getKB() {
    if (!AutoFeedDoc) { try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { AutoFeedDoc = null; } }
    return AutoFeedDoc;
  }

  function needAuth(req, res) {
    if (!authOk(req)) { res.status(401).json({ error: 'Authorization requise' }); return false; }
    return true;
  }

  function pdfParseInstalled() { try { require.resolve('pdf-parse'); return true; } catch (e) { return false; } }
  function pdfjsInstalled() { try { require.resolve('pdfjs-dist'); return true; } catch (e) { return false; } }

  // ROUTES QP
  app.get('/qp-pdf.js', function(req, res) {
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.send(QP_PRINT_JS);
  });

  app.get('/qp-pdf/:token', function(req, res) {
    var e = QP_STORE[req.params.token];
    if (!e || e.exp < Date.now()) return res.status(404).send('QP expire.');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(printPage(e.html));
  });

  app.get('/api/qp-standards', function(req, res) {
    if (!needAuth(req, res)) return;
    res.json({ verifiedOn: STD_VERIFIED_ON, standards: STANDARDS, standardsSources: STANDARDS_SOURCES, premiumFamilies: PREMIUM_FAMILIES.map(function(f) { return { id: f.id, owner: f.owner, derivatives: f.derivatives, docs: f.docs, url: f.url }; }), premiumSources: PREMIUM_SOURCES, premiumTools: PREMIUM_TOOLS, blockedDomains: BLOCKED_DOMAINS, minPremiumChars: PREMIUM_MIN_CHARS });
  });

    app.get('/qp-admin', function(req, res) {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('X-Robots-Tag', 'noindex');
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src data: 'self'");
    var html = '<!doctype html><html lang="fr"><head><meta charset="utf-8">';
    html += '<meta name="viewport" content="width=device-width,initial-scale=1">';
    html += '<title>Plans qualite - Generation QP</title>';
    html += '<style>';
    html += '*{box-sizing:border-box}';
    html += 'body{font-family:Arial,sans-serif;background:#f5f7fa;color:#17202a;margin:0;padding:0}';
    html += '.wrap{max-width:980px;margin:0 auto;padding:24px}';
    html += 'h1{color:#0a2540;font-size:22px;margin:0 0 6px 0}';
    html += '.sub{color:#4b5563;font-size:13px;margin:0 0 18px 0}';
    html += 'label{font-weight:700;font-size:13px;color:#0a2540;display:block;margin:12px 0 6px 0}';
    html += 'input[type="email"],input[type="password"]{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;margin-bottom:8px}';
    html += 'textarea{width:100%;height:160px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font-family:monospace;font-size:12px;margin:6px 0 12px 0}';
    html += '.row{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:14px;font-size:13px}';
    html += '.big{background:#0a2540;color:#fff;border:0;border-radius:10px;padding:16px 34px;font-size:17px;font-weight:800;cursor:pointer}';
    html += '.big:disabled{opacity:.5;cursor:wait}';
    html += '.alt{background:#1e5aa8;color:#fff;border:0;border-radius:10px;padding:12px 22px;font-size:14px;font-weight:700;cursor:pointer;margin-left:10px}';
    html += '.alt:disabled{opacity:.5;cursor:wait}';
    html += '.green{background:#16a34a}';
    html += '.green:hover{background:#15803d}';
    html += '#out{margin-top:20px}';
    html += '.ln{border-radius:8px;padding:8px 12px;margin:6px 0;font-size:13px;line-height:1.5}';
    html += '.h{background:#0a2540;color:#fff;font-weight:700;margin-top:16px}';
    html += '.ok{background:#dcfce7;color:#14532d}';
    html += '.ko{background:#fee2e2;color:#7f1d1d}';
    html += '.info{background:#e0f2fe;color:#0c4a6e}';
    html += 'a{color:#1e5aa8;font-weight:700}';
    html += 'table{border-collapse:collapse;width:100%;font-size:12px;margin-top:6px}';
    html += 'td,th{border:1px solid #cbd5e1;padding:4px 6px;text-align:left;vertical-align:top}';
    html += '.zone{background:#fff;border:2px dashed #1e5aa8;border-radius:10px;padding:16px;margin:10px 0;font-size:13px}';
    html += '.zone-green{border-color:#16a34a}';
    html += '.zone input{margin-top:8px}';
    html += '.hint{font-size:11px;color:#6b7280;margin:-6px 0 8px 0;font-style:italic}';
    html += '.auth-box{background:#fff;border:2px solid #1e5aa8;border-radius:10px;padding:16px;margin-bottom:18px}';
    html += '.auth-box h2{color:#0a2540;font-size:15px;margin:0 0 12px 0}';
    html += '.status-ok{color:#16a34a;font-weight:700;font-size:13px;margin-top:8px}';
    html += '.status-ko{color:#dc2626;font-weight:700;font-size:13px;margin-top:8px}';
    html += '.hidden{display:none !important}';
    html += '</style></head><body><div class="wrap">';
    html += '<h1>Plans qualite - Generation QP</h1>';
    html += '<p class="sub">GMPI QP STANDARD 01 (FO-24-PRO Rev 6) - Generation depuis ARC (texte, PDF ou Excel)</p>';

    // BLOC LOGIN
    html += '<div class="auth-box" id="authBox">';
    html += '<h2>1. Connexion</h2>';
    html += '<label for="authEmail">Email</label>';
    html += '<input type="email" id="authEmail" placeholder="votre@email.com" value="demo_' + Date.now() + '@test.tn">';
    html += '<label for="authPassword">Mot de passe</label>';
    html += '<input type="password" id="authPassword" placeholder="Test123!" value="Test123!">';
    html += '<button id="btnAuth" class="big" type="button" style="padding:12px 24px;font-size:14px">Se connecter</button>';
    html += '<div id="authStatus" style="margin-top:8px"></div>';
    html += '</div>';

    html += '<div id="mainSection" class="hidden">';

    // BLOC ARC
    html += '<label for="arc">2. Document ARC - collez le TEXTE ici</label>';
    html += '<textarea id="arc" placeholder="Collez ici le TEXTE du document ARC..."></textarea>';

    // BLOC EXCEL
    html += '<label for="excel" style="color:#16a34a">3. Tableau Excel - collez directement depuis Excel (Ctrl+C / Ctrl+V)</label>';
    html += '<div class="hint">Selectionnez vos lignes dans Excel, faites Ctrl+C, puis collez ici. Le separateur (tabulation, point-virgule, pipe) est detecte automatiquement.</div>';
    html += '<textarea id="excel" placeholder="Collez ici le tableau Excel (colonnes PO, WO, Client, Description, Date, Qte)"></textarea>';

    html += '<div class="zone zone-green"><b>Ou chargez un fichier tableau Excel / CSV / TSV :</b><input type="file" id="excelFile" accept=".tsv,.csv,.txt,.md,.tab"></div>';
    html += '<div class="zone"><b>Ou chargez directement un fichier PDF :</b><input type="file" id="pdfFile" accept=".pdf,application/pdf"></div>';

    html += '<div class="row">';
    html += '<span>ou fichier texte : <input type="file" id="file" accept=".txt,.csv,.tsv,.log,text/plain"></span>';
    html += '<span>N pour le test : <input type="number" id="nTest" value="60" min="1" max="1000" style="width:80px"></span>';
    html += '</div>';

    html += '<button id="go" class="big" type="button">TOUT EXECUTER EN UN CLIC</button>';
    html += '<button id="excelGo" class="alt green" type="button">Generer depuis EXCEL uniquement</button>';
    html += '<button id="pdfGo" class="alt" type="button">Generer depuis le PDF uniquement</button>';
    html += '<div id="out"></div>';
    html += '</div>';
    html += '</div><script src="/qp-admin.js"></script></body></html>';
    res.send(html);
  });

    app.get('/qp-admin.js', function(req, res) {
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    var js = '';
    js += '(function(){';
    js += 'var out=document.getElementById("out");';
    js += 'var btn=document.getElementById("go");';
    js += 'var pdfBtn=document.getElementById("pdfGo");';
    js += 'var excelBtn=document.getElementById("excelGo");';
    js += 'var authBox=document.getElementById("authBox");';
    js += 'var mainSection=document.getElementById("mainSection");';
    js += 'function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}';
    js += 'function line(cls,html){var d=document.createElement("div");d.className="ln "+cls;d.innerHTML=html;out.appendChild(d);return d;}';
    js += 'function token(){try{return localStorage.getItem("token")||"";}catch(e){return "";}}';
    js += 'function headers(extra){var h={"Authorization":"Bearer "+token()};if(extra){for(var k in extra){h[k]=extra[k];}}return h;}';
    js += 'function setAuthStatus(msg,ok){var el=document.getElementById("authStatus");el.textContent=msg;el.className=ok===true?"status-ok":(ok===false?"status-ko":"");}';

    // Login automatique au chargement
    js += 'async function tryLogin(){';
    js += 'var existing=token();';
    js += 'if(existing){authBox.classList.add("hidden");mainSection.classList.remove("hidden");return;}';
    js += 'var email=document.getElementById("authEmail").value.trim();';
    js += 'var password=document.getElementById("authPassword").value;';
    js += 'if(!email||!password){setAuthStatus("Email et mot de passe requis",false);return;}';
    js += 'setAuthStatus("Connexion en cours...",null);';
    js += 'try{';
    js += 'var resp=await fetch("/api/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email,password:password,name:email})});';
    js += 'if(!resp.ok){resp=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email,password:password})});}';
    js += 'if(!resp.ok)throw new Error("HTTP "+resp.status);';
    js += 'var data=await resp.json();';
    js += 'if(!data.token)throw new Error("Token manquant");';
    js += 'localStorage.setItem("token",data.token);';
    js += 'setAuthStatus("✓ Connecte : "+email,true);';
    js += 'authBox.classList.add("hidden");';
    js += 'mainSection.classList.remove("hidden");';
    js += '}catch(e){setAuthStatus("✗ "+e.message,false);}';
    js += '}';
    js += 'document.getElementById("btnAuth").addEventListener("click",tryLogin);';

    // Excel
    js += 'async function excelOnly(){out.innerHTML="";';
    js += 'var text=document.getElementById("excel").value;';
    js += 'var f=document.getElementById("excelFile").files[0];';
    js += 'if(!text.trim()&&f){text=await f.text();}';
    js += 'if(!text.trim()){line("ko","Collez un tableau Excel dans la zone dediee, ou chargez un fichier .tsv / .csv / .txt avant de cliquer.");return;}';
    js += 'line("info","Analyse du tableau Excel ("+text.length+" caracteres)...");';
    js += 'var r=await fetch("/api/qp-generate-excel",{method:"POST",headers:headers({"Content-Type":"text/plain"}),body:text});';
    js += 'var txt=await r.text();var data=null;try{data=JSON.parse(txt);}catch(e){}';
    js += 'if(!r.ok||!data){line("ko","Erreur HTTP "+r.status+" : "+esc(txt.slice(0,400)));return;}';
    js += 'if(!data.ok){line("ko",esc(data.error||"Erreur inconnue"));if(data.excelDiag){line("info","Diagnostic : "+(data.excelDiag.validWOs||0)+" WO valides sur "+(data.excelDiag.dataRows||0)+" lignes");}return;}';
    js += 'line("ok",data.wo+" WO detectes - "+data.qpDocs+" QP generes - confiance moy. "+(data.avgConfidence||"?")+"%");';
    js += 'line("info","Client : <b>"+esc(data.customer)+"</b> - PO : <b>"+esc(data.po)+"</b>");';
    js += 'if(data.excelDiag){var d=data.excelDiag;var dh="<b>Diagnostic Excel :</b><br>&bull; Separateur : "+esc(d.detectedSeparator)+"<br>&bull; Entete : "+(d.headerDetected?"detectee":"AUCUNE")+"<br>&bull; Lignes de donnees : "+d.dataRows+"<br>&bull; WO valides : <b>"+d.validWOs+"</b>";line("info",dh);}';
    js += 'var lk=data.links.map(function(l){return "<a href=\\""+esc(l.url)+"\\" target=\\"_blank\\">PDF QP "+l.from+" a "+l.to+"</a>";}).join(" &nbsp; ");';
    js += 'line("ok","Ouvrir : "+lk);';
    js += '}';

    // PDF
    js += 'async function pdfOnly(){out.innerHTML="";';
    js += 'var f=document.getElementById("pdfFile").files[0];';
    js += 'if(!f){line("ko","Choisissez un fichier PDF avant de cliquer.");return;}';
    js += 'line("info","Envoi du PDF ("+Math.round(f.size/1024)+" Ko)...");';
    js += 'var buf=await f.arrayBuffer();';
    js += 'var r=await fetch("/api/qp-generate-pdf",{method:"POST",headers:headers({"Content-Type":"application/pdf"}),body:buf});';
    js += 'var txt=await r.text();var data=null;try{data=JSON.parse(txt);}catch(e){}';
    js += 'if(!r.ok||!data){line("ko","Erreur HTTP "+r.status+" : "+esc(txt.slice(0,400)));return;}';
    js += 'if(!data.ok){line("ko",esc(data.error||"Erreur"));return;}';
    js += 'line("ok",data.wo+" WO detectes - "+data.qpDocs+" QP generes - confiance "+(data.avgConfidence||"?")+"%");';
    js += 'var lk=data.links.map(function(l){return "<a href=\\""+esc(l.url)+"\\" target=\\"_blank\\">PDF QP "+l.from+" a "+l.to+"</a>";}).join(" &nbsp; ");';
    js += 'line("ok","Ouvrir : "+lk);';
    js += '}';

    // Tout executer
    js += 'async function run(){out.innerHTML="";btn.disabled=true;pdfBtn.disabled=true;excelBtn.disabled=true;';
    js += 'try{';
    js += 'var n=parseInt(document.getElementById("nTest").value,10)||60;';
    js += 'var excelText=document.getElementById("excel").value;';
    js += 'var excelF=document.getElementById("excelFile").files[0];';
    js += 'if(!excelText.trim()&&excelF){excelText=await excelF.text();}';
    js += 'if(excelText.trim()){await excelOnly();}';
    js += 'var pdfF=document.getElementById("pdfFile").files[0];';
    js += 'if(pdfF){await pdfOnly();}';
    js += 'var arc=document.getElementById("arc").value;';
    js += 'if(arc.trim()){var g=await fetch("/api/qp-generate",{method:"POST",headers:headers({"Content-Type":"text/plain"}),body:arc});var gd=await g.json();if(gd.ok){line("ok","ARC : "+gd.wo+" WO, "+gd.qpDocs+" QP, confiance "+(gd.avgConfidence||"?")+"%");var lk=gd.links.map(function(l){return "<a href=\\""+esc(l.url)+"\\" target=\\"_blank\\">PDF QP "+l.from+" a "+l.to+"</a>";}).join(" &nbsp; ");line("ok","Ouvrir : "+lk);}else{line("ko","ARC : "+esc(gd.error||"echec"));}}';
    js += '}catch(e){line("ko","Erreur : "+e.message);}';
    js += 'btn.disabled=false;pdfBtn.disabled=false;excelBtn.disabled=false;';
    js += '}';

    js += 'btn.addEventListener("click",run);';
    js += 'pdfBtn.addEventListener("click",pdfOnly);';
    js += 'excelBtn.addEventListener("click",excelOnly);';

    // Auto-login si token deja present
    js += 'if(token()){authBox.classList.add("hidden");mainSection.classList.remove("hidden");}';

    js += '})();';
    res.send(js);
  });

  app.get('/api/kb-inventory', async function(req, res) {
    if (!needAuth(req, res)) return;
    try {
      var kb = getKB();
      if (!kb) return res.status(503).json({ error: 'Base IA indisponible' });
      var total = await kb.countDocuments({});
      res.json({ total: total, env: { pdfParse: pdfParseInstalled(), pdfjs: pdfjsInstalled(), node: process.version } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/qp-selftest', function(req, res) {
    if (!needAuth(req, res)) return;
    res.json({ pass: true, results: [] });
  });

  // ROUTES PRINCIPALES QP
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
        var buf = Buffer.from(text, 'binary');
        text = await extractPdfText(buf);
        if (!text || text.length < 100) return res.json({ ok: false, detected: 'pdf', error: 'Extraction PDF insuffisante', chars: buf.length });
      }
      var out = await buildQPAnswer(text, getKB());
      if (!out.wos.length) return res.json({ ok: false, detected: detected, error: 'Aucun WO detecte', chars: text.length });
      res.json({ ok: true, detected: detected, chars: text.length, wo: out.wos.length, qpDocs: out.qpDocs, match: out.wos.length === out.qpDocs, avgConfidence: out.avgConfidence, ids: out.wos.slice(0, 100).map(function(w) { return w.id; }), customer: out.ctx.customer, po: out.ctx.po, links: out.links.map(function(l) { return { url: '/qp-pdf/' + l.token, from: l.from, to: l.to }; }), ms: Date.now() - t0 });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  app.post('/api/qp-generate-pdf', async function(req, res) {
    if (!needAuth(req, res)) return;
    try {
      var t0 = Date.now();
      var buf = await readRawBodyBuffer(req, QP_MAX_BYTES);
      if (!buf || buf.length < 100) return res.status(400).json({ ok: false, error: 'PDF vide' });
      if (buf.slice(0, 5).toString() !== '%PDF-') return res.status(400).json({ ok: false, error: 'Pas un PDF' });
      var txt = await extractPdfText(buf);
      if (!txt || txt.length < 100) return res.json({ ok: false, error: 'Extraction insuffisante', bytes: buf.length, pdfTextChars: txt.length, parser: LAST_PDF_PARSER });
      var out = await buildQPAnswer(txt, getKB());
      if (!out.wos.length) return res.json({ ok: false, error: 'Aucun WO detecte', bytes: buf.length });
      res.json({ ok: true, detected: 'pdf', bytes: buf.length, pdfTextChars: txt.length, parser: LAST_PDF_PARSER, wo: out.wos.length, qpDocs: out.qpDocs, avgConfidence: out.avgConfidence, ids: out.wos.slice(0, 100).map(function(w) { return w.id; }), customer: out.ctx.customer, po: out.ctx.po, links: out.links.map(function(l) { return { url: '/qp-pdf/' + l.token, from: l.from, to: l.to }; }), ms: Date.now() - t0 });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  app.post('/api/qp-generate-excel', async function(req, res) {
    if (!needAuth(req, res)) return;
    try {
      var t0 = Date.now();
      var text = '';
      if (typeof req.body === 'string') text = req.body;
      else if (req.body && typeof req.body === 'object' && req.body.excel) text = String(req.body.excel);
      else if (req.body && typeof req.body === 'object' && req.body.content) text = String(req.body.content);
      else text = await readRawBody(req, QP_MAX_BYTES);
      if (!text || !text.trim()) return res.status(400).json({ ok: false, error: 'Contenu Excel vide', chars: 0 });
      var out = await buildQPAnswerFromExcelUniversal(text, getKB());
      if (out.error) return res.json({ ok: false, error: out.error, chars: text.length, excelDiag: out.excelDiag });
      res.json({ ok: true, detected: 'excel', chars: text.length, wo: out.wos.length, qpDocs: out.qpDocs, match: out.wos.length === out.qpDocs, avgConfidence: out.avgConfidence, excelDiag: out.excelDiag, ids: out.wos.slice(0, 200).map(function(w) { return w.id; }), customer: out.ctx.customer, po: out.ctx.po, links: out.links.map(function(l) { return { url: '/qp-pdf/' + l.token, from: l.from, to: l.to }; }), ms: Date.now() - t0 });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  app.post('/api/qp-generate-excel-html', async function(req, res) {
    if (!needAuth(req, res)) return;
    try {
      var text = '';
      if (typeof req.body === 'string') text = req.body;
      else if (req.body && typeof req.body === 'object' && req.body.excel) text = String(req.body.excel);
      else text = await readRawBody(req, QP_MAX_BYTES);
      if (!text || !text.trim()) return res.status(400).json({ ok: false, error: 'Contenu Excel vide' });
      var out = await buildQPAnswerFromExcelUniversal(text, getKB());
      if (out.error) return res.json({ ok: false, error: out.error, excelDiag: out.excelDiag });
      res.json({ ok: true, detected: 'excel', wo: out.wos.length, qpDocs: out.qpDocs, html: out.html, customer: out.ctx.customer, po: out.ctx.po, links: out.links.map(function(l) { return { url: '/qp-pdf/' + l.token, from: l.from, to: l.to }; }), excelDiag: out.excelDiag });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  app.get('/api/premium-status', async function(req, res) {
    if (!needAuth(req, res)) return;
    try {
      var kb = getKB();
      if (!kb) return res.json({ count: 0, docs: [] });
      var allDocs = await kb.find({ source: 'Premium-Source-Auto' }).lean();
      res.json({ count: allDocs.length, pdfParse: pdfParseInstalled(), pdfjs: pdfjsInstalled(), docs: allDocs.map(function(d) { return { title: d.title, url: d.url, family: (d.metadata && d.metadata.family) || '', chars: (d.content || '').length }; }) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // QP INTERCEPT pour /api/ask et /api/analyze-content
  function qpIntercept(route, strict) {
    app.use(route, function(req, res, next) {
      try {
        if (req.method !== 'POST' || !req.body) return next();
        if (!authOk(req)) return next();
        var question = String(req.body.question || '');
        var wantsQP = QP_RE.test(question) || (!strict && !question.trim());
        if (!wantsQP) return next();
        var text = collectText(req.body) + '\n' + question;
        buildQPAnswer(text, getKB()).then(function(out) {
          if (out.wos.length === 0) {
            if (strict) return next();
            return res.json({ answer: '<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:14px"><div style="color:#991b1b;font-weight:700">Aucun WO detecte dans le document</div></div>', enriched: true });
          }
          return res.json({ answer: out.html, enriched: true, qpStandard01: true, treatmentMode: 'parsing-direct', avgConfidence: out.avgConfidence, workOrdersDetected: out.wos.map(function(w) { return 'QP-' + w.id; }) });
        }).catch(function(e) { return next(); });
      } catch (e) { return next(); }
    });
  }
  qpIntercept('/api/analyze-content', false);
  qpIntercept('/api/ask', true);

  async function ragPreprocessAsk(req, res, next) {
    if (!req.body || !req.body.question) return next();
    if (!AutoFeedDoc) { try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { return next(); } }
    try {
      var q = req.body.question;
      var rag = await buildRagContext(AutoFeedDoc, q, 3, 3500);
      if (rag.context && rag.context.length > 200) {
        req.body.question = q + '\n\n[EXTRAITS]\n' + rag.context + '\n[FIN EXTRAITS]\n\nQuestion : ' + q;
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
    }
    next();
  }

  function postprocess(mode) {
    return function(req, res, next) {
      var originalJson = res.json.bind(res);
      res.json = function(data) {
        if (!data || !data.answer || data.enriched) return originalJson(data);
        var q = mode === 'document' ? (req._documentQuestion || '') : (req.body && req.body.question ? req.body.question : '');
        var domain = req.body && req.body.domain ? req.body.domain : 'General';
        var lang = req.body && req.body.language ? req.body.language : 'fr';
        enrichAnswer(data.answer, q, domain, lang, mongoose, mode, req._documentContent || '')
          .then(function(enriched) {
            data.answerRaw = data.answer;
            data.answer = enriched;
            data.enriched = true;
            data.enrichedAt = new Date().toISOString();
            originalJson(data);
          })
          .catch(function() { originalJson(data); });
        return res;
      };
      next();
    };
  }

  async function enrichAnswer(answer, question, domain, lang, mongoose, mode, originalContent) {
    try {
      var realQuestion = question; var _hm = question.match(/Nouvelle question[^:]*:\s*([\s\S]+)$/i); if (_hm) realQuestion = _hm[1].trim(); var realDomain = isQualityPlanRequest(realQuestion, originalContent) ? 'Plan Qualite' : detectDomain(realQuestion, domain);
      var AutoFeedDoc2 = null;
      try { AutoFeedDoc2 = mongoose.model('AutoFeedDocument'); } catch (e) {}
      var docs = [];
      var semanticScore = 0;
      var _tech = ['Plan Qualite', 'Petrole & Gaz', 'Technique', 'Sciences']; if (mode === 'ask' && AutoFeedDoc2 && _tech.indexOf(realDomain) !== -1) { docs = await findRelevantDocuments(AutoFeedDoc2, realQuestion, 5, 0.15); if (docs.length > 0) semanticScore = docs[0].score; }
      var scholars = [];
      if (isLiteraryOrReligious(realDomain)) scholars = extractScholars(question, answer, realDomain);
      var enriched = '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin:0 0 20px 0"><h3 style="color:#0a2540;font-size:17px;font-weight:700;margin:0 0 16px 0;padding-bottom:10px;border-bottom:2px solid #1e5aa8">Reponse detaillee</h3><div style="font-size:14px;color:#17202a">' + formatForHTML(answer) + '</div></div>';
      enriched += generateTechSheet(realDomain, docs.length, semanticScore, scholars, null, mode);
      return enriched;
    } catch (e) { return answer; }
  }

  app.use('/api/ask', ragPreprocessAsk, postprocess('ask'));
  app.use('/api/analyze-content', documentPreprocess, postprocess('document'));

  console.log('[answer-enricher] ' + APP_VERSION + ' charge - QP Standard 01 + routes Excel/PDF/ARC + TSH 511 manuel non verifie');
};