// services/semanticSearch.js
// Recherche semantique LOCALE (sans scraping), basee sur TF-IDF

const natural = require('natural');
const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

class SemanticSearch {
    constructor() {
        this.tfidf = new TfIdf();
        this.documents = [];
    }

    // Ajouter un document a l'index
    addDocument(id, text, metadata) {
        this.documents.push({ id, text, metadata });
        this.tfidf.addDocument(text);
    }

    // Rechercher les documents les plus pertinents
    search(query, limit = 5) {
        if (!query || !query.trim()) {
            return [];
        }

        const results = [];

        this.tfidf.tfidfs(query, (i, measure) => {
            if (measure > 0 && this.documents[i]) {
                results.push({
                    document: this.documents[i],
                    score: measure
                });
            }
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    // Calculer la similarite (Jaccard) entre deux textes
    similarity(text1, text2) {
        const tokens1 = new Set(tokenizer.tokenize((text1 || '').toLowerCase()));
        const tokens2 = new Set(tokenizer.tokenize((text2 || '').toLowerCase()));

        if (tokens1.size === 0 && tokens2.size === 0) {
            return 0;
        }

        const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
        const union = new Set([...tokens1, ...tokens2]);

        return intersection.size / union.size;
    }
}

module.exports = new SemanticSearch();
