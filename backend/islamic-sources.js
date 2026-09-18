// ============================================================
// MODULE ISLAMIQUE V3 - APIs publiques fonctionnelles
// ============================================================

const axios = require('axios');

// ============================================================
// SOURCES ISLAMIQUES AVEC APIS PUBLIQUES FONCTIONNELLES
// ============================================================
const ISLAMIC_APIS = [
    {
        name: 'Quran.com (Coran)',
        url: 'https://api.quran.com/api/v4/search',
        params: function(q) { return { q: q, size: 3 }; },
        parse: function(data) {
            if (data && data.search && data.search.results) {
                return data.search.results.slice(0, 3).map(function(r) {
                    return {
                        source: 'Quran.com',
                        title: r.text,
                        text: 'Verset ' + r.verse_key + ' : ' + r.text,
                        url: 'https://quran.com/' + r.verse_key
                    };
                });
            }
            return [];
        }
    },
    {
        name: 'HadithAPI (Hadiths)',
        url: 'https://hadithapi.com/api/hadiths',
        params: function(q) { return { apiKey: '$2y$10$J8bXcKqFqzZ1c2V3bN4mOeW5rT6yU7iO8pA9sD0fG1hJ2kL3mN4oP', search: q, paginate: 3 }; },
        parse: function(data) {
            if (data && data.hadiths && data.hadiths.data) {
                return data.hadiths.data.slice(0, 3).map(function(h) {
                    return {
                        source: 'HadithAPI',
                        title: h.hadithNumber || 'Hadith',
                        text: h.hadithArabic || h.hadithEnglish || '',
                        url: 'https://hadithapi.com'
                    };
                });
            }
            return [];
        }
    },
    {
        name: 'Dorar.net (Hadiths arabes)',
        url: 'https://dorar.net/dorar_api.json',
        params: function(q) { return { skey: q }; },
        parse: function(data) {
            if (data && data.ahadith && data.ahadith.result) {
                return [{
                    source: 'Dorar.net',
                    title: 'Resultats de recherche',
                    text: data.ahadith.result.replace(/<[^>]+>/g, '').substring(0, 1500),
                    url: 'https://dorar.net'
                }];
            }
            return [];
        }
    },
    {
        name: 'AlQuran Cloud (Coran + Tafsir)',
        url: 'https://api.alquran.cloud/v1/search',
        params: function(q) { return { keyword: q, surah: 'all', language: 'ar', limit: 3 }; },
        parse: function(data) {
            if (data && data.data && data.data.matches) {
                return data.data.matches.slice(0, 3).map(function(m) {
                    return {
                        source: 'AlQuran Cloud',
                        title: m.text,
                        text: 'Sourate ' + m.surah.name + ' verset ' + m.numberInSurah + ' : ' + m.text,
                        url: 'https://alquran.cloud'
                    };
                });
            }
            return [];
        }
    }
];

// ============================================================
// RECHERCHE DANS TOUTES LES APIS
// ============================================================
async function searchIslamicSources(query) {
    console.log('Recherche islamique pour : ' + query);
    
    const allResults = [];
    
    for (const api of ISLAMIC_APIS) {
        try {
            const response = await axios.get(api.url, {
                params: api.params(query),
                timeout: 12000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': 'application/json'
                }
            });
            
            const results = api.parse(response.data);
            if (results.length > 0) {
                allResults.push(...results);
                console.log('  ' + api.name + ' : ' + results.length + ' resultat(s)');
            } else {
                console.log('  ' + api.name + ' : 0 resultat');
            }
        } catch (e) {
            console.log('  ' + api.name + ' : ' + e.message.substring(0, 80));
        }
    }
    
    console.log('Total : ' + allResults.length + ' resultat(s)');
    return allResults;
}

// ============================================================
// FORMATAGE POUR LE PROMPT IA
// ============================================================
function formatIslamicResults(results) {
    if (!results || results.length === 0) {
        return '';
    }
    
    let formatted = '\n\n=== SOURCES ISLAMIQUES AUTORISEES ===\n';
    formatted += 'Les informations suivantes proviennent de sources islamiques reconnues :\n\n';
    
    for (const r of results) {
        formatted += '--- ' + r.source + ' ---\n';
        if (r.title) formatted += 'Titre : ' + r.title + '\n';
        formatted += r.text + '\n';
        if (r.url) formatted += 'Source : ' + r.url + '\n';
        formatted += '\n';
    }
    
    formatted += '=== FIN DES SOURCES ===\n';
    formatted += 'Base ta reponse sur ces sources quand elles sont pertinentes. Cite les sources.\n';
    
    return formatted;
}

module.exports = {
    searchIslamicSources,
    formatIslamicResults,
    ISLAMIC_APIS
};
