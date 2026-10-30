'use strict';
const express = require('express');

// ============================================================
// DÉTECTION LANGUE
// ============================================================
const LANG_CHARS = {
  ar: /[\u0600-\u06FF\u0750-\u077F]/g,
  zh: /[\u4E00-\u9FFF\u3400-\u4DBF]/g,
  ru: /[\u0400-\u04FF]/g,
  ja: /[\u3040-\u30FF]/g,
  ko: /[\uAC00-\uD7AF]/g,
  he: /[\u0590-\u05FF]/g,
  hi: /[\u0900-\u097F]/g,
};

function detectLanguage(text) {
  if (!text) return 'fr';
  const s = String(text);
  if (LANG_CHARS.ar.test(s)) return 'ar';
  if (LANG_CHARS.zh.test(s)) return 'zh';
  if (LANG_CHARS.ru.test(s)) return 'ru';
  if (LANG_CHARS.ja.test(s)) return 'ja';
  if (LANG_CHARS.ko.test(s)) return 'ko';
  if (LANG_CHARS.he.test(s)) return 'he';
  if (LANG_CHARS.hi.test(s)) return 'hi';
  const lower = s.toLowerCase();
  const fr = ['le ', 'la ', 'les ', 'un ', 'une ', 'des ', 'est ', 'quel', 'quelle', 'quoi', 'comment', 'pourquoi', 'sont ', 'avec ', 'dans '];
  const en = ['the ', 'is ', 'are ', 'what', 'which', 'how', 'why', 'and ', 'with ', 'in ', 'this '];
  const es = ['el ', 'la ', 'los ', 'las ', 'que ', 'como ', 'para ', 'por ', 'con ', 'una '];
  let frC = 0, enC = 0, esC = 0;
  fr.forEach(w => { if (lower.indexOf(w) !== -1) frC++; });
  en.forEach(w => { if (lower.indexOf(w) !== -1) enC++; });
  es.forEach(w => { if (lower.indexOf(w) !== -1) esC++; });
  if (esC > frC && esC > enC) return 'es';
  if (enC > frC && enC > esC) return 'en';
  return 'fr';
}

function matchesLanguage(text, lang) {
  if (!text) return false;
  if (LANG_CHARS[lang]) {
    const m = text.match(LANG_CHARS[lang]);
    return m && m.length >= 15;
  }
  // Latin : vérifier que la majorité n'est pas dans une autre écriture
  let nonLatin = 0;
  for (const [l, re] of Object.entries(LANG_CHARS)) {
    const m = text.match(re);
    if (m) nonLatin += m.length;
  }
  return nonLatin < text.length * 0.15;
}

function langInstruction(lang, force) {
  const flag = force ? '⚠️ RÈGLE ABSOLUE : ' : '';
  const map = {
    ar: flag + 'Réponds EXCLUSIVEMENT en arabe standard (فصحى). Pas un seul mot en français ou anglais. Utilise l\'alphabet arabe.',
    fr: flag + 'Réponds EXCLUSIVEMENT en français.',
    en: flag + 'Respond ONLY in English.',
    zh: flag + '请完全用中文回答。',
    ru: flag + 'Отвечай ИСКЛЮЧИТЕЛЬНО на русском.',
    es: flag + 'Responde EXCLUSIVAMENTE en español.',
    ja: flag + '完全に日本語で答えてください。',
    ko: flag + '한국어로만 답변하세요.',
    he: flag + 'ענה אך ורק בעברית.',
    hi: flag + 'केवल हिंदी में उत्तर दें।',
  };
  return map[lang] || map.fr;
}

