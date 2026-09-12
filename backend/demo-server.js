const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!MONGODB_URI) { console.error('MONGODB_URI non définie'); process.exit(1); }

let genAI = null;
let geminiModel = null;

if (GEMINI_API_KEY) {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        console.log('✅ Gemini API initialisée');
    } catch (e) { console.error('❌ Gemini:', e.message); }
}

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, socketTimeoutMS: 45000, family: 4
}).then(() => console.log('✅ MongoDB Atlas connecté'))
.catch(err => console.error('❌ MongoDB:', err.message));

const UserSchema = new mongoose.Schema({
    username: String, email: { type: String, unique: true }, password: String,
    role: { type: String, default: 'user' }, language: { type: String, default: 'fr' },
    domain: { type: String, default: 'Général' }, createdAt: { type: Date, default: Date.now }
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
    scholar: mongoose.Schema.Types.Mixed, answers: [AnswerSchema]
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
            await User.create({ username: 'admin', email: 'admin@scholars-connect.com', password: 'admin12345', role: 'admin', domain: 'Général' });
            console.log('✅ Admin créé');
        }
    } catch (e) {
        if (retries > 0) setTimeout(function() { initAdmin(retries - 1); }, 5000);
    }
}

mongoose.connection.once('connected', function() { initAdmin(); });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// GEMINI - RÉPONSE DANS LA LANGUE DE LA QUESTION
// ============================================================
async function generateGeminiResponse(question, scholar, reason) {
    if (!geminiModel) return generateLocalFallback(question, scholar, reason);
    try {
        var qLang = question.language || 'fr';
        var langInstruction = 'IMPORTANT: Reponds OBLIGATOIREMENT dans la meme langue que la question (code: ' + qLang + ').';
        
        var prompt = '';
        if (reason === 'no_literature') {
            prompt = 'Tu es un Juge Academique expert nomme "Juge Claude".\n' +
                langInstruction + '\n\n' +
                'DOMAINE : ' + question.domain + '\nSPECIALITE : ' + question.category + '\n' +
                'QUESTION : ' + question.title + '\nDETAILS : ' + question.content + '\n\n' +
                'Le scholar "' + scholar.name + '" ne dispose pas de litterature specifique.\n\n' +
                'Donne une reponse COMPLETE et EXPERTE dans la langue de la question.\n\n' +
                'Structure :\n1. DEFINITION / CONTEXTE\n2. REPONSE DETAILLEE (3-5 paragraphes)\n' +
                '3. POINTS CLES (3-5 points)\n4. POUR ALLER PLUS LOIN\n5. SOURCES (2-3 ouvrages)\n\n' +
                'Pas de Markdown complexe. Utilise emojis et tirets.';
        } else {
            prompt = 'Tu es un Juge Academique expert "Juge Claude".\n' +
                langInstruction + '\n\n' +
                'DOMAINE : ' + question.domain + '\nSPECIALITE : ' + question.category + '\n' +
                'QUESTION : ' + question.title + '\nDETAILS : ' + question.content + '\n\n' +
                'Le scholar "' + scholar.name + '" n\'a pas repondu dans 5 min.\n' +
                'Sa litterature : ' + (scholar.literature ? scholar.literature.join(', ') : 'Non specifiee') + '\n\n' +
                'Reponds dans la langue de la question.\n\n' +
                'Structure : 1. DEFINITION, 2. REPONSE DETAILLEE, 3. POINTS CLES, 4. REFERENCES';
        }

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        var header = '';
        if (reason === 'no_literature') {
            header = '🤖 REPONSE COMPLETE DU JUGE CLAUDE\n\n';
            header += '📋 Question : "' + question.title + '"\n';
            header += 'Le scholar ' + scholar.name + ' n\'a pas de litterature specifique.\n\n';
            header += '━━━━━━━━━━━━━━━━━━━━\n\n';
        } else {
            header = '⏱️ REPONSE COMPLETE DU JUGE CLAUDE (5 min)\n\n';
            header += '👨‍🎓 Scholar : ' + scholar.name + '\n';
            if (scholar.literature) header += '📖 References : ' + scholar.literature.join(', ') + '\n';
            header += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
        }

        const footer = '\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Le scholar ' + scholar.name + ' pourra completer cette reponse.';
        return header + text + footer;
    } catch (e) {
        console.error('Erreur Gemini:', e.message);
        return generateLocalFallback(question, scholar, reason);
    }
}

