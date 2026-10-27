'use strict';
module.exports = function (app, mongoose) {
  const OEM_DOCS = [{ title: 'Weatherford SBRO-CI', domain: 'Petrole & Gaz', source: 'OEM-Weatherford', url: 'https://weatherford.com', content: 'Tubing 2 3/8: pocket 1.0, OD 4.56. Tubing 2 7/8: pocket 1.0, OD 5.28.', vector: [], tags: ['Weatherford'], metadata: { oem: 'Weatherford' } }];
  app.post('/api/kb/ingest-oem-chemical', async function (req, res) {
    try {
      const AutoFeedDoc = mongoose.model('AutoFeedDocument');
      const results = [];
      for (const doc of OEM_DOCS) {
        const existing = await AutoFeedDoc.findOne({ source: doc.source });
        if (existing) { await AutoFeedDoc.updateOne({ _id: existing._id }, { $set: doc }); results.push({ source: doc.source, action: 'updated' }); }
        else { await AutoFeedDoc.create(doc); results.push({ source: doc.source, action: 'created' }); }
      }
      res.json({ ok: true, results: results });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });
};
