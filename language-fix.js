// ============================================================
// LANGUAGE-FIX.JS
// Force l'IA a repondre dans la langue de la question
// avec une formulation NATURELLE (pas de "critical instruction")
// ============================================================

var LANGUAGE_NAMES = {
    'ar': 'Arabic (العربية)',
    'fr': 'French (Francais)',
    'en': 'English',
    'es': 'Spanish (Espanol)',
    'de': 'German (Deutsch)',
    'it': 'Italian (Italiano)',
    'pt': 'Portuguese (Portugues)',
    'ru': 'Russian (Русский)',
    'zh': 'Chinese (中文)',
    'ja': 'Japanese (日本語)',
    'ko': 'Korean (한국어)',
    'tr': 'Turkish (Turkce)',
    'fa': 'Persian (فارسی)',
    'ur': 'Urdu (اردو)',
    'hi': 'Hindi',
    'he': 'Hebrew (עברית)',
    'nl': 'Dutch (Nederlands)',
    'pl': 'Polish (Polski)',
    'sv': 'Swedish (Svenska)',
    'el': 'Greek (Ελληνικά)',
    'vi': 'Vietnamese',
    'th': 'Thai (ไทย)',
    'id': 'Indonesian (Bahasa Indonesia)'
};

function detectLanguage(text) {
    if (!text) return null;
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u0590-\u05FF]/.test(text)) return 'he';
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
    if (/[\u3040-\u30FF]/.test(text)) return 'ja';
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
    if (/[\u0370-\u03FF]/.test(text)) return 'el';
    return null;
}

function buildNaturalPrefix(langCode) {
    var langName = LANGUAGE_NAMES[langCode] || langCode;
    // Formulation naturelle - l'IA ne se mefie pas
    return 'Answer the following question in ' + langName + ' only:\n\n';
}

module.exports = function(app) {
    app.use('/api/ask', function(req, res, next) {
        if (!req.body) return next();
        var lang = req.body.language || 'fr';
        var detected = detectLanguage(req.body.question || '');
        if (detected) lang = detected;
        if (req.body.question && req.body.question.indexOf('Answer the following question in') === -1) {
            req.body.question = buildNaturalPrefix(lang) + req.body.question;
        }
        req.body.language = lang;
        next();
    });

    app.use('/api/analyze-content', function(req, res, next) {
        if (!req.body) return next();
        var lang = req.body.language || 'fr';
        var detected = detectLanguage(req.body.content || '');
        if (detected) lang = detected;
        if (req.body.question && req.body.question.indexOf('Answer the following question in') === -1) {
            req.body.question = buildNaturalPrefix(lang) + req.body.question;
        } else if (!req.body.question && req.body.content) {
            req.body.question = buildNaturalPrefix(lang) + 'Analyze this document.';
        }
        req.body.language = lang;
        next();
    });

    console.log('[language-fix] Middleware actif (mode naturel)');
};