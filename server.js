require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcryptjs");
const multer   = require("multer");
const path     = require("path");
const crypto   = require("crypto");
const fetch    = require("node-fetch");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const HOST = process.env.HOST || "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const MONGODB_URI = process.env.MONGODB_URI || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const MBA_CONSULT_API = process.env.MBA_CONSULT_API || "https://api.mba-consult.tn";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

if (!OPENROUTER_API_KEY) {
    console.error("OpenRouter non configure - mode IA degrade");
}

// ---------------- MongoDB Schema ----------------
let mongoReady = false;

const userSchema = new mongoose.Schema({
    email:      { type: String, required: true, unique: true, index: true },
    password:   { type: String, required: true },
    name:       { type: String, default: "" },
    role:       { type: String, default: "user" },
    createdAt:  { type: Date, default: Date.now }
});

const qaSchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    question:   { type: String, required: true },
    answer:     { type: String, required: true },
    language:   { type: String, default: "fr" },
    scholar:    { type: String, default: null },
    domain:     { type: String, default: "General" },
    sourceDoc:  { type: String, default: null },
    createdAt:  { type: Date, default: Date.now }
});

const documentSchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    filename:   { type: String, required: true },
    original:   { type: String, required: true },
    mimetype:   { type: String },
    size:       { type: Number },
    extracted:  { type: String, default: "" },
    createdAt:  { type: Date, default: Date.now }
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

// ---------------- Multer (upload) ----------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "uploads");
        require("fs").mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, Date.now() + "_" + safe);
    }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ---------------- Auth middleware ----------------
function requireAuth(req, res, next) {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer ")) return res.status(401).json({ error: "Auth requise" });
    try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next(); }
    catch { return res.status(401).json({ error: "Token invalide" }); }
}
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Admin uniquement" });
        next();
    });
}

// ---------------- IA centrale ----------------
async function askAI(prompt, opts = {}) {
    const { domain = "General", context = "", language = "fr", scholar = null } = opts;

    let system = `Tu es l'assistant Scholars Connect, propulse par MBA-CONSULT AI CORE.
Reponds dans la langue : ${language}.
Sois precis, structure, et professionnel.`;
    if (scholar) system += `\nCite les positions du scholar : ${scholar}.`;
    if (domain === "Religion") system += `\nPour les questions religieuses, cite les sources (Coran, Sunna, consensus des savants).`;
    if (context) system += `\nUtilise ce contexte prioritairement:\n${context}`;

    if (!OPENROUTER_API_KEY) {
        return "[Mode degrade] OPENROUTER_API_KEY non configuree sur le serveur.";
    }

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://mba-consult.tn",
            "X-Title": "Scholars Connect"
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            temperature: 0.3,
            messages: [
                { role: "system", content: system },
                { role: "user", content: prompt }
            ]
        })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || "OpenRouter error");
    return data?.choices?.[0]?.message?.content || "";
}

// ============================================================
// ROUTES PUBLIQUES
// ============================================================

app.get("/api/health", (req, res) => res.json({
    ok: true,
    service: "Scholars Connect V2",
    version: "2.0.0",
    mongo: mongoReady ? "connected" : "memory-mode",
    ai: OPENROUTER_API_KEY ? "configured" : "not-configured"
}));

// ---------------- 1. AUTH ----------------
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

