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
        console.log('✅ Gemini API initialisée (gemini-3.6-flash)');
    } catch (e) { console.error('❌ Gemini:', e.message); }
} else {
    console.log('⚠️ GEMINI_API_KEY manquante');
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
            await User.create({ username: 'admin', email: 'admin@scholars-connect.com', password: '%DaliMBA00931', role: 'admin', domain: 'Général' });
            console.log('✅ Admin créé');
        } else {
            existing.password = '%DaliMBA00931';
            await existing.save();
            console.log('✅ Admin MP mis à jour');
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
    if (!geminiModel) {
        console.error('❌ Gemini non disponible - utilisation fallback');
        return generateLocalFallback(question, scholar, reason);
    }
    
    try {
        var qLang = question.language || 'fr';
        var langInstruction = 'CRITICAL: You MUST respond in the SAME LANGUAGE as the question. Language code: ' + qLang + '. If the question is in Arabic, respond in Arabic. If English, respond in English. If French, respond in French.';
        
        var prompt = '';
        if (reason === 'no_literature') {
            prompt = 'You are an expert academic judge named "Juge Claude".\n' +
                langInstruction + '\n\n' +
                'DOMAIN: ' + question.domain + '\nSPECIALTY: ' + question.category + '\n' +
                'QUESTION: ' + question.title + '\nDETAILS: ' + question.content + '\n\n' +
                'The scholar "' + scholar.name + '" has no specific literature on this topic.\n\n' +
                'Provide a COMPLETE and EXPERT answer in the SAME LANGUAGE as the question.\n\n' +
                'Structure your answer:\n' +
                '1. DEFINITION / CONTEXT\n' +
                '2. DETAILED ANSWER (3-5 paragraphs)\n' +
                '3. KEY POINTS (3-5 bullet points)\n' +
                '4. FURTHER READING\n' +
                '5. SOURCES (2-3 references)\n\n' +
                'Do NOT use markdown formatting. Use plain text with emojis and dashes only.';
        } else {
            prompt = 'You are an expert academic judge named "Juge Claude".\n' +
                langInstruction + '\n\n' +
                'DOMAIN: ' + question.domain + '\nSPECIALTY: ' + question.category + '\n' +
                'QUESTION: ' + question.title + '\nDETAILS: ' + question.content + '\n\n' +
                'The scholar "' + scholar.name + '" did not respond within 5 minutes.\n' +
                'Scholar\'s literature: ' + (scholar.literature ? scholar.literature.join(', ') : 'Not specified') + '\n\n' +
                'Respond in the SAME LANGUAGE as the question.\n\n' +
                'Structure: 1. DEFINITION, 2. DETAILED ANSWER, 3. KEY POINTS, 4. SOURCES';
        }

        console.log('🤖 Appel Gemini pour:', question.title, '| Langue:', qLang);
        
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Réponse Gemini reçue (' + text.length + ' caractères)');

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
        console.error('❌ Erreur Gemini:', e.message);
        return generateLocalFallback(question, scholar, reason);
    }
}

function generateLocalFallback(question, scholar, reason) {
    var header = reason === 'no_literature' ? '🤖 REPONSE DU JUGE CLAUDE\n\n' : '⏱️ REPONSE DU JUGE CLAUDE (5 min)\n\n';
    var body = '📖 Cette question releve du domaine ' + question.domain + ' (' + question.category + ').\n\n';
    body += '✅ Scholar : ' + scholar.name + '\n';
    body += '📚 References : ' + (scholar.literature ? scholar.literature.join(', ') : 'Non specifiees') + '\n\n';
    return header + body + '⚠️ Gemini IA non disponible - Reponse en mode degrade.';
}

