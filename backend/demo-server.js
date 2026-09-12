const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!MONGODB_URI) { console.error('MONGODB_URI non définie'); process.exit(1); }

let genAI = null, geminiModel = null, geminiAvailable = false;

// Vérifier le format de la clé Gemini
if (GEMINI_API_KEY && GEMINI_API_KEY.startsWith('AIzaSy')) {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
        geminiAvailable = true;
        console.log('✅ Gemini API initialisée (gemini-3.6-flash)');
    } catch (e) { 
        console.error('❌ Gemini init error:', e.message); 
    }
} else {
    console.log('⚠️ Clé Gemini invalide ou absente - Mode fallback enrichi activé');
    console.log('   → Format attendu : AIzaSy...');
}

mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 45000, family: 4 })
    .then(() => console.log('✅ MongoDB Atlas connecté'))
    .catch(err => console.error('❌ MongoDB:', err.message));

const UserSchema = new mongoose.Schema({
    username: String, email: { type: String, unique: true }, password: String,
    role: { type: String, default: 'user' }, language: { type: String, default: 'fr' },
    domain: { type: String, default: 'Général' }, createdAt: { type: Date, default: Date.now }
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
            await User.create({ username: 'admin', email: 'admin@scholars-connect.com', password: '%DaliMBA00931', role: 'admin', domain: 'Général' });
            console.log('✅ Admin créé');
        } else {
            existing.password = '%DaliMBA00931';
            await existing.save();
            console.log('✅ Admin MP mis à jour');
        }
    } catch (e) {
        if (retries > 0) setTimeout(function() { initAdmin(retries - 1); }, 5000);
    }
}
mongoose.connection.once('connected', function() { initAdmin(); });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// BASE DE CONNAISSANCES LOCALE ENRICHIE (Fallback)
// ============================================================
var KNOWLEDGE_BASE = {
    'hannibal': {
        fr: '📖 Hannibal Barca (247-183 av. J.-C.) était un général carthaginois, considéré comme l\'un des plus grands stratèges militaires de l\'Antiquité.\n\n🎯 Il est célèbre pour avoir traversé les Alpes avec ses éléphants de guerre en 218 av. J.-C. pour attaquer Rome lors de la Deuxième Guerre punique.\n\n✅ Points clés :\n- Général de Carthage\n- Traversée des Alpes avec éléphants\n- Victoires à Trébie, Trasimène et Cannes\n- Battu par Scipion à Zama en 202 av. J.-C.\n\n📚 Sources : Tite-Live, Polybe',
        ar: '📖 حنبعل برقا (247-183 ق.م) كان جنرالاً قرطاجياً، يُعتبر من أعظم الاستراتيجيين العسكريين في العصور القديمة.\n\n🎯 اشتهر بعبور جبال الألب مع فيلة الحرب سنة 218 ق.م لمهاجمة روما خلال الحرب البونيقية الثانية.\n\n✅ نقاط رئيسية:\n- جنرال قرطاجي\n- عبور جبال الألب بالفيلة\n- انتصارات في تريبيا وتراسيمين وكاناي\n- هُزم على يد سكيبيو في زاما سنة 202 ق.م\n\n📚 المصادر: تيت ليف، بوليبيوس',
        en: '📖 Hannibal Barca (247-183 BC) was a Carthaginian general, considered one of the greatest military strategists of antiquity.\n\n🎯 He is famous for crossing the Alps with his war elephants in 218 BC to attack Rome during the Second Punic War.\n\n✅ Key points:\n- Carthaginian general\n- Crossing the Alps with elephants\n- Victories at Trebia, Trasimene, and Cannae\n- Defeated by Scipio at Zama in 202 BC\n\n📚 Sources: Livy, Polybius'
    },
    'fatiha': {
        fr: '📖 Sourate Al-Fatiha (الفاتحة) est la première sourate du Coran, composée de 7 versets.\n\n🎯 Cause de sa révélation :\nSelon les savants, elle a été révélée à La Mecque (mecquoise). Elle est appelée "Oumm al-Kitab" (Mère du Livre) car elle contient les principes fondamentaux de la foi islamique.\n\n✅ Points clés :\n- Première sourate du Coran\n- Récitée dans chaque prière\n- Contient l\'unicité divine (Tawhid)\n- Appelée "Al-Sab\' al-Mathani" (Les 7 répétés)\n\n📚 Sources : Tafsir Ibn Kathir, Tafsir al-Tabari',
        ar: '📖 سورة الفاتحة هي أول سورة في القرآن الكريم، تتكون من 7 آيات.\n\n🎯 سبب نزولها:\nحسب العلماء، نزلت في مكة (مكية). سُميت "أم الكتاب" لأنها تحتوي على المبادئ الأساسية للعقيدة الإسلامية.\n\n✅ نقاط رئيسية:\n- أول سورة في القرآن\n- تُقرأ في كل صلاة\n- تحتوي على التوحيد\n- تُسمى "السبع المثاني"\n\n📚 المصادر: تفسير ابن كثير، تفسير الطبري',
        en: '📖 Surah Al-Fatiha is the first chapter of the Quran, consisting of 7 verses.\n\n🎯 Reason for revelation:\nAccording to scholars, it was revealed in Mecca. It is called "Umm al-Kitab" (Mother of the Book) because it contains the fundamental principles of Islamic faith.\n\n✅ Key points:\n- First chapter of the Quran\n- Recited in every prayer\n- Contains divine unity (Tawhid)\n- Called "Al-Sab\' al-Mathani" (The 7 repeated)\n\n📚 Sources: Tafsir Ibn Kathir, Tafsir al-Tabari'
    },
    'fiqh': {
        fr: '📖 Le Fiqh (الفقه) est la jurisprudence islamique qui traite des règles pratiques dérivées du Coran et de la Sunna.\n\n🎯 Les 4 sources principales :\n1. Le Coran\n2. La Sunna (paroles et actes du Prophète)\n3. L\'Ijma (consensus des savants)\n4. Le Qiyas (analogie)\n\n✅ Points clés :\n- Science des règles pratiques\n- 4 écoles principales : Hanafite, Malikite, Chafiite, Hanbalite\n- Couvre tous les aspects de la vie musulmane\n\n📚 Sources : Al-Risala, Al-Umm, Bidayat al-Mujtahid',
        ar: '📖 الفقه هو العلم بالأحكام الشرعية العملية المستنبطة من أدلتها التفصيلية.\n\n🎯 المصادر الأربعة الرئيسية:\n1. القرآن الكريم\n2. السنة النبوية\n3. الإجماع\n4. القياس\n\n✅ نقاط رئيسية:\n- علم الأحكام العملية\n- 4 مذاهب: حنفي، مالكي، شافعي، حنبلي\n- يشمل جميع جوانب حياة المسلم\n\n📚 المصادر: الرسالة، الأم، بداية المجتهد',
        en: '📖 Fiqh is Islamic jurisprudence dealing with practical rules derived from the Quran and Sunnah.\n\n🎯 The 4 main sources:\n1. The Quran\n2. The Sunnah (Prophet\'s words and deeds)\n3. Ijma (scholars\' consensus)\n4. Qiyas (analogy)\n\n✅ Key points:\n- Science of practical rules\n- 4 main schools: Hanafi, Maliki, Shafii, Hanbali\n- Covers all aspects of Muslim life\n\n📚 Sources: Al-Risala, Al-Umm, Bidayat al-Mujtahid'
    },
    'filetage': {
        fr: '📖 Le filetage premium est un filetage de haute précision utilisé dans l\'industrie pétrolière.\n\n🎯 Exigences principales :\n- Tolérances dimensionnelles très serrées (±0.05mm)\n- Pas de filetage constant et précis\n- Angle de filetage conforme (60° ou 75°)\n- Contrôle par calibres API\n- Étanchéité aux gaz et liquides\n- Résistance mécanique élevée (15 000 PSI)\n- Traitement de surface anticorrosion\n- Traçabilité complète des lots\n\n📋 Normes : API 5B, API 5CT, ISO 10422, TSH 511\n\n🏭 Applications : Forage pétrolier, complétion de puits\n\n📚 Sources : CNC Programming Handbook, Valve Handbook',
        ar: '📖 اللولبة الممتازة هي لولبة عالية الدقة تُستخدم في صناعة النفط.\n\n🎯 المتطلبات الرئيسية:\n- تفاوتات أبعادية صارمة (±0.05مم)\n- خطوة لولبة ثابتة ودقيقة\n- زاوية لولبة مطابقة (60° أو 75°)\n- فحص بمقاييس API\n- إحكام ضد الغازات والسوائل\n- مقاومة ميكانيكية عالية (15,000 PSI)\n- معالجة سطحية مضادة للتآكل\n- تتبع كامل للدفعات\n\n📋 المعايير : API 5B, API 5CT, ISO 10422, TSH 511\n\n🏭 التطبيقات : الحفر النفطي، إكمال الآبار\n\n📚 المصادر : دليل برمجة CNC، دليل الصمامات',
        en: '📖 Premium threading is high-precision threading used in the oil industry.\n\n🎯 Main requirements:\n- Very tight dimensional tolerances (±0.05mm)\n- Constant and precise thread pitch\n- Compliant thread angle (60° or 75°)\n- Control by API gauges\n- Gas and liquid tightness\n- High mechanical resistance (15,000 PSI)\n- Anti-corrosion surface treatment\n- Complete batch traceability\n\n📋 Standards: API 5B, API 5CT, ISO 10422, TSH 511\n\n🏭 Applications: Oil drilling, well completion\n\n📚 Sources: CNC Programming Handbook, Valve Handbook'
    },
    'cnc': {
        fr: '📖 Le CNC (Computer Numerical Control) est un système de commande numérique par ordinateur pour les machines-outils.\n\n🎯 Exigences :\n- Précision dimensionnelle (±0.01mm)\n- Programmation G-code\n- Vitesse et avance contrôlées\n- Gestion thermique\n- Contrôle qualité en cours\n\n✅ Avantages :\n- Répétabilité élevée\n- Fabrication de pièces complexes\n- Automatisation complète\n\n📚 Sources : CNC Programming Handbook',
        ar: '📖 CNC (التحكم الرقمي بالحاسوب) هو نظام تحكم رقمي بالحاسوب لآلات التشغيل.\n\n🎯 المتطلبات :\n- دقة أبعادية (±0.01مم)\n- برمجة G-code\n- تحكم في السرعة والتغذية\n- إدارة حرارية\n- مراقبة الجودة أثناء العمل\n\n✅ المزايا :\n- تكرارية عالية\n- تصنيع قطع معقدة\n- أتمتة كاملة\n\n📚 المصادر : دليل برمجة CNC',
        en: '📖 CNC (Computer Numerical Control) is a computer numerical control system for machine tools.\n\n🎯 Requirements:\n- Dimensional accuracy (±0.01mm)\n- G-code programming\n- Controlled speed and feed\n- Thermal management\n- In-process quality control\n\n✅ Advantages:\n- High repeatability\n- Complex parts manufacturing\n- Full automation\n\n📚 Sources: CNC Programming Handbook'
    }
};

