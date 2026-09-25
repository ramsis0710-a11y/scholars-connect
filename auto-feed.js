// AUTO-FEED.JS - Scraping + Vecteurs semantiques automatiques
const fetch = require('node-fetch');

// Chargement des sources etendues
const EXTENDED_SOURCES = require('./sources-extended');


const SCRAPING_SOURCES = {
    'IA & KMS': [
        { url: 'https://arxiv.org/list/cs.AI/recent' },
        { url: 'https://arxiv.org/list/cs.CL/recent' },
        { url: 'https://openai.com/research/' },
        { url: 'https://huggingface.co/blog' }
    ],
    'Energie': [
        { url: 'https://www.iea.org/news' }
    ],
    'Finance': [
        { url: 'https://arxiv.org/list/q-fin/recent' },
        { url: 'https://www.bis.org/press/index.htm' }
    ],
    'Sante': [
        { url: 'https://www.who.int/news-room/releases' }
    ],
    'Education': [
        { url: 'https://www.ed.gov/news/press-releases' }
    ],
    'Commerce': [
        { url: 'https://www.wto.org/english/news_e/news_e.htm' }
    ]
};

const DOMAIN_KEYWORDS = {
    'IA & KMS': ['semantic', 'vector', 'embedding', 'llm', 'ai', 'transformer', 'rag', 'knowledge'],
    'Energie':  ['energy', 'solar', 'nuclear', 'hydrogen', 'grid', 'lithium', 'oil', 'gas'],
    'Finance':  ['finance', 'risk', 'quantum', 'blockchain', 'defi', 'esg', 'trading'],
    'Sante':    ['health', 'medical', 'genomic', 'ai', 'diagnosis', 'dna'],
    'Education':['education', 'learning', 'student', 'teaching', 'edtech'],
    'Commerce': ['commerce', 'supply', 'trade', 'logistics', 'retail'],
    'Sciences': ['science', 'physics', 'math', 'research', 'quantum', 'statistic']
};

async function scrapeUrl(url, timeoutMs = 15000) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const r = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MBAConsult-Bot/1.0)',
                'Accept': 'text/html,application/xhtml+xml'
            },
            signal: controller.signal
        });
        clearTimeout(timer);
        if (!r.ok) return null;
        const html = await r.text();
        let text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
        return text.slice(0, 30000);
    } catch (e) {
        return null;
    }
}

function isRelevant(text, domain) {
    if (!text || text.length < 500) return false;
    const keywords = DOMAIN_KEYWORDS[domain] || [];
    if (keywords.length === 0) return true;
    const lower = text.toLowerCase();
    const matches = keywords.filter(kw => lower.includes(kw));
    return matches.length >= 2;
}

function tokenize(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(x => x.length >= 3);
}

function buildVector(text) {
    const tokens = tokenize(text);
    const freq = {};
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
    return freq;
}

module.exports = function(app, mongoose) {

    const autoFeedSchema = new mongoose.Schema({
        title:     { type: String, required: true, index: true },
        content:   { type: String, required: true },
        domain:    { type: String, index: true },
        source:    { type: String, default: 'auto-scraper' },
        url:       { type: String, default: null },
        vector:    { type: mongoose.Schema.Types.Mixed, default: {} },
        tags:      { type: [String], default: [] },
        createdAt: { type: Date, default: Date.now, index: true }
    });

    const AutoFeedDoc = mongoose.model('AutoFeedDocument', autoFeedSchema);

    async function runAutoFeed() {
        console.log('[auto-feed] Demarrage du cycle de collecte...');
        let inserted = 0;
        let skipped = 0;

        for (const domain of Object.keys(SCRAPING_SOURCES)) {
            const sources = SCRAPING_SOURCES[domain];
            for (const src of sources) {
                try {
                    const text = await scrapeUrl(src.url);
                    if (!text) { skipped++; continue; }
                    if (!isRelevant(text, domain)) { skipped++; continue; }

                    const title = text.slice(0, 120).replace(/\s+/g, ' ') + '...';
                    const vector = buildVector(text);

                    const exists = await AutoFeedDoc.findOne({ url: src.url }).lean();
                    if (exists) {
                        await AutoFeedDoc.updateOne(
                            { url: src.url },
                            { $set: { content: text, vector, createdAt: new Date() } }
                        );
                        skipped++;
                        continue;
                    }

                    await AutoFeedDoc.create({
                        title: '[' + domain + '] ' + title,
                        content: text,
                        domain,
                        source: 'auto-scraper',
                        url: src.url,
                        vector,
                        tags: [domain.toLowerCase().replace(/\s+/g, '-'), 'auto-feed']
                    });
                    inserted++;
                    console.log('[auto-feed] + ' + domain + ' : ' + src.url.slice(0, 60) + '...');

                    await new Promise(r => setTimeout(r, 2000));
                } catch (e) {
                    console.warn('[auto-feed] Erreur ' + src.url + ' : ' + e.message);
                    skipped++;
                }
            }
        }

        console.log('[auto-feed] Cycle termine : ' + inserted + ' ajoutes, ' + skipped + ' ignores');
        return { inserted, skipped };
    }

    app.post('/api/auto-feed/run', async (req, res) => {
        try {
            const result = await runAutoFeed();
            res.json({ ok: true, ...result });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/auto-feed/stats', async (req, res) => {
        try {
            const total = await AutoFeedDoc.countDocuments();
            const byDomain = await AutoFeedDoc.aggregate([
                { $group: { _id: '$domain', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
            res.json({ total, byDomain, sources: Object.keys(SCRAPING_SOURCES).length });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/auto-feed/search', async (req, res) => {
        try {
            const { query, limit = 10 } = req.body || {};
            if (!query) return res.status(400).json({ error: 'query requis' });

            const qVector = buildVector(query);
            const docs = await AutoFeedDoc.find().sort({ createdAt: -1 }).limit(500).lean();

            function cosineSim(v1, v2) {
                let dot = 0, n1 = 0, n2 = 0;
                for (const k in v1) { n1 += v1[k] * v1[k]; if (v2[k]) dot += v1[k] * v2[k]; }
                for (const k in v2) n2 += v2[k] * v2[k];
                if (n1 === 0 || n2 === 0) return 0;
                return dot / (Math.sqrt(n1) * Math.sqrt(n2));
            }

            const scored = docs.map(d => ({
                ...d,
                score: cosineSim(qVector, d.vector || {})
            })).filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);

            res.json({ query, count: scored.length, results: scored });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    const SIX_HOURS = 6 * 60 * 60 * 1000;

    setTimeout(() => {
        console.log('[auto-feed] Premier cycle dans 5 minutes...');
        setTimeout(() => {
            runAutoFeed().catch(e => console.warn('[auto-feed] Erreur:', e.message));
            setInterval(() => {
                runAutoFeed().catch(e => console.warn('[auto-feed] Erreur:', e.message));
            }, SIX_HOURS);
        }, 5 * 60 * 1000);
    }, 0);

    console.log('[auto-feed] Module charge - scraping actif toutes les 6 heures');
};