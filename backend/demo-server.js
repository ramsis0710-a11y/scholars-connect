const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!MONGODB_URI) { console.error('MONGODB_URI non definie'); process.exit(1); }

let aiAvailable = false;
if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.startsWith('sk-or-') && OPENROUTER_API_KEY.length > 20) {
    aiAvailable = true;
    console.log('OpenRouter configure (cle ' + OPENROUTER_API_KEY.substring(0, 12) + '...)');
} else {
    console.log('OPENROUTER_API_KEY absente ou invalide');
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
            await User.create({ username: 'admin', email: 'admin@scholars-connect.com', password: 'admin12345', role: 'admin', domain: 'General' });
            console.log('Admin cree');
        } else {
            existing.password = 'admin12345';
            existing.role = 'admin';
            await existing.save();
            console.log('Admin mis a jour');
        }
    } catch (e) {
        if (retries > 0) setTimeout(function() { initAdmin(retries - 1); }, 5000);
    }
}
mongoose.connection.once('connected', function() { initAdmin(); });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const LANG_NAMES = {
    'fr':'French','ar':'Arabic','en':'English','es':'Spanish','de':'German','it':'Italian',
    'pt':'Portuguese','zh':'Chinese','ja':'Japanese','ko':'Korean','ru':'Russian','hi':'Hindi'
};

async function callOpenRouter(prompt, options) {
    options = options || {};
    const models = [
        'deepseek/deepseek-chat-v3.1:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'qwen/qwen3-235b-a22b:free',
        'openrouter/free'
    ];
    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        try {
            console.log('Tentative modele: ' + model);
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + OPENROUTER_API_KEY,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://scholars-connect-app.onrender.com',
                    'X-Title': 'Scholars Connect'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: options.temperature !== undefined ? options.temperature : 0.7,
                    max_tokens: options.max_tokens || 2500
                })
            });
            if (response.ok) {
                const data = await response.json();
                const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
                if (text && text.length > 30) {
                    console.log('Reponse de ' + model + ' (' + text.length + ' car.)');
                    return text;
                }
            } else {
                const err = await response.text();
                console.error(model + ' erreur ' + response.status + ': ' + err.substring(0, 200));
            }
        } catch (e) {
            console.error(model + ' exception: ' + e.message);
        }
    }
    return null;
}

async function generateAIResponse(question, scholar, reason) {
    const qLang = question.language || 'fr';
    const langName = LANG_NAMES[qLang] || 'French';
    const prompt = 'You are "Juge Claude", an expert academic judge.\n' +
        'CRITICAL: You MUST respond ONLY in ' + langName + ' (language code: ' + qLang + ').\n' +
        'Do NOT use any other language. Do NOT mix languages.\n\n' +
        'DOMAIN: ' + question.domain + '\n' +
        'SPECIALTY: ' + question.category + '\n' +
        'QUESTION: ' + question.title + '\n' +
        'DETAILS: ' + question.content + '\n\n' +
        'Provide a COMPLETE and EXPERT answer in ' + langName + '.\n' +
        'Structure: 1. DEFINITION 2. DETAILED ANSWER 3. KEY POINTS 4. SOURCES';
    if (aiAvailable) {
        const text = await callOpenRouter(prompt, { temperature: 0.7, max_tokens: 2500 });
        if (text) return buildResponse(text, question, scholar, reason);
    }
    return generateLocalFallback(question, scholar, reason);
}

function buildResponse(text, question, scholar, reason) {
    let header = '';
    if (reason === 'no_literature') {
        header = 'REPONSE COMPLETE DU JUGE CLAUDE\n\nQuestion : "' + question.title + '"\n\n---\n\n';
    } else {
        header = 'REPONSE COMPLETE DU JUGE CLAUDE (5 min)\n\nScholar : ' + scholar.name + '\n\n---\n\n';
    }
    return header + text + '\n\n---\nLe scholar ' + scholar.name + ' pourra completer.';
}

