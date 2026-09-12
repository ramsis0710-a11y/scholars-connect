const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!MONGODB_URI) { console.error('MONGODB_URI non definie'); process.exit(1); }

let genAI = null, geminiAvailable = false;
let geminiKeyType = 'none';

function detectGeminiKeyType(key) {
    if (!key) return 'none';
    if (key.startsWith('AIzaSy')) return 'legacy';
    if (key.startsWith('AQ.')) return 'new';
    return 'unknown';
}

geminiKeyType = detectGeminiKeyType(GEMINI_API_KEY);

if (GEMINI_API_KEY && (geminiKeyType === 'legacy' || geminiKeyType === 'new')) {
    try {
        const { GoogleGenAI } = require('@google/genai');
        genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        geminiAvailable = true;
        console.log('[OK] Gemini API initialisee (SDK @google/genai)');
        console.log('     Format cle : ' + geminiKeyType);
    } catch (e) {
        console.error('[ERREUR] Gemini init :', e.message);
        geminiAvailable = false;
    }
} else {
    console.log('[ATTENTION] Cle Gemini invalide - Mode fallback enrichi');
}

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 45000, family: 4 })
    .then(() => console.log('[OK] MongoDB Atlas connecte'))
    .catch(err => console.error('[ERREUR] MongoDB:', err.message));

const UserSchema = new mongoose.Schema({
    username: String, email: { type: String, unique: true }, password: String,
    role: { type: String, default: 'user' }, language: { type: String, default: 'fr' },
    domain: { type: String, default: 'General' }, createdAt: { type: Date, default: Date.now }
});

const AnswerSchema = new mongoose.Schema({
    username: String, userId: Number, content: String, language: String, date: String,
    timestamp: { type: Date, default: Date.now }, isClaude: { type: Boolean, default: false },
    isScholarResponse: { type: Boolean, default: false }, aiVerified: { type: Boolean, default: false },
    claudeReason: String
});

const QuestionSchema = new mongoose.Schema({
    title: String, content: String, domain: String, category: String,
    username: String, userId: Number, language: String, date: String,
    timestamp: { type: Date, default: Date.now }, status: { type: String, default: 'pending' },
    scholar: mongoose.Schema.Types.Mixed, answers: [AnswerSchema]
});

