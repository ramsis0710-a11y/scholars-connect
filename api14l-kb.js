'use strict';
module.exports = function (app, mongoose) {
  const API14L_DOC = {
    title: 'API Spec 14L:2020(R2025) - Lock Mandrels and Landing Nipples',
    domain: 'Petrole & Gaz',
    source: 'API-14L-Manual',
    url: 'https://shop.standards.ie/',
    content: 'API Spec 14L:2020(R2025) - Lock Mandrels and Landing Nipples. Seal Bore Tolerances: The inner diameter tolerance of the seal bore is +0.0020 in / -0.0000 in. Surface finish maximum roughness is Ra 0.80 um (32 micro-inches). Drift test: the drift mandrel must pass freely through the entire seal bore length. Pressure tests: V3 grade is 1.0x rated pressure. V2, V1, V0 are 1.5x rated pressure. V0 gas leak maximum is 20 sccm. Non-destructive testing per ASTM E709. Marking per API 14L with Monogram.',
    vector: [],
    tags: ['API', '14L', 'seal-bore', 'tolerance'],
    metadata: { standard: 'API-14L', isStandard: true }
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