// ---------------- 2-5. IA avec historique ----------------
app.post("/api/ask", requireAuth, async (req, res) => {
    try {
        const { question, language, domain, scholar, sourceDoc } = req.body || {};
        if (!question) return res.status(400).json({ error: "question requise" });

        const answer = await askAI(question, { domain, language, scholar });

        if (mongoReady) {
            await QA.create({
                userId: req.user.id,
                question, answer,
                language: language || "fr",
                domain:   domain || "General",
                scholar:  scholar || null,
                sourceDoc: sourceDoc || null
            });
        }
        res.json({ answer, language: language || "fr", scholar: scholar || null });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Historique
app.get("/api/history", requireAuth, async (req, res) => {
    try {
        if (!mongoReady) return res.json({ items: [] });
        const items = await QA.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200).lean();
        res.json({ items });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/history/:id", requireAuth, async (req, res) => {
    try {
        await QA.deleteOne({ _id: req.params.id, userId: req.user.id });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------- 4. Upload documents ----------------
app.post("/api/upload", requireAuth, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Aucun fichier" });
        let extracted = "";
        // Extraction basique pour txt et json
        if (req.file.mimetype === "text/plain" || req.file.originalname.endsWith(".txt")) {
            extracted = require("fs").readFileSync(req.file.path, "utf-8").slice(0, 20000);
        }
        if (mongoReady) {
            await Doc.create({
                userId: req.user.id,
                filename: req.file.filename,
                original: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                extracted
            });
        }
        res.json({ ok: true, file: req.file.filename, original: req.file.originalname, extracted });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/documents", requireAuth, async (req, res) => {
    try {
        if (!mongoReady) return res.json({ items: [] });
        const items = await Doc.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
        res.json({ items });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Analyser un document avec l'IA
app.post("/api/analyze-doc", requireAuth, async (req, res) => {
    try {
        const { docId, question } = req.body || {};
        if (!mongoReady) return res.status(503).json({ error: "MongoDB non connecte" });
        const doc = await Doc.findOne({ _id: docId, userId: req.user.id }).lean();
        if (!doc) return res.status(404).json({ error: "Document introuvable" });
        const prompt = `${question || "Analyse ce document et fais un resume detaille"}\n\n---\n${doc.extracted || "[Document non extractible en texte]"}`;
        const answer = await askAI(prompt, { domain: "Analyse", language: "fr" });
        res.json({ answer, original: doc.original });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------- 7-8. Traduction ----------------
app.post("/api/translate", requireAuth, async (req, res) => {
    try {
        const { text, targetLanguage } = req.body || {};
        if (!text || !targetLanguage) return res.status(400).json({ error: "text et targetLanguage requis" });
        const prompt = `Traduis le texte suivant en ${targetLanguage}. Reponds uniquement avec la traduction, sans commentaire.\n\n${text}`;
        const answer = await askAI(prompt, { domain: "Translation", language: targetLanguage });
        res.json({ translation: answer, targetLanguage });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------- 10. Chat admin ----------------
app.post("/api/admin/chat", requireAdmin, async (req, res) => {
    try {
        const { message } = req.body || {};
        if (!message) return res.status(400).json({ error: "message requis" });
        const answer = await askAI(message, { domain: "General", language: "fr" });
        res.json({ answer });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------- 9. Dashboard admin ----------------
app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
        if (!mongoReady) return res.json({ items: [] });
        const items = await User.find().sort({ createdAt: -1 }).lean();
        res.json({ items: items.map(u => ({ id: u._id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt })) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/history", requireAdmin, async (req, res) => {
    try {
        if (!mongoReady) return res.json({ items: [] });
        const items = await QA.find().sort({ createdAt: -1 }).limit(500)
            .populate("userId", "email name").lean();
        res.json({ items });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/documents", requireAdmin, async (req, res) => {
    try {
        if (!mongoReady) return res.json({ items: [] });
        const items = await Doc.find().sort({ createdAt: -1 }).limit(500)
            .populate("userId", "email name").lean();
        res.json({ items });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// PAGES HTML
// ============================================================

app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "public", "chat.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "public", "register.html")));
app.get("/presentation", (req, res) => res.sendFile(path.join(__dirname, "public", "presentation.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.use((req, res) => res.status(404).json({ error: "Endpoint introuvable", path: req.path }));

// ============================================================
// DEMARRAGE
// ============================================================
connectMongo().finally(() => {
    app.listen(PORT, HOST, () => {
        console.log("================================================");
        console.log(` Scholars Connect V2 - PORT ${PORT}`);
        console.log(` MongoDB: ${mongoReady ? "CONNECTED" : "MEMORY"}`);
        console.log(` OpenRouter: ${OPENROUTER_API_KEY ? "CONFIGURED" : "NOT"}`);
        console.log("================================================");
    });
});
