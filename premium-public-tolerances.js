// ============================================================
// MODULE AUTONOME : TOLÉRANCES PREMIUM PUBLIQUES
// Version : v1.0-public-tolerances
// Ce module s'auto-enregistre sur l'application Express.
// Il ne modifie AUCUNE ligne du code principal.
// Il ajoute les routes /api/premium-public-tolerances/*
// ============================================================

'use strict';

var https = require('https');
var http = require('http');
var zlib = require('zlib');

// ============================================================
// [SECTION 1] CONSTANTES DES TOLÉRANCES PUBLIQUES CONFIRMÉES
// Sources vérifiées à la date de compilation :
// - VAM TOP HT Torque Rev3 : vam-usa.com [citation:1]
// - JFE OCTG Handbook Dec 2022 : jfetc.com [citation:3][citation:8]
// - Tenaris Wedge 511 Blanking : tenaris.com [citation:2]
// ============================================================

var PUBLIC_PREMIUM_TOLERANCES = {
  'VAM TOP HT': {
    family: 'VAM',
    source: 'VAM TOP HT Torque revision 3 (Public)',
    sourceUrl: 'http://www.vam-usa.com/library/Make%20Up%20Torques/VAM[1].TOPHT.torque_3.pdf',
    verified: true,
    data: {
      dopeQuantity: {
        '4 1/2': { cm3: 10, in3: 0.6 },
        '5': { cm3: 14, in3: 0.9 },
        '5 1/2': { cm3: 16, in3: 1.0 },
        '6 5/8': { cm3: 19, in3: 1.2 },
        '7': { cm3: 25, in3: 1.5 }
      },
      torqueNote: 'Make-up torque values are tabulated by size, weight, and grade in the PDF. The extraction function parses these dynamically.',
      qualification: 'ISO 13679:2002 CAL-IV [citation:12]'
    }
  },
  'VAM TOP': {
    family: 'VAM',
    source: 'VAM TOP / HT Interchangeability Rules (Public)',
    sourceUrl: 'http://www.vamservices.com/library/files/INTERCHANGEABILITY_RULES_rev1.pdf',
    verified: true,
    data: {
      interchangeabilityNote: 'For sizes >= 5" OD, VAM TOP HC and VAM TOP HT are interchangeable with VAM TOP. For 4.5" OD, NOT interchangeable. [citation:6]',
      yieldStrength: '100% pipe body yield strength for standard design [citation:12]'
    }
  },
  'JFE FOX': {
    family: 'JFE',
    source: 'JFE OCTG Service Handbook Dec 2022 - FOX Special Clearance Coupling OD',
    sourceUrl: 'https://jfetc.com/brochures/OCTG-Service-Handbook_Dec-2022_PRINT.pdf',
    verified: true,
    data: {
      couplingODTolerance: '+0.020 / -0 (inch)',
      couplingODValues: {
        '4 1/2': 4.882,
        '5': 5.391,
        '5 1/2': 5.891,
        '6 5/8': 7.000,
        '7': 7.380,
        '7 5/8': 8.000,
        '8 5/8': 9.120,
        '9 5/8': 10.100,
        '10 3/4': 11.266,
        '11 3/4': 12.268
      },
      designFeatures: 'Buttress type thread with pitch change; Contoured metal-to-metal triple radius seal [citation:17]'
    }
  },
  'JFE JFELION': {
    family: 'JFE',
    source: 'JFE OCTG Service Handbook Dec 2022 - JFELION Special Clearance Coupling OD',
    sourceUrl: 'https://jfetc.com/brochures/OCTG-Service-Handbook_Dec-2022_PRINT.pdf',
    verified: true,
    data: {
      couplingODTolerance: '+0.020 / -0 (inch)',
      sc80Sc90Available: true,
      note: 'SC80 and SC90 coupling OD values are tabulated by size and weight in the handbook. [citation:8]'
    }
  },
  'TenarisHydril Wedge 511': {
    family: 'TENARIS',
    source: 'TenarisHydril Wedge 511 Blanking Dimensions (Public)',
    sourceUrl: 'https://www.tenaris.com/media/xk4dmjqi/tenarishydrilwedge_511andtenarishydrilwedge_511dopeless-pdf.pdf',
    verified: true,
    data: {
      toleranceType: 'Blanking dimensions only',
      warning: 'These are BLANKING dimensions. Finished thread and seal tolerances require the licensed OEM data sheet. [citation:2]',
      exampleValues: {
        '18.000 / 128.00': { pinID: { min: '16.553', max: '16.573' }, boxOD: { min: '17.990', max: '18.010' } },
        '18.000 / 162.00': { pinID: { min: '16.115', max: '16.135' }, boxOD: { min: '17.990', max: '18.010' } }
      },
      torqueApplication: 'Use Tenaris DCP for mixed assemblies: https://dcp.tenaris.com/Mixed_Assemblies [citation:5]'
    }
  }
};

