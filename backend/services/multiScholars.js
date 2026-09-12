// services/multiScholars.js
// Agrege les reponses de PLUSIEURS scholars dans la meme specialite.
// Utilise reellement Groq (IA gratuite) si GROQ_API_KEY est configuree,
// sinon repli sur une base de connaissances locale, puis sur un texte generique.

const axios = require('axios');

class MultiScholars {
    constructor() {
        this.groqApiKey = process.env.GROQ_API_KEY || '';
        this.groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
        // openai/gpt-oss-20b : modele recommande par Groq en remplacement
        // de llama-3.1-8b-instant (deprecie sur les tiers gratuit/developpeur).
        this.groqModel = 'openai/gpt-oss-20b';
    }

    // Trouver tous les scholars dans une specialite
    findAllScholarsBySpecialty(scholars, specialty) {
        return scholars.filter(s => s.expertise === specialty);
    }

    // Chercher une reponse toute prete dans la base de connaissances locale
    buildLocalKnowledgeAnswer(question, knowledgeBase, qLang) {
        const qLower = (question.title + ' ' + question.content).toLowerCase();

        for (const key in knowledgeBase) {
            if (qLower.indexOf(key) !== -1 && knowledgeBase[key] && knowledgeBase[key][qLang]) {
                return knowledgeBase[key][qLang];
            }
        }

        return null;
    }

    // Reponse generique de secours (aucune IA, aucune base locale disponible)
    buildGenericAnswer(question, specialty, matchingScholars, qLang) {
        const generic = {
            fr: '📖 **DEFINITION** : Cette question releve de la specialite ' + specialty + '.\n\n' +
                '💬 **REPONSE** : Le sujet "' + question.title + '" necessite une expertise specialisee en ' + question.domain + '.\n\n' +
                '✅ **POINTS CLES** :\n' +
                '   - Domaine : ' + question.domain + '\n' +
                '   - Specialite : ' + specialty + '\n' +
                '   - Experts consultes : ' + matchingScholars.length + '\n\n' +
                '💡 **RECOMMANDATION** : Consultez les references des scholars ci-dessus.',
            ar: '📖 **تعريف**: هذا السؤال يندرج ضمن تخصص ' + specialty + '.\n\n' +
                '💬 **الإجابة**: يتطلب موضوع "' + question.title + '" خبرة متخصصة في ' + question.domain + '.\n\n' +
                '✅ **النقاط الأساسية**:\n' +
                '   - المجال: ' + question.domain + '\n' +
                '   - التخصص: ' + specialty + '\n' +
                '   - عدد الخبراء المستشارين: ' + matchingScholars.length + '\n\n' +
                '💡 **التوصية**: يرجى الرجوع إلى مراجع الخبراء أعلاه.',
            en: '📖 **DEFINITION**: This question belongs to ' + specialty + '.\n\n' +
                '💬 **ANSWER**: The topic "' + question.title + '" requires expertise in ' + question.domain + '.\n\n' +
                '✅ **KEY POINTS**:\n' +
                '   - Domain: ' + question.domain + '\n' +
                '   - Specialty: ' + specialty + '\n' +
                '   - Experts consulted: ' + matchingScholars.length + '\n\n' +
                '💡 **RECOMMENDATION**: Consult the scholars references above.'
        };

        return generic[qLang] || generic.fr;
    }

    // Appel reel a l'API Groq (retourne null si pas de cle ou en cas d'erreur)
    async askGroq(question, specialty, matchingScholars, qLang) {
        if (!this.groqApiKey) {
            return null;
        }

        const langNames = { fr: 'francais', ar: 'arabe', en: 'anglais' };

        const scholarsList = matchingScholars.map(function (s) {
            var refs = (s.literature && s.literature.length) ? (', references: ' + s.literature.join(', ')) : '';
            return '- ' + s.name + ' (note ' + s.rating + refs + ')';
        }).join('\n');

        const prompt =
            'Tu es un assistant qui agrege l avis de plusieurs experts ("scholars") en ' + specialty + '.\n' +
            'Question : "' + question.title + '"\n' +
            'Details : "' + question.content + '"\n' +
            'Experts disponibles :\n' + scholarsList + '\n\n' +
            'Redige une reponse synthetique et utile en ' + (langNames[qLang] || 'francais') +
            ', en t appuyant sur les domaines d expertise listes ci-dessus. Reste factuel et concis.';

        try {
            const response = await axios.post(
                this.groqEndpoint,
                {
                    model: this.groqModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.4,
                    max_tokens: 500
                },
                {
                    headers: {
                        Authorization: 'Bearer ' + this.groqApiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            const content = response.data &&
                response.data.choices &&
                response.data.choices[0] &&
                response.data.choices[0].message &&
                response.data.choices[0].message.content;

            return content ? String(content).trim() : null;
        } catch (err) {
            console.error('Erreur appel Groq API :', err.message);
            return null;
        }
    }

    // Generer une reponse multi-scholars.
    // NOTE : cette methode est maintenant asynchrone (appel reseau possible vers Groq).
    // Tout code appelant doit faire : const reponse = await multiScholars.generateMultiScholarResponse(...)
    async generateMultiScholarResponse(question, scholars, knowledgeBase) {
        const specialty = question.category;
        const matchingScholars = this.findAllScholarsBySpecialty(scholars, specialty);

        if (matchingScholars.length === 0) {
            return null;
        }

        const qLang = question.language || 'fr';

        let header = '🎓 **REPONSE MULTI-SCHOLARS**\n\n';
        header += '📚 ' + matchingScholars.length + ' scholar(s) specialise(s) en ' + specialty + ' :\n\n';

        matchingScholars.forEach(function (scholar, index) {
            header += (index + 1) + '. 👨‍🏫 **' + scholar.name + '** (⭐ ' + scholar.rating + ')\n';
            if (scholar.literature && scholar.literature.length > 0) {
                header += '   📖 References : ' + scholar.literature.join(', ') + '\n';
            }
            header += '\n';
        });

        header += '━━━━━━━━━━━━━━━━━━━━\n\n';

        // Ordre de priorite : 1) Groq (IA reelle) 2) base de connaissances locale 3) reponse generique
        let answer = await this.askGroq(question, specialty, matchingScholars, qLang);
        let sourceLabel = '🧠 **REPONSE IA (Groq)** :\n\n';

        if (!answer) {
            answer = this.buildLocalKnowledgeAnswer(question, knowledgeBase, qLang);
            sourceLabel = '📚 **REPONSE AGREGEE (base locale)** :\n\n';
        }

        if (!answer) {
            answer = this.buildGenericAnswer(question, specialty, matchingScholars, qLang);
            sourceLabel = '';
        }

        return header + sourceLabel + answer;
    }
}

module.exports = new MultiScholars();
