// AUTO-INGEST.JS - Documents utilisateurs + QA validee
module.exports = function(app, mongoose) {

    const ingestSchema = new mongoose.Schema({
        title:     { type: String, required: true, index: true },
        content:   { type: String, required: true },
        domain:    { type: String, index: true },
        source:    { type: String, default: 'user' },
        userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
        url:       { type: String, default: null },
        tags:      { type: [String], default: [] },
        quality:   { type: Number, default: 1 },
        createdAt: { type: Date, default: Date.now, index: true }
    });

    const IngestDoc = mongoose.model('IngestDocument', ingestSchema);

    app.post('/api/auto-ingest/document', async (req, res) => {
        try {
            const { title, content, domain, url, tags } = req.body || {};
            if (!title || !content) return res.status(400).json({ error: 'title et content requis' });

            const crypto = require('crypto');
            const hash = crypto.createHash('md5').update(title + content).digest('hex');

            const exists = await IngestDoc.findOne({ tags: 'hash-' + hash }).lean();
            if (exists) {
                return res.json({ ok: true, id: exists._id, action: 'skip', reason: 'deja present' });
            }

            const doc = await IngestDoc.create({
                title: title.slice(0, 200),
                content: content.slice(0, 50000),
                domain: domain || 'General',
                source: 'user-upload',
                userId: req.user ? req.user.id : null,
                url: url || null,
                tags: [...(Array.isArray(tags) ? tags : []), 'auto-ingest', 'hash-' + hash],
                quality: 1
            });

            console.log('[auto-ingest] + ' + title.slice(0, 60) + '...');
            res.json({ ok: true, id: doc._id, action: 'created' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/auto-ingest/validated-answer', async (req, res) => {
        try {
            const { question, answer, domain, scholar } = req.body || {};
            if (!question || !answer) return res.status(400).json({ error: 'question et answer requis' });

            const title = '[Q/A validee] ' + question.slice(0, 100);
            const content = 'Question: ' + question + '\n\nReponse: ' + answer + '\n\nScholar: ' + (scholar || 'N/A');

            const crypto = require('crypto');
            const hash = crypto.createHash('md5').update(title + content).digest('hex');

            const exists = await IngestDoc.findOne({ tags: 'hash-' + hash }).lean();
            if (exists) return res.json({ ok: true, action: 'skip' });

            const doc = await IngestDoc.create({
                title,
                content,
                domain: domain || 'General',
                source: 'validated-answer',
                userId: req.user ? req.user.id : null,
                tags: ['validated', 'quality-high', 'hash-' + hash],
                quality: 2
            });

            console.log('[auto-ingest] + QA validee : ' + question.slice(0, 50) + '...');
            res.json({ ok: true, id: doc._id, action: 'created' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/auto-ingest/batch', async (req, res) => {
        try {
            const { documents } = req.body || {};
            if (!Array.isArray(documents)) return res.status(400).json({ error: 'documents[] requis' });

            const crypto = require('crypto');
            let created = 0, skipped = 0;

            for (const d of documents) {
                if (!d.title || !d.content) { skipped++; continue; }
                const hash = crypto.createHash('md5').update(d.title + d.content).digest('hex');
                const exists = await IngestDoc.findOne({ tags: 'hash-' + hash }).lean();
                if (exists) { skipped++; continue; }

                await IngestDoc.create({
                    title: d.title.slice(0, 200),
                    content: d.content.slice(0, 50000),
                    domain: d.domain || 'General',
                    source: 'batch-ingest',
                    url: d.url || null,
                    tags: [...(d.tags || []), 'batch', 'hash-' + hash],
                    quality: d.quality || 1
                });
                created++;
            }

            console.log('[auto-ingest] Batch : ' + created + ' ajoutes, ' + skipped + ' ignores');
            res.json({ ok: true, created, skipped });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/auto-ingest/stats', async (req, res) => {
        try {
            const total = await IngestDoc.countDocuments();
            const bySource = await IngestDoc.aggregate([
                { $group: { _id: '$source', count: { $sum: 1 } } }
            ]);
            res.json({ total, bySource });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    console.log('[auto-ingest] Module charge - ingestion utilisateurs active');
};