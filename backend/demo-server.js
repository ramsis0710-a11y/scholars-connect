const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!MONGODB_URI) {
    console.error('MONGODB_URI non définie');
    process.exit(1);
}

// ============================================================
// INITIALISATION GEMINI
// ============================================================
let genAI = null;
let geminiModel = null;

if (GEMINI_API_KEY) {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        console.log('✅ Gemini API initialisée (gemini-3.6-flash)');
    } catch (e) {
        console.error('❌ Erreur Gemini init:', e.message);
    }
} else {
    console.log('⚠️ GEMINI_API_KEY non définie');
}

// ============================================================
// CONNEXION MONGODB
// ============================================================
mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4
})
    .then(() => console.log('✅ MongoDB Atlas connecté'))
    .catch(err => console.error('❌ MongoDB error:', err.message));

// ============================================================
// SCHÉMAS
// ============================================================
const UserSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: 'user' },
    language: { type: String, default: 'fr' },
    domain: { type: String, default: 'Général' },
    createdAt: { type: Date, default: Date.now }
});

const AnswerSchema = new mongoose.Schema({
    username: String,
    userId: Number,
    content: String,
    language: String,
    date: String,
    timestamp: { type: Date, default: Date.now },
    isClaude: { type: Boolean, default: false },
    isScholarResponse: { type: Boolean, default: false },
    aiVerified: { type: Boolean, default: false },
    claudeReason: String
});

const QuestionSchema = new mongoose.Schema({
    title: String,
    content: String,
    domain: String,
    category: String,
    username: String,
    userId: Number,
    language: String,
    date: String,
    timestamp: { type: Date, default: Date.now },
    status: { type: String, default: 'pending' },
    scholar: mongoose.Schema.Types.Mixed,
    answers: [AnswerSchema]
});

