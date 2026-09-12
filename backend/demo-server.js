const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!MONGODB_URI) { console.error('MONGODB_URI non définie'); process.exit(1); }

let genAI = null, geminiModel = null;
if (GEMINI_API_KEY) {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        console.log('✅ Gemini API initialisée');
    } catch (e) { console.error('❌ Gemini:', e.message); }
}

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 45000, family: 4 })
    .then(() => console.log('✅ MongoDB Atlas connecté'))
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

async function generateGeminiResponse(question, scholar, reason) {
    if (!geminiModel) return generateLocalFallback(question, scholar, reason);
    try {
        var qLang = question.language || 'fr';
        var langInstruction = 'IMPORTANT: Reponds OBLIGATOIREMENT dans la meme langue que la question (code: ' + qLang + ').';
        var prompt = '';
        if (reason === 'no_literature') {
            prompt = 'Tu es un Juge Academique expert "Juge Claude".\n' + langInstruction + '\n\n' +
                'DOMAINE : ' + question.domain + '\nSPECIALITE : ' + question.category + '\n' +
                'QUESTION : ' + question.title + '\nDETAILS : ' + question.content + '\n\n' +
                'Le scholar "' + scholar.name + '" ne dispose pas de litterature specifique.\n\n' +
                'Donne une reponse COMPLETE et EXPERTE.\n\n' +
                'Structure : 1. DEFINITION 2. REPONSE DETAILLEE (3-5 paragraphes) 3. POINTS CLES 4. POUR ALLER PLUS LOIN 5. SOURCES';
        } else {
            prompt = 'Tu es un Juge Academique expert "Juge Claude".\n' + langInstruction + '\n\n' +
                'DOMAINE : ' + question.domain + '\nSPECIALITE : ' + question.category + '\n' +
                'QUESTION : ' + question.title + '\nDETAILS : ' + question.content + '\n\n' +
                'Le scholar "' + scholar.name + '" n\'a pas repondu.\n' +
                'Sa litterature : ' + (scholar.literature ? scholar.literature.join(', ') : 'Non specifiee');
        }
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        var header = '';
        if (reason === 'no_literature') {
            header = '🤖 REPONSE COMPLETE DU JUGE CLAUDE\n\n📋 Question : "' + question.title + '"\n';
            header += 'Le scholar ' + scholar.name + ' n\'a pas de litterature specifique.\n\n━━━━━━━━━━━━━━━━━━━━\n\n';
        } else {
            header = '⏱️ REPONSE COMPLETE DU JUGE CLAUDE (5 min)\n\n👨‍🎓 Scholar : ' + scholar.name + '\n';
            if (scholar.literature) header += '📖 References : ' + scholar.literature.join(', ') + '\n';
            header += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
        }
        return header + text + '\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Le scholar ' + scholar.name + ' pourra completer.';
    } catch (e) {
        return generateLocalFallback(question, scholar, reason);
    }
}