const HistorySchema = new mongoose.Schema({
    userId: Number, username: String, action: String, data: mongoose.Schema.Types.Mixed,
    date: String, timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);
const History = mongoose.model('History', HistorySchema);

async function initAdmin(retries) {
    if (retries === undefined) retries = 5;
    try {
        const existing = await User.findOne({ email: 'admin@scholars-connect.com' });
        if (!existing) {
            await User.create({ username: 'admin', email: 'admin@scholars-connect.com', password: '%DaliMBA00931', role: 'admin', domain: 'General' });
            console.log('[OK] Admin cree');
        } else {
            existing.password = '%DaliMBA00931';
            await existing.save();
            console.log('[OK] Admin MP mis a jour');
        }
    } catch (e) {
        if (retries > 0) setTimeout(function() { initAdmin(retries - 1); }, 5000);
    }
}
mongoose.connection.once('connected', function() { initAdmin(); });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

var KNOWLEDGE_BASE = {
    'hannibal': {
        fr: 'Hannibal Barca (247-183 av. J.-C.) etait un general carthaginois, considere comme l\'un des plus grands stratege militaires de l\'Antiquite.\n\nIl est celebre pour avoir traverse les Alpes avec ses elephants de guerre en 218 av. J.-C. pour attaquer Rome lors de la Deuxieme Guerre punique.\n\nPoints cles :\n- General de Carthage\n- Traversee des Alpes avec elephants\n- Victoires a Trebie, Trasimene et Cannes\n- Battu par Scipion a Zama en 202 av. J.-C.\n\nSources : Tite-Live, Polybe',
        ar: 'هانيبال باركا (247-183 ق.م) كان جنرالا قرطاجيا، يعتبر من اعظم الاستراتيجيين العسكريين في العصور القديمة.\n\nيشتهر بعبوره جبال الالب مع فيلته الحربية عام 218 ق.م لمهاجمة روما خلال الحرب البونيقية الثانية.\n\nنقاط رئيسية:\n- جنرال قرطاجي\n- عبور جبال الالب بالفيلة\n- انتصارات في تريبياس وتراسيمين وكاناي\n- هزم على يد سكيبيو في زاما عام 202 ق.م\n\nالمصادر: تيتوس ليفيوس، بوليبيوس',
        en: 'Hannibal Barca (247-183 BC) was a Carthaginian general, considered one of the greatest military strategists of antiquity.\n\nHe is famous for crossing the Alps with his war elephants in 218 BC to attack Rome during the Second Punic War.\n\nKey points:\n- Carthaginian general\n- Crossing the Alps with elephants\n- Victories at Trebia, Trasimene, and Cannae\n- Defeated by Scipio at Zama in 202 BC\n\nSources: Livy, Polybius'
    },
    'fatiha': {
        fr: 'Sourate Al-Fatiha est la premiere sourate du Coran, composee de 7 versets.\n\nSelon les savants, elle a ete revelee a La Mecque (mecquoise). Elle est appelee "Oumm al-Kitab" (Mere du Livre) car elle contient les principes fondamentaux de la foi islamique.\n\nPoints cles :\n- Premiere sourate du Coran\n- Recitee dans chaque priere\n- Contient l\'unicite divine (Tawhid)\n- Appelee "Al-Sab\' al-Mathani" (Les 7 repetees)\n\nSources : Tafsir Ibn Kathir, Tafsir al-Tabari',
        ar: 'سورة الفاتحة هي اول سورة في القرآن الكريم، تتكون من 7 آيات.\n\nعند العلماء، نزلت في مكة (مكية). تسمى "ام الكتاب" لانها تحتوي على المبادئ الاساسية للعقيدة الاسلامية.\n\nنقاط رئيسية:\n- اول سورة في القرآن\n- تقرأ في كل صلاة\n- تحتوي على التوحيد\n- تسمى "السبع المثاني"\n\nالمصادر: تفسير ابن كثير، تفسير الطبري',
        en: 'Surah Al-Fatiha is the first chapter of the Quran, consisting of 7 verses.\n\nAccording to scholars, it was revealed in Mecca. It is called "Umm al-Kitab" (Mother of the Book) because it contains the fundamental principles of Islamic faith.\n\nKey points:\n- First chapter of the Quran\n- Recited in every prayer\n- Contains divine unity (Tawhid)\n- Called "Al-Sab\' al-Mathani" (The 7 repeated)\n\nSources: Tafsir Ibn Kathir, Tafsir al-Tabari'
    },
    'fiqh': {
        fr: 'Le Fiqh est la jurisprudence islamique qui traite des regles pratiques derivees du Coran et de la Sunna.\n\nLes 4 sources principales :\n1. Le Coran\n2. La Sunna\n3. L\'Ijma (consensus)\n4. Le Qiyas (analogie)\n\nPoints cles :\n- Science des regles pratiques\n- 4 ecoles : Hanafite, Malikite, Chafiite, Hanbalite\n- Couvre tous les aspects de la vie musulmane\n\nSources : Al-Risala, Al-Umm, Bidayat al-Mujtahid',
        ar: 'الفقه هو العلم بالاحكام الشرعية العملية المستنبطة من القرآن والسنة.\n\nالمصادر الاربعة الرئيسية:\n1. القرآن الكريم\n2. السنة النبوية\n3. الاجماع\n4. القياس\n\nنقاط رئيسية:\n- علم الاحكام العملية\n- 4 مذاهب: حنفي مالكي شافعي حنبلي\n- يغطي جميع جوانب الحياة الاسلامية\n\nالمصادر: الرسالة، الام، بداية المجتهد',
        en: 'Fiqh is Islamic jurisprudence dealing with practical rules derived from the Quran and Sunnah.\n\nThe 4 main sources:\n1. The Quran\n2. The Sunnah\n3. Ijma (consensus)\n4. Qiyas (analogy)\n\nKey points:\n- Science of practical rules\n- 4 main schools: Hanafi, Maliki, Shafii, Hanbali\n- Covers all aspects of Muslim life\n\nSources: Al-Risala, Al-Umm, Bidayat al-Mujtahid'
    },
    'filetage': {
        fr: 'Le filetage premium est un filetage de haute precision utilise dans l\'industrie petroliere.\n\nExigences principales :\n- Tolerances dimensionnelles tres serrees (+/-0.05mm)\n- Pas de filetage constant et precis\n- Angle de filetage conforme (60 ou 75 degres)\n- Controle par calibres API\n- Etancheite aux gaz et liquides\n- Resistance mecanique elevee (15 000 PSI)\n- Traitement de surface anticorrosion\n- Tracabilite complete des lots\n\nNormes : API 5B, API 5CT, ISO 10422, TSH 511\n\nApplications : Forage petrolier, completion de puits\n\nSources : CNC Programming Handbook, Valve Handbook',
        ar: 'القلاووظ المتميز هو قلاووظ عالي الدقة يستخدم في صناعة النفط.\n\nالمتطلبات الرئيسية:\n- تفاوتات ابعاد ضيقة جدا (+/-0.05مم)\n- خطوة لولبية ثابتة ودقيقة\n- زاوية لولبية مطابقة (60 او 75 درجة)\n- التحكم بمقاييس API\n- احكام ضد الغازات والسوائل\n- مقاومة ميكانيكية عالية (15,000 PSI)\n- معالجة سطحية مضادة للتآكل\n- تتبع كامل للدفعات\n\nالمعايير : API 5B, API 5CT, ISO 10422, TSH 511\n\nالتطبيقات : الحفر النفطي، اكمال الابار\n\nالمصادر : كتيب برمجة CNC، كتيب الصمامات',
        en: 'Premium threading is high-precision threading used in the oil industry.\n\nMain requirements:\n- Very tight dimensional tolerances (+/-0.05mm)\n- Constant and precise thread pitch\n- Compliant thread angle (60 or 75 degrees)\n- Control by API gauges\n- Gas and liquid tightness\n- High mechanical resistance (15,000 PSI)\n- Anti-corrosion surface treatment\n- Complete batch traceability\n\nStandards: API 5B, API 5CT, ISO 10422, TSH 511\n\nApplications: Oil drilling, well completion\n\nSources: CNC Programming Handbook, Valve Handbook'
    },
    'cnc': {
        fr: 'Le CNC (Computer Numerical Control) est un systeme de commande numerique par ordinateur pour les machines-outils.\n\nExigences :\n- Precision dimensionnelle (+/-0.01mm)\n- Programmation G-code\n- Vitesse et avance controlees\n- Gestion thermique\n- Controle qualite en cours\n\nAvantages :\n- Repetabilite elevee\n- Fabrication de pieces complexes\n- Automatisation complete\n\nSources : CNC Programming Handbook',
        ar: 'CNC (التحكم الرقمي بالحاسوب) هو نظام تحكم رقمي بالحاسوب لآلات التشغيل.\n\nالمتطلبات :\n- دقة ابعاد (+/-0.01مم)\n- برمجة G-code\n- سرعة وتغذية متحكم بها\n- ادارة حرارية\n- مراقبة الجودة اثناء العمل\n\nالمزايا :\n- تكرارية عالية\n- تصنيع قطع معقدة\n- اتمتة كاملة\n\nالمصادر : كتيب برمجة CNC',
        en: 'CNC (Computer Numerical Control) is a computer numerical control system for machine tools.\n\nRequirements:\n- Dimensional accuracy (+/-0.01mm)\n- G-code programming\n- Controlled speed and feed\n- Thermal management\n- In-process quality control\n\nAdvantages:\n- High repeatability\n- Complex parts manufacturing\n- Full automation\n\nSources: CNC Programming Handbook'
    }
};

async function callGemini(prompt) {
    if (!geminiAvailable || !genAI) throw new Error('Gemini non disponible');
    const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
    });
    if (result && result.text) return result.text;
    if (result && result.response && typeof result.response.text === 'function') return result.response.text();
    throw new Error('Format de reponse Gemini inattendu');
}

