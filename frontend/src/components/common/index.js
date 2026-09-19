

// --- ROUTE API GEMINI AUTOMATIQUE ---
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: "Clé GEMINI_API_KEY manquante dans l'environnement Render." });
    }

    const response = await fetch(https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key= + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt || "Hello" }] }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Erreur lors de l'appel Gemini API");

    const textReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Aucune réponse générée.";
    res.json({ success: true, data: textReply });
  } catch (err) {
    console.error("Erreur backend /api/generate :", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