function generateLocalFallback(question, scholar, reason) {
    var qLang = question.language || 'fr';
    var header = 'REPONSE DU JUGE CLAUDE\n\n';
    var generic = {
        fr: 'Cette question releve du domaine ' + question.domain + ' (' + question.category + ').\n\nScholar : ' + scholar.name,
        ar: 'هذا السؤال يتعلق بمجال ' + question.domain + ' (' + question.category + ').\n\nالعالم : ' + scholar.name,
        en: 'This question belongs to ' + question.domain + ' (' + question.category + ').\n\nScholar: ' + scholar.name
    };
    return header + (generic[qLang] || generic.fr);
}

app.post('/api/analyze-question', async function(req, res) {
    try {
        const text = req.body.text;
        if (!text) return res.status(400).json({ error: 'Texte manquant' });
        let detectedLang = 'fr';
        if (/[\u0600-\u06FF]/.test(text)) detectedLang = 'ar';
        else if (/[\u4E00-\u9FFF]/.test(text)) detectedLang = 'zh';
        else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) detectedLang = 'ja';
        else if (/[\uAC00-\uD7AF]/.test(text)) detectedLang = 'ko';
        else if (/[\u0400-\u04FF]/.test(text)) detectedLang = 'ru';
        else if (/[\u0900-\u097F]/.test(text)) detectedLang = 'hi';
        const questionMarks = (text.match(/[?？؟]/g) || []).length;
        const isMultiQuestion = questionMarks >= 2;
        if (!aiAvailable) {
            return res.json({
                title: text.substring(0, 80), domain: 'General', category: 'Histoire',
                language: detectedLang, content: text, isMultiQuestion: isMultiQuestion,
                subQuestions: isMultiQuestion ? [{ title: text.substring(0, 80), content: text }] : []
            });
        }
        const prompt = 'Analyze this text and return ONLY valid JSON:\n' +
            '{"title":"Short title","domain":"Islam|Medecine|Pharmacie|Chimie|IA|IoT|GMAO|Mecanique Petrole|Gestion|Expertise Comptable|Droit|Economie|Culture Generale|Art|Architecture|Restauration|General","category":"Specialty","language":"' + detectedLang + '","content":"Reformulation","isMultiQuestion":true/false,"subQuestions":[{"title":"...","content":"..."}]}\n\n' +
            'TEXT: "' + text + '"';
        const aiText = await callOpenRouter(prompt, { temperature: 0.3, max_tokens: 1500 });
        if (aiText) {
            let cleanText = aiText.split('```json').join('').split('```').join('').trim();
            try {
                const parsed = JSON.parse(cleanText);
                if (!parsed.title) parsed.title = text.substring(0, 80);
                if (!parsed.domain) parsed.domain = 'General';
                if (!parsed.category) parsed.category = 'General';
                if (!parsed.language) parsed.language = detectedLang;
                if (!parsed.content) parsed.content = text;
                if (parsed.isMultiQuestion === undefined) parsed.isMultiQuestion = isMultiQuestion;
                if (!parsed.subQuestions) parsed.subQuestions = [];
                return res.json(parsed);
            } catch (e) { console.error('JSON parse error:', e.message); }
        }
        res.json({ title: text.substring(0, 80), domain: 'General', category: 'Histoire', language: detectedLang, content: text, isMultiQuestion: isMultiQuestion, subQuestions: [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/translate', async function(req, res) {
    try {
        const text = req.body.text, targetLang = req.body.targetLang;
        if (!text || !targetLang) return res.status(400).json({ error: 'Parametres manquants' });
        if (!aiAvailable) return res.json({ translation: text, targetLang: targetLang });
        const targetName = LANG_NAMES[targetLang] || targetLang;
        const prompt = 'Translate the following text into ' + targetName + ' accurately. Return ONLY the translation.\n\nTEXT:\n' + text;
        const translation = await callOpenRouter(prompt, { temperature: 0.2, max_tokens: 2000 });
        if (translation) return res.json({ translation: translation, targetLang: targetLang, targetName: targetName });
        res.json({ translation: text, targetLang: targetLang });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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
        if (existing) return res.status(400).json({ error: 'Email deja utilise' });
        const user = await User.create(req.body);
        var u = user.toObject(); delete u.password; res.json(u);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async function(req, res) {
    try { res.json(await User.find().select('-password')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

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
    const hasLiterature = scholar.literature && scholar.literature.length > 0;
    const delay = hasLiterature ? 30000 : 3000;
    setTimeout(async function() {
        try {
            const q = await Question.findById(question._id);
            if (!q) return;
            if (hasLiterature) {
                let responded = false;
                for (let i = 0; i < q.answers.length; i++) {
                    if (q.answers[i].isScholarResponse) { responded = true; break; }
                }
                if (responded) return;
            }
            const reason = hasLiterature ? 'timeout_5min' : 'no_literature';
            const answer = await generateAIResponse(q, scholar, reason);
            q.answers.push({
                username: 'Juge Claude', userId: 0, content: answer,
                language: q.language || 'fr', date: new Date().toLocaleDateString('fr-FR'),
                isClaude: true, claudeReason: reason
            });
            q.status = 'claude_answered';
            await q.save();
            console.log('Juge Claude a repondu a: ' + q.title);
        } catch (e) { console.error('triggerClaudeJudge: ' + e.message); }
    }, delay);
}

app.post('/api/questions/:id/answers', async function(req, res) {
    try {
        const q = await Question.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Non trouvee' });
        q.answers.push(req.body);
        if (req.body.isScholarResponse) q.status = 'answered';
        if (req.body.isClaude) q.status = 'claude_answered';
        await q.save();
        res.json(q.answers[q.answers.length - 1]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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

app.get('/api/health', async function(req, res) {
    try {
        res.json({
            status: 'healthy',
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            ai: aiAvailable ? 'openrouter' : 'inactive',
            users: await User.countDocuments(),
            questions: await Question.countDocuments(),
            history: await History.countDocuments()
        });
    } catch (e) { res.json({ status: 'error', error: e.message }); }
});

app.get('/api/test-ai', async function(req, res) {
    if (!aiAvailable) return res.json({ error: 'OpenRouter non configuree' });
    try {
        const text = await callOpenRouter('Qui etait Hannibal ? Reponds en une phrase.', { temperature: 0.5 });
        res.json({ success: !!text, response: text || 'Aucune reponse' });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.get('/', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/admin', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'admin.html')); });

app.get('/admin-login', function(req, res) {
    var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<title>Admin - Connexion</title>' +
        '<style>' +
        '*{margin:0;padding:0;box-sizing:border-box}' +
        'body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a0e27,#1a1a3e);font-family:Segoe UI,sans-serif;padding:20px}' +
        '.card{background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:24px;padding:40px;max-width:450px;width:100%;box-shadow:0 25px 70px rgba(245,158,11,0.4)}' +
        '.icon{font-size:64px;text-align:center;margin-bottom:15px}' +
        '.title{color:white;font-size:28px;font-weight:700;text-align:center;margin-bottom:8px}' +
        '.subtitle{color:rgba(255,255,255,0.9);text-align:center;font-size:14px;margin-bottom:25px}' +
        '.form-group{margin-bottom:18px}' +
        '.form-group label{display:block;color:white;font-weight:600;margin-bottom:6px;font-size:14px}' +
        '.form-group input{width:100%;padding:14px;border-radius:10px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.95);color:#0a0e27;font-size:15px}' +
        '.btn{width:100%;padding:15px;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:16px;background:#22c55e;color:white}' +
        '.status{margin-top:15px;padding:12px;border-radius:8px;font-size:13px;text-align:center;display:none}' +
        '.status.success{background:#22c55e;color:white;display:block}' +
        '.status.error{background:#ef4444;color:white;display:block}' +
        '.info{margin-top:20px;padding:15px;background:rgba(0,0,0,0.2);border-radius:10px;color:white;font-size:12px;text-align:center}' +
        '</style></head><body>' +
        '<div class="card">' +
        '<div class="icon">&#9881;</div>' +
        '<div class="title">Acces Admin</div>' +
        '<div class="subtitle">Scholars Connect</div>' +
        '<form onsubmit="doLogin(event)">' +
        '<div class="form-group"><label>Email</label>' +
        '<input type="email" id="email" value="admin@scholars-connect.com" readonly style="background:rgba(255,255,255,0.7)"></div>' +
        '<div class="form-group"><label>Mot de passe</label>' +
        '<input type="password" id="password" placeholder="Mot de passe admin"></div>' +
        '<button type="submit" class="btn">Se connecter</button>' +
        '</form>' +
        '<div class="status" id="status"></div>' +
        '<div class="info">Acces reserve aux administrateurs</div>' +
        '</div>' +
        '<script>' +
        'async function doLogin(e){' +
        'e.preventDefault();' +
        'var email=document.getElementById("email").value;' +
        'var pwd=document.getElementById("password").value;' +
        'var st=document.getElementById("status");' +
        'st.className="status";st.textContent="Connexion...";' +
        'try{' +
        'var r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email,password:pwd})});' +
        'var data=await r.json();' +
        'if(r.ok&&data.role==="admin"){' +
        'localStorage.setItem("sc_admin_session",JSON.stringify(data));' +
        'st.className="status success";st.textContent="Connexion reussie !";' +
        'setTimeout(function(){window.location.href="/admin";},800);' +
        '}else{st.className="status error";st.textContent=(data.error||"Acces refuse");}' +
        '}catch(err){st.className="status error";st.textContent="Erreur reseau";}' +
        '}' +
        '</script></body></html>';
    res.send(html);
});

app.get('/logo', function(req, res) {
    var baseUrl = req.protocol + '://' + req.get('host');
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(baseUrl);
    var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<title>Scholars Connect - QR Code</title>' +
        '<style>' +
        '*{margin:0;padding:0;box-sizing:border-box}' +
        'body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a0e27,#1a1a3e);font-family:Segoe UI,sans-serif;padding:20px}' +
        '.card{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:24px;padding:40px;max-width:600px;width:100%;text-align:center;box-shadow:0 25px 70px rgba(102,126,234,0.5)}' +
        '.icon{font-size:80px;margin-bottom:15px}' +
        '.title{color:white;font-size:38px;font-weight:700;margin-bottom:8px}' +
        '.subtitle{color:rgba(255,255,255,0.9);font-size:17px;margin-bottom:20px}' +
        '.qr-container{background:white;padding:20px;border-radius:20px;display:inline-block;margin:25px 0}' +
        '.qr-container img{display:block;width:350px;height:350px}' +
        '.url{background:rgba(0,0,0,0.3);color:white;padding:15px 20px;border-radius:12px;font-family:monospace;font-size:14px;word-break:break-all;margin:20px 0}' +
        '.status{display:inline-block;background:#22c55e;color:white;padding:8px 24px;border-radius:25px;font-weight:700;font-size:16px;margin:10px 0}' +
        '.actions{display:flex;gap:12px;justify-content:center;margin-top:25px;flex-wrap:wrap}' +
        '.btn{background:white;border:none;padding:15px 30px;border-radius:12px;font-weight:700;cursor:pointer;color:#667eea;font-size:15px;text-decoration:none;display:inline-block}' +
        '.btn-green{background:#22c55e;color:white}.btn-blue{background:#3b82f6;color:white}' +
        '@media(max-width:600px){.title{font-size:26px}.qr-container img{width:250px;height:250px}}' +
        '</style></head><body><div class="card">' +
        '<div class="icon">&#127891;</div><div class="title">Scholars Connect</div>' +
        '<div class="subtitle">Plateforme academique multilingue</div>' +
        '<div class="qr-container"><img src="' + qrUrl + '" alt="QR Code"></div>' +
        '<div class="url">' + baseUrl + '</div>' +
        '<div class="status">EN LIGNE</div>' +
        '<div class="actions">' +
        '<button class="btn" onclick="navigator.clipboard.writeText(\'' + baseUrl + '\').then(function(){alert(\'Copie !\')})">Copier</button>' +
        '<button class="btn btn-blue" onclick="var a=document.createElement(\'a\');a.href=\'' + qrUrl + '\';a.download=\'scholars-connect-qr.png\';a.click();">Telecharger</button>' +
        '<a href="/" class="btn btn-green">Ouvrir</a>' +
        '</div></div></body></html>';
    res.send(html);
});

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
    console.log('');
});