// ============================================================
// ROUTES HTML
// ============================================================
app.get('/', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/admin', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'admin.html')); });

// ============================================================
// PAGE /admin-login
// ============================================================
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
        '.form-group input{width:100%;padding:14px;border-radius:10px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.95);color:#0a0e27;font-size:15px;font-weight:500}' +
        '.form-group input:focus{outline:none;border-color:#22c55e;background:white}' +
        '.btn{width:100%;padding:15px;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:16px;background:#22c55e;color:white;transition:0.3s}' +
        '.btn:hover{background:#16a34a;transform:translateY(-2px)}' +
        '.status{margin-top:15px;padding:12px;border-radius:8px;font-size:13px;text-align:center;display:none}' +
        '.status.success{background:#22c55e;color:white;display:block}' +
        '.status.error{background:#ef4444;color:white;display:block}' +
        '.info{margin-top:20px;padding:15px;background:rgba(0,0,0,0.2);border-radius:10px;color:white;font-size:12px;text-align:center}' +
        '</style></head><body>' +
        '<div class="card">' +
        '<div class="icon">⚙️</div>' +
        '<div class="title">Accès Admin</div>' +
        '<div class="subtitle">Plateforme Scholars Connect</div>' +
        '<form onsubmit="doLogin(event)">' +
        '<div class="form-group"><label>Email</label>' +
        '<input type="email" id="email" value="admin@scholars-connect.com" readonly style="background:rgba(255,255,255,0.7)"></div>' +
        '<div class="form-group"><label>Mot de passe</label>' +
        '<input type="password" id="password" value="%DaliMBA00931"></div>' +
        '<button type="submit" class="btn">🔐 Se connecter</button>' +
        '</form>' +
        '<div class="status" id="status"></div>' +
        '<div class="info">🔒 Page sécurisée - Accès réservé aux administrateurs</div>' +
        '</div>' +
        '<script>' +
        'async function doLogin(e){' +
        'e.preventDefault();' +
        'var email=document.getElementById("email").value;' +
        'var pwd=document.getElementById("password").value;' +
        'var st=document.getElementById("status");' +
        'st.className="status";st.textContent="⏳ Connexion...";' +
        'try{' +
        'var r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email,password:pwd})});' +
        'var data=await r.json();' +
        'if(r.ok&&data.role==="admin"){' +
        'localStorage.setItem("sc_admin_session",JSON.stringify(data));' +
        'st.className="status success";st.textContent="✅ Connexion réussie ! Redirection...";' +
        'setTimeout(function(){window.location.href="/admin";},800);' +
        '}else{' +
        'st.className="status error";st.textContent="❌ "+(data.error||"Accès refusé");' +
        '}' +
        '}catch(err){st.className="status error";st.textContent="❌ Erreur réseau";}' +
        '}' +
        '</script></body></html>';
    res.send(html);
});

// ============================================================
// PAGE /logo AVEC QR CODE
// ============================================================
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
        '.btn-green{background:#22c55e;color:white}' +
        '.btn-blue{background:#3b82f6;color:white}' +
        '@media(max-width:600px){.title{font-size:26px}.qr-container img{width:250px;height:250px}}' +
        '</style></head><body>' +
        '<div class="card">' +
        '<div class="icon">🎓</div>' +
        '<div class="title">Scholars Connect</div>' +
        '<div class="subtitle">Plateforme académique multilingue</div>' +
        '<div class="qr-container"><img src="' + qrUrl + '" alt="QR Code"></div>' +
        '<div class="url">' + baseUrl + '</div>' +
        '<div class="status">🟢 EN LIGNE</div>' +
        '<div class="actions">' +
        '<button class="btn" onclick="copyUrl()">📋 Copier</button>' +
        '<button class="btn btn-blue" onclick="downloadQR()">⬇️ Télécharger QR</button>' +
        '<a href="/" class="btn btn-green">🚀 Ouvrir</a>' +
        '</div>' +
        '</div>' +
        '<script>' +
        'function copyUrl(){navigator.clipboard.writeText("' + baseUrl + '").then(function(){alert("✅ Lien copié !")})}' +
        'function downloadQR(){var link=document.createElement("a");link.href="' + qrUrl + '";link.download="scholars-connect-qr.png";link.click();}' +
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
        
        var prompt = 'Analyze this question and return ONLY a valid JSON.\n\n' +
            'QUESTION: "' + questionText + '"\n\n' +
            'Return JSON:\n' +
            '{\n' +
            '  "title": "Short title (max 80 chars)",\n' +
            '  "domain": "ONE of: Islam, Medecine, Pharmacie, Chimie, IA, IoT, GMAO, Mecanique Petrole, Gestion, Expertise Comptable, Droit, Economie, Culture Generale, Art, Architecture, Restauration, General",\n' +
            '  "category": "Specific specialty",\n' +
            '  "language": "' + detectedLang + '",\n' +
            '  "content": "Reformulation in ' + detectedLang + '"\n' +
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
        
        const langNames = { 'fr': 'French', 'ar': 'Arabic', 'en': 'English', 'es': 'Spanish', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'ru': 'Russian', 'hi': 'Hindi' };
        const targetName = langNames[targetLang] || targetLang;
        
        const prompt = 'Translate this text to ' + targetName + ' accurately.\n\nTEXT:\n' + text + '\n\nReturn ONLY the translation.';
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
        console.log('📝 Nouvelle question créée:', question.title, '| Langue:', question.language);
        triggerClaudeJudge(question);
        res.json(question);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// JUGE CLAUDE - DÉLAI 5 MINUTES RÉEL
