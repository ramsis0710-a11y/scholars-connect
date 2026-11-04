'use strict';
// clean-fallback-answer.js v1.0
// Nettoie les reponses de fallback RAG (raw dump) pour ne retourner
// que la reponse pertinente a la question, sans fiche technique.

function tokenize(text) {
    return String(text || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/).filter(function(w) { return w.length >= 2; });
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stripHtml(html) {
    return String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, '\n')
        .replace(/\n{2,}/g, '\n\n')
        .trim();
}

function extractBestAnswer(plain, question) {
    var qt = tokenize(question);
    var lines = plain.split('\n');
    var pairs = [];
    var currentQ = null, currentA = [];
    var isQuestion = function(t) { return t.endsWith('?') && t.length >= 10 && t.length <= 300; };
    var isNoise = function(t) {
        return /^(={2,}|📋|Domaine\s*:|Extrait\s*:|Score\s*:|Docs sources\s*:|Moteur IA\s*:|Validation\s*:|Date\s*:|Agents IA|\(Source\s*:|Reponse detaillee|Réponse détaillée)/i.test(t);
    };
    for (var i = 0; i < lines.length; i++) {
        var t = lines[i].trim();
        if (!t) continue;
        if (isNoise(t)) continue;
        if (isQuestion(t)) {
            if (currentQ && currentA.length) {
                pairs.push({ q: currentQ, a: currentA.join(' ').replace(/\s+/g, ' ').trim() });
            }
            currentQ = t;
            currentA = [];
        } else if (currentQ) {
            currentA.push(t);
        }
    }
    if (currentQ && currentA.length) {
        pairs.push({ q: currentQ, a: currentA.join(' ').replace(/\s+/g, ' ').trim() });
    }
    if (!pairs.length) {
        var paragraphs = plain.split(/\n{2,}/).filter(function(p) { return p.trim().length > 30; });
        return paragraphs[0] || plain.slice(0, 500);
    }
    var best = null, bestScore = 0;
    for (var j = 0; j < pairs.length; j++) {
        var pt = tokenize(pairs[j].q);
        var hits = 0;
        for (var k = 0; k < qt.length; k++) if (pt.indexOf(qt[k]) !== -1) hits++;
        var overlap = hits / Math.max(qt.length, 1);
        if (overlap > bestScore) { bestScore = overlap; best = pairs[j]; }
    }
    return best ? best.a : pairs[0].a;
}

function cleanFallback(html, question) {
    var plain = stripHtml(html);
    var answer = extractBestAnswer(plain, question);
    return '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;font-family:Arial,sans-serif;margin:0 0 16px 0">' +
        '<p style="font-size:15px;line-height:1.75;color:#17202a;margin:0">' + escapeHtml(answer) + '</p>' +
        '</div>';
}

module.exports = function() {
    return function(req, res, next) {
        var origJson = res.json.bind(res);
        res.json = function(data) {
            try {
                if (!data || typeof data.answer !== 'string') return origJson(data);
                var isFallback = /DOCUMENT SOURCE|services IA externes|Reponse generee depuis|RAG-FALLBACK-V1|Réponse générée depuis/i.test(data.answer);
                if (!isFallback) return origJson(data);
                var question = (req.body && (req.body.question || req.body.query || req.body.message)) || '';
                data.answer = cleanFallback(data.answer, question);
                data.fallbackCleaned = true;
                data.enriched = true;
                return origJson(data);
            } catch (e) {
                console.warn('[clean-fallback] erreur : ' + e.message);
                return origJson(data);
            }
        };
        next();
    };
};
