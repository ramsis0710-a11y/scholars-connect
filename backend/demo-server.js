const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/questions', (req, res) => {
    res.json([]);
});

app.post('/api/questions', (req, res) => {
    res.json({ success: true });
});

app.get('/api/scholars', (req, res) => {
    res.json([
        { id: 1, name: 'Dr. Mathématiques', expertise: 'Mathématiques', languages: ['fr', 'en', 'ar'] },
        { id: 2, name: 'Dr. Physique', expertise: 'Physique', languages: ['fr', 'en'] },
        { id: 3, name: 'Dr. Informatique', expertise: 'Informatique', languages: ['fr', 'en', 'es'] },
        { id: 4, name: 'Dr. Histoire', expertise: 'Histoire', languages: ['fr', 'en', 'ar'] },
        { id: 5, name: 'Dr. Philosophie', expertise: 'Philosophie', languages: ['fr'] }
    ]);
});

app.listen(PORT, () => {
    console.log('✅ Serveur lancé sur le port ' + PORT);
});