// ============================================================
// GÉNÉRATION DE RÉPONSE (Gemini ou Fallback)
// ============================================================
async function generateGeminiResponse(question, scholar, reason) {
    // Essayer Gemini d'abord
    if (geminiAvailable && geminiModel) {
        try {
            var qLang = question.language || 'fr';
            var langInstruction = 'CRITICAL: You MUST respond in the SAME LANGUAGE as the question. Language code: ' + qLang + '.';
            
            var prompt = 'You are an expert academic judge named "Juge Claude".\n' +
                langInstruction + '\n\n' +
                'DOMAIN: ' + question.domain + '\nSPECIALTY: ' + question.category + '\n' +
                'QUESTION: ' + question.title + '\nDETAILS: ' + question.content + '\n\n' +
                'Provide a COMPLETE and EXPERT answer.\n' +
                'Structure: 1. DEFINITION 2. DETAILED ANSWER 3. KEY POINTS 4. SOURCES';
            
            const result = await geminiModel.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            console.log('✅ Réponse Gemini reçue (' + text.length + ' caractères)');
            return buildResponse(text, question, scholar, reason);
        } catch (e) {
            console.error('❌ Erreur Gemini:', e.message);
        }
    }
    
    // Fallback : base de connaissances locale
    console.log('📚 Utilisation du fallback local');
    return generateEnrichedFallback(question, scholar, reason);
}

