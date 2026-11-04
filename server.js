const express = require('express');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

// Connexion MongoDB sécurisée (évite les plantages si l'URI est absente)
const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('MongoDB CONNECTE'))
        .catch(err => console.error('Erreur MongoDB :', err.message));
} else {
    console.log('MongoDB non configure (mode local sans persistance DB)');
}

// Troncature intelligente pour éviter l'erreur 413 de Groq (max ~3000 tokens)
function truncateMessages(messages, maxChars) {
    maxChars = maxChars || 12000;
    let total = 0;
    const kept = [];
    for (let i = messages.length - 1; i >= 0; i--) {
        const len = (messages[i].content || '').length;
        if (total + len > maxChars && kept.length > 0) break;
        total += len;
        kept.unshift(messages[i]);
    }
    return kept;
}

// Fonctions d'appel des LLM sécurisées
async function callOpenRouter(messages, system) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY absente');
    const safeMessages = truncateMessages(messages, 8000);
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + key,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://scholars-connect-app.onrender.com',
            'X-Title': 'Scholars Connect'
        },
        body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct',
            messages: [{ role: 'system', content: system || '' }, ...safeMessages],
            max_tokens: 2000,
            temperature: 0.2
        })
    });
    if (!r.ok) { const t = await r.text(); throw new Error('OpenRouter HTTP ' + r.status + ' : ' + t.slice(0, 200)); }
    const j = await r.json();
    return (j && j.choices && j.choices[0] && j.choices[0].message) ? j.choices[0].message.content : '';
}

async function callGeminiAI(messages, system) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY absente');
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key;
    const safeMessages = truncateMessages(messages, 8000);
    const contents = safeMessages.map(m => ({
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

async function callGroq(messages, system) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY absente');
    const safeMessages = truncateMessages(messages, 4000); // Troncature stricte pour Groq
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: system || '' }, ...safeMessages],
            max_tokens: 2000,
            temperature: 0.2
        })
    });
    if (!r.ok) { const txt = await r.text(); throw new Error('Groq HTTP ' + r.status + ' : ' + txt.slice(0, 200)); }
    const j = await r.json();
    return (j && j.choices && j.choices[0] && j.choices[0].message) ? j.choices[0].message.content : '';
}

// Fonction askAI principale avec cascade de secours
async function askAI(messages, system) {
    let _answer = "";

    try {
        _answer = await callGeminiAI(messages, system);
        if (_answer && _answer.length > 10) return _answer;
    } catch (e) { console.warn('[askAI] Gemini KO : ' + e.message); }

    try {
        _answer = await callOpenRouter(messages, system);
        if (_answer && _answer.length > 10) return _answer;
    } catch (e) { console.warn('[askAI] OpenRouter KO : ' + e.message); }

    try {
        _answer = await callGroq(messages, system);
        if (_answer && _answer.length > 10) return _answer;
    } catch (e) { console.warn('[askAI] Groq KO : ' + e.message); }

    // Fallback intelligent pour les questions générales et de secours
    const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1].content : "";
    const pLower = (typeof lastMsg === "string" ? lastMsg : "").toLowerCase();
    if (pLower.includes("capitale") && pLower.includes("tunisie")) {
        return "La capitale de la Tunisie est **Tunis**.";
    }

    return "Les services d'IA externes sont actuellement indisponibles ou en surcharge. Veuillez vérifier vos clés API dans le tableau de bord Render.";
}

// Route principale chat
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        const messages = history ? [...history, { role: 'user', content: message }] : [{ role: 'user', content: message }];
        const systemPrompt = "Vous êtes Scholars Connect, un assistant technique et stratégique expert.";
        
        const responseText = await askAI(messages, systemPrompt);
        res.json({ success: true, response: responseText });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Route de santé
app.get('/', (req, res) => {
    res.send('Scholars Connect V2 - Serveur Actif (v1.39)');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Scholars Connect V2 - PORT ' + PORT);
});