const HistorySchema = new mongoose.Schema({
    userId: Number,
    username: String,
    action: String,
    data: mongoose.Schema.Types.Mixed,
    date: String,
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const History = mongoose.model('History', HistorySchema);

// Init admin
async function initAdmin(retries) {
    if (retries === undefined) retries = 5;
    try {
        const existing = await User.findOne({ email: 'admin@scholars-connect.com' });
        if (!existing) {
            await User.create({
                username: 'admin',
                email: 'admin@scholars-connect.com',
                password: 'admin12345',
                role: 'admin',
                domain: 'Général'
            });
            console.log('✅ Admin créé');
        }
    } catch (e) {
        console.error('Init admin tentative ' + (6 - retries) + ': ' + e.message);
        if (retries > 0) setTimeout(function() { initAdmin(retries - 1); }, 5000);
    }
}

mongoose.connection.once('connected', function() { initAdmin(); });

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// GÉNÉRATION DE RÉPONSE PAR GEMINI
// ============================================================
async function generateGeminiResponse(question, scholar, reason) {
    if (!geminiModel) return generateLocalFallback(question, scholar, reason);

    try {
        var prompt = '';
        
        if (reason === 'no_literature') {
            prompt = 'Tu es un Juge Académique expert nommé "Juge Claude".\n' +
                'Un utilisateur a posé la question suivante :\n\n' +
                'DOMAINE : ' + question.domain + '\n' +
                'SPÉCIALITÉ : ' + question.category + '\n' +
                'QUESTION : ' + question.title + '\n' +
                'DÉTAILS : ' + question.content + '\n\n' +
                'Le scholar assigné "' + scholar.name + '" ne dispose pas de littérature spécifique sur ce sujet.\n\n' +
                'Ta mission : Donne une réponse COMPLÈTE, DÉTAILLÉE et EXPERTE à cette question.\n\n' +
                'Structure ta réponse ainsi :\n' +
                '1. 📖 DÉFINITION / CONTEXTE\n' +
                '2. 🎯 RÉPONSE DÉTAILLÉE (3-5 paragraphes)\n' +
                '3. ✅ POINTS CLÉS (3-5 points)\n' +
                '4. 💡 POUR ALLER PLUS LOIN\n' +
                '5. 📚 SOURCES (2-3 ouvrages)\n\n' +
                'Réponds en FRANÇAIS. Pas de Markdown complexe. Utilise emojis et tirets.';
        } else if (reason === 'timeout_5min') {
            prompt = 'Tu es un Juge Académique expert nommé "Juge Claude".\n' +
                'Un utilisateur a posé la question suivante :\n\n' +
                'DOMAINE : ' + question.domain + '\n' +
                'SPÉCIALITÉ : ' + question.category + '\n' +
                'QUESTION : ' + question.title + '\n' +
                'DÉTAILS : ' + question.content + '\n\n' +
                'Le scholar assigné "' + scholar.name + '" n\'a pas répondu dans le délai de 5 minutes.\n' +
                'Sa littérature : ' + (scholar.literature ? scholar.literature.join(', ') : 'Non spécifiée') + '\n\n' +
                'Réponds en te basant sur la littérature du scholar.\n\n' +
                'Structure : 1. DÉFINITION, 2. RÉPONSE DÉTAILLÉE, 3. POINTS CLÉS, 4. RÉFÉRENCES\n\n' +
                'Réponds en FRANÇAIS. Pas de Markdown complexe.';
        }

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        var header = '';
        if (reason === 'no_literature') {
            header = '🤖 RÉPONSE COMPLÈTE DU JUGE CLAUDE\n\n';
            header += '📋 Question : "' + question.title + '"\n';
            header += 'Le scholar ' + scholar.name + ' n\'a pas de littérature spécifique.\n\n';
            header += '━━━━━━━━━━━━━━━━━━━━\n\n';
        } else {
            header = '⏱️ RÉPONSE COMPLÈTE DU JUGE CLAUDE (5 min)\n\n';
            header += '👨‍🎓 Scholar : ' + scholar.name + '\n';
            if (scholar.literature) header += '📖 Références : ' + scholar.literature.join(', ') + '\n';
            header += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
        }

        const footer = '\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Le scholar ' + scholar.name + ' pourra compléter cette réponse.';
        return header + text + footer;

    } catch (e) {
        console.error('Erreur Gemini:', e.message);
        return generateLocalFallback(question, scholar, reason);
    }
}

function generateLocalFallback(question, scholar, reason) {
    var header = reason === 'no_literature' ? '🤖 RÉPONSE DU JUGE CLAUDE\n\n' : '⏱️ RÉPONSE DU JUGE CLAUDE (5 min)\n\n';
    var body = '📖 Cette question relève du domaine ' + question.domain + ' (' + question.category + ').\n\n';
    body += '✅ Le scholar ' + scholar.name + ' est spécialisé en ' + scholar.expertise + '.\n';
    body += '📚 Références : ' + (scholar.literature ? scholar.literature.join(', ') : 'Non spécifiées') + '\n\n';
    return header + body + '💡 Le scholar pourra compléter.';
}

// ============================================================
// ROUTES HTML
// ============================================================
app.get('/', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/admin', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'admin.html')); });

// ============================================================
// PAGE LOGO AVEC QR CODE
// ============================================================
app.get('/logo', function(req, res) {
    var baseUrl = req.protocol + '://' + req.get('host');
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(baseUrl);
    
    var html = '<!DOCTYPE html><html lang="fr"><head>' +
        '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>Scholars Connect - Logo</title>' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0a0e27; font-family: "Segoe UI", system-ui, sans-serif; padding: 20px; }' +
        '.logo-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 24px; padding: 40px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(102,126,234,0.4); }' +
        '.icon { font-size: 64px; margin-bottom: 12px; }' +
        '.title { color: white; font-size: 32px; font-weight: 700; }' +
        '.subtitle { color: rgba(255,255,255,0.85); font-size: 16px; margin-top: 8px; }' +
        '.badges { display: flex; justify-content: center; gap: 8px; margin: 16px 0; flex-wrap: wrap; }' +
        '.badge { background: rgba(255,255,255,0.15); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }' +
        '.qr { background: white; padding: 16px; border-radius: 16px; display: inline-block; margin: 20px 0; }' +
        '.qr img { display: block; width: 250px; height: 250px; }' +
        '.url { background: rgba(0,0,0,0.3); color: white; padding: 12px 16px; border-radius: 12px; font-family: monospace; font-size: 13px; word-break: break-all; margin: 15px 0; }' +
        '.status { display: inline-block; background: #22c55e; color: #0a0e27; padding: 6px 18px; border-radius: 20px; font-weight: 600; font-size: 14px; }' +
        '.actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }' +
        '.btn { background: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; color: #667eea; font-size: 14px; text-decoration: none; display: inline-block; }' +
        '.btn-green { background: #22c55e; color: white; }' +
        '</style></head><body>' +
        '<div class="logo-card">' +
        '<div class="icon">🎓</div>' +
        '<div class="title">Scholars Connect</div>' +
        '<div class="subtitle">Plateforme d\'entraide académique</div>' +
        '<div class="badges">' +
        '<span class="badge">🍃 MongoDB</span>' +
        '<span class="badge">🤖 IA Gemini</span>' +
        '<span class="badge">🎤 Vocal</span>' +
        '<span class="badge">🌐 7 langues</span>' +
        '</div>' +
        '<div class="qr"><img src="' + qrUrl + '" alt="QR Code"></div>' +
        '<div class="url">' + baseUrl + '</div>' +
        '<div class="status">🟢 EN LIGNE</div>' +
        '<div class="actions">' +
        '<button class="btn" onclick="copyUrl()">📋 Copier</button>' +
        '<a href="/" class="btn btn-green">🚀 Ouvrir</a>' +
        '</div></div>' +
        '<script>function copyUrl(){navigator.clipboard.writeText("' + baseUrl + '").then(function(){alert("✅ Lien copié !");});}</script>' +
        '</body></html>';
    
    res.send(html);
});

// ============================================================
// API - ANALYSE INTELLIGENTE (Auto-remplissage)
// ============================================================
app.post('/api/analyze-question', async function(req, res) {
    try {
        const questionText = req.body.text;
        if (!questionText) return res.status(400).json({ error: 'Texte manquant' });
        
        if (!geminiModel) {
            var lowerText = questionText.toLowerCase();
            var domain = 'Général'; var category = 'Histoire';
            if (lowerText.match(/islam|coran|hadith|fiqh|prière|ramadan/)) { domain = 'Islam'; category = 'Fiqh (Jurisprudence)'; }
            else if (lowerText.match(/médecine|maladie|santé|symptôme|cardiologie/)) { domain = 'Médecine'; category = 'Cardiologie'; }
            else if (lowerText.match(/pharmacie|médicament/)) { domain = 'Pharmacie'; category = 'Pharmacologie clinique'; }
            else if (lowerText.match(/chimie|molécule|réaction/)) { domain = 'Chimie'; category = 'Chimie organique'; }
            else if (lowerText.match(/intelligence|ia|deep learning|neurone/)) { domain = 'IA'; category = 'Deep Learning'; }
            else if (lowerText.match(/iot|objet|connecté|capteur/)) { domain = 'IoT'; category = 'Architecture IoT'; }
            else if (lowerText.match(/gmao|gpao|maintenance/)) { domain = 'GMAO'; category = 'GMAO (Maintenance Assistée)'; }
            else if (lowerText.match(/pétrole|forage|cnc|usinage|vanne|turbine|filetage/)) { domain = 'Mécanique Pétrole'; category = 'Usinage CNC haute précision'; }
            else if (lowerText.match(/gestion|management|marketing/)) { domain = 'Gestion'; category = 'Management stratégique'; }
            else if (lowerText.match(/comptab|audit|fiscal/)) { domain = 'Expertise Comptable'; category = 'Comptabilité générale'; }
            else if (lowerText.match(/droit|loi|juridique/)) { domain = 'Droit'; category = 'Droit des affaires'; }
            else if (lowerText.match(/économ|inflation|pib/)) { domain = 'Économie'; category = 'Macroéconomie'; }
            else if (lowerText.match(/art|peinture|musique|cinéma/)) { domain = 'Art'; category = 'Peinture'; }
            else if (lowerText.match(/architect|urbanisme|construction/)) { domain = 'Architecture'; category = 'Architecture moderne'; }
            else if (lowerText.match(/restaur|cuisine|gastronomie/)) { domain = 'Restauration'; category = 'Gastronomie française'; }
            
            var cleanTitle = questionText.replace(/^(quel est|qu'est-ce que|qui est|qui était|comment|pourquoi|quand|où)\s+/i, '').trim();
            if (cleanTitle.length > 80) cleanTitle = cleanTitle.substring(0, 77) + '...';
            
            return res.json({ title: cleanTitle, domain: domain, category: category, language: 'fr' });
        }
        
        var prompt = 'Analyse cette question et retourne UNIQUEMENT un JSON valide :\n\n' +
            'QUESTION : "' + questionText + '"\n\n' +
            'Retourne ce JSON :\n' +
            '{"title":"Titre court max 80 caractères","domain":"UN SEUL: Islam|Médecine|Pharmacie|Chimie|IA|IoT|GMAO|Mécanique Pétrole|Gestion|Expertise Comptable|Droit|Économie|Culture Générale|Art|Architecture|Restauration|Général","category":"Spécialité précise","language":"fr|en|ar"}\n\n' +
            'Réponds UNIQUEMENT avec le JSON.';
        
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        var text = response.text().replace(/\\\json/g, '').replace(/\\\/g, '').trim();
        
        try {
            var parsed = JSON.parse(text);
            res.json(parsed);
        } catch (e) {
            res.json({ title: questionText.substring(0, 80), domain: 'Général', category: 'Histoire', language: 'fr' });
        }
        
    } catch (e) {
        console.error('Erreur analyze:', e.message);
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

// ============================================================
// JUGE CLAUDE AUTOMATIQUE
// ============================================================
async function triggerClaudeJudge(question) {
    if (!question.scholar) return;
    const scholar = question.scholar;
    
    if (!scholar.literature || scholar.literature.length === 0) {
        setTimeout(async function() {
            try {
                const answer = await generateGeminiResponse(question, scholar, 'no_literature');
                const q = await Question.findById(question._id);
                if (!q) return;
                q.answers.push({
                    username: 'Juge Claude', userId: 0, content: answer, language: 'fr',
                    date: new Date().toLocaleDateString('fr-FR'),
                    isClaude: true, claudeReason: 'no_literature'
                });
                q.status = 'claude_answered';
                await q.save();
                console.log('✅ Juge Claude a répondu à Q#' + q._id);
            } catch (e) { console.error('Erreur:', e.message); }
        }, 3000);
        return;
    }
    
    console.log('⏱️ Juge Claude surveille Q#' + question._id);
    
    setTimeout(async function() {
        try {
            const q = await Question.findById(question._id);
            if (!q) return;
            var responded = false;
            for (var i = 0; i < q.answers.length; i++) {
                if (q.answers[i].isScholarResponse) { responded = true; break; }
            }
            if (!responded) {
                const answer = await generateGeminiResponse(q, q.scholar, 'timeout_5min');
                q.answers.push({
                    username: 'Juge Claude', userId: 0, content: answer, language: 'fr',
                    date: new Date().toLocaleDateString('fr-FR'),
                    isClaude: true, claudeReason: 'timeout_5min'
                });
                q.status = 'claude_answered';
                await q.save();
                console.log('✅ Juge Claude a répondu (timeout) à Q#' + q._id);
            }
        } catch (e) { console.error('Erreur:', e.message); }
    }, 30000);
}

// ============================================================
// API - RÉPONSES
// ============================================================
app.post('/api/questions/:id/answers', async function(req, res) {
    try {
        const q = await Question.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Question non trouvée' });
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
        const result = await geminiModel.generateContent('Réponds en une phrase : Qui était Hannibal ?');
        const response = await result.response;
        res.json({ success: true, response: response.text() });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

// ============================================================
// DÉMARRAGE
// ============================================================
app.listen(PORT, '0.0.0.0', function() {
    console.log('==========================================');
    console.log('  Scholars Connect - MongoDB + Gemini');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  🍃 MongoDB: ' + (mongoose.connection.readyState === 1 ? 'Connecté' : 'Connexion...'));
    console.log('  🤖 Gemini: ' + (geminiModel ? 'Actif' : 'Inactif'));
    console.log('  🎤 Vocal: Actif');
    console.log('  📱 QR Code: /logo');
    console.log('==========================================');
});
