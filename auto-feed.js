'use strict';
module.exports = function(app, mongoose) {
  const autoFeedSchema = new mongoose.Schema({
    title: { type: String, required: true, index: true },
    content: { type: String, required: true },
    domain: { type: String, index: true },
    source: { type: String, default: 'auto-scraper' },
    url: { type: String, default: null },
    vector: { type: mongoose.Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true }
  });
  try { mongoose.model('AutoFeedDocument', autoFeedSchema); } catch(e) {}
  console.log('[auto-feed] Modele AutoFeedDocument enregistre.');
};
