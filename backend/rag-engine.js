const { GoogleGenAI } = require('@google/genai');
const { LocalIndex } = require('vectra');
const path = require('path');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ============================================================
// EMBEDDING GEMINI avec task_type optimisé
// ============================================================
async function generateEmbedding(text, taskType = 'RETRIEVAL_DOCUMENT') {
    const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: {
            taskType: taskType,
            outputDimensionality: 768
        }
    });
    return response.embeddings[0].values;
}

// ============================================================
// INDEX VECTORIEL VECTRA (local, sans serveur externe)
// ============================================================
const vectorIndexPath = path.join(__dirname, 'scholars-vector-index');
const index = new LocalIndex(vectorIndexPath);

async function initVectorIndex() {
    if (!(await index.isIndexCreated())) {
        await index.createIndex({ version: 1 });
        console.log('OK - Index Vectra cree');
    }
}

async function indexScholarDocument(scholarId, scholarName, content, metadata = {}) {
    const vector = await generateEmbedding(content, 'RETRIEVAL_DOCUMENT');
    await index.insertItem({
        vector: vector,
        metadata: {
            scholarId: scholarId,
            scholarName: scholarName,
            specialty: metadata.specialty || 'General',
            text: content.substring(0, 500),
            ...metadata
        }
    });
    console.log('OK - Document indexe : ' + scholarName);
}

async function semanticSearch(query, topK = 5) {
    const queryVector = await generateEmbedding(query, 'RETRIEVAL_QUERY');
    const results = await index.queryItems(queryVector, topK);
    return results;
}

async function generateRAGResponse(question, language = 'fr') {
    const relevantDocs = await semanticSearch(question, 5);
    
    let context = '';
    for (const doc of relevantDocs) {
        context += '\n---\nScholar: ' + doc.item.metadata.scholarName + 
                   '\nSpecialite: ' + doc.item.metadata.specialty + 
                   '\nPassage: ' + doc.item.metadata.text + '\n';
    }
    
    const langInstruction = language === 'ar' ? 'Reponds en arabe.' : 
                            language === 'en' ? 'Respond in English.' : 'Reponds en francais.';
    
    const prompt = 'Tu es un juge academique expert. ' + langInstruction + 
        '\nReponds en te basant UNIQUEMENT sur le contexte fourni.\n\n' +
        'CONTEXTE:\n' + context + '\n\n' +
        'QUESTION: ' + question + '\n\n' +
        'REPONSE:';
    
    const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
    });
    
    return {
        answer: result.text,
        sources: relevantDocs.map(d => ({
            scholar: d.item.metadata.scholarName,
            specialty: d.item.metadata.specialty,
            score: d.score
        }))
    };
}

module.exports = {
    generateEmbedding,
    initVectorIndex,
    indexScholarDocument,
    semanticSearch,
    generateRAGResponse
};