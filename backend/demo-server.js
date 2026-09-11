const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI non définie dans .env');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB Atlas connecté'))
    .catch(err => console.error('❌ MongoDB error:', err.message));

// ============================================================
// SCHÉMAS MONGOOSE
// ============================================================
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
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
    title: { type: String, required: true },
    content: { type: String, required: true },
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
(async () => {
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
            console.log('✅ Admin créé dans MongoDB');
        }
    } catch (e) { console.error('Init admin:', e.message); }
})();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
    try { res.json(await Question.create(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

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
            users: await User.countDocuments(),
            questions: await Question.countDocuments(),
            history: await History.countDocuments(),
            timestamp: new Date().toISOString()
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// DÉMARRAGE
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('==========================================');
    console.log('  Scholars Connect - MongoDB Atlas');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  🍃 Base: MongoDB Atlas PERMANENTE');
    console.log('==========================================');
});
