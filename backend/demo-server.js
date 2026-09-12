const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const rag = require('./rag-engine');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!MONGODB_URI) { console.error('MONGODB_URI non definie'); process.exit(1); }

let geminiAvailable = false;
let geminiKeyType = 'none';

function detectGeminiKeyType(key) {
    if (!key) return 'none';
    if (key.startsWith('AIzaSy')) return 'legacy';
    if (key.startsWith('AQ.')) return 'new';
    return 'unknown';
}

geminiKeyType = detectGeminiKeyType(GEMINI_API_KEY);

if (GEMINI_API_KEY && (geminiKeyType === 'legacy' || geminiKeyType === 'new')) {
    geminiAvailable = true;
    console.log('OK - Gemini API initialisee (' + geminiKeyType + ')');
} else {
    console.log('ATTENTION - Cle Gemini invalide - Mode fallback');
}

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000, family: 4 })
    .then(() => console.log('OK - MongoDB connecte'))
    .catch(err => console.error('ERREUR MongoDB:', err.message));

const UserSchema = new mongoose.Schema({
    username: String, email: { type: String, unique: true }, password: String,
    role: { type: String, default: 'user' }, language: { type: String, default: 'fr' },
    domain: { type: String, default: 'General' }, createdAt: { type: Date, default: Date.now }
});

const ScholarSchema = new mongoose.Schema({
    scholarId: String, name: String, specialty: String, url: String,
    content: String, indexed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const AnswerSchema = new mongoose.Schema({
    username: String, content: String, language: String, date: String,
    timestamp: { type: Date, default: Date.now }, isClaude: Boolean,
    sources: mongoose.Schema.Types.Mixed
});

const QuestionSchema = new mongoose.Schema({
    title: String, content: String, domain: String, category: String,
    username: String, language: String, date: String,
    timestamp: { type: Date, default: Date.now }, status: { type: String, default: 'pending' },
    answers: [AnswerSchema]
});

const User = mongoose.model('User', UserSchema);
const Scholar = mongoose.model('Scholar', ScholarSchema);
const Question = mongoose.model('Question', QuestionSchema);

async function initAdmin() {
    try {
        const existing = await User.findOne({ email: 'admin@scholars-connect.com' });
        if (!existing) {
            await User.create({ username: 'admin', email: 'admin@scholars-connect.com', 
                password: '%DaliMBA00931', role: 'admin' });
            console.log('OK - Admin cree');
        }
    } catch (e) { /* ignore */ }
}
mongoose.connection.once('connected', async function() {
    await initAdmin();
    await rag.initVectorIndex();
});

app.use(express.json({ limit: '10mb' }));

// ============================================================
// ROUTES HTML
// ============================================================
app.get('/', function(req, res) {
    res.send('<h1>Scholars Connect v4</h1><p><a href="/api/health">Health</a> | <a href="/api/rag-test">Test RAG</a></p>');
});

app.get('/admin-login', function(req, res) {
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admin</title>' +
        '<style>body{font-family:Arial;background:#0a0e27;color:white;display:flex;justify-content:center;align-items:center;min-height:100vh}' +
        '.card{background:linear-gradient(135deg,#f59e0b,#d97706);padding:40px;border-radius:20px;max-width:400px}' +
        'input{width:100%;padding:12px;margin:8px 0;border-radius:8px;border:none}' +
        'button{width:100%;padding:14px;background:#22c55e;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold}' +
        '</style></head><body><div class="card"><h2>Admin Login</h2>' +
        '<form onsubmit="doLogin(event)"><input type="email" id="email" value="admin@scholars-connect.com" readonly>' +
        '<input type="password" id="password" value="%DaliMBA00931">' +
        '<button type="submit">Connexion</button></form><div id="status"></div>' +
        '<script>async function doLogin(e){e.preventDefault();' +
        'var r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},' +
        'body:JSON.stringify({email:document.getElementById("email").value,password:document.getElementById("password").value})});' +
        'var d=await r.json();if(r.ok&&d.role==="admin"){window.location.href="/admin";}' +
        'else{document.getElementById("status").textContent="Acces refuse";}}</script></div></body></html>';
    res.send(html);
});

// ============================================================
// API - SCRAPING + INDEXATION
// ============================================================
app.post('/api/scholars/scrape', async function(req, res) {
    try {
        const { urls, selectors } = req.body;
        if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: 'urls requis' });
        
        const scraper = require('./scraper');
        const scholars = await scraper.scrapeMultipleScholars(urls);
        
        const saved = [];
        for (const s of scholars) {
            const content = s.publications.map(p => p.title + ' (' + p.year + ')').join('\n');
            const scholar = await Scholar.create({
                scholarId: s.name.toLowerCase().replace(/\s+/g, '-'),
                name: s.name, specialty: s.specialty, url: s.url,
                content: content, indexed: false
            });
            saved.push(scholar);
        }
        
        res.json({ success: true, scholars: saved });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/scholars/index', async function(req, res) {
    try {
        const scholars = await Scholar.find({ indexed: false });
        for (const scholar of scholars) {
            await rag.indexScholarDocument(
                scholar.scholarId, scholar.name, scholar.content,
                { specialty: scholar.specialty, url: scholar.url }
            );
            scholar.indexed = true;
            await scholar.save();
        }
        res.json({ success: true, indexed: scholars.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/scholars', async function(req, res) {
    try { res.json(await Scholar.find()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - QUESTIONS avec RAG
// ============================================================
app.post('/api/questions', async function(req, res) {
    try {
        const question = await Question.create(req.body);
        
        if (geminiAvailable) {
            const ragResult = await rag.generateRAGResponse(question.content, question.language || 'fr');
            question.answers.push({
                username: 'Juge Claude (RAG)', content: ragResult.answer,
                language: question.language || 'fr', date: new Date().toLocaleDateString('fr-FR'),
                isClaude: true, sources: ragResult.sources
            });
            question.status = 'claude_answered';
            await question.save();
        }
        
        res.json(question);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/questions', async function(req, res) {
    try { res.json(await Question.find().sort({ timestamp: -1 })); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - AUTH
// ============================================================
app.post('/api/login', async function(req, res) {
    try {
        const user = await User.findOne({ email: req.body.email, password: req.body.password });
        if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });
        var u = user.toObject(); delete u.password; res.json(u);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - SANTE + TEST RAG
// ============================================================
app.get('/api/health', async function(req, res) {
    try {
        res.json({
            status: 'healthy',
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            gemini: geminiAvailable ? 'active' : 'fallback',
            gemini_key_type: geminiKeyType,
            scholars_indexed: await Scholar.countDocuments({ indexed: true }),
            questions: await Question.countDocuments(),
            timestamp: new Date().toISOString()
        });
    } catch (e) { res.json({ status: 'error', error: e.message }); }
});

app.get('/api/rag-test', async function(req, res) {
    if (!geminiAvailable) return res.json({ success: false, error: 'Gemini non configure' });
    try {
        const result = await rag.generateRAGResponse('Qui etait Hannibal ?', 'fr');
        res.json({ success: true, answer: result.answer, sources: result.sources });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.listen(PORT, '0.0.0.0', function() {
    console.log('==========================================');
    console.log('  Scholars Connect v4 - RAG + Vectra');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  Gemini: ' + (geminiAvailable ? 'ACTIF (' + geminiKeyType + ')' : 'FALLBACK'));
    console.log('  RAG: /api/rag-test');
    console.log('==========================================');
});