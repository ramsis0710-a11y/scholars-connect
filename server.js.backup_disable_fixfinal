require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const multer   = require("multer");
const path     = require("path");
const crypto   = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const HOST = process.env.HOST || "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const MONGODB_URI = process.env.MONGODB_URI || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));

require('./language-fix')(app);
require('./auto-feed')(app, mongoose);
require('./answer-enricher')(app, mongoose);

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

let mongoReady = false;

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    name: { type: String, default: "" },
    role: { type: String, default: "user" },
    createdAt: { type: Date, default: Date.now }
});
const qaSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    language: { type: String, default: "fr" },
    domain: { type: String, default: "General" },
    createdAt: { type: Date, default: Date.now }
});
const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    filename: { type: String, required: true },
    original: { type: String, required: true },
    mimetype: { type: String },
    size: { type: Number },
    extracted: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const QA   = mongoose.model("QA", qaSchema);
const Doc  = mongoose.model("Doc", documentSchema);

async function connectMongo() {
    if (!MONGODB_URI) { console.warn("MONGODB_URI absente"); return; }
    try {
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
        mongoReady = true;
        console.log("MongoDB CONNECTE");
    } catch (e) { console.warn("MongoDB KO:", e.message); }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "uploads");
        require("fs").mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"))
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

function requireAuth(req, res, next) {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "Auth requise" });
    try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
    catch { return res.status(401).json({ error: "Token invalide" }); }
}

// ============================================================
// IA CENTRALE : RAG INJECTION + MAX TOKENS
// ============================================================
async function askAI(prompt, opts = {}) {
    const { domain = "General", language = "fr" } = opts;

    let system = `Tu es Scholars Connect, un assistant academique chaleureux et humain, propulse par MBA-CONSULT AI CORE.
ROLE : Aider les etudiants avec pedagogie. Corriger les exercices en detaillant CHAQUE etape.
STYLE ET TON :
- Sois CHALEUREUX et encourageant
- Phrases courtes et naturelles
- Termine par une formule encourageante
- Ne dis JAMAIS "en tant qu'IA"`;

    // INJECTION DU CONTEXTE RAG (API 14L, etc.)
    let finalPrompt = prompt;
    const ragMatch = prompt.match(/\[EXTRAITS\]([\s\S]*?)\[FIN EXTRAITS\]/);
    if (ragMatch) {
        system += `\n\nINSTRUCTION CRITIQUE : Tu dois répondre en te basant EXCLUSIVEMENT sur les extraits de documents fournis ci-dessous. Si la réponse exacte (chiffres, tolérances) s'y trouve, tu DOIS la citer. Ne réponds pas avec des généralités.\n\nCONTEXTE :\n${ragMatch[1]}`;
        finalPrompt = prompt.replace(/\[EXTRAITS\][\s\S]*?\[FIN EXTRAITS\]/, '').trim();
    }

    if (!OPENROUTER_API_KEY) return "[Mode degrade] OPENROUTER_API_KEY non configuree.";

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://scholars-connect-app.onrender.com"
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            temperature: 0.2,
            max_tokens: 4000, // CORRECTION CRITIQUE
            messages: [
                { role: "system", content: system },
                { role: "user", content: finalPrompt }
            ]
        })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || "OpenRouter error");
    return data?.choices?.[0]?.message?.content || "";
}

app.get("/api/health", (req, res) => res.json({ ok: true, mongo: mongoReady, ai: !!OPENROUTER_API_KEY }));

app.post("/api/auth/register", async (req, res) => {
    try {
        const { email, password, name } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: "email et password requis" });
        if (!mongoReady) return res.status(503).json({ error: "MongoDB non connecte" });
        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ error: "Utilisateur deja existant" });
        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hash, name: name || email, role: "user" });
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
        res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: "email et password requis" });
        if (!mongoReady) return res.status(503).json({ error: "MongoDB non connecte" });
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: "Identifiants invalides" });
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: "Identifiants invalides" });
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
        res.json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).lean();
        if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
        res.json({ user: { id: user._id, email: user.email, name: user.name, role: user.role } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

require('./ultimate-bridge')(app, mongoose);

app.post("/api/ask", requireAuth, async (req, res) => {
    try {
        const { question, language, domain } = req.body || {};
        if (!question) return res.status(400).json({ error: "question requise" });
        const answer = await askAI(question, { domain, language });
        if (mongoReady) {
            await QA.create({ userId: req.user.id, question, answer, language: language || "fr", domain: domain || "General" });
        }
        res.json({ answer, language: language || "fr" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/history", requireAuth, async (req, res) => {
    try {
        if (!mongoReady) return res.json({ items: [] });
        const items = await QA.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200).lean();
        res.json({ items });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "public", "chat.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.use((req, res) => res.status(404).json({ error: "Endpoint introuvable" }));

require('./pdf-report-generator')(app, mongoose);

require('./fix-final')(app, mongoose);

// DESACTIVE TEMPORAIREMENT : require('./smart-router')(app, mongoose);

connectMongo().finally(() => {
    const server = app.listen(PORT, HOST, () => {
        console.log(`Scholars Connect V2 - PORT ${PORT}`);
    });
});

app.get('/upload-qp', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'upload-qp.html')));

