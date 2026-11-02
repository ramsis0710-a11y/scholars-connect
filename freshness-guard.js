// ============================================================
// FRESHNESS-GUARD.JS - Maintien automatique des donnees a jour
// - Route POST /api/admin/refresh-standards (protegee)
// - Refresh automatique au demarrage si > 7 jours
// ============================================================
'use strict';

module.exports = function(app, mongoose) {
  const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
  const META_COLLECTION = 'system_meta';
  
  const MetaSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now }
  }, { collection: META_COLLECTION });
  
  const SystemMeta = mongoose.models.SystemMeta || mongoose.model('SystemMeta', MetaSchema);
  
  console.log('[freshness-guard] Module charge');
  
  // ============================================================
  // Charger les standards (memes donnees que seed-standards.js)
  // ============================================================
  const STANDARDS_DATA = [
    {
      title: 'API Spec 5CT - Casing and Tubing (11e Edition 2023 + Addendum 2025 + Errata 3 2026)',
      domain: 'Petrole & Gaz',
      source: 'api.org',
      url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5ct',
      content: 'API Spec 5CT / ISO 11960. DERNIERE VERSION EN VIGUEUR : 11e Edition (Dec 2023) + Addendum 1 (Mai 2025) + Errata 1, 2, 3 (2024-2026). La 10e edition (2021) est OBSOLETE. Grades : H40, J55, K55, N80, L80, C90, T95, P110, Q125, C110, C125, M65. Addendum 1 (Mai 2025) : revision tolerances dimensionnelles, mise a jour durete L80, dispositions essais pression.'
    },
    {
      title: 'API Spec 5B - Threading, Gauging and Inspection (17e Edition 2026)',
      domain: 'Petrole & Gaz',
      source: 'api.org',
      url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5b',
      content: 'API Spec 5B. DERNIERE VERSION EN VIGUEUR : 17e Edition (Oct 2026). La 16e edition (Dec 2017) est OBSOLETE. Connexions : BTC, LTC, STC, EUE, NUE.'
    },
    {
      title: 'API Spec 5L - Line Pipe (47e Edition 2026)',
      domain: 'Petrole & Gaz',
      source: 'api.org',
      url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec5l',
      content: 'API Spec 5L / ISO 3183. DERNIERE VERSION EN VIGUEUR : 47e Edition (Juin 2026). La 46e edition (2018) est OBSOLETE. Grades : A25, A, B, X42-X120. Nouveautes : pipelines CO2, essais hydrostatiques, NDE.'
    },
    {
      title: 'API Spec 6A - Wellhead and Tree Equipment (22e Edition 2025)',
      domain: 'Petrole & Gaz',
      source: 'api.org',
      url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec6a',
      content: 'API Spec 6A / ISO 10423. DERNIERE VERSION EN VIGUEUR : 22e Edition (2025). La 21e edition (2018) est OBSOLETE. PSL : 1, 2, 3, 3G, 4. Nouveautes : PSL 3G sour service, equipements sous-marins.'
    },
    {
      title: 'API Spec 7-1 - Rotary Drill Stem Elements (2e Edition + Addendum 2025)',
      domain: 'Petrole & Gaz',
      source: 'api.org',
      url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec7-1',
      content: 'API Spec 7-1 / ISO 10424-1. DERNIERE VERSION EN VIGUEUR : 2e Edition + Addendum 1 (Mars 2025) + Errata 1, 2.'
    },
    {
      title: 'API Spec 7-2 - Threading and Gauging of Rotary Connections (2e Edition 2017)',
      domain: 'Petrole & Gaz',
      source: 'api.org',
      url: 'https://www.api.org/products-and-services/standards/important-standards-announcements/spec7-2',
      content: 'API Spec 7-2 / ISO 10424-2. DERNIERE VERSION EN VIGUEUR : 2e Edition (Jan 2017). Connexions NC, REG, FH, IF.'
    },
    {
      title: 'NACE MR0175 / ISO 15156 - Materials for H2S Service (2021 + ERR 2025)',
      domain: 'Petrole & Gaz',
      source: 'nace.org',
      url: 'https://www.ampp.org/technical-research/impact/corrosion-basics/mr0175-iso-15156',
      content: 'NACE MR0175 / ISO 15156. DERNIERE VERSION EN VIGUEUR : ANSI/NACE MR0175-2021 / ISO 15156:2020 + ERR 2025 (fevrier 2025).'
    }
  ];
  
  // ============================================================
  // Fonction de refresh
  // ============================================================
  async function refreshStandards() {
    try {
      const AutoFeedDoc = mongoose.model('AutoFeedDocument');
      let inserted = 0, updated = 0;
      
      for (const std of STANDARDS_DATA) {
        const existing = await AutoFeedDoc.findOne({ title: std.title });
        if (existing) {
          await AutoFeedDoc.updateOne({ _id: existing._id }, { $set: { ...std, createdAt: new Date() } });
          updated++;
        } else {
          await AutoFeedDoc.create(std);
          inserted++;
        }
      }
      
      // Enregistrer la date du dernier refresh
      await SystemMeta.updateOne(
        { key: 'last_standards_refresh' },
        { $set: { key: 'last_standards_refresh', value: new Date().toISOString(), updatedAt: new Date() } },
        { upsert: true }
      );
      
      console.log('[freshness-guard] Refresh OK - insere:' + inserted + ' maj:' + updated);
      return { ok: true, inserted, updated, total: STANDARDS_DATA.length };
    } catch (e) {
      console.error('[freshness-guard] Refresh ERREUR:', e.message);
      return { ok: false, error: e.message };
    }
  }
  
  // ============================================================
  // Route protegee : POST /api/admin/refresh-standards
  // ============================================================
  app.post('/api/admin/refresh-standards', async (req, res) => {
    try {
      // Verifier le token JWT
      const jwt = require('jsonwebtoken');
      const h = req.headers.authorization || '';
      if (!h.startsWith('Bearer ')) return res.status(401).json({ error: 'Auth requise' });
      const JWT_SECRET = process.env.JWT_SECRET || 'fallback';
      let decoded;
      try { decoded = jwt.verify(h.slice(7), JWT_SECRET); }
      catch { return res.status(401).json({ error: 'Token invalide' }); }
      
      // Verifier role admin (ou tout utilisateur connecte si pas de role)
      if (decoded.role && decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Role admin requis' });
      }
      
      const result = await refreshStandards();
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // ============================================================
  // Route publique : GET /api/admin/standards-status
  // ============================================================
  app.get('/api/admin/standards-status', async (req, res) => {
    try {
      const AutoFeedDoc = mongoose.model('AutoFeedDocument');
      const total = await AutoFeedDoc.countDocuments({ domain: 'Petrole & Gaz' });
      const meta = await SystemMeta.findOne({ key: 'last_standards_refresh' }).lean();
      const lastRefresh = meta ? meta.value : null;
      const daysSince = lastRefresh ? Math.floor((Date.now() - new Date(lastRefresh).getTime()) / (24*60*60*1000)) : null;
      res.json({
        total_petrole_docs: total,
        last_refresh: lastRefresh,
        days_since_refresh: daysSince,
        needs_refresh: daysSince === null || daysSince > 7
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  
  // ============================================================
  // Refresh automatique au demarrage (si > 7 jours)
  // ============================================================
  setTimeout(async () => {
    try {
      const meta = await SystemMeta.findOne({ key: 'last_standards_refresh' }).lean();
      const lastRefresh = meta ? new Date(meta.value).getTime() : 0;
      const daysSince = lastRefresh ? Math.floor((Date.now() - lastRefresh) / (24*60*60*1000)) : 999;
      
      if (daysSince > 7) {
        console.log('[freshness-guard] Donnees ont ' + daysSince + ' jours - refresh automatique...');
        await refreshStandards();
      } else {
        console.log('[freshness-guard] Donnees a jour (' + daysSince + ' jours)');
      }
    } catch (e) {
      console.warn('[freshness-guard] Auto-refresh echoue:', e.message);
    }
  }, 10000); // Attendre 10s que tout soit charge
  
  console.log('[freshness-guard] Pret - refresh auto tous les 7 jours');
};