function generateLocalFallback(question, scholar, reason) {
    var header = reason === 'no_literature' ? '🤖 REPONSE DU JUGE CLAUDE\n\n' : '⏱️ REPONSE DU JUGE CLAUDE (5 min)\n\n';
    var body = '📖 Cette question releve du domaine ' + question.domain + ' (' + question.category + ').\n\n';
    body += '✅ Scholar : ' + scholar.name + ' (' + scholar.expertise + ')\n';
    body += '📚 References : ' + (scholar.literature ? scholar.literature.join(', ') : 'Non specifiees') + '\n\n';
    return header + body + '💡 Le scholar pourra completer.';
}

// ============================================================
// ROUTES HTML
// ============================================================
app.get('/', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/admin', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'admin.html')); });

// ============================================================
// PAGE /logo AVEC QR CODE
// ============================================================
app.get('/logo', function(req, res) {
    var baseUrl = req.protocol + '://' + req.get('host');
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(baseUrl);
    
    var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Scholars Connect - Logo</title><style>' +
        '*{margin:0;padding:0;box-sizing:border-box}body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#0a0e27;font-family:Segoe UI,sans-serif;padding:20px}' +
        '.card{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:24px;padding:40px;max-width:500px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(102,126,234,0.4)}' +
        '.icon{font-size:64px;margin-bottom:12px}.title{color:white;font-size:32px;font-weight:700}.sub{color:rgba(255,255,255,0.85);font-size:16px;margin-top:8px}' +
        '.badges{display:flex;justify-content:center;gap:8px;margin:16px 0;flex-wrap:wrap}.badge{background:rgba(255,255,255,0.15);color:white;padding:4px 12px;border-radius:12px;font-size:12px}' +
        '.qr{background:white;padding:16px;border-radius:16px;display:inline-block;margin:20px 0}.qr img{display:block;width:250px;height:250px}' +
        '.url{background:rgba(0,0,0,0.3);color:white;padding:12px 16px;border-radius:12px;font-family:monospace;font-size:13px;word-break:break-all;margin:15px 0}' +
        '.status{display:inline-block;background:#22c55e;color:#0a0e27;padding:6px 18px;border-radius:20px;font-weight:600;font-size:14px}' +
        '.actions{display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap}' +
        '.btn{background:white;border:none;padding:12px 24px;border-radius:12px;font-weight:600;cursor:pointer;color:#667eea;font-size:14px;text-decoration:none;display:inline-block}' +
        '.btn-green{background:#22c55e;color:white}' +
        '</style></head><body><div class="card"><div class="icon">🎓</div><div class="title">Scholars Connect</div><div class="sub">Plateforme academique multilingue</div>' +
        '<div class="badges"><span class="badge">🍃 MongoDB</span><span class="badge">🤖 Gemini IA</span><span class="badge">🎤 Vocal</span><span class="badge">🌐 7 langues</span></div>' +
        '<div class="qr"><img src="' + qrUrl + '" alt="QR"></div><div class="url">' + baseUrl + '</div><div class="status">🟢 EN LIGNE</div>' +
        '<div class="actions"><button class="btn" onclick="copyUrl()">📋 Copier</button><a href="/" class="btn btn-green">🚀 Ouvrir</a></div></div>' +
        '<script>function copyUrl(){navigator.clipboard.writeText("' + baseUrl + '").then(function(){alert("Lien copie")})}</script></body></html>';
    
    res.send(html);
});

// ============================================================
// API - ANALYSE INTELLIGENTE COMPLÈTE
// ============================================================
app.post('/api/analyze-question', async function(req, res) {
    try {
        var questionText = req.body.text;
        if (!questionText) return res.status(400).json({ error: 'Texte manquant' });
        
        var detectedLang = 'fr';
        if (/[\u0600-\u06FF]/.test(questionText)) detectedLang = 'ar';
        else if (/[\u4E00-\u9FFF]/.test(questionText)) detectedLang = 'zh';
        else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(questionText)) detectedLang = 'ja';
        else if (/[\uAC00-\uD7AF]/.test(questionText)) detectedLang = 'ko';
        else if (/[\u0400-\u04FF]/.test(questionText)) detectedLang = 'ru';
        else if (/[\u0900-\u097F]/.test(questionText)) detectedLang = 'hi';
        
        if (!geminiModel) {
            return res.json({ title: questionText.substring(0, 80), domain: 'Général', category: 'Histoire', language: detectedLang, content: questionText });
        }
        
        var prompt = 'Tu es un assistant academique expert. Analyse cette question et detecte TOUS ses indicateurs.\n\n' +
            'QUESTION : "' + questionText + '"\n\n' +
            'Retourne UNIQUEMENT un JSON valide :\n' +
            '{\n' +
            '  "title": "Titre court et clair (max 80 car, SANS point final)",\n' +
            '  "domain": "UN SEUL parmi : Islam, Medecine, Pharmacie, Chimie, IA, IoT, GMAO, Mecanique Petrole, Gestion, Expertise Comptable, Droit, Economie, Culture Generale, Art, Architecture, Restauration, General",\n' +
            '  "category": "Specialite precise",\n' +
            '  "language": "fr|ar|en|es|de|it|pt|zh|ja|ko|ru|hi",\n' +
            '  "content": "Reformulation propre en ' + detectedLang + '",\n' +
            '  "confidence": 0-100\n' +
            '}\n\n' +
            'IMPORTANT : Reponds en JSON pur, sans markdown.';
        
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        var text = response.text();
        text = text.split('`json').join('').split('`').join('').trim();
        
        try {
            var parsed = JSON.parse(text);
            if (!parsed.title) parsed.title = questionText.substring(0, 80);
            if (!parsed.domain) parsed.domain = 'Général';
            if (!parsed.category) parsed.category = 'Général';
            if (!parsed.language) parsed.language = detectedLang;
            if (!parsed.content) parsed.content = questionText;
            res.json(parsed);
        } catch (e) {
            res.json({ title: questionText.substring(0, 80), domain: 'Général', category: 'Histoire', language: detectedLang, content: questionText });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================================
// API - TRADUCTION
// ============================================================
app.post('/api/translate', async function(req, res) {
    try {
        const text = req.body.text;
        const targetLang = req.body.targetLang;
        
        if (!text || !targetLang) return res.status(400).json({ error: 'Text et targetLang requis' });
        
        if (!geminiModel) return res.json({ translation: text, error: 'Gemini non disponible' });
        
        const langNames = { 'fr': 'Francais', 'ar': 'Arabe', 'en': 'Anglais', 'es': 'Espagnol', 'de': 'Allemand', 'it': 'Italien', 'pt': 'Portugais', 'zh': 'Chinois', 'ja': 'Japonais', 'ko': 'Coreen', 'ru': 'Russe', 'hi': 'Hindi' };
        const targetName = langNames[targetLang] || targetLang;
        
        const prompt = 'Traduis ce texte en ' + targetName + ' de maniere precise et naturelle.\n\n' +
            'TEXTE :\n' + text + '\n\n' +
            'Retourne UNIQUEMENT la traduction en ' + targetName + '.';
        
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        
        res.json({ translation: response.text(), targetLang: targetLang, targetName: targetName });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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

app.post('/api/users', async function(req, res) {
    try {
        const existing = await User.findOne({ email: req.body.email });
        if (existing) return res.status(400).json({ error: 'Email déjà utilisé' });
        const user = await User.create(req.body);
        var u = user.toObject(); delete u.password; res.json(u);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async function(req, res) {
    try { res.json(await User.find().select('-password')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - QUESTIONS
// ============================================================
app.get('/api/questions', async function(req, res) {
    try { res.json(await Question.find().sort({ timestamp: -1 })); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/questions', async function(req, res) {
    try {
        const question = await Question.create(req.body);
        triggerClaudeJudge(question);
        res.json(question);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

async function triggerClaudeJudge(question) {
    if (!question.scholar) return;
    const scholar = question.scholar;
    
    if (!scholar.literature || scholar.literature.length === 0) {
        setTimeout(async function() {
            try {
                const answer = await generateGeminiResponse(question, scholar, 'no_literature');
                const q = await Question.findById(question._id);
                if (!q) return;
                q.answers.push({ username: 'Juge Claude', userId: 0, content: answer, language: q.language || 'fr', date: new Date().toLocaleDateString('fr-FR'), isClaude: true, claudeReason: 'no_literature' });
                q.status = 'claude_answered';
                await q.save();
                console.log('✅ Juge Claude Q#' + q._id);
            } catch (e) { console.error(e.message); }
        }, 3000);
        return;
    }
    
    setTimeout(async function() {
        try {
            const q = await Question.findById(question._id);
            if (!q) return;
            var responded = false;
            for (var i = 0; i < q.answers.length; i++) if (q.answers[i].isScholarResponse) { responded = true; break; }
            if (!responded) {
                const answer = await generateGeminiResponse(q, q.scholar, 'timeout_5min');
                q.answers.push({ username: 'Juge Claude', userId: 0, content: answer, language: q.language || 'fr', date: new Date().toLocaleDateString('fr-FR'), isClaude: true, claudeReason: 'timeout_5min' });
                q.status = 'claude_answered';
                await q.save();
                console.log('✅ Juge Claude (5min) Q#' + q._id);
            }
        } catch (e) { console.error(e.message); }
    }, 30000);
}

app.post('/api/questions/:id/answers', async function(req, res) {
    try {
        const q = await Question.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Non trouvée' });
        q.answers.push(req.body);
        if (req.body.isScholarResponse) q.status = 'answered';
        if (req.body.isClaude) q.status = 'claude_answered';
        await q.save();
        res.json(q.answers[q.answers.length - 1]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - HISTORIQUE
// ============================================================
app.get('/api/history', async function(req, res) {
    try { res.json(await History.find().sort({ timestamp: -1 }).limit(500)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/history/:userId', async function(req, res) {
    try { res.json(await History.find({ userId: parseInt(req.params.userId) }).sort({ timestamp: -1 })); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/history', async function(req, res) {
    try { res.json(await History.create(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - SANTÉ ET TEST
// ============================================================
app.get('/api/health', async function(req, res) {
    try {
        res.json({
            status: 'healthy',
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            gemini: geminiModel ? 'active' : 'inactive',
            users: await User.countDocuments(),
            questions: await Question.countDocuments(),
            history: await History.countDocuments(),
            timestamp: new Date().toISOString()
        });
    } catch (e) { res.json({ status: 'error', error: e.message }); }
});

app.get('/api/test-gemini', async function(req, res) {
    if (!geminiModel) return res.json({ error: 'Gemini non configurée' });
    try {
        const result = await geminiModel.generateContent('Qui était Hannibal ? En 2 phrases.');
        const response = await result.response;
        res.json({ success: true, response: response.text() });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.listen(PORT, '0.0.0.0', function() {
    console.log('==========================================');
    console.log('  Scholars Connect - MongoDB + Gemini');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  MongoDB: ' + (mongoose.connection.readyState === 1 ? 'Connecté' : 'Connexion...'));
    console.log('  Gemini: ' + (geminiModel ? 'Actif' : 'Inactif'));
    console.log('  /logo: Page QR Code');
    console.log('==========================================');
});
