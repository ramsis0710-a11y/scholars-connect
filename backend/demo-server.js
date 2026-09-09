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
        // Scholars Islamiques
        { id: 1, name: 'د. أحمد الفقيه', nameEn: 'Dr. Ahmed Al-Faqih', expertise: 'Fiqh (الفقه)', languages: ['ar', 'fr', 'en'], rating: 4.9, speciality: 'Islam' },
        { id: 2, name: 'د. فاطمة العقيدة', nameEn: 'Dr. Fatima Al-Aqida', expertise: 'Aqida (العقيدة)', languages: ['ar', 'fr', 'en'], rating: 4.8, speciality: 'Islam' },
        { id: 3, name: 'د. عمر الحديث', nameEn: 'Dr. Omar Al-Hadith', expertise: 'Hadith (الحديث)', languages: ['ar', 'en', 'fr'], rating: 4.9, speciality: 'Islam' },
        { id: 4, name: 'د. ليلى التفسير', nameEn: 'Dr. Layla Tafsir', expertise: 'Tafsir (التفسير)', languages: ['ar', 'fr', 'en'], rating: 4.7, speciality: 'Islam' },
        { id: 5, name: 'د. يوسف السيرة', nameEn: 'Dr. Youssef Sira', expertise: 'Sira (السيرة)', languages: ['ar', 'en', 'fr'], rating: 4.6, speciality: 'Islam' },
        { id: 6, name: 'د. خديجة التصوف', nameEn: 'Dr. Khadija Soufisme', expertise: 'Soufisme (التصوف)', languages: ['ar', 'fr', 'en'], rating: 4.5, speciality: 'Islam' },
        // Scholars Généraux
        { id: 7, name: 'د. أميرة الرياضيات', nameEn: 'Dr. Amira Math', expertise: 'Mathématiques', languages: ['ar', 'fr', 'en'], rating: 4.9, speciality: 'Général' },
        { id: 8, name: 'د. صوفي الفيزياء', nameEn: 'Dr. Sophie Physique', expertise: 'Physique', languages: ['ar', 'fr', 'en'], rating: 4.8, speciality: 'Général' },
        { id: 9, name: 'د. كريم المعلوماتية', nameEn: 'Dr. Karim Info', expertise: 'Informatique', languages: ['ar', 'fr', 'en', 'es'], rating: 4.7, speciality: 'Général' }
    ]);
});

app.listen(PORT, () => {
    console.log('✅ Serveur lancé sur le port ' + PORT);
});