async function generateGeminiResponse(question, scholar, reason) {
    if (geminiAvailable) {
        try {
            var qLang = question.language || 'fr';
            var langInstruction = 'CRITICAL: You MUST respond in the SAME LANGUAGE as the question. Language code: ' + qLang + '.';
            var prompt = 'You are an expert academic judge named "Juge Claude".\n' +
                langInstruction + '\n\n' +
                'DOMAIN: ' + question.domain + '\nSPECIALTY: ' + question.category + '\n' +
                'QUESTION: ' + question.title + '\nDETAILS: ' + question.content + '\n\n' +
                'Provide a COMPLETE and EXPERT answer.\n' +
                'Structure: 1. DEFINITION 2. DETAILED ANSWER 3. KEY POINTS 4. SOURCES';
            const text = await callGemini(prompt);
            console.log('[OK] Reponse Gemini (' + text.length + ' caracteres)');
            return buildResponse(text, question, scholar, reason);
        } catch (e) {
            console.error('[ERREUR] Gemini:', e.message);
        }
    }
    console.log('[INFO] Fallback local active');
    return generateEnrichedFallback(question, scholar, reason);
}

function buildResponse(text, question, scholar, reason) {
    var header = '';
    if (reason === 'no_literature') {
        header = 'REPONSE COMPLETE DU JUGE CLAUDE\n\nQuestion : "' + question.title + '"\n';
        header += 'Le scholar ' + scholar.name + ' n\'a pas de litterature specifique.\n\n===================\n\n';
    } else {
        header = 'REPONSE COMPLETE DU JUGE CLAUDE (5 min)\n\nScholar : ' + scholar.name + '\n';
        if (scholar.literature) header += 'References : ' + scholar.literature.join(', ') + '\n';
        header += '\n===================\n\n';
    }
    return header + text + '\n\n===================\nLe scholar ' + scholar.name + ' pourra completer.';
}

