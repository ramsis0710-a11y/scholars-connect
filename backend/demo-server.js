const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI non définie');
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
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        console.log('✅ Gemini API initialisée');
    } catch (e) {
        console.error('❌ Erreur Gemini init:', e.message);
    }
} else {
    console.log('⚠️ GEMINI_API_KEY non définie - fallback sur base locale');
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
async function initAdmin(retries = 5) {
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
        if (retries > 0) setTimeout(() => initAdmin(retries - 1), 5000);
    }
}

mongoose.connection.once('connected', () => {
    initAdmin();
});

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// GÉNÉRATION DE RÉPONSE PAR GEMINI
// ============================================================
async function generateGeminiResponse(question, scholar, reason) {
    if (!geminiModel) {
        // Fallback sur base locale si Gemini non disponible
        return generateLocalFallback(question, scholar, reason);
    }

    try {
        let prompt = '';
        
        if (reason === 'no_literature') {
            prompt = Tu es un Juge Académique expert nommé "Juge Claude". 
Un utilisateur a posé la question suivante :

DOMAINE : 
SPÉCIALITÉ : 
QUESTION : 
DÉTAILS : 

Le scholar assigné "" ne dispose pas de littérature spécifique sur ce sujet.

Ta mission : Donne une réponse COMPLÈTE, DÉTAILLÉE et EXPERTE à cette question.

Structure ta réponse ainsi :
1. 📖 DÉFINITION / CONTEXTE : Explique brièvement le contexte
2. 🎯 RÉPONSE DÉTAILLÉE : Développe la réponse en 3-5 paragraphes
3. ✅ POINTS CLÉS : Liste 3-5 points importants
4. 💡 POUR ALLER PLUS LOIN : Conseils ou références
5. 📚 SOURCES : Cite 2-3 ouvrages/auteurs de référence

Réponds en FRANÇAIS. Sois précis et pédagogique. N'utilise PAS de formatage Markdown complexe (**, ##, etc.). Utilise uniquement des emojis et des tirets.;
        } else if (reason === 'timeout_5min') {
            prompt = Tu es un Juge Académique expert nommé "Juge Claude".
Un utilisateur a posé la question suivante :

DOMAINE : 
SPÉCIALITÉ : 
QUESTION : 
DÉTAILS : 

Le scholar assigné "" n'a pas répondu dans le délai de 5 minutes.
Sa littérature de référence : 

Ta mission : Réponds à cette question en te basant sur la littérature du scholar.

Structure ta réponse :
1. 📖 DÉFINITION / CONTEXTE
2. 🎯 RÉPONSE DÉTAILLÉE (3-5 paragraphes)
3. ✅ POINTS CLÉS (3-5 points)
4. 📚 RÉFÉRENCES (citer la littérature du scholar)

Réponds en FRANÇAIS. Sois précis et pédagogique. Pas de Markdown complexe.;
        }

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Ajouter l'en-tête
        let header = '';
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

// ============================================================
// FALLBACK LOCAL (si Gemini indisponible)
// ============================================================
function generateLocalFallback(question, scholar, reason) {
    let header = '';
    if (reason === 'no_literature') {
        header = '🤖 RÉPONSE DU JUGE CLAUDE\n\n';
        header += 'Le scholar ' + scholar.name + ' n\'a pas de littérature spécifique.\n\n';
    } else {
        header = '⏱️ RÉPONSE DU JUGE CLAUDE (5 min)\n\n';
        header += 'Scholar : ' + scholar.name + '\n\n';
    }
    
    let body = '📖 DÉFINITION : Cette question relève du domaine ' + question.domain + ' (' + question.category + ').\n\n';
    body += '🎯 RÉPONSE : Le Juge Claude analyse votre question : "' + question.title + '"\n\n';
    body += 'Pour une réponse complète et experte, veuillez vérifier que GEMINI_API_KEY est bien configurée.\n\n';
    body += '✅ POINTS CLÉS :\n';
    body += '   • Le sujet appartient au domaine ' + question.domain + '\n';
    body += '   • Le scholar ' + scholar.name + ' est spécialisé en ' + scholar.expertise + '\n';
    body += '   • Les références de base : ' + (scholar.literature ? scholar.literature.join(', ') : 'Non spécifiées') + '\n\n';
    
    return header + body + '💡 Le scholar pourra compléter.';
}

// ============================================================
// ROUTES HTML
// ============================================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ============================================================
// API - AUTH
// ============================================================
app.post('/api/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email, password: req.body.password });
        if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });
        res.json({ ...user.toObject(), password: undefined });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
    try {
        const existing = await User.findOne({ email: req.body.email });
        if (existing) return res.status(400).json({ error: 'Email déjà utilisé' });
        const user = await User.create(req.body);
        res.json({ ...user.toObject(), password: undefined });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req, res) => {
    try { res.json(await User.find().select('-password')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - QUESTIONS
// ============================================================
app.get('/api/questions', async (req, res) => {
    try { res.json(await Question.find().sort({ timestamp: -1 })); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/questions', async (req, res) => {
    try {
        const question = await Question.create(req.body);
        
        // Lancer le Juge Claude en arrière-plan
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
    
    // RÈGLE 1 : Pas de littérature → réponse immédiate
    if (!scholar.literature || scholar.literature.length === 0) {
        setTimeout(async () => {
            try {
                const answer = await generateGeminiResponse(question, scholar, 'no_literature');
                question.answers.push({
                    username: 'Juge Claude',
                    userId: 0,
                    content: answer,
                    language: 'fr',
                    date: new Date().toLocaleDateString('fr-FR'),
                    isClaude: true,
                    claudeReason: 'no_literature'
                });
                question.status = 'claude_answered';
                await question.save();
                console.log('🤖 Juge Claude a répondu (pas de littérature) à Q#' + question._id);
            } catch (e) {
                console.error('Erreur Juge Claude:', e.message);
            }
        }, 3000);
        return;
    }
    
    // RÈGLE 2 : Attendre 5 minutes (30 sec en démo)
    console.log('⏱️ Juge Claude surveille Q#' + question._id);
    
    setTimeout(async () => {
        try {
            const q = await Question.findById(question._id);
            if (!q) return;
            
            const scholarResponded = q.answers.some(a => a.isScholarResponse);
            if (!scholarResponded) {
                const answer = await generateGeminiResponse(q, q.scholar, 'timeout_5min');
                q.answers.push({
                    username: 'Juge Claude',
                    userId: 0,
                    content: answer,
                    language: 'fr',
                    date: new Date().toLocaleDateString('fr-FR'),
                    isClaude: true,
                    claudeReason: 'timeout_5min'
                });
                q.status = 'claude_answered';
                await q.save();
                console.log('⏱️ Juge Claude a répondu (5 min) à Q#' + q._id);
            }
        } catch (e) {
            console.error('Erreur Juge Claude timeout:', e.message);
        }
    }, 30000);
}

// ============================================================
// API - RÉPONSES
// ============================================================
app.post('/api/questions/:id/answers', async (req, res) => {
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
app.get('/api/history', async (req, res) => {
    try { res.json(await History.find().sort({ timestamp: -1 }).limit(500)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/history/:userId', async (req, res) => {
    try { res.json(await History.find({ userId: parseInt(req.params.userId) }).sort({ timestamp: -1 })); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/history', async (req, res) => {
    try { res.json(await History.create(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - SANTÉ
// ============================================================
app.get('/api/health', async (req, res) => {
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
    } catch (e) {
        res.json({ status: 'error', error: e.message });
    }
});

// ============================================================
// TEST GEMINI
// ============================================================
app.get('/api/test-gemini', async (req, res) => {
    if (!geminiModel) {
        return res.json({ error: 'Gemini non configurée' });
    }
    try {
        const result = await geminiModel.generateContent('Réponds en une phrase : Que sais-tu sur Hannibal ?');
        const response = await result.response;
        res.json({ 
            success: true, 
            response: response.text() 
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ============================================================
// DÉMARRAGE
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('==========================================');
    console.log('  Scholars Connect - MongoDB Atlas + Gemini');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  🍃 MongoDB: ' + (mongoose.connection.readyState === 1 ? 'Connecté' : 'Connexion...'));
    console.log('  🤖 Gemini: ' + (geminiModel ? 'Actif' : 'Inactif'));
    console.log('==========================================');
});
