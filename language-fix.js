// ============================================================
// LANGUAGE-FIX.JS
// Force l'IA a repondre dans la langue de la question.
// Fichier SEPARE - NE MODIFIE AUCUNE LIGNE EXISTANTE
// ============================================================

var LANGUAGE_NAMES = {
    'ar': 'Arabic',
    'fr': 'French',
    'en': 'English',
    'es': 'Spanish',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'tr': 'Turkish',
    'fa': 'Persian',
    'ur': 'Urdu',
    'hi': 'Hindi',
    'he': 'Hebrew',
    'nl': 'Dutch',
    'pl': 'Polish',
    'sv': 'Swedish',
    'el': 'Greek',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'id': 'Indonesian'
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

function buildInstruction(langCode) {
    var langName = LANGUAGE_NAMES[langCode] || langCode;
    return '[CRITICAL INSTRUCTION - MANDATORY]\n' +
           'You MUST answer ONLY in ' + langName + '.\n' +
           'Do NOT translate to French. Do NOT use French.\n' +
           'Even explanations, formulas, steps, advice and greetings\n' +
           'must be in ' + langName + '.\n' +
           'If you answer in another language, it is a CRITICAL ERROR.\n\n' +
           '--- QUESTION ---\n';
}

module.exports = function(app) {
    app.use('/api/ask', function(req, res, next) {
        if (!req.body) return next();
        var lang = req.body.language || 'fr';
        var detected = detectLanguage(req.body.question || '');
        if (detected) lang = detected;
        if (req.body.question && req.body.question.indexOf('[CRITICAL INSTRUCTION') === -1) {
            req.body.question = buildInstruction(lang) + req.body.question;
        }
        req.body.language = lang;
        next();
    });

    app.use('/api/analyze-content', function(req, res, next) {
        if (!req.body) return next();
        var lang = req.body.language || 'fr';
        var detected = detectLanguage(req.body.content || '');
        if (detected) lang = detected;
        if (req.body.question && req.body.question.indexOf('[CRITICAL INSTRUCTION') === -1) {
            req.body.question = buildInstruction(lang) + req.body.question;
        } else if (!req.body.question && req.body.content) {
            req.body.question = buildInstruction(lang) + 'Analyze this document.';
        }
        req.body.language = lang;
        next();
    });

    console.log('[language-fix] Middleware actif - force la langue des reponses');
};