function generateEnrichedFallback(question, scholar, reason) {
    var qLang = question.language || 'fr';
    var questionText = (question.title + ' ' + question.content).toLowerCase();
    var found = null;
    for (var key in KNOWLEDGE_BASE) {
        if (questionText.indexOf(key) !== -1) { found = KNOWLEDGE_BASE[key]; break; }
    }
    var header = '';
    if (reason === 'no_literature') {
        header = 'REPONSE DU JUGE CLAUDE\n\nQuestion : "' + question.title + '"\n';
        header += 'Le scholar ' + scholar.name + ' n\'a pas de litterature specifique.\n\n===================\n\n';
    } else {
        header = 'REPONSE DU JUGE CLAUDE (5 min)\n\nScholar : ' + scholar.name + '\n';
        if (scholar.literature) header += 'References : ' + scholar.literature.join(', ') + '\n';
        header += '\n===================\n\n';
    }
    if (found && found[qLang]) {
        return header + found[qLang] + '\n\n===================\nLe scholar pourra completer.';
    }
    var generic = {
        fr: 'DEFINITION : Cette question releve du domaine ' + question.domain + ' (' + question.category + ').\n\nREPONSE : Le sujet "' + question.title + '" necessite une expertise specialisee.\n\nPOINTS CLES :\n    Domaine : ' + question.domain + '\n    Specialite : ' + question.category + '\n    Scholar assigne : ' + scholar.name + '\n    Litterature : ' + (scholar.literature ? scholar.literature.join(', ') : 'Non specifiee') + '\n\nCONSEIL : Consultez la litterature specialisee.',
        ar: 'التعريف : هذا السؤال ينتمي الى مجال ' + question.domain + ' (' + question.category + ').\n\nالاجابة : موضوع "' + question.title + '" يتطلب خبرة متخصصة.\n\nالنقاط الرئيسية :\n    المجال : ' + question.domain + '\n    التخصص : ' + question.category + '\n    العالم المعين : ' + scholar.name + '\n    المراجع : ' + (scholar.literature ? scholar.literature.join(', ') : 'غير محدد') + '\n\nنصيحة : استشر المراجع المتخصصة.',
        en: 'DEFINITION: This question belongs to the ' + question.domain + ' domain (' + question.category + ').\n\nANSWER: The topic "' + question.title + '" requires specialized expertise.\n\nKEY POINTS:\n    Domain: ' + question.domain + '\n    Specialty: ' + question.category + '\n    Assigned scholar: ' + scholar.name + '\n    Literature: ' + (scholar.literature ? scholar.literature.join(', ') : 'Not specified') + '\n\nTIP: Consult specialized literature.'
    };
    return header + (generic[qLang] || generic.fr) + '\n\n===================\nLe scholar pourra completer.';
}

app.get('/', function(req, res) {
    var p = path.join(__dirname, 'public', 'index.html');
    if (require('fs').existsSync(p)) res.sendFile(p);
    else res.send('<h1>Scholars Connect</h1><p>Backend operationnel. <a href="/api/health">Health</a></p>');
});
app.get('/admin', function(req, res) {
    var p = path.join(__dirname, 'public', 'admin.html');
    if (require('fs').existsSync(p)) res.sendFile(p);
    else res.send('<h1>Admin</h1><p>Interface admin. <a href="/api/health">Health</a></p>');
});

