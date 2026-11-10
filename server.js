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

// === AJOUT : GESTIONNAIRE D'ERREURS GLOBAL (Pour voir les vrais crashs) ===
app.use((err, req, res, next) => {
    console.error("\n=== ERREUR 500 DETECTEE ===");
    console.error(err.stack || err);
    console.error("===========================\n");
    if (res.headersSent) return next(err);
    res.status(500).json({ error: err.message || "Erreur interne du serveur", details: err.stack });
});
// =========================================================================
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));

require('./language-fix')(app);
require('./auto-feed')(app, mongoose);
require('./continuity')(app, mongoose);
require('./answer-enricher')(app, mongoose);

// === BRAND v1.2 : bouton rond MBA-CONSULT (logo public / mode admin) ===
const brandFs = require("fs");
const BRAND_PAGES = {
    "/": "index.html", "/index.html": "index.html",
    "/chat": "chat.html", "/chat.html": "chat.html",
    "/login": "login.html", "/login.html": "login.html",
    "/register": "register.html", "/register.html": "register.html",
    "/admin": "admin.html", "/admin.html": "admin.html",
    "/upload-qp": "upload-qp.html", "/upload-qp.html": "upload-qp.html"
};
// === BRAND v1.3 : logo dans le navigateur (icone d'onglet, apercu de partage) ===
app.get("/favicon.ico", (req, res) => {
    res.set("Cache-Control", "public, max-age=86400");
    res.sendFile(path.join(__dirname, "public", "logo-mba.png"));
});
app.get("/api/brand/role", (req, res) => {
    let role = "public";
    const h = req.headers.authorization || "";
    if (h.startsWith("Bearer ")) {
        try {
            const u = jwt.verify(h.slice(7), JWT_SECRET);
            role = (u && u.role === "admin") ? "admin" : "user";
        } catch (e) { role = "public"; }
    }
    const out = { role: role };
    if (role === "admin") {
        out.links = [
            { label: "Administration", href: "/admin" },
            { label: "Mes fichiers (OneDrive)", href: process.env.ADMIN_FILES_URL || "https://onedrive.live.com" }
        ];
    }
    res.set("Cache-Control", "no-store");
    res.json(out);
});
app.get(Object.keys(BRAND_PAGES), (req, res, next) => {
    const file = path.join(__dirname, "public", BRAND_PAGES[req.path]);
    brandFs.readFile(file, "utf8", (err, html) => {
        if (err) return next();
        const tag = '<script src="/brand.js" defer></script>';
        const brandBase = String(process.env.PUBLIC_URL || ("https://" + req.get("host"))).replace(/[^\w:\/\.\-]/g, "");
        let headTags = "";
        if (!/rel=["'](?:shortcut )?icon["']/i.test(html)) {
            headTags += '<link rel="icon" type="image/png" href="/logo-mba.png"><link rel="apple-touch-icon" href="/logo-mba.png">';
        }
        if (html.indexOf("og:image") === -1) {
            headTags += '<meta property="og:type" content="website"><meta property="og:site_name" content="MBA-CONSULT">' +
                '<meta property="og:title" content="Scholars Connect - MBA-CONSULT">' +
                '<meta property="og:description" content="Assistant acad&eacute;mique propuls&eacute; par MBA-CONSULT AI CORE">' +
                '<meta property="og:image" content="' + brandBase + '/logo-share.jpg">' +
                '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' +
                '<meta property="og:url" content="' + brandBase + req.path + '"><meta name="twitter:card" content="summary_large_image">' +
                '<meta name="theme-color" content="#000000">';
        }
        if (headTags && /<\/head>/i.test(html)) html = html.replace(/<\/head>/i, function () { return headTags + "</head>"; });        if (html.indexOf("/brand.js") === -1) {
            html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, tag + "</body>") : html + tag;
        }
        res.set("Content-Type", "text/html; charset=utf-8");
        res.send(html);
    });
});
// === FIN BRAND v1.2 ===
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

let mongoReady = false;

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    name: { type: String, default: "" },
    role: { type: String, default: "user" },
    status: { type: String, default: "active" },
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
function computeMaxTokens(prompt) {
    var s = String(prompt || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var t = 1500;
    if (/(detail|rapport|analys|expliqu|developp|etape|correct|exercice|compar|synthes|tableau)/i.test(s)) t = 2500;
    if (s.length > 1500 || /(exhaustif|approfondi|tres detaille|rapport technique|rapport complet)/i.test(s)) t = 3500;
    if (s.length > 4000) t = 4000;
    return Math.max(1500, Math.min(4000, t));
}

async function loadHistory(userId, threadStart) {
    if (!mongoReady) return [];
    try {
        var since = Date.now() - 3 * 3600 * 1000;
        var ts = parseInt(threadStart, 10);
        if (ts > 0) since = ts;
        var items = await QA.find({ userId: userId, createdAt: { $gte: new Date(since) } }).sort({ createdAt: -1 }).limit(6).lean();
        var msgs = [];
        items.reverse().forEach(function (i) {
            var q = String(i.question || "").split("[EXTRAITS]")[0].trim().slice(0, 1200);
            var a = String(i.answer || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
            if (q && a) { msgs.push({ role: "user", content: q }); msgs.push({ role: "assistant", content: a }); }
        });
        return msgs;
    } catch (e) { return []; }
}

// ============================================================
// FONCTIONS DE SECOURS (FALLBACK IA)
// ============================================================
async function callGroq(messages, system) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY absente');
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: system || '' }, ...messages],
            max_tokens: 1500,
            temperature: 0.2
        })
    });
    if (!r.ok) { const t = await r.text(); throw new Error('Groq HTTP ' + r.status + ' : ' + t.slice(0, 200)); }
    const j = await r.json();
    return (j && j.choices && j.choices[0] && j.choices[0].message) ? j.choices[0].message.content : '';
}