// ============================================================
// DÉTECTION DOMAINE
// ============================================================
const DOMAINS = {
  'Religion': ['allah', 'coran', 'quran', 'islam', 'prophete', 'hadith', 'sunnah', 'إسلام', 'قرآن', 'الله', 'نبي', 'fiqh', 'mosquée', 'chrétien', 'bible', 'torah', 'juif', 'religion', 'spiritualité'],
  'Histoire': ['guerre', 'war', 'world war', 'seconde guerre', 'wwii', 'ww2', 'hitler', 'nazi', 'colonial', 'empire', 'napoléon', 'historique', 'تاريخ', 'حرب', 'عالمية', 'الثانيه', 'الثانية', 'révolution', 'civilisation'],
  'Economie': ['pib', 'gdp', 'inflation', 'bct', 'banque centrale', 'chômage', 'growth', 'croissance', 'budget', 'déficit', 'اقتصاد', 'تضخم'],
  'Petrole & Gaz': ['api 14l', 'api 5ct', 'seal bore', 'tubing', 'casing', 'petrole', 'pétrole', 'oil', 'gas', 'gaz', 'forage', 'drilling', 'vam', 'tenaris', 'oilfield'],
  'Plan Qualite': ['plan qualite', 'plan qualité', 'quality plan', 'iso 9001', 'inspection', 'ndt', 'qp standard'],
  'Sante': ['medecine', 'médecin', 'maladie', 'santé', 'health', 'cancer', 'vaccin', 'covid', 'صحة', 'طبيب', 'مرض'],
  'Droit': ['loi', 'law', 'juridique', 'tribunal', 'avocat', 'legal', 'constitution', 'قانون'],
  'Sciences': ['physique', 'chimie', 'mathématiques', 'biologie', 'quantum', 'relativité', 'atome', 'science'],
  'Philosophie': ['philosophie', 'kant', 'platon', 'aristote', 'éthique', 'morale', 'philosophy'],
  'Technique': ['ingénierie', 'engineering', 'mécanique', 'électrique', 'software', 'informatique'],
  'Geopolitique': ['géopolitique', 'geopolitique', 'politique', 'sanction', 'diplomatie', 'syrie', 'iran', 'irak', 'israel', 'palestine'],
};

const TECH_DOMAINS = ['Petrole & Gaz', 'Plan Qualite', 'Technique', 'Sciences'];

function detectDomain(text) {
  if (!text) return 'General';
  const t = String(text).toLowerCase();
  let best = 'General', bestScore = 0;
  for (const [dom, kws] of Object.entries(DOMAINS)) {
    let score = 0;
    for (const kw of kws) if (t.indexOf(kw) !== -1) score++;
    if (score > bestScore) { bestScore = score; best = dom; }
  }
  return best;
}

// ============================================================
// UTILISATEUR JWT
// ============================================================
function getUserFromToken(req) {
  try {
    const h = req.headers.authorization || '';
    const t = h.replace('Bearer ', '').trim();
    if (!t) return { id: null };
    const parts = t.split('.');
    if (parts.length !== 3) return { id: null };
    const p = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return { id: p.id || p._id || p.userId || null, email: p.email || null };
  } catch (e) { return { id: null }; }
}

// ============================================================
// APPELS IA
// ============================================================
async function callOpenRouter(question, system) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY absente');
  const models = ['anthropic/claude-sonnet-4.6', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'];
  for (const model of models) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://scholars-connect-app.onrender.com', 'X-Title': 'Scholars Connect' },
        body: JSON.stringify({ model, max_tokens: 4000, temperature: 0.3, messages: [{ role: 'system', content: system }, { role: 'user', content: question }] })
      });
      if (!r.ok) continue;
      const j = await r.json();
      if (j.choices?.[0]?.message?.content) {
        console.log('[smart-router] OpenRouter succès via ' + model);
        return j.choices[0].message.content;
      }
    } catch (e) { console.warn('[smart-router] ' + model + ' KO :', e.message); }
  }
  throw new Error('OpenRouter : aucun modèle');
}

async function callOpenAI(question, system) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY absente');
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', max_tokens: 4000, temperature: 0.3, messages: [{ role: 'system', content: system }, { role: 'user', content: question }] })
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error('OpenAI HTTP ' + r.status + ' : ' + body.slice(0, 200));
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}

