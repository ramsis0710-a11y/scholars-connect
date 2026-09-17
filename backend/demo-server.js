const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!MONGODB_URI) { console.error('MONGODB_URI non definie'); process.exit(1); }

let aiAvailable = false;
if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.startsWith('sk-or-') && OPENROUTER_API_KEY.length > 20) {
    aiAvailable = true;
    console.log('OpenRouter configure');
} else {
    console.log('OPENROUTER_API_KEY invalide');
}

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 45000, family: 4 })
    .then(function() { console.log('MongoDB Atlas connecte'); })
    .catch(function(err) { console.error('MongoDB:', err.message); });

const UserSchema = new mongoose.Schema({
    username: String, email: { type: String, unique: true }, password: String,
    role: { type: String, default: 'user' }, language: { type: String, default: 'fr' },
    domain: { type: String, default: 'General' }, createdAt: { type: Date, default: Date.now }
});

const AnswerSchema = new mongoose.Schema({
    username: String, userId: Number, content: String, language: String, date: String,
    timestamp: { type: Date, default: Date.now }, isClaude: { type: Boolean, default: false },
    isScholarResponse: { type: Boolean, default: false }, aiVerified: { type: Boolean, default: false },
    claudeReason: String
});

const QuestionSchema = new mongoose.Schema({
    title: String, content: String, domain: String, category: String,
    username: String, userId: Number, language: String, date: String,
    timestamp: { type: Date, default: Date.now }, status: { type: String, default: 'pending' },
    scholar: mongoose.Schema.Types.Mixed, answers: [AnswerSchema],
    attachedFile: mongoose.Schema.Types.Mixed
});

const HistorySchema = new mongoose.Schema({
    userId: Number, username: String, action: String, data: mongoose.Schema.Types.Mixed,
    date: String, timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const History = mongoose.model('History', HistorySchema);

async function initAdmin(retries) {
    if (retries === undefined) retries = 5;
    try {
        const existing = await User.findOne({ email: 'admin@scholars-connect.com' });
        if (!existing) {
            await User.create({ username: 'admin', email: 'admin@scholars-connect.com', password: 'admin12345', role: 'admin', domain: 'General' });
            console.log('Admin cree');
        } else {
            existing.password = 'admin12345';
            existing.role = 'admin';
            await existing.save();
            console.log('Admin OK');
        }
    } catch (e) {
        if (retries > 0) setTimeout(function() { initAdmin(retries - 1); }, 5000);
    }
}
mongoose.connection.once('connected', function() { initAdmin(); });

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function(req, file, cb) { cb(null, uploadsDir); },
    filename: function(req, file, cb) {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, Date.now() + '_' + safe);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 200 * 1024 * 1024 } });

const LANG_NAMES = { 'fr':'French','ar':'Arabic','en':'English','es':'Spanish','de':'German','it':'Italian','pt':'Portuguese','zh':'Chinese','ja':'Japanese','ko':'Korean','ru':'Russian','hi':'Hindi' };

async function callOpenRouter(prompt, options) {
    options = options || {};
    const models = ['deepseek/deepseek-chat-v3.1:free','meta-llama/llama-3.3-70b-instruct:free','qwen/qwen3-235b-a22b:free','openrouter/free'];
    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://scholars-connect-app.onrender.com', 'X-Title': 'Scholars Connect' },
                body: JSON.stringify({ model: model, messages: [{ role: 'user', content: prompt }], temperature: options.temperature !== undefined ? options.temperature : 0.7, max_tokens: options.max_tokens || 2500 })
            });
            if (response.ok) {
                const data = await response.json();
                const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
                if (text && text.length > 30) { console.log('OK: ' + model); return text; }
                if (text && text.length > 1 && (options.allowShort === true || options.minLength === 0)) { console.log('OK short: ' + model); return text; }
            }
        } catch (e) { console.error(model + ': ' + e.message); }
    }
    return null;
}