function buildResponse(text, question, scholar, reason) {
    var header = '';
    if (reason === 'no_literature') {
        header = '🤖 REPONSE COMPLETE DU JUGE CLAUDE\n\n📋 Question : "' + question.title + '"\n';
        header += 'Le scholar ' + scholar.name + ' n\'a pas de litterature specifique.\n\n━━━━━━━━━━━━━━━━━━━━\n\n';
    } else {
        header = '⏱️ REPONSE COMPLETE DU JUGE CLAUDE (5 min)\n\n👨‍🎓 Scholar : ' + scholar.name + '\n';
        if (scholar.literature) header += '📖 References : ' + scholar.literature.join(', ') + '\n';
        header += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
    }
    return header + text + '\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Le scholar ' + scholar.name + ' pourra completer.';
}

function generateEnrichedFallback(question, scholar, reason) {
    var qLang = question.language || 'fr';
    var questionText = (question.title + ' ' + question.content).toLowerCase();
    
    // Chercher dans la base de connaissances
    var found = null;
    for (var key in KNOWLEDGE_BASE) {
        if (questionText.indexOf(key) !== -1) {
            found = KNOWLEDGE_BASE[key];
            break;
        }
    }
    
    var header = '';
    if (reason === 'no_literature') {
        header = '🤖 REPONSE DU JUGE CLAUDE\n\n📋 Question : "' + question.title + '"\n';
        header += 'Le scholar ' + scholar.name + ' n\'a pas de litterature specifique.\n\n━━━━━━━━━━━━━━━━━━━━\n\n';
    } else {
        header = '⏱️ REPONSE DU JUGE CLAUDE (5 min)\n\n👨‍🎓 Scholar : ' + scholar.name + '\n';
        if (scholar.literature) header += '📖 References : ' + scholar.literature.join(', ') + '\n';
        header += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
    }
    
    if (found && found[qLang]) {
        return header + found[qLang] + '\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Le scholar pourra completer.';
    }
    
    // Fallback générique enrichi
    var generic = {
        fr: '📖 DÉFINITION : Cette question relève du domaine ' + question.domain + ' (' + question.category + ').\n\n' +
            '🎯 RÉPONSE : Le sujet "' + question.title + '" nécessite une expertise spécialisée.\n\n' +
            '✅ POINTS CLÉS :\n' +
            '   • Domaine : ' + question.domain + '\n' +
            '   • Spécialité : ' + question.category + '\n' +
            '   • Scholar assigné : ' + scholar.name + '\n' +
            '   • Littérature : ' + (scholar.literature ? scholar.literature.join(', ') : 'Non spécifiée') + '\n\n' +
            '💡 CONSEIL : Consultez la littérature spécialisée et les sources académiques.',
        ar: '📖 التعريف : هذا السؤال يتعلق بمجال ' + question.domain + ' (' + question.category + ').\n\n' +
            '🎯 الإجابة : موضوع "' + question.title + '" يتطلب خبرة متخصصة.\n\n' +
            '✅ النقاط الرئيسية :\n' +
            '   • المجال : ' + question.domain + '\n' +
            '   • التخصص : ' + question.category + '\n' +
            '   • العالم المعين : ' + scholar.name + '\n' +
            '   • الأدبيات : ' + (scholar.literature ? scholar.literature.join(', ') : 'غير محددة') + '\n\n' +
            '💡 نصيحة : راجع الأدبيات المتخصصة والمصادر الأكاديمية.',
        en: '📖 DEFINITION: This question belongs to the ' + question.domain + ' domain (' + question.category + ').\n\n' +
            '🎯 ANSWER: The topic "' + question.title + '" requires specialized expertise.\n\n' +
            '✅ KEY POINTS:\n' +
            '   • Domain: ' + question.domain + '\n' +
            '   • Specialty: ' + question.category + '\n' +
            '   • Assigned scholar: ' + scholar.name + '\n' +
            '   • Literature: ' + (scholar.literature ? scholar.literature.join(', ') : 'Not specified') + '\n\n' +
            '💡 TIP: Consult specialized literature and academic sources.'
    };
    
    return header + (generic[qLang] || generic.fr) + '\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Le scholar pourra completer.';
}