async function callGemini(question, system) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY absente');
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const r = await ai.models.generateContent({ model, contents: system + '\n\nQuestion : ' + question });
  return (r && r.text) || '';
}

// ============================================================
// RAG ADAPTATIF (seulement pour domaines techniques)
// ============================================================
async function getRagContext(AutoFeedDoc, question, domain) {
  if (!AutoFeedDoc) return { context: '', score: 0 };
  // Pas de RAG pour domaines non techniques
  if (TECH_DOMAINS.indexOf(domain) === -1) {
    console.log('[smart-router] Domaine "' + domain + '" non technique → pas de RAG');
    return { context: '', score: 0 };
  }
  try {
    const qLower = String(question).toLowerCase();
    const tokens = qLower.match(/[a-z0-9\u0600-\u06FF]{4,}/g) || [];
    if (tokens.length === 0) return { context: '', score: 0 };
    const docs = await AutoFeedDoc.find({}).limit(300).lean();
    let best = null, bestScore = 0;
    docs.forEach(d => {
      const title = (d.title || '').toLowerCase();
      const content = (d.content || '').toLowerCase();
      let score = 0;
      tokens.forEach(tk => {
        if (title.indexOf(tk) !== -1) score += 15;
        if (content.indexOf(tk) !== -1) score += 2;
      });
      if (score > bestScore) { bestScore = score; best = d; }
    });
    // Seuil élevé : 60
    if (best && bestScore >= 60) {
      console.log('[smart-router] RAG : ' + best.title + ' (score=' + bestScore + ')');
      return { context: best.content || '', score: bestScore, title: best.title };
    }
    console.log('[smart-router] RAG score insuffisant (' + bestScore + '/60) → réponse générale');
    return { context: '', score: bestScore };
  } catch (e) { return { context: '', score: 0 }; }
}

