const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

// Servir les fichiers HTML statiques
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API minimale
app.get('/api', (req, res) => {
    res.json({ status: 'ok', message: 'API en ligne' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
    console.log('✅ Serveur lancé sur le port ' + PORT);
    console.log('   👤 http://localhost:' + PORT);
    console.log('   ⚙️ http://localhost:' + PORT + '/admin');
});