async function generateAIResponse(question, scholar, reason) {
    const qLang = question.language || 'fr';
    const langName = LANG_NAMES[qLang] || 'French';
    let prompt = 'You are Juge Claude, expert academic judge. Respond ONLY in ' + langName + '. DOMAIN: ' + question.domain + ' SPECIALTY: ' + question.category + ' QUESTION: ' + question.title + ' DETAILS: ' + question.content;
    if (question.attachedFile && question.attachedFile.analysis) { prompt += ' ATTACHED DOCUMENT: ' + question.attachedFile.analysis.substring(0, 3000); }
    prompt += ' Provide COMPLETE answer in ' + langName + '. Structure: DEFINITION, DETAILED ANSWER, KEY POINTS, SOURCES';
    if (aiAvailable) {
        const text = await callOpenRouter(prompt, { temperature: 0.7, max_tokens: 2500 });
        if (text) return buildResponse(text, question, scholar, reason);
    }
    return generateLocalFallback(question, scholar, reason);
}

function buildResponse(text, question, scholar, reason) {
    let header = reason === 'no_literature' ? 'REPONSE DU JUGE CLAUDE: ' : 'REPONSE DU JUGE CLAUDE (5 min): ';
    return header + text + ' Le scholar ' + scholar.name + ' pourra completer.';
}

function generateLocalFallback(question, scholar, reason) {
    var qLang = question.language || 'fr';
    var generic = { fr: 'Domaine ' + question.domain + '. Scholar: ' + scholar.name, ar: 'المجال ' + question.domain + '. العالم: ' + scholar.name, en: 'Domain ' + question.domain + '. Scholar: ' + scholar.name };
    return 'REPONSE DU JUGE CLAUDE: ' + (generic[qLang] || generic.fr);
}

