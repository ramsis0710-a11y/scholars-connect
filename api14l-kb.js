'use strict';
module.exports = function (app, mongoose) {
  const API14L_DOC = {
    title: 'API Spec 14L:2020(R2025)',
    domain: 'Petrole & Gaz', source: 'API-14L-Manual', url: 'https://shop.standards.ie/',
    content: 'API Spec 14L. Seal Bore Tolerance: +0.0020 in / -0.0000 in. Surface finish: Ra <= 0.80 um. V3: 1.0x, V2/V1/V0: 1.5x pressure. V0 gas leak max 20 sccm.',
    vector: [], tags: ['API', '14L'], metadata: { standard: 'API-14L' }
  };
  app.post('/api/kb/ingest-api14l', async function (req, res) {
    try {
      const AutoFeedDoc = mongoose.model('AutoFeedDocument');
      const existing = await AutoFeedDoc.findOne({ source: 'API-14L-Manual' });
      if (existing) { await AutoFeedDoc.updateOne({ _id: existing._id }, { $set: API14L_DOC }); return res.json({ ok: true, action: 'updated' }); }
      await AutoFeedDoc.create(API14L_DOC); res.json({ ok: true, action: 'created' });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });
};