// ============================================================
async function triggerClaudeJudge(question) {
    if (!question.scholar) {
        console.log('⚠️ Pas de scholar pour la question', question._id);
        return;
    }
    const scholar = question.scholar;
    const questionLang = question.language || 'fr';
    
    console.log('⏱️ Juge Claude activé pour Q#' + question._id + ' (langue: ' + questionLang + ')');
    
    // RÈGLE 1 : Pas de littérature → réponse après 3 secondes
    if (!scholar.literature || scholar.literature.length === 0) {
        console.log('📚 Pas de littérature → réponse Claude dans 3s');
        setTimeout(async function() {
            try {
                const answer = await generateGeminiResponse(question, scholar, 'no_literature');
                const q = await Question.findById(question._id);
                if (!q) return;
                q.answers.push({ 
                    username: 'Juge Claude', 
                    userId: 0, 
                    content: answer, 
                    language: questionLang,
                    date: new Date().toLocaleDateString('fr-FR'), 
                    isClaude: true, 
                    claudeReason: 'no_literature' 
                });
                q.status = 'claude_answered';
                await q.save();
                console.log('✅ Juge Claude a répondu à Q#' + q._id + ' (' + answer.length + ' caractères)');
            } catch (e) { 
                console.error('❌ Erreur Claude no_literature:', e.message); 
            }
        }, 3000);
        return;
    }
    
    // RÈGLE 2 : Littérature présente → attendre 5 MINUTES (300000 ms)
    console.log('⏱️ Littérature présente → attente 5 minutes (300s)');
    
    setTimeout(async function() {
        try {
            const q = await Question.findById(question._id);
            if (!q) {
                console.log('⚠️ Question supprimée Q#' + question._id);
                return;
            }
            
            // Vérifier si le scholar a répondu entre-temps
            var scholarResponded = false;
            for (var i = 0; i < q.answers.length; i++) {
                if (q.answers[i].isScholarResponse) { 
                    scholarResponded = true; 
                    break; 
                }
            }
            
            if (scholarResponded) {
                console.log('✅ Scholar a répondu avant 5 min - Claude ne répond pas');
                return;
            }
            
            // Claude répond après 5 minutes
            console.log('⏱️ 5 minutes écoulées → Claude répond');
            const answer = await generateGeminiResponse(q, q.scholar, 'timeout_5min');
            q.answers.push({ 
                username: 'Juge Claude', 
                userId: 0, 
                content: answer, 
                language: questionLang,
                date: new Date().toLocaleDateString('fr-FR'), 
                isClaude: true, 
                claudeReason: 'timeout_5min' 
            });
            q.status = 'claude_answered';
            await q.save();
            console.log('✅ Juge Claude a répondu (5 min) à Q#' + q._id);
        } catch (e) { 
            console.error('❌ Erreur Claude timeout:', e.message); 
        }
    }, 300000); // 5 MINUTES RÉELLES
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
            history: await History.countDocuments(),
            timestamp: new Date().toISOString()
        });
    } catch (e) { res.json({ status: 'error', error: e.message }); }
});

app.get('/api/test-gemini', async function(req, res) {
    if (!geminiModel) return res.json({ error: 'Gemini non configurée' });
    try {
        const result = await geminiModel.generateContent('Qui était Hannibal ? Réponds en 2 phrases.');
        const response = await result.response;
        res.json({ success: true, response: response.text() });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.listen(PORT, '0.0.0.0', function() {
    console.log('==========================================');
    console.log('  Scholars Connect - MongoDB + Gemini');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  Admin: /admin-login');
    console.log('  Logo: /logo');
    console.log('  Délai Claude: 5 minutes');
    console.log('==========================================');
});
