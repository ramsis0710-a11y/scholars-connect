'use strict';
module.exports = function (app, mongoose) {
  app.post('/api/kb/ingest-bct', async function (req, res) {
    try {
      const AutoFeedDoc = mongoose.model('AutoFeedDocument');
      const doc = { title: 'BCT - Rapport Annuel 2025', domain: 'Economie', source: 'BCT-Officiel', url: 'https://bct.gov.tn', content: 'Perspectives de croissance PIB 2026-2027.', vector: [], tags: ['BCT'], metadata: {} };
      const existing = await AutoFeedDoc.findOne({ source: 'BCT-Officiel' });
      if (existing) { await AutoFeedDoc.updateOne({ _id: existing._id }, { $set: doc }); return res.json({ ok: true, action: 'updated' }); }
      await AutoFeedDoc.create(doc); res.json({ ok: true, action: 'created' });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });
};