function generateLocalFallback(question, scholar, reason) {
    var header = reason === 'no_literature' ? '🤖 REPONSE DU JUGE CLAUDE\n\n' : '⏱️ REPONSE DU JUGE CLAUDE (5 min)\n\n';
    var body = '📖 Cette question releve du domaine ' + question.domain + ' (' + question.category + ').\n\n';
    body += '✅ Scholar : ' + scholar.name + '\n';
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
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(baseUrl);
    var qrUrlMobile = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(baseUrl);
    
    var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<title>Scholars Connect - QR Code</title>' +
        '<style>' +
        '*{margin:0;padding:0;box-sizing:border-box}' +
        'body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a0e27,#1a1a3e);font-family:Segoe UI,sans-serif;padding:20px}' +
        '.card{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:24px;padding:40px;max-width:600px;width:100%;text-align:center;box-shadow:0 25px 70px rgba(102,126,234,0.5);animation:fadeIn 0.8s}' +
        '@keyframes fadeIn{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}' +
        '.icon{font-size:80px;margin-bottom:15px;animation:bounce 2s infinite}' +
        '@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}' +
        '.title{color:white;font-size:38px;font-weight:700;letter-spacing:1px;margin-bottom:8px}' +
        '.subtitle{color:rgba(255,255,255,0.9);font-size:17px;margin-bottom:20px}' +
        '.badges{display:flex;justify-content:center;gap:10px;margin:20px 0;flex-wrap:wrap}' +
        '.badge{background:rgba(255,255,255,0.2);color:white;padding:6px 16px;border-radius:15px;font-size:13px;backdrop-filter:blur(10px)}' +
        '.qr-container{background:white;padding:20px;border-radius:20px;display:inline-block;margin:25px 0;box-shadow:0 10px 30px rgba(0,0,0,0.3)}' +
        '.qr-container img{display:block;width:350px;height:350px}' +
        '.url{background:rgba(0,0,0,0.3);color:white;padding:15px 20px;border-radius:12px;font-family:monospace;font-size:14px;word-break:break-all;margin:20px 0;backdrop-filter:blur(10px)}' +
        '.status{display:inline-block;background:#22c55e;color:white;padding:8px 24px;border-radius:25px;font-weight:700;font-size:16px;margin:10px 0;animation:pulse 2s infinite}' +
        '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}' +
        '.actions{display:flex;gap:12px;justify-content:center;margin-top:25px;flex-wrap:wrap}' +
        '.btn{background:white;border:none;padding:15px 30px;border-radius:12px;font-weight:700;cursor:pointer;color:#667eea;font-size:15px;text-decoration:none;display:inline-block;transition:all 0.3s}' +
        '.btn:hover{transform:translateY(-3px);box-shadow:0 10px 25px rgba(0,0,0,0.3)}' +
        '.btn-green{background:#22c55e;color:white}' +
        '.btn-blue{background:#3b82f6;color:white}' +
        '.instructions{color:rgba(255,255,255,0.8);font-size:14px;margin-top:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.2)}' +
        '@media(max-width:600px){.title{font-size:26px}.qr-container img{width:250px;height:250px}.card{padding:25px}}' +
        '</style></head><body>' +
        '<div class="card">' +
        '<div class="icon">🎓</div>' +
        '<div class="title">Scholars Connect</div>' +
        '<div class="subtitle">Plateforme académique multilingue</div>' +
        '<div class="badges">' +
        '<span class="badge">🍃 MongoDB</span>' +
        '<span class="badge">🤖 Gemini IA</span>' +
        '<span class="badge">🎤 Vocal</span>' +
        '<span class="badge">🌐 12 langues</span>' +
        '</div>' +
        '<div class="qr-container">' +
        '<img src="' + qrUrl + '" alt="QR Code">' +
        '</div>' +
        '<div class="url">' + baseUrl + '</div>' +
        '<div class="status">🟢 EN LIGNE</div>' +
        '<div class="actions">' +
        '<button class="btn" onclick="copyUrl()">📋 Copier le lien</button>' +
        '<button class="btn btn-blue" onclick="downloadQR()">⬇️ Télécharger QR</button>' +
        '<a href="/" class="btn btn-green">🚀 Ouvrir l\'application</a>' +
        '</div>' +
        '<div class="instructions">📱 Scannez ce QR code avec votre téléphone pour accéder à l\'application</div>' +
        '</div>' +
        '<script>' +
        'function copyUrl(){navigator.clipboard.writeText("' + baseUrl + '").then(function(){alert("✅ Lien copié !")})}' +
        'function downloadQR(){' +
        'var link=document.createElement("a");' +
        'link.href="' + qrUrl + '";' +
        'link.download="scholars-connect-qr.png";' +
        'link.click();' +
        '}' +
        '</script></body></html>';
    
    res.send(html);
});

// ============================================================
// API - ANALYSE INTELLIGENTE
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
        
        var prompt = 'Tu es un assistant academique expert. Analyse cette question.\n\n' +
            'QUESTION : "' + questionText + '"\n\n' +
            'Retourne UNIQUEMENT un JSON valide :\n' +
            '{\n' +
            '  "title": "Titre court (max 80 car)",\n' +
            '  "domain": "UN SEUL parmi : Islam, Medecine, Pharmacie, Chimie, IA, IoT, GMAO, Mecanique Petrole, Gestion, Expertise Comptable, Droit, Economie, Culture Generale, Art, Architecture, Restauration, General",\n' +
            '  "category": "Specialite precise",\n' +
            '  "language": "' + detectedLang + '",\n' +
            '  "content": "Reformulation en ' + detectedLang + '"\n' +
            '}';
        
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
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - TRADUCTION
// ============================================================
app.post('/api/translate', async function(req, res) {
    try {
        const text = req.body.text, targetLang = req.body.targetLang;
        if (!text || !targetLang) return res.status(400).json({ error: 'Paramètres manquants' });
        if (!geminiModel) return res.json({ translation: text, error: 'Gemini non disponible' });
        
        const langNames = { 'fr': 'Francais', 'ar': 'Arabe', 'en': 'Anglais', 'es': 'Espagnol', 'de': 'Allemand', 'it': 'Italien', 'pt': 'Portugais', 'zh': 'Chinois', 'ja': 'Japonais', 'ko': 'Coreen', 'ru': 'Russe', 'hi': 'Hindi' };
        const targetName = langNames[targetLang] || targetLang;
        
        const prompt = 'Traduis ce texte en ' + targetName + ' de maniere precise.\n\nTEXTE :\n' + text + '\n\nRetourne UNIQUEMENT la traduction.';
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        res.json({ translation: response.text(), targetLang: targetLang, targetName: targetName });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
// API - SANTÉ
// ============================================================
app.get('/api/health', async function(req, res) {
    try {
        res.json({
            status: 'healthy',
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            gemini: geminiModel ? 'active' : 'inactive',
            users: await User.countDocuments(),
            questions: await Question.countDocuments(),
            history: await History.countDocuments()
        });
    } catch (e) { res.json({ status: 'error', error: e.message }); }
});

app.get('/api/test-gemini', async function(req, res) {
    if (!geminiModel) return res.json({ error: 'Gemini non configurée' });
    try {
        const result = await geminiModel.generateContent('Qui était Hannibal ?');
        const response = await result.response;
        res.json({ success: true, response: response.text() });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.listen(PORT, '0.0.0.0', function() {
    console.log('==========================================');
    console.log('  Scholars Connect - MongoDB + Gemini');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  /logo: Page QR Code');
    console.log('==========================================');
});