// ============================================================
// ROUTES HTML
// ============================================================
app.get('/', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/admin', function(req, res) { res.sendFile(path.join(__dirname, 'public', 'admin.html')); });

// ============================================================
// PAGE /admin-login
// ============================================================
app.get('/admin-login', function(req, res) {
    var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<title>Admin - Connexion</title>' +
        '<style>' +
        '*{margin:0;padding:0;box-sizing:border-box}' +
        'body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a0e27,#1a1a3e);font-family:Segoe UI,sans-serif;padding:20px}' +
        '.card{background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:24px;padding:40px;max-width:450px;width:100%;box-shadow:0 25px 70px rgba(245,158,11,0.4)}' +
        '.icon{font-size:64px;text-align:center;margin-bottom:15px}' +
        '.title{color:white;font-size:28px;font-weight:700;text-align:center;margin-bottom:8px}' +
        '.subtitle{color:rgba(255,255,255,0.9);text-align:center;font-size:14px;margin-bottom:25px}' +
        '.form-group{margin-bottom:18px}' +
        '.form-group label{display:block;color:white;font-weight:600;margin-bottom:6px;font-size:14px}' +
        '.form-group input{width:100%;padding:14px;border-radius:10px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.95);color:#0a0e27;font-size:15px}' +
        '.btn{width:100%;padding:15px;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:16px;background:#22c55e;color:white}' +
        '.btn:hover{background:#16a34a}' +
        '.status{margin-top:15px;padding:12px;border-radius:8px;font-size:13px;text-align:center;display:none}' +
        '.status.success{background:#22c55e;color:white;display:block}' +
        '.status.error{background:#ef4444;color:white;display:block}' +
        '.info{margin-top:20px;padding:15px;background:rgba(0,0,0,0.2);border-radius:10px;color:white;font-size:12px;text-align:center}' +
        '</style></head><body>' +
        '<div class="card">' +
        '<div class="icon">⚙️</div>' +
        '<div class="title">Accès Admin</div>' +
        '<div class="subtitle">Plateforme Scholars Connect</div>' +
        '<form onsubmit="doLogin(event)">' +
        '<div class="form-group"><label>Email</label>' +
        '<input type="email" id="email" value="admin@scholars-connect.com" readonly style="background:rgba(255,255,255,0.7)"></div>' +
        '<div class="form-group"><label>Mot de passe</label>' +
        '<input type="password" id="password" value="%DaliMBA00931"></div>' +
        '<button type="submit" class="btn">🔐 Se connecter</button>' +
        '</form>' +
        '<div class="status" id="status"></div>' +
        '<div class="info">🔒 Page sécurisée - Accès réservé aux administrateurs</div>' +
        '</div>' +
        '<script>' +
        'async function doLogin(e){' +
        'e.preventDefault();' +
        'var email=document.getElementById("email").value;' +
        'var pwd=document.getElementById("password").value;' +
        'var st=document.getElementById("status");' +
        'st.className="status";st.textContent="⏳ Connexion...";' +
        'try{' +
        'var r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email,password:pwd})});' +
        'var data=await r.json();' +
        'if(r.ok&&data.role==="admin"){' +
        'localStorage.setItem("sc_admin_session",JSON.stringify(data));' +
        'st.className="status success";st.textContent="✅ Connexion réussie !";' +
        'setTimeout(function(){window.location.href="/admin";},800);' +
        '}else{' +
        'st.className="status error";st.textContent="❌ "+(data.error||"Accès refusé");' +
        '}' +
        '}catch(err){st.className="status error";st.textContent="❌ Erreur réseau";}' +
        '}' +
        '</script></body></html>';
    res.send(html);
});

// ============================================================
// PAGE /logo AVEC QR CODE
// ============================================================
app.get('/logo', function(req, res) {
    var baseUrl = req.protocol + '://' + req.get('host');
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(baseUrl);
    
    var html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
        '<title>Scholars Connect - QR Code</title>' +
        '<style>' +
        '*{margin:0;padding:0;box-sizing:border-box}' +
        'body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a0e27,#1a1a3e);font-family:Segoe UI,sans-serif;padding:20px}' +
        '.card{background:linear-gradient(135deg,#667eea,#764ba2);border-radius:24px;padding:40px;max-width:600px;width:100%;text-align:center;box-shadow:0 25px 70px rgba(102,126,234,0.5)}' +
        '.icon{font-size:80px;margin-bottom:15px}' +
        '.title{color:white;font-size:38px;font-weight:700;margin-bottom:8px}' +
        '.subtitle{color:rgba(255,255,255,0.9);font-size:17px;margin-bottom:20px}' +
        '.qr-container{background:white;padding:20px;border-radius:20px;display:inline-block;margin:25px 0}' +
        '.qr-container img{display:block;width:350px;height:350px}' +
        '.url{background:rgba(0,0,0,0.3);color:white;padding:15px 20px;border-radius:12px;font-family:monospace;font-size:14px;word-break:break-all;margin:20px 0}' +
        '.status{display:inline-block;background:#22c55e;color:white;padding:8px 24px;border-radius:25px;font-weight:700;font-size:16px;margin:10px 0}' +
        '.actions{display:flex;gap:12px;justify-content:center;margin-top:25px;flex-wrap:wrap}' +
        '.btn{background:white;border:none;padding:15px 30px;border-radius:12px;font-weight:700;cursor:pointer;color:#667eea;font-size:15px;text-decoration:none;display:inline-block}' +
        '.btn-green{background:#22c55e;color:white}' +
        '.btn-blue{background:#3b82f6;color:white}' +
        '@media(max-width:600px){.title{font-size:26px}.qr-container img{width:250px;height:250px}}' +
        '</style></head><body>' +
        '<div class="card">' +
        '<div class="icon">🎓</div>' +
        '<div class="title">Scholars Connect</div>' +
        '<div class="subtitle">Plateforme académique multilingue</div>' +
        '<div class="qr-container"><img src="' + qrUrl + '" alt="QR Code"></div>' +
        '<div class="url">' + baseUrl + '</div>' +
        '<div class="status">🟢 EN LIGNE</div>' +
        '<div class="actions">' +
        '<button class="btn" onclick="copyUrl()">📋 Copier</button>' +
        '<button class="btn btn-blue" onclick="downloadQR()">⬇️ Télécharger QR</button>' +
        '<a href="/" class="btn btn-green">🚀 Ouvrir</a>' +
        '</div>' +
        '</div>' +
        '<script>' +
        'function copyUrl(){navigator.clipboard.writeText("' + baseUrl + '").then(function(){alert("✅ Lien copié !")})}' +
        'function downloadQR(){var link=document.createElement("a");link.href="' + qrUrl + '";link.download="scholars-connect-qr.png";link.click();}' +
        '</script></body></html>';
    res.send(html);
});

// ============================================================
// API - ANALYSE INTELLIGENTE (avec fallback)
// ============================================================
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
        
        // Fallback local si Gemini indisponible
        if (!geminiAvailable || !geminiModel) {
            var lower = questionText.toLowerCase();
            var domain = 'Général', category = 'Histoire';
            if (lower.match(/islam|coran|hadith|fiqh|sourate|fatiha|prière/)) { domain = 'Islam'; category = 'Fiqh (Jurisprudence)'; }
            else if (lower.match(/médecine|maladie|santé|cardiaque/)) { domain = 'Médecine'; category = 'Cardiologie'; }
            else if (lower.match(/ia|intelligence|deep learning|neurone/)) { domain = 'IA'; category = 'Deep Learning'; }
            else if (lower.match(/pétrole|forage|cnc|filetage|usinage/)) { domain = 'Mécanique Pétrole'; category = 'Usinage CNC haute précision'; }
            
            var cleanTitle = questionText.substring(0, 80);
            return res.json({ title: cleanTitle, domain: domain, category: category, language: detectedLang, content: questionText });
        }
        
        var prompt = 'Analyze this question and return ONLY a valid JSON.\n\n' +
            'QUESTION: "' + questionText + '"\n\n' +
            'Return JSON:\n' +
            '{\n' +
            '  "title": "Short title (max 80 chars)",\n' +
            '  "domain": "ONE of: Islam, Medecine, Pharmacie, Chimie, IA, IoT, GMAO, Mecanique Petrole, Gestion, Expertise Comptable, Droit, Economie, Culture Generale, Art, Architecture, Restauration, General",\n' +
            '  "category": "Specific specialty",\n' +
            '  "language": "' + detectedLang + '",\n' +
            '  "content": "Reformulation in ' + detectedLang + '"\n' +
            '}';
        
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        var text = response.text();
        text = text.split('`json').join('').split('`').join('').trim();
        
        try {
            var parsed = JSON.parse(text);
            if (!parsed.title) parsed.title = questionText.substring(0, 80);
            if (!parsed.domain) parsed.domain = 'Général';
            if (!parsed.category) parsed.category = 'Général';
            if (!parsed.language) parsed.language = detectedLang;
            if (!parsed.content) parsed.content = questionText;
            res.json(parsed);
        } catch (e) {
            res.json({ title: questionText.substring(0, 80), domain: 'Général', category: 'Histoire', language: detectedLang, content: questionText });
        }
    } catch (e) { 
        var fallbackLang = 'fr';
        if (/[\u0600-\u06FF]/.test(req.body.text)) fallbackLang = 'ar';
        res.json({ title: req.body.text.substring(0, 80), domain: 'Général', category: 'Histoire', language: fallbackLang, content: req.body.text });
    }
});