app.get('/admin-login', function(req, res) {
    var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<title>Admin - Connexion</title><style>' +
        '*{margin:0;padding:0;box-sizing:border-box}' +
        'body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a0e27,#1a1a3e);font-family:Segoe UI,sans-serif;padding:20px}' +
        '.card{background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:24px;padding:40px;max-width:450px;width:100%;box-shadow:0 25px 70px rgba(245,158,11,0.4)}' +
        '.title{color:white;font-size:28px;font-weight:700;text-align:center;margin-bottom:20px}' +
        '.form-group{margin-bottom:18px}' +
        '.form-group label{display:block;color:white;font-weight:600;margin-bottom:6px;font-size:14px}' +
        '.form-group input{width:100%;padding:14px;border-radius:10px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.95);color:#0a0e27;font-size:15px}' +
        '.btn{width:100%;padding:15px;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:16px;background:#22c55e;color:white}' +
        '.btn:hover{background:#16a34a}' +
        '.status{margin-top:15px;padding:12px;border-radius:8px;font-size:13px;text-align:center;display:none}' +
        '.status.success{background:#22c55e;color:white;display:block}' +
        '.status.error{background:#ef4444;color:white;display:block}' +
        '</style></head><body><div class="card">' +
        '<div class="title">Acces Admin</div>' +
        '<form onsubmit="doLogin(event)">' +
        '<div class="form-group"><label>Email</label>' +
        '<input type="email" id="email" value="admin@scholars-connect.com" readonly></div>' +
        '<div class="form-group"><label>Mot de passe</label>' +
        '<input type="password" id="password" value="%DaliMBA00931"></div>' +
        '<button type="submit" class="btn">Se connecter</button></form>' +
        '<div class="status" id="status"></div></div>' +
        '<script>async function doLogin(e){e.preventDefault();' +
        'var email=document.getElementById("email").value;' +
        'var pwd=document.getElementById("password").value;' +
        'var st=document.getElementById("status");st.className="status";st.textContent="Connexion...";' +
        'try{var r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email,password:pwd})});' +
        'var data=await r.json();if(r.ok&&data.role==="admin"){localStorage.setItem("sc_admin_session",JSON.stringify(data));' +
        'st.className="status success";st.textContent="Connexion reussie !";setTimeout(function(){window.location.href="/admin";},800);}' +
        'else{st.className="status error";st.textContent=(data.error||"Acces refuse");}}' +
        'catch(err){st.className="status error";st.textContent="Erreur reseau";}}</script></body></html>';
    res.send(html);
});

app.get('/logo', function(req, res) {
    var baseUrl = req.protocol + '://' + req.get('host');
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(baseUrl);
    var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<title>Scholars Connect - QR</title><style>' +
        '*{margin:0;padding:0;box-sizing:border-box}' +
        'body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a0e27,#1a1a3e);font-family:Segoe UI,sans-serif;padding:20px}' +
        '.card{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:24px;padding:40px;max-width:600px;width:100%;text-align:center;box-shadow:0 25px 70px rgba(102,126,234,0.5)}' +
        '.title{color:white;font-size:38px;font-weight:700;margin-bottom:20px}' +
        '.qr-container{background:white;padding:20px;border-radius:20px;display:inline-block;margin:25px 0}' +
        '.qr-container img{display:block;width:350px;height:350px}' +
        '.url{background:rgba(0,0,0,0.3);color:white;padding:15px 20px;border-radius:12px;font-family:monospace;font-size:14px;word-break:break-all;margin:20px 0}' +
        '.btn{background:white;border:none;padding:15px 30px;border-radius:12px;font-weight:700;cursor:pointer;color:#667eea;font-size:15px;text-decoration:none;display:inline-block;margin:5px}' +
        '.btn-green{background:#22c55e;color:white}' +
        '</style></head><body><div class="card">' +
        '<div class="title">Scholars Connect</div>' +
        '<div class="qr-container"><img src="' + qrUrl + '" alt="QR"></div>' +
        '<div class="url">' + baseUrl + '</div>' +
        '<a href="/" class="btn btn-green">Ouvrir</a>' +
        '</div></body></html>';
    res.send(html);
});