async function callGeminiAI(messages, system) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY absente');
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key;
    const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, systemInstruction: system ? { parts: [{ text: system }] } : undefined })
    });
    if (!r.ok) { const t = await r.text(); throw new Error('Gemini HTTP ' + r.status + ' : ' + t.slice(0, 200)); }
    const j = await r.json();
    return (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts[0]) ? j.candidates[0].content.parts[0].text : '';
}
async function askAI(prompt, opts = {}) {
    const { domain = "General", language = "fr", history = [] } = opts;

    let system = `Tu es Scholars Connect, un assistant academique chaleureux et humain, propulse par MBA-CONSULT AI CORE.
ROLE : Aider les etudiants avec pedagogie. Corriger les exercices en detaillant CHAQUE etape.
STYLE ET TON : Sois CHALEUREUX et encourageant. Phrases courtes et naturelles. Termine par une formule encourageante.`;

    let finalPrompt = prompt;
    const ragMatch = prompt.match(/\[EXTRAITS\]([\s\S]*?)\[FIN EXTRAITS\]/);
    if (ragMatch) {
        system += `\n\nINSTRUCTION CRITIQUE : Tu dois répondre en te basant EXCLUSIVEMENT sur les extraits de documents fournis ci-dessous.\n\nCONTEXTE :\n${ragMatch[1]}`;
        finalPrompt = prompt.replace(/\[EXTRAITS\][\s\S]*?\[FIN EXTRAITS\]/, '').trim();
    }

    const messages = [{ role: "system", content: system }];
    if (Array.isArray(history) && history.length > 0) {
        history.slice(-6).forEach(function(m) {
            const role = (m.role === 'user') ? 'user' : 'assistant';
            let content = String(m.content || m.text || '').split(/Fiche technique/i)[0].replace(/Reponse detaillee/i, '').trim();
            if (content) messages.push({ role: role, content: content });
        });
    }
    messages.push({ role: "user", content: finalPrompt });

    // --- CASCADE 1 : OpenRouter (si crédits suffisants) ---
    if (OPENROUTER_API_KEY) {
        try {
            const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://scholars-connect-app.onrender.com" },
                body: JSON.stringify({ model: OPENROUTER_MODEL, temperature: 0.2, max_tokens: 800, messages: messages })
            });
            const data = await r.json();
            if (r.ok && data?.choices?.[0]?.message?.content) {
                console.log('[askAI] OpenRouter OK');
                return data.choices[0].message.content;
            }
            throw new Error(data?.error?.message || 'OpenRouter error');
        } catch (e) {
            console.warn('[askAI] OpenRouter KO :', e.message);
        }
    }

    // --- CASCADE 2 : Groq (Gratuit, Rapide) ---
    try {
        const ans = await callGroq(messages, system);
        if (ans && ans.length > 20) { console.log('[askAI] Groq OK'); return ans; }
    } catch (e) { console.warn('[askAI] Groq KO :', e.message); }

    // --- CASCADE 3 : Gemini (Gratuit) ---
    try {
        const ans = await callGeminiAI(messages, system);
        if (ans && ans.length > 20) { console.log('[askAI] Gemini OK'); return ans; }
    } catch (e) { console.warn('[askAI] Gemini KO :', e.message); }

    // --- CASCADE 4 : Fallback Final ---
    return "[Service temporairement indisponible] Tous les fournisseurs IA sont en panne. Veuillez vérifier vos clés API sur Render.";
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
        let answer; try { answer = await askAI(question, { domain, language, history: await loadHistory(req.user.id, req.headers["x-thread-start"]) }); } catch (e) { console.error("Erreur askAI:", e); return res.status(200).json({ answer: "[Erreur temporaire] Le service IA est indisponible : " + e.message + ". Veuillez reessayer dans quelques minutes.", error: e.message }); }
        if (mongoReady) {
            try { await QA.create({ userId: req.user.id, question, answer, language: language || "fr", domain: domain || "General" }); } catch (e) { console.warn("Erreur QA.create:", e.message); }
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


// ============================================================
// ROUTES ADMIN
// ============================================================
function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ error: "Accès réservé à l'administrateur." });
}
app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
        res.json({ users });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/users/:id/status", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'blocked'].includes(status)) throw new Error("Statut invalide");
        await User.findByIdAndUpdate(req.params.id, { status });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "public", "chat.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.use((req, res) => res.status(404).json({ error: "Endpoint introuvable" }));

require('./pdf-report-generator')(app, mongoose);

// DESACTIVE fix-final : cause du RAG force
// require('./fix-final')(app, mongoose);

// DESACTIVE TEMPORAIREMENT : require('./smart-router')(app, mongoose);

connectMongo().finally(() => {
    // === AJOUT : GESTIONNAIRE D'ERREURS GLOBAL ===
app.use((err, req, res, next) => {
    console.error("\n=== ERREUR 500 DETECTEE ===");
    console.error(err.stack || err);
    console.error("===========================\n");
    if (res.headersSent) return next(err);
    res.status(500).json({ error: err.message || "Erreur interne du serveur", details: err.stack });
});
// ==============================================

app.listen(PORT, HOST, () => {
        console.log(`Scholars Connect V2 - PORT ${PORT}`);
    });
});

app.get('/upload-qp', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'upload-qp.html')));