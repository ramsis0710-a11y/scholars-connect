const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Scholars Connect API is running');
});

app.get('/api/generate', (req, res) => {
  res.json({ success: true, message: "Route /api/generate operationnelle." });
});

app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "Cle GEMINI_API_KEY non definie dans Render." });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt || "Hello" }] }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Erreur lors de l appel Gemini API");
    }

    const textReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Aucune reponse generee.";
    res.json({ success: true, data: textReply });
  } catch (err) {
    console.error("Erreur /api/generate :", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