app.post('/api/analyze-question', async function(req, res) {
    try {
        const text = req.body.text;
        if (!text) return res.status(400).json({ error: 'Texte manquant' });
        let dl = 'fr';
        if (/[\u0600-\u06FF]/.test(text)) dl = 'ar';
        else if (/[\u4E00-\u9FFF]/.test(text)) dl = 'zh';
        else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) dl = 'ja';
        else if (/[\uAC00-\uD7AF]/.test(text)) dl = 'ko';
        else if (/[\u0400-\u04FF]/.test(text)) dl = 'ru';
        else if (/[\u0900-\u097F]/.test(text)) dl = 'hi';
        const qm = (text.match(/[?？؟]/g) || []).length;
        const isMQ = qm >= 2;
        if (!aiAvailable) return res.json({ title: text.substring(0, 80), domain: 'General', category: 'Histoire', language: dl, content: text, isMultiQuestion: isMQ, subQuestions: [] });
        const prompt = 'Return ONLY valid JSON: title, domain (Islam|Medecine|Pharmacie|Chimie|IA|IoT|GMAO|Mecanique Petrole|Gestion|Expertise Comptable|Droit|Economie|Culture Generale|Art|Architecture|Restauration|General), category, language, content, isMultiQuestion, subQuestions. TEXT: ' + text;
        const aiText = await callOpenRouter(prompt, { temperature: 0.3, max_tokens: 1500 });
        if (aiText) {
            let ct = aiText.split('`json').join('').split('`').join('').trim();
            try { const p = JSON.parse(ct);
                if (!p.title) p.title = text.substring(0, 80);
                if (!p.domain) p.domain = 'General';
                if (!p.category) p.category = 'General';
                if (!p.language) p.language = dl;
                if (!p.content) p.content = text;
                if (p.isMultiQuestion === undefined) p.isMultiQuestion = isMQ;
                if (!p.subQuestions) p.subQuestions = [];
                return res.json(p);
            } catch (e) {}
        }
        res.json({ title: text.substring(0, 80), domain: 'General', category: 'Histoire', language: dl, content: text, isMultiQuestion: isMQ, subQuestions: [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/upload-files', upload.array('files', 20), async function(req, res) {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Aucun fichier' });
        var results = [];
        for (var idx = 0; idx < req.files.length; idx++) {
            var f = req.files[idx];
            var fp = f.path, fn = f.originalname, fsz = f.size;
            var ext = path.extname(fn).toLowerCase().replace('.', '');
            console.log('Upload [' + (idx+1) + '/' + req.files.length + ']: ' + fn + ' (' + fsz + ' octets)');
            var exTxt = '', fType = 'unknown';
            var textExts = ['txt','md','csv','json','xml','html','js','css','log','sql','py','java','c','cpp','cs','php','rb','go','rs','ts','yml','yaml'];
            if (textExts.indexOf(ext) !== -1) {
                fType = 'text';
                exTxt = fs.readFileSync(fp, 'utf8').substring(0, 50000);
            } else {
                fType = 'binary';
                exTxt = '[Fichier binaire ' + ext + ' - ' + (fsz/1024).toFixed(2) + ' Ko]';
                try {
                    var buf = fs.readFileSync(fp);
                    var raw = buf.toString('binary');
                    var rd = '', cur = '';
                    for (var i = 0; i < Math.min(raw.length, 200000); i++) {
                        var c = raw.charCodeAt(i);
                        if ((c >= 32 && c <= 126) || c === 10 || c === 13 || c === 9) cur += raw[i];
                        else { if (cur.length >= 4) rd += cur + ' '; cur = ''; }
                    }
                    if (rd.length > 100) exTxt += ' Extrait: ' + rd.substring(0, 5000);
                } catch (e) {}
            }
            var aiAn = '';
            if (aiAvailable && exTxt.length > 10) {
                var pr = 'Analyze this file in its language. NAME: ' + fn + ' TYPE: ' + ext + ' SIZE: ' + (fsz/1024).toFixed(2) + ' KB CONTENT: ' + exTxt.substring(0, 6000) + ' Provide: 1. Type 2. Topics 3. Key points 4. Language 5. Domain 6. Specialty. Be concise.';
                aiAn = await callOpenRouter(pr, { temperature: 0.4, max_tokens: 1200 }) || '';
            }
            results.push({ originalName: fn, storedName: f.filename, size: fsz, type: ext, fileType: fType, uploadedAt: new Date().toISOString(), extractedPreview: exTxt.substring(0, 500), analysis: aiAn });
        }
        res.json({ success: true, files: results, count: results.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/upload-file', upload.single('file'), async function(req, res) {
    try {
        if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
        const fp = req.file.path, fn = req.file.originalname, fs_ = req.file.size;
        const ext = path.extname(fn).toLowerCase().replace('.', '');
        console.log('Upload: ' + fn + ' (' + fs_ + ' octets)');
        let exTxt = '', fType = 'unknown';
        const textExts = ['txt','md','csv','json','xml','html','js','css','log','sql','py','java','c','cpp','cs','php','rb','go','rs','ts','yml','yaml'];
        if (textExts.indexOf(ext) !== -1) { fType = 'text'; exTxt = fs.readFileSync(fp, 'utf8').substring(0, 50000); }
        else {
            fType = 'binary';
            exTxt = '[Fichier binaire ' + ext + ' - ' + (fs_/1024).toFixed(2) + ' Ko]';
            try { const buf = fs.readFileSync(fp); const raw = buf.toString('binary'); let rd = '', cur = '';
                for (let i = 0; i < Math.min(raw.length, 200000); i++) {
                    const c = raw.charCodeAt(i);
                    if ((c >= 32 && c <= 126) || c === 10 || c === 13 || c === 9) cur += raw[i];
                    else { if (cur.length >= 4) rd += cur + ' '; cur = ''; }
                }
                if (rd.length > 100) exTxt += ' Extrait: ' + rd.substring(0, 5000);
            } catch (e) {}
        }
        let aiAn = '';
        if (aiAvailable && exTxt.length > 10) {
            const pr = 'Analyze this file in its language. NAME: ' + fn + ' TYPE: ' + ext + ' SIZE: ' + (fs_/1024).toFixed(2) + ' KB CONTENT: ' + exTxt.substring(0, 8000) + ' Provide: 1. Type 2. Topics 3. Key points 4. Language 5. Domain 6. Specialty.';
            aiAn = await callOpenRouter(pr, { temperature: 0.4, max_tokens: 1500 }) || '';
        }
        res.json({ success: true, file: { originalName: fn, storedName: req.file.filename, size: fs_, type: ext, fileType: fType, uploadedAt: new Date().toISOString(), extractedPreview: exTxt.substring(0, 500), analysis: aiAn } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/translate', async function(req, res) {
    try { const text = req.body.text, tl = req.body.targetLang;
        if (!text || !tl) return res.status(400).json({ error: 'Parametres manquants' });
        if (!aiAvailable) return res.json({ translation: text, targetLang: tl });
        const tn = LANG_NAMES[tl] || tl;
        const pr = 'Translate into ' + tn + '. Return ONLY the translation. ' + text;
        const tr = await callOpenRouter(pr, { temperature: 0.2, max_tokens: 2000, allowShort: true });
        if (tr) return res.json({ translation: tr, targetLang: tl });
        res.json({ translation: text, targetLang: tl });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async function(req, res) {
    try { const u = await User.findOne({ email: req.body.email, password: req.body.password });
        if (!u) return res.status(401).json({ error: 'Identifiants incorrects' });
        var o = u.toObject(); delete o.password; res.json(o);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async function(req, res) {
    try { const ex = await User.findOne({ email: req.body.email });
        if (ex) return res.status(400).json({ error: 'Email deja utilise' });
        const u = await User.create(req.body);
        var o = u.toObject(); delete o.password; res.json(o);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async function(req, res) { try { res.json(await User.find().select('-password')); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/questions', async function(req, res) { try { res.json(await Question.find().sort({ timestamp: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });

app.post('/api/questions', async function(req, res) {
    try { const q = await Question.create(req.body); triggerClaudeJudge(q); res.json(q); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

async function triggerClaudeJudge(question) {
    if (!question.scholar) return;
    const scholar = question.scholar;
    const hasLit = scholar.literature && scholar.literature.length > 0;
    const delay = hasLit ? 30000 : 3000;
    setTimeout(async function() {
        try { const q = await Question.findById(question._id); if (!q) return;
            if (hasLit) { let r = false; for (let i = 0; i < q.answers.length; i++) { if (q.answers[i].isScholarResponse) { r = true; break; } } if (r) return; }
            const reason = hasLit ? 'timeout_5min' : 'no_literature';
            const ans = await generateAIResponse(q, scholar, reason);
            q.answers.push({ username: 'Juge Claude', userId: 0, content: ans, language: q.language || 'fr', date: new Date().toLocaleDateString('fr-FR'), isClaude: true, claudeReason: reason });
            q.status = 'claude_answered'; await q.save();
            console.log('Claude: ' + q.title);
        } catch (e) { console.error('trigger: ' + e.message); }
    }, delay);
}

app.post('/api/questions/:id/answers', async function(req, res) {
    try { const q = await Question.findById(req.params.id); if (!q) return res.status(404).json({ error: 'Non trouvee' });
        q.answers.push(req.body);
        if (req.body.isScholarResponse) q.status = 'answered';
        if (req.body.isClaude) q.status = 'claude_answered';
        await q.save(); res.json(q.answers[q.answers.length - 1]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/history', async function(req, res) { try { res.json(await History.find().sort({ timestamp: -1 }).limit(500)); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/history/:userId', async function(req, res) { try { res.json(await History.find({ userId: parseInt(req.params.userId) }).sort({ timestamp: -1 })); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/history', async function(req, res) { try { res.json(await History.create(req.body)); } catch (e) { res.status(500).json({ error: e.message }); } });

app.get('/api/health', async function(req, res) {
    try { res.json({ status: 'healthy', mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', ai: aiAvailable ? 'openrouter' : 'inactive', users: await User.countDocuments(), questions: await Question.countDocuments(), history: await History.countDocuments() }); }
    catch (e) { res.json({ status: 'error', error: e.message }); }
});

app.get('/api/test-ai', async function(req, res) {
    if (!aiAvailable) return res.json({ error: 'OpenRouter non configuree' });
    try { const t = await callOpenRouter('Qui etait Hannibal ? Une phrase.', { temperature: 0.5 }); res.json({ success: !!t, response: t || 'Aucune' }); }
    catch (e) { res.json({ success: false, error: e.message }); }
});

app.get('/admin', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'admin.html')); });

app.get('/admin-login', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'admin-login.html')); });

app.get('/logo', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'logo.html')); });

app.listen(PORT, '0.0.0.0', function() {
    console.log('');
    console.log('==========================================');
    console.log('  Scholars Connect');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  OpenRouter: ' + (aiAvailable ? 'OK' : 'MANQUANT'));
    console.log('  /logo        : Page QR Code');
    console.log('  /admin-login : Connexion admin');
    console.log('  /admin       : Panneau admin');
    console.log('==========================================');
});
