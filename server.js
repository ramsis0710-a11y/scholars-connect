const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.warn("ATTENTION: Aucune cle GEMINI_API_KEY ou GOOGLE_API_KEY trouvee dans l environnement !");
}

const genAI = new GoogleGenerativeAI(apiKey || '');

app.get('/', (req, res) => {
  res.send('Scholars Connect API is running');
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Serveur Scholars Connect fonctionnel',
    hasApiKey: !!apiKey
  });
});

app.post('/api/generate', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "La cle d'API Gemini n'est pas configuree dans Render."
      });
    }

    const promptText = req.body.prompt || req.body.message || req.body.text || req.body.contents;

    if (!promptText) {
      return res.status(400).json({
        success: false,
        error: "Veuillez fournir un texte via 'prompt', 'message' ou 'text'."
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(promptText);
    const response = await result.response;
    const responseText = response.text();

    return res.json({
      success: true,
      result: responseText,
      data: responseText
    });

  } catch (error) {
    console.error("Erreur Gemini backend :", error.message);
    return res.status(500).json({
      success: false,
      error: "Erreur lors du traitement de la requete Gemini",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Serveur Scholars Connect a l ecoute sur le port ${PORT}`);
});