app.post('/api/analyze-question', async function(req, res) {
    try {
        var questionText = req.body.text;
        if (!questionText) return res.status(400).json({ error: 'Texte manquant' });
        var detectedLang = 'fr';
        if (/[\u0600-\u06FF]/.test(questionText)) detectedLang = 'ar';
        else if (/[\u4E00-\u9FFF]/.test(questionText)) detectedLang = 'zh';
        else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(questionText)) detectedLang = 'ja';
        else if (/[\uAC00-\uD7AF]/.test(questionText)) detectedLang = 'ko';
        else if (/[\u0400-\u04FF]/.test(questionText)) detectedLang = 'ru';
        else if (/[\u0900-\u097F]/.test(questionText)) detectedLang = 'hi';

        if (!geminiAvailable) {
            var lower = questionText.toLowerCase();
            var domain = 'General', category = 'Histoire';
            if (lower.match(/islam|coran|hadith|fiqh|sourate|fatiha|priere/)) { domain = 'Islam'; category = 'Fiqh'; }
            else if (lower.match(/medecine|maladie|sante|cardiaque/)) { domain = 'Medecine'; category = 'Cardiologie'; }
            else if (lower.match(/ia|intelligence|deep learning|neurone/)) { domain = 'IA'; category = 'Deep Learning'; }
            else if (lower.match(/petrole|forage|cnc|filetage|usinage/)) { domain = 'Mecanique Petrole'; category = 'Usinage CNC'; }
            return res.json({ title: questionText.substring(0, 80), domain: domain, category: category, language: detectedLang, content: questionText });
        }

        var prompt = 'Analyze this question and return ONLY a valid JSON.\n\nQUESTION: "' + questionText + '"\n\nReturn JSON:\n{"title": "Short title", "domain": "Islam|Medecine|Pharmacie|Chimie|IA|IoT|GMAO|Mecanique Petrole|Gestion|Expertise Comptable|Droit|Economie|Culture Generale|Art|Architecture|Restauration|General", "category": "Specific", "language": "' + detectedLang + '", "content": "Reformulation"}';
        var text = await callGemini(prompt);
        text = text.split('```json').join('').split('```').join('').trim();
        try {
            var parsed = JSON.parse(text);
            if (!parsed.title) parsed.title = questionText.substring(0, 80);
            if (!parsed.domain) parsed.domain = 'General';
            if (!parsed.category) parsed.category = 'General';
            if (!parsed.language) parsed.language = detectedLang;
            if (!parsed.content) parsed.content = questionText;
            res.json(parsed);
        } catch (e) {
            res.json({ title: questionText.substring(0, 80), domain: 'General', category: 'Histoire', language: detectedLang, content: questionText });
        }
    } catch (e) {
        var fallbackLang = 'fr';
        if (/[\u0600-\u06FF]/.test(req.body.text)) fallbackLang = 'ar';
        res.json({ title: req.body.text.substring(0, 80), domain: 'General', category: 'Histoire', language: fallbackLang, content: req.body.text });
    }
});

app.post('/api/translate', async function(req, res) {
    try {
        const text = req.body.text, targetLang = req.body.targetLang;
        if (!text || !targetLang) return res.status(400).json({ error: 'Parametres manquants' });
        if (!geminiAvailable) return res.json({ translation: text, targetLang: targetLang, error: 'Gemini non disponible' });
        const langNames = { 'fr': 'French', 'ar': 'Arabic', 'en': 'English', 'es': 'Spanish', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'ru': 'Russian', 'hi': 'Hindi' };
        const targetName = langNames[targetLang] || targetLang;
        const prompt = 'Translate this text to ' + targetName + ' accurately.\n\nTEXT:\n' + text + '\n\nReturn ONLY the translation.';
        const translatedText = await callGemini(prompt);
        res.json({ translation: translatedText, targetLang: targetLang, targetName: targetName });
    } catch (e) {
        res.json({ translation: req.body.text, targetLang: req.body.targetLang, error: e.message });
    }
});