// ============================================================
// [SECTION 2] SOURCES PUBLIQUES À SCRAPER
// URL vérifiées comme accessibles publiquement.
// ============================================================

var PUBLIC_SOURCES_TO_SCRAPE = [
  {
    family: 'VAM',
    connection: 'VAM TOP HT',
    title: 'VAM TOP HT Torque Values - Revision 3',
    url: 'http://www.vam-usa.com/library/Make%20Up%20Torques/VAM[1].TOPHT.torque_3.pdf',
    type: 'pdf',
    extract: 'torque',
    toleranceType: 'torque'
  },
  {
    family: 'JFE',
    connection: 'FOX / JFELION',
    title: 'JFE OCTG Service Handbook - Coupling OD Tolerances',
    url: 'https://jfetc.com/brochures/OCTG-Service-Handbook_Dec-2022_PRINT.pdf',
    type: 'pdf',
    extract: 'couplingOD',
    toleranceType: 'couplingOD'
  },
  {
    family: 'TENARIS',
    connection: 'Wedge 511',
    title: 'TenarisHydril Wedge 511 Blanking Dimensions',
    url: 'https://www.tenaris.com/media/xk4dmjqi/tenarishydrilwedge_511andtenarishydrilwedge_511dopeless-pdf.pdf',
    type: 'pdf',
    extract: 'blanking',
    toleranceType: 'blanking'
  }
];

// ============================================================
// [SECTION 3] FONCTIONS UTILITAIRES AUTONOMES
// (fetch, extraction PDF, similarité) - indépendantes du code principal
// ============================================================

function fetchUrl(url, maxRedirects, timeoutMs) {
  maxRedirects = maxRedirects === undefined ? 5 : maxRedirects;
  timeoutMs = timeoutMs || 30000;
  return new Promise(function(resolve, reject) {
    var lib = url.indexOf('https://') === 0 ? https : http;
    var req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GMPI-Tolerances/1.0)',
        'Accept': 'text/html,application/pdf,*/*'
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
    req.setTimeout(timeoutMs, function() { req.destroy(new Error('Timeout ' + timeoutMs + 'ms')); });
  });
}

async function extractTextFromPdfBuffer(buffer) {
  try {
    var mod = require('pdf-parse');
    if (typeof mod === 'function') {
      var data = await mod(buffer);
      if (data && data.text && data.text.length > 100) return data.text;
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
    var txt = parts.join('\n').replace(/\s{3,}/g, ' ').trim();
    if (txt.length > 100) return txt;
  } catch (e) {}
  var raw = buffer.toString('latin1');
  var matches = raw.match(/\(([^\)]{2,})\)/g) || [];
  var fallback = matches.map(function(m) { return m.slice(1, -1); }).join(' ');
  return fallback.replace(/\\[0-9]{3}/g, ' ').replace(/\\(\w)/g, '$1').replace(/\s+/g, ' ').trim();
}

// ============================================================
// [SECTION 4] EXTRACTION DES TOLÉRANCES PUBLIQUES
// Analyse le texte extrait et retourne les valeurs structurées.
// ============================================================

function extractTorqueValues(text) {
  var lines = String(text || '').split(/\n/);
  var results = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    // Pattern typique d'une ligne de couple : taille, poids, épaisseur, valeurs numériques
    var nums = line.match(/\b\d{4,6}\b/g);
    if (nums && nums.length >= 6) {
      var sizeMatch = line.match(/(\d+(?:\s+\d\/\d)?)\s*"?\s*(\d+(?:\.\d+)?)\s*(?:lb\/ft|#)?/);
      if (sizeMatch) {
        results.push({
          od: sizeMatch[1],
          wt: sizeMatch[2],
          torqueValues: nums.slice(0, 6).map(Number),
          interpretation: 'First 6 numeric values: min, opti, max, millMin, millMax (approximate order - verify against PDF column headers)',
          rawLine: line.slice(0, 300)
        });
      }
    }
  }
  return results.slice(0, 100);
}