// ============================================================
// API - TRADUCTION (avec fallback)
// ============================================================
app.post('/api/translate', async function(req, res) {
    try {
        const text = req.body.text, targetLang = req.body.targetLang;
        if (!text || !targetLang) return res.status(400).json({ error: 'Paramètres manquants' });
        
        if (!geminiAvailable || !geminiModel) {
            return res.json({ translation: text, targetLang: targetLang, error: 'Gemini non disponible' });
        }
        
        const langNames = { 'fr': 'French', 'ar': 'Arabic', 'en': 'English', 'es': 'Spanish', 'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'ru': 'Russian', 'hi': 'Hindi' };
        const targetName = langNames[targetLang] || targetLang;
        
        const prompt = 'Translate this text to ' + targetName + ' accurately.\n\nTEXT:\n' + text + '\n\nReturn ONLY the translation.';
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        res.json({ translation: response.text(), targetLang: targetLang, targetName: targetName });
    } catch (e) { 
        res.json({ translation: req.body.text, targetLang: req.body.targetLang, error: e.message });
    }
});

// ============================================================
// API - AUTH
// ============================================================
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
        if (existing) return res.status(400).json({ error: 'Email déjà utilisé' });
        const user = await User.create(req.body);
        var u = user.toObject(); delete u.password; res.json(u);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async function(req, res) {
    try { res.json(await User.find().select('-password')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - QUESTIONS
// ============================================================
app.get('/api/questions', async function(req, res) {
    try { res.json(await Question.find().sort({ timestamp: -1 })); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/questions', async function(req, res) {
    try {
        const question = await Question.create(req.body);
        console.log('📝 Nouvelle question:', question.title, '| Langue:', question.language);
        triggerClaudeJudge(question);
        res.json(question);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// JUGE CLAUDE - DÉLAI 5 MINUTES + RÉPONSE DANS LA LANGUE
// ============================================================
async function triggerClaudeJudge(question) {
    if (!question.scholar) {
        console.log('⚠️ Pas de scholar pour Q#' + question._id);
        return;
    }
    const scholar = question.scholar;
    const questionLang = question.language || 'fr';
    
    console.log('⏱️ Juge Claude activé pour Q#' + question._id + ' (langue: ' + questionLang + ')');
    
    // RÈGLE 1 : Pas de littérature → réponse après 3 secondes
    if (!scholar.literature || scholar.literature.length === 0) {
        console.log('📚 Pas de littérature → réponse dans 3s');
        setTimeout(async function() {
            try {
                const answer = await generateGeminiResponse(question, scholar, 'no_literature');
                const q = await Question.findById(question._id);
                if (!q) return;
                q.answers.push({ 
                    username: 'Juge Claude', userId: 0, content: answer, 
                    language: questionLang, date: new Date().toLocaleDateString('fr-FR'), 
                    isClaude: true, claudeReason: 'no_literature' 
                });
                q.status = 'claude_answered';
                await q.save();
                console.log('✅ Réponse enregistrée (' + answer.length + ' caractères)');
            } catch (e) { console.error('❌ Erreur:', e.message); }
        }, 3000);
        return;
    }
    
    // RÈGLE 2 : Littérature présente → attendre 5 MINUTES
    console.log('⏱️ Attente 5 minutes (300s)...');
    
    setTimeout(async function() {
        try {
            const q = await Question.findById(question._id);
            if (!q) return;
            
            var scholarResponded = false;
            for (var i = 0; i < q.answers.length; i++) {
                if (q.answers[i].isScholarResponse) { scholarResponded = true; break; }
            }
            
            if (scholarResponded) {
                console.log('✅ Scholar a répondu - Claude ne répond pas');
                return;
            }
            
            console.log('⏱️ 5 min écoulées → Claude répond');
            const answer = await generateGeminiResponse(q, q.scholar, 'timeout_5min');
            q.answers.push({ 
                username: 'Juge Claude', userId: 0, content: answer, 
                language: questionLang, date: new Date().toLocaleDateString('fr-FR'), 
                isClaude: true, claudeReason: 'timeout_5min' 
            });
            q.status = 'claude_answered';
            await q.save();
            console.log('✅ Réponse Claude (5min) enregistrée');
        } catch (e) { console.error('❌ Erreur:', e.message); }
    }, 300000); // 5 MINUTES
}

app.post('/api/questions/:id/answers', async function(req, res) {
    try {
        const q = await Question.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Non trouvée' });
        q.answers.push(req.body);
        if (req.body.isScholarResponse) q.status = 'answered';
        if (req.body.isClaude) q.status = 'claude_answered';
        await q.save();
        res.json(q.answers[q.answers.length - 1]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// API - HISTORIQUE
// ============================================================
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

// ============================================================
// API - SANTÉ
// ============================================================
app.get('/api/health', async function(req, res) {
    try {
        res.json({
            status: 'healthy',
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            gemini: geminiAvailable ? 'active' : 'fallback-mode',
            gemini_note: geminiAvailable ? 'Gemini API actif' : 'Clé Gemini invalide - Mode fallback enrichi',
            users: await User.countDocuments(),
            questions: await Question.countDocuments(),
            history: await History.countDocuments(),
            timestamp: new Date().toISOString()
        });
    } catch (e) { res.json({ status: 'error', error: e.message }); }
});

app.get('/api/test-gemini', async function(req, res) {
    if (!geminiAvailable) {
        return res.json({ 
            success: false, 
            error: 'Gemini non configurée - Clé API invalide',
            note: 'Le mode fallback enrichi est actif et répond aux questions via la base de connaissances locale.'
        });
    }
    try {
        const result = await geminiModel.generateContent('Qui était Hannibal ? Réponds en 2 phrases.');
        const response = await result.response;
        res.json({ success: true, response: response.text() });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.listen(PORT, '0.0.0.0', function() {
    console.log('==========================================');
    console.log('  Scholars Connect - MongoDB');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  🤖 Gemini: ' + (geminiAvailable ? 'ACTIF' : 'FALLBACK MODE'));
    console.log('  📚 Base de connaissances: ' + Object.keys(KNOWLEDGE_BASE).length + ' sujets');
    console.log('  ⏱️ Délai Claude: 5 minutes');
    console.log('  🔐 Admin: /admin-login');
    console.log('  📱 QR Code: /logo');
    console.log('==========================================');
});