app.post('/api/login', async function(req, res) {
    try {
        const user = await User.findOne({ email: req.body.email, password: req.body.password });
        if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });
        var u = user.toObject(); delete u.password; res.json(u);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async function(req, res) {
    try {
        const existing = await User.findOne({ email: req.body.email });
        if (existing) return res.status(400).json({ error: 'Email deja utilise' });
        const user = await User.create(req.body);
        var u = user.toObject(); delete u.password; res.json(u);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async function(req, res) {
    try { res.json(await User.find().select('-password')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/questions', async function(req, res) {
    try { res.json(await Question.find().sort({ timestamp: -1 })); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/questions', async function(req, res) {
    try {
        const question = await Question.create(req.body);
        console.log('[INFO] Nouvelle question:', question.title);
        triggerClaudeJudge(question);
        res.json(question);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

async function triggerClaudeJudge(question) {
    if (!question.scholar) { console.log('[INFO] Pas de scholar'); return; }
    const scholar = question.scholar;
    const questionLang = question.language || 'fr';
    console.log('[INFO] Juge Claude active pour Q#' + question._id + ' (langue: ' + questionLang + ')');

    if (!scholar.literature || scholar.literature.length === 0) {
        console.log('[INFO] Pas de litterature -> reponse dans 3s');
        setTimeout(async function() {
            try {
                const answer = await generateGeminiResponse(question, scholar, 'no_literature');
                const q = await Question.findById(question._id);
                if (!q) return;
                q.answers.push({ username: 'Juge Claude', userId: 0, content: answer, language: questionLang, date: new Date().toLocaleDateString('fr-FR'), isClaude: true, claudeReason: 'no_literature' });
                q.status = 'claude_answered';
                await q.save();
                console.log('[OK] Reponse enregistree (' + answer.length + ' caracteres)');
            } catch (e) { console.error('[ERREUR]', e.message); }
        }, 3000);
        return;
    }

    console.log('[INFO] Attente 5 minutes...');
    setTimeout(async function() {
        try {
            const q = await Question.findById(question._id);
            if (!q) return;
            var scholarResponded = false;
            for (var i = 0; i < q.answers.length; i++) { if (q.answers[i].isScholarResponse) { scholarResponded = true; break; } }
            if (scholarResponded) { console.log('[INFO] Scholar a repondu'); return; }
            console.log('[INFO] 5 min ecoulees -> Claude repond');
            const answer = await generateGeminiResponse(q, q.scholar, 'timeout_5min');
            q.answers.push({ username: 'Juge Claude', userId: 0, content: answer, language: questionLang, date: new Date().toLocaleDateString('fr-FR'), isClaude: true, claudeReason: 'timeout_5min' });
            q.status = 'claude_answered';
            await q.save();
            console.log('[OK] Reponse Claude (5min) enregistree');
        } catch (e) { console.error('[ERREUR]', e.message); }
    }, 300000);
}

app.post('/api/questions/:id/answers', async function(req, res) {
    try {
        const q = await Question.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Non trouvee' });
        q.answers.push(req.body);
        if (req.body.isScholarResponse) q.status = 'answered';
        if (req.body.isClaude) q.status = 'claude_answered';
        await q.save();
        res.json(q.answers[q.answers.length - 1]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/history', async function(req, res) {
    try { res.json(await History.find().sort({ timestamp: -1 }).limit(500)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/history/:userId', async function(req, res) {
    try { res.json(await History.find({ userId: parseInt(req.params.userId) }).sort({ timestamp: -1 })); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/history', async function(req, res) {
    try { res.json(await History.create(req.body)); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', async function(req, res) {
    try {
        res.json({
            status: 'healthy',
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            gemini: geminiAvailable ? 'active' : 'fallback-mode',
            gemini_key_type: geminiKeyType,
            users: await User.countDocuments(),
            questions: await Question.countDocuments(),
            history: await History.countDocuments(),
            timestamp: new Date().toISOString()
        });
    } catch (e) { res.json({ status: 'error', error: e.message }); }
});

app.get('/api/test-gemini', async function(req, res) {
    if (!geminiAvailable) return res.json({ success: false, key_type: geminiKeyType, error: 'Gemini non configure' });
    try {
        const text = await callGemini('Qui etait Hannibal ? Reponds en 2 phrases.');
        res.json({ success: true, key_type: geminiKeyType, response: text });
    } catch (e) { res.json({ success: false, key_type: geminiKeyType, error: e.message }); }
});

app.listen(PORT, '0.0.0.0', function() {
    console.log('==========================================');
    console.log('  Scholars Connect - Backend');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  Gemini: ' + (geminiAvailable ? 'ACTIF (' + geminiKeyType + ')' : 'FALLBACK MODE'));
    console.log('  Base connaissances: ' + Object.keys(KNOWLEDGE_BASE).length + ' sujets');
    console.log('  Delai Claude: 5 minutes');
    console.log('  Admin: /admin-login');
    console.log('  QR: /logo');
    console.log('==========================================');
});