function extractCouplingODTolerances(text) {
  var results = [];
  var t = String(text || '');

  // Extraction FOX
  var foxSection = t.match(/FOX Special Clearance Coupling OD['s]*[\s\S]{0,2500}/i);
  if (foxSection) {
    var lines = foxSection[0].split(/\n/);
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/(\d+(?:\s+\d\/\d)?)\s*\|?\s*([\d.]+)\s*\|?\s*(\+\s*[\d.]+\s*\/\s*-\s*[\d.]+)/);
      if (m) results.push({ connection: 'FOX', size: m[1], couplingOD: parseFloat(m[2]), tolerance: m[3].replace(/\s+/g, ' ') });
    }
  }

  // Extraction JFELION
  var lionSection = t.match(/JFELION Special Clearance Coupling OD['s]*[\s\S]{0,4000}/i);
  if (lionSection) {
    var lionLines = lionSection[0].split(/\n/);
    for (var j = 0; j < lionLines.length; j++) {
      var lm = lionLines[j].match(/(\d+(?:\s+\d\/\d)?)\s*\|?\s*([\d.]+)\s*\|?\s*([\d.]+)\s*\|?\s*([\d.]+)\s*\|?\s*(\+\s*[\d.]+\s*\/\s*-\s*[\d.]+)/);
      if (lm) results.push({ connection: 'JFELION', size: lm[1], weight: parseFloat(lm[2]), sc80: parseFloat(lm[3]), sc90: parseFloat(lm[4]), tolerance: lm[5].replace(/\s+/g, ' ') });
    }
  }

  // Tolérance générique trouvée dans le texte
  var genericTol = t.match(/\+\s*0\.020\s*\/\s*-\s*0/g);
  if (genericTol && results.length === 0) {
    results.push({ connection: 'JFE (generic)', tolerance: '+0.020 / -0 (inch)', note: 'Found in text, connection not parsed' });
  }

  return results.slice(0, 100);
}

function extractBlankingDimensions(text) {
  var lines = String(text || '').split(/\n/);
  var results = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    // Chercher les lignes avec des dimensions au format x.xxx in
    var dims = line.match(/\d+\.\d{3}\s*in/g);
    if (dims && dims.length >= 4) {
      results.push({
        rawLine: line.slice(0, 400),
        dimensionsFound: dims.length,
        note: 'Blanking dimensions - NOT finished thread tolerances'
      });
    }
  }
  return results.slice(0, 50);
}

// ============================================================
// [SECTION 5] INGESTION DANS MONGODB (AutoFeedDocument)
// ============================================================

async function ingestPublicToleranceSources(AutoFeedDoc) {
  var stats = { total: 0, ok: 0, skipped: 0, errors: 0, tolerancesExtracted: 0, details: [] };

  for (var i = 0; i < PUBLIC_SOURCES_TO_SCRAPE.length; i++) {
    var src = PUBLIC_SOURCES_TO_SCRAPE[i];
    stats.total++;

    // Vérifier si déjà ingéré
    try {
      var existing = await AutoFeedDoc.findOne({ url: src.url }).lean();
      if (existing && (existing.content || '').length > 1000) {
        stats.skipped++;
        stats.details.push({ family: src.family, url: src.url, status: 'deja-ingere', chars: (existing.content || '').length });
        continue;
      }
    } catch (e) {}

    try {
      console.log('[public-tolerances] Telechargement : ' + src.url);
      var res = await fetchUrl(src.url);
      if (!res.buffer || res.buffer.length < 500) throw new Error('Fichier trop petit');

      var text = await extractTextFromPdfBuffer(res.buffer);
      if (!text || text.length < 500) throw new Error('Texte extrait trop court (' + (text ? text.length : 0) + ')');

      var content = text.slice(0, 500000);
      var extracted = [];

      if (src.extract === 'torque') extracted = extractTorqueValues(content);
      else if (src.extract === 'couplingOD') extracted = extractCouplingODTolerances(content);
      else if (src.extract === 'blanking') extracted = extractBlankingDimensions(content);

      // Construire le vecteur sémantique basique
      var tokens = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(function(x) { return x.length >= 3; });
      var vector = {};
      for (var t = 0; t < tokens.length; t++) vector[tokens[t]] = (vector[tokens[t]] || 0) + 1;

      await AutoFeedDoc.create({
        title: '[PUBLIC TOLERANCE] ' + src.title,
        domain: 'Petrole & Gaz',
        source: 'Premium-Public-Tolerance',
        url: src.url,
        content: content,
        vector: vector,
        createdAt: new Date(),
        tags: ['premium', src.family, 'public-tolerance', src.toleranceType],
        metadata: {
          family: src.family,
          connection: src.connection,
          publicTolerance: true,
          toleranceType: src.toleranceType,
          toleranceCount: extracted.length,
          tolerances: extracted.slice(0, 50),
          verified: extracted.length > 0,
          ingestedAt: new Date().toISOString()
        }
      });

      stats.ok++;
      stats.tolerancesExtracted += extracted.length;
      stats.details.push({ family: src.family, url: src.url, status: 'ok', chars: content.length, tolerances: extracted.length });
      console.log('[public-tolerances] OK : ' + src.family + ' - ' + extracted.length + ' tolerances extraites');
    } catch (e) {
      stats.errors++;
      stats.details.push({ family: src.family, url: src.url, status: 'erreur', error: e.message });
      console.warn('[public-tolerances] Erreur ' + src.url + ' : ' + e.message);
    }
  }

  console.log('[public-tolerances] Termine - total:' + stats.total + ' ok:' + stats.ok + ' skip:' + stats.skipped + ' err:' + stats.errors + ' tolerances:' + stats.tolerancesExtracted);
  return stats;
}

// ============================================================
// [SECTION 6] AUTHENTIFICATION MINIMALE (réutilise le jeton Bearer)
// ============================================================

function isAuthenticated(req) {
  var h = String((req && req.headers && req.headers.authorization) || '').trim();
  var m = h.match(/^Bearer\s+(.+)$/i);
  var tok = (m ? m[1] : h).trim();
  if (!tok || tok.length < 10 || tok === 'undefined' || tok === 'null') return false;
  // Vérification de structure JWT minimale + expiration
  var parts = tok.split('.');
  if (parts.length === 3) {
    try {
      var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var pl = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      if (pl.exp && (pl.exp * 1000) < Date.now()) return false;
    } catch (e) { return false; }
  }
  return true;
}

// ============================================================
// [SECTION 7] EXPORT : FONCTION D'ENREGISTREMENT DES ROUTES
// ============================================================

module.exports = function(app, mongoose) {
  var AutoFeedDoc = null;
  try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) { AutoFeedDoc = null; }

  // Route : GET /api/premium-public-tolerances/ingest
  app.get('/api/premium-public-tolerances/ingest', async function(req, res) {
    if (!isAuthenticated(req)) return res.status(401).json({ error: 'Authorization requise' });
    if (!AutoFeedDoc) return res.status(503).json({ error: 'AutoFeedDocument indisponible' });

    try {
      var stats = await ingestPublicToleranceSources(AutoFeedDoc);
      res.json({ ok: true, stats: stats, reference: PUBLIC_PREMIUM_TOLERANCES });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Route : GET /api/premium-public-tolerances/status
  app.get('/api/premium-public-tolerances/status', async function(req, res) {
    if (!isAuthenticated(req)) return res.status(401).json({ error: 'Authorization requise' });
    if (!AutoFeedDoc) return res.status(503).json({ error: 'AutoFeedDocument indisponible' });

    try {
      var docs = await AutoFeedDoc.find({ source: 'Premium-Public-Tolerance' })
        .select('title url metadata createdAt').sort({ createdAt: -1 }).lean();
      var summary = docs.map(function(d) {
        return {
          title: d.title, url: d.url,
          family: (d.metadata && d.metadata.family) || '',
          toleranceType: (d.metadata && d.metadata.toleranceType) || '',
          toleranceCount: (d.metadata && d.metadata.toleranceCount) || 0,
          verified: (d.metadata && d.metadata.verified) || false,
          ingestedAt: d.createdAt
        };
      });
      res.json({ ok: true, count: docs.length, totalTolerances: summary.reduce(function(a, b) { return a + (b.toleranceCount || 0); }, 0), documents: summary, reference: PUBLIC_PREMIUM_TOLERANCES });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Route : GET /api/premium-public-tolerances/lookup?family=VAM&connection=VAM%20TOP%20HT
  app.get('/api/premium-public-tolerances/lookup', async function(req, res) {
    if (!isAuthenticated(req)) return res.status(401).json({ error: 'Authorization requise' });
    if (!AutoFeedDoc) return res.status(503).json({ error: 'AutoFeedDocument indisponible' });

    var family = String(req.query.family || '').toUpperCase();
    var connection = String(req.query.connection || '').toUpperCase();

    try {
      var query = { source: 'Premium-Public-Tolerance' };
      if (family) query['metadata.family'] = family;
      var docs = await AutoFeedDoc.find(query).lean();
      var matches = [];
      docs.forEach(function(d) {
        var md = d.metadata || {};
        if (connection && String(d.title || '').toUpperCase().indexOf(connection) === -1 && String(md.connection || '').toUpperCase().indexOf(connection) === -1) return;
        if (md.tolerances && md.tolerances.length) {
          matches.push({ title: d.title, family: md.family, connection: md.connection, toleranceType: md.toleranceType, tolerances: md.tolerances });
        }
      });
      res.json({ ok: true, family: family, connection: connection, matches: matches, reference: PUBLIC_PREMIUM_TOLERANCES[connection] || null });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  console.log('[premium-public-tolerances] Module charge - routes /api/premium-public-tolerances/* disponibles');
};
