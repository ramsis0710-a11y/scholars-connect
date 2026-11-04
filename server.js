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
app.use(require('./clean-fallback-answer')());

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
async function callGeminiAI(messages, system) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY absente');
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: key });
    const parts = [system || ''];
    for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (m.role === 'system') continue;
        parts.push((m.role === 'user' ? 'Utilisateur: ' : 'Assistant: ') + m.content);
    }
    const r = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        contents: parts.join('\n\n')
    });
    return (r && r.text) || '';
}

async function callOpenAIAI(messages) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY absente');
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.2,
            max_tokens: 4000,
            messages: messages
        })
    });
    if (!r.ok) throw new Error('OpenAI HTTP ' + r.status);
    const j = await r.json();
    return (j && j.choices && j.choices[0] && j.choices[0].message) ? j.choices[0].message.content : '';
}
async function callGroq(messages, system) {
    var safeMessages = truncateMessagesForGroq(messages, 1500);
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY absente');
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
            messages: [{ role: 'system', content: system || '' }, ...messages],
            max_tokens: 2000,
            temperature: 0.2
        })
    });
    if (!r.ok) {
        const txt = await r.text();
        throw new Error('Groq HTTP ' + r.status + ' : ' + txt.slice(0, 200));
    }
    const j = await r.json();
    return (j && j.choices && j.choices[0] && j.choices[0].message) ? j.choices[0].message.content : '';
}
async function callMistral(messages, system) {
    const key = process.env.MISTRAL_API_KEY;
    if (!key) throw new Error('MISTRAL_API_KEY absente');
    const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
            messages: [{ role: 'system', content: system || '' }, ...messages],
            max_tokens: 4000,
            temperature: 0.2
        })
    });
    if (!r.ok) {
        const txt = await r.text();
        throw new Error('Mistral HTTP ' + r.status + ' : ' + txt.slice(0, 200));
    }
    const j = await r.json();
    return (j && j.choices && j.choices[0] && j.choices[0].message) ? j.choices[0].message.content : '';
}
async function callBailian(messages, system) {
    const key = process.env.BAILIAN_API_KEY;
    if (!key) throw new Error('BAILIAN_API_KEY absente');
    const r = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: process.env.BAILIAN_MODEL || 'qwen-plus',
            messages: [{ role: 'system', content: system || '' }, ...messages],
            max_tokens: 4000
        })
    });
    if (!r.ok) { const t = await r.text(); throw new Error('Bailian HTTP ' + r.status + ' : ' + t.slice(0, 200)); }
    const j = await r.json();
    return (j && j.choices && j.choices[0] && j.choices[0].message) ? j.choices[0].message.content : '';
}
function truncateMessagesForGroq(messages, maxTokens) {
    maxTokens = maxTokens || 1500;
    var CHARS_PER_TOKEN = 4;
    function estimateTok(m) { return Math.ceil((String(m.role || '') + ' ' + String(m.content || '')).length / CHARS_PER_TOKEN); }
    if (!messages || !messages.length) return [];
    var lastMsg = messages[messages.length - 1];
    var lastTokens = estimateTok(lastMsg);
    var kept = [];
    if (lastTokens > maxTokens) {
        var maxChars = maxTokens * CHARS_PER_TOKEN;
        var content = String(lastMsg.content || '');
        var truncated = content.slice(-maxChars);
        console.log('[truncate] last message trop long (' + lastTokens + ' tok) -> tronque a ' + maxTokens + ' tok');
        return [{ role: lastMsg.role, content: truncated }];
    }
    kept.unshift(lastMsg);
    var total = lastTokens;
    for (var i = messages.length - 2; i >= 0; i--) {
        var n = estimateTok(messages[i]);
        if (total + n > maxTokens) break;
        total += n;
        kept.unshift(messages[i]);
    }
    return kept;
}
async function callOpenRouter(messages, system) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY absente');
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + key,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://scholars-connect-app.onrender.com',
            'X-Title': 'Scholars Connect'
        },
        body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct:free',
            messages: [{ role: 'system', content: system || '' }, ...messages],
            max_tokens: 4000,
            temperature: 0.2
        })
    });
    if (!r.ok) { const t = await r.text(); throw new Error('OpenRouter HTTP ' + r.status + ' : ' + t.slice(0, 200)); }
    const j = await r.json();
    return (j && j.choices && j.choices[0] && j.choices[0].message) ? j.choices[0].message.content : '';
}
async function askAI(prompt, opts = {}) {
    const { domain = "General", language = "fr", history = [] } = opts;

    let system = `Tu es Scholars Connect, un assistant academique chaleureux et humain, propulse par MBA-CONSULT AI CORE.
ROLE : Aider les etudiants avec pedagogie. Corriger les exercices en detaillant CHAQUE etape.
STYLE ET TON :
- Sois CHALEUREUX et encourageant
- Phrases courtes et naturelles
- Termine par une formule encourageante
MEMOIRE CONVERSATIONNELLE :
- Si le message contient "=== INSTRUCTIONS DE MEMOIRE ===" ou "=== HISTORIQUE DE LA CONVERSATION ===", tu DOIS utiliser cet historique.
- Si la question est courte (et sa population, et son president, combien, et apres), refere-toi au SUJET de la derniere question de l'historique.
- Ne demande JAMAIS de preciser le sujet si l'historique le mentionne.
- Ne mentionne PAS l'historique dans ta reponse. Reponds naturellement.
- Ne dis JAMAIS "en tant qu'IA"
REGLE ABSOLUE DE FIABILITE TECHNIQUE (priorite maximale) :
1. Pour toute question technique (API, normes, tolerances, petrole, gaz, plan qualite, soudure, acier) : tu DOIS repondre EXCLUSIVEMENT a partir du CONTEXTE RAG fourni.
2. Tu DOIS citer les editions, dates et valeurs EXACTEMENT comme elles apparaissent dans le contexte RAG.
3. Si le contexte RAG contient la reponse, TU DOIS l'utiliser, MEME SI ta memoire pre-entrainee dit autre chose. La base RAG est PLUS A JOUR que ta memoire interne.
4. Si le contexte RAG ne contient PAS l'information demandee, reponds EXACTEMENT : "Cette information precise n'est pas dans ma base de connaissances actuelle. Veuillez consulter le document officiel API ou le site api.org."
5. N'INVENTE JAMAIS une date, une edition ou une valeur technique. Une reponse fausse est PIRE qu'une absence de reponse.
- REGLE ABSOLUE POUR LES DOMAINES TECHNIQUES (Petrole & Gaz, Technique, Plan Qualite, Sciences) :
  * Tu DOIS rلpondre EXCLUSIVEMENT ض partir du CONTEXTE RAG fourni ci-dessous.
  * Si le contexte contient des chiffres, dates, لditions, tolلrances : CITE-LES EXACTEMENT.
  * Ne JAMAIS inventer une date, une لdition ou une valeur technique.
  * Si le contexte ne contient pas l'information, dis "Je ne trouve pas cette information dans la base de connaissances actuelle. Veuillez consulter le document officiel API."
  * Pour les questions sur les normes API : utilise UNIQUEMENT les لditions prلsentes dans le contexte RAG.`;

    // INJECTION DU CONTEXTE RAG (API 14L, etc.)
    let finalPrompt = prompt;
    const ragMatch = prompt.match(/\[EXTRAITS\]([\s\S]*?)\[FIN EXTRAITS\]/);
    if (ragMatch) {
        system += `\n\nINSTRUCTION CRITIQUE : Tu dois rلpondre en te basant EXCLUSIVEMENT sur les extraits de documents fournis ci-dessous. Si la rلponse exacte (chiffres, tolلrances) s'y trouve, tu DOIS la citer. Ne rلponds pas avec des gلnلralitلs.\n\nCONTEXTE :\n${ragMatch[1]}`;
        finalPrompt = prompt.replace(/\[EXTRAITS\][\s\S]*?\[FIN EXTRAITS\]/, '').trim();
    }

    if (!OPENROUTER_API_KEY) return "[Mode degrade] OPENROUTER_API_KEY non configuree.";

    // v1.10 : construire messages avec historique separe (format ChatGPT)
    const messages = [{ role: "system", content: system }];
    if (Array.isArray(history) && history.length > 0) {
        history.slice(-6).forEach(function(m) {
            const role = (m.role === 'user') ? 'user' : 'assistant';
            let content = String(m.content || m.text || '').split(/Fiche technique/i)[0].replace(/Reponse detaillee/i, '').trim();
            if (content) messages.push({ role: role, content: content });
        });
        console.log('[v1.10 askAI] ' + history.length + ' messages historique ajoutes');
    }
    // Parser le prompt : retirer l historique eventuel (ancien format memory-fix) pour ne pas doubler
    let cleanPrompt = finalPrompt;
    const histPrefix = cleanPrompt.match(/=== HISTORIQUE DE LA CONVERSATION ===[\s\S]*?=== FIN HISTORIQUE ===\s*/);
    if (histPrefix) cleanPrompt = cleanPrompt.replace(histPrefix[0], '').trim();
    const newQ = cleanPrompt.match(/Nouvelle question\s*:\s*\n?([\s\S]+)$/);
    if (newQ) cleanPrompt = newQ[1].trim();
    messages.push({ role: "user", content: cleanPrompt + "\n\n[INSTRUCTION CRITIQUE : Pour toute question technique (API, normes, tolerances), tu DOIS utiliser le CONTEXTE RAG ci-dessus. Cite les numeros d'edition et les dates EXACTEMENT comme ils apparaissent dans le contexte. Si l'information n'est pas dans le contexte, dis-le clairement.]" });

                // v1.31 : Groq -> Gemini -> Mistral -> OpenRouter -> Bailian -> Fallback local
    let _a31 = "";

    try { _a31 = await callGroq(messages, system); if (_a31 && _a31.length > 20) { console.log('[askAI] Groq OK (' + _a31.length + ' chars)'); return _a31; } } catch (e) { console.warn('[askAI] Groq KO : ' + e.message); }
    try { _a31 = await callGeminiAI(messages, system); if (_a31 && _a31.length > 20) { console.log('[askAI] Gemini OK (' + _a31.length + ' chars)'); return _a31; } } catch (e) {
        console.warn('[askAI] Gemini KO : ' + e.message);
        if (e.message.indexOf('503') !== -1 || e.message.indexOf('429') !== -1) {
            console.warn('[askAI] Gemini surcharge - retry apres 5s');
            await new Promise(function(res) { setTimeout(res, 5000); });
            try {
                var _gemRetry = await callGeminiAI(messages, system);
                if (_gemRetry && _gemRetry.length > 20) {
                    console.log('[askAI] Gemini retry OK (' + _gemRetry.length + ' chars)');
                    return _gemRetry;
                }
            } catch (e2) { console.warn('[askAI] Gemini retry KO : ' + e2.message); }
        }
    }
    try { _a31 = await callMistral(messages, system); if (_a31 && _a31.length > 20) { console.log('[askAI] Mistral OK (' + _a31.length + ' chars)'); return _a31; } } catch (e) { console.warn('[askAI] Mistral KO : ' + e.message); }
    try { _a31 = await callOpenRouter(messages, system); if (_a31 && _a31.length > 20) { console.log('[askAI] OpenRouter OK (' + _a31.length + ' chars)'); return _a31; } } catch (e) { console.warn('[askAI] OpenRouter KO : ' + e.message); }
    try { _a31 = await callBailian(messages, system); if (_a31 && _a31.length > 20) { console.log('[askAI] Bailian OK (' + _a31.length + ' chars)'); return _a31; } } catch (e) { console.warn('[askAI] Bailian KO : ' + e.message); }

    // v1.33 : Fallback intelligent - filtre par pertinence au lieu de dump brut
    try {
        var _src = (typeof finalPrompt === 'string' && finalPrompt.length > 200) ? finalPrompt : '';
        if (_src) {
            var _qOrig = _src.split('[EXTRAITS]')[0].replace(/^\[Document\][^:]*:\s*/i, '').trim();
            var _stop = ['quelle','quels','quel','quelles','est','sont','les','des','une','dans','pour','avec','plus','moins','cette','etre','avoir','fait','faire','peut','peuvent','comment','pourquoi','quand','combien','qui','que','quoi','dont','vers','sous','sur','entre','aussi','tres','tout','tous','toute','toutes','bien','meme','autre','autres','donc','alors','ainsi','selon','lors','apres','avant','pendant','depuis','jusque','chez','sans','the','and','for','with','this','that','from','have','has','was','were','are','what','where'];
            var _qw = String(_qOrig).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(function(w){ return w.length >= 4 && _stop.indexOf(w) === -1; });
            var _docs = _src.split(/=== DOCUMENT SOURCE \d+ :/).slice(1);
            var _bestDoc = null, _bestScore = 0;
            for (var _i = 0; _i < _docs.length; _i++) {
                var _d = _docs[_i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                var _s = 0;
                for (var _j = 0; _j < _qw.length; _j++) { if (_d.indexOf(_qw[_j]) !== -1) _s++; }
                if (_s > _bestScore) { _bestScore = _s; _bestDoc = _docs[_i]; }
            }
            console.log('[askAI] Fallback v1.33: ' + _qw.length + ' mots-cles, best=' + _bestScore + '/' + _qw.length);
            if (_bestScore >= 2 && _bestDoc) {
                var _clean = _bestDoc.replace(/^[^=]*===/, '').replace(/=== FIN DOCUMENT.*$/s, '').trim().slice(0, 1500);
                return "[Reponse extraite de la base documentaire locale - les services IA externes sont temporairement indisponibles]\n\n" + _clean + "\n\n(Source : base documentaire interne)";
            }
            return "Je n'ai pas trouve d'information pertinente dans ma base documentaire pour cette question. Les services IA externes (Groq, Gemini, Mistral, OpenRouter, Bailian) sont temporairement indisponibles.\n\nVerifiez les cles API sur Render ou reessayez dans quelques minutes.";
        }
    } catch (e) { console.warn('[askAI] Fallback v1.33 KO : ' + e.message); }
    return "[Services IA temporairement indisponibles] Tous les fournisseurs (Groq, Gemini, Mistral, OpenRouter, Bailian) sont en panne. Verifiez les cles API sur Render.";

        // v1.31 : Cascade Groq -> Gemini -> Mistral -> OpenRouter -> Bailian -> Fallback local
    let _answer31 = "";

    try {
        _answer31 = await callGroq(messages, system);
        if (_answer31 && _answer31.length > 20) {
            console.log('[askAI] Groq OK (' + _answer31.length + ' chars)');
            return _answer31;
        }
    } catch (e) { console.warn('[askAI] Groq KO : ' + e.message); }

    try {
        _answer31 = await callGeminiAI(messages, system);
        if (_answer31 && _answer31.length > 20) {
            console.log('[askAI] Gemini OK (' + _answer31.length + ' chars)');
            return _answer31;
        }
    } catch (e) { console.warn('[askAI] Gemini KO : ' + e.message); }

    try {
        _answer31 = await callMistral(messages, system);
        if (_answer31 && _answer31.length > 20) {
            console.log('[askAI] Mistral OK (' + _answer31.length + ' chars)');
            return _answer31;
        }
    } catch (e) { console.warn('[askAI] Mistral KO : ' + e.message); }

    try {
        _answer31 = await callOpenRouter(messages, system);
        if (_answer31 && _answer31.length > 20) {
            console.log('[askAI] OpenRouter OK (' + _answer31.length + ' chars)');
            return _answer31;
        }
    } catch (e) { console.warn('[askAI] OpenRouter KO : ' + e.message); }

    try {
        _answer31 = await callBailian(messages, system);
        if (_answer31 && _answer31.length > 20) {
            console.log('[askAI] Bailian OK (' + _answer31.length + ' chars)');
            return _answer31;
        }
    } catch (e) { console.warn('[askAI] Bailian KO : ' + e.message); }

    try {
        const _ragSource = (typeof finalPrompt === 'string' && finalPrompt.length > 200) ? finalPrompt : '';
        if (_ragSource) {
            const _extrait = _ragSource.trim().slice(0, 3000);
            console.log('[askAI] Fallback local RAG (' + _extrait.length + ' chars)');
            return "[Reponse extraite de la base documentaire locale - les services IA externes sont temporairement indisponibles]\n\n" + _extrait;
        }
    } catch (e) { console.warn('[askAI] Fallback local KO : ' + e.message); }

        // Fallback de courtoisie si aucune clé API ne répond et rien dans le RAG
    const pLower = (typeof prompt === "string" ? prompt : "").toLowerCase();
    if (pLower.includes("capitale") && pLower.includes("tunisie")) {
        return "La capitale de la Tunisie est **Tunis**.";
    }
    return "Les services d'IA externes sont actuellement indisponibles et la base documentaire ne contient pas de réponse directe à cette question. Veuillez vérifier les clés API dans le panneau Render.";
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
    const { question, language, domain, history } = req.body || {};
    if (!question) return res.status(400).json({ error: "question requise" });
    let answer;
    try {
        answer = await askAI(question, { domain, language, history });
    } catch (e) {
        console.warn("[api/ask] askAI crash : " + e.message);
        answer = "[Erreur IA temporaire] " + (e.message || "inconnue") + ". Veuillez reessayer dans quelques instants.";
    }
    try {
        if (mongoReady && answer && answer.indexOf("[Erreur") !== 0 && answer.indexOf("[Service IA") !== 0 && answer.indexOf("[Timeout") !== 0) {
            await QA.create({ userId: req.user.id, question, answer, language: language || "fr", domain: domain || "General" });
        }
    } catch (e) { console.warn("[api/ask] QA.create erreur : " + e.message); }
    return res.json({ answer, language: language || "fr" });
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

// v1.23 : error handler global - ne jamais renvoyer 500
app.use((err, req, res, next) => {
    console.error("[global-error] " + (err && err.stack || err));
    if (res.headersSent) return next(err);
    const msg = (err && err.message) || "Erreur inconnue";
    if (req.path === "/api/ask") return res.json({ answer: "[Erreur temporaire] " + msg });
    return res.status(500).json({ error: msg });
});



require('./pdf-report-generator')(app, mongoose);

// DESACTIVE fix-final : cause du RAG force
// require('./fix-final')(app, mongoose);

// DESACTIVE TEMPORAIREMENT : require('./smart-router')(app, mongoose);

require('./smart-answer')(app, mongoose);
require('./memory-fix')(app, mongoose);
// DESACTIVE (crash res.json) : require('./intelligent-router')(app, mongoose);
require('./freshness-guard')(app, mongoose);

// DESACTIVE : require('./extras-backend')(app, mongoose);

connectMongo().finally(() => {
    const server = app.use((req, res) => res.status(404).json({ error: "Endpoint introuvable" }));

app.listen(PORT, HOST, () => {
        console.log(`Scholars Connect V2 - PORT ${PORT}`);
    });
});

app.get('/upload-qp', (req, res) => res.sendFile(require('path').join(__dirname, 'public', 'upload-qp.html')));