// ============================================================
// MODULE PRINCIPAL
// ============================================================
module.exports = function(app, mongoose) {
  console.log('[smart-router] v2 : chargement avec position 0 + vérification langue');
  const router = app._router || app.router;
  if (!router || !router.stack) { console.error('[smart-router] Router non initialisé'); return; }

  let AutoFeedDoc = null, QA = null, FixQA = null;
  try { AutoFeedDoc = mongoose.model('AutoFeedDocument'); } catch (e) {}
  try { QA = mongoose.model('QA'); } catch (e) {}
  try { FixQA = mongoose.model('FixQA'); } catch (e) {}

  const middleware = async (req, res, next) => {
    if (req.method !== 'POST') return next();
    const path = (req.url || '').split('?')[0];
    if (path !== '/api/ask' && path !== '/api/analyze-content') return next();

    let question = (req.body && req.body.question) || '';
    const content = (req.body && req.body.content) || '';
    if (!question.trim() && !content.trim()) return next();

    // Plan Qualité explicite → laisser answer-enricher
    if (/plan\s*(de\s*)?qualit|quality\s*(control\s*)?plan|\bqp[-_ ]?\d/i.test(question)) {
      console.log('[smart-router] Plan Qualité explicite → laisser passer');
      return next();
    }

    try {
      const combined = question + ' ' + content;
      const lang = detectLanguage(question) || 'fr';
      const domain = detectDomain(combined);
      console.log('[smart-router] === Langue=' + lang + ' | Domaine=' + domain + ' | Q="' + question.slice(0, 60) + '"');

      const rag = await getRagContext(AutoFeedDoc, combined, domain);

      let systemPrompt = [
        'Tu es Scholars Connect, un assistant IA expert multidisciplinaire.',
        'Tu maîtrises : ingénierie pétrolière, sciences, histoire, religion, économie, droit, philosophie, santé, technologie, géopolitique.',
        '',
        'RÈGLES ABSOLUES :',
        '1. Tu réponds TOUJOURS de manière détaillée, structurée et factuelle.',
        '2. Tu ne refuses JAMAIS de répondre à une question légitime.',
        '3. Tu réponds DANS LA LANGUE DE LA QUESTION — c\'est NON NÉGOCIABLE.',
        '4. Si tu ne connais pas un détail précis, donne le contexte général.',
        '',
        langInstruction(lang, true),
        'Domaine détecté : ' + domain
      ].join('\n');

      if (rag.context) {
        systemPrompt += '\n\n=== CONTEXTE PERTINENT (optionnel, ne te limite pas à lui) ===\n' + rag.context.slice(0, 4000) + '\n=== FIN CONTEXTE ===';
      }

      // Cascade avec vérification de langue
      let answer = '';
      let source = null;

      // Tentative 1 : Claude
      try {
        answer = await callOpenRouter(question, systemPrompt);
        if (answer && matchesLanguage(answer, lang)) { source = 'claude'; }
        else if (answer) {
          console.warn('[smart-router] Claude : réponse hors-langue → re-prompt forcé');
          const forcedPrompt = systemPrompt + '\n\n⚠️ RAPPEL FINAL : ta réponse précédente n\'était pas en ' + lang + '. Réponds MAINTENANT en ' + lang + ' uniquement.';
          answer = await callOpenRouter(question, forcedPrompt);
          if (answer && matchesLanguage(answer, lang)) source = 'claude-retry';
        }
      } catch (e) { console.warn('[smart-router] Claude KO : ' + e.message); }

      // Tentative 2 : OpenAI
      if (!source || !answer) {
        try {
          answer = await callOpenAI(question, systemPrompt);
          if (answer && matchesLanguage(answer, lang)) source = 'openai';
          else if (answer) {
            console.warn('[smart-router] OpenAI : réponse hors-langue → re-prompt');
            const forcedPrompt = systemPrompt + '\n\n⚠️ IMPERATIVE : Answer ONLY in ' + lang + ' — the previous answer was in wrong language.';
            answer = await callOpenAI(question, forcedPrompt);
            if (answer && matchesLanguage(answer, lang)) source = 'openai-retry';
          }
        } catch (e) { console.warn('[smart-router] OpenAI KO : ' + e.message); }
      }

      // Tentative 3 : Gemini
      if (!source || !answer) {
        try {
          answer = await callGemini(question, systemPrompt);
          if (answer && matchesLanguage(answer, lang)) source = 'gemini';
          else if (answer) source = 'gemini-unverified';
        } catch (e) { console.warn('[smart-router] Gemini KO : ' + e.message); }
      }

      if (!answer || !answer.trim()) {
        answer = lang === 'ar' ? 'عذراً، الخدمة غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى.' :
                 lang === 'en' ? 'Sorry, service temporarily unavailable. Please retry.' :
                 'Désolé, service temporairement indisponible. Veuillez réessayer.';
        source = 'fallback';
      }

      console.log('[smart-router] Réponse générée par ' + source + ' | lang vérifiée=' + matchesLanguage(answer, lang) + ' | ' + answer.length + ' caractères');

      // Historique
      const user = getUserFromToken(req);
      const QA_MODEL = FixQA || QA;
      if (QA_MODEL && user.id) {
        QA_MODEL.create({ userId: String(user.id), question, answer, language: lang, domain })
          .then(() => console.log('[smart-router] Historique OK'))
          .catch(e => console.warn('[smart-router] Historique KO:', e.message));
      }

      return res.json({
        ok: true,
        answer: answer,
        answerRaw: answer,
        language: lang,
        domain: domain,
        source: source,
        enriched: true,
        fallbackUsed: source
      });

    } catch (err) {
      console.error('[smart-router] Erreur :', err.message);
      return next();
    }
  };

  try {
    const mini = express.Router();
    mini.use(middleware);
    if (mini.stack && mini.stack[0]) {
      router.stack.unshift(mini.stack[0]);
      console.log('[smart-router] === MIDDLEWARE INJECTÉ EN POSITION 0 ===');
    }
  } catch (e) { console.error('[smart-router] Erreur injection :', e.message); }

  console.log('[smart-router] Prêt